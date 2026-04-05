/**
 * 配送先住所API
 * GET /api/shipping-addresses - 配送先一覧取得
 * POST /api/shipping-addresses - 配送先作成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import {
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 配送先住所一覧取得
 * isDefaultで降順（デフォルト優先）、createdAtで降順
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  const addresses = await prisma.shippingAddress.findMany({
    where: { userId: dbUser.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ addresses });
});

/**
 * 配送先住所作成
 * isDefault=trueの場合、他の住所をfalseに更新
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const body = await request.json();

  // バリデーション
  const { fullName, phoneNumber, postalCode, prefecture, city, street, building, isDefault } = body;

  if (!fullName || !phoneNumber || !postalCode || !prefecture || !city || !street) {
    return validationError('必須項目が不足しています', {
      fullName: fullName ? '' : '必須',
      phoneNumber: phoneNumber ? '' : '必須',
      postalCode: postalCode ? '' : '必須',
      prefecture: prefecture ? '' : '必須',
      city: city ? '' : '必須',
      street: street ? '' : '必須',
    });
  }

  // isDefault=trueの場合、他の住所のisDefaultをfalseに
  if (isDefault === true) {
    await prisma.shippingAddress.updateMany({
      where: { userId: dbUser.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.shippingAddress.create({
    data: {
      userId: dbUser.id,
      fullName,
      phoneNumber,
      postalCode,
      prefecture,
      city,
      street,
      building: building || null,
      isDefault: isDefault === true,
    },
  });

  return NextResponse.json({ address }, { status: 201 });
});
