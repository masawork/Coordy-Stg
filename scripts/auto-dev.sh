#!/bin/bash
#
# Coordy 自動開発スクリプト
#
# Claude Codeを起動し、TASKS.mdから未完了タスクを取得して
# 実装→lint→build→commit→pushまで自動で回す。
#
# 使い方:
#   ./scripts/auto-dev.sh           # 1タスク実行
#   ./scripts/auto-dev.sh --all     # 全タスク連続実行
#   ./scripts/auto-dev.sh --dry-run # 何をやるか確認のみ
#
# crontab設定例（毎日9時に1タスク実行）:
#   0 9 * * * cd ~/Desktop/work/Coordy-Stg && ./scripts/auto-dev.sh >> ~/logs/auto-dev.log 2>&1
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$HOME/logs"
LOG_FILE="$LOG_DIR/auto-dev-$(date +%Y%m%d-%H%M%S).log"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

# 引数パース
MODE="single"  # single | all | dry-run
for arg in "$@"; do
  case "$arg" in
    --all) MODE="all" ;;
    --dry-run) MODE="dry-run" ;;
  esac
done

echo "========================================" | tee -a "$LOG_FILE"
echo "[$(date)] Coordy Auto Dev - mode: $MODE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

cd "$PROJECT_DIR"

# --- dry-runモード ---
if [ "$MODE" = "dry-run" ]; then
  echo "" | tee -a "$LOG_FILE"
  echo "TASKS.mdから未完了タスクを確認中..." | tee -a "$LOG_FILE"
  claude -p "DOCS/TASKS.mdを読んで、未完了のタスク（取り消し線がついていないTODOとDEBT）を一覧で表示してください。見積もりサイズ順（小→中→大）でソートしてください。" 2>&1 | tee -a "$LOG_FILE"
  exit 0
fi

# --- 実行プロンプト ---
PROMPT_SINGLE='以下の手順を自律的に実行してください:

1. DOCS/TASKS.mdを読み、未完了のタスク（~~取り消し線~~がついていないTODO-XXまたはDEBT-XX）を特定する
2. 見積が小さい順に1つ選ぶ（小→中→大の順）
3. 選んだタスクの実装に必要な仕様をDOCS/配下のドキュメント（REQUIREMENTS.md, API.md, DATABASE.md, SCREENS.md等）から確認する
4. feature/todo-XX-説明 のブランチを作成（既にfeatureブランチにいる場合はそのまま使う）
5. 実装する
6. npm run lint を実行し、エラーがあれば修正
7. npm run build を実行し、エラーがあれば修正
8. 変更ファイルをgit addしてcommitする（メッセージ: "feat: 説明 (TODO-XX)"）
9. DOCS/TASKS.mdの該当タスクを完了済みに更新してcommitする
10. git push -u origin ブランチ名

全タスクが完了している場合は、DOCS/REQUIREMENTS.mdとコードを比較して、仕様書に記載されているが実装されていない機能を特定し、新しいTODOとしてTASKS.mdに追加してから実装を開始してください。

エラーが起きたら修正を試みてください。3回修正しても解決しない場合はスキップして次のタスクに進んでください。'

PROMPT_ALL='以下の手順を自律的に繰り返し実行してください:

1. DOCS/TASKS.mdを読み、未完了のタスク（~~取り消し線~~がついていないTODO-XXまたはDEBT-XX）を全て特定する
2. 見積が小さい順にソートする（小→中→大の順）
3. 各タスクについて順番に:
   a. タスクの実装に必要な仕様をDOCS/配下のドキュメントから確認する
   b. 実装する
   c. npm run lint を実行し、エラーがあれば修正
   d. npm run build を実行し、エラーがあれば修正
   e. 変更ファイルをgit addしてcommitする（メッセージ: "feat: 説明 (TODO-XX)"）
   f. DOCS/TASKS.mdの該当タスクを完了済みに更新してcommitする
4. 全タスクが完了したら git push -u origin ブランチ名
5. 全タスク完了後、DOCS/REQUIREMENTS.mdとコードを比較して、仕様書に記載されているが実装されていない機能を特定し、新しいTODOとしてTASKS.mdに追加する

エラーが起きたら修正を試みてください。3回修正しても解決しない場合はスキップして次のタスクに進んでください。'

# --- 実行 ---
if [ "$MODE" = "single" ]; then
  echo "1タスク実行モード" | tee -a "$LOG_FILE"
  claude -p "$PROMPT_SINGLE" --allowedTools "Edit,Write,Bash,Read,Glob,Grep" 2>&1 | tee -a "$LOG_FILE"
elif [ "$MODE" = "all" ]; then
  echo "全タスク連続実行モード" | tee -a "$LOG_FILE"
  claude -p "$PROMPT_ALL" --allowedTools "Edit,Write,Bash,Read,Glob,Grep" 2>&1 | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "[$(date)] 完了" | tee -a "$LOG_FILE"
echo "ログ: $LOG_FILE"
