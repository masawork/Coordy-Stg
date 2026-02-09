'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor, saveInstructor } from '@/lib/api/instructors-client';
import { updateClientProfile } from '@/lib/api/profile-client';
import { Button } from '@/components/ui/button';

type FormState = {
  displayName: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  bio: string;
  specialties: string;
};

export default function InstructorProfileSetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [formData, setFormData] = useState<FormState>({
    displayName: '',
    fullName: '',
    dateOfBirth: '',
    address: '',
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

      // セッションを取得
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }

      // ロール別にユーザーを検索
      const roleCheckRes = await fetch('/api/auth/check-role?role=instructor', {
        credentials: 'include',
      });

      if (!roleCheckRes.ok) {
        router.push('/login/instructor');
        return;
      }

      const { user: dbUser, profile } = await roleCheckRes.json();
      setUserId(dbUser.id);

      // プロフィール情報を設定
      if (profile) {
        setFormData((prev) => ({
          ...prev,
          displayName: profile.displayName || prev.displayName || '',
          fullName: profile.fullName || '',
          dateOfBirth: profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
            : '',
          address: profile.address || '',
        }));
      }

      // インストラクター情報を取得
      const instructor = await fetchCurrentInstructor();
      if (instructor) {
        setFormData((prev) => ({
          ...prev,
          displayName: prev.displayName || (instructor.user?.name as string) || '',
          fullName: prev.fullName || (instructor.user?.name as string) || '',
          bio: instructor.bio || '',
          specialties: (instructor.specialties || []).join(', '),
        }));
      }
    } catch (err: any) {
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

    try {
      const specialtiesArray = formData.specialties
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload = {
        bio: formData.bio,
        specialties: specialtiesArray,
      };

      await saveInstructor(payload);
      await updateClientProfile(userId, {
        displayName: formData.displayName || undefined,
        fullName: formData.fullName || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address || undefined,
      });

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
            サービス提供に必要な基本情報を入力してください。
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 表示名 */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) たろう先生"
              />
              <p className="text-xs text-gray-500 mt-1">ユーザーに表示される名前です。</p>
            </div>

            {/* 氏名 */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) 山田 太郎"
              />
            </div>

            {/* 生年月日 */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                生年月日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* 住所 */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) 東京都渋谷区渋谷1-2-3"
              />
            </div>

            {/* 自己紹介 */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                自己紹介 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="あなたの経歴や専門分野について紹介してください"
              />
            </div>

            {/* 専門分野 */}
            <div>
              <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
                専門分野 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) プログラミング, デザイン, 語学"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ カンマ区切りで複数入力できます
              </p>
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={loading}
            >
              {loading ? '保存中...' : 'プロフィールを保存'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
