ALTER TABLE "websites"
ADD COLUMN "plan_activated_at" TIMESTAMPTZ(6);

-- Existing plan links were treated as active before this state was explicit.
UPDATE "websites"
SET "plan_activated_at" = "updated_at"
WHERE "plan_id" IS NOT NULL;
