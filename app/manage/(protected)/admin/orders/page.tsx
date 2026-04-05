'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Search } from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  user: {
    name: string;
    email: string;
  };
  status: string;
  totalAmount: number;
  items: OrderItem[];
  trackingNumber?: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '未確認' },
  { value: 'CONFIRMED', label: '確認済み' },
  { value: 'PROCESSING', label: '処理中' },
  { value: 'SHIPPED', label: '発送済み' },
  { value: 'DELIVERED', label: '配達完了' },
  { value: 'CANCELLED', label: 'キャンセル' },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<Record<string, string>>({});
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadOrders(currentPage);
  }, [statusFilter, currentPage]);

  const loadOrders = async (page: number) => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('注文一覧の取得に失敗しました');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('注文一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : '注文一覧の取得に失敗しました');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    await loadOrders(1);
  };

  const handleStatusChange = async (orderId: string, newStat: string) => {
    setUpdatingId(orderId);
    try {
      const trackingNumber = statusFilter === 'SHIPPED' ? trackingNumbers[orderId] : undefined;

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStat,
          trackingNumber,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '注文の更新に失敗しました');
      }

      await loadOrders(currentPage);
      setNewStatus(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    } catch (err) {
      console.error('注文更新エラー:', err);
      alert(err instanceof Error ? err.message : '注文の更新に失敗しました');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      PENDING: '未確認',
      CONFIRMED: '確認済み',
      PROCESSING: '処理中',
      SHIPPED: '発送済み',
      DELIVERED: '配達完了',
      CANCELLED: 'キャンセル',
    };
    return labels[status] || status;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">注文管理</h1>
        <p className="text-gray-600 mt-1">全注文を管理します</p>
      </div>

      {/* 検索・フィルタ */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 検索 */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-2">
                注文番号 / ユーザー名で検索
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="検索キーワード"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
                >
                  <Search className="h-5 w-5" />
                  検索
                </button>
              </div>
            </div>

            {/* ステータスフィルタ */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-900 mb-2">
                ステータス
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="">すべてのステータス</option>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">エラー</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ローディング */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">注文が見つかりません</p>
        </div>
      ) : (
        <>
          {/* 注文テーブル */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">注文番号</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ユーザー</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">商品数</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">合計</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ステータス</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">注文日</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const nextStatuses = getNextStatuses(order.status);
                  const needsTracking = newStatus[order.id] === 'SHIPPED';

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{order.user.name}</p>
                          <p className="text-gray-600">{order.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.items.length}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ¥{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {nextStatuses.length > 0 ? (
                          <div className="space-y-2">
                            <select
                              value={newStatus[order.id] || ''}
                              onChange={(e) => setNewStatus(prev => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))}
                              className="block w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
                            >
                              <option value="">ステータス変更</option>
                              {nextStatuses.map(status => (
                                <option key={status} value={status}>
                                  {getStatusLabel(status)}
                                </option>
                              ))}
                            </select>

                            {needsTracking && (
                              <input
                                type="text"
                                placeholder="追跡番号"
                                value={trackingNumbers[order.id] || ''}
                                onChange={(e) => setTrackingNumbers(prev => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))}
                                className="block w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
                              />
                            )}

                            {newStatus[order.id] && (
                              <button
                                onClick={() => handleStatusChange(order.id, newStatus[order.id])}
                                disabled={updatingId === order.id}
                                className="block w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
                              >
                                {updatingId === order.id ? '更新中...' : '更新'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">処理完了</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
