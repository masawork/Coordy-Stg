'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  getClientWallet,
  chargePoints,
  getTransactionHistory,
} from '@/lib/api/wallet';
import { Button } from '@/components/ui/button';
import { CreditCard, Building2, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeMethod, setChargeMethod] = useState<'credit' | 'bankTransfer'>('credit');
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login/user');
      return;
    }

    loadWalletData(session.userId);
  }, [router]);

  const loadWalletData = async (clientId: string) => {
    try {
      setLoading(true);

      // ウォレット取得
      const wallet = await getClientWallet(clientId);
      setBalance(wallet?.balance || 0);

      // 取引履歴取得
      const history = await getTransactionHistory(clientId);
      setTransactions(history);
    } catch (err) {
      console.error('ウォレットデータ読み込みエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCharge = async () => {
    const session = getSession();
    if (!session) return;

    const amount = parseInt(chargeAmount);
    if (!amount || amount <= 0) {
      setError('有効な金額を入力してください');
      return;
    }

    setCharging(true);
    setError(null);
    setSuccess(null);

    try {
      await chargePoints(session.userId, amount, chargeMethod);

      setSuccess(
        chargeMethod === 'credit'
          ? `${amount}ポイントがチャージされました`
          : '銀行振込申請を受け付けました。承認後にポイントが追加されます。'
      );
      setChargeAmount('');

      // データを再読み込み
      await loadWalletData(session.userId);
    } catch (err: any) {
      console.error('チャージエラー:', err);
      setError('チャージに失敗しました。もう一度お試しください。');
    } finally {
      setCharging(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ポイントウォレット</h1>
          <p className="mt-2 text-gray-600">
            ポイントをチャージして、サービスを予約できます
          </p>
        </div>

        {/* 残高カード */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-8 text-white">
          <p className="text-sm text-purple-100 mb-2">現在の残高</p>
          <p className="text-4xl font-bold">{balance.toLocaleString()}pt</p>
        </div>

        {/* チャージセクション */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ポイントをチャージ
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-4">
            {/* チャージ額入力 */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                チャージ額（ポイント）
              </label>
              <input
                type="number"
                id="amount"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="1000"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* チャージ方法選択 */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setChargeMethod('credit')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  chargeMethod === 'credit'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">クレジットカード</p>
                <p className="text-xs text-gray-500 mt-1">即時反映</p>
              </button>

              <button
                type="button"
                onClick={() => setChargeMethod('bankTransfer')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  chargeMethod === 'bankTransfer'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building2 className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">銀行振込</p>
                <p className="text-xs text-gray-500 mt-1">承認後反映</p>
              </button>
            </div>

            <Button
              onClick={handleCharge}
              disabled={charging || !chargeAmount}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {charging ? 'チャージ中...' : 'チャージする'}
            </Button>
          </div>

          {chargeMethod === 'bankTransfer' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-900 font-medium mb-2">
                振込先情報
              </p>
              <p className="text-sm text-blue-700">
                銀行名: サンプル銀行<br />
                支店名: 本店<br />
                口座番号: 1234567<br />
                口座名義: カブシキガイシャCoody
              </p>
            </div>
          )}
        </div>

        {/* 取引履歴 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">取引履歴</h2>

          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">取引履歴はありません</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {tx.type === 'charge' ? (
                      <ArrowDownCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.description || (tx.type === 'charge' ? 'チャージ' : '使用')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === 'charge' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'charge' ? '+' : '-'}
                      {tx.amount.toLocaleString()}pt
                    </p>
                    {tx.status === 'pending' && (
                      <span className="text-xs text-orange-600">承認待ち</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
