-- Prismaスキーマとデータベースの同期
-- 不足しているカラムとテーブルを追加

-- ========================================
-- users テーブルの修正（Supabase Auth対応）
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_id TEXT;

-- auth_id のインデックス追加
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- email 単独の UNIQUE 制約を解除し、email + role の複合 UNIQUE に変更
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_role_key ON users(email, role);

-- ========================================
-- payment_methods テーブルの修正
-- ========================================
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- stripe_payment_method_id を NULL許容に変更（銀行振込の場合はNULL）
ALTER TABLE payment_methods
ALTER COLUMN stripe_payment_method_id DROP NOT NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer_id ON payment_methods(stripe_customer_id);

-- ========================================
-- notifications テーブルの修正
-- ========================================
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS action_label TEXT,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- user_id を NULL許容に変更（全ユーザー向け通知の場合）
ALTER TABLE notifications
ALTER COLUMN user_id DROP NOT NULL;

-- type カラムのインデックス追加
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ========================================
-- bank_accounts テーブルの修正
-- ========================================
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS bank_code TEXT,
ADD COLUMN IF NOT EXISTS branch_code TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- is_primary を is_default にマイグレーション（存在する場合）
UPDATE bank_accounts SET is_default = is_primary WHERE is_primary IS NOT NULL AND is_default IS NULL;

-- ========================================
-- withdrawal_requests テーブルの修正
-- ========================================
-- instructor_id カラム追加（既存の user_id とは別）
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount INTEGER,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 既存データがある場合は instructor_id に user_id をコピー
UPDATE withdrawal_requests SET instructor_id = user_id WHERE instructor_id IS NULL;

-- withdrawal_status enum 作成
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
  END IF;
END$$;

-- ========================================
-- phone_verifications テーブルの追加
-- ========================================
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL, -- 6桁の認証コード
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number ON phone_verifications(phone_number);

-- ========================================
-- identity_verification_requests テーブルの修正
-- ========================================
-- Prismaスキーマに合わせてカラム名を変更・追加
ALTER TABLE identity_verification_requests
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_note TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'user';

-- 既存データのマイグレーション
UPDATE identity_verification_requests
SET full_name = submitted_full_name,
    date_of_birth = submitted_date_of_birth,
    address = submitted_address
WHERE full_name IS NULL AND submitted_full_name IS NOT NULL;

-- UNIQUE制約を削除（複数回申請できるように）
ALTER TABLE identity_verification_requests DROP CONSTRAINT IF EXISTS identity_verification_requests_user_id_key;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_identity_verification_requests_created_at ON identity_verification_requests(created_at);

-- ========================================
-- RLS ポリシーの追加
-- ========================================
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verification_requests ENABLE ROW LEVEL SECURITY;

-- 更新トリガーの追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_methods_updated_at') THEN
    CREATE TRIGGER update_payment_methods_updated_at
      BEFORE UPDATE ON payment_methods
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bank_accounts_updated_at') THEN
    CREATE TRIGGER update_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_withdrawal_requests_updated_at') THEN
    CREATE TRIGGER update_withdrawal_requests_updated_at
      BEFORE UPDATE ON withdrawal_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notifications_updated_at') THEN
    CREATE TRIGGER update_notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_announcements_updated_at') THEN
    CREATE TRIGGER update_admin_announcements_updated_at
      BEFORE UPDATE ON admin_announcements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_identity_verification_requests_updated_at') THEN
    CREATE TRIGGER update_identity_verification_requests_updated_at
      BEFORE UPDATE ON identity_verification_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;
