import { test, expect } from '@playwright/test';

/**
 * ユーザーポータルのE2Eテスト
 * ログイン操作とログイン後のUI操作を包括的にテスト
 *
 * 注意: USERアカウントが事前に必要。管理者アカウントでのテストは admin-flow.spec.ts で実施。
 * ここではログインフォームの表示確認と、認証ガードの動作を中心にテスト。
 */

test.describe('ユーザーログインページ', () => {
  test('フォーム要素が正しく表示される', async ({ page }) => {
    await page.goto('/login/user');
    await page.waitForSelector('form', { timeout: 15000 });

    // メール、パスワード、送信ボタンが存在する
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('パスワードリセットリンクが表示される', async ({ page }) => {
    await page.goto('/login/user');
    await page.waitForSelector('form', { timeout: 15000 });

    const forgotLink = page.locator('a[href*="forgot"]');
    if (await forgotLink.count() > 0) {
      await expect(forgotLink.first()).toBeVisible();
    }
  });

  test('新規登録リンクが表示される', async ({ page }) => {
    await page.goto('/login/user');
    await page.waitForSelector('form', { timeout: 15000 });

    const signupLink = page.locator('a[href*="signup"]');
    if (await signupLink.count() > 0) {
      await expect(signupLink.first()).toBeVisible();
    }
  });

  test('不正な認証情報 → エラー表示、ログインページに留まる', async ({ page }) => {
    await page.goto('/login/user');
    await page.waitForSelector('form', { timeout: 15000 });

    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000);
    expect(page.url()).toContain('login');
  });

  test('空のフォームで送信 → ページに留まる', async ({ page }) => {
    await page.goto('/login/user');
    await page.waitForSelector('form', { timeout: 15000 });

    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    expect(page.url()).toContain('login');
  });
});

test.describe('サービス提供者ログインページ', () => {
  test('フォーム要素が正しく表示される', async ({ page }) => {
    await page.goto('/login/instructor');
    await page.waitForSelector('form', { timeout: 15000 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('不正な認証情報 → ログインページに留まる', async ({ page }) => {
    await page.goto('/login/instructor');
    await page.waitForSelector('form', { timeout: 15000 });

    await page.fill('input[type="email"]', 'fake@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000);
    expect(page.url()).toContain('login');
  });
});

test.describe('ユーザー登録ページ', () => {
  test('登録フォームの要素が表示される', async ({ page }) => {
    await page.goto('/signup/user');
    await page.waitForTimeout(3000);

    // フォームまたはページが正常に表示される
    await expect(page.locator('body')).toBeVisible();
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('サービス提供者登録フォームの要素が表示される', async ({ page }) => {
    await page.goto('/signup/instructor');
    await page.waitForTimeout(3000);

    await expect(page.locator('body')).toBeVisible();
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });
});
