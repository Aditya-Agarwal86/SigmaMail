-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('DRIVE_ANNOUNCED', 'REGISTRATION_OPEN', 'ASSESSMENT_SCHEDULED', 'PRE_PLACEMENT_TALK', 'INTERVIEW_SCHEDULED', 'SHORTLIST_ANNOUNCED', 'OFFER_CONGRATULATIONS', 'UPDATE_GENERAL');

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "opportunityId" TEXT;

-- CreateTable
CREATE TABLE "PlacementOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "batchCycle" TEXT,
    "currentStage" "OpportunityStage" NOT NULL DEFAULT 'DRIVE_ANNOUNCED',
    "statusSnippet" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementOpportunity_userId_lastActivityAt_idx" ON "PlacementOpportunity"("userId", "lastActivityAt" DESC);

-- CreateIndex
CREATE INDEX "PlacementOpportunity_userId_currentStage_idx" ON "PlacementOpportunity"("userId", "currentStage");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementOpportunity_userId_normalizedKey_batchCycle_key" ON "PlacementOpportunity"("userId", "normalizedKey", "batchCycle");

-- CreateIndex
CREATE INDEX "Email_opportunityId_idx" ON "Email"("opportunityId");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "PlacementOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementOpportunity" ADD CONSTRAINT "PlacementOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
