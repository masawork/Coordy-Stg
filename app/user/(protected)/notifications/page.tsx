'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getNotifications, markNotificationAsRead, dismissNotification, markAllNotificationsAsRead, Notification } from '@/lib/api/notification-client';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(filter === 'unread');
      setNotifications(data);
    } catch (err: any) {
      console.error('Load notifications error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      loadNotifications();
    } catch (err: any) {
      console.error('Mark as read error:', err);
      alert(err.message);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissNotification(id);
      loadNotifications();
    } catch (err: any) {
      console.error('Dismiss error:', err);
      alert(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      loadNotifications();
    } catch (err: any) {
      console.error('Mark all as read error:', err);
      alert(err.message);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">🚨 緊急</span>;
      case 'high':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">⚠️ 重要</span>;
      case 'medium':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">ℹ️ 通常</span>;
      case 'low':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">💡 参考</span>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'verification':
        return <span className="text-xs text-gray-500">本人確認</span>;
      case 'payment':
        return <span className="text-xs text-gray-500">決済</span>;
      case 'withdrawal':
        return <span className="text-xs text-gray-500">引き出し</span>;
      case 'reservation':
        return <span className="text-xs text-gray-500">予約</span>;
      case 'announcement':
        return <span className="text-xs text-gray-500">お知らせ</span>;
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">通知</h1>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            className="bg-purple-600 hover:bg-purple-700"
          >
            すべて既読にする
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* フィルター */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          すべて ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
            filter === 'unread'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          未読 ({unreadCount})
        </button>
      </div>

      {/* 通知一覧 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter === 'unread' ? '未読の通知はありません' : '通知はありません'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityBadge(notification.priority)}
                      {getCategoryBadge(notification.category)}
                      {!notification.isRead && (
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString('ja-JP')}
                      </p>
                      {notification.actionUrl && notification.actionLabel && (
                        <Link
                          href={notification.actionUrl}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                        >
                          {notification.actionLabel} →
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                      >
                        既読にする
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      className="text-sm text-gray-500 hover:text-red-600"
                    >
                      非表示
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

