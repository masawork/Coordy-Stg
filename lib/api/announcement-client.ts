// lib/api/announcement-client.ts

export interface Announcement {
  id: string;
  authorId: string;
  target: 'all' | 'users' | 'instructors';
  priority: 'low' | 'medium' | 'high';
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * お知らせ一覧を取得
 * @param target 対象（all, users, instructors）
 * @param limit 取得件数
 */
export async function getAnnouncements(
  target: 'all' | 'users' | 'instructors' = 'all',
  limit: number = 10
): Promise<Announcement[]> {
  try {
    const response = await fetch(`/api/announcements?target=${target}&limit=${limit}`, {
      method: 'GET',
      cache: 'no-store',
    });

    // 404 エラー（お知らせなし）の場合は空配列を返す
    if (response.status === 404) {
      console.info('ℹ️ Announcements: No announcements');
      return [];
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Announcements error:', error);
      return []; // UI には表示しない
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ Announcements fetch error:', error);
    return []; // エラーを握りつぶして空配列を返す
  }
}

/**
 * お知らせ詳細を取得
 * @param id お知らせID
 */
export async function getAnnouncement(id: string): Promise<Announcement> {
  const response = await fetch(`/api/announcements/${id}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'お知らせの取得に失敗しました');
  }

  return await response.json();
}

/**
 * お知らせを作成（講師・管理者）
 */
export async function createAnnouncement(data: {
  target: 'all' | 'users' | 'instructors';
  priority: 'low' | 'medium' | 'high';
  title: string;
  content: string;
  expiresAt?: Date | string | null;
}): Promise<Announcement> {
  const response = await fetch('/api/announcements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'お知らせの作成に失敗しました');
  }

  return await response.json();
}

/**
 * お知らせを更新
 */
export async function updateAnnouncement(
  id: string,
  updates: Partial<Announcement>
): Promise<Announcement> {
  const response = await fetch(`/api/announcements/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'お知らせの更新に失敗しました');
  }

  return await response.json();
}

/**
 * お知らせを削除
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const response = await fetch(`/api/announcements/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'お知らせの削除に失敗しました');
  }
}

/**
 * お知らせを公開（管理者のみ）
 */
export async function publishAnnouncement(id: string): Promise<Announcement> {
  const response = await fetch(`/api/announcements/${id}/publish`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'お知らせの公開に失敗しました');
  }

  return await response.json();
}

