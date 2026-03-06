/**
 * パートナーWebhook配信ログAPI（Admin専用）
 * GET /api/admin/partners/[id]/webhooks - 配信ログ一覧
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { notFoundError, withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  // パートナー存在チェック
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) {
    return notFoundError('パートナー');
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const success = searchParams.get('success');
  const event = searchParams.get('event');

  const where: Record<string, unknown> = { partnerId: id };
  if (success === 'true') where.success = true;
  if (success === 'false') where.success = false;
  if (event) where.event = event;

  const [logs, total] = await Promise.all([
    prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.webhookLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
