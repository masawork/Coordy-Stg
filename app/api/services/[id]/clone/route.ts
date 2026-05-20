import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';
import { RecurrenceType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { instructor } = authResult;
  const { id } = await params;

  const originalService = await prisma.service.findUnique({
    where: { id },
    include: { instructor: true },
  });

  if (!originalService) {
    return notFoundError('サービス');
  }

  if (originalService.instructorId !== instructor.id) {
    return forbiddenError('このサービスを複製する権限がありません');
  }

  const body = await request.json();
  const {
    title,
    description,
    recurrenceType,
    availableDays,
    startTime,
    endTime,
    validFrom,
    validUntil,
    maxParticipants,
    price,
    duration,
    isActive = true,
  } = body;

  const newServiceData = {
    instructorId: originalService.instructorId,
    title: title || `${originalService.title} (コピー)`,
    description: description !== undefined ? description : originalService.description,
    category: originalService.category,
    price: price !== undefined ? Number(price) : originalService.price,
    duration: duration !== undefined ? Number(duration) : originalService.duration,
    isActive: Boolean(isActive),
    recurrenceType: (recurrenceType || originalService.recurrenceType) as RecurrenceType,
    availableDays: availableDays || originalService.availableDays || [],
    startTime: startTime !== undefined ? startTime : originalService.startTime,
    endTime: endTime !== undefined ? endTime : originalService.endTime,
    timezone: originalService.timezone,
    validFrom: validFrom ? new Date(validFrom) : null,
    validUntil: validUntil ? new Date(validUntil) : null,
    maxParticipants: maxParticipants !== undefined
      ? Number(maxParticipants)
      : originalService.maxParticipants,
  };

  if (
    newServiceData.recurrenceType !== 'ONCE' &&
    (!newServiceData.availableDays?.length || !newServiceData.startTime || !newServiceData.endTime)
  ) {
    return validationError('繰り返しサービスの場合は曜日と開始・終了時間が必要です');
  }

  const clonedService = await prisma.service.create({
    data: newServiceData,
    include: {
      instructor: { include: { user: true } },
      schedules: true,
      campaigns: true,
    },
  });

  return NextResponse.json(
    {
      ...clonedService,
      message: 'サービスを複製しました',
      originalServiceId: id,
    },
    { status: 201 }
  );
});
