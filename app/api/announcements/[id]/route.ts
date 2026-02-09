import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * お知らせ詳細取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(announcement);
  } catch (error: any) {
    console.error('Get announcement error:', error);
    return NextResponse.json(
      { error: 'お知らせの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * お知らせ更新（作成者・管理者）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const userId = authUser.id;

    // お知らせ取得
    const announcement = await prisma.adminAnnouncement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    // ユーザー取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // 権限チェック（管理者または作成者のみ）
    if (user?.role !== 'ADMIN' && announcement.authorId !== userId) {
      return NextResponse.json(
        { error: 'このお知らせを編集する権限がありません' },
        { status: 403 }
      );
    }

    const updates = await request.json();

    const updated = await prisma.adminAnnouncement.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update announcement error:', error);
    return NextResponse.json(
      { error: 'お知らせの更新に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * お知らせ削除（作成者・管理者）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const userId = authUser.id;

    // お知らせ取得
    const announcement = await prisma.adminAnnouncement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }

    // ユーザー取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // 権限チェック（管理者または作成者のみ）
    if (user?.role !== 'ADMIN' && announcement.authorId !== userId) {
      return NextResponse.json(
        { error: 'このお知らせを削除する権限がありません' },
        { status: 403 }
      );
    }

    await prisma.adminAnnouncement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete announcement error:', error);
    return NextResponse.json(
      { error: 'お知らせの削除に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

