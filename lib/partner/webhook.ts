/**
 * パートナーWebhook通知ユーティリティ
 */
import { signWebhookPayload } from './auth';

export type WebhookEvent =
  | 'reservation.created'
  | 'reservation.cancelled'
  | 'reservation.completed';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * パートナーへWebhook通知を送信
 */
export async function sendWebhookNotification(
  webhookUrl: string,
  webhookSecret: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<WebhookResult> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body, webhookSecret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Coordy-Signature': signature,
        'X-Coordy-Timestamp': timestamp,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10秒タイムアウト
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook delivery failed for ${webhookUrl}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * 予約作成時のWebhook通知データを組み立てる
 */
export function buildReservationWebhookData(params: {
  reservationId: string;
  externalRef?: string | null;
  status: string;
  service: { id: string; title: string };
  scheduledAt: string;
  participants: number;
  guest?: { name: string; email: string } | null;
  totalAmount: number;
  commissionAmount: number;
  paymentMode: string;
}): Record<string, unknown> {
  return {
    reservationId: params.reservationId,
    externalRef: params.externalRef || null,
    status: params.status,
    service: params.service,
    scheduledAt: params.scheduledAt,
    participants: params.participants,
    guest: params.guest || null,
    totalAmount: params.totalAmount,
    commission: params.commissionAmount,
    paymentMode: params.paymentMode,
  };
}
