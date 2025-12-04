"use client";

// 予約サイト UIワイヤーフレーム
import React, { createContext, useContext, useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Menu, Search, User, Home, Clock,
  CreditCard, Star, Heart, Video, HelpCircle, Settings,
  Package, Users, BarChart, X, Check, Plus
} from 'lucide-react';

// Context for Role Management
const RoleContext = createContext({ role: 'user', setRole: (role: string) => {} });
const useRole = () => useContext(RoleContext);

// Simple Calendar Component
function CalendarPlaceholder({ onDateSelect }: { onDateSelect: (date: Date) => void }) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

// Main Application Component
export default function ReservationWireframe() {
  const [role, setRole] = useState('user');
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    memo: '',
    terms: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
        { icon: Home, label: 'ホーム', page: 'home' },
        { icon: BarChart, label: 'ダッシュボード', page: 'admin-dashboard' },
        { icon: Package, label: 'サービス管理', page: 'admin-services' },
        { icon: Users, label: 'ユーザー管理', page: 'admin-users' },
        { icon: Settings, label: '設定', page: 'admin-settings' }
      ];
    } else if (role === 'instructor') {
      return [
        { icon: Home, label: 'ホーム', page: 'home' },
        { icon: BarChart, label: 'ダッシュボード', page: 'instructor-dashboard' },
        { icon: Calendar, label: 'スケジュール', page: 'instructor-schedule' },
        { icon: Clock, label: '予約管理', page: 'instructor-reservations' },
        { icon: User, label: 'プロフィール', page: 'instructor-profile' }
      ];
    } else {
      return [
        { icon: Home, label: 'ホーム', page: 'home' },
        { icon: BarChart, label: 'ダッシュボード', page: 'dashboard' },
        { icon: Package, label: 'サービス', page: 'services' },
        { icon: Calendar, label: '空き状況', page: 'availability' },
        { icon: Clock, label: '予約履歴', page: 'reservations' },
        { icon: CreditCard, label: '支払い', page: 'payments' },
        { icon: Star, label: 'レビュー', page: 'reviews' },
        { icon: Heart, label: 'お気に入り', page: 'favorites' },
        { icon: Video, label: 'ライブ', page: 'live' },
        { icon: HelpCircle, label: 'ヘルプ', page: 'help' }
      ];
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name) errors.name = '名前は必須です';
    if (!formData.email) {
      errors.email = 'メールアドレスは必須です';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    return errors;
  };

  // Page content renderer
  const renderPageContent = () => {
    // Home Page
    if (currentPage === 'home') {
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
              onClick={() => setCurrentPage('services')} 
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

    // User Dashboard
    if (currentPage === 'dashboard') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="section-card">
              <h3 className="font-semibold mb-2">今後の予約</h3>
              <p className="text-2xl font-bold">3件</p>
            </div>
            <div className="section-card">
              <h3 className="font-semibold mb-2">お気に入り</h3>
              <p className="text-2xl font-bold">5件</p>
            </div>
            <div className="section-card">
              <h3 className="font-semibold mb-2">ポイント</h3>
              <p className="text-2xl font-bold">1,250pt</p>
            </div>
          </div>
        </div>
      );
    }

    // Services Page
    if (currentPage === 'services') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6">サービス一覧</h1>
          <div className="grid md:grid-cols-3 gap-6">
            {services.map(service => (
              <div key={service.id} className="section-card">
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <p className="text-sm text-gray-500 mb-2">{service.duration}分</p>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">¥{service.price.toLocaleString()}</span>
                  <button
                    onClick={() => setCurrentPage('availability')}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                  >
                    予約する
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Availability Page
    if (currentPage === 'availability') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6">空き状況</h1>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CalendarPlaceholder onDateSelect={setSelectedDate} />
            </div>
            <div>
              <div className="section-card mb-4">
                <h3 className="font-semibold mb-4">時間を選択</h3>
                {selectedDate ? (
                  <div className="space-y-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00'].map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`w-full p-2 rounded border ${
                          selectedTime === time ? 'bg-gray-700 text-white' : 'bg-white'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">日付を選択してください</p>
                )}
              </div>
              <button
                onClick={() => setCurrentPage('checkout')}
                disabled={!selectedDate || !selectedTime}
                className={`w-full px-4 py-2 rounded ${
                  selectedDate && selectedTime
                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                予約手続きへ
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Checkout Page
    if (currentPage === 'checkout') {
      return (
        <div className="page-container max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">予約手続き</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map(step => (
              <React.Fragment key={step}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  checkoutStep >= step ? 'bg-gray-700 text-white' : 'bg-gray-200'
                }`}>
                  {checkoutStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    checkoutStep > step ? 'bg-gray-700' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Customer Info */}
          {checkoutStep === 1 && (
            <div className="section-card">
              <h2 className="text-xl font-semibold mb-4">お客様情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">備考</label>
                  <textarea
                    value={formData.memo}
                    onChange={e => setFormData({...formData, memo: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const errors = validateForm();
                    setFormErrors(errors);
                    if (Object.keys(errors).length === 0) {
                      setCheckoutStep(2);
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                >
                  次へ
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirmation */}
          {checkoutStep === 2 && (
            <div className="section-card">
              <h2 className="text-xl font-semibold mb-4">予約内容の確認</h2>
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p>名前: {formData.name}</p>
                <p>メール: {formData.email}</p>
                {formData.memo && <p>備考: {formData.memo}</p>}
              </div>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.terms}
                  onChange={e => setFormData({...formData, terms: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm">利用規約に同意します</span>
              </label>
              {formErrors.terms && (
                <p className="text-red-500 text-sm mb-4">{formErrors.terms}</p>
              )}
              <div className="flex gap-4">
                <button 
                  onClick={() => setCheckoutStep(1)} 
                  className="flex-1 px-4 py-2 border rounded-lg"
                >
                  戻る
                </button>
                <button 
                  onClick={() => {
                    if (!formData.terms) {
                      setFormErrors({terms: '利用規約に同意してください'});
                    } else {
                      setCheckoutStep(3);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                >
                  予約確定
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {checkoutStep === 3 && (
            <div className="section-card text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">予約が完了しました</h2>
              <p className="text-gray-600 mb-4">予約番号: RES-2024-0001</p>
              <button 
                onClick={() => {
                  setCurrentPage('home');
                  setCheckoutStep(1);
                  setFormData({name: '', email: '', memo: '', terms: false});
                }}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
              >
                ホームへ戻る
              </button>
            </div>
          )}
        </div>
      );
    }

    // Reservations Page
    if (currentPage === 'reservations') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6">予約一覧</h1>
          <div className="list-table bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">予約ID</th>
                    <th className="px-4 py-3 text-left">サービス</th>
                    <th className="px-4 py-3 text-left">日時</th>
                    <th className="px-4 py-3 text-left">ステータス</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(res => (
                    <tr key={res.id} className="border-t">
                      <td className="px-4 py-3">{res.id}</td>
                      <td className="px-4 py-3">{res.service}</td>
                      <td className="px-4 py-3">{res.date} {res.time}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          res.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {res.status === 'confirmed' ? '確定' : '保留中'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-blue-600 hover:underline mr-2">変更</button>
                        <button className="text-red-600 hover:underline">キャンセル</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Instructor Schedule
    if (currentPage === 'instructor-schedule') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6">スケジュール管理</h1>
          <CalendarPlaceholder onDateSelect={setSelectedDate} />
          <div className="mt-6 section-card">
            <h3 className="font-semibold mb-4">空き枠の作成</h3>
            <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800">
              <Plus className="w-4 h-4 inline mr-2" />
              新規空き枠を追加
            </button>
          </div>
        </div>
      );
    }

    // Admin Dashboard
    if (currentPage === 'admin-dashboard') {
      return (
        <div className="page-container">
          <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="section-card">
              <h3 className="font-semibold mb-2">総予約数</h3>
              <p className="text-2xl font-bold">1,234</p>
              <p className="text-sm text-gray-600">今月: +12%</p>
            </div>
            <div className="section-card">
              <h3 className="font-semibold mb-2">ユーザー数</h3>
              <p className="text-2xl font-bold">456</p>
            </div>
            <div className="section-card">
              <h3 className="font-semibold mb-2">稼働率</h3>
              <p className="text-2xl font-bold">82%</p>
            </div>
            <div className="section-card">
              <h3 className="font-semibold mb-2">キャンセル率</h3>
              <p className="text-2xl font-bold">5.2%</p>
            </div>
          </div>
        </div>
      );
    }

    // Placeholder for other pages
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold mb-6">{currentPage} ページ</h1>
        <div className="section-card">
          <p className="text-gray-600">このページは準備中です</p>
        </div>
      </div>
    );
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="lg:hidden p-2 hover:bg-gray-100 rounded"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl text-black font-bold">予約サイト</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-black"
              >
                <option value="user">User</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform`}>
            <div className="h-full overflow-y-auto p-4">
              <nav className="space-y-1">
                {getNavItems().map(item => (
                  <button
                    key={item.page}
                    onClick={() => {
                      setCurrentPage(item.page);
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
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
      </div>

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
    </RoleContext.Provider>
  );
}