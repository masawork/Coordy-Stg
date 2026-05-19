/**
 * サービスカテゴリ定数
 * DB に保存されるカテゴリ値の共通定義
 */

export const SERVICE_CATEGORIES = [
  // スキル・教育系
  'レッスン・教育',
  'ビジネスコンサル',
  '語学・翻訳',
  'プログラミング・IT',
  // 生活・暮らし系
  '家事・家政',
  '育児・介護',
  '修理・リフォーム',
  '引越し・運搬',
  // 美容・健康系
  '美容・エステ',
  'フィットネス・ヨガ',
  'カウンセリング',
  // クリエイティブ系
  'デザイン・映像',
  '写真・撮影',
  '音楽・演奏',
  // 体験・アクティビティ系
  'アウトドア・体験',
  'ツアー・ガイド',
  // 人材・ビジネス系
  '人材紹介・採用支援',
  '事務・経理代行',
  '法律・税務相談',
  // その他
  'その他',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

/**
 * 料金体系（将来のpricing_type対応用）
 */
export const PRICING_TYPES = [
  { value: 'fixed', label: '固定料金' },
  { value: 'hourly', label: '時間制（1時間あたり）' },
  { value: 'daily', label: '日額制（1日あたり）' },
  { value: 'monthly', label: '月額制' },
  { value: 'negotiable', label: '要相談' },
] as const;

export type PricingType = (typeof PRICING_TYPES)[number]['value'];
