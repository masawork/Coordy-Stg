'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getFavoriteCreators, removeFavoriteCreator, getFavoriteServices, removeFavoriteService } from '@/lib/api/favorites-client';
import { ServiceCard } from '@/components/features/service/ServiceCard';
import { Button } from '@/components/ui/button';
import { Heart, Trash2 } from 'lucide-react';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [likedServices, setLikedServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'services' | 'creators'>('services');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }

      const [creatorData, serviceData] = await Promise.all([
        getFavoriteCreators().catch(() => []),
        getFavoriteServices().catch(() => []),
      ]);

      setFavorites(creatorData || []);
      setLikedServices(serviceData || []);
    } catch {
      setFavorites([]);
      setLikedServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCreator = async (favoriteId: string) => {
    if (!confirm('この出品者をお気に入りから削除しますか？')) return;
    setRemovingId(favoriteId);
    try {
      await removeFavoriteCreator(favoriteId);
      await loadFavorites();
    } catch {
      alert('削除に失敗しました');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveService = async (favoriteId: string) => {
    if (!confirm('このサービスのいいねを解除しますか？')) return;
    setRemovingId(favoriteId);
    try {
      await removeFavoriteService(favoriteId);
      await loadFavorites();
    } catch {
      alert('解除に失敗しました');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">お気に入り</h1>
        <p className="mt-2 text-gray-600">
          いいねしたサービスやお気に入り出品者を管理できます
        </p>
      </div>

      {/* タブ切替 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('services')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'services'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          いいねしたサービス
          {likedServices.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
              {likedServices.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('creators')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'creators'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          お気に入り出品者
          {favorites.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
              {favorites.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : tab === 'services' ? (
        <div className="bg-white rounded-lg shadow p-6">
          {likedServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedServices.map((fav: any) => (
                <div key={fav.id} className="relative">
                  <ServiceCard service={fav.service} />
                  <button
                    onClick={() => handleRemoveService(fav.id)}
                    disabled={removingId === fav.id}
                    className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-full text-gray-400 hover:text-red-600 shadow-sm z-10"
                    title="いいね解除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                いいねしたサービスがまだありません
              </p>
              <Button
                onClick={() => router.push('/user/services')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                サービスを探す
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((favorite: any) => (
                <div
                  key={favorite.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {favorite.instructor?.user?.name || '出品者'}
                      </h3>
                      {favorite.instructor?.bio && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                          {favorite.instructor.bio}
                        </p>
                      )}
                      {favorite.instructor?.specialties?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {favorite.instructor.specialties.slice(0, 3).map((specialty: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRemoveCreator(favorite.id)}
                      disabled={removingId === favorite.id}
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                お気に入りの出品者がまだいません
              </p>
              <Button
                onClick={() => router.push('/user/services')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                サービスを探す
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
