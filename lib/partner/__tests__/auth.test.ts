/**
 * パートナー認証・署名検証ユーティリティのテスト
 */
import crypto from 'crypto';

// Prismaをモック
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    partner: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  generateApiKey,
  generateSecretKey,
  generateWebhookSecret,
  createSignature,
  verifySignature,
  signWebhookPayload,
  verifyPartnerRequest,
} from '../auth';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('パートナー認証ユーティリティ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // generateApiKey
  // =========================================================================
  describe('generateApiKey', () => {
    it('ptr_ プレフィックス付きのキーを生成する', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^ptr_[a-f0-9]{48}$/);
    });

    it('呼び出すたびに異なるキーを生成する', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  // =========================================================================
  // generateSecretKey
  // =========================================================================
  describe('generateSecretKey', () => {
    it('sk_live_ プレフィックス付きのキーを生成する', () => {
      const key = generateSecretKey();
      expect(key).toMatch(/^sk_live_[a-f0-9]{64}$/);
    });

    it('呼び出すたびに異なるキーを生成する', () => {
      const key1 = generateSecretKey();
      const key2 = generateSecretKey();
      expect(key1).not.toBe(key2);
    });
  });

  // =========================================================================
  // generateWebhookSecret
  // =========================================================================
  describe('generateWebhookSecret', () => {
    it('whsec_ プレフィックス付きのキーを生成する', () => {
      const key = generateWebhookSecret();
      expect(key).toMatch(/^whsec_[a-f0-9]{64}$/);
    });

    it('呼び出すたびに異なるキーを生成する', () => {
      const key1 = generateWebhookSecret();
      const key2 = generateWebhookSecret();
      expect(key1).not.toBe(key2);
    });
  });

  // =========================================================================
  // createSignature
  // =========================================================================
  describe('createSignature', () => {
    it('正しいHMAC-SHA256署名を生成する', () => {
      const payload = 'test-partner:1707400000';
      const secret = 'my-secret-key';

      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(createSignature(payload, secret)).toBe(expected);
    });

    it('同じ入力に対して同じ署名を返す', () => {
      const sig1 = createSignature('payload', 'secret');
      const sig2 = createSignature('payload', 'secret');
      expect(sig1).toBe(sig2);
    });

    it('異なるペイロードでは異なる署名を返す', () => {
      const sig1 = createSignature('payload-a', 'secret');
      const sig2 = createSignature('payload-b', 'secret');
      expect(sig1).not.toBe(sig2);
    });

    it('異なるシークレットでは異なる署名を返す', () => {
      const sig1 = createSignature('payload', 'secret-a');
      const sig2 = createSignature('payload', 'secret-b');
      expect(sig1).not.toBe(sig2);
    });

    it('空文字列のペイロードでも署名を生成できる', () => {
      const sig = createSignature('', 'secret');
      expect(sig).toHaveLength(64); // SHA-256 hex = 64文字
    });

    it('空文字列のシークレットでも署名を生成できる', () => {
      const sig = createSignature('payload', '');
      expect(sig).toHaveLength(64);
    });
  });

  // =========================================================================
  // verifySignature
  // =========================================================================
  describe('verifySignature', () => {
    const partnerId = 'ptr_test123';
    const secretKey = 'test-secret-key';

    function createValidSignature(pid: string, ts: number, secret: string): string {
      return crypto
        .createHmac('sha256', secret)
        .update(`${pid}:${ts}`)
        .digest('hex');
    }

    it('正しい署名とタイムスタンプで true を返す', () => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts, sig, secretKey)).toBe(true);
    });

    it('5分以内のタイムスタンプで true を返す', () => {
      const ts = Math.floor(Date.now() / 1000) - 299; // 4分59秒前
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts, sig, secretKey)).toBe(true);
    });

    it('ちょうど5分のタイムスタンプで true を返す', () => {
      const ts = Math.floor(Date.now() / 1000) - 300; // ちょうど5分前
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts, sig, secretKey)).toBe(true);
    });

    it('5分超過のタイムスタンプで false を返す（期限切れ）', () => {
      const ts = Math.floor(Date.now() / 1000) - 301; // 5分1秒前
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts, sig, secretKey)).toBe(false);
    });

    it('未来のタイムスタンプでも5分以内なら true を返す', () => {
      const ts = Math.floor(Date.now() / 1000) + 200; // 未来200秒
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts, sig, secretKey)).toBe(true);
    });

    it('未来のタイムスタンプでも5分超過なら false を返す', () => {
      const ts = Math.floor(Date.now() / 1000) + 301; // 未来301秒
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts, sig, secretKey)).toBe(false);
    });

    it('不正な署名で false を返す', () => {
      const ts = Math.floor(Date.now() / 1000);
      const wrongSig = createValidSignature(partnerId, ts, 'wrong-secret');

      expect(verifySignature(partnerId, ts, wrongSig, secretKey)).toBe(false);
    });

    it('改ざんされたパートナーIDで false を返す', () => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature('ptr_tampered', ts, sig, secretKey)).toBe(false);
    });

    it('改ざんされたタイムスタンプで false を返す', () => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = createValidSignature(partnerId, ts, secretKey);

      expect(verifySignature(partnerId, ts + 1, sig, secretKey)).toBe(false);
    });

    it('無効なhex文字列の署名で false を返す（timingSafeEqualのエラーをキャッチ）', () => {
      const ts = Math.floor(Date.now() / 1000);

      expect(verifySignature(partnerId, ts, 'not-valid-hex!!!', secretKey)).toBe(false);
    });

    it('長さの異なる署名で false を返す（Bufferサイズ不一致）', () => {
      const ts = Math.floor(Date.now() / 1000);

      expect(verifySignature(partnerId, ts, 'abcd', secretKey)).toBe(false);
    });

    it('空の署名文字列で false を返す', () => {
      const ts = Math.floor(Date.now() / 1000);

      expect(verifySignature(partnerId, ts, '', secretKey)).toBe(false);
    });
  });

  // =========================================================================
  // signWebhookPayload
  // =========================================================================
  describe('signWebhookPayload', () => {
    it('sha256= プレフィックス付きの署名を返す', () => {
      const payload = JSON.stringify({ event: 'reservation.created' });
      const secret = 'webhook-secret';

      const result = signWebhookPayload(payload, secret);
      expect(result).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('正しいHMAC値がプレフィックスの後に付与される', () => {
      const payload = '{"event":"test"}';
      const secret = 'my-secret';

      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(signWebhookPayload(payload, secret)).toBe(`sha256=${expectedHmac}`);
    });
  });

  // =========================================================================
  // verifyPartnerRequest
  // =========================================================================
  describe('verifyPartnerRequest', () => {
    const mockPartner = {
      id: 'ptr_abc123',
      name: 'テストパートナー',
      code: 'test-partner',
      description: null,
      websiteUrl: null,
      logoUrl: null,
      apiKey: 'ptr_key123',
      secretKey: 'secret123',
      webhookUrl: 'https://partner.example.com/webhook',
      webhookSecret: 'whsec_test',
      allowedOrigins: [],
      paymentMode: 'COORDY',
      allowGuest: true,
      requirePhone: false,
      instructorIds: [],
      serviceIds: [],
      commissionRate: 0.1,
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    function createSigForPartner(pid: string, ts: number, secret: string): string {
      return crypto
        .createHmac('sha256', secret)
        .update(`${pid}:${ts}`)
        .digest('hex');
    }

    it('有効なリクエストで valid: true とパートナー情報を返す', async () => {
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

      const ts = Math.floor(Date.now() / 1000);
      const sig = createSigForPartner(mockPartner.id, ts, mockPartner.secretKey);

      const result = await verifyPartnerRequest(mockPartner.id, ts, sig);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.partner).toEqual({
        id: mockPartner.id,
        name: mockPartner.name,
        code: mockPartner.code,
        logoUrl: mockPartner.logoUrl,
        paymentMode: mockPartner.paymentMode,
        allowGuest: mockPartner.allowGuest,
        requirePhone: mockPartner.requirePhone,
        commissionRate: mockPartner.commissionRate,
        instructorIds: mockPartner.instructorIds,
        serviceIds: mockPartner.serviceIds,
        webhookUrl: mockPartner.webhookUrl,
        webhookSecret: mockPartner.webhookSecret,
      });
    });

    it('存在しないパートナーIDで INVALID_PARTNER エラーを返す', async () => {
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await verifyPartnerRequest('ptr_nonexistent', 0, 'sig');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_PARTNER');
      expect(result.partner).toBeUndefined();
    });

    it('無効化されたパートナーで INACTIVE_PARTNER エラーを返す', async () => {
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue({
        ...mockPartner,
        isActive: false,
      });

      const ts = Math.floor(Date.now() / 1000);
      const sig = createSigForPartner(mockPartner.id, ts, mockPartner.secretKey);

      const result = await verifyPartnerRequest(mockPartner.id, ts, sig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INACTIVE_PARTNER');
    });

    it('期限切れタイムスタンプで EXPIRED_TIMESTAMP エラーを返す', async () => {
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

      const ts = Math.floor(Date.now() / 1000) - 600; // 10分前
      const sig = createSigForPartner(mockPartner.id, ts, mockPartner.secretKey);

      const result = await verifyPartnerRequest(mockPartner.id, ts, sig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXPIRED_TIMESTAMP');
    });

    it('不正な署名で INVALID_SIGNATURE エラーを返す', async () => {
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

      const ts = Math.floor(Date.now() / 1000);
      const wrongSig = createSigForPartner(mockPartner.id, ts, 'wrong-secret');

      const result = await verifyPartnerRequest(mockPartner.id, ts, wrongSig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('検証の順序: パートナー存在 → アクティブ → タイムスタンプ → 署名', async () => {
      // 無効化 + 期限切れ + 不正署名の場合、INACTIVE_PARTNERが先に返る
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue({
        ...mockPartner,
        isActive: false,
      });

      const ts = Math.floor(Date.now() / 1000) - 600;
      const result = await verifyPartnerRequest(mockPartner.id, ts, 'bad-sig');

      expect(result.error).toBe('INACTIVE_PARTNER');
    });

    it('Prismaから正しいIDで検索される', async () => {
      (mockPrisma.partner.findUnique as jest.Mock).mockResolvedValue(null);

      await verifyPartnerRequest('ptr_specific_id', 0, 'sig');

      expect(mockPrisma.partner.findUnique).toHaveBeenCalledWith({
        where: { id: 'ptr_specific_id' },
      });
    });
  });
});
