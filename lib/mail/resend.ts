import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// 開発環境: onboarding@resend.dev（自分宛てのみ送信可能）
// 本番環境: 認証済みドメインのメールアドレスを設定
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Coordy';

interface BankAccountEmailData {
  bankName: string;
  branchName: string;
  accountHolderName: string;
}

/**
 * 銀行口座登録通知メールを送信
 */
export async function sendBankAccountCreatedEmail(
  toEmail: string,
  userName: string,
  bankAccount: BankAccountEmailData
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `【${APP_NAME}】銀行口座が登録されました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${userName}様</h2>
          <p>銀行口座が登録されました。</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>銀行名:</strong> ${bankAccount.bankName}</p>
            <p style="margin: 4px 0;"><strong>支店名:</strong> ${bankAccount.branchName}</p>
            <p style="margin: 4px 0;"><strong>口座名義:</strong> ${bankAccount.accountHolderName}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            この操作に心当たりがない場合は、すぐにサポートまでご連絡ください。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send bank account created email:', error);
  }
}

/**
 * 銀行口座更新通知メールを送信
 */
export async function sendBankAccountUpdatedEmail(
  toEmail: string,
  userName: string,
  bankAccount: BankAccountEmailData
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `【${APP_NAME}】銀行口座情報が変更されました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${userName}様</h2>
          <p>銀行口座情報が変更されました。</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>銀行名:</strong> ${bankAccount.bankName}</p>
            <p style="margin: 4px 0;"><strong>支店名:</strong> ${bankAccount.branchName}</p>
            <p style="margin: 4px 0;"><strong>口座名義:</strong> ${bankAccount.accountHolderName}</p>
          </div>
          <p style="color: #c00; font-size: 14px; font-weight: bold;">
            ⚠️ この操作に心当たりがない場合は、すぐにサポートまでご連絡ください。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send bank account updated email:', error);
  }
}

/**
 * 銀行口座削除通知メールを送信
 */
export async function sendBankAccountDeletedEmail(
  toEmail: string,
  userName: string,
  bankAccount: BankAccountEmailData
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `【${APP_NAME}】銀行口座が削除されました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${userName}様</h2>
          <p>以下の銀行口座が削除されました。</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>銀行名:</strong> ${bankAccount.bankName}</p>
            <p style="margin: 4px 0;"><strong>支店名:</strong> ${bankAccount.branchName}</p>
            <p style="margin: 4px 0;"><strong>口座名義:</strong> ${bankAccount.accountHolderName}</p>
          </div>
          <p style="color: #c00; font-size: 14px; font-weight: bold;">
            ⚠️ この操作に心当たりがない場合は、すぐにサポートまでご連絡ください。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールは${APP_NAME}から自動送信されています。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send bank account deleted email:', error);
  }
}
