import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, RecurrenceType } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * GET /api/services
 * 任意のフィルタでサービス一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('List services error:', error);
    return NextResponse.json(
      { error: 'サービス一覧の取得に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/services
 * サービスを作成（認証済みインストラクターのみ）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // DBからユーザー情報とインストラクター情報を取得（authIdで検索）
    const dbUser = await prisma.user.findFirst({
      where: { authId: user.id },
      include: { instructor: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーデータが見つかりません。再度ログインしてください。' },
        { status: 400 }
      );
    }

    // ロールチェック
    if (dbUser.role !== UserRole.INSTRUCTOR) {
      return NextResponse.json({ error: 'インストラクターのみ作成可能です' }, { status: 403 });
    }

    // インストラクター情報チェック
    if (!dbUser.instructor) {
      return NextResponse.json(
        { error: 'インストラクター情報が見つかりません。先にプロフィールを設定してください。' },
        { status: 400 }
      );
    }

    const instructor = dbUser.instructor;

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

    if (!title || !category || price === undefined || duration === undefined) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 });
    }

    // 毎週などの繰り返しの場合は曜日と時間が必須
    if (recurrenceType !== 'ONCE' && (!availableDays.length || !startTime || !endTime)) {
      return NextResponse.json(
        { error: '繰り返しサービスの場合は曜日と開始・終了時間が必要です' },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { error: 'サービスの作成に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
