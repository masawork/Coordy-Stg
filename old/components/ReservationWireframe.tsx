'use client';

// 予約サイト UIワイヤーフレーム
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Calendar, ChevronLeft, ChevronRight, Menu, Search, User, Home, Clock,
  CreditCard, Star, Heart, Video, HelpCircle, Settings,
  Package, Users, BarChart, LogOut, ArrowLeft
} from 'lucide-react';

// Context for Role Management
const RoleContext = createContext({ role: 'user', setRole: (role: string) => {} });

// Simple Calendar Component
function CalendarPlaceholder({ onDateSelect }: { onDateSelect: (date: Date) => void }) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Mock events data for 2025 September
  const mockEvents = {
    "2025-09-20": [
      { time: "10:00", title: "ヨガ", type: "yoga", instructor: "田中" },
    ],
    "2025-09-22": [
      { time: "14:00", title: "ピラティス", type: "pilates", instructor: "佐藤" },
    ],
    "2025-09-25": [
      { time: "10:00", title: "ヨガ", type: "yoga", instructor: "田中" },
      { time: "10:00", title: "ピラティス", type: "pilates", instructor: "鈴木" },
    ],
    "2025-09-27": [
      { time: "11:30", title: "ヨガ", type: "yoga", instructor: "田中" },
      { time: "15:00", title: "ピラティス", type: "pilates", instructor: "佐藤" },
    ],
  };

  const getEventsForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return mockEvents[key as keyof typeof mockEvents] || [];
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

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
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
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
            disabled
            className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-gray-400 cursor-not-allowed text-sm"
          >
            日
          </button>
          <button
            disabled
            className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-gray-400 cursor-not-allowed text-sm"
          >
            週
          </button>
          <button
            className="px-3 py-2 border border-gray-400 bg-gray-50 rounded-lg text-gray-900 text-sm"
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
          const isSelected = selectedDate && date && date.getTime() === selectedDate.getTime();

          return (
            <button
              key={index}
              onClick={() => date && handleDateClick(date)}
              className={`h-[110px] md:h-[110px] sm:h-[90px] rounded-lg p-1.5 flex flex-col gap-1.5 hover:bg-gray-50 ${
                isOutsideMonth ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
              } ${isSelected ? 'ring-2 ring-blue-300' : ''}`}
              style={{
                backgroundColor: '#fafafa',
                border: '1px solid #e5e7eb'
              }}
              disabled={!date}
            >
              {date && (
                <>
                  <div className="ml-auto" style={{ fontSize: '12px', color: '#6b7280' }}>
                    {date.getDate()}
                  </div>
                  {events.map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="truncate"
                      style={{
                        fontSize: '12px',
                        borderRadius: '8px',
                        padding: '4px 6px',
                        backgroundColor: event.type === 'yoga' ? '#dbeafe' : '#fde68a',
                        border: `1px solid ${event.type === 'yoga' ? '#bfdbfe' : '#fcd34d'}`,
                        color: '#1f2937',
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {event.time} {event.title}
                    </div>
                  ))}
                </>
              )}
            </button>
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
  );
}

// Main Application Component
export default function ReservationWireframe({ currentPage }: { currentPage?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('user');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // pathnameからロールを判定
  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      setRole('admin');
    } else if (pathname.startsWith('/instructor')) {
      setRole('instructor');
    } else {
      setRole('user');
    }
  }, [pathname]);

  // ログインページかどうか判定
  const isLoginPage = pathname.endsWith('/login');

  // ログアウト処理
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push(`/${role}/login`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ヘッダーの背景色をロールに応じて変更
  const getHeaderColor = () => {
    switch(role) {
      case 'admin': return 'bg-orange-600';
      case 'instructor': return 'bg-green-700';
      default: return 'bg-gray-800';
    }
  };

  // pathnameからページタイプを判定
  const getPageType = () => {
    if (currentPage) return currentPage;

    const path = pathname.split('/').pop() || 'home';
    return path === 'user' || path === 'instructor' || path === 'admin' ? 'home' : path;
  };

  const pageType = getPageType();

  // Mock data
  const services = [
    { id: 1, name: 'ヨガクラス', description: '初心者向けヨガ', price: 3000, duration: 60 },
    { id: 2, name: 'ピラティス', description: '体幹トレーニング', price: 3500, duration: 45 },
    { id: 3, name: 'パーソナルトレーニング', description: '個別指導', price: 8000, duration: 90 }
  ];

  const reservations = [
    { id: 'R001', service: 'ヨガクラス', date: '2024-01-20', time: '10:00', status: 'confirmed' },
    { id: 'R002', service: 'ピラティス', date: '2024-01-22', time: '14:00', status: 'pending' }
  ];

  // Navigation items based on role
  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { icon: Home, label: 'ホーム', path: '/admin' },
        { icon: BarChart, label: 'ダッシュボード', path: '/admin/dashboard' },
        { icon: Package, label: 'サービス管理', path: '/admin/services' },
        { icon: Users, label: 'ユーザー管理', path: '/admin/users' },
        { icon: Settings, label: '設定', path: '/admin/settings' }
      ];
    } else if (role === 'instructor') {
      return [
        { icon: Home, label: 'ホーム', path: '/instructor' },
        { icon: BarChart, label: 'ダッシュボード', path: '/instructor/dashboard' },
        { icon: Calendar, label: 'スケジュール', path: '/instructor/schedule' },
        { icon: Clock, label: '予約管理', path: '/instructor/reservations' },
        { icon: User, label: 'プロフィール', path: '/instructor/profile' }
      ];
    } else {
      return [
        { icon: Home, label: 'ホーム', path: '/user' },
        { icon: BarChart, label: 'ダッシュボード', path: '/user/dashboard' },
        { icon: Package, label: 'サービス', path: '/user/services' },
        { icon: Calendar, label: '空き状況', path: '/user/availability' },
        { icon: Clock, label: '予約履歴', path: '/user/reservations' },
        { icon: CreditCard, label: '支払い', path: '/user/payments' },
        { icon: Star, label: 'レビュー', path: '/user/reviews' },
        { icon: Heart, label: 'お気に入り', path: '/user/favorites' },
        { icon: Video, label: 'ライブ', path: '/user/live' },
        { icon: HelpCircle, label: 'ヘルプ', path: '/user/help' }
      ];
    }
  };



  // Page content renderer
  const renderPageContent = () => {
    // Home Page
    if (pageType === 'home') {
      return (
        <div className="page-container">
          <h1 className="text-3xl text-black font-bold mb-4">予約サイトへようこそ</h1>
          <p className="text-black mb-8">お好みのサービスを選んで予約してください</p>          
          <div className="section-card mb-6">
            <h2 className="text-xl text-black font-semibold mb-4">サービスを検索</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="サービス名で検索..." className="px-4 py-2 border rounded-lg text-black placeholder:text-gray-700" />
              <select className="px-4 py-2 border rounded-lg">
                <option>カテゴリを選択</option>
                <option>フィットネス</option>
                <option>ウェルネス</option>
              </select>
            </div>
            <button 
              onClick={() => router.push(`/${role}/services`)} 
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              サービス一覧を見る
            </button>
          </div>

          <div className="section-card">
            <h2 className="text-xl text-black font-semibold mb-4">おすすめサービス</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {services.map(service => (
                <div key={service.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-black">{service.name}</h3>
                  <p className="text-sm text-black mb-2">{service.description}</p>
                  <p className="text-lg font-bold text-black">¥{service.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Dashboard Page
    if (pageType === 'dashboard') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6 text-black">
            {role === 'admin' ? '管理者' : role === 'instructor' ? 'インストラクター' : 'ユーザー'}ダッシュボード
          </h1>
          <div className="section-card">
            <p className="text-gray-600">ダッシュボードの内容がここに表示されます</p>
          </div>
        </div>
      );
    }

    // Services Page
    if (pageType === 'services') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6 text-black">サービス一覧</h1>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <div key={service.id} className="section-card">
                <h3 className="font-semibold mb-2 text-black">{service.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                <p className="text-lg font-bold text-black mb-3">¥{service.price.toLocaleString()}</p>
                <button 
                  onClick={() => router.push(`/${role}/availability`)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  予約する
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Reservations Page
    if (pageType === 'reservations') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6 text-black">予約管理</h1>
          <div className="section-card">
            <div className="space-y-4">
              {reservations.map(reservation => (
                <div key={reservation.id} className="border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-black">{reservation.service}</h3>
                      <p className="text-sm text-gray-600">{reservation.date} {reservation.time}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      reservation.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {reservation.status === 'confirmed' ? '確定' : '保留中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Availability/Calendar Page
    if (pageType === 'availability') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6" style={{ color: '#111827' }}>空き状況</h1>
          <CalendarPlaceholder onDateSelect={setSelectedDate} />

          {selectedDate && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日の時間選択
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-2 text-sm border rounded ${
                      selectedTime === time
                        ? 'bg-gray-700 text-white'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              {selectedDate && selectedTime && (
                <button
                  onClick={() => router.push(`/${role}/checkout`)}
                  className="w-full mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  この時間で予約する
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    // Default fallback for other pages
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold mb-6 text-black">{pageType} ページ</h1>
        <div className="section-card">
          <p className="text-gray-600">このページは準備中です</p>
        </div>
      </div>
    );
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f7f8' }}>
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 px-4">
          <div className="flex items-center justify-between h-full">
            {/* Left: Hamburger → Back */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                aria-label="メニュー"
              >
                <Menu className="h-4 w-4 text-black" />
              </button>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    window.history.back();
                  } else {
                    router.push(`/${role}`);
                  }
                }}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                aria-label="戻る"
              >
                <ArrowLeft className="h-4 w-4 text-black" />
              </button>
            </div>

            {/* Center: Brand + Logo */}
            <div className="flex-1 flex justify-center">
              <button
                onClick={() => router.push(`/${role}`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Home className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-800 hidden sm:inline truncate">
                  予約サイト
                </span>
              </button>
            </div>

            {/* Right: Logout → Profile */}
            <div className="flex items-center gap-2">
              {!isLoginPage && (
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="text-sm text-gray-600 hover:text-gray-900 hidden sm:flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3"
                >
                  {isLoading ? 'ログアウト中...' : 'ログアウト'}
                </button>
              )}

              {!isLoginPage && (
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  aria-label="ログアウト"
                  className="h-9 w-9 sm:hidden inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4 text-black" />
                </button>
              )}

              <button
                aria-label="プロフィール"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-4 w-4 text-black" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 pt-14">
          {/* Sidebar */}
          <aside className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform`}>
            <div className="h-full overflow-y-auto p-4">
              <nav className="space-y-1">
                {getNavItems().map(item => (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      pathname === item.path 
                        ? 'bg-gray-200 text-gray-900 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {renderPageContent()}
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
          <div className="page-container py-4 text-center text-sm text-gray-600">
            <p>&copy; 2024 予約サイト. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="#" className="hover:text-gray-900">利用規約</a>
              <a href="#" className="hover:text-gray-900">プライバシーポリシー</a>
              <a href="#" className="hover:text-gray-900">お問い合わせ</a>
            </div>
          </div>
        </footer>

        <style jsx>{`
          .page-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
          }
          .section-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            padding: 1.5rem;
          }
          .form-row {
            margin-bottom: 1rem;
          }
          .list-table {
            background: white;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    </RoleContext.Provider>
  );
}
