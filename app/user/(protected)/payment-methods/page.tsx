'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { getPaymentMethods, createPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod, PaymentMethod } from '@/lib/api/payment-client';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CardRegistrationForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!stripe || !elements) {
      return;
    }

    if (!cardholderName.trim()) {
      setError('カード名義人を入力してください');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setLoading(true);

    try {
      // Stripe Payment Methodを作成
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // サーバーに登録
      await createPaymentMethod(paymentMethod!.id);

      onSuccess();
    } catch (err: any) {
      console.error('Card registration error:', err);
      setError(err.message || 'カードの登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          カード名義人
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="TARO YAMADA"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">カードに記載されている名前（ローマ字）</p>
      </div>

      <div className="p-4 border border-gray-300 rounded-md">
        <CardElement
          options={{
            hidePostalCode: true, // 日本向けサービスでは郵便番号不要
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      <p className="text-xs text-gray-500">
        💡 テスト環境ではテストカード番号（4242 4242 4242 4242）をご利用ください
      </p>

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
      >
        {loading ? '登録中...' : 'カードを登録'}
      </Button>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err: any) {
      console.error('Load payment methods error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このカードを削除しますか？')) {
      return;
    }

    try {
      await deletePaymentMethod(id);
      loadPaymentMethods();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      loadPaymentMethods();
    } catch (err: any) {
      console.error('Set default error:', err);
      alert(err.message);
    }
  };

  const getCardBrandIcon = (brand: string | null) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳 VISA';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 AMEX';
      case 'jcb':
        return '💳 JCB';
      default:
        return '💳';
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        決済方法の管理
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 登録済みカード一覧 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          登録済みカード
        </h2>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-gray-500">登録されているカードはありません</p>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-md hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getCardBrandIcon(method.cardBrand)}</span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      •••• {method.cardLast4}
                    </p>
                    <p className="text-sm text-gray-500">
                      有効期限: {method.cardExpMonth}/{method.cardExpYear}
                    </p>
                  </div>
                  {method.isDefault && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                      デフォルト
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      デフォルトに設定
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* カード追加フォーム */}
      {showAddCard ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              新しいカードを追加
            </h2>
            <button
              onClick={() => setShowAddCard(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>

          <Elements stripe={stripePromise}>
            <CardRegistrationForm
              onSuccess={() => {
                setShowAddCard(false);
                loadPaymentMethods();
              }}
            />
          </Elements>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCard(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors"
        >
          + 新しいカードを追加
        </button>
      )}

      {/* 説明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 決済方法について
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• レッスンの予約時に登録済みのカードで決済されます</li>
          <li>• テスト環境では実際の課金は発生しません</li>
          <li>• カード情報はStripe経由で安全に管理されます</li>
        </ul>
      </div>
    </div>
  );
}

