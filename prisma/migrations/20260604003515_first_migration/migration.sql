-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'TENANT', 'USER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('MONITORING', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OtpContext" AS ENUM ('LOGIN', 'MONITORING_ACCESS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "password" TEXT,
    "full_name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "hashed_rt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vps_nodes" (
    "id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "user_id" UUID,
    "machine_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vps_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vps_metrics" (
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vps_nodes_id" UUID NOT NULL,
    "cpu_usage_percent" DOUBLE PRECISION NOT NULL,
    "memory_total_mb" INTEGER NOT NULL,
    "memory_used_mb" INTEGER NOT NULL,
    "litespeed_connections" INTEGER NOT NULL,
    "disk_read_bytes_per_second" BIGINT NOT NULL,
    "disk_write_bytes_per_second" BIGINT NOT NULL,
    "disk_iops" INTEGER NOT NULL,
    "storage_total_mb" INTEGER NOT NULL,
    "storage_available_mb" INTEGER NOT NULL,
    "network_rx_bytes_per_second" BIGINT NOT NULL,
    "network_tx_bytes_per_second" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vps_metrics_pkey" PRIMARY KEY ("recorded_at","vps_nodes_id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vps_nodes_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_metrics" (
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vps_nodes_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "concurrent_requests" INTEGER NOT NULL,
    "request_rate" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_metrics_pkey" PRIMARY KEY ("recorded_at","website_id")
);

-- CreateTable
CREATE TABLE "ssl_certificates" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "issuer" TEXT,
    "subject" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "serial_number" TEXT,
    "is_auto_renewable" BOOLEAN NOT NULL DEFAULT true,
    "status_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssl_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "website_id" UUID,
    "vps_node_id" UUID,
    "server_id" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "phone_number" TEXT,
    "expired_time" TIMESTAMP(3) NOT NULL,
    "identifier" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_requested_time" TIMESTAMP(3),
    "context" "OtpContext" DEFAULT 'LOGIN',

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "servers_name_key" ON "servers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vps_nodes_machine_id_key" ON "vps_nodes"("machine_id");

-- CreateIndex
CREATE INDEX "vps_metrics_vps_nodes_id_recorded_at_idx" ON "vps_metrics"("vps_nodes_id", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "websites_domain_key" ON "websites"("domain");

-- CreateIndex
CREATE INDEX "web_metrics_website_id_recorded_at_idx" ON "web_metrics"("website_id", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ssl_certificates_website_id_key" ON "ssl_certificates"("website_id");

-- CreateIndex
CREATE INDEX "alerts_website_id_idx" ON "alerts"("website_id");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "otps_otp_key" ON "otps"("otp");

-- CreateIndex
CREATE UNIQUE INDEX "otps_phone_number_key" ON "otps"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "otps_identifier_key" ON "otps"("identifier");

-- AddForeignKey
ALTER TABLE "vps_nodes" ADD CONSTRAINT "vps_nodes_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_nodes" ADD CONSTRAINT "vps_nodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps_metrics" ADD CONSTRAINT "vps_metrics_vps_nodes_id_fkey" FOREIGN KEY ("vps_nodes_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_vps_nodes_id_fkey" FOREIGN KEY ("vps_nodes_id") REFERENCES "vps_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_metrics" ADD CONSTRAINT "web_metrics_vps_nodes_id_fkey" FOREIGN KEY ("vps_nodes_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_metrics" ADD CONSTRAINT "web_metrics_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssl_certificates" ADD CONSTRAINT "ssl_certificates_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
