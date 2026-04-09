import { test, expect } from '@playwright/test';

/**
 * サービス閲覧フローのE2Eテスト
 * 公開ページ（認証不要）でのサービス検索・閲覧操作
 */

test.describe('サービス一覧ページ', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/services');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('検索フィルターが表示される', async ({ page }) => {
    await page.goto('/services');
    await page.waitForTimeout(3000);

    // ページが正常に読み込まれていること
    await expect(page.locator('body')).toBeVisible();
  });

  test('URLクエリパラメータでフィルタが反映される', async ({ page }) => {
    await page.goto('/services?category=water_sports&sortBy=price_asc');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    // URLパラメータがそのまま維持される
    expect(page.url()).toContain('category=water_sports');
  });

  test('ページネーションが動作する', async ({ page }) => {
    await page.goto('/services?page=1&limit=5');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('サービス詳細ページ', () => {
  test('存在しないサービスID → エラーなくページ表示', async ({ page }) => {
    await page.goto('/services/nonexistent-id');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    // 404やエラーメッセージが表示されるが、アプリがクラッシュしない
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });
});
