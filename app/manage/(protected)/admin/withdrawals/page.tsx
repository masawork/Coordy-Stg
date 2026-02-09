'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { maskAccountNumber } from '@/lib/utils/encryption';

interface WithdrawalRequest {
  id: string;
  instructorId: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejectedReason?: string | null;
  processedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  bankAccount: {
    bankName: string;
    bankCode: string;
    branchName: string;
    branchCode: string;
    accountNumber: string;
    accountHolderName: string;
    accountType: string;
  };
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING');
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectedReason, setRejectedReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, [filter]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/withdrawals?status=${filter}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setWithdrawals(data);
    } catch (err: any) {
      console.error('Load withdrawals error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    if (action === 'reject' && !rejectedReason) {
      alert('却下理由を入力してください');
      return;
    }

    if (!confirm(`この申請を${action === 'approve' ? '承認' : action === 'reject' ? '却下' : '完了'}しますか？`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          rejectedReason: action === 'reject' ? rejectedReason : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      alert(data.message);
      setSelectedRequest(null);
      setRejectedReason('');
      loadWithdrawals();
    } catch (err: any) {
      console.error('Action error:', err);
      alert(err.message);
    } finally {
      setProcessing(false);
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

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        引き出し申請管理
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* フィルター */}
      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
              filter === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'PENDING' && '承認待ち'}
            {status === 'APPROVED' && '承認済み'}
            {status === 'COMPLETED' && '完了'}
            {status === 'REJECTED' && '却下'}
          </button>
        ))}
      </div>

      {/* 引き出し申請一覧 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-6 text-center text-gray-500">読み込み中...</div>
        ) : withdrawals.length === 0 ? (
          <div className="p-6 text-center text-gray-500">該当する申請はありません</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {withdrawals.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-lg font-bold text-gray-900">
                        ¥{request.amount.toLocaleString()}
                      </p>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      申請者: {request.instructor.name} ({request.instructor.email})
                    </p>
                    <p className="text-xs text-gray-500">
                      申請日: {new Date(request.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">振込手数料</p>
                    <p className="text-sm font-semibold text-gray-900">
                      -¥{request.fee.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">振込額</p>
                    <p className="text-lg font-bold text-green-600">
                      ¥{request.netAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 銀行口座情報 */}
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    振込先情報
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">銀行名:</span>
                      <span className="ml-2 font-semibold">{request.bankAccount.bankName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">銀行コード:</span>
                      <span className="ml-2 font-semibold">{request.bankAccount.bankCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">支店名:</span>
                      <span className="ml-2 font-semibold">{request.bankAccount.branchName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">支店コード:</span>
                      <span className="ml-2 font-semibold">{request.bankAccount.branchCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">口座種別:</span>
                      <span className="ml-2 font-semibold">
                        {request.bankAccount.accountType === 'savings' ? '普通' : '当座'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">口座番号:</span>
                      <span className="ml-2 font-semibold">
                        {maskAccountNumber(request.bankAccount.accountNumber)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">口座名義:</span>
                      <span className="ml-2 font-semibold">{request.bankAccount.accountHolderName}</span>
                    </div>
                  </div>
                </div>

                {/* アクションボタン */}
                {request.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAction(request.id, 'approve')}
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      ✓ 承認
                    </Button>
                    <Button
                      onClick={() => setSelectedRequest(request)}
                      disabled={processing}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      ✗ 却下
                    </Button>
                  </div>
                )}

                {request.status === 'APPROVED' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAction(request.id, 'complete')}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      振込完了にする
                    </Button>
                  </div>
                )}

                {request.status === 'REJECTED' && request.rejectedReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    却下理由: {request.rejectedReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 却下理由入力モーダル */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              却下理由を入力
            </h2>
            <textarea
              value={rejectedReason}
              onChange={(e) => setRejectedReason(e.target.value)}
              placeholder="却下する理由を入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction(selectedRequest.id, 'reject')}
                disabled={!rejectedReason || processing}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                却下する
              </Button>
              <Button
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectedReason('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

