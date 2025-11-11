# コンポーネント設計

## 概要

Coordy（コーディ）プラットフォームのフロントエンドコンポーネント設計書です。
React + TypeScript + shadcn/uiを使用したコンポーネントアーキテクチャを定義します。

---

## コンポーネント階層

```
app/
├── layout.tsx (RootLayout)
├── [role]/
│   ├── layout.tsx (RoleLayout)
│   └── (protected)/
│       └── layout.tsx (ProtectedLayout)
│
components/
├── ui/ (shadcn/ui基本コンポーネント)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
│
├── shared/ (共通コンポーネント)
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
│
├── features/ (機能別コンポーネント)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── calendar/
│   │   ├── Calendar.tsx
│   │   ├── CalendarDay.tsx
│   │   └── CalendarEvent.tsx
│   ├── reservation/
│   │   ├── ServiceCard.tsx
│   │   ├── ServiceDetail.tsx
│   │   └── ReservationForm.tsx
│   ├── todo/
│   │   ├── TodoList.tsx
│   │   ├── TodoItem.tsx
│   │   └── TodoForm.tsx
│   └── payment/
│       ├── PaymentForm.tsx
│       └── PaymentHistory.tsx
│
└── layouts/ (レイアウトコンポーネント)
    ├── DashboardLayout.tsx
    └── EmptyLayout.tsx
```

---

## 設計原則

### 1. コンポーネント分類

| 分類 | 説明 | 例 |
|------|------|-----|
| **UI Components** | 汎用的なUIパーツ（shadcn/ui） | Button, Input, Card |
| **Shared Components** | アプリ全体で共有 | Header, Sidebar, Footer |
| **Feature Components** | 機能特化型 | ServiceCard, TodoList |
| **Layout Components** | ページレイアウト | DashboardLayout |
| **Page Components** | ページ全体 | HomePage, ServicePage |

### 2. コンポーネント設計パターン

#### Container/Presentational パターン

```typescript
// Container Component (ロジック担当)
export function ServiceListContainer() {
  const { services, loading, error } = useServices();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <ServiceList services={services} />;
}

// Presentational Component (表示担当)
interface ServiceListProps {
  services: Service[];
}

export function ServiceList({ services }: ServiceListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map(service => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
```

#### Compound Component パターン

```typescript
// カレンダーコンポーネント
export function Calendar({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <CalendarContext.Provider value={{ selectedDate, setSelectedDate }}>
      <div className="calendar">{children}</div>
    </CalendarContext.Provider>
  );
}

Calendar.Header = CalendarHeader;
Calendar.Body = CalendarBody;
Calendar.Day = CalendarDay;

// 使用例
<Calendar>
  <Calendar.Header />
  <Calendar.Body />
</Calendar>
```

---

## 主要コンポーネント詳細

### 1. 認証関連

#### LoginForm

```typescript
// components/features/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/lib/auth';

interface LoginFormProps {
  role: 'user' | 'instructor' | 'admin';
}

export function LoginForm({ role }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ email, password, role });
      router.push(`/${role}`);
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'ログイン中...' : 'ログイン'}
      </Button>
    </form>
  );
}
```

---

### 2. カレンダー関連

#### Calendar

```typescript
// components/features/calendar/Calendar.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  view?: 'month' | 'week' | 'day';
}

export function Calendar({ events, onEventClick, view = 'month' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  return (
    <Card className="p-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      {view === 'month' && (
        <CalendarMonth
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      )}
      {view === 'week' && (
        <CalendarWeek
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      )}
      {view === 'day' && (
        <CalendarDay
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      )}
    </Card>
  );
}
```

---

### 3. サービス・予約関連

#### ServiceCard

```typescript
// components/features/reservation/ServiceCard.tsx
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        <Image
          src={service.image || '/placeholder.jpg'}
          alt={service.title}
          fill
          className="object-cover"
        />
        <Badge className="absolute top-2 right-2">
          {service.category}
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {service.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{service.duration}分</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>¥{service.basePrice.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/user/services/${service.id}`}>詳細を見る</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### ReservationForm

```typescript
// components/features/reservation/ReservationForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createReservation } from '@/lib/api';

interface ReservationFormProps {
  service: Service;
  onSuccess: () => void;
}

export function ReservationForm({ service, onSuccess }: ReservationFormProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [instructorId, setInstructorId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!date || !timeSlot || !instructorId) return;

    setLoading(true);
    try {
      await createReservation({
        serviceId: service.id,
        date: date.toISOString().split('T')[0],
        timeSlot,
        instructorId
      });
      onSuccess();
    } catch (error) {
      console.error('予約失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 日付選択 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">日付を選択</h3>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(date) => date < new Date()}
        />
      </div>

      {/* 時間帯選択 */}
      {date && (
        <div>
          <h3 className="text-lg font-semibold mb-2">時間帯を選択</h3>
          <RadioGroup value={timeSlot} onValueChange={setTimeSlot}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="morning" id="morning" />
              <label htmlFor="morning">午前 (9:00-12:00)</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="afternoon" id="afternoon" />
              <label htmlFor="afternoon">午後 (13:00-17:00)</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="evening" id="evening" />
              <label htmlFor="evening">夜 (18:00-21:00)</label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* インストラクター選択 */}
      {timeSlot && (
        <div>
          <h3 className="text-lg font-semibold mb-2">インストラクターを選択</h3>
          <div className="space-y-2">
            {service.instructorSlots.map((slot) => (
              <Button
                key={slot.instructorId}
                variant={instructorId === slot.instructorId ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setInstructorId(slot.instructorId)}
              >
                {slot.instructorName} - ¥{slot.price.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 予約ボタン */}
      <Button
        onClick={handleSubmit}
        disabled={!date || !timeSlot || !instructorId || loading}
        className="w-full"
      >
        {loading ? '予約中...' : '予約を確定する'}
      </Button>
    </div>
  );
}
```

---

### 4. ToDo関連

#### TodoList

```typescript
// components/features/todo/TodoList.tsx
'use client';

import { useState } from 'react';
import { TodoItem } from './TodoItem';
import { TodoForm } from './TodoForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onDelete: (id: string) => void;
  onAdd: (todo: Omit<Todo, 'id'>) => void;
}

export function TodoList({ todos, onUpdate, onDelete, onAdd }: TodoListProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ToDo</h2>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          追加
        </Button>
      </div>

      {showForm && (
        <TodoForm
          onSubmit={(todo) => {
            onAdd(todo);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### 5. 共通コンポーネント

#### Header

```typescript
// components/shared/Header.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Settings, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/user/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Coordy</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* 残高表示 */}
          <div className="text-sm">
            残高: <span className="font-bold">¥{user.point.toLocaleString()}</span>
          </div>

          {/* 通知 */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {/* 設定 */}
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* ユーザーメニュー */}
          <Avatar>
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>

          {/* ログアウト */}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
```

#### Sidebar

```typescript
// components/shared/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Calendar, ShoppingBag, CreditCard, Activity } from 'lucide-react';

interface SidebarProps {
  role: 'user' | 'instructor' | 'admin';
}

const navigationItems = {
  user: [
    { href: '/user', label: 'ホーム', icon: Home },
    { href: '/user/services', label: 'サービス', icon: ShoppingBag },
    { href: '/user/reservations', label: '予約', icon: Calendar },
    { href: '/user/payment', label: '支払い', icon: CreditCard },
    { href: '/user/activity', label: '活動履歴', icon: Activity }
  ],
  instructor: [
    { href: '/instructor', label: 'ホーム', icon: Home },
    { href: '/instructor/services', label: 'サービス管理', icon: ShoppingBag },
    { href: '/instructor/schedule', label: 'スケジュール', icon: Calendar },
    { href: '/instructor/customers', label: '顧客管理', icon: Activity }
  ],
  admin: [
    { href: '/admin', label: 'ホーム', icon: Home },
    { href: '/admin/users', label: 'ユーザー', icon: Activity },
    { href: '/admin/services', label: 'サービス', icon: ShoppingBag },
    { href: '/admin/transactions', label: '取引', icon: CreditCard }
  ]
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = navigationItems[role];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-white">
      <nav className="flex flex-col gap-2 p-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

## レイアウトコンポーネント

### DashboardLayout

```typescript
// components/layouts/DashboardLayout.tsx
import { Header } from '@/components/shared/Header';
import { Sidebar } from '@/components/shared/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
  role: 'user' | 'instructor' | 'admin';
}

export function DashboardLayout({ children, user, role }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="flex">
        <Sidebar role={role} />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## スタイリング規約

### Tailwind CSS クラス

```typescript
// 推奨クラス構成
const cardClasses = cn(
  // レイアウト
  'flex flex-col',
  // サイズ
  'w-full h-auto',
  // スペーシング
  'p-4 gap-2',
  // 外観
  'rounded-lg shadow-md',
  'bg-white border border-gray-200',
  // インタラクション
  'hover:shadow-lg transition-shadow',
  // レスポンシブ
  'md:w-1/2 lg:w-1/3'
);
```

### カラーパレット

```typescript
// tailwind.config.ts
colors: {
  primary: {
    DEFAULT: '#3B82F6', // 青
    light: '#60A5FA',
    dark: '#2563EB'
  },
  accent: {
    DEFAULT: '#10B981', // ミント
    light: '#34D399',
    dark: '#059669'
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    // ... 以下略
  }
}
```

---

## パフォーマンス最適化

### 1. コード分割

```typescript
// 動的インポート
const CalendarModal = dynamic(
  () => import('@/components/features/calendar/CalendarModal'),
  { loading: () => <LoadingSpinner /> }
);
```

### 2. メモ化

```typescript
// useMemo
const filteredServices = useMemo(
  () => services.filter(s => s.category === selectedCategory),
  [services, selectedCategory]
);

// useCallback
const handleServiceClick = useCallback(
  (serviceId: string) => {
    router.push(`/user/services/${serviceId}`);
  },
  [router]
);

// React.memo
export const ServiceCard = memo(function ServiceCard({ service }: ServiceCardProps) {
  // ...
});
```

---

## テスト戦略

### コンポーネントテスト

```typescript
// __tests__/ServiceCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ServiceCard } from '@/components/features/reservation/ServiceCard';

describe('ServiceCard', () => {
  const mockService = {
    id: 'service-001',
    title: 'ヨガ初級',
    category: 'フィットネス',
    duration: 60,
    basePrice: 3000
  };

  it('renders service information', () => {
    render(<ServiceCard service={mockService} />);

    expect(screen.getByText('ヨガ初級')).toBeInTheDocument();
    expect(screen.getByText('60分')).toBeInTheDocument();
    expect(screen.getByText('¥3,000')).toBeInTheDocument();
  });
});
```

---

*最終更新日: 2025-10-11*
