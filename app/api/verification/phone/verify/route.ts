import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { toInternationalFormat } from '@/lib/utils/phone';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

// テスト用OTP設定（supabase/config.tomlと同じ）
const TEST_OTP_MAP: Record<string, string> = {
  '+819012345678': '123456',
  '+818012345678': '654321',
};

/**
 * OTP検証API
 * POST /api/verification/phone/verify
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 既存のセッションを確認（メールログインのセッション）
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const { phoneNumber, otpCode } = await request.json();

  if (!phoneNumber || !otpCode) {
    return validationError('電話番号と認証コードが必要です');
  }

  // 電話番号を国際フォーマットに変換
  const internationalPhone = toInternationalFormat(phoneNumber);

  // OTP検証（テスト用マップを使用）
  const expectedOtp = TEST_OTP_MAP[internationalPhone];

  if (!expectedOtp) {
    return validationError('この電話番号はテスト用に登録されていません');
  }

  if (otpCode !== expectedOtp) {
    return validationError('認証コードが正しくありません');
  }

  // ユーザーをメール + ロールで検索（Prisma User IDを取得）
  const dbUser = await prisma.user.findFirst({
    where: {
      email: user.email!,
      role: 'USER',
    },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  const prismaUserId = dbUser.id;

  // ClientProfileを取得または作成し、電話認証を完了（upsertで安全に処理）
  const normalizedPhone = phoneNumber.replace(/\D/g, ''); // 数字のみ保存

  const profile = await prisma.clientProfile.upsert({
    where: { userId: prismaUserId },
    update: {
      phoneNumber: normalizedPhone,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      verificationLevel: 1,
    },
    create: {
      userId: prismaUserId,
      phoneNumber: normalizedPhone,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      verificationLevel: 1,
    },
  });

  return NextResponse.json({
    success: true,
    phoneVerified: profile.phoneVerified,
    verificationLevel: profile.verificationLevel,
    message: '電話番号の認証が完了しました',
  });
});
