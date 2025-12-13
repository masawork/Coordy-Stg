'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth/cognito';
import { updateUserAttributes } from 'aws-amplify/auth';
import {
  createInstructor,
  getInstructorByUserId,
  updateInstructor,
} from '@/lib/api/instructors';
import { Button } from '@/components/ui/button';
import { validateDisplayName } from '@/lib/auth/displayName';

type FormState = {
  name: string; // 本名（管理者確認用）
  displayName: string;
  bio: string;
  specialties: string;
};

export default function InstructorProfileSetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [formData, setFormData] = useState<FormState>({
    name: '',
    displayName: '',
    bio: '',
    specialties: '',
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    try {
      setInitialLoading(true);
      const authUser = await getCurrentAuthUser();
      setUserId(authUser.userId);

      const instructor = await getInstructorByUserId(authUser.userId);
      if (instructor) {
        // 既存プロフィールがある場合、そのデータを使用
        setFormData({
          name: authUser.name || '', // 本名はCognitoから取得
          displayName: instructor.displayName || '',
          bio: instructor.bio || '',
          specialties: (instructor.specialties || []).join(', '),
        });
      } else {
        // 新規ユーザーの場合、空欄からスタート（メールアドレスのローカル部は使用しない）
        setFormData({
          name: '', // 新規ユーザーは空欄
          displayName: '', // 新規ユーザーは空欄
          bio: '',
          specialties: '',
        });
      }
    } catch (err) {
      console.error('インストラクター情報の読み込みエラー:', err);
      router.push('/login/instructor');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    if (!userId) {
      setError('セッションが切れました。再ログインしてください。');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('本名は必須です。');
      setLoading(false);
      return;
    }

    if (!formData.displayName.trim()) {
      setError('表示名は必須です。');
      setLoading(false);
      return;
    }

    // 表示名の禁止ワードチェック
    const displayNameValidation = validateDisplayName(formData.displayName.trim());
    if (!displayNameValidation.isValid) {
      setError(displayNameValidation.errorMessage || '表示名が無効です。');
      setLoading(false);
      return;
    }

    const specialtiesArray = formData.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      displayName: formData.displayName.trim(),
      bio: formData.bio.trim(),
      specialties: specialtiesArray,
      status: 'active',
    };

    try {
      // 本名をCognito属性に保存（管理者が確認用）
      try {
        await updateUserAttributes({
          userAttributes: {
            name: formData.name.trim(),
          },
        });
      } catch (attrError) {
        console.warn('⚠️ Cognito属性の更新に失敗:', attrError);
      }

      const existing = await getInstructorByUserId(userId);
      if (existing?.id) {
        await updateInstructor(existing.id, payload);
      } else {
        await createInstructor({
          userId,
          ...payload,
        });
      }

      router.push('/instructor');
    } catch (err: any) {
      console.error('インストラクタープロフィール保存エラー:', err);
      setError(err?.message || 'プロフィールの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            プロフィール設定（サービス出品者）
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            サービス提供に必要な基本情報を入力してください。表示名はサービス画面やヘッダーに表示されます。
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 本名（管理者確認用） */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                本名（管理者のみ確認） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) 山田 太郎"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※身分証明書の確認時に使用されます。一般ユーザーには公開されません。
              </p>
            </div>

            {/* 表示名 */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                表示名（ニックネーム） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) Yamada Coaching"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※サービス画面やヘッダーに表示されます。
              </p>
            </div>

            {/* 自己紹介 */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                自己紹介 / 経歴
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="得意分野や実績を記載してください"
              />
            </div>

            {/* 専門分野 */}
            <div>
              <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
                専門分野（カンマ区切り）
              </label>
              <input
                type="text"
                id="specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ヨガ, ピラティス, 食事指導 など"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? '保存中...' : 'プロフィールを保存'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
