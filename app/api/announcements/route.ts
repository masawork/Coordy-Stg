import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * お知らせ一覧取得（ユーザー用）
 * 公開済みで有効期限内のものを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'all'; // all, users, instructors
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {
      isPublished: true,
      publishedAt: {
        lte: new Date(),
      },
      OR: [
        { expiresAt: null }, // 期限なし
        { expiresAt: { gt: new Date() } }, // 有効期限内
      ],
    };

    // ターゲット絞り込み
    if (target !== 'all') {
      where.target = target;
    }

    const announcements = await prisma.adminAnnouncement.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' }, // 優先度順
        { publishedAt: 'desc' }, // 新しい順
      ],
      take: limit,
    });

    return NextResponse.json(announcements);
  } catch (error: any) {
    console.error('Get announcements error:', error);
    return NextResponse.json(
      { error: 'お知らせの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * お知らせ作成（講師・管理者用）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = user.id;

    // ユーザー情報を取得
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser || (dbUser.role !== 'INSTRUCTOR' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: '講師または管理者のみお知らせを作成できます' },
        { status: 403 }
      );
    }

    const {
      target,
      priority,
      title,
      content,
      expiresAt,
    } = await request.json();

    // バリデーション
    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です' },
        { status: 400 }
      );
    }

    // 講師は講師向けのお知らせのみ作成可能
    let finalTarget = target;
    if (user.role === 'INSTRUCTOR') {
      finalTarget = 'instructors';
    }

    const announcement = await prisma.adminAnnouncement.create({
      data: {
        authorId: userId,
        target: finalTarget || 'all',
        priority: priority || 'medium',
        title,
        content,
        isPublished: dbUser.role === 'ADMIN', // 管理者は即公開、講師は下書き
        publishedAt: dbUser.role === 'ADMIN' ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    console.error('Create announcement error:', error);
    return NextResponse.json(
      { error: 'お知らせの作成に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

