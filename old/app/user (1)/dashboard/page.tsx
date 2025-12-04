'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function UserDashboardPage() {
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Event type color mapping
  const getEventColors = (type: string) => {
    const colorMap = {
      yoga: { bg: '#dbeafe', border: '#bfdbfe', text: '#1f2937' },
      pilates: { bg: '#fde68a', border: '#fcd34d', text: '#1f2937' },
      hiit: { bg: '#fee2e2', border: '#fecaca', text: '#7f1d1d' },
      home_strength: { bg: '#dcfce7', border: '#bbf7d0', text: '#065f46' },
      circuit: { bg: '#efe9fe', border: '#ddd6fe', text: '#5b21b6' },
      one_on_one: { bg: '#ffedd5', border: '#fed7aa', text: '#7c2d12' },
    };
    return colorMap[type as keyof typeof colorMap] || colorMap.yoga;
  };

  // Mock events data for 2025 September with enhanced data structure
  const mockEvents = {
    "2025-09-20": [
      { time: "10:00", endTime: "11:00", title: "ヨガ", type: "yoga", instructor: "田中" },
    ],
    "2025-09-22": [
      { time: "14:00", endTime: "14:45", title: "ピラティス", type: "pilates", instructor: "佐藤" },
    ],
    "2025-09-25": [
      { time: "10:00", endTime: "11:00", title: "ヨガ", type: "yoga", instructor: "田中" },
      { time: "10:00", endTime: "10:30", title: "HIIT", type: "hiit", instructor: "鈴木" },
      { time: "10:00", endTime: "11:30", title: "1:1", type: "one_on_one", instructor: "山田" },
    ],
    "2025-09-27": [
      { time: "11:30", endTime: "12:30", title: "ヨガ", type: "yoga", instructor: "田中" },
      { time: "15:00", endTime: "15:45", title: "ピラティス", type: "pilates", instructor: "佐藤" },
      { time: "16:00", endTime: "17:00", title: "自宅キントレ", type: "home_strength", instructor: "高橋" },
    ],
    "2025-09-28": [
      { time: "09:00", endTime: "10:00", title: "サーキット", type: "circuit", instructor: "佐々木" },
      { time: "13:00", endTime: "14:00", title: "1:1", type: "one_on_one", instructor: "川田" },
    ],
  };

  const getEventsForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return mockEvents[key as keyof typeof mockEvents] || [];
  };

  // カレンダーの日付を取得
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // 前月の空白
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 当月の日付
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f7f8' }}>
      <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">ダッシュボード</h1>

      {/* 統計カード */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">3</div>
            <div className="text-sm text-gray-600 mt-2">今後の予約</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">5</div>
            <div className="text-sm text-gray-600 mt-2">お気に入り</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">1,250</div>
            <div className="text-sm text-gray-600 mt-2">ポイント</div>
          </div>
        </div>
      </div>

      {/* 直近の予約 */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">直近の予約</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">サービス</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">日時</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ステータス</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm">ヨガクラス</td>
                <td className="px-4 py-3 text-sm">1/20 10:00</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    確定
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-blue-600 hover:underline mr-2">詳細</button>
                  <button className="text-red-600 hover:underline">キャンセル</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">ピラティス</td>
                <td className="px-4 py-3 text-sm">1/22 14:00</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                    保留中
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-blue-600 hover:underline mr-2">詳細</button>
                  <button className="text-red-600 hover:underline">キャンセル</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* カレンダー */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {/* ツールバー */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-semibold text-gray-900">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </div>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-2 border rounded-lg text-sm ${
                calendarView === 'day'
                  ? 'border-gray-400 bg-gray-50 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              日
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-2 border rounded-lg text-sm ${
                calendarView === 'week'
                  ? 'border-gray-400 bg-gray-50 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              週
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-2 border rounded-lg text-sm ${
                calendarView === 'month'
                  ? 'border-gray-400 bg-gray-50 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              月
            </button>
          </div>
        </div>

        {/* 曜日行 */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} className="text-right p-1" style={{ fontSize: '13px', color: '#6b7280' }}>
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-2">
          {getDaysInMonth().map((date, index) => {
            const events = date ? getEventsForDate(date) : [];
            const isOutsideMonth = !date;

            return (
              <div
                key={index}
                className={`h-[110px] md:h-[110px] sm:h-[90px] rounded-lg p-1.5 flex flex-col gap-1.5 ${
                  isOutsideMonth ? 'opacity-45' : ''
                }`}
                style={{
                  backgroundColor: '#fafafa',
                  border: '1px solid #e5e7eb'
                }}
              >
                {date && (
                  <>
                    <div className="ml-auto" style={{ fontSize: '12px', color: '#6b7280' }}>
                      {date.getDate()}
                    </div>
                    {events.map((event, eventIndex) => {
                      const colors = getEventColors(event.type);
                      return (
                        <div
                          key={eventIndex}
                          className="truncate"
                          style={{
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: '4px 6px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            color: colors.text,
                            maxWidth: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {event.time} {event.title}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-3 mt-3" style={{ fontSize: '12px', color: '#6b7280' }}>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#dbeafe' }}></div>
            <span>ヨガ</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#fde68a' }}></div>
            <span>ピラティス</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
