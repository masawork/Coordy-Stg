import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 引き出し申請を承認/却下（管理者用）
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const { action, rejectedReason } = await request.json();

  // 引き出し申請を取得
  const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
    where: { id },
  });

  if (!withdrawalRequest) {
    return notFoundError('引き出し申請');
  }

  // アクション別処理
  if (action === 'approve') {
    // 承認はPENDING状態のみ可能
    if (withdrawalRequest.status !== 'PENDING') {
      return validationError('すでに処理済みです');
    }
    // 承認
    const updated = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...updated,
      message: '引き出し申請を承認しました',
    });
  } else if (action === 'reject') {
    // 却下はPENDING状態のみ可能
    if (withdrawalRequest.status !== 'PENDING') {
      return validationError('すでに処理済みです');
    }
    // 却下
    if (!rejectedReason) {
      return validationError('却下理由を入力してください');
    }

    // 却下時は残高を返金
    await prisma.wallet.update({
      where: { userId: withdrawalRequest.instructorId },
      data: {
        balance: {
          increment: withdrawalRequest.amount,
        },
      },
    });

    // ポイント取引履歴を更新
    await prisma.pointTransaction.updateMany({
      where: {
        userId: withdrawalRequest.instructorId,
        description: {
          contains: '引き出し申請',
        },
        status: 'PENDING',
      },
      data: {
        status: 'FAILED',
      },
    });

    const updated = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...updated,
      message: '引き出し申請を却下しました',
    });
  } else if (action === 'complete') {
    // 振込完了
    if (withdrawalRequest.status !== 'APPROVED') {
      return validationError('承認済みの申請のみ完了できます');
    }

    // ポイント取引履歴を更新
    await prisma.pointTransaction.updateMany({
      where: {
        userId: withdrawalRequest.instructorId,
        description: {
          contains: '引き出し申請',
        },
        status: 'PENDING',
      },
      data: {
        status: 'COMPLETED',
      },
    });

    const updated = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...updated,
      message: '振込完了にしました',
    });
  } else {
    return validationError('無効なアクションです');
  }
});
