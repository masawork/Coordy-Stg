/**
 * お気に入りクリエイター関連のAPI操作（Prisma版）
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * お気に入りクリエイター一覧取得
 */
export async function getFavoriteCreators(userId: string) {
  try {
    const favorites = await prisma.favoriteCreator.findMany({
      where: { userId },
      include: {
        instructor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites;
  } catch (error) {
    console.error('Get favorite creators error:', error);
    throw error;
  }
}

/**
 * お気に入りクリエイター追加
 */
export async function addFavoriteCreator(userId: string, instructorId: string) {
  try {
    const favorite = await prisma.favoriteCreator.create({
      data: {
        userId,
        instructorId,
      },
      include: {
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });

    return favorite;
  } catch (error: any) {
    console.error('Add favorite creator error:', error);
    if (error.code === 'P2002') {
      throw new Error('既にお気に入りに登録されています');
    }
    throw new Error(`お気に入り追加に失敗しました: ${error.message}`);
  }
}

/**
 * お気に入りクリエイター削除
 */
export async function removeFavoriteCreator(userId: string, instructorId: string) {
  try {
    await prisma.favoriteCreator.deleteMany({
      where: {
        userId,
        instructorId,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Remove favorite creator error:', error);
    throw new Error(`お気に入り削除に失敗しました: ${error.message}`);
  }
}

/**
 * 特定のクリエイターがお気に入りかチェック
 */
export async function isFavoriteCreator(userId: string, instructorId: string) {
  try {
    const favorite = await prisma.favoriteCreator.findUnique({
      where: {
        userId_instructorId: {
          userId,
          instructorId,
        },
      },
    });

    return !!favorite;
  } catch (error) {
    console.error('Check favorite creator error:', error);
    return false;
  }
}
