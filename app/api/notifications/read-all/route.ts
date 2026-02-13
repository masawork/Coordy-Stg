import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * すべての通知を既読にする
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = user.id;

    // すべての未読通知を既読にする
    const result = await prisma.notification.updateMany({
      where: {
        OR: [
          { userId },
          { userId: null },
        ],
        isRead: false,
        isDismissed: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count}件の通知を既読にしました`,
    });
  } catch (error: any) {
    console.error('Mark all notifications as read error:', error);
    return NextResponse.json(
      { error: 'すべての通知を既読にできませんでした', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

