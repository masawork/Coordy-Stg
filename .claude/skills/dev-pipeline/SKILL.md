---
name: dev-pipeline
description: Coordy-Stgの自律型開発パイプライン。TASKS.mdからTODOを取得し、仕様確認→実装→lint→build→テスト→commit→pushを自動実行する。全タスク完了時は仕様書から不足機能を検出して新規タスク化する。Use when user says "開発進める", "次のタスク", "パイプライン実行", "自動開発", "TODO進める". Next.js 16 + TypeScript + Prisma.
---

# 開発パイプライン（完全自律版）

## Important
- ユーザーの介入なしにタスクを完了させることが目標
- 各ステップで最大3回リトライ、3回失敗でスキップして次へ
- DBスキーマ変更（prisma schema）が必要な場合はスキップしてログ記録

## Pipeline Flow

```
Step 1: タスク選定 → Step 2: 仕様確認 → Step 3: 実装
→ Step 4: Lint → Step 5: Build → Step 6: テスト
→ Step 7: Commit → Step 8: TASKS.md更新 → Step 9: Push
→ (次のタスクへループ)
```

### Step 0: 仕様ギャップ検出（全タスク完了時のみ）
1. `DOCS/REQUIREMENTS.md` の全機能ID（AUTH-XX, PROF-XX, SVC-XX, RSV-XX, PAY-XX, CMP-XX, NTF-XX, FAV-XX, ADM-XX, EXT-XX）を確認
2. 各機能について対応する実装を検証:
   - APIルート: `app/api/`
   - 画面: `app/`配下のpage.tsx
   - クライアントAPI: `lib/api/`
3. 未実装機能を新TODOとしてTASKS.mdに追記 → Step 1へ

### Step 1: タスク選定
1. `DOCS/TASKS.md` を読む
2. ~~取り消し線~~なしのTODO-XX / DEBT-XX を抽出
3. 見積サイズ順ソート: 小 → 中 → 大
4. 最小タスクを選択
5. 全完了 → Step 0へ

### Step 2: 仕様確認
以下のドキュメントを確認:
- `DOCS/REQUIREMENTS.md` — 機能仕様
- `DOCS/API.md` — APIエンドポイント
- `DOCS/DATABASE.md` — テーブル定義
- `DOCS/SCREENS.md` — 画面定義
- `CLAUDE.md` — コーディング規約

### Step 3: 実装
```bash
# 既存の類似コードを参考にする
grep -r "類似機能のキーワード" app/ lib/
```
**規約:**
- APIルート: `app/api/[feature]/route.ts`
- クライアントAPI: `lib/api/*-client.ts`
- UI言語: 日本語 / コメント: 日本語
- TypeScript strict, `any`禁止
- 関数コンポーネントのみ
- Next.js 16: params は `Promise<{ id: string }>` で await
- 1タスク = 1機能（スコープを広げない）

### Step 4: Lint
```bash
npm run lint
```
エラー → 修正 → 再実行（最大3回）

### Step 5: Build
```bash
npm run build
```
エラー → 修正 → 再実行（最大3回）

### Step 6: テスト
```bash
npm test -- --passWithNoTests
```
- 新関数にはテスト作成（`test-runner`スキル参照）
- 既存テスト破損 → 修正

### Step 7: Commit
```bash
git add <変更ファイル>
git commit -m "feat: 説明 (TODO-XX)"
```
Conventional Commits: feat / fix / refactor / docs

### Step 8: TASKS.md更新
1. 該当行に ~~取り消し線~~ + コミットハッシュ追記
2. `git commit -m "docs: TASKS.md更新 - TODO-XXを完了済みに"`

### Step 9: Push
```bash
git push -u origin <現在のブランチ名>
```

## Troubleshooting
- **lint/buildが3回失敗** → エラーログを記録してタスクをスキップ、次へ進む
- **「大」タスクが複雑すぎる** → サブタスクに分割してTASKS.mdに追記
- **prisma schema変更が必要** → スキップしてログ記録（手動対応が必要）
- **テストが壊れた** → 原因を特定し修正。修正不能なら既存テストの変更点を記録
