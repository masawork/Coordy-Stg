# 実装ドキュメント

最終更新: 2025-12-05

---

## 完了済み機能

### 認証・プロフィール管理
- ✅ サインアップフロー（メール検証付き）
- ✅ ログイン・ログアウト
- ✅ ロールベース認証（user/instructor/admin）
- ✅ 必須プロフィール設定（`/user/profile/setup`）
- ✅ パスワードリセット機能

### ポイントシステム
- ✅ ポイントチャージ（クレジットカード/銀行振込）
- ✅ ポイント残高表示（ヘッダー）
- ✅ ポイント有効期限機能

### サービス・予約
- ✅ サービス一覧・詳細表示
- ✅ サービス予約機能
- ✅ 予約一覧・キャンセル
- ✅ お気に入り機能

### ダッシュボード
- ✅ ユーザーダッシュボード
- ✅ インストラクターダッシュボード
- ✅ 管理者ダッシュボード

### 管理者機能
- ✅ 銀行振込承認
- ✅ ユーザー管理

---

## 完了したチケット

### TICKET-001: AWS Amplify Gen2 Setup
**ステータス**: ✅ 完了

**実装内容**:
- `amplify.yml` - Amplify ビルド設定
- `amplify/backend.ts` - バックエンド定義
- `amplify/auth/resource.ts` - Cognito 認証設定
- `amplify/storage/resource.ts` - S3 ストレージ設定

### TICKET-002: DynamoDB Tables Creation
**ステータス**: ✅ 完了

**作成されたテーブル**:
1. `coordy-users-{env}`
2. `coordy-services-{env}`
3. `coordy-reservations-{env}`
4. `coordy-todos-{env}`
5. `coordy-payments-{env}`
6. `coordy-instructors-{env}`

### TICKET-003: Amazon Cognito Authentication
**ステータス**: ✅ 完了

**提供される機能**:
- ログイン/サインアップ/メール確認
- パスワードリセット
- JWT トークン生成・検証
- セッション管理

### TICKET-004: Stripe Integration
**ステータス**: ✅ 完了

**提供される機能**:
- 支払いインテント作成
- 顧客管理
- 返金処理
- Webhook イベント処理

### TICKET-005〜012: API Endpoints
**ステータス**: ✅ 完了

- 認証 API (`/api/auth/*`)
- ユーザー API (`/api/users/*`)
- サービス API (`/api/services/*`)
- 予約 API (`/api/reservations/*`)
- TODO API (`/api/todos/*`)
- 支払い API (`/api/payments/*`)
- インストラクター API (`/api/instructors/*`)

---

## 今後実装する機能

### 高優先度

#### 1. 身分証明書アップロード
**ファイル**: `app/instructor/(protected)/identity-document/page.tsx`
- S3へのアップロード
- ステータス管理（pending/approved/rejected）

#### 2. 管理者用身分証明書審査
**ファイル**: `app/admin/(protected)/identity-documents/page.tsx`
- 審査待ち一覧表示
- 承認/却下機能

#### 3. インストラクター機能制限
身分証明書未承認時の機能制限バナー表示

### 中優先度

#### 4. 重複登録防止
電話番号の重複チェック機能

#### 5. メールアドレス変更
**ファイル**: `app/user/settings/email/page.tsx`

#### 6. テーマカラー選択
**ファイル**: `app/user/settings/theme/page.tsx`

### 低優先度

#### 7. 電話番号SMS認証
Cognito SMS設定、フロント実装

---

## データモデル

### ClientProfile
- プロフィール情報（名前、住所、電話番号、生年月日、性別）
- プロフィール完了フラグ
- テーマカラー

### ClientWallet
- ポイント残高

### PointTransaction
- 取引タイプ（charge/use/expired）
- 金額、決済方法、ステータス、有効期限

### Service / Instructor / Reservation
- サービス情報、インストラクター情報、予約情報

---

## API構成

### クライアント向けAPI
| ファイル | 機能 |
|---------|------|
| `lib/api/profile.ts` | プロフィール管理 |
| `lib/api/wallet.ts` | ウォレット・ポイント管理 |
| `lib/api/favorites.ts` | お気に入り管理 |
| `lib/api/services.ts` | サービス取得 |
| `lib/api/instructors.ts` | インストラクター取得 |
| `lib/api/reservations.ts` | 予約管理 |
| `lib/api/points-expiration.ts` | ポイント有効期限管理 |

### 管理者向けAPI
| ファイル | 機能 |
|---------|------|
| `lib/api/admin.ts` | 銀行振込承認 |

---

## セットアップ手順

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定
```bash
cp .env.example .env.local
# AWS_REGION, COGNITO_*, STRIPE_*, JWT_SECRET を設定
```

### 3. AWS Amplify のセットアップ
```bash
npm run setup
# または npx ampx sandbox
```

### 4. DynamoDB テーブルの作成
```bash
npm run db:create-tables
npm run db:seed
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

---

## トラブルシューティング

### Amplify のエラー
```bash
rm -rf amplify/.amplify
npx ampx sandbox
```

### DynamoDB 接続エラー
```bash
aws sts get-caller-identity
echo $AWS_REGION
```

### Stripe エラー
```bash
stripe logs tail
stripe listen --print-secret
```

---

*統合元: IMPLEMENTATION_PLAN.md, IMPLEMENTATION_STATUS.md, IMPLEMENTATION_SUMMARY.md*
