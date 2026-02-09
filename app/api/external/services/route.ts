/**
 * GET /api/external/services
 * パートナー向けサービス一覧取得
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPartnerRequest } from '@/lib/partner/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const ts = searchParams.get('ts');
    const sig = searchParams.get('sig');
    const instructorId = searchParams.get('instructor_id');
    const category = searchParams.get('category');

    if (!partnerId || !ts || !sig) {
      return NextResponse.json(
        { error: 'MISSING_PARAMETERS' },
        { status: 400 },
      );
    }

    const timestamp = parseInt(ts, 10);
    const verifyResult = await verifyPartnerRequest(partnerId, timestamp, sig);

    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: verifyResult.error },
        { status: 401 },
      );
    }

    const partner = verifyResult.partner!;

    // フィルタ条件構築
    const where: Record<string, unknown> = {
      isActive: true,
    };

    // パートナーのサービス制限
    if (partner.serviceIds.length > 0) {
      where.id = { in: partner.serviceIds };
    }

    // パートナーのインストラクター制限
    if (partner.instructorIds.length > 0) {
      where.instructorId = { in: partner.instructorIds };
    }

    // クエリパラメータでの絞り込み
    if (instructorId) {
      // パートナー制限がある場合、指定インストラクターが許可されているか確認
      if (partner.instructorIds.length > 0 && !partner.instructorIds.includes(instructorId)) {
        return NextResponse.json({ services: [] });
      }
      where.instructorId = instructorId;
    }

    if (category) {
      where.category = category;
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        instructor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        campaigns: {
          where: {
            isActive: true,
            validFrom: { lte: new Date() },
            validUntil: { gte: new Date() },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 外部向けにレスポンスを整形
    const formattedServices = services.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price,
      duration: service.duration,
      deliveryType: service.deliveryType,
      location: service.location,
      maxParticipants: service.maxParticipants,
      instructor: {
        id: service.instructor.id,
        name: service.instructor.user.name,
        image: service.instructor.user.image,
      },
      images: service.images.map((img) => img.url),
      activeCampaigns: service.campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        discountPercent: c.discountPercent,
        discountAmount: c.discountAmount,
        fixedPrice: c.fixedPrice,
      })),
    }));

    return NextResponse.json({ services: formattedServices });
  } catch (error: unknown) {
    console.error('External services error:', error);
    return NextResponse.json(
      { error: 'サービス一覧の取得に失敗しました' },
      { status: 500 },
    );
  }
}
