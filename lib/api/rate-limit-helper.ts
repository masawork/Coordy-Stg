/**
 * APIルート用レート制限ヘルパー
 *
 * 使い方:
 * ```typescript
 * import { withRateLimit } from '@/lib/api/rate-limit-helper';
 * import { RATE_LIMIT_DEFAULT } from '@/lib/rate-limit';
 *
 * export async function GET(request: NextRequest) {
 *   const rateLimitResponse = withRateLimit(request, RATE_LIMIT_DEFAULT);
 *   if (rateLimitResponse) return rateLimitResponse;
 *   // 通常の処理...
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  type RateLimitConfig,
} from '@/lib/rate-limit';

/**
 * リクエストからIPアドレスを取得
 */
function getClientIp(request: NextRequest): string {
  // Vercel / Cloudflare 等のプロキシヘッダー
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // フォールバック
  return 'unknown';
}

/**
 * IPベースのレート制限を適用
 *
 * @returns レート制限超過時はNextResponse、許可時はnull
 */
export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyPrefix?: string
): NextResponse | null {
  const ip = getClientIp(request);
  const key = keyPrefix ? `${keyPrefix}:${ip}` : `ip:${ip}`;

  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'リクエスト制限を超過しました。しばらく待ってから再試行してください。',
        retryAfter: result.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetInSeconds),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetInSeconds),
        },
      }
    );
  }

  return null;
}

/**
 * パートナーIDベースのレート制限を適用
 *
 * @returns レート制限超過時はNextResponse、許可時はnull
 */
export function withPartnerRateLimit(
  partnerId: string,
  config: RateLimitConfig
): NextResponse | null {
  const key = `partner:${partnerId}`;

  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please retry after the specified time.',
        retryAfter: result.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetInSeconds),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetInSeconds),
        },
      }
    );
  }

  return null;
}
