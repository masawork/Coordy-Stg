# インストール手順

## 📋 初期構築でやること（チェックリスト）

このドキュメントに従って以下の作業を実施してください：

- [ ] **1. Node.js と npm のインストール**
- [ ] **2. Git のインストール**（既にある場合はスキップ）
- [ ] **3. 依存パッケージのインストール**（`npm install`）
- [ ] **4. Supabase CLI のインストール**（ローカル開発用）
- [ ] **5. 環境変数の設定**（`.env` と `.env.local`）
- [ ] **6. Supabaseローカル環境の起動**（`supabase start`）
- [ ] **7. データベースのセットアップ**（`npx prisma generate` & `npx prisma migrate dev`）
- [ ] **8. Stripe CLI のインストール**（決済機能開発用）
- [ ] **9. Supabase Phone Auth の有効化**（SMS認証機能用）
- [ ] **10. 暗号化キーの生成**（銀行口座機能用）
- [ ] **11. 開発サーバーの起動**（`npm run dev`）

**所要時間**: 約30分〜1時間

---

## 必要なソフトウェアのインストール

以下のソフトウェアをインストールする必要があります：

### 1. Node.js と npm

**macOSの場合（Homebrewを使用）:**

```bash
# Homebrewがインストールされていない場合
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.jsをインストール（npmも含まれます）
brew install node

# バージョン確認
node --version  # >= 18.17.0 であることを確認
npm --version   # >= 9.6.7 であることを確認
```

**macOSの場合（公式インストーラーを使用）:**

1. https://nodejs.org/ にアクセス
2. LTS版をダウンロードしてインストール
3. ターミナルでバージョン確認

**その他のOS:**

- Windows: https://nodejs.org/ からインストーラーをダウンロード
- Linux: ディストリビューションに応じたパッケージマネージャーを使用

### 2. Git（既にインストール済みの場合はスキップ）

```bash
# macOS (Homebrew)
brew install git

# バージョン確認
git --version  # >= 2.40.0 であることを確認
```

## プロジェクトのセットアップ

### 1. 依存パッケージのインストール

```bash
cd /Users/sakamoto/Desktop/work/Coordy-Stg
npm install
```

### 3. Supabase CLIのインストール（ローカル開発用）

ローカル開発環境を使用する場合、Supabase CLIをインストールします：

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# バージョン確認
supabase --version
```

### 4. 環境変数の設定

**重要**: Prismaは`.env`ファイルを読み込み、Next.jsは`.env.local`ファイルを優先的に読み込みます。ローカル開発環境を使用する場合、**両方のファイル**に同じ設定を追加することを推奨します。

#### `.env`ファイルの設定（Prisma用）

プロジェクトルートに`.env`ファイルを作成または更新し、以下の環境変数を設定してください：

```env
# Supabase（ローカル環境）
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

#### `.env.local`ファイルの設定（Next.js用）

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

#### ローカル開発環境を使用する場合（推奨）

```env
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Auth（ローカル環境）
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...（後で設定）

# 開発モード
NODE_ENV=development
```

**注意**: ローカル環境のAPIキーは`supabase start`実行時に表示されます。上記の値は例です。

#### 本番環境（Supabaseクラウド）を使用する場合

```env
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Auth（本番環境）
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...（後で設定）

# 開発モード
NODE_ENV=development
```

**環境変数の取得方法:**

1. **Supabase（本番環境）**:
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択
   - Settings → API から URL と API キーを取得
   - Settings → Database → Connection string から DATABASE_URL を取得

2. **Stripe**:
   - https://dashboard.stripe.com/test/apikeys にアクセス
   - Publishable key と Secret key を取得

3. **Supabase Auth設定** (Supabaseダッシュボード):
   - Authentication → Providers で Email Provider を有効化
   - Site URL: `http://localhost:3000` を設定
   - Redirect URLs: `http://localhost:3000/auth/callback` を追加

### 5. Supabaseローカル環境の起動（ローカル開発の場合）

ローカル開発環境を使用する場合、Supabaseローカル環境を起動します：

```bash
# Supabaseローカル環境の起動
supabase start
```

起動後、以下の情報が表示されます：
- **API URL**: http://127.0.0.1:54321
- **Database URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio URL**: http://127.0.0.1:54323（データベース管理画面）

**注意**: 初回起動時はDockerイメージのダウンロードに時間がかかります。

### 6. データベースのセットアップ

```bash
# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション（既に実行済みの場合はスキップ）
npx prisma migrate dev --name init
```

**ローカル環境を使用する場合**:
- `.env.local`の`DATABASE_URL`がローカル環境（`127.0.0.1:54322`）を指していることを確認してください
- `supabase start`が実行されていることを確認してください

**本番環境を使用する場合**:
- `.env.local`の`DATABASE_URL`が本番環境を指していることを確認してください
- データベースサーバーが起動していることを確認してください

### 7. Stripe CLI のインストール（決済機能開発用）

決済機能を開発する場合、Stripe CLI をインストールしてローカルでWebhookをテストできます：

```bash
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# バージョン確認
stripe --version
```

**Webhook をローカルに転送**（開発サーバー起動後に実行）:

```bash
# 別のターミナルで実行
stripe listen --forward-to localhost:3000/api/stripe/webhook
# → webhook signing secret (whsec_...) が表示される
```

表示された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定してください。

---

### 8. Supabase Phone Auth の有効化（SMS認証機能用）

本人確認機能でSMS認証を使用する場合、Supabaseダッシュボードで設定が必要です：

**設定手順**:

1. Supabaseダッシュボードにアクセス
   ```
   https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>/auth/providers
   ```

2. **Phone** プロバイダーを探す

3. 「Enable Phone provider」を **ON** に切り替え

4. 設定を確認:
   - 国コード: `+81`（日本）
   - OTP有効期限: `60秒`（デフォルト）

5. **保存**をクリック

**注意**: 
- ローカル開発環境（`supabase start`）では自動的に有効化されています
- 本番環境（Supabaseクラウド）では上記の設定が必要です

---

### 9. 暗号化キーの生成（銀行口座機能用）

銀行口座番号を暗号化して保存するためのキーを生成します：

```bash
# 32文字のランダムキーを生成
openssl rand -base64 32
```

出力された文字列を `.env.local` に追加:

```env
# 銀行口座暗号化キー
ENCRYPTION_KEY=<生成された32文字のキー>
```

**重要**: 
- ✅ このキーは **絶対に** Git にコミットしない
- ✅ 本番環境では別のキーを使用
- ✅ キーを紛失すると既存の口座番号が復号化できなくなる

---

### 10. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## トラブルシューティング

### Node.jsが見つからない

```bash
# パスを確認
which node
which npm

# パスが通っていない場合、シェルの設定ファイル（.zshrc または .bash_profile）に以下を追加
export PATH="/usr/local/bin:$PATH"
```

### npm install エラー

```bash
# キャッシュをクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### データベース接続エラー

**ローカル環境を使用している場合**:

```bash
# Supabaseローカル環境が起動しているか確認
supabase status

# 起動していない場合は起動
supabase start

# DATABASE_URLが正しく設定されているか確認
echo $DATABASE_URL
# ローカル環境の場合: postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Prismaクライアントを再生成
npx prisma generate

# マイグレーションを再実行
npx prisma migrate dev
```

**本番環境を使用している場合**:

```bash
# DATABASE_URLが正しく設定されているか確認
echo $DATABASE_URL

# データベースサーバーに接続できるか確認
# （psqlがインストールされている場合）
psql $DATABASE_URL -c "SELECT 1;"

# Prismaクライアントを再生成
npx prisma generate

# マイグレーションを再実行
npx prisma migrate dev
```

### Supabaseローカル環境のエラー

```bash
# Supabaseの状態を確認
supabase status

# 再起動
supabase stop
supabase start

# 完全にリセット（データが削除されます）
supabase stop
supabase start --reset
```

### Supabase Auth エラー

```bash
# Supabaseの環境変数が正しく設定されているか確認
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Supabaseダッシュボードで認証設定を確認
# Authentication → Settings → Email Auth が有効になっているか
```

## セットアップの確認

以下のコマンドでセットアップが完了しているか確認できます：

```bash
# 依存パッケージの確認
npm list --depth=0

# Supabaseローカル環境の確認（ローカル開発の場合）
supabase status

# Prismaクライアントの確認
npx prisma generate

# データベース接続の確認
npx prisma db pull
```

## 次のステップ

1. ✅ 依存パッケージのインストール完了
2. ✅ Supabase CLIのインストール完了（ローカル開発の場合）
3. ✅ 環境変数の設定完了
4. ✅ Supabaseローカル環境の起動完了（ローカル開発の場合）
5. ✅ データベースのセットアップ完了
6. ✅ Stripe CLI・Supabase Phone Auth・暗号化キーの設定完了
7. 📚 **[DOCS/INDEX.md](./DOCS/INDEX.md) を読む**（⭐ ドキュメント索引）
8. 📖 [DOCS/IMPLEMENTATION_SUMMARY.md](./DOCS/IMPLEMENTATION_SUMMARY.md) を読む（実装の全体像）
9. 🚀 機能開発を開始（[DOCS/TASKS.md](./DOCS/TASKS.md) を参照）

## クイックスタート

すべてのセットアップが完了したら、以下のコマンドで開発サーバーを起動できます：

### 毎日の開発手順

```bash
# ターミナル1: Supabaseローカル環境を起動
supabase start

# ターミナル2: 開発サーバーを起動
npm run dev
```

### Stripe決済機能を開発する場合（追加）

```bash
# ターミナル3: Stripe Webhookをローカルに転送
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### アクセス

- **Next.jsアプリ**: http://localhost:3000
- **Supabase Studio**（DB管理画面）: http://localhost:54323

---

## 動作確認

ブラウザで http://localhost:3000 にアクセスして、アプリケーションが正常に動作することを確認してください。

**確認項目**:
- ✅ ページが表示される
- ✅ ログインページにアクセスできる
- ✅ コンソールにエラーが出ていない

## ローカル開発環境と本番環境の違い

| 項目 | ローカル開発環境 | 本番環境 |
|------|----------------|----------|
| Supabase CLI | 必要 | 不要 |
| Docker | 必要 | 不要 |
| データベース | ローカル（127.0.0.1:54322） | クラウド（Supabase） |
| セットアップ | `supabase start` | Supabaseダッシュボードで設定 |
| データの永続化 | ローカルDockerボリューム | クラウドデータベース |
| 費用 | 無料 | Supabaseのプランに応じる |

**推奨**: 開発時はローカル開発環境を使用することを推奨します。本番環境への影響を避け、高速な開発が可能です。

