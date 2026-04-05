/**
 * サービス公開管理ページ（管理者用）
 * 公開申請の承認・却下、公開中サービスの取り下げ
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

interface ServiceWithInstructor {
  id: string;
  title: string;
  category: string;
  price: number;
  duration: number;
  publishStatus: string;
  publishRequestedAt: string | null;
  publishedAt: string | null;
  publishRejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  instructor: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  images: { url: string }[];
}

interface Stats {
  DRAFT: number;
  PENDING_REVIEW: number;
  PUBLISHED: number;
  REJECTED: number;
  WITHDRAWN: number;
}

const STATUS_LABELS: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  DRAFT: { label: '下書き', emoji: '📝', bg: 'bg-gray-100', text: 'text-gray-800' },
  PENDING_REVIEW: { label: '申請中', emoji: '🟡', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  PUBLISHED: { label: '公開中', emoji: '✅', bg: 'bg-green-100', text: 'text-green-800' },
  REJECTED: { label: '却下', emoji: '❌', bg: 'bg-red-100', text: 'text-red-800' },
  WITHDRAWN: { label: '取り下げ', emoji: '⛔', bg: 'bg-orange-100', text: 'text-orange-800' },
};

export default function ServicePublishManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceWithInstructor[]>([]);
  const [stats, setStats] = useState<Stats>({ DRAFT: 0, PENDING_REVIEW: 0, PUBLISHED: 0, REJECTED: 0, WITHDRAWN: 0 });
  const [currentFilter, setCurrentFilter] = useState<string>('PENDING_REVIEW');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState<string | null>(null);

  useEffect(() => {
    loadServices(currentFilter);
  }, [currentFilter]);

  const loadServices = async (status: string) => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/manage/login');
        return;
      }

      const response = await fetch(`/api/admin/services/publish?status=${status}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setServices(data.services);
      setStats(data.stats);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (serviceId: string, action: string, reason?: string) => {
    try {
      setActionLoading(serviceId);
      const response = await fetch('/api/admin/services/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, action, reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error?.message || 'エラーが発生しました');
        return;
      }

      const data = await response.json();
      alert(data.message);
      setShowRejectModal(null);
      setShowWithdrawModal(null);
      setReasons((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      await loadServices(currentFilter);
    } catch (error) {
      console.error('Action error:', error);
      alert('処理に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_LABELS[status] || { label: status, emoji: '', bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-2 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded`}>
        {config.emoji} {config.label}
      </span>
    );
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
        サービス公開管理
      </h1>

      {/* ステータスフィルター */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'PENDING_REVIEW', label: '申請中', emoji: '🟡', color: 'yellow' },
            { key: 'PUBLISHED', label: '公開中', emoji: '✅', color: 'green' },
            { key: 'REJECTED', label: '却下', emoji: '❌', color: 'red' },
            { key: 'WITHDRAWN', label: '取り下げ', emoji: '⛔', color: 'orange' },
            { key: 'DRAFT', label: '下書き', emoji: '📝', color: 'gray' },
            { key: 'all', label: 'すべて', emoji: '📊', color: 'blue' },
          ].map(({ key, label, emoji, color }) => {
            const colorMap: Record<string, string> = {
              yellow: '#eab308', green: '#22c55e', red: '#ef4444',
              orange: '#f97316', gray: '#6b7280', blue: '#3b82f6',
            };
            const isActive = currentFilter === key;
            const count = key === 'all'
              ? Object.values(stats).reduce((a, b) => a + b, 0)
              : stats[key as keyof Stats] || 0;
            return (
              <button
                key={key}
                onClick={() => setCurrentFilter(key)}
                className={`px-5 py-2.5 rounded-lg font-semibold transition-colors text-sm ${
                  isActive ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={isActive ? { backgroundColor: colorMap[color] || '#3b82f6' } : undefined}
              >
                {emoji} {label}: {count}件
              </button>
            );
          })}
        </div>
      </div>

      {/* サービス一覧 */}
      <div className="space-y-4">
        {services.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg">該当するサービスはありません</p>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(service.publishStatus)}
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      {service.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      ¥{service.price?.toLocaleString()} / {service.duration}分
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    <a
                      href={`/services/${service.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 hover:underline"
                      title="サービス詳細をプレビュー"
                    >
                      {service.title} ↗
                    </a>
                  </h3>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-semibold">インストラクター:</span>{' '}
                      {service.instructor?.user?.name} ({service.instructor?.user?.email})
                    </p>
                    {service.publishRequestedAt && (
                      <p>
                        <span className="font-semibold">申請日:</span>{' '}
                        {new Date(service.publishRequestedAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                    {service.publishedAt && (
                      <p>
                        <span className="font-semibold">公開日:</span>{' '}
                        {new Date(service.publishedAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                    {service.publishRejectReason && (
                      <p className="text-red-600">
                        <span className="font-semibold">却下理由:</span>{' '}
                        {service.publishRejectReason}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">作成日:</span>{' '}
                      {new Date(service.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>

                  {/* サムネイル */}
                  {service.images.length > 0 && (
                    <div className="mt-2">
                      <img
                        src={service.images[0].url}
                        alt={service.title}
                        className="h-16 w-24 object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex flex-col gap-2 ml-4">
                  {service.publishStatus === 'PENDING_REVIEW' && (
                    <>
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                        disabled={actionLoading === service.id}
                        onClick={() => handleAction(service.id, 'approve')}
                      >
                        {actionLoading === service.id ? '処理中...' : '承認する'}
                      </button>
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                        disabled={actionLoading === service.id}
                        onClick={() => setShowRejectModal(service.id)}
                      >
                        却下する
                      </button>
                    </>
                  )}

                  {service.publishStatus === 'PUBLISHED' && (
                    <button
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm disabled:opacity-50"
                      disabled={actionLoading === service.id}
                      onClick={() => setShowWithdrawModal(service.id)}
                    >
                      取り下げる
                    </button>
                  )}

                  {['REJECTED', 'WITHDRAWN'].includes(service.publishStatus) && (
                    <button
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                      disabled={actionLoading === service.id}
                      onClick={() => handleAction(service.id, 'revert_to_draft')}
                    >
                      下書きに戻す
                    </button>
                  )}
                </div>
              </div>

              {/* 却下モーダル */}
              {showRejectModal === service.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">却下理由を入力してください</h4>
                  <textarea
                    className="w-full border border-red-300 rounded-lg p-2 text-sm"
                    rows={3}
                    placeholder="却下の理由を記載..."
                    value={reasons[service.id] || ''}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [service.id]: e.target.value }))}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                      disabled={!(reasons[service.id] || '').trim() || actionLoading === service.id}
                      onClick={() => handleAction(service.id, 'reject', reasons[service.id])}
                    >
                      却下を確定
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      onClick={() => { setShowRejectModal(null); setReasons((prev) => { const n = { ...prev }; delete n[service.id]; return n; }); }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* 取り下げモーダル */}
              {showWithdrawModal === service.id && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">取り下げ理由（任意）</h4>
                  <textarea
                    className="w-full border border-orange-300 rounded-lg p-2 text-sm"
                    rows={3}
                    placeholder="取り下げの理由を記載（任意）..."
                    value={reasons[service.id] || ''}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [service.id]: e.target.value }))}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
                      disabled={actionLoading === service.id}
                      onClick={() => handleAction(service.id, 'withdraw', reasons[service.id])}
                    >
                      取り下げを確定
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      onClick={() => { setShowWithdrawModal(null); setReasons((prev) => { const n = { ...prev }; delete n[service.id]; return n; }); }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
