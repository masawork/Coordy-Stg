import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 通知一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const userId = dbUser.id; // Prisma User ID を使用
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  const whereAND: Record<string, unknown>[] = [
    {
      OR: [
        { userId }, // 個別通知
        { userId: null }, // 全体通知
      ],
    },
    { isDismissed: false }, // 非表示にしていないもののみ
    {
      OR: [
        { expiresAt: null }, // 期限なし
        { expiresAt: { gt: new Date() } }, // 有効期限内
      ],
    },
  ];

  if (unreadOnly) {
    whereAND.push({ isRead: false });
  }

  const where: Record<string, unknown> = {
    AND: whereAND,
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: [
      { priority: 'desc' }, // 優先度順
      { createdAt: 'desc' }, // 新しい順
    ],
    take: 50, // 最大50件
  });

  return NextResponse.json(notifications);
});
