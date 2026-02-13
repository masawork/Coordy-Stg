import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, CampaignType } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns
 * キャンペーン一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('List campaigns error:', error);
    return NextResponse.json(
      { error: 'キャンペーン一覧の取得に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/campaigns
 * キャンペーンを作成（認証済みインストラクターのみ）
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

    if (dbUser.role !== UserRole.INSTRUCTOR) {
      return NextResponse.json({ error: 'インストラクターのみ作成可能です' }, { status: 403 });
    }

    if (!dbUser.instructor) {
      return NextResponse.json(
        { error: 'インストラクター情報が見つかりません。先にプロフィールを設定してください。' },
        { status: 400 }
      );
    }

    const instructor = dbUser.instructor;
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
      return NextResponse.json(
        { error: 'キャンペーン名、タイプ、有効期間は必須です' },
        { status: 400 }
      );
    }

    // 割引タイプに応じたバリデーション
    const campaignType = type as CampaignType;
    if (
      (campaignType === 'PERCENT_OFF' && !discountPercent) ||
      (campaignType === 'FIXED_DISCOUNT' && !discountAmount) ||
      (campaignType === 'TRIAL' && !fixedPrice)
    ) {
      return NextResponse.json(
        { error: '割引設定が不正です' },
        { status: 400 }
      );
    }

    // サービスIDが指定されている場合、所有権を確認
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (!service || service.instructorId !== instructor.id) {
        return NextResponse.json(
          { error: '指定されたサービスが見つからないか、権限がありません' },
          { status: 400 }
        );
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
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: 'キャンペーンの作成に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
