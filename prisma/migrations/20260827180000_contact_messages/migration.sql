-- CreateEnum
CREATE TYPE "ContactMessageSubject" AS ENUM (
  'managedServer',
  'migrationOptimization',
  'woocommerceSupport',
  'seo',
  'graphicDesign',
  'productDataEntry',
  'socialMedia'
);

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "subject" "ContactMessageSubject" NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "activity_basin" TEXT,
    "message" TEXT NOT NULL,
    "attachment_keys" JSONB NOT NULL DEFAULT '[]',
    "locale" TEXT,
    "source" TEXT,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- CreateIndex
CREATE INDEX "contact_messages_email_idx" ON "contact_messages"("email");
