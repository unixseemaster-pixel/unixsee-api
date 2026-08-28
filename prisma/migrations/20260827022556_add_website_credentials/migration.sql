-- DropForeignKey
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_vps_node_id_fkey";

-- DropForeignKey
ALTER TABLE "websites" DROP CONSTRAINT "websites_vps_node_id_fkey";

-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "direct_admin_password" TEXT,
ADD COLUMN     "direct_admin_url" TEXT,
ADD COLUMN     "direct_admin_username" TEXT,
ADD COLUMN     "wordpress_admin_password" TEXT,
ADD COLUMN     "wordpress_admin_username" TEXT;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_vps_node_id_fkey" FOREIGN KEY ("vps_node_id") REFERENCES "vps_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
