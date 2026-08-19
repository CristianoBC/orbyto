-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'SETTINGS';

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "environmentName" TEXT,
    "institutionName" TEXT,
    "environmentDescription" TEXT,
    "allowedEmailDomain" TEXT,
    "requesterSelfRegistrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "internalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "operationalEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deadlineAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultServiceOrderDeadlineDays" INTEGER,
    "defaultTaskDeadlineDays" INTEGER,
    "defaultProjectDeadlineDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSettings_tenantId_idx" ON "TenantSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
