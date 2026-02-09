'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { listServices } from '@/lib/api/services';
import { Search, Filter, ArrowRight } from 'lucide-react';

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'price' | 'newest' | 'popular'>('newest');

  const categories = [
    'プログラミング',
    'デザイン',
    '語学',
    '音楽',
    'スポーツ',
    'ビジネス',
    'その他',
  ];

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchKeyword, selectedCategory, sortBy]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const allServices = await listServices({ isActive: true });
      setServices(allServices || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    // キーワード検索
    if (searchKeyword) {
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          service.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          service.instructor?.user?.name?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    // カテゴリーフィルタ
    if (selectedCategory) {
      filtered = filtered.filter((service) => service.category === selectedCategory);
    }

    // ソート
    if (sortBy === 'price') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    setFilteredServices(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">サービス一覧</h1>
          <p className="text-gray-600">様々なスキルを学べるサービスをご覧いただけます</p>
        </div>

        {/* 検索・フィルタ */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* キーワード検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="サービス名、インストラクター名で検索"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* カテゴリーフィルタ */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">すべてのカテゴリー</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* ソート */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="newest">新着順</option>
              <option value="price">価格順</option>
              <option value="popular">人気順</option>
            </select>
          </div>
        </div>

        {/* サービス一覧 */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">該当するサービスが見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <Link href={`/services/${service.id}`}>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {service.description || '説明なし'}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">{service.category}</span>
                      <span className="text-2xl font-bold text-purple-600">
                        ¥{service.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {service.instructor?.user?.name || 'インストラクター'}
                      </span>
                      <span className="text-sm text-gray-500">{service.duration}分</span>
                    </div>
                    <div className="mt-4 flex items-center text-purple-600">
                      <span className="text-sm font-semibold">詳細を見る</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

