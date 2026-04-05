import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * すべての通知を既読にする
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const userId = dbUser.id; // Prisma User ID

  // すべての未読通知を既読にする
  const result = await prisma.notification.updateMany({
    where: {
      OR: [
        { userId },
        { userId: null },
      ],
      isRead: false,
      isDismissed: false,
    },
    data: {
      isRead: true,
    },
  });

  return NextResponse.json({
    success: true,
    count: result.count,
    message: `${result.count}件の通知を既読にしました`,
  });
});
