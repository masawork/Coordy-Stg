-- AlterTable
ALTER TABLE "client_profiles" ADD COLUMN     "identity_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "identity_reviewed_by" TEXT,
ADD COLUMN     "identity_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "identity_verification_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_front_url" TEXT NOT NULL,
    "document_back_url" TEXT,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_verification_requests_user_id_idx" ON "identity_verification_requests"("user_id");

-- CreateIndex
CREATE INDEX "identity_verification_requests_status_idx" ON "identity_verification_requests"("status");

-- CreateIndex
CREATE INDEX "identity_verification_requests_created_at_idx" ON "identity_verification_requests"("created_at");

-- AddForeignKey
ALTER TABLE "identity_verification_requests" ADD CONSTRAINT "identity_verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_requests" ADD CONSTRAINT "identity_verification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
