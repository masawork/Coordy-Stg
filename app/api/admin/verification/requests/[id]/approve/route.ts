import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { createNotification } from '@/lib/notifications/helpers';
import { withErrorHandler, notFoundError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 本人確認申請を承認（管理者用）
 * POST /api/admin/verification/requests/[id]/approve
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser: adminUser } = authResult;

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
    return notFoundError('申請');
  }

  if (verificationRequest.status !== 'pending') {
    return validationError('この申請は既に処理されています');
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
});
