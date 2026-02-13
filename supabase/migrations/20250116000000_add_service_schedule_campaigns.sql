-- サービススケジュールとキャンペーン機能の追加
-- Prismaスキーマと同期

-- ========================================
-- ENUM型の作成
-- ========================================

-- RecurrenceType enum（サービスの繰り返しタイプ）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_type') THEN
    CREATE TYPE recurrence_type AS ENUM ('ONCE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');
  END IF;
END$$;

-- CampaignType enum（キャンペーンタイプ）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
    CREATE TYPE campaign_type AS ENUM (
      'PERCENT_OFF',
      'FIXED_DISCOUNT',
      'TRIAL',
      'EARLY_BIRD',
      'BULK',
      'FIRST_TIME',
      'REFERRAL',
      'SEASONAL'
    );
  END IF;
END$$;

-- ========================================
-- services テーブルにスケジュール関連カラムを追加
-- ========================================

-- recurrence_type カラム追加
ALTER TABLE services
ADD COLUMN IF NOT EXISTS recurrence_type recurrence_type DEFAULT 'ONCE';

-- available_days カラム追加（曜日の配列 例: ['monday', 'wednesday']）
ALTER TABLE services
ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT '{}';

-- start_time / end_time カラム追加（例: "10:00"）
ALTER TABLE services
ADD COLUMN IF NOT EXISTS start_time TEXT;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS end_time TEXT;

-- timezone カラム追加
ALTER TABLE services
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Tokyo';

-- valid_from / valid_until カラム追加（有効期間）
ALTER TABLE services
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- max_participants カラム追加
ALTER TABLE services
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1;

-- ========================================
-- service_schedules テーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS service_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_service_schedules_service_id ON service_schedules(service_id);
CREATE INDEX IF NOT EXISTS idx_service_schedules_date ON service_schedules(date);

-- 更新トリガー
DROP TRIGGER IF EXISTS update_service_schedules_updated_at ON service_schedules;
CREATE TRIGGER update_service_schedules_updated_at
  BEFORE UPDATE ON service_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- campaigns テーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE, -- NULL = 全サービス対象
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,

  -- キャンペーン情報
  name TEXT NOT NULL,
  description TEXT,
  type campaign_type NOT NULL,

  -- 割引設定
  discount_percent INTEGER, -- 割引率（%）
  discount_amount INTEGER,  -- 割引額（円）
  fixed_price INTEGER,      -- 固定価格（体験価格など）

  -- 適用条件
  min_purchase_amount INTEGER,   -- 最低購入金額
  min_booking_count INTEGER,     -- 最低予約回数（回数券用）
  max_usage_per_user INTEGER,    -- ユーザーあたり最大利用回数
  max_total_usage INTEGER,       -- 総利用回数上限
  is_first_time_only BOOLEAN DEFAULT false, -- 初回限定
  early_bird_days INTEGER,       -- 早期予約日数

  -- 期間設定
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,

  -- ステータス
  is_active BOOLEAN DEFAULT true,
  current_usage INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_campaigns_service_id ON campaigns(service_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_instructor_id ON campaigns(instructor_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_valid_period ON campaigns(valid_from, valid_until);

-- 更新トリガー
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- campaign_usages テーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS campaign_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reservation_id UUID,
  discount_amount INTEGER NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_campaign_usages_campaign_id ON campaign_usages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_usages_user_id ON campaign_usages(user_id);

-- ========================================
-- RLS ポリシーの設定
-- ========================================
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_usages ENABLE ROW LEVEL SECURITY;
