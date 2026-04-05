'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Schedule {
  id: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  isCancelled: boolean;
  service?: {
    id: string;
    title: string;
    maxParticipants: number;
  };
  _count?: {
    reservations: number;
  };
}

interface Reservation {
  id: string;
  scheduledAt: string;
  status: string;
  participants: number;
  service: {
    id: string;
    title: string;
    duration: number;
  };
  user?: {
    name: string;
    email: string;
  };
  guestUser?: {
    name: string;
    email: string;
  };
}

export default function InstructorSchedulePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dayReservations, setDayReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] = useState(false);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  useEffect(() => {
    loadMonthSchedules();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDay) {
      loadDayReservations();
    }
  }, [selectedDay, selectedDate]);

  const loadMonthSchedules = async () => {
    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const response = await fetch(`/api/schedules?from=${from}&to=${to}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || data || []);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error('スケジュール取得エラー:', err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDayReservations = async () => {
    if (!selectedDay) return;
    try {
      setReservationsLoading(true);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

      const response = await fetch(`/api/reservations?role=instructor&date=${dateStr}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // dateでフィルタ（APIがdateパラメータに対応していない場合のフォールバック）
        const filtered = (data || []).filter((r: Reservation) => {
          const rDate = new Date(r.scheduledAt);
          return rDate.getFullYear() === year &&
            rDate.getMonth() === month &&
            rDate.getDate() === selectedDay;
        });
        setDayReservations(filtered);
      } else {
        setDayReservations([]);
      }
    } catch (err) {
      console.error('予約取得エラー:', err);
      setDayReservations([]);
    } finally {
      setReservationsLoading(false);
    }
  };

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }
    return days;
  };

  const getSchedulesForDay = (day: number) => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter((s) => s.date === dateStr || s.date?.startsWith(dateStr));
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
  };

  const selectedDateStr = selectedDay
    ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDay}日`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">スケジュール</h1>
          <p className="text-sm text-gray-600 mt-1">予定と空き時間を管理します</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => router.push('/instructor/services')}
        >
          <Plus className="h-4 w-4 mr-2" />
          サービスからスケジュール追加
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* カレンダー */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
            <h2 className="text-lg font-semibold">
              {selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const daySchedules = day ? getSchedulesForDay(day) : [];
              const isToday = day === today.getDate() &&
                selectedDate.getMonth() === today.getMonth() &&
                selectedDate.getFullYear() === today.getFullYear();
              const isSelected = day === selectedDay;

              return (
                <div
                  key={index}
                  onClick={() => day && setSelectedDay(day)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg relative ${
                    day ? 'hover:bg-green-50 cursor-pointer' : ''
                  } ${isSelected ? 'bg-green-600 text-white' : isToday ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-700'}`}
                >
                  <span className="text-sm">{day}</span>
                  {daySchedules.length > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 選択日の予定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDay ? `${selectedDateStr}の予定` : '日付を選択してください'}
          </h3>

          {!selectedDay ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3" />
              <p>カレンダーから日付を選択</p>
            </div>
          ) : reservationsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : dayReservations.length > 0 ? (
            <div className="space-y-3">
              {dayReservations.map((res) => (
                <div key={res.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{res.service?.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      res.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      res.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      res.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {res.status === 'CONFIRMED' ? '確認済' : res.status === 'PENDING' ? '待ち' : res.status === 'COMPLETED' ? '完了' : res.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(res.scheduledAt)}</span>
                    <span>({res.service?.duration}分)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Users className="h-3 w-3" />
                    <span>
                      {res.user?.name || res.guestUser?.name || '不明'} ({res.participants}名)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm">この日の予定はありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
