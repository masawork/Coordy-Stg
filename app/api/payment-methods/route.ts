import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateStripeCustomer, attachPaymentMethod } from '@/lib/stripe/helpers';

export const dynamic = 'force-dynamic';

/**
 * カード一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.log('Payment methods GET: 認証エラー', authError);
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    console.log('Payment methods GET: authUser.email =', authUser.email);

    // Prisma User を email で検索（ロールに関係なく）
    const dbUser = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
      },
    });

    if (!dbUser) {
      console.log('Payment methods GET: Prisma Userが見つかりません');
      // ユーザーが見つからない場合は空配列を返す（エラーではない）
      return NextResponse.json([]);
    }

    console.log('Payment methods GET: dbUser.id =', dbUser.id);

    // Prismaから登録済みカード情報を取得
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(paymentMethods);
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    return NextResponse.json(
      { error: 'カード情報の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * カード登録
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.log('Payment methods POST: 認証エラー', authError);
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    console.log('Payment methods POST: authUser.email =', authUser.email);

    // Prisma User を email で検索（ロールに関係なく）
    const dbUser = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
      },
    });

    if (!dbUser) {
      console.log('Payment methods POST: Prisma Userが見つかりません');
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    console.log('Payment methods POST: dbUser.id =', dbUser.id);

    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'paymentMethodId が必要です' },
        { status: 400 }
      );
    }

    // Stripe Customerを取得または作成
    const customer = await getOrCreateStripeCustomer(
      dbUser.id,
      authUser.email!,
      dbUser.name
    );

    // Payment Methodを顧客に紐付け
    const stripePaymentMethod = await attachPaymentMethod(customer.id, paymentMethodId);

    // Prismaに保存
    const existingMethods = await prisma.paymentMethod.findMany({
      where: { userId: dbUser.id },
    });

    const isFirstCard = existingMethods.length === 0;

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: dbUser.id,
        type: 'card',
        stripeCustomerId: customer.id,
        stripePaymentMethodId: stripePaymentMethod.id,
        cardBrand: stripePaymentMethod.card?.brand || null,
        cardLast4: stripePaymentMethod.card?.last4 || null,
        cardExpMonth: stripePaymentMethod.card?.exp_month || null,
        cardExpYear: stripePaymentMethod.card?.exp_year || null,
        isDefault: isFirstCard, // 最初のカードはデフォルトに
      },
    });

    return NextResponse.json(paymentMethod, { status: 201 });
  } catch (error: any) {
    console.error('Create payment method error:', error);
    return NextResponse.json(
      { error: 'カードの登録に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

