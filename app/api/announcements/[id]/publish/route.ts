import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * お知らせを公開（管理者のみ）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = authUser.id;

    // 管理者権限チェック
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '管理者のみお知らせを公開できます' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const announcement = await prisma.adminAnnouncement.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(announcement);
  } catch (error: any) {
    console.error('Publish announcement error:', error);
    return NextResponse.json(
      { error: 'お知らせの公開に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

