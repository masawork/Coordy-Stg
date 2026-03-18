---
name: dev-pipeline
description: Coordyの開発を自動で進める。TASKS.mdからTODOを取得→仕様確認→実装→lint→build→テスト→commit→pushの一連パイプライン。全タスク完了時は仕様書から不足機能を検出して新規タスク化する。
trigger: 開発進める、次のタスク、パイプライン実行、自動開発、TODO進める
---

# 開発パイプライン（完全自律版）

Coordy-Stgプロジェクトの開発を一連の流れで自動実行する。
ユーザーの介入なしにタスクを完了させることを目標とする。

## パイプライン全体フロー

```
1. タスク選定 → 2. 仕様確認 → 3. 実装 → 4. Lint → 5. Build → 6. テスト → 7. Commit → 8. TASKS.md更新 → 9. Push → (次のタスクへ)
```

## Step 1: タスク選定

1. `DOCS/TASKS.md` を読む
2. ~~取り消し線~~がついていないTODO-XX / DEBT-XX を抽出する
3. 見積サイズ順でソート: 小 → 中 → 大
4. 最も小さいタスクを選ぶ
5. **全タスク完了している場合** → Step 0（仕様ギャップ検出）に進む

## Step 0: 仕様ギャップ検出（全タスク完了時のみ）

1. `DOCS/REQUIREMENTS.md` を読む
2. 全機能ID（AUTH-XX, PROF-XX, SVC-XX, RSV-XX, PAY-XX, CMP-XX, NTF-XX, FAV-XX, ADM-XX, EXT-XX）を確認
3. 各機能について、対応する実装コードが存在するか検証する:
   - APIルート（`app/api/`）
   - 画面（`app/`配下のpage.tsx）
   - クライアントAPI（`lib/api/`）
4. 仕様にあるが未実装の機能を新しいTODOとしてTASKS.mdに追記
5. Step 1に戻る

## Step 2: 仕様確認

選んだタスクについて、以下のドキュメントを確認する:
- `DOCS/REQUIREMENTS.md` — 機能の詳細仕様
- `DOCS/API.md` — APIエンドポイント仕様
- `DOCS/DATABASE.md` — テーブル定義・リレーション
- `DOCS/SCREENS.md` — 画面定義・遷移
- `CLAUDE.md` — アーキテクチャとコーディング規約

## Step 3: 実装

### 規約
- APIルート: `app/api/[feature]/route.ts` パターン
- クライアントAPI: `lib/api/*-client.ts` 命名
- UI言語: 日本語
- 型: TypeScript strict、any禁止
- 関数コンポーネントのみ（class禁止）
- Next.js 16: params は `Promise<{ id: string }>` で await

### 実装手順
1. 既存の類似コードを参考にする（`grep`で探す）
2. 1タスク = 1機能に集中（スコープを広げない）
3. コメントは日本語で書く

## Step 4: Lint

```bash
npm run lint
```
- エラー → 修正して再実行（最大3回）
- 3回失敗 → エラーをログに記録してスキップ

## Step 5: Build

```bash
npm run build
```
- エラー → 修正して再実行（最大3回）
- 3回失敗 → エラーをログに記録してスキップ

## Step 6: テスト

```bash
npm test -- --passWithNoTests
```
- 新しく作った関数にはテストを書く（`test-runner`スキル参照）
- 既存テストが壊れたら修正する

## Step 7: Commit

```bash
git add <変更したファイル>
git commit -m "feat: 説明 (TODO-XX)"
```
- Conventional Commits: feat / fix / refactor / docs
- 1タスク = 1コミット

## Step 8: TASKS.md更新

1. `DOCS/TASKS.md` の該当行を ~~取り消し線~~ + コミットハッシュで更新
2. 更新をcommitする: `docs: TASKS.md更新 - TODO-XXを完了済みに`

## Step 9: Push

```bash
git push -u origin <現在のブランチ名>
```

## エラーハンドリング

- 各ステップで最大3回リトライする
- 3回失敗したタスクはスキップして次に進む
- DBスキーマ変更（prisma schema）が必要な場合はスキップしてログに記録
- 「大」以上のタスクで複雑度が高い場合は分割を検討する
