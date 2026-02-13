// アプリケーション定数

export const APP_NAME = 'Coordy';
export const APP_DESCRIPTION = 'サービス予約プラットフォーム';

// ロール定義
export const ROLES = {
  USER: 'user',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// パス定義
export const PATHS = {
  HOME: '/',
  LOGIN: {
    USER: '/login/user',
    INSTRUCTOR: '/login/instructor',
    ADMIN: '/admin-portal/login', // 通常導線からはアクセス不可
  },
  SIGNUP: {
    USER: '/signup/user',
    INSTRUCTOR: '/signup/instructor',
  },
  USER: {
    HOME: '/user',
    SERVICES: '/user/services',
    RESERVATIONS: '/user/reservations',
    FAVORITES: '/user/favorites',
    ACTIVITY: '/user/activity',
    PROFILE: '/user/profile',
    PROFILE_SETUP: '/user/profile/setup',
    SETTINGS: '/user/settings',
    WALLET: '/user/wallet',
  },
  INSTRUCTOR: {
    HOME: '/instructor',
    IDENTITY_DOCUMENT: '/instructor/identity-document',
  },
  ADMIN: {
    HOME: '/manage/admin',
    DASHBOARD: '/manage/admin/dashboard',
    USERS: '/manage/admin/users',
    SERVICES: '/manage/admin/services',
    PENDING_CHARGES: '/manage/admin/pending-charges',
    IDENTITY_DOCUMENTS: '/manage/admin/identity-documents',
    SETTINGS: '/manage/admin/settings',
  },
} as const;

// 時間帯定義
export const TIME_SLOTS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
} as const;

export const TIME_SLOT_LABELS = {
  [TIME_SLOTS.MORNING]: '午前 (9:00-12:00)',
  [TIME_SLOTS.AFTERNOON]: '午後 (13:00-17:00)',
  [TIME_SLOTS.EVENING]: '夜 (18:00-21:00)',
} as const;

// 予約ステータス
export const RESERVATION_STATUS = {
  RESERVED: 'reserved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// 支払い種別
export const PAYMENT_TYPE = {
  DEPOSIT: 'deposit',
  USAGE: 'usage',
} as const;

// 支払い方法
export const PAYMENT_METHOD = {
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank_transfer',
} as const;

// 支払いステータス
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

