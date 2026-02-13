import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, CampaignType } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns/[id]
 * キャンペーン詳細を取得
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json({ error: 'キャンペーンが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Get campaign error:', error);
    return NextResponse.json(
      { error: 'キャンペーンの取得に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/campaigns/[id]
 * キャンペーンを更新（認証済みインストラクターのみ）
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

    // 既存のキャンペーンを取得
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id },
      include: { instructor: { include: { user: true } } },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'キャンペーンが見つかりません' }, { status: 404 });
    }

    // 所有者チェック
    const instructorUser = existingCampaign.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: 'このキャンペーンを更新する権限がありません' }, { status: 403 });
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
  } catch (error: any) {
    console.error('Update campaign error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'キャンペーンが見つかりません' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'キャンペーンの更新に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/campaigns/[id]
 * キャンペーンを削除（認証済みインストラクターのみ）
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

    // 既存のキャンペーンを取得
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id },
      include: { instructor: { include: { user: true } } },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'キャンペーンが見つかりません' }, { status: 404 });
    }

    // 所有者チェック
    const instructorUser = existingCampaign.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: 'このキャンペーンを削除する権限がありません' }, { status: 403 });
    }

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'キャンペーンを削除しました' });
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'キャンペーンが見つかりません' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'キャンペーンの削除に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
