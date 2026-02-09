/**
 * プロフィール設定ページ（SMS認証付き）
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  createClientProfile,
  getClientProfile,
  updateClientProfile,
} from '@/lib/api/profile-client';
import { Button } from '@/components/ui/button';
import {
  normalizePhoneNumber,
  getPhoneNumberErrorMessage,
} from '@/lib/utils/phone';

// 全角数字を半角に揃えるユーティリティ（簡易対応）
const toHalfWidthDigits = (value: string) =>
  value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
  // ステップ管理
  const [step, setStep] = useState<'profile' | 'phone-verify'>('profile');
  
  // フォームデータ
  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    address: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
  });

  // SMS認証
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    loadUserAndProfile();
  }, [router]);

  // 再送タイマー
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const validateAddress = (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return '住所は必須です';
    if (trimmed.length < 5) return '住所を市区町村まで入力してください';

    // 47都道府県のいずれかが含まれているか簡易チェック（日本前提）
    const prefectures = [
      '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
      '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
      '新潟県','富山県','石川県','福井県','山梨県','長野県',
      '岐阜県','静岡県','愛知県','三重県',
      '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
      '鳥取県','島根県','岡山県','広島県','山口県',
      '徳島県','香川県','愛媛県','高知県',
      '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
    ];
    const hasPrefecture = prefectures.some((p) => trimmed.includes(p));
    if (!hasPrefecture) {
      return '日本国内の住所を都道府県から入力してください（例: 東京都渋谷区...）';
    }
    // 番地などの数字が含まれているか（全角数字も許容）
    const hasNumber = /[0-9０-９]/.test(trimmed);
    if (!hasNumber) {
      return '番地など数字を含めて入力してください';
    }
    return null;
  };

  const validateBirthDate = (dateStr: string) => {
    if (!dateStr) return '生年月日は必須です';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '生年月日の形式が正しくありません';
    const today = new Date();
    if (date > today) return '未来の日付は指定できません';
    return null;
  };

  const loadUserAndProfile = async () => {
    try {
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }

      const authUser = session.user;
      setEmail(authUser.email || '');

      // ロール別にPrismaユーザーを取得（正しいuser IDを取得）
      const roleCheckRes = await fetch('/api/auth/check-role?role=user', {
        credentials: 'include',
      });

      if (roleCheckRes.ok) {
        const { user: dbUser, profile } = await roleCheckRes.json();
        // PrismaのユーザーIDを使用
        setUserId(dbUser.id);

        if (profile) {
          setFormData({
            fullName: profile.fullName || '',
            displayName: profile.displayName || '',
            address: profile.address || '',
            phoneNumber: profile.phoneNumber || '',
            dateOfBirth: profile.dateOfBirth
              ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
              : '',
            gender: profile.gender || '',
          });

          // 既に電話番号が認証済みの場合はステップをスキップ
          if (profile.phoneVerified) {
            // プロフィール編集モード
            setStep('profile');
          }
        }
      } else if (roleCheckRes.status === 404) {
        // ユーザーがまだDBに存在しない場合（通常はcallbackで作成されるが念のため）
        console.error('User not found in database');
        setError('ユーザーがデータベースに登録されていません。ログインし直してください。');
        // ログインページへリダイレクトせず、エラーメッセージを表示
      } else {
        // 500エラーなどの場合
        console.error('Failed to load user profile:', roleCheckRes.status);
        setError('プロフィール情報の読み込みに失敗しました。ページを再読み込みしてください。');
        // 無限ループを防ぐため、リダイレクトしない
      }
    } catch (err: any) {
      console.error('Load profile error:', err);
      setError('プロフィール情報の読み込みに失敗しました');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'address') setAddressError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 電話番号フィールドから離れたときにバリデーション
  const handlePhoneBlur = () => {
    if (formData.phoneNumber) {
      // 全角を半角に変換してからハイフンなしの数字のみに正規化
      const digitsOnly = normalizePhoneNumber(formData.phoneNumber);
      setFormData((prev) => ({ ...prev, phoneNumber: digitsOnly }));

      const errorMsg = getPhoneNumberErrorMessage(digitsOnly);
      setPhoneError(errorMsg);
    }
  };

  // ステップ1: プロフィール情報を確認してSMS送信
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setAddressError(null);

    try {
      // 必須項目のバリデーション
      if (!formData.phoneNumber) {
        setError('電話番号は必須です');
        setLoading(false);
        return;
      }

      const addressMsg = validateAddress(formData.address);
      if (addressMsg) {
        setError(addressMsg);
        setAddressError(addressMsg);
        setLoading(false);
        return;
      }

      const dobMsg = validateBirthDate(formData.dateOfBirth);
      if (dobMsg) {
        setError(dobMsg);
        setLoading(false);
        return;
      }

      // 電話番号のバリデーション
      const phoneErrorMsg = getPhoneNumberErrorMessage(formData.phoneNumber);
      if (phoneErrorMsg) {
        setError(phoneErrorMsg);
        setPhoneError(phoneErrorMsg);
        setLoading(false);
        return;
      }

      // SMS送信
      const response = await fetch('/api/verification/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizePhoneNumber(formData.phoneNumber),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'SMS送信に失敗しました');
      }

      setOtpSent(true);
      setResendTimer(60); // 60秒間再送不可
      setStep('phone-verify');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'SMS送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ステップ2: OTP検証 + プロフィール保存
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!otpCode || otpCode.length !== 6) {
      setError('6桁の認証コードを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setAddressError(null);

    try {
      const addressMsg = validateAddress(formData.address);
      if (addressMsg) {
        setError(addressMsg);
        setAddressError(addressMsg);
        setLoading(false);
        return;
      }

      const dobMsg = validateBirthDate(formData.dateOfBirth);
      if (dobMsg) {
        setError(dobMsg);
        setLoading(false);
        return;
      }

      // 電話番号を数字のみに正規化
      const digitsOnly = normalizePhoneNumber(formData.phoneNumber);

      console.log('📱 Verifying OTP for:', formData.phoneNumber);

      // OTP検証API（独自実装 - セッションを維持したまま検証）
      // 電話認証が成功してからプロフィールを保存する
      console.log('📞 Calling phone verification API...');
      const verifyResponse = await fetch('/api/verification/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          otpCode: otpCode,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || '認証コードが正しくありません');
      }

      const verifyData = await verifyResponse.json();
      console.log('✅ Phone verification response:', verifyData);

      // 電話認証が成功した後にプロフィールを保存
      const existingProfile = await getClientProfile(userId);

      if (existingProfile) {
        await updateClientProfile(userId, {
          fullName: formData.fullName,
          displayName: formData.displayName,
          address: formData.address,
          phoneNumber: digitsOnly,
          dateOfBirth: formData.dateOfBirth
            ? new Date(formData.dateOfBirth)
            : undefined,
          gender: formData.gender,
          isProfileComplete: true,
        });
      } else {
        await createClientProfile({
          userId,
          fullName: formData.fullName,
          displayName: formData.displayName,
          address: formData.address,
          phoneNumber: digitsOnly,
          dateOfBirth: formData.dateOfBirth
            ? new Date(formData.dateOfBirth)
            : undefined,
          gender: formData.gender,
          isProfileComplete: true,
        });
      }

      // 完了後、ダッシュボードへリダイレクト
      console.log('🎉 Profile setup complete! Redirecting to dashboard...');
      router.push('/user');
    } catch (err: any) {
      console.error('❌ OTP verify error:', err);
      setError(err.message || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // SMS再送信
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verification/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizePhoneNumber(formData.phoneNumber),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'SMS送信に失敗しました');
      }

      setResendTimer(60);
      setOtpCode('');
      alert('認証コードを再送信しました');
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'SMS送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          {/* ステップ1: プロフィール情報入力 */}
          {step === 'profile' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                プロフィール設定
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                サービスをご利用いただくために、プロフィール情報を入力してください。
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* 氏名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    氏名（本名）
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="山田 太郎"
                  />
                </div>

                {/* 表示名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示名（ニックネーム）
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="やまちゃん"
                  />
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    onBlur={handlePhoneBlur}
                    className={`w-full px-3 py-2 border ${
                      phoneError ? 'border-red-500' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900`}
                    placeholder="09012345678"
                    required
                  />
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    この番号にSMS認証コードが送信されます
                  </p>
                </div>

                {/* 住所（任意） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    住所 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="東京都渋谷区..."
                    required
                  />
                  {addressError && (
                    <p className="mt-1 text-sm text-red-600">{addressError}</p>
                  )}
                </div>

                {/* 生年月日 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生年月日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  />
                </div>

                {/* 性別 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性別
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                    <option value="prefer_not_to_say">回答しない</option>
                  </select>
                </div>

                <Button type="submit" disabled={loading || !!phoneError} className="w-full">
                  {loading ? '送信中...' : '次へ（SMS認証）'}
                </Button>
              </form>
            </>
          )}

          {/* ステップ2: SMS認証 */}
          {step === 'phone-verify' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                📱 SMS認証
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                <span className="font-semibold">{formData.phoneNumber}</span>{' '}
                に送信された6桁の認証コードを入力してください。
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    認証コード
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => {
                      const normalized = toHalfWidthDigits(e.target.value);
                      setOtpCode(normalized.replace(/\D/g, '').slice(0, 6));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest text-gray-900"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500 text-center">
                    6桁の数字を入力してください
                  </p>
                </div>

                <Button type="submit" disabled={loading || otpCode.length !== 6} className="w-full">
                  {loading ? '認証中...' : '認証して完了'}
                </Button>

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

                <button
                  type="button"
                  onClick={() => {
                    setStep('profile');
                    setOtpCode('');
                    setError(null);
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                >
                  ← 電話番号を変更
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
