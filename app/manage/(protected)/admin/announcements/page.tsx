'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, publishAnnouncement, Announcement } from '@/lib/api/announcement-client';

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    target: 'all' as 'all' | 'users' | 'instructors',
    priority: 'medium' as 'low' | 'medium' | 'high',
    title: '',
    content: '',
    expiresAt: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      // 管理者は全てのお知らせを取得（下書き含む）
      const response = await fetch('/api/announcements?target=all&limit=100', {
        cache: 'no-store',
      });
      const data = await response.json();
      setAnnouncements(data);
    } catch (err: any) {
      console.error('Load announcements error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      await createAnnouncement({
        ...formData,
        expiresAt: formData.expiresAt || null,
      });

      setShowCreateForm(false);
      setFormData({
        target: 'all',
        priority: 'medium',
        title: '',
        content: '',
        expiresAt: '',
      });
      loadAnnouncements();
    } catch (err: any) {
      console.error('Create announcement error:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('このお知らせを公開しますか？')) return;

    try {
      await publishAnnouncement(id);
      loadAnnouncements();
    } catch (err: any) {
      console.error('Publish error:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return;

    try {
      await deleteAnnouncement(id);
      loadAnnouncements();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          📰 お知らせ管理
        </h1>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {showCreateForm ? 'キャンセル' : '+ 新しいお知らせを作成'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 作成フォーム */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            新しいお知らせを作成
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 対象 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  対象
                </label>
                <select
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">全員</option>
                  <option value="users">生徒のみ</option>
                  <option value="instructors">講師のみ</option>
                </select>
              </div>

              {/* 優先度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先度
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高（重要）</option>
                </select>
              </div>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例: システムメンテナンスのお知らせ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="お知らせの詳細を入力してください"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* 有効期限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有効期限（オプション）
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                設定しない場合は無期限です
              </p>
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? '作成中...' : 'お知らせを作成'}
            </Button>
          </form>
        </div>
      )}

      {/* お知らせ一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">お知らせはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {!announcement.isPublished && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                        下書き
                      </span>
                    )}
                    {announcement.priority === 'high' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                        重要
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      {announcement.target === 'all' && '全員'}
                      {announcement.target === 'users' && '生徒のみ'}
                      {announcement.target === 'instructors' && '講師のみ'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {announcement.content}
                  </p>
                  <div className="text-xs text-gray-500">
                    {announcement.isPublished ? (
                      <span>公開日: {new Date(announcement.publishedAt!).toLocaleDateString('ja-JP')}</span>
                    ) : (
                      <span>作成日: {new Date(announcement.createdAt).toLocaleDateString('ja-JP')}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!announcement.isPublished && (
                    <Button
                      onClick={() => handlePublish(announcement.id)}
                      className="bg-green-600 hover:bg-green-700 text-sm"
                    >
                      公開
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(announcement.id)}
                    className="bg-red-600 hover:bg-red-700 text-sm"
                  >
                    削除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

