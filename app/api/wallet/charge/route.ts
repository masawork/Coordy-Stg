/**
 * ポイントチャージAPI
 * POST /api/wallet/charge
 *
 * クレジットカード決済でポイントをチャージする
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { createPaymentIntent } from '@/lib/stripe/helpers';
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

  const { amount, paymentMethodId } = await request.json();

  // バリデーション
  if (!amount || amount <= 0) {
    return validationError('有効なチャージ額を入力してください');
  }

  if (amount < 100) {
    return validationError('最低チャージ額は100円です');
  }

  // Prisma User を取得
  const dbUser = await prisma.user.findFirst({
    where: { email: authUser.email! },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // デフォルトの支払い方法を取得
  let paymentMethod;
  if (paymentMethodId) {
    paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: dbUser.id,
      },
    });
  } else {
    paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        userId: dbUser.id,
        isDefault: true,
      },
    });
  }

  if (!paymentMethod || !paymentMethod.stripeCustomerId || !paymentMethod.stripePaymentMethodId) {
    return validationError('クレジットカードが登録されていません。先にカードを登録してください。');
  }

  // Stripe PaymentIntent を作成して決済実行
  const paymentIntent = await createPaymentIntent(
    amount,
    paymentMethod.stripeCustomerId,
    paymentMethod.stripePaymentMethodId,
    {
      userId: dbUser.id,
      type: 'charge',
      amount: amount.toString(),
    }
  );

  // 決済が成功した場合
  if (paymentIntent.status === 'succeeded') {
    // トランザクションでウォレット更新
    const result = await prisma.$transaction(async (tx) => {
      // ウォレットを取得または作成
      let wallet = await tx.wallet.findUnique({
        where: { userId: dbUser.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: dbUser.id,
            balance: 0,
          },
        });
      }

      // 残高を更新
      const updatedWallet = await tx.wallet.update({
        where: { userId: dbUser.id },
        data: { balance: wallet.balance + amount },
      });

      // 取引履歴を作成
      await tx.pointTransaction.create({
        data: {
          userId: dbUser.id,
          type: TransactionType.CHARGE,
          amount,
          method: 'credit',
          status: TransactionStatus.COMPLETED,
          description: `クレジットカードでチャージ（****${paymentMethod.cardLast4}）`,
        },
      });

      return updatedWallet;
    });

    return NextResponse.json({
      success: true,
      balance: result.balance,
      message: `${amount}ポイントをチャージしました`,
    });
  }

  // 決済が保留中（3Dセキュア認証が必要な場合など）
  if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
    return NextResponse.json({
      requiresAction: true,
      clientSecret: paymentIntent.client_secret,
      message: '追加の認証が必要です',
    });
  }

  // その他のステータス
  return validationError(`決済処理中にエラーが発生しました（status: ${paymentIntent.status}）`);
});
