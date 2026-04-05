'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Package, Search, Eye, EyeOff } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  category: string;
  price: number;
  duration: number;
  isActive: boolean;
  deliveryType: string;
  maxParticipants: number;
  createdAt: string;
  instructor?: {
    id: string;
    user?: {
      name: string;
      email: string;
    };
  };
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/services', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('サービス一覧の取得に失敗しました');
      }

      const data = await response.json();
      setServices(data.services || data || []);
    } catch (err) {
      console.error('サービス取得エラー:', err);
      setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.title.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term) ||
      s.instructor?.user?.name?.toLowerCase().includes(term) ||
      s.instructor?.user?.email?.toLowerCase().includes(term)
    );
  });

  const getDeliveryLabel = (type: string) => {
    const labels: Record<string, string> = {
      remote: 'オンライン',
      onsite: '対面',
      hybrid: 'ハイブリッド',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サービス管理</h1>
          <p className="mt-1 text-gray-600">
            登録されているサービスを管理します（{services.length}件）
          </p>
        </div>
        <button
          onClick={loadServices}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          再読み込み
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="サービス名・カテゴリ・サービス提供者名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? '検索条件に一致するサービスがありません' : 'サービスがまだ登録されていません'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">サービス名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">サービス提供者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">料金</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">形態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">定員</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{service.title}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.instructor?.user?.name || '不明'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ¥{service.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.duration}分
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDeliveryLabel(service.deliveryType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.maxParticipants}名
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Eye className="h-3 w-3" />
                          公開中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <EyeOff className="h-3 w-3" />
                          非公開
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
