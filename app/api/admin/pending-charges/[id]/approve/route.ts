/**
 * 銀行振込承認API
 * POST /api/admin/pending-charges/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: transactionId } = await params;

  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  // Issue #5: バリデーションをトランザクション外で実行
  const transaction = await prisma.pointTransaction.findUnique({
    where: { id: transactionId },
    include: { user: true },
  });

  if (!transaction) {
    return notFoundError('トランザクション');
  }

  // TRANSFERRED（振込完了報告済み）またはPENDING（旧フロー）を承認可能
  if (transaction.status !== 'TRANSFERRED' && transaction.status !== 'PENDING') {
    return validationError('このトランザクションは既に処理済みです');
  }

  // トランザクションで残高更新とステータス更新を実行
  const result = await prisma.$transaction(async (tx) => {
    // ウォレットを取得または作成
    let wallet = await tx.wallet.findUnique({
      where: { userId: transaction.userId },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: transaction.userId,
          balance: 0,
        },
      });
    }

    // 残高を更新
    const newBalance = wallet.balance + transaction.amount;
    await tx.wallet.update({
      where: { userId: transaction.userId },
      data: { balance: newBalance },
    });

    // トランザクションステータスを更新
    await tx.pointTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        description: `銀行振込でチャージ完了（${transaction.amount.toLocaleString()}pt）`,
      },
    });

    return {
      newBalance,
      amount: transaction.amount,
      userName: transaction.user.name,
    };
  });

  // Issue #7: ユーザーに承認通知を送信
  await prisma.notification.create({
    data: {
      userId: transaction.userId,
      type: 'system',
      category: 'payment',
      title: '銀行振込チャージ承認',
      message: `銀行振込チャージ ¥${transaction.amount.toLocaleString()} が承認されました。ポイント残高に反映されています。`,
    },
  });

  return NextResponse.json({
    success: true,
    message: `${result.amount.toLocaleString()}ptのチャージを承認しました`,
    newBalance: result.newBalance,
  });
});
