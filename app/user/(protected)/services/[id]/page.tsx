'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getService } from '@/lib/api/services';
import { getInstructor } from '@/lib/api/instructors';
import { getClientWallet } from '@/lib/api/wallet';
import { createReservation } from '@/lib/api/reservations';
import { usePoints } from '@/lib/api/wallet';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Tag, ArrowLeft } from 'lucide-react';

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<any>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 予約フォームの状態
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [participants, setParticipants] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login/user');
      return;
    }

    loadServiceDetail(session.userId);
  }, [router, serviceId]);

  const loadServiceDetail = async (userId: string) => {
    try {
      setLoading(true);

      // サービス取得
      const serviceData = await getService(serviceId);
      if (!serviceData) {
        setError('サービスが見つかりませんでした');
        return;
      }
      setService(serviceData);

      // インストラクター取得
      const instructorData = await getInstructor(serviceData.instructorId);
      setInstructor(instructorData);

      // ウォレット取得
      const walletData = await getClientWallet(userId);
      setWallet(walletData);
    } catch (err) {
      console.error('サービス詳細取得エラー:', err);
      setError('サービス情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = async () => {
    const session = getSession();
    if (!session) return;

    if (!selectedDate || !selectedTime) {
      setError('日時を選択してください');
      return;
    }

    const totalPrice = service.basePrice * participants;

    // ポイント残高チェック
    if ((wallet?.balance || 0) < totalPrice) {
      setError('ポイント残高が不足しています');
      return;
    }

    setReserving(true);
    setError(null);

    try {
      // 予約日時を組み立て
      const startTime = new Date(`${selectedDate}T${selectedTime}`);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      // 予約作成
      const reservation = await createReservation({
        userId: session.userId,
        serviceId: service.id,
        instructorId: service.instructorId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        participants,
        price: totalPrice,
        notes,
      });

      // ポイント使用
      await usePoints(
        session.userId,
        totalPrice,
        `サービス予約: ${service.title}`
      );

      // 予約一覧ページへ遷移
      router.push('/user/reservations?success=true');
    } catch (err: any) {
      console.error('予約エラー:', err);
      setError('予約に失敗しました。もう一度お試しください。');
    } finally {
      setReserving(false);
    }
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

  const totalPrice = service ? service.basePrice * participants : 0;
  const hasEnoughPoints = (wallet?.balance || 0) >= totalPrice;

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
          {/* サービス画像 */}
          {service.image && (
            <img
              src={service.image}
              alt={service.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          )}

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
                {service.basePrice.toLocaleString()}pt
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

        {/* 予約フォーム */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">予約する</h2>

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

          <div className="space-y-4">
            {/* 日付選択 */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                日付
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 時刻選択 */}
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                時刻
              </label>
              <input
                type="time"
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

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
                {Array.from({ length: service.maxParticipants }, (_, i) => i + 1).map((n) => (
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
                <span className="text-gray-600">現在の残高</span>
                <span className={hasEnoughPoints ? 'text-green-600' : 'text-red-600'}>
                  {(wallet?.balance || 0).toLocaleString()}pt
                </span>
              </div>
            </div>

            {/* 予約ボタン */}
            <Button
              onClick={handleReservation}
              disabled={reserving || !hasEnoughPoints || !selectedDate || !selectedTime}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {reserving ? '予約中...' : '予約を確定する'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
