import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhoneNumber, toInternationalFormat } from '@/lib/utils/phone';

export const dynamic = 'force-dynamic';

/**
 * SMS認証コードを送信
 * POST /api/verification/phone/send
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

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: '電話番号が必要です' },
        { status: 400 }
      );
    }

    // 電話番号を数字のみに正規化
    const digitsOnly = normalizePhoneNumber(phoneNumber);

    // 日本の電話番号を国際フォーマット (+81) に変換
    // 例: 09012345678 → +819012345678
    const internationalPhone = toInternationalFormat(phoneNumber);

    console.log('Sending OTP to:', internationalPhone);

    // Supabase Phone Auth で OTP を送信
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: internationalPhone,
      options: {
        // OTP の有効期限（秒）
        // デフォルトは 60秒
      },
    });

    if (otpError) {
      console.error('OTP send error:', otpError);
      return NextResponse.json(
        { error: 'SMS送信に失敗しました: ' + otpError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '認証コードを送信しました',
      phoneNumber: digitsOnly,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'SMS送信に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

