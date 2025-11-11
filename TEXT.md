# 🎯 目的

/test 環境で検証済みの「クライアント／クリエイター」ロール付き新規登録機能を本番に統合し、登録後にTOPページ（`/`）へ自動遷移できるようにする。
UI上の表記・変数名もすべて「クライアント／クリエイター」に統一する。

---

## ✅ 実装方針

### 対象範囲

* 本番側 `/app/signup/page.tsx`（既存フォームを改修）
* `/lib/amplifyClient.ts` を使用して Amplify 初期化
* Amplify backend (`/amplify/auth/resource.ts`) に `custom:userType` / `custom:role` 定義を追加

---

## 1️⃣ フォーム改修

`/app/signup/page.tsx` に以下を反映：

```tsx
<select name="role" required>
  <option value="CLIENT">クライアント</option>
  <option value="CREATOR">クリエイター</option>
</select>
```

```ts
const selectedRole = form.role.value;

const result = await signUp({
  username: email,
  password,
  options: {
    userAttributes: {
      email,
      name,
      "custom:userType": selectedRole === "CREATOR" ? "creator" : "client",
      "custom:role": selectedRole,
    },
  },
});

// 登録成功後 TOP に遷移
alert("新規登録が完了しました。TOPページに移動します。");
router.push("/");
```

---

## 2️⃣ Cognito属性の統一

`/amplify/auth/resource.ts` を以下のように更新：

```ts
import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    name: { dataType: "String", mutable: true },
    "custom:userType": { dataType: "String", mutable: true },
    "custom:role": { dataType: "String", mutable: true },
  },
  groups: ["CLIENTS", "CREATORS", "ADMINS"],
});
```

---

## 3️⃣ UI文言の統一

* 旧表現「ユーザー」「インストラクター」→ 全て「クライアント」「クリエイター」に置換
* `/components/` や `/app/` 配下でのロール関連文言も同様に修正：

  * `InstructorDashboard` → `CreatorDashboard`
  * `UserDashboard` → `ClientDashboard`
  * ラベル文言：「講師登録」→「クリエイター登録」
  * 「利用者」→「クライアント」

---

## 4️⃣ 動作確認手順

1. `npx ampx sandbox --once`
2. `npm run dev`
3. `http://localhost:3000/signup` にアクセス

   * 「クライアント」「クリエイター」を選択して登録
4. Cognito Console にて登録ユーザー確認

   * `custom:userType` と `custom:role` が反映されていることを確認
5. 登録完了後、自動で `/` に遷移し TOP が表示されることを確認

---

## 🎯 期待結果

* 新規登録成功後、TOPページに自動リダイレクトされる
* ロール属性が Cognito に正しく保存される
* 全画面で「クライアント／クリエイター」表現に統一される
* 本番 UI とテスト環境の動作が一致
