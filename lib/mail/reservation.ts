/**
 * 予約関連メール送信ユーティリティ
 */
import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Coordy';

/**
 * HTMLエスケープ: ユーザー入力値のXSS対策
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReservationEmailData {
  reservationId: string;
  userName: string;
  userEmail: string;
  serviceName: string;
  instructorName: string;
  scheduledAt: Date;
  duration: number;        // minutes
  location?: string;       // null for remote
  deliveryType: string;    // 'remote' | 'in_person' | 'hybrid'
  meetUrl?: string | null;
  price: number;
  participants: number;
  paymentMethod: string;   // 'points' | 'credit'
}

export interface CancellationEmailData {
  reservationId: string;
  userName: string;
  userEmail: string;
  serviceName: string;
  instructorName: string;
  scheduledAt: Date;
  cancelReason?: string;
  cancelledBy: 'user' | 'instructor' | 'admin';
  refundAmount?: number;
  refundMethod?: string;
}

/**
 * 日付を日本語形式でフォーマット
 * 例: "2025年1月15日（水）10:00"
 */
function formatDateJapanese(date: Date): string {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${year}年${month}月${day}日（${weekday}）${hours}:${minutes}`;
}

/**
 * 金額をカンマ区切りでフォーマット
 */
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * 支払方法を日本語表記に変換
 */
function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'points':
      return 'ポイント';
    case 'credit':
      return 'クレジットカード';
    default:
      return method;
  }
}

/**
 * 予約確認メールをユーザーに送信
 */
export async function sendReservationConfirmationEmail(
  data: ReservationEmailData
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    const dateTimeText = formatDateJapanese(data.scheduledAt);
    const priceText = formatCurrency(data.price);
    const paymentMethodText = formatPaymentMethod(data.paymentMethod);

    const safeUserName = escapeHtml(data.userName);
    const safeServiceName = escapeHtml(data.serviceName);
    const safeInstructorName = escapeHtml(data.instructorName);

    // 場所またはMeet URLを表示
    let locationHtml = '';
    if (data.deliveryType === 'remote' && data.meetUrl) {
      const safeMeetUrl = escapeHtml(data.meetUrl);
      locationHtml = `
        <p style="margin: 4px 0;"><strong>参加URL:</strong> <a href="${safeMeetUrl}" style="color: #0066cc;">${safeMeetUrl}</a></p>
      `;
    } else if (data.location) {
      locationHtml = `
        <p style="margin: 4px 0;"><strong>場所:</strong> ${escapeHtml(data.location)}</p>
      `;
    }

    await getResend().emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: data.userEmail,
      subject: `【${APP_NAME}】予約が確定しました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${safeUserName}様</h2>
          <p>予約が確定しました。以下の内容をご確認ください。</p>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #333;">予約詳細</h3>
            <p style="margin: 4px 0;"><strong>予約ID:</strong> ${escapeHtml(data.reservationId)}</p>
            <p style="margin: 4px 0;"><strong>サービス名:</strong> ${safeServiceName}</p>
            <p style="margin: 4px 0;"><strong>インストラクター:</strong> ${safeInstructorName}</p>
            <p style="margin: 4px 0;"><strong>日時:</strong> ${dateTimeText}</p>
            <p style="margin: 4px 0;"><strong>所要時間:</strong> ${data.duration}分</p>
            ${locationHtml}
            <p style="margin: 4px 0;"><strong>参加人数:</strong> ${data.participants}名</p>
            <p style="margin: 4px 0;"><strong>料金:</strong> ${priceText}</p>
            <p style="margin: 4px 0;"><strong>お支払い方法:</strong> ${paymentMethodText}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            当日お会いできることを楽しみにしています。<br>
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send reservation confirmation email:', error);
  }
}

/**
 * 新規予約通知メールをインストラクターに送信
 */
export async function sendReservationNotifyInstructorEmail(
  data: ReservationEmailData & { instructorEmail: string }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    const dateTimeText = formatDateJapanese(data.scheduledAt);
    const priceText = formatCurrency(data.price);

    const safeInstructorName = escapeHtml(data.instructorName);
    const safeServiceName = escapeHtml(data.serviceName);
    const safeUserName = escapeHtml(data.userName);

    await getResend().emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: data.instructorEmail,
      subject: `【${APP_NAME}】新しい予約が入りました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${safeInstructorName}様</h2>
          <p>新しい予約が入りました。</p>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #333;">予約詳細</h3>
            <p style="margin: 4px 0;"><strong>予約ID:</strong> ${escapeHtml(data.reservationId)}</p>
            <p style="margin: 4px 0;"><strong>サービス名:</strong> ${safeServiceName}</p>
            <p style="margin: 4px 0;"><strong>予約者:</strong> ${safeUserName}</p>
            <p style="margin: 4px 0;"><strong>日時:</strong> ${dateTimeText}</p>
            <p style="margin: 4px 0;"><strong>所要時間:</strong> ${data.duration}分</p>
            <p style="margin: 4px 0;"><strong>参加人数:</strong> ${data.participants}名</p>
            <p style="margin: 4px 0;"><strong>料金:</strong> ${priceText}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            予約詳細は管理画面からご確認ください。
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send reservation notification email to instructor:', error);
  }
}

/**
 * キャンセル確認メールをユーザーに送信
 */
export async function sendCancellationConfirmationEmail(
  data: CancellationEmailData
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    const dateTimeText = formatDateJapanese(data.scheduledAt);

    const safeUserName = escapeHtml(data.userName);
    const safeServiceName = escapeHtml(data.serviceName);
    const safeInstructorName = escapeHtml(data.instructorName);

    // キャンセル理由の表示
    const cancelReasonHtml = data.cancelReason
      ? `<p style="margin: 4px 0;"><strong>キャンセル理由:</strong> ${escapeHtml(data.cancelReason)}</p>`
      : '';

    // 返金情報の表示
    let refundHtml = '';
    if (data.refundAmount && data.refundAmount > 0) {
      const refundAmountText = formatCurrency(data.refundAmount);
      const refundMethodText = data.refundMethod || 'ポイント';
      refundHtml = `
        <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">返金について</h3>
          <p style="margin: 4px 0;"><strong>返金額:</strong> ${refundAmountText}</p>
          <p style="margin: 4px 0;"><strong>返金方法:</strong> ${escapeHtml(refundMethodText)}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #555;">
            返金処理は完了しています。
          </p>
        </div>
      `;
    }

    // キャンセル者の表示
    let cancelledByText = '';
    switch (data.cancelledBy) {
      case 'user':
        cancelledByText = 'あなた';
        break;
      case 'instructor':
        cancelledByText = 'インストラクター';
        break;
      case 'admin':
        cancelledByText = '管理者';
        break;
    }

    await getResend().emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: data.userEmail,
      subject: `【${APP_NAME}】予約がキャンセルされました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${safeUserName}様</h2>
          <p>予約がキャンセルされました。</p>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #333;">キャンセル詳細</h3>
            <p style="margin: 4px 0;"><strong>予約ID:</strong> ${escapeHtml(data.reservationId)}</p>
            <p style="margin: 4px 0;"><strong>サービス名:</strong> ${safeServiceName}</p>
            <p style="margin: 4px 0;"><strong>インストラクター:</strong> ${safeInstructorName}</p>
            <p style="margin: 4px 0;"><strong>日時:</strong> ${dateTimeText}</p>
            <p style="margin: 4px 0;"><strong>キャンセル者:</strong> ${cancelledByText}</p>
            ${cancelReasonHtml}
          </div>

          ${refundHtml}

          <p style="color: #666; font-size: 14px;">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send cancellation confirmation email:', error);
  }
}

/**
 * キャンセル通知メールをインストラクターに送信
 */
export async function sendCancellationNotifyInstructorEmail(
  data: CancellationEmailData & { instructorEmail: string }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    const dateTimeText = formatDateJapanese(data.scheduledAt);

    const safeInstructorName = escapeHtml(data.instructorName);
    const safeServiceName = escapeHtml(data.serviceName);
    const safeUserName = escapeHtml(data.userName);

    // キャンセル理由の表示
    const cancelReasonHtml = data.cancelReason
      ? `<p style="margin: 4px 0;"><strong>キャンセル理由:</strong> ${escapeHtml(data.cancelReason)}</p>`
      : '';

    // キャンセル者の表示
    let cancelledByText = '';
    switch (data.cancelledBy) {
      case 'user':
        cancelledByText = 'ユーザー';
        break;
      case 'instructor':
        cancelledByText = 'あなた';
        break;
      case 'admin':
        cancelledByText = '管理者';
        break;
    }

    await getResend().emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: data.instructorEmail,
      subject: `【${APP_NAME}】予約がキャンセルされました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${safeInstructorName}様</h2>
          <p>予約がキャンセルされました。</p>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #333;">キャンセル詳細</h3>
            <p style="margin: 4px 0;"><strong>予約ID:</strong> ${escapeHtml(data.reservationId)}</p>
            <p style="margin: 4px 0;"><strong>サービス名:</strong> ${safeServiceName}</p>
            <p style="margin: 4px 0;"><strong>予約者:</strong> ${safeUserName}</p>
            <p style="margin: 4px 0;"><strong>日時:</strong> ${dateTimeText}</p>
            <p style="margin: 4px 0;"><strong>キャンセル者:</strong> ${cancelledByText}</p>
            ${cancelReasonHtml}
          </div>

          <p style="color: #666; font-size: 14px;">
            予約状況は管理画面からご確認ください。
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send cancellation notification email to instructor:', error);
  }
}
