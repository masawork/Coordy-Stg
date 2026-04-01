import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler, validationError, notFoundError, conflictError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

// 振込手数料（円）
const TRANSFER_FEE = 250;
// 最低引き出し額
const MIN_WITHDRAWAL = 1000;
// 最大引き出し額（1,000万円）
const MAX_WITHDRAWAL = 10_000_000;

/**
 * 引き出し申請一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { dbUser } = authResult;

  const withdrawalRequests = await prisma.withdrawalRequest.findMany({
    where: { instructorId: dbUser.id },
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
 * - getAuthInstructor()でINSTRUCTORロール検証 + Prisma User ID取得
 * - $transactionで残高チェック・出金作成・残高減算・取引記録を一括実行
 * - 楽観的ロック（balance条件付きupdateMany）で並行リクエストの二重出金を防止
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { dbUser } = authResult;
  const userId = dbUser.id;

  const { amount, bankAccountId } = await request.json();

  // バリデーション
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return validationError('引き出し額を正しく入力してください');
  }

  if (!bankAccountId) {
    return validationError('振込先の銀行口座を選択してください');
  }

  if (amount < MIN_WITHDRAWAL) {
    return validationError(`最低引き出し額は${MIN_WITHDRAWAL.toLocaleString()}円です`);
  }

  if (amount > MAX_WITHDRAWAL) {
    return validationError(`1回の引き出し上限は${MAX_WITHDRAWAL.toLocaleString()}円です`);
  }

  // 銀行口座の確認（Prisma User IDで比較）
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!bankAccount || bankAccount.userId !== userId) {
    return notFoundError('銀行口座');
  }

  if (!bankAccount.isVerified) {
    return validationError('この銀行口座は未承認です。管理者の承認をお待ちください');
  }

  const netAmount = amount - TRANSFER_FEE;

  // $transactionで残高チェック・出金作成・残高減算・取引記録を一括実行
  const result = await prisma.$transaction(async (tx) => {
    // 1. トランザクション内で残高を再チェック
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // 2. 楽観的ロック: 残高条件付きで更新（並行リクエストの二重出金防止）
    const updated = await tx.wallet.updateMany({
      where: {
        userId,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    });

    if (updated.count === 0) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    // 3. 引き出し申請を作成
    const withdrawalRequest = await tx.withdrawalRequest.create({
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

    // 4. ポイント取引履歴を記録
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

    return withdrawalRequest;
  });

  return NextResponse.json(result, { status: 201 });
});
