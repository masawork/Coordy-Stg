# ロールと権限管理

## 概要

このアプリケーションは3つのロール（役割）を持つユーザーをサポートしています。各ロールには固有の権限と機能が割り当てられています。

## ロール一覧

### 1. User（一般ユーザー）

**目的**: サービスを予約・利用する一般ユーザー

**権限範囲**:
- ✅ サービス検索・閲覧
- ✅ サービス予約
- ✅ 自分の予約の確認・キャンセル
- ✅ TODOの作成・管理
- ✅ 支払い処理
- ✅ お気に入り登録
- ✅ 活動履歴の確認
- ✅ ポイント管理
- ✅ プロフィール編集
- ❌ サービスの作成・編集
- ❌ 他のユーザーのデータへのアクセス
- ❌ インストラクター機能
- ❌ 管理者機能

**アクセス可能なルート**:
- `/user/*` - すべてのユーザー機能
- `/user` - ホーム（予約・TODO表示）
- `/user/services` - サービス検索
- `/user/reservations` - 自分の予定
- `/user/todos` - TODOリスト
- `/user/favorites` - お気に入り
- `/user/activity` - 活動履歴
- `/user/points` - ポイント管理
- `/user/profile` - プロフィール
- `/user/payment` - 支払い
- `/user/notifications` - 通知設定
- `/user/help` - ヘルプ
- `/user/settings` - 設定

---

### 2. Instructor（インストラクター）

**目的**: サービスを提供する講師・コーチ

**権限範囲**:
- ✅ サービスの作成・編集・削除（自分のサービスのみ）
- ✅ 予約の確認・管理（自分のサービスへの予約のみ）
- ✅ 収益・売上の確認
- ✅ 生徒情報の閲覧（予約者のみ）
- ✅ プロフィール設定
- ✅ スケジュール管理
- ❌ 他のインストラクターのサービス編集
- ❌ 全ユーザーの情報へのアクセス
- ❌ 他のインストラクターの承認・無効化
- ❌ 管理者機能

**承認フロー**:
1. 新規インストラクター登録時、ステータスは `pending`（承認待ち）
2. 管理者が承認 → ステータスが `approved`（承認済み）に変更
3. 承認後、サービス作成ページにアクセス可能
4. 承認前は「管理者の承認待ちです」バナーを表示

**アクセス可能なルート**:
- `/instructor/*` - すべてのインストラクター機能
- `/instructor/dashboard` - ダッシュボード（今日の予約・生徒一覧）
- `/instructor/services` - サービス管理（一覧）
- `/instructor/services/new` - 新規サービス作成
- `/instructor/services/[id]/edit` - サービス編集
- `/instructor/revenue` - 収益・売上
- `/instructor/messages` - 生徒メッセージ（将来実装予定）
- `/instructor/profile` - プロフィール設定
- `/instructor/schedule` - スケジュール管理
- `/instructor/reservations` - 予約一覧
- `/instructor/notifications` - 通知
- `/instructor/settings` - 設定

---

### 3. Admin（管理者）

**目的**: システム全体の管理・運用

**権限範囲**:
- ✅ 全ユーザーの閲覧・管理
- ✅ インストラクター申請の承認・却下
- ✅ インストラクターの有効化・無効化
- ✅ すべてのサービスの閲覧・編集・無効化
- ✅ 全予約の閲覧
- ✅ 通報・監査ログの確認
- ✅ システム設定の変更
- ✅ レポート・分析の閲覧
- ⚠️ **注意**: 管理者権限は強力なため、適切なセキュリティ対策が必要

**アクセス可能なルート**:
- `/admin/*` - すべての管理者機能
- `/admin/dashboard` - 管理者ダッシュボード
- `/admin/users` - 全ユーザー一覧
- `/admin/instructors` - インストラクター承認管理（承認・却下ボタン付き）
- `/admin/services` - サービス一覧（有効・無効切替）
- `/admin/audit` - 通報・監査ログ
- `/admin/reports` - レポート
- `/admin/notifications` - 通知
- `/admin/settings` - システム設定

---

## ロール切り替え

**ロール判定**:
- URLの第1セグメントでロールを自動判定（`/user/*`, `/instructor/*`, `/admin/*`）
- `RoleContext`（`contexts/RoleContext.tsx`）で管理
- `useRole()` フックで現在のロールを取得

**ミドルウェア保護**:
- `middleware.ts` でルートベースの認証・認可チェック
- 認証されていないユーザーは各ロールのログインページにリダイレクト
- 不正なロールでのアクセスは拒否

**ログイン**:
- `/user/login` - ユーザーログイン
- `/instructor/login` - インストラクターログイン
- `/admin/login` - 管理者ログイン

---

## API権限マトリクス

| エンドポイント | User | Instructor | Admin |
|--------------|------|------------|-------|
| `GET /api/services` | ✅ | ✅ | ✅ |
| `POST /api/services` | ❌ | ✅ | ✅ |
| `PATCH /api/services/[id]` | ❌ | ✅（自分のみ） | ✅ |
| `DELETE /api/services/[id]` | ❌ | ✅（自分のみ） | ✅ |
| `GET /api/reservations` | ✅（自分のみ） | ✅（自分のサービス） | ✅ |
| `POST /api/reservations` | ✅ | ✅ | ✅ |
| `GET /api/users` | ❌ | ❌ | ✅ |
| `GET /api/users/me` | ✅ | ✅ | ✅ |
| `PATCH /api/users/me` | ✅ | ✅ | ✅ |
| `GET /api/instructors` | ✅ | ✅ | ✅ |
| `POST /api/instructors` | ❌ | ✅ | ✅ |
| `PATCH /api/instructors/[id]` | ❌ | ✅（自分のみ） | ✅ |

---

## セキュリティ考慮事項

### 認証
- JWT トークン認証（HTTPOnly Cookie）
- セッション管理
- CSRF 保護（SameSite Cookie）

### 認可
- ロールベースアクセス制御（RBAC）
- リソース所有権チェック（自分のデータのみアクセス可能）
- ミドルウェアでのルート保護

### 監査
- 管理者アクションのログ記録
- インストラクター承認履歴
- サービス無効化履歴

---

## 実装詳細

**コンポーネント**:
- `components/layout/Sidebar.tsx` - ロール別サイドバー
- `contexts/RoleContext.tsx` - ロール状態管理
- `middleware.ts` - 認証・認可チェック

**API認証**:
- `lib/auth/session.ts` - セッション管理
- `lib/auth/jwt.ts` - JWT トークン検証
- 各APIルートで `getSession()` を使用してロール確認

---

*最終更新日: 2025-10-11*
