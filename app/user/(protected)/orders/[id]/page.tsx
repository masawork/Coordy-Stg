'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { getOrder, cancelOrder, Order } from '@/lib/api/orders-client';
import { ArrowLeft, AlertCircle, CheckCircle, Package, Truck, Home, Clock, XCircle } from 'lucide-react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

interface StatusStep {
  id: OrderStatus;
  label: string;
  icon: any;
}

const STATUS_TIMELINE: StatusStep[] = [
  { id: 'PENDING', label: '注文受付', icon: Package },
  { id: 'CONFIRMED', label: '確認済み', icon: CheckCircle },
  { id: 'PROCESSING', label: '処理中', icon: Clock },
  { id: 'SHIPPED', label: '発送済み', icon: Truck },
  { id: 'DELIVERED', label: '配達完了', icon: Home },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getOrder(id);
      setOrder(data);
    } catch (err) {
      console.error('注文詳細取得エラー:', err);
      setError(err instanceof Error ? err.message : '注文の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await cancelOrder(id);
      setShowCancelConfirm(false);
      await loadOrder();
    } catch (err) {
      console.error('キャンセルエラー:', err);
      alert(err instanceof Error ? err.message : 'キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusIndex = (status: OrderStatus): number => {
    return STATUS_TIMELINE.findIndex(s => s.id === status);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const canCancelOrder = order && ['PENDING', 'CONFIRMED'].includes(order.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          戻る
        </button>
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-700">{error || '注文が見つかりません'}</p>
        </div>
      </div>
    );
  }

  const statusIndex = getStatusIndex(order.status as OrderStatus);
  const currentStep = STATUS_TIMELINE.find(s => s.id === order.status);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        注文一覧に戻る
      </button>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">注文詳細</h1>
            <p className="text-gray-600 mt-1">注文番号: {order.orderNumber}</p>
          </div>
          <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${
            ['CANCELLED', 'REFUNDED'].includes(order.status) 
              ? 'bg-gray-100' 
              : 'bg-green-100'
          }`}>
            <span className={`text-sm font-medium ${
              ['CANCELLED', 'REFUNDED'].includes(order.status)
                ? 'text-gray-800'
                : 'text-green-800'
            }`}>
              {(() => {
                const labels: Record<string, string> = {
                  PENDING: '未確認',
                  CONFIRMED: '確認済み',
                  PROCESSING: '処理中',
                  SHIPPED: '発送済み',
                  DELIVERED: '配達完了',
                  CANCELLED: 'キャンセル',
                  REFUNDED: '返金',
                };
                return labels[order.status] || order.status;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* ステータスタイムライン */}
      {!['CANCELLED', 'REFUNDED'].includes(order.status) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">配送状況</h2>
          <div className="space-y-4">
            {STATUS_TIMELINE.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= statusIndex;
              const isCurrent = idx === statusIndex;

              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {idx < STATUS_TIMELINE.length - 1 && (
                      <div className={`h-8 w-0.5 my-2 ${
                        isCompleted ? 'bg-purple-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className={`font-medium ${
                      isCurrent ? 'text-purple-600' : isCompleted ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-sm text-gray-600 mt-1">{formatDate(order.createdAt)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 追跡番号 */}
          {order.trackingNumber && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">追跡番号</p>
              <p className="font-mono text-lg font-semibold text-gray-900">{order.trackingNumber}</p>
            </div>
          )}
        </div>
      )}

      {/* 商品一覧 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">注文商品</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {order.items.map((item) => (
            <div key={item.id} className="px-6 py-4 flex gap-4">
              {item.product.images?.[0]?.url && (
                <img
                  src={item.product.images[0].url}
                  alt={item.product.name}
                  className="h-20 w-20 object-cover rounded bg-gray-100 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{item.product.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  数量: {item.quantity}個 × ¥{item.unitPrice.toLocaleString()}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-gray-900">
                  ¥{item.subtotal.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 配送先 */}
      {order.shippingAddress && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">配送先住所</h2>
          <div className="space-y-2 text-gray-700">
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.postalCode}</p>
            <p>{order.shippingAddress.prefecture}{order.shippingAddress.city}{order.shippingAddress.street}</p>
            {order.shippingAddress.building && <p>{order.shippingAddress.building}</p>}
            <p className="mt-4">{order.shippingAddress.phoneNumber}</p>
          </div>
        </div>
      )}

      {/* 支払い情報 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">お支払い</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">小計</span>
            <span className="text-gray-900">¥{order.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">送料</span>
            <span className="text-gray-900">¥{order.shippingCost.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between">
            <span className="font-semibold text-gray-900">合計</span>
            <span className="text-xl font-bold text-purple-600">¥{order.totalAmount.toLocaleString()}</span>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            支払い方法: {order.paymentMethod || '指定なし'}
          </p>
        </div>
      </div>

      {/* キャンセルボタン */}
      {canCancelOrder && (
        <div className="mb-8">
          {showCancelConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-900 font-medium mb-4">
                この注文をキャンセルしてもよろしいですか？キャンセルは取り消せません。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {cancelling ? 'キャンセル中...' : 'キャンセルを確定'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
                >
                  戻る
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              この注文をキャンセル
            </button>
          )}
        </div>
      )}

      {order.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>メモ:</strong> {order.notes}
          </p>
        </div>
      )}
    </div>
  );
}
