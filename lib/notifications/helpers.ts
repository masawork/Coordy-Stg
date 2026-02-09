// lib/notifications/helpers.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationData {
  userId?: string; // null = 全ユーザー
  type: 'system' | 'admin' | 'action';
  category: 'verification' | 'payment' | 'reservation' | 'announcement' | 'withdrawal';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  expiresAt?: Date;
}

/**
 * 通知を作成
 */
export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId || null,
        type: data.type,
        category: data.category,
        priority: data.priority || 'medium',
        title: data.title,
        message: data.message,
        actionLabel: data.actionLabel || null,
        actionUrl: data.actionUrl || null,
        expiresAt: data.expiresAt || null,
      },
    });

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 電話番号確認完了時の通知
 */
export async function notifyPhoneVerificationComplete(userId: string) {
  return createNotification({
    userId,
    type: 'system',
    category: 'verification',
    priority: 'high',
    title: '✅ 電話番号確認が完了しました',
    message: '認証レベルがLevel 1（基本認証）にアップグレードされました。サービスの予約と決済が可能になりました。',
    actionLabel: 'プロフィールを確認',
    actionUrl: '/user/profile',
  });
}

/**
 * 本人確認（Level 2）完了時の通知
 */
export async function notifyIdentityVerificationComplete(userId: string) {
  return createNotification({
    userId,
    type: 'system',
    category: 'verification',
    priority: 'high',
    title: '✅ 本人確認が完了しました',
    message: '認証レベルがLevel 2（本人確認済み）にアップグレードされました。決済上限が解除され、全機能をご利用いただけます。',
    actionLabel: 'プロフィールを確認',
    actionUrl: '/user/profile',
  });
}

/**
 * カード登録完了時の通知
 */
export async function notifyPaymentMethodAdded(userId: string) {
  return createNotification({
    userId,
    type: 'system',
    category: 'payment',
    priority: 'medium',
    title: '💳 クレジットカードを登録しました',
    message: 'レッスンの予約時に登録したカードで決済されます。',
    actionLabel: 'カードを管理',
    actionUrl: '/user/payment-methods',
  });
}

/**
 * 銀行口座承認待ちの通知
 */
export async function notifyBankAccountPending(userId: string) {
  return createNotification({
    userId,
    type: 'system',
    category: 'payment',
    priority: 'medium',
    title: '🏦 銀行口座の確認中',
    message: '登録した銀行口座を確認しています。承認まで1〜3営業日お待ちください。',
  });
}

/**
 * 銀行口座承認完了時の通知
 */
export async function notifyBankAccountApproved(userId: string) {
  return createNotification({
    userId,
    type: 'system',
    category: 'payment',
    priority: 'high',
    title: '✅ 銀行口座が承認されました',
    message: '引き出し申請が可能になりました。',
    actionLabel: '引き出し申請',
    actionUrl: '/instructor/withdrawals',
  });
}

/**
 * 引き出し申請承認時の通知
 */
export async function notifyWithdrawalApproved(userId: string, amount: number) {
  return createNotification({
    userId,
    type: 'system',
    category: 'withdrawal',
    priority: 'high',
    title: '✅ 引き出し申請が承認されました',
    message: `¥${amount.toLocaleString()}の引き出し申請が承認されました。近日中に指定の口座に振り込まれます。`,
    actionLabel: '引き出し履歴を確認',
    actionUrl: '/instructor/withdrawals',
  });
}

/**
 * 引き出し申請却下時の通知
 */
export async function notifyWithdrawalRejected(userId: string, amount: number, reason: string) {
  return createNotification({
    userId,
    type: 'system',
    category: 'withdrawal',
    priority: 'high',
    title: '⚠️ 引き出し申請が却下されました',
    message: `¥${amount.toLocaleString()}の引き出し申請が却下されました。理由: ${reason}`,
    actionLabel: '引き出し履歴を確認',
    actionUrl: '/instructor/withdrawals',
  });
}

/**
 * 引き出し完了時の通知
 */
export async function notifyWithdrawalCompleted(userId: string, amount: number, netAmount: number) {
  return createNotification({
    userId,
    type: 'system',
    category: 'withdrawal',
    priority: 'high',
    title: '✅ 振込が完了しました',
    message: `¥${netAmount.toLocaleString()}を指定の口座に振り込みました。（引き出し額: ¥${amount.toLocaleString()}、手数料: ¥${amount - netAmount}）`,
    actionLabel: '引き出し履歴を確認',
    actionUrl: '/instructor/withdrawals',
  });
}

/**
 * 全ユーザーへのお知らせ（管理者が作成）
 */
export async function notifyAllUsers(
  title: string,
  message: string,
  actionLabel?: string,
  actionUrl?: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  return createNotification({
    userId: undefined, // null = 全ユーザー
    type: 'admin',
    category: 'announcement',
    priority,
    title,
    message,
    actionLabel,
    actionUrl,
  });
}

