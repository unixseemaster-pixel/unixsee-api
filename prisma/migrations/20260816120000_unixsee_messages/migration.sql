-- CreateEnum
CREATE TYPE "UnixseeMessageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "unixsee_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "website_id" UUID,
    "status" "UnixseeMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "content_locale" VARCHAR(8) NOT NULL,
    "links" JSONB,
    "published_at" TIMESTAMPTZ(6),
    "withdrawn_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "unixsee_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unixsee_message_attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "unixsee_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unixsee_message_reads" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unixsee_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unixsee_messages_tenant_id_status_idx" ON "unixsee_messages"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "unixsee_messages_status_published_at_idx" ON "unixsee_messages"("status", "published_at");

-- CreateIndex
CREATE INDEX "unixsee_message_attachments_message_id_idx" ON "unixsee_message_attachments"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "unixsee_message_reads_message_id_user_id_key" ON "unixsee_message_reads"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "unixsee_messages" ADD CONSTRAINT "unixsee_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unixsee_messages" ADD CONSTRAINT "unixsee_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unixsee_messages" ADD CONSTRAINT "unixsee_messages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unixsee_message_attachments" ADD CONSTRAINT "unixsee_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "unixsee_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unixsee_message_reads" ADD CONSTRAINT "unixsee_message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "unixsee_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unixsee_message_reads" ADD CONSTRAINT "unixsee_message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
