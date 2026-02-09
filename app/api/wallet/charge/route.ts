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

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { amount, paymentMethodId } = await request.json();

    // バリデーション
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: '有効なチャージ額を入力してください' },
        { status: 400 }
      );
    }

    if (amount < 100) {
      return NextResponse.json(
        { error: '最低チャージ額は100円です' },
        { status: 400 }
      );
    }

    // Prisma User を取得
    const dbUser = await prisma.user.findFirst({
      where: { email: authUser.email! },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'クレジットカードが登録されていません。先にカードを登録してください。' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: '決済処理中にエラーが発生しました', status: paymentIntent.status },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Charge error:', error);

    // Stripeエラーの場合
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'カード決済に失敗しました: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'チャージに失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
