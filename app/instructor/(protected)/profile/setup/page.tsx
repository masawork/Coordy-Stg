'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth/cognito';
import {
  createInstructor,
  getInstructorByUserId,
  updateInstructor,
} from '@/lib/api/instructors';
import { Button } from '@/components/ui/button';

type FormState = {
  displayName: string;
  bio: string;
  specialties: string;
  hourlyRate: string;
};

export default function InstructorProfileSetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [formData, setFormData] = useState<FormState>({
    displayName: '',
    bio: '',
    specialties: '',
    hourlyRate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    try {
      const authUser = await getCurrentAuthUser();
      setUserId(authUser.userId);

      const instructor = await getInstructorByUserId(authUser.userId);
      if (instructor) {
        setFormData({
          displayName: instructor.displayName || '',
          bio: instructor.bio || '',
          specialties: (instructor.specialties || []).join(', '),
          hourlyRate: instructor.hourlyRate ? String(instructor.hourlyRate) : '',
        });
      } else {
        // 初期値は Cognito の name/displayName を利用
        setFormData((prev) => ({
          ...prev,
          displayName: authUser.displayName || authUser.name || '',
        }));
      }
    } catch (err) {
      console.error('インストラクター情報の読み込みエラー:', err);
      router.push('/login/instructor');
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

    if (!formData.displayName.trim()) {
      setError('表示名は必須です。');
      setLoading(false);
      return;
    }

    const specialtiesArray = formData.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const hourlyRateNumber =
      formData.hourlyRate.trim().length > 0 ? Number(formData.hourlyRate) : undefined;

    const payload = {
      displayName: formData.displayName.trim(),
      bio: formData.bio.trim(),
      specialties: specialtiesArray,
      hourlyRate: hourlyRateNumber,
      status: 'active',
    };

    try {
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
                placeholder="例) 山田太郎 / Yamada Coaching"
              />
            </div>

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

            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                時給（円）
              </label>
              <input
                type="number"
                id="hourlyRate"
                name="hourlyRate"
                value={formData.hourlyRate}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例) 8000"
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
