'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, hasRole } from '@/lib/auth';
import { getPendingCharges, approveCharge, rejectCharge } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, User, DollarSign } from 'lucide-react';

export default function PendingChargesPage() {
  const router = useRouter();
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const session = getSession();

      if (!session || !hasRole('admin')) {
        router.push('/login/user');
        return;
      }

      loadPendingCharges();
    };

    checkAuth();
  }, [router]);

  const loadPendingCharges = async () => {
    try {
      setLoading(true);
      const data = await getPendingCharges();
      setCharges(data || []);
    } catch (err) {
      console.error('承認待ちチャージ取得エラー:', err);
      setCharges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId: string, clientId: string, amount: number) => {
    if (!confirm('このチャージを承認しますか？')) {
      return;
    }

    setProcessingId(transactionId);

    try {
      await approveCharge(transactionId, clientId, amount);
      await loadPendingCharges();
    } catch (err) {
      console.error('承認エラー:', err);
      alert('承認に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!confirm('このチャージを却下しますか？')) {
      return;
    }

    setProcessingId(transactionId);

    try {
      await rejectCharge(transactionId);
      await loadPendingCharges();
    } catch (err) {
      console.error('却下エラー:', err);
      alert('却下に失敗しました');
    } finally {
      setProcessingId(null);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <Button
            onClick={() => router.push('/admin')}
            variant="ghost"
            className="mb-4"
          >
            ← 管理者ダッシュボードに戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">銀行振込承認</h1>
          <p className="mt-2 text-gray-600">
            承認待ちのポイントチャージを管理します
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : charges.length > 0 ? (
          <div className="space-y-4">
            {charges.map((charge) => (
              <div
                key={charge.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        承認待ち
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          クライアントID: <span className="font-mono">{charge.clientId}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          チャージ額: <span className="font-bold text-lg text-purple-600">{charge.amount.toLocaleString()}pt</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          申請日時: {formatDate(charge.createdAt)}
                        </span>
                      </div>

                      {charge.description && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{charge.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => handleApprove(charge.id, charge.clientId, charge.amount)}
                      disabled={processingId === charge.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      承認
                    </Button>
                    <Button
                      onClick={() => handleReject(charge.id)}
                      disabled={processingId === charge.id}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      却下
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">承認待ちのチャージはありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
