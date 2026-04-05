/**
 * 管理者用注文詳細API
 * GET /api/admin/orders/[id] - 注文詳細取得
 * PATCH /api/admin/orders/[id] - 注文ステータス更新
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import {
  validationError,
  notFoundError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 注文詳細取得
 */
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      shippingAddress: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              price: true,
              images: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return notFoundError('注文');
  }

  return NextResponse.json({ order });
});

/**
 * 注文ステータス更新
 * ボディ: { status: OrderStatus, trackingNumber?: string }
 * 
 * ステータス遷移:
 *   PENDING → CONFIRMED, CANCELLED
 *   CONFIRMED → PROCESSING, CANCELLED
 *   PROCESSING → SHIPPED, CANCELLED
 *   SHIPPED → DELIVERED
 *   DELIVERED → (終了)
 *   CANCELLED → (終了)
 *   REFUNDED → (終了)
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;
  const body = await request.json();
  const { status, trackingNumber } = body;

  // ステータスの必須確認
  if (!status) {
    return validationError('ステータスは必須です');
  }

  // 既存注文を取得
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return notFoundError('注文');
  }

  // ステータス遷移の妥当性チェック
  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
    REFUNDED: [],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    return validationError(
      `注文ステータスが無効です。現在のステータス「${order.status}」から「${status}」への遷移はできません`
    );
  }

  // タイムスタンプを設定
  const updateData: Record<string, unknown> = { status };

  if (status === 'CONFIRMED') {
    updateData.confirmedAt = new Date();
  } else if (status === 'SHIPPED') {
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      shippingAddress: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              price: true,
              images: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ order: updated });
});
