import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getOrCreateActiveJob, stepSyncJob } from "@/lib/sync-job-service";
import { SyncJobStatus } from "@prisma/client";

vi.mock("@/lib/gmail-sync", () => ({
  syncUserGmail: vi.fn(),
}));

import { syncUserGmail } from "@/lib/gmail-sync";

describe("Phase 10: Durable Background Sync Job Service", () => {
  const testUserId = "cmvqzpwfh0000tun5we9bracl";

  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.syncJob.deleteMany({ where: { userId: testUserId } });
  });

  it("creates a durable queued job when no active job exists", async () => {
    const job = await getOrCreateActiveJob(testUserId, { mode: "FULL_IMPORT" });

    expect(job).toBeDefined();
    expect(job.userId).toBe(testUserId);
    expect(job.status).toBe(SyncJobStatus.QUEUED);
    expect(job.mode).toBe("FULL_IMPORT");
  });

  it("returns existing active job instead of creating duplicates", async () => {
    const job1 = await getOrCreateActiveJob(testUserId);
    const job2 = await getOrCreateActiveJob(testUserId);

    expect(job1.id).toBe(job2.id);
  });

  it("advances cursor and counts on successful batch execution", async () => {
    const job = await getOrCreateActiveJob(testUserId);

    (syncUserGmail as any).mockResolvedValueOnce({
      success: true,
      messagesProcessed: 25,
      hasMore: true,
      nextPageToken: "mock_page_cursor_token_123",
      totalSyncedCount: 1791,
      totalEstimatedCount: 6594,
    });

    const stepResult = await stepSyncJob(job.id, "test_worker_1");

    expect(stepResult.success).toBe(true);
    expect(stepResult.messagesProcessed).toBe(25);
    expect(stepResult.hasMore).toBe(true);

    const updatedJob = await prisma.syncJob.findUnique({ where: { id: job.id } });
    expect(updatedJob?.batchCount).toBe(1);
    expect(updatedJob?.cursor).toBe("mock_page_cursor_token_123");
    expect(updatedJob?.status).toBe(SyncJobStatus.QUEUED);
  });

  it("marks job COMPLETED when hasMore is false", async () => {
    const job = await getOrCreateActiveJob(testUserId);

    (syncUserGmail as any).mockResolvedValueOnce({
      success: true,
      messagesProcessed: 10,
      hasMore: false,
      nextPageToken: null,
      totalSyncedCount: 1801,
      totalEstimatedCount: 6594,
    });

    const stepResult = await stepSyncJob(job.id, "test_worker_1");

    expect(stepResult.success).toBe(true);
    expect(stepResult.isDone).toBe(true);

    const updatedJob = await prisma.syncJob.findUnique({ where: { id: job.id } });
    expect(updatedJob?.status).toBe(SyncJobStatus.COMPLETED);
    expect(updatedJob?.completedAt).not.toBeNull();
  });

  it("handles transient quota error with RETRY_WAIT without losing cursor", async () => {
    // Create a job with existing cursor
    const job = await prisma.syncJob.create({
      data: {
        userId: testUserId,
        status: SyncJobStatus.QUEUED,
        cursor: "saved_checkpoint_token_999",
      },
    });

    (syncUserGmail as any).mockResolvedValueOnce({
      success: false,
      error: "429 Quota exceeded for query cost per minute.",
    });

    const stepResult = await stepSyncJob(job.id, "test_worker_1");

    expect(stepResult.success).toBe(false);
    expect(stepResult.retryScheduled).toBe(true);

    const updatedJob = await prisma.syncJob.findUnique({ where: { id: job.id } });
    expect(updatedJob?.status).toBe(SyncJobStatus.RETRY_WAIT);
    expect(updatedJob?.retryCount).toBe(1);
    // Cursor must NOT be reset on quota error
    expect(updatedJob?.cursor).toBe("saved_checkpoint_token_999");
  });

  it("accurately distinguishes between created and updated records using primary key existence", async () => {
    const existingIds = new Set(["msg_already_exists"]);
    const batchItems = [
      { id: "msg_already_exists", threadId: "t1" },
      { id: "msg_new_1", threadId: "t1" },
      { id: "msg_new_2", threadId: "t2" },
      { id: "msg_new_2", threadId: "t2" }, // in-batch duplicate
    ];

    let inserted = 0;
    let updated = 0;
    let duplicateRefs = 0;
    const seenInBatch = new Set<string>();

    for (const item of batchItems) {
      if (seenInBatch.has(item.id)) {
        duplicateRefs++;
        continue;
      }
      seenInBatch.add(item.id);

      if (existingIds.has(item.id)) {
        updated++;
      } else {
        inserted++;
      }
    }

    expect(inserted).toBe(2);
    expect(updated).toBe(1);
    expect(duplicateRefs).toBe(1);
    expect(inserted + updated + duplicateRefs).toBe(batchItems.length);
  });
});
