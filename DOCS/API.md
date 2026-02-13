# API仕様書

最終更新: 2025-02-08

## 1. 概要

- ベースURL: `/api`
- 認証: Supabase Auth JWT（Cookieベース）
- レスポンス形式: JSON
- エラー形式: `{ error: string }`

### 認証パターン

| パターン | 説明 | 使用箇所 |
|----------|------|----------|
| **Supabase JWT** | Cookie内のJWTでユーザー特定 | ユーザー/インストラクター/管理者API |
| **HMAC署名** | partner_id + timestamp + signature | 外部パートナーAPI |
| **なし** | 認証不要 | Stripe Webhook |

---

## 2. 認証・ユーザー管理

### 2.1 ロール確認
```
GET /api/auth/check-role?role={USER|INSTRUCTOR|ADMIN}
```
- **認証**: Supabase JWT
- **レスポンス**: `{ registered: boolean, user?: User }`

### 2.2 ロール更新
```
POST /api/auth/update-role
```
- **認証**: Supabase JWT
- **ボディ**: `{ role: "USER" | "INSTRUCTOR" | "ADMIN" }`
- **レスポンス**: `{ success: boolean }`

### 2.3 ユーザー同期
```
POST /api/users/sync
```
- **認証**: Supabase JWT
- **ボディ**: `{ role: string }`
- **説明**: Supabase Authユーザーを Prisma users テーブルに同期

### 2.4 プロフィール取得（自分）
```
GET /api/profile/me?role={USER|INSTRUCTOR}
```
- **認証**: Supabase JWT
- **レスポンス**: `{ user: User, clientProfile?: ClientProfile }`

### 2.5 プロフィール取得（指定ユーザー）
```
GET /api/profile/[userId]
```
- **認証**: Supabase JWT
- **パラメータ**: userId（Prisma User ID）
- **レスポンス**: `User`

### 2.6 プロフィール作成・更新
```
POST /api/profile
```
- **認証**: Supabase JWT
- **ボディ**:
```json
{
  "fullName": "string",
  "phoneNumber": "string?",
  "address": "string?",
  "dateOfBirth": "string?",
  "gender": "string?"
}
```

### 2.7 インストラクタープロフィール
```
GET /api/instructor/profile
POST /api/instructor/profile
```
- **認証**: Supabase JWT（INSTRUCTOR ロール）
- **POST ボディ**: `{ bio?: string, specialties?: string[], hourlyRate?: number }`

---

## 3. 本人確認

### 3.1 電話番号認証

```
POST /api/verification/phone/send
```
- **ボディ**: `{ phoneNumber: string }`
- **説明**: OTPコードをSMS送信

```
POST /api/verification/phone/verify
```
- **ボディ**: `{ phoneNumber: string, code: string }`

```
POST /api/verification/phone/complete
```
- **説明**: 電話認証完了 → ClientProfile更新（verificationLevel: 1）

### 3.2 身分証確認

```
GET /api/verification/identity/status?role={USER|INSTRUCTOR}
```
- **レスポンス**: `{ request?: IdentityVerificationRequest }`

```
POST /api/verification/identity/submit
```
- **ボディ**:
```json
{
  "documentType": "DRIVERS_LICENSE | MY_NUMBER | PASSPORT",
  "documentFrontUrl": "string",
  "documentBackUrl": "string?"
}
```

### 3.3 身分証審査（管理者）

```
GET /api/admin/verification/requests?status={PENDING|APPROVED|REJECTED}
```
- **認証**: ADMIN
- **レスポンス**: `IdentityVerificationRequest[]`

```
GET /api/admin/verification/requests/[id]
```
- **認証**: ADMIN

```
POST /api/admin/verification/requests/[id]/approve
```
- **認証**: ADMIN
- **説明**: 承認 → verificationLevel: 2 に更新、通知送信

```
POST /api/admin/verification/requests/[id]/reject
```
- **認証**: ADMIN
- **ボディ**: `{ reason: string }`

---

## 4. サービス管理

### 4.1 サービス一覧
```
GET /api/services?instructorId={id}&category={string}&isActive={boolean}
```
- **認証**: 不要（公開）
- **レスポンス**: `Service[]`（schedules, images含む）

### 4.2 サービス詳細
```
GET /api/services/[id]
```
- **認証**: 不要（公開）
- **レスポンス**: `Service`（instructor, schedules, campaigns, images含む）

### 4.3 サービス画像アップロード
```
POST /api/services/[id]/images
```
- **認証**: INSTRUCTOR（所有者のみ）
- **ボディ**: FormData（最大5枚）
- **レスポンス**: `ServiceImage[]`

### 4.4 サービスクローン
```
POST /api/services/[id]/clone
```
- **認証**: INSTRUCTOR（所有者のみ）
- **ボディ**: `{ title?: string, price?: number, ... }`
- **レスポンス**: `Service`

---

## 5. スケジュール管理

### 5.1 スケジュール一覧
```
GET /api/schedules?serviceId={id}&instructorId={id}&from={date}&to={date}
```
- **認証**: Supabase JWT
- **デフォルト**: from=今日, to=+30日

```
POST /api/schedules
```
- **認証**: INSTRUCTOR
- **ボディ**:
```json
{
  "serviceId": "string",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM"
}
```

### 5.2 サービス別スケジュール
```
GET /api/schedules/service/[serviceId]?from={date}&to={date}
```
- **認証**: 不要
- **デフォルト**: from=今日, to=+14日

---

## 6. 予約管理

### 6.1 予約一覧・作成
```
GET /api/reservations?status={PENDING|CONFIRMED|CANCELLED|COMPLETED}
```
- **認証**: Supabase JWT
- **レスポンス**: 自分の予約一覧

```
POST /api/reservations
```
- **認証**: Supabase JWT
- **ボディ**:
```json
{
  "serviceId": "string",
  "scheduledAt": "ISO8601",
  "participants": 1,
  "paymentMethod": "POINTS | CREDIT",
  "paymentMethodId": "string?",
  "notes": "string?"
}
```
- **処理**: ポイント決済 or Stripe決済 → Google Meet生成（remote時）→ 通知

---

## 7. ウォレット・決済

### 7.1 残高取得
```
GET /api/wallet/me?role={USER|INSTRUCTOR}
```
- **認証**: Supabase JWT
- **レスポンス**: `{ wallet: { balance: number } }`

### 7.2 ポイント使用
```
POST /api/wallet/[userId]/use
```
- **ボディ**: `{ amount: number }`

### 7.3 取引履歴
```
GET /api/wallet/[userId]/transactions
```
- **レスポンス**: `PointTransaction[]`（直近50件）

### 7.4 クレジットチャージ
```
POST /api/wallet/charge
```
- **ボディ**: `{ amount: number, paymentMethodId: string }`
- **説明**: Stripe PaymentIntentを作成 → ポイント追加

### 7.5 銀行振込チャージ

```
POST /api/wallet/charge/bank-transfer
```
- **ボディ**: `{ amount: number }`
- **レスポンス**: `{ transaction: PointTransaction }`（振込番号含む）

```
PATCH /api/wallet/charge/bank-transfer/[transactionId]
```
- **説明**: 振込完了報告 → ステータスをTRANSFERREDに

### 7.6 チャージ承認（管理者）

```
GET /api/admin/pending-charges
```
- **認証**: ADMIN
- **レスポンス**: PENDING/TRANSFERRED状態の取引一覧

```
POST /api/admin/pending-charges/[id]/approve
```
- **認証**: ADMIN
- **説明**: 承認 → ポイント残高に反映

```
POST /api/admin/pending-charges/[id]/reject
```
- **認証**: ADMIN
- **ボディ**: `{ reason: string }`

---

## 8. カード管理

```
GET /api/payment-methods
```
- **認証**: Supabase JWT
- **レスポンス**: `PaymentMethod[]`

```
DELETE /api/payment-methods/[id]
```
- **認証**: Supabase JWT（所有者のみ）

```
PUT /api/payment-methods/[id]/default
```
- **認証**: Supabase JWT
- **説明**: デフォルトカードに設定

```
POST /api/stripe/webhook
```
- **認証**: Stripe署名検証
- **説明**: payment_intent, payment_method, customerイベント処理

---

## 9. 銀行口座・出金

### 9.1 銀行口座
```
GET /api/bank-accounts
```
- **認証**: Supabase JWT
- **レスポンス**: `BankAccount[]`（口座番号は復号化済み）

```
PUT /api/bank-accounts/[id]
```
- **認証**: Supabase JWT
- **説明**: 口座情報更新（口座番号はAES-256暗号化保存）

```
DELETE /api/bank-accounts/[id]
```
- **認証**: Supabase JWT

### 9.2 出金

```
GET /api/withdrawals
```
- **認証**: INSTRUCTOR
- **レスポンス**: 自分の出金申請一覧

```
GET /api/admin/withdrawals?status={PENDING|APPROVED|REJECTED|COMPLETED}
```
- **認証**: ADMIN

```
PATCH /api/admin/withdrawals/[id]
```
- **認証**: ADMIN
- **ボディ**: `{ action: "approve" | "reject", reason?: string }`

---

## 10. 通知・お知らせ

### 10.1 通知
```
GET /api/notifications?unreadOnly={boolean}
```
- **認証**: Supabase JWT
- **レスポンス**: `Notification[]`

```
PATCH /api/notifications/[id]
```
- **説明**: 既読にする

```
POST /api/notifications/read-all
```
- **説明**: 全件既読

### 10.2 お知らせ
```
GET /api/announcements?target={all|users|instructors}
```
- **レスポンス**: `AdminAnnouncement[]`

```
GET /api/announcements/[id]
```

```
POST /api/announcements/[id]/publish
```
- **認証**: ADMIN

---

## 11. キャンペーン

```
GET /api/campaigns?instructorId={id}&serviceId={id}&isActive={boolean}
```
- **レスポンス**: `Campaign[]`

```
GET /api/campaigns/[id]
PUT /api/campaigns/[id]
```
- **PUT 認証**: INSTRUCTOR（所有者のみ）

---

## 12. お気に入り

```
GET /api/favorites
```
- **認証**: Supabase JWT
- **レスポンス**: `FavoriteCreator[]`

```
DELETE /api/favorites/[id]
```
- **認証**: Supabase JWT

---

## 13. Google連携

```
GET /api/google/auth
```
- **認証**: INSTRUCTOR
- **レスポンス**: `{ url: string }`（OAuth認可URL）

```
GET /api/google/callback?code={string}
```
- **説明**: OAuthコールバック → トークン保存

```
GET /api/google/status
DELETE /api/google/status
```
- **認証**: INSTRUCTOR
- **説明**: Google連携状態確認 / 連携解除

---

## 14. 管理者機能

### 14.1 ユーザー管理
```
GET /api/manage/users?role={string}&search={string}&page={number}
```
- **認証**: ADMIN

```
POST /api/admin/users/set-role
```
- **認証**: ADMIN
- **ボディ**: `{ userId: string, role: string }`

### 14.2 身分証一覧
```
GET /api/manage/identity-requests?role={USER|INSTRUCTOR}
```
- **認証**: ADMIN

---

## 15. 外部パートナーAPI

### 15.1 認証方式

HMAC-SHA256署名による認証。クエリパラメータで送信。

| パラメータ | 説明 |
|-----------|------|
| `partner_id` | パートナーID |
| `ts` | UNIXタイムスタンプ（秒） |
| `sig` | HMAC-SHA256(`{partner_id}:{ts}`, secretKey) |

- タイムスタンプ有効期限: **5分**
- 比較: timing-safe comparison

### 15.2 パートナー認証確認
```
GET /api/external/partner/verify?partner_id={id}&ts={ts}&sig={sig}
```
- **レスポンス**:
```json
{
  "partner": {
    "id": "string",
    "name": "string",
    "allowGuest": true,
    "requirePhone": false,
    "paymentMode": "COORDY",
    "instructorIds": [],
    "serviceIds": []
  }
}
```

### 15.3 サービス一覧（パートナー用）
```
GET /api/external/services?partner_id={id}&ts={ts}&sig={sig}&instructor_id={id?}
```
- **説明**: パートナーの許可範囲内のサービスを返却
- **レスポンス**: `Service[]`（instructor, images含む）

### 15.4 空き状況確認
```
GET /api/external/availability?partner_id={id}&ts={ts}&sig={sig}&service_id={id}&from={date}&to={date}
```
- **レスポンス**:
```json
{
  "schedules": [
    {
      "id": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "availableSlots": 3,
      "maxParticipants": 5
    }
  ]
}
```
- `availableSlots` = maxParticipants - 既存予約のparticipants合計

### 15.5 予約作成
```
POST /api/external/reservations
```
- **認証**: HMAC署名（ボディ内）
- **ボディ**:
```json
{
  "partner_id": "string",
  "ts": "number",
  "sig": "string",
  "service_id": "string",
  "schedule_id": "string",
  "participants": 1,
  "guest": {
    "name": "string",
    "email": "string",
    "phoneNumber": "string?"
  },
  "external_ref": "string?",
  "payment_completed": false
}
```
- **処理**: ゲストユーザー作成 → 予約作成 → ExternalReservation作成 → Webhook通知
- **レスポンス**:
```json
{
  "reservation": {
    "id": "string",
    "status": "CONFIRMED",
    "scheduledAt": "ISO8601",
    "participants": 1,
    "service": { "title": "string", "price": 1000 },
    "guestUser": { "name": "string", "email": "string" }
  },
  "externalReservation": {
    "id": "string",
    "externalRef": "string",
    "commissionAmount": 0
  }
}
```

---

## 16. パートナー管理API（管理者）

```
GET /api/admin/partners
```
- **認証**: ADMIN
- **レスポンス**: `Partner[]`（予約数含む）

```
POST /api/admin/partners
```
- **認証**: ADMIN
- **ボディ**: `{ name, code, description?, websiteUrl?, webhookUrl?, paymentMode?, allowGuest?, commissionRate? }`
- **レスポンス**: `{ partner: Partner, credentials: { apiKey, secretKey, webhookSecret? } }`

```
GET /api/admin/partners/[id]
PUT /api/admin/partners/[id]
DELETE /api/admin/partners/[id]
```
- **認証**: ADMIN

```
POST /api/admin/partners/[id]/regenerate-keys
```
- **認証**: ADMIN
- **ボディ**: `{ includeWebhookSecret?: boolean }`
- **レスポンス**: `{ credentials: { apiKey, secretKey, webhookSecret? } }`

---

## 17. Webhook通知

パートナーのwebhookUrlに対してHTTP POSTで通知。

### ヘッダー
```
Content-Type: application/json
X-Webhook-Signature: HMAC-SHA256(body, webhookSecret)
X-Webhook-Timestamp: UNIXタイムスタンプ
```

### イベント

| イベント | 説明 |
|---------|------|
| `reservation.created` | 予約作成時 |
| `reservation.cancelled` | 予約キャンセル時 |
| `reservation.completed` | 予約完了時 |

### ペイロード
```json
{
  "event": "reservation.created",
  "timestamp": "ISO8601",
  "data": {
    "reservationId": "string",
    "externalRef": "string",
    "serviceTitle": "string",
    "scheduledAt": "ISO8601",
    "participants": 1,
    "guestName": "string",
    "guestEmail": "string",
    "status": "CONFIRMED",
    "totalAmount": 1000,
    "commissionAmount": 0
  }
}
```

- タイムアウト: 10秒
- リトライ: なし（将来対応予定）
