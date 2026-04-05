'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCart } from '@/lib/api/cart-client';
import { createOrder, getShippingAddresses, createShippingAddress } from '@/lib/api/orders-client';

// 日本の都道府県リスト
const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];

interface ShippingAddress {
  id: string;
  fullName: string;
  phoneNumber: string;
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
  isDefault: boolean;
}

interface CartData {
  items: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      shippingFee: number;
      images?: { url: string }[];
    };
  }[];
  subtotal: number;
  shippingTotal: number;
  totalAmount: number;
}

interface WalletData {
  wallet: {
    balance: number;
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'credit'>('credit');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phoneNumber: '',
    postalCode: '',
    prefecture: '',
    city: '',
    street: '',
    building: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [cartData, addressData, walletData] = await Promise.all([
          getCart(),
          getShippingAddresses(),
          fetch('/api/wallet/me?role=USER').then((res) => res.json()) as Promise<WalletData>,
        ]);
        setCart(cartData);
        setAddresses(addressData);
        setWalletBalance(walletData.wallet.balance);

        const defaultAddr = addressData.find(
          (a: ShippingAddress) => a.isDefault
        );
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.id);
        } else if (addressData.length > 0) {
          setSelectedAddress(addressData[0].id);
        }
      } catch (err) {
        console.error('データ読み込みエラー:', err);
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddAddress = async () => {
    if (
      !newAddress.fullName ||
      !newAddress.phoneNumber ||
      !newAddress.postalCode ||
      !newAddress.prefecture ||
      !newAddress.city ||
      !newAddress.street
    ) {
      setError('配送先の必須項目を入力してください');
      return;
    }

    try {
      const created = await createShippingAddress({
        ...newAddress,
        building: newAddress.building || undefined,
        isDefault: addresses.length === 0,
      });
      setAddresses([...addresses, created]);
      setSelectedAddress(created.id);
      setShowNewAddress(false);
      setError('');
      setNewAddress({
        fullName: '',
        phoneNumber: '',
        postalCode: '',
        prefecture: '',
        city: '',
        street: '',
        building: '',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'アドレス作成に失敗しました'
      );
    }
  };

  const handleSubmitOrder = async () => {
    if (!selectedAddress) {
      setError('配送先住所を選択してください');
      return;
    }

    if (paymentMethod === 'points' && walletBalance !== null && walletBalance < (cart?.totalAmount || 0)) {
      setError('ポイント残高が不足しています');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const order = await createOrder({
        paymentMethod,
        shippingAddressId: selectedAddress,
      });
      router.push(`/user/orders/${order.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '注文の作成に失敗しました'
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">レジ</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32" />
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-gray-200 rounded-lg h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-500 mb-4 text-lg">カートが空です</p>
        <Link
          href="/services"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          サービスを探す
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">レジ</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: 配送先住所 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">1. 配送先住所</h2>

            {addresses.length > 0 ? (
              <div className="space-y-2 mb-4">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedAddress === addr.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddress === addr.id}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            {addr.fullName}
                          </span>
                          {addr.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              デフォルト
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {addr.phoneNumber}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          〒{addr.postalCode} {addr.prefecture}
                          {addr.city}
                          {addr.street}
                          {addr.building && ` ${addr.building}`}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">
                配送先住所が登録されていません
              </p>
            )}

            <button
              onClick={() => setShowNewAddress(!showNewAddress)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {showNewAddress ? 'キャンセル' : '+ 新しい住所を追加'}
            </button>

            {showNewAddress && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="氏名 *"
                    value={newAddress.fullName}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, fullName: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    placeholder="電話番号 *"
                    value={newAddress.phoneNumber}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <input
                  placeholder="郵便番号 (例: 123-4567) *"
                  value={newAddress.postalCode}
                  onChange={(e) =>
                    setNewAddress({
                      ...newAddress,
                      postalCode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newAddress.prefecture}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        prefecture: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">都道府県を選択 *</option>
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </select>

                  <input
                    placeholder="市区町村 *"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <input
                  placeholder="番地 *"
                  value={newAddress.street}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, street: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  placeholder="建物名・部屋番号（任意）"
                  value={newAddress.building}
                  onChange={(e) =>
                    setNewAddress({
                      ...newAddress,
                      building: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={handleAddAddress}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  この住所を追加
                </button>
              </div>
            )}
          </div>

          {/* Section 2: お支払い方法 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">2. お支払い方法</h2>

            <div className="space-y-3">
              {/* ポイント払い */}
              <label
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'points'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="points"
                    checked={paymentMethod === 'points'}
                    onChange={() => setPaymentMethod('points')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">ポイント払い</div>
                    <div className="text-sm text-gray-600 mt-1">
                      保有ポイント:{' '}
                      <span className="font-bold text-gray-900">
                        ¥{walletBalance?.toLocaleString() || '0'}
                      </span>
                    </div>
                    {walletBalance !== null && walletBalance < cart.totalAmount && (
                      <div className="text-xs text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">
                        ⚠️ ポイント残高が不足しています
                      </div>
                    )}
                  </div>
                </div>
              </label>

              {/* クレジットカード払い */}
              <label
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'credit'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="credit"
                    checked={paymentMethod === 'credit'}
                    onChange={() => setPaymentMethod('credit')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      クレジットカード払い
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Stripeで安全に決済します
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: 注文内容確認 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">3. 注文内容確認</h2>

            <div className="space-y-3 mb-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-14 h-14 bg-gray-200 rounded overflow-hidden relative flex-shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500">数量: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">
                    ¥
                    {(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar: サマリー */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="font-bold text-lg mb-4">注文内容サマリー</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">小計 ({cart.items.length}点)</span>
                <span className="font-medium text-gray-900">
                  ¥{cart.subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">送料</span>
                <span className="font-medium text-gray-900">
                  {cart.shippingTotal > 0
                    ? `¥${cart.shippingTotal.toLocaleString()}`
                    : '無料'}
                </span>
              </div>

              <div className="border-t-2 pt-3 flex justify-between">
                <span className="font-bold text-gray-900">合計</span>
                <span className="font-bold text-xl text-blue-600">
                  ¥{cart.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={
                submitting ||
                !selectedAddress ||
                (paymentMethod === 'points' &&
                  walletBalance !== null &&
                  walletBalance < cart.totalAmount)
              }
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
            >
              {submitting ? '注文処理中...' : '注文を確定する'}
            </button>

            <Link
              href="/user/cart"
              className="block text-center py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors border border-gray-300 rounded-lg"
            >
              カートに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
