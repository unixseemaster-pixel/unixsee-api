-- Phase 1 agent v0.2 hard cutover: web-server-only inventory, stack and traffic.
CREATE TYPE "AgentCommandType" AS ENUM ('REFRESH_SITE_STACK');
CREATE TYPE "AgentCommandStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

ALTER TABLE "servers"
  ADD COLUMN "control_panel_url" TEXT;

ALTER TABLE "websites"
  ADD COLUMN "wordpress_admin_url" TEXT;

ALTER TABLE "website_discoveries"
  ADD COLUMN "virtual_host_name" TEXT,
  ADD COLUMN "discovered_at" TIMESTAMPTZ(6),
  ADD COLUMN "is_present" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "removed_at" TIMESTAMPTZ(6),
  ADD COLUMN "stack_checked_at" TIMESTAMPTZ(6),
  ADD COLUMN "stack_last_succeeded_at" TIMESTAMPTZ(6);

-- Preserve useful existing links once, then move ownership to admin-managed rows.
UPDATE "servers" AS server
SET "control_panel_url" = source."control_panel_url"
FROM (
  SELECT DISTINCT ON ("server_id") "server_id", "control_panel_url"
  FROM "website_discoveries"
  WHERE "control_panel_url" IS NOT NULL
  ORDER BY "server_id", "last_ingested_at" DESC NULLS LAST, "updated_at" DESC
) AS source
WHERE source."server_id" = server."id";

UPDATE "websites" AS website
SET "wordpress_admin_url" = discovery."wordpress_admin_url"
FROM "website_discoveries" AS discovery
WHERE discovery."website_id" = website."id"
  AND discovery."wordpress_admin_url" IS NOT NULL;

CREATE TABLE "website_traffic_snapshots" (
  "discovery_id" UUID NOT NULL,
  "website_id" UUID,
  "domain" TEXT NOT NULL,
  "active_visitor_count" INTEGER,
  "active_window_seconds" INTEGER,
  "active_window_started_at" TIMESTAMPTZ(6),
  "active_measured_at" TIMESTAMPTZ(6),
  "active_status" JSONB,
  "unique_visitors_24h" INTEGER,
  "visitors_24h_window_seconds" INTEGER,
  "visitors_24h_coverage_seconds" INTEGER,
  "visitors_24h_measured_at" TIMESTAMPTZ(6),
  "visitors_24h_algorithm" TEXT,
  "visitors_24h_status" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "website_traffic_snapshots_pkey" PRIMARY KEY ("discovery_id")
);

CREATE TABLE "agent_commands" (
  "id" UUID NOT NULL,
  "server_id" UUID NOT NULL,
  "vps_node_id" UUID NOT NULL,
  "discovery_id" UUID NOT NULL,
  "requested_by" UUID NOT NULL,
  "domain" TEXT NOT NULL,
  "type" "AgentCommandType" NOT NULL,
  "status" "AgentCommandStatus" NOT NULL DEFAULT 'QUEUED',
  "dedupe_key" TEXT,
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "leased_at" TIMESTAMPTZ(6),
  "lease_expires_at" TIMESTAMPTZ(6),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "finished_at" TIMESTAMPTZ(6),
  "error_code" TEXT,
  "result_metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "agent_commands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_commands_dedupe_key_key" ON "agent_commands"("dedupe_key");
CREATE INDEX "agent_commands_vps_node_id_status_requested_at_idx"
  ON "agent_commands"("vps_node_id", "status", "requested_at");
CREATE INDEX "agent_commands_discovery_id_requested_at_idx"
  ON "agent_commands"("discovery_id", "requested_at" DESC);
CREATE INDEX "website_traffic_snapshots_website_id_idx"
  ON "website_traffic_snapshots"("website_id");
CREATE INDEX "website_traffic_snapshots_domain_idx"
  ON "website_traffic_snapshots"("domain");

ALTER TABLE "website_traffic_snapshots"
  ADD CONSTRAINT "website_traffic_snapshots_discovery_id_fkey"
  FOREIGN KEY ("discovery_id") REFERENCES "website_discoveries"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "website_traffic_snapshots"
  ADD CONSTRAINT "website_traffic_snapshots_website_id_fkey"
  FOREIGN KEY ("website_id") REFERENCES "websites"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_commands"
  ADD CONSTRAINT "agent_commands_server_id_fkey"
  FOREIGN KEY ("server_id") REFERENCES "servers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_commands"
  ADD CONSTRAINT "agent_commands_vps_node_id_fkey"
  FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_commands"
  ADD CONSTRAINT "agent_commands_discovery_id_fkey"
  FOREIGN KEY ("discovery_id") REFERENCES "website_discoveries"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_commands"
  ADD CONSTRAINT "agent_commands_requested_by_fkey"
  FOREIGN KEY ("requested_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
