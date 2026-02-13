'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getNotifications, dismissNotification, Notification } from '@/lib/api/notification-client';

export default function NotificationBanner() {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadTopPriorityNotification();
  }, []);

  const loadTopPriorityNotification = async () => {
    try {
      const notifications = await getNotifications(true); // 未読のみ
      
      // 最優先の通知を取得（critical > high > medium > low）
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      let topNotification: Notification | null = null;
      
      for (const priority of priorityOrder) {
        const found = notifications.find((n) => n.priority === priority);
        if (found) {
          topNotification = found;
          break;
        }
      }

      setNotification(topNotification);
    } catch (error) {
      console.error('Load top priority notification error:', error);
    }
  };

  const handleDismiss = async () => {
    if (!notification) return;
    
    try {
      await dismissNotification(notification.id);
      setNotification(null);
    } catch (error) {
      console.error('Dismiss error:', error);
    }
  };

  if (!notification) {
    return null;
  }

  const getBannerStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-blue-500 text-white';
      case 'low':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-purple-600 text-white';
    }
  };

  return (
    <div className={`${getBannerStyle(notification.priority)} px-4 py-3 shadow-md`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-2xl">
            {notification.priority === 'critical' && '🚨'}
            {notification.priority === 'high' && '⚠️'}
            {notification.priority === 'medium' && 'ℹ️'}
            {notification.priority === 'low' && '💡'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{notification.title}</p>
            <p className="text-xs opacity-90">{notification.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notification.actionUrl && notification.actionLabel && (
            <Link
              href={notification.actionUrl}
              className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-semibold transition-colors"
            >
              {notification.actionLabel}
            </Link>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

