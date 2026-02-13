// lib/stripe/helpers.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Stripe Customerを作成または取得
 * @param userId ユーザーID
 * @param email メールアドレス
 * @param name 名前
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // メールアドレスで既存のCustomerを検索
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // 新規Customerを作成
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer;
}

/**
 * Payment Methodを顧客に登録
 * @param customerId Stripe Customer ID
 * @param paymentMethodId Stripe Payment Method ID
 */
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * デフォルトのPayment Methodを設定
 * @param customerId Stripe Customer ID
 * @param paymentMethodId Stripe Payment Method ID
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * Payment Intentを作成（決済処理）
 * @param amount 金額（円）
 * @param customerId Stripe Customer ID
 * @param paymentMethodId Stripe Payment Method ID
 * @param metadata メタデータ
 */
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  paymentMethodId?: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount, // JPYは最小通貨単位が円なのでそのまま使用
    currency: 'jpy',
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true, // 即座に決済を確定
    metadata,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/payment/complete`,
  });

  return paymentIntent;
}

/**
 * Payment Methodを取得
 * @param paymentMethodId Stripe Payment Method ID
 */
export async function getPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

/**
 * Payment Methodをデタッチ（削除）
 * @param paymentMethodId Stripe Payment Method ID
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * 顧客のすべてのPayment Methodsを取得
 * @param customerId Stripe Customer ID
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

