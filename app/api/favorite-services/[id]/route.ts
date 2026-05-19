import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { UserRole } from '@prisma/client';
import { withErrorHandler, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const { id } = await params;

  const favorite = await prisma.favoriteService.findUnique({
    where: { id },
  });

  if (!favorite) {
    return notFoundError('いいね');
  }

  if (favorite.userId !== dbUser.id) {
    return forbiddenError('削除権限がありません');
  }

  await prisma.favoriteService.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
});
