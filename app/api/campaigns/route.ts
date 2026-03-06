import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CampaignType } from '@prisma/client';
import { getAuthInstructor } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns
 * キャンペーン一覧を取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const instructorId = searchParams.get('instructorId') || undefined;
  const serviceId = searchParams.get('serviceId') || undefined;
  const isActiveParam = searchParams.get('isActive');
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';

  const where: any = {};
  if (instructorId) where.instructorId = instructorId;
  if (serviceId) where.serviceId = serviceId;
  if (isActive !== undefined) where.isActive = isActive;

  // 有効期間内のキャンペーンのみをフィルタ（オプション）
  const activeOnlyParam = searchParams.get('activeOnly');
  if (activeOnlyParam === 'true') {
    const now = new Date();
    where.validFrom = { lte: now };
    where.validUntil = { gte: now };
    where.isActive = true;
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      service: true,
      instructor: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(campaigns);
});

/**
 * POST /api/campaigns
 * キャンペーンを作成（認証済みインストラクターのみ）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) return authResult;
  const { instructor } = authResult;

  const body = await request.json();

  const {
    serviceId,
    name,
    description,
    type,
    discountPercent,
    discountAmount,
    fixedPrice,
    minPurchaseAmount,
    minBookingCount,
    maxUsagePerUser,
    maxTotalUsage,
    isFirstTimeOnly = false,
    earlyBirdDays,
    validFrom,
    validUntil,
    isActive = true,
  } = body;

  // バリデーション
  if (!name || !type || !validFrom || !validUntil) {
    return validationError('キャンペーン名、タイプ、有効期間は必須です');
  }

  // 割引タイプに応じたバリデーション
  const campaignType = type as CampaignType;
  if (
    (campaignType === 'PERCENT_OFF' && !discountPercent) ||
    (campaignType === 'FIXED_DISCOUNT' && !discountAmount) ||
    (campaignType === 'TRIAL' && !fixedPrice)
  ) {
    return validationError('割引設定が不正です');
  }

  // サービスIDが指定されている場合、所有権を確認
  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.instructorId !== instructor.id) {
      return validationError('指定されたサービスが見つからないか、権限がありません');
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      instructorId: instructor.id,
      serviceId: serviceId || null,
      name,
      description: description || null,
      type: campaignType,
      discountPercent: discountPercent ? Number(discountPercent) : null,
      discountAmount: discountAmount ? Number(discountAmount) : null,
      fixedPrice: fixedPrice ? Number(fixedPrice) : null,
      minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : null,
      minBookingCount: minBookingCount ? Number(minBookingCount) : null,
      maxUsagePerUser: maxUsagePerUser ? Number(maxUsagePerUser) : null,
      maxTotalUsage: maxTotalUsage ? Number(maxTotalUsage) : null,
      isFirstTimeOnly: Boolean(isFirstTimeOnly),
      earlyBirdDays: earlyBirdDays ? Number(earlyBirdDays) : null,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      isActive: Boolean(isActive),
    },
    include: {
      service: true,
      instructor: { include: { user: true } },
    },
  });

  return NextResponse.json(campaign, { status: 201 });
});
