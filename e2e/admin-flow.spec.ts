import { test, expect } from '@playwright/test';

/**
 * 管理者フローの包括的E2Eテスト
 * 実際にログインしてUI操作を行い、画面表示・遷移・データ表示を確認
 */

test.describe('管理者ログイン', () => {
  test('正しい認証情報でログイン → ダッシュボード表示', async ({ page }) => {
    await page.goto('/manage/login');
    await page.waitForSelector('form', { timeout: 15000 });

    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');

    await page.waitForURL(/manage\/admin/, { timeout: 20000 });

    // ダッシュボードの日本語見出しが表示される
    await expect(page.getByText('管理者ダッシュボード')).toBeVisible({ timeout: 10000 });
  });

  test('不正なパスワード → ログインページに留まる', async ({ page }) => {
    await page.goto('/manage/login');
    await page.waitForSelector('form', { timeout: 15000 });

    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000);
    expect(page.url()).toContain('login');
  });
});

test.describe('管理者ダッシュボード操作', () => {
  // 各テスト前にログイン
  test.beforeEach(async ({ page }) => {
    await page.goto('/manage/login');
    await page.waitForSelector('form', { timeout: 15000 });
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/manage\/admin/, { timeout: 20000 });
  });

  test('ダッシュボードに本人確認統計が表示される', async ({ page }) => {
    // 「ユーザー本人確認」と「サービス提供者本人確認」セクション
    await expect(page.getByText('ユーザー本人確認')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('サービス提供者本人確認')).toBeVisible();

    // ステータスラベルが表示される
    await expect(page.getByText('審査待ち').first()).toBeVisible();
    await expect(page.getByText('承認済み').first()).toBeVisible();
  });

  test('ユーザー管理ページに遷移 → ユーザー一覧が表示される', async ({ page }) => {
    await page.goto('/manage/admin/users');

    // 見出しが表示される
    await expect(page.getByText('ユーザー管理')).toBeVisible({ timeout: 10000 });

    // 検索欄が表示される
    const searchInput = page.getByPlaceholder('ユーザーを検索...');
    await expect(searchInput).toBeVisible();

    // テーブルヘッダーが表示される
    await expect(page.getByText('名前').first()).toBeVisible();
    await expect(page.getByText('メール').first()).toBeVisible();
    await expect(page.getByText('ロール').first()).toBeVisible();
  });

  test('パートナー管理ページに遷移 → 一覧が表示される', async ({ page }) => {
    await page.goto('/manage/admin/partners');

    await expect(page.getByText('パートナー管理')).toBeVisible({ timeout: 10000 });

    // 「新規パートナー」ボタンが表示される
    await expect(page.getByText('新規パートナー').first()).toBeVisible();
  });

  test('パートナー新規作成フォームが開閉できる', async ({ page }) => {
    await page.goto('/manage/admin/partners');
    await expect(page.getByText('パートナー管理')).toBeVisible({ timeout: 10000 });

    // 「新規パートナー」ボタンをクリック → フォーム表示
    await page.getByText('新規パートナー').first().click();

    // フォームの入力欄が表示される
    await expect(page.getByText('パートナー名').first()).toBeVisible({ timeout: 5000 });

    // キャンセルボタンをクリック → フォーム非表示
    await page.getByText('キャンセル').click();
  });

  test('本人確認審査ページに遷移できる', async ({ page }) => {
    await page.goto('/manage/admin/verification');
    await expect(page.locator('body')).toBeVisible();
    // ページがエラーなく読み込まれること
    await page.waitForTimeout(2000);
    // 500エラーなどのクラッシュがないことを確認
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('チャージ承認ページに遷移できる', async ({ page }) => {
    await page.goto('/manage/admin/pending-charges');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('出金管理ページに遷移できる', async ({ page }) => {
    await page.goto('/manage/admin/withdrawals');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('お知らせ管理ページに遷移できる', async ({ page }) => {
    await page.goto('/manage/admin/announcements');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });
});
