-- Phase 1 agent plane: discovery site-stack fields + 3m visitor samples + credential revoke.

ALTER TABLE "vps_nodes" ADD COLUMN IF NOT EXISTS "credentials_revoked_at" TIMESTAMPTZ(6);
ALTER TABLE "vps_nodes" ADD COLUMN IF NOT EXISTS "credentials_revoked_reason" TEXT;

ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "app_type" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "backend_address" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "control_panel_url" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "wordpress_admin_url" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "wordpress_version" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "php_version" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "php_version_scope" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "imagick_version" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "wordpress_update_status" TEXT;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "wordpress_update_checked_at" TIMESTAMPTZ(6);
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "field_status" JSONB;
ALTER TABLE "website_discoveries" ADD COLUMN IF NOT EXISTS "last_ingested_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "website_active_visitor_samples" (
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "discovery_id" UUID NOT NULL,
    "website_id" UUID,
    "domain" TEXT NOT NULL,
    "unique_ip_count" INTEGER NOT NULL,
    "window_seconds" INTEGER NOT NULL,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "measured_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "website_active_visitor_samples_pkey" PRIMARY KEY ("recorded_at", "discovery_id")
);

CREATE INDEX IF NOT EXISTS "website_active_visitor_samples_website_id_measured_at_idx"
  ON "website_active_visitor_samples"("website_id", "measured_at");
CREATE INDEX IF NOT EXISTS "website_active_visitor_samples_domain_measured_at_idx"
  ON "website_active_visitor_samples"("domain", "measured_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'website_active_visitor_samples_discovery_id_fkey'
  ) THEN
    ALTER TABLE "website_active_visitor_samples"
      ADD CONSTRAINT "website_active_visitor_samples_discovery_id_fkey"
      FOREIGN KEY ("discovery_id") REFERENCES "website_discoveries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
