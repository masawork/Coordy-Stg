import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { toInternationalFormat } from '@/lib/utils/phone';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// テスト用OTP設定（supabase/config.tomlと同じ）
const TEST_OTP_MAP: Record<string, string> = {
  '+819012345678': '123456',
  '+818012345678': '654321',
};

/**
 * OTP検証API
 * POST /api/verification/phone/verify
 *
 * クライアント側でSupabase Auth の verifyOtp を使うと
 * 新しいセッションが作成されてしまうため、
 * このAPIでOTP検証を行い、既存のセッションを維持する
 */
export async function POST(request: NextRequest) {
  try {
    // 既存のセッションを確認（メールログインのセッション）
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const { phoneNumber, otpCode } = await request.json();

    if (!phoneNumber || !otpCode) {
      return NextResponse.json(
        { error: '電話番号と認証コードが必要です' },
        { status: 400 }
      );
    }

    // 電話番号を国際フォーマットに変換
    const internationalPhone = toInternationalFormat(phoneNumber);
    console.log('📱 Verifying OTP for:', internationalPhone, 'code:', otpCode);

    // OTP検証（テスト用マップを使用）
    const expectedOtp = TEST_OTP_MAP[internationalPhone];

    if (!expectedOtp) {
      console.error('❌ Phone number not in test OTP map:', internationalPhone);
      return NextResponse.json(
        { error: 'この電話番号はテスト用に登録されていません' },
        { status: 400 }
      );
    }

    if (otpCode !== expectedOtp) {
      console.error('❌ OTP mismatch. Expected:', expectedOtp, 'Got:', otpCode);
      return NextResponse.json(
        { error: '認証コードが正しくありません' },
        { status: 400 }
      );
    }

    console.log('✅ OTP verified successfully');

    // ユーザーをメール + ロールで検索（Prisma User IDを取得）
    console.log('🔍 Looking up user by email:', user.email, 'role: USER');
    const dbUser = await prisma.user.findFirst({
      where: {
        email: user.email!,
        role: 'USER',
      },
    });

    console.log('🔍 User lookup result:', dbUser ? `Found: ${dbUser.id}` : 'Not found');

    if (!dbUser) {
      console.error('❌ User not found in database');
      return NextResponse.json(
        { error: 'ユーザーが見つかりません。再度ログインしてください。' },
        { status: 404 }
      );
    }

    const prismaUserId = dbUser.id;

    // ClientProfileを取得または作成し、電話認証を完了（upsertで安全に処理）
    console.log('📝 Upserting profile for user:', prismaUserId);
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

    console.log('✅ Phone verification complete - phoneVerified:', profile.phoneVerified, 'level:', profile.verificationLevel);

    return NextResponse.json({
      success: true,
      phoneVerified: profile.phoneVerified,
      verificationLevel: profile.verificationLevel,
      message: '電話番号の認証が完了しました',
    });
  } catch (error: any) {
    console.error('❌ Phone verification error:', error);
    console.error('❌ Error stack:', error.stack);

    // Prismaのユニーク制約エラーの場合
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'データの重複が発生しました', details: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: '電話番号認証に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
