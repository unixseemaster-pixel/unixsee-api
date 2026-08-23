/*
  Warnings:

  - The values [OPEN] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `machine_id` on the `vps_nodes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[agent_instance_id]` on the table `vps_nodes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agent_instance_id` to the `vps_nodes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
ALTER TABLE "public"."tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "public"."TicketStatus_old";
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "websites" DROP CONSTRAINT "websites_user_id_fkey";

-- DropIndex
DROP INDEX "vps_nodes_machine_id_key";

-- AlterTable
ALTER TABLE "vps_nodes" DROP COLUMN "machine_id",
ADD COLUMN     "agent_instance_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "vps_nodes_agent_instance_id_key" ON "vps_nodes"("agent_instance_id");

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
