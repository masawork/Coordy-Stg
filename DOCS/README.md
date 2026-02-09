# Coordy プロジェクト ドキュメント

## 📚 ドキュメント索引

**⭐ ドキュメントが分かりにくい場合は、まず [INDEX.md](./INDEX.md) を読んでください**

- 何がどこに書かれているかの全体マップ
- 読む順番の推奨フロー
- 逆引き索引

---

## 概要

Coordy（コーディ）は、インストラクターとユーザーをマッチングするサービスプラットフォームです。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + React 19
- **認証**: Supabase Auth
- **データベース**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **決済**: Stripe
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript

## アーキテクチャ

このプロジェクトは **BaaS (Backend as a Service)** アーキテクチャを採用しており、Supabaseを中心に構築されています:

- **Supabase Auth**: ユーザー認証・セッション管理・メール送信
- **Supabase Database**: PostgreSQLデータベース
- **Prisma**: データベーススキーマ管理・型安全なクエリ
- **Stripe**: 決済処理

## プロジェクト構造

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (protected)/       # 保護されたページ
│   └── api/               # API Routes
├── components/            # Reactコンポーネント
│   ├── common/           # 共通コンポーネント
│   ├── features/         # 機能別コンポーネント
│   └── ui/               # UIプリミティブ
├── lib/                   # ライブラリ・ユーティリティ
│   ├── auth/             # Supabase Auth設定
│   ├── supabase/         # Supabaseクライアント
│   └── stripe/           # Stripe設定
├── prisma/                # Prismaスキーマ
│   └── schema.prisma     # データベーススキーマ定義
├── supabase/              # Supabase設定
│   ├── migrations/       # データベースマイグレーション
│   └── seed.sql          # シードデータ
└── DOCS/                  # ドキュメント
```

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の変数を設定：

```env
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Prisma（ローカル開発環境）
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

### 3. Supabaseのセットアップ

```bash
# Supabase CLIのインストール（未インストールの場合）
brew install supabase/tap/supabase

# Supabaseローカル環境の起動
supabase start

# データベースマイグレーション
npx prisma generate
npx prisma db push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## 主要機能

### 既存機能（実装済み）

1. **認証システム** (Supabase Auth)
   - メール/パスワード認証
   - Google OAuth認証
   - メール確認（自動送信）
   - パスワードリセット
   - ユーザー/インストラクター/管理者の3ロール管理

2. **サービス管理**
   - サービスの作成・編集・削除
   - カテゴリー管理
   - 価格設定

3. **予約システム**
   - 予約の作成・管理
   - スケジュール管理
   - 予約ステータス管理

4. **ポイント/ウォレット機能**
   - ポイントチャージ（Stripe）
   - ポイント使用
   - 取引履歴

5. **お気に入り機能**
   - インストラクターのお気に入り登録
   - お気に入り一覧

6. **プロフィール管理**
   - ユーザープロフィール
   - インストラクタープロフィール
   - プロフィール設定

7. **管理者ダッシュボード**
   - ユーザー管理
   - サービス管理
   - 統計情報
   - ポイントチャージ承認

---

### 新規機能（実装予定）

8. **本人確認システム** 🆕
   - **Level 0**: 未認証（メール認証のみ）
   - **Level 1**: 基本認証（電話番号確認 - SMS）
   - **Level 2**: 本人確認完了（書類提出・承認）
   - 認証レベル別キャンセルポリシー
   - 決済上限管理

9. **決済・入金システム** 🆕
   - **ユーザー側**: クレジットカード決済（Stripe）
   - **ユーザー側**: 銀行振込受付
   - **インストラクター側**: 銀行口座管理
   - **インストラクター側**: 収益引き出し申請
   - **管理者側**: 引き出し承認/却下

10. **お知らせ・通知システム** 🆕
    - システム通知（本人確認未完了、決済方法未登録など）
    - 管理者からのお知らせ（メンテナンス、キャンペーンなど）
    - アクション通知（予約確定、ポイントチャージ完了など）
    - ヘッダーバナー、ダッシュボードウィジェット、通知センター

## 開発ガイド

詳細な開発ガイドは各ドキュメントを参照してください：

### 基本ドキュメント
- [認証システム](./AUTH.md) - Supabase Authの使い方
- [セットアップ](./SETUP.md) - 開発環境のセットアップ
- [開発環境セットアップ](./DEV_ENVIRONMENT_SETUP.md) - **Supabase Phone Auth・Stripe Test Mode** ⭐ NEW
- [要件定義](./requirement.md) - プロジェクト要件
- [タスク一覧](./TASKS.md) - 実装タスク（最新）

### 機能設計ドキュメント（2025-12-29 追加）
- [実装サマリー](./IMPLEMENTATION_SUMMARY.md) - **全体概要（ここから読む）** ⭐
- [本人確認システム](./VERIFICATION_SYSTEM.md) - 認証レベル・SMS認証・書類確認
- [決済・入金システム](./PAYMENT_SYSTEM.md) - Stripe決済・銀行口座・引き出し
- [お知らせ・通知システム](./NOTIFICATION_SYSTEM.md) - システム通知・管理者お知らせ

### UI/UXドキュメント
- [LP改善プロンプト](./LP_IMPROVEMENT_PROMPT.md) - ランディングページ改善（✅ 完了）
- [UI/UX改善提案](./UI_UX_IMPROVEMENT_PROPOSAL.md) - デザイン改善提案

## Supabase Authの利点

- ✅ **統合管理**: DB + Auth + メール送信を一元管理
- ✅ **メール機能標準装備**: 追加のメールサービス不要
- ✅ **OAuth対応**: Google、GitHub等のソーシャルログインを簡単に追加
- ✅ **セキュリティ**: Row Level Security (RLS) による強固なアクセス制御
- ✅ **スケーラビリティ**: Supabaseの成長に合わせてスケール可能
- ✅ **開発効率**: Supabaseダッシュボードで直感的な管理

