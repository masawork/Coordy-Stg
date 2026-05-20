'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface VerificationRequest {
  id: string;
  userId: string;
  documentType: string;
  documentFrontUrl: string;
  documentBackUrl: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    clientProfile: {
      verificationLevel: number;
      phoneNumber: string | null;
    } | null;
  };
}

export default function AdminIdentityDocumentsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingDocuments();
  }, []);

  const loadPendingDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/verification/requests?status=pending', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('この身分証明書を承認しますか？')) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/verification/requests/${requestId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || '承認に失敗しました');
      }
      alert('承認しました');
      await loadPendingDocuments();
    } catch (error: any) {
      alert(error.message || '承認に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    if (!confirm('この身分証明書を却下しますか？')) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/verification/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || '却下に失敗しました');
      }
      alert('却下しました');
      setRejectionReason('');
      setSelectedId(null);
      await loadPendingDocuments();
    } catch (error: any) {
      alert(error.message || '却下に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">身分証明書審査</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/manage/admin/verification')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            詳細審査画面
          </button>
          <button
            onClick={loadPendingDocuments}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">審査待ちの書類はありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {req.user.name || '名前未設定'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    メール: {req.user.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    書類種別: {req.documentType}
                  </p>
                  <p className="text-sm text-gray-500">
                    提出日: {new Date(req.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  審査中
                </span>
              </div>

              <div className="mb-4">
                {req.documentFrontUrl ? (
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-2">身分証明書（表面）:</p>
                    <img
                      src={req.documentFrontUrl}
                      alt="身分証明書（表面）"
                      className="max-w-md h-auto rounded-lg border"
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-500">画像がアップロードされていません</p>
                )}
                {req.documentBackUrl && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">身分証明書（裏面）:</p>
                    <img
                      src={req.documentBackUrl}
                      alt="身分証明書（裏面）"
                      className="max-w-md h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  承認する
                </button>
                <button
                  onClick={() => setSelectedId(req.id)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  却下する
                </button>
              </div>

              {selectedId === req.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    placeholder="却下理由を入力してください（例: 画像が不鮮明です、別の身分証明書を提出してください）"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setRejectionReason('');
                      }}
                      disabled={processing}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
