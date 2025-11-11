# API エンドポイント一覧

## 認証 API

### POST /api/auth/login
ログイン処理

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**:
```json
{
  "user": {
    "userId": "user-001",
    "email": "user@example.com",
    "name": "田中 太郎",
    "role": "user",
    "membership": "free"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /api/auth/register
ユーザー登録

**リクエスト**:
```json
{
  "email": "newuser@example.com",
  "password": "Password123!",
  "name": "新規 太郎",
  "role": "user"
}
```

---

### POST /api/auth/logout
ログアウト処理

---

### GET /api/auth/me
現在のユーザー情報取得（認証必須）

---

### POST /api/auth/refresh
トークンリフレッシュ

---

## ユーザー API

### GET /api/users
ユーザー一覧取得（管理者のみ）

**クエリパラメータ**:
- `role`: ロールでフィルタ（user/instructor/admin）
- `membership`: メンバーシップでフィルタ（free/premium）

---

### GET /api/users/me
現在のユーザー情報取得（認証必須）

---

### PATCH /api/users/me
ユーザー情報更新（認証必須）

**リクエスト**:
```json
{
  "name": "田中 太郎",
  "phone": "090-1234-5678",
  "bio": "自己紹介文",
  "preferences": {
    "language": "ja",
    "notifications": {
      "email": true
    }
  }
}
```

---

### GET /api/users/[id]
ユーザー詳細取得（管理者のみ）

---

## サービス API

### GET /api/services
サービス一覧取得

**クエリパラメータ**:
- `category`: カテゴリでフィルタ（coaching/training/consultation/workshop/seminar/other）
- `instructorId`: インストラクターIDでフィルタ
- `status`: ステータスでフィルタ（active/inactive/draft）

---

### POST /api/services
サービス作成（インストラクター/管理者のみ）

**リクエスト**:
```json
{
  "title": "1on1 ビジネスコーチング",
  "description": "キャリアやビジネスの課題について...",
  "category": "coaching",
  "duration": 60,
  "price": 10000,
  "currency": "JPY",
  "maxParticipants": 1,
  "image": "https://example.com/image.jpg",
  "tags": ["ビジネス", "キャリア"],
  "requirements": ["事前アンケート"]
}
```

---

### GET /api/services/[id]
サービス詳細取得

---

### PATCH /api/services/[id]
サービス更新（自分のサービスまたは管理者のみ）

---

### DELETE /api/services/[id]
サービス削除（自分のサービスまたは管理者のみ）

---

## 予約 API

### GET /api/reservations
予約一覧取得（認証必須）

**クエリパラメータ**:
- `userId`: ユーザーIDでフィルタ
- `serviceId`: サービスIDでフィルタ
- `status`: ステータスでフィルタ（pending/confirmed/completed/cancelled）

---

### POST /api/reservations
予約作成（認証必須）

**リクエスト**:
```json
{
  "serviceId": "service-uuid",
  "startTime": "2025-10-15T10:00:00Z",
  "endTime": "2025-10-15T11:00:00Z",
  "participants": 1,
  "notes": "事前に資料を送付します"
}
```

**バリデーション**:
- 開始時刻は現在より未来である必要があります
- 終了時刻は開始時刻より後である必要があります
- 参加者数はサービスの最大参加者数以下である必要があります
- サービスがアクティブである必要があります

---

### GET /api/reservations/[id]
予約詳細取得（自分の予約、インストラクター、管理者のみ）

---

### PATCH /api/reservations/[id]
予約更新（自分の予約、インストラクター、管理者のみ）

**リクエスト**:
```json
{
  "status": "cancelled",
  "cancellationReason": "都合により"
}
```

---

### DELETE /api/reservations/[id]
予約削除（自分の予約または管理者のみ、開始前のみ）

---

## TODO API

### GET /api/todos
TODO一覧取得（認証必須）

**クエリパラメータ**:
- `status`: ステータスでフィルタ（pending/in_progress/completed/cancelled）
- `priority`: 優先度でフィルタ（low/medium/high/urgent）

---

### POST /api/todos
TODO作成（認証必須）

**リクエスト**:
```json
{
  "title": "コーチングセッション前の準備",
  "description": "次回のセッションで話したいテーマを整理する",
  "priority": "high",
  "dueDate": "2025-10-15T10:00:00Z",
  "tags": ["準備"],
  "relatedReservationId": "reservation-uuid"
}
```

---

### GET /api/todos/[id]
TODO詳細取得（自分のTODOのみ）

---

### PATCH /api/todos/[id]
TODO更新（自分のTODOのみ）

---

### DELETE /api/todos/[id]
TODO削除（自分のTODOのみ）

---

## 支払い API

### GET /api/payments
支払い履歴取得（認証必須）

**クエリパラメータ**:
- `status`: ステータスでフィルタ（pending/processing/completed/failed/refunded）

---

### POST /api/payments/charge
チャージ処理（認証必須、Stripe連携）

**リクエスト**:
```json
{
  "amount": 10000,
  "currency": "jpy",
  "reservationId": "reservation-uuid"
}
```

**レスポンス**:
```json
{
  "paymentId": "payment-uuid",
  "clientSecret": "pi_xxx_secret_yyy",
  "amount": 10000,
  "currency": "jpy",
  "message": "支払いを作成しました"
}
```

---

### POST /api/payments/webhook
Stripe Webhook ハンドラー

**処理するイベント**:
- `payment_intent.succeeded` - 支払い成功
- `payment_intent.payment_failed` - 支払い失敗
- `charge.refunded` - 返金
- `customer.created` - 顧客作成
- `customer.updated` - 顧客更新
- `customer.deleted` - 顧客削除

---

## インストラクター API

### GET /api/instructors
インストラクター一覧取得

**クエリパラメータ**:
- `status`: ステータスでフィルタ（active/inactive/pending）

---

### POST /api/instructors
インストラクタープロフィール作成（インストラクター/管理者のみ）

**リクエスト**:
```json
{
  "displayName": "山田 先生",
  "bio": "10年以上の指導経験を持つプロフェッショナルコーチです。",
  "specialties": ["ビジネスコーチング", "キャリア相談"],
  "profileImage": "https://example.com/profile.jpg",
  "hourlyRate": 10000
}
```

---

### GET /api/instructors/[id]
インストラクター詳細取得

---

### PATCH /api/instructors/[id]
インストラクター情報更新（自分のプロフィールまたは管理者のみ）

**リクエスト**:
```json
{
  "displayName": "山田 先生",
  "bio": "更新された自己紹介",
  "status": "active",
  "availability": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

---

### DELETE /api/instructors/[id]
インストラクタープロフィール削除（自分のプロフィールまたは管理者のみ）

---

## エラーレスポンス

すべてのエンドポイントで以下の形式でエラーを返します：

```json
{
  "error": "エラーメッセージ"
}
```

**HTTPステータスコード**:
- `400` - Bad Request（バリデーションエラー）
- `401` - Unauthorized（認証エラー）
- `403` - Forbidden（権限エラー）
- `404` - Not Found（リソースが見つからない）
- `500` - Internal Server Error（サーバーエラー）

---

*最終更新日: 2025-10-11*
