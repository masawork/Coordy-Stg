'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAnnouncement, Announcement } from '@/lib/api/announcement-client';
import { Button } from '@/components/ui/button';

export default function AnnouncementDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnnouncement();
  }, [params.id]);

  const loadAnnouncement = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncement(params.id);
      setAnnouncement(data);
    } catch (err: any) {
      console.error('Load announcement error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'お知らせが見つかりません'}</p>
          <Button onClick={() => router.push('/user/announcements')}>
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* 戻るボタン */}
      <button
        onClick={() => router.push('/user/announcements')}
        className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        ← お知らせ一覧に戻る
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {announcement.priority === 'high' && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                🔥 重要
              </span>
            )}
            {announcement.author?.role === 'INSTRUCTOR' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                👨‍🏫 講師からのお知らせ
              </span>
            )}
            {announcement.author?.role === 'ADMIN' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                🛠️ 運営からのお知らせ
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {announcement.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              投稿日: {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {announcement.author && (
              <span>
                投稿者: {announcement.author.name}
              </span>
            )}
          </div>
        </div>

        {/* 本文 */}
        <div className="prose max-w-none">
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </div>
        </div>

        {/* 有効期限 */}
        {announcement.expiresAt && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏰ このお知らせは {new Date(announcement.expiresAt).toLocaleDateString('ja-JP')} まで有効です
            </p>
          </div>
        )}

        {/* アクション */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => router.push('/user/announcements')}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            一覧に戻る
          </Button>
        </div>
      </div>
    </div>
  );
}

