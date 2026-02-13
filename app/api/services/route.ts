/**
 * サービスAPI
 * GET /api/services - サービス一覧取得
 * POST /api/services - サービス作成（認証済みインストラクターのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, RecurrenceType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthInstructor } from '@/lib/api/auth';
import { validationError, withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/services
 * 任意のフィルタでサービス一覧を取得
 *
 * クエリパラメータ:
 *   instructorId, category, isActive       — 既存フィルタ
 *   q            — フリーワード (title / description / instructor名)
 *   deliveryType — remote / onsite / hybrid
 *   location     — 都道府県 (完全一致)
 *   priceMin     — 最低価格 (gte)
 *   priceMax     — 最高価格 (lte)
 *   sortBy       — newest (default) / price_asc / price_desc
 *   page         — ページ番号 (1始まり, default: 1)
 *   limit        — 件数 (default: 12, max: 50)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // --- 既存フィルタ ---
  const instructorId = searchParams.get('instructorId') || undefined;
  const category = searchParams.get('category') || undefined;
  const isActiveParam = searchParams.get('isActive');
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';

  // --- 新規フィルタ ---
  const q = searchParams.get('q') || undefined;
  const deliveryType = searchParams.get('deliveryType') || undefined;
  const location = searchParams.get('location') || undefined;
  const priceMinStr = searchParams.get('priceMin');
  const priceMaxStr = searchParams.get('priceMax');
  const priceMinRaw = priceMinStr ? Number(priceMinStr) : undefined;
  const priceMaxRaw = priceMaxStr ? Number(priceMaxStr) : undefined;
  const priceMin = priceMinRaw !== undefined && !Number.isNaN(priceMinRaw) ? priceMinRaw : undefined;
  const priceMax = priceMaxRaw !== undefined && !Number.isNaN(priceMaxRaw) ? priceMaxRaw : undefined;

  // --- ソート ---
  const sortBy = searchParams.get('sortBy') || 'newest';

  // --- ページネーション ---
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 12));

  // --- WHERE 構築 ---
  const where: Prisma.ServiceWhereInput = {};
  if (instructorId) where.instructorId = instructorId;
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;
  if (deliveryType) where.deliveryType = deliveryType;
  if (location) where.location = location;

  // 価格帯
  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {
      ...(priceMin !== undefined && { gte: priceMin }),
      ...(priceMax !== undefined && { lte: priceMax }),
    };
  }

  // フリーワード検索 (title / description / instructor名)
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' as const } },
      { description: { contains: q, mode: 'insensitive' as const } },
      { instructor: { user: { name: { contains: q, mode: 'insensitive' as const } } } },
    ];
  }

  // --- ORDER BY ---
  let orderBy: Prisma.ServiceOrderByWithRelationInput;
  switch (sortBy) {
    case 'price_asc':
      orderBy = { price: 'asc' };
      break;
    case 'price_desc':
      orderBy = { price: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }

  // --- 件数取得 + データ取得を並列実行 ---
  const [total, services] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
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
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    services,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * POST /api/services
 * サービスを作成（認証済みインストラクターのみ）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;

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

  // 必須フィールドのバリデーション
  if (!title || !category || price === undefined || duration === undefined) {
    return validationError('必須項目を入力してください');
  }

  // 毎週などの繰り返しの場合は曜日と時間が必須
  if (recurrenceType !== 'ONCE' && (!availableDays.length || !startTime || !endTime)) {
    return validationError('繰り返しサービスの場合は曜日と開始・終了時間が必要です');
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
});
