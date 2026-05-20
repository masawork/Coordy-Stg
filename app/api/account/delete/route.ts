import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const body = await request.json();
  const { confirmation } = body;

  if (confirmation !== 'DELETE') {
    return validationError('退会するには confirmation に "DELETE" を指定してください');
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: { authId: authUser.id, deletedAt: null },
      include: {
        wallet: true,
        reservations: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        },
        withdrawalRequests: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (users.length === 0) {
      return { error: '該当するアカウントが見つかりません' };
    }

    const pendingReservations = users.flatMap(u => u.reservations);
    if (pendingReservations.length > 0) {
      return {
        error: `未完了の予約が${pendingReservations.length}件あります。すべてキャンセルまたは完了してから退会してください。`,
      };
    }

    const pendingWithdrawals = users.flatMap(u => u.withdrawalRequests);
    if (pendingWithdrawals.length > 0) {
      return { error: '処理中の出金申請があります。完了後に退会してください。' };
    }

    const totalBalance = users.reduce((sum, u) => sum + (u.wallet?.balance || 0), 0);
    if (totalBalance > 0) {
      return {
        error: `ウォレットに${totalBalance.toLocaleString()}pt残っています。出金または使用してから退会してください。`,
      };
    }

    for (const u of users) {
      await tx.user.update({
        where: { id: u.id },
        data: { deletedAt: now },
      });
    }

    return { success: true };
  });

  if ('error' in result) {
    return validationError(result.error);
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true, message: '退会が完了しました' });
});
