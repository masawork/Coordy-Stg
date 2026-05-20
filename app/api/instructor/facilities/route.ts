import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const prefecture = searchParams.get('prefecture');
  const date = searchParams.get('date');

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return validationError('日付はYYYY-MM-DD形式で指定してください');
  }

  const where: any = { isActive: true };
  if (prefecture) where.prefecture = prefecture;

  const facilities = await prisma.facility.findMany({
    where,
    include: {
      slots: {
        where: {
          status: 'AVAILABLE',
          ...(date ? { date: new Date(date) } : { date: { gte: new Date() } }),
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 50,
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(facilities);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { dbUser } = authResult;
  const body = await request.json();
  const { slotId, serviceId } = body;

  if (!slotId) return validationError('スロットIDを指定してください');

  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return notFoundError('サービス');
  }

  const slot = await prisma.facilitySlot.findUnique({
    where: { id: slotId },
    include: { facility: true },
  });

  if (!slot) return notFoundError('スロット');
  if (slot.status !== 'AVAILABLE') return validationError('このスロットは既に予約されています');

  const updated = await prisma.facilitySlot.updateMany({
    where: { id: slotId, status: 'AVAILABLE' },
    data: {
      status: 'HELD',
      bookedBy: dbUser.id,
      serviceId: serviceId || null,
    },
  });

  if (updated.count === 0) {
    return validationError('このスロットは既に予約されています');
  }

  const updatedSlot = await prisma.facilitySlot.findUnique({
    where: { id: slotId },
    include: { facility: true },
  });

  return NextResponse.json(updatedSlot, { status: 201 });
});
