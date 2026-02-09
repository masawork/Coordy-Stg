'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSchedules, ScheduleWithService, getWeekRange, getMonthRange } from '@/lib/api/schedules-client';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Tag,
  List,
  LayoutGrid,
} from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'day' | 'week' | 'month';

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表示モード
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // フィルター
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // カテゴリーとインストラクターの選択肢
  const [categories, setCategories] = useState<string[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/user');
        return;
      }
      loadSchedules();
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    loadSchedules();
  }, [currentDate, viewMode, selectedCategory, selectedInstructor]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      let from: string;
      let to: string;

      if (viewMode === 'day') {
        from = currentDate.toISOString().split('T')[0];
        to = from;
      } else if (viewMode === 'week') {
        const range = getWeekRange(currentDate);
        from = range.from;
        to = range.to;
      } else {
        const range = getMonthRange(currentDate);
        from = range.from;
        to = range.to;
      }

      const data = await getSchedules({
        from,
        to,
        category: selectedCategory || undefined,
        instructorId: selectedInstructor || undefined,
      });

      setSchedules(data);

      // カテゴリーとインストラクターの選択肢を抽出
      const uniqueCategories = Array.from(new Set(data.map((s) => s.service.category)));
      const uniqueInstructors = data.reduce((acc: { id: string; name: string }[], s) => {
        if (!acc.find((i) => i.id === s.service.instructor.id)) {
          acc.push({
            id: s.service.instructor.id,
            name: s.service.instructor.user.name,
          });
        }
        return acc;
      }, []);

      setCategories(uniqueCategories);
      setInstructors(uniqueInstructors);
    } catch (err: any) {
      console.error('スケジュール取得エラー:', err);
      setError('スケジュールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 日付範囲のラベル
  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    } else if (viewMode === 'week') {
      const range = getWeekRange(currentDate);
      const from = new Date(range.from);
      const to = new Date(range.to);
      return `${from.getMonth() + 1}/${from.getDate()} - ${to.getMonth() + 1}/${to.getDate()}`;
    } else {
      return currentDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
      });
    }
  }, [currentDate, viewMode]);

  // ナビゲーション
  const goToPrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 週表示用の日付配列
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const range = getWeekRange(currentDate);
    const start = new Date(range.from);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate, viewMode]);

  // 月表示用のカレンダー日付
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate, viewMode]);

  // 特定の日のスケジュールを取得
  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((s) => {
      const scheduleDate = new Date(s.date);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  // カテゴリー名を日本語に変換
  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      yoga: 'ヨガ',
      personalTraining: 'パーソナルトレーニング',
      pilates: 'ピラティス',
      other: 'その他',
    };
    return names[category] || category;
  };

  const weekDayNames = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-purple-600" />
            スケジュール一覧
          </h1>
          <p className="text-gray-600 mt-1">開催中のサービスをカレンダーで確認できます</p>
        </div>

        {/* コントロールバー */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 表示モード切り替え */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
                className={viewMode === 'day' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <List className="h-4 w-4 mr-1" />
                日
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
                className={viewMode === 'week' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                週
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
                className={viewMode === 'month' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <Calendar className="h-4 w-4 mr-1" />
                月
              </Button>
            </div>

            {/* 日付ナビゲーション */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                今日
              </Button>
              <span className="text-lg font-semibold min-w-[180px] text-center">
                {dateRangeLabel}
              </span>
              <Button variant="outline" size="sm" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* フィルターボタン */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Filter className="h-4 w-4 mr-1" />
              フィルター
            </Button>
          </div>

          {/* フィルターパネル */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* カテゴリーフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag className="h-4 w-4 inline mr-1" />
                  カテゴリー
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">すべて</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryName(cat)}
                    </option>
                  ))}
                </select>
              </div>

              {/* インストラクターフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  クリエイター
                </label>
                <select
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">すべて</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ローディング */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* スケジュール表示 */}
        {!loading && !error && (
          <>
            {/* 日表示 */}
            {viewMode === 'day' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {currentDate.toLocaleDateString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </h2>
                {getSchedulesForDate(currentDate).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>この日の予定はありません</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getSchedulesForDate(currentDate).map((schedule) => (
                      <ScheduleCard key={schedule.id} schedule={schedule} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 週表示 */}
            {viewMode === 'week' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-7 border-b">
                  {weekDays.map((day, index) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={index}
                        className={`text-center py-3 border-r last:border-r-0 ${
                          isToday ? 'bg-purple-50' : ''
                        }`}
                      >
                        <div
                          className={`text-sm ${
                            index === 0
                              ? 'text-red-500'
                              : index === 6
                              ? 'text-blue-500'
                              : 'text-gray-600'
                          }`}
                        >
                          {weekDayNames[index]}
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            isToday ? 'text-purple-600' : 'text-gray-900'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7 min-h-[400px]">
                  {weekDays.map((day, index) => {
                    const daySchedules = getSchedulesForDate(day);
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                      <div
                        key={index}
                        className={`border-r last:border-r-0 p-2 ${
                          isPast ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="space-y-2">
                          {daySchedules.map((schedule) => (
                            <Link
                              key={schedule.id}
                              href={`/user/services/${schedule.service.id}`}
                              className="block p-2 rounded bg-purple-100 hover:bg-purple-200 transition-colors"
                            >
                              <div className="text-xs font-medium text-purple-800">
                                {schedule.startTime}
                              </div>
                              <div className="text-xs text-purple-700 truncate">
                                {schedule.service.title}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 月表示 */}
            {viewMode === 'month' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-7 border-b">
                  {weekDayNames.map((day, index) => (
                    <div
                      key={day}
                      className={`text-center py-3 text-sm font-medium ${
                        index === 0
                          ? 'text-red-500'
                          : index === 6
                          ? 'text-blue-500'
                          : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day, index) => {
                    if (!day) {
                      return <div key={index} className="border-b border-r h-24" />;
                    }
                    const daySchedules = getSchedulesForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <div
                        key={index}
                        className={`border-b border-r h-24 p-1 overflow-hidden ${
                          isToday ? 'bg-purple-50' : isPast ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div
                          className={`text-sm mb-1 ${
                            isPast
                              ? 'text-gray-400'
                              : index % 7 === 0
                              ? 'text-red-500'
                              : index % 7 === 6
                              ? 'text-blue-500'
                              : 'text-gray-700'
                          } ${isToday ? 'font-bold text-purple-600' : ''}`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {daySchedules.slice(0, 2).map((schedule) => (
                            <Link
                              key={schedule.id}
                              href={`/user/services/${schedule.service.id}`}
                              className="block text-xs px-1 py-0.5 rounded bg-purple-100 hover:bg-purple-200 truncate"
                            >
                              {schedule.startTime} {schedule.service.title}
                            </Link>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-xs text-purple-600 text-center">
                              +{daySchedules.length - 2}件
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// スケジュールカード（日表示用）
function ScheduleCard({ schedule }: { schedule: ScheduleWithService }) {
  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      yoga: 'ヨガ',
      personalTraining: 'パーソナルトレーニング',
      pilates: 'ピラティス',
      other: 'その他',
    };
    return names[category] || category;
  };

  return (
    <Link
      href={`/user/services/${schedule.service.id}`}
      className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
              {getCategoryName(schedule.service.category)}
            </span>
            <span className="text-sm text-gray-500">
              <Clock className="h-3 w-3 inline mr-1" />
              {schedule.startTime}〜{schedule.endTime}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{schedule.service.title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            <User className="h-3 w-3 inline mr-1" />
            {schedule.service.instructor.user.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-600">
            {schedule.service.price.toLocaleString()}pt
          </div>
          <div className="text-xs text-gray-500">{schedule.service.duration}分</div>
        </div>
      </div>
    </Link>
  );
}
