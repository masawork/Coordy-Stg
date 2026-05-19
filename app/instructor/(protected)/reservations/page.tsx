'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

interface Reservation {
  id: string;
  scheduledAt: string;
  status: ReservationStatus;
  participants: number;
  notes?: string;
  meetUrl?: string;
  service?: {
    id: string;
    title: string;
    price: number;
    duration: number;
  };
  user?: {
    name: string;
    email: string;
  };
  guestUser?: {
    name: string;
    email: string;
  };
}

const statusConfig: Record<ReservationStatus, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, label: '確認待ち' },
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: '確認済み' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'キャンセル' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: '完了' },
};

export default function InstructorReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reservations?role=instructor');
      if (!res.ok) throw new Error('予約データの取得に失敗しました');
      const data = await res.json();
      setReservations(data.reservations || data || []);
    } catch (err: any) {
      setError(err.message || '予約データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reservationId: string, action: 'confirm' | 'complete' | 'cancel') => {
    const messages: Record<string, string> = {
      confirm: 'この予約を確認済みにしますか？',
      complete: 'この予約を完了にしますか？',
      cancel: 'この予約をキャンセルしますか？この操作は取り消せません。',
    };

    if (!window.confirm(messages[action])) return;

    setActionLoading(reservationId);
    try {
      const endpoints: Record<string, string> = {
        confirm: `/api/reservations/${reservationId}/confirm`,
        complete: `/api/reservations/${reservationId}/complete`,
        cancel: `/api/reservations/${reservationId}/cancel`,
      };
      const res = await fetch(endpoints[action], { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ステータス変更に失敗しました');
      }
      await loadReservations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReservations = statusFilter === 'all'
    ? reservations
    : reservations.filter((r) => r.status === statusFilter);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerName = (reservation: Reservation) => {
    return reservation.user?.name || reservation.guestUser?.name || 'ゲスト';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <p className="text-sm text-gray-600 mt-1">受け付けた予約を確認・管理します</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* フィルター */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500" />
        {[
          { value: 'all', label: 'すべて' },
          { value: 'PENDING', label: '確認待ち' },
          { value: 'CONFIRMED', label: '確認済み' },
          { value: 'COMPLETED', label: '完了' },
          { value: 'CANCELLED', label: 'キャンセル' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              statusFilter === filter.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
            {filter.value !== 'all' && (
              <span className="ml-1 text-xs">
                ({reservations.filter((r) => r.status === filter.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {statusFilter === 'all' ? '予約はまだありません' : '該当する予約はありません'}
          </h2>
          <p className="text-gray-500">
            サービスが予約されると、ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .map((reservation) => {
              const config = statusConfig[reservation.status] || statusConfig.PENDING;
              const StatusIcon = config.icon;
              const isPast = new Date(reservation.scheduledAt) < new Date();

              return (
                <div key={reservation.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-green-100 rounded-full p-3 shrink-0">
                        <Calendar className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {reservation.service?.title || 'サービス'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDateTime(reservation.scheduledAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {getCustomerName(reservation)}
                          </span>
                          {reservation.participants > 1 && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {reservation.participants}名
                            </span>
                          )}
                        </div>
                        {reservation.notes && (
                          <p className="text-xs text-gray-400 mt-1 truncate">備考: {reservation.notes}</p>
                        )}
                        {reservation.meetUrl && reservation.status === 'CONFIRMED' && (
                          <a
                            href={reservation.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Google Meetに参加
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                      {reservation.service?.price != null && (
                        <span className="text-sm font-semibold text-gray-900">
                          ¥{(reservation.service.price * reservation.participants).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      {reservation.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(reservation.id, 'confirm')}
                          disabled={actionLoading === reservation.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === reservation.id ? '処理中...' : '予約を確認'}
                        </Button>
                      )}
                      {reservation.status === 'CONFIRMED' && isPast && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(reservation.id, 'complete')}
                          disabled={actionLoading === reservation.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {actionLoading === reservation.id ? '処理中...' : '完了にする'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(reservation.id, 'cancel')}
                        disabled={actionLoading === reservation.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        キャンセル
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
