/**
 * レート制限ユーティリティ
 *
 * インメモリベースのスライディングウィンドウ方式。
 * IPベースとパートナーIDベースの2種類に対応。
 *
 * 本番環境ではRedis等に置き換えることを推奨。
 */

export interface RateLimitConfig {
  /** ウィンドウ時間（ミリ秒） */
  windowMs: number;
  /** ウィンドウ内の最大リクエスト数 */
  maxRequests: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

// インメモリストア
const store = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1分
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const cutoff = now - windowMs;

  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  /** リクエストが許可されるか */
  allowed: boolean;
  /** 残りリクエスト数 */
  remaining: number;
  /** ウィンドウリセットまでの秒数 */
  resetInSeconds: number;
  /** 最大リクエスト数 */
  limit: number;
}

/**
 * レート制限チェック
 *
 * @param key - 識別子（IPアドレスまたはパートナーID）
 * @param config - レート制限設定
 * @returns レート制限の結果
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // クリーンアップ
  cleanup(config.windowMs);

  // エントリ取得または作成
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // ウィンドウ外のタイムスタンプを除去
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);

  // 最も古いタイムスタンプからリセット時間を計算
  const oldestInWindow = entry.timestamps[0] || now;
  const resetInSeconds = Math.ceil(
    (oldestInWindow + config.windowMs - now) / 1000
  );

  if (entry.timestamps.length >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
      limit: config.maxRequests,
    };
  }

  // リクエストを記録
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: remaining - 1,
    resetInSeconds: Math.max(1, Math.ceil(config.windowMs / 1000)),
    limit: config.maxRequests,
  };
}

// --- プリセット設定 ---

/** 一般API: 1分間に60リクエスト */
export const RATE_LIMIT_DEFAULT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 60,
};

/** 認証API: 1分間に10リクエスト（ブルートフォース防止） */
export const RATE_LIMIT_AUTH: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

/** 外部パートナーAPI: 1分間に100リクエスト */
export const RATE_LIMIT_PARTNER: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100,
};

/** 重い処理（メール送信等）: 1分間に5リクエスト */
export const RATE_LIMIT_HEAVY: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 5,
};
