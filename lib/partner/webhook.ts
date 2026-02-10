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
  attempts?: number;
  lastAttemptAt?: Date;
}

interface WebhookRetryConfig {
  maxRetries: number;    // default: 3
  baseDelayMs: number;   // default: 1000 (1 second)
  maxDelayMs: number;    // default: 30000 (30 seconds)
}

/**
 * パートナーへWebhook通知を送信（リトライ機能付き）
 */
export async function sendWebhookNotification(
  webhookUrl: string,
  webhookSecret: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  retryConfig?: Partial<WebhookRetryConfig>,
): Promise<WebhookResult> {
  const config: WebhookRetryConfig = {
    maxRetries: retryConfig?.maxRetries ?? 3,
    baseDelayMs: retryConfig?.baseDelayMs ?? 1000,
    maxDelayMs: retryConfig?.maxDelayMs ?? 30000,
  };

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  let lastResult: WebhookResult = {
    success: false,
    error: 'No attempts made',
    attempts: 0,
  };

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Add delay before retry (not on first attempt)
    if (attempt > 0) {
      const baseDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Random 0-1000ms jitter
      const delay = Math.min(baseDelay + jitter, config.maxDelayMs);

      console.log(
        `Webhook retry attempt ${attempt}/${config.maxRetries} for ${webhookUrl} after ${Math.round(delay)}ms delay`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const signature = signWebhookPayload(body, webhookSecret);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const attemptTime = new Date();

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

      lastResult = {
        success: response.ok,
        statusCode: response.status,
        attempts: attempt + 1,
        lastAttemptAt: attemptTime,
      };

      // Success or 4xx (client error) - don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        if (!response.ok && response.status >= 400 && response.status < 500) {
          console.warn(
            `Webhook failed with client error ${response.status} for ${webhookUrl}, not retrying`
          );
        }
        return lastResult;
      }

      // 5xx - retry
      console.warn(
        `Webhook failed with server error ${response.status} for ${webhookUrl}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      lastResult = {
        success: false,
        error: message,
        attempts: attempt + 1,
        lastAttemptAt: attemptTime,
      };

      console.error(
        `Webhook delivery failed for ${webhookUrl} (attempt ${attempt + 1}/${config.maxRetries + 1}):`,
        message
      );
    }
  }

  // All retries exhausted
  console.error(
    `Webhook delivery failed after ${lastResult.attempts} attempts for ${webhookUrl}`
  );
  return lastResult;
}

/**
 * Webhook通知をバックグラウンドでキューイング（非同期・fire-and-forget）
 */
export function queueWebhookNotification(
  webhookUrl: string,
  webhookSecret: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): void {
  // Fire-and-forget: バックグラウンドで実行、結果を待たない
  sendWebhookNotification(webhookUrl, webhookSecret, event, data)
    .then((result) => {
      if (result.success) {
        console.log(
          `Background webhook delivered successfully to ${webhookUrl} after ${result.attempts} attempt(s)`
        );
      } else {
        console.error(
          `Background webhook failed for ${webhookUrl} after ${result.attempts} attempt(s):`,
          result.error || `Status ${result.statusCode}`
        );
      }
    })
    .catch((error) => {
      console.error(`Unexpected error in background webhook for ${webhookUrl}:`, error);
    });
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
