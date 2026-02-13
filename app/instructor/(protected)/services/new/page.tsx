'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createService } from '@/lib/api/services';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';
import { getBankAccounts } from '@/lib/api/bank-client';
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

const recurrenceTypes = [
  { value: 'ONCE', label: '単発（1回のみ）' },
  { value: 'WEEKLY', label: '毎週' },
  { value: 'BIWEEKLY', label: '隔週' },
  { value: 'MONTHLY', label: '毎月' },
];

const daysOfWeek = [
  { value: 'monday', label: '月' },
  { value: 'tuesday', label: '火' },
  { value: 'wednesday', label: '水' },
  { value: 'thursday', label: '木' },
  { value: 'friday', label: '金' },
  { value: 'saturday', label: '土' },
  { value: 'sunday', label: '日' },
];

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [instructorId, setInstructorId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    duration: '',
    isActive: true,
    deliveryType: 'remote', // remote | onsite | hybrid
    location: '',
    // スケジュール設定
    recurrenceType: 'ONCE',
    availableDays: [] as string[],
    startTime: '',
    endTime: '',
    validFrom: '',
    validUntil: '',
    maxParticipants: '1',
  });
  const [error, setError] = useState('');
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  useEffect(() => {
    loadInstructor();
  }, []);

  const loadInstructor = async () => {
    try {
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

      // 本人確認チェック
      let approved = false;
      let statusRes = await fetch('/api/verification/identity/status');
      if (statusRes.status === 404 && session?.user) {
        // プロフィール未作成なら作成して再取得
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: session.user.id }),
        }).catch(() => {});
        statusRes = await fetch('/api/verification/identity/status');
      }
      if (statusRes.ok) {
        const status = await statusRes.json();
        approved =
          status?.request?.status === 'approved' ||
          status?.identityVerified === true;
      }
      if (!approved) {
        router.push('/instructor/verification/identity');
        return;
      }

      // 銀行口座チェック
      const accounts = await getBankAccounts();
      if (!accounts || accounts.length === 0) {
        router.push('/instructor/bank-accounts');
        return;
      }

      setInstructorId(instructor.id);
    } catch (error) {
      console.error('Failed to load instructor:', error);
      router.push('/login/instructor');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const days = prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: days };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !instructorId) return;

    // バリデーション
    if (!formData.title || !formData.category || !formData.price || !formData.duration) {
      setError('必須項目を入力してください');
      return;
    }
    if ((formData.deliveryType === 'onsite' || formData.deliveryType === 'hybrid') && !formData.location.trim()) {
      setError('対面またはハイブリッドの場合は場所を入力してください');
      return;
    }
    // スケジュールバリデーション
    if (formData.recurrenceType !== 'ONCE') {
      if (formData.availableDays.length === 0) {
        setError('繰り返しサービスの場合は曜日を選択してください');
        return;
      }
      if (!formData.startTime || !formData.endTime) {
        setError('繰り返しサービスの場合は開始・終了時間を入力してください');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const deliveryLabel: Record<string, string> = {
        remote: 'リモート',
        onsite: '対面',
        hybrid: 'リモート＋対面',
      };
      const meta = `【提供形態:${deliveryLabel[formData.deliveryType]}${formData.location ? `／場所:${formData.location}` : ''}】`;
      const description = [meta, formData.description].filter(Boolean).join('\n');

      const createdService = await createService({
        instructorId,
        title: formData.title,
        description,
        category: formData.category,
        deliveryType: formData.deliveryType,
        location: formData.location || undefined,
        price: parseInt(formData.price),
        duration: parseInt(formData.duration),
        isActive: formData.isActive,
        // スケジュール設定
        recurrenceType: formData.recurrenceType as 'ONCE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM',
        availableDays: formData.availableDays,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        maxParticipants: parseInt(formData.maxParticipants) || 1,
      });

      // 画像をアップロード
      if (pendingImages.length > 0 && createdService?.id) {
        for (let i = 0; i < pendingImages.length; i++) {
          const imgFormData = new FormData();
          imgFormData.append('file', pendingImages[i]);
          imgFormData.append('sortOrder', String(i));
          await fetch(`/api/services/${createdService.id}/images`, {
            method: 'POST',
            body: imgFormData,
          });
        }
      }

      router.push('/instructor/services');
    } catch (err: any) {
      console.error('Create service error:', err);
      setError(err.message || 'サービスの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">新規サービス作成</h1>
          <p className="text-sm text-gray-600 mt-1">新しいサービスを登録します</p>
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
            placeholder="例: プログラミング基礎レッスン"
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
            placeholder="サービスの詳細を入力してください"
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
              placeholder="60"
            />
          </div>

          <div>
            <label htmlFor="deliveryType" className="block text-sm font-semibold text-gray-700 mb-2">
              提供形態 <span className="text-red-500">*</span>
            </label>
            <select
              id="deliveryType"
              name="deliveryType"
              value={formData.deliveryType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="remote">リモート</option>
              <option value="onsite">対面（場所指定）</option>
              <option value="hybrid">リモート＋場所指定</option>
            </select>
          </div>
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
          <p className="text-xs text-gray-500 mt-1">
            サービスを提供する地域を選択してください
          </p>
        </div>

        {/* スケジュール設定セクション */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            スケジュール設定
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="recurrenceType" className="block text-sm font-semibold text-gray-700 mb-2">
                開催頻度 <span className="text-red-500">*</span>
              </label>
              <select
                id="recurrenceType"
                name="recurrenceType"
                value={formData.recurrenceType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {recurrenceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.recurrenceType !== 'ONCE' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    開催曜日 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          formData.availableDays.includes(day.value)
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-semibold text-gray-700 mb-2">
                      開始時間 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        id="startTime"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-semibold text-gray-700 mb-2">
                      終了時間 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        id="endTime"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="validFrom" className="block text-sm font-semibold text-gray-700 mb-2">
                  提供開始日
                </label>
                <input
                  type="date"
                  id="validFrom"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">未設定の場合は即時公開</p>
              </div>
              <div>
                <label htmlFor="validUntil" className="block text-sm font-semibold text-gray-700 mb-2">
                  提供終了日
                </label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">未設定の場合は無期限</p>
              </div>
            </div>

            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-semibold text-gray-700 mb-2">
                最大参加人数
              </label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">1回の開催あたりの参加可能人数</p>
            </div>
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
            placeholder="5000"
          />
        </div>

        {/* 画像アップロード */}
        <ServiceImageUploader
          onImagesChange={(files) => setPendingImages(files)}
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
            disabled={loading}
          >
            {loading ? '作成中...' : 'サービスを作成'}
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
