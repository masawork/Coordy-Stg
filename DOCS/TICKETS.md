# 開発チケット管理

## 📊 実装状況サマリー

### ✅ 実装済み（既存コード）

| カテゴリ | 項目 | ステータス | ファイル |
|---------|------|----------|---------|
| **認証** | ログインページ | ✅ 完了 | `app/[role]/login/page.tsx` |
| **認証** | 認証フォーム | ✅ 完了 | `components/AuthForm.tsx` |
| **認証** | クライアント側ガード | ✅ 完了 | `components/ClientGuard.tsx` |
| **レイアウト** | ヘッダー | ✅ 完了 | `components/layout/AppHeader.tsx` |
| **レイアウト** | サイドバー | ✅ 完了 | `components/layout/Sidebar.tsx` |
| **カレンダー** | カレンダーコンポーネント | ✅ 完了 | `components/Calendar.tsx` |
| **ページ** | ユーザーダッシュボード | ✅ 完了 | `app/user/page.tsx` |
| **ページ** | サービス一覧 | ✅ 完了 | `app/user/services/page.tsx` |
| **ページ** | サービス詳細 | ✅ 完了 | `app/user/services/[id]/page.tsx` |
| **ページ** | 予約一覧 | ✅ 完了 | `app/user/reservations/page.tsx` |
| **ページ** | ToDo管理 | ✅ 完了 | `app/user/todos/page.tsx` |
| **ページ** | 支払い | ✅ 完了 | `app/user/payment/page.tsx` |
| **ページ** | 活動履歴 | ✅ 完了 | `app/user/activity/page.tsx` |
| **モック** | フェイクAPI | ✅ 完了 | `lib/fakeApi.ts` |
| **モック** | モックデータ | ✅ 完了 | `lib/mock.ts, lib/fitness-mock-data.ts` |

### 🚧 実装中・調整必要

| カテゴリ | 項目 | ステータス | 備考 |
|---------|------|----------|------|
| **API** | バックエンドAPI | 🚧 未実装 | モックAPIのみ、実APIが必要 |
| **データベース** | DynamoDB接続 | 🚧 未実装 | Amplify Gen2セットアップ必要 |
| **認証** | Cognito統合 | 🚧 未実装 | 現在はモック認証のみ |
| **決済** | Stripe統合 | 🚧 未実装 | 決済機能未実装 |
| **コンポーネント** | 予約フォーム | 🚧 改善必要 | UX改善・バリデーション強化 |

### ❌ 未実装（要開発）

| カテゴリ | 項目 | 優先度 |
|---------|------|--------|
| **インストラクター** | ダッシュボード | 🔴 高 |
| **インストラクター** | サービス管理 | 🔴 高 |
| **インストラクター** | スケジュール管理 | 🔴 高 |
| **管理者** | ダッシュボード | 🟡 中 |
| **管理者** | ユーザー管理 | 🟡 中 |
| **管理者** | サービス審査 | 🟡 中 |
| **通知** | リマインダー通知 | 🟢 低 |
| **EC** | 引換券システム | 🟢 低 |

---

## 🎯 開発チケット（Epic別）

### Epic 1: インフラ・環境構築 🏗️

#### TICKET-001: AWS Amplify Gen2セットアップ
**優先度**: 🔴 Critical
**見積**: 3日
**担当**: Backend Lead

**概要**:
AWS Amplify Gen2のセットアップとプロジェクト初期化

**タスク**:
- [ ] Amplify CLIインストール・設定
- [ ] プロジェクト初期化（`amplify init`）
- [ ] 環境変数設定（dev/staging/prod）
- [ ] IAMロール・ポリシー設定
- [ ] ドキュメント更新（SETUP.md）

**成果物**:
- Amplify設定ファイル
- 環境変数テンプレート
- セットアップドキュメント

**参照**: `DOCS/SETUP.md`, `DOCS/DEPLOYMENT.md`

---

#### TICKET-002: DynamoDBテーブル作成
**優先度**: 🔴 Critical
**見積**: 2日
**担当**: Backend Lead

**概要**:
DynamoDBテーブルの作成とGSI設定

**タスク**:
- [ ] Usersテーブル作成 + EmailIndex, RoleIndex
- [ ] Servicesテーブル作成 + CategoryIndex, StatusIndex
- [ ] Reservationsテーブル作成 + DateIndex, InstructorIndex, ServiceIndex
- [ ] Todosテーブル作成 + DateIndex, PriorityIndex
- [ ] Paymentsテーブル作成 + TypeIndex, DateIndex
- [ ] Instructorsテーブル作成 + UserIdIndex, StatusIndex
- [ ] 初期データ投入スクリプト作成

**成果物**:
- DynamoDBテーブル（全6テーブル）
- シードデータスクリプト
- テーブル設計ドキュメント更新

**参照**: `DOCS/DATABASE.md`

---

#### TICKET-003: Amazon Cognito認証設定
**優先度**: 🔴 Critical
**見積**: 2日
**担当**: Backend Lead

**概要**:
Cognitoユーザープールの作成と認証フロー実装

**タスク**:
- [ ] Cognitoユーザープール作成
- [ ] パスワードポリシー設定
- [ ] カスタム属性設定（role, userId）
- [ ] MFA設定（オプション）
- [ ] 認証フローの実装
- [ ] トークン管理の実装

**成果物**:
- Cognitoユーザープール
- 認証ライブラリ実装
- 認証フロー図

**参照**: `DOCS/AUTH.md`

---

#### TICKET-004: Stripe統合セットアップ
**優先度**: 🔴 High
**見積**: 3日
**担当**: Backend Lead

**概要**:
Stripe決済システムの統合とチャージ機能実装

**タスク**:
- [ ] Stripeアカウント作成・APIキー取得
- [ ] Stripe Checkout統合
- [ ] Webhookエンドポイント実装
- [ ] チャージフロー実装
- [ ] 決済履歴保存
- [ ] エラーハンドリング

**成果物**:
- Stripe統合コード
- Webhookハンドラー
- 決済テストケース

**参照**: `DOCS/API.md` (決済セクション)

---

### Epic 2: API実装 🔌

#### TICKET-005: 認証API実装
**優先度**: 🔴 Critical
**見積**: 2日
**担当**: Backend Developer

**概要**:
認証関連APIエンドポイントの実装

**エンドポイント**:
- [ ] `POST /api/auth/login` - ログイン
- [ ] `POST /api/auth/register` - ユーザー登録
- [ ] `POST /api/auth/logout` - ログアウト
- [ ] `POST /api/auth/refresh` - トークンリフレッシュ
- [ ] `POST /api/auth/verify` - メール確認

**成果物**:
- APIエンドポイント実装
- ユニットテスト
- APIドキュメント更新

**参照**: `DOCS/API.md` (認証セクション)

---

#### TICKET-006: ユーザーAPI実装
**優先度**: 🔴 High
**見積**: 2日
**担当**: Backend Developer

**概要**:
ユーザー情報管理APIの実装

**エンドポイント**:
- [ ] `GET /api/users/me` - 現在のユーザー情報取得
- [ ] `PATCH /api/users/me` - ユーザー情報更新
- [ ] `GET /api/users/:id` - ユーザー詳細取得（管理者）
- [ ] `GET /api/users` - ユーザー一覧取得（管理者）

**成果物**:
- APIエンドポイント実装
- ユニットテスト
- APIドキュメント更新

**参照**: `DOCS/API.md` (ユーザーセクション)

---

#### TICKET-007: サービスAPI実装
**優先度**: 🔴 High
**見積**: 3日
**担当**: Backend Developer

**概要**:
サービス（クラス）管理APIの実装

**エンドポイント**:
- [ ] `GET /api/services` - サービス一覧取得（フィルタ対応）
- [ ] `GET /api/services/:id` - サービス詳細取得
- [ ] `POST /api/services` - サービス作成（インストラクター/管理者）
- [ ] `PATCH /api/services/:id` - サービス更新
- [ ] `DELETE /api/services/:id` - サービス削除

**成果物**:
- APIエンドポイント実装
- ユニットテスト
- APIドキュメント更新

**参照**: `DOCS/API.md` (サービスセクション)

---

#### TICKET-008: 予約API実装
**優先度**: 🔴 Critical
**見積**: 3日
**担当**: Backend Developer

**概要**:
予約管理APIの実装

**エンドポイント**:
- [ ] `GET /api/reservations` - 予約一覧取得
- [ ] `POST /api/reservations` - 予約作成
- [ ] `GET /api/reservations/:id` - 予約詳細取得
- [ ] `PATCH /api/reservations/:id` - 予約キャンセル/変更
- [ ] `DELETE /api/reservations/:id` - 予約削除

**成果物**:
- APIエンドポイント実装
- 空き状況チェックロジック
- ユニットテスト

**参照**: `DOCS/API.md` (予約セクション)

---

#### TICKET-009: ToDo API実装
**優先度**: 🟡 Medium
**見積**: 2日
**担当**: Backend Developer

**概要**:
ToDo管理APIの実装

**エンドポイント**:
- [ ] `GET /api/todos` - ToDo一覧取得
- [ ] `POST /api/todos` - ToDo作成
- [ ] `PATCH /api/todos/:id` - ToDo更新
- [ ] `DELETE /api/todos/:id` - ToDo削除

**成果物**:
- APIエンドポイント実装
- ユニットテスト
- APIドキュメント更新

**参照**: `DOCS/API.md` (ToDoセクション)

---

#### TICKET-010: 支払いAPI実装
**優先度**: 🔴 High
**見積**: 3日
**担当**: Backend Developer

**概要**:
支払い・チャージAPIの実装

**エンドポイント**:
- [ ] `GET /api/payments` - 支払い履歴取得
- [ ] `POST /api/payments/charge` - チャージ（Stripe連携）
- [ ] `POST /api/payments/webhook` - Stripe Webhook

**成果物**:
- APIエンドポイント実装
- Stripe連携コード
- Webhookハンドラー

**参照**: `DOCS/API.md` (支払いセクション)

---

### Epic 3: フロントエンド強化 🎨

#### TICKET-011: 予約フォームUIリファクタリング
**優先度**: 🔴 High
**見積**: 2日
**担当**: Frontend Developer

**概要**:
予約フォームのUX改善とバリデーション強化

**タスク**:
- [ ] 日付選択UIの改善
- [ ] 時間帯選択UIの改善
- [ ] インストラクター選択UIの改善
- [ ] リアルタイムバリデーション実装
- [ ] エラーメッセージ改善
- [ ] ローディング状態の実装
- [ ] 確認ステップの追加

**成果物**:
- リファクタリング済みReservationFormコンポーネント
- バリデーションルール
- Storybookストーリー

**参照**: `DOCS/COMPONENTS.md` (予約関連)

---

#### TICKET-012: カレンダーコンポーネント強化
**優先度**: 🟡 Medium
**見積**: 3日
**担当**: Frontend Developer

**概要**:
カレンダーコンポーネントの機能拡張

**タスク**:
- [ ] 月/週/日ビュー切り替え実装
- [ ] イベントドラッグ&ドロップ
- [ ] 重複イベントの横並び表示
- [ ] イベントクリック詳細表示
- [ ] 今日ハイライト機能
- [ ] レスポンシブ対応

**成果物**:
- 強化版Calendarコンポーネント
- Storybookストーリー
- ユニットテスト

**参照**: `DOCS/COMPONENTS.md` (カレンダー関連)

---

#### TICKET-013: サービスカードコンポーネント実装
**優先度**: 🟡 Medium
**見積**: 1日
**担当**: Frontend Developer

**概要**:
サービス一覧用カードコンポーネントの実装

**タスク**:
- [ ] ServiceCardコンポーネント作成
- [ ] 画像表示・フォールバック処理
- [ ] カテゴリバッジ表示
- [ ] 価格・時間情報表示
- [ ] ホバーエフェクト実装
- [ ] レスポンシブ対応

**成果物**:
- ServiceCardコンポーネント
- Storybookストーリー
- スタイルガイド

**参照**: `DOCS/COMPONENTS.md` (サービス関連)

---

#### TICKET-014: ToDoリストコンポーネント実装
**優先度**: 🟡 Medium
**見積**: 2日
**担当**: Frontend Developer

**概要**:
ToDo管理UIの実装

**タスク**:
- [ ] TodoListコンポーネント作成
- [ ] TodoItemコンポーネント作成
- [ ] TodoFormコンポーネント作成
- [ ] 優先度別表示
- [ ] 完了/未完了フィルタ
- [ ] ドラッグ&ドロップ並び替え
- [ ] カレンダー統合

**成果物**:
- ToDoコンポーネント一式
- Storybookストーリー
- ユニットテスト

**参照**: `DOCS/COMPONENTS.md` (ToDo関連)

---

#### TICKET-015: 決済フローUI実装
**優先度**: 🔴 High
**見積**: 2日
**担当**: Frontend Developer

**概要**:
Stripeチャージフローの実装

**タスク**:
- [ ] PaymentFormコンポーネント作成
- [ ] Stripe Checkout統合
- [ ] チャージ金額入力UI
- [ ] 残高表示
- [ ] 決済履歴表示
- [ ] エラーハンドリング

**成果物**:
- 決済関連コンポーネント
- Stripe統合コード
- E2Eテスト

**参照**: `DOCS/COMPONENTS.md` (支払い関連)

---

### Epic 4: インストラクター機能 👩‍🏫

#### TICKET-016: インストラクターダッシュボード実装
**優先度**: 🔴 High
**見積**: 3日
**担当**: Frontend Developer

**概要**:
インストラクター向けダッシュボードの実装

**タスク**:
- [ ] ダッシュボードレイアウト作成
- [ ] 今日の予約一覧表示
- [ ] 収益サマリー表示（将来拡張）
- [ ] 顧客統計表示
- [ ] アクションカード実装

**成果物**:
- インストラクターダッシュボード
- サマリーコンポーネント
- ルーティング設定

**参照**: `DOCS/requirement.md` (インストラクター機能)

---

#### TICKET-017: サービス管理画面実装
**優先度**: 🔴 High
**見積**: 3日
**担当**: Frontend Developer

**概要**:
インストラクターのサービス管理画面実装

**タスク**:
- [ ] サービス一覧表示
- [ ] サービス作成フォーム
- [ ] サービス編集フォーム
- [ ] 価格・スケジュール設定
- [ ] 画像アップロード
- [ ] 公開/非公開切り替え

**成果物**:
- サービス管理画面
- CRUD機能一式
- バリデーション

**参照**: `DOCS/requirement.md` (サービス管理)

---

#### TICKET-018: スケジュール管理画面実装
**優先度**: 🔴 High
**見積**: 3日
**担当**: Frontend Developer

**概要**:
インストラクタースケジュール管理画面実装

**タスク**:
- [ ] カレンダービュー実装
- [ ] 空き時間設定機能
- [ ] 予約状況表示
- [ ] ブロック機能（休暇等）
- [ ] 繰り返し設定機能

**成果物**:
- スケジュール管理画面
- カレンダーコンポーネント拡張
- 設定保存機能

**参照**: `DOCS/requirement.md` (スケジュール管理)

---

#### TICKET-019: 顧客管理画面実装
**優先度**: 🟡 Medium
**見積**: 2日
**担当**: Frontend Developer

**概要**:
インストラクター顧客管理画面実装

**タスク**:
- [ ] 顧客一覧表示
- [ ] 顧客詳細表示
- [ ] 予約履歴表示
- [ ] メモ機能
- [ ] フィルタ・検索機能

**成果物**:
- 顧客管理画面
- 顧客詳細コンポーネント
- 検索機能

**参照**: `DOCS/requirement.md` (顧客管理)

---

### Epic 5: 管理者機能 👑

#### TICKET-020: 管理者ダッシュボード実装
**優先度**: 🟡 Medium
**見積**: 3日
**担当**: Frontend Developer

**概要**:
管理者向けダッシュボード実装

**タスク**:
- [ ] 全体統計表示
- [ ] ユーザー数推移グラフ
- [ ] 予約数推移グラフ
- [ ] 売上グラフ
- [ ] アラート表示

**成果物**:
- 管理者ダッシュボード
- グラフコンポーネント
- 統計API連携

**参照**: `DOCS/requirement.md` (管理者機能)

---

#### TICKET-021: ユーザー管理画面実装
**優先度**: 🟡 Medium
**見積**: 2日
**担当**: Frontend Developer

**概要**:
管理者向けユーザー管理画面実装

**タスク**:
- [ ] ユーザー一覧表示
- [ ] ユーザー詳細表示
- [ ] ロール変更機能
- [ ] アカウント停止機能
- [ ] 検索・フィルタ機能

**成果物**:
- ユーザー管理画面
- CRUD機能
- 権限チェック

**参照**: `DOCS/requirement.md` (ユーザー管理)

---

#### TICKET-022: サービス審査画面実装
**優先度**: 🟡 Medium
**見積**: 2日
**担当**: Frontend Developer

**概要**:
管理者向けサービス審査画面実装

**タスク**:
- [ ] 審査待ちサービス一覧
- [ ] サービス詳細表示
- [ ] 承認/却下機能
- [ ] コメント機能
- [ ] ステータス管理

**成果物**:
- サービス審査画面
- 審査ワークフロー
- 通知機能

**参照**: `DOCS/requirement.md` (サービス審査)

---

### Epic 6: テスト・品質 🧪

#### TICKET-023: ユニットテスト実装
**優先度**: 🔴 High
**見積**: 5日
**担当**: QA Engineer / Developer

**概要**:
主要コンポーネント・関数のユニットテスト実装

**タスク**:
- [ ] 認証関連テスト
- [ ] コンポーネントテスト（ServiceCard, Calendar等）
- [ ] ユーティリティ関数テスト
- [ ] APIクライアントテスト
- [ ] カバレッジ80%達成

**成果物**:
- テストスイート
- カバレッジレポート
- テストドキュメント

**参照**: `DOCS/requirement.md` (テスト要件)

---

#### TICKET-024: E2Eテスト実装
**優先度**: 🔴 High
**見積**: 4日
**担当**: QA Engineer

**概要**:
Playwrightを使用したE2Eテスト実装

**シナリオ**:
- [ ] ログイン→予約→完了フロー
- [ ] サービス検索・予約フロー
- [ ] チャージ→決済フロー
- [ ] ToDo追加→完了フロー
- [ ] エラーハンドリング

**成果物**:
- E2Eテストスイート
- テストレポート
- CI統合

**参照**: `DOCS/requirement.md` (テスト要件)

---

#### TICKET-025: アクセシビリティ対応
**優先度**: 🟡 Medium
**見積**: 3日
**担当**: Frontend Developer

**概要**:
WCAG 2.1 AA準拠のアクセシビリティ対応

**タスク**:
- [ ] セマンティックHTML修正
- [ ] ARIA属性追加
- [ ] キーボード操作対応
- [ ] スクリーンリーダー対応
- [ ] コントラスト比チェック
- [ ] axeツールでの検証

**成果物**:
- アクセシビリティ改善
- 検証レポート
- ガイドライン

**参照**: `DOCS/requirement.md` (アクセシビリティ)

---

### Epic 7: デプロイ・CI/CD 🚀

#### TICKET-026: GitHub Actions CI/CD構築
**優先度**: 🔴 High
**見積**: 2日
**担当**: DevOps Engineer

**概要**:
GitHub ActionsでのCI/CDパイプライン構築

**タスク**:
- [ ] Linter実行ワークフロー
- [ ] テスト実行ワークフロー
- [ ] ビルド実行ワークフロー
- [ ] デプロイワークフロー（Amplify）
- [ ] Slacks通知設定

**成果物**:
- CI/CDワークフロー
- デプロイ自動化
- 通知設定

**参照**: `DOCS/DEPLOYMENT.md`

---

#### TICKET-027: 環境別デプロイ設定
**優先度**: 🔴 High
**見積**: 2日
**担当**: DevOps Engineer

**概要**:
開発・ステージング・本番環境の設定

**タスク**:
- [ ] 環境別環境変数設定
- [ ] ブランチ戦略設定（develop/staging/main）
- [ ] プレビュー環境設定
- [ ] ロールバック手順整備

**成果物**:
- 環境別設定
- デプロイ手順書
- ロールバック手順書

**参照**: `DOCS/DEPLOYMENT.md`

---

#### TICKET-028: モニタリング・ログ設定
**優先度**: 🟡 Medium
**見積**: 2日
**担当**: DevOps Engineer

**概要**:
CloudWatch、Sentryでのモニタリング設定

**タスク**:
- [ ] CloudWatchログ設定
- [ ] Sentry統合
- [ ] アラート設定
- [ ] ダッシュボード作成

**成果物**:
- モニタリング設定
- アラートルール
- ダッシュボード

**参照**: `DOCS/DEPLOYMENT.md` (モニタリング)

---

## 📝 設計書の参照方法

### チケット作業時の参照指示

開発チケット作業時に設計書を参照したい場合、以下のように指示してください：

#### 1. **特定のドキュメントを参照**

```
@DOCS/requirement.md を見て、予約フローの要件を確認して
```

```
@DOCS/API.md のサービスAPIセクションを確認して実装して
```

```
@DOCS/COMPONENTS.md のServiceCard実装例を参照してコーディングして
```

#### 2. **複数ドキュメントを参照**

```
@DOCS/requirement.md と @DOCS/API.md を見て、予約機能を実装して
```

```
@DOCS/DATABASE.md と @DOCS/API.md を参照して、Reservationsテーブルのアクセスパターンを実装して
```

#### 3. **セクション指定で参照**

```
@DOCS/requirement.md の「ユーザーロール定義」セクションを見て、権限マトリックスを実装して
```

```
@DOCS/COMPONENTS.md の「予約フロー」セクションを参照して、ReservationFormを作成して
```

#### 4. **チケット番号で参照**

```
TICKET-011の要件に従って、予約フォームをリファクタリングして
```

```
TICKET-016を実装して。設計書も参照して
```

### 推奨される作業フロー

```mermaid
graph LR
    A[チケット選択] --> B[設計書参照]
    B --> C[実装]
    C --> D[テスト]
    D --> E[レビュー]
    E --> F[マージ]
```

**作業例**:
```
1. 「TICKET-011を開始します。@DOCS/COMPONENTS.md と @DOCS/requirement.md を参照して予約フォームの要件を確認してください」
2. （実装）
3. 「実装完了したので、@DOCS/CONTRIBUTING.md のコーディング規約に従っているかレビューしてください」
```

---

## 🔄 チケットステータス管理

| ステータス | 説明 |
|----------|------|
| 📋 **TODO** | 未着手 |
| 🚧 **In Progress** | 作業中 |
| 👀 **Review** | レビュー待ち |
| ✅ **Done** | 完了 |
| ❌ **Blocked** | ブロック中 |

---

## 📊 進捗トラッキング

### Epic別進捗

| Epic | 完了 | 合計 | 進捗率 |
|------|------|------|--------|
| Epic 1: インフラ | 0 | 4 | 0% |
| Epic 2: API | 0 | 6 | 0% |
| Epic 3: フロントエンド | 0 | 5 | 0% |
| Epic 4: インストラクター | 0 | 4 | 0% |
| Epic 5: 管理者 | 0 | 3 | 0% |
| Epic 6: テスト | 0 | 3 | 0% |
| Epic 7: デプロイ | 0 | 3 | 0% |
| **合計** | **0** | **28** | **0%** |

---

*最終更新日: 2025-10-11*
