import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeJS } from '@stripe/stripe-js';

let stripePromise: Promise<StripeJS | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
};

// サーバーサイド用のStripeクライアント
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

