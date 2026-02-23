import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 通知一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const userId = user.id;
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  const where: any = {
    AND: [
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
    ],
  };

  if (unreadOnly) {
    where.AND.push({ isRead: false });
  }

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
