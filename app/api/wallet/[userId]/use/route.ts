/**
 * ウォレットAPI - ポイント使用
 * POST /api/wallet/[userId]/use
 *
 * Note: userId パラメータは Supabase Auth ID を期待
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, validationError, unauthorizedError, forbiddenError, notFoundError, insufficientBalanceError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const { userId: authId } = await params; // これはSupabase Auth ID

  if (!authId) {
    return validationError('ユーザーIDが必要です');
  }

  // Supabase からユーザー情報を取得
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  // リクエストされた authId と認証済みユーザーが一致するか検証
  if (authId !== user.id) {
    return forbiddenError('権限がありません');
  }

  // authId でユーザーを検索
  const dbUser = await prisma.user.findFirst({
    where: { authId },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  const body = await request.json();
  const { amount, description } = body;

  if (!amount || amount <= 0) {
    return validationError('有効な金額が必要です');
  }

  // トランザクションでポイント使用処理（Prisma User ID を使用）
  const result = await prisma.$transaction(async (tx) => {
    // ウォレットを取得
    const wallet = await tx.wallet.findUnique({
      where: { userId: dbUser.id },
    });

    if (!wallet) {
      throw new Error('ウォレットが見つかりません');
    }

    // 残高チェック
    if (wallet.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // 残高を更新
    const newBalance = wallet.balance - amount;
    const updatedWallet = await tx.wallet.update({
      where: { userId: dbUser.id },
      data: { balance: newBalance },
    });

    // ポイント履歴に記録
    await tx.pointTransaction.create({
      data: {
        userId: dbUser.id,
        type: 'USE',
        amount: -amount,
        description: description || 'ポイント使用',
        status: 'COMPLETED',
      },
    });

    return updatedWallet;
  });

  return NextResponse.json({
    success: true,
    wallet: result,
  });
});
