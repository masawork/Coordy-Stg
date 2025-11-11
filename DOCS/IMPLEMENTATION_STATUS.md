# 実装ステータス

## 完了したチケット

### ✅ TICKET-001: AWS Amplify Gen2 Setup
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `amplify.yml` - Amplify ビルド設定ファイル
- ✅ `amplify/backend.ts` - バックエンド定義
- ✅ `amplify/auth/resource.ts` - Cognito 認証設定
- ✅ `amplify/storage/resource.ts` - S3 ストレージ設定
- ✅ `.env.example` - 環境変数テンプレート
- ✅ `scripts/setup-amplify.sh` - セットアップスクリプト
- ✅ `package.json` - Amplify 依存関係追加

**次のステップ**:
```bash
# Amplify のセットアップを実行
npm run setup

# または手動で
npm install
npx ampx sandbox
```

---

### ✅ TICKET-002: DynamoDB Tables Creation
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `scripts/create-dynamodb-tables.ts` - テーブル作成スクリプト
- ✅ `scripts/seed-data.ts` - シードデータ投入スクリプト
- ✅ `lib/dynamodb.ts` - DynamoDB ユーティリティ関数
- ✅ `lib/types/database.ts` - データベース型定義

**作成されるテーブル**:
1. `coordy-users-{env}` - ユーザー情報
2. `coordy-services-{env}` - サービス情報
3. `coordy-reservations-{env}` - 予約情報
4. `coordy-todos-{env}` - TODO 情報
5. `coordy-payments-{env}` - 支払い情報
6. `coordy-instructors-{env}` - インストラクター情報

**次のステップ**:
```bash
# DynamoDB テーブル作成
npm run db:create-tables

# シードデータ投入
npm run db:seed
```

---

### ✅ TICKET-003: Amazon Cognito Authentication
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `lib/auth/cognito.ts` - Cognito 認証ヘルパー
- ✅ `lib/auth/jwt.ts` - JWT トークン管理
- ✅ `lib/auth/session.ts` - セッション管理
- ✅ `lib/auth/index.ts` - 認証モジュール エクスポート

**提供される機能**:
- ✅ ログイン (`signIn`)
- ✅ サインアップ (`signUp`)
- ✅ メール確認 (`confirmSignUp`)
- ✅ パスワードリセット (`forgotPassword`, `confirmForgotPassword`)
- ✅ ユーザー情報取得 (`getCurrentUser`)
- ✅ ユーザー属性更新 (`updateUserAttributes`)
- ✅ パスワード変更 (`changePassword`)
- ✅ JWT トークン生成・検証
- ✅ セッション管理（Cookie ベース）

---

### ✅ TICKET-004: Stripe Integration
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `lib/stripe/client.ts` - Stripe クライアント設定
- ✅ `lib/stripe/payments.ts` - 支払い処理ヘルパー
- ✅ `lib/stripe/webhooks.ts` - Webhook ハンドラー
- ✅ `lib/stripe/index.ts` - Stripe モジュール エクスポート

**提供される機能**:
- ✅ 支払いインテント作成 (`createPaymentIntent`)
- ✅ 顧客管理 (`createCustomer`, `getCustomer`, `updateCustomer`)
- ✅ 支払い方法管理 (`attachPaymentMethod`, `setDefaultPaymentMethod`)
- ✅ 返金処理 (`createRefund`)
- ✅ Webhook イベント処理
- ✅ チャージ作成 (`createCharge`)

**次のステップ**:
```bash
# Stripe CLI をインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhook をローカルにフォワード
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

### ✅ TICKET-005: Authentication API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `app/api/auth/login/route.ts` - ログイン API
- ✅ `app/api/auth/register/route.ts` - ユーザー登録 API
- ✅ `app/api/auth/logout/route.ts` - ログアウト API
- ✅ `app/api/auth/me/route.ts` - ユーザー情報取得 API
- ✅ `app/api/auth/refresh/route.ts` - トークン更新 API

**API エンドポイント**:

#### `POST /api/auth/login`
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

#### `POST /api/auth/register`
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

**レスポンス**:
```json
{
  "message": "登録が完了しました。確認メールを送信しました。",
  "userId": "...",
  "email": "newuser@example.com"
}
```

#### `POST /api/auth/logout`
ログアウト処理

**レスポンス**:
```json
{
  "message": "ログアウトしました"
}
```

#### `GET /api/auth/me`
現在のユーザー情報取得

**レスポンス**:
```json
{
  "user": {
    "userId": "user-001",
    "email": "user@example.com",
    "name": "田中 太郎",
    "role": "user",
    "membership": "free",
    "createdAt": "2025-10-11T00:00:00.000Z"
  }
}
```

#### `POST /api/auth/refresh`
トークン更新

**レスポンス**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### ✅ TICKET-006: Users API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `GET /api/users` - ユーザー一覧取得（管理者のみ）
- ✅ `GET /api/users/me` - 現在のユーザー情報取得
- ✅ `PATCH /api/users/me` - ユーザー情報更新
- ✅ `GET /api/users/[id]` - ユーザー詳細取得（管理者のみ）

---

### ✅ TICKET-007: Services API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `GET /api/services` - サービス一覧取得（カテゴリ・インストラクターフィルタ対応）
- ✅ `POST /api/services` - サービス作成（インストラクター/管理者のみ）
- ✅ `GET /api/services/[id]` - サービス詳細取得
- ✅ `PATCH /api/services/[id]` - サービス更新
- ✅ `DELETE /api/services/[id]` - サービス削除

---

### ✅ TICKET-008: Reservations API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `GET /api/reservations` - 予約一覧取得
- ✅ `POST /api/reservations` - 予約作成（日時妥当性チェック・参加者数チェック）
- ✅ `GET /api/reservations/[id]` - 予約詳細取得
- ✅ `PATCH /api/reservations/[id]` - 予約更新（キャンセル等）
- ✅ `DELETE /api/reservations/[id]` - 予約削除

---

### ✅ TICKET-009: Todos API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `GET /api/todos` - TODO一覧取得（ステータス・優先度フィルタ対応）
- ✅ `POST /api/todos` - TODO作成
- ✅ `GET /api/todos/[id]` - TODO詳細取得
- ✅ `PATCH /api/todos/[id]` - TODO更新
- ✅ `DELETE /api/todos/[id]` - TODO削除

---

### ✅ TICKET-010: Payments API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `GET /api/payments` - 支払い履歴取得
- ✅ `POST /api/payments/charge` - チャージ処理（Stripe PaymentIntent連携）
- ✅ `POST /api/payments/webhook` - Stripe Webhook ハンドラー

---

### ✅ TICKET-011: Instructors API Endpoints
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ `GET /api/instructors` - インストラクター一覧取得
- ✅ `POST /api/instructors` - インストラクタープロフィール作成
- ✅ `GET /api/instructors/[id]` - インストラクター詳細取得
- ✅ `PATCH /api/instructors/[id]` - インストラクター情報更新
- ✅ `DELETE /api/instructors/[id]` - インストラクタープロフィール削除

---

### ✅ TICKET-012: Stripe Webhook Implementation
**ステータス**: 完了
**実装日**: 2025-10-11

**実装内容**:
- ✅ Webhook署名検証
- ✅ 支払い成功イベント処理（Payment完了 + 予約確定）
- ✅ 支払い失敗イベント処理（Payment失敗記録）
- ✅ 返金イベント処理（返金記録 + 予約キャンセル）
- ✅ 顧客イベント処理（StripeカスタマーID連携）

---

## 次に実装すべきチケット

### フロントエンド統合
**優先度**: High
**見積もり**: 3-5 days

既存のページを新しいAPIに統合

---

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
# .env.example をコピー
cp .env.example .env.local

# .env.local を編集して、以下の値を設定:
# - AWS_REGION
# - COGNITO_USER_POOL_ID
# - COGNITO_CLIENT_ID
# - STRIPE_SECRET_KEY
# - JWT_SECRET
```

### 3. AWS Amplify のセットアップ

```bash
# セットアップスクリプトを実行
npm run setup

# または手動で
npx ampx sandbox
```

### 4. DynamoDB テーブルの作成

```bash
# テーブル作成
npm run db:create-tables

# シードデータ投入
npm run db:seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

---

## テスト方法

### ログイン API のテスト

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user01@example.com",
    "password": "user01"
  }'
```

### ユーザー登録 API のテスト

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "テスト 太郎",
    "role": "user"
  }'
```

### 現在のユーザー情報取得 API のテスト

```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: auth_token=YOUR_TOKEN_HERE"
```

---

## トラブルシューティング

### Amplify のエラー

```bash
# Amplify キャッシュをクリア
rm -rf amplify/.amplify

# 再セットアップ
npx ampx sandbox
```

### DynamoDB 接続エラー

```bash
# AWS 認証情報を確認
aws sts get-caller-identity

# リージョンを確認
echo $AWS_REGION
```

### Stripe エラー

```bash
# Stripe CLI でログを確認
stripe logs tail

# Webhook シークレットを取得
stripe listen --print-secret
```

---

*最終更新日: 2025-10-11*
