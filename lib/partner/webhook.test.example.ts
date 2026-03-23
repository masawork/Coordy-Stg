/**
 * Example usage and testing guide for webhook functions
 * This is NOT a Jest test file - it's a usage example
 */

import {
  sendWebhookNotification,
  queueWebhookNotification,
  buildReservationWebhookData,
  type WebhookEvent,
} from './webhook';

// Example webhook configuration
const exampleWebhookUrl = 'https://example.com/webhook';
const exampleWebhookSecret = 'whsec_test123456789';

// Example reservation webhook data
const exampleReservationData = buildReservationWebhookData({
  reservationId: 'res_abc123',
  externalRef: 'ext_xyz789',
  status: 'PENDING',
  service: {
    id: 'svc_001',
    title: 'プライベートヨガレッスン',
  },
  scheduledAt: '2026-03-15T10:00:00+09:00',
  participants: 1,
  guest: {
    name: '田中太郎',
    email: 'tanaka@example.com',
  },
  totalAmount: 5000,
  commissionAmount: 500,
  paymentMode: 'points',
});

// Example 1: Send webhook with default retry (3 retries)
async function exampleDefaultWebhook() {
  console.log('Example 1: Sending webhook with default retry config...');

  const result = await sendWebhookNotification(
    exampleWebhookUrl,
    exampleWebhookSecret,
    'reservation.created',
    exampleReservationData
  );

  console.log('Result:', result);
  // Output:
  // {
  //   success: true/false,
  //   statusCode: 200,
  //   attempts: 1,
  //   lastAttemptAt: Date
  // }
}

// Example 2: Send webhook with custom retry config
async function exampleCustomRetryConfig() {
  console.log('Example 2: Sending webhook with custom retry config...');

  const result = await sendWebhookNotification(
    exampleWebhookUrl,
    exampleWebhookSecret,
    'reservation.cancelled',
    exampleReservationData,
    {
      maxRetries: 5,      // 5 retries instead of default 3
      baseDelayMs: 2000,  // 2 seconds base delay instead of 1
      maxDelayMs: 60000,  // 60 seconds max delay instead of 30
    }
  );

  console.log('Result:', result);
}

// Example 3: Fire-and-forget webhook (non-blocking)
function exampleFireAndForget() {
  console.log('Example 3: Queueing webhook (fire-and-forget)...');

  // This returns immediately without waiting
  queueWebhookNotification(
    exampleWebhookUrl,
    exampleWebhookSecret,
    'reservation.completed',
    exampleReservationData
  );

  console.log('Webhook queued! Continuing without waiting...');
  // The webhook will be sent in the background
  // Results will be logged automatically
}

// Example 4: Usage in API route
async function exampleApiRouteUsage() {
  console.log('Example 4: Usage in API route...');

  // Simulating a reservation creation in API route
  const reservation = {
    id: 'res_abc123',
    externalRef: 'ext_xyz789',
    status: 'PENDING',
    scheduledAt: new Date('2026-03-15T10:00:00+09:00'),
    participants: 1,
    totalAmount: 5000,
  };

  const service = {
    id: 'svc_001',
    title: 'プライベートヨガレッスン',
  };

  const partner = {
    webhookUrl: 'https://partner.example.com/webhook',
    webhookSecret: 'whsec_partner123',
    paymentMode: 'points',
    commissionRate: 0.1,
  };

  // Build webhook data
  const webhookData = buildReservationWebhookData({
    reservationId: reservation.id,
    externalRef: reservation.externalRef,
    status: reservation.status,
    service: {
      id: service.id,
      title: service.title,
    },
    scheduledAt: reservation.scheduledAt.toISOString(),
    participants: reservation.participants,
    guest: {
      name: '田中太郎',
      email: 'tanaka@example.com',
    },
    totalAmount: reservation.totalAmount,
    commissionAmount: reservation.totalAmount * partner.commissionRate,
    paymentMode: partner.paymentMode,
  });

  // Send webhook (non-blocking)
  if (partner.webhookUrl && partner.webhookSecret) {
    queueWebhookNotification(
      partner.webhookUrl,
      partner.webhookSecret,
      'reservation.created',
      webhookData
    );
  }

  console.log('API response sent, webhook queued in background');
}

// Example 5: Different webhook events
async function exampleDifferentEvents() {
  console.log('Example 5: Different webhook events...');

  // Reservation created
  await sendWebhookNotification(
    exampleWebhookUrl,
    exampleWebhookSecret,
    'reservation.created',
    exampleReservationData
  );

  // Reservation cancelled
  const cancelledData = {
    ...exampleReservationData,
    status: 'CANCELLED',
    cancelReason: '急用のため',
  };
  await sendWebhookNotification(
    exampleWebhookUrl,
    exampleWebhookSecret,
    'reservation.cancelled',
    cancelledData
  );

  // Reservation completed
  const completedData = {
    ...exampleReservationData,
    status: 'COMPLETED',
  };
  await sendWebhookNotification(
    exampleWebhookUrl,
    exampleWebhookSecret,
    'reservation.completed',
    completedData
  );
}

// Example 6: Testing retry on failure
async function exampleRetryOnFailure() {
  console.log('Example 6: Testing retry on server error...');

  // This will fail and retry if the endpoint returns 5xx
  const result = await sendWebhookNotification(
    'https://httpstat.us/503', // Test endpoint that returns 503
    exampleWebhookSecret,
    'reservation.created',
    exampleReservationData
  );

  console.log('Result after retries:', result);
  // Will show multiple attempts in logs:
  // Webhook retry attempt 1/3 for https://httpstat.us/503 after 1234ms delay
  // Webhook retry attempt 2/3 for https://httpstat.us/503 after 2456ms delay
  // ...
}

// Example 7: No retry on client error
async function exampleNoRetryOnClientError() {
  console.log('Example 7: No retry on client error (4xx)...');

  // This will NOT retry on 4xx errors
  const result = await sendWebhookNotification(
    'https://httpstat.us/400', // Test endpoint that returns 400
    exampleWebhookSecret,
    'reservation.created',
    exampleReservationData
  );

  console.log('Result (no retry on 4xx):', result);
  // Will show only 1 attempt, no retries
}

// Main execution
if (require.main === module) {
  console.log('Running webhook examples...');
  console.log('Note: Some examples use test endpoints that may fail');
  console.log('');

  // Run examples sequentially
  (async () => {
    // Example with actual test endpoints
    console.log('\n=== Testing with httpstat.us (will make real requests) ===\n');

    // Test success (no retry needed)
    const successResult = await sendWebhookNotification(
      'https://httpstat.us/200',
      'test_secret',
      'reservation.created',
      { test: 'data' }
    );
    console.log('Success result:', successResult);

    // Test retry on server error (commented out to avoid making too many requests)
    // await exampleRetryOnFailure();

    // Test no retry on client error
    await exampleNoRetryOnClientError();

    console.log('\n=== Examples completed ===');
  })().catch(console.error);
}

export {
  exampleDefaultWebhook,
  exampleCustomRetryConfig,
  exampleFireAndForget,
  exampleApiRouteUsage,
  exampleDifferentEvents,
  exampleRetryOnFailure,
  exampleNoRetryOnClientError,
};
