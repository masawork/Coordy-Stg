'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct } from '@/lib/api/products-client';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'online_lesson', label: 'オンラインレッスン' },
  { id: 'offline_lesson', label: 'オフラインレッスン' },
  { id: 'consulting', label: 'コンサルティング' },
  { id: 'coaching', label: 'コーチング' },
  { id: 'other', label: 'その他' },
];

interface FormData {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  weight: number;
  shippingFee: number;
  status: 'DRAFT' | 'PUBLISHED';
  trackStock: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'online_lesson',
    price: 0,
    stock: 0,
    sku: '',
    weight: 0,
    shippingFee: 0,
    status: 'DRAFT',
    trackStock: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // バリデーション
    if (!formData.name.trim()) {
      setError('商品名は必須です');
      setLoading(false);
      return;
    }

    if (formData.price <= 0) {
      setError('価格は0より大きい値を入力してください');
      setLoading(false);
      return;
    }

    if (formData.trackStock && formData.stock < 0) {
      setError('在庫数は0以上の値を入力してください');
      setLoading(false);
      return;
    }

    try {
      await createProduct({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        price: Math.round(formData.price),
        stock: formData.trackStock ? Math.round(formData.stock) : undefined,
        sku: formData.sku || undefined,
        weight: formData.weight > 0 ? Math.round(formData.weight) : undefined,
        shippingFee: Math.round(formData.shippingFee),
        status: formData.status,
        trackStock: formData.trackStock,
      });

      router.push('/instructor/products?success=created');
    } catch (err) {
      console.error('商品作成エラー:', err);
      setError(err instanceof Error ? err.message : '商品の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        戻る
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">新規商品作成</h1>
        <p className="text-gray-600 mt-1">新しい商品を登録します</p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">エラー</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

          {/* 商品名 */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
              商品名 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="商品名を入力"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          {/* 説明 */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
              説明
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="商品の説明を入力（オプション）"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* カテゴリ */}
          <div className="mb-4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-1">
              カテゴリ <span className="text-red-600">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 価格・在庫 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">価格・在庫</h2>

          {/* 価格 */}
          <div className="mb-4">
            <label htmlFor="price" className="block text-sm font-medium text-gray-900 mb-1">
              価格（円） <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          {/* 在庫管理 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="trackStock"
                checked={formData.trackStock}
                onChange={handleInputChange}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-900">在庫管理する</span>
            </label>
          </div>

          {/* 在庫数 */}
          {formData.trackStock && (
            <div className="mb-4">
              <label htmlFor="stock" className="block text-sm font-medium text-gray-900 mb-1">
                在庫数
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          )}

          {/* SKU */}
          <div className="mb-4">
            <label htmlFor="sku" className="block text-sm font-medium text-gray-900 mb-1">
              SKU
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              placeholder="SKU（オプション）"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* 重量 */}
          <div className="mb-4">
            <label htmlFor="weight" className="block text-sm font-medium text-gray-900 mb-1">
              重量（グラム）
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* 送料 */}
          <div>
            <label htmlFor="shippingFee" className="block text-sm font-medium text-gray-900 mb-1">
              送料（円）
            </label>
            <input
              type="number"
              id="shippingFee"
              name="shippingFee"
              value={formData.shippingFee}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* ステータス */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ステータス</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="DRAFT"
                checked={formData.status === 'DRAFT'}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-900">下書き</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="PUBLISHED"
                checked={formData.status === 'PUBLISHED'}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-900">公開</span>
            </label>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? '作成中...' : '商品を作成'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
