/**
 * サービスカテゴリ定数
 * DB に保存されるカテゴリ値の共通定義
 */

export const SERVICE_CATEGORIES = [
  'プログラミング',
  'デザイン',
  '語学',
  '音楽',
  'スポーツ',
  'ビジネス',
  'その他',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
