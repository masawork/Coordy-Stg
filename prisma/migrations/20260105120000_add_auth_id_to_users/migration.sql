-- Add auth_id and update unique constraints for users
ALTER TABLE "users" ADD COLUMN "auth_id" TEXT;

-- Remove email-only unique constraint and add composite unique
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_role_key" ON "users"("email", "role");

-- Index for auth_id lookups
CREATE INDEX "users_auth_id_idx" ON "users"("auth_id");
