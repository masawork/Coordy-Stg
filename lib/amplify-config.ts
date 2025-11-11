import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

/**
 * Amplify設定を初期化
 *
 * このファイルはアプリケーション起動時に一度だけ実行される
 */
export function configureAmplify() {
  Amplify.configure(outputs, {
    ssr: true
  });
}

/**
 * カラースキーム定義
 * 
 * ユーザーロール別の統一カラー
 */
export const COLOR_SCHEME = {
  user: {
    primary: '#3B82F6',    // blue-600
    hover: '#2563EB',      // blue-700
    light: '#DBEAFE',      // blue-100
    name: 'ユーザー'
  },
  instructor: {
    primary: '#10B981',    // green-600
    hover: '#059669',      // green-700
    light: '#D1FAE5',      // green-100
    name: 'インストラクター'
  },
  admin: {
    primary: '#F97316',    // orange-600
    hover: '#EA580C',      // orange-700
    light: '#FED7AA',      // orange-100
    name: '管理者'
  }
} as const;

export type UserRole = keyof typeof COLOR_SCHEME;

/**
 * ロール別のボタンスタイルを取得
 */
export function getRoleButtonStyle(role: UserRole) {
  const colors = COLOR_SCHEME[role];
  return {
    backgroundColor: colors.primary,
    ':hover': {
      backgroundColor: colors.hover
    }
  };
}
