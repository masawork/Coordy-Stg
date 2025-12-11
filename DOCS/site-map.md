# Coordy サイトマップ

最終更新: 2025-12-04

## 概要

Coordyは、ユーザー（サービス利用者）、サービス出品者（instructorロール）、管理者の3つのロールで構成されるマッチングプラットフォームです。

---

## 共通ページ

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/` | トップページ | サービス紹介・ランディングページ | 不要 | 未ログイン時の入口 |
| `/verify` | メール確認画面 | サインアップ後の確認コード入力 | 不要 | メール認証フロー |

---

## クライアント（ユーザー）向けページ

### 認証関連

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/login/user` | ユーザーログイン | ユーザーのログイン画面 | 不要 | ログイン済みは `/user` へリダイレクト |
| `/signup/user` | クライアント新規登録 | 新規登録案内 | 不要 | `/login/user` へリダイレクト（v3.0〜） |
| `/login/user/forgot` | パスワード再設定申請 | メールアドレス入力でリセットリンク送信 | 不要 | |
| `/login/user/reset` | パスワードリセット | 新しいパスワードの設定 | 不要 | トークン付きURLでアクセス |

### ダッシュボード・メイン機能

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/user` | ユーザーホーム | クライアントのダッシュボード | 要（user） | プロフィール未完了時は `/user/profile/setup` へ |
| `/user/services` | サービス一覧 | 利用可能なサービス検索・閲覧 | 要（user） | |
| `/user/services/[id]` | サービス詳細 | 個別サービスの詳細・予約 | 要（user） | 動的ルート |
| `/user/reservations` | 予約一覧 | 自分の予約確認・管理 | 要（user） | キャンセル機能あり |
| `/user/favorites` | お気に入り | 保存したサービス一覧 | 要（user） | |
| `/user/activity` | アクティビティ | 利用履歴・活動記録 | 要（user） | |

### プロフィール・設定

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/user/profile` | プロフィール | プロフィール表示・編集 | 要（user） | |
| `/user/profile/setup` | 初期設定 | 新規ユーザーのプロフィール初期設定 | 要（user） | 初回ログイン後に誘導 |
| `/user/settings` | 設定 | アカウント設定・通知設定 | 要（user） | |
| `/user/wallet` | ウォレット | ポイント残高・決済情報 | 要（user） | |

---

## サービス出品者（instructorロール）向けページ

### 認証関連

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/login/instructor` | サービス出品者ログイン | サービス出品者のログイン画面 | 不要 | ログイン済みは `/instructor` へリダイレクト |
| `/signup/instructor` | サービス出品者新規登録 | 新規登録案内 | 不要 | `/login/instructor` へリダイレクト（v3.0〜） |

### ダッシュボード・メイン機能

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/instructor` | サービス出品者ホーム | サービス出品者のダッシュボード | 要（instructor） | |
| `/instructor/(protected)/identity-document` | 本人確認書類 | 身分証明書のアップロード・確認 | 要（instructor） | 本人確認フロー |

---

## 管理者向けページ

### 認証関連

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/manage/login` | 管理者ログイン | システム管理者専用ログイン | 不要 | ロール確認あり |

### 管理機能

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/manage/admin` | 管理者ダッシュボード | 管理機能のメイン画面 | 要（admin） | |
| `/admin` | 管理ホーム | 管理者ホーム（旧パス） | 要（admin） | `/manage/admin` と同等 |
| `/admin/(protected)/identity-documents` | 本人確認書類管理 | ユーザーの身分証明書審査 | 要（admin） | |
| `/admin/(protected)/pending-charges` | 保留中の課金 | 未処理の課金管理 | 要（admin） | |

---

## テスト用ページ

| URLパス | 画面名 | 説明 | 認証要否 | 備考 |
|---------|--------|------|----------|------|
| `/test/signup` | テスト用サインアップ | 開発用サインアップテスト | 不要 | 開発環境のみ |
| `/test/verify` | テスト用メール確認 | 開発用認証テスト | 不要 | 開発環境のみ |

---

## ルートグループ構造

Next.js App Routerの(protected)グループを使用して認証要否を管理しています。

```
app/
├── page.tsx                          # トップページ
├── verify/page.tsx                   # メール確認
├── login/
│   ├── user/
│   │   ├── page.tsx                  # ユーザーログイン
│   │   ├── forgot/page.tsx           # パスワード再設定申請
│   │   └── reset/page.tsx            # パスワードリセット
│   └── instructor/page.tsx           # インストラクターログイン
├── signup/
│   ├── user/page.tsx                 # → /login/user へリダイレクト
│   └── instructor/page.tsx           # → /login/instructor へリダイレクト
├── manage/
│   ├── login/page.tsx                # 管理者ログイン
│   └── (protected)/
│       └── admin/page.tsx            # 管理者ダッシュボード
├── user/
│   ├── (protected)/page.tsx          # ユーザーホーム
│   ├── services/                     # サービス関連
│   ├── reservations/page.tsx         # 予約一覧
│   ├── favorites/page.tsx            # お気に入り
│   ├── activity/page.tsx             # アクティビティ
│   ├── profile/                      # プロフィール
│   ├── settings/page.tsx             # 設定
│   └── wallet/page.tsx               # ウォレット
├── instructor/
│   └── (protected)/
│       ├── page.tsx                  # インストラクターホーム
│       └── identity-document/page.tsx # 本人確認
└── admin/
    └── (protected)/
        ├── page.tsx                  # 管理ホーム
        ├── identity-documents/page.tsx # 本人確認管理
        └── pending-charges/page.tsx  # 課金管理
```

---

## 認証フロー概要

| フロー | 対象ロール | 開始URL | 完了後の遷移先 |
|--------|-----------|---------|---------------|
| ユーザーログイン | user | `/login/user` | `/user` または `/user/profile/setup` |
| インストラクターログイン | instructor | `/login/instructor` | `/instructor` |
| 管理者ログイン | admin | `/manage/login` | `/manage/admin` |
| パスワードリセット | 全ロール | `/login/user/forgot` | 各ロールのログイン画面 |
| メール確認 | 全ロール | `/verify` | 各ロールのログイン画面 |

※ 詳細なフローは `DOCS/flows/login-flow.md` を参照してください。

---

## ロールと権限

### ロール一覧

| ロール | 権限レベル | 説明 |
|--------|-----------|------|
| **user** | 1 | サービスを予約・利用する一般ユーザー |
| **instructor** | 2 | サービスを提供するサービス出品者 |
| **admin** | 3 | システム全体の管理・運用 |

### 権限マトリックス

| リソース | user | instructor | admin |
|---------|------|-----------|-------|
| 自分のプロフィール | R/W | R/W | R/W |
| サービス閲覧 | R | R | R/W |
| サービス作成 | - | R/W | R/W |
| 予約作成 | R/W | - | R/W |
| 予約管理（自分） | R/W | R | R/W |
| 予約管理（全体） | - | - | R/W |
| ユーザー管理 | - | - | R/W |

**凡例**: R=読み取り、W=書き込み、-=アクセス不可

### ミドルウェア保護

| パス | 必要なロール |
|------|------------|
| `/user/*` | user |
| `/instructor/*` | instructor |
| `/admin/*` | admin |

未認証時は `/{role}/login?next={requestedPath}` にリダイレクト

---

## API エンドポイント

### 認証 API
- `POST /api/auth/login` - ログイン
- `POST /api/auth/register` - 新規登録
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - ユーザー情報取得
- `POST /api/auth/refresh` - トークン更新

### ユーザー API
- `GET /api/users` - 一覧（管理者のみ）
- `GET /api/users/me` - 自分の情報
- `PATCH /api/users/me` - 情報更新

### サービス API
- `GET /api/services` - 一覧
- `POST /api/services` - 作成（instructor/admin）
- `GET /api/services/[id]` - 詳細
- `PATCH /api/services/[id]` - 更新
- `DELETE /api/services/[id]` - 削除

### 予約 API
- `GET /api/reservations` - 一覧
- `POST /api/reservations` - 作成
- `GET /api/reservations/[id]` - 詳細
- `PATCH /api/reservations/[id]` - 更新（キャンセル等）

### 支払い API
- `GET /api/payments` - 履歴
- `POST /api/payments/charge` - チャージ
- `POST /api/payments/webhook` - Stripe Webhook
