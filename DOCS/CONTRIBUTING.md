# 開発ガイドライン

## 概要

Coordy（コーディ）プラットフォームの開発に貢献する際のガイドラインです。

---

## コントリビューション方針

### 行動規範

- **尊重**: すべての貢献者を尊重する
- **建設的**: フィードバックは建設的に
- **協力**: チームワークを重視
- **透明性**: 問題は早めに共有

---

## 開発フロー

### 1. Issue 作成

新機能や バグ修正を始める前に、必ず Issue を作成します。

**Issue テンプレート:**

```markdown
## 概要
[簡潔な説明]

## 背景・目的
[なぜこの変更が必要か]

## 提案する解決策
[どのように実装するか]

## 代替案
[他の実装方法]

## チェックリスト
- [ ] 設計レビュー
- [ ] 実装
- [ ] テスト
- [ ] ドキュメント更新
```

### 2. ブランチ作成

```bash
# ブランチ命名規則
feature/<issue-number>-<short-description>  # 新機能
fix/<issue-number>-<short-description>      # バグ修正
refactor/<short-description>                # リファクタリング
docs/<short-description>                    # ドキュメント
test/<short-description>                    # テスト追加

# 例
git checkout -b feature/123-user-profile
git checkout -b fix/456-login-error
```

### 3. 開発

```bash
# コーディング
# （コーディング規約に従う）

# 定期的にコミット
git add .
git commit -m "feat: add user profile component"

# リモートにプッシュ
git push origin feature/123-user-profile
```

### 4. Pull Request 作成

**PRテンプレート:**

```markdown
## 概要
[変更内容の簡潔な説明]

## 関連Issue
Closes #123

## 変更内容
- [ ] コンポーネント追加
- [ ] API実装
- [ ] テスト追加
- [ ] ドキュメント更新

## テスト方法
1. ローカルサーバー起動
2. /user/profile にアクセス
3. プロフィール編集が可能か確認

## スクリーンショット
[必要に応じて画像を添付]

## チェックリスト
- [ ] ESLint エラーなし
- [ ] TypeScript エラーなし
- [ ] テスト追加済み
- [ ] ドキュメント更新済み
- [ ] レビュー依頼済み
```

### 5. コードレビュー

- **レビュアー指定**: 2名以上
- **レビュー観点**:
  - コーディング規約準拠
  - テストカバレッジ
  - パフォーマンス
  - セキュリティ
  - ドキュメント

### 6. マージ

- **承認**: 2名以上の承認が必要
- **マージ方法**: Squash and merge
- **ブランチ削除**: マージ後に自動削除

---

## コーディング規約

### TypeScript

```typescript
// ✅ Good
interface UserProps {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): User | null {
  // ...
}

// ❌ Bad
function getUserById(id: any) {
  // ...
}
```

### React コンポーネント

```typescript
// ✅ Good: 関数コンポーネント + TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Bad: PropTypes, クラスコンポーネント
class Button extends React.Component {
  // ...
}
```

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| **ファイル** | PascalCase (コンポーネント), camelCase (その他) | `UserProfile.tsx`, `authUtils.ts` |
| **コンポーネント** | PascalCase | `ServiceCard`, `TodoList` |
| **関数** | camelCase | `getUserById`, `handleSubmit` |
| **定数** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| **型/インターフェース** | PascalCase | `User`, `ServiceProps` |
| **CSS クラス** | kebab-case | `user-profile`, `btn-primary` |

### フォルダ構造

```
src/
├── app/                    # Next.js App Router ページ
├── components/
│   ├── ui/                # 基本UIコンポーネント
│   ├── features/          # 機能別コンポーネント
│   └── layouts/           # レイアウトコンポーネント
├── lib/                   # ユーティリティ、API クライアント
├── hooks/                 # カスタムフック
├── contexts/              # React Context
├── types/                 # 型定義
└── styles/                # グローバルスタイル
```

---

## テスト規約

### テストカバレッジ

- **目標**: 80%以上
- **必須**: 主要なビジネスロジック、API、コンポーネント

### テストの書き方

```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders button with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

---

## コミットメッセージ規約

### Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

| Type | 説明 | 例 |
|------|------|-----|
| **feat** | 新機能 | `feat(auth): add login functionality` |
| **fix** | バグ修正 | `fix(calendar): resolve date picker bug` |
| **docs** | ドキュメント | `docs(readme): update setup instructions` |
| **style** | コードフォーマット | `style(ui): improve button styles` |
| **refactor** | リファクタリング | `refactor(api): optimize database queries` |
| **test** | テスト追加 | `test(components): add ServiceCard tests` |
| **chore** | ビルド・ツール | `chore(deps): update dependencies` |

### 例

```bash
# Good
git commit -m "feat(auth): add login functionality"
git commit -m "fix(reservation): resolve date picker bug"
git commit -m "docs(api): update API documentation"

# Bad
git commit -m "update"
git commit -m "fix bug"
git commit -m "WIP"
```

---

## コードレビュー規約

### レビュアーの責任

- **迅速なレビュー**: 24時間以内
- **建設的なフィードバック**: 具体的な改善案を提示
- **承認基準**: コーディング規約、テスト、パフォーマンス

### レビューコメント

```markdown
# ✅ Good
「この部分はuseMemoを使って最適化できます。」
「テストケースに〇〇のパターンも追加してください。」

# ❌ Bad
「ダメです」
「書き直してください」
```

### レビューチェックリスト

- [ ] コーディング規約準拠
- [ ] TypeScript エラーなし
- [ ] テストカバレッジ十分
- [ ] パフォーマンス問題なし
- [ ] セキュリティ問題なし
- [ ] ドキュメント更新済み

---

## ドキュメント規約

### README更新

新機能追加時は README.md を更新します。

### API ドキュメント

新しいAPIエンドポイントを追加した場合、`DOCS/API.md` を更新します。

### コンポーネントドキュメント

```typescript
/**
 * ユーザープロフィールカード
 *
 * @param user - ユーザー情報
 * @param onEdit - 編集ボタンクリック時のコールバック
 *
 * @example
 * ```tsx
 * <UserProfileCard
 *   user={currentUser}
 *   onEdit={() => console.log('Edit')}
 * />
 * ```
 */
export function UserProfileCard({ user, onEdit }: UserProfileCardProps) {
  // ...
}
```

---

## パフォーマンス規約

### 最適化手法

```typescript
// ✅ Good: useMemo で計算結果をメモ化
const filteredServices = useMemo(
  () => services.filter(s => s.category === selectedCategory),
  [services, selectedCategory]
);

// ✅ Good: useCallback でコールバックをメモ化
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

// ✅ Good: 動的インポート
const HeavyComponent = dynamic(() => import('./HeavyComponent'));

// ❌ Bad: 毎回再計算
const filteredServices = services.filter(s => s.category === selectedCategory);
```

---

## セキュリティ規約

### 入力検証

```typescript
// ✅ Good: Zod でバリデーション
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  age: z.number().min(0).max(120)
});

// ❌ Bad: バリデーションなし
function createUser(data: any) {
  // ...
}
```

### 環境変数

```typescript
// ✅ Good: 環境変数チェック
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

// ❌ Bad: ハードコード
const stripeKey = 'sk_test_xxxxxxxxxxxxx';
```

---

## トラブルシューティング

### よくある問題

#### ビルドエラー

```bash
# キャッシュクリア
rm -rf .next
npm run build
```

#### テスト失敗

```bash
# 単一テスト実行
npm run test -- Button.test.tsx

# デバッグモード
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Stripe Documentation](https://stripe.com/docs)

---

*最終更新日: 2025-10-11*
