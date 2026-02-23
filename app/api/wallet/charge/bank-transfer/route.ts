/**
 * 銀行振込チャージ申請API
 * POST /api/wallet/charge/bank-transfer
 *
 * 銀行振込でのポイントチャージを申請（管理者承認後に反映）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const { amount } = await request.json();

  // バリデーション
  if (!amount || amount <= 0) {
    return validationError('有効なチャージ額を入力してください');
  }

  if (amount < 1000) {
    return validationError('銀行振込の最低チャージ額は1,000円です');
  }

  // Prisma User を取得
  const dbUser = await prisma.user.findFirst({
    where: { email: authUser.email! },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // 取引履歴を作成（PENDING状態）
  const transaction = await prisma.pointTransaction.create({
    data: {
      userId: dbUser.id,
      type: TransactionType.CHARGE,
      amount,
      method: 'bank_transfer',
      status: TransactionStatus.PENDING,
      description: `銀行振込でチャージ申請（${amount.toLocaleString()}円）`,
    },
  });

  return NextResponse.json({
    success: true,
    transactionId: transaction.id,
    message: '銀行振込申請を受け付けました。振込確認後、ポイントが追加されます。',
    bankInfo: {
      bankName: 'サンプル銀行',
      branchName: '本店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolder: 'カブシキガイシャCoody',
      transferAmount: amount,
      transferId: transaction.id.slice(0, 8).toUpperCase(), // 振込時の備考欄に記載
    },
  });
});
