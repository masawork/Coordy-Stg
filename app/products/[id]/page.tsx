'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProduct, type Product } from '@/lib/api/products-client';
import { addToCart } from '@/lib/api/cart-client';
import Button from '@/components/common/Button';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-300 rounded animate-pulse w-1/4 mb-4" />
          <div className="h-6 bg-gray-300 rounded animate-pulse w-1/3" />
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Section */}
          <div>
            <div className="aspect-square bg-gray-300 rounded-lg animate-pulse mb-4" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-20 h-20 bg-gray-300 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div>
            <div className="h-8 bg-gray-300 rounded animate-pulse mb-4 w-3/4" />
            <div className="h-6 bg-gray-300 rounded animate-pulse mb-4 w-1/2" />
            <div className="h-12 bg-gray-300 rounded animate-pulse mb-6 w-1/3" />
            <div className="space-y-3 mb-8">
              <div className="h-4 bg-gray-300 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4" />
            </div>
            <div className="h-12 bg-gray-300 rounded animate-pulse w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProduct(resolvedParams.id);
        setProduct(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '商品の取得に失敗しました';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [resolvedParams.id]);

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      setSuccessMessage(null);
      await addToCart(product.id, quantity);
      setSuccessMessage('カートに追加しました');
      // Auto-hide message after 3 seconds
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カートへの追加に失敗しました';
      setError(errorMessage);
    } finally {
      setAddingToCart(false);
    }
  };

  const getStockStatus = (): { status: string; color: string } => {
    if (!product) return { status: '', color: '' };
    if (!product.trackStock) return { status: '在庫情報なし', color: 'text-gray-600' };
    if (product.stock === 0) return { status: '在庫切れ', color: 'text-red-600' };
    if (product.stock <= 3) return { status: `残りわずか（${product.stock}個）`, color: 'text-orange-600' };
    return { status: `在庫あり（${product.stock}個）`, color: 'text-green-600' };
  };

  const stockInfo = getStockStatus();
  const isOutOfStock = product?.trackStock && product.stock === 0;
  const mainImage = product?.images?.[selectedImageIndex]?.url || '/placeholder-product.png';
  const sellerName = product?.instructor?.user?.name || 'Unknown Seller';

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">商品が見つかりません</h2>
          <p className="text-gray-600 mb-6">
            {error || '申し訳ありません。この商品は存在しないか削除されています。'}
          </p>
          <Button variant="primary" onClick={() => router.push('/products')}>
            商品一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-600 mb-8">
          <Link href="/products" className="hover:text-gray-900">
            商品一覧
          </Link>
          <span className="mx-3">/</span>
          <span className="text-gray-900 truncate">{product.name}</span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div>
            {/* Main Image */}
            <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden shadow-sm mb-4">
              <Image
                src={mainImage}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Thumbnail Gallery */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-purple-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {/* Seller Info */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <p className="text-sm text-gray-600 mb-1">サービス提供者</p>
              <span className="text-base font-medium text-gray-900">
                {sellerName}
              </span>
            </div>

            {/* Price */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <p className="text-4xl font-bold text-purple-600 mb-2">
                {product.price.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}
              </p>
              <p className="text-sm text-gray-600">
                {product.shippingFee === 0 ? (
                  <span className="text-green-600 font-medium">送料無料</span>
                ) : (
                  <>
                    送料:{' '}
                    {product.shippingFee.toLocaleString('ja-JP', {
                      style: 'currency',
                      currency: 'JPY',
                    })}
                  </>
                )}
              </p>
            </div>

            {/* Stock Status */}
            <div className={`mb-6 pb-6 border-b border-gray-200 ${stockInfo.color}`}>
              <p className={`text-base font-semibold ${stockInfo.color}`}>{stockInfo.status}</p>
            </div>

            {/* Quantity & Add to Cart */}
            {!isOutOfStock ? (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数量を選択
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={product.trackStock ? product.stock : undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full"
                >
                  {addingToCart ? 'カートに追加中...' : 'カートに追加'}
                </Button>

                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    ✓ {successMessage}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    ✕ {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-8 bg-gray-100 text-gray-600 px-6 py-4 rounded-lg text-center font-medium">
                申し訳ございません。現在在庫がありません
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">商品説明</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {product.category && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">商品情報</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">カテゴリ</p>
                <p className="font-medium text-gray-900">{product.category}</p>
              </div>
              {product.sku && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">SKU</p>
                  <p className="font-medium text-gray-900 text-sm">{product.sku}</p>
                </div>
              )}
              {product.weight && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">重量</p>
                  <p className="font-medium text-gray-900">{product.weight}g</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
