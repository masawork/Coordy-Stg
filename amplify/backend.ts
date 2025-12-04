import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

/**
 * Coordy バックエンド設定
 * - auth: Cognito認証
 * - data: DynamoDB + AppSync GraphQL API
 * - storage: S3ストレージ（画像、ファイルアップロード）
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
});