-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('CONDO', 'APARTMENT', 'LANDED_HOUSE', 'TOWNSHIP', 'MIXED');

-- AlterEnum
ALTER TYPE "ActivityEntityType" ADD VALUE 'PROJECT';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "completion_date" TIMESTAMP(3),
ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "developer" TEXT,
ADD COLUMN     "launch_date" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "price_max" DECIMAL(14,2),
ADD COLUMN     "price_min" DECIMAL(14,2),
ADD COLUMN     "project_type" "ProjectType",
ADD COLUMN     "total_phases" INTEGER;

-- CreateIndex
CREATE INDEX "projects_org_id_deleted_at_idx" ON "projects"("org_id", "deleted_at");
