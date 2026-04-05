/**
 * パートナー個別管理API（Admin専用）
 * GET /api/admin/partners/[id] - パートナー詳細
 * PUT /api/admin/partners/[id] - パートナー更新
 * DELETE /api/admin/partners/[id] - パートナー削除（論理削除）
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      externalReservations: {
        include: {
          reservation: {
            include: {
              service: { select: { title: true } },
              guestUser: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: {
        select: { externalReservations: true },
      },
    },
  });

  if (!partner) {
    return notFoundError('パートナー');
  }

  return NextResponse.json({
    ...partner,
    secretKey: undefined,
    webhookSecret: undefined,
    reservationCount: partner._count.externalReservations,
  });
});

export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) {
    return notFoundError('パートナー');
  }

  const {
    name,
    description,
    websiteUrl,
    logoUrl,
    webhookUrl,
    paymentMode,
    allowGuest,
    requirePhone,
    instructorIds,
    serviceIds,
    commissionRate,
    isActive,
  } = body;

  const partner = await prisma.partner.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(websiteUrl !== undefined && { websiteUrl }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(webhookUrl !== undefined && { webhookUrl }),
      ...(paymentMode !== undefined && { paymentMode }),
      ...(allowGuest !== undefined && { allowGuest }),
      ...(requirePhone !== undefined && { requirePhone }),
      ...(instructorIds !== undefined && { instructorIds }),
      ...(serviceIds !== undefined && { serviceIds }),
      ...(commissionRate !== undefined && {
        commissionRate: Number(commissionRate),
      }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({
    ...partner,
    secretKey: undefined,
    webhookSecret: undefined,
  });
});

export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;

  // 論理削除
  await prisma.partner.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
});
