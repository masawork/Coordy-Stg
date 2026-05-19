/**
 * クレジット使用制限設定API
 * PUT /api/admin/users/credit-limit
 * GET /api/admin/users/credit-limit?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, validationError, notFoundError } from '@/lib/api/errors';
import { getMonthlyCreditUsage } from '@/lib/api/credit-limit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return validationError('userIdは必須です');
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  const monthlyUsage = await getMonthlyCreditUsage(userId);

  return NextResponse.json({
    userId,
    creditLimit: wallet?.creditLimit ?? null,
    monthlyUsage,
    balance: wallet?.balance ?? 0,
  });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { userId, creditLimit } = await request.json();

  if (!userId) {
    return validationError('userIdは必須です');
  }

  if (creditLimit !== null && (typeof creditLimit !== 'number' || creditLimit < 0)) {
    return validationError('クレジット使用上限は0以上の数値、またはnull（制限なし）を指定してください');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return notFoundError('ユーザー');
  }

  let wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        creditLimit: creditLimit,
      },
    });
  } else {
    wallet = await prisma.wallet.update({
      where: { userId },
      data: { creditLimit: creditLimit },
    });
  }

  return NextResponse.json({
    success: true,
    creditLimit: wallet.creditLimit,
    message: creditLimit === null
      ? 'クレジット使用制限を解除しました'
      : `クレジット使用上限を¥${creditLimit.toLocaleString()}/月に設定しました`,
  });
});
