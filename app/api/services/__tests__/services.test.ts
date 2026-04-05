/**
 * サービスAPI テスト
 * GET /api/services - サービス一覧取得
 * POST /api/services - サービス作成
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// ==================== Mocks ====================

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

const mockServiceCount = jest.fn();
const mockServiceFindMany = jest.fn();
const mockServiceCreate = jest.fn();
const mockUserFindFirst = jest.fn();
const mockInstructorFindUnique = jest.fn();
const mockClientProfileFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    service: {
      count: (...args: unknown[]) => mockServiceCount(...args),
      findMany: (...args: unknown[]) => mockServiceFindMany(...args),
      create: (...args: unknown[]) => mockServiceCreate(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    instructor: {
      findUnique: (...args: unknown[]) => mockInstructorFindUnique(...args),
    },
    clientProfile: {
      findUnique: (...args: unknown[]) => mockClientProfileFindUnique(...args),
    },
  },
}));

// ==================== Helper Functions ====================

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init as any);
}

// ==================== Test Setup ====================

beforeEach(() => {
  jest.clearAllMocks();
});

// ==================== GET Tests ====================

describe('GET /api/services', () => {
  describe('基本的なサービス一覧取得', () => {
    it('認証不要でサービス一覧を取得して200を返す', async () => {
      const mockServices = [
        {
          id: 'svc-1',
          title: 'ヨガ入門',
          category: 'fitness',
          price: 3000,
          duration: 60,
          instructorId: 'ins-1',
          isActive: true,
          deliveryType: 'onsite',
          location: '東京都渋谷区',
          instructor: {
            id: 'ins-1',
            user: { id: 'user-1', name: '山田太郎' },
          },
          schedules: [],
          campaigns: [],
          images: [],
        },
      ];

      mockServiceCount.mockResolvedValue(1);
      mockServiceFindMany.mockResolvedValue(mockServices);

      const req = createRequest('http://localhost/api/services');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.services).toEqual(mockServices);
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(12);
      expect(data.totalPages).toBe(1);
    });

    it('空のサービス一覧を返す', async () => {
      mockServiceCount.mockResolvedValue(0);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.services).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.totalPages).toBe(0);
    });
  });

  describe('カテゴリフィルタ', () => {
    it('categoryパラメータでフィルタリングする', async () => {
      mockServiceCount.mockResolvedValue(2);
      mockServiceFindMany.mockResolvedValue([
        {
          id: 'svc-1',
          category: 'fitness',
          title: 'ヨガ',
          price: 3000,
          duration: 60,
          instructor: { user: { name: 'User 1' } },
          schedules: [],
          campaigns: [],
          images: [],
        },
      ]);

      const req = createRequest('http://localhost/api/services?category=fitness');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'fitness',
          }),
        })
      );
    });
  });

  describe('価格範囲フィルタ', () => {
    it('priceMinで最小価格でフィルタリングする', async () => {
      mockServiceCount.mockResolvedValue(3);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?priceMin=2000');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 2000 },
          }),
        })
      );
    });

    it('priceMaxで最大価格でフィルタリングする', async () => {
      mockServiceCount.mockResolvedValue(3);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?priceMax=5000');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { lte: 5000 },
          }),
        })
      );
    });

    it('priceMinとpriceMaxの両方でフィルタリングする', async () => {
      mockServiceCount.mockResolvedValue(2);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?priceMin=2000&priceMax=5000');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 2000, lte: 5000 },
          }),
        })
      );
    });

    it('無効な価格はNaNとして無視される', async () => {
      mockServiceCount.mockResolvedValue(10);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?priceMin=invalid&priceMax=notanumber');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            price: expect.anything(),
          }),
        })
      );
    });
  });

  describe('フリーワード検索', () => {
    it('qパラメータでタイトルを検索する', async () => {
      mockServiceCount.mockResolvedValue(1);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?q=ヨガ');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({
                  contains: 'ヨガ',
                  mode: 'insensitive',
                }),
              }),
            ]),
          }),
        })
      );
    });

    it('qパラメータで説明を検索する', async () => {
      mockServiceCount.mockResolvedValue(1);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?q=初心者向け');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                description: expect.objectContaining({
                  contains: '初心者向け',
                  mode: 'insensitive',
                }),
              }),
            ]),
          }),
        })
      );
    });

    it('qパラメータでインストラクター名を検索する', async () => {
      mockServiceCount.mockResolvedValue(1);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?q=山田太郎');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                instructor: expect.objectContaining({
                  user: expect.objectContaining({
                    name: expect.objectContaining({
                      contains: '山田太郎',
                      mode: 'insensitive',
                    }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('ページネーション', () => {
    it('デフォルトでpage=1, limit=12を使用する', async () => {
      mockServiceCount.mockResolvedValue(50);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 12,
        })
      );
    });

    it('ページ2の場合正しくスキップをする', async () => {
      mockServiceCount.mockResolvedValue(50);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?page=2&limit=12');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 12,
          take: 12,
        })
      );
    });

    it('limitが最大50に制限される', async () => {
      mockServiceCount.mockResolvedValue(100);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?limit=100');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('負のページ番号は1にクランプされる', async () => {
      mockServiceCount.mockResolvedValue(50);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?page=-5');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 12,
        })
      );
    });

    it('totalPagesを正しく計算する', async () => {
      mockServiceCount.mockResolvedValue(50);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?limit=12');
      const res = await GET(req);

      const data = await res.json();
      expect(data.totalPages).toBe(5); // Math.ceil(50 / 12)
    });

    it('page=3でレスポンスに正しいpage情報を含める', async () => {
      mockServiceCount.mockResolvedValue(100);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?page=3&limit=20');
      const res = await GET(req);

      const data = await res.json();
      expect(data.page).toBe(3);
      expect(data.limit).toBe(20);
    });
  });

  describe('ソート', () => {
    it('デフォルトではnewest（作成日時降順）でソート', async () => {
      mockServiceCount.mockResolvedValue(5);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('price_ascで価格が安い順にソート', async () => {
      mockServiceCount.mockResolvedValue(5);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?sortBy=price_asc');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        })
      );
    });

    it('price_descで価格が高い順にソート', async () => {
      mockServiceCount.mockResolvedValue(5);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?sortBy=price_desc');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'desc' },
        })
      );
    });

    it('無効なsortByは作成日時降順として扱われる', async () => {
      mockServiceCount.mockResolvedValue(5);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?sortBy=invalid_sort');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('複数フィルタの組み合わせ', () => {
    it('複数のフィルタを組み合わせて検索できる', async () => {
      mockServiceCount.mockResolvedValue(2);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest(
        'http://localhost/api/services?category=fitness&priceMin=1000&priceMax=5000&deliveryType=onsite'
      );
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'fitness',
            deliveryType: 'onsite',
            price: { gte: 1000, lte: 5000 },
          }),
        })
      );
    });

    it('instructorIdでフィルタリングできる', async () => {
      mockServiceCount.mockResolvedValue(3);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?instructorId=ins-123');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            instructorId: 'ins-123',
          }),
        })
      );
    });

    it('isActiveでフィルタリングできる', async () => {
      mockServiceCount.mockResolvedValue(5);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?isActive=true');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('locationでフィルタリングできる', async () => {
      mockServiceCount.mockResolvedValue(4);
      mockServiceFindMany.mockResolvedValue([]);

      const req = createRequest('http://localhost/api/services?location=東京都');
      await GET(req);

      expect(mockServiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: '東京都',
          }),
        })
      );
    });
  });

  describe('レスポンス形式', () => {
    it('正しいレスポンス形式を返す', async () => {
      const mockServices = [
        {
          id: 'svc-1',
          title: 'ヨガ',
          category: 'fitness',
          price: 3000,
          duration: 60,
          instructorId: 'ins-1',
          isActive: true,
          deliveryType: 'onsite',
          location: '東京',
          instructor: { id: 'ins-1', user: { id: 'u1', name: 'Teacher' } },
          schedules: [],
          campaigns: [],
          images: [],
        },
        {
          id: 'svc-2',
          title: 'ピラティス',
          category: 'fitness',
          price: 4000,
          duration: 90,
          instructorId: 'ins-2',
          isActive: true,
          deliveryType: 'hybrid',
          location: '大阪',
          instructor: { id: 'ins-2', user: { id: 'u2', name: 'Instructor' } },
          schedules: [],
          campaigns: [],
          images: [],
        },
      ];

      mockServiceCount.mockResolvedValue(2);
      mockServiceFindMany.mockResolvedValue(mockServices);

      const req = createRequest('http://localhost/api/services');
      const res = await GET(req);

      const data = await res.json();
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('totalPages');
      expect(Array.isArray(data.services)).toBe(true);
    });
  });
});

// ==================== POST Tests ====================

describe('POST /api/services', () => {
  describe('認証済みインストラクターでのサービス作成', () => {
    beforeEach(() => {
      // 認証をセットアップ
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
      mockInstructorFindUnique.mockResolvedValue({
        id: 'ins-1',
        userId: 'user-1',
      });
      mockClientProfileFindUnique.mockResolvedValue({
        userId: 'user-1',
        verificationLevel: 2,
        identityVerified: true,
      });
    });

    it('必須項目のみでサービスを作成して201を返す', async () => {
      const mockCreatedService = {
        id: 'svc-1',
        instructorId: 'ins-1',
        title: 'テストサービス',
        category: 'fitness',
        price: 3000,
        duration: 60,
        description: null,
        deliveryType: 'remote',
        location: null,
        isActive: true,
        recurrenceType: 'ONCE',
        availableDays: [],
        startTime: null,
        endTime: null,
        timezone: 'Asia/Tokyo',
        validFrom: null,
        validUntil: null,
        maxParticipants: 1,
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      };

      mockServiceCreate.mockResolvedValue(mockCreatedService);

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テストサービス',
          category: 'fitness',
          price: 3000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe('svc-1');
      expect(data.title).toBe('テストサービス');
      expect(data.instructorId).toBe('ins-1');
    });

    it('すべてのフィールドでサービスを作成できる', async () => {
      const mockCreatedService = {
        id: 'svc-2',
        instructorId: 'ins-1',
        title: 'フルスペックサービス',
        description: '詳しい説明',
        category: 'fitness',
        deliveryType: 'hybrid',
        location: '東京都渋谷区',
        price: 5000,
        duration: 120,
        isActive: true,
        recurrenceType: 'WEEKLY',
        availableDays: ['MON', 'WED', 'FRI'],
        startTime: '10:00',
        endTime: '11:30',
        timezone: 'Asia/Tokyo',
        validFrom: new Date('2025-02-08'),
        validUntil: new Date('2025-12-31'),
        maxParticipants: 5,
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      };

      mockServiceCreate.mockResolvedValue(mockCreatedService);

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'フルスペックサービス',
          description: '詳しい説明',
          category: 'fitness',
          deliveryType: 'hybrid',
          location: '東京都渋谷区',
          price: 5000,
          duration: 120,
          recurrenceType: 'WEEKLY',
          availableDays: ['MON', 'WED', 'FRI'],
          startTime: '10:00',
          endTime: '11:30',
          maxParticipants: 5,
          validFrom: '2025-02-08',
          validUntil: '2025-12-31',
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockServiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'フルスペックサービス',
            description: '詳しい説明',
            deliveryType: 'hybrid',
            location: '東京都渋谷区',
            maxParticipants: 5,
          }),
        })
      );
    });

    it('デフォルト値でサービスを作成できる', async () => {
      const mockCreatedService = {
        id: 'svc-3',
        instructorId: 'ins-1',
        title: 'シンプルサービス',
        category: 'fitness',
        price: 2000,
        duration: 45,
        description: null,
        deliveryType: 'remote', // default
        location: null,
        isActive: true, // default
        recurrenceType: 'ONCE', // default
        availableDays: [],
        startTime: null,
        endTime: null,
        timezone: 'Asia/Tokyo', // default
        validFrom: null,
        validUntil: null,
        maxParticipants: 1, // default
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      };

      mockServiceCreate.mockResolvedValue(mockCreatedService);

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'シンプルサービス',
          category: 'fitness',
          price: 2000,
          duration: 45,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockServiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliveryType: 'remote',
            isActive: false, // 作成時は非公開（管理者承認後に公開）
            publishStatus: 'DRAFT',
            recurrenceType: 'ONCE',
            timezone: 'Asia/Tokyo',
            maxParticipants: 1,
          }),
        })
      );
    });
  });

  describe('未認証ユーザーの場合', () => {
    it('認証がない場合401を返す', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('ユーザーロールのチェック', () => {
    it('USER ロールではサービス作成できない（403）', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'USER', // USER ロール
      });

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.message).toContain('サービス提供者');
    });
  });

  describe('サービス提供者情報のチェック', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
    });

    it('サービス提供者情報がない場合404を返す', async () => {
      mockInstructorFindUnique.mockResolvedValue(null);

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.message).toContain('サービス提供者');
    });
  });

  describe('必須フィールドのバリデーション', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
      mockInstructorFindUnique.mockResolvedValue({
        id: 'ins-1',
        userId: 'user-1',
      });
      mockClientProfileFindUnique.mockResolvedValue({
        userId: 'user-1',
        verificationLevel: 2,
        identityVerified: true,
      });
    });

    it('titleがない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          category: 'fitness',
          price: 1000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('categoryがない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          price: 1000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('priceがない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('durationがない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('繰り返しサービスのバリデーション', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
      mockInstructorFindUnique.mockResolvedValue({
        id: 'ins-1',
        userId: 'user-1',
      });
      mockClientProfileFindUnique.mockResolvedValue({
        userId: 'user-1',
        verificationLevel: 2,
        identityVerified: true,
      });
    });

    it('繰り返しサービスで曜日がない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
          recurrenceType: 'WEEKLY',
          startTime: '10:00',
          endTime: '11:00',
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain('曜日');
    });

    it('繰り返しサービスで開始時間がない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
          recurrenceType: 'MONTHLY',
          availableDays: ['MON'],
          endTime: '11:00',
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain('曜日');
    });

    it('繰り返しサービスで終了時間がない場合400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
          recurrenceType: 'BIWEEKLY',
          availableDays: ['MON', 'WED'],
          startTime: '10:00',
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain('曜日');
    });

    it('ONCE以外で空の曜日配列は400を返す', async () => {
      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
          recurrenceType: 'WEEKLY',
          availableDays: [],
          startTime: '10:00',
          endTime: '11:00',
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain('曜日');
    });
  });

  describe('ONCE タイプのバリデーション', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
      mockInstructorFindUnique.mockResolvedValue({
        id: 'ins-1',
        userId: 'user-1',
      });
      mockClientProfileFindUnique.mockResolvedValue({
        userId: 'user-1',
        verificationLevel: 2,
        identityVerified: true,
      });
    });

    it('ONCE型では曜日がなくても成功する', async () => {
      const mockCreatedService = {
        id: 'svc-once',
        instructorId: 'ins-1',
        title: '単発サービス',
        category: 'fitness',
        price: 1000,
        duration: 60,
        description: null,
        deliveryType: 'remote',
        location: null,
        isActive: true,
        recurrenceType: 'ONCE',
        availableDays: [],
        startTime: null,
        endTime: null,
        timezone: 'Asia/Tokyo',
        validFrom: null,
        validUntil: null,
        maxParticipants: 1,
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      };

      mockServiceCreate.mockResolvedValue(mockCreatedService);

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: '単発サービス',
          category: 'fitness',
          price: 1000,
          duration: 60,
          recurrenceType: 'ONCE',
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  describe('データの正規化と型変換', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
      mockInstructorFindUnique.mockResolvedValue({
        id: 'ins-1',
        userId: 'user-1',
      });
      mockClientProfileFindUnique.mockResolvedValue({
        userId: 'user-1',
        verificationLevel: 2,
        identityVerified: true,
      });
    });

    it('価格と期間を数値に変換する', async () => {
      mockServiceCreate.mockResolvedValue({
        id: 'svc-1',
        instructorId: 'ins-1',
        title: 'テスト',
        category: 'fitness',
        price: 3000,
        duration: 60,
        description: null,
        deliveryType: 'remote',
        location: null,
        isActive: true,
        recurrenceType: 'ONCE',
        availableDays: [],
        startTime: null,
        endTime: null,
        timezone: 'Asia/Tokyo',
        validFrom: null,
        validUntil: null,
        maxParticipants: 1,
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      });

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: '3000', // 文字列
          duration: '60', // 文字列
        }),
      });

      await POST(req);

      expect(mockServiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 3000,
            duration: 60,
          }),
        })
      );
    });

    it('日付をDateオブジェクトに変換する', async () => {
      mockServiceCreate.mockResolvedValue({
        id: 'svc-1',
        instructorId: 'ins-1',
        title: 'テスト',
        category: 'fitness',
        price: 1000,
        duration: 60,
        description: null,
        deliveryType: 'remote',
        location: null,
        isActive: true,
        recurrenceType: 'ONCE',
        availableDays: [],
        startTime: null,
        endTime: null,
        timezone: 'Asia/Tokyo',
        validFrom: new Date('2025-02-08'),
        validUntil: new Date('2025-12-31'),
        maxParticipants: 1,
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      });

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
          validFrom: '2025-02-08',
          validUntil: '2025-12-31',
        }),
      });

      await POST(req);

      expect(mockServiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validFrom: expect.any(Date),
            validUntil: expect.any(Date),
          }),
        })
      );
    });

    it('isActiveをボール値に変換する', async () => {
      mockServiceCreate.mockResolvedValue({
        id: 'svc-1',
        instructorId: 'ins-1',
        title: 'テスト',
        category: 'fitness',
        price: 1000,
        duration: 60,
        description: null,
        deliveryType: 'remote',
        location: null,
        isActive: false,
        recurrenceType: 'ONCE',
        availableDays: [],
        startTime: null,
        endTime: null,
        timezone: 'Asia/Tokyo',
        validFrom: null,
        validUntil: null,
        maxParticipants: 1,
        instructor: { id: 'ins-1', user: { id: 'user-1' } },
        schedules: [],
        campaigns: [],
        images: [],
      });

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
          isActive: false,
        }),
      });

      await POST(req);

      expect(mockServiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      });
      mockUserFindFirst.mockResolvedValue({
        id: 'user-1',
        authId: 'auth-1',
        role: 'INSTRUCTOR',
      });
      mockInstructorFindUnique.mockResolvedValue({
        id: 'ins-1',
        userId: 'user-1',
      });
      mockClientProfileFindUnique.mockResolvedValue({
        userId: 'user-1',
        verificationLevel: 2,
        identityVerified: true,
      });
    });

    it('予期しないエラーは500を返す', async () => {
      mockServiceCreate.mockRejectedValue(new Error('Database error'));

      const req = createRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          title: 'テスト',
          category: 'fitness',
          price: 1000,
          duration: 60,
        }),
      });

      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });
});
