'use client';

import { useState, useEffect } from 'react';
import { listServices } from '@/lib/api/services';
import { ServiceCard } from '@/components/features/service/ServiceCard';
import { getInstructor } from '@/lib/api/instructors';
import type { ServiceCategory } from '@/lib/api/data-client';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [instructorSearch, setInstructorSearch] = useState('');

  useEffect(() => {
    // 認証はレイアウトで実施済み
    loadServices();
  }, [selectedCategory]);

  const loadServices = async () => {
    try {
      setLoading(true);

      const filters = selectedCategory ? { status: 'active' as const, category: selectedCategory } : { status: 'active' as const };
      const allServices = await listServices(filters);

      // インストラクター情報を追加
      const servicesWithInstructor = await Promise.all(
        (allServices || []).map(async (service) => {
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
      setFilteredServices(servicesWithInstructor);
    } catch (err) {
      console.error('サービス取得エラー:', err);
      setServices([]);
      setFilteredServices([]);
    } finally {
      setLoading(false);
    }
  };

  // フィルター処理
  useEffect(() => {
    let result = [...services];

    // キーワード検索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (service) =>
          service.title.toLowerCase().includes(keyword) ||
          service.description?.toLowerCase().includes(keyword)
      );
    }

    // インストラクター検索
    if (instructorSearch) {
      const instructor = instructorSearch.toLowerCase();
      result = result.filter((service) =>
        service.instructorName.toLowerCase().includes(instructor)
      );
    }

    setFilteredServices(result);
  }, [services, searchKeyword, instructorSearch]);

  const categories: Array<{ value: ServiceCategory | null; label: string }> = [
    { value: null, label: 'すべて' },
    { value: 'coaching', label: 'コーチング' },
    { value: 'training', label: 'トレーニング' },
    { value: 'consultation', label: 'コンサルテーション' },
    { value: 'workshop', label: 'ワークショップ' },
    { value: 'seminar', label: 'セミナー' },
    { value: 'other', label: 'その他' },
  ];

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">サービス検索</h1>
        <p className="mt-2 text-gray-600">
          あなたにぴったりのサービスを見つけましょう
        </p>
      </div>

      {/* 検索フィルター */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* キーワード検索 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
              サービス名で検索
            </label>
            <input
              type="text"
              id="keyword"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="キーワードを入力..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 mb-2">
              クリエイター名で検索
            </label>
            <input
              type="text"
              id="instructor"
              value={instructorSearch}
              onChange={(e) => setInstructorSearch(e.target.value)}
              placeholder="クリエイター名を入力..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* カテゴリーフィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリー</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value || 'all'}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* サービス一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : filteredServices.length > 0 ? (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredServices.length}件のサービスが見つかりました
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">該当するサービスが見つかりませんでした</p>
          {(searchKeyword || instructorSearch) && (
            <button
              onClick={() => {
                setSearchKeyword('');
                setInstructorSearch('');
              }}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              検索条件をクリア
            </button>
          )}
        </div>
      )}
    </div>
  );
}
