-- プロフィールに認証関連フィールドを追加

-- client_profiles テーブルに full_name と認証フィールドを追加
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS identity_document_url TEXT,
ADD COLUMN IF NOT EXISTS identity_rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS identity_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS identity_reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS identity_reviewed_at TIMESTAMPTZ;

-- identity_verification_requests テーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS identity_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  document_type TEXT NOT NULL, -- 'driver_license', 'my_number_card', 'passport'
  document_front_url TEXT NOT NULL,
  document_back_url TEXT,
  submitted_full_name TEXT NOT NULL,
  submitted_address TEXT NOT NULL,
  submitted_date_of_birth DATE NOT NULL,
  rejected_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_verification_user_id ON identity_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verification_status ON identity_verification_requests(status);

