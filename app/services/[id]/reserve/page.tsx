'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getService } from '@/lib/api/services';
import { createReservation } from '@/lib/api/reservations';
import { getSession } from '@/lib/auth';
import Button from '@/components/common/Button';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';

export default function ReserveServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    scheduledAt: '',
    notes: '',
  });
  const [userId, setUserId] = useState<string>('');

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
    } catch (error) {
      console.error('Auth check error:', error);
      router.push(`/login/user?redirect=/services/${serviceId}/reserve`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !userId || !service) return;

    if (!formData.scheduledAt) {
      setError('日時を選択してください');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await createReservation({
        userId,
        serviceId: service.id,
        instructorId: service.instructorId,
        scheduledAt: formData.scheduledAt,
        notes: formData.notes,
      });

      router.push('/user/reservations');
    } catch (err: any) {
      console.error('Reservation error:', err);
      setError(err.message || '予約の作成に失敗しました');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">予約フォーム</h1>

          {/* サービス情報 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h2>
            <div className="space-y-2 text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{service.duration}分</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                ¥{service.price.toLocaleString()}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                備考・要望
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="ご要望や質問があればご記入ください"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? '予約中...' : '予約を確定する'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

