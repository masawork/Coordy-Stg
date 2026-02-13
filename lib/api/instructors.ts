/**
 * インストラクター関連のAPI操作（Supabase/Prisma版）
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export interface InstructorInput {
  userId: string;
  bio?: string;
  specialties?: string[];
  hourlyRate?: number;
  isVerified?: boolean;
  // TODO: 身分証明書関連のフィールドはPrismaスキーマに未実装
  // identityDocumentUrl?: string;
  // identityDocumentStatus?: string;
  // identityDocumentSubmittedAt?: string;
}

/**
 * インストラクター一覧取得
 */
export async function listInstructors() {
  try {
    const instructors = await prisma.instructor.findMany({
      include: {
        user: true,
      },
    });
    return instructors;
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
    const instructor = await prisma.instructor.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
    return instructor;
  } catch (error) {
    console.error('Get instructor error:', error);
    throw error;
  }
}

/**
 * ユーザーIDからインストラクター情報を取得
 */
export async function getInstructorByUserId(userId: string) {
  try {
    const instructor = await prisma.instructor.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
    return instructor;
  } catch (error) {
    console.error('Get instructor by userId error:', error);
    throw error;
  }
}

/**
 * インストラクター作成
 */
export async function createInstructor(input: InstructorInput) {
  try {
    const instructor = await prisma.instructor.create({
      data: {
        userId: input.userId,
        bio: input.bio,
        specialties: input.specialties || [],
        hourlyRate: input.hourlyRate,
        isVerified: input.isVerified ?? false,
      },
      include: {
        user: true,
      },
    });
    return instructor;
  } catch (error: any) {
    console.error('Create instructor error:', error);
    throw new Error(`インストラクターの作成に失敗しました: ${error.message}`);
  }
}

/**
 * インストラクター情報を更新
 */
export async function updateInstructor(
  userId: string,
  updates: Partial<InstructorInput>
) {
  try {
    const updateData: any = {};
    
    if (updates.bio !== undefined) {
      updateData.bio = updates.bio;
    }
    if (updates.specialties !== undefined) {
      updateData.specialties = updates.specialties;
    }
    if (updates.hourlyRate !== undefined) {
      updateData.hourlyRate = updates.hourlyRate;
    }
    if (updates.isVerified !== undefined) {
      updateData.isVerified = updates.isVerified;
    }
    // TODO: 身分証明書関連のフィールドはPrismaスキーマに未実装
    // if (updates.identityDocumentUrl !== undefined) {
    //   updateData.identityDocumentUrl = updates.identityDocumentUrl;
    // }
    // if (updates.identityDocumentStatus !== undefined) {
    //   updateData.identityDocumentStatus = updates.identityDocumentStatus;
    // }
    // if (updates.identityDocumentSubmittedAt !== undefined) {
    //   updateData.identityDocumentSubmittedAt = updates.identityDocumentSubmittedAt;
    // }

    const instructor = await prisma.instructor.update({
      where: { userId },
      data: updateData,
      include: {
        user: true,
      },
    });
    return instructor;
  } catch (error: any) {
    console.error('Update instructor error:', error);
    throw new Error(`インストラクター情報の更新に失敗しました: ${error.message}`);
  }
}
