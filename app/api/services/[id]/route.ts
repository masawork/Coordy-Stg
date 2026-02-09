import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, RecurrenceType } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * GET /api/services/[id]
 * サービス詳細を取得
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error: any) {
    console.error('Get service error:', error);
    return NextResponse.json(
      { error: 'サービスの取得に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/services/[id]
 * サービスを更新（認証済みインストラクターのみ）
 */
export async function PUT(
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

    // 既存のサービスを取得
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: { instructor: { include: { user: true } } },
    });

    if (!existingService) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }

    // 所有者チェック
    const instructorUser = existingService.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: 'このサービスを更新する権限がありません' }, { status: 403 });
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
      return NextResponse.json(
        { error: '繰り返しサービスの場合は曜日と開始・終了時間が必要です' },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error('Update service error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'サービスの更新に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/services/[id]
 * サービスを削除（認証済みインストラクターのみ）
 */
export async function DELETE(
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

    // 既存のサービスを取得
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: { instructor: { include: { user: true } }, images: true },
    });

    if (!existingService) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }

    // 所有者チェック
    const instructorUser = existingService.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: 'このサービスを削除する権限がありません' }, { status: 403 });
    }

    // Storageから画像を削除
    if (existingService.images.length > 0) {
      const storageKeys = existingService.images.map((img) => img.storageKey);
      await supabase.storage.from('service-images').remove(storageKeys);
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'サービスを削除しました' });
  } catch (error: any) {
    console.error('Delete service error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'サービスの削除に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
