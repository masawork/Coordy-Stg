import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 通知を既読にする
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const userId = user.id;

    // 通知を取得
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: '通知が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック（全体通知 or 自分宛て）
    if (notification.userId && notification.userId !== userId) {
      return NextResponse.json(
        { error: 'この通知にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    // 既読にする
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json(
      { error: '通知の更新に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 通知を非表示にする
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const userId = user.id;

    // 通知を取得
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: '通知が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック
    if (notification.userId && notification.userId !== userId) {
      return NextResponse.json(
        { error: 'この通知にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    // 非表示にする
    const updated = await prisma.notification.update({
      where: { id },
      data: { isDismissed: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Dismiss notification error:', error);
    return NextResponse.json(
      { error: '通知の非表示に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

