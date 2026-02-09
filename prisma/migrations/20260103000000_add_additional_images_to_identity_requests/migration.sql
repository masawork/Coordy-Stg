-- Add additional_images column for supplemental documents
ALTER TABLE "identity_verification_requests"
ADD COLUMN IF NOT EXISTS "additional_images" TEXT[] NOT NULL DEFAULT '{}';
