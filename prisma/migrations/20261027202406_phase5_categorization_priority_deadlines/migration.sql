-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- AlterTable
ALTER TABLE "Deadline" ADD COLUMN     "evidenceSnippet" TEXT,
ADD COLUMN     "isCandidate" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "classificationEngine" TEXT DEFAULT 'rule-engine-v1',
ADD COLUMN     "classifiedAt" TIMESTAMP(3),
ADD COLUMN     "priorityFactors" JSONB,
ADD COLUMN     "priorityLevel" "PriorityLevel" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "Deadline_userId_isCandidate_idx" ON "Deadline"("userId", "isCandidate");

-- CreateIndex
CREATE INDEX "Email_userId_priorityLevel_idx" ON "Email"("userId", "priorityLevel");
