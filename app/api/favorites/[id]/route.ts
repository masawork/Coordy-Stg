import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * お気に入りクリエイター削除
 * DELETE /api/favorites/[id]
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const { id } = await params;

  // お気に入りを取得して所有者確認
  const favorite = await prisma.favoriteCreator.findUnique({
    where: { id },
  });

  if (!favorite) {
    return notFoundError('お気に入り');
  }

  if (favorite.userId !== dbUser.id) {
    return forbiddenError('削除権限がありません');
  }

  await prisma.favoriteCreator.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, message: 'お気に入りを削除しました' });
});
