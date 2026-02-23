import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * すべての通知を既読にする
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const userId = user.id;

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
