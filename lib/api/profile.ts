/**
 * プロフィール関連のAPI操作
 */

import { getDataClient } from './data-client';

export interface ClientProfileInput {
  clientId: string;
  name: string;
  displayName?: string;
  address?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  themeColor?: string;
  isProfileComplete?: boolean;
}

/**
 * プロフィール取得
 */
export async function getClientProfile(clientId: string) {
  try {
    console.log('🔍 getClientProfile 開始:', clientId);
    const client = getDataClient();
    const { data, errors } = await client.models.ClientProfile.list({
      filter: { clientId: { eq: clientId } },
    });

    if (errors) {
      console.error('❌ ClientProfile取得エラー:', errors);
      console.error('エラー詳細:', JSON.stringify(errors, null, 2));
      return null;
    }

    console.log('✅ ClientProfile取得結果:', data);
    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    console.error('エラー詳細:', {
      name: error?.name,
      message: error?.message,
      errors: error?.errors,
    });
    return null;
  }
}

/**
 * プロフィール作成
 */
export async function createClientProfile(input: ClientProfileInput) {
  try {
    console.log('📝 createClientProfile 開始:', input);
    const client = getDataClient();
    const { data, errors } = await client.models.ClientProfile.create({
      clientId: input.clientId,
      name: input.name,
      displayName: input.displayName,
      address: input.address,
      phoneNumber: input.phoneNumber,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      themeColor: input.themeColor,
    });

    if (errors) {
      console.error('❌ ClientProfile作成エラー:', errors);
      console.error('エラー詳細:', JSON.stringify(errors, null, 2));
      throw new Error(`プロフィールの作成に失敗しました: ${JSON.stringify(errors)}`);
    }

    // プロフィール完了フラグを明示的に更新（Create入力で受け付けない場合の保険）
    if (data?.id) {
      await client.models.ClientProfile.update({
        id: data.id,
        isProfileComplete: true,
      });
    }

    console.log('✅ ClientProfile作成成功:', data);
    return data;
  } catch (error: any) {
    console.error('❌ Create profile error:', error);
    console.error('エラー詳細:', {
      name: error?.name,
      message: error?.message,
      errors: error?.errors,
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * プロフィール更新
 */
export async function updateClientProfile(
  id: string,
  updates: Partial<ClientProfileInput>
) {
  try {
    console.log('📝 updateClientProfile 開始:', { id, updates });
    const client = getDataClient();
    const { data, errors } = await client.models.ClientProfile.update({
      id,
      name: updates.name,
      displayName: updates.displayName,
      address: updates.address,
      phoneNumber: updates.phoneNumber,
      dateOfBirth: updates.dateOfBirth,
      gender: updates.gender,
      themeColor: updates.themeColor,
      isProfileComplete: updates.isProfileComplete ?? true,
    });

    if (errors) {
      console.error('❌ ClientProfile更新エラー:', errors);
      console.error('エラー詳細:', JSON.stringify(errors, null, 2));
      throw new Error(`プロフィールの更新に失敗しました: ${JSON.stringify(errors)}`);
    }

    console.log('✅ ClientProfile更新成功:', data);
    return data;
  } catch (error: any) {
    console.error('❌ Update profile error:', error);
    console.error('エラー詳細:', {
      name: error?.name,
      message: error?.message,
      errors: error?.errors,
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * プロフィール完了チェック
 */
export async function isProfileComplete(clientId: string): Promise<boolean> {
  const profile = await getClientProfile(clientId);
  const result = profile?.isProfileComplete === true;
  console.log('🔍 isProfileComplete 結果:', { clientId, result, profile });
  return result;
}
