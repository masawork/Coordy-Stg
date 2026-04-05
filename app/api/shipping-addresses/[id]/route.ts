/**
 * 配送先住所詳細API
 * PUT /api/shipping-addresses/[id] - 配送先編集
 * DELETE /api/shipping-addresses/[id] - 配送先削除
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import {
  validationError,
  forbiddenError,
  notFoundError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 配送先住所編集
 * isDefaultをtrueに変更する場合、他の住所をfalseに更新
 */
export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const { id } = await params;
  const body = await request.json();

  // 既存住所を確認
  const address = await prisma.shippingAddress.findUnique({
    where: { id },
  });

  if (!address) {
    return notFoundError('配送先住所');
  }

  // 権限確認
  if (address.userId !== dbUser.id) {
    return forbiddenError();
  }

  // バリデーション（全フィールド任意）
  const { fullName, phoneNumber, postalCode, prefecture, city, street, building, isDefault } = body;

  // isDefault=trueの場合、他の住所をfalseに更新
  if (isDefault === true) {
    await prisma.shippingAddress.updateMany({
      where: {
        userId: dbUser.id,
        id: { not: id }, // 自分以外
      },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.shippingAddress.update({
    where: { id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(postalCode !== undefined && { postalCode }),
      ...(prefecture !== undefined && { prefecture }),
      ...(city !== undefined && { city }),
      ...(street !== undefined && { street }),
      ...(building !== undefined && { building: building || null }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  return NextResponse.json({ address: updated });
});

/**
 * 配送先住所削除
 * デフォルト住所の場合、該当住所に紐付いた保留中注文がなければ削除可能
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const { id } = await params;

  // 既存住所を確認
  const address = await prisma.shippingAddress.findUnique({
    where: { id },
  });

  if (!address) {
    return notFoundError('配送先住所');
  }

  // 権限確認
  if (address.userId !== dbUser.id) {
    return forbiddenError();
  }

  // デフォルト住所かつ唯一のデフォルト住所の場合、保留中注文がないか確認
  if (address.isDefault) {
    const pendingOrders = await prisma.order.count({
      where: {
        userId: dbUser.id,
        shippingAddressId: id,
        status: 'PENDING',
      },
    });

    if (pendingOrders > 0) {
      return validationError('保留中注文が存在するため、削除できません');
    }
  }

  await prisma.shippingAddress.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
});
