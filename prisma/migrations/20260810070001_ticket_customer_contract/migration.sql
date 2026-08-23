-- Customer ticket contract: service category, number, resolve/auto-close fields.
-- PG retains unused TicketStatus value OPEN (cannot drop enum values safely).

CREATE TYPE "TicketServiceCategory" AS ENUM (
  'MANAGED_SERVER',
  'MIGRATION_OPTIMIZATION',
  'WOOCOMMERCE_SUPPORT',
  'SEO',
  'GRAPHIC_DESIGN',
  'PRODUCT_DATA_ENTRY',
  'SOCIAL_MEDIA_SUPPORT'
);

UPDATE "tickets" SET "status" = 'SUBMITTED' WHERE "status" = 'OPEN';

ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

CREATE SEQUENCE "ticket_number_seq" START WITH 1000 INCREMENT BY 1;

ALTER TABLE "tickets" ADD COLUMN "number" TEXT;
ALTER TABLE "tickets" ADD COLUMN "service" "TicketServiceCategory";
ALTER TABLE "tickets" ADD COLUMN "resolved_at" TIMESTAMPTZ(6);
ALTER TABLE "tickets" ADD COLUMN "auto_close_at" TIMESTAMPTZ(6);

UPDATE "tickets"
SET
  "service" = 'MANAGED_SERVER',
  "number" = 'TCK-' || nextval('ticket_number_seq')::text
WHERE "number" IS NULL;

ALTER TABLE "tickets" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "tickets" ALTER COLUMN "service" SET NOT NULL;

CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");
CREATE INDEX "tickets_status_auto_close_at_idx" ON "tickets"("status", "auto_close_at");
