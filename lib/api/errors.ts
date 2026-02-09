/**
 * 統一APIエラーレスポンス形式
 * Issue #8: APIエラーレスポンス形式の統一
 *
 * すべてのAPIエラーは以下の形式で返される:
 * { error: { code: string, message: string, details?: any } }
 */

import { NextResponse } from 'next/server';

/**
 * エラーコード定数
 */
export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * エラーレスポンスの型定義
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCodeType;
    message: string;
    details?: any;
  };
}

/**
 * 統一エラーレスポンス生成ヘルパー
 */
function createErrorResponse(
  code: ErrorCodeType,
  message: string,
  status: number,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
    },
    { status }
  );
}

/**
 * 401 Unauthorized - 認証が必要
 */
export function unauthorizedError(message: string = '認証が必要です'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCode.UNAUTHORIZED, message, 401);
}

/**
 * 403 Forbidden - 権限が不足
 */
export function forbiddenError(message: string = 'この操作を行う権限がありません'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCode.FORBIDDEN, message, 403);
}

/**
 * 404 Not Found - リソースが見つからない
 */
export function notFoundError(resource?: string): NextResponse<ApiErrorResponse> {
  const message = resource ? `${resource}が見つかりません` : 'リソースが見つかりません';
  return createErrorResponse(ErrorCode.NOT_FOUND, message, 404);
}

/**
 * 400 Validation Error - 入力検証エラー
 */
export function validationError(
  message: string = '入力内容に誤りがあります',
  details?: Record<string, string>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCode.VALIDATION_ERROR, message, 400, details);
}

/**
 * 409 Conflict - リソース競合
 */
export function conflictError(message: string = 'リソースが競合しています'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCode.CONFLICT, message, 409);
}

/**
 * 400 Insufficient Balance - ポイント残高不足
 */
export function insufficientBalanceError(
  required: number,
  balance: number
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCode.INSUFFICIENT_BALANCE,
    'ポイント残高が不足しています',
    400,
    { required, balance }
  );
}

/**
 * 500 Internal Error - サーバー内部エラー
 */
export function internalError(message: string = 'サーバーエラーが発生しました'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCode.INTERNAL_ERROR, message, 500);
}

/**
 * エラーハンドラーラッパー
 * 未処理の例外をキャッチしてinternalErrorを返す
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error('Unhandled API error:', error);

      // Stripe固有のエラー処理
      if (error.type === 'StripeCardError') {
        return validationError(`カード決済に失敗しました: ${error.message}`);
      }

      // Prisma固有のエラー処理
      if (error.code === 'P2025') {
        return notFoundError();
      }

      // その他の予期しないエラー
      const details = process.env.NODE_ENV === 'development' ? error.message : undefined;
      return internalError(details);
    }
  };
}

/**
 * 型ガード: NextResponseかどうかを判定
 * authヘルパーの結果がエラーレスポンスかどうかを判定するために使用
 */
export function isErrorResponse(result: any): result is NextResponse {
  return result instanceof NextResponse;
}
