/**
 * Webhook手動再送API（Admin専用）
 * POST /api/admin/partners/[id]/webhooks/[logId]/retry
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { notFoundError, withErrorHandler } from '@/lib/api/errors';
import { sendAndLogWebhook, type WebhookEvent } from '@/lib/partner/webhook';

export const dynamic = 'force-dynamic';

const VALID_EVENTS: WebhookEvent[] = [
  'reservation.created',
  'reservation.cancelled',
  'reservation.completed',
];

export const POST = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id, logId } = await params;

  // 元のログを取得
  const originalLog = await prisma.webhookLog.findUnique({
    where: { id: logId },
    include: { partner: true },
  });

  if (!originalLog || originalLog.partnerId !== id) {
    return notFoundError('Webhookログ');
  }

  if (!originalLog.partner.webhookUrl || !originalLog.partner.webhookSecret) {
    return NextResponse.json(
      { error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'パートナーのWebhook設定がありません' } },
      { status: 400 },
    );
  }

  // イベント名のバリデーション
  const event = originalLog.event as WebhookEvent;
  if (!VALID_EVENTS.includes(event)) {
    return NextResponse.json(
      { error: { code: 'INVALID_EVENT', message: `不正なイベント: ${originalLog.event}` } },
      { status: 400 },
    );
  }

  // 元のペイロードを使って再送信
  const parsed = JSON.parse(originalLog.requestBody);

  const result = await sendAndLogWebhook({
    partnerId: id,
    reservationId: originalLog.reservationId ?? undefined,
    webhookUrl: originalLog.partner.webhookUrl,
    webhookSecret: originalLog.partner.webhookSecret,
    event,
    data: parsed.data,
  });

  return NextResponse.json({
    success: result.success,
    statusCode: result.statusCode,
    attempts: result.attempts,
    error: result.error,
  });
});
