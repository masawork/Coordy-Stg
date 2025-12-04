'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getTransactionHistory } from '@/lib/api/wallet';
import { ArrowDownCircle, ArrowUpCircle, XCircle, Clock } from 'lucide-react';

export default function ActivityPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login/user');
      return;
    }

    loadActivity(session.userId);
  }, [router]);

  const loadActivity = async (userId: string) => {
    try {
      setLoading(true);

      const history = await getTransactionHistory(userId);
      setTransactions(history);
    } catch (err) {
      console.error('活動履歴取得エラー:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'charge') {
      return status === 'pending' ? Clock : ArrowDownCircle;
    } else if (type === 'use') {
      return ArrowUpCircle;
    } else if (type === 'expired') {
      return XCircle;
    }
    return ArrowDownCircle;
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return 'text-yellow-600';
    if (status === 'failed') return 'text-red-600';
    if (type === 'charge') return 'text-green-600';
    if (type === 'use') return 'text-blue-600';
    if (type === 'expired') return 'text-red-600';
    return 'text-gray-600';
  };

  const getTransactionLabel = (type: string, status: string) => {
    if (status === 'pending') return '承認待ち';
    if (status === 'failed') return '失敗';
    if (type === 'charge') return 'チャージ';
    if (type === 'use') return '使用';
    if (type === 'expired') return '失効';
    return 'その他';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">活動履歴</h1>
          <p className="mt-2 text-gray-600">
            ポイントの利用履歴と予約の記録を確認できます
          </p>
        </div>

        {/* タブ */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button className="px-6 py-4 text-purple-600 border-b-2 border-purple-600 font-medium">
                ポイント履歴
              </button>
              <button
                onClick={() => router.push('/user/reservations')}
                className="px-6 py-4 text-gray-500 hover:text-gray-700"
              >
                予約履歴
              </button>
            </nav>
          </div>

          {/* ポイント履歴 */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const Icon = getTransactionIcon(tx.type, tx.status);
                  const color = getTransactionColor(tx.type, tx.status);
                  const label = getTransactionLabel(tx.type, tx.status);

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className={`h-5 w-5 ${color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {tx.description || label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(tx.createdAt)}
                          </p>
                          {tx.expiresAt && (
                            <p className="text-xs text-orange-600 mt-1">
                              有効期限: {new Date(tx.expiresAt).toLocaleDateString('ja-JP')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${color}`}>
                          {tx.type === 'charge' && tx.status !== 'failed' ? '+' : ''}
                          {tx.type === 'use' || tx.type === 'expired' ? '-' : ''}
                          {tx.amount.toLocaleString()}pt
                        </p>
                        {tx.status === 'pending' && (
                          <span className="text-xs text-orange-600">承認待ち</span>
                        )}
                        {tx.status === 'failed' && (
                          <span className="text-xs text-red-600">失敗</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                取引履歴はありません
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
