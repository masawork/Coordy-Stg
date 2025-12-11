# 作業レポート: Instruction/11.txt の実装

## 概要
4つのバグ修正タスクを完了しました。

---

## Task 1: `/` 初回アクセス時 Header ログインボタンが効かない問題

### 原因分析
- Next.js App RouterにおけるSSR/CSRの hydration 問題
- `Button` コンポーネントが `'use client'` ディレクティブを持っていなかった
- `Header` コンポーネントでモーダルがハイドレーション前にレンダリングされていた

### 修正内容

**1. `components/common/Button.tsx`**
- `'use client'` ディレクティブを追加

**2. `components/common/Header.tsx`**
- `mounted` state を追加し、クライアントサイドでのみモーダルを表示
- `handleOpenModal` でマウント確認後にモーダルを開くように変更

**3. `app/providers.tsx`**
- Sheet コンポーネントが閉じている時は DOM にレンダリングしないよう条件を追加

---

## Task 2: `/manage/login` で admin ログインできない問題

### 原因分析
- Cognito で FORCE_CHANGE_PASSWORD 状態のユーザーが NEW_PASSWORD_REQUIRED チャレンジを返す
- `loginUser` 関数がこのチャレンジを処理していなかった
- ログイン画面に新パスワード設定 UI がなかった

### 修正内容

**1. `lib/auth/cognito.ts`**
- `LoginResult` インターフェースを追加（`user` と `nextStep` を返す）
- `loginUser` 関数を修正して NEW_PASSWORD_REQUIRED を検出・返却
- `completeNewPasswordChallenge` 関数を新規追加
- `confirmSignIn` をインポート追加

**2. `lib/auth/index.ts`**
- `completeNewPasswordChallenge` と `LoginResult` をエクスポート

**3. `app/manage/login/page.tsx`**
- `loginStep` state を追加（'login' | 'new_password'）
- `newPassword`, `confirmNewPassword` state を追加
- `handleSubmit` で NEW_PASSWORD_REQUIRED を検出してステップ切り替え
- `handleNewPasswordSubmit` 関数を新規追加
- 新パスワード設定フォーム UI を追加

---

## Task 3: `/user` の表示名がプロフィールの表示名にならない問題

### 原因分析
- `ClientProfileInput` インターフェースに `displayName` フィールドがなかった
- `createClientProfile` / `updateClientProfile` で `displayName` を保存していなかった
- プロフィール設定画面で `displayName` を DB に保存していなかった

### 修正内容

**1. `lib/api/profile.ts`**
- `ClientProfileInput` に `displayName?: string` を追加
- `createClientProfile` で `displayName` を保存するよう修正
- `updateClientProfile` で `displayName` を保存するよう修正

**2. `app/user/(protected)/profile/setup/page.tsx`**
- `profileInput` に `displayName` を追加
- 既存プロフィール読み込み時、DB の `displayName` を優先的に使用

---

## Task 4: `/instructor/profile/setup` が読み込み中のまま進まない問題

### 原因分析
- `useEffect` の依存配列に `pathname` が含まれていなかった
- catch ブロックで `setLoading(false)` が呼ばれていなかった
- 認証エラー時にローディング状態が解除されずに永続していた

### 修正内容

**1. `app/instructor/(protected)/layout.tsx`**
- `useEffect` の依存配列に `pathname` を追加
- catch ブロックで `setLoading(false)` を追加

**2. `app/user/(protected)/layout.tsx`**（同様の問題を予防的に修正）
- catch ブロックで `setLoading(false)` を追加

---

## 修正ファイル一覧

| ファイル | 修正内容 |
|---------|---------|
| `components/common/Button.tsx` | 'use client' 追加 |
| `components/common/Header.tsx` | mounted state 追加、条件付きモーダルレンダリング |
| `app/providers.tsx` | Sheet の条件付きレンダリング |
| `lib/auth/cognito.ts` | LoginResult 型、completeNewPasswordChallenge 関数追加、loginUser 修正 |
| `lib/auth/index.ts` | 新しいエクスポート追加 |
| `app/manage/login/page.tsx` | 新パスワードチャレンジ UI 追加 |
| `lib/api/profile.ts` | displayName フィールド追加、create/update 関数修正 |
| `app/user/(protected)/profile/setup/page.tsx` | displayName を DB に保存 |
| `app/instructor/(protected)/layout.tsx` | 依存配列修正、エラー時 loading 解除 |
| `app/user/(protected)/layout.tsx` | エラー時 loading 解除 |

---

## 検証事項

1. **Task 1**: `/` ページでログインボタンをクリックしてモーダルが表示されることを確認
2. **Task 2**: FORCE_CHANGE_PASSWORD 状態の admin ユーザーでログインして新パスワード設定画面が表示されることを確認
3. **Task 3**: プロフィール設定で表示名を入力・保存し、ダッシュボードに反映されることを確認
4. **Task 4**: `/instructor/profile/setup` ページが正常に表示されることを確認
