-- Keep managed-server coverage separate from complementary-service lifecycle.
CREATE TYPE "WebsiteManagementCoverage" AS ENUM ('UNIXSEE_MANAGED', 'EXTERNAL_INFRASTRUCTURE', 'UNCLASSIFIED');
CREATE TYPE "ComplementaryWebsiteTargetType" AS ENUM ('EXISTING_WEBSITE', 'TYPED_DOMAIN');
CREATE TYPE "ComplementaryWebsiteResolutionState" AS ENUM ('PENDING_ACCEPTANCE', 'LINKED', 'DEFERRED_NO_TENANT');
CREATE TYPE "ComplementaryAuthorizationState" AS ENUM ('AUTHORIZED', 'NOT_AUTHORIZED', 'NOT_AUTHORIZED_AT_ACTIVATION');
CREATE TYPE "ComplementaryEngagementPreference" AS ENUM ('ONE_TIME', 'RECURRING', 'NOT_SURE');

ALTER TYPE "ComplementaryRequestStatus" ADD VALUE 'ACCEPTED' AFTER 'SUBMITTED';

ALTER TABLE "websites"
ADD COLUMN "management_coverage" "WebsiteManagementCoverage" NOT NULL DEFAULT 'UNCLASSIFIED';

-- Every Website predating external complementary targeting belonged to the managed-server journey.
UPDATE "websites"
SET "management_coverage" = 'UNIXSEE_MANAGED'
WHERE "management_coverage" = 'UNCLASSIFIED';

ALTER TABLE "complementary_service_requests"
ALTER COLUMN "contact_phone" DROP NOT NULL,
ADD COLUMN "title" TEXT,
ADD COLUMN "engagement_preference" "ComplementaryEngagementPreference",
ADD COLUMN "scope" JSONB,
ADD COLUMN "website_domain" TEXT,
ADD COLUMN "website_target_type" "ComplementaryWebsiteTargetType",
ADD COLUMN "website_coverage_snapshot" "WebsiteManagementCoverage",
ADD COLUMN "website_resolution_state" "ComplementaryWebsiteResolutionState",
ADD COLUMN "authorization_state" "ComplementaryAuthorizationState",
ADD COLUMN "accepted_at" TIMESTAMPTZ(6);

ALTER TABLE "service_assignments"
ADD COLUMN "authorization_state" "ComplementaryAuthorizationState";

CREATE INDEX "complementary_service_requests_created_by_user_id_idx"
ON "complementary_service_requests"("created_by_user_id");

CREATE INDEX "complementary_service_requests_website_domain_idx"
ON "complementary_service_requests"("website_domain");