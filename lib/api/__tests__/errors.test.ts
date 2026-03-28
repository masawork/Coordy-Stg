/**
 * Tests for lib/api/errors.ts
 * Unified API error response helpers and withErrorHandler wrapper
 */

import { NextResponse } from 'next/server';
import {
  ErrorCode,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  conflictError,
  insufficientBalanceError,
  internalError,
  withErrorHandler,
  isErrorResponse,
} from '../errors';

// Helper to extract JSON body and status from NextResponse
async function parseResponse(response: NextResponse) {
  const body = await response.json();
  return { body, status: response.status };
}

describe('ErrorCode constants', () => {
  it('should define all expected error codes', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.CONFLICT).toBe('CONFLICT');
    expect(ErrorCode.INSUFFICIENT_BALANCE).toBe('INSUFFICIENT_BALANCE');
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});

describe('unauthorizedError', () => {
  it('should return 401 with default message', async () => {
    const res = unauthorizedError();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('認証が必要です');
    expect(body.error.details).toBeUndefined();
  });

  it('should return 401 with custom message', async () => {
    const res = unauthorizedError('トークンが無効です');
    const { body, status } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('トークンが無効です');
  });
});

describe('forbiddenError', () => {
  it('should return 403 with default message', async () => {
    const res = forbiddenError();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toBe('この操作を行う権限がありません');
    expect(body.error.details).toBeUndefined();
  });

  it('should return 403 with custom message', async () => {
    const res = forbiddenError('管理者のみアクセスできます');
    const { body, status } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error.message).toBe('管理者のみアクセスできます');
  });
});

describe('notFoundError', () => {
  it('should return 404 with default message when no resource specified', async () => {
    const res = notFoundError();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('リソースが見つかりません');
    expect(body.error.details).toBeUndefined();
  });

  it('should return 404 with resource-specific message', async () => {
    const res = notFoundError('サービス');
    const { body, status } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error.message).toBe('サービスが見つかりません');
  });

  it('should handle various resource names', async () => {
    const res = notFoundError('ユーザー');
    const { body } = await parseResponse(res);
    expect(body.error.message).toBe('ユーザーが見つかりません');
  });
});

describe('validationError', () => {
  it('should return 400 with default message and no details', async () => {
    const res = validationError();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('入力内容に誤りがあります');
    expect(body.error.details).toBeUndefined();
  });

  it('should return 400 with custom message', async () => {
    const res = validationError('メールアドレスが無効です');
    const { body, status } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error.message).toBe('メールアドレスが無効です');
  });

  it('should include details when provided', async () => {
    const details = { email: '無効な形式です', name: '必須項目です' };
    const res = validationError('入力内容に誤りがあります', details);
    const { body } = await parseResponse(res);

    expect(body.error.details).toEqual(details);
    expect(body.error.details.email).toBe('無効な形式です');
    expect(body.error.details.name).toBe('必須項目です');
  });
});

describe('conflictError', () => {
  it('should return 409 with default message', async () => {
    const res = conflictError();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('リソースが競合しています');
    expect(body.error.details).toBeUndefined();
  });

  it('should return 409 with custom message', async () => {
    const res = conflictError('このメールアドレスは既に登録されています');
    const { body, status } = await parseResponse(res);

    expect(status).toBe(409);
    expect(body.error.message).toBe('このメールアドレスは既に登録されています');
  });
});

describe('insufficientBalanceError', () => {
  it('should return 400 with balance details', async () => {
    const res = insufficientBalanceError(5000, 3000);
    const { body, status } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(body.error.message).toBe('ポイント残高が不足しています');
    expect(body.error.details).toEqual({ required: 5000, balance: 3000 });
  });

  it('should handle zero balance', async () => {
    const res = insufficientBalanceError(1000, 0);
    const { body } = await parseResponse(res);

    expect(body.error.details.required).toBe(1000);
    expect(body.error.details.balance).toBe(0);
  });
});

describe('internalError', () => {
  it('should return 500 with default message', async () => {
    const res = internalError();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('サーバーエラーが発生しました');
    expect(body.error.details).toBeUndefined();
  });

  it('should return 500 with custom message', async () => {
    const res = internalError('データベース接続に失敗しました');
    const { body, status } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error.message).toBe('データベース接続に失敗しました');
  });
});

describe('withErrorHandler', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return the handler result when no error is thrown', async () => {
    const handler = async () => NextResponse.json({ success: true });
    const wrapped = withErrorHandler(handler);
    const res = await wrapped();
    const body = await res.json();

    expect(body).toEqual({ success: true });
  });

  it('should pass arguments through to the handler', async () => {
    const handler = async (a: number, b: string) =>
      NextResponse.json({ a, b });
    const wrapped = withErrorHandler(handler);
    const res = await wrapped(42, 'hello');
    const body = await res.json();

    expect(body).toEqual({ a: 42, b: 'hello' });
  });

  it('should catch StripeCardError and return validationError', async () => {
    const stripeError = new Error('Your card was declined');
    (stripeError as any).type = 'StripeCardError';

    const handler = async () => {
      throw stripeError;
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('カード決済に失敗しました');
    expect(body.error.message).toContain('Your card was declined');
  });

  it('should catch Prisma P2025 error and return notFoundError', async () => {
    const prismaError = new Error('Record not found');
    (prismaError as any).code = 'P2025';

    const handler = async () => {
      throw prismaError;
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('リソースが見つかりません');
  });

  it('should return internalError for generic errors in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const handler = async () => {
      throw new Error('Something unexpected happened');
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    // In production, the error message should NOT leak to the client
    expect(body.error.message).toBe('サーバーエラーが発生しました');

    process.env.NODE_ENV = originalEnv;
  });

  it('should include error message in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const handler = async () => {
      throw new Error('Debug info here');
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped();
    const { body, status } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    // In development, the error message is passed as the response message
    expect(body.error.message).toBe('Debug info here');

    process.env.NODE_ENV = originalEnv;
  });

  it('should log unhandled errors to console.error', async () => {
    const error = new Error('test error');
    const handler = async () => {
      throw error;
    };
    const wrapped = withErrorHandler(handler);
    await wrapped();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled API error:', error);
  });

  it('should prioritize StripeCardError over Prisma P2025 when both properties exist', async () => {
    const hybridError = new Error('Stripe card error');
    (hybridError as any).type = 'StripeCardError';
    (hybridError as any).code = 'P2025';

    const handler = async () => {
      throw hybridError;
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped();
    const { body, status } = await parseResponse(res);

    // StripeCardError check comes first in the code
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('isErrorResponse', () => {
  it('should return true for NextResponse instances', () => {
    const response = NextResponse.json({ error: 'test' }, { status: 400 });
    expect(isErrorResponse(response)).toBe(true);
  });

  it('should return false for plain objects', () => {
    const obj = { id: '123', name: 'test' };
    expect(isErrorResponse(obj)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isErrorResponse(undefined)).toBe(false);
  });

  it('should return false for strings', () => {
    expect(isErrorResponse('error')).toBe(false);
  });

  it('should return false for numbers', () => {
    expect(isErrorResponse(404)).toBe(false);
  });

  it('should return true for error responses from helper functions', () => {
    const errorRes = unauthorizedError();
    expect(isErrorResponse(errorRes)).toBe(true);
  });
});

describe('Response structure consistency', () => {
  it('all error helpers should return responses with error.code and error.message', async () => {
    const responses = [
      unauthorizedError(),
      forbiddenError(),
      notFoundError(),
      validationError(),
      conflictError(),
      insufficientBalanceError(100, 0),
      internalError(),
    ];

    for (const res of responses) {
      const { body } = await parseResponse(res);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
    }
  });

  it('details should only be present when explicitly provided', async () => {
    const withoutDetails = await parseResponse(validationError('msg'));
    expect(withoutDetails.body.error.details).toBeUndefined();

    const withDetails = await parseResponse(
      validationError('msg', { field: 'error' })
    );
    expect(withDetails.body.error.details).toBeDefined();
  });
});
