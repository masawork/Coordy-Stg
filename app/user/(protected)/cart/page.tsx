'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getCart, updateCartItem, removeCartItem } from '@/lib/api/cart-client';

interface CartData {
  id: string;
  items: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      stock: number;
      trackStock: boolean;
      shippingFee: number;
      images?: { url: string }[];
      instructor?: { user: { name: string } };
    };
  }[];
  subtotal: number;
  shippingTotal: number;
  totalAmount: number;
}

function CartItemSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex gap-4 animate-pulse">
      <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-3" />
      </div>
      <div className="text-right space-y-2">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadCart = async () => {
    try {
      const data = await getCart();
      setCart(data);
    } catch (error) {
      console.error('カート取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdating(itemId);
    try {
      await updateCartItem(itemId, quantity);
      await loadCart();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!confirm('この商品をカートから削除しますか？')) return;
    setUpdating(itemId);
    try {
      await removeCartItem(itemId);
      await loadCart();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました');
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">ショッピングカート</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-3 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
              <div className="h-8 bg-gray-200 rounded w-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ショッピングカート</h1>

      {!cart || cart.items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-6 text-lg">カートは空です</p>
          <Link
            href="/services"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            サービスを探す
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* カートアイテム */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow"
              >
                {/* 商品画像 */}
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                  {item.product.images?.[0] ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      画像なし
                    </div>
                  )}
                </div>

                {/* 商品情報 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/services/${item.product.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      提供者: {item.product.instructor?.user.name}
                    </p>
                  </div>

                  {/* 単価と数量コントロール */}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm text-gray-600">
                      ¥{item.product.price.toLocaleString()}
                    </span>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={updating === item.id || item.quantity <= 1}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="数量を減らす"
                      >
                        −
                      </button>
                      <span className="px-3 py-1 border-l border-r border-gray-300 text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(
                            item.id,
                            item.quantity + 1
                          )
                        }
                        disabled={
                          updating === item.id ||
                          (item.product.trackStock &&
                            item.quantity >= item.product.stock)
                        }
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="数量を増やす"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 小計と削除ボタン */}
                <div className="text-right flex flex-col justify-between items-end">
                  <div>
                    <p className="font-bold text-lg text-gray-900">
                      ¥{(item.product.price * item.quantity).toLocaleString()}
                    </p>
                    {item.product.shippingFee > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        送料: ¥{(item.product.shippingFee).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={updating === item.id}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50 text-lg font-bold transition-colors"
                    aria-label="削除"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 注文サマリー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="font-bold text-lg mb-4">注文サマリー</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">小計</span>
                  <span className="font-medium">
                    ¥{cart.subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">送料</span>
                  <span className="font-medium">
                    {cart.shippingTotal > 0
                      ? `¥${cart.shippingTotal.toLocaleString()}`
                      : '無料'}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold">合計</span>
                  <span className="font-bold text-lg text-blue-600">
                    ¥{cart.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/user/checkout')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-3"
              >
                レジに進む
              </button>

              <Link
                href="/services"
                className="block text-center py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-300 rounded-lg"
              >
                買い物を続ける
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
