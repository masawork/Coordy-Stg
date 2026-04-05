/**
 * パートナー認証ユーティリティのテスト
 */
import crypto from 'crypto';
import {
  generateApiKey,
  generateSecretKey,
  generateWebhookSecret,
  createSignature,
  verifySignature,
  signWebhookPayload,
  verifyPartnerRequest,
} from '../auth';

// Prismaモックを先に定義
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    partner: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('generateApiKey', () => {
  it('ptr_プレフィックスで始まるキーを生成する', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^ptr_[0-9a-f]{48}$/);
  });

  it('呼び出すたびに異なるキーを生成する', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe('generateSecretKey', () => {
  it('sk_live_プレフィックスで始まるキーを生成する', () => {
    const key = generateSecretKey();
    expect(key).toMatch(/^sk_live_[0-9a-f]{64}$/);
  });

  it('呼び出すたびに異なるキーを生成する', () => {
    const key1 = generateSecretKey();
    const key2 = generateSecretKey();
    expect(key1).not.toBe(key2);
  });
});

describe('generateWebhookSecret', () => {
  it('whsec_プレフィックスで始まるキーを生成する', () => {
    const key = generateWebhookSecret();
    expect(key).toMatch(/^whsec_[0-9a-f]{64}$/);
  });

  it('呼び出すたびに異なるキーを生成する', () => {
    const key1 = generateWebhookSecret();
    const key2 = generateWebhookSecret();
    expect(key1).not.toBe(key2);
  });
});

describe('createSignature', () => {
  it('HMAC-SHA256署名を正しく生成する', () => {
    const payload = 'test-partner:1234567890';
    const secret = 'test-secret';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    expect(createSignature(payload, secret)).toBe(expected);
  });

  it('同じ入力なら同じ署名を返す', () => {
    const sig1 = createSignature('payload', 'secret');
    const sig2 = createSignature('payload', 'secret');
    expect(sig1).toBe(sig2);
  });

  it('異なるペイロードなら異なる署名を返す', () => {
    const sig1 = createSignature('payload1', 'secret');
    const sig2 = createSignature('payload2', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('異なるシークレットなら異なる署名を返す', () => {
    const sig1 = createSignature('payload', 'secret1');
    const sig2 = createSignature('payload', 'secret2');
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifySignature', () => {
  const partnerId = 'ptr_test123';
  const secretKey = 'test-secret-key';

  it('正しい署名を検証できる', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${partnerId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    expect(verifySignature(partnerId, timestamp, signature, secretKey)).toBe(true);
  });

  it('不正な署名はfalseを返す', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = 'invalid_signature_hex'.padEnd(64, '0');

    expect(verifySignature(partnerId, timestamp, signature, secretKey)).toBe(false);
  });

  it('5分以上前のタイムスタンプはfalseを返す', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 301; // 301秒前
    const payload = `${partnerId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    expect(verifySignature(partnerId, timestamp, signature, secretKey)).toBe(false);
  });

  it('ちょうど5分前のタイムスタンプは有効', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 299; // 299秒前
    const payload = `${partnerId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    expect(verifySignature(partnerId, timestamp, signature, secretKey)).toBe(true);
  });

  it('未来のタイムスタンプも5分以内なら有効', () => {
    const timestamp = Math.floor(Date.now() / 1000) + 100; // 100秒先
    const payload = `${partnerId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    expect(verifySignature(partnerId, timestamp, signature, secretKey)).toBe(true);
  });

  it('不正なhex文字列はfalseを返す（例外が発生しない）', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    expect(verifySignature(partnerId, timestamp, 'not-hex', secretKey)).toBe(false);
  });
});

describe('signWebhookPayload', () => {
  it('sha256=プレフィックス付きの署名を生成する', () => {
    const payload = '{"event":"test"}';
    const secret = 'webhook-secret';
    const result = signWebhookPayload(payload, secret);

    expect(result).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('正しいHMAC署名が含まれる', () => {
    const payload = '{"event":"test"}';
    const secret = 'webhook-secret';
    const result = signWebhookPayload(payload, secret);

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    expect(result).toBe(`sha256=${expected}`);
  });
});

describe('verifyPartnerRequest', () => {
  const mockPartner = {
    id: 'partner-123',
    name: 'テストパートナー',
    code: 'test-partner',
    logoUrl: 'https://example.com/logo.png',
    paymentMode: 'COORDY',
    allowGuest: true,
    requirePhone: false,
    commissionRate: 0.1,
    instructorIds: ['ins-1'],
    serviceIds: ['svc-1'],
    webhookUrl: 'https://example.com/webhook',
    webhookSecret: 'whsec_test',
    secretKey: 'test-secret-key',
    isActive: true,
    apiKey: 'ptr_test',
    description: null,
    websiteUrl: null,
    allowedOrigins: [],
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正しいリクエストで認証成功する', async () => {
    (mockedPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${mockPartner.id}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', mockPartner.secretKey)
      .update(payload)
      .digest('hex');

    const result = await verifyPartnerRequest(mockPartner.id, timestamp, signature);

    expect(result.valid).toBe(true);
    expect(result.partner).toBeDefined();
    expect(result.partner?.name).toBe('テストパートナー');
    expect(result.partner?.id).toBe('partner-123');
  });

  it('存在しないパートナーIDでINVALID_PARTNERを返す', async () => {
    (mockedPrisma.partner.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await verifyPartnerRequest('nonexistent', 123, 'sig');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_PARTNER');
  });

  it('無効化されたパートナーでINACTIVE_PARTNERを返す', async () => {
    (mockedPrisma.partner.findUnique as jest.Mock).mockResolvedValue({
      ...mockPartner,
      isActive: false,
    });

    const result = await verifyPartnerRequest(mockPartner.id, 123, 'sig');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INACTIVE_PARTNER');
  });

  it('期限切れタイムスタンプでEXPIRED_TIMESTAMPを返す', async () => {
    (mockedPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

    const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10分前
    const result = await verifyPartnerRequest(mockPartner.id, expiredTimestamp, 'sig');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('EXPIRED_TIMESTAMP');
  });

  it('不正な署名でINVALID_SIGNATUREを返す', async () => {
    (mockedPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

    const timestamp = Math.floor(Date.now() / 1000);
    const invalidSig = '0'.repeat(64);

    const result = await verifyPartnerRequest(mockPartner.id, timestamp, invalidSig);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_SIGNATURE');
  });

  it('認証成功時にpartner情報を正しく返す', async () => {
    (mockedPrisma.partner.findUnique as jest.Mock).mockResolvedValue(mockPartner);

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${mockPartner.id}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', mockPartner.secretKey)
      .update(payload)
      .digest('hex');

    const result = await verifyPartnerRequest(mockPartner.id, timestamp, signature);

    expect(result.partner).toEqual({
      id: 'partner-123',
      name: 'テストパートナー',
      code: 'test-partner',
      logoUrl: 'https://example.com/logo.png',
      paymentMode: 'COORDY',
      allowGuest: true,
      requirePhone: false,
      commissionRate: 0.1,
      instructorIds: ['ins-1'],
      serviceIds: ['svc-1'],
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: 'whsec_test',
    });
  });
});
