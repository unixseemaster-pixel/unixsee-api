-- CreateEnum
CREATE TYPE "AuthorizationCaseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'REJECTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "ContactChallengeState" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'SKIPPED_ALREADY_VERIFIED');

-- CreateTable
CREATE TABLE "authorization_cases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "AuthorizationCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "national_id" TEXT NOT NULL,
    "birth_date" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "mobile_challenge" "ContactChallengeState" NOT NULL DEFAULT 'UNVERIFIED',
    "mobile_belongs_to_national_id" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "email_challenge" "ContactChallengeState" NOT NULL DEFAULT 'UNVERIFIED',
    "province" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "postal_code" TEXT NOT NULL DEFAULT '',
    "national_id_card_file_name" TEXT,
    "attested_truthful" BOOLEAN NOT NULL DEFAULT false,
    "staff_reason" TEXT,
    "staff_fields_to_fix" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted_at" TIMESTAMPTZ(6),
    "decided_at" TIMESTAMPTZ(6),
    "decided_by_user_id" UUID,
    "tenant_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "authorization_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authorization_cases_user_id_status_idx" ON "authorization_cases"("user_id", "status");

-- CreateIndex
CREATE INDEX "authorization_cases_status_submitted_at_idx" ON "authorization_cases"("status", "submitted_at");

-- AddForeignKey
ALTER TABLE "authorization_cases" ADD CONSTRAINT "authorization_cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_cases" ADD CONSTRAINT "authorization_cases_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_cases" ADD CONSTRAINT "authorization_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
