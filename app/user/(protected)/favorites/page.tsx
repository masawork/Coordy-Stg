'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getFavoriteCreators, removeFavoriteCreator } from '@/lib/api/favorites';
import { getInstructor } from '@/lib/api/instructors';
import { listServices } from '@/lib/api/services';
import { ServiceCard } from '@/components/features/service/ServiceCard';
import { Button } from '@/components/ui/button';
import { Heart, Star, Trash2 } from 'lucide-react';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    // 認証はレイアウトで実施済み、セッションからユーザーID取得
    const session = getSession();
    if (session) {
      loadFavorites(session.userId);
    }
  }, []);

  const loadFavorites = async (userId: string) => {
    try {
      setLoading(true);

      // お気に入りクリエイター取得
      const favoriteData = await getFavoriteCreators(userId);

      // インストラクター情報を追加
      const favoritesWithInstructor = await Promise.all(
        (favoriteData || []).map(async (favorite) => {
          try {
            const instructor = await getInstructor(favorite.instructorId);
            return {
              ...favorite,
              instructor,
            };
          } catch {
            return {
              ...favorite,
              instructor: null,
            };
          }
        })
      );

      setFavorites(favoritesWithInstructor.filter((f) => f.instructor));

      // お気に入りクリエイターのサービスを取得
      if (favoriteData.length > 0) {
        const instructorIds = favoriteData.map((f) => f.instructorId);
        const allServices = await listServices({ status: 'active' });
        const favoriteServices = (allServices || [])
          .filter((service) => instructorIds.includes(service.instructorId))
          .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

        // インストラクター情報を追加
        const servicesWithInstructor = await Promise.all(
          favoriteServices.map(async (service) => {
            try {
              const instructor = await getInstructor(service.instructorId);
              return {
                ...service,
                instructorName: instructor?.displayName || 'クリエイター',
              };
            } catch {
              return {
                ...service,
                instructorName: 'クリエイター',
              };
            }
          })
        );

        setServices(servicesWithInstructor);
      }
    } catch (err) {
      console.error('お気に入り取得エラー:', err);
      setFavorites([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (favoriteId: string) => {
    if (!confirm('このクリエイターをお気に入りから削除しますか？')) {
      return;
    }

    setRemovingId(favoriteId);

    try {
      await removeFavoriteCreator(favoriteId);

      const session = getSession();
      if (session) {
        await loadFavorites(session.userId);
      }
    } catch (err) {
      console.error('お気に入り削除エラー:', err);
      alert('削除に失敗しました');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">お気に入り</h1>
        <p className="mt-2 text-gray-600">
          お気に入りのクリエイターとサービスを管理できます
        </p>
      </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* お気に入りクリエイター一覧 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                お気に入りクリエイター
              </h2>

              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {favorite.instructor.profileImage && (
                            <img
                              src={favorite.instructor.profileImage}
                              alt={favorite.instructor.displayName}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {favorite.instructor.displayName}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                              {favorite.instructor.bio}
                            </p>
                            {favorite.instructor.rating && (
                              <div className="flex items-center gap-1 mt-2">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-medium">
                                  {favorite.instructor.rating.toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500">
                                  ({favorite.instructor.reviewCount}件)
                                </span>
                              </div>
                            )}
                            {favorite.instructor.specialties && favorite.instructor.specialties.length > 0 && (
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
                        </div>
                        <Button
                          onClick={() => handleRemove(favorite.id)}
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
                    お気に入りのクリエイターがまだいません
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

            {/* お気に入りクリエイターのサービス */}
            {services.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  お気に入りクリエイターのサービス
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
}
