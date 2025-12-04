# 電話番号の設計仕様

## 概要

ユーザー登録時とプロフィール設定時の電話番号の扱いについて、二重入力を避けるための設計をまとめています。

---

## 設計方針

### 1. サインアップ時（`/signup/user`）

- **入力要件**: メールアドレス + パスワードのみ（最小限）
- **目的**: 認証情報の作成に特化し、個人情報は後続ステップへ委譲
- **電話番号**: 収集しない（Cognito の `phone_number` は空のまま）

**メリット**：
- 初回登録で入力する項目を減らし、離脱を抑制
- 氏名や電話番号の扱いをプロフィール設定画面に集約できる
- 将来的にプロファイルでの電話番号検証や更新フローを統一的に実装しやすい

---

### 2. プロフィール設定時（`/user/profile/setup`）

- **入力要件**: 氏名・住所・電話番号などすべて必須
- **初期値**: Cognito の `name` / `phone_number` 属性から取得（既存ユーザーのみ。新規サインアップ直後は空のまま）
- **役割**: 個人情報を初めて登録する地点。ここで 1 回だけ入力し、以降は編集のみ。
- **保存先**: Amplify Data の `ClientProfile.phoneNumber` フィールド
- **画面上の形式**: 日本国内形式（`0` プレフィックス、例：`09012345678`）
- **保存形式**: AWSPhone（E.164形式、例：`+819012345678`）※ GraphQLに送る直前に変換

**メリット**：
- サインアップ時に電話番号を入力したユーザーは再入力不要
- プロフィール設定時に編集可能（変更・修正が可能）
- 最終的にClientProfileに保存されるため、アプリケーション内で統一的に使用可能

**実装**：
```typescript
// app/user/profile/setup/page.tsx
import { toJapanDomesticPhoneNumber } from '@/lib/phone';

const session = await fetchAuthSession();
const idToken = session.tokens?.idToken;
const phoneNumber = toJapanDomesticPhoneNumber(
  idToken?.payload.phone_number as string | undefined
);

setFormData({
  name: authUser.name || '',
  address: '',
  phoneNumber,
  dateOfBirth: '',
  gender: '',
});
```

---

## データフロー図

```
[サインアップ]
   ↓ メール + パスワードのみ登録（個人情報はまだ収集しない）
[Cognito ユーザー作成（name/phone_numberは空）]
   ↓
[プロフィール設定画面]
   ↓ ユーザーが氏名・住所・電話番号を入力 (0 形式)
   ↓ GraphQL送信直前にE.164へ変換
[ClientProfile.phoneNumber に保存] (+81 形式 / AWSPhone)
   ↓
[アプリケーション内で使用]
```

---

## 保存形式の違い

| 保存先 | 形式 | 例 | 用途 |
|--------|------|-----|------|
| Cognito `phone_number` | 未使用（デフォルト空） | `-` | 将来のMFAなどに備えて予約 |
| ClientProfile `phoneNumber` | AWSPhone（E.164形式）※UI表示時に国内形式へ変換 | `+819012345678` | 永続化・API連携 |

---

## バリデーションルール

### サインアップ時

電話番号は入力させないため、バリデーション処理は不要。
メールとパスワードのみ別途チェックする。

### プロフィール設定時

```typescript
import {
  isValidJapanPhoneNumber,
  toE164PhoneNumber,
} from '@/lib/phone';

// 必須項目なのでチェック
if (!formData.name || !formData.address || !formData.phoneNumber) {
  setError('必須項目を入力してください。');
  return;
}

if (!isValidJapanPhoneNumber(formData.phoneNumber)) {
  setError('電話番号の形式が正しくありません（例: 09012345678）');
  return;
}

const phoneNumberForApi = toE164PhoneNumber(formData.phoneNumber);
if (!phoneNumberForApi) {
  setError('電話番号の形式が正しくありません（例: 09012345678）');
  return;
}
```

---

## ユーザー体験

1. `/signup/user` でメールアドレスとパスワードのみを登録
2. ログイン後に `/user/profile/setup` へ遷移
3. 初回のみ、氏名・住所・電話番号を入力して保存（以降は既存値が自動表示され編集のみで済む）
4. 保存成功後に `/user` へ遷移してダッシュボードを利用

---

## 実装ファイル

### 修正済みファイル

- **`app/signup/user/page.tsx`**
  - メールアドレスとパスワードのみ入力
  - 氏名・電話番号などの個人情報は収集しない（プロフィール設定へ委譲）

- **`app/user/profile/setup/page.tsx`** ✅ 今回修正
  - Cognitoから`phone_number`を取得して初期値に設定（既存ユーザーのみ）
  - ClientProfileの`phoneNumber`フィールドに保存（Mutation送信前にE.164へ変換）
  - 保存成功後は `/user` へリダイレクト

- **`lib/phone.ts`**
  - 国内形式とE.164形式の相互変換ロジックを集約
  - `toJapanDomesticPhoneNumber`, `toE164PhoneNumber`, `isValidJapanPhoneNumber` を提供

---

## 今後の拡張案

### 1. 電話番号変更機能

ユーザーがプロフィール編集画面で電話番号を変更した場合：
- ClientProfileの`phoneNumber`を更新
- 必要に応じてCognitoの`phone_number`も更新

### 2. SMS認証（MFA）

将来的にSMS認証を追加する場合：
- Cognitoの`phone_number`属性を利用
- MFA設定画面を追加
- SMS送信機能の実装

### 3. 電話番号の検証

電話番号の有効性を確認する機能：
- SMS送信による確認
- `phone_number_verified`属性の活用

---

## 注意事項

1. **電話番号の形式統一**
   - UI入力: 日本国内形式（`0`プレフィックス）
   - ClientProfile: AWSPhone（E.164形式、例：`+819012345678`）で保存
   - Cognito `phone_number`: 現時点では未使用。将来利用する際は同じ E.164 ルールに従わせる
   - 表示時は `toJapanDomesticPhoneNumber` で国内形式へ変換

2. **プライバシー保護**
   - 電話番号は個人情報として適切に扱う
   - 外部への公開は避ける
   - 必要最小限の範囲でのみ使用

3. **国際対応**
   - 現在は日本国内の電話番号のみ対応
   - 将来的に海外展開する場合は、国際電話番号対応が必要

---

## 参考リンク

- [AWS Cognito User Pool Attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html)
- [Amplify Auth API Reference](https://docs.amplify.aws/gen2/build-a-backend/auth/)
