import { test as setup, expect } from '@playwright/test';
import path from 'path';

const ADMIN_AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');
const USER_AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

/**
 * 管理者ログインセットアップ
 * 他のテストで使い回すためにストレージステートを保存
 */
setup('管理者としてログイン', async ({ page }) => {
  await page.goto('/manage/login');

  // ローディングが完了するのを待つ
  await page.waitForSelector('form', { timeout: 15000 });

  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin123456');
  await page.click('button[type="submit"]');

  // ダッシュボードに遷移するのを待つ
  await page.waitForURL(/manage\/admin/, { timeout: 20000 });
  expect(page.url()).toContain('/manage/admin');

  // ストレージステートを保存
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

export { ADMIN_AUTH_FILE, USER_AUTH_FILE };
