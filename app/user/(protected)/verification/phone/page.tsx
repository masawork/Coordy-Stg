/**
 * 電話番号再認証ページ（既に番号が登録されている場合）
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getProfile } from '@/lib/api/profile-client';
import {
  formatPhoneNumber,
  normalizePhoneNumber,
} from '@/lib/utils/phone';

export default function PhoneVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationLevel, setVerificationLevel] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  // 再送タイマー
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }

      const profile = await getProfile();
      if (!profile) {
        // プロフィールが未設定の場合はプロフィール設定へ
        router.push('/user/profile/setup');
        return;
      }

      if (profile.phoneVerified) {
        // 既に認証済みの場合
        setError('電話番号は既に認証済みです');
        setTimeout(() => router.push('/user/profile'), 2000);
        return;
      }

      if (!profile.phoneNumber) {
        // 電話番号が未登録の場合はプロフィール設定へ
        router.push('/user/profile/setup');
        return;
      }

      setPhoneNumber(profile.phoneNumber);
      setVerificationLevel(profile.verificationLevel || 0);
    } catch (err) {
      console.error('Load profile error:', err);
      setError('プロフィールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      setError('電話番号が登録されていません');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verification/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizePhoneNumber(phoneNumber),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'SMS送信に失敗しました');
      }

      setOtpSent(true);
      setResendTimer(60);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'SMS送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      setError('6桁の認証コードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('📱 Verifying OTP for:', phoneNumber);

      // OTP検証API（独自実装 - セッションを維持したまま検証）
      console.log('📞 Calling phone verification API...');
      const verifyResponse = await fetch('/api/verification/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          otpCode: otpCode,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || '認証コードが正しくありません');
      }

      const verifyData = await verifyResponse.json();
      console.log('✅ Phone verification response:', verifyData);

      // 完了後、ダッシュボードへリダイレクト
      console.log('🎉 Phone verification complete! Redirecting to dashboard...');
      router.push('/user');
    } catch (err: any) {
      console.error('❌ Verify OTP error:', err);
      setError(err.message || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    await handleSendOtp();
    setOtpCode('');
  };

  if (loading && !otpSent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📱 電話番号認証
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          登録済みの電話番号を認証して、認証レベルをアップグレードします。
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {!otpSent ? (
          <div>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">電話番号:</span>{' '}
                {formatPhoneNumber(phoneNumber)}
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <span className="font-semibold">現在の認証レベル:</span> Level{' '}
                {verificationLevel}
              </p>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {loading ? '送信中...' : 'SMS認証コードを送信'}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600">
              この番号にSMS認証コードが送信されます
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ SMS認証コードを送信しました
              </p>
              <p className="text-sm text-green-800 mt-1">
                {formatPhoneNumber(phoneNumber)} に届いたコードを入力してください
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                認証コード
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest text-gray-900"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500 text-center">
                6桁の数字を入力してください
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {loading ? '認証中...' : '認証して完了'}
            </button>

            <div className="text-center">
              {resendTimer > 0 ? (
                <p className="text-sm text-gray-500">
                  認証コードを再送信できます（{resendTimer}秒後）
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                >
                  認証コードを再送信
                </button>
              )}
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/user/profile')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            後で認証する
          </button>
        </div>

        {/* 認証レベルの説明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            ✨ Level 1 でできること
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✅ サービスの予約</li>
            <li>✅ 決済（最大5,000円/回）</li>
            <li>✅ メッセージ送信</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
