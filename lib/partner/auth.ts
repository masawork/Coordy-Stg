/**
 * パートナー認証・署名検証ユーティリティ
 */
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const TIMESTAMP_VALIDITY_SECONDS = 300; // 5分

/**
 * APIキーのプレフィックス付き生成
 */
export function generateApiKey(): string {
  return `ptr_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * シークレットキーの生成
 */
export function generateSecretKey(): string {
  return `sk_live_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Webhookシークレットの生成
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * HMAC-SHA256署名を生成
 */
export function createSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * 署名を検証（タイミングセーフ比較）
 */
export function verifySignature(
  partnerId: string,
  timestamp: number,
  signature: string,
  secretKey: string,
): boolean {
  // タイムスタンプ有効期限チェック
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TIMESTAMP_VALIDITY_SECONDS) {
    return false;
  }

  const signaturePayload = `${partnerId}:${timestamp}`;
  const expectedSignature = createSignature(signaturePayload, secretKey);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Webhook送信用の署名を生成
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return `sha256=${createSignature(payload, secret)}`;
}

interface PartnerVerifyResult {
  valid: boolean;
  error?: 'INVALID_PARTNER' | 'INACTIVE_PARTNER' | 'INVALID_SIGNATURE' | 'EXPIRED_TIMESTAMP';
  partner?: {
    id: string;
    name: string;
    code: string;
    logoUrl: string | null;
    paymentMode: string;
    allowGuest: boolean;
    requirePhone: boolean;
    commissionRate: number;
    instructorIds: string[];
    serviceIds: string[];
    webhookUrl: string | null;
    webhookSecret: string | null;
  };
}

/**
 * パートナーリクエストを検証
 */
export async function verifyPartnerRequest(
  partnerId: string,
  timestamp: number,
  signature: string,
): Promise<PartnerVerifyResult> {
  // パートナー取得
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
  });

  if (!partner) {
    return { valid: false, error: 'INVALID_PARTNER' };
  }

  if (!partner.isActive) {
    return { valid: false, error: 'INACTIVE_PARTNER' };
  }

  // タイムスタンプチェック
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TIMESTAMP_VALIDITY_SECONDS) {
    return { valid: false, error: 'EXPIRED_TIMESTAMP' };
  }

  // 署名検証
  if (!verifySignature(partnerId, timestamp, signature, partner.secretKey)) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  return {
    valid: true,
    partner: {
      id: partner.id,
      name: partner.name,
      code: partner.code,
      logoUrl: partner.logoUrl,
      paymentMode: partner.paymentMode,
      allowGuest: partner.allowGuest,
      requirePhone: partner.requirePhone,
      commissionRate: partner.commissionRate,
      instructorIds: partner.instructorIds,
      serviceIds: partner.serviceIds,
      webhookUrl: partner.webhookUrl,
      webhookSecret: partner.webhookSecret,
    },
  };
}
