'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchServices } from '@/lib/api/services';
import type { ServiceSearchResult, ServiceSearchFilters as Filters } from '@/lib/api/services';
import { ServiceCard } from '@/components/features/service/ServiceCard';
import {
  ServiceSearchFilters,
  type SearchFilterValues,
} from '@/components/features/service/ServiceSearchFilters';
import { Pagination } from '@/components/features/service/Pagination';

function parseFiltersFromParams(sp: URLSearchParams): SearchFilterValues {
  return {
    q: sp.get('q') || '',
    category: sp.get('category') || '',
    deliveryType: sp.get('deliveryType') || '',
    location: sp.get('location') || '',
    priceMin: sp.get('priceMin') || '',
    priceMax: sp.get('priceMax') || '',
    sortBy: sp.get('sortBy') || 'newest',
  };
}

function filtersToSearchString(f: SearchFilterValues, p: number): string {
  const params = new URLSearchParams();
  if (f.q) params.set('q', f.q);
  if (f.category) params.set('category', f.category);
  if (f.deliveryType) params.set('deliveryType', f.deliveryType);
  if (f.location) params.set('location', f.location);
  if (f.priceMin) params.set('priceMin', f.priceMin);
  if (f.priceMax) params.set('priceMax', f.priceMax);
  if (f.sortBy && f.sortBy !== 'newest') params.set('sortBy', f.sortBy);
  if (p > 1) params.set('page', String(p));
  return params.toString();
}

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<SearchFilterValues>(() => parseFiltersFromParams(searchParams));
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [result, setResult] = useState<ServiceSearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  // ブラウザバック/フォワード対応
  const lastPushedQs = useRef(filtersToSearchString(filters, page));

  useEffect(() => {
    const currentQs = searchParams.toString();
    if (currentQs !== lastPushedQs.current) {
      const newFilters = parseFiltersFromParams(searchParams);
      const newPage = Number(searchParams.get('page')) || 1;
      setFilters(newFilters);
      setPage(newPage);
      lastPushedQs.current = filtersToSearchString(newFilters, newPage);
    }
  }, [searchParams]);

  // データフェッチ
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const params: Filters = {
          q: filters.q || undefined,
          category: filters.category || undefined,
          deliveryType: filters.deliveryType || undefined,
          location: filters.location || undefined,
          priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
          priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
          sortBy: (filters.sortBy as Filters['sortBy']) || 'newest',
          page,
          limit: 12,
          isActive: true,
        };
        const data = await searchServices(params);
        if (!cancelled) setResult(data);
      } catch (err) {
        console.error('サービス取得エラー:', err);
        if (!cancelled) setResult({ services: [], total: 0, page: 1, limit: 12, totalPages: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [filters, page]);

  const syncUrl = useCallback(
    (f: SearchFilterValues, p: number) => {
      const qs = filtersToSearchString(f, p);
      lastPushedQs.current = qs;
      router.replace(`/user/services${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  const handleFilterChange = (newFilters: SearchFilterValues) => {
    setFilters(newFilters);
    setPage(1);
    syncUrl(newFilters, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    syncUrl(filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">サービス検索</h1>
        <p className="mt-2 text-gray-600">
          あなたにぴったりのサービスを見つけましょう
        </p>
      </div>

      <ServiceSearchFilters values={filters} onChange={handleFilterChange} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : result && result.services.length > 0 ? (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {result.total}件中 {(result.page - 1) * result.limit + 1}〜
              {Math.min(result.page * result.limit, result.total)}件を表示
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.services.map((service) => (
              <ServiceCard key={service.id} service={service} linkPrefix="/user/services" />
            ))}
          </div>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">該当するサービスが見つかりませんでした</p>
          {(filters.q || filters.category || filters.location || filters.priceMin || filters.priceMax || filters.deliveryType) && (
            <button
              onClick={() =>
                handleFilterChange({
                  q: '',
                  category: '',
                  deliveryType: '',
                  location: '',
                  priceMin: '',
                  priceMax: '',
                  sortBy: 'newest',
                })
              }
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

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
