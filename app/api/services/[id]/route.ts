/**
 * サービス詳細API
 * GET /api/services/[id] - サービス詳細取得
 * PUT /api/services/[id] - サービス更新（認証済みインストラクターのみ）
 * DELETE /api/services/[id] - サービス削除（認証済みインストラクターのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { RecurrenceType, PublishStatus, UserRole } from '@prisma/client';
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
 *
 * アクセス制御:
 * - PUBLISHED: 誰でも閲覧可能
 * - その他ステータス: サービス所有者 or 管理者のみ
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

  // PUBLISHED 以外のサービスは所有者または管理者のみアクセス可能
  if (service.publishStatus !== 'PUBLISHED') {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return notFoundError('サービス');
    }

    // 所有者チェック
    const isOwner = service.instructor.user.authId === authUser.id;

    // 管理者チェック
    let isAdmin = false;
    if (!isOwner) {
      const adminUser = await prisma.user.findFirst({
        where: { authId: authUser.id, role: 'ADMIN' },
      });
      isAdmin = !!adminUser;
    }

    if (!isOwner && !isAdmin) {
      // 未公開サービスの存在を隠す（404を返す）
      return notFoundError('サービス');
    }
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

  const authResult = await getAuthUser(UserRole.INSTRUCTOR);
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

  // 審査中のサービスは編集不可（先に申請を取り下げる必要がある）
  if (existingService.publishStatus === 'PENDING_REVIEW') {
    return validationError(
      '公開申請中のサービスは編集できません。先に公開申請を取り下げてから編集してください。'
    );
  }

  const body = await request.json();

  // 許可されたフィールドリスト
  // isActive と publishStatus はインストラクターが直接変更不可（公開承認フロー経由のみ）
  const allowedFields = [
    'title',
    'description',
    'category',
    'deliveryType',
    'pricingType',
    'location',
    'price',
    'duration',
    'recurrenceType',
    'availableDays',
    'startTime',
    'endTime',
    'timezone',
    'validFrom',
    'validUntil',
    'maxParticipants',
  ];

  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      switch (key) {
        case 'price':
        case 'duration':
        case 'maxParticipants':
          updateData[key] = Number(body[key]);
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

  const daysArray = Array.isArray(finalDays) ? finalDays : [];
  if (finalRecurrence !== 'ONCE' && (!daysArray.length || !finalStart || !finalEnd)) {
    return validationError('繰り返しサービスの場合は曜日と開始・終了時間が必要です');
  }

  // 公開中のサービスが編集された場合、再審査が必要
  // → publishStatus を DRAFT にリセットし、isActive を false に
  const currentPublishStatus = existingService.publishStatus as string;
  if (currentPublishStatus === 'PUBLISHED' && Object.keys(updateData).length > 0) {
    updateData.publishStatus = 'DRAFT';
    updateData.isActive = false;
    updateData.publishedAt = null;
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

  // 公開中だったサービスが編集でリセットされた場合、通知を追加
  if (currentPublishStatus === 'PUBLISHED' && Object.keys(updateData).length > 0) {
    await prisma.notification.create({
      data: {
        userId: existingService.instructor.user.id,
        type: 'system',
        category: 'service',
        title: 'サービス公開ステータス変更',
        message: `サービス「${existingService.title}」の内容が変更されたため、公開ステータスが下書きにリセットされました。再度公開申請を行ってください。`,
      },
    });
  }

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

  const authResult = await getAuthUser(UserRole.INSTRUCTOR);
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

  // 審査中のサービスは削除不可（先に申請を取り下げる必要がある）
  const currentStatus = (existingService as Record<string, unknown>).publishStatus as string;
  if (currentStatus === 'PENDING_REVIEW') {
    return validationError(
      '公開申請中のサービスは削除できません。先に公開申請を取り下げてから削除してください。'
    );
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

  // 論理削除（isActive = false, publishStatus を DRAFT にリセット）
  const service = await prisma.service.update({
    where: { id },
    data: {
      isActive: false,
      publishStatus: PublishStatus.DRAFT,
      publishedAt: null,
    },
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
