-- Phase 1 domain foundations: tenants, memberships, commercial, support, ops.
-- Includes backfill of personal tenants for existing website owners.

CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');
CREATE TYPE "WebsiteLifecycleStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "PlanRequestStatus" AS ENUM ('SUBMITTED', 'LINKED', 'ENABLED', 'DECLINED');
CREATE TYPE "ComplementaryRequestStatus" AS ENUM ('SUBMITTED', 'QUOTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'WITHDRAWN', 'CANCELLED');
CREATE TYPE "DiscoveryStatus" AS ENUM ('NEW', 'REVIEWED', 'ASSIGNED', 'IGNORED');
CREATE TYPE "EnrollmentTokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "OperationalActionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "OperationalActionType" AS ENUM ('CACHE_CLEAR', 'OTHER');

ALTER TYPE "AlertStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "AlertStatus" ADD VALUE IF NOT EXISTS 'SUPPRESSED';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'fa';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_reason" TEXT;

CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tenants_name_idx" ON "tenants"("name");

CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "memberships_user_id_tenant_id_key" ON "memberships"("user_id", "tenant_id");
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_fa" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_fa" TEXT,
    "description_en" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "plans_is_published_sort_order_idx" ON "plans"("is_published", "sort_order");

ALTER TABLE "servers" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "vps_nodes" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" TIMESTAMPTZ(6);

ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "plan_id" UUID;
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "status" "WebsiteLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "websites" ALTER COLUMN "user_id" DROP NOT NULL;

-- Backfill personal tenants for existing website owners
INSERT INTO "tenants" ("id", "name", "display_name", "status", "created_at", "updated_at")
SELECT gen_random_uuid(),
       COALESCE(u.full_name, u.username, u.phone_number, u.id::text),
       COALESCE(u.full_name, u.username, u.phone_number),
       'ACTIVE',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "users" u
WHERE EXISTS (SELECT 1 FROM "websites" w WHERE w.user_id = u.id)
  AND NOT EXISTS (
    SELECT 1 FROM "memberships" m WHERE m.user_id = u.id
  );

INSERT INTO "memberships" ("id", "user_id", "tenant_id", "role", "created_at", "updated_at")
SELECT gen_random_uuid(), u.id, t.id, 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
JOIN "tenants" t ON t.name = COALESCE(u.full_name, u.username, u.phone_number, u.id::text)
WHERE EXISTS (SELECT 1 FROM "websites" w WHERE w.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM "memberships" m WHERE m.user_id = u.id);

UPDATE "websites" w
SET "tenant_id" = m."tenant_id"
FROM "memberships" m
WHERE w."user_id" = m."user_id"
  AND w."tenant_id" IS NULL
  AND m."role" = 'OWNER';

-- For any remaining websites without tenant, create orphan tenant
DO $$
DECLARE
  r RECORD;
  tid UUID;
BEGIN
  FOR r IN SELECT id FROM "websites" WHERE "tenant_id" IS NULL LOOP
    tid := gen_random_uuid();
    INSERT INTO "tenants" ("id", "name", "display_name", "status", "created_at", "updated_at")
    VALUES (tid, 'migrated-' || r.id::text, 'Migrated tenant', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    UPDATE "websites" SET "tenant_id" = tid WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE "websites" ALTER COLUMN "tenant_id" SET NOT NULL;
CREATE INDEX "websites_tenant_id_idx" ON "websites"("tenant_id");
CREATE INDEX "websites_plan_id_idx" ON "websites"("plan_id");
CREATE INDEX "websites_status_idx" ON "websites"("status");
ALTER TABLE "websites" ADD CONSTRAINT "websites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "websites" ADD CONSTRAINT "websites_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "acknowledged_at" TIMESTAMPTZ(6);
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "suppressed_at" TIMESTAMPTZ(6);

CREATE TABLE "server_enrollment_tokens" (
    "id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "EnrollmentTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6),
    "used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "server_enrollment_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "server_enrollment_tokens_token_hash_key" ON "server_enrollment_tokens"("token_hash");
CREATE INDEX "server_enrollment_tokens_server_id_status_idx" ON "server_enrollment_tokens"("server_id", "status");
ALTER TABLE "server_enrollment_tokens" ADD CONSTRAINT "server_enrollment_tokens_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "website_discoveries" (
    "id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "vps_node_id" UUID,
    "website_id" UUID,
    "domain" TEXT NOT NULL,
    "display_name" TEXT,
    "direct_admin_user" TEXT,
    "home_directory" TEXT,
    "document_root" TEXT,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'NEW',
    "raw_payload" JSONB,
    "assigned_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "website_discoveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "website_discoveries_server_id_domain_key" ON "website_discoveries"("server_id", "domain");
CREATE INDEX "website_discoveries_status_idx" ON "website_discoveries"("status");
CREATE INDEX "website_discoveries_vps_node_id_idx" ON "website_discoveries"("vps_node_id");
ALTER TABLE "website_discoveries" ADD CONSTRAINT "website_discoveries_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "website_discoveries" ADD CONSTRAINT "website_discoveries_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "website_discoveries" ADD CONSTRAINT "website_discoveries_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "plan_requests" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT,
    "website_domain" TEXT,
    "notes" TEXT,
    "tenant_id" UUID,
    "linked_user_id" UUID,
    "website_id" UUID,
    "created_by_user_id" UUID,
    "enabled_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "decline_reason" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "plan_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plan_requests_idempotency_key_key" ON "plan_requests"("idempotency_key");
CREATE INDEX "plan_requests_status_idx" ON "plan_requests"("status");
CREATE INDEX "plan_requests_plan_id_idx" ON "plan_requests"("plan_id");
CREATE INDEX "plan_requests_tenant_id_idx" ON "plan_requests"("tenant_id");
CREATE INDEX "plan_requests_website_id_idx" ON "plan_requests"("website_id");
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "service_catalog_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_fa" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_fa" TEXT,
    "description_en" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "service_catalog_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "service_catalog_items_code_key" ON "service_catalog_items"("code");
CREATE INDEX "service_catalog_items_is_published_sort_order_idx" ON "service_catalog_items"("is_published", "sort_order");

CREATE TABLE "complementary_service_requests" (
    "id" UUID NOT NULL,
    "catalog_item_id" UUID NOT NULL,
    "status" "ComplementaryRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT,
    "details" TEXT,
    "tenant_id" UUID,
    "website_id" UUID,
    "created_by_user_id" UUID,
    "withdrawn_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "complementary_service_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "complementary_service_requests_status_idx" ON "complementary_service_requests"("status");
CREATE INDEX "complementary_service_requests_catalog_item_id_idx" ON "complementary_service_requests"("catalog_item_id");
CREATE INDEX "complementary_service_requests_tenant_id_idx" ON "complementary_service_requests"("tenant_id");
ALTER TABLE "complementary_service_requests" ADD CONSTRAINT "complementary_service_requests_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "service_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complementary_service_requests" ADD CONSTRAINT "complementary_service_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complementary_service_requests" ADD CONSTRAINT "complementary_service_requests_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complementary_service_requests" ADD CONSTRAINT "complementary_service_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "service_quotations" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "notes" TEXT,
    "valid_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "service_quotations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_quotations_request_id_idx" ON "service_quotations"("request_id");
ALTER TABLE "service_quotations" ADD CONSTRAINT "service_quotations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "complementary_service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_assignments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "assignee_note" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "service_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_assignments_request_id_idx" ON "service_assignments"("request_id");
ALTER TABLE "service_assignments" ADD CONSTRAINT "service_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "complementary_service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_usage" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "service_usage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_usage_assignment_id_idx" ON "service_usage"("assignment_id");
ALTER TABLE "service_usage" ADD CONSTRAINT "service_usage_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "service_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_deliverables" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "delivered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "service_deliverables_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_deliverables_assignment_id_idx" ON "service_deliverables"("assignment_id");
ALTER TABLE "service_deliverables" ADD CONSTRAINT "service_deliverables_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "service_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "website_id" UUID,
    "created_by_id" UUID NOT NULL,
    "assignee_id" UUID,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tickets_tenant_id_status_idx" ON "tickets"("tenant_id", "status");
CREATE INDEX "tickets_assignee_id_idx" ON "tickets"("assignee_id");
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ticket_messages_ticket_id_created_at_idx" ON "ticket_messages"("ticket_id", "created_at");
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ticket_attachments" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ticket_attachments_ticket_id_idx" ON "ticket_attachments"("ticket_id");
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "author_id" UUID NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "title_fa" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "body_fa" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_status_published_at_idx" ON "notifications"("status", "published_at");
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notification_reads" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_reads_notification_id_user_id_key" ON "notification_reads"("notification_id", "user_id");
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "website_id" UUID,
    "type" TEXT NOT NULL,
    "summary_fa" TEXT NOT NULL,
    "summary_en" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activities_tenant_id_created_at_idx" ON "activities"("tenant_id", "created_at" DESC);
CREATE INDEX "activities_website_id_created_at_idx" ON "activities"("website_id", "created_at" DESC);
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "audit_records" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_records_created_at_idx" ON "audit_records"("created_at" DESC);
CREATE INDEX "audit_records_entity_type_entity_id_idx" ON "audit_records"("entity_type", "entity_id");
CREATE INDEX "audit_records_actor_id_idx" ON "audit_records"("actor_id");
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "operational_actions" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "type" "OperationalActionType" NOT NULL,
    "status" "OperationalActionStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotency_key" TEXT,
    "result_message" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "operational_actions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operational_actions_idempotency_key_key" ON "operational_actions"("idempotency_key");
CREATE INDEX "operational_actions_website_id_created_at_idx" ON "operational_actions"("website_id", "created_at" DESC);
CREATE INDEX "operational_actions_status_idx" ON "operational_actions"("status");
ALTER TABLE "operational_actions" ADD CONSTRAINT "operational_actions_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_actions" ADD CONSTRAINT "operational_actions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "actor_id" UUID,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_records_scope_key_key" ON "idempotency_records"("scope", "key");
CREATE INDEX "idempotency_records_created_at_idx" ON "idempotency_records"("created_at");
