'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface IdentityRequest {
  id: string;
  documentType: string;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  status: string;
  rejectedReason: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function AdminIdentityDocumentsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<IdentityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'INSTRUCTOR'>('INSTRUCTOR');
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [roleFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.set('role', roleFilter);
      }
      const response = await fetch(`/api/manage/identity-requests?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('身分証一覧の取得に失敗しました');
      }

      const data = await response.json();
      setRequests(data.requests || data || []);
    } catch (err) {
      console.error('読み込みエラー:', err);
      setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      PENDING: '審査中',
      APPROVED: '承認済み',
      REJECTED: '却下',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDocTypeName = (type: string) => {
    const names: Record<string, string> = {
      DRIVERS_LICENSE: '運転免許証',
      MY_NUMBER: 'マイナンバーカード',
      PASSPORT: 'パスポート',
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">身分証明書一覧</h1>
          <p className="text-sm text-gray-600 mt-1">提出された身分証明書を確認します</p>
        </div>
        <button
          onClick={loadDocuments}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          再読み込み
        </button>
      </div>

      {/* ロールフィルタ */}
      <div className="flex gap-2">
        {(['all', 'INSTRUCTOR', 'USER'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === role
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {role === 'all' ? '全て' : role === 'USER' ? 'ユーザー' : 'サービス提供者'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">該当する書類はありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ロール</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">書類種別</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">提出日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {req.user?.name || '不明'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.user?.email || '不明'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.user?.role === 'INSTRUCTOR' ? 'サービス提供者' : 'ユーザー'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getDocTypeName(req.documentType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {req.status === 'PENDING' ? (
                      <button
                        onClick={() => router.push(`/manage/admin/verification/${req.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        審査する →
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/manage/admin/verification/${req.id}`)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        詳細
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
