import { test, expect } from '@playwright/test';

/**
 * 公開ページのE2Eテスト（認証不要）
 */

test.describe('トップページ', () => {
  test('正常に表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Coordy/i);
    // bodyが表示されること
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('サービス一覧', () => {
  test('正常に表示される', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('認証ページ表示', () => {
  test('ユーザーログインページが表示される', async ({ page }) => {
    await page.goto('/login/user');
    await page.waitForSelector('form', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('サービス提供者ログインページが表示される', async ({ page }) => {
    await page.goto('/login/instructor');
    await page.waitForSelector('form', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('管理者ログインページが表示される', async ({ page }) => {
    await page.goto('/manage/login');
    await page.waitForSelector('form', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('ユーザー登録ページが表示される', async ({ page }) => {
    await page.goto('/signup/user');
    await expect(page.locator('body')).toBeVisible();
  });

  test('サービス提供者登録ページが表示される', async ({ page }) => {
    await page.goto('/signup/instructor');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('認証ガード', () => {
  test('未認証でユーザーポータルにアクセス → ログインへリダイレクト', async ({ page }) => {
    await page.goto('/user');
    await page.waitForURL(/login/, { timeout: 15000 });
    expect(page.url()).toContain('login');
  });

  test('未認証でサービス提供者ポータルにアクセス → ログインへリダイレクト', async ({ page }) => {
    await page.goto('/instructor');
    await page.waitForURL(/login/, { timeout: 15000 });
    expect(page.url()).toContain('login');
  });

  test('未認証で管理者ポータルにアクセス → ログインへリダイレクト', async ({ page }) => {
    await page.goto('/manage/admin');
    await page.waitForURL(/login/, { timeout: 15000 });
    expect(page.url()).toContain('login');
  });
});
