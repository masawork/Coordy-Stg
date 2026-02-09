import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, RecurrenceType } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * POST /api/services/[id]/clone
 * サービスを複製（認証済みインストラクターのみ）
 * 曜日や時間だけを変更して新しいサービスを作成
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 元のサービスを取得
    const originalService = await prisma.service.findUnique({
      where: { id },
      include: { instructor: { include: { user: true } } },
    });

    if (!originalService) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }

    // 所有者チェック
    const instructorUser = originalService.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: 'このサービスを複製する権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const {
      // オーバーライド可能なフィールド
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

    // 新しいサービスのデータを作成
    const newServiceData = {
      instructorId: originalService.instructorId,
      title: title || `${originalService.title} (コピー)`,
      description: description !== undefined ? description : originalService.description,
      category: originalService.category,
      price: price !== undefined ? Number(price) : originalService.price,
      duration: duration !== undefined ? Number(duration) : originalService.duration,
      isActive: Boolean(isActive),
      // スケジュール設定（オーバーライドまたは元のサービスから継承）
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

    // 毎週などの繰り返しの場合は曜日と時間が必須
    if (
      newServiceData.recurrenceType !== 'ONCE' &&
      (!newServiceData.availableDays?.length || !newServiceData.startTime || !newServiceData.endTime)
    ) {
      return NextResponse.json(
        { error: '繰り返しサービスの場合は曜日と開始・終了時間が必要です' },
        { status: 400 }
      );
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
        originalServiceId: id 
      }, 
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Clone service error:', error);
    return NextResponse.json(
      { error: 'サービスの複製に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
