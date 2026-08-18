-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteTokenHash" TEXT,
ADD COLUMN     "invitedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_inviteTokenHash_idx" ON "User"("inviteTokenHash");
