'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { addFavoriteCreator, removeFavoriteCreator, getFavoriteCreators } from '@/lib/api/favorites-client';
import { CategoryPlaceholder } from './CategoryPlaceholder';

const deliveryTypeLabels: Record<string, string> = {
  remote: 'オンライン',
  onsite: '対面',
  hybrid: 'オンライン/対面',
};

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    deliveryType?: string;
    location?: string;
    duration: number;
    price?: number;
    basePrice?: number; // 互換性のため
    image?: string;
    images?: Array<{ url: string; sortOrder: number }>;
    instructorId?: string;
    instructorName?: string;
    instructor?: {
      displayName?: string;
      user?: {
        name?: string;
      };
    };
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      if (service.instructorId) {
        try {
          const favorites = await getFavoriteCreators();
          const favorite = favorites.find((f: any) => f.instructorId === service.instructorId);
          if (favorite) {
            setIsFavorite(true);
            setFavoriteId(favorite.id);
          }
        } catch (err) {
          // 未ログイン時などはエラーを無視
          console.error('お気に入り確認エラー:', err);
        }
      }
    };
    checkFavorite();
  }, [service.instructorId]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!service.instructorId) return;

    setLoading(true);

    try {
      if (isFavorite && favoriteId) {
        await removeFavoriteCreator(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const result = await addFavoriteCreator(service.instructorId);
        setIsFavorite(true);
        setFavoriteId(result?.id || null);
      }
    } catch (err) {
      console.error('お気に入り操作エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* サービス画像（クリックで詳細へ遷移） */}
      <Link href={`/user/services/${service.id}`} className="block">
        <div className="relative h-48">
          {(service.images?.[0]?.url || service.image) ? (
            <img
              src={service.images?.[0]?.url || service.image}
              alt={service.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <CategoryPlaceholder category={service.category} />
          )}

          {/* カテゴリーバッジ */}
          {service.category && (
            <span className="absolute top-2 left-2 px-2 py-1 bg-white/90 rounded text-xs font-medium text-purple-700">
              {service.category}
            </span>
          )}

          {/* お気に入りボタン */}
          {service.instructorId && (
            <button
              onClick={handleFavoriteToggle}
              disabled={loading}
              className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                isFavorite
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/90 text-gray-600 hover:text-red-500'
              } shadow-md`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </Link>

      {/* サービス情報 */}
      <Link href={`/user/services/${service.id}`} className="block p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
          {service.title}
        </h3>

        {(service.instructor || service.instructorName) && (
          <p className="text-sm text-purple-600 font-medium mb-1">
            {service.instructor?.user?.name || service.instructor?.displayName || service.instructorName}
          </p>
        )}

        {service.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {service.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{service.duration}分</span>
          <span>
            {deliveryTypeLabels[service.deliveryType || 'remote']}
            {service.location && ` / ${service.location}`}
          </span>
        </div>
      </Link>
    </div>
  );
}
