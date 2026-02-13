# データベース定義書

最終更新: 2025-02-08

## 1. ER図

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    User      │────▶│  Instructor  │────▶│   Service    │
│  (users)     │     │ (instructors)│     │  (services)  │
├─────────────┤     ├──────────────┤     ├─────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ authId       │     │ userId (FK)  │     │ instructorId │
│ email        │     │ bio          │     │ title        │
│ name         │     │ specialties  │     │ price        │
│ role         │     │ hourlyRate   │     │ duration     │
│ image        │     │ isVerified   │     │ maxParticip. │
└──────┬───────┘     │ googleTokens │     │ recurrence   │
       │             └──────────────┘     └──────┬───────┘
       │                                         │
       │  ┌──────────────────────────────────────┘
       │  │
       ▼  ▼
┌──────────────────┐     ┌──────────────────┐
│   Reservation    │     │ ServiceSchedule  │
│  (reservations)  │     │(service_schedules)│
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ userId? (FK)     │     │ serviceId (FK)   │
│ guestUserId?(FK) │     │ date             │
│ serviceId (FK)   │     │ startTime        │
│ instructorId(FK) │     │ endTime          │
│ scheduledAt      │     │ isCancelled      │
│ status           │     └──────────────────┘
│ participants     │
│ meetUrl          │     ┌──────────────────┐
└──────┬───────────┘     │  ServiceImage    │
       │                 │ (service_images) │
       │                 ├──────────────────┤
       ▼                 │ id (PK)          │
┌──────────────────┐     │ serviceId (FK)   │
│ExternalReservation│     │ url              │
│(external_reserv.) │     │ sortOrder        │
├──────────────────┤     └──────────────────┘
│ id (PK)          │
│ partnerId (FK)   │
│ reservationId(FK)│     ┌──────────────────┐
│ externalRef      │     │   GuestUser      │
│ paymentMode      │     │  (guest_users)   │
│ commissionRate   │     ├──────────────────┤
│ commissionAmount │     │ id (PK)          │
└──────┬───────────┘     │ email            │
       │                 │ name             │
       ▼                 │ phoneNumber      │
┌──────────────────┐     └──────────────────┘
│    Partner       │
│   (partners)     │
├──────────────────┤     ┌──────────────────┐
│ id (PK)          │     │  ClientProfile   │
│ name             │     │(client_profiles) │
│ code (UNIQUE)    │     ├──────────────────┤
│ apiKey (UNIQUE)  │     │ id (PK)          │
│ secretKey        │     │ userId (FK,UNQ)  │
│ webhookUrl       │     │ fullName         │
│ paymentMode      │     │ phoneNumber      │
│ allowGuest       │     │ verificationLvl  │
│ commissionRate   │     │ phoneVerified    │
│ isActive         │     │ identityVerified │
└──────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     Wallet       │     │PointTransaction  │     │  PaymentMethod   │
│   (wallets)      │     │(point_transact.) │     │(payment_methods) │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ userId (FK,UNQ)  │     │ userId (FK)      │     │ userId (FK)      │
│ balance          │     │ type             │     │ stripeCustomerId │
└──────────────────┘     │ amount           │     │ cardBrand        │
                         │ method           │     │ cardLast4        │
                         │ status           │     │ isDefault        │
                         └──────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   BankAccount    │     │WithdrawalRequest │     │    Campaign      │
│ (bank_accounts)  │     │(withdrawal_req.) │     │  (campaigns)     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ userId (FK)      │     │ instructorId(FK) │     │ serviceId? (FK)  │
│ bankName         │     │ amount           │     │ instructorId(FK) │
│ accountNumber    │     │ fee              │     │ type             │
│ isVerified       │     │ bankAccountId(FK)│     │ discountPercent  │
│ isDefault        │     │ status           │     │ validFrom/Until  │
└──────────────────┘     └──────────────────┘     │ isActive         │
                                                  └──────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Notification    │     │AdminAnnouncement │     │ IdentityVerif.   │
│ (notifications)  │     │(admin_announce.) │     │    Request       │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ userId? (FK)     │     │ authorId (FK)    │     │ userId (FK)      │
│ type             │     │ target           │     │ documentType     │
│ category         │     │ title            │     │ documentFrontUrl │
│ message          │     │ content          │     │ status           │
│ isRead           │     │ isPublished      │     │ reviewedBy (FK)  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 2. Enum定義

| Enum名 | 値 | 説明 |
|--------|-----|------|
| **UserRole** | USER, INSTRUCTOR, ADMIN | ユーザーロール |
| **RecurrenceType** | ONCE, WEEKLY, BIWEEKLY, MONTHLY, CUSTOM | 繰り返しタイプ |
| **ReservationStatus** | PENDING, CONFIRMED, CANCELLED, COMPLETED | 予約ステータス |
| **TransactionType** | CHARGE, USE, EXPIRED | 取引種別 |
| **TransactionStatus** | PENDING, TRANSFERRED, COMPLETED, FAILED | 取引ステータス |
| **WithdrawalStatus** | PENDING, APPROVED, REJECTED, COMPLETED | 出金ステータス |
| **CampaignType** | PERCENT_OFF, FIXED_DISCOUNT, TRIAL, EARLY_BIRD, BULK, FIRST_TIME, REFERRAL, SEASONAL | キャンペーン種別 |
| **PaymentMode** | COORDY, EXTERNAL, BOTH | 外部連携決済モード |

---

## 3. テーブル定義

### 3.1 User (users)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| auth_id | String | YES | INDEX | Supabase auth.users.id |
| name | String | NO | | 表示名 |
| email | String | NO | | |
| email_verified | DateTime | YES | | |
| image | String | YES | | プロフィール画像URL |
| role | UserRole | NO | DEFAULT(USER) | |
| created_at | DateTime | NO | DEFAULT(now()) | |
| updated_at | DateTime | NO | @updatedAt | |

**制約**: UNIQUE(email, role)

### 3.2 Instructor (instructors)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| user_id | String | NO | FK(users), UNIQUE | |
| bio | Text | YES | | 自己紹介 |
| specialties | String[] | NO | | 専門分野 |
| hourly_rate | Int | YES | | 時給（円） |
| is_verified | Boolean | NO | DEFAULT(false) | |
| google_access_token | Text | YES | | Google OAuth |
| google_refresh_token | Text | YES | | |
| google_token_expiry | DateTime | YES | | |

### 3.3 Service (services)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| instructor_id | String | NO | FK(instructors), INDEX | |
| title | String | NO | | |
| description | Text | YES | | |
| category | String | NO | | |
| delivery_type | String | NO | DEFAULT("remote") | remote/onsite/hybrid |
| location | String | YES | | 都道府県 |
| price | Int | NO | | 料金（円） |
| duration | Int | NO | | 所要時間（分） |
| is_active | Boolean | NO | DEFAULT(true) | |
| recurrence_type | RecurrenceType | NO | DEFAULT(ONCE) | |
| available_days | String[] | NO | DEFAULT([]) | 曜日配列 |
| start_time | String | YES | | "HH:MM" |
| end_time | String | YES | | "HH:MM" |
| timezone | String | NO | DEFAULT("Asia/Tokyo") | |
| valid_from | DateTime | YES | | |
| valid_until | DateTime | YES | | |
| max_participants | Int | NO | DEFAULT(1) | 最大定員 |

### 3.4 ServiceSchedule (service_schedules)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| service_id | String | NO | FK(services), INDEX | |
| date | Date | NO | INDEX | 開催日 |
| start_time | String | NO | | "HH:MM" |
| end_time | String | NO | | "HH:MM" |
| is_cancelled | Boolean | NO | DEFAULT(false) | |

### 3.5 Reservation (reservations)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| user_id | String | YES | FK(users), INDEX | null=ゲスト |
| guest_user_id | String | YES | FK(guest_users), INDEX | |
| service_id | String | NO | FK(services), INDEX | |
| instructor_id | String | NO | FK(instructors), INDEX | |
| scheduled_at | DateTime | NO | INDEX | 予約日時 |
| status | ReservationStatus | NO | DEFAULT(PENDING) | |
| notes | Text | YES | | 備考 |
| meet_url | String | YES | | Google MeetリンクURL |
| participants | Int | NO | DEFAULT(1) | 予約人数 |

### 3.6 Partner (partners)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| name | String | NO | | パートナー名 |
| code | String | NO | UNIQUE, INDEX | URLコード |
| description | Text | YES | | |
| website_url | String | YES | | |
| logo_url | String | YES | | |
| api_key | String | NO | UNIQUE, INDEX | ptr_xxx形式 |
| secret_key | String | NO | | HMAC署名用 |
| webhook_url | String | YES | | 通知先URL |
| webhook_secret | String | YES | | Webhook署名用 |
| allowed_origins | String[] | NO | DEFAULT([]) | CORS用 |
| payment_mode | PaymentMode | NO | DEFAULT(COORDY) | |
| allow_guest | Boolean | NO | DEFAULT(true) | |
| require_phone | Boolean | NO | DEFAULT(false) | |
| instructor_ids | String[] | NO | DEFAULT([]) | 許可インストラクター |
| service_ids | String[] | NO | DEFAULT([]) | 許可サービス |
| commission_rate | Float | NO | DEFAULT(0.0) | 手数料率 |
| is_active | Boolean | NO | DEFAULT(true) | |

### 3.7 ExternalReservation (external_reservations)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| partner_id | String | NO | FK(partners), INDEX | |
| reservation_id | String | NO | FK(reservations), UNIQUE | |
| external_ref | String | YES | INDEX | パートナー側参照ID |
| payment_mode | PaymentMode | NO | | 実際の決済モード |
| external_payment_ref | String | YES | | 外部決済参照 |
| commission_rate | Float | NO | | 適用手数料率 |
| commission_amount | Int | NO | DEFAULT(0) | 手数料額（円） |

### 3.8 GuestUser (guest_users)

| カラム | 型 | NULL | 制約 | 説明 |
|--------|-----|------|------|------|
| id | UUID | NO | PK | |
| email | String | NO | INDEX | |
| name | String | NO | | |
| phone_number | String | YES | | |

### 3.9 その他テーブル

| テーブル | 説明 |
|---------|------|
| **ClientProfile** (client_profiles) | ユーザー詳細プロフィール・本人確認情報 |
| **PhoneVerification** (phone_verifications) | SMS認証コード管理 |
| **Wallet** (wallets) | ポイント残高（1 User : 1 Wallet） |
| **PointTransaction** (point_transactions) | チャージ/使用/期限切れの取引履歴 |
| **PaymentMethod** (payment_methods) | Stripeクレジットカード情報 |
| **BankAccount** (bank_accounts) | インストラクター受取口座（暗号化） |
| **WithdrawalRequest** (withdrawal_requests) | 出金申請 |
| **FavoriteCreator** (favorite_creators) | お気に入りインストラクター |
| **Notification** (notifications) | システム/管理者通知 |
| **AdminAnnouncement** (admin_announcements) | 管理者お知らせ |
| **IdentityVerificationRequest** (identity_verification_requests) | 身分証確認申請 |
| **Campaign** (campaigns) | キャンペーン/割引設定 |
| **CampaignUsage** (campaign_usages) | キャンペーン利用履歴 |
| **ServiceImage** (service_images) | サービス画像 |

---

## 4. 主要リレーション

```
User 1──1 Instructor
User 1──1 ClientProfile
User 1──1 Wallet
User 1──* Reservation
User 1──* PointTransaction
User 1──* PaymentMethod
User 1──* BankAccount
User 1──* Notification

Instructor 1──* Service
Instructor 1──* Reservation
Instructor 1──* Campaign

Service 1──* ServiceSchedule
Service 1──* ServiceImage
Service 1──* Reservation
Service 1──* Campaign

Reservation *──1 User? (ゲスト時null)
Reservation *──1 GuestUser? (ゲスト時)
Reservation 1──1 ExternalReservation? (外部予約時)

Partner 1──* ExternalReservation
GuestUser 1──* Reservation
```

---

## 5. スキーマファイル

`prisma/schema.prisma` を正とする。
