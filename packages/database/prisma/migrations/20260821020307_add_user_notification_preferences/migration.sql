-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internalNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "serviceOrderUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "serviceOrderCommentsEmail" BOOLEAN NOT NULL DEFAULT true,
    "serviceOrderAttachmentsEmail" BOOLEAN NOT NULL DEFAULT true,
    "projectUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "projectCommentsEmail" BOOLEAN NOT NULL DEFAULT true,
    "taskUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "taskCommentsEmail" BOOLEAN NOT NULL DEFAULT true,
    "deadlineAlertsEmail" BOOLEAN NOT NULL DEFAULT true,
    "satisfactionAlertsEmail" BOOLEAN NOT NULL DEFAULT true,
    "dailySummaryEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_tenantId_idx" ON "UserNotificationPreference"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_tenantId_userId_key" ON "UserNotificationPreference"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
