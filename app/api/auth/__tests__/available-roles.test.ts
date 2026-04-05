/**
 * Available Roles API (/api/auth/available-roles) テスト
 *
 * テスト対象:
 * - 認証チェック
 * - 同一メールの全ロール取得
 * - 現在のロール判定
 */

import { GET } from '../available-roles/route';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

// Mock setup
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: (...args: unknown[]) => mockGetUser(...args),
      },
    })
  ),
}));

const mockUserFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
  },
}));

function createRequest(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/auth/available-roles'));
}

describe('GET /api/auth/available-roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('未認証の場合 401 を返す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it('単一ロールのユーザーの場合、1件のロールを返す', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-1',
          email: 'user@example.com',
          user_metadata: { role: 'user' },
        },
      },
      error: null,
    });

    mockUserFindMany.mockResolvedValue([
      {
        id: 'user-1',
        role: 'USER' as UserRole,
        name: 'テストユーザー',
        authId: 'auth-1',
      },
    ]);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.roles).toHaveLength(1);
    expect(data.roles[0]).toEqual({
      role: 'user',
      name: 'テストユーザー',
      isCurrent: true,
    });
    expect(data.currentRole).toBe('user');
  });

  it('複数ロールのユーザーの場合、全ロールを返す', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-1',
          email: 'multi@example.com',
          user_metadata: { role: 'instructor' },
        },
      },
      error: null,
    });

    mockUserFindMany.mockResolvedValue([
      {
        id: 'user-1',
        role: 'USER' as UserRole,
        name: 'マルチユーザー',
        authId: 'auth-1',
      },
      {
        id: 'user-2',
        role: 'INSTRUCTOR' as UserRole,
        name: 'マルチ提供者',
        authId: 'auth-1',
      },
    ]);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.roles).toHaveLength(2);
    expect(data.currentRole).toBe('instructor');

    // USERロールはisCurrent=false
    expect(data.roles[0]).toEqual({
      role: 'user',
      name: 'マルチユーザー',
      isCurrent: false,
    });

    // INSTRUCTORロールはisCurrent=true
    expect(data.roles[1]).toEqual({
      role: 'instructor',
      name: 'マルチ提供者',
      isCurrent: true,
    });
  });

  it('3ロール全て持つユーザーの場合、3件返す', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-1',
          email: 'admin@example.com',
          user_metadata: { role: 'admin' },
        },
      },
      error: null,
    });

    mockUserFindMany.mockResolvedValue([
      { id: 'u1', role: 'USER' as UserRole, name: 'Admin User', authId: 'auth-1' },
      { id: 'u2', role: 'INSTRUCTOR' as UserRole, name: 'Admin Inst', authId: 'auth-1' },
      { id: 'u3', role: 'ADMIN' as UserRole, name: 'Admin', authId: 'auth-1' },
    ]);

    const res = await GET(createRequest());
    const data = await res.json();
    expect(data.roles).toHaveLength(3);
    expect(data.roles.find((r: { role: string }) => r.role === 'admin').isCurrent).toBe(true);
    expect(data.roles.find((r: { role: string }) => r.role === 'user').isCurrent).toBe(false);
  });

  it('email が検索条件に正しく渡される', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-1',
          email: 'test@example.com',
          user_metadata: { role: 'user' },
        },
      },
      error: null,
    });

    mockUserFindMany.mockResolvedValue([]);

    await GET(createRequest());

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
      })
    );
  });
});
