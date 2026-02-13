# 開発環境セットアップガイド

最終更新: 2025-12-29

---

## 📋 概要

このドキュメントでは、本人確認・決済機能の開発に必要な外部サービスの設定方法を説明します。

---

## 📱 Supabase Phone Auth（SMS認証）

### 特徴
- ✅ **無料枠あり**（月間1,000通まで ※プランによる）
- ✅ **Supabaseが内部でTwilioを使用**（別途契約不要）
- ✅ **設定が簡単**（ダッシュボードでON/OFF）
- ✅ **OTP自動生成・検証**

---

### セットアップ手順

#### ステップ1: Supabaseダッシュボードにアクセス

```
https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>/auth/providers
```

**プロジェクトID**: `pvsfahifridmgdqspezi`

---

#### ステップ2: Phone Provider を有効化

1. **Authentication** → **Providers** に移動
2. **Phone** プロバイダーを探す
3. 「Enable Phone provider」を **ON** に切り替え

---

#### ステップ3: 設定を確認

| 設定項目 | 推奨値 | 説明 |
|---------|--------|------|
| **Enable Phone provider** | ON | SMS認証を有効化 |
| **OTP expiry** | 60秒 | OTP（6桁コード）の有効期限 |
| **SMS template** | デフォルトでOK | 日本語化する場合はカスタマイズ |

**SMS テンプレート例**（日本語化）:
```
Coordyの認証コードは {{ .Token }} です。（有効期限: 60秒）
```

---

#### ステップ4: 環境変数を確認

`.env.local` に以下が設定されているか確認：

```env
NEXT_PUBLIC_SUPABASE_URL=https://pvsfahifridmgdqspezi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
```

---

### 実装例

#### SMS送信

```typescript
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// SMS送信（電話番号にOTPを送信）
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+819012345678', // 国際電話番号形式（+81 9012345678）
});

if (error) {
  console.error('SMS送信エラー:', error.message);
} else {
  console.log('✅ SMSを送信しました');
}
```

---

#### OTP検証

```typescript
// OTP検証（ユーザーが入力した6桁コードを検証）
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+819012345678',
  token: '123456', // ユーザーが入力した6桁コード
  type: 'sms',
});

if (error) {
  console.error('OTP検証エラー:', error.message);
} else {
  console.log('✅ 電話番号認証完了:', data.user);
  // ここで `phoneVerified = true` に更新
}
```

---

### 電話番号フォーマット

日本の電話番号は以下のフォーマットに変換してください：

| 入力例 | 変換後（国際電話番号形式） |
|--------|---------------------------|
| `09012345678` | `+819012345678` |
| `090-1234-5678` | `+819012345678` |
| `0312345678` | `+81312345678` |

**変換ロジック**:
```typescript
function toInternationalFormat(phone: string): string {
  // ハイフンを除去
  const cleaned = phone.replace(/-/g, '');
  
  // 先頭の0を+81に置換
  if (cleaned.startsWith('0')) {
    return '+81' + cleaned.substring(1);
  }
  
  // 既に国際電話番号形式の場合はそのまま
  if (cleaned.startsWith('+81')) {
    return cleaned;
  }
  
  throw new Error('無効な電話番号形式です');
}
```

---

### テスト方法

#### 開発環境でのテスト

Supabaseのテスト環境では、**実際にSMSが送信されます**。

**注意**:
- ✅ 自分の電話番号でテスト
- ❌ 架空の番号ではテストできない
- 💰 月間1,000通まで無料（超過後は課金）

---

## 💳 Stripe Test Mode（決済）

### 特徴
- ✅ **完全無料**（テスト環境では課金されない）
- ✅ **本番環境と同じAPI**
- ✅ **テストカードで決済テスト可能**
- ✅ **Webhook をローカルでテスト可能**（Stripe CLI）

---

### セットアップ手順

#### ステップ1: Stripeダッシュボードにアクセス

```
https://dashboard.stripe.com/test/dashboard
```

**重要**: 必ず **「テストモード」** になっているか確認
- 画面右上に「テストモード」と表示されていればOK

---

#### ステップ2: APIキーを確認

`.env.local` に以下が設定されているか確認：

```env
# Stripe Test Mode
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=（後で設定）
```

**確認方法**:
- `pk_test_...` → Publishable Key（フロントエンドで使用）
- `sk_test_...` → Secret Key（バックエンドで使用）
- 本番環境は `pk_live_...` / `sk_live_...` （絶対に混ぜない！）

---

#### ステップ3: Stripe CLI インストール

ローカル環境でWebhookをテストするために、Stripe CLI をインストールします。

```bash
# macOS
brew install stripe/stripe-cli/stripe

# インストール確認
stripe --version
```

---

#### ステップ4: Stripe CLI にログイン

```bash
stripe login
```

ブラウザが開いて認証画面が表示されます。
「Allow access」をクリックしてログイン完了。

---

#### ステップ5: Webhook をローカルに転送

```bash
# Next.jsの開発サーバーを起動してから実行
npm run dev

# 別のターミナルで実行
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**出力例**:
```
> Ready! You are using Stripe API Version [2024-04-10]. Your webhook signing secret is whsec_abc123...
```

このとき表示される `whsec_...` をコピーして、`.env.local` に追加：

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

---

### テストカード

| カード番号 | 結果 | 用途 |
|-----------|------|------|
| `4242 4242 4242 4242` | ✅ 成功 | 通常の決済テスト |
| `4000 0000 0000 0002` | ❌ カード拒否 | エラーハンドリングテスト |
| `4000 0000 0000 9995` | ❌ 残高不足 | エラーハンドリングテスト |
| `4000 0025 0000 3155` | ⚠️ 3Dセキュア認証必要 | 認証フローテスト |

**その他の入力値**:
- **CVC**: 任意の3桁（例: `123`）
- **有効期限**: 未来の日付（例: `12/30`）
- **郵便番号**: 任意（例: `12345`）

詳細: https://stripe.com/docs/testing

---

### 実装例

#### カード登録

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CardRegistrationForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    // PaymentMethodを作成
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      console.error('カード登録エラー:', error.message);
    } else {
      console.log('✅ カード登録成功:', paymentMethod);
      // paymentMethod.id をバックエンドに送信して保存
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        カードを登録
      </button>
    </form>
  );
}

export default function Page() {
  return (
    <Elements stripe={stripePromise}>
      <CardRegistrationForm />
    </Elements>
  );
}
```

---

#### Webhook ハンドラー

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  try {
    // Webhook署名を検証（セキュリティ必須）
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('✅ Webhookイベント受信:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 決済成功:', paymentIntent.id);
        // ここでデータベースを更新
        break;

      case 'customer.created':
        const customer = event.data.object as Stripe.Customer;
        console.log('👤 顧客作成:', customer.id);
        break;

      default:
        console.log('未処理のイベント:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook検証エラー:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

---

### テスト方法

#### 1. カード登録をテスト

1. 開発サーバーを起動: `npm run dev`
2. カード登録ページにアクセス
3. テストカード番号を入力: `4242 4242 4242 4242`
4. CVC: `123`, 有効期限: `12/30`
5. 登録ボタンをクリック

---

#### 2. Webhook をテスト

1. Stripe CLI を起動:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. 別のターミナルでイベントをトリガー:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

3. ターミナルに `✅ Webhookイベント受信: payment_intent.succeeded` と表示されればOK

---

#### 3. Stripeダッシュボードで確認

```
https://dashboard.stripe.com/test/payments
```

- テスト決済の一覧が表示される
- 詳細をクリックして内容を確認

---

## 🔐 暗号化キー（銀行口座番号）

銀行口座番号を暗号化して保存するためのキーを生成します。

### キー生成

```bash
# 32文字のランダムキーを生成
openssl rand -base64 32
```

**出力例**:
```
X7vK9mP2qR8sT4uV6wY0zB1cD3eF5gH7
```

---

### 環境変数に追加

`.env.local` に追加:

```env
# 銀行口座暗号化キー
ENCRYPTION_KEY=X7vK9mP2qR8sT4uV6wY0zB1cD3eF5gH7
```

**重要**:
- ✅ このキーは **絶対に** Git にコミットしない
- ✅ 本番環境では別のキーを使用
- ✅ キーを紛失すると既存の口座番号が復号化できなくなる

---

### 暗号化・復号化の実装

```typescript
// lib/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

### 使用例

```typescript
import { encrypt, decrypt } from '@/lib/utils/encryption';

// 暗号化
const accountNumber = '1234567';
const encrypted = encrypt(accountNumber);
console.log('暗号化:', encrypted);
// 出力例: "a1b2c3d4e5f6:9876543210abcdef..."

// 復号化
const decrypted = decrypt(encrypted);
console.log('復号化:', decrypted); // "1234567"
```

---

## 📚 参考資料

### Supabase Phone Auth
- [公式ドキュメント](https://supabase.com/docs/guides/auth/phone-login)
- [クライアントライブラリ](https://supabase.com/docs/reference/javascript/auth-signinwithotp)

### Stripe
- [公式ドキュメント](https://stripe.com/docs)
- [テストカード](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook](https://stripe.com/docs/webhooks)

### 暗号化
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [AES-256暗号化](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)

---

**更新履歴**
- 2025-12-29: 初版作成

