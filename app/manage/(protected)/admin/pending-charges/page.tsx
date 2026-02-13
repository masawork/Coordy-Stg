'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listPendingCharges, approveCharge, rejectCharge, cleanupExpiredCharges } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, User, DollarSign, Hash, Search, Building } from 'lucide-react';

export default function PendingChargesPage() {
  const router = useRouter();
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [searchAmount, setSearchAmount] = useState('');

  useEffect(() => {
    // 親レイアウトで認証チェック済みのため、データのみロード
    loadPendingCharges();
  }, []);

  const loadPendingCharges = async () => {
    try {
      setLoading(true);

      // 30日以上経過した振込申請を自動キャンセル
      await cleanupExpiredCharges();

      const data = await listPendingCharges();
      setCharges(data || []);
    } catch (err) {
      console.error('承認待ちチャージ取得エラー:', err);
      setCharges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId: string) => {
    if (!confirm('このチャージを承認しますか？')) {
      return;
    }

    setProcessingId(transactionId);

    try {
      await approveCharge(transactionId);
      await loadPendingCharges();
    } catch (err: any) {
      console.error('承認エラー:', err);
      alert(err.message || '承認に失敗しました');
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

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // フィルタリングされたチャージリスト
  const filteredCharges = charges.filter((charge) => {
    const matchesCode = !searchCode || (charge.transferId && charge.transferId.includes(searchCode));
    const matchesAmount = !searchAmount || charge.amount.toString().includes(searchAmount);
    return matchesCode && matchesAmount;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <Button
            onClick={() => router.push('/manage/admin')}
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

        {/* 検索フィルター */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">振込検索</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">振込番号（4桁）</label>
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="例: 1234"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">金額</label>
              <input
                type="text"
                value={searchAmount}
                onChange={(e) => setSearchAmount(e.target.value)}
                placeholder="例: 10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          {(searchCode || searchAmount) && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredCharges.length}件の振込が見つかりました
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : filteredCharges.length > 0 ? (
          <div className="space-y-4">
            {filteredCharges.map((charge) => (
              <div
                key={charge.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        振込確認待ち
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          ユーザー: <span className="font-mono">{charge.user?.name || charge.user?.email || 'N/A'}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          チャージ額: <span className="font-bold text-lg text-purple-600">{charge.amount.toLocaleString()}円</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          申請日時: {formatDate(charge.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-700">振込番号:</span>
                        <span className="text-2xl font-mono font-bold text-purple-600 tracking-widest bg-purple-50 px-3 py-1 rounded">
                          {charge.transferId || 'N/A'}
                        </span>
                      </div>

                      {/* ユーザの登録銀行口座 */}
                      {charge.user?.bankAccounts && charge.user.bankAccounts.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">ユーザ登録口座</span>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p>
                              <span className="text-gray-500">銀行名:</span>{' '}
                              <span className="font-medium">{charge.user.bankAccounts[0].bankName}</span>
                            </p>
                            <p>
                              <span className="text-gray-500">支店名:</span>{' '}
                              <span className="font-medium">{charge.user.bankAccounts[0].branchName}</span>
                            </p>
                            <p>
                              <span className="text-gray-500">口座種別:</span>{' '}
                              <span className="font-medium">
                                {charge.user.bankAccounts[0].accountType === 'SAVINGS' ? '普通' : '当座'}
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-500">口座番号:</span>{' '}
                              <span className="font-mono font-medium">{charge.user.bankAccounts[0].accountNumber}</span>
                            </p>
                            <p>
                              <span className="text-gray-500">名義:</span>{' '}
                              <span className="font-medium">{charge.user.bankAccounts[0].accountHolderName}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {charge.description && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{charge.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      onClick={() => handleApprove(charge.id)}
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
            <p className="text-gray-500">
              {charges.length === 0
                ? '承認待ちのチャージはありません'
                : '検索条件に一致する振込が見つかりません'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
