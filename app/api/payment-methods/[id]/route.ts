import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { detachPaymentMethod } from '@/lib/stripe/helpers';
import { withErrorHandler, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * カード削除
 */
export const DELETE = withErrorHandler(async (
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
    return forbiddenError('このカードを削除する権限がありません');
  }

  // Stripeから削除
  if (paymentMethod.stripePaymentMethodId) {
    await detachPaymentMethod(paymentMethod.stripePaymentMethodId);
  }

  // Prismaから削除
  await prisma.paymentMethod.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
});
