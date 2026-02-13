/**
 * サービスAPI
 * GET /api/services - サービス一覧取得
 * POST /api/services - サービス作成（認証済みインストラクターのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { RecurrenceType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthInstructor } from '@/lib/api/auth';
import { validationError, withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/services
 * 任意のフィルタでサービス一覧を取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const instructorId = searchParams.get('instructorId') || undefined;
  const category = searchParams.get('category') || undefined;
  const isActiveParam = searchParams.get('isActive');
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';

  const where: any = {};
  if (instructorId) where.instructorId = instructorId;
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;

  const services = await prisma.service.findMany({
    where,
    include: {
      instructor: {
        include: { user: true },
      },
      schedules: true,
      campaigns: {
        where: { isActive: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(services);
});

/**
 * POST /api/services
 * サービスを作成（認証済みインストラクターのみ）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;

  const body = await request.json();
  const {
    title,
    description,
    category,
    deliveryType = 'remote',
    location,
    price,
    duration,
    isActive = true,
    // スケジュール関連フィールド
    recurrenceType = 'ONCE',
    availableDays = [],
    startTime,
    endTime,
    timezone = 'Asia/Tokyo',
    validFrom,
    validUntil,
    maxParticipants = 1,
  } = body;

  // 必須フィールドのバリデーション
  if (!title || !category || price === undefined || duration === undefined) {
    return validationError('必須項目を入力してください');
  }

  // 毎週などの繰り返しの場合は曜日と時間が必須
  if (recurrenceType !== 'ONCE' && (!availableDays.length || !startTime || !endTime)) {
    return validationError('繰り返しサービスの場合は曜日と開始・終了時間が必要です');
  }

  const service = await prisma.service.create({
    data: {
      instructorId: instructor.id,
      title,
      description: description || null,
      category,
      deliveryType: deliveryType || 'remote',
      location: location || null,
      price: Number(price),
      duration: Number(duration),
      isActive: Boolean(isActive),
      // スケジュール設定
      recurrenceType: recurrenceType as RecurrenceType,
      availableDays: availableDays || [],
      startTime: startTime || null,
      endTime: endTime || null,
      timezone,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxParticipants: Number(maxParticipants) || 1,
    },
    include: {
      instructor: { include: { user: true } },
      schedules: true,
      campaigns: true,
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return NextResponse.json(service, { status: 201 });
});
