# Coordy

インストラクターとユーザーをマッチングするサービスプラットフォーム

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **認証**: BetterAuth
- **データベース**: Supabase (PostgreSQL)
- **決済**: Stripe
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript

## クイックスタート

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、必要な環境変数を設定してください。
詳細は [DOCS/SETUP.md](./DOCS/SETUP.md) を参照してください。

### 3. Supabaseのセットアップ

```bash
# Supabaseローカル環境の起動
supabase start

# データベースマイグレーションの実行
supabase db reset
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## ドキュメント

- [セットアップガイド](./DOCS/SETUP.md)
- [認証システム](./DOCS/AUTH.md)
- [データベース設計](./DOCS/DATABASE.md)
- [API仕様](./DOCS/API.md)

## プロジェクト構造

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (protected)/       # 保護されたページ
│   └── api/               # API Routes
├── components/            # Reactコンポーネント
├── lib/                   # ライブラリ・ユーティリティ
│   ├── auth/             # BetterAuth設定
│   ├── supabase/         # Supabaseクライアント
│   └── stripe/           # Stripe設定
├── prisma/                # Prismaスキーマ
├── supabase/              # Supabase設定
│   └── migrations/       # データベースマイグレーション
└── DOCS/                  # ドキュメント
```

## ライセンス

MIT
