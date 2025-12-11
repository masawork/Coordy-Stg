import type { User } from './types';

type ProfileLike = {
 displayName?: string | null;
  name?: string | null;
};

/**
 * 表示名の単一ソースを解決する
 * 優先順位: プロフィールのdisplayName/name → Cognitoのname → メールローカル部 → 'ゲスト'
 */
export function resolveDisplayName(
  user: Pick<User, 'email' | 'name' | 'displayName'>,
  profile?: ProfileLike
): string {
  const profileName = (profile?.displayName || profile?.name || '').trim();
  if (profileName) return profileName;

  const displayName = (user.displayName || '').trim();
  if (displayName) return displayName;

  const cognitoName = (user.name || '').trim();
  if (cognitoName) return cognitoName;

  const emailLocal = (user.email || '').split('@')[0]?.trim();
  return emailLocal || 'ゲスト';
}
