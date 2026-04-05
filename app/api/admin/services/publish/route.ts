/**
 * GET /api/admin/services/publish
 *   公開申請中・公開済み・却下・取り下げのサービス一覧を取得
 *
 * PATCH /api/admin/services/publish
 *   サービスの公開ステータスを変更（承認・却下・取り下げ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublishStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET: 公開管理用サービス一覧
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'PENDING_REVIEW';

  // publishStatus でフィルタ
  const whereClause: Record<string, unknown> = {};
  if (status !== 'all') {
    whereClause.publishStatus = status;
  }

  const services = await prisma.service.findMany({
    where: whereClause,
    include: {
      instructor: {
        include: { user: true },
      },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // ステータスごとの件数を取得
  const counts = await prisma.service.groupBy({
    by: ['publishStatus'],
    _count: { id: true },
  });

  const stats: Record<string, number> = {
    DRAFT: 0,
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  for (const c of counts) {
    stats[c.publishStatus] = c._count.id;
  }

  return NextResponse.json({ services, stats });
});

/**
 * PATCH: サービスの公開ステータスを変更
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { serviceId, action, reason } = body as {
    serviceId: string;
    action: 'approve' | 'reject' | 'withdraw' | 'revert_to_draft';
    reason?: string;
  };

  if (!serviceId || !action) {
    return validationError('serviceId と action は必須です');
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'サービスが見つかりません' } },
      { status: 404 }
    );
  }

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case 'approve':
      // PENDING_REVIEW → PUBLISHED
      if (service.publishStatus !== 'PENDING_REVIEW') {
        return validationError('公開申請中のサービスのみ承認できます');
      }
      updateData = {
        publishStatus: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        isActive: true,
        publishRejectReason: null,
      };
      break;

    case 'reject':
      // PENDING_REVIEW → REJECTED
      if (service.publishStatus !== 'PENDING_REVIEW') {
        return validationError('公開申請中のサービスのみ却下できます');
      }
      if (!reason) {
        return validationError('却下理由は必須です');
      }
      updateData = {
        publishStatus: PublishStatus.REJECTED,
        publishRejectReason: reason,
        isActive: false,
      };
      break;

    case 'withdraw':
      // PUBLISHED → WITHDRAWN
      if (service.publishStatus !== 'PUBLISHED') {
        return validationError('公開中のサービスのみ取り下げできます');
      }
      updateData = {
        publishStatus: PublishStatus.WITHDRAWN,
        isActive: false,
        publishRejectReason: reason || null,
      };
      break;

    case 'revert_to_draft':
      // REJECTED / WITHDRAWN → DRAFT
      if (!['REJECTED', 'WITHDRAWN'].includes(service.publishStatus)) {
        return validationError('却下または取り下げ済みのサービスのみ下書きに戻せます');
      }
      updateData = {
        publishStatus: PublishStatus.DRAFT,
        publishRejectReason: null,
      };
      break;

    default:
      return validationError('無効なアクションです: ' + action);
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: updateData,
    include: {
      instructor: { include: { user: true } },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  // 通知を送信（インストラクターのuserIdに対して）
  const instructorWithUser = await prisma.instructor.findUnique({
    where: { id: service.instructorId },
    include: { user: true },
  });

  if (instructorWithUser) {
    let notifMessage = '';
    switch (action) {
      case 'approve':
        notifMessage = `サービス「${service.title}」が公開承認されました。`;
        break;
      case 'reject':
        notifMessage = `サービス「${service.title}」の公開が却下されました。理由: ${reason}`;
        break;
      case 'withdraw':
        notifMessage = `サービス「${service.title}」が管理者により公開取り下げされました。${reason ? '理由: ' + reason : ''}`;
        break;
    }

    if (notifMessage) {
      await prisma.notification.create({
        data: {
          userId: instructorWithUser.userId,
          type: 'system',
          category: 'service',
          title: 'サービス公開ステータス更新',
          message: notifMessage,
        },
      });
    }
  }

  return NextResponse.json({
    service: updated,
    message: action === 'approve' ? 'サービスを公開しました'
      : action === 'reject' ? 'サービスを却下しました'
      : action === 'withdraw' ? 'サービスを取り下げました'
      : 'サービスを下書きに戻しました',
  });
});
