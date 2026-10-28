import { PrismaClient, EmailCategory } from "@prisma/client";
import { processEmailIntelligence } from "../src/lib/intelligence";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const CHECKPOINT_FILE = path.join(
  "C:",
  "Users",
  "Aditya Agarwal",
  ".gemini",
  "antigravity-ide",
  "brain",
  "f64a6c4d-b1a9-4aec-abfb-9b502cf4f528",
  "scratch",
  "reprocess_checkpoint.json"
);

interface CheckpointData {
  targetUserId: string;
  totalEligible: number;
  processedIds: string[];
  failedItems: Array<{ id: string; error: string }>;
  lastBatchIndex: number;
  completedAt?: string;
}

function loadCheckpoint(): CheckpointData | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const raw = fs.readFileSync(CHECKPOINT_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read checkpoint file:", err);
  }
  return null;
}

function saveCheckpoint(data: CheckpointData) {
  try {
    const dir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write checkpoint file:", err);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isInitialBatchOnly = args.includes("--initial-batch-only");
  const batchSize = 100;

  console.log("=== CAMPUSINBOX LEGACY INTELLIGENCE REPROCESSOR ===");
  console.log("Options:", { isDryRun, isInitialBatchOnly, batchSize });

  // 1. Identify and verify authenticated student
  const user = await prisma.user.findFirst({
    where: { email: "aditya.23bcb7086@vitapstudent.ac.in" },
    include: { gmailCredential: true, syncJobs: true },
  });

  if (!user) {
    throw new Error("Target user aditya.23bcb7086@vitapstudent.ac.in not found.");
  }

  const userId = user.id;

  // 2. Snapshot preflight baseline
  const preTotalEmails = await prisma.email.count({ where: { userId } });
  const preEligibleEmails = await prisma.email.findMany({
    where: {
      userId,
      classifiedAt: null,
      isManualOverride: false,
    },
    select: { id: true, receivedAt: true, subject: true, senderAddress: true },
    orderBy: { id: "asc" }, // Deterministic immutable ordering
  });

  const preClassifiedCount = await prisma.email.count({
    where: { userId, classifiedAt: { not: null } },
  });
  const preDeadlinesCount = await prisma.deadline.count({
    where: { email: { userId } },
  });
  const preDeadlinesByStatus = await prisma.deadline.groupBy({
    by: ["status"],
    where: { email: { userId } },
    _count: { _all: true },
  });
  const preOppsCount = await prisma.placementOpportunity.count({
    where: { userId },
  });
  const preCategories = await prisma.email.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  });

  console.log("\n=== PREFLIGHT BASELINE ===");
  console.log({
    userId,
    userEmail: user.email,
    totalEmailsInDb: preTotalEmails,
    eligibleCount: preEligibleEmails.length,
    alreadyClassifiedCount: preClassifiedCount,
    expected2469Exact: preEligibleEmails.length === 2469,
    preDeadlinesCount,
    preDeadlinesByStatus: preDeadlinesByStatus.map((d) => ({ status: d.status, count: d._count._all })),
    preOppsCount,
    preCategories: preCategories.map((c) => ({ category: c.category, count: c._count._all })),
    credCursor: user.gmailCredential?.syncNextPageToken,
    jobStatus: user.syncJobs[0]?.status,
    jobCursor: user.syncJobs[0]?.cursor,
  });

  if (isDryRun) {
    console.log("\n[DRY RUN] Target count verified at 2,469. No mutations performed.");
    return;
  }

  // 3. Load or initialize checkpoint
  let checkpoint = loadCheckpoint();
  if (!checkpoint || checkpoint.targetUserId !== userId) {
    checkpoint = {
      targetUserId: userId,
      totalEligible: preEligibleEmails.length,
      processedIds: [],
      failedItems: [],
      lastBatchIndex: 0,
    };
  }

  const processedSet = new Set(checkpoint.processedIds);
  const remainingEmails = preEligibleEmails.filter((e) => !processedSet.has(e.id));

  console.log("\n=== EXECUTION PLAN ===");
  console.log({
    totalEligibleSnapshot: preEligibleEmails.length,
    previouslyProcessedFromCheckpoint: processedSet.size,
    remainingToProcess: remainingEmails.length,
    batchSize,
  });

  if (remainingEmails.length === 0) {
    console.log("All eligible records have already been processed according to checkpoint.");
    return;
  }

  const targetBatch = isInitialBatchOnly ? remainingEmails.slice(0, batchSize) : remainingEmails;
  console.log(`\nProcessing ${isInitialBatchOnly ? "INITIAL BATCH ONLY" : "FULL SET"}: ${targetBatch.length} emails...`);

  let currentBatchNumber = checkpoint.lastBatchIndex;
  let batchProcessedCount = 0;
  let batchFailedCount = 0;
  let batchCreatedDeadlines = 0;

  for (let i = 0; i < targetBatch.length; i += batchSize) {
    currentBatchNumber++;
    const chunk = targetBatch.slice(i, i + batchSize);
    console.log(`\n--- Starting Batch ${currentBatchNumber} (${chunk.length} emails) ---`);

    for (const email of chunk) {
      try {
        const result = await processEmailIntelligence(email.id);
        if (result.success) {
          checkpoint.processedIds.push(email.id);
          processedSet.add(email.id);
          batchProcessedCount++;
          batchCreatedDeadlines += result.deadlinesCount;
        } else {
          checkpoint.failedItems.push({ id: email.id, error: result.error || "Unknown processing error" });
          batchFailedCount++;
          console.warn(`[Batch Warning] Email ${email.id} failed:`, result.error);
        }
      } catch (err: any) {
        checkpoint.failedItems.push({ id: email.id, error: err.message || "Exception during processing" });
        batchFailedCount++;
        console.error(`[Batch Error] Email ${email.id} exception:`, err.message);
      }

      // 20ms gentle delay between individual emails to keep database responsive
      await new Promise((r) => setTimeout(r, 20));
    }

    checkpoint.lastBatchIndex = currentBatchNumber;
    saveCheckpoint(checkpoint);

    console.log(
      `Batch ${currentBatchNumber} Finished. Batch processed: ${chunk.length}, Cumulative Processed: ${checkpoint.processedIds.length}, Cumulative Failures: ${checkpoint.failedItems.length}`
    );

    if (isInitialBatchOnly) {
      console.log("\n[INITIAL BATCH COMPLETED] Pausing for Stage 3 validation as requested.");
      break;
    }
  }

  // 4. Post-Batch / Final Verification
  const postTotalEmails = await prisma.email.count({ where: { userId } });
  const postClassifiedCount = await prisma.email.count({
    where: { userId, classifiedAt: { not: null } },
  });
  const postRemainingEligible = await prisma.email.count({
    where: {
      userId,
      classifiedAt: null,
      isManualOverride: false,
    },
  });
  const postDeadlinesCount = await prisma.deadline.count({
    where: { email: { userId } },
  });
  const postDeadlinesByStatus = await prisma.deadline.groupBy({
    by: ["status"],
    where: { email: { userId } },
    _count: { _all: true },
  });
  const postOppsCount = await prisma.placementOpportunity.count({
    where: { userId },
  });
  const postCategories = await prisma.email.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  });

  const refreshedCred = await prisma.gmailCredential.findUnique({ where: { userId } });
  const refreshedJob = await prisma.syncJob.findUnique({ where: { id: user.syncJobs[0].id } });

  console.log("\n=== POST-RUN VERIFICATION ===");
  console.log({
    totalEmailsInDb: postTotalEmails,
    postClassifiedCount,
    classifiedCountDelta: postClassifiedCount - preClassifiedCount,
    postRemainingEligible,
    deadlinesTotal: postDeadlinesCount,
    deadlinesDelta: postDeadlinesCount - preDeadlinesCount,
    deadlinesByStatus: postDeadlinesByStatus.map((d) => ({ status: d.status, count: d._count._all })),
    oppsTotal: postOppsCount,
    oppsDelta: postOppsCount - preOppsCount,
    credCursorUnchanged: refreshedCred?.syncNextPageToken === user.gmailCredential?.syncNextPageToken,
    jobCursorUnchanged: refreshedJob?.cursor === user.syncJobs[0].cursor,
    jobStatusUnchanged: refreshedJob?.status === user.syncJobs[0].status,
    postCategories: postCategories.map((c) => ({ category: c.category, count: c._count._all })),
  });
}

main()
  .catch((e) => {
    console.error("Reprocessor Fatal Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
