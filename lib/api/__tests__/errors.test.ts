/**
 * APIエラーヘルパーのテスト
 */
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
} from '../errors';
import { NextRequest, NextResponse } from 'next/server';

async function extractJson(response: NextResponse) {
  const body = await response.json();
  return body;
}

describe('ErrorCode', () => {
  it('すべてのエラーコードが定義されている', () => {
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
  it('401ステータスコードを返す', () => {
    const res = unauthorizedError();
    expect(res.status).toBe(401);
  });

  it('デフォルトメッセージが設定される', async () => {
    const res = unauthorizedError();
    const body = await extractJson(res);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('認証が必要です');
  });

  it('カスタムメッセージを指定できる', async () => {
    const res = unauthorizedError('セッション切れです');
    const body = await extractJson(res);
    expect(body.error.message).toBe('セッション切れです');
  });
});

describe('forbiddenError', () => {
  it('403ステータスコードを返す', () => {
    const res = forbiddenError();
    expect(res.status).toBe(403);
  });

  it('デフォルトメッセージが設定される', async () => {
    const res = forbiddenError();
    const body = await extractJson(res);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toBe('この操作を行う権限がありません');
  });
});

describe('notFoundError', () => {
  it('404ステータスコードを返す', () => {
    const res = notFoundError();
    expect(res.status).toBe(404);
  });

  it('リソース名なしのデフォルトメッセージ', async () => {
    const res = notFoundError();
    const body = await extractJson(res);
    expect(body.error.message).toBe('リソースが見つかりません');
  });

  it('リソース名付きのメッセージ', async () => {
    const res = notFoundError('サービス');
    const body = await extractJson(res);
    expect(body.error.message).toBe('サービスが見つかりません');
  });
});

describe('validationError', () => {
  it('400ステータスコードを返す', () => {
    const res = validationError();
    expect(res.status).toBe(400);
  });

  it('詳細情報を含めることができる', async () => {
    const res = validationError('入力エラー', { email: 'メールアドレスが無効です' });
    const body = await extractJson(res);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ email: 'メールアドレスが無効です' });
  });

  it('詳細なしの場合はdetailsキーが含まれない', async () => {
    const res = validationError('入力エラー');
    const body = await extractJson(res);
    expect(body.error.details).toBeUndefined();
  });
});

describe('conflictError', () => {
  it('409ステータスコードを返す', () => {
    const res = conflictError();
    expect(res.status).toBe(409);
  });

  it('CONFLICTコードを返す', async () => {
    const res = conflictError('既に存在します');
    const body = await extractJson(res);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('既に存在します');
  });
});

describe('insufficientBalanceError', () => {
  it('400ステータスコードを返す', () => {
    const res = insufficientBalanceError(5000, 1000);
    expect(res.status).toBe(400);
  });

  it('必要額と残高を含む', async () => {
    const res = insufficientBalanceError(5000, 1000);
    const body = await extractJson(res);
    expect(body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(body.error.message).toBe('ポイント残高が不足しています');
    expect(body.error.details).toEqual({ required: 5000, balance: 1000 });
  });
});

describe('internalError', () => {
  it('500ステータスコードを返す', () => {
    const res = internalError();
    expect(res.status).toBe(500);
  });

  it('INTERNAL_ERRORコードを返す', async () => {
    const res = internalError();
    const body = await extractJson(res);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('withErrorHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('正常時はハンドラーの結果をそのまま返す', async () => {
    const handler = withErrorHandler(async () => {
      return NextResponse.json({ ok: true });
    });

    const result = await handler();
    const body = await result.json();
    expect(body.ok).toBe(true);
  });

  it('未処理の例外をキャッチして500を返す', async () => {
    const handler = withErrorHandler(async () => {
      throw new Error('Unexpected error');
    });

    const result = await handler();
    expect(result.status).toBe(500);
  });

  it('Prisma P2025エラーを404に変換する', async () => {
    const handler = withErrorHandler(async () => {
      const err = new Error('Record not found') as Error & { code: string };
      err.code = 'P2025';
      throw err;
    });

    const result = await handler();
    expect(result.status).toBe(404);
    const body = await result.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('StripeCardErrorを400に変換する', async () => {
    const handler = withErrorHandler(async () => {
      const err = new Error('Your card was declined') as Error & { type: string };
      err.type = 'StripeCardError';
      throw err;
    });

    const result = await handler();
    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('カード決済に失敗しました');
  });

  it('引数をハンドラーに正しく渡す', async () => {
    const handler = withErrorHandler(async (req: NextRequest) => {
      const url = req.url;
      return NextResponse.json({ url });
    });

    const req = new NextRequest('http://localhost/api/test');
    const result = await handler(req);
    const body = await result.json();
    expect(body.url).toBe('http://localhost/api/test');
  });
});
