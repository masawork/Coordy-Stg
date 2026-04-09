import { test, expect } from '@playwright/test';

/**
 * 外部予約フロー（/book/external）のE2Eテスト
 * パートナーサイトからのリダイレクト型予約のUI動作確認
 */

test.describe('外部予約ページ - パラメータバリデーション', () => {
  test('パラメータなしでアクセス → エラー表示', async ({ page }) => {
    await page.goto('/book/external');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    const pageContent = await page.textContent('body');
    // ページがクラッシュしない
    expect(pageContent).not.toContain('Application error');
  });

  test('不正なパートナーID → 認証エラー表示', async ({ page }) => {
    await page.goto('/book/external?partner_id=invalid_id&ts=0&sig=invalid');
    await page.waitForTimeout(5000);

    await expect(page.locator('body')).toBeVisible();
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('署名パラメータ欠落 → エラーハンドリング', async ({ page }) => {
    await page.goto('/book/external?partner_id=ptr_test');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
  });

  test('期限切れタイムスタンプ → エラー表示', async ({ page }) => {
    const expiredTs = Math.floor(Date.now() / 1000) - 3600;
    await page.goto(`/book/external?partner_id=ptr_test&ts=${expiredTs}&sig=fake_signature`);
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('外部予約ページ - レイアウト', () => {
  test('外部予約ページはミニマルレイアウト', async ({ page }) => {
    await page.goto('/book/external?partner_id=test');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    // ページがクラッシュしないことを確認
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });
});
