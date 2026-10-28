-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IDLE', 'SYNCING', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('ACADEMICS', 'EXAMINATIONS', 'PLACEMENTS_AND_INTERNSHIPS', 'EVENTS_AND_CLUBS', 'ADMINISTRATIVE_AND_HOSTEL', 'GENERAL_ANNOUNCEMENTS', 'UNCATEGORIZED');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('PENDING', 'COMPLETED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSubjectId" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailAddress" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenTag" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastHistoryId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiSummariesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiDeadlineExtraction" BOOLEAN NOT NULL DEFAULT true,
    "allowedAiProviders" TEXT NOT NULL DEFAULT 'gemini',
    "autoArchiveRead" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "notifyDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '(No Subject)',
    "snippet" TEXT NOT NULL,
    "bodyPlain" TEXT,
    "bodyHtml" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "category" "EmailCategory" NOT NULL DEFAULT 'UNCATEGORIZED',
    "classificationConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "classificationReason" TEXT,
    "userCategoryOverride" "EmailCategory",
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "summaryGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "category" "EmailCategory" NOT NULL DEFAULT 'ACADEMICS',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLabel" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EmailLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSubjectId_key" ON "User"("googleSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GmailCredential_userId_key" ON "GmailCredential"("userId");

-- CreateIndex
CREATE INDEX "GmailCredential_userId_syncStatus_idx" ON "GmailCredential"("userId", "syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "Email_userId_receivedAt_idx" ON "Email"("userId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "Email_userId_category_idx" ON "Email"("userId", "category");

-- CreateIndex
CREATE INDEX "Email_userId_isImportant_idx" ON "Email"("userId", "isImportant");

-- CreateIndex
CREATE INDEX "Email_userId_senderAddress_idx" ON "Email"("userId", "senderAddress");

-- CreateIndex
CREATE INDEX "Email_userId_isArchived_isTrash_idx" ON "Email"("userId", "isArchived", "isTrash");

-- CreateIndex
CREATE UNIQUE INDEX "Email_userId_gmailMessageId_key" ON "Email"("userId", "gmailMessageId");

-- CreateIndex
CREATE INDEX "Deadline_userId_dueDate_idx" ON "Deadline"("userId", "dueDate" ASC);

-- CreateIndex
CREATE INDEX "Deadline_userId_status_idx" ON "Deadline"("userId", "status");

-- CreateIndex
CREATE INDEX "Deadline_emailId_idx" ON "Deadline"("emailId");

-- CreateIndex
CREATE INDEX "EmailLabel_emailId_idx" ON "EmailLabel"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLabel_emailId_name_key" ON "EmailLabel"("emailId", "name");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "GmailCredential" ADD CONSTRAINT "GmailCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLabel" ADD CONSTRAINT "EmailLabel_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
