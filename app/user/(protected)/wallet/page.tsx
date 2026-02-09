'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  getWallet,
  getTransactionHistory,
  reportBankTransferComplete,
} from '@/lib/api/wallet-client';
import { Button } from '@/components/ui/button';
import { Building2, Eye, ArrowDownCircle, ArrowUpCircle, AlertTriangle, CheckCircle2, Clock, Send, X } from 'lucide-react';

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargeAmount, setChargeAmount] = useState('');
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingTransferCode, setPendingTransferCode] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // 4桁の振込コードを生成
  const generateTransferCode = () => {
    const num = Math.floor(Math.random() * 9999) + 1;
    return num.toString().padStart(4, '0');
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }

      // ウォレット取得
      const wallet = await getWallet(session.user.id);
      setBalance(wallet?.balance || 0);

      // 取引履歴取得
      const history = await getTransactionHistory(session.user.id);
      setTransactions(history || []);

      // 管理者確認待ちの振込申請を抽出（TRANSFERRED = 振込完了報告済み、管理者確認待ち）
      const pending = (history || []).filter(
        (tx: any) => tx.method === 'bank_transfer' && tx.status === 'TRANSFERRED'
      );
      setPendingTransfers(pending);
    } catch (err) {
      console.error('ウォレットデータ読み込みエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // 振込先を表示（DBには保存しない）
  const handleShowBankInfo = () => {
    const amount = parseInt(chargeAmount);
    if (!amount || amount <= 0) {
      setError('有効な金額を入力してください');
      return;
    }

    if (amount < 1000) {
      setError('最低チャージ額は1,000円です');
      return;
    }

    setError(null);
    setSuccess(null);
    setPendingAmount(amount);
    setPendingTransferCode(generateTransferCode());
    setShowBankInfo(true);

    // 振込先情報を設定（まだDBには保存しない）
    setBankInfo({
      bankName: 'サンプル銀行',
      branchName: '本店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolder: 'カブシキガイシャCoody',
      transferAmount: amount,
    });
  };

  // 振込完了報告（ここでDBに保存）
  const handleSubmitTransfer = async () => {
    const session = await getSession();
    if (!session?.user) return;

    setSubmittingTransfer(true);
    setError(null);

    try {
      const result = await reportBankTransferComplete(pendingAmount, pendingTransferCode);
      setSuccess(result.message);
      setShowBankInfo(false);
      setBankInfo(null);
      setChargeAmount('');
      setPendingAmount(0);
      setPendingTransferCode('');

      // データを再読み込み
      await loadWalletData();
    } catch (err: any) {
      console.error('振込完了報告エラー:', err);
      setError(err.message || '振込完了報告に失敗しました。');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // キャンセル
  const handleCancelTransfer = () => {
    setShowBankInfo(false);
    setBankInfo(null);
    setPendingAmount(0);
    setPendingTransferCode('');
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: '振込待ち', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'TRANSFERRED':
        return { label: '確認待ち', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'COMPLETED':
        return { label: '完了', color: 'text-green-600', bg: 'bg-green-50' };
      case 'FAILED':
        return { label: '却下', color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { label: status, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            銀行振込でチャージ
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

          {!showBankInfo ? (
            <div className="space-y-4">
              {/* チャージ額入力 */}
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  チャージ額（円）
                </label>
                <input
                  type="number"
                  id="amount"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="1000"
                  min="1000"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">最低チャージ額: 1,000円（1円 = 1ポイント）</p>
              </div>

              <Button
                onClick={handleShowBankInfo}
                disabled={!chargeAmount}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                振込先を表示する
              </Button>
            </div>
          ) : (
            /* 銀行振込情報と振込完了ボタン */
            <div className="space-y-4">
              {/* 4桁コードを目立つように表示 */}
              <div className="p-4 bg-purple-100 border-2 border-purple-400 rounded-lg text-center">
                <p className="text-sm text-purple-800 font-medium mb-2">
                  振込時に備考欄へ以下の番号を記載してください
                </p>
                <p className="text-4xl font-bold text-purple-900 tracking-widest font-mono">
                  {pendingTransferCode}
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  振込先情報
                </p>
                <div className="bg-white p-3 rounded border border-blue-200 text-sm">
                  <p><span className="text-gray-600">銀行名:</span> {bankInfo.bankName}</p>
                  <p><span className="text-gray-600">支店名:</span> {bankInfo.branchName}</p>
                  <p><span className="text-gray-600">口座種別:</span> {bankInfo.accountType}</p>
                  <p><span className="text-gray-600">口座番号:</span> {bankInfo.accountNumber}</p>
                  <p><span className="text-gray-600">口座名義:</span> {bankInfo.accountHolder}</p>
                  <p className="mt-2 pt-2 border-t">
                    <span className="text-gray-600">振込金額:</span>{' '}
                    <span className="font-bold text-blue-700">{bankInfo.transferAmount.toLocaleString()}円</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCancelTransfer}
                  variant="outline"
                  className="flex-1"
                  disabled={submittingTransfer}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSubmitTransfer}
                  disabled={submittingTransfer}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submittingTransfer ? '送信中...' : '振込完了'}
                </Button>
              </div>
            </div>
          )}

          {/* 注意事項 */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-900 font-medium mb-2">
                  ご注意事項
                </p>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>振込手数料はお客様のご負担となります</li>
                  <li>ポイントの返金は可能ですが、返金手数料（500円）がかかります</li>
                  <li>振込確認後、1〜2営業日以内にポイントが反映されます</li>
                  <li>振込名義人がアカウント名と異なる場合は、お問い合わせください</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 確認待ちの振込申請 */}
        {pendingTransfers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              確認待ちの振込申請
            </h2>

            <div className="space-y-4">
              {pendingTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="border border-blue-200 rounded-lg p-4 bg-blue-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        チャージ申請: {transfer.amount.toLocaleString()}円
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        申請日時: {formatDate(transfer.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        振込番号: <span className="font-mono font-bold">{transfer.transferId}</span>
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      確認待ち
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-blue-200 text-blue-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-xs">
                      振込完了報告済み - 管理者が確認中です（1〜2営業日以内）
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 取引履歴 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">取引履歴</h2>

          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">取引履歴はありません</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const statusInfo = getStatusLabel(tx.status);
                const isCompleted = tx.status === 'COMPLETED';
                const isBankTransfer = tx.method === 'bank_transfer';

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {tx.type === 'CHARGE' ? (
                        <ArrowDownCircle className={`h-5 w-5 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.description || (tx.type === 'CHARGE' ? 'チャージ' : '使用')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {formatDate(tx.createdAt)}
                          </p>
                          {isBankTransfer && tx.transferId && (
                            <span className="text-xs text-gray-400">
                              | {tx.transferId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          tx.type === 'CHARGE'
                            ? isCompleted ? 'text-green-600' : 'text-gray-400'
                            : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'CHARGE' ? '+' : '-'}
                        {tx.amount.toLocaleString()}pt
                      </p>
                      {!isCompleted && isBankTransfer && (
                        <span className={`text-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      )}
                      {tx.status === 'FAILED' && (
                        <span className="text-xs text-red-600">却下</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
