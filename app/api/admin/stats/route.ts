import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (isErrorResponse(authResult)) return authResult;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, totalReservations, totalServices, monthlyTransactions] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.reservation.count(),
    prisma.service.count({ where: { isActive: true } }),
    prisma.pointTransaction.findMany({
      where: {
        type: 'CHARGE',
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      select: { amount: true },
    }),
  ]);

  const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return NextResponse.json({
    totalUsers,
    totalReservations,
    totalServices,
    monthlyRevenue,
  });
});
