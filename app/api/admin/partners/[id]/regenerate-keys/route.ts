/**
 * POST /api/admin/partners/[id]/regenerate-keys
 * APIキー・シークレットキーの再生成（Admin専用）
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });

    if (!dbUser || dbUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { regenerateWebhookSecret = false } = body;

    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'パートナーが見つかりません' },
        { status: 404 },
      );
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
  } catch (error: unknown) {
    console.error('Regenerate keys error:', error);
    return NextResponse.json(
      { error: 'キーの再生成に失敗しました' },
      { status: 500 },
    );
  }
}
