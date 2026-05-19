import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TransactionType, TransactionStatus, UserRole } from '@prisma/client';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 注文キャンセル
 */
export const POST = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });

  if (!order) return notFoundError('注文');
  if (order.userId !== dbUser.id) return forbiddenError();

  // キャンセル可能なステータスか確認
  const cancellableStatuses = ['PENDING', 'CONFIRMED'];
  if (!cancellableStatuses.includes(order.status)) {
    return validationError('この注文はキャンセルできません');
  }

  await prisma.$transaction(async (tx) => {
    // 注文ステータスを更新
    await tx.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // 在庫を戻す
    for (const item of order.items) {
      if (item.product.trackStock) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    // ポイント決済だった場合、ポイントを返還
    if (order.paymentMethod === 'points') {
      await tx.wallet.update({
        where: { userId: dbUser.id },
        data: { balance: { increment: order.totalAmount } },
      });

      await tx.pointTransaction.create({
        data: {
          userId: dbUser.id,
          type: TransactionType.CHARGE,
          amount: order.totalAmount,
          status: TransactionStatus.COMPLETED,
          method: 'refund',
          description: `注文 ${order.orderNumber} のキャンセル返金`,
          orderId: order.id,
        },
      });
    }
  });

  return NextResponse.json({ success: true });
});
