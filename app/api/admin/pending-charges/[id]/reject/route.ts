/**
 * 銀行振込却下API
 * POST /api/admin/pending-charges/[id]/reject
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
  const body = await request.json().catch(() => ({}));
  const reason = body.reason || '';

  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  // トランザクションを取得
  const transaction = await prisma.pointTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    return notFoundError('トランザクション');
  }

  // TRANSFERRED（振込完了報告済み）またはPENDING（旧フロー）を却下可能
  if (transaction.status !== 'TRANSFERRED' && transaction.status !== 'PENDING') {
    return validationError('このトランザクションは既に処理済みです');
  }

  // トランザクションステータスを却下に更新
  await prisma.pointTransaction.update({
    where: { id: transactionId },
    data: {
      status: 'FAILED',
      description: reason
        ? `却下: ${reason}`
        : `銀行振込申請が却下されました`,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'チャージ申請を却下しました',
  });
});
