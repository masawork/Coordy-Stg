/**
 * お気に入り関連のAPI操作（クライアント版）
 * ブラウザから呼び出す場合はこちらを使用
 */

// ========================================
// クリエイター（出品者）お気に入り
// ========================================

export async function getFavoriteCreators() {
  try {
    const response = await fetch('/api/favorites', {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'お気に入り取得に失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('Get favorite creators error:', error);
    throw error;
  }
}

/**
 * お気に入りクリエイター追加
 */
export async function addFavoriteCreator(instructorId: string) {
  try {
    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ instructorId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'お気に入り追加に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Add favorite creator error:', error);
    throw new Error(`お気に入り追加に失敗しました: ${error.message}`);
  }
}

/**
 * お気に入りクリエイター削除
 */
export async function removeFavoriteCreator(favoriteId: string) {
  try {
    const response = await fetch(`/api/favorites/${favoriteId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'お気に入り削除に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Remove favorite creator error:', error);
    throw new Error(`お気に入り削除に失敗しました: ${error.message}`);
  }
}

// ========================================
// サービスいいね
// ========================================

export async function getFavoriteServices() {
  const response = await fetch('/api/favorite-services', {
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'いいね一覧の取得に失敗しました');
  }
  return response.json();
}

export async function addFavoriteService(serviceId: string) {
  const response = await fetch('/api/favorite-services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ serviceId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'いいねに失敗しました');
  }
  return response.json();
}

export async function removeFavoriteService(favoriteId: string) {
  const response = await fetch(`/api/favorite-services/${favoriteId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'いいね解除に失敗しました');
  }
  return response.json();
}
