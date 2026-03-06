import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, validationError, conflictError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * お気に入りクリエイター一覧取得
 * GET /api/favorites
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

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
});

/**
 * お気に入りクリエイター追加
 * POST /api/favorites
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const body = await request.json();
  const { instructorId } = body;

  if (!instructorId) {
    return validationError('クリエイターIDが必要です');
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
    return conflictError('既にお気に入りに登録されています');
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
});
