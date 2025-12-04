'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, DollarSign, Heart } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { addFavoriteCreator, removeFavoriteCreator, getFavoriteCreators } from '@/lib/api/favorites';

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    duration: number;
    basePrice: number;
    image?: string;
    instructorId?: string;
    instructorName?: string;
    instructor?: {
      displayName: string;
    };
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const session = getSession();
      if (session && service.instructorId) {
        try {
          const favorites = await getFavoriteCreators(session.userId);
          const favorite = favorites.find((f) => f.instructorId === service.instructorId);
          if (favorite) {
            setIsFavorite(true);
            setFavoriteId(favorite.id);
          }
        } catch (err) {
          console.error('お気に入り確認エラー:', err);
        }
      }
    };
    checkFavorite();
  }, [service.instructorId]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const session = getSession();
    if (!session || !service.instructorId) return;

    setLoading(true);

    try {
      if (isFavorite && favoriteId) {
        await removeFavoriteCreator(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const result = await addFavoriteCreator(session.userId, service.instructorId);
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
      {/* サービス画像 */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100">
        {service.image ? (
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            画像なし
          </div>
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

      {/* サービス情報 */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {service.title}
        </h3>

        {service.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {service.description}
          </p>
        )}

        {(service.instructor || service.instructorName) && (
          <p className="text-sm text-gray-500 mb-3">
            クリエイター: {service.instructor?.displayName || service.instructorName}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{service.duration}分</span>
          </div>
          <div className="flex items-center gap-1 text-purple-600 font-semibold">
            <DollarSign className="h-4 w-4" />
            <span>{service.basePrice.toLocaleString()}pt</span>
          </div>
        </div>

        {/* アクションボタン */}
        <Link
          href={`/user/services/${service.id}`}
          className="block w-full px-4 py-2 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition-colors"
        >
          詳しく見る
        </Link>
      </div>
    </div>
  );
}
