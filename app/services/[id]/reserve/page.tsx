'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getService } from '@/lib/api/services';
import { createReservation } from '@/lib/api/reservations-client';
import { getSession } from '@/lib/auth';
import Button from '@/components/common/Button';
import { Calendar, Clock, ArrowLeft, CreditCard, Wallet, Users, CheckCircle } from 'lucide-react';

interface WalletInfo {
  balance: number;
}

interface PaymentMethodInfo {
  id: string;
  cardBrand: string;
  cardLast4: string;
  isDefault: boolean;
}

type Step = 'form' | 'confirm';

export default function ReserveServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const [service, setService] = useState<{
    id: string;
    instructorId: string;
    title: string;
    duration: number;
    price: number;
    maxParticipants: number;
    [key: string]: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({
    scheduledAt: '',
    notes: '',
    participants: 1,
    paymentMethod: 'points' as 'points' | 'credit',
    paymentMethodId: '',
  });
  const [userId, setUserId] = useState<string>('');
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);

  useEffect(() => {
    loadService();
    checkAuth();
  }, [serviceId]);

  const loadService = async () => {
    try {
      setLoading(true);
      const serviceData = await getService(serviceId);
      setService(serviceData);
    } catch (error) {
      console.error('Failed to load service:', error);
      router.push('/services');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const session = await getSession();
      if (!session?.user) {
        router.push(`/login/user?redirect=/services/${serviceId}/reserve`);
        return;
      }

      if (session.user.user_metadata?.role?.toLowerCase() !== 'user') {
        router.push('/services');
        return;
      }

      setUserId(session.user.id);

      // ウォレット残高と登録カードを取得
      try {
        const [walletRes, cardsRes] = await Promise.all([
          fetch('/api/wallet/me?role=USER', { credentials: 'include' }),
          fetch('/api/payment-methods', { credentials: 'include' }),
        ]);

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData.wallet || { balance: 0 });
        }
        if (cardsRes.ok) {
          const cardsData = await cardsRes.json();
          setPaymentMethods(Array.isArray(cardsData) ? cardsData : []);
          // デフォルトカードがあれば自動選択
          const defaultCard = (Array.isArray(cardsData) ? cardsData : []).find(
            (c: PaymentMethodInfo) => c.isDefault
          );
          if (defaultCard) {
            setFormData((prev) => ({ ...prev, paymentMethodId: defaultCard.id }));
          }
        }
      } catch (err) {
        console.error('Failed to load payment info:', err);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push(`/login/user?redirect=/services/${serviceId}/reserve`);
    }
  };

  const totalPrice = service ? service.price * formData.participants : 0;

  const canPayWithPoints = wallet ? wallet.balance >= totalPrice : false;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.scheduledAt) {
      setError('日時を選択してください');
      return;
    }

    if (formData.participants < 1) {
      setError('参加人数は1名以上を指定してください');
      return;
    }

    if (formData.paymentMethod === 'points' && !canPayWithPoints) {
      setError(`ポイント残高が不足しています（必要: ¥${totalPrice.toLocaleString()} / 残高: ¥${wallet?.balance.toLocaleString() || 0}）`);
      return;
    }

    if (formData.paymentMethod === 'credit' && !formData.paymentMethodId) {
      setError('クレジットカードを選択してください');
      return;
    }

    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (submitting || !userId || !service) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await createReservation({
        serviceId: service.id,
        scheduledAt: formData.scheduledAt,
        notes: formData.notes || undefined,
        participants: formData.participants,
        paymentMethod: formData.paymentMethod,
        paymentMethodId: formData.paymentMethod === 'credit' ? formData.paymentMethodId : undefined,
      });

      if (!result.success) {
        setError(result.error || '予約の作成に失敗しました');
        setStep('form');
        return;
      }

      router.push('/user/reservations?success=true');
    } catch (err: unknown) {
      console.error('Reservation error:', err);
      const message = err instanceof Error ? err.message : '予約の作成に失敗しました';
      setError(message);
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">サービスが見つかりません</h1>
          <Link href="/services" className="text-purple-600 hover:text-purple-700">
            サービス一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href={`/services/${serviceId}`}
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          サービス詳細に戻る
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          {/* ステップインジケーター */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === 'form' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${step === 'form' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
              <span className="text-sm">入力</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${step === 'confirm' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
              <span className="text-sm">確認</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {step === 'form' ? '予約フォーム' : '予約内容の確認'}
          </h1>

          {/* サービス情報 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h2>
            <div className="space-y-2 text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{service.duration}分</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>定員 {service.maxParticipants}名</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                ¥{service.price.toLocaleString()}
                {formData.participants > 1 && (
                  <span className="text-base text-gray-500 ml-2">
                    × {formData.participants}名 = ¥{totalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {step === 'form' ? (
            /* === 入力ステップ === */
            <form onSubmit={handleProceedToConfirm} className="space-y-6">
              {/* 予約日時 */}
              <div>
                <label htmlFor="scheduledAt" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-5 h-5 inline mr-2" />
                  予約日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                />
              </div>

              {/* 参加人数 */}
              {service.maxParticipants > 1 && (
                <div>
                  <label htmlFor="participants" className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-5 h-5 inline mr-2" />
                    参加人数
                  </label>
                  <select
                    id="participants"
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                  >
                    {Array.from({ length: service.maxParticipants }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}名</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 決済方法 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  決済方法 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {/* ポイント決済 */}
                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'points'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="points"
                      checked={formData.paymentMethod === 'points'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'points' })}
                      className="sr-only"
                    />
                    <Wallet className={`w-5 h-5 ${formData.paymentMethod === 'points' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">ポイント決済</span>
                      <span className="text-sm text-gray-500 ml-2">
                        (残高: ¥{wallet?.balance.toLocaleString() || '---'})
                      </span>
                    </div>
                    {formData.paymentMethod === 'points' && (
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    )}
                  </label>

                  {/* クレジットカード決済 */}
                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'credit'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit"
                      checked={formData.paymentMethod === 'credit'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'credit' })}
                      className="sr-only"
                    />
                    <CreditCard className={`w-5 h-5 ${formData.paymentMethod === 'credit' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">クレジットカード</span>
                      {paymentMethods.length === 0 && (
                        <span className="text-sm text-orange-600 ml-2">(カード未登録)</span>
                      )}
                    </div>
                    {formData.paymentMethod === 'credit' && (
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    )}
                  </label>

                  {/* カード選択 */}
                  {formData.paymentMethod === 'credit' && paymentMethods.length > 0 && (
                    <div className="ml-8">
                      <select
                        value={formData.paymentMethodId}
                        onChange={(e) => setFormData({ ...formData, paymentMethodId: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                      >
                        <option value="">カードを選択してください</option>
                        {paymentMethods.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.cardBrand} **** {card.cardLast4}{card.isDefault ? ' (デフォルト)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.paymentMethod === 'credit' && paymentMethods.length === 0 && (
                    <div className="ml-8 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-orange-700 text-sm">
                        クレジットカードが登録されていません。
                        <Link href="/user/payment-methods" className="underline font-medium ml-1">
                          カードを登録する
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 備考 */}
              <div>
                <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                  備考・要望
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="ご要望や質問があればご記入ください"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full">
                確認画面へ
              </Button>
            </form>
          ) : (
            /* === 確認ステップ === */
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">予約日時</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(formData.scheduledAt).toLocaleString('ja-JP', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">参加人数</span>
                  <span className="font-semibold text-gray-900">{formData.participants}名</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">決済方法</span>
                  <span className="font-semibold text-gray-900">
                    {formData.paymentMethod === 'points' ? 'ポイント決済' : (
                      (() => {
                        const card = paymentMethods.find((c) => c.id === formData.paymentMethodId);
                        return card ? `${card.cardBrand} **** ${card.cardLast4}` : 'クレジットカード';
                      })()
                    )}
                  </span>
                </div>
                {formData.notes && (
                  <div>
                    <span className="text-gray-600 text-sm">備考:</span>
                    <p className="text-gray-900 text-sm mt-1">{formData.notes}</p>
                  </div>
                )}
                <div className="border-t border-purple-200 pt-4 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">合計金額</span>
                  <span className="text-2xl font-bold text-purple-600">¥{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => { setStep('form'); setError(''); }}
                  disabled={submitting}
                >
                  戻る
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? '予約処理中...' : '予約を確定する'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
