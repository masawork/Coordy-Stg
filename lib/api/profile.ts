/**
 * プロフィール関連のAPI操作（Supabase/Prisma版）
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export interface ClientProfileInput {
  userId: string;
  displayName?: string;
  address?: string;
  phoneNumber?: string;
  dateOfBirth?: Date | string;
  gender?: string;
  isProfileComplete?: boolean;
}

/**
 * プロフィール取得
 */
export async function getClientProfile(userId: string) {
  try {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId },
    });
    return profile;
  } catch (error) {
    console.error('Get client profile error:', error);
    return null;
  }
}

/**
 * プロフィール作成
 */
export async function createClientProfile(input: ClientProfileInput) {
  try {
    const profile = await prisma.clientProfile.create({
      data: {
        userId: input.userId,
        displayName: input.displayName,
        address: input.address,
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender,
        isProfileComplete: input.isProfileComplete ?? false,
      },
    });
    return profile;
  } catch (error: any) {
    console.error('Create client profile error:', error);
    throw new Error(`プロフィールの作成に失敗しました: ${error.message}`);
  }
}

/**
 * プロフィール更新
 */
export async function updateClientProfile(
  userId: string,
  updates: Partial<ClientProfileInput>
) {
  try {
    const updateData: any = {};
    
    if (updates.displayName !== undefined) {
      updateData.displayName = updates.displayName;
    }
    if (updates.address !== undefined) {
      updateData.address = updates.address;
    }
    if (updates.phoneNumber !== undefined) {
      updateData.phoneNumber = updates.phoneNumber;
    }
    if (updates.dateOfBirth !== undefined) {
      updateData.dateOfBirth = updates.dateOfBirth ? new Date(updates.dateOfBirth) : null;
    }
    if (updates.gender !== undefined) {
      updateData.gender = updates.gender;
    }
    if (updates.isProfileComplete !== undefined) {
      updateData.isProfileComplete = updates.isProfileComplete;
    }

    const profile = await prisma.clientProfile.update({
      where: { userId },
      data: updateData,
    });
    return profile;
  } catch (error: any) {
    console.error('Update client profile error:', error);
    throw new Error(`プロフィールの更新に失敗しました: ${error.message}`);
  }
}

/**
 * プロフィール完了チェック
 */
export async function isProfileComplete(userId: string): Promise<boolean> {
  try {
    const profile = await getClientProfile(userId);
    return profile?.isProfileComplete === true;
  } catch (error) {
    console.error('isProfileComplete error:', error);
    return false;
  }
}
