import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/helpers';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 本人確認申請を承認（管理者用）
 * POST /api/admin/verification/requests/[id]/approve
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
    const { adminNote } = body;

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
      // 申請を承認
      await tx.identityVerificationRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedBy: adminUser.id,
          reviewedAt: now,
          adminNote,
        },
      });

      // ユーザープロフィールを更新
      await tx.clientProfile.update({
        where: { userId: verificationRequest.userId },
        data: {
          identityVerified: true,
          verificationLevel: 2,
          identityVerifiedAt: now,
          identityReviewedBy: adminUser.id,
          identityReviewedAt: now,
          identityRejectedReason: null, // クリア
        },
      });

      // ユーザーへ通知（ロールに応じたURLを設定）
      const isInstructor = verificationRequest.user.role === 'INSTRUCTOR';
      const profileUrl = isInstructor ? '/instructor/profile' : '/user/profile';
      await createNotification({
        userId: verificationRequest.userId,
        type: 'system',
        category: 'verification',
        priority: 'high',
        title: '✅ 本人確認が完了しました',
        message:
          'おめでとうございます！本人確認が完了し、認証レベルが「本人確認完了（Level 2）」にアップグレードされました。これにより、より柔軟なキャンセルポリシーと高額決済が利用可能になります。',
        actionLabel: 'プロフィールを見る',
        actionUrl: profileUrl,
      });
    });

    return NextResponse.json({
      success: true,
      message: '本人確認を承認しました',
      request: {
        id,
        status: 'approved',
        reviewedAt: now,
      },
    });
  } catch (error: any) {
    console.error('Approve verification request error:', error);
    return NextResponse.json(
      { error: '承認に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

