---
name: test-runner
description: Coordyのテストを自動生成・実行する。不足しているテストを特定し、作成してカバレッジを上げる。
trigger: テスト、テスト実行、テスト作成、カバレッジ、Jest
---

# テスト自動化スキル

## 対象

Coordy-Stg プロジェクト（Next.js 16 + TypeScript）

## テスト実行

```bash
npm test                           # 全テスト実行
npm test -- --testPathPattern=対象  # 特定テスト実行
npm test -- --coverage             # カバレッジ付き
```

## テスト作成の優先順位

1. **lib/utils/** — ユーティリティ関数（純粋関数、テストしやすい）
2. **lib/api/*-client.ts** — クライアントAPIヘルパー（モック必要）
3. **lib/partner/** — パートナー認証・Webhook（セキュリティ重要）
4. **lib/mail/** — メール送信（テンプレート検証）
5. **app/api/*/route.ts** — APIルート（結合テスト）

## テストファイル配置

```
lib/utils/__tests__/       ← ユーティリティのテスト
lib/partner/*.test.ts      ← パートナー系のテスト
lib/mail/*.test.ts         ← メール系のテスト
app/api/**/*.test.ts       ← APIルートのテスト
```

## テスト作成ルール

### 基本構造
```typescript
import { 対象関数 } from '../対象ファイル';

describe('対象関数名', () => {
  describe('正常系', () => {
    it('期待する動作の説明（日本語OK）', () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('異常系', () => {
    it('エラー時の動作', () => {
      // ...
    });
  });

  describe('境界値', () => {
    it('空文字/null/undefinedの処理', () => {
      // ...
    });
  });
});
```

### Supabase/Prismaのモック
```typescript
// Supabase Auth のモック
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-auth-id' } }
      })
    }
  }))
}));

// Prisma のモック
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    // 必要なモデルを追加
  }
}));
```

### やってはいけないこと
- スナップショットテスト禁止
- .env の実際の値をテストに使わない
- テスト間で状態を共有しない
- any 型を使わない

## テスト実行後

1. 失敗したテストがあれば原因を特定して修正
2. カバレッジが下がった場合は追加テストを作成
3. 結果を報告し、commit に含める
