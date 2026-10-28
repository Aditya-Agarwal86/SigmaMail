-- CreateEnum
CREATE TYPE "SchoolCode" AS ENUM ('SCOPE', 'SENSE', 'SMEC', 'SAS', 'VISH', 'VSL', 'VSB', 'SBST', 'UNASSIGNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailCategory" ADD VALUE 'DEAN_ACADEMICS';
ALTER TYPE "EmailCategory" ADD VALUE 'REGISTRAR';
ALTER TYPE "EmailCategory" ADD VALUE 'ASST_DEAN_ACADEMICS';
ALTER TYPE "EmailCategory" ADD VALUE 'CDC_AND_PLACEMENT';
ALTER TYPE "EmailCategory" ADD VALUE 'SDC';
ALTER TYPE "EmailCategory" ADD VALUE 'SCHOOLS';
ALTER TYPE "EmailCategory" ADD VALUE 'TRANSPORT';
ALTER TYPE "EmailCategory" ADD VALUE 'HOSTEL';
ALTER TYPE "EmailCategory" ADD VALUE 'SPORTS';
ALTER TYPE "EmailCategory" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "school" "SchoolCode",
ADD COLUMN     "subCategory" TEXT,
ALTER COLUMN "classificationEngine" SET DEFAULT 'rule-engine-v2';

-- AlterTable
ALTER TABLE "GmailCredential" ADD COLUMN     "isSyncingAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncNextPageToken" TEXT,
ADD COLUMN     "totalEstimatedCount" INTEGER,
ADD COLUMN     "totalSyncedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FacultyContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "courseLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedSenderRule" (
    "id" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "displayName" TEXT,
    "targetCategory" "EmailCategory" NOT NULL,
    "targetSubtype" TEXT,
    "school" "SchoolCode",
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustedSenderRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacultyContact_userId_idx" ON "FacultyContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyContact_userId_email_key" ON "FacultyContact"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedSenderRule_senderEmail_key" ON "TrustedSenderRule"("senderEmail");

-- CreateIndex
CREATE INDEX "TrustedSenderRule_senderEmail_idx" ON "TrustedSenderRule"("senderEmail");

-- CreateIndex
CREATE INDEX "TrustedSenderRule_targetCategory_idx" ON "TrustedSenderRule"("targetCategory");

-- CreateIndex
CREATE INDEX "Email_userId_subCategory_idx" ON "Email"("userId", "subCategory");

-- CreateIndex
CREATE INDEX "Email_userId_school_idx" ON "Email"("userId", "school");

-- AddForeignKey
ALTER TABLE "FacultyContact" ADD CONSTRAINT "FacultyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
