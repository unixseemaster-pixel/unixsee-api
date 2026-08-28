-- CreateEnum
CREATE TYPE "BillingItemKind" AS ENUM ('MANAGED_PLAN', 'COMPLEMENTARY_SERVICE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'NONE');

-- CreateEnum
CREATE TYPE "BillingItemStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BillingCommercialState" AS ENUM ('ESTIMATED', 'QUOTED', 'AGREED', 'INVOICED_EXTERNALLY', 'SETTLED');

-- CreateEnum
CREATE TYPE "BillingCommercialModel" AS ENUM ('FIXED_SCOPE', 'RECURRING_RETAINER', 'QUOTA_PACKAGE', 'MILESTONE_PROJECT', 'CUSTOM_QUOTE');

-- CreateEnum
CREATE TYPE "BillingPeriodReason" AS ENUM ('ACTIVATION', 'RENEWAL', 'PLAN_REPLACEMENT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "billing_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "kind" "BillingItemKind" NOT NULL,
    "plan_id" UUID,
    "service_assignment_id" UUID,
    "source_plan_request_id" UUID,
    "source_quotation_id" UUID,
    "label_snapshot" TEXT NOT NULL,
    "commercial_model" "BillingCommercialModel" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "interval" "BillingInterval" NOT NULL,
    "status" "BillingItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "commercial_state" "BillingCommercialState" NOT NULL DEFAULT 'AGREED',
    "period_starts_at" TIMESTAMPTZ(6) NOT NULL,
    "period_ends_at" TIMESTAMPTZ(6),
    "renews_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "non_renewal_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_period_rows" (
    "id" UUID NOT NULL,
    "billing_item_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "reason" "BillingPeriodReason" NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_period_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_items_service_assignment_id_key" ON "billing_items"("service_assignment_id");

-- CreateIndex
CREATE INDEX "billing_items_tenant_id_idx" ON "billing_items"("tenant_id");

-- CreateIndex
CREATE INDEX "billing_items_website_id_kind_status_idx" ON "billing_items"("website_id", "kind", "status");

-- CreateIndex
CREATE INDEX "billing_items_renews_at_idx" ON "billing_items"("renews_at");

-- CreateIndex
CREATE INDEX "billing_items_period_ends_at_idx" ON "billing_items"("period_ends_at");

-- CreateIndex
CREATE INDEX "billing_period_rows_billing_item_id_starts_at_idx" ON "billing_period_rows"("billing_item_id", "starts_at");

-- AddForeignKey
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_service_assignment_id_fkey" FOREIGN KEY ("service_assignment_id") REFERENCES "service_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_source_plan_request_id_fkey" FOREIGN KEY ("source_plan_request_id") REFERENCES "plan_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_items" ADD CONSTRAINT "billing_items_source_quotation_id_fkey" FOREIGN KEY ("source_quotation_id") REFERENCES "service_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_period_rows" ADD CONSTRAINT "billing_period_rows_billing_item_id_fkey" FOREIGN KEY ("billing_item_id") REFERENCES "billing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_period_rows" ADD CONSTRAINT "billing_period_rows_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
