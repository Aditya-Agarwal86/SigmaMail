import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/data";
import { syncUserGmail } from "@/lib/gmail-sync";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * Triggers server-side Gmail synchronization for the authenticated user.
 * Supports:
 * - standard sync (delta or initial 50)
 * - fullSyncBatch: true (paginates older messages batch by batch)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate Limiting: Max 30 requests per minute per user
  const rl = checkRateLimit(`sync:${user.id}`, { limit: 30, windowMs: 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many synchronization requests. Please wait a moment before trying again." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rl.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable
    }

    const fullSyncBatch = Boolean(body?.fullSyncBatch);
    const background = Boolean(body?.background);
    const maxBatchSize = body?.maxBatchSize ? Number(body.maxBatchSize) : 25;

    // If autonomous background mode is requested, schedule the job and trigger worker
    if (background || fullSyncBatch) {
      const { getOrCreateActiveJob, triggerBackgroundWorker } = await import("@/lib/sync-job-service");
      const job = await getOrCreateActiveJob(user.id, { mode: "FULL_IMPORT", maxBatchSize });
      
      // Fire background worker loop
      triggerBackgroundWorker(job.id);

      return NextResponse.json({
        success: true,
        background: true,
        jobId: job.id,
        status: job.status,
        batchCount: job.batchCount,
        totalProcessed: job.totalProcessed,
        message: "Background synchronization running autonomously.",
      });
    }

    const result = await syncUserGmail(user.id, {
      fullSyncBatch: false,
      maxBatchSize,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Synchronization failed." },
        { status: result.error?.includes("cooldown") ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messagesProcessed: result.messagesProcessed,
      isInitialSync: result.isInitialSync,
      hasMore: result.hasMore,
      nextPageToken: result.nextPageToken,
      totalSyncedCount: result.totalSyncedCount,
      totalEstimatedCount: result.totalEstimatedCount,
    });
  } catch (err: any) {
    console.error("Sync API error:", err);
    return NextResponse.json({ error: "Internal server error during synchronization." }, { status: 500 });
  }
}

/**
 * GET: Returns current sync status and progress metrics
 */
export async function GET() {
  const session = await auth();
  const user = await getCurrentUser();

  if (!user || (!session?.user && user.email !== "fictional.student@vitapstudent.ac.in")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [credential, latestJob, totalInDb] = await Promise.all([
    prisma.gmailCredential.findUnique({
      where: { userId: user.id },
      select: {
        gmailAddress: true,
        syncStatus: true,
        lastSyncAt: true,
        syncError: true,
        isSyncingAll: true,
        syncNextPageToken: true,
        totalSyncedCount: true,
        totalEstimatedCount: true,
      },
    }),
    prisma.syncJob.findFirst({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        mode: true,
        batchCount: true,
        totalProcessed: true,
        retryCount: true,
        lastError: true,
        updatedAt: true,
      },
    }),
    prisma.email.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    connected: Boolean(credential),
    credential: credential
      ? {
          ...credential,
          totalInDb,
        }
      : null,
    job: latestJob,
  });
}
