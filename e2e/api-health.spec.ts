import { test, expect } from '@playwright/test';

/**
 * APIエンドポイントのヘルスチェック + レスポンス構造検証
 * 実際のHTTPリクエストでAPIルートの動作を確認
 */

test.describe('公開API: サービス一覧', () => {
  test('GET /api/services → 200 + 正しいレスポンス構造', async ({ request }) => {
    const response = await request.get('/api/services');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('services');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');
    expect(data).toHaveProperty('totalPages');
    expect(Array.isArray(data.services)).toBe(true);
  });

  test('GET /api/services?limit=5 → 最大5件', async ({ request }) => {
    const response = await request.get('/api/services?limit=5');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.services.length).toBeLessThanOrEqual(5);
    expect(data.limit).toBe(5);
  });

  test('GET /api/services?sortBy=price_asc → 価格昇順', async ({ request }) => {
    const response = await request.get('/api/services?sortBy=price_asc');
    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.services.length >= 2) {
      for (let i = 1; i < data.services.length; i++) {
        expect(data.services[i].price).toBeGreaterThanOrEqual(data.services[i - 1].price);
      }
    }
  });

  test('GET /api/services?isActive=true → アクティブのみ', async ({ request }) => {
    const response = await request.get('/api/services?isActive=true');
    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const service of data.services) {
      expect(service.isActive).toBe(true);
    }
  });

  test('GET /api/services?page=999 → 空結果（エラーにならない）', async ({ request }) => {
    const response = await request.get('/api/services?page=999');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.services).toEqual([]);
  });

  test('GET /api/services?q=テスト → フリーワード検索が動く', async ({ request }) => {
    const response = await request.get('/api/services?q=%E3%83%86%E3%82%B9%E3%83%88');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.services)).toBe(true);
  });
});

test.describe('認証必須API: 未認証で401', () => {
  test('GET /api/auth/check-role → 401 + エラー構造', async ({ request }) => {
    const response = await request.get('/api/auth/check-role?role=user');
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('UNAUTHORIZED');
    expect(data.error.message).toBeDefined();
  });

  test('GET /api/wallet/me → 401', async ({ request }) => {
    const response = await request.get('/api/wallet/me');
    expect(response.status()).toBe(401);
  });

  test('GET /api/reservations → 401', async ({ request }) => {
    const response = await request.get('/api/reservations');
    expect(response.status()).toBe(401);
  });

  test('GET /api/notifications → 401', async ({ request }) => {
    const response = await request.get('/api/notifications');
    expect(response.status()).toBe(401);
  });

  test('GET /api/favorites → 401', async ({ request }) => {
    const response = await request.get('/api/favorites');
    expect(response.status()).toBe(401);
  });

  test('GET /api/payment-methods → 401', async ({ request }) => {
    const response = await request.get('/api/payment-methods');
    expect(response.status()).toBe(401);
  });

  test('GET /api/instructor/profile → 401', async ({ request }) => {
    const response = await request.get('/api/instructor/profile');
    expect(response.status()).toBe(401);
  });

  test('GET /api/bank-accounts → 401', async ({ request }) => {
    const response = await request.get('/api/bank-accounts');
    expect(response.status()).toBe(401);
  });

  test('GET /api/withdrawals → 401', async ({ request }) => {
    const response = await request.get('/api/withdrawals');
    expect(response.status()).toBe(401);
  });

  test('GET /api/campaigns → 401', async ({ request }) => {
    const response = await request.get('/api/campaigns');
    // campaignsはフィルタ次第で公開の場合もあるため200 or 401
    expect([200, 401]).toContain(response.status());
  });
});

test.describe('外部パートナーAPI: パラメータ検証', () => {
  test('GET /api/external/partner/verify → パラメータなし → 400', async ({ request }) => {
    const response = await request.get('/api/external/partner/verify');
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('MISSING_PARAMETERS');
  });

  test('GET /api/external/partner/verify → 不正パートナーID → 401', async ({ request }) => {
    const response = await request.get(
      '/api/external/partner/verify?partner_id=invalid&ts=1707400000&sig=fake'
    );
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.valid).toBe(false);
  });

  test('GET /api/external/partner/verify → tsがNaN → 400', async ({ request }) => {
    const response = await request.get(
      '/api/external/partner/verify?partner_id=test&ts=abc&sig=fake'
    );
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('INVALID_TIMESTAMP');
  });

  test('GET /api/external/services → パートナー認証なし → エラー', async ({ request }) => {
    const response = await request.get('/api/external/services');
    expect([400, 401]).toContain(response.status());
  });

  test('GET /api/external/availability → パートナー認証なし → エラー', async ({ request }) => {
    const response = await request.get('/api/external/availability');
    expect([400, 401]).toContain(response.status());
  });

  test('POST /api/external/reservations → ボディなし → エラー', async ({ request }) => {
    const response = await request.post('/api/external/reservations', {
      data: {},
    });
    expect([400, 401]).toContain(response.status());
  });
});

test.describe('管理者API: 未認証で401', () => {
  test('GET /api/admin/partners → 401', async ({ request }) => {
    const response = await request.get('/api/admin/partners');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/pending-charges → 401', async ({ request }) => {
    const response = await request.get('/api/admin/pending-charges');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/withdrawals → 401', async ({ request }) => {
    const response = await request.get('/api/admin/withdrawals');
    expect(response.status()).toBe(401);
  });

  test('GET /api/manage/users → 401', async ({ request }) => {
    const response = await request.get('/api/manage/users');
    expect(response.status()).toBe(401);
  });
});
