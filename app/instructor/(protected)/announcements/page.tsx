'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createAnnouncement, deleteAnnouncement, Announcement } from '@/lib/api/announcement-client';
import { getSession } from '@/lib/auth';

export default function InstructorAnnouncementsPage() {
  const router = useRouter();
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    expiresAt: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMyAnnouncements();
  }, []);

  const loadMyAnnouncements = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session?.user) return;

      // 自分が作成したお知らせを取得
      const response = await fetch('/api/announcements?target=instructors&limit=100', {
        cache: 'no-store',
      });
      const data: Announcement[] = await response.json();
      
      // 自分が作成したもののみフィルタ
      const filtered = data.filter((a) => a.authorId === session.user.id);
      setMyAnnouncements(filtered);
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
        target: 'instructors', // 講師は講師向けのみ作成可能
        priority: 'medium',
        ...formData,
        expiresAt: formData.expiresAt || null,
      });

      setShowCreateForm(false);
      setFormData({
        title: '',
        content: '',
        expiresAt: '',
      });
      loadMyAnnouncements();
    } catch (err: any) {
      console.error('Create announcement error:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return;

    try {
      await deleteAnnouncement(id);
      loadMyAnnouncements();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📰 特別プログラムのお知らせ
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            生徒に向けて特別プログラムやキャンペーンをお知らせできます
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showCreateForm ? 'キャンセル' : '+ お知らせを作成'}
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
            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例: 夏季限定！早朝ヨガプログラム開始"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                placeholder="特別プログラムの詳細、期間、料金などを入力してください"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                キャンペーン期間がある場合は設定してください
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 ヒント: お知らせは管理者の承認後に公開されます
              </p>
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? '作成中...' : 'お知らせを作成（承認待ち）'}
            </Button>
          </form>
        </div>
      )}

      {/* 自分のお知らせ一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          作成したお知らせ
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 text-sm">読み込み中...</p>
          </div>
        ) : myAnnouncements.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            まだお知らせを作成していません
          </p>
        ) : (
          <div className="space-y-3">
            {myAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!announcement.isPublished ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          承認待ち
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          公開中
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-gray-500">
                      作成日: {new Date(announcement.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

