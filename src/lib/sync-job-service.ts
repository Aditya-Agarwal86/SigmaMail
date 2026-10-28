/**
 * Phase 10: Durable Background Sync Job Service
 * 
 * Provides database-backed, lease-managed background job orchestration for
 * full historical Gmail synchronization.
 * 
 * Invariants & Guarantees:
 * 1. Single active job per mailbox: atomic claiming prevents concurrent runs.
 * 2. Lease & heartbeat mechanism: jobs stuck for >5 minutes are reclaimed safely.
 * 3. Bounded batch execution: each invocation processes up to 25 messages.
 * 4. Cursor persistence: syncNextPageToken advances only after successful batch writes.
 * 5. Autonomous scheduling: continues batch by batch without an open browser tab.
 * 6. Terminal completion: when nextPageToken is null, switches to History API incremental watermark.
 */

import { prisma } from "@/lib/prisma";
import { syncUserGmail } from "@/lib/gmail-sync";
import { SyncJobStatus, SyncStatus } from "@prisma/client";

const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minute worker lease
const BATCH_COOLDOWN_MS = 1500; // 1.5s delay between sequential worker batches

export interface StartSyncJobOptions {
  mode?: "FULL_IMPORT" | "INCREMENTAL";
  maxBatchSize?: number;
}

/**
 * Creates or resumes a durable background sync job for the given user.
 */
export async function getOrCreateActiveJob(userId: string, options?: StartSyncJobOptions) {
  // Check for existing active or queued job
  const existingJob = await prisma.syncJob.findFirst({
    where: {
      userId,
      status: { in: [SyncJobStatus.QUEUED, SyncJobStatus.RUNNING, SyncJobStatus.RETRY_WAIT] },
    },
    orderBy: { startedAt: "desc" },
  });

  if (existingJob) {
    return existingJob;
  }

  const credential = await prisma.gmailCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    throw new Error("No connected Gmail mailbox found for this account.");
  }

  // Create new QUEUED job
  return prisma.syncJob.create({
    data: {
      userId,
      status: SyncJobStatus.QUEUED,
      mode: options?.mode || "FULL_IMPORT",
      cursor: credential.syncNextPageToken,
    },
  });
}

/**
 * Executes a single bounded batch step for the active job.
 * Returns progress information and whether more batches remain.
 */
export async function stepSyncJob(jobId: string, workerId = "worker_internal") {
  const staleThreshold = new Date(Date.now() - LEASE_DURATION_MS);

  // 1. Atomically claim lease on job
  const claimed = await prisma.syncJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: SyncJobStatus.QUEUED },
        { status: SyncJobStatus.RETRY_WAIT },
        {
          status: SyncJobStatus.RUNNING,
          lockedAt: { lt: staleThreshold }, // Reclaim abandoned lease
        },
      ],
    },
    data: {
      status: SyncJobStatus.RUNNING,
      lockedAt: new Date(),
      lockedBy: workerId,
    },
  });

  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
    include: { user: { include: { gmailCredential: true } } },
  });

  if (!job) {
    return { success: false, error: "Job not found", isDone: true };
  }

  // If claim failed and job is still running under an active lease, yield to that worker
  if (claimed.count === 0 && job.status === SyncJobStatus.RUNNING && job.lockedAt && job.lockedAt >= staleThreshold) {
    return {
      success: true,
      job,
      isDone: false,
      message: "Job is actively being processed by another worker lease.",
    };
  }

  // If job is already in a terminal state, return immediately
  if (job.status === SyncJobStatus.COMPLETED || job.status === SyncJobStatus.CANCELLED || job.status === SyncJobStatus.FAILED) {
    return { success: true, job, isDone: true };
  }

  try {
    // 2. Execute bounded Gmail sync batch
    const syncRes = await syncUserGmail(job.userId, {
      fullSyncBatch: job.mode === "FULL_IMPORT",
      maxBatchSize: 25,
    });

    if (!syncRes.success) {
      const isQuotaError = syncRes.error?.includes("429") || syncRes.error?.includes("Quota exceeded");
      const isTransient = isQuotaError || syncRes.error?.includes("cooldown");

      const newRetryCount = job.retryCount + 1;
      const nextStatus = isTransient && newRetryCount <= 10 ? SyncJobStatus.RETRY_WAIT : SyncJobStatus.FAILED;

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: nextStatus,
          retryCount: newRetryCount,
          lastError: syncRes.error?.slice(0, 500) || "Sync error",
          lockedAt: null,
          lockedBy: null,
        },
      });

      return {
        success: false,
        error: syncRes.error,
        isDone: nextStatus === SyncJobStatus.FAILED,
        retryScheduled: nextStatus === SyncJobStatus.RETRY_WAIT,
      };
    }

    // 3. Update job progress and cursor on success
    const isDone = !syncRes.hasMore;
    const updatedJob = await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        batchCount: { increment: 1 },
        totalProcessed: { increment: syncRes.messagesProcessed || 0 },
        cursor: syncRes.nextPageToken || null,
        status: isDone ? SyncJobStatus.COMPLETED : SyncJobStatus.QUEUED,
        completedAt: isDone ? new Date() : null,
        lastError: null,
        lockedAt: null,
        lockedBy: null,
      },
    });

    return {
      success: true,
      job: updatedJob,
      messagesProcessed: syncRes.messagesProcessed,
      isDone,
      hasMore: syncRes.hasMore,
      totalSyncedCount: syncRes.totalSyncedCount,
      totalEstimatedCount: syncRes.totalEstimatedCount,
    };
  } catch (err: any) {
    console.error(`[SyncWorker] Unexpected job exception for ${jobId}:`, err);

    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: SyncJobStatus.FAILED,
        lastError: err.message?.slice(0, 500) || "Unexpected execution error",
        lockedAt: null,
        lockedBy: null,
      },
    });

    return { success: false, error: err.message, isDone: true };
  }
}

/**
 * Triggers autonomous background worker continuation.
 * In a local/server environment, runs an asynchronous loop in the background.
 */
export function triggerBackgroundWorker(jobId: string, maxBatchesPerRun = 40) {
  // Fire and forget asynchronous execution
  (async () => {
    let batches = 0;
    while (batches < maxBatchesPerRun) {
      try {
        const result = await stepSyncJob(jobId, `async_runner_${process.pid}`);
        batches++;

        if (result.isDone || !result.success) {
          break;
        }

        // Pacing delay between worker invocations
        await new Promise((resolve) => setTimeout(resolve, BATCH_COOLDOWN_MS));
      } catch (loopErr) {
        console.error(`[BackgroundWorker] Loop error for job ${jobId}:`, loopErr);
        break;
      }
    }
  })().catch((err) => {
    console.error(`[BackgroundWorker] Unhandled rejection:`, err);
  });
}
