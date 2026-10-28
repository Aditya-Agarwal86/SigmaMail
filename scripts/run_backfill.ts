import { PrismaClient } from "@prisma/client";
import { backfillMessagesByIds } from "../src/lib/gmail-sync";

const prisma = new PrismaClient();

const targetIds = [
  "19c313cb870f7ebd",
  "19c3101e3baaed22",
  "19c2f1205c1929da",
  "19c2ed5d2eab7150",
  "19c2e377b4b33eb3",
  "19c2db1b249a3d8c",
  "19c03fcd1df18652",
  "19bd57d5bcec57e5",
  "19bb68434a795820"
];

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: "aditya.23bcb7086@vitapstudent.ac.in" },
    include: { gmailCredential: true, syncJobs: true }
  });

  if (!user || !user.gmailCredential) {
    throw new Error("Target user or GmailCredential not found");
  }

  console.log("=== 1. PREFLIGHT VERIFICATION ===");
  const beforeCount = await prisma.email.count({ where: { userId: user.id } });
  const beforeDistinct = await prisma.email.groupBy({ by: ["gmailMessageId"], where: { userId: user.id } });
  const existingTargetRows = await prisma.email.findMany({
    where: { userId: user.id, gmailMessageId: { in: targetIds } },
    select: { id: true, gmailMessageId: true }
  });

  const job = user.syncJobs[0];
  console.log(JSON.stringify({
    userId: user.id,
    email: user.email,
    beforeCount,
    beforeDistinct: beforeDistinct.length,
    existingTargetCount: existingTargetRows.length,
    credCursor: user.gmailCredential.syncNextPageToken,
    credStatus: user.gmailCredential.syncStatus,
    jobId: job?.id,
    jobStatus: job?.status,
    jobCursor: job?.cursor
  }, null, 2));

  console.log("\n=== 2. EXECUTING TARGETED BACKFILL ===");
  const backfillResult = await backfillMessagesByIds(user.id, targetIds);
  console.log("Backfill Summary:", JSON.stringify({
    totalRequested: backfillResult.totalRequested,
    alreadyStoredCount: backfillResult.alreadyStoredCount,
    insertedCount: backfillResult.insertedCount,
    updatedCount: backfillResult.updatedCount,
    failedCount: backfillResult.failedCount
  }, null, 2));

  console.log("\nOutcomes:");
  backfillResult.outcomes.forEach(o => {
    console.log(`- ${o.id}: [${o.status}] "${o.subject || o.error || ""}"`);
  });

  console.log("\n=== 3. POSTFLIGHT VERIFICATION ===");
  const afterCount = await prisma.email.count({ where: { userId: user.id } });
  const afterDistinct = await prisma.email.groupBy({ by: ["gmailMessageId"], where: { userId: user.id } });
  const verifiedTargetRows = await prisma.email.findMany({
    where: { userId: user.id, gmailMessageId: { in: targetIds } },
    select: { id: true, gmailMessageId: true, subject: true, receivedAt: true, category: true }
  });

  const refreshedCred = await prisma.gmailCredential.findUnique({ where: { userId: user.id } });
  const refreshedJob = await prisma.syncJob.findUnique({ where: { id: job.id } });

  console.log(JSON.stringify({
    afterCount,
    afterDistinct: afterDistinct.length,
    delta: afterCount - beforeCount,
    allNineStored: verifiedTargetRows.length === 9,
    credCursorUnchanged: refreshedCred?.syncNextPageToken === user.gmailCredential.syncNextPageToken,
    jobCursorUnchanged: refreshedJob?.cursor === job.cursor,
    jobStatusUnchanged: refreshedJob?.status === job.status
  }, null, 2));

  console.log("\nVerified Stored Records for Target IDs:");
  verifiedTargetRows.forEach(r => {
    console.log(`- [${r.gmailMessageId}] (${r.category}) "${r.subject}" at ${r.receivedAt.toISOString()}`);
  });
}

run().finally(() => prisma.$disconnect());
