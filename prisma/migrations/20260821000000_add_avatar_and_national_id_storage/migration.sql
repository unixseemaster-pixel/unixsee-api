-- AlterTable: Add avatarUrl to users
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;

-- AlterTable: Add nationalIdCardStorageKey to authorization_cases
ALTER TABLE "authorization_cases" ADD COLUMN "national_id_card_storage_key" TEXT;
