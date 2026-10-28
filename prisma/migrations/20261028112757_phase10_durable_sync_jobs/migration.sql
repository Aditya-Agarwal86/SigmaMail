-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'RETRY_WAIT', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "mode" TEXT NOT NULL DEFAULT 'FULL_IMPORT',
    "cursor" TEXT,
    "batchCount" INTEGER NOT NULL DEFAULT 0,
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncJob_userId_status_idx" ON "SyncJob"("userId", "status");

-- CreateIndex
CREATE INDEX "SyncJob_status_lockedAt_idx" ON "SyncJob"("status", "lockedAt");

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
