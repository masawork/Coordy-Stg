import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * Stripe Webhook ハンドラー
 * 
 * 処理するイベント:
 * - payment_intent.succeeded: 決済成功
 * - payment_method.attached: カード登録
 * - customer.created: 顧客作成
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Webhook署名を検証（セキュリティ必須）
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('✅ Webhookイベント受信:', event.type);
  } catch (error: any) {
    console.error('❌ Webhook検証エラー:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    // イベントタイプ別に処理
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_method.attached':
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodAttached(paymentMethod);
        break;

      case 'customer.created':
        const customer = event.data.object as Stripe.Customer;
        console.log('👤 顧客作成:', customer.id);
        break;

      default:
        console.log('未処理のイベント:', event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook処理エラー:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 決済成功時の処理
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 決済成功:', paymentIntent.id);
  console.log('   金額:', paymentIntent.amount / 100, '円');
  console.log('   顧客:', paymentIntent.customer);

  // ここでポイントチャージ処理を実装
  // 例: PointTransactionを作成、Walletを更新
  // const userId = paymentIntent.metadata.userId;
  // if (userId) {
  //   const amount = paymentIntent.amount / 100;
  //   await prisma.pointTransaction.create({
  //     data: {
  //       userId,
  //       type: 'CHARGE',
  //       amount,
  //       method: 'credit',
  //       status: 'COMPLETED',
  //       description: `Stripeチャージ: ${paymentIntent.id}`,
  //     },
  //   });
  //   await prisma.wallet.update({
  //     where: { userId },
  //     data: { balance: { increment: amount } },
  //   });
  // }
}

/**
 * カード登録時の処理
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log('💳 カード登録:', paymentMethod.id);
  console.log('   ブランド:', paymentMethod.card?.brand);
  console.log('   下4桁:', paymentMethod.card?.last4);
  console.log('   顧客:', paymentMethod.customer);

  // ここでPaymentMethodテーブルに保存
  // const customerId = paymentMethod.customer as string;
  // if (customerId) {
  //   // customerIdからuserIdを取得する必要がある
  //   // PaymentMethodテーブルにレコードを作成
  // }
}

