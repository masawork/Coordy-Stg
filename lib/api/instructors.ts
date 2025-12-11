/**
 * インストラクター関連のAPI操作
 */

import { getDataClient } from './data-client';

/**
 * インストラクター一覧取得
 */
export async function listInstructors() {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Instructor.list();

    if (errors) {
      console.error('Error listing instructors:', errors);
      throw new Error('インストラクター一覧の取得に失敗しました');
    }

    return data || [];
  } catch (error) {
    console.error('List instructors error:', error);
    throw error;
  }
}

/**
 * インストラクター詳細取得
 */
export async function getInstructor(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Instructor.get({ id });

    if (errors) {
      console.error('Error getting instructor:', errors);
      throw new Error('インストラクターの取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Get instructor error:', error);
    throw error;
  }
}

/**
 * インストラクター作成
 */
export async function createInstructor(input: {
  userId: string;
  displayName: string;
  bio?: string;
  specialties?: string[];
  profileImage?: string;
  hourlyRate?: number;
  status?: string;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Instructor.create({
      ...input,
    });

    if (errors) {
      console.error('Error creating instructor:', errors);
      throw new Error('インストラクター情報の作成に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Create instructor error:', error);
    throw error;
  }
}

/**
 * ユーザーIDからインストラクター情報を取得
 */
export async function getInstructorByUserId(userId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Instructor.list({
      filter: {
        userId: { eq: userId },
      },
    });

    if (errors) {
      console.error('Error getting instructor by userId:', errors);
      throw new Error('インストラクター情報の取得に失敗しました');
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Get instructor by userId error:', error);
    throw error;
  }
}

/**
 * インストラクター情報を更新
 */
export async function updateInstructor(id: string, updates: {
  displayName?: string;
  bio?: string;
  specialties?: string[];
  profileImage?: string;
  hourlyRate?: number;
  status?: string;
  identityDocumentUrl?: string;
  identityDocumentStatus?: 'notSubmitted' | 'pending' | 'approved' | 'rejected';
  identityDocumentSubmittedAt?: string;
  identityDocumentApprovedAt?: string;
  identityDocumentRejectionReason?: string;
  [key: string]: any;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Instructor.update({
      id,
      ...updates,
    });

    if (errors) {
      console.error('Error updating instructor:', errors);
      throw new Error('インストラクター情報の更新に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Update instructor error:', error);
    throw error;
  }
}
