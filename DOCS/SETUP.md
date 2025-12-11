# 開発環境セットアップ

## 概要

Coordy（コーディ）プラットフォームの開発環境セットアップ手順です。

---

## 必須要件

### システム要件

| ソフトウェア | バージョン | 目的 |
|------------|----------|------|
| **Node.js** | >= 18.17.0 | JavaScript実行環境 |
| **npm** | >= 9.6.7 | パッケージマネージャー |
| **Git** | >= 2.40.0 | バージョン管理 |
| **VS Code** | 最新版 | 推奨エディタ |

### 推奨環境

- **OS**: macOS / Linux / Windows (WSL2)
- **RAM**: 8GB以上
- **ディスク**: 10GB以上の空き容量

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
# リポジトリをクローン
git clone https://github.com/your-org/coordy.git
cd coordy

# ブランチ確認
git branch -a
```

### 2. 依存パッケージのインストール

```bash
# npm パッケージインストール
npm install

# インストール確認
npm list --depth=0
```

### 3. 環境変数の設定

```bash
# .env.local ファイルを作成
cp .env.example .env.local
```

**`.env.local` 設定内容:**

```bash
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AWS Amplify
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_IDENTITY_POOL_ID=ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# DynamoDB
DYNAMODB_TABLE_USERS=coordy-users-dev
DYNAMODB_TABLE_SERVICES=coordy-services-dev
DYNAMODB_TABLE_RESERVATIONS=coordy-reservations-dev
DYNAMODB_TABLE_TODOS=coordy-todos-dev
DYNAMODB_TABLE_PAYMENTS=coordy-payments-dev
DYNAMODB_TABLE_INSTRUCTORS=coordy-instructors-dev

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production

# レート制限 (Upstash Redis)
UPSTASH_REDIS_URL=https://xxxxxxxx.upstash.io
UPSTASH_REDIS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 開発モード
NODE_ENV=development
```

### 4. AWS Amplify CLI のセットアップ

```bash
# Amplify CLI のインストール
npm install -g @aws-amplify/cli

# Amplify の初期化
amplify init

# プロンプトに回答
? Enter a name for the project: coordy
? Initialize the project with the above configuration? Yes
? Select the authentication method you want to use: AWS profile
? Please choose the profile you want to use: default

# Amplify Gen2 の設定
amplify configure
```

### 5. ローカルデータベースのセットアップ

```bash
# DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# または Docker Compose
docker-compose up -d dynamodb-local

# テーブル作成
npm run db:create-tables

# 初期データ投入
npm run db:seed
```

---

## 開発サーバーの起動

### HTTP モード（通常）

```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
# http://localhost:3000
```

### HTTPS モード（セキュアクッキー・Service Worker 等が必要な場合）

```bash
# HTTPS 開発サーバー起動
npm run dev:https

# ブラウザで確認
# https://localhost:3000
```

> **Note**: 初回起動時に Next.js が自動的に自己署名証明書を生成します。
> ブラウザで「この接続ではプライバシーが保護されません」等の警告が表示されますが、
> 「詳細設定」→「localhost にアクセスする（安全ではありません）」で続行できます。

**HTTPS が必要なケース**:
- セキュアクッキー（`Secure` 属性）のテスト
- Service Worker のテスト
- Geolocation API のテスト
- その他、HTTPS 必須のブラウザ API 利用時

### 起動確認

- **ユーザーログイン**: http://localhost:3000/login/user（または https://localhost:3000/login/user）
- **インストラクターログイン**: http://localhost:3000/login/instructor
- **管理者ログイン**: http://localhost:3000/manage/login

### テストアカウント

| ロール | メール | パスワード |
|--------|--------|----------|
| User | user01@example.com | user01 |
| Instructor | inst01@example.com | inst01 |
| Admin | admin01@example.com | admin01 |

---

## VS Code 拡張機能

### 必須拡張機能

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 設定

**`.vscode/settings.json`:**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## データベースセットアップ詳細

### ローカルDynamoDB

```bash
# Docker Compose で起動
version: '3.8'
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath ./data"
    volumes:
      - ./dynamodb-data:/home/dynamodblocal/data
```

### テーブル作成スクリプト

```typescript
// scripts/create-tables.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8000'
});

async function createTables() {
  // Users テーブル
  await client.send(new CreateTableCommand({
    TableName: 'coordy-users-dev',
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }));

  console.log('Tables created successfully');
}

createTables();
```

実行:
```bash
npm run db:create-tables
```

---

## Stripe セットアップ

### 1. Stripe アカウント作成

1. https://stripe.com にアクセス
2. アカウント登録
3. ダッシュボードから APIキー取得

### 2. Webhook 設定

```bash
# Stripe CLI インストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhook をローカルにフォワード
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Webhook Secret を .env.local に追加
# whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## トラブルシューティング

### よくある問題

#### 1. ポート競合

```bash
# ポート使用状況確認
lsof -i :3000

# プロセス終了
kill -9 <PID>
```

#### 2. npm install エラー

```bash
# キャッシュクリア
npm cache clean --force

# node_modules 削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 3. Amplify エラー

```bash
# Amplify キャッシュクリア
amplify delete

# 再初期化
amplify init
```

#### 4. DynamoDB 接続エラー

```bash
# Docker コンテナ確認
docker ps

# コンテナ再起動
docker-compose restart dynamodb-local

# エンドポイント確認
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

---

## 開発ワークフロー

### ブランチ戦略

```bash
# 新機能開発
git checkout -b feature/user-profile

# 作業
git add .
git commit -m "feat: add user profile page"

# プッシュ
git push origin feature/user-profile

# Pull Request 作成
```

### コミットメッセージ規約

```
<type>(<scope>): <subject>

例:
feat(auth): add login functionality
fix(reservation): resolve date picker bug
docs(readme): update setup instructions
style(ui): improve button styles
refactor(api): optimize database queries
test(components): add ServiceCard tests
chore(deps): update dependencies
```

---

## テスト実行

```bash
# ユニットテスト
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

---

## ビルド確認

```bash
# プロダクションビルド
npm run build

# ビルド結果確認
npm run start
```

---

## その他のツール

### データベースGUI

```bash
# DynamoDB Admin (ローカル)
npm install -g dynamodb-admin
dynamodb-admin
# http://localhost:8001
```

### APIテスト

```bash
# HTTPie
http POST localhost:3000/api/auth/login email=user01@example.com password=user01

# curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user01@example.com","password":"user01"}'
```

---

## 次のステップ

1. ✅ 開発環境セットアップ完了
2. 📖 [CONTRIBUTING.md](./CONTRIBUTING.md) を読む
3. 🏗️ [COMPONENTS.md](./COMPONENTS.md) でコンポーネント設計を理解
4. 🚀 機能開発を開始

---

*最終更新日: 2025-10-11*
