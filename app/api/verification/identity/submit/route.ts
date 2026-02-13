import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/helpers';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 本人確認書類を提出
 * POST /api/verification/identity/submit
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
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
      role, // 'user' | 'instructor'
    } = body;

    // バリデーション
    if (!documentType || !documentFrontUrl || !fullName || !dateOfBirth || !address) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // 書類タイプのバリデーション
    if (!['license', 'mynumber', 'passport', 'other'].includes(documentType)) {
      return NextResponse.json(
        { error: '無効な書類タイプです' },
        { status: 400 }
      );
    }

    // 運転免許証の場合は裏面画像が必須
    if (documentType === 'license' && !documentBackUrl) {
      return NextResponse.json(
        { error: '運転免許証の場合は裏面画像が必須です' },
        { status: 400 }
      );
    }

    // ユーザーレコードの存在チェック（roleが指定されている場合はemail+roleで検索）
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
      console.error('User record not found in database for authId:', user.id);
      return NextResponse.json(
        { error: 'ユーザーデータが見つかりません。再度ログインしてください。' },
        { status: 400 }
      );
    }

    // Prisma users テーブルの ID を使用
    const userId = dbUser.id;

    // プロフィールの存在チェック
    const profile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'プロフィールが見つかりません。先にプロフィールを設定してください。' },
        { status: 400 }
      );
    }

    // 直近のリクエストを取得（再提出対応）
    const latestRequest = await prisma.identityVerificationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 承認済みは再提出不可（仕様）
    if (latestRequest && latestRequest.status === 'approved') {
      return NextResponse.json(
        { error: '既に承認済みです。再提出はできません。' },
        { status: 400 }
      );
    }

    console.log('Creating identity verification request for user:', userId);
    console.log('Request data:', { documentType, fullName, dateOfBirth, address });

    const extraImages: string[] = Array.isArray(additionalImages)
      ? additionalImages.filter((img: any) => typeof img === 'string' && img.trim() !== '')
      : [];

    // 申請を作成または再提出で更新（pending/rejected を上書き）
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

    console.log('Identity verification request created:', verificationRequest.id);

    // ユーザープロフィールを更新（提出日時を記録）
    await prisma.clientProfile.update({
      where: { userId },
      data: {
        identitySubmittedAt: new Date(),
      },
    });

    console.log('Client profile updated with identitySubmittedAt');

    // 管理者へ通知
    // 管理者を取得（Prisma enumを使用）
    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
    });

    // 各管理者に通知を作成
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
  } catch (error: any) {
    console.error('Submit identity verification error:', error);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);

    // Prismaエラーの詳細を取得
    let errorMessage = '書類の提出に失敗しました';
    let errorDetails = error.message;

    // テーブルが存在しない場合のエラー
    if (error.code === 'P2021') {
      errorMessage = 'データベーステーブルが見つかりません。マイグレーションを実行してください。';
      errorDetails = `テーブル名: ${error.meta?.table || 'unknown'}`;
    }
    // 外部キー制約エラー
    else if (error.code === 'P2003') {
      errorMessage = 'ユーザーデータが正しく登録されていません。再度ログインしてお試しください。';
      errorDetails = `外部キー: ${error.meta?.field_name || error.message}`;
    }
    // レコードが見つからない
    else if (error.code === 'P2025') {
      errorMessage = '更新対象のプロフィールが見つかりません。先にプロフィールを設定してください。';
      errorDetails = error.meta?.cause || error.message;
    }
    // ユニーク制約エラー
    else if (error.code === 'P2002') {
      errorMessage = '既に申請が存在します';
      errorDetails = `重複フィールド: ${error.meta?.target || error.message}`;
    }
    // その他のPrismaエラー
    else if (error.code && error.code.startsWith('P')) {
      errorMessage = `データベースエラーが発生しました (${error.code})`;
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails, code: error.code },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
