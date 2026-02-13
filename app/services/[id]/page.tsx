'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getService } from '@/lib/api/services';
import { getSession } from '@/lib/auth';
import Button from '@/components/common/Button';
import { Calendar, Clock, User, Tag, ArrowLeft } from 'lucide-react';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadService();
    checkAuth();
  }, [serviceId]);

  const loadService = async () => {
    try {
      setLoading(true);
      const serviceData = await getService(serviceId);
      setService(serviceData);
    } catch (error) {
      console.error('Failed to load service:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const session = await getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        setUserRole(session.user.user_metadata?.role?.toLowerCase() || '');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">サービスが見つかりません</h1>
          <Link href="/services" className="text-purple-600 hover:text-purple-700">
            サービス一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const canReserve = isAuthenticated && userRole === 'user';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/services"
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          サービス一覧に戻る
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">{service.category}</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{service.title}</h1>
              <div className="flex items-center gap-6 text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{service.instructor?.user?.name || 'インストラクター'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{service.duration}分</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ¥{service.price.toLocaleString()}
                </div>
              </div>
            </div>

            {service.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">サービス内容</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
              </div>
            )}

            {/* インストラクター情報 */}
            {service.instructor && (
              <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">インストラクター情報</h2>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-semibold">名前:</span> {service.instructor.user?.name}
                  </p>
                  {service.instructor.bio && (
                    <p className="text-gray-700">
                      <span className="font-semibold">自己紹介:</span> {service.instructor.bio}
                    </p>
                  )}
                  {service.instructor.specialties && service.instructor.specialties.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">専門分野:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {service.instructor.specialties.map((specialty: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 予約ボタン */}
            <div className="border-t pt-6">
              {canReserve ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push(`/services/${serviceId}/reserve`)}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  予約する
                </Button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm mb-3">
                    このサービスを予約するにはログインが必要です
                  </p>
                  <div className="flex gap-2">
                    <Link href="/login/user">
                      <Button variant="primary" size="sm">
                        ログイン
                      </Button>
                    </Link>
                    <Link href="/signup/user">
                      <Button variant="outline" size="sm">
                        新規登録
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

