/**
 * お気に入りクリエイター関連のAPI操作
 */

import { getDataClient } from './data-client';

/**
 * お気に入りクリエイター一覧取得
 */
export async function getFavoriteCreators(clientId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.FavoriteCreator.list({
      filter: {
        clientId: { eq: clientId },
      },
    });

    if (errors) {
      console.error('Error listing favorite creators:', errors);
      throw new Error('お気に入りクリエイターの取得に失敗しました');
    }

    return data || [];
  } catch (error) {
    console.error('Get favorite creators error:', error);
    throw error;
  }
}

/**
 * お気に入りクリエイター追加
 */
export async function addFavoriteCreator(clientId: string, instructorId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.FavoriteCreator.create({
      clientId,
      instructorId,
    });

    if (errors) {
      console.error('Error adding favorite creator:', errors);
      throw new Error('お気に入り追加に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Add favorite creator error:', error);
    throw error;
  }
}

/**
 * お気に入りクリエイター削除
 */
export async function removeFavoriteCreator(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.FavoriteCreator.delete({ id });

    if (errors) {
      console.error('Error removing favorite creator:', errors);
      throw new Error('お気に入り削除に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Remove favorite creator error:', error);
    throw error;
  }
}

/**
 * 特定のクリエイターがお気に入りかチェック
 */
export async function isFavoriteCreator(clientId: string, instructorId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.FavoriteCreator.list({
      filter: {
        clientId: { eq: clientId },
        instructorId: { eq: instructorId },
      },
    });

    if (errors) {
      console.error('Error checking favorite creator:', errors);
      return false;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('Check favorite creator error:', error);
    return false;
  }
}
