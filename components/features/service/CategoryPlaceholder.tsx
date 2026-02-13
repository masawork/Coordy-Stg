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

const defaultImage = '/images/categories/default.jpg';

export function CategoryPlaceholder({ category, className = '' }: CategoryPlaceholderProps) {
  const imageSrc = (category && categoryImages[category]) || defaultImage;

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
