import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TransactionType, TransactionStatus, UserRole } from '@prisma/client';
import { getAuthUser } from '@/lib/api/auth';
import { createPaymentIntent } from '@/lib/stripe/helpers';
import {
  withErrorHandler,
  validationError,
  notFoundError,
  insufficientBalanceError,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 注文番号を生成（ORD-YYYYMMDD-XXXX）
 */
function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

/**
 * 注文一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where: Record<string, unknown> = { userId: dbUser.id };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * 注文作成（カートから注文）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const body = await request.json();
  const { paymentMethod, paymentMethodId, shippingAddressId, notes } = body;

  if (!paymentMethod || !['points', 'credit'].includes(paymentMethod)) {
    return validationError('決済方法は "points" または "credit" を指定してください');
  }
  if (!shippingAddressId) {
    return validationError('配送先住所を選択してください');
  }

  // 配送先の存在確認
  const shippingAddress = await prisma.shippingAddress.findUnique({
    where: { id: shippingAddressId },
  });
  if (!shippingAddress || shippingAddress.userId !== dbUser.id) {
    return notFoundError('配送先住所');
  }

  // カート取得
  const cart = await prisma.cart.findUnique({
    where: { userId: dbUser.id },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    return validationError('カートが空です');
  }

  // 商品の有効性・在庫チェック
  for (const item of cart.items) {
    if (!item.product.isActive || item.product.status !== 'PUBLISHED') {
      return validationError(`「${item.product.name}」は現在販売されていません`);
    }
    if (item.product.trackStock && item.product.stock < item.quantity) {
      return validationError(`「${item.product.name}」の在庫が不足しています（残り${item.product.stock}個）`);
    }
  }

  // 金額計算
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  );
  const shippingCost = cart.items.reduce(
    (sum, item) => sum + item.product.shippingFee * item.quantity, 0
  );
  const totalAmount = subtotal + shippingCost;

  // ポイント決済の場合、残高チェック
  if (paymentMethod === 'points') {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: dbUser.id },
    });
    if (!wallet || wallet.balance < totalAmount) {
      return insufficientBalanceError(totalAmount, wallet?.balance || 0);
    }
  }

  // クレジット決済の場合、Stripe PaymentIntentを作成
  if (paymentMethod === 'credit') {
    // 同じauthIdを持つ全ロールのユーザーIDを取得（カードは別ロールに紐づいている場合がある）
    const sameAuthUsers = dbUser.authId
      ? await prisma.user.findMany({
          where: { authId: dbUser.authId },
          select: { id: true },
        })
      : [{ id: dbUser.id }];
    const userIds = sameAuthUsers.map((u) => u.id);

    // 決済に使用するカードを取得
    let dbPaymentMethod;
    if (paymentMethodId) {
      dbPaymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId: { in: userIds } },
      });
    } else {
      dbPaymentMethod = await prisma.paymentMethod.findFirst({
        where: { userId: { in: userIds }, isDefault: true },
      });
    }

    if (!dbPaymentMethod || !dbPaymentMethod.stripeCustomerId || !dbPaymentMethod.stripePaymentMethodId) {
      return validationError('クレジットカードが登録されていません。先にカードを登録してください。');
    }

    // Stripe PaymentIntentを作成
    const paymentIntent = await createPaymentIntent(
      totalAmount,
      dbPaymentMethod.stripeCustomerId,
      dbPaymentMethod.stripePaymentMethodId,
      {
        userId: dbUser.id,
        type: 'order',
        amount: totalAmount.toString(),
      }
    );

    // 3Dセキュア等の追加認証が必要な場合
    if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
      return NextResponse.json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: '追加の認証が必要です',
      });
    }

    // 決済が成功しなかった場合
    if (paymentIntent.status !== 'succeeded') {
      return validationError(`決済処理中にエラーが発生しました（status: ${paymentIntent.status}）`);
    }

    // 決済成功 - 注文を作成
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: dbUser.id,
          orderNumber: generateOrderNumber(),
          subtotal,
          shippingCost,
          totalAmount,
          paymentMethod,
          stripePaymentIntentId: paymentIntent.id,
          shippingAddressId,
          notes: notes || null,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product.price,
          subtotal: item.product.price * item.quantity,
        })),
      });

      for (const item of cart.items) {
        if (item.product.trackStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
              },
            },
          },
          shippingAddress: true,
        },
      });
    });

    return NextResponse.json(order, { status: 201 });
  }

  // ポイント決済の場合
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: dbUser.id,
        orderNumber: generateOrderNumber(),
        subtotal,
        shippingCost,
        totalAmount,
        paymentMethod,
        shippingAddressId,
        notes: notes || null,
        status: 'PENDING',
      },
    });

    await tx.orderItem.createMany({
      data: cart.items.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: item.product.price * item.quantity,
      })),
    });

    for (const item of cart.items) {
      if (item.product.trackStock) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // ポイント決済
    await tx.wallet.update({
      where: { userId: dbUser.id },
      data: { balance: { decrement: totalAmount } },
    });

    await tx.pointTransaction.create({
      data: {
        userId: dbUser.id,
        type: TransactionType.USE,
        amount: -totalAmount,
        status: TransactionStatus.COMPLETED,
        method: 'points',
        description: `注文 ${newOrder.orderNumber} の決済`,
        orderId: newOrder.id,
      },
    });

    // ポイント決済は即CONFIRMED
    await tx.order.update({
      where: { id: newOrder.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    // カートを空にする
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return tx.order.findUnique({
      where: { id: newOrder.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
            },
          },
        },
        shippingAddress: true,
      },
    });
  });

  return NextResponse.json(order, { status: 201 });
});
