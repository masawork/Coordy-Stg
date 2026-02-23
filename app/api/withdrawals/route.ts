import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

// 振込手数料（円）
const TRANSFER_FEE = 250;

/**
 * 引き出し申請一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const userId = user.id;

  const withdrawalRequests = await prisma.withdrawalRequest.findMany({
    where: { instructorId: userId },
    include: {
      bankAccount: {
        select: {
          bankName: true,
          branchName: true,
          accountHolderName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(withdrawalRequests);
});

/**
 * 引き出し申請を作成
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const userId = user.id;
  const { amount, bankAccountId } = await request.json();

  // バリデーション
  if (!amount || amount <= 0) {
    return validationError('引き出し額を正しく入力してください');
  }

  if (!bankAccountId) {
    return validationError('振込先の銀行口座を選択してください');
  }

  // 最低引き出し額チェック（例: 1,000円以上）
  const MIN_WITHDRAWAL = 1000;
  if (amount < MIN_WITHDRAWAL) {
    return validationError(`最低引き出し額は${MIN_WITHDRAWAL.toLocaleString()}円です`);
  }

  // 銀行口座の確認
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!bankAccount || bankAccount.userId !== userId) {
    return notFoundError('銀行口座');
  }

  if (!bankAccount.isVerified) {
    return validationError('この銀行口座は未承認です。管理者の承認をお待ちください');
  }

  // Walletの残高を確認
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet || wallet.balance < amount) {
    return validationError('残高が不足しています');
  }

  // 引き出し申請を作成
  const netAmount = amount - TRANSFER_FEE;

  const withdrawalRequest = await prisma.withdrawalRequest.create({
    data: {
      instructorId: userId,
      amount,
      fee: TRANSFER_FEE,
      netAmount,
      bankAccountId,
      status: 'PENDING',
    },
    include: {
      bankAccount: {
        select: {
          bankName: true,
          branchName: true,
          accountHolderName: true,
        },
      },
    },
  });

  // Walletから残高を減算（申請時点で予約）
  await prisma.wallet.update({
    where: { userId },
    data: {
      balance: {
        decrement: amount,
      },
    },
  });

  // ポイント取引履歴を記録
  await prisma.pointTransaction.create({
    data: {
      userId,
      type: 'USE',
      amount: -amount,
      method: 'bank_transfer',
      status: 'PENDING',
      description: `引き出し申請: ${bankAccount.bankName} ${bankAccount.accountHolderName}`,
    },
  });

  return NextResponse.json(withdrawalRequest, { status: 201 });
});
