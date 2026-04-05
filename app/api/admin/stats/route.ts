/**
 * 管理者統計情報API
 * GET /api/admin/stats
 *
 * 管理者ダッシュボード用の統計情報を返す
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 統計情報取得
 */
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // 現在の月の開始日
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    totalServices,
    totalReservations,
    monthlyReservations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.service.count({ where: { isActive: true } }),
    prisma.reservation.count(),
    prisma.reservation.count({
      where: {
        createdAt: { gte: monthStart },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    }),
  ]);

  // 月間売上: 今月のCONFIRMED/COMPLETEDの予約の合計金額を計算
  const monthlyReservationsWithAmount = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: monthStart },
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      service: { select: { price: true } },
    },
  });

  const monthlyRevenue = monthlyReservationsWithAmount.reduce(
    (sum, r) => sum + (r.service.price * r.participants),
    0
  );

  return NextResponse.json({
    totalUsers,
    totalServices,
    totalReservations,
    monthlyReservations,
    monthlyRevenue,
  });
});
