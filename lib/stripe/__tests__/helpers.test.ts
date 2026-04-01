import Stripe from 'stripe';

// Mock the Stripe module
jest.mock('stripe', () => {
  const mockRefundsCreate = jest.fn();
  const mockPaymentIntentsCreate = jest.fn();

  const MockStripe = jest.fn(() => ({
    refunds: {
      create: mockRefundsCreate,
    },
    paymentIntents: {
      create: mockPaymentIntentsCreate,
    },
    customers: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentMethods: {
      attach: jest.fn(),
      retrieve: jest.fn(),
      detach: jest.fn(),
      list: jest.fn(),
    },
  }));

  return MockStripe;
});

// Set required env vars before importing the module under test
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

import { refundPaymentIntent, createPaymentIntent } from '../helpers';

// Get a reference to the mocked stripe instance
const MockedStripe = Stripe as unknown as jest.Mock;
const stripeInstance = MockedStripe.mock.results[0]?.value ?? MockedStripe();

describe('refundPaymentIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a full refund when no amount is specified', async () => {
    const mockRefund: Partial<Stripe.Refund> = {
      id: 're_test_123',
      payment_intent: 'pi_test_456',
      amount: 5000,
      status: 'succeeded',
    };
    stripeInstance.refunds.create.mockResolvedValue(mockRefund);

    const result = await refundPaymentIntent('pi_test_456');

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_test_456',
    });
    expect(result).toEqual(mockRefund);
  });

  it('should create a partial refund when amount is specified', async () => {
    const mockRefund: Partial<Stripe.Refund> = {
      id: 're_test_789',
      payment_intent: 'pi_test_456',
      amount: 2000,
      status: 'succeeded',
    };
    stripeInstance.refunds.create.mockResolvedValue(mockRefund);

    const result = await refundPaymentIntent('pi_test_456', 2000);

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_test_456',
      amount: 2000,
    });
    expect(result).toEqual(mockRefund);
  });

  it('should propagate Stripe errors', async () => {
    const stripeError = new Error('No such payment_intent: pi_invalid');
    (stripeError as any).type = 'StripeInvalidRequestError';
    stripeInstance.refunds.create.mockRejectedValue(stripeError);

    await expect(refundPaymentIntent('pi_invalid')).rejects.toThrow(
      'No such payment_intent: pi_invalid'
    );

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_invalid',
    });
  });
});

describe('createPaymentIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a payment intent with the correct parameters', async () => {
    const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
      id: 'pi_test_new',
      amount: 3000,
      currency: 'jpy',
      status: 'succeeded',
    };
    stripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

    const metadata = { reservationId: 'res_123', userId: 'user_456' };
    const result = await createPaymentIntent(
      3000,
      'cus_test_001',
      'pm_test_001',
      metadata
    );

    expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith({
      amount: 3000,
      currency: 'jpy',
      customer: 'cus_test_001',
      payment_method: 'pm_test_001',
      confirm: true,
      metadata,
      return_url: 'https://example.com/user/payment/complete',
    });
    expect(result).toEqual(mockPaymentIntent);
  });

  it('should use JPY currency', async () => {
    const mockPaymentIntent: Partial<Stripe.PaymentIntent> = {
      id: 'pi_test_jpy',
      amount: 10000,
      currency: 'jpy',
      status: 'succeeded',
    };
    stripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

    await createPaymentIntent(10000, 'cus_test_002');

    const callArgs = stripeInstance.paymentIntents.create.mock.calls[0][0];
    expect(callArgs.currency).toBe('jpy');
    expect(callArgs.amount).toBe(10000);
    expect(callArgs.customer).toBe('cus_test_002');
    expect(callArgs.payment_method).toBeUndefined();
    expect(callArgs.metadata).toBeUndefined();
    expect(callArgs.confirm).toBe(true);
  });
});
