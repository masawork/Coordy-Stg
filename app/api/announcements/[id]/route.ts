import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * お知らせ詳細取得
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const announcement = await prisma.adminAnnouncement.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!announcement) {
    return notFoundError('お知らせ');
  }

  // 公開済みのみ返す（管理者・作成者以外）
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    // 管理者を email + role で検索
    const adminUser = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
        role: 'ADMIN',
      },
    });

    // 管理者なら下書きも見れる
    if (adminUser) {
      return NextResponse.json(announcement);
    }

    // 作成者を email で検索して確認
    const authorUser = await prisma.user.findFirst({
      where: { email: authUser.email! },
    });
    if (authorUser && announcement.authorId === authorUser.id) {
      return NextResponse.json(announcement);
    }
  }

  // それ以外は公開済みのみ
  if (!announcement.isPublished) {
    return notFoundError('お知らせ');
  }

  return NextResponse.json(announcement);
});

/**
 * お知らせ更新（作成者・管理者）
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const { id } = await params;
  const userId = authUser.id;

  // お知らせ取得
  const announcement = await prisma.adminAnnouncement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return notFoundError('お知らせ');
  }

  // ユーザー取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // 権限チェック（管理者または作成者のみ）
  if (user?.role !== 'ADMIN' && announcement.authorId !== userId) {
    return forbiddenError('このお知らせを編集する権限がありません');
  }

  const updates = await request.json();

  const updated = await prisma.adminAnnouncement.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json(updated);
});

/**
 * お知らせ削除（作成者・管理者）
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const { id } = await params;
  const userId = authUser.id;

  // お知らせ取得
  const announcement = await prisma.adminAnnouncement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return notFoundError('お知らせ');
  }

  // ユーザー取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // 権限チェック（管理者または作成者のみ）
  if (user?.role !== 'ADMIN' && announcement.authorId !== userId) {
    return forbiddenError('このお知らせを削除する権限がありません');
  }

  await prisma.adminAnnouncement.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
});
