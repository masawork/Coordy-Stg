# Email Notification System

This directory contains email notification utilities using Resend.

## Configuration

Set the following environment variables:
- `RESEND_API_KEY`: Your Resend API key (optional - gracefully skipped if not set)
- `FROM_EMAIL`: Sender email address (defaults to `onboarding@resend.dev`)

## Modules

### `resend.ts` - Bank Account Notifications
- `sendBankAccountCreatedEmail()`
- `sendBankAccountUpdatedEmail()`
- `sendBankAccountDeletedEmail()`

### `reservation.ts` - Reservation Notifications

#### Reservation Confirmation
```typescript
import { sendReservationConfirmationEmail, sendReservationNotifyInstructorEmail } from '@/lib/mail/reservation';

// After creating a reservation, send confirmation to user
await sendReservationConfirmationEmail({
  reservationId: reservation.id,
  userName: user.name,
  userEmail: user.email,
  serviceName: service.title,
  instructorName: instructor.user.name,
  scheduledAt: reservation.scheduledAt,
  duration: service.duration,
  location: service.location,
  deliveryType: service.deliveryType,
  meetUrl: reservation.meetUrl,
  price: reservation.totalAmount,
  participants: reservation.participants,
  paymentMethod: reservation.paymentMode === 'points' ? 'points' : 'credit',
});

// Notify instructor of new reservation
await sendReservationNotifyInstructorEmail({
  reservationId: reservation.id,
  userName: user.name,
  userEmail: user.email,
  serviceName: service.title,
  instructorName: instructor.user.name,
  instructorEmail: instructor.user.email,
  scheduledAt: reservation.scheduledAt,
  duration: service.duration,
  location: service.location,
  deliveryType: service.deliveryType,
  meetUrl: reservation.meetUrl,
  price: reservation.totalAmount,
  participants: reservation.participants,
  paymentMethod: reservation.paymentMode === 'points' ? 'points' : 'credit',
});
```

#### Cancellation Notification
```typescript
import { sendCancellationConfirmationEmail, sendCancellationNotifyInstructorEmail } from '@/lib/mail/reservation';

// After cancelling a reservation, send notification to user
await sendCancellationConfirmationEmail({
  reservationId: reservation.id,
  userName: user.name,
  userEmail: user.email,
  serviceName: service.title,
  instructorName: instructor.user.name,
  scheduledAt: reservation.scheduledAt,
  cancelReason: 'User requested cancellation',
  cancelledBy: 'user', // or 'instructor' or 'admin'
  refundAmount: 5000, // optional
  refundMethod: 'ポイント', // optional
});

// Notify instructor of cancellation
await sendCancellationNotifyInstructorEmail({
  reservationId: reservation.id,
  userName: user.name,
  userEmail: user.email,
  serviceName: service.title,
  instructorName: instructor.user.name,
  instructorEmail: instructor.user.email,
  scheduledAt: reservation.scheduledAt,
  cancelReason: 'User requested cancellation',
  cancelledBy: 'user',
});
```

## Email Styling

All emails use consistent HTML styling:
- Max width: 600px
- Sans-serif font
- Japanese language content
- Background boxes for data sections
- Footer: "このメールはCoordyから自動送信されています。"

## Error Handling

All email functions:
- Gracefully skip if `RESEND_API_KEY` is not set (with console.warn)
- Log errors to console but don't throw
- Safe to call without try-catch
