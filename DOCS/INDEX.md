# Coordy ドキュメント索引

最終更新: 2025-02-08

## ドキュメント一覧

| # | ファイル | 説明 |
|---|----------|------|
| 1 | [REQUIREMENTS.md](REQUIREMENTS.md) | 要件定義書 - 機能要件・非機能要件・ロール・技術スタック |
| 2 | [DATABASE.md](DATABASE.md) | データベース定義 - ER図・テーブル定義・Enum・リレーション |
| 3 | [SCREENS.md](SCREENS.md) | 画面定義書 - 全画面一覧・画面遷移・共通コンポーネント |
| 4 | [API.md](API.md) | API仕様書 - 全67エンドポイントの仕様・認証方式・Webhook |
| 5 | [TEST.md](TEST.md) | テスト仕様書 - テスト項目一覧・テスト環境・実行方法 |
| 6 | [TASKS.md](TASKS.md) | タスク一覧 - 実装済み・未実装・技術的負債 |
| 7 | [EXTERNAL_BOOKING_API.md](EXTERNAL_BOOKING_API.md) | 外部予約API設計書 - パートナー連携の詳細設計 |

## 開発環境

| ファイル | 説明 |
|----------|------|
| [../INSTALL.md](../INSTALL.md) | 環境構築手順 |
| [DEV_ENVIRONMENT_SETUP.md](DEV_ENVIRONMENT_SETUP.md) | 開発環境詳細（Supabase, Prisma, Stripe） |
| [README.md](README.md) | プロジェクト概要 |

## よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# Prisma
npx prisma generate    # クライアント生成
npx prisma db push     # スキーマ反映
npx prisma studio      # DBブラウザ

# 管理者作成
npm run seed:admin

# テスト
npm test
```

## 管理者ログイン（開発環境）

```
Email: admin@example.com
Password: admin123456
URL: http://localhost:3000/manage/admin
```

## 旧ドキュメント

過去のハンドオフ・マイグレーション記録等は `old/` フォルダに移動済み。
