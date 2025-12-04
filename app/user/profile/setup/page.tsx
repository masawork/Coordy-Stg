'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth/cognito';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  createClientProfile,
  getClientProfile,
  updateClientProfile,
} from '@/lib/api/profile';
import {
  isValidJapanPhoneNumber,
  toE164PhoneNumber,
  toJapanDomesticPhoneNumber,
} from '@/lib/phone';
import { Button } from '@/components/ui/button';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
  });

  useEffect(() => {
    loadUserAndProfile();
  }, [router]);

  const loadUserAndProfile = async () => {
    try {
      // Cognitoから最新のユーザー情報を取得
      const authUser = await getCurrentAuthUser();
      setUserId(authUser.userId);

      // 既存のプロフィールがあれば取得
      const profile = await getClientProfile(authUser.userId);

      if (profile) {
        // 既存プロフィールがある場合、そのデータを使用
        setFormData({
          name: profile.name || '',
          address: profile.address || '',
          phoneNumber: toJapanDomesticPhoneNumber(profile.phoneNumber),
          dateOfBirth: profile.dateOfBirth || '',
          gender: profile.gender || '',
        });
      } else {
        // 既存プロフィールがない場合、Cognitoから初期値を取得
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        const phoneNumber = toJapanDomesticPhoneNumber(
          idToken?.payload.phone_number as string | undefined
        );

        setFormData({
          name: authUser.name || '',
          address: '',
          phoneNumber,
          dateOfBirth: '',
          gender: '',
        });
      }
    } catch (err) {
      console.error('プロフィール読み込みエラー:', err);
      // 認証エラーの場合はログインページへ
      router.push('/login/user');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!userId) {
      setError('セッションが切れました。再ログインしてください。');
      setLoading(false);
      return;
    }

    // バリデーション
    if (!formData.name || !formData.address || !formData.phoneNumber) {
      setError('必須項目を入力してください。');
      setLoading(false);
      return;
    }

    if (!isValidJapanPhoneNumber(formData.phoneNumber)) {
      setError('電話番号の形式が正しくありません（例: 09012345678）');
      setLoading(false);
      return;
    }

    const phoneNumberForApi = toE164PhoneNumber(formData.phoneNumber);
    if (!phoneNumberForApi) {
      setError('電話番号の形式が正しくありません（例: 09012345678）');
      setLoading(false);
      return;
    }

    const profileInput = {
      ...formData,
      phoneNumber: phoneNumberForApi,
      clientId: userId,
    };

    try {
      console.log('🔄 プロフィール保存開始:', { userId, formData });

      // 既存プロフィールの確認
      const existingProfile = await getClientProfile(userId);

      if (existingProfile) {
        // 更新
        console.log('📝 既存プロフィールを更新:', existingProfile.id);
        await updateClientProfile(existingProfile.id, profileInput);
      } else {
        // 新規作成
        console.log('✨ 新規プロフィール作成');
        await createClientProfile(profileInput);
      }

      console.log('✅ プロフィール保存成功');
      // 完了後、ダッシュボードへ
      router.push('/user');
    } catch (err: any) {
      console.error('❌ プロフィール保存エラー:', err);
      console.error('エラー詳細:', {
        name: err.name,
        message: err.message,
        errors: err.errors,
      });
      setError(
        `プロフィールの保存に失敗しました。${err.message || 'もう一度お試しください。'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 氏名 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 住所 */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="東京都渋谷区..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="090-1234-5678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 生年月日（任意） */}
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                生年月日（任意）
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 性別（任意） */}
            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                性別（任意）
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
                <option value="no-answer">回答しない</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? '保存中...' : 'プロフィールを保存'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
