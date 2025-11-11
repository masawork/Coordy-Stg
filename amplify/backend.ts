import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

/**
 * Coordy バックエンド設定
 */
export const backend = defineBackend({
  auth,
});