---
name: pr-ready
description: PR作成・更新を自動化。変更差分を分析し、適切なタイトル・サマリーでPRを作成/更新する。Use when user says "PR作って", "PR更新", "PRお願い", "プルリク", "pr-ready".
---

# PR自動化スキル

ブランチの全変更を分析し、PRを作成または更新する。

## 手順

### Step 1: 品質検証
まず `/validate` スキルと同等のチェックを実行:
```bash
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```
失敗した場合は修正してから続行。

### Step 2: 変更分析
```bash
git log main..HEAD --oneline
git diff main..HEAD --stat
```

### Step 3: PR存在確認
```bash
gh pr list --head $(git branch --show-current)
```

### Step 4A: 新規PR作成（PRが存在しない場合）
差分を分析して日本語のPRタイトル・サマリーを生成:

```bash
gh pr create --title "タイトル" --body "$(cat <<'EOF'
## Summary
- 変更点1
- 変更点2
- 変更点3

## Test plan
- [x] Jest テスト全パス
- [x] ビルド正常完了
- [ ] ブラウザ確認: ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 4B: PR更新（PRが既に存在する場合）
新しいコミットの内容を反映してPRのタイトルとbodyを更新:

```bash
gh pr edit <PR番号> --title "新タイトル" --body "$(cat <<'EOF'
## Summary
（全コミットの変更を網羅）

## Test plan
- [x] ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 5: 結果報告
PR URLをユーザーに報告。

## PRタイトルのルール
- 日本語で記述
- `feat:` / `fix:` / `refactor:` プレフィックス使用
- 70文字以内
- 主要な変更を端的に表現

## Summaryのルール
- 変更カテゴリ別に箇条書き（3-8項目）
- テスト結果を含める
- ブラウザ確認が必要な項目をチェックリスト化
