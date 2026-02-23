import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhoneNumber, toInternationalFormat } from '@/lib/utils/phone';
import { withErrorHandler, unauthorizedError, validationError, internalError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * SMS認証コードを送信
 * POST /api/verification/phone/send
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const { phoneNumber } = await request.json();

  if (!phoneNumber) {
    return validationError('電話番号が必要です');
  }

  // 電話番号を数字のみに正規化
  const digitsOnly = normalizePhoneNumber(phoneNumber);

  // 日本の電話番号を国際フォーマット (+81) に変換
  const internationalPhone = toInternationalFormat(phoneNumber);

  // Supabase Phone Auth で OTP を送信
  const { error: otpError } = await supabase.auth.signInWithOtp({
    phone: internationalPhone,
  });

  if (otpError) {
    console.error('OTP send error:', otpError);
    return internalError('SMS送信に失敗しました: ' + otpError.message);
  }

  return NextResponse.json({
    success: true,
    message: '認証コードを送信しました',
    phoneNumber: digitsOnly,
  });
});
