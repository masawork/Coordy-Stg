/**
 * サービス関連のAPI操作
 */

import { getDataClient } from './data-client';
import type { Service, ServiceCategory, ServiceStatus } from './data-client';

/**
 * サービス一覧取得
 */
export async function listServices(filters?: {
  category?: ServiceCategory;
  status?: ServiceStatus;
  instructorId?: string;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Service.list({
      filter: filters
        ? {
            ...(filters.category && { category: { eq: filters.category } }),
            ...(filters.status && { status: { eq: filters.status } }),
            ...(filters.instructorId && { instructorId: { eq: filters.instructorId } }),
          }
        : undefined,
    });

    if (errors) {
      console.error('Error listing services:', errors);
      throw new Error('サービス一覧の取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('List services error:', error);
    throw error;
  }
}

/**
 * サービス詳細取得
 */
export async function getService(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Service.get({ id });

    if (errors) {
      console.error('Error getting service:', errors);
      throw new Error('サービスの取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Get service error:', error);
    throw error;
  }
}

/**
 * サービス作成
 */
export async function createService(input: {
  title: string;
  description?: string;
  category: ServiceCategory;
  duration: number;
  basePrice: number;
  maxParticipants?: number;
  image?: string;
  tags?: string[];
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Service.create({
      ...input,
      instructorId: '', // TODO: 現在のユーザーのinstructorIdを取得
      status: 'draft',
    });

    if (errors) {
      console.error('Error creating service:', errors);
      throw new Error('サービスの作成に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Create service error:', error);
    throw error;
  }
}

/**
 * サービス更新
 */
export async function updateService(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    duration: number;
    basePrice: number;
    maxParticipants: number;
    image: string;
    tags: string[];
    status: ServiceStatus;
  }>
) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Service.update({
      id,
      ...updates,
    });

    if (errors) {
      console.error('Error updating service:', errors);
      throw new Error('サービスの更新に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Update service error:', error);
    throw error;
  }
}

/**
 * サービス削除
 */
export async function deleteService(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Service.delete({ id });

    if (errors) {
      console.error('Error deleting service:', errors);
      throw new Error('サービスの削除に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Delete service error:', error);
    throw error;
  }
}
