import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * お知らせ一覧取得（ユーザー用）
 * 公開済みで有効期限内のものを取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
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
});

/**
 * お知らせ作成（講師・管理者用）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const userId = user.id;

  // ユーザー情報を取得
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser || (dbUser.role !== 'INSTRUCTOR' && dbUser.role !== 'ADMIN')) {
    return forbiddenError('講師または管理者のみお知らせを作成できます');
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
    return validationError('タイトルと内容は必須です');
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
});
