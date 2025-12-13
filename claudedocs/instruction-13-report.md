# Instruction 13 作業完了レポート

**作業日**: 2025-12-11
**対象**: `/mnt/Coordy/Instruction/13.txt`

---

## 概要

Next.js 14 + AWS Amplify Gen2 予約プラットフォーム「Coordy」に対して、認証フロー整理、GraphQLエラー修正、表示名バリデーション追加、サイドバー改善、DOCS更新などの8タスクを実施しました。

---

## タスク別実施内容

### T-000: 事前調査 - プロジェクト構成とDOCS把握

**調査内容**:
- プロジェクト構造: Next.js 14 App Router + AWS Amplify Gen2
- 認証: Cognito (ADMINS, CREATORS, CLIENTS グループ)
- ロール: `user`, `instructor`, `admin` の3種類
- 保護ルート: `(protected)` ルートグループで管理

**主要ファイル確認**:
- `app/user/(protected)/layout.tsx` - ユーザー保護レイアウト
- `app/instructor/(protected)/layout.tsx` - インストラクター保護レイアウト
- `app/manage/(protected)/layout.tsx` - 管理者保護レイアウト
- `lib/auth/cognito.ts` - Cognito認証ロジック
- `DOCS/flows/login-flow.md` - ログインフロー設計書

---

### T-101: 認証ガード・リダイレクトの整理

**要件**: 未ログインユーザーを `/` へリダイレクト（ログインページではなく）

**変更ファイル**:

1. **`app/user/(protected)/layout.tsx`**
   - 認証エラー時: `/login/user` → `/` へ変更
   - 別ロール時の else 分岐: `/login/user` → `/` へ変更

2. **`app/instructor/(protected)/layout.tsx`**
   - 認証エラー時: `/login/instructor` → `/` へ変更
   - 別ロール時の else 分岐: `/` へ変更

---

### T-201: ユーザープロフィール作成時のGraphQLエラー修正

**問題**: `CreateClientProfileInput` に定義されていないフィールドを送信していた

**変更ファイル**:

**`lib/api/profile.ts`**
```typescript
// Before: 全フィールドをそのまま送信
const { data } = await client.models.ClientProfile.create(input);

// After: 値がある場合のみフィールドを追加
const createInput: Record<string, unknown> = {
  clientId: input.clientId,
  name: input.name,
};

if (input.displayName !== undefined && input.displayName !== '') {
  createInput.displayName = input.displayName;
}
// ... 他のオプショナルフィールドも同様
```

---

### T-301: インストラクター用プロフィール設定フォーム調整

**要件**:
- 「本名」フィールド追加（管理者確認用）
- 「時間単価(hourlyRate)」フィールド削除

**変更ファイル**:

**`app/instructor/(protected)/profile/setup/page.tsx`**

変更内容:
1. FormState型に `name` 追加、`hourlyRate` 削除
2. フォームUIに「本名（管理者のみ確認）」入力フィールド追加
3. 保存時に Cognito `name` 属性を更新
4. 表示名の禁止ワードバリデーション追加

---

### T-401: 表示名の禁止文言チェック

**要件**: 「admin」「管理者」「Coordy」などの禁止ワードをチェック

**新規ファイル**:

**`lib/auth/displayName.ts`**
```typescript
const PROHIBITED_WORDS = [
  // 暴力的表現
  '殺', '死', '暴力', '虐待', 'ころす', 'しね',
  // 差別的表現
  // ...
  // システム関連（なりすまし防止）
  'admin', 'administrator', '管理者', 'システム', 'system', 'coordy', 'official',
];

export function validateDisplayName(displayName: string): DisplayNameValidationResult {
  // 長さ・パターン・禁止ワードチェック
}
```

**統合先**:
- `app/user/(protected)/profile/setup/page.tsx`
- `app/instructor/(protected)/profile/setup/page.tsx`

---

### T-501: インストラクターダッシュボードのサブメニュー修正

**問題**: サイドバーメニューのリンク先が存在せず404発生

**新規作成ファイル**:

1. **`app/instructor/(protected)/services/page.tsx`**
   - サービス管理ページ（空状態UI）

2. **`app/instructor/(protected)/reservations/page.tsx`**
   - 予約管理ページ（空状態UI）

3. **`app/instructor/(protected)/schedule/page.tsx`**
   - スケジュール管理ページ（カレンダーUI）

4. **`app/instructor/(protected)/settings/page.tsx`**
   - 設定ページ（通知・セキュリティ・支払い設定）

---

### T-601: 管理画面のサイドバー初期状態

**要件**: デスクトップ時にサイドバーを初期表示状態にする

**変更ファイル**:

1. **`app/manage/(protected)/layout.tsx`**
   - `Sidebar` コンポーネントと `useSidebar` フックを追加
   - ユーザーレイアウトと同様のサイドバー構造を実装
   - ローディングスピナーの色をオレンジ(admin用)に変更

2. **`components/layout/Sidebar.tsx`**
   - 管理者メニューのリンク先を `/admin/*` → `/manage/admin/*` に修正

---

### T-701: ロールごとのアクセス制御とDOCS反映

**変更ファイル**:

1. **`app/user/(protected)/layout.tsx`**
   - admin ユーザーのリダイレクト先: `/admin` → `/manage/admin`

2. **`app/instructor/(protected)/layout.tsx`**
   - admin ユーザーのリダイレクト先: `/admin` → `/manage/admin`

3. **`DOCS/AUTH.md`**
   - 「ロールごとのアクセスルール」セクション追加
   - 保護エリアへのアクセス制御表追加
   - リダイレクトロジック・設計方針を記載

4. **`DOCS/flows/login-flow.md`** (前セッションで追加済み)
   - セクション10「ロールごとのアクセス制御」追加

---

### T-801: テスト・ビルド・最終レポート

**実行コマンド**:
```bash
npm run build
```

**結果**: ✅ ビルド成功

```
✓ Compiled successfully
✓ Generating static pages (37/37)

Route (app)                              Size     First Load JS
├ ○ /instructor/services                 3.58 kB        99.6 kB
├ ○ /instructor/reservations             1.84 kB        89.3 kB
├ ○ /instructor/schedule                 3.1 kB         99.1 kB
├ ○ /instructor/settings                 3.67 kB        99.7 kB
├ ○ /manage/admin                        3.89 kB         182 kB
... (全37ルート)
```

**既知の警告**:
- ESLint: `Invalid Options: - Unknown options: useEslintrc, extensions`
  - Next.js 14とESLint 9の互換性問題（別タスクで対応推奨）

---

## URL別画面挙動要約

| URL | 未ログイン | user | instructor | admin |
|-----|-----------|------|------------|-------|
| `/` | トップページ表示 | トップページ表示 | トップページ表示 | トップページ表示 |
| `/user` | `/` へリダイレクト | ダッシュボード表示 | `/instructor` へリダイレクト | `/manage/admin` へリダイレクト |
| `/user/profile/setup` | `/` へリダイレクト | プロフィール設定表示 | `/instructor` へリダイレクト | `/manage/admin` へリダイレクト |
| `/instructor` | `/` へリダイレクト | `/user` へリダイレクト | ダッシュボード表示 | `/manage/admin` へリダイレクト |
| `/instructor/services` | `/` へリダイレクト | `/user` へリダイレクト | サービス管理表示 | `/manage/admin` へリダイレクト |
| `/instructor/reservations` | `/` へリダイレクト | `/user` へリダイレクト | 予約管理表示 | `/manage/admin` へリダイレクト |
| `/instructor/schedule` | `/` へリダイレクト | `/user` へリダイレクト | スケジュール表示 | `/manage/admin` へリダイレクト |
| `/instructor/settings` | `/` へリダイレクト | `/user` へリダイレクト | 設定表示 | `/manage/admin` へリダイレクト |
| `/instructor/profile/setup` | `/` へリダイレクト | `/user` へリダイレクト | プロフィール設定表示 | `/manage/admin` へリダイレクト |
| `/manage/login` | ログインフォーム表示 | ログインフォーム表示 | ログインフォーム表示 | `/manage/admin` へリダイレクト |
| `/manage/admin` | `/manage/login` へリダイレクト | `/manage/login` へリダイレクト | `/manage/login` へリダイレクト | 管理ダッシュボード表示（サイドバー開） |

---

## 変更ファイル一覧

### 新規作成
- `lib/auth/displayName.ts`
- `app/instructor/(protected)/services/page.tsx`
- `app/instructor/(protected)/reservations/page.tsx`
- `app/instructor/(protected)/schedule/page.tsx`
- `app/instructor/(protected)/settings/page.tsx`
- `claudedocs/instruction-13-report.md`

### 修正
- `app/user/(protected)/layout.tsx`
- `app/instructor/(protected)/layout.tsx`
- `app/manage/(protected)/layout.tsx`
- `app/user/(protected)/profile/setup/page.tsx`
- `app/instructor/(protected)/profile/setup/page.tsx`
- `lib/api/profile.ts`
- `components/layout/Sidebar.tsx`
- `DOCS/AUTH.md`
- `DOCS/flows/login-flow.md`

---

## 残課題・備考

1. **ESLint設定**: Next.js 14 + ESLint 9 の互換性問題により警告発生
   - ビルド自体は成功するため、別タスクで対応推奨

2. **ブラウザテスト**: 本レポート作成時点でCognito実環境でのE2Eテストは未実施
   - 開発サーバー起動後、実際のログイン/リダイレクト動作の確認を推奨

3. **プロフィール入力バリデーション**: 表示名の禁止ワードチェックは日本語・英語の基本的なワードのみ
   - 運用に応じて禁止ワードリストの拡充を検討

---

*レポート作成: Claude Code (claude.ai/code)*
