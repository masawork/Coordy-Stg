/**
 * 本人確認書類 承認管理ページ（管理者用）
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

interface VerificationRequest {
  id: string;
  documentType: string;
  fullName: string;
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

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function VerificationManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [currentFilter, setCurrentFilter] = useState<string>('pending');

  useEffect(() => {
    loadRequests(currentFilter);
  }, [currentFilter]);

  const loadRequests = async (status: string) => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/manage/login');
        return;
      }

      const response = await fetch(`/api/admin/verification/requests?status=${status}`);
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests);
      setStats({
        total: data.total,
        pending: data.pending,
        approved: data.approved,
        rejected: data.rejected,
      });
    } catch (error) {
      console.error('Load requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'license':
        return '運転免許証';
      case 'mynumber':
        return 'マイナンバーカード';
      case 'passport':
        return 'パスポート';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
            🟡 承認待ち
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
            ✅ 承認済み
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
            ❌ 却下
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        📄 本人確認書類 承認管理
      </h1>

      {/* ステータスフィルター */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setCurrentFilter('pending')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentFilter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🟡 承認待ち: {stats.pending}件
          </button>
          <button
            onClick={() => setCurrentFilter('approved')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentFilter === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✅ 承認済み: {stats.approved}件
          </button>
          <button
            onClick={() => setCurrentFilter('rejected')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentFilter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ❌ 却下: {stats.rejected}件
          </button>
          <button
            onClick={() => setCurrentFilter('all')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 すべて: {stats.total}件
          </button>
        </div>
      </div>

      {/* 申請一覧 */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg">申請はありません</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              onClick={() => router.push(`/manage/admin/verification/${request.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(request.status)}
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      📄 {getDocumentTypeLabel(request.documentType)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {request.fullName}
                  </h3>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-semibold">ユーザー名:</span>{' '}
                      {request.user.name}
                    </p>
                    <p>
                      <span className="font-semibold">メール:</span>{' '}
                      <button
                        type="button"
                        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/manage/admin/verification/${request.id}`);
                        }}
                      >
                        {request.user.email}
                      </button>
                    </p>
                    {request.user.clientProfile?.phoneNumber && (
                      <p>
                        <span className="font-semibold">電話番号:</span>{' '}
                        {request.user.clientProfile.phoneNumber}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">現在の認証レベル:</span>{' '}
                      Level {request.user.clientProfile?.verificationLevel || 0}
                    </p>
                    <p>
                      <span className="font-semibold">提出日時:</span>{' '}
                      {new Date(request.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/manage/admin/verification/${request.id}`);
                    }}
                  >
                    詳細を見る →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
