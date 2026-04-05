/**
 * 認証ヘルパーのテスト
 */
import { NextResponse } from 'next/server';

// モックをjest.mockファクトリ内で定義（ホイスティング対応）
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

const mockUserFindFirst = jest.fn();
const mockInstructorFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    instructor: {
      findUnique: (...args: unknown[]) => mockInstructorFindUnique(...args),
    },
  },
}));

import { getAuthUser, getAuthInstructor, getAuthAdmin } from '../auth';

describe('getAuthUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証済みユーザーの情報を返す', async () => {
    const authUser = { id: 'auth-123', email: 'test@example.com' };
    const dbUser = { id: 'user-123', authId: 'auth-123', name: 'テスト', role: 'USER' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);

    const result = await getAuthUser();
    expect(result).not.toBeInstanceOf(NextResponse);

    if (!(result instanceof NextResponse)) {
      expect(result.dbUser.id).toBe('user-123');
      expect(result.authUser.id).toBe('auth-123');
    }
  });

  it('未認証の場合は401エラーを返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

    const result = await getAuthUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('Supabaseユーザーが存在するがPrismaユーザーがない場合は404を返す', async () => {
    const authUser = { id: 'auth-123' };
    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(null);

    const result = await getAuthUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(404);
  });
});

describe('getAuthInstructor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('INSTRUCTORロールのインストラクター情報を返す', async () => {
    const authUser = { id: 'auth-123' };
    const dbUser = { id: 'user-123', authId: 'auth-123', role: 'INSTRUCTOR' };
    const instructor = { id: 'ins-123', userId: 'user-123', bio: 'テスト' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);
    mockInstructorFindUnique.mockResolvedValue(instructor);

    const result = await getAuthInstructor();
    expect(result).not.toBeInstanceOf(NextResponse);

    if (!(result instanceof NextResponse)) {
      expect(result.instructor.id).toBe('ins-123');
      expect(result.dbUser.id).toBe('user-123');
    }
  });

  it('USERロールの場合は403エラーを返す', async () => {
    const authUser = { id: 'auth-123' };
    const dbUser = { id: 'user-123', authId: 'auth-123', role: 'USER' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);

    const result = await getAuthInstructor();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('INSTRUCTORロールだがinstructor情報がない場合は404を返す', async () => {
    const authUser = { id: 'auth-123' };
    const dbUser = { id: 'user-123', authId: 'auth-123', role: 'INSTRUCTOR' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);
    mockInstructorFindUnique.mockResolvedValue(null);

    const result = await getAuthInstructor();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(404);
  });
});

describe('getAuthAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ADMINロールの場合は管理者情報を返す', async () => {
    const authUser = { id: 'auth-123' };
    const dbUser = { id: 'user-123', authId: 'auth-123', role: 'ADMIN' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);

    const result = await getAuthAdmin();
    expect(result).not.toBeInstanceOf(NextResponse);

    if (!(result instanceof NextResponse)) {
      expect(result.dbUser.role).toBe('ADMIN');
    }
  });

  it('USERロールの場合は403エラーを返す', async () => {
    const authUser = { id: 'auth-123' };
    const dbUser = { id: 'user-123', authId: 'auth-123', role: 'USER' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);

    const result = await getAuthAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('INSTRUCTORロールの場合は403エラーを返す', async () => {
    const authUser = { id: 'auth-123' };
    const dbUser = { id: 'user-123', authId: 'auth-123', role: 'INSTRUCTOR' };

    mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockUserFindFirst.mockResolvedValue(dbUser);

    const result = await getAuthAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('未認証の場合は401エラーを返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });

    const result = await getAuthAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});
