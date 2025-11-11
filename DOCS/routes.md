# ルーティング構成

## 概要

このアプリケーションはNext.js 15 App Routerを使用し、ロールベースのルーティング構造を持っています。

## ルート構造

```
app/
├── user/                     # 一般ユーザー用ルート
│   ├── login/
│   │   └── page.tsx         # ユーザーログイン
│   ├── (protected)/         # 認証が必要なルート
│   │   ├── page.tsx         # ホーム（予約・TODO表示）
│   │   ├── services/
│   │   │   └── page.tsx     # サービス検索
│   │   ├── reservations/
│   │   │   └── page.tsx     # 自分の予定
│   │   ├── todos/
│   │   │   └── page.tsx     # TODOリスト
│   │   ├── favorites/
│   │   │   └── page.tsx     # お気に入り
│   │   ├── activity/
│   │   │   └── page.tsx     # 活動履歴
│   │   ├── points/
│   │   │   └── page.tsx     # ポイント管理
│   │   ├── profile/
│   │   │   └── page.tsx     # プロフィール
│   │   ├── payment/
│   │   │   └── page.tsx     # 支払い
│   │   ├── notifications/
│   │   │   └── page.tsx     # 通知設定
│   │   ├── help/
│   │   │   └── page.tsx     # ヘルプ
│   │   └── settings/
│   │       └── page.tsx     # 設定
│
├── instructor/              # インストラクター用ルート
│   ├── login/
│   │   └── page.tsx         # インストラクターログイン
│   ├── (protected)/         # 認証が必要なルート
│   │   ├── dashboard/
│   │   │   └── page.tsx     # ダッシュボード（今日の予約・生徒一覧）
│   │   ├── services/
│   │   │   ├── page.tsx     # サービス管理（一覧）
│   │   │   ├── new/
│   │   │   │   └── page.tsx # 新規サービス作成
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx # サービス編集
│   │   ├── revenue/
│   │   │   └── page.tsx     # 収益・売上
│   │   ├── messages/
│   │   │   └── page.tsx     # 生徒メッセージ（将来実装予定）
│   │   ├── profile/
│   │   │   └── page.tsx     # プロフィール設定
│   │   ├── schedule/
│   │   │   └── page.tsx     # スケジュール管理
│   │   ├── reservations/
│   │   │   └── page.tsx     # 予約一覧
│   │   ├── notifications/
│   │   │   └── page.tsx     # 通知
│   │   └── settings/
│   │       └── page.tsx     # 設定
│
├── admin/                   # 管理者用ルート
│   ├── login/
│   │   └── page.tsx         # 管理者ログイン
│   ├── (protected)/         # 認証が必要なルート
│   │   ├── dashboard/
│   │   │   └── page.tsx     # 管理者ダッシュボード
│   │   ├── users/
│   │   │   └── page.tsx     # 全ユーザー一覧
│   │   ├── instructors/
│   │   │   └── page.tsx     # インストラクター承認管理
│   │   ├── services/
│   │   │   └── page.tsx     # サービス一覧（有効・無効切替）
│   │   ├── audit/
│   │   │   └── page.tsx     # 通報・監査ログ
│   │   ├── reports/
│   │   │   └── page.tsx     # レポート
│   │   ├── notifications/
│   │   │   └── page.tsx     # 通知
│   │   └── settings/
│   │       └── page.tsx     # システム設定
│
└── api/                     # APIルート
    ├── auth/                # 認証API
    │   ├── login/
    │   │   └── route.ts     # POST /api/auth/login
    │   ├── register/
    │   │   └── route.ts     # POST /api/auth/register
    │   ├── logout/
    │   │   └── route.ts     # POST /api/auth/logout
    │   ├── me/
    │   │   └── route.ts     # GET /api/auth/me
    │   └── refresh/
    │       └── route.ts     # POST /api/auth/refresh
    │
    ├── users/               # ユーザーAPI
    │   ├── route.ts         # GET /api/users（管理者のみ）
    │   ├── me/
    │   │   └── route.ts     # GET, PATCH /api/users/me
    │   └── [id]/
    │       └── route.ts     # GET /api/users/[id]（管理者のみ）
    │
    ├── services/            # サービスAPI
    │   ├── route.ts         # GET, POST /api/services
    │   └── [id]/
    │       └── route.ts     # GET, PATCH, DELETE /api/services/[id]
    │
    ├── reservations/        # 予約API
    │   ├── route.ts         # GET, POST /api/reservations
    │   └── [id]/
    │       └── route.ts     # GET, PATCH, DELETE /api/reservations/[id]
    │
    ├── todos/               # TODO API
    │   ├── route.ts         # GET, POST /api/todos
    │   └── [id]/
    │       └── route.ts     # GET, PATCH, DELETE /api/todos/[id]
    │
    ├── payments/            # 支払いAPI
    │   ├── route.ts         # GET /api/payments
    │   ├── charge/
    │   │   └── route.ts     # POST /api/payments/charge
    │   └── webhook/
    │       └── route.ts     # POST /api/payments/webhook
    │
    └── instructors/         # インストラクターAPI
        ├── route.ts         # GET, POST /api/instructors
        └── [id]/
            └── route.ts     # GET, PATCH, DELETE /api/instructors/[id]
```

## ルート保護

### ミドルウェア（`middleware.ts`）

**保護されたルート**:
- `/user/*` （ログインページ以外）→ user ロール必須
- `/instructor/*` （ログインページ以外）→ instructor ロール必須
- `/admin/*` （ログインページ以外）→ admin ロール必須

**リダイレクト**:
- 未認証 → `/{role}/login?next={requestedPath}`
- 認証済みでログインページアクセス → `/{role}` （ホーム）

### APIルート保護

各APIルートで `getSession()` を使用して認証・認可をチェック：

```typescript
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  // ... API logic
}
```

## ナビゲーション

### サイドバー（`components/layout/Sidebar.tsx`）

ロール別にメニューアイテムを切り替え：

**User Menu**:
- ホーム、サービス検索、自分の予定、TODO、お気に入り、活動履歴、ポイント、プロフィール、支払い、通知設定、ヘルプ、設定

**Instructor Menu**:
- ダッシュボード、サービス管理、収益・売上、生徒メッセージ、プロフィール設定、通知、設定

**Admin Menu**:
- ダッシュボード、全ユーザー一覧、インストラクター承認、サービス一覧、通報・監査ログ、レポート、通知、設定

### ロール判定

```typescript
import { useRole } from '@/contexts/RoleContext';

function MyComponent() {
  const { role } = useRole();

  return (
    <div>
      {role === 'user' && <UserContent />}
      {role === 'instructor' && <InstructorContent />}
      {role === 'admin' && <AdminContent />}
    </div>
  );
}
```

## 新規追加ルート（2025-10-11）

### インストラクター用ルート
- ✅ `/instructor/dashboard` - ダッシュボード
- ✅ `/instructor/services` - サービス一覧
- ✅ `/instructor/services/new` - 新規サービス作成
- ✅ `/instructor/services/[id]/edit` - サービス編集

### 管理者用ルート
- ✅ `/admin/instructors` - インストラクター承認管理
- ✅ `/admin/services` - サービス一覧管理

## パス命名規則

- **ルートグループ**: `(protected)` - 認証が必要なルートをグループ化
- **動的ルート**: `[id]` - パラメータを受け取るルート
- **キャッチオールルート**: `[...slug]` - 複数セグメントをキャッチ（未使用）

## リンク方法

### Next.js Link コンポーネント
```tsx
import Link from 'next/link';

<Link href="/user/services">サービス検索</Link>
<Link href="/instructor/services/new">新規サービス作成</Link>
<Link href="/admin/instructors">インストラクター承認</Link>
```

### プログラマティックナビゲーション
```tsx
import { useRouter } from 'next/navigation';

function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/instructor/dashboard');
  };
}
```

## ルートパラメータ

### 動的セグメント
```tsx
// app/instructor/services/[id]/edit/page.tsx
export default function EditServicePage({ params }: { params: { id: string } }) {
  const serviceId = params.id;
  // ...
}
```

### クエリパラメータ
```tsx
import { useSearchParams } from 'next/navigation';

function MyComponent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next'); // ?next=/user/services
}
```

## エラーハンドリング

### 404エラー
- 存在しないルートは自動的に404ページを表示

### 403エラー
- 権限がないルートへのアクセスはミドルウェアでリダイレクト

### 401エラー
- 未認証でのアクセスはログインページにリダイレクト

---

*最終更新日: 2025-10-11*
