/**
 * 商品カテゴリ定数
 * DB に保存されるカテゴリ値の共通定義
 */

export const SERVICE_CATEGORIES = [
  'ファッション',
  '電子機器・ガジェット',
  'ハンドメイド・アート',
  '本・雑誌',
  'スポーツ・アウトドア',
  'コスメ・美容',
  '食品・飲料',
  'インテリア・雑貨',
  'その他',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
