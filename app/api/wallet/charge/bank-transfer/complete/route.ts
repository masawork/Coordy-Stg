/**
 * 銀行振込完了報告API
 * POST /api/wallet/charge/bank-transfer/complete
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { TransactionType, TransactionStatus, UserRole } from '@prisma/client';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 30日以上経過した振込申請を期限切れにする
 */
async function cleanupExpiredTransfers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const expiredTransactions = await prisma.pointTransaction.findMany({
    where: {
      method: 'bank_transfer',
      status: TransactionStatus.TRANSFERRED,
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  for (const tx of expiredTransactions) {
    await prisma.pointTransaction.update({
      where: { id: tx.id },
      data: {
        status: TransactionStatus.FAILED,
        description: `${tx.description || ''} [30日経過により自動キャンセル]`,
      },
    });
  }

  return expiredTransactions.length;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const { amount, transferCode } = await request.json();

  // バリデーション
  if (!amount || amount <= 0) {
    return validationError('有効なチャージ額を入力してください');
  }

  if (amount < 1000) {
    return validationError('銀行振込の最低チャージ額は1,000円です');
  }

  if (!transferCode || !/^\d{4}$/.test(transferCode)) {
    return validationError('振込コードが無効です');
  }

  // Prisma User を取得（authIdまたはemailで検索）
  let dbUser = await prisma.user.findFirst({
    where: { authId: authUser.id },
  });

  // authIdで見つからない場合はemailで検索（USER roleを優先）
  if (!dbUser) {
    dbUser = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
        role: UserRole.USER,
      },
    });
  }

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // 30日以上経過した振込申請をクリーンアップ（衝突防止）
  // エラーが発生しても本体処理に影響しないようにする
  try {
    await cleanupExpiredTransfers();
  } catch (cleanupError) {
    console.error('Cleanup error (non-blocking):', cleanupError);
  }

  const transferId = transferCode;

  // トランザクションを作成（TRANSFERRED状態 = 振込完了報告済み）
  const transaction = await prisma.pointTransaction.create({
    data: {
      userId: dbUser.id,
      type: TransactionType.CHARGE,
      amount,
      method: 'bank_transfer',
      status: TransactionStatus.TRANSFERRED,
      transferId,
      description: `銀行振込でチャージ申請（${amount.toLocaleString()}円）`,
    },
  });

  return NextResponse.json({
    success: true,
    transactionId: transaction.id,
    transferId: transaction.transferId,
    message: '振込完了報告を受け付けました。管理者が確認後、ポイントが反映されます。',
  });
});
