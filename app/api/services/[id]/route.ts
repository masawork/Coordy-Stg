/**
 * サービス詳細API
 * GET /api/services/[id] - サービス詳細取得
 * PUT /api/services/[id] - サービス更新（認証済みインストラクターのみ）
 * DELETE /api/services/[id] - サービス削除（認証済みインストラクターのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { RecurrenceType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/services/[id]
 * サービス詳細を取得
 */
export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      instructor: {
        include: { user: true },
      },
      schedules: {
        orderBy: { date: 'asc' },
      },
      campaigns: {
        where: { isActive: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!service) {
    return notFoundError('サービス');
  }

  return NextResponse.json(service);
});

/**
 * PUT /api/services/[id]
 * サービスを更新（認証済みインストラクターのみ）
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { authUser } = authResult;

  // 既存のサービスを取得
  const existingService = await prisma.service.findUnique({
    where: { id },
    include: { instructor: { include: { user: true } } },
  });

  if (!existingService) {
    return notFoundError('サービス');
  }

  // 所有者チェック
  const instructorUser = existingService.instructor.user;
  if (instructorUser.authId !== authUser.id && instructorUser.id !== authUser.id) {
    return forbiddenError('このサービスを更新する権限がありません');
  }

  const body = await request.json();

  // 許可されたフィールドリスト（スケジュール関連を追加）
  const allowedFields = [
    'title',
    'description',
    'category',
    'deliveryType',
    'location',
    'price',
    'duration',
    'isActive',
    'recurrenceType',
    'availableDays',
    'startTime',
    'endTime',
    'timezone',
    'validFrom',
    'validUntil',
    'maxParticipants',
  ];

  const updateData: any = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      switch (key) {
        case 'price':
        case 'duration':
        case 'maxParticipants':
          updateData[key] = Number(body[key]);
          break;
        case 'isActive':
          updateData[key] = Boolean(body[key]);
          break;
        case 'recurrenceType':
          updateData[key] = body[key] as RecurrenceType;
          break;
        case 'validFrom':
        case 'validUntil':
          updateData[key] = body[key] ? new Date(body[key]) : null;
          break;
        default:
          updateData[key] = body[key];
      }
    }
  }

  // 毎週などの繰り返しの場合は曜日と時間が必須
  const finalRecurrence = updateData.recurrenceType ?? existingService.recurrenceType;
  const finalDays = updateData.availableDays ?? existingService.availableDays;
  const finalStart = updateData.startTime ?? existingService.startTime;
  const finalEnd = updateData.endTime ?? existingService.endTime;

  if (finalRecurrence !== 'ONCE' && (!finalDays?.length || !finalStart || !finalEnd)) {
    return validationError('繰り返しサービスの場合は曜日と開始・終了時間が必要です');
  }

  const service = await prisma.service.update({
    where: { id },
    data: updateData,
    include: {
      instructor: { include: { user: true } },
      schedules: true,
      campaigns: true,
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return NextResponse.json(service);
});

/**
 * DELETE /api/services/[id]
 * サービスを無効化（論理削除）（認証済みインストラクターのみ）
 * 既存の予約がある場合は警告を返す
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { authUser } = authResult;

  // 既存のサービスを取得
  const existingService = await prisma.service.findUnique({
    where: { id },
    include: { instructor: { include: { user: true } } },
  });

  if (!existingService) {
    return notFoundError('サービス');
  }

  // 所有者チェック
  const instructorUser = existingService.instructor.user;
  if (instructorUser.authId !== authUser.id && instructorUser.id !== authUser.id) {
    return forbiddenError('このサービスを削除する権限がありません');
  }

  // 未完了の予約を確認
  const activeReservations = await prisma.reservation.count({
    where: {
      serviceId: id,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });

  if (activeReservations > 0) {
    // forceパラメータがあれば強制無効化
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    if (!force) {
      return NextResponse.json({
        error: {
          code: 'CONFLICT',
          message: `このサービスには${activeReservations}件の未完了予約があります。強制的に無効化する場合は ?force=true を指定してください。`,
        },
        activeReservations,
      }, { status: 409 });
    }
  }

  // 論理削除（isActive = false）
  const service = await prisma.service.update({
    where: { id },
    data: { isActive: false },
    include: {
      instructor: { include: { user: true } },
    },
  });

  return NextResponse.json({
    success: true,
    message: 'サービスを無効化しました',
    service,
  });
});
