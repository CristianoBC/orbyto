-- CreateEnum
CREATE TYPE "SatisfactionFollowUpStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SATISFACTION_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'SATISFACTION_LOW_RATING_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'SATISFACTION_FOLLOWUP_UPDATED';

-- AlterEnum
ALTER TYPE "NotificationEntity" ADD VALUE 'SATISFACTION';

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'SATISFACTION';

-- CreateTable
CREATE TABLE "ServiceOrderSatisfaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "lowRatingReason" TEXT,
    "followUpStatus" "SatisfactionFollowUpStatus",
    "followUpNotes" TEXT,
    "followedUpById" TEXT,
    "followedUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrderSatisfaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrderSatisfaction_serviceOrderId_key" ON "ServiceOrderSatisfaction"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderSatisfaction_tenantId_createdAt_idx" ON "ServiceOrderSatisfaction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceOrderSatisfaction_tenantId_rating_idx" ON "ServiceOrderSatisfaction"("tenantId", "rating");

-- CreateIndex
CREATE INDEX "ServiceOrderSatisfaction_tenantId_followUpStatus_idx" ON "ServiceOrderSatisfaction"("tenantId", "followUpStatus");

-- CreateIndex
CREATE INDEX "ServiceOrderSatisfaction_requesterId_idx" ON "ServiceOrderSatisfaction"("requesterId");

-- AddForeignKey
ALTER TABLE "ServiceOrderSatisfaction" ADD CONSTRAINT "ServiceOrderSatisfaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderSatisfaction" ADD CONSTRAINT "ServiceOrderSatisfaction_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderSatisfaction" ADD CONSTRAINT "ServiceOrderSatisfaction_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderSatisfaction" ADD CONSTRAINT "ServiceOrderSatisfaction_followedUpById_fkey" FOREIGN KEY ("followedUpById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
