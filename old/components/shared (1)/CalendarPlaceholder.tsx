'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPlaceholderProps {
  onDateSelect?: (date: Date) => void;
}

export default function CalendarPlaceholder({ onDateSelect }: CalendarPlaceholderProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateSelect) onDateSelect(date);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">
          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => (
          <div key={day} className="text-center text-xs font-semibold p-2 text-gray-600">
            {day}
          </div>
        ))}
        
        {getDaysInMonth().map((date, index) => (
          <div key={index}>
            {date ? (
              <button
                onClick={() => handleDateClick(date)}
                className={`w-full p-2 text-sm border rounded hover:bg-gray-100 ${
                  selectedDate && date.getTime() === selectedDate.getTime()
                    ? 'bg-gray-300 border-gray-400'
                    : 'border-gray-200'
                }`}
              >
                {date.getDate()}
              </button>
            ) : (
              <div className="p-2"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

