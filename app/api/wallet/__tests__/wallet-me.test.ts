import { NextRequest } from 'next/server';

/**
 * ウォレットAPI（/api/wallet/me）のテストスイート
 */

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

const mockUserFindUnique = jest.fn();
const mockWalletFindUnique = jest.fn();
const mockWalletCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    wallet: {
      findUnique: (...args: unknown[]) => mockWalletFindUnique(...args),
      create: (...args: unknown[]) => mockWalletCreate(...args),
    },
  },
}));

import { GET } from '../me/route';

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/wallet/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('認証済みユーザーのウォレット残高を取得', async () => {
    const mockUser = { id: 'auth-user-1', email: 'user@example.com' };
    const mockDbUser = { id: 'db-user-1', email: 'user@example.com', role: 'USER' };
    const mockWallet = { id: 'wallet-1', userId: 'db-user-1', balance: 5000 };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockWalletFindUnique.mockResolvedValue(mockWallet);

    const request = createRequest('http://localhost/api/wallet/me?role=user');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockWallet);
  });

  test('ウォレットが存在しない場合は自動作成', async () => {
    const mockUser = { id: 'auth-user-1', email: 'user@example.com' };
    const mockDbUser = { id: 'db-user-1', email: 'user@example.com', role: 'USER' };
    const createdWallet = { id: 'wallet-1', userId: 'db-user-1', balance: 0 };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockWalletFindUnique.mockResolvedValue(null);
    mockWalletCreate.mockResolvedValue(createdWallet);

    const request = createRequest('http://localhost/api/wallet/me?role=user');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockWalletCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'db-user-1',
          balance: 0,
        },
      })
    );
    const data = await response.json();
    expect(data.balance).toBe(0);
  });

  test('未認証の場合は401エラーを返す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    });

    const request = createRequest('http://localhost/api/wallet/me?role=user');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  test('ユーザーが見つからない場合は404エラーを返す', async () => {
    const mockUser = { id: 'auth-user-1', email: 'user@example.com' };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue(null);

    const request = createRequest('http://localhost/api/wallet/me?role=user');
    const response = await GET(request);

    expect(response.status).toBe(404);
  });

  test('role=instructorでウォレットを取得', async () => {
    const mockUser = { id: 'auth-user-1', email: 'instructor@example.com' };
    const mockDbUser = { id: 'db-user-1', email: 'instructor@example.com', role: 'INSTRUCTOR' };
    const mockWallet = { id: 'wallet-1', userId: 'db-user-1', balance: 10000 };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockWalletFindUnique.mockResolvedValue(mockWallet);

    const request = createRequest('http://localhost/api/wallet/me?role=instructor');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email_role: {
            email: 'instructor@example.com',
            role: 'INSTRUCTOR',
          },
        },
      })
    );
    const data = await response.json();
    expect(data).toEqual(mockWallet);
  });

  test('roleクエリパラメータが省略された場合はデフォルトでUSERを使用', async () => {
    const mockUser = { id: 'auth-user-1', email: 'user@example.com' };
    const mockDbUser = { id: 'db-user-1', email: 'user@example.com', role: 'USER' };
    const mockWallet = { id: 'wallet-1', userId: 'db-user-1', balance: 5000 };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockWalletFindUnique.mockResolvedValue(mockWallet);

    const request = createRequest('http://localhost/api/wallet/me');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email_role: {
            email: 'user@example.com',
            role: 'USER',
          },
        },
      })
    );
  });
});
