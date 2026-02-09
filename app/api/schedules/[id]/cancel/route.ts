/**
 * PATCH /api/schedules/[id]/cancel
 * スケジュールをキャンセル（インストラクターのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await getAuthUser();
    if (authResult instanceof NextResponse) return authResult;
    const { dbUser } = authResult;

    // インストラクター情報を取得
    const instructor = await prisma.instructor.findUnique({
      where: { userId: dbUser.id },
    });

    if (!instructor) {
      return forbiddenError('インストラクター権限が必要です');
    }

    // スケジュールを取得
    const schedule = await prisma.serviceSchedule.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!schedule) {
      return notFoundError('スケジュール');
    }

    // 所有者チェック
    if (schedule.service.instructorId !== instructor.id) {
      return forbiddenError('このスケジュールをキャンセルする権限がありません');
    }

    if (schedule.isCancelled) {
      return validationError('このスケジュールは既にキャンセル済みです');
    }

    // キャンセル処理
    const updated = await prisma.serviceSchedule.update({
      where: { id },
      data: { isCancelled: true },
      include: { service: true },
    });

    return NextResponse.json({
      success: true,
      message: 'スケジュールをキャンセルしました',
      schedule: updated,
    });
  } catch (error: unknown) {
    console.error('Cancel schedule error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'スケジュールのキャンセルに失敗しました' } },
      { status: 500 }
    );
  }
}
