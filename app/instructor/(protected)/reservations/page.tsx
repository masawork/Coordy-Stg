'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

interface ReservationData {
  id: string;
  scheduledAt: string;
  status: ReservationStatus;
  notes?: string | null;
  participants: number;
  meetUrl?: string | null;
  service?: {
    id: string;
    title: string;
    price: number;
    duration: number;
    category: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  guestUser?: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
}

export default function InstructorReservationsPage() {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, [statusFilter]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError('');
      const session = await getSession();
      if (!session?.user) return;

      const params = new URLSearchParams({ role: 'instructor' });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/reservations?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.error || '予約一覧の取得に失敗しました');
      }

      const data = await response.json();
      setReservations(data || []);
    } catch (err) {
      console.error('予約一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : '予約の取得に失敗しました');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reservationId: string, newStatus: ReservationStatus) => {
    const labels: Record<string, string> = {
      CONFIRMED: '確定',
      COMPLETED: '完了',
      CANCELLED: 'キャンセル',
    };
    if (!confirm(`この予約を「${labels[newStatus]}」にしてもよろしいですか？`)) return;

    // ステータスに応じたAPIエンドポイントを決定
    const actionMap: Record<string, string> = {
      CONFIRMED: 'confirm',
      COMPLETED: 'complete',
      CANCELLED: 'cancel',
    };
    const action = actionMap[newStatus];

    setUpdatingId(reservationId);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || data.error || 'ステータス更新に失敗しました');
      }

      await loadReservations();
    } catch (err) {
      console.error('ステータス更新エラー:', err);
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
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

  const getClientName = (reservation: ReservationData) => {
    if (reservation.user) return reservation.user.name;
    if (reservation.guestUser) return `${reservation.guestUser.name}（ゲスト）`;
    return '不明';
  };

  const getClientEmail = (reservation: ReservationData) => {
    if (reservation.user) return reservation.user.email;
    if (reservation.guestUser) return reservation.guestUser.email;
    return '';
  };

  const statusFilters = [
    { value: 'all', label: 'すべて' },
    { value: 'PENDING', label: '確認待ち' },
    { value: 'CONFIRMED', label: '確認済み' },
    { value: 'COMPLETED', label: '完了' },
    { value: 'CANCELLED', label: 'キャンセル' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <p className="text-sm text-gray-600 mt-1">受け付けた予約を確認・管理します</p>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            予約はまだありません
          </h2>
          <p className="text-gray-500">
            サービスが予約されると、ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {reservation.service?.title || 'サービス'}
                  </h3>
                  <div className="mt-1">
                    {getStatusBadge(reservation.status)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    ¥{((reservation.service?.price || 0) * reservation.participants).toLocaleString()}
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
                  <User className="h-4 w-4" />
                  <span className="text-sm">{getClientName(reservation)}</span>
                  {getClientEmail(reservation) && (
                    <span className="text-sm text-gray-400">({getClientEmail(reservation)})</span>
                  )}
                </div>
                {reservation.participants > 1 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{reservation.participants}名</span>
                  </div>
                )}
                {reservation.meetUrl && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <a
                      href={reservation.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Google Meetリンク
                    </a>
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

              {/* アクションボタン */}
              <div className="flex gap-2 flex-wrap">
                {reservation.status === 'PENDING' && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate(reservation.id, 'CONFIRMED')}
                      disabled={updatingId === reservation.id}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updatingId === reservation.id ? '処理中...' : '確定する'}
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(reservation.id, 'CANCELLED')}
                      disabled={updatingId === reservation.id}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      キャンセル
                    </Button>
                  </>
                )}
                {reservation.status === 'CONFIRMED' && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate(reservation.id, 'COMPLETED')}
                      disabled={updatingId === reservation.id}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {updatingId === reservation.id ? '処理中...' : '完了にする'}
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(reservation.id, 'CANCELLED')}
                      disabled={updatingId === reservation.id}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      キャンセル
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
