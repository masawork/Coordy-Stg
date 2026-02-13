'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { fetchIdentityRequests } from '@/lib/api/admin-client';

type VerificationRequest = {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

type RoleBucket = 'user' | 'instructor';

type FetchResult = {
  role: RoleBucket;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    notSubmitted: number;
    totalUsers: number;
  };
  requests: VerificationRequest[];
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<FetchResult | null>(null);
  const [instructorData, setInstructorData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [userRes, instructorRes] = await Promise.all([
          fetchIdentityRequests('user'),
          fetchIdentityRequests('instructor'),
        ]);
        setUserData(userRes);
        setInstructorData(instructorRes);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            承認済み
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            却下
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            審査中
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <FileText className="w-4 h-4 mr-1" />
            未提出
          </span>
        );
    }
  };

  const renderSection = (data: FetchResult | null, title: string) => {
    const pending = data?.requests.filter((r) => r.status === 'pending') || [];
    const approved = data?.requests.filter((r) => r.status === 'approved') || [];
    const rejected = data?.requests.filter((r) => r.status === 'rejected') || [];
    const notSubmitted = data?.counts.notSubmitted || 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-gray-600">本人確認申請のステータスを管理します</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">審査待ち</p>
                <p className="text-3xl font-bold text-yellow-900">{pending.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">承認済み</p>
                <p className="text-3xl font-bold text-green-900">{approved.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-red-50 border border-red-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">却下</p>
                <p className="text-3xl font-bold text-red-900">{rejected.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-50 border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">未提出</p>
                <p className="text-3xl font-bold text-gray-900">{notSubmitted}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
          </motion.div>
        </div>

        {/* 審査待ちリスト */}
        {pending.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">審査待ち</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        名前
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        メール
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        提出日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pending.map((req) => (
                      <tr key={req.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{req.user?.name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.user?.email ? (
                            <button
                              type="button"
                              className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
                              onClick={() => router.push(`/manage/admin/verification/${req.id}`)}
                            >
                              {req.user.email}
                            </button>
                          ) : (
                            <div className="text-sm text-gray-500">-</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString('ja-JP') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 全リクエストリスト */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">全申請</h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      名前
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メール
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      提出日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(data?.requests || []).map((req) => (
                    <tr key={req.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{req.user?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {req.user?.email ? (
                          <button
                            type="button"
                            className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
                            onClick={() => router.push(`/manage/admin/verification/${req.id}`)}
                          >
                            {req.user.email}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-500">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString('ja-JP') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="mt-2 text-gray-600">ユーザーとインストラクターの本人確認を管理します</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-12">
        {renderSection(userData, 'ユーザー本人確認')}
        {renderSection(instructorData, 'インストラクター本人確認')}
      </div>
    </div>
  );
}
