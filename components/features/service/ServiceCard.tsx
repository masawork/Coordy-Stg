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
    description?: string | null;
    category?: string;
    deliveryType?: string;
    location?: string | null;
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
        image?: string | null;
      };
    };
  };
  linkPrefix?: string;
}

export function ServiceCard({ service, linkPrefix = '/user/services' }: ServiceCardProps) {
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
        }
      }
    };
    checkFavorite();
  }, [service.instructorId]);

  const [favoriteError, setFavoriteError] = useState(false);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!service.instructorId) return;

    setLoading(true);
    setFavoriteError(false);

    const wasFavorite = isFavorite;
    const prevFavoriteId = favoriteId;

    // 楽観的更新
    setIsFavorite(!wasFavorite);
    if (wasFavorite) setFavoriteId(null);

    try {
      if (wasFavorite && prevFavoriteId) {
        await removeFavoriteCreator(prevFavoriteId);
      } else {
        const result = await addFavoriteCreator(service.instructorId);
        setFavoriteId(result?.id || null);
      }
    } catch {
      // 失敗時はUI状態を元に戻す
      setIsFavorite(wasFavorite);
      setFavoriteId(prevFavoriteId);
      setFavoriteError(true);
      setTimeout(() => setFavoriteError(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* サービス画像（クリックで詳細へ遷移） */}
      <Link href={`${linkPrefix}/${service.id}`} className="block">
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
            <div className="absolute top-2 right-2">
              <button
                onClick={handleFavoriteToggle}
                disabled={loading}
                className={`p-2 rounded-full transition-all ${
                  favoriteError
                    ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
                    : isFavorite
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-white/90 text-gray-600 hover:text-red-500'
                } shadow-md`}
                title={favoriteError ? '操作に失敗しました' : isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </Link>

      {/* サービス情報 */}
      <Link href={`${linkPrefix}/${service.id}`} className="block p-4">
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

        {(service.price != null || service.basePrice != null) && (
          <p className="text-lg font-bold text-purple-600 mb-2">
            ¥{(service.price ?? service.basePrice ?? 0).toLocaleString()}
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
