'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getNotifications, markNotificationAsRead, dismissNotification, markAllNotificationsAsRead, Notification } from '@/lib/api/notification-client';

export default function NotificationWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // 定期的に未読通知をチェック（30秒ごと）
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissNotification(id);
      loadNotifications();
    } catch (error) {
      console.error('Dismiss error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await markAllNotificationsAsRead();
      loadNotifications();
    } catch (error) {
      console.error('Mark all as read error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return 'ℹ️';
      case 'low':
        return '💡';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative">
      {/* 通知ベルアイコン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知ドロップダウン */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
            {/* ヘッダー */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">通知</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  すべて既読
                </button>
              )}
            </div>

            {/* 通知リスト */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  通知はありません
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getPriorityIcon(notification.priority)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">
                            {new Date(notification.createdAt).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {notification.actionUrl && notification.actionLabel && (
                            <Link
                              href={notification.actionUrl}
                              onClick={() => {
                                handleMarkAsRead(notification.id);
                                setIsOpen(false);
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                            >
                              {notification.actionLabel} →
                            </Link>
                          )}
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              既読
                            </button>
                          )}
                          <button
                            onClick={() => handleDismiss(notification.id)}
                            className="text-xs text-gray-500 hover:text-red-600"
                          >
                            非表示
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* フッター */}
            <div className="p-3 border-t border-gray-200 text-center">
              <Link
                href="/user/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
              >
                すべての通知を見る →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

