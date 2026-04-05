/**
 * Update Role API (/api/auth/update-role) テスト
 *
 * テスト対象:
 * - 認証チェック
 * - ロール切り替え（既存レコードへのauthId紐付け）
 * - サインアップモード（新規レコード作成）
 * - バリデーション
 */

import { POST } from '../update-role/route';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

// Mock setup
const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      },
    })
  ),
}));

const mockUserFindUnique = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
  },
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/auth/update-role'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/update-role', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  it('未認証の場合 401 を返す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await POST(createRequest({ role: 'user' }));
    expect(res.status).toBe(401);
  });

  it('不正なロールの場合 400 を返す', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'auth-1', email: 'test@example.com', user_metadata: {} },
      },
      error: null,
    });

    const res = await POST(createRequest({ role: 'superadmin' }));
    expect(res.status).toBe(400);
  });

  describe('ロール切り替えモード（デフォルト）', () => {
    const authUser = {
      id: 'auth-1',
      email: 'test@example.com',
      user_metadata: { role: 'user' },
    };

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });
    });

    it('切り替え先のロールが存在する場合、authIdを更新して成功を返す', async () => {
      const targetUser = {
        id: 'user-inst-1',
        email: 'test@example.com',
        role: 'INSTRUCTOR' as UserRole,
        authId: null,
      };

      mockUserFindUnique.mockResolvedValue(targetUser);
      mockUserUpdate.mockResolvedValue({ ...targetUser, authId: 'auth-1' });

      const res = await POST(createRequest({ role: 'instructor' }));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.role).toBe('instructor');

      // Supabase Auth の user_metadata を更新
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { role: 'instructor' },
      });

      // Prisma User の authId を更新
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-inst-1' },
        data: { authId: 'auth-1' },
      });
    });

    it('切り替え先のロールが存在しない場合 404 を返す', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const res = await POST(createRequest({ role: 'admin' }));
      expect(res.status).toBe(404);
    });

    it('email_role 複合キーで正しく検索する', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await POST(createRequest({ role: 'instructor' }));

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'test@example.com',
            role: 'INSTRUCTOR',
          },
        },
      });
    });
  });

  describe('サインアップモード', () => {
    const authUser = {
      id: 'auth-new',
      email: 'new@example.com',
      user_metadata: {},
    };

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });
    });

    it('既存レコードがある場合 authId を更新する', async () => {
      const existingUser = {
        id: 'existing-1',
        email: 'new@example.com',
        role: 'USER' as UserRole,
        authId: null,
      };

      mockUserFindUnique.mockResolvedValue(existingUser);
      mockUserUpdate.mockResolvedValue({ ...existingUser, authId: 'auth-new' });

      const res = await POST(createRequest({ role: 'user', mode: 'signup' }));
      expect(res.status).toBe(200);

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'existing-1' },
        data: { authId: 'auth-new' },
      });
    });

    it('レコードが無い場合は新規作成する', async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({
        id: 'new-1',
        email: 'new@example.com',
        role: 'INSTRUCTOR',
        authId: 'auth-new',
      });

      const res = await POST(createRequest({ role: 'instructor', mode: 'signup' }));
      expect(res.status).toBe(200);

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authId: 'auth-new',
          email: 'new@example.com',
          role: 'INSTRUCTOR',
        }),
      });
    });
  });
});
