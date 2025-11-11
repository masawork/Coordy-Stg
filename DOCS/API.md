# API仕様書

## 概要

Coordy（コーディ）プラットフォームのREST API仕様書です。
本APIはNext.js App RouterのRoute Handlersで実装され、AWS Amplify Gen2を通じてAWSサービスと連携します。

---

## 基本情報

| 項目 | 詳細 |
|------|------|
| **ベースURL** | `https://api.coordy.app` |
| **プロトコル** | HTTPS only (TLS 1.2+) |
| **認証方式** | JWT Bearer Token (Cognito) |
| **レスポンス形式** | JSON |
| **文字エンコーディング** | UTF-8 |
| **タイムゾーン** | UTC |

---

## 認証

### ヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### エラーレスポンス

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## エンドポイント一覧

### 認証 (Auth)

#### POST /api/auth/login
ユーザーログイン

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "name": "山田太郎",
    "email": "user@example.com",
    "role": "user",
    "point": 5000,
    "membership": "gold"
  }
}
```

#### POST /api/auth/register
ユーザー登録

**リクエスト:**
```json
{
  "name": "山田太郎",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

**レスポンス (201):**
```json
{
  "user": {
    "id": "user-123",
    "name": "山田太郎",
    "email": "user@example.com",
    "role": "user",
    "point": 0,
    "membership": "free"
  }
}
```

#### POST /api/auth/logout
ログアウト

**レスポンス (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### ユーザー (Users)

#### GET /api/users/me
現在のユーザー情報取得

**レスポンス (200):**
```json
{
  "id": "user-123",
  "name": "山田太郎",
  "email": "user@example.com",
  "role": "user",
  "point": 5000,
  "membership": "gold",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

#### PATCH /api/users/me
ユーザー情報更新

**リクエスト:**
```json
{
  "name": "山田次郎"
}
```

**レスポンス (200):**
```json
{
  "id": "user-123",
  "name": "山田次郎",
  "email": "user@example.com"
}
```

---

### サービス (Services)

#### GET /api/services
サービス一覧取得

**クエリパラメータ:**
- `category` (optional): カテゴリフィルタ
- `date` (optional): 日付フィルタ (YYYY-MM-DD)
- `timeSlot` (optional): 時間帯フィルタ (morning|afternoon|evening)
- `page` (optional): ページ番号 (default: 1)
- `limit` (optional): 取得件数 (default: 20)

**レスポンス (200):**
```json
{
  "services": [
    {
      "id": "service-001",
      "title": "ヨガ初級クラス",
      "category": "フィットネス",
      "description": "初心者向けヨガクラス",
      "duration": 60,
      "basePrice": 3000,
      "instructorSlots": [
        {
          "instructorId": "inst-001",
          "instructorName": "田中先生",
          "price": 3000,
          "schedule": [
            {
              "date": "2025-10-15",
              "timeSlot": "morning",
              "capacity": 10
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

#### GET /api/services/:id
サービス詳細取得

**レスポンス (200):**
```json
{
  "id": "service-001",
  "title": "ヨガ初級クラス",
  "category": "フィットネス",
  "description": "初心者向けヨガクラス",
  "duration": 60,
  "basePrice": 3000,
  "instructorSlots": [
    {
      "instructorId": "inst-001",
      "instructorName": "田中先生",
      "price": 3000,
      "schedule": [
        {
          "date": "2025-10-15",
          "timeSlot": "morning",
          "capacity": 10
        }
      ]
    }
  ]
}
```

#### POST /api/services (インストラクター/管理者)
サービス作成

**リクエスト:**
```json
{
  "title": "ヨガ初級クラス",
  "category": "フィットネス",
  "description": "初心者向けヨガクラス",
  "duration": 60,
  "basePrice": 3000
}
```

**レスポンス (201):**
```json
{
  "id": "service-001",
  "title": "ヨガ初級クラス",
  "category": "フィットネス",
  "description": "初心者向けヨガクラス",
  "duration": 60,
  "basePrice": 3000
}
```

---

### 予約 (Reservations)

#### GET /api/reservations
予約一覧取得

**クエリパラメータ:**
- `status` (optional): ステータスフィルタ (reserved|completed|cancelled)
- `from` (optional): 開始日 (YYYY-MM-DD)
- `to` (optional): 終了日 (YYYY-MM-DD)

**レスポンス (200):**
```json
{
  "reservations": [
    {
      "id": "res-001",
      "userId": "user-123",
      "serviceId": "service-001",
      "instructorId": "inst-001",
      "date": "2025-10-15",
      "timeSlot": "morning",
      "status": "reserved",
      "createdAt": "2025-10-10T10:00:00Z"
    }
  ]
}
```

#### POST /api/reservations
予約作成

**リクエスト:**
```json
{
  "serviceId": "service-001",
  "instructorId": "inst-001",
  "date": "2025-10-15",
  "timeSlot": "morning"
}
```

**レスポンス (201):**
```json
{
  "id": "res-001",
  "userId": "user-123",
  "serviceId": "service-001",
  "instructorId": "inst-001",
  "date": "2025-10-15",
  "timeSlot": "morning",
  "status": "reserved",
  "createdAt": "2025-10-10T10:00:00Z"
}
```

#### PATCH /api/reservations/:id
予約キャンセル

**リクエスト:**
```json
{
  "status": "cancelled"
}
```

**レスポンス (200):**
```json
{
  "id": "res-001",
  "status": "cancelled",
  "updatedAt": "2025-10-11T10:00:00Z"
}
```

---

### ToDo (Todos)

#### GET /api/todos
ToDo一覧取得

**クエリパラメータ:**
- `date` (optional): 日付フィルタ (YYYY-MM-DD)
- `priority` (optional): 優先度フィルタ (high|medium|low)
- `isCompleted` (optional): 完了フィルタ (true|false)

**レスポンス (200):**
```json
{
  "todos": [
    {
      "id": "todo-001",
      "userId": "user-123",
      "title": "レポート作成",
      "date": "2025-10-15",
      "priority": "high",
      "category": "仕事",
      "isCompleted": false,
      "createdAt": "2025-10-10T10:00:00Z"
    }
  ]
}
```

#### POST /api/todos
ToDo作成

**リクエスト:**
```json
{
  "title": "レポート作成",
  "date": "2025-10-15",
  "priority": "high",
  "category": "仕事"
}
```

**レスポンス (201):**
```json
{
  "id": "todo-001",
  "userId": "user-123",
  "title": "レポート作成",
  "date": "2025-10-15",
  "priority": "high",
  "category": "仕事",
  "isCompleted": false
}
```

#### PATCH /api/todos/:id
ToDo更新

**リクエスト:**
```json
{
  "isCompleted": true
}
```

**レスポンス (200):**
```json
{
  "id": "todo-001",
  "isCompleted": true,
  "updatedAt": "2025-10-11T10:00:00Z"
}
```

#### DELETE /api/todos/:id
ToDo削除

**レスポンス (204):**
(No Content)

---

### 支払い (Payments)

#### GET /api/payments
支払い履歴取得

**クエリパラメータ:**
- `type` (optional): 種別フィルタ (deposit|usage)
- `from` (optional): 開始日 (YYYY-MM-DD)
- `to` (optional): 終了日 (YYYY-MM-DD)

**レスポンス (200):**
```json
{
  "payments": [
    {
      "id": "pay-001",
      "userId": "user-123",
      "amount": 10000,
      "method": "stripe",
      "type": "deposit",
      "createdAt": "2025-10-10T10:00:00Z"
    }
  ],
  "balance": 5000
}
```

#### POST /api/payments/charge
チャージ（Stripe連携）

**リクエスト:**
```json
{
  "amount": 10000
}
```

**レスポンス (200):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..."
}
```

#### POST /api/payments/webhook
Stripe Webhookエンドポイント

**ヘッダー:**
```http
Stripe-Signature: t=1234567890,v1=abc...
```

**レスポンス (200):**
```json
{
  "received": true
}
```

---

### インストラクター (Instructors)

#### GET /api/instructors
インストラクター一覧取得

**レスポンス (200):**
```json
{
  "instructors": [
    {
      "id": "inst-001",
      "name": "田中先生",
      "bio": "ヨガインストラクター歴10年",
      "specialties": ["ヨガ", "ピラティス"],
      "image": "https://s3.amazonaws.com/...",
      "services": ["service-001", "service-002"]
    }
  ]
}
```

#### GET /api/instructors/:id
インストラクター詳細取得

**レスポンス (200):**
```json
{
  "id": "inst-001",
  "name": "田中先生",
  "bio": "ヨガインストラクター歴10年",
  "specialties": ["ヨガ", "ピラティス"],
  "image": "https://s3.amazonaws.com/...",
  "services": ["service-001", "service-002"]
}
```

---

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `UNAUTHORIZED` | 401 | 認証エラー |
| `FORBIDDEN` | 403 | 権限不足 |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `CONFLICT` | 409 | 競合エラー（例：すでに予約済み） |
| `INSUFFICIENT_BALANCE` | 400 | 残高不足 |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |

### エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

---

## レート制限

| ユーザータイプ | 制限 |
|--------------|------|
| 未認証 | 10リクエスト/分 |
| 一般ユーザー | 100リクエスト/分 |
| インストラクター | 200リクエスト/分 |
| 管理者 | 制限なし |

### レート制限ヘッダー

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## ページネーション

### リクエスト

```
GET /api/services?page=2&limit=20
```

### レスポンス

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## バージョニング

APIバージョンはURLパスで管理します。

```
/api/v1/services  (現在)
/api/v2/services  (将来)
```

---

## Webhook

### イベントタイプ

| イベント | 説明 |
|---------|------|
| `payment.succeeded` | 支払い成功 |
| `payment.failed` | 支払い失敗 |
| `reservation.created` | 予約作成 |
| `reservation.cancelled` | 予約キャンセル |

### Webhook設定

```json
{
  "url": "https://your-app.com/api/webhooks",
  "events": ["payment.succeeded", "reservation.created"],
  "secret": "whsec_..."
}
```

---

*最終更新日: 2025-10-11*
