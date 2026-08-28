-- AlterTable: Make vpsNodeId optional on Website
ALTER TABLE "websites" ALTER COLUMN "vps_node_id" DROP NOT NULL;
