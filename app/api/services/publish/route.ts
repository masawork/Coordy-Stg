/**
 * POST /api/services/publish
 *   インストラクターがサービスの公開申請を行う
 *   DRAFT / REJECTED → PENDING_REVIEW
 *
 * DELETE /api/services/publish
 *   インストラクターが公開申請を取り下げる（PENDING_REVIEW → DRAFT）
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublishStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getVerifiedInstructor } from '@/lib/api/auth';
import { withErrorHandler, validationError, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST: 公開申請
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getVerifiedInstructor();
  if (authResult instanceof NextResponse) return authResult;

  const { instructor } = authResult;
  const body = await request.json();
  const { serviceId } = body as { serviceId: string };

  if (!serviceId) {
    return validationError('serviceId は必須です');
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    return notFoundError('サービス');
  }

  if (service.instructorId !== instructor.id) {
    return forbiddenError('このサービスの操作権限がありません');
  }

  // DRAFT または REJECTED のみ申請可能
  if (!['DRAFT', 'REJECTED'].includes(service.publishStatus)) {
    return validationError(
      `現在のステータス（${service.publishStatus}）では公開申請できません。下書きまたは却下済みのサービスのみ申請できます。`
    );
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: {
      publishStatus: PublishStatus.PENDING_REVIEW,
      publishRequestedAt: new Date(),
      publishRejectReason: null,
    },
    include: {
      instructor: { include: { user: true } },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  // 管理者に通知
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'system',
        category: 'service',
        title: 'サービス公開申請',
        message: `サービス「${service.title}」の公開申請がありました。`,
      },
    });
  }

  return NextResponse.json({
    service: updated,
    message: '公開申請を送信しました。管理者の承認をお待ちください。',
  });
});

/**
 * DELETE: 公開申請取り下げ
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getVerifiedInstructor();
  if (authResult instanceof NextResponse) return authResult;

  const { instructor } = authResult;
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');

  if (!serviceId) {
    return validationError('serviceId は必須です');
  }

  const service2 = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service2) {
    return notFoundError('サービス');
  }

  if (service2.instructorId !== instructor.id) {
    return forbiddenError('このサービスの操作権限がありません');
  }

  if (service2.publishStatus !== 'PENDING_REVIEW') {
    return validationError('公開申請中のサービスのみ取り下げできます');
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: {
      publishStatus: PublishStatus.DRAFT,
      publishRequestedAt: null,
    },
    include: {
      instructor: { include: { user: true } },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return NextResponse.json({
    service: updated,
    message: '公開申請を取り下げました。',
  });
});
