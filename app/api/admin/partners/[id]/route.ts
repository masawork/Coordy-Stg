/**
 * パートナー個別管理API（Admin専用）
 * GET /api/admin/partners/[id] - パートナー詳細
 * PUT /api/admin/partners/[id] - パートナー更新
 * DELETE /api/admin/partners/[id] - パートナー削除（論理削除）
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: '認証が必要です', status: 401 };
  }

  const dbUser = await prisma.user.findFirst({
    where: { authId: authUser.id },
  });

  if (!dbUser || dbUser.role !== UserRole.ADMIN) {
    return { error: '管理者権限が必要です', status: 403 };
  }

  return { user: dbUser };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      return NextResponse.json(
        { error: 'パートナーが見つかりません' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...partner,
      secretKey: undefined,
      webhookSecret: undefined,
      reservationCount: partner._count.externalReservations,
    });
  } catch (error: unknown) {
    console.error('Get partner error:', error);
    return NextResponse.json(
      { error: 'パートナーの取得に失敗しました' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'パートナーが見つかりません' },
        { status: 404 },
      );
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
  } catch (error: unknown) {
    console.error('Update partner error:', error);
    return NextResponse.json(
      { error: 'パートナーの更新に失敗しました' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // 論理削除
    await prisma.partner.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete partner error:', error);
    return NextResponse.json(
      { error: 'パートナーの削除に失敗しました' },
      { status: 500 },
    );
  }
}
