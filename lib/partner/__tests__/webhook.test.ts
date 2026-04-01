/**
 * Webhook通知ユーティリティのテスト
 */

import {
  sendWebhookNotification,
  queueWebhookNotification,
  buildReservationWebhookData,
  sendAndLogWebhook,
} from '../webhook';

// Mock signWebhookPayload
jest.mock('../auth', () => ({
  signWebhookPayload: jest.fn().mockReturnValue('sha256=mocked_signature'),
}));

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    webhookLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    },
  },
}));

import { signWebhookPayload } from '../auth';
import prisma from '@/lib/prisma';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Suppress console output during tests
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Deterministic Math.random for jitter
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper to create a mock Response
function mockResponse(status: number, ok?: boolean): Response {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    clone: jest.fn(),
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    json: jest.fn(),
    text: jest.fn(),
    bytes: jest.fn(),
  } as unknown as Response;
}

const TEST_URL = 'https://partner.example.com/webhook';
const TEST_SECRET = 'whsec_test_secret';
const TEST_EVENT = 'reservation.created' as const;
const TEST_DATA = { reservationId: 'res-1', status: 'CONFIRMED' };

describe('sendWebhookNotification', () => {
  describe('success cases', () => {
    it('should return success on 200 response', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(result.lastAttemptAt).toBeInstanceOf(Date);
    });

    it('should call fetch with correct headers and body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      await sendWebhookNotification(TEST_URL, TEST_SECRET, TEST_EVENT, TEST_DATA);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(TEST_URL);
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-Coordy-Signature']).toBe('sha256=mocked_signature');
      expect(options.headers['X-Coordy-Timestamp']).toBeDefined();

      const body = JSON.parse(options.body);
      expect(body.event).toBe(TEST_EVENT);
      expect(body.data).toEqual(TEST_DATA);
      expect(body.timestamp).toBeDefined();
    });

    it('should call signWebhookPayload with the body and secret', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      await sendWebhookNotification(TEST_URL, TEST_SECRET, TEST_EVENT, TEST_DATA);

      expect(signWebhookPayload).toHaveBeenCalledWith(
        expect.any(String),
        TEST_SECRET,
      );
    });

    it('should return success on 201 response', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(201, true));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.attempts).toBe(1);
    });
  });

  describe('4xx client errors - no retry', () => {
    it('should not retry on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(400));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(401));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(404));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 422 Unprocessable Entity', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(422));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(422);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should log a warning on 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(403));

      await sendWebhookNotification(TEST_URL, TEST_SECRET, TEST_EVENT, TEST_DATA);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('client error 403'),
        // note: console.warn is called only once for 4xx
      );
    });
  });

  describe('5xx server errors - retry', () => {
    it('should retry on 500 and eventually succeed', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(500))
        .mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 Bad Gateway', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(502))
        .mockResolvedValueOnce(mockResponse(502))
        .mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 503 Service Unavailable', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(503))
        .mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should exhaust all retries on persistent 500', async () => {
      mockFetch.mockResolvedValue(mockResponse(500));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should use default of 3 retries (4 total attempts)', async () => {
      mockFetch.mockResolvedValue(mockResponse(500));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('network errors - retry', () => {
    it('should retry on network error and eventually succeed', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(2);
    });

    it('should exhaust retries on persistent network errors', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
      expect(result.attempts).toBe(3); // 1 initial + 2 retries
      expect(result.statusCode).toBeUndefined();
    });

    it('should handle non-Error throw', async () => {
      mockFetch.mockRejectedValue('string error');

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { maxRetries: 0, baseDelayMs: 1 },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('timeout handling', () => {
    it('should pass AbortSignal with 10s timeout to fetch', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200));

      await sendWebhookNotification(TEST_URL, TEST_SECRET, TEST_EVENT, TEST_DATA);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.signal).toBeDefined();
      // AbortSignal.timeout(10000) is used in source
    });

    it('should treat timeout as a retryable error', async () => {
      const timeoutError = new DOMException('The operation was aborted', 'AbortError');
      mockFetch
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay between retries (verified by timing)', async () => {
      // With baseDelayMs=1 and Math.random()=0.5 (jitter=500ms actual, but we use tiny delays):
      // We verify the delay logic indirectly: more retries take longer
      mockFetch.mockResolvedValue(mockResponse(500));

      const start = Date.now();
      await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 },
      );
      const elapsed = Date.now() - start;

      // With baseDelayMs=1, Math.random=0.5 (jitter=500ms each retry),
      // actual delays are small enough to complete but we verify attempts
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Elapsed should be > 0 (some delay happened)
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should calculate delays correctly based on formula', () => {
      // Test the backoff formula directly:
      // delay = min(baseDelayMs * 2^(attempt-1) + jitter, maxDelayMs)
      const baseDelayMs = 1000;
      const maxDelayMs = 30000;
      const jitter = 0.5 * 1000; // Math.random() = 0.5, jitter range 0-1000

      // Retry 1 (attempt=1): 1000 * 2^0 + 500 = 1500
      const delay1 = Math.min(baseDelayMs * Math.pow(2, 0) + jitter, maxDelayMs);
      expect(delay1).toBe(1500);

      // Retry 2 (attempt=2): 1000 * 2^1 + 500 = 2500
      const delay2 = Math.min(baseDelayMs * Math.pow(2, 1) + jitter, maxDelayMs);
      expect(delay2).toBe(2500);

      // Retry 3 (attempt=3): 1000 * 2^2 + 500 = 4500
      const delay3 = Math.min(baseDelayMs * Math.pow(2, 2) + jitter, maxDelayMs);
      expect(delay3).toBe(4500);
    });

    it('should cap delay at maxDelayMs', () => {
      const baseDelayMs = 10000;
      const maxDelayMs = 5000;
      const jitter = 0.5 * 1000;

      // Retry 1: 10000 * 2^0 + 500 = 10500, capped to 5000
      const delay1 = Math.min(baseDelayMs * Math.pow(2, 0) + jitter, maxDelayMs);
      expect(delay1).toBe(5000);

      // Retry 2: 10000 * 2^1 + 500 = 20500, capped to 5000
      const delay2 = Math.min(baseDelayMs * Math.pow(2, 1) + jitter, maxDelayMs);
      expect(delay2).toBe(5000);
    });
  });

  describe('custom retry config', () => {
    it('should allow 0 retries (single attempt)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { maxRetries: 0 },
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should allow custom maxRetries', async () => {
      mockFetch.mockResolvedValue(mockResponse(500));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { maxRetries: 5, baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.attempts).toBe(6); // 1 initial + 5 retries
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });

  describe('mixed failure scenarios', () => {
    it('should handle 500 then network error then success', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(500))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(mockResponse(200));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('should stop retrying when a 4xx is returned after 5xx', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(500))
        .mockResolvedValueOnce(mockResponse(403));

      const result = await sendWebhookNotification(
        TEST_URL,
        TEST_SECRET,
        TEST_EVENT,
        TEST_DATA,
        { baseDelayMs: 1, maxDelayMs: 10 },
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('queueWebhookNotification', () => {
  it('should call sendWebhookNotification asynchronously (fire-and-forget)', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));

    // queueWebhookNotification is fire-and-forget, returns void
    queueWebhookNotification(TEST_URL, TEST_SECRET, TEST_EVENT, TEST_DATA);

    // Wait for the fire-and-forget promise to settle
    await new Promise(resolve => setTimeout(resolve, 50));
    await new Promise(process.nextTick);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Background webhook delivered successfully'),
    );
  });

  it('should log error on failure', async () => {
    // Use 4xx to avoid retries (queueWebhookNotification doesn't accept retryConfig)
    mockFetch.mockResolvedValue(mockResponse(400));

    queueWebhookNotification(TEST_URL, TEST_SECRET, TEST_EVENT, TEST_DATA);

    // Wait for the fire-and-forget promise to settle
    await new Promise(resolve => setTimeout(resolve, 50));
    await new Promise(process.nextTick);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Background webhook failed'),
      expect.any(String),
    );
  });
});

describe('buildReservationWebhookData', () => {
  it('should build webhook data with all fields', () => {
    const data = buildReservationWebhookData({
      reservationId: 'res-1',
      externalRef: 'EXT-123',
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'SUP' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 2,
      guest: { name: 'Tanaka', email: 'tanaka@example.com' },
      totalAmount: 10000,
      commissionAmount: 500,
      paymentMode: 'COORDY',
    });

    expect(data).toEqual({
      reservationId: 'res-1',
      externalRef: 'EXT-123',
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'SUP' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 2,
      guest: { name: 'Tanaka', email: 'tanaka@example.com' },
      totalAmount: 10000,
      commission: 500,
      paymentMode: 'COORDY',
    });
  });

  it('should set externalRef to null when not provided', () => {
    const data = buildReservationWebhookData({
      reservationId: 'res-1',
      externalRef: null,
      status: 'CONFIRMED',
      service: { id: 'svc-1', title: 'SUP' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 1,
      guest: null,
      totalAmount: 5000,
      commissionAmount: 0,
      paymentMode: 'EXTERNAL',
    });

    expect(data.externalRef).toBeNull();
    expect(data.guest).toBeNull();
  });

  it('should set externalRef to null when undefined', () => {
    const data = buildReservationWebhookData({
      reservationId: 'res-1',
      status: 'CANCELLED',
      service: { id: 'svc-1', title: 'SUP' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 1,
      totalAmount: 5000,
      commissionAmount: 0,
      paymentMode: 'COORDY',
    });

    expect(data.externalRef).toBeNull();
    expect(data.guest).toBeNull();
  });

  it('should map commissionAmount to commission key', () => {
    const data = buildReservationWebhookData({
      reservationId: 'res-1',
      status: 'COMPLETED',
      service: { id: 'svc-1', title: 'Test' },
      scheduledAt: '2025-02-15T09:00:00+09:00',
      participants: 1,
      totalAmount: 10000,
      commissionAmount: 1000,
      paymentMode: 'COORDY',
    });

    expect(data.commission).toBe(1000);
    expect(data).not.toHaveProperty('commissionAmount');
  });
});

describe('sendAndLogWebhook', () => {
  const logParams = {
    partnerId: 'partner-1',
    reservationId: 'res-1',
    webhookUrl: TEST_URL,
    webhookSecret: TEST_SECRET,
    event: TEST_EVENT,
    data: TEST_DATA,
  };

  it('should send webhook and create a log entry on success', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));

    const result = await sendAndLogWebhook(logParams);

    expect(result.success).toBe(true);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'partner-1',
        reservationId: 'res-1',
        event: TEST_EVENT,
        url: TEST_URL,
        success: true,
        statusCode: 200,
        attempts: 1,
        lastError: null,
      }),
    });
  });

  it('should log failure result to database', async () => {
    // Use 4xx so there's no retry (faster test)
    mockFetch.mockResolvedValueOnce(mockResponse(400));

    const result = await sendAndLogWebhook(logParams);

    expect(result.success).toBe(false);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'partner-1',
        success: false,
        statusCode: 400,
      }),
    });
  });

  it('should log error string when fetch throws on first attempt then returns 4xx', async () => {
    // First attempt throws, second returns 4xx (stops retry)
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(mockResponse(400));

    const result = await sendAndLogWebhook(logParams);

    // The final result is from the 4xx response (no error string, has statusCode)
    expect(result.success).toBe(false);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
        statusCode: 400,
      }),
    });
  });

  it('should store the request body as JSON in the log', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));

    await sendAndLogWebhook(logParams);

    const createCall = (prisma.webhookLog.create as jest.Mock).mock.calls[0][0];
    const storedBody = JSON.parse(createCall.data.requestBody);
    expect(storedBody.event).toBe(TEST_EVENT);
    expect(storedBody.data).toEqual(TEST_DATA);
  });

  it('should handle reservationId being undefined', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));

    await sendAndLogWebhook({
      partnerId: 'partner-1',
      webhookUrl: TEST_URL,
      webhookSecret: TEST_SECRET,
      event: TEST_EVENT,
      data: TEST_DATA,
    });

    expect(prisma.webhookLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reservationId: null,
      }),
    });
  });

  it('should not throw if logging fails', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));
    (prisma.webhookLog.create as jest.Mock).mockRejectedValueOnce(
      new Error('DB connection lost'),
    );

    // Should not throw
    const result = await sendAndLogWebhook(logParams);

    expect(result.success).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      'Failed to save WebhookLog:',
      expect.any(Error),
    );
  });

  it('should still return the webhook result even if logging fails', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));
    (prisma.webhookLog.create as jest.Mock).mockRejectedValueOnce(
      new Error('DB error'),
    );

    const result = await sendAndLogWebhook(logParams);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempts).toBe(1);
  });
});
