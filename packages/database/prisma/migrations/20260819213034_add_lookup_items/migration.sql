-- CreateEnum
CREATE TYPE "LookupType" AS ENUM ('UNIT', 'DEPARTMENT', 'SERVICE_ORDER_CATEGORY', 'SYSTEM_PROCESS', 'PROJECT_TYPE', 'CANCELLATION_REASON');

-- CreateEnum
CREATE TYPE "LookupRelatedModule" AS ENUM ('SERVICE_ORDER', 'PROJECT', 'TASK');

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'LOOKUPS';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "LookupItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "LookupType" NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "relatedModule" "LookupRelatedModule",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LookupItem_tenantId_type_isActive_idx" ON "LookupItem"("tenantId", "type", "isActive");

-- CreateIndex
CREATE INDEX "LookupItem_tenantId_parentId_idx" ON "LookupItem"("tenantId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "LookupItem_tenantId_type_normalizedName_key" ON "LookupItem"("tenantId", "type", "normalizedName");

-- AddForeignKey
ALTER TABLE "LookupItem" ADD CONSTRAINT "LookupItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LookupItem" ADD CONSTRAINT "LookupItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LookupItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
