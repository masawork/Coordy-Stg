import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateStripeCustomer, attachPaymentMethod } from '@/lib/stripe/helpers';
import { withErrorHandler, unauthorizedError, notFoundError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * カード一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // Prisma User を email で検索（ロールに関係なく）
  const dbUser = await prisma.user.findFirst({
    where: {
      email: authUser.email!,
    },
  });

  if (!dbUser) {
    // ユーザーが見つからない場合は空配列を返す（エラーではない）
    return NextResponse.json([]);
  }

  // Prismaから登録済みカード情報を取得
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(paymentMethods);
});

/**
 * カード登録
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // Prisma User を email で検索（ロールに関係なく）
  const dbUser = await prisma.user.findFirst({
    where: {
      email: authUser.email!,
    },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  const { paymentMethodId } = await request.json();

  if (!paymentMethodId) {
    return validationError('paymentMethodId が必要です');
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
});
