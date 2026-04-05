import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * カート取得
 */
export const GET = withErrorHandler(async () => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  let cart = await prisma.cart.findUnique({
    where: { userId: dbUser.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              instructor: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: dbUser.id },
      include: { items: { include: { product: { include: { images: { take: 1 }, instructor: { include: { user: { select: { name: true } } } } } } } } },
    });
  }

  // 合計計算
  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingTotal = cart.items.reduce((sum, item) => sum + item.product.shippingFee * item.quantity, 0);

  return NextResponse.json({
    ...cart,
    subtotal,
    shippingTotal,
    totalAmount: subtotal + shippingTotal,
  });
});

/**
 * カートにアイテム追加
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const { productId, quantity = 1 } = await request.json();
  if (!productId) return validationError('商品IDは必須です');
  if (quantity < 1) return validationError('数量は1以上にしてください');

  // 商品存在・在庫チェック
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive || product.status !== 'PUBLISHED') {
    return notFoundError('商品');
  }
  if (product.trackStock && product.stock < quantity) {
    return validationError('在庫が不足しています');
  }

  // カート取得 or 作成
  let cart = await prisma.cart.findUnique({ where: { userId: dbUser.id } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: dbUser.id } });
  }

  // 既存アイテム確認
  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (product.trackStock && product.stock < newQty) {
      return validationError('在庫が不足しています');
    }
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
});
