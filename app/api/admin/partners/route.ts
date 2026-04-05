/**
 * パートナー管理API（Admin専用）
 * GET /api/admin/partners - パートナー一覧取得
 * POST /api/admin/partners - パートナー作成
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, validationError, conflictError } from '@/lib/api/errors';
import {
  generateApiKey,
  generateSecretKey,
  generateWebhookSecret,
} from '@/lib/partner/auth';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
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
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
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
    return validationError('パートナー名とコードは必須です');
  }

  // コードのフォーマットチェック
  if (!/^[a-z0-9-]+$/.test(code)) {
    return validationError('コードは小文字英数字とハイフンのみ使用可能です');
  }

  // コードの重複チェック
  const existingPartner = await prisma.partner.findUnique({
    where: { code },
  });
  if (existingPartner) {
    return conflictError('このコードは既に使用されています');
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
});
