-- Add verification fields to client_profiles
ALTER TABLE "client_profiles" 
ADD COLUMN "verification_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phone_verified_at" TIMESTAMP(3),
ADD COLUMN "identity_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "identity_verified_at" TIMESTAMP(3),
ADD COLUMN "identity_document_url" TEXT,
ADD COLUMN "identity_rejected_reason" TEXT;

-- Create phone_verifications table
CREATE TABLE "phone_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "phone_verifications_user_id_idx" ON "phone_verifications"("user_id");
CREATE INDEX "phone_verifications_phone_number_idx" ON "phone_verifications"("phone_number");

-- Add foreign key
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

