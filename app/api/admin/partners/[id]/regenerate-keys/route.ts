/**
 * POST /api/admin/partners/[id]/regenerate-keys
 * APIキー・シークレットキーの再生成（Admin専用）
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, notFoundError } from '@/lib/api/errors';
import {
  generateApiKey,
  generateSecretKey,
  generateWebhookSecret,
} from '@/lib/partner/auth';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { regenerateWebhookSecret = false } = body;

  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) {
    return notFoundError('パートナー');
  }

  const newApiKey = generateApiKey();
  const newSecretKey = generateSecretKey();
  const newWebhookSecret = regenerateWebhookSecret
    ? generateWebhookSecret()
    : undefined;

  await prisma.partner.update({
    where: { id },
    data: {
      apiKey: newApiKey,
      secretKey: newSecretKey,
      ...(newWebhookSecret && { webhookSecret: newWebhookSecret }),
    },
  });

  return NextResponse.json({
    success: true,
    credentials: {
      apiKey: newApiKey,
      secretKey: newSecretKey,
      ...(newWebhookSecret && { webhookSecret: newWebhookSecret }),
    },
  });
});
