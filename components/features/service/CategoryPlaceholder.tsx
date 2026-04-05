import React from 'react';
import Image from 'next/image';

interface CategoryPlaceholderProps {
  category?: string;
  className?: string;
}

const categoryImages: Record<string, string> = {
  'プログラミング': '/images/categories/programming.jpg',
  'デザイン': '/images/categories/design.jpg',
  '語学': '/images/categories/language.jpg',
  '音楽': '/images/categories/music.jpg',
  'スポーツ': '/images/categories/sports.jpg',
  'ビジネス': '/images/categories/business.jpg',
  'coaching': '/images/categories/business.jpg',
  'training': '/images/categories/sports.jpg',
  'consultation': '/images/categories/business.jpg',
  'workshop': '/images/categories/programming.jpg',
  'seminar': '/images/categories/business.jpg',
};

// テンプレートSVG画像（カテゴリ画像が存在しない場合のフォールバック）
const templateImages: Record<string, string> = {
  'フィットネス': '/images/templates/fitness.svg',
  'トレーニング': '/images/templates/fitness.svg',
  'ヨガ': '/images/templates/yoga.svg',
  'ピラティス': '/images/templates/yoga.svg',
  '音楽': '/images/templates/music.svg',
  '料理': '/images/templates/cooking.svg',
  'クッキング': '/images/templates/cooking.svg',
  '教育': '/images/templates/education.svg',
  '学習': '/images/templates/education.svg',
  'アウトドア': '/images/templates/outdoor.svg',
  '自然体験': '/images/templates/outdoor.svg',
  '相談': '/images/templates/consultation.svg',
  'コンサルティング': '/images/templates/consultation.svg',
  'training': '/images/templates/fitness.svg',
  'coaching': '/images/templates/consultation.svg',
  'consultation': '/images/templates/consultation.svg',
  'workshop': '/images/templates/education.svg',
  'seminar': '/images/templates/education.svg',
};

const defaultImage = '/images/categories/default.jpg';

export function CategoryPlaceholder({ category, className = '' }: CategoryPlaceholderProps) {
  const imageSrc = (category && categoryImages[category])
    || (category && templateImages[category])
    || '/images/templates/default.svg';

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Image
        src={imageSrc}
        alt={category || 'サービス'}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
