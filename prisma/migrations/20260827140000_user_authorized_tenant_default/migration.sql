-- ADR 0016: commercial authorized flag + customer signup default TENANT

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authorized" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: prior KYC approve ⇒ commercially authorized
UPDATE "users" AS u
SET "authorized" = true
WHERE EXISTS (
  SELECT 1
  FROM "authorization_cases" AS c
  WHERE c."user_id" = u."id"
    AND c."status" = 'APPROVED'
);

-- Backfill: OWNER customers that were created as USER → TENANT
UPDATE "users" AS u
SET "role" = 'TENANT'
WHERE u."role" = 'USER'
  AND EXISTS (
    SELECT 1
    FROM "memberships" AS m
    WHERE m."user_id" = u."id"
      AND m."role" = 'OWNER'
  );
