/**
 * パートナー管理API（Admin専用）
 * GET /api/admin/partners - パートナー一覧取得
 * POST /api/admin/partners - パートナー作成
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@prisma/client';
import {
  generateApiKey,
  generateSecretKey,
  generateWebhookSecret,
} from '@/lib/partner/auth';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: '認証が必要です', status: 401 };
  }

  const dbUser = await prisma.user.findFirst({
    where: { authId: authUser.id },
  });

  if (!dbUser || dbUser.role !== UserRole.ADMIN) {
    return { error: '管理者権限が必要です', status: 403 };
  }

  return { user: dbUser };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { externalReservations: true },
        },
      },
    });

    // シークレットキーは返さない
    const sanitized = partners.map((p) => ({
      ...p,
      secretKey: undefined,
      webhookSecret: undefined,
      reservationCount: p._count.externalReservations,
    }));

    return NextResponse.json(sanitized);
  } catch (error: unknown) {
    console.error('List partners error:', error);
    return NextResponse.json(
      { error: 'パートナー一覧の取得に失敗しました' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      websiteUrl,
      logoUrl,
      webhookUrl,
      paymentMode = 'COORDY',
      allowGuest = true,
      requirePhone = false,
      instructorIds = [],
      serviceIds = [],
      commissionRate = 0.0,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'パートナー名とコードは必須です' },
        { status: 400 },
      );
    }

    // コードのフォーマットチェック
    if (!/^[a-z0-9-]+$/.test(code)) {
      return NextResponse.json(
        { error: 'コードは小文字英数字とハイフンのみ使用可能です' },
        { status: 400 },
      );
    }

    // コードの重複チェック
    const existingPartner = await prisma.partner.findUnique({
      where: { code },
    });
    if (existingPartner) {
      return NextResponse.json(
        { error: 'このコードは既に使用されています' },
        { status: 409 },
      );
    }

    const apiKey = generateApiKey();
    const secretKey = generateSecretKey();
    const webhookSecret = webhookUrl ? generateWebhookSecret() : null;

    const partner = await prisma.partner.create({
      data: {
        name,
        code,
        description: description || null,
        websiteUrl: websiteUrl || null,
        logoUrl: logoUrl || null,
        apiKey,
        secretKey,
        webhookUrl: webhookUrl || null,
        webhookSecret,
        paymentMode,
        allowGuest,
        requirePhone,
        instructorIds,
        serviceIds,
        commissionRate: Number(commissionRate),
      },
    });

    // 作成直後のみシークレットキーを返す
    return NextResponse.json(
      {
        partner: {
          ...partner,
          secretKey: undefined,
          webhookSecret: undefined,
        },
        credentials: {
          apiKey,
          secretKey,
          webhookSecret,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('Create partner error:', error);
    return NextResponse.json(
      { error: 'パートナーの作成に失敗しました' },
      { status: 500 },
    );
  }
}
