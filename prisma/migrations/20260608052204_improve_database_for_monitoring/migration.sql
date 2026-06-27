/*
  Warnings:

  - The primary key for the `otps` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vps_metrics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `vps_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `vps_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `vps_nodes_id` on the `vps_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `web_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `web_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `vps_nodes_id` on the `web_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `vps_nodes_id` on the `websites` table. All the data in the column will be lost.
  - Changed the type of `id` on the `otps` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `vps_node_id` to the `vps_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vps_node_id` to the `web_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vps_node_id` to the `websites` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VpsNodeStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'DEGRADED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "WebsiteProbeSource" AS ENUM ('AGENT', 'BACKEND', 'EXTERNAL');

-- DropForeignKey
ALTER TABLE "vps_metrics" DROP CONSTRAINT "vps_metrics_vps_nodes_id_fkey";

-- DropForeignKey
ALTER TABLE "web_metrics" DROP CONSTRAINT "web_metrics_vps_nodes_id_fkey";

-- DropForeignKey
ALTER TABLE "websites" DROP CONSTRAINT "websites_vps_nodes_id_fkey";

-- DropIndex
DROP INDEX "vps_metrics_vps_nodes_id_recorded_at_idx";

-- AlterTable
ALTER TABLE "alerts" ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "otps" DROP CONSTRAINT "otps_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "expired_time" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "last_requested_time" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "otps_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "servers" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "ssl_certificates" ALTER COLUMN "valid_from" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "valid_to" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "vps_metrics" DROP CONSTRAINT "vps_metrics_pkey",
DROP COLUMN "created_at",
DROP COLUMN "updated_at",
DROP COLUMN "vps_nodes_id",
ADD COLUMN     "cpu_core_count" INTEGER,
ADD COLUMN     "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "load_1" DOUBLE PRECISION,
ADD COLUMN     "load_15" DOUBLE PRECISION,
ADD COLUMN     "load_5" DOUBLE PRECISION,
ADD COLUMN     "memory_available_mb" INTEGER,
ADD COLUMN     "process_count" INTEGER,
ADD COLUMN     "swap_total_mb" INTEGER,
ADD COLUMN     "swap_used_mb" INTEGER,
ADD COLUMN     "uptime_seconds" BIGINT,
ADD COLUMN     "vps_node_id" UUID NOT NULL,
ALTER COLUMN "litespeed_connections" SET DEFAULT 0,
ADD CONSTRAINT "vps_metrics_pkey" PRIMARY KEY ("recorded_at", "vps_node_id");

-- AlterTable
ALTER TABLE "vps_nodes" ADD COLUMN     "agent_version" TEXT,
ADD COLUMN     "hostname" TEXT,
ADD COLUMN     "kernel_version" TEXT,
ADD COLUMN     "last_seen_at" TIMESTAMPTZ(6),
ADD COLUMN     "os_name" TEXT,
ADD COLUMN     "os_version" TEXT,
ADD COLUMN     "public_ip" TEXT,
ADD COLUMN     "status" "VpsNodeStatus" NOT NULL DEFAULT 'UNKNOWN',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "web_metrics" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
DROP COLUMN "vps_nodes_id",
ADD COLUMN     "active_connections" INTEGER,
ADD COLUMN     "bytes_in_per_second" BIGINT,
ADD COLUMN     "bytes_out_per_second" BIGINT,
ADD COLUMN     "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "processing_requests" INTEGER,
ADD COLUMN     "vps_node_id" UUID NOT NULL,
ALTER COLUMN "concurrent_requests" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "websites" DROP COLUMN "vps_nodes_id",
ADD COLUMN     "direct_admin_user" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "document_root" TEXT,
ADD COLUMN     "home_directory" TEXT,
ADD COLUMN     "last_is_up" BOOLEAN,
ADD COLUMN     "last_probe_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_response_time_ms" INTEGER,
ADD COLUMN     "last_status_code" INTEGER,
ADD COLUMN     "vps_node_id" UUID NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "website_probe_metrics" (
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "website_id" UUID NOT NULL,
    "probe_source" "WebsiteProbeSource" NOT NULL DEFAULT 'AGENT',
    "is_up" BOOLEAN NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "ttfb_ms" INTEGER,
    "error_message" TEXT,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_probe_metrics_pkey" PRIMARY KEY ("recorded_at","website_id","probe_source")
);

-- CreateTable
CREATE TABLE "website_ssl_metrics" (
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "website_id" UUID NOT NULL,
    "is_valid" BOOLEAN NOT NULL,
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "days_remaining" INTEGER,
    "issuer" TEXT,
    "subject" TEXT,
    "serial_number" TEXT,
    "status_message" TEXT,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_ssl_metrics_pkey" PRIMARY KEY ("recorded_at","website_id")
);

-- CreateTable
CREATE TABLE "vps_filesystem_metrics" (
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vps_node_id" UUID NOT NULL,
    "mount_point" TEXT NOT NULL,
    "filesystem" TEXT,
    "total_mb" INTEGER NOT NULL,
    "used_mb" INTEGER NOT NULL,
    "available_mb" INTEGER NOT NULL,
    "usage_percent" DOUBLE PRECISION NOT NULL,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vps_filesystem_metrics_pkey" PRIMARY KEY ("recorded_at","vps_node_id","mount_point")
);

-- CreateTable
CREATE TABLE "vps_network_interface_metrics" (
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vps_node_id" UUID NOT NULL,
    "interface_name" TEXT NOT NULL,
    "rx_bytes_per_second" BIGINT NOT NULL,
    "tx_bytes_per_second" BIGINT NOT NULL,
    "rx_packets_per_second" BIGINT,
    "tx_packets_per_second" BIGINT,
    "rx_errors" INTEGER NOT NULL DEFAULT 0,
    "tx_errors" INTEGER NOT NULL DEFAULT 0,
    "rx_drops" INTEGER NOT NULL DEFAULT 0,
    "tx_drops" INTEGER NOT NULL DEFAULT 0,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vps_network_interface_metrics_pkey" PRIMARY KEY ("recorded_at","vps_node_id","interface_name")
);

-- CreateTable
CREATE TABLE "vps_service_metrics" (
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vps_node_id" UUID NOT NULL,
    "service_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "status" TEXT,
    "memory_mb" INTEGER,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vps_service_metrics_pkey" PRIMARY KEY ("recorded_at","vps_node_id","service_name")
);

-- CreateIndex
CREATE INDEX "website_probe_metrics_website_id_recorded_at_idx" ON "website_probe_metrics"("website_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "website_probe_metrics_is_up_recorded_at_idx" ON "website_probe_metrics"("is_up", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "website_ssl_metrics_website_id_recorded_at_idx" ON "website_ssl_metrics"("website_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "website_ssl_metrics_is_valid_recorded_at_idx" ON "website_ssl_metrics"("is_valid", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_filesystem_metrics_vps_node_id_recorded_at_idx" ON "vps_filesystem_metrics"("vps_node_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_filesystem_metrics_vps_node_id_mount_point_recorded_at_idx" ON "vps_filesystem_metrics"("vps_node_id", "mount_point", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_network_interface_metrics_vps_node_id_recorded_at_idx" ON "vps_network_interface_metrics"("vps_node_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_network_interface_metrics_vps_node_id_interface_name_re_idx" ON "vps_network_interface_metrics"("vps_node_id", "interface_name", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_service_metrics_vps_node_id_recorded_at_idx" ON "vps_service_metrics"("vps_node_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_service_metrics_vps_node_id_service_name_recorded_at_idx" ON "vps_service_metrics"("vps_node_id", "service_name", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_service_metrics_is_active_recorded_at_idx" ON "vps_service_metrics"("is_active", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "alerts_vps_node_id_idx" ON "alerts"("vps_node_id");

-- CreateIndex
CREATE INDEX "alerts_server_id_idx" ON "alerts"("server_id");

-- CreateIndex
CREATE INDEX "alerts_started_at_idx" ON "alerts"("started_at");

-- CreateIndex
CREATE INDEX "alerts_website_id_started_at_idx" ON "alerts"("website_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "alerts_vps_node_id_started_at_idx" ON "alerts"("vps_node_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "ssl_certificates_valid_to_idx" ON "ssl_certificates"("valid_to");

-- CreateIndex
CREATE INDEX "ssl_certificates_is_valid_idx" ON "ssl_certificates"("is_valid");

-- CreateIndex
CREATE INDEX "vps_metrics_vps_node_id_recorded_at_idx" ON "vps_metrics"("vps_node_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "vps_nodes_server_id_idx" ON "vps_nodes"("server_id");

-- CreateIndex
CREATE INDEX "vps_nodes_user_id_idx" ON "vps_nodes"("user_id");

-- CreateIndex
CREATE INDEX "vps_nodes_status_idx" ON "vps_nodes"("status");

-- CreateIndex
CREATE INDEX "vps_nodes_last_seen_at_idx" ON "vps_nodes"("last_seen_at");

-- CreateIndex
CREATE INDEX "web_metrics_vps_node_id_recorded_at_idx" ON "web_metrics"("vps_node_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "websites_user_id_idx" ON "websites"("user_id");

-- CreateIndex
CREATE INDEX "websites_vps_node_id_idx" ON "websites"("vps_node_id");

-- CreateIndex
CREATE INDEX "websites_is_active_idx" ON "websites"("is_active");

-- CreateIndex
CREATE INDEX "websites_last_is_up_idx" ON "websites"("last_is_up");

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_metrics" ADD CONSTRAINT "vps_metrics_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_metrics" ADD CONSTRAINT "web_metrics_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_probe_metrics" ADD CONSTRAINT "website_probe_metrics_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_ssl_metrics" ADD CONSTRAINT "website_ssl_metrics_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_filesystem_metrics" ADD CONSTRAINT "vps_filesystem_metrics_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_network_interface_metrics" ADD CONSTRAINT "vps_network_interface_metrics_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_service_metrics" ADD CONSTRAINT "vps_service_metrics_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
