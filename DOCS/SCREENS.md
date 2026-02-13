# 画面定義書

最終更新: 2025-02-08

## 1. 画面一覧

### 1.1 公開ページ（認証不要）

| パス | 画面名 | 説明 |
|------|--------|------|
| `/` | トップページ | LP（ヒーロー、ユースケース、カテゴリ） |
| `/services` | サービス一覧 | 全サービスの検索・閲覧 |
| `/services/[id]` | サービス詳細 | サービス情報・インストラクター・予約ボタン |
| `/services/[id]/reserve` | 予約ページ | 日時選択・決済 |
| `/book/external` | 外部予約ページ | パートナー連携用の予約フロー |

### 1.2 認証ページ

| パス | 画面名 | 説明 |
|------|--------|------|
| `/login/user` | ユーザーログイン | メール/パスワード + Google OAuth |
| `/login/user/forgot` | パスワードリセット | メールによるリセット |
| `/login/instructor` | インストラクターログイン | メール/パスワード + Google OAuth |
| `/login/instructor/forgot` | パスワードリセット | |
| `/signup/user` | ユーザー登録 | |
| `/signup/instructor` | インストラクター登録 | |
| `/manage/login` | 管理ポータルログイン | |

### 1.3 ユーザーポータル（要認証: USER）

| パス | 画面名 | 主要機能 |
|------|--------|---------|
| `/user` | ダッシュボード | 予約一覧・ウォレット残高・お気に入り・通知 |
| `/user/profile` | プロフィール | プロフィール参照・編集 |
| `/user/profile/setup` | プロフィール初期設定 | 初回ログイン後の必須入力 |
| `/user/services` | サービス一覧 | サービス検索・閲覧 |
| `/user/services/[id]` | サービス詳細 | 詳細表示・予約 |
| `/user/reservations` | 予約一覧 | 自分の予約履歴・ステータス確認 |
| `/user/schedules` | スケジュール | 予約済みスケジュール表示 |
| `/user/favorites` | お気に入り | お気に入りインストラクター一覧 |
| `/user/wallet` | ウォレット | 残高表示・チャージ |
| `/user/payment-methods` | カード管理 | クレジットカード登録・削除・デフォルト設定 |
| `/user/payment` | 支払い | 支払い処理 |
| `/user/notifications` | 通知 | 通知一覧・既読管理 |
| `/user/announcements` | お知らせ | お知らせ一覧 |
| `/user/announcements/[id]` | お知らせ詳細 | |
| `/user/activity` | アクティビティ | 利用履歴 |
| `/user/verification/phone` | 電話番号認証 | SMS OTP送信・確認 |
| `/user/verification/identity` | 身分証確認 | 書類アップロード・審査状況 |
| `/user/settings` | 設定 | アカウント設定 |

### 1.4 インストラクターポータル（要認証: INSTRUCTOR）

| パス | 画面名 | 主要機能 |
|------|--------|---------|
| `/instructor` | ダッシュボード | 今日の予約・サービス数・本人確認状況・口座状況 |
| `/instructor/profile` | プロフィール | プロフィール参照・編集 |
| `/instructor/profile/setup` | プロフィール初期設定 | bio・specialties設定 |
| `/instructor/services` | サービス管理 | 自分のサービス一覧 |
| `/instructor/services/new` | サービス新規作成 | サービス登録フォーム |
| `/instructor/services/[id]/edit` | サービス編集 | サービス情報編集 |
| `/instructor/schedule` | スケジュール管理 | 開催日時の追加・キャンセル |
| `/instructor/reservations` | 予約管理 | 受付予約一覧・ステータス変更 |
| `/instructor/campaigns` | キャンペーン管理 | キャンペーン一覧 |
| `/instructor/campaigns/new` | キャンペーン作成 | |
| `/instructor/withdrawals` | 出金管理 | 出金申請・履歴 |
| `/instructor/bank-accounts` | 口座管理 | 銀行口座登録・編集 |
| `/instructor/identity-document` | 身分証確認 | 書類提出 |
| `/instructor/verification/identity` | 本人確認状態 | |
| `/instructor/announcements` | お知らせ作成 | |
| `/instructor/settings` | 設定 | |

### 1.5 管理者ポータル（要認証: ADMIN）

| パス | 画面名 | 主要機能 |
|------|--------|---------|
| `/manage/admin` | 管理ダッシュボード | 本人確認統計・概要 |
| `/manage/admin/dashboard` | ダッシュボード詳細 | |
| `/manage/admin/users` | ユーザー管理 | ユーザー一覧・ロール変更 |
| `/manage/admin/services` | サービス管理 | 全サービス閲覧 |
| `/manage/admin/verification` | 本人確認審査一覧 | ステータスフィルタ・審査対応 |
| `/manage/admin/verification/[id]` | 本人確認審査詳細 | 書類確認・承認/却下 |
| `/manage/admin/identity-documents` | 身分証一覧 | |
| `/manage/admin/pending-charges` | チャージ承認 | 銀行振込チャージの承認/却下 |
| `/manage/admin/withdrawals` | 出金管理 | 出金申請の処理 |
| `/manage/admin/partners` | パートナー管理 | パートナーCRUD・APIキー発行 |
| `/manage/admin/partners/[id]` | パートナー詳細 | 設定編集・予約履歴・キー再生成 |
| `/manage/admin/announcements` | お知らせ管理 | |
| `/manage/admin/settings` | 設定 | |

---

## 2. 画面遷移

### 2.1 ユーザー予約フロー

```
トップページ (/)
  │
  ├─▶ サービス一覧 (/services)
  │     │
  │     ▼
  │   サービス詳細 (/services/[id])
  │     │
  │     ▼
  │   予約ページ (/services/[id]/reserve)
  │     ├─ [未ログイン] → ユーザーログイン (/login/user)
  │     ├─ [ポイント決済] → 完了
  │     └─ [カード決済] → Stripe → 完了
  │
  └─▶ ユーザーダッシュボード (/user)
        └─▶ 予約一覧 (/user/reservations)
```

### 2.2 外部予約フロー

```
外部パートナーサイト
  │ 「予約する」ボタン（署名付きURL）
  ▼
外部予約ページ (/book/external?partner_id=...&sig=...&ts=...)
  │
  ├─ Step 1: パートナー認証
  ├─ Step 2: サービス選択（指定済みならスキップ）
  ├─ Step 3: 日程選択（定員表示付き）
  ├─ Step 4: ゲスト情報入力（名前・メール・電話）
  ├─ Step 5: 確認画面
  └─ Step 6: 完了 → return_urlへリダイレクト
```

### 2.3 インストラクター サービス管理フロー

```
インストラクターダッシュボード (/instructor)
  │
  ├─▶ サービス一覧 (/instructor/services)
  │     ├─▶ 新規作成 (/instructor/services/new)
  │     └─▶ 編集 (/instructor/services/[id]/edit)
  │
  ├─▶ スケジュール管理 (/instructor/schedule)
  │
  └─▶ 予約管理 (/instructor/reservations)
```

### 2.4 管理者 本人確認フロー

```
管理ダッシュボード (/manage/admin)
  │
  ├─▶ 本人確認審査一覧 (/manage/admin/verification)
  │     │
  │     ▼
  │   審査詳細 (/manage/admin/verification/[id])
  │     ├─ 承認 → ステータス更新
  │     └─ 却下 → 理由入力 → ステータス更新
  │
  └─▶ パートナー管理 (/manage/admin/partners)
        │
        ▼
      パートナー詳細 (/manage/admin/partners/[id])
        ├─ 設定編集
        └─ APIキー再生成
```

---

## 3. 共通コンポーネント

| コンポーネント | パス | 用途 |
|--------------|------|------|
| Button | `components/common/Button.tsx` | カスタムボタン（primary/secondary/outline） |
| Button (shadcn) | `components/ui/button.tsx` | shadcn/ui ボタン |
| レイアウト (User) | `app/user/(protected)/layout.tsx` | ユーザーポータル共通レイアウト |
| レイアウト (Instructor) | `app/instructor/(protected)/layout.tsx` | インストラクター共通レイアウト |
| レイアウト (Admin) | `app/manage/(protected)/admin/layout.tsx` | 管理者共通レイアウト |
| レイアウト (External) | `app/book/external/layout.tsx` | 外部予約用ミニマルレイアウト |
