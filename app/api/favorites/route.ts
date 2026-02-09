import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * お気に入りクリエイター一覧取得
 * GET /api/favorites
 */
export async function GET(request: NextRequest) {
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

    const favorites = await prisma.favoriteCreator.findMany({
      where: { userId: dbUser.id },
      include: {
        instructor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(favorites);
  } catch (error: any) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { error: 'お気に入り取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * お気に入りクリエイター追加
 * POST /api/favorites
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { instructorId } = body;

    if (!instructorId) {
      return NextResponse.json(
        { error: 'クリエイターIDが必要です' },
        { status: 400 }
      );
    }

    // 既に登録済みかチェック
    const existing = await prisma.favoriteCreator.findUnique({
      where: {
        userId_instructorId: {
          userId: dbUser.id,
          instructorId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: '既にお気に入りに登録されています', favorite: existing },
        { status: 409 }
      );
    }

    const favorite = await prisma.favoriteCreator.create({
      data: {
        userId: dbUser.id,
        instructorId,
      },
      include: {
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error: any) {
    console.error('Add favorite error:', error);
    return NextResponse.json(
      { error: 'お気に入り追加に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
