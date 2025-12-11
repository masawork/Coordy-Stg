/**
 * クライアントダッシュボード
 * 予約、TODO、カレンダーの概要を表示
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listReservations, type Reservation } from '@/lib/api';
import { listTodos, type Todo } from '@/lib/api';
import { listServices } from '@/lib/api/services';
import { getFavoriteCreators } from '@/lib/api/favorites';
import { getInstructor } from '@/lib/api/instructors';
import { getClientProfile } from '@/lib/api/profile';
import type { User } from '@/lib/auth';
import { ServiceCard } from '@/components/features/service/ServiceCard';
import { resolveDisplayName } from '@/lib/auth/displayName';

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [recommendedServices, setRecommendedServices] = useState<any[]>([]);
  const [favoriteCreatorServices, setFavoriteCreatorServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
      loadDisplayName(session);
      loadData(session.userId);
    }
  }, []);

  const loadDisplayName = async (session: User) => {
    try {
      const profile = await getClientProfile(session.userId);
      setDisplayName(resolveDisplayName(session, profile ?? undefined));
    } catch (err) {
      console.warn('表示名取得エラー:', err);
      setDisplayName(resolveDisplayName(session));
    }
  };

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 ダッシュボードデータ読み込み開始:', { userId });

      // 予約データ取得（ステータスがpendingまたはconfirmedのもの）
      try {
        const reservationData = await listReservations({ userId });
        const upcomingReservations = (reservationData || [])
          .filter(r => r.status === 'pending' || r.status === 'confirmed')
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 3);
        setReservations(upcomingReservations);
        console.log('✅ 予約データ取得成功:', upcomingReservations.length, '件');
      } catch (err) {
        console.warn('⚠️ 予約データ取得スキップ（テーブル未作成の可能性）:', err);
        setReservations([]);
      }

      // TODOデータ取得（未完了のもの）
      try {
        const todoData = await listTodos({ userId, isCompleted: false });
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const sortedTodos = (todoData || [])
          .sort((a, b) => {
            const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
            const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
            if (priorityA !== priorityB) return priorityA - priorityB;
            if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
            return 0;
          })
          .slice(0, 5);
        setTodos(sortedTodos);
        console.log('✅ TODOデータ取得成功:', sortedTodos.length, '件');
      } catch (err) {
        console.warn('⚠️ TODOデータ取得スキップ（テーブル未作成の可能性）:', err);
        setTodos([]);
      }

      // おすすめサービス取得（最新の公開サービスを取得）
      try {
        const allServices = await listServices({ status: 'active' });
        const recommended = (allServices || [])
          .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
          .slice(0, 6);

        // インストラクター情報を追加
        const servicesWithInstructor = await Promise.all(
          recommended.map(async (service) => {
            try {
              const instructor = await getInstructor(service.instructorId);
              return {
                ...service,
                instructorName: instructor?.displayName || 'クリエイター',
              };
            } catch {
              return {
                ...service,
                instructorName: 'クリエイター',
              };
            }
          })
        );

        setRecommendedServices(servicesWithInstructor);
        console.log('✅ おすすめサービス取得成功:', servicesWithInstructor.length, '件');
      } catch (err) {
        console.warn('⚠️ おすすめサービス取得スキップ:', err);
        setRecommendedServices([]);
      }

      // お気に入りクリエイターのサービス取得
      try {
        const favorites = await getFavoriteCreators(userId);
        if (favorites.length > 0) {
          const instructorIds = favorites.map((fav) => fav.instructorId);
          const allServices = await listServices({ status: 'active' });
          const favoriteServices = (allServices || [])
            .filter((service) => instructorIds.includes(service.instructorId))
            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .slice(0, 6);

          // インストラクター情報を追加
          const servicesWithInstructor = await Promise.all(
            favoriteServices.map(async (service) => {
              try {
                const instructor = await getInstructor(service.instructorId);
                return {
                  ...service,
                  instructorName: instructor?.displayName || 'クリエイター',
                };
              } catch {
                return {
                  ...service,
                  instructorName: 'クリエイター',
                };
              }
            })
          );

          setFavoriteCreatorServices(servicesWithInstructor);
          console.log('✅ お気に入りクリエイターのサービス取得成功:', servicesWithInstructor.length, '件');
        }
      } catch (err) {
        console.warn('⚠️ お気に入りクリエイターのサービス取得スキップ:', err);
        setFavoriteCreatorServices([]);
      }

      console.log('✅ ダッシュボードデータ読み込み完了');
    } catch (err: any) {
      console.error('❌ ダッシュボードデータ読み込みエラー:', err);
      // エラーが発生しても画面は表示する（データが空の状態で）
      setError(null); // エラーメッセージは表示しない
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityBadge = (priority?: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    const labels = {
      urgent: '緊急',
      high: '高',
      medium: '中',
      low: '低',
    };
    const color = colors[priority as keyof typeof colors] || colors.medium;
    const label = labels[priority as keyof typeof labels] || '中';
    return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>;
  };

  return (
    <div className="space-y-8">
      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          ようこそ、{displayName || 'ゲスト'}さん！
        </h1>
        <p className="text-purple-100">
          今日も素晴らしい一日にしましょう
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* ダッシュボードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 予約カード */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            次の予約
          </h2>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : reservations.length > 0 ? (
            <div className="space-y-3">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="border-l-4 border-purple-500 pl-3 py-2">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateTime(reservation.startTime)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {reservation.status === 'pending' ? '確認待ち' : '確認済み'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              予約はまだありません
            </p>
          )}
        </div>

        {/* TODOカード */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            今日のTODO
          </h2>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : todos.length > 0 ? (
            <div className="space-y-3">
              {todos.map((todo) => (
                <div key={todo.id} className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {todo.title}
                    </p>
                    {todo.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(todo.date).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                  {todo.priority && getPriorityBadge(todo.priority)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              TODOはまだありません
            </p>
          )}
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            クイックアクション
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/user/services')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              サービスを探す
            </button>
            <button
              onClick={() => router.push('/user/reservations')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              予約を見る
            </button>
          </div>
        </div>
      </div>

      {/* あなたへのおすすめサービス */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            あなたへのおすすめサービス
          </h2>
          <button
            onClick={() => router.push('/user/services')}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            すべて見る →
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : recommendedServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            おすすめのサービスはまだありません
          </p>
        )}
      </div>

      {/* お気に入りクリエイターのサービス */}
      {favoriteCreatorServices.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              お気に入りクリエイターのサービス
            </h2>
            <button
              onClick={() => router.push('/user/favorites')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              お気に入り管理 →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteCreatorServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      )}

      {/* カレンダーセクション（今後実装） */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          カレンダー
        </h2>
        <p className="text-gray-500">
          カレンダー機能は今後実装予定です
        </p>
      </div>
    </div>
  );
}
