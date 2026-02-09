import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * お気に入りクリエイター削除
 * DELETE /api/favorites/[id]
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

    // Supabase Auth IDからPrisma User IDを取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーデータが見つかりません' },
        { status: 400 }
      );
    }

    const { id } = await params;

    // お気に入りを取得して所有者確認
    const favorite = await prisma.favoriteCreator.findUnique({
      where: { id },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: 'お気に入りが見つかりません' },
        { status: 404 }
      );
    }

    if (favorite.userId !== dbUser.id) {
      return NextResponse.json(
        { error: '削除権限がありません' },
        { status: 403 }
      );
    }

    await prisma.favoriteCreator.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'お気に入りを削除しました' });
  } catch (error: any) {
    console.error('Delete favorite error:', error);
    return NextResponse.json(
      { error: 'お気に入り削除に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
