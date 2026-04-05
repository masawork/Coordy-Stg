/**
 * サービス用テンプレート画像一覧
 * 画像がないサービス向けにデフォルトで使えるテンプレート画像
 */

export interface TemplateImage {
  id: string;
  label: string;
  url: string;
  category: string;
}

export const TEMPLATE_IMAGES: TemplateImage[] = [
  { id: 'fitness', label: 'フィットネス', url: '/images/templates/fitness.svg', category: 'フィットネス' },
  { id: 'yoga', label: 'ヨガ・ピラティス', url: '/images/templates/yoga.svg', category: 'ヨガ' },
  { id: 'music', label: '音楽・楽器', url: '/images/templates/music.svg', category: '音楽' },
  { id: 'cooking', label: '料理・クッキング', url: '/images/templates/cooking.svg', category: '料理' },
  { id: 'education', label: '教育・学習', url: '/images/templates/education.svg', category: '教育' },
  { id: 'outdoor', label: 'アウトドア', url: '/images/templates/outdoor.svg', category: 'アウトドア' },
  { id: 'consultation', label: '相談・コンサル', url: '/images/templates/consultation.svg', category: '相談' },
  { id: 'default', label: 'デフォルト', url: '/images/templates/default.svg', category: '' },
];

/**
 * カテゴリ名からテンプレート画像URLを取得
 */
export function getTemplateImageForCategory(category?: string): string {
  if (!category) return '/images/templates/default.svg';

  const match = TEMPLATE_IMAGES.find(
    (img) => category.includes(img.category) || img.category.includes(category)
  );
  return match?.url || '/images/templates/default.svg';
}
