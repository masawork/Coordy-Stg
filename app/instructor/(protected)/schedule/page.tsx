'use client';

import { useState } from 'react';
import { Calendar, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstructorSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 曜日名
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 現在の月のカレンダー日付を生成
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // 月の最初の日の曜日まで空白を追加
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 月の日付を追加
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">スケジュール</h1>
          <p className="text-sm text-gray-600 mt-1">予定と空き時間を管理します</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          予定を追加
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* カレンダーヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold">
            {selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>

        {/* 曜日ヘッダー */}
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

        {/* カレンダー日付 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center rounded-lg ${
                day
                  ? 'hover:bg-green-50 cursor-pointer'
                  : ''
              } ${
                day === new Date().getDate() &&
                selectedDate.getMonth() === new Date().getMonth() &&
                selectedDate.getFullYear() === new Date().getFullYear()
                  ? 'bg-green-100 text-green-700 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* 予定リスト */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">本日の予定</h3>
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p>本日の予定はありません</p>
        </div>
      </div>
    </div>
  );
}
