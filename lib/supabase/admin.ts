/**
 * Supabase Admin Client
 * サービスロールキーを使用して、他ユーザーのメタデータ更新等を行う
 * サーバーサイドのみで使用すること
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Clientを作成
 * service_role_keyを使用するため、サーバーサイドのみで使用すること
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables for admin client');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * ユーザーのメタデータを更新（管理者用）
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * ユーザーのロールを更新（Auth側のuser_metadata）
 */
export async function updateUserRole(userId: string, role: string) {
  return updateUserMetadata(userId, { role });
}

/**
 * ユーザー一覧を取得（管理者用）
 */
export async function listAuthUsers(page: number = 1, perPage: number = 50) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * ユーザー情報を取得（管理者用）
 */
export async function getAuthUser(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data;
}
