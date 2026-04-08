import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 *
 * 実行方法:
 *   npx playwright test                    # 全テスト実行（ヘッドレス）
 *   npx playwright test --headed           # ブラウザ表示付き
 *   npx playwright test --project=chromium # Chromiumのみ
 *   npx playwright test --ui               # UIモードで実行
 *   npx playwright test api-health         # 特定テストのみ
 *
 * 前提条件:
 *   - 開発サーバーが起動済み or webServer設定で自動起動
 *   - DBが接続済み（Supabase）
 *   - テストユーザーがシード済み（npm run seed:admin）
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // タイムアウト設定（Next.js開発サーバーは初回が遅い場合がある）
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* タイムアウト: テストごと90秒（認証フローのテスト用に余裕を持たせる） */
  timeout: 90000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 開発サーバーの自動起動（ローカル実行時） */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60000,
      },
});
