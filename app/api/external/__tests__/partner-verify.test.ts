import { GET } from '../partner/verify/route';
import { NextRequest } from 'next/server';

const mockVerifyPartnerRequest = jest.fn();
jest.mock('@/lib/partner/auth', () => ({
  verifyPartnerRequest: (...args: unknown[]) => mockVerifyPartnerRequest(...args),
}));

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('/api/external/partner/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('正しい署名でパートナー認証成功 → 200 with valid: true, partner info, restrictions', async () => {
      const mockPartner = {
        id: 'ptr-123',
        name: 'テストパートナー',
        code: 'test-partner',
        logoUrl: 'https://example.com/logo.png',
        paymentMode: 'COORDY',
        allowGuest: true,
        requirePhone: false,
        instructorIds: ['ins-1'],
        serviceIds: ['svc-1'],
      };

      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: mockPartner,
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.partner).toEqual({
        id: 'ptr-123',
        name: 'テストパートナー',
        code: 'test-partner',
        logoUrl: 'https://example.com/logo.png',
        paymentMode: 'COORDY',
        allowGuest: true,
        requirePhone: false,
      });
      expect(data.restrictions).toEqual({
        instructorIds: ['ins-1'],
        serviceIds: ['svc-1'],
      });
      expect(mockVerifyPartnerRequest).toHaveBeenCalledWith(
        'ptr-123',
        1707400000,
        'abc123xyz'
      );
    });

    it('制限なしのパートナーで空配列を返す', async () => {
      const mockPartner = {
        id: 'ptr-456',
        name: 'フルアクセスパートナー',
        code: 'full-access',
        logoUrl: null,
        paymentMode: 'EXTERNAL',
        allowGuest: false,
        requirePhone: true,
        instructorIds: [],
        serviceIds: [],
      };

      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: mockPartner,
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-456&ts=1707400001&sig=def456abc'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.restrictions).toEqual({
        instructorIds: [],
        serviceIds: [],
      });
    });
  });

  describe('パラメータ検証エラー', () => {
    it('partner_idパラメータ欠落 → 400 MISSING_PARAMETERS', async () => {
      const request = createRequest(
        'http://localhost/api/external/partner/verify?ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('MISSING_PARAMETERS');
      expect(mockVerifyPartnerRequest).not.toHaveBeenCalled();
    });

    it('tsパラメータ欠落 → 400 MISSING_PARAMETERS', async () => {
      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('MISSING_PARAMETERS');
      expect(mockVerifyPartnerRequest).not.toHaveBeenCalled();
    });

    it('sigパラメータ欠落 → 400 MISSING_PARAMETERS', async () => {
      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('MISSING_PARAMETERS');
      expect(mockVerifyPartnerRequest).not.toHaveBeenCalled();
    });

    it('無効なタイムスタンプ(NaN) → 400 INVALID_TIMESTAMP', async () => {
      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=invalid&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('INVALID_TIMESTAMP');
      expect(mockVerifyPartnerRequest).not.toHaveBeenCalled();
    });

    it('タイムスタンプが負数の場合はverifyPartnerRequestに委譲される', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: false,
        error: 'EXPIRED_TIMESTAMP',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=-1000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      // 負数はparseIntで有効な数値なので、verifyPartnerRequestに渡される
      expect(response.status).toBe(401);
      expect(data.valid).toBe(false);
      expect(mockVerifyPartnerRequest).toHaveBeenCalledWith('ptr-123', -1000, 'abc123xyz');
    });
  });

  describe('署名・認証エラー', () => {
    it('不正な署名 → 401 INVALID_SIGNATURE', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: false,
        error: 'INVALID_SIGNATURE',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=wrong_signature'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('INVALID_SIGNATURE');
    });

    it('期限切れタイムスタンプ → 401 EXPIRED_TIMESTAMP', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: false,
        error: 'EXPIRED_TIMESTAMP',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707300000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('EXPIRED_TIMESTAMP');
    });

    it('無効なパートナーID → 401 INVALID_PARTNER', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: false,
        error: 'INVALID_PARTNER',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-nonexistent&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('INVALID_PARTNER');
    });

    it('無効化されたパートナー → 401 INACTIVE_PARTNER', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: false,
        error: 'INACTIVE_PARTNER',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-inactive&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('INACTIVE_PARTNER');
    });
  });

  describe('サーバーエラー', () => {
    it('内部エラー時 → 500 INTERNAL_ERROR (verifyPartnerRequest throws)', async () => {
      mockVerifyPartnerRequest.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('INTERNAL_ERROR');
    });

    it('予期しないエラーをキャッチ → 500 INTERNAL_ERROR', async () => {
      mockVerifyPartnerRequest.mockRejectedValue(new Error('Unexpected error'));

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
    });

    it('Prismaエラーをハンドル → 500 INTERNAL_ERROR', async () => {
      mockVerifyPartnerRequest.mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });

  describe('エッジケース', () => {
    it('複数の署名が含まれている場合は最初の値を使用', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-123',
          name: 'テストパートナー',
          code: 'test-partner',
          logoUrl: null,
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: [],
          serviceIds: [],
        },
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz&sig=def456abc'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockVerifyPartnerRequest).toHaveBeenCalledWith(
        'ptr-123',
        1707400000,
        'abc123xyz'
      );
    });

    it('特殊文字を含むpartner_idをハンドル', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-with-special_chars.123',
          name: 'パートナー',
          code: 'special',
          logoUrl: null,
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: [],
          serviceIds: [],
        },
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-with-special_chars.123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
    });

    it('大きなタイムスタンプ値をハンドル', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-123',
          name: 'テストパートナー',
          code: 'test-partner',
          logoUrl: null,
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: [],
          serviceIds: [],
        },
      });

      const largeTimestamp = 9999999999;
      const request = createRequest(
        `http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=${largeTimestamp}&sig=abc123xyz`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockVerifyPartnerRequest).toHaveBeenCalledWith(
        'ptr-123',
        largeTimestamp,
        'abc123xyz'
      );
    });

    it('空文字列のpartner_idはMISSING_PARAMETERSを返す', async () => {
      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('MISSING_PARAMETERS');
    });

    it('空文字列のtsはMISSING_PARAMETERSを返す', async () => {
      // URLSearchParams.get('ts')は空文字列を返すが、!ts で falsy なのでMISSING_PARAMETERS
      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('MISSING_PARAMETERS');
    });

    it('空文字列のsigはMISSING_PARAMETERSを返す', async () => {
      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig='
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('MISSING_PARAMETERS');
    });
  });

  describe('verifyPartnerRequest呼び出し', () => {
    it('正しいパラメータで関数が呼ばれる', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-123',
          name: 'テストパートナー',
          code: 'test-partner',
          logoUrl: null,
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: [],
          serviceIds: [],
        },
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-test&ts=1707400000&sig=signature123'
      );

      await GET(request);

      expect(mockVerifyPartnerRequest).toHaveBeenCalledTimes(1);
      expect(mockVerifyPartnerRequest).toHaveBeenCalledWith(
        'ptr-test',
        1707400000,
        'signature123'
      );
    });

    it('複数回のリクエストで毎回関数が呼ばれる', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-123',
          name: 'テストパートナー',
          code: 'test-partner',
          logoUrl: null,
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: [],
          serviceIds: [],
        },
      });

      const request1 = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-1&ts=1707400000&sig=sig1'
      );
      const request2 = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-2&ts=1707400001&sig=sig2'
      );

      await GET(request1);
      await GET(request2);

      expect(mockVerifyPartnerRequest).toHaveBeenCalledTimes(2);
      expect(mockVerifyPartnerRequest).toHaveBeenNthCalledWith(
        1,
        'ptr-1',
        1707400000,
        'sig1'
      );
      expect(mockVerifyPartnerRequest).toHaveBeenNthCalledWith(
        2,
        'ptr-2',
        1707400001,
        'sig2'
      );
    });
  });

  describe('レスポンス形式', () => {
    it('成功レスポンスに必須フィールドがすべて含まれている', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-123',
          name: 'テストパートナー',
          code: 'test-partner',
          logoUrl: 'https://example.com/logo.png',
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: ['ins-1'],
          serviceIds: ['svc-1'],
        },
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('valid');
      expect(data).toHaveProperty('partner');
      expect(data).toHaveProperty('restrictions');
      expect(data.partner).toHaveProperty('id');
      expect(data.partner).toHaveProperty('name');
      expect(data.partner).toHaveProperty('code');
      expect(data.partner).toHaveProperty('logoUrl');
      expect(data.partner).toHaveProperty('paymentMode');
      expect(data.partner).toHaveProperty('allowGuest');
      expect(data.partner).toHaveProperty('requirePhone');
      expect(data.restrictions).toHaveProperty('instructorIds');
      expect(data.restrictions).toHaveProperty('serviceIds');
    });

    it('エラーレスポンスに必須フィールドが含まれている', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: false,
        error: 'INVALID_SIGNATURE',
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=wrong'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('valid');
      expect(data).toHaveProperty('error');
      expect(data.valid).toBe(false);
    });

    it('Content-Typeはapplication/jsonである', async () => {
      mockVerifyPartnerRequest.mockResolvedValue({
        valid: true,
        partner: {
          id: 'ptr-123',
          name: 'テストパートナー',
          code: 'test-partner',
          logoUrl: null,
          paymentMode: 'COORDY',
          allowGuest: true,
          requirePhone: false,
          instructorIds: [],
          serviceIds: [],
        },
      });

      const request = createRequest(
        'http://localhost/api/external/partner/verify?partner_id=ptr-123&ts=1707400000&sig=abc123xyz'
      );

      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
