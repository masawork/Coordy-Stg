import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CampaignType } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns/[id]
 * キャンペーン詳細を取得
 */
export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      service: true,
      instructor: {
        include: { user: true },
      },
      usages: true,
    },
  });

  if (!campaign) {
    return notFoundError('キャンペーン');
  }

  return NextResponse.json(campaign);
});

/**
 * PUT /api/campaigns/[id]
 * キャンペーンを更新（認証済みインストラクターのみ）
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorizedError();
  }

  // 既存のキャンペーンを取得
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
    include: { instructor: { include: { user: true } } },
  });

  if (!existingCampaign) {
    return notFoundError('キャンペーン');
  }

  // 所有者チェック
  const instructorUser = existingCampaign.instructor.user;
  if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
    return forbiddenError('このキャンペーンを更新する権限がありません');
  }

  const body = await request.json();

  const allowedFields = [
    'name',
    'description',
    'type',
    'discountPercent',
    'discountAmount',
    'fixedPrice',
    'minPurchaseAmount',
    'minBookingCount',
    'maxUsagePerUser',
    'maxTotalUsage',
    'isFirstTimeOnly',
    'earlyBirdDays',
    'validFrom',
    'validUntil',
    'isActive',
  ];

  const updateData: any = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      switch (key) {
        case 'discountPercent':
        case 'discountAmount':
        case 'fixedPrice':
        case 'minPurchaseAmount':
        case 'minBookingCount':
        case 'maxUsagePerUser':
        case 'maxTotalUsage':
        case 'earlyBirdDays':
          updateData[key] = body[key] ? Number(body[key]) : null;
          break;
        case 'isFirstTimeOnly':
        case 'isActive':
          updateData[key] = Boolean(body[key]);
          break;
        case 'type':
          updateData[key] = body[key] as CampaignType;
          break;
        case 'validFrom':
        case 'validUntil':
          updateData[key] = new Date(body[key]);
          break;
        default:
          updateData[key] = body[key];
      }
    }
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
    include: {
      service: true,
      instructor: { include: { user: true } },
    },
  });

  return NextResponse.json(campaign);
});

/**
 * DELETE /api/campaigns/[id]
 * キャンペーンを削除（認証済みインストラクターのみ）
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorizedError();
  }

  // 既存のキャンペーンを取得
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
    include: { instructor: { include: { user: true } } },
  });

  if (!existingCampaign) {
    return notFoundError('キャンペーン');
  }

  // 所有者チェック
  const instructorUser = existingCampaign.instructor.user;
  if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
    return forbiddenError('このキャンペーンを削除する権限がありません');
  }

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'キャンペーンを削除しました' });
});
