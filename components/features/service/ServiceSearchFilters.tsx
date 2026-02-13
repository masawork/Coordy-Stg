'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/lib/constants/categories';
import { PREFECTURES } from '@/lib/constants/prefectures';

const DELIVERY_TYPES = [
  { value: 'remote', label: 'オンライン' },
  { value: 'onsite', label: '対面' },
  { value: 'hybrid', label: 'オンライン/対面' },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: '新着順' },
  { value: 'price_asc', label: '価格が安い順' },
  { value: 'price_desc', label: '価格が高い順' },
] as const;

export interface SearchFilterValues {
  q: string;
  category: string;
  deliveryType: string;
  location: string;
  priceMin: string;
  priceMax: string;
  sortBy: string;
}

interface ServiceSearchFiltersProps {
  values: SearchFilterValues;
  onChange: (values: SearchFilterValues) => void;
}

/**
 * デバウンス付き検索入力。
 * onDebouncedChange の参照が変わっても内部でrefで吸収し、
 * debounceタイマーのリセットを避ける。
 */
function DebouncedSearchInput({
  defaultValue,
  onDebouncedChange,
}: {
  defaultValue: string;
  onDebouncedChange: (val: string) => void;
}) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(onDebouncedChange);

  useEffect(() => {
    callbackRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      callbackRef.current(val);
    }, 300);
  }, []);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder="サービス名、インストラクター名で検索"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
    </div>
  );
}

export function ServiceSearchFilters({ values, onChange }: ServiceSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const update = (patch: Partial<SearchFilterValues>) => {
    onChange({ ...values, ...patch });
  };

  const handleQChange = useCallback(
    (val: string) => {
      onChange({ ...values, q: val });
    },
    [values, onChange],
  );

  const advancedCount = [
    values.category,
    values.deliveryType,
    values.location,
    values.priceMin,
    values.priceMax,
  ].filter(Boolean).length;

  const clearAll = () => {
    setInputKey((k) => k + 1);
    onChange({
      q: '',
      category: '',
      deliveryType: '',
      location: '',
      priceMin: '',
      priceMax: '',
      sortBy: 'newest',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
      {/* Row 1: Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <DebouncedSearchInput
          key={inputKey}
          defaultValue={values.q}
          onDebouncedChange={handleQChange}
        />

        <select
          value={values.sortBy || 'newest'}
          onChange={(e) => update({ sortBy: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white sm:w-44"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Toggle advanced + active count */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          詳細フィルター
          {advancedCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-purple-600 text-white rounded-full">
              {advancedCount}
            </span>
          )}
        </button>

        {(advancedCount > 0 || values.q) && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            クリア
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {/* Category pills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリー</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    update({ category: values.category === cat ? '' : cat })
                  }
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    values.category === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery type pills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">提供形態</label>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() =>
                    update({
                      deliveryType: values.deliveryType === dt.value ? '' : dt.value,
                    })
                  }
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    values.deliveryType === dt.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Area + Price row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Area dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">エリア</label>
              <select
                value={values.location}
                onChange={(e) => update({ location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">すべて</option>
                {PREFECTURES.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>

            {/* Price min */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低価格</label>
              <input
                type="number"
                min={0}
                step={100}
                placeholder="¥0"
                value={values.priceMin}
                onChange={(e) => update({ priceMin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Price max */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最高価格</label>
              <input
                type="number"
                min={0}
                step={100}
                placeholder="上限なし"
                value={values.priceMax}
                onChange={(e) => update({ priceMax: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
