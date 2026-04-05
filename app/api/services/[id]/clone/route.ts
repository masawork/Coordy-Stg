/**
 * POST /api/services/[id]/clone
 * サービスを複製（認証済みインストラクターのみ）
 * 画像もコピーし、曜日や時間だけを変更して新しいサービスを作成できる
 */

import { NextRequest, NextResponse } from 'next/server';
import { RecurrenceType, PublishStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getVerifiedInstructor } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    // 本人確認済みインストラクターであることを確認
    const authResult = await getVerifiedInstructor();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { instructor } = authResult;

    // 元のサービスを取得（画像含む）
    const originalService = await prisma.service.findUnique({
      where: { id },
      include: {
        instructor: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!originalService) {
      return notFoundError('サービス');
    }

    // 所有者チェック
    if (originalService.instructorId !== instructor.id) {
      return forbiddenError('このサービスを複製する権限がありません');
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      deliveryType,
      location,
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
      copyImages = true, // デフォルトで画像もコピー
    } = body;

    // 新しいサービスのデータを作成
    const newRecurrenceType = (recurrenceType || originalService.recurrenceType) as RecurrenceType;
    const newAvailableDays = availableDays || originalService.availableDays || [];
    const newStartTime = startTime !== undefined ? startTime : originalService.startTime;
    const newEndTime = endTime !== undefined ? endTime : originalService.endTime;

    // 繰り返しサービスの場合は曜日と時間が必須
    if (
      newRecurrenceType !== 'ONCE' &&
      (!newAvailableDays.length || !newStartTime || !newEndTime)
    ) {
      return validationError('繰り返しサービスの場合は曜日と開始・終了時間が必要です');
    }

    // サービスを作成（publishStatus は prisma generate 後に型に含まれる）
    const cloneData = {
      instructorId: instructor.id,
      title: title || `${originalService.title} (コピー)`,
      description: description !== undefined ? description : originalService.description,
      category: category || originalService.category,
      deliveryType: deliveryType || originalService.deliveryType,
      location: location !== undefined ? location : originalService.location,
      price: price !== undefined ? Number(price) : originalService.price,
      duration: duration !== undefined ? Number(duration) : originalService.duration,
      isActive: false, // 複製サービスも下書きとして作成
      publishStatus: PublishStatus.DRAFT,
      recurrenceType: newRecurrenceType,
      availableDays: newAvailableDays,
      startTime: newStartTime,
      endTime: newEndTime,
      timezone: originalService.timezone,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxParticipants: maxParticipants !== undefined
        ? Number(maxParticipants)
        : originalService.maxParticipants,
    };

    const clonedService = await prisma.service.create({
      data: cloneData,
      include: {
        instructor: { include: { user: true } },
        schedules: true,
        campaigns: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // 画像をコピー
    if (copyImages && originalService.images.length > 0) {
      const imageData = originalService.images.map((img) => ({
        serviceId: clonedService.id,
        url: img.url,
        storageKey: img.storageKey,
        sortOrder: img.sortOrder,
      }));

      await prisma.serviceImage.createMany({ data: imageData });

      // 画像を含めた最新のサービスを取得
      const serviceWithImages = await prisma.service.findUnique({
        where: { id: clonedService.id },
        include: {
          instructor: { include: { user: true } },
          schedules: true,
          campaigns: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });

      return NextResponse.json(
        {
          ...serviceWithImages,
          message: 'サービスを複製しました（画像含む）',
          originalServiceId: id,
          copiedImages: imageData.length,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ...clonedService,
        message: 'サービスを複製しました',
        originalServiceId: id,
        copiedImages: 0,
      },
      { status: 201 }
    );
  }
);
