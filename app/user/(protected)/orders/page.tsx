'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrders, Order } from '@/lib/api/orders-client';
import { Package, AlertCircle, CheckCircle, Truck, Home, XCircle } from 'lucide-react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

interface OrderTab {
  id: string;
  label: string;
  statuses: OrderStatus[];
}

const ORDER_TABS: OrderTab[] = [
  { id: 'all', label: '全て', statuses: [] },
  { id: 'processing', label: '処理中', statuses: ['PENDING', 'CONFIRMED', 'PROCESSING'] },
  { id: 'shipped', label: '発送済み', statuses: ['SHIPPED'] },
  { id: 'completed', label: '完了', statuses: ['DELIVERED'] },
  { id: 'cancelled', label: 'キャンセル', statuses: ['CANCELLED', 'REFUNDED'] },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => {
    loadOrders(currentPage);
  }, [currentTab, currentPage]);

  const loadOrders = async (page: number) => {
    try {
      setLoading(true);
      setError('');

      const selectedTab = ORDER_TABS.find(t => t.id === currentTab);
      const status = selectedTab?.statuses.length ? selectedTab.statuses[0] : undefined;

      const response = await getOrders({
        status,
        page,
        limit: 10,
      });

      setOrders(response.orders || []);
      setPagination(response.pagination);
    } catch (err) {
      console.error('注文一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : '注文一覧の取得に失敗しました');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: OrderStatus): { bg: string; text: string; icon: any } => {
    const colors: Record<OrderStatus, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Package },
      SHIPPED: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck },
      DELIVERED: { bg: 'bg-green-100', text: 'text-green-800', icon: Home },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
      REFUNDED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };
    return colors[status];
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      PENDING: '未確認',
      CONFIRMED: '確認済み',
      PROCESSING: '処理中',
      SHIPPED: '発送済み',
      DELIVERED: '配達完了',
      CANCELLED: 'キャンセル',
      REFUNDED: '返金',
    };
    return labels[status];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/user/orders/${orderId}`);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">注文履歴</h1>
        <p className="mt-1 text-gray-600">あなたの注文一覧</p>
      </div>

      {/* ステータスフィルタ */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {ORDER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentTab(tab.id);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              currentTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">注文履歴がありません</p>
        </div>
      ) : (
        <>
          {/* 注文一覧 */}
          <div className="space-y-4">
            {orders.map((order) => {
              const statusColor = getStatusBadgeColor(order.status as OrderStatus);
              const StatusIcon = statusColor.icon;
              const displayItems = order.items.slice(0, 2);
              const remainingCount = Math.max(0, order.items.length - 2);

              return (
                <div
                  key={order.id}
                  onClick={() => handleOrderClick(order.id)}
                  className="bg-white rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer p-4 sm:p-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">注文番号</p>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div>
                        <p className="text-sm text-gray-600">注文日</p>
                        <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${statusColor.bg}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className={`text-sm font-medium ${statusColor.text}`}>
                          {getStatusLabel(order.status as OrderStatus)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 商品一覧 */}
                  <div className="mb-4 pb-4 border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600 mb-2">商品</p>
                    <div className="space-y-2">
                      {displayItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                          {item.product.images?.[0]?.url && (
                            <img
                              src={item.product.images[0].url}
                              alt={item.product.name}
                              className="h-12 w-12 object-cover rounded bg-gray-100"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-gray-600">数量: {item.quantity}個</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                            ¥{item.subtotal.toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {remainingCount > 0 && (
                        <p className="text-sm text-gray-600">他 {remainingCount} 件</p>
                      )}
                    </div>
                  </div>

                  {/* 合計金額 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">合計金額</span>
                    <span className="text-lg font-bold text-gray-900">
                      ¥{order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
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
                {pagination.totalPages > 5 && (
                  <span className="px-2 text-gray-600">...</span>
                )}
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
