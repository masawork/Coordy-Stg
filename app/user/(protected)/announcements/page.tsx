'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAnnouncements, Announcement } from '@/lib/api/announcement-client';

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements('users', 50); // 生徒向け最新50件
      setAnnouncements(data);
    } catch (err: any) {
      console.error('Load announcements error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">🔥 重要</span>;
      case 'medium':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">ℹ️ 通常</span>;
      case 'low':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">💡 参考</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        📰 お知らせ
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">お知らせはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/user/announcements/${announcement.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getPriorityBadge(announcement.priority)}
                    {announcement.author?.role === 'INSTRUCTOR' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        👨‍🏫 講師より
                      </span>
                    )}
                    {announcement.author?.role === 'ADMIN' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                        🛠️ 運営より
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      投稿日: {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString('ja-JP')}
                    </span>
                    {announcement.author && (
                      <span>
                        投稿者: {announcement.author.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400 text-2xl">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

