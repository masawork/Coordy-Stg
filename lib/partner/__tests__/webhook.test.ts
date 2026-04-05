/**
 * パートナーWebhook通知ユーティリティのテスト
 */
import {
  sendWebhookNotification,
  buildReservationWebhookData,
} from '../webhook';

// Prismaモック
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    webhookLog: {
      create: jest.fn(),
    },
  },
}));

// fetchモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('sendWebhookNotification', () => {
  const webhookUrl = 'https://partner.example.com/webhook';
  const webhookSecret = 'whsec_test_secret';
  const event = 'reservation.created' as const;
  const data = { reservationId: 'res-123', status: 'CONFIRMED' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('成功時にsuccess: trueを返す', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 0 },
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempts).toBe(1);
  });

  it('正しいヘッダーでfetchを呼び出す', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 0 },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(webhookUrl);
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Coordy-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(options.headers['X-Coordy-Timestamp']).toBeDefined();
  });

  it('ペイロードにevent, timestamp, dataが含まれる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 0 },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.event).toBe('reservation.created');
    expect(body.timestamp).toBeDefined();
    expect(body.data).toEqual(data);
  });

  it('4xxエラーではリトライしない', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 3 },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.attempts).toBe(1);
  });

  it('5xxエラーではリトライする', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 }, // テスト用に短い遅延
    );

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
  });

  it('ネットワークエラーでリトライする', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10 },
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('全リトライ失敗時にerror情報を返す', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 },
    );

    expect(mockFetch).toHaveBeenCalledTimes(3); // 初回 + 2リトライ
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection refused');
    expect(result.attempts).toBe(3);
  });

  it('maxRetries=0でリトライしない', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Error'));

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { maxRetries: 0 },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('デフォルト設定で最大4回試行する（初回+3リトライ）', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await sendWebhookNotification(
      webhookUrl,
      webhookSecret,
      event,
      data,
      { baseDelayMs: 1, maxDelayMs: 10 }, // 遅延を短縮
    );

    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.attempts).toBe(4);
  });
});

describe('buildReservationWebhookData', () => {
  it('予約作成データを正しく組み立てる', () => {
    const result = buildReservationWebhookData({
      reservationId: 'res-123',
      externalRef: 'EXT-456',
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'SUP体験コース' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 2,
      guest: { name: '田中花子', email: 'tanaka@example.com' },
      totalAmount: 10000,
      commissionAmount: 500,
      paymentMode: 'COORDY',
    });

    expect(result).toEqual({
      reservationId: 'res-123',
      externalRef: 'EXT-456',
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'SUP体験コース' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 2,
      guest: { name: '田中花子', email: 'tanaka@example.com' },
      totalAmount: 10000,
      commission: 500,
      paymentMode: 'COORDY',
    });
  });

  it('externalRefがnullの場合はnullを返す', () => {
    const result = buildReservationWebhookData({
      reservationId: 'res-123',
      externalRef: null,
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'テスト' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 1,
      guest: null,
      totalAmount: 5000,
      commissionAmount: 0,
      paymentMode: 'EXTERNAL',
    });

    expect(result.externalRef).toBeNull();
    expect(result.guest).toBeNull();
  });

  it('externalRefがundefinedの場合はnullを返す', () => {
    const result = buildReservationWebhookData({
      reservationId: 'res-123',
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'テスト' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 1,
      totalAmount: 5000,
      commissionAmount: 0,
      paymentMode: 'EXTERNAL',
    });

    expect(result.externalRef).toBeNull();
  });

  it('commissionAmountがcommissionとして返される', () => {
    const result = buildReservationWebhookData({
      reservationId: 'res-123',
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'テスト' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 1,
      totalAmount: 10000,
      commissionAmount: 1000,
      paymentMode: 'COORDY',
    });

    expect(result.commission).toBe(1000);
    expect(result).not.toHaveProperty('commissionAmount');
  });
});
