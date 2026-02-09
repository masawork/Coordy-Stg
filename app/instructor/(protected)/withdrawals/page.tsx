'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getBankAccounts, getWithdrawalRequests, createWithdrawalRequest, BankAccount, WithdrawalRequest } from '@/lib/api/bank-client';
import { getWallet } from '@/lib/api/wallet-client';
import { getSession } from '@/lib/auth';

const TRANSFER_FEE = 250;

export default function WithdrawalsPage() {
  const [balance, setBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('ログインが必要です');
      }
      const [walletData, accounts, requests] = await Promise.all([
        getWallet(session.user.id),
        getBankAccounts(),
        getWithdrawalRequests(),
      ]);

      setBalance(walletData?.balance || 0);
      setBankAccounts(accounts.filter((a) => a.isVerified)); // 承認済み口座のみ
      setWithdrawalRequests(requests);

      // デフォルト口座を自動選択
      const defaultAccount = accounts.find((a) => a.isDefault && a.isVerified);
      if (defaultAccount) {
        setSelectedBankAccountId(defaultAccount.id);
      }
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('引き出し額を正しく入力してください');
      return;
    }

    if (amountNum > balance) {
      setError('残高が不足しています');
      return;
    }

    if (!selectedBankAccountId) {
      setError('振込先の銀行口座を選択してください');
      return;
    }

    try {
      await createWithdrawalRequest(amountNum, selectedBankAccountId);
      setShowRequestForm(false);
      setAmount('');
      loadData();
    } catch (err: any) {
      console.error('Create withdrawal request error:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⏳ 承認待ち</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">✓ 承認済み</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">✓ 完了</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">✗ 却下</span>;
      default:
        return null;
    }
  };

  const netAmount = amount ? Math.max(0, parseInt(amount) - TRANSFER_FEE) : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        引き出し管理
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 残高表示 */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow p-6 mb-6 text-white">
        <p className="text-sm opacity-90 mb-1">引き出し可能残高</p>
        <p className="text-4xl font-bold">¥{balance.toLocaleString()}</p>
      </div>

      {/* 引き出し申請履歴 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          引き出し申請履歴
        </h2>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : withdrawalRequests.length === 0 ? (
          <p className="text-gray-500">引き出し申請履歴はありません</p>
        ) : (
          <div className="space-y-3">
            {withdrawalRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border border-gray-200 rounded-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        ¥{request.amount.toLocaleString()}
                      </p>
                      {getStatusBadge(request.status)}
                    </div>
                    {request.bankAccount && (
                      <p className="text-sm text-gray-600">
                        振込先: {request.bankAccount.bankName} {request.bankAccount.branchName}支店
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      申請日: {new Date(request.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                    {request.status === 'COMPLETED' && request.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        振込完了: {new Date(request.completedAt).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                    {request.status === 'REJECTED' && request.rejectedReason && (
                      <p className="text-xs text-red-600 mt-1">
                        却下理由: {request.rejectedReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">振込手数料</p>
                    <p className="text-sm font-semibold text-gray-900">
                      -¥{request.fee.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">振込額</p>
                    <p className="text-sm font-semibold text-green-600">
                      ¥{request.netAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 引き出し申請フォーム */}
      {showRequestForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              新しい引き出し申請
            </h2>
            <button
              onClick={() => setShowRequestForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 引き出し額 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                引き出し額（円）
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="例: 10000"
                min="1000"
                max={balance}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                最低引き出し額: ¥1,000 / 引き出し可能残高: ¥{balance.toLocaleString()}
              </p>
            </div>

            {/* 振込先銀行口座 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                振込先銀行口座
              </label>
              {bankAccounts.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  承認済みの銀行口座がありません。先に銀行口座を登録してください。
                </div>
              ) : (
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">選択してください</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} {account.branchName}支店 ({account.accountHolderName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 計算サマリー */}
            {amount && parseInt(amount) > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">引き出し額</span>
                  <span className="font-semibold">¥{parseInt(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">振込手数料</span>
                  <span className="font-semibold text-red-600">-¥{TRANSFER_FEE.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">実際の振込額</span>
                  <span className="font-bold text-lg text-green-600">¥{netAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={bankAccounts.length === 0}
            >
              引き出し申請を送信
            </Button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowRequestForm(true)}
          disabled={balance < 1000}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + 新しい引き出し申請
        </button>
      )}

      {/* 説明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 引き出しについて
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 引き出し申請は管理者の承認後、指定の銀行口座に振り込まれます</li>
          <li>• 最低引き出し額: ¥1,000</li>
          <li>• 振込手数料: ¥{TRANSFER_FEE.toLocaleString()}（1回あたり）</li>
          <li>• 承認には通常1〜3営業日かかります</li>
        </ul>
      </div>
    </div>
  );
}

