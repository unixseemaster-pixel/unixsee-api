-- AlterTable
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE "plan_requests" ALTER COLUMN "contact_phone" DROP NOT NULL;
