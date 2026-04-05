'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createService, listServices } from '@/lib/api/services';
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

interface TemplateService {
  id: string;
  title: string;
  description?: string | null;
  category?: string;
  price?: number;
  duration?: number;
  deliveryType?: string;
  location?: string | null;
  recurrenceType?: string;
  availableDays?: string[];
  startTime?: string | null;
  endTime?: string | null;
  maxParticipants?: number;
  images?: { id?: string; url: string; sortOrder: number }[];
}

export default function NewServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const fromTemplate = searchParams.get('from') === 'template';

  const [loading, setLoading] = useState(false);
  const [instructorId, setInstructorId] = useState<string>('');
  const [templateSource, setTemplateSource] = useState<TemplateService | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(fromTemplate && !templateId);
  const [myServices, setMyServices] = useState<TemplateService[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    duration: '',
    isActive: true,
    deliveryType: 'remote', // remote | onsite | hybrid
    location: '',
    locationDetail: '', // 区・最寄り駅など
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

      // テンプレートID指定の場合は事前読み込み
      if (templateId) {
        await loadTemplateService(templateId, instructor.id);
      }
      // テンプレートセレクタ用に自分のサービス一覧を取得
      if (fromTemplate || templateId) {
        await loadMyServices(instructor.id);
      }
    } catch (error) {
      console.error('Failed to load instructor:', error);
      router.push('/login/instructor');
    }
  };

  const loadMyServices = async (insId: string) => {
    try {
      setLoadingTemplates(true);
      const services = await listServices({ instructorId: insId });
      setMyServices(services || []);
    } catch (err) {
      console.error('Failed to load services for template:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadTemplateService = async (serviceId: string, _insId?: string) => {
    try {
      const res = await fetch(`/api/services/${serviceId}`);
      if (!res.ok) return;
      const service = await res.json();

      setTemplateSource(service);

      // フォームにテンプレートデータを反映
      const locationParts = (service.location || '').split(' ');
      setFormData({
        title: service.title,
        description: service.description || '',
        category: service.category || '',
        price: String(service.price || ''),
        duration: String(service.duration || ''),
        isActive: true,
        deliveryType: service.deliveryType || 'remote',
        location: locationParts[0] || '',
        locationDetail: locationParts.slice(1).join(' ') || '',
        recurrenceType: service.recurrenceType || 'ONCE',
        availableDays: service.availableDays || [],
        startTime: service.startTime || '',
        endTime: service.endTime || '',
        validFrom: '',
        validUntil: '',
        maxParticipants: String(service.maxParticipants || 1),
      });

      setShowTemplateSelector(false);
    } catch (err) {
      console.error('Failed to load template service:', err);
    }
  };

  const handleSelectTemplate = (service: TemplateService) => {
    loadTemplateService(service.id, instructorId);
  };

  /**
   * 開始時間と所要時間から終了時間を計算する
   */
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime || !durationMinutes || durationMinutes <= 0) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      };

      // 開始時間または所要時間が変わったら終了時間を自動計算
      if (name === 'startTime' || name === 'duration') {
        const start = name === 'startTime' ? value : prev.startTime;
        const dur = name === 'duration' ? parseInt(value) : parseInt(prev.duration);
        if (start && dur > 0) {
          updated.endTime = calculateEndTime(start, dur);
        }
      }

      return updated;
    });
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
      setError('対面またはハイブリッドの場合は都道府県を選択してください');
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
      const locationFull = formData.location
        ? formData.locationDetail
          ? `${formData.location} ${formData.locationDetail}`
          : formData.location
        : undefined;

      let createdService: { id: string } | null = null;

      if (templateSource) {
        // テンプレートからの複製 → clone API を使用（画像もコピー）
        const cloneRes = await fetch(`/api/services/${templateSource.id}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || undefined,
            category: formData.category,
            deliveryType: formData.deliveryType,
            location: locationFull,
            price: parseInt(formData.price),
            duration: parseInt(formData.duration),
            recurrenceType: formData.recurrenceType,
            availableDays: formData.availableDays,
            startTime: formData.startTime || undefined,
            endTime: formData.endTime || undefined,
            validFrom: formData.validFrom || undefined,
            validUntil: formData.validUntil || undefined,
            maxParticipants: parseInt(formData.maxParticipants) || 1,
            copyImages: true,
          }),
        });

        if (!cloneRes.ok) {
          const errData = await cloneRes.json();
          throw new Error(errData.error || 'テンプレートからの作成に失敗しました');
        }

        createdService = await cloneRes.json();
      } else {
        // 通常の新規作成
        createdService = await createService({
          instructorId,
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          deliveryType: formData.deliveryType,
          location: locationFull,
          price: parseInt(formData.price),
          duration: parseInt(formData.duration),
          recurrenceType: formData.recurrenceType as 'ONCE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM',
          availableDays: formData.availableDays,
          startTime: formData.startTime || undefined,
          endTime: formData.endTime || undefined,
          validFrom: formData.validFrom || undefined,
          validUntil: formData.validUntil || undefined,
          maxParticipants: parseInt(formData.maxParticipants) || 1,
        });
      }

      // 新規作成で画像がある場合のみアップロード（テンプレートはclone APIで画像コピー済み）
      if (!templateSource && pendingImages.length > 0 && createdService?.id) {
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
    } catch (err: unknown) {
      console.error('Create service error:', err);
      const message = err instanceof Error ? err.message : 'サービスの作成に失敗しました';
      setError(message);
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

      {/* テンプレート選択モード */}
      {showTemplateSelector && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            テンプレートにするサービスを選択
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            既存のサービスをベースに、写真や説明文をそのまま引き継いで新しいサービスを作成できます。曜日や時間だけ変更すればOKです。
          </p>
          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : myServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>テンプレートにできるサービスがありません。</p>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="mt-3 text-green-600 hover:text-green-700 underline"
              >
                新規作成に切り替え
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myServices.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => handleSelectTemplate(svc)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{svc.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {svc.category} / {svc.duration}分 / ¥{svc.price?.toLocaleString()}
                        {svc.recurrenceType !== 'ONCE' && (svc.availableDays?.length ?? 0) > 0 && (
                          <span className="ml-2">
                            ({(svc.availableDays ?? []).map((d: string) => {
                              const dayMap: Record<string, string> = { monday: '月', tuesday: '火', wednesday: '水', thursday: '木', friday: '金', saturday: '土', sunday: '日' };
                              return dayMap[d] || d;
                            }).join('・')})
                          </span>
                        )}
                        {svc.startTime && <span className="ml-2">{svc.startTime}~{svc.endTime}</span>}
                      </p>
                    </div>
                    <Copy className="h-5 w-5 text-green-600 shrink-0" />
                  </div>
                </button>
              ))}
              <div className="pt-2 border-t">
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  テンプレートを使わずに新規作成 →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={`bg-white rounded-lg shadow p-6 space-y-6 ${showTemplateSelector ? 'hidden' : ''}`}>
        {/* テンプレート使用時のバナー */}
        {templateSource && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-semibold">
                「{templateSource.title}」をテンプレートとして使用中
              </p>
              <p className="text-green-600 text-xs mt-1">
                写真はそのままコピーされます。曜日・時間・タイトルなどを変更してください。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTemplateSource(null);
                setFormData({
                  title: '', description: '', category: '', price: '', duration: '',
                  isActive: true, deliveryType: 'remote', location: '', locationDetail: '',
                  recurrenceType: 'ONCE', availableDays: [], startTime: '', endTime: '',
                  validFrom: '', validUntil: '', maxParticipants: '1',
                });
              }}
              className="text-green-700 hover:text-green-900 text-xs underline whitespace-nowrap ml-4"
            >
              テンプレート解除
            </button>
          </div>
        )}

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

        {/* 場所設定（対面・ハイブリッドの場合のみ表示） */}
        {(formData.deliveryType === 'onsite' || formData.deliveryType === 'hybrid') && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                  都道府県 <span className="text-red-500">*</span>
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">選択してください</option>
                  {['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島', '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川', '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'].map((pref) => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="locationDetail" className="block text-sm font-semibold text-gray-700 mb-2">
                  エリア・最寄り駅
                </label>
                <input
                  type="text"
                  id="locationDetail"
                  name="locationDetail"
                  value={formData.locationDetail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="例: 渋谷区・渋谷駅徒歩5分"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              詳しい住所やビル名は上の「説明」欄に記載してください。エリア・最寄り駅はサービス一覧に表示されます。
            </p>
          </div>
        )}

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
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-semibold text-gray-700 mb-2">
                  開始時間{formData.recurrenceType !== 'ONCE' && <span className="text-red-500"> *</span>}
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
                  終了時間{formData.recurrenceType !== 'ONCE' && <span className="text-red-500"> *</span>}
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
                <p className="text-xs text-gray-500 mt-1">開始時間と所要時間から自動計算されます</p>
              </div>
            </div>

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

        {/* 画像アップロード（テンプレートの場合は元の画像がコピーされる） */}
        {templateSource ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">画像</p>
            {templateSource.images && templateSource.images.length > 0 ? (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  テンプレート元の画像（{templateSource.images.length}枚）がそのままコピーされます
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {templateSource.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="h-20 w-20 object-cover rounded border border-gray-300 shrink-0"
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">テンプレート元に画像がありません</p>
            )}
          </div>
        ) : (
          <ServiceImageUploader
            onImagesChange={(files) => setPendingImages(files)}
          />
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          サービスは「下書き」として作成されます。公開するには、作成後にサービス管理画面から「公開申請」を行ってください。管理者の承認後に公開されます。
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? '作成中...' : templateSource ? 'テンプレートから作成' : 'サービスを作成'}
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
