import { NextRequest, NextResponse } from 'next/server';

/**
 * 通知APIのテストスイート（/api/notifications）
 */

const mockGetAuthUser = jest.fn();
jest.mock('@/lib/api/auth', () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

const mockNotificationFindMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
    },
  },
}));

// withErrorHandler をパススルーにする
jest.mock('@/lib/api/errors', () => ({
  withErrorHandler: (handler: Function) => handler,
  unauthorizedError: () =>
    NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 }),
}));

import { GET } from '../route';

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('認証済みユーザーの通知一覧を取得', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };
    const mockNotifications = [
      {
        id: 'notif-1',
        userId: 'prisma-user-1',
        type: 'RESERVATION_CONFIRMED',
        category: 'BOOKING',
        message: '予約が確認されました',
        isRead: false,
        isDismissed: false,
        priority: 2,
        expiresAt: null,
        createdAt: '2025-02-08T12:00:00.000Z',
      },
      {
        id: 'notif-2',
        userId: null,
        type: 'SYSTEM_ANNOUNCEMENT',
        category: 'SYSTEM',
        message: 'システムメンテナンスのお知らせ',
        isRead: false,
        isDismissed: false,
        priority: 1,
        expiresAt: '2025-02-15T00:00:00.000Z',
        createdAt: '2025-02-08T10:00:00.000Z',
      },
    ];

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue(mockNotifications);

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.length).toBe(2);
  });

  test('未読のみフィルタで取得', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue([]);

    const request = createRequest('http://localhost/api/notifications?unread=true');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockNotificationFindMany).toHaveBeenCalled();
  });

  test('未認証の場合は401エラーを返す', async () => {
    mockGetAuthUser.mockResolvedValue(
      NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
    );

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  test('結果が50件に制限される', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue([]);

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  test('優先度・日時でソートされる', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue([]);

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      })
    );
  });

  test('個別通知と全体通知の両方を取得（Prisma User IDを使用）', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue([]);

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [
                { userId: 'prisma-user-1' },
                { userId: null },
              ],
            }),
          ]),
        }),
      })
    );
  });

  test('isDismissedがfalseのもののみ取得', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue([]);

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ isDismissed: false }),
          ]),
        }),
      })
    );
  });

  test('通知がない場合は空配列を返す', async () => {
    const mockDbUser = { id: 'prisma-user-1', authId: 'auth-user-1', email: 'user@example.com', role: 'USER' };

    mockGetAuthUser.mockResolvedValue({
      dbUser: mockDbUser,
      authUser: { id: 'auth-user-1', email: 'user@example.com' },
    });
    mockNotificationFindMany.mockResolvedValue([]);

    const request = createRequest('http://localhost/api/notifications');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});
