import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, getAuthInstructor } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 注文詳細取得
 */
export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const order = await prisma.order.findUnique({
    where: { id },
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
      },
      shippingAddress: true,
    },
  });

  if (!order) return notFoundError('注文');

  // 注文者本人、またはインストラクター（自分の商品が含まれる注文）の場合にアクセスを許可
  const isOwner = order.userId === dbUser.id;
  if (!isOwner) {
    // インストラクターの場合、自分の商品が含まれるか確認
    const instructor = await prisma.instructor.findUnique({
      where: { userId: dbUser.id },
    });
    const hasOwnProduct = instructor && order.items.some(
      (item) => item.product.instructorId === instructor.id
    );
    if (!hasOwnProduct) return forbiddenError();
  }

  return NextResponse.json(order);
});

/**
 * PATCH /api/orders/[id]
 * インストラクターが自分の商品を含む注文の配送ステータスを更新
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) return authResult;
  const { instructor } = authResult;

  const body = await request.json();
  const { status, trackingNumber } = body;

  if (!status) {
    return validationError('ステータスは必須です');
  }

  // 注文を取得
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!order) return notFoundError('注文');

  // 自分の商品が含まれる注文のみ更新可能
  const hasOwnProduct = order.items.some(
    (item) => item.product.instructorId === instructor.id
  );
  if (!hasOwnProduct) return forbiddenError();

  // インストラクターが操作可能なステータス遷移
  const validTransitions: Record<string, string[]> = {
    CONFIRMED: ['PROCESSING'],
    PROCESSING: ['SHIPPED'],
    SHIPPED: ['DELIVERED'],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    return validationError(
      `現在のステータス「${order.status}」から「${status}」への変更はできません`
    );
  }

  // タイムスタンプを設定
  const updateData: Record<string, unknown> = { status };

  if (status === 'SHIPPED') {
    updateData.shippedAt = new Date();
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
  } else if (status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
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
  });

  return NextResponse.json({ order: updated });
});
