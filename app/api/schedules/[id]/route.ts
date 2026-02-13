/**
 * DELETE /api/schedules/[id]
 * スケジュール削除（インストラクターのみ、予約なしの場合）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function DELETE(
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
      return forbiddenError('このスケジュールを削除する権限がありません');
    }

    // 削除
    await prisma.serviceSchedule.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'スケジュールを削除しました',
    });
  } catch (error: unknown) {
    console.error('Delete schedule error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'スケジュールの削除に失敗しました' } },
      { status: 500 }
    );
  }
}
