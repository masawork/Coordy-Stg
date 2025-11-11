# Mock データベース構造

## 概要

このドキュメントでは、フロントエンド開発用のMockデータベース構造を定義します。
将来的にはAWS Amplify Gen2 + DynamoDBに移行する予定ですが、現在はフロントエンドのUI/UX開発のためにMockデータを使用します。

## データ保存方法

### 選択肢

1. **useState/Zustand（現在）**
   - クライアントサイドの一時的なステート管理
   - ページリロードでデータ消失
   - 開発初期段階に適している

2. **localStorage**
   - ブラウザローカルストレージ
   - ページリロード後もデータ永続化
   - 簡易的な永続化に適している

3. **json-server（推奨）**
   - REST APIをシミュレート
   - JSONファイルでデータ永続化
   - 本番APIとの互換性が高い

4. **Docker + PostgreSQL/MySQL**
   - 本番環境に近い開発環境
   - 完全なリレーショナルDB機能
   - セットアップが複雑

## Mockデータスキーマ

### 1. Users（ユーザー）

```typescript
interface User {
  userId: string;              // ユーザーID（プライマリキー）
  email: string;               // メールアドレス（一意）
  name: string;                // 氏名
  role: 'user' | 'instructor' | 'admin';  // ロール
  membership: 'free' | 'premium';         // メンバーシップ
  phone?: string;              // 電話番号（任意）
  bio?: string;                // 自己紹介（任意）
  profileImage?: string;       // プロフィール画像URL（任意）
  points?: number;             // ポイント残高（デフォルト: 0）
  level?: string;              // レベル（例: ブロンズ、シルバー、ゴールド）
  stripeCustomerId?: string;   // Stripe顧客ID（任意）
  preferences?: {              // ユーザー設定
    language?: string;         // 言語設定
    notifications?: {
      email?: boolean;         // メール通知
      push?: boolean;          // プッシュ通知
    };
  };
  createdAt: string;           // 作成日時（ISO 8601形式）
  updatedAt: string;           // 更新日時（ISO 8601形式）
}
```

**Mockデータ例**:
```json
{
  "userId": "user-001",
  "email": "user01@example.com",
  "name": "田中 太郎",
  "role": "user",
  "membership": "free",
  "points": 1200,
  "level": "シルバー",
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2025-10-11T00:00:00.000Z"
}
```

---

### 2. Instructors（インストラクター）

```typescript
interface Instructor {
  instructorId: string;        // インストラクターID（プライマリキー）
  userId: string;              // ユーザーID（外部キー）
  displayName: string;         // 表示名
  bio: string;                 // 自己紹介
  specialties: string[];       // 専門分野
  profileImage?: string;       // プロフィール画像URL
  hourlyRate?: number;         // 時給（円）
  rating?: number;             // 評価（0-5）
  totalReviews?: number;       // レビュー総数
  status: 'pending' | 'approved' | 'disabled';  // ステータス
  availability?: Array<{       // 稼働可能時間
    dayOfWeek: number;         // 曜日（0=日曜, 6=土曜）
    startTime: string;         // 開始時刻（HH:mm形式）
    endTime: string;           // 終了時刻（HH:mm形式）
  }>;
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
  approvedAt?: string;         // 承認日時（任意）
  approvedBy?: string;         // 承認者のユーザーID（任意）
}
```

**Mockデータ例**:
```json
{
  "instructorId": "inst-001",
  "userId": "user-002",
  "displayName": "山田 太郎",
  "bio": "10年以上の指導経験を持つプロフェッショナルコーチです。",
  "specialties": ["ビジネスコーチング", "キャリア相談"],
  "hourlyRate": 10000,
  "rating": 4.8,
  "totalReviews": 120,
  "status": "approved",
  "availability": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" },
    { "dayOfWeek": 3, "startTime": "09:00", "endTime": "17:00" }
  ],
  "createdAt": "2025-01-10T00:00:00.000Z",
  "updatedAt": "2025-10-11T00:00:00.000Z",
  "approvedAt": "2025-01-11T00:00:00.000Z",
  "approvedBy": "admin-001"
}
```

---

### 3. Services（サービス）

```typescript
interface Service {
  serviceId: string;           // サービスID（プライマリキー）
  instructorId: string;        // インストラクターID（外部キー）
  title: string;               // サービス名
  description: string;         // 説明
  category: 'coaching' | 'training' | 'consultation' | 'workshop' | 'seminar' | 'other';
  duration: number;            // 所要時間（分）
  price: number;               // 価格（円）
  currency: string;            // 通貨（デフォルト: JPY）
  maxParticipants: number;     // 最大参加人数
  image?: string;              // サービス画像URL
  tags?: string[];             // タグ
  requirements?: string[];     // 事前準備・必要事項
  status: 'active' | 'disabled' | 'draft';  // ステータス
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
}
```

**Mockデータ例**:
```json
{
  "serviceId": "service-001",
  "instructorId": "inst-001",
  "title": "1on1 ビジネスコーチング",
  "description": "キャリアやビジネスの課題について個別にサポートします",
  "category": "coaching",
  "duration": 60,
  "price": 10000,
  "currency": "JPY",
  "maxParticipants": 1,
  "tags": ["ビジネス", "キャリア"],
  "requirements": ["事前アンケート"],
  "status": "active",
  "createdAt": "2025-02-01T00:00:00.000Z",
  "updatedAt": "2025-10-11T00:00:00.000Z"
}
```

---

### 4. Reservations（予約）

```typescript
interface Reservation {
  reservationId: string;       // 予約ID（プライマリキー）
  userId: string;              // ユーザーID（外部キー）
  serviceId: string;           // サービスID（外部キー）
  instructorId: string;        // インストラクターID（外部キー）
  startTime: string;           // 開始日時（ISO 8601形式）
  endTime: string;             // 終了日時（ISO 8601形式）
  participants: number;        // 参加人数
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';  // ステータス
  notes?: string;              // 備考
  cancellationReason?: string; // キャンセル理由
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
  cancelledAt?: string;        // キャンセル日時
}
```

**Mockデータ例**:
```json
{
  "reservationId": "res-001",
  "userId": "user-001",
  "serviceId": "service-001",
  "instructorId": "inst-001",
  "startTime": "2025-10-15T10:00:00.000Z",
  "endTime": "2025-10-15T11:00:00.000Z",
  "participants": 1,
  "status": "confirmed",
  "notes": "事前に資料を送付します",
  "createdAt": "2025-10-11T00:00:00.000Z",
  "updatedAt": "2025-10-11T00:00:00.000Z"
}
```

---

### 5. Todos（TODO）

```typescript
interface Todo {
  todoId: string;              // TODO ID（プライマリキー）
  userId: string;              // ユーザーID（外部キー）
  title: string;               // タイトル
  description?: string;        // 説明
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';  // ステータス
  priority: 'low' | 'medium' | 'high' | 'urgent';  // 優先度
  dueDate?: string;            // 期限日時（ISO 8601形式）
  tags?: string[];             // タグ
  relatedReservationId?: string;  // 関連する予約ID（任意）
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
  completedAt?: string;        // 完了日時
}
```

**Mockデータ例**:
```json
{
  "todoId": "todo-001",
  "userId": "user-001",
  "title": "コーチングセッション前の準備",
  "description": "次回のセッションで話したいテーマを整理する",
  "status": "pending",
  "priority": "high",
  "dueDate": "2025-10-15T09:00:00.000Z",
  "tags": ["準備"],
  "relatedReservationId": "res-001",
  "createdAt": "2025-10-11T00:00:00.000Z",
  "updatedAt": "2025-10-11T00:00:00.000Z"
}
```

---

### 6. Payments（支払い）

```typescript
interface Payment {
  paymentId: string;           // 支払いID（プライマリキー）
  userId: string;              // ユーザーID（外部キー）
  reservationId?: string;      // 予約ID（外部キー、任意）
  amount: number;              // 金額
  currency: string;            // 通貨（デフォルト: JPY）
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';  // ステータス
  paymentMethod?: string;      // 支払い方法
  stripePaymentIntentId?: string;  // Stripe PaymentIntent ID
  stripeChargeId?: string;     // Stripe Charge ID
  failureReason?: string;      // 失敗理由
  refundAmount?: number;       // 返金額
  refundedAt?: string;         // 返金日時
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
}
```

**Mockデータ例**:
```json
{
  "paymentId": "pay-001",
  "userId": "user-001",
  "reservationId": "res-001",
  "amount": 10000,
  "currency": "JPY",
  "status": "completed",
  "paymentMethod": "card",
  "stripePaymentIntentId": "pi_xxxxxxxxxxxxx",
  "stripeChargeId": "ch_xxxxxxxxxxxxx",
  "createdAt": "2025-10-11T00:00:00.000Z",
  "updatedAt": "2025-10-11T00:00:00.000Z"
}
```

---

## Mock実装方法

### 方法1: useState（現在の実装）

```typescript
// app/instructor/services/page.tsx
const [services, setServices] = useState<Service[]>([]);

useEffect(() => {
  // Mock data
  const mockServices: Service[] = [
    {
      id: '1',
      title: '1on1 ビジネスコーチング',
      // ... other fields
    },
  ];
  setServices(mockServices);
}, []);
```

### 方法2: Mock API（推奨）

**ファイル構造**:
```
mock/
├── users.json
├── instructors.json
├── services.json
├── reservations.json
├── todos.json
└── payments.json
```

**API層（例）**:
```typescript
// lib/mockApi.ts
export async function getServices(): Promise<Service[]> {
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return mock data
  return mockServices;
}

export async function createService(data: CreateServiceInput): Promise<Service> {
  // Mock creation
  const newService = {
    serviceId: `service-${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to mock data
  mockServices.push(newService);

  return newService;
}
```

### 方法3: json-server

**セットアップ**:
```bash
npm install -D json-server
```

**db.json**:
```json
{
  "users": [...],
  "instructors": [...],
  "services": [...],
  "reservations": [...],
  "todos": [...],
  "payments": [...]
}
```

**package.json**:
```json
{
  "scripts": {
    "mock-api": "json-server --watch mock/db.json --port 3001"
  }
}
```

**使用**:
```typescript
const response = await fetch('http://localhost:3001/services');
const services = await response.json();
```

## Amplify移行時の対応

Mock構造は実際のDynamoDBテーブル構造と一致させているため、移行時は以下の変更のみで対応可能：

1. **APIクライアントの置き換え**:
   ```typescript
   // Before (Mock)
   import { getServices } from '@/lib/mockApi';

   // After (Amplify)
   import { getServices } from '@/lib/api';
   ```

2. **型定義の維持**:
   - 同じTypeScriptインターフェースを使用
   - データ構造の互換性を保証

3. **環境変数での切り替え**:
   ```typescript
   const API_BASE = process.env.NEXT_PUBLIC_USE_MOCK_API
     ? 'http://localhost:3001'
     : process.env.NEXT_PUBLIC_API_URL;
   ```

---

*最終更新日: 2025-10-11*
