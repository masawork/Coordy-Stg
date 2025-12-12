import type { User } from './types';

type ProfileLike = {
  // Instructor モデルには displayName があるが、ClientProfile には存在しない
  displayName?: string | null;
  name?: string | null;
};

/**
 * 表示名の単一ソースを解決する
 *
 * 優先順位:
 * 1. プロフィールの displayName（ClientProfile / Instructor 両方に存在）
 * 2. プロフィールの name（ClientProfile / Instructor 両方に存在）
 * 3. Cognito の custom:displayName 属性
 * 4. Cognito の name 属性
 * 5. メールアドレスのローカル部（@より前）- 最後のフォールバック
 * 6. 'ゲスト'（フォールバック）
 *
 * 注意: ClientProfile スキーマには displayName フィールドが存在します。
 *       displayName が設定されていない場合は name を使用し、
 *       それもない場合は Cognito 属性やメールアドレスをフォールバックとして使用します。
 */
export function resolveDisplayName(
  user: Pick<User, 'email' | 'name' | 'displayName'>,
  profile?: ProfileLike
): string {
  // プロフィールから表示名を取得
  // ClientProfile / Instructor 両方に displayName が存在するため、まず displayName をチェック
  const profileDisplayName = (profile?.displayName || '').trim();
  if (profileDisplayName) return profileDisplayName;

  // displayName がない場合は name を使用
  const profileName = (profile?.name || '').trim();
  if (profileName) return profileName;

  // Cognito の custom:displayName から取得
  const cognitoDisplayName = (user.displayName || '').trim();
  if (cognitoDisplayName) return cognitoDisplayName;

  // Cognito の name から取得
  const cognitoName = (user.name || '').trim();
  if (cognitoName) return cognitoName;

  // メールアドレスのローカル部（最後のフォールバック）
  const emailLocal = (user.email || '').split('@')[0]?.trim();
  return emailLocal || 'ゲスト';
}

/**
 * 禁止ワードリスト
 * 暴力的・差別的・わいせつな表現を含む
 */
const PROHIBITED_WORDS = [
  // 暴力的表現
  '殺', '死', '暴力', '虐待', 'ころす', 'しね',
  // 差別的表現
  '差別', 'ヘイト', '排斥',
  // わいせつ表現
  'エロ', 'アダルト', 'セックス', 'ポルノ',
  // 詐欺・違法関連
  '詐欺', '違法', '犯罪', 'ドラッグ',
  // 英語の禁止ワード
  'kill', 'death', 'hate', 'porn', 'sex', 'drug', 'fuck', 'shit', 'ass',
  // その他不適切表現
  'admin', 'administrator', '管理者', 'システム', 'system', 'coordy', 'official',
];

/**
 * 禁止パターン（正規表現）
 */
const PROHIBITED_PATTERNS = [
  // 記号の繰り返し
  /^[!@#$%^&*()_+=\-[\]{}|;:'"<>,.?/\\]+$/,
  // スペースのみ
  /^\s+$/,
  // 数字のみ
  /^\d+$/,
];

export type DisplayNameValidationResult = {
  isValid: boolean;
  errorMessage?: string;
};

/**
 * 表示名のバリデーション
 * - 禁止ワードチェック
 * - 禁止パターンチェック
 * - 長さチェック
 *
 * @param displayName チェックする表示名
 * @returns バリデーション結果
 */
export function validateDisplayName(displayName: string): DisplayNameValidationResult {
  const trimmed = displayName.trim();

  // 空文字チェック
  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: '表示名を入力してください。',
    };
  }

  // 長さチェック（1〜30文字）
  if (trimmed.length < 1 || trimmed.length > 30) {
    return {
      isValid: false,
      errorMessage: '表示名は1〜30文字で入力してください。',
    };
  }

  // 禁止パターンチェック
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        errorMessage: '有効な表示名を入力してください。',
      };
    }
  }

  // 禁止ワードチェック（大文字小文字を区別しない）
  const lowerName = trimmed.toLowerCase();
  for (const word of PROHIBITED_WORDS) {
    if (lowerName.includes(word.toLowerCase())) {
      return {
        isValid: false,
        errorMessage: '不適切な表現が含まれている可能性があります。別の表示名をお試しください。',
      };
    }
  }

  return { isValid: true };
}
