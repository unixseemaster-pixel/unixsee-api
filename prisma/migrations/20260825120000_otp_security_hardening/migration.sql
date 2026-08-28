-- OTP security hardening: store a digest instead of the plaintext code, and
-- track verification attempts, consumption, and per-target issue volume.

-- Outstanding plaintext codes cannot be migrated into digests, and they are
-- short-lived by design. Drop them so no plaintext survives this migration;
-- clients simply request a new code.
DELETE FROM "otps";

-- AlterTable
ALTER TABLE "otps"
  DROP CONSTRAINT IF EXISTS "otps_otp_key";

DROP INDEX IF EXISTS "otps_otp_key";

ALTER TABLE "otps"
  DROP COLUMN IF EXISTS "otp";

ALTER TABLE "otps"
  ADD COLUMN IF NOT EXISTS "otp_hash" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "consumed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "request_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "request_window_started_at" TIMESTAMPTZ(6);
