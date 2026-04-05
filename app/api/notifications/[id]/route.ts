import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 通知を既読にする
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const { id } = await params;
  const userId = dbUser.id; // Prisma User ID

  // 通知を取得
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return notFoundError('通知');
  }

  // 権限チェック（全体通知 or 自分宛て）
  if (notification.userId && notification.userId !== userId) {
    return forbiddenError('この通知にアクセスする権限がありません');
  }

  // 既読にする
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return NextResponse.json(updated);
});

/**
 * 通知を非表示にする
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const { id } = await params;
  const userId = dbUser.id; // Prisma User ID

  // 通知を取得
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return notFoundError('通知');
  }

  // 権限チェック
  if (notification.userId && notification.userId !== userId) {
    return forbiddenError('この通知にアクセスする権限がありません');
  }

  // 非表示にする
  const updated = await prisma.notification.update({
    where: { id },
    data: { isDismissed: true },
  });

  return NextResponse.json(updated);
});
