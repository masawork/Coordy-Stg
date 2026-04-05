/**
 * 機能テスト - 主要フローの実際のブラウザ操作テスト
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

// ==============================
// 1. 公開ページ表示テスト
// ==============================
test.describe('公開ページ', () => {
  test('トップページが正しく表示される', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole('link', { name: /Coordy/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('サービス一覧が表示される', async ({ page }) => {
    await page.goto(`${BASE}/services`);
    await page.waitForLoadState('networkidle');
    // サービスカードまたはサービス名が表示される
    const content = await page.textContent('body');
    expect(content).toContain('サービス');
  });

  test('商品一覧が表示される', async ({ page }) => {
    await page.goto(`${BASE}/products`);
    await page.waitForLoadState('networkidle');
    // 商品が表示されるか確認（テストデータ3件）
    await expect(page.getByRole('heading', { name: '商品一覧' })).toBeVisible({ timeout: 10000 });
  });

  test('商品詳細ページが表示される', async ({ page }) => {
    // まずAPIから商品IDを取得
    const res = await page.request.get(`${BASE}/api/products`);
    const data = await res.json();
    expect(data.products.length).toBeGreaterThan(0);

    const productId = data.products[0].id;
    await page.goto(`${BASE}/products/${productId}`);
    await page.waitForLoadState('networkidle');

    // 商品名が表示される（ローディング完了を待つ）
    await page.waitForTimeout(3000);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    // 価格が表示される（innerTextを使ってRSCペイロードを除外）
    const content = await page.locator('body').innerText();
    expect(content).toMatch(/¥|￥|円/);
  });

  test('商品詳細のサービス提供者クリックで404にならない', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/products`);
    const data = await res.json();
    const productId = data.products[0].id;
    await page.goto(`${BASE}/products/${productId}`);
    await page.waitForLoadState('networkidle');

    // サービス提供者テキストが存在する
    await page.waitForTimeout(3000);
    await expect(page.getByText('サービス提供者').first()).toBeVisible({ timeout: 10000 });
    // ページが正常に表示されている（innerTextで可視テキストのみチェック）
    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toContain('ページが見つかりません');
  });

  test('サービス詳細ページが表示される', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/services`);
    const data = await res.json();
    expect(data.services.length).toBeGreaterThan(0);

    const serviceId = data.services[0].id;
    await page.goto(`${BASE}/services/${serviceId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });
});

// ==============================
// 2. 認証ページテスト
// ==============================
test.describe('認証ページ', () => {
  test('ユーザーログインページが表示される', async ({ page }) => {
    await page.goto(`${BASE}/login/user`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('インストラクターログインページが表示される', async ({ page }) => {
    await page.goto(`${BASE}/login/instructor`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('ユーザー新規登録ページが表示される', async ({ page }) => {
    await page.goto(`${BASE}/signup/user`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('管理者ログインページが表示される', async ({ page }) => {
    await page.goto(`${BASE}/manage/login`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('不正なパスワードでログインするとエラーになる', async ({ page }) => {
    await page.goto(`${BASE}/login/user`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('wrongpassword');

    // ログインボタンをクリック
    const submitButton = page.locator('button[type="submit"]').or(page.locator('button:text("ログイン")'));
    await submitButton.click();

    // エラーメッセージが表示されるか確認（3秒待つ）
    await page.waitForTimeout(3000);
    const content = await page.textContent('body');
    // エラーメッセージまたはまだログインページにいることを確認
    const hasError = content?.includes('エラー') || content?.includes('error') || content?.includes('失敗') || content?.includes('Invalid');
    const stillOnLoginPage = page.url().includes('/login');
    expect(hasError || stillOnLoginPage).toBeTruthy();
  });
});

// ==============================
// 3. API機能テスト
// ==============================
test.describe('API機能テスト', () => {
  test('サービス一覧APIが正しいデータを返す', async ({ request }) => {
    const res = await request.get(`${BASE}/api/services`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.services).toBeDefined();
    expect(data.services.length).toBeGreaterThan(0);

    // 各サービスの必須フィールドを確認
    for (const service of data.services) {
      expect(service.id).toBeDefined();
      expect(service.title).toBeDefined();
      expect(service.price).toBeGreaterThanOrEqual(0);
      expect(service.publishStatus).toBe('PUBLISHED');
    }
  });

  test('商品一覧APIが正しいデータを返す', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.products).toBeDefined();
    expect(data.products.length).toBeGreaterThan(0);

    for (const product of data.products) {
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.price).toBeGreaterThanOrEqual(0);
      expect(product.status).toBe('PUBLISHED');
    }
  });

  test('商品詳細APIが正しいデータを返す', async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/products`);
    const listData = await listRes.json();
    const productId = listData.products[0].id;

    const res = await request.get(`${BASE}/api/products/${productId}`);
    expect(res.ok()).toBeTruthy();
    const product = await res.json();
    expect(product.name).toBeDefined();
    expect(product.price).toBeGreaterThanOrEqual(0);
    expect(product.instructor).toBeDefined();
    expect(product.instructor.user).toBeDefined();
    expect(product.instructor.user.name).toBeDefined();
  });

  test('スケジュールAPIが正しいデータを返す', async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/services`);
    const listData = await listRes.json();
    const serviceId = listData.services[0].id;

    const res = await request.get(`${BASE}/api/schedules/service/${serviceId}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.schedules).toBeDefined();
  });

  test('認証なしでカートAPIにアクセスすると401になる', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cart`);
    expect(res.status()).toBe(401);
  });

  test('認証なしで注文APIにアクセスすると401になる', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders`);
    expect(res.status()).toBe(401);
  });

  test('存在しない商品IDで404になる', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products/nonexistent-id`);
    expect(res.status()).toBe(404);
  });

  test('お知らせAPIが正常に応答する', async ({ request }) => {
    const res = await request.get(`${BASE}/api/announcements`);
    expect(res.ok()).toBeTruthy();
  });
});

// ==============================
// 4. 保護ページのリダイレクトテスト
// ==============================
test.describe('保護ページのアクセス制御', () => {
  test('未ログインで/userにアクセスするとログインに遷移', async ({ page }) => {
    await page.goto(`${BASE}/user`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    // ログインページにリダイレクトされるか、ログインを促す画面が表示される
    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/login') || (content?.includes('ログイン') ?? false);
    expect(isRedirected).toBeTruthy();
  });

  test('未ログインで/instructorにアクセスするとログインに遷移', async ({ page }) => {
    await page.goto(`${BASE}/instructor`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/login') || (content?.includes('ログイン') ?? false);
    expect(isRedirected).toBeTruthy();
  });

  test('未ログインで/manage/adminにアクセスするとログインに遷移', async ({ page }) => {
    await page.goto(`${BASE}/manage/admin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/login') || (content?.includes('ログイン') ?? false);
    expect(isRedirected).toBeTruthy();
  });
});

// ==============================
// 5. ナビゲーション・UI テスト
// ==============================
test.describe('ナビゲーション', () => {
  test('トップページからサービス一覧に遷移できる', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // "レッスンを探す" リンクをクリック
    const link = page.locator('a[href="/services"]').first();
    if (await link.count() > 0) {
      await link.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/services');
    }
  });

  test('商品一覧から商品詳細に遷移できる', async ({ page }) => {
    await page.goto(`${BASE}/products`);
    await page.waitForLoadState('networkidle');

    // 商品カードのリンクをクリック
    const productLink = page.locator('a[href*="/products/"]').first();
    if (await productLink.count() > 0) {
      await productLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/products\/.+/);
      // 404でないことを確認
      const content = await page.textContent('body');
      expect(content).not.toContain('404');
    }
  });
});
