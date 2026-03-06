import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { setDefaultPaymentMethod } from '@/lib/stripe/helpers';
import { withErrorHandler, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * デフォルトカードを設定
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const { id } = await params;

  // カード情報を取得
  const paymentMethod = await prisma.paymentMethod.findUnique({
    where: { id },
  });

  if (!paymentMethod) {
    return notFoundError('カード');
  }

  if (paymentMethod.userId !== dbUser.id) {
    return forbiddenError('このカードを設定する権限がありません');
  }

  // 既存のデフォルトを解除
  await prisma.paymentMethod.updateMany({
    where: {
      userId: dbUser.id,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });

  // 新しいデフォルトを設定
  const updatedMethod = await prisma.paymentMethod.update({
    where: { id },
    data: { isDefault: true },
  });

  // Stripeにもデフォルトを設定
  if (paymentMethod.stripeCustomerId && paymentMethod.stripePaymentMethodId) {
    await setDefaultPaymentMethod(
      paymentMethod.stripeCustomerId,
      paymentMethod.stripePaymentMethodId
    );
  }

  return NextResponse.json(updatedMethod);
});
