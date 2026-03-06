import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/helpers';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 本人確認書類を提出
 * POST /api/verification/identity/submit
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const body = await request.json();
  const {
    documentType,
    documentFrontUrl,
    documentBackUrl,
    fullName,
    dateOfBirth,
    address,
    additionalImages,
    role,
  } = body;

  // バリデーション
  if (!documentType || !documentFrontUrl || !fullName || !dateOfBirth || !address) {
    return validationError('必須項目が不足しています');
  }

  if (!['license', 'mynumber', 'passport', 'other'].includes(documentType)) {
    return validationError('無効な書類タイプです');
  }

  if (documentType === 'license' && !documentBackUrl) {
    return validationError('運転免許証の場合は裏面画像が必須です');
  }

  // ユーザーレコードの存在チェック
  const prismaRole = role ? (role.toUpperCase() as 'USER' | 'INSTRUCTOR') : null;
  const dbUser = prismaRole && user.email
    ? await prisma.user.findUnique({
        where: {
          email_role: {
            email: user.email,
            role: prismaRole,
          },
        },
      })
    : await prisma.user.findFirst({
        where: { authId: user.id },
      });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  const userId = dbUser.id;

  // プロフィールの存在チェック
  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return validationError('プロフィールが見つかりません。先にプロフィールを設定してください。');
  }

  // 直近のリクエストを取得（再提出対応）
  const latestRequest = await prisma.identityVerificationRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // 承認済みは再提出不可
  if (latestRequest && latestRequest.status === 'approved') {
    return validationError('既に承認済みです。再提出はできません。');
  }

  const extraImages: string[] = Array.isArray(additionalImages)
    ? additionalImages.filter((img: any) => typeof img === 'string' && img.trim() !== '')
    : [];

  // 申請を作成または再提出で更新
  const verificationRequest = latestRequest
    ? await prisma.identityVerificationRequest.update({
        where: { id: latestRequest.id },
        data: {
          documentType,
          documentFrontUrl,
          documentBackUrl,
          additionalImages: extraImages,
          fullName,
          dateOfBirth: new Date(dateOfBirth),
          address,
          status: 'pending',
          rejectedReason: null,
          reviewedAt: null,
          reviewedBy: null,
        },
      })
    : await prisma.identityVerificationRequest.create({
        data: {
          userId,
          documentType,
          documentFrontUrl,
          documentBackUrl,
          additionalImages: extraImages,
          fullName,
          dateOfBirth: new Date(dateOfBirth),
          address,
          status: 'pending',
        },
      });

  // ユーザープロフィールを更新（提出日時を記録）
  await prisma.clientProfile.update({
    where: { userId },
    data: {
      identitySubmittedAt: new Date(),
    },
  });

  // 管理者へ通知
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
  });

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: 'admin',
      category: 'verification',
      priority: 'high',
      title: '本人確認書類の申請がありました',
      message: `${fullName}さんから本人確認書類が提出されました。内容を確認してください。`,
      actionLabel: '確認する',
      actionUrl: `/manage/admin/verification/${verificationRequest.id}`,
    });
  }

  return NextResponse.json({
    id: verificationRequest.id,
    status: verificationRequest.status,
    message: '本人確認書類を提出しました。1〜3営業日以内に審査結果をお知らせします。',
  }, { status: 201 });
});
