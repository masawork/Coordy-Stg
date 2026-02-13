'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getService } from '@/lib/api/services';
import { getWallet, getPaymentMethods } from '@/lib/api/wallet-client';
import { createReservation } from '@/lib/api/reservations-client';
import { getServiceSchedules, ScheduleSlot, formatDateShort } from '@/lib/api/schedules-client';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Tag, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { ServiceImageGallery } from '@/components/features/service/ServiceImageGallery';

interface PaymentMethodData {
  id: string;
  cardBrand: string | null;
  cardLast4: string | null;
  isDefault: boolean;
}

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<any>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // カレンダー表示用
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSlot | null>(null);

  // 予約フォームの状態
  const [participants, setParticipants] = useState(1);
  const [notes, setNotes] = useState('');

  // 支払い方法の状態
  const [paymentMethodType, setPaymentMethodType] = useState<'points' | 'credit'>('points');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }

      loadServiceDetail(session.user.id);
    };
    loadData();
  }, [router, serviceId]);

  // 月が変わったらスケジュールを再取得
  useEffect(() => {
    if (service) {
      loadSchedules();
    }
  }, [currentMonth, service]);

  const loadServiceDetail = async (userId: string) => {
    try {
      setLoading(true);

      // サービス取得（instructorを含む）
      const serviceData = await getService(serviceId);
      if (!serviceData) {
        setError('サービスが見つかりませんでした');
        return;
      }
      setService(serviceData);

      // インストラクターはサービスAPIレスポンスに含まれている
      if (serviceData.instructor) {
        setInstructor(serviceData.instructor);
      }

      // ウォレット取得
      try {
        const walletData = await getWallet(userId);
        setWallet(walletData);
      } catch (walletErr) {
        console.error('ウォレット取得エラー:', walletErr);
        // ウォレットがなくても続行
      }

      // 登録済みカード取得
      try {
        const cards = await getPaymentMethods();
        setPaymentMethods(cards || []);
        // デフォルトカードを選択
        const defaultCard = cards?.find((c: PaymentMethodData) => c.isDefault);
        if (defaultCard) {
          setSelectedPaymentMethodId(defaultCard.id);
        }
      } catch (cardErr) {
        console.error('カード取得エラー:', cardErr);
      }
    } catch (err) {
      console.error('サービス詳細取得エラー:', err);
      setError('サービス情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      setSchedulesLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const from = new Date(year, month, 1).toISOString().split('T')[0];
      const to = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const data = await getServiceSchedules(serviceId, from, to);
      setSchedules(data.schedules);
    } catch (err) {
      console.error('スケジュール取得エラー:', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  // カレンダーの日付を生成
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // 月の最初の日の曜日まで空白を追加
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 月の日付を追加
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // 特定の日のスケジュールを取得
  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((s) => {
      const scheduleDate = new Date(s.date);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const handleReservation = async () => {
    const session = await getSession();
    if (!session) return;

    if (!selectedSchedule) {
      setError('開催日時を選択してください');
      return;
    }

    const totalPrice = (service.price ?? 0) * participants;

    // 支払い方法の検証
    if (paymentMethodType === 'points') {
      if ((wallet?.balance || 0) < totalPrice) {
        setError('ポイント残高が不足しています。クレジットカード決済を選択するか、ポイントをチャージしてください。');
        return;
      }
    } else if (paymentMethodType === 'credit') {
      if (paymentMethods.length === 0) {
        setError('クレジットカードが登録されていません。先にカードを登録してください。');
        return;
      }
    }

    setReserving(true);
    setError(null);
    setSuccess(null);

    try {
      // 予約日時を組み立て
      const [hours, minutes] = selectedSchedule.startTime.split(':').map(Number);
      const startTime = new Date(selectedSchedule.date);
      startTime.setHours(hours, minutes, 0, 0);

      // 予約作成（APIを通して決済も行う）
      const result = await createReservation({
        serviceId: service.id,
        scheduledAt: startTime.toISOString(),
        notes,
        participants,
        paymentMethod: paymentMethodType,
        paymentMethodId: paymentMethodType === 'credit' ? (selectedPaymentMethodId || undefined) : undefined,
      });

      if (!result.success) {
        if (result.error?.includes('残高が不足')) {
          setError(`ポイント残高が不足しています。必要: ${result.required?.toLocaleString()}pt / 残高: ${result.balance?.toLocaleString()}pt`);
        } else {
          setError(result.error || '予約に失敗しました');
        }
        return;
      }

      if (result.requiresAction) {
        setError('追加の認証が必要です。カード会社の認証を完了してください。');
        return;
      }

      // 予約一覧ページへ遷移
      router.push('/user/reservations?success=true');
    } catch (err: any) {
      console.error('予約エラー:', err);
      setError('予約に失敗しました。もう一度お試しください。');
    } finally {
      setReserving(false);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedSchedule(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedSchedule(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !service) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
          <Button
            onClick={() => router.push('/user/services')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            サービス一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const totalPrice = service ? (service.price ?? 0) * participants : 0;
  const hasEnoughPoints = (wallet?.balance || 0) >= totalPrice;
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 戻るボタン */}
        <Button
          onClick={() => router.push('/user/services')}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          サービス一覧に戻る
        </Button>

        {/* サービス情報 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* サービス画像ギャラリー */}
          <ServiceImageGallery
            images={service.images || []}
            title={service.title}
            category={service.category}
          />

          {/* タイトルとカテゴリー */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {service.category === 'yoga' && 'ヨガ'}
                {service.category === 'personalTraining' && 'パーソナルトレーニング'}
                {service.category === 'pilates' && 'ピラティス'}
                {service.category === 'other' && 'その他'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
          </div>

          {/* 説明 */}
          <p className="text-gray-700 leading-relaxed">{service.description}</p>

          {/* 詳細情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5 text-purple-600" />
              <span>{service.duration}分</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-5 w-5 text-purple-600" />
              <span>最大{service.maxParticipants}名</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Tag className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-lg text-purple-600">
                {(service.price ?? 0).toLocaleString()}pt
              </span>
            </div>
          </div>

          {/* タグ */}
          {service.tags && service.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {service.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* クリエイター情報 */}
        {instructor && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              クリエイター情報
            </h2>
            <div className="flex items-start gap-4">
              {instructor.profileImage && (
                <img
                  src={instructor.profileImage}
                  alt={instructor.displayName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {instructor.displayName}
                </h3>
                <p className="text-gray-600 text-sm mt-1">{instructor.bio}</p>
                {instructor.specialties && instructor.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {instructor.specialties.map((specialty: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 予約フォーム - カレンダー式 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            開催日時を選択
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
              {!hasEnoughPoints && (
                <Button
                  onClick={() => router.push('/user/wallet')}
                  className="ml-2 text-sm"
                  variant="outline"
                  size="sm"
                >
                  ポイントをチャージする
                </Button>
              )}
            </div>
          )}

          {/* カレンダー */}
          <div className="mb-6">
            {/* カレンダーヘッダー */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-semibold">
                {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium py-2 ${
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* カレンダー日付 */}
            {schedulesLoading ? (
              <div className="py-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2">読み込み中...</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="aspect-square" />;
                  }

                  const daySchedules = getSchedulesForDate(date);
                  const hasSchedules = daySchedules.length > 0;
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={index}
                      className={`aspect-square p-1 rounded-lg border ${
                        hasSchedules && !isPast
                          ? 'border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100'
                          : 'border-transparent'
                      } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
                    >
                      <div className={`text-sm text-center ${
                        isPast ? 'text-gray-300' :
                        index % 7 === 0 ? 'text-red-500' :
                        index % 7 === 6 ? 'text-blue-500' : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </div>
                      {hasSchedules && !isPast && (
                        <div className="mt-1 space-y-0.5">
                          {daySchedules.slice(0, 2).map((schedule) => (
                            <button
                              key={schedule.id}
                              onClick={() => setSelectedSchedule(schedule)}
                              className={`w-full text-xs px-1 py-0.5 rounded ${
                                selectedSchedule?.id === schedule.id
                                  ? 'bg-purple-600 text-white'
                                  : schedule.availableSlots > 0
                                    ? 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                              disabled={schedule.availableSlots <= 0}
                            >
                              {schedule.startTime}
                            </button>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-xs text-center text-purple-600">
                              +{daySchedules.length - 2}件
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 選択された日時 */}
          {selectedSchedule && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-purple-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">選択中の日時:</span>
                <span>
                  {formatDateShort(selectedSchedule.date)} {selectedSchedule.startTime}〜{selectedSchedule.endTime || ''}
                </span>
              </div>
              {selectedSchedule.availableSlots !== undefined && (
                <p className="text-sm text-purple-600 mt-1">
                  残り{selectedSchedule.availableSlots}枠
                </p>
              )}
            </div>
          )}

          {schedules.length === 0 && !schedulesLoading && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">この月には開催予定がありません</p>
              <p className="text-sm text-gray-500">別の月を選択してください</p>
            </div>
          )}

          <div className="space-y-4">
            {/* 参加人数 */}
            <div>
              <label htmlFor="participants" className="block text-sm font-medium text-gray-700 mb-1">
                参加人数
              </label>
              <select
                id="participants"
                value={participants}
                onChange={(e) => setParticipants(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({ length: Math.min(service.maxParticipants, selectedSchedule?.availableSlots || service.maxParticipants) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}名
                  </option>
                ))}
              </select>
            </div>

            {/* 備考 */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                備考（任意）
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="特別なリクエストや質問があればご記入ください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 料金表示 */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">合計料金</span>
                <span className="text-2xl font-bold text-purple-600">
                  {totalPrice.toLocaleString()}pt
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">現在のポイント残高</span>
                <span className={hasEnoughPoints ? 'text-green-600' : 'text-red-600'}>
                  {(wallet?.balance || 0).toLocaleString()}pt
                </span>
              </div>
            </div>

            {/* 支払い方法選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支払い方法
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('points')}
                  disabled={!hasEnoughPoints}
                  className={`p-3 border-2 rounded-lg transition-colors flex items-center gap-2 ${
                    paymentMethodType === 'points'
                      ? 'border-purple-600 bg-purple-50'
                      : !hasEnoughPoints
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Wallet className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">ポイントで支払う</p>
                    {!hasEnoughPoints && (
                      <p className="text-xs text-red-500">残高不足</p>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethodType('credit')}
                  className={`p-3 border-2 rounded-lg transition-colors flex items-center gap-2 ${
                    paymentMethodType === 'credit'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">カードで支払う</p>
                    <p className="text-xs text-gray-500">即時決済</p>
                  </div>
                </button>
              </div>
            </div>

            {/* クレジットカード選択 */}
            {paymentMethodType === 'credit' && (
              <div>
                {paymentMethods.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">カードが登録されていません</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">
                      クレジットカードで支払うには、先にカードを登録してください。
                    </p>
                    <Link
                      href="/user/payment-methods"
                      className="inline-block mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      カードを登録する →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods.map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethodId(pm.id)}
                        className={`w-full p-3 border-2 rounded-lg flex items-center justify-between transition-colors ${
                          selectedPaymentMethodId === pm.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium">
                            {pm.cardBrand?.toUpperCase()} ****{pm.cardLast4}
                          </span>
                        </div>
                        {pm.isDefault && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            デフォルト
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ポイント不足時の案内 */}
            {!hasEnoughPoints && paymentMethodType === 'points' && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">ポイント残高が不足しています</span>
                </div>
                <p className="text-sm text-orange-700">
                  不足分: {(totalPrice - (wallet?.balance || 0)).toLocaleString()}pt
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/user/wallet"
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    ポイントをチャージする →
                  </Link>
                  <span className="text-gray-400">または</span>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('credit')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    カードで支払う
                  </button>
                </div>
              </div>
            )}

            {/* 予約ボタン */}
            <Button
              onClick={handleReservation}
              disabled={
                reserving ||
                !selectedSchedule ||
                (paymentMethodType === 'points' && !hasEnoughPoints) ||
                (paymentMethodType === 'credit' && paymentMethods.length === 0)
              }
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {reserving ? '予約中...' : (
                paymentMethodType === 'credit'
                  ? `カードで${totalPrice.toLocaleString()}円を支払って予約する`
                  : `${totalPrice.toLocaleString()}ポイントで予約する`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
