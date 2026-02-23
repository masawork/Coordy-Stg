import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 全引き出し申請を取得（管理者用）
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where = status ? { status: status as any } : {};

  const withdrawalRequests = await prisma.withdrawalRequest.findMany({
    where,
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      bankAccount: {
        select: {
          bankName: true,
          bankCode: true,
          branchName: true,
          branchCode: true,
          accountNumber: true,
          accountHolderName: true,
          accountType: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(withdrawalRequests);
});
