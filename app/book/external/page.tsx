'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, MapPin, Users, ChevronRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Button from '@/components/common/Button';

// ========================================
// Types
// ========================================

type BookingStep = 'loading' | 'service' | 'schedule' | 'guest_info' | 'confirmation' | 'complete' | 'error';

interface Partner {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  paymentMode: string;
  allowGuest: boolean;
  requirePhone: boolean;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  duration: number;
  deliveryType: string;
  location: string | null;
  maxParticipants: number;
  instructor: { id: string; name: string; image: string | null };
  images: string[];
  activeCampaigns: Array<{
    id: string;
    name: string;
    type: string;
    discountPercent: number | null;
    discountAmount: number | null;
    fixedPrice: number | null;
  }>;
}

interface TimeSlot {
  scheduleId: string;
  startTime: string;
  endTime: string;
  available: boolean;
  remainingCapacity: number;
}

interface AvailabilityDay {
  date: string;
  slots: TimeSlot[];
}

// ========================================
// Main Component
// ========================================

export default function ExternalBookingPage() {
  const searchParams = useSearchParams();

  // URL params
  const partnerId = searchParams.get('partner_id');
  const sig = searchParams.get('sig');
  const ts = searchParams.get('ts');
  const preServiceId = searchParams.get('service_id');
  const preInstructorId = searchParams.get('instructor_id');
  const preDate = searchParams.get('date');
  const returnUrl = searchParams.get('return_url');
  const externalRef = searchParams.get('external_ref');
  const paymentCompleted = searchParams.get('payment_completed') === 'true';

  // State
  const [step, setStep] = useState<BookingStep>('loading');
  const [error, setError] = useState('');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; slot: TimeSlot } | null>(null);
  const [participants, setParticipants] = useState(1);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phoneNumber: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reservationResult, setReservationResult] = useState<Record<string, unknown> | null>(null);

  // ========================================
  // Init: パートナー認証
  // ========================================
  useEffect(() => {
    if (!partnerId || !sig || !ts) {
      setError('無効なリンクです。パートナーサイトからアクセスしてください。');
      setStep('error');
      return;
    }
    verifyPartner();
  }, [partnerId, sig, ts]);

  const verifyPartner = async () => {
    try {
      const res = await fetch(
        `/api/external/partner/verify?partner_id=${partnerId}&ts=${ts}&sig=${sig}`,
      );
      const data = await res.json();

      if (!data.valid) {
        const messages: Record<string, string> = {
          INVALID_PARTNER: '無効なパートナーです。',
          INACTIVE_PARTNER: 'このパートナーは現在利用できません。',
          INVALID_SIGNATURE: 'リンクが無効です。パートナーサイトから再度アクセスしてください。',
          EXPIRED_TIMESTAMP: 'リンクの有効期限が切れました。パートナーサイトから再度アクセスしてください。',
        };
        setError(messages[data.error] || '認証に失敗しました。');
        setStep('error');
        return;
      }

      setPartner(data.partner);
      await loadServices(data.partner);
    } catch {
      setError('接続エラーが発生しました。再度お試しください。');
      setStep('error');
    }
  };

  // ========================================
  // Step 1: サービス一覧読み込み
  // ========================================
  const loadServices = async (p: Partner) => {
    try {
      let url = `/api/external/services?partner_id=${partnerId}&ts=${ts}&sig=${sig}`;
      if (preInstructorId) url += `&instructor_id=${preInstructorId}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.services || data.services.length === 0) {
        setError('利用可能なサービスがありません。');
        setStep('error');
        return;
      }

      setServices(data.services);

      // サービス指定がある場合は自動選択
      if (preServiceId) {
        const found = data.services.find((s: ServiceItem) => s.id === preServiceId);
        if (found) {
          setSelectedService(found);
          await loadAvailability(found.id);
          return;
        }
      }

      // サービスが1つだけなら自動選択
      if (data.services.length === 1) {
        setSelectedService(data.services[0]);
        await loadAvailability(data.services[0].id);
        return;
      }

      setStep('service');
    } catch {
      setError('サービス情報の取得に失敗しました。');
      setStep('error');
    }
  };

  // ========================================
  // Step 2: 空き状況読み込み
  // ========================================
  const loadAvailability = async (serviceId: string) => {
    try {
      const from = preDate || new Date().toISOString().split('T')[0];
      const toDate = new Date(from);
      toDate.setDate(toDate.getDate() + 30);
      const to = toDate.toISOString().split('T')[0];

      const res = await fetch(
        `/api/external/availability?partner_id=${partnerId}&ts=${ts}&sig=${sig}&service_id=${serviceId}&date_from=${from}&date_to=${to}`,
      );
      const data = await res.json();

      setAvailability(data.availability || []);
      setStep('schedule');
    } catch {
      setError('空き状況の取得に失敗しました。');
      setStep('error');
    }
  };

  // ========================================
  // サービス選択
  // ========================================
  const handleServiceSelect = async (service: ServiceItem) => {
    setSelectedService(service);
    await loadAvailability(service.id);
  };

  // ========================================
  // スロット選択
  // ========================================
  const handleSlotSelect = (date: string, slot: TimeSlot) => {
    setSelectedSlot({ date, slot });
    setStep('guest_info');
  };

  // ========================================
  // 予約送信
  // ========================================
  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot || !guestInfo.name || !guestInfo.email) return;

    if (partner?.requirePhone && !guestInfo.phoneNumber) {
      setError('電話番号は必須です。');
      return;
    }

    setStep('confirmation');
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot) return;

    setSubmitting(true);
    setError('');

    try {
      const scheduledAt = `${selectedSlot.date}T${selectedSlot.slot.startTime}:00+09:00`;

      const res = await fetch('/api/external/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Partner-Id': partnerId!,
          'X-Timestamp': ts!,
          'X-Signature': sig!,
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          scheduleId: selectedSlot.slot.scheduleId,
          scheduledAt,
          participants,
          guest: {
            email: guestInfo.email,
            name: guestInfo.name,
            phoneNumber: guestInfo.phoneNumber || undefined,
          },
          paymentMode: paymentCompleted ? 'EXTERNAL' : 'COORDY',
          externalRef: externalRef || undefined,
          notes: guestInfo.notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          NO_AVAILABILITY: '申し訳ございません。この時間帯は満席です。別の日時をお選びください。',
          SERVICE_NOT_FOUND: 'サービスが見つかりません。',
          SERVICE_NOT_ALLOWED: 'このサービスは予約できません。',
        };
        setError(errorMessages[data.error] || data.error || '予約に失敗しました。');
        setStep('schedule');
        return;
      }

      setReservationResult(data.reservation);
      setStep('complete');
    } catch {
      setError('予約処理中にエラーが発生しました。再度お試しください。');
      setStep('guest_info');
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================
  // 戻る処理
  // ========================================
  const handleBack = () => {
    setError('');
    switch (step) {
      case 'schedule':
        if (services.length > 1) {
          setStep('service');
        }
        break;
      case 'guest_info':
        setStep('schedule');
        break;
      case 'confirmation':
        setStep('guest_info');
        break;
    }
  };

  // ========================================
  // 完了時のリダイレクト
  // ========================================
  const handleReturnToPartner = () => {
    if (returnUrl && reservationResult) {
      const url = new URL(returnUrl);
      url.searchParams.set('status', 'success');
      url.searchParams.set('reservation_id', reservationResult.id as string);
      if (externalRef) url.searchParams.set('external_ref', externalRef);
      window.location.href = url.toString();
    }
  };

  // ========================================
  // Render
  // ========================================
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        {partner?.logoUrl && (
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="h-12 mx-auto mb-3 object-contain"
          />
        )}
        {partner && (
          <p className="text-sm text-gray-500">{partner.name} 提携予約</p>
        )}
        <div className="mt-2 text-xs text-gray-400">Powered by Coordy</div>
      </div>

      {/* ステップインジケーター */}
      {step !== 'loading' && step !== 'error' && step !== 'complete' && (
        <StepIndicator currentStep={step} />
      )}

      {/* エラー表示 */}
      {error && step !== 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ローディング */}
      {step === 'loading' && <LoadingState />}

      {/* エラーページ */}
      {step === 'error' && (
        <ErrorState
          message={error}
          returnUrl={returnUrl}
        />
      )}

      {/* Step 1: サービス選択 */}
      {step === 'service' && (
        <ServiceSelection
          services={services}
          onSelect={handleServiceSelect}
        />
      )}

      {/* Step 2: 日程選択 */}
      {step === 'schedule' && selectedService && (
        <ScheduleSelection
          service={selectedService}
          availability={availability}
          participants={participants}
          onParticipantsChange={setParticipants}
          onSelect={handleSlotSelect}
          onBack={services.length > 1 ? handleBack : undefined}
        />
      )}

      {/* Step 3: ゲスト情報入力 */}
      {step === 'guest_info' && (
        <GuestInfoForm
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          requirePhone={partner?.requirePhone || false}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      )}

      {/* Step 4: 確認 */}
      {step === 'confirmation' && selectedService && selectedSlot && (
        <ConfirmationStep
          service={selectedService}
          slot={selectedSlot}
          participants={participants}
          guestInfo={guestInfo}
          paymentCompleted={paymentCompleted}
          submitting={submitting}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )}

      {/* Step 5: 完了 */}
      {step === 'complete' && reservationResult && selectedService && selectedSlot && (
        <CompletionStep
          reservation={reservationResult}
          service={selectedService}
          slot={selectedSlot}
          participants={participants}
          guestInfo={guestInfo}
          returnUrl={returnUrl}
          onReturn={handleReturnToPartner}
        />
      )}
    </div>
  );
}

// ========================================
// Sub Components
// ========================================

function StepIndicator({ currentStep }: { currentStep: BookingStep }) {
  const steps = [
    { key: 'service', label: 'サービス' },
    { key: 'schedule', label: '日程' },
    { key: 'guest_info', label: '情報入力' },
    { key: 'confirmation', label: '確認' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i <= currentIndex
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs hidden sm:inline ${
              i <= currentIndex ? 'text-purple-600 font-medium' : 'text-gray-400'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-20">
      <div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4" />
      <p className="text-gray-500">予約情報を読み込んでいます...</p>
    </div>
  );
}

function ErrorState({ message, returnUrl }: { message: string; returnUrl: string | null }) {
  return (
    <div className="text-center py-20">
      <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">エラー</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      {returnUrl && (
        <a
          href={returnUrl}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          元のサイトに戻る
        </a>
      )}
    </div>
  );
}

function ServiceSelection({
  services,
  onSelect,
}: {
  services: ServiceItem[];
  onSelect: (s: ServiceItem) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">サービスを選択</h2>
      <div className="space-y-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <div className="flex gap-4">
              {service.images[0] && (
                <img
                  src={service.images[0]}
                  alt={service.title}
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 mb-1">{service.title}</h3>
                {service.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                    {service.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration}分
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    最大{service.maxParticipants}名
                  </span>
                  {service.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {service.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-purple-600">
                  {service.price.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500">円</span>
                </p>
                <p className="text-xs text-gray-400">{service.instructor.name}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleSelection({
  service,
  availability,
  participants,
  onParticipantsChange,
  onSelect,
  onBack,
}: {
  service: ServiceItem;
  availability: AvailabilityDay[];
  participants: number;
  onParticipantsChange: (n: number) => void;
  onSelect: (date: string, slot: TimeSlot) => void;
  onBack?: () => void;
}) {
  return (
    <div>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> サービス選択に戻る
        </button>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="font-bold text-gray-800">{service.title}</h3>
        <p className="text-sm text-gray-500">
          {service.duration}分 / {service.price.toLocaleString()}円
        </p>
      </div>

      {/* 人数選択 */}
      {service.maxParticipants > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">参加人数</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onParticipantsChange(Math.max(1, participants - 1))}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50"
              disabled={participants <= 1}
            >
              -
            </button>
            <span className="text-lg font-bold w-12 text-center">{participants}</span>
            <button
              onClick={() => onParticipantsChange(Math.min(service.maxParticipants, participants + 1))}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50"
              disabled={participants >= service.maxParticipants}
            >
              +
            </button>
            <span className="text-sm text-gray-500">名（最大{service.maxParticipants}名）</span>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-800 mb-4">日程を選択</h2>

      {availability.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>現在利用可能な日程がありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {availability.map((day) => (
            <div key={day.date} className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                {formatDate(day.date)}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {day.slots.map((slot) => {
                  const available = slot.available && slot.remainingCapacity >= participants;
                  return (
                    <button
                      key={slot.scheduleId}
                      onClick={() => available && onSelect(day.date, slot)}
                      disabled={!available}
                      className={`p-3 rounded-lg text-sm text-center border transition-all ${
                        available
                          ? 'border-purple-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer'
                          : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-medium">
                        {slot.startTime}〜{slot.endTime}
                      </div>
                      <div className="text-xs mt-1">
                        {available ? `残り${slot.remainingCapacity}枠` : '満席'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuestInfoForm({
  guestInfo,
  setGuestInfo,
  requirePhone,
  onSubmit,
  onBack,
}: {
  guestInfo: { name: string; email: string; phoneNumber: string; notes: string };
  setGuestInfo: (info: typeof guestInfo) => void;
  requirePhone: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const isValid = guestInfo.name && guestInfo.email && (!requirePhone || guestInfo.phoneNumber);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 日程選択に戻る
      </button>

      <h2 className="text-xl font-bold text-gray-800 mb-6">予約者情報</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={guestInfo.name}
            onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="山田 太郎"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={guestInfo.email}
            onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            電話番号 {requirePhone && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            value={guestInfo.phoneNumber}
            onChange={(e) => setGuestInfo({ ...guestInfo, phoneNumber: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="090-1234-5678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
          <textarea
            value={guestInfo.notes}
            onChange={(e) => setGuestInfo({ ...guestInfo, notes: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            placeholder="ご要望や備考があればご記入ください"
          />
        </div>
      </div>

      <div className="mt-6">
        <Button
          onClick={onSubmit}
          disabled={!isValid}
          className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          確認画面へ
        </Button>
      </div>
    </div>
  );
}

function ConfirmationStep({
  service,
  slot,
  participants,
  guestInfo,
  paymentCompleted,
  submitting,
  onConfirm,
  onBack,
}: {
  service: ServiceItem;
  slot: { date: string; slot: TimeSlot };
  participants: number;
  guestInfo: { name: string; email: string; phoneNumber: string; notes: string };
  paymentCompleted: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const totalPrice = service.price * participants;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 情報入力に戻る
      </button>

      <h2 className="text-xl font-bold text-gray-800 mb-6">予約内容の確認</h2>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">サービス</h3>
          <p className="font-bold text-gray-800">{service.title}</p>
          <p className="text-sm text-gray-500">{service.instructor.name}</p>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">日時</h3>
          <p className="font-bold text-gray-800">
            {formatDate(slot.date)} {slot.slot.startTime}〜{slot.slot.endTime}
          </p>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">参加人数</h3>
          <p className="font-bold text-gray-800">{participants}名</p>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">予約者</h3>
          <p className="font-bold text-gray-800">{guestInfo.name}</p>
          <p className="text-sm text-gray-500">{guestInfo.email}</p>
          {guestInfo.phoneNumber && (
            <p className="text-sm text-gray-500">{guestInfo.phoneNumber}</p>
          )}
        </div>

        {guestInfo.notes && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">備考</h3>
            <p className="text-sm text-gray-700">{guestInfo.notes}</p>
          </div>
        )}

        <div className="p-4 bg-purple-50">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">合計金額</span>
            <span className="text-2xl font-bold text-purple-600">
              {totalPrice.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">円</span>
            </span>
          </div>
          {paymentCompleted && (
            <p className="text-sm text-green-600 mt-1">外部サイトにて決済済み</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full disabled:opacity-50"
        >
          {submitting ? '予約を処理中...' : '予約を確定する'}
        </Button>
      </div>
    </div>
  );
}

function CompletionStep({
  reservation,
  service,
  slot,
  participants,
  guestInfo,
  returnUrl,
  onReturn,
}: {
  reservation: Record<string, unknown>;
  service: ServiceItem;
  slot: { date: string; slot: TimeSlot };
  participants: number;
  guestInfo: { name: string; email: string; phoneNumber: string; notes: string };
  returnUrl: string | null;
  onReturn: () => void;
}) {
  return (
    <div className="text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">予約が完了しました</h2>
      <p className="text-gray-500 mb-8">
        確認メールを {guestInfo.email} へお送りしました。
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 text-left mb-6">
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">予約番号</span>
            <p className="font-mono font-bold text-gray-800">{reservation.id as string}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">サービス</span>
            <p className="font-medium text-gray-800">{service.title}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">日時</span>
            <p className="font-medium text-gray-800">
              {formatDate(slot.date)} {slot.slot.startTime}〜{slot.slot.endTime}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">参加人数</span>
            <p className="font-medium text-gray-800">{participants}名</p>
          </div>
        </div>
      </div>

      {returnUrl && (
        <Button onClick={onReturn} className="w-full">
          元のサイトに戻る
        </Button>
      )}
    </div>
  );
}

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
}
