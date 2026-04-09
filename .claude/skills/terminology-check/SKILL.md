---
name: terminology-check
description: UIコードの用語統一チェック。「サービス」「インストラクター」「クリエイター」等の禁止用語がユーザー向けテキストに残っていないか検出する。Use when user says "用語チェック", "用語確認", "terminology", "表現チェック".
---

# UI用語統一チェック

Coordyのマーケットプレイス用語ルールに基づいてUIコードを検査する。

## 用語ルール

| 禁止（旧表現） | 正しい表現 | 備考 |
|---------------|-----------|------|
| サービス | 商品 | ユーザー向けテキスト全般 |
| サービス一覧 | 商品一覧 | |
| サービス作成 | 出品 / 出品する | |
| サービス管理 | 出品管理 / 商品管理 | |
| インストラクター | 出品者 | ユーザーから見える文脈 |
| クリエイター | 出品者 | |
| レッスン | 商品 | |
| 講師 | 出品者 | |

### 例外（変更不要）
- コード変数名・関数名・型名（`serviceId`, `instructorId`等）
- APIルートパス（`/api/services`等）
- import文
- コメント（UIに表示されない）
- インストラクター自身のポータルのログイン画面の見出し（「インストラクターログイン」は許可）
- Prismaモデル名・Enum値

## チェック手順

### Step 1: 禁止用語スキャン
以下のgrepを実行して、ユーザー向けテキストに禁止用語が残っていないか確認:

```bash
# app/ と components/ 配下の .tsx ファイルのみ対象
grep -rn 'サービス' --include='*.tsx' app/ components/ | grep -v 'node_modules' | grep -v '\.test\.' | grep -v '/api/'
grep -rn 'インストラクター' --include='*.tsx' app/ components/ | grep -v 'node_modules' | grep -v '\.test\.' | grep -v '/api/'
grep -rn 'クリエイター' --include='*.tsx' app/ components/ | grep -v 'node_modules' | grep -v '\.test\.' | grep -v '/api/'
grep -rn 'レッスン' --include='*.tsx' app/ components/ | grep -v 'node_modules' | grep -v '\.test\.'
grep -rn '講師' --include='*.tsx' app/ components/ | grep -v 'node_modules' | grep -v '\.test\.'
```

### Step 2: 結果フィルタリング
各ヒットについて以下を判定:
1. **変数名・関数名内** → 無視（例: `serviceId`, `instructorName`）
2. **import文内** → 無視
3. **コメント内**（`//` or `{/* */}`内）→ 無視
4. **JSX文字列リテラル内**（`"サービス"`, `'サービス'`）→ **要修正**
5. **テンプレートリテラル内のテキスト部分** → **要修正**

### Step 3: 報告
```
## 用語チェック結果
- 検出数: X 件
- 要修正: Y 件
- 例外（コード内）: Z 件

### 要修正箇所:
- ファイル:行番号 - 「旧表現」→「新表現」
```

### Step 4: 自動修正（ユーザー承認後）
報告後、修正を提案し承認を得てから一括修正する。
