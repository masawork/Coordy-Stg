/**
 * Example usage and testing guide for reservation email functions
 * This is NOT a Jest test file - it's a usage example
 */

import {
  sendReservationConfirmationEmail,
  sendReservationNotifyInstructorEmail,
  sendCancellationConfirmationEmail,
  sendCancellationNotifyInstructorEmail,
  type ReservationEmailData,
  type CancellationEmailData,
} from './reservation';

// Example reservation data
const exampleReservationData: ReservationEmailData = {
  reservationId: 'res_abc123',
  userName: '田中太郎',
  userEmail: 'tanaka@example.com',
  serviceName: 'プライベートヨガレッスン',
  instructorName: '山田花子',
  scheduledAt: new Date('2026-03-15T10:00:00+09:00'),
  duration: 60,
  location: '東京都渋谷区...',
  deliveryType: 'in_person',
  meetUrl: null,
  price: 5000,
  participants: 1,
  paymentMethod: 'points',
};

const exampleReservationDataRemote: ReservationEmailData = {
  reservationId: 'res_def456',
  userName: '鈴木一郎',
  userEmail: 'suzuki@example.com',
  serviceName: 'オンライン英会話レッスン',
  instructorName: 'スミス先生',
  scheduledAt: new Date('2026-03-20T14:30:00+09:00'),
  duration: 45,
  deliveryType: 'remote',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  price: 3000,
  participants: 2,
  paymentMethod: 'credit',
};

const exampleCancellationData: CancellationEmailData = {
  reservationId: 'res_abc123',
  userName: '田中太郎',
  userEmail: 'tanaka@example.com',
  serviceName: 'プライベートヨガレッスン',
  instructorName: '山田花子',
  scheduledAt: new Date('2026-03-15T10:00:00+09:00'),
  cancelReason: '急用のため',
  cancelledBy: 'user',
  refundAmount: 5000,
  refundMethod: 'ポイント',
};

// Example usage in API route
async function exampleReservationCreation() {
  // After creating a reservation...

  // 1. Send confirmation to user
  await sendReservationConfirmationEmail(exampleReservationData);

  // 2. Notify instructor
  await sendReservationNotifyInstructorEmail({
    ...exampleReservationData,
    instructorEmail: 'yamada@example.com',
  });

  console.log('Reservation confirmation emails sent!');
}

async function exampleReservationCancellation() {
  // After cancelling a reservation...

  // 1. Send cancellation confirmation to user
  await sendCancellationConfirmationEmail(exampleCancellationData);

  // 2. Notify instructor
  await sendCancellationNotifyInstructorEmail({
    ...exampleCancellationData,
    instructorEmail: 'yamada@example.com',
  });

  console.log('Cancellation notification emails sent!');
}

// Example usage for different scenarios
async function exampleScenarios() {
  // Scenario 1: In-person reservation with points
  await sendReservationConfirmationEmail({
    reservationId: 'res_001',
    userName: '佐藤次郎',
    userEmail: 'sato@example.com',
    serviceName: 'パーソナルトレーニング',
    instructorName: '高橋トレーナー',
    scheduledAt: new Date('2026-04-01T09:00:00+09:00'),
    duration: 90,
    location: 'フィットネスジム渋谷店',
    deliveryType: 'in_person',
    price: 10000,
    participants: 1,
    paymentMethod: 'points',
  });

  // Scenario 2: Remote reservation with credit card
  await sendReservationConfirmationEmail(exampleReservationDataRemote);

  // Scenario 3: Cancellation by instructor (no refund needed)
  await sendCancellationConfirmationEmail({
    reservationId: 'res_002',
    userName: '佐藤次郎',
    userEmail: 'sato@example.com',
    serviceName: 'パーソナルトレーニング',
    instructorName: '高橋トレーナー',
    scheduledAt: new Date('2026-04-01T09:00:00+09:00'),
    cancelledBy: 'instructor',
    cancelReason: '体調不良のため',
    refundAmount: 10000,
    refundMethod: 'ポイント',
  });

  // Scenario 4: Cancellation by admin
  await sendCancellationConfirmationEmail({
    reservationId: 'res_003',
    userName: '佐藤次郎',
    userEmail: 'sato@example.com',
    serviceName: 'パーソナルトレーニング',
    instructorName: '高橋トレーナー',
    scheduledAt: new Date('2026-04-01T09:00:00+09:00'),
    cancelledBy: 'admin',
    cancelReason: '施設メンテナンスのため',
  });
}

// To test manually:
// 1. Set RESEND_API_KEY and FROM_EMAIL in .env
// 2. Run: npx tsx lib/mail/reservation.test.example.ts
// 3. Check your email inbox

if (require.main === module) {
  console.log('Running email examples...');
  console.log('Note: Set RESEND_API_KEY in .env to actually send emails');
  console.log('');

  exampleReservationCreation()
    .then(() => exampleReservationCancellation())
    .then(() => console.log('✅ All examples completed'))
    .catch((error) => console.error('❌ Error:', error));
}
