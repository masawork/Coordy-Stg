// lib/api/notification-client.ts

export interface Notification {
  id: string;
  userId: string | null;
  type: 'system' | 'admin' | 'action';
  category: 'verification' | 'payment' | 'reservation' | 'announcement' | 'withdrawal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionLabel: string | null;
  actionUrl: string | null;
  isRead: boolean;
  isDismissed: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通知一覧を取得
 * @param unreadOnly 未読のみ取得するか
 */
export async function getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
  try {
    const response = await fetch(`/api/notifications?unread=${unreadOnly}`, {
      method: 'GET',
      cache: 'no-store',
    });

    // 401 エラー（認証エラー）の場合は空配列を返す
    if (response.status === 401) {
      console.warn('⚠️ Notifications: Not authenticated');
      return [];
    }

    // 404 エラー（通知なし）の場合も空配列を返す
    if (response.status === 404) {
      console.info('ℹ️ Notifications: No notifications');
      return [];
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Notifications error:', error);
      return []; // UI には表示しない
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ Notifications fetch error:', error);
    return []; // エラーを握りつぶして空配列を返す
  }
}

/**
 * 通知を既読にする
 * @param notificationId 通知ID
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '通知の更新に失敗しました');
  }

  return await response.json();
}

/**
 * 通知を非表示にする
 * @param notificationId 通知ID
 */
export async function dismissNotification(notificationId: string): Promise<Notification> {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '通知の非表示に失敗しました');
  }

  return await response.json();
}

/**
 * すべての通知を既読にする
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; count: number; message: string }> {
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'すべての通知を既読にできませんでした');
  }

  return await response.json();
}

/**
 * 未読通知数を取得
 */
export async function getUnreadCount(): Promise<number> {
  const notifications = await getNotifications(true);
  return notifications.length;
}

