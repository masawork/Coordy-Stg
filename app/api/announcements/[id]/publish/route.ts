import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * お知らせを公開（管理者のみ）
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  const announcement = await prisma.adminAnnouncement.update({
    where: { id },
    data: {
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  return NextResponse.json(announcement);
});
