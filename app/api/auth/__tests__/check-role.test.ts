/**
 * Check Role API (/api/auth/check-role) テスト
 *
 * テスト対象:
 * - ロール別ユーザー検証
 * - Supabase認証セッション確認
 * - email + role 複合キーでのユーザー検索
 * - エラーハンドリング
 */

import { GET } from '../check-role/route';
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

const mockUserFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

/**
 * リクエスト作成ヘルパー
 */
function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/auth/check-role', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('認証されたユーザー - USER ロール', () => {
    it('USER ロールのユーザーが見つかった場合、200 でユーザーデータを返す', async () => {
      // Arrange
      const authUser = {
        id: 'auth-user-123',
        email: 'user@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-user-123',
        authId: 'auth-user-123',
        name: '山田太郎',
        email: 'user@example.com',
        role: 'USER' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date('2025-02-08'),
        updatedAt: new Date('2025-02-08'),
        clientProfile: {
          id: 'profile-123',
          userId: 'db-user-123',
          fullName: '山田太郎',
          phoneNumber: '09012345678',
          verificationLevel: 1,
          phoneVerified: true,
          identityVerified: false,
          address: null,
          dateOfBirth: null,
          gender: null,
          createdAt: new Date('2025-02-08'),
          updatedAt: new Date('2025-02-08'),
        },
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user.id).toBe('db-user-123');
      expect(data.user.email).toBe('user@example.com');
      expect(data.user.role).toBe('USER');
      expect(data.profile.id).toBe('profile-123');
      expect(data.profile.fullName).toBe('山田太郎');
      expect(mockGetUser).toHaveBeenCalled();
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'user@example.com',
            role: 'USER',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('認証されたユーザー - INSTRUCTOR ロール', () => {
    it('INSTRUCTOR ロールのユーザーが見つかった場合、200 でユーザーデータを返す', async () => {
      // Arrange
      const authUser = {
        id: 'auth-instructor-456',
        email: 'instructor@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-instructor-456',
        authId: 'auth-instructor-456',
        name: '鈴木花子',
        email: 'instructor@example.com',
        role: 'INSTRUCTOR' as UserRole,
        image: 'https://example.com/avatar.jpg',
        emailVerified: new Date('2025-02-01'),
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-08'),
        clientProfile: {
          id: 'profile-456',
          userId: 'db-instructor-456',
          fullName: '鈴木花子',
          phoneNumber: '09098765432',
          verificationLevel: 2,
          phoneVerified: true,
          identityVerified: true,
          address: '東京都渋谷区',
          dateOfBirth: null,
          gender: 'female',
          createdAt: new Date('2025-02-01'),
          updatedAt: new Date('2025-02-08'),
        },
        instructor: {
          id: 'ins-456',
          userId: 'db-instructor-456',
          bio: '10年の指導経験があります',
          specialties: ['ヨガ', 'ピラティス'],
          hourlyRate: 5000,
          isVerified: true,
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          user: {} as never,
        },
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=instructor');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user.id).toBe('db-instructor-456');
      expect(data.user.email).toBe('instructor@example.com');
      expect(data.user.role).toBe('INSTRUCTOR');
      expect(data.user.instructor.bio).toBe('10年の指導経験があります');
      expect(data.profile.id).toBe('profile-456');
      expect(data.profile.fullName).toBe('鈴木花子');
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'instructor@example.com',
            role: 'INSTRUCTOR',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('認証されたユーザー - ADMIN ロール', () => {
    it('ADMIN ロールのユーザーが見つかった場合、200 でユーザーデータを返す', async () => {
      // Arrange
      const authUser = {
        id: 'auth-admin-789',
        email: 'admin@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-admin-789',
        authId: 'auth-admin-789',
        name: '管理者太郎',
        email: 'admin@example.com',
        role: 'ADMIN' as UserRole,
        image: null,
        emailVerified: new Date('2025-01-01'),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-02-08'),
        clientProfile: null,
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=admin');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user.id).toBe('db-admin-789');
      expect(data.user.email).toBe('admin@example.com');
      expect(data.user.role).toBe('ADMIN');
      expect(data.profile).toBeNull();
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'admin@example.com',
            role: 'ADMIN',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('非認証ユーザー', () => {
    it('認証セッションが存在しない場合、401 Unauthorized を返す', async () => {
      // Arrange
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Session not found'),
      });

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it('getUser が AuthApiError を返した場合、401 を返す', async () => {
      // Arrange
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid access token' },
      });

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ユーザーが見つからない - role 不一致', () => {
    it('認証されたユーザーだが、指定されたロールで登録されていない場合、404 Not Found を返す', async () => {
      // Arrange
      const authUser = {
        id: 'auth-user-100',
        email: 'user100@example.com',
        user_metadata: {},
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      // USER ロールで登録されているが、INSTRUCTOR ロールで検索
      mockUserFindUnique.mockResolvedValue(null);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=instructor');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('このロールでのユーザーが見つかりません');
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'user100@example.com',
            role: 'INSTRUCTOR',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('role パラメータのデフォルト値', () => {
    it('role パラメータが指定されていない場合、デフォルト値 user が使用される', async () => {
      // Arrange
      const authUser = {
        id: 'auth-user-200',
        email: 'user200@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-user-200',
        authId: 'auth-user-200',
        name: 'テストユーザー',
        email: 'user200@example.com',
        role: 'USER' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientProfile: null,
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'user200@example.com',
            role: 'USER',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('role パラメータの大文字小文字正規化', () => {
    it('role パラメータが小文字 user の場合、大文字 USER に変換される', async () => {
      // Arrange
      const authUser = {
        id: 'auth-user-300',
        email: 'user300@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-user-300',
        authId: 'auth-user-300',
        name: 'テストユーザー2',
        email: 'user300@example.com',
        role: 'USER' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientProfile: null,
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'user300@example.com',
            role: 'USER',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    it('role パラメータが小文字 instructor の場合、大文字 INSTRUCTOR に変換される', async () => {
      // Arrange
      const authUser = {
        id: 'auth-inst-300',
        email: 'instructor300@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-inst-300',
        authId: 'auth-inst-300',
        name: 'テストサービス提供者300',
        email: 'instructor300@example.com',
        role: 'INSTRUCTOR' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientProfile: null,
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest(
        'http://localhost:3000/api/auth/check-role?role=instructor'
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'instructor300@example.com',
            role: 'INSTRUCTOR',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    it('role パラメータが小文字 admin の場合、大文字 ADMIN に変換される', async () => {
      // Arrange
      const authUser = {
        id: 'auth-admin-300',
        email: 'admin300@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-admin-300',
        authId: 'auth-admin-300',
        name: '管理者300',
        email: 'admin300@example.com',
        role: 'ADMIN' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientProfile: null,
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=admin');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'admin300@example.com',
            role: 'ADMIN',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('email + role 複合キーの正確性', () => {
    it('同じメールアドレスで複数ロールが存在する場合、指定されたロールのみを検索する', async () => {
      // Arrange
      const authUser = {
        id: 'auth-multi-role',
        email: 'multi@example.com',
        user_metadata: {},
      };

      const dbUserInstructor = {
        id: 'db-multi-inst',
        authId: 'auth-multi-role',
        name: 'マルチロール太郎',
        email: 'multi@example.com',
        role: 'INSTRUCTOR' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientProfile: null,
        instructor: {
          id: 'inst-multi',
          userId: 'db-multi-inst',
          bio: 'マルチロール',
          specialties: [],
          hourlyRate: null,
          isVerified: false,
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          user: {} as never,
        },
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUserInstructor);

      const request = createRequest(
        'http://localhost:3000/api/auth/check-role?role=instructor'
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user.role).toBe('INSTRUCTOR');
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'multi@example.com',
            role: 'INSTRUCTOR',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('include オプションの検証', () => {
    it('Prisma include オプションに clientProfile と instructor が含まれている', async () => {
      // Arrange
      const authUser = {
        id: 'auth-include-test',
        email: 'include-test@example.com',
        user_metadata: {},
      };

      const dbUser = {
        id: 'db-include-test',
        authId: 'auth-include-test',
        name: 'インクルードテスト',
        email: 'include-test@example.com',
        role: 'USER' as UserRole,
        image: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        clientProfile: {
          id: 'profile-include',
          userId: 'db-include-test',
          fullName: 'インクルードテスト',
          phoneNumber: null,
          verificationLevel: 0,
          phoneVerified: false,
          identityVerified: false,
          address: null,
          dateOfBirth: null,
          gender: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        instructor: null,
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue(dbUser);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);

      // Assert
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          email_role: {
            email: 'include-test@example.com',
            role: 'USER',
          },
        },
        include: {
          clientProfile: true,
          instructor: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('予期しないエラーが発生した場合、500 Internal Error を返す', async () => {
      // Arrange
      mockGetUser.mockRejectedValue(new Error('Unexpected database error'));

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('Prisma findUnique が失敗した場合、500 を返す', async () => {
      // Arrange
      const authUser = {
        id: 'auth-error-test',
        email: 'error-test@example.com',
        user_metadata: {},
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      mockUserFindUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('メールアドレス処理', () => {
    it('authUser.email が null の場合を正しく処理する', async () => {
      // Arrange
      const authUser = {
        id: 'auth-no-email',
        email: undefined,
        user_metadata: {},
      };

      mockGetUser.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      // 実装ではメールアドレスに ! を付けてアクセスするため、
      // undefinedの場合テストの観点ではfindUniqueは呼ばれる
      // ただし、Supabaseはメールアドレスなしのユーザーを返さないため
      // これはエッジケース
      mockUserFindUnique.mockResolvedValue(null);

      const request = createRequest('http://localhost:3000/api/auth/check-role?role=user');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      // 実装ではメールアドレスがない場合でも処理は続行されるため
      // findUniqueは呼ばれるが結果は見つからない（nullが返される）
      expect(mockUserFindUnique).toHaveBeenCalled();
      expect(response.status).toBe(404);
    });
  });
});
