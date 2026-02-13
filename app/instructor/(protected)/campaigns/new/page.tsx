'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag, Calendar, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createCampaign, CampaignType } from '@/lib/api/campaigns';
import { listServices } from '@/lib/api/services';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';

const campaignTypes: { value: CampaignType; label: string; description: string }[] = [
  { value: 'PERCENT_OFF', label: '割引率', description: '価格から指定した割合を割引' },
  { value: 'FIXED_DISCOUNT', label: '定額割引', description: '価格から指定した金額を割引' },
  { value: 'TRIAL', label: '体験価格', description: '特別な固定価格で提供' },
  { value: 'FIRST_TIME', label: '初回限定', description: '初めてのお客様限定の割引' },
  { value: 'EARLY_BIRD', label: '早期予約割引', description: '早めに予約したお客様への割引' },
  { value: 'SEASONAL', label: '季節限定', description: '期間限定のキャンペーン' },
];

interface Service {
  id: string;
  title: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [instructorId, setInstructorId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    serviceId: '',
    name: '',
    description: '',
    type: 'PERCENT_OFF' as CampaignType,
    discountPercent: '',
    discountAmount: '',
    fixedPrice: '',
    maxUsagePerUser: '',
    maxTotalUsage: '',
    isFirstTimeOnly: false,
    earlyBirdDays: '',
    validFrom: '',
    validUntil: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

      setInstructorId(instructor.id);

      // サービス一覧を取得
      const myServices = await listServices({ instructorId: instructor.id });
      setServices(myServices || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !instructorId) return;

    // バリデーション
    if (!formData.name || !formData.validFrom || !formData.validUntil) {
      setError('キャンペーン名と有効期間は必須です');
      return;
    }

    // 割引設定のバリデーション
    if (
      (formData.type === 'PERCENT_OFF' && !formData.discountPercent) ||
      (formData.type === 'FIXED_DISCOUNT' && !formData.discountAmount) ||
      (formData.type === 'TRIAL' && !formData.fixedPrice)
    ) {
      setError('選択したキャンペーンタイプに応じた割引設定を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createCampaign({
        serviceId: formData.serviceId || undefined,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : undefined,
        discountAmount: formData.discountAmount ? parseInt(formData.discountAmount) : undefined,
        fixedPrice: formData.fixedPrice ? parseInt(formData.fixedPrice) : undefined,
        maxUsagePerUser: formData.maxUsagePerUser ? parseInt(formData.maxUsagePerUser) : undefined,
        maxTotalUsage: formData.maxTotalUsage ? parseInt(formData.maxTotalUsage) : undefined,
        isFirstTimeOnly: formData.isFirstTimeOnly,
        earlyBirdDays: formData.earlyBirdDays ? parseInt(formData.earlyBirdDays) : undefined,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        isActive: formData.isActive,
      });

      router.push('/instructor/campaigns');
    } catch (err: any) {
      console.error('Create campaign error:', err);
      setError(err.message || 'キャンペーンの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const showDiscountPercent = ['PERCENT_OFF', 'EARLY_BIRD', 'FIRST_TIME'].includes(formData.type);
  const showDiscountAmount = ['FIXED_DISCOUNT', 'FIRST_TIME'].includes(formData.type);
  const showFixedPrice = formData.type === 'TRIAL';
  const showEarlyBirdDays = formData.type === 'EARLY_BIRD';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/instructor/campaigns">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新規キャンペーン作成</h1>
          <p className="text-sm text-gray-600 mt-1">割引キャンペーンを作成します</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            キャンペーン名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="例: 夏の特別キャンペーン"
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
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="キャンペーンの詳細説明"
          />
        </div>

        <div>
          <label htmlFor="serviceId" className="block text-sm font-semibold text-gray-700 mb-2">
            対象サービス
          </label>
          <select
            id="serviceId"
            name="serviceId"
            value={formData.serviceId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">全サービス対象</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            特定のサービスのみ対象にする場合は選択してください
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            キャンペーンタイプ <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campaignTypes.map((type) => (
              <label
                key={type.value}
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.type === type.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">{type.label}</span>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 割引設定 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            割引設定
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showDiscountPercent && (
              <div>
                <label htmlFor="discountPercent" className="block text-sm font-semibold text-gray-700 mb-2">
                  割引率 (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="discountPercent"
                  name="discountPercent"
                  value={formData.discountPercent}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="10"
                />
              </div>
            )}

            {showDiscountAmount && (
              <div>
                <label htmlFor="discountAmount" className="block text-sm font-semibold text-gray-700 mb-2">
                  割引額 (円) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="discountAmount"
                  name="discountAmount"
                  value={formData.discountAmount}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="500"
                />
              </div>
            )}

            {showFixedPrice && (
              <div>
                <label htmlFor="fixedPrice" className="block text-sm font-semibold text-gray-700 mb-2">
                  体験価格 (円) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="fixedPrice"
                  name="fixedPrice"
                  value={formData.fixedPrice}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="1000"
                />
              </div>
            )}

            {showEarlyBirdDays && (
              <div>
                <label htmlFor="earlyBirdDays" className="block text-sm font-semibold text-gray-700 mb-2">
                  早期予約日数
                </label>
                <input
                  type="number"
                  id="earlyBirdDays"
                  name="earlyBirdDays"
                  value={formData.earlyBirdDays}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="7"
                />
                <p className="text-xs text-gray-500 mt-1">開催日の何日前までの予約が対象か</p>
              </div>
            )}
          </div>
        </div>

        {/* 有効期間 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            有効期間
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="validFrom" className="block text-sm font-semibold text-gray-700 mb-2">
                開始日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="validFrom"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="validUntil" className="block text-sm font-semibold text-gray-700 mb-2">
                終了日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="validUntil"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 利用制限 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">利用制限（オプション）</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxUsagePerUser" className="block text-sm font-semibold text-gray-700 mb-2">
                1人あたりの利用上限
              </label>
              <input
                type="number"
                id="maxUsagePerUser"
                name="maxUsagePerUser"
                value={formData.maxUsagePerUser}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="1"
              />
            </div>
            <div>
              <label htmlFor="maxTotalUsage" className="block text-sm font-semibold text-gray-700 mb-2">
                総利用回数上限
              </label>
              <input
                type="number"
                id="maxTotalUsage"
                name="maxTotalUsage"
                value={formData.maxTotalUsage}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="100"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="isFirstTimeOnly"
              name="isFirstTimeOnly"
              checked={formData.isFirstTimeOnly}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="isFirstTimeOnly" className="ml-2 block text-sm text-gray-700">
              初めてのお客様のみ利用可能
            </label>
          </div>
        </div>

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

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? '作成中...' : 'キャンペーンを作成'}
          </Button>
          <Link href="/instructor/campaigns">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
