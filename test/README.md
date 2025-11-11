# Amplify 認証テスト環境

既存コードに影響を与えず、Amplifyの標準構成で動作確認を行うためのテスト環境です。

## 📁 ディレクトリ構成

```
/app/
└── test/
    └── signup/
        └── page.tsx       # 簡易登録フォーム（Next.js App Router）

/test/
├── amplify/
│   └── auth/resource.ts   # Amplify Auth 最小構成
├── lib/
│   └── amplifyClient.ts   # Amplify初期化
└── README.md              # このファイル
```

## 🎯 目的

- Amplify公式ドキュメント（Quickstart / Auth Setup）準拠の最小構成で動作確認
- 既存 `/app/signup/user` などに影響を与えない
- 動作確認後、少しずつ本体側へ移植

## ⚙️ 動作確認手順

### 1. Amplify バックエンドをデプロイ

```bash
npx ampx sandbox --once
```

※ `/test/amplify` の構成がデプロイされ、`amplify_outputs.json` が生成されます

### 2. 開発サーバーを起動

```bash
npm run dev
```

### 3. テストページにアクセス

ブラウザで以下にアクセス：

```
http://localhost:3000/test/signup
```

### 4. 新規登録をテスト

- **メールアドレス**: 実際に受信可能なメールアドレス
- **名前**: 任意（省略可能）
- **パスワード**: 8文字以上、大文字・小文字・数字・記号を含む

### 5. 成功確認

- ✅ 「新規登録成功！」のアラートが表示される
- ✅ Cognitoにユーザーが作成される
- ✅ 確認メールが届く
- ✅ コンソールに「✅ Amplify（/test環境）初期化完了」と表示

### 6. エラーの場合

コンソールにエラー詳細が表示されます：

- `Auth UserPool not configured` → Amplify初期化の問題
- `UsernameExistsException` → 既に登録済みのメール
- `InvalidPasswordException` → パスワードポリシー違反

## 📝 実装詳細

### amplify/auth/resource.ts

Amplify公式推奨の最小構成：

```typescript
import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    email: { required: true, mutable: true },
    name: { required: false, mutable: true },
  },
});
```

### lib/amplifyClient.ts

シンプルな初期化：

```typescript
"use client";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

Amplify.configure(outputs);
console.log("✅ Amplify（/test環境）初期化完了");
```

### /app/test/signup/page.tsx

最小限の登録フォーム（TypeScript対応、Next.js App Router対応）：

```typescript
"use client";
import { signUp } from "@aws-amplify/auth";
import "../../../test/lib/amplifyClient"; // 修正されたパス

export default function TestSignupPage() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // ... 登録処理
  }
  // ... フォームUI
}
```

## 🔄 本体への移植手順

動作確認が完了したら、以下の順序で本体に適用：

1. ✅ `/src/lib/amplifyClient.ts` を `/test/lib/amplifyClient.ts` の形式に更新
2. ✅ `/app/signup/user/page.tsx` に `import "../../lib/amplifyClient"` を追加
3. ✅ `/app/layout.tsx` の初期化を確認
4. ✅ カスタム属性（`custom:userType`, `custom:name`）を段階的に追加

## 🧹 クリーンアップ

テスト完了後、このディレクトリは削除可能：

```bash
rm -rf /mnt/Coordy/Coordy-Stg/test
```

## 📚 参考資料

- [Amplify Gen2 Quickstart](https://docs.amplify.aws/react/start/quickstart/)
- [Auth Setup Guide](https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/)
