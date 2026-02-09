import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 通知一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: '通知の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

