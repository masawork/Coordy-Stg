'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryPlaceholder } from './CategoryPlaceholder';

interface ServiceImageGalleryProps {
  images: Array<{ id: string; url: string; sortOrder: number }>;
  title: string;
  category?: string;
}

export function ServiceImageGallery({ images, title, category }: ServiceImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 画像がない場合はプレースホルダー
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden">
        <CategoryPlaceholder category={category} />
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  // 1枚の場合はシンプル表示
  if (sortedImages.length === 1) {
    return (
      <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden">
        <img
          src={sortedImages[0].url}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 複数枚の場合はカルーセル
  const goTo = (index: number) => {
    if (index < 0) setCurrentIndex(sortedImages.length - 1);
    else if (index >= sortedImages.length) setCurrentIndex(0);
    else setCurrentIndex(index);
  };

  return (
    <div className="space-y-3">
      {/* メイン画像 */}
      <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden group">
        <img
          src={sortedImages[currentIndex].url}
          alt={`${title} - ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {/* ナビゲーション矢印 */}
        <button
          onClick={() => goTo(currentIndex - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => goTo(currentIndex + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* インジケーター */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {sortedImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-4' : 'bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* サムネイル */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sortedImages.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
              idx === currentIndex ? 'border-purple-500 ring-1 ring-purple-300' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <img
              src={img.url}
              alt={`${title} サムネイル ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
