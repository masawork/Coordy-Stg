import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { UserRole } from '@prisma/client';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * カートアイテム数量更新
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) => {
  const { itemId } = await params;
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const { quantity } = await request.json();
  if (!quantity || quantity < 1) return validationError('数量は1以上にしてください');

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, product: true },
  });
  if (!item) return notFoundError('カートアイテム');
  if (item.cart.userId !== dbUser.id) return forbiddenError();

  if (item.product.trackStock && item.product.stock < quantity) {
    return validationError('在庫が不足しています');
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  return NextResponse.json({ success: true });
});

/**
 * カートアイテム削除
 */
export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) => {
  const { itemId } = await params;
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item) return notFoundError('カートアイテム');
  if (item.cart.userId !== dbUser.id) return forbiddenError();

  await prisma.cartItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
});
