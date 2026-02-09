'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listReservations, cancelReservation } from '@/lib/api/reservations';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ReservationStatus } from '@prisma/client';

function ReservationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }

      const reservationData = await listReservations({ userId: session.user.id });
      setReservations(reservationData || []);
    } catch (err) {
      console.error('予約一覧取得エラー:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!confirm('この予約をキャンセルしてもよろしいですか？')) {
      return;
    }

    setCancelingId(reservationId);

    try {
      await cancelReservation(reservationId);
      await loadReservations();
    } catch (err) {
      console.error('予約キャンセルエラー:', err);
      alert('キャンセルに失敗しました');
    } finally {
      setCancelingId(null);
    }
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const styles = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, label: '確認待ち' },
      CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: '確認済み' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'キャンセル' },
      COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: '完了' },
    };

    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <Icon className="h-4 w-4" />
        {style.label}
      </span>
    );
  };

  const showSuccess = searchParams.get('success') === 'true';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">予約一覧</h1>
          <p className="mt-2 text-gray-600">
            あなたの予約を管理できます
          </p>
        </div>

        {/* 成功メッセージ */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-600 font-medium">予約が完了しました！</p>
            <p className="text-green-600 text-sm mt-1">
              クリエイターからの確認をお待ちください。
            </p>
          </div>
        )}

        {/* 予約リスト */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : reservations.length > 0 ? (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {reservation.service?.title || 'サービス'}
                    </h3>
                    {getStatusBadge(reservation.status)}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      ¥{reservation.service?.price?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {reservation.service?.duration || 0}分
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{formatDateTime(reservation.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {reservation.service?.duration || 0}分のサービス
                    </span>
                  </div>
                  {reservation.instructor?.user && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-sm">
                        インストラクター: {reservation.instructor.user.name}
                      </span>
                    </div>
                  )}
                </div>

                {reservation.notes && (
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">備考：</span>
                      {reservation.notes}
                    </p>
                  </div>
                )}

                {/* アクション */}
                {(reservation.status === ReservationStatus.PENDING || reservation.status === ReservationStatus.CONFIRMED) && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCancel(reservation.id)}
                      disabled={cancelingId === reservation.id}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {cancelingId === reservation.id ? 'キャンセル中...' : 'キャンセル'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">予約がまだありません</p>
            <Button
              onClick={() => router.push('/services')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              サービスを探す
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <ReservationsContent />
    </Suspense>
  );
}
