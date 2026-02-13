// lib/api/verification-client.ts
import { createBrowserClient } from '@supabase/ssr';

/**
 * クライアントサイドからSupabase Phone Authを使用する
 */
function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 電話番号にSMSを送信（OTP送信）
 * @param phoneNumber 国際電話番号形式（例: +819012345678）
 */
export async function sendPhoneOTP(phoneNumber: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * OTPを検証（6桁コード）
 * @param phoneNumber 国際電話番号形式（例: +819012345678）
 * @param token 6桁のOTPコード
 */
export async function verifyPhoneOTP(phoneNumber: string, token: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneNumber,
    token,
    type: 'sms',
  });

  if (error) {
    throw new Error(error.message);
  }

  // OTP検証成功後、サーバー側でプロフィールを更新
  try {
    const response = await fetch('/api/verification/phone/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('プロフィール更新に失敗:', errorData);
    }
  } catch (err) {
    console.error('プロフィール更新エラー:', err);
  }

  return data;
}

/**
 * 電話番号を国際電話番号形式に変換
 * @param phone 日本の電話番号（例: 09012345678, 090-1234-5678）
 * @returns 国際電話番号形式（例: +819012345678）
 */
export function toInternationalFormat(phone: string): string {
  // ハイフン、スペース、括弧を除去
  const cleaned = phone.replace(/[-\s()]/g, '');
  
  // 先頭の0を+81に置換
  if (cleaned.startsWith('0')) {
    return '+81' + cleaned.substring(1);
  }
  
  // 既に国際電話番号形式の場合はそのまま
  if (cleaned.startsWith('+81')) {
    return cleaned;
  }
  
  throw new Error('無効な電話番号形式です');
}

