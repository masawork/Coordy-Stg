# Partner Integration System

This directory contains utilities for partner integration, authentication, and webhooks.

## Modules

### `auth.ts` - Partner Authentication
- `generateApiKey()`: Generate partner API key
- `generateSecretKey()`: Generate partner secret key
- `generateWebhookSecret()`: Generate webhook secret
- `createSignature()`: Create HMAC-SHA256 signature
- `verifySignature()`: Verify signature with timing-safe comparison
- `signWebhookPayload()`: Sign webhook payload
- `verifyPartnerRequest()`: Verify partner request with signature

### `webhook.ts` - Webhook Notifications

#### Send Webhook with Retry
```typescript
import { sendWebhookNotification } from '@/lib/partner/webhook';

// Send webhook with default retry config (3 retries)
const result = await sendWebhookNotification(
  'https://partner.example.com/webhook',
  'whsec_...',
  'reservation.created',
  {
    reservationId: '123',
    status: 'PENDING',
    // ... other data
  }
);

console.log(result);
// {
//   success: true,
//   statusCode: 200,
//   attempts: 1,
//   lastAttemptAt: Date
// }
```

#### Custom Retry Configuration
```typescript
const result = await sendWebhookNotification(
  webhookUrl,
  webhookSecret,
  'reservation.cancelled',
  data,
  {
    maxRetries: 5,      // default: 3
    baseDelayMs: 2000,  // default: 1000 (1 second)
    maxDelayMs: 60000,  // default: 30000 (30 seconds)
  }
);
```

#### Fire-and-Forget Webhook
```typescript
import { queueWebhookNotification } from '@/lib/partner/webhook';

// Queue webhook without blocking (logs results in background)
queueWebhookNotification(
  webhookUrl,
  webhookSecret,
  'reservation.completed',
  data
);

// Code continues immediately without waiting
console.log('Webhook queued, continuing...');
```

#### Build Reservation Webhook Data
```typescript
import { buildReservationWebhookData } from '@/lib/partner/webhook';

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
  guest: guestInfo, // optional
  totalAmount: reservation.totalAmount,
  commissionAmount: commissionAmount,
  paymentMode: partner.paymentMode,
});
```

## Webhook Events

- `reservation.created`: New reservation created
- `reservation.cancelled`: Reservation cancelled
- `reservation.completed`: Reservation completed

## Retry Logic

### Exponential Backoff with Jitter
- Delay calculation: `min(baseDelay * 2^(attempt-1) + random(0-1000ms), maxDelay)`
- Example with defaults:
  - Attempt 1: immediate
  - Attempt 2: ~1s + jitter
  - Attempt 3: ~2s + jitter
  - Attempt 4: ~4s + jitter

### Retry Behavior
- **Retry**: Network errors, 5xx status codes
- **No Retry**: 4xx status codes (client errors)
- **Success**: 2xx status codes

### Logging
```
Webhook retry attempt 1/3 for https://partner.example.com/webhook after 1234ms delay
Webhook failed with server error 503 for https://partner.example.com/webhook
Webhook delivery failed after 4 attempts for https://partner.example.com/webhook
```

## Webhook Signature

Webhooks are signed using HMAC-SHA256:
- Header: `X-Coordy-Signature: sha256=<signature>`
- Header: `X-Coordy-Timestamp: <unix_timestamp>`
- Payload: JSON body

## Example Integration

```typescript
// In reservation creation route
import { queueWebhookNotification, buildReservationWebhookData } from '@/lib/partner/webhook';

// Create reservation...
const reservation = await prisma.reservation.create({ ... });

// Send webhook notification (if partner has webhook configured)
if (partner.webhookUrl && partner.webhookSecret) {
  const webhookData = buildReservationWebhookData({
    reservationId: reservation.id,
    externalRef: reservation.externalRef,
    status: reservation.status,
    service: { id: service.id, title: service.title },
    scheduledAt: reservation.scheduledAt.toISOString(),
    participants: reservation.participants,
    guest: guestInfo,
    totalAmount: reservation.totalAmount,
    commissionAmount: calculateCommission(reservation, partner),
    paymentMode: partner.paymentMode,
  });

  // Fire-and-forget (non-blocking)
  queueWebhookNotification(
    partner.webhookUrl,
    partner.webhookSecret,
    'reservation.created',
    webhookData
  );
}

// Return response immediately (webhook runs in background)
return NextResponse.json({ reservation });
```
