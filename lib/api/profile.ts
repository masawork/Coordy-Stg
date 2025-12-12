/**
 * プロフィール関連のAPI操作
 *
 * ClientProfileスキーマには displayName フィールドが存在します。
 * displayName は ClientProfile と Cognito の custom:displayName 属性の両方で管理されます。
 */

import { getDataClient } from './data-client';

export interface ClientProfileInput {
  clientId: string;
  name: string;
  displayName?: string; // ClientProfile スキーマに存在する（ニックネーム）
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
 *
 * 注意: ClientProfile スキーマに存在するフィールドのみを送信すること。
 */
export async function createClientProfile(input: ClientProfileInput) {
  try {
    console.log('📝 createClientProfile 開始:', input);
    const client = getDataClient();

    // CreateClientProfileInputに定義されているフィールドのみを送信
    const createInput: Record<string, unknown> = {
      clientId: input.clientId,
      name: input.name,
    };

    // オプショナルフィールドは値がある場合のみ追加
    // displayName は ClientProfile スキーマに存在するため、値がある場合のみ送信
    if (input.displayName !== undefined && input.displayName !== '') {
      createInput.displayName = input.displayName;
    }
    if (input.address !== undefined && input.address !== '') {
      createInput.address = input.address;
    }
    if (input.phoneNumber !== undefined && input.phoneNumber !== '') {
      createInput.phoneNumber = input.phoneNumber;
    }
    if (input.dateOfBirth !== undefined && input.dateOfBirth !== '') {
      createInput.dateOfBirth = input.dateOfBirth;
    }
    if (input.gender !== undefined && input.gender !== '') {
      createInput.gender = input.gender;
    }
    if (input.themeColor !== undefined && input.themeColor !== '') {
      createInput.themeColor = input.themeColor;
    }

    console.log('📝 実際に送信するデータ:', createInput);

    const { data, errors } = await client.models.ClientProfile.create(createInput as any);

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
 *
 * 注意: ClientProfile スキーマに存在するフィールドのみを送信すること。
 */
export async function updateClientProfile(
  id: string,
  updates: Partial<ClientProfileInput>
) {
  try {
    console.log('📝 updateClientProfile 開始:', { id, updates });
    const client = getDataClient();

    // ClientProfile スキーマに存在するフィールドのみを更新
    const updateInput: Record<string, unknown> = { id };

    if (updates.name !== undefined) {
      updateInput.name = updates.name;
    }
    if (updates.displayName !== undefined) {
      updateInput.displayName = updates.displayName;
    }
    if (updates.address !== undefined) {
      updateInput.address = updates.address;
    }
    if (updates.phoneNumber !== undefined) {
      updateInput.phoneNumber = updates.phoneNumber;
    }
    if (updates.dateOfBirth !== undefined) {
      updateInput.dateOfBirth = updates.dateOfBirth;
    }
    if (updates.gender !== undefined) {
      updateInput.gender = updates.gender;
    }
    if (updates.themeColor !== undefined) {
      updateInput.themeColor = updates.themeColor;
    }
    updateInput.isProfileComplete = updates.isProfileComplete ?? true;

    const { data, errors } = await client.models.ClientProfile.update(updateInput as any);

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
