/**
 * 銀行振込ステータス更新API
 * PATCH /api/wallet/charge/bank-transfer/[transactionId]
 *
 * 振込完了報告を受け付け、ステータスをTRANSFERREDに更新
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { TransactionStatus } from '@prisma/client';
import { withErrorHandler, unauthorizedError, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) => {
  const { transactionId } = await params;

  // 認証チェック
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // Prisma User を取得
  const dbUser = await prisma.user.findFirst({
    where: { email: authUser.email! },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // トランザクションを取得
  const transaction = await prisma.pointTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    return notFoundError('振込申請');
  }

  // 自分のトランザクションかチェック
  if (transaction.userId !== dbUser.id) {
    return forbiddenError('権限がありません');
  }

  // ステータスチェック
  if (transaction.status !== TransactionStatus.PENDING) {
    return validationError('この振込申請は既に処理済みです');
  }

  // ステータスをTRANSFERRED（振込完了報告済み）に更新
  const updatedTransaction = await prisma.pointTransaction.update({
    where: { id: transactionId },
    data: {
      status: TransactionStatus.TRANSFERRED,
      description: `${transaction.description} - 振込完了報告済み`,
    },
  });

  return NextResponse.json({
    success: true,
    message: '振込完了報告を受け付けました。管理者が確認後、ポイントが反映されます。',
    transaction: updatedTransaction,
  });
});
