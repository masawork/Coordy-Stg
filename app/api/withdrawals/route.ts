import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor } from '@/lib/api/auth';
import { withErrorHandler, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

// 振込手数料（円）
const TRANSFER_FEE = 250;

/**
 * 引き出し申請一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const userId = dbUser.id; // Prisma User ID

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
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const userId = dbUser.id; // Prisma User ID
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

  // 最大引き出し額チェック
  const MAX_WITHDRAWAL = 10000000; // 1,000万円
  if (amount > MAX_WITHDRAWAL) {
    return validationError(`引き出し額は${MAX_WITHDRAWAL.toLocaleString()}円以下にしてください`);
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

  // トランザクションで引き出し申請作成 + 残高控除 + 取引履歴記録
  const netAmount = amount - TRANSFER_FEE;

  const withdrawalRequest = await prisma.$transaction(async (tx) => {
    // 残高を再チェック（競合防止）
    const currentWallet = await tx.wallet.findUnique({
      where: { userId },
    });
    if (!currentWallet || currentWallet.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // 引き出し申請を作成
    const request = await tx.withdrawalRequest.create({
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
    await tx.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    // ポイント取引履歴を記録
    await tx.pointTransaction.create({
      data: {
        userId,
        type: 'USE',
        amount: -amount,
        method: 'bank_transfer',
        status: 'PENDING',
        description: `引き出し申請: ${bankAccount.bankName} ${bankAccount.accountHolderName}`,
      },
    });

    return request;
  }).catch((error) => {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return null;
    }
    throw error;
  });

  if (!withdrawalRequest) {
    return validationError('残高が不足しています（他の処理と競合した可能性があります）');
  }

  return NextResponse.json(withdrawalRequest, { status: 201 });
});
