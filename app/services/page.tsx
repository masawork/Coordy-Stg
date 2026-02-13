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

  // ブラウザバック/フォワード対応:
  // searchParams が変わったとき、自分が起こした変更ではなければ state を同期する
  const lastPushedQs = useRef(filtersToSearchString(filters, page));

  useEffect(() => {
    const currentQs = searchParams.toString();
    if (currentQs !== lastPushedQs.current) {
      // ブラウザバック等、外部起因の URL 変更
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
      } catch (error) {
        console.error('Failed to load services:', error);
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
      router.replace(`/services${qs ? `?${qs}` : ''}`, { scroll: false });
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">サービス一覧</h1>
          <p className="text-gray-600">様々なスキルを学べるサービスをご覧いただけます</p>
        </div>

        <div className="mb-8">
          <ServiceSearchFilters values={filters} onChange={handleFilterChange} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : !result || result.services.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">該当するサービスが見つかりませんでした</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {result.total}件中 {(result.page - 1) * result.limit + 1}〜
              {Math.min(result.page * result.limit, result.total)}件を表示
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.services.map((service) => (
                <ServiceCard key={service.id} service={service} linkPrefix="/services" />
              ))}
            </div>

            <div className="mt-8">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
