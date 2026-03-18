---
name: dev-pipeline
description: Coordyの開発を自動で進める。TASKS.mdからTODOを取得→実装→lint→build→ブラウザ確認→commit→pushの一連パイプライン。
trigger: 開発進める、次のタスク、パイプライン実行、自動開発、TODO進める
---

# 開発パイプライン

Coordy-Stgプロジェクトの開発を一連の流れで自動実行する。

## パイプライン全体フロー

```
1. タスク選定 → 2. 実装 → 3. Lint → 4. Build → 5. ブラウザ確認 → 6. Commit → 7. Push
```

## Step 1: タスク選定

1. `DOCS/TASKS.md` を読み、未実装タスク（TODO-XX）を確認する
2. 高優先度 → 中優先度 → 低優先度の順で、見積が「小」または「中」のタスクを選ぶ
3. 選んだタスクをユーザーに提示し、承認を得る
4. 承認されたら新しいブランチを切る:
   ```bash
   git checkout -b feature/todo-XX-簡潔な説明
   ```

## Step 2: 実装

1. CLAUDE.md のアーキテクチャとConventionsに従う
2. 関連するDOCSファイル（API.md, DATABASE.md, SCREENS.md）を参照する
3. 既存のコードパターンに合わせる:
   - APIルート: `app/api/[feature]/route.ts` のパターンに従う
   - クライアントAPI: `lib/api/*-client.ts` の命名規則
   - UI言語: 日本語
4. 1タスクにつき1つの機能に集中する（スコープを広げない）

## Step 3: Lint チェック

```bash
npm run lint
```

- エラーがあれば修正してから次へ進む
- warningは許容するがerrorは0にする

## Step 4: Build チェック

```bash
npm run build
```

- ビルドエラーがあれば修正する
- 型エラー（TypeScript）は全て解消する

## Step 5: ブラウザ確認

1. `npm run dev` でdev serverを起動
2. 実装した機能に関連するページをブラウザで開く
3. 以下を確認:
   - ページが正常に表示されるか
   - エラーがコンソールに出ていないか
   - 基本的なUI操作ができるか
4. スクリーンショットを撮って確認結果を報告

## Step 6: Commit

```bash
git add <変更したファイル>
git commit -m "feat: 簡潔な説明 (TODO-XX)"
```

- コミットメッセージは Conventional Commits に従う
  - feat: 新機能
  - fix: バグ修正
  - refactor: リファクタリング
- コミットの粒度: 1タスク = 1コミット

## Step 7: Push

```bash
git push -u origin feature/todo-XX-簡潔な説明
```

- pushする前にユーザーに確認を取る
- push後、PRの作成が必要か確認する

## 中断ルール

以下の場合はパイプラインを中断してユーザーに報告する:
- Lintエラーが10個以上ある
- Buildが失敗し、原因が既存コードにある
- タスクの見積が「大」以上で、実装に2時間以上かかりそうな場合
- DB スキーマの変更が必要な場合（prisma schema変更は要確認）
