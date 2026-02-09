-- CreateEnum (IF NOT EXISTS を使用)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        CREATE TYPE "withdrawal_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
    END IF;
END $$;

-- CreateTable (IF NOT EXISTS を使用) - UUID型で統一
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_payment_method_id" TEXT,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "card_exp_month" INTEGER,
    "card_exp_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable (IF NOT EXISTS を使用) - UUID型で統一
CREATE TABLE IF NOT EXISTS "bank_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "account_type" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable (IF NOT EXISTS を使用) - UUID型で統一
CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "instructor_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "status" "withdrawal_status" NOT NULL DEFAULT 'PENDING',
    "rejected_reason" TEXT,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable (IF NOT EXISTS を使用) - UUID型で統一
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "action_label" TEXT,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable (IF NOT EXISTS を使用) - UUID型で統一
CREATE TABLE IF NOT EXISTS "admin_announcements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "author_id" UUID NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'all',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS を使用)
CREATE INDEX IF NOT EXISTS "payment_methods_user_id_idx" ON "payment_methods"("user_id");
CREATE INDEX IF NOT EXISTS "payment_methods_stripe_customer_id_idx" ON "payment_methods"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "withdrawal_requests_instructor_id_idx" ON "withdrawal_requests"("instructor_id");
CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "admin_announcements_is_published_idx" ON "admin_announcements"("is_published");
CREATE INDEX IF NOT EXISTS "admin_announcements_published_at_idx" ON "admin_announcements"("published_at");

-- AddForeignKey (既存の制約をチェックしてから追加)
DO $$
BEGIN
    -- payment_methods
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_methods_user_id_fkey'
    ) THEN
        ALTER TABLE "payment_methods"
        ADD CONSTRAINT "payment_methods_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- bank_accounts
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'bank_accounts_user_id_fkey'
    ) THEN
        ALTER TABLE "bank_accounts"
        ADD CONSTRAINT "bank_accounts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- withdrawal_requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'withdrawal_requests_instructor_id_fkey'
    ) THEN
        ALTER TABLE "withdrawal_requests"
        ADD CONSTRAINT "withdrawal_requests_instructor_id_fkey"
        FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'withdrawal_requests_bank_account_id_fkey'
    ) THEN
        ALTER TABLE "withdrawal_requests"
        ADD CONSTRAINT "withdrawal_requests_bank_account_id_fkey"
        FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE "notifications"
        ADD CONSTRAINT "notifications_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- admin_announcements
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'admin_announcements_author_id_fkey'
    ) THEN
        ALTER TABLE "admin_announcements"
        ADD CONSTRAINT "admin_announcements_author_id_fkey"
        FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
