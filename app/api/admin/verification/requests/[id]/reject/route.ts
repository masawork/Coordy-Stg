import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/helpers';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 本人確認申請を却下（管理者用）
 * POST /api/admin/verification/requests/[id]/reject
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者権限チェック（email + role で検索）
    const adminUser = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
        role: 'ADMIN',
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reason, adminNote } = body;

    if (!reason) {
      return NextResponse.json(
        { error: '却下理由が必要です' },
        { status: 400 }
      );
    }

    // 申請を取得
    const verificationRequest = await prisma.identityVerificationRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!verificationRequest) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    if (verificationRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'この申請は既に処理されています' },
        { status: 400 }
      );
    }

    const now = new Date();

    // トランザクションで処理
    await prisma.$transaction(async (tx) => {
      // 申請を却下
      await tx.identityVerificationRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedBy: adminUser.id,
          reviewedAt: now,
          rejectedReason: reason,
          adminNote,
        },
      });

      // ユーザープロフィールを更新
      await tx.clientProfile.update({
        where: { userId: verificationRequest.userId },
        data: {
          identityRejectedReason: reason,
          identityReviewedBy: adminUser.id,
          identityReviewedAt: now,
        },
      });

      // ユーザーへ通知（ロールに応じたURLを設定）
      const isInstructor = verificationRequest.user.role === 'INSTRUCTOR';
      const resubmitUrl = isInstructor ? '/instructor/verification/identity' : '/user/verification/identity';
      await createNotification({
        userId: verificationRequest.userId,
        type: 'system',
        category: 'verification',
        priority: 'high',
        title: '⚠️ 本人確認書類が却下されました',
        message: `提出いただいた本人確認書類を確認しましたが、以下の理由により承認できませんでした。\n\n却下理由: ${reason}\n\nお手数ですが、書類を再撮影の上、再度提出をお願いいたします。`,
        actionLabel: '再提出する',
        actionUrl: resubmitUrl,
      });
    });

    return NextResponse.json({
      success: true,
      message: '本人確認を却下しました',
      request: {
        id,
        status: 'rejected',
        rejectedReason: reason,
        reviewedAt: now,
      },
    });
  } catch (error: any) {
    console.error('Reject verification request error:', error);
    return NextResponse.json(
      { error: '却下に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

