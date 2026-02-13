'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getService, updateService } from '@/lib/api/services';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';
import { ServiceImageUploader } from '@/components/features/service/ServiceImageUploader';

const categories = [
  'プログラミング',
  'デザイン',
  '語学',
  '音楽',
  'スポーツ',
  'ビジネス',
  'その他',
];

export default function EditServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    deliveryType: 'remote',
    location: '',
    price: '',
    duration: '',
    isActive: true,
  });
  const [error, setError] = useState('');
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string; sortOrder: number }>>([]);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }

      const instructor = await fetchCurrentInstructor();
      if (!instructor) {
        router.push('/instructor/profile/setup');
        return;
      }

      const service = await getService(serviceId);
      if (!service) {
        router.push('/instructor/services');
        return;
      }

      // 自分のサービスか確認
      if (service.instructorId !== instructor.id) {
        router.push('/instructor/services');
        return;
      }

      setFormData({
        title: service.title,
        description: service.description || '',
        category: service.category,
        deliveryType: service.deliveryType || 'remote',
        location: service.location || '',
        price: service.price.toString(),
        duration: service.duration.toString(),
        isActive: service.isActive,
      });

      if (service.images) {
        setExistingImages(service.images);
      }
    } catch (error) {
      console.error('Failed to load service:', error);
      router.push('/instructor/services');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // バリデーション
    if (!formData.title || !formData.category || !formData.price || !formData.duration) {
      setError('必須項目を入力してください');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateService(serviceId, {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        deliveryType: formData.deliveryType,
        location: formData.location || undefined,
        price: parseInt(formData.price),
        duration: parseInt(formData.duration),
        isActive: formData.isActive,
      });

      router.push('/instructor/services');
    } catch (err: any) {
      console.error('Update service error:', err);
      setError(err.message || 'サービスの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/instructor/services">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サービス編集</h1>
          <p className="text-sm text-gray-600 mt-1">サービス情報を編集します</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
            サービス名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            説明
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
              カテゴリー <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-2">
              所要時間（分） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="deliveryType" className="block text-sm font-semibold text-gray-700 mb-2">
              提供形態
            </label>
            <select
              id="deliveryType"
              name="deliveryType"
              value={formData.deliveryType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="remote">オンライン</option>
              <option value="onsite">対面</option>
              <option value="hybrid">オンライン/対面</option>
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
              都道府県
            </label>
            <select
              id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            {['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島', '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川', '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'].map((pref) => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
            価格（円） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* 画像アップロード */}
        <ServiceImageUploader
          serviceId={serviceId}
          existingImages={existingImages}
          onImageDeleted={(imageId) => {
            setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
          }}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
            公開する
          </label>
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={saving}
          >
            {saving ? '更新中...' : '更新する'}
          </Button>
          <Link href="/instructor/services">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
