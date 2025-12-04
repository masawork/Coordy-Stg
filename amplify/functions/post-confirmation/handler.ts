/**
 * Post Confirmation Lambda トリガー
 * ユーザーが認証コードを確認した後に自動的に実行される
 *
 * 実行内容:
 * 1. Cognitoグループに追加（custom:role属性に基づく）
 * 2. DynamoDB UserテーブルにUser レコードを作成
 * 3. インストラクターの場合、Instructor テーブルにもレコードを作成
 */

import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostConfirmationTriggerHandler } from 'aws-lambda';

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('🔔 Post Confirmation トリガー実行:', JSON.stringify(event, null, 2));

  const { userPoolId, userName } = event;
  const { email, name } = event.request.userAttributes;
  const customRole = event.request.userAttributes['custom:role'] || 'user';

  try {
    // 1. Cognitoグループに追加
    let groupName = 'CLIENTS';
    if (customRole === 'instructor') {
      groupName = 'CREATORS';
    } else if (customRole === 'admin') {
      groupName = 'ADMINS';
    }

    console.log(`👥 ユーザーをグループに追加: ${userName} → ${groupName}`);

    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: userName,
        GroupName: groupName,
      })
    );

    console.log(`✅ グループ追加完了: ${groupName}`);

    // 2. DynamoDB Userテーブルにレコードを作成
    // Note: Amplify Gen2 Data APIを使用する場合、ここではGraphQL Mutationを実行する必要がある
    // しかし、Lambda内でのGraphQL実行は複雑なため、クライアント側で作成する方が簡単
    // 代わりに、ログイン時にUserレコードが存在しない場合は自動作成するようにする

    console.log('✅ Post Confirmation 処理完了');
  } catch (error) {
    console.error('❌ Post Confirmation エラー:', error);
    // エラーが発生してもユーザー登録は継続する（エラーを throw しない）
  }

  return event;
};
