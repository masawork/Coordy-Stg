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

  const block = await prisma.blockedInstructor.findUnique({
    where: { id },
  });

  if (!block) {
    return notFoundError('ブロック');
  }

  if (block.userId !== dbUser.id) {
    return forbiddenError('削除権限がありません');
  }

  await prisma.blockedInstructor.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
});
