import { prisma } from "@/lib/prisma";
import { classifyEmail } from "@/lib/classifier";
import { calculatePriorityScore } from "@/lib/priority-scorer";
import { extractDeadlines } from "@/lib/deadline-extractor";
import { EmailCategory } from "@prisma/client";

export interface ProcessingResult {
  emailId: string;
  category: EmailCategory;
  priorityScore: number;
  priorityLevel: string;
  deadlinesCount: number;
  success: boolean;
  error?: string;
}

export interface BatchProcessingSummary {
  processed: number;
  skipped: number;
  failed: number;
  results: ProcessingResult[];
}

/**
 * Analyzes and classifies a single email: category, priority, and candidate deadlines.
 * Updates the database record idempotently without breaking transaction boundaries.
 */
export async function processEmailIntelligence(emailId: string): Promise<ProcessingResult> {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { deadlines: true },
  });

  if (!email) {
    return {
      emailId,
      category: EmailCategory.UNCATEGORIZED,
      priorityScore: 0,
      priorityLevel: "NORMAL",
      deadlinesCount: 0,
      success: false,
      error: "Email not found",
    };
  }

  try {
    // 1. Extract deadlines first (needed as signal for priority scoring)
    const candidateDeadlines = extractDeadlines({
      subject: email.subject,
      body: email.bodyPlain || email.snippet,
      receivedAt: email.receivedAt,
    });

    const deadlineDates = candidateDeadlines.map((c) => c.dueDate);

    // 2. Classify Category
    // Fetch user's configured faculty contacts
    const facultyContacts = await prisma.facultyContact.findMany({
      where: { userId: email.userId },
      select: { email: true, name: true, courseLabel: true },
    });
    const userFacultyEmails = facultyContacts.map((f) => f.email);

    const classification = classifyEmail({
      subject: email.subject,
      sender: email.sender,
      senderAddress: email.senderAddress,
      body: email.bodyPlain || email.snippet,
      snippet: email.snippet,
      userFacultyEmails,
      userFacultyContacts: facultyContacts,
    });

    // Respect user manual override if previously set by user
    const hasManualOverride = email.isManualOverride && email.userCategoryOverride;
    const finalCategory = hasManualOverride ? email.userCategoryOverride! : classification.category;

    // 3. Compute Priority Score
    const priorityResult = calculatePriorityScore({
      subject: email.subject,
      sender: email.sender,
      senderAddress: email.senderAddress,
      category: finalCategory,
      body: email.bodyPlain || email.snippet,
      snippet: email.snippet,
      receivedAt: email.receivedAt,
      deadlineDates,
    });

    // 4. Update Email record with intelligence data
    await prisma.email.update({
      where: { id: email.id },
      data: {
        category: finalCategory,
        subCategory: classification.subCategory || email.subCategory,
        school: classification.school || email.school,
        classificationConfidence: classification.confidence,
        classificationReason: classification.explanation,
        classificationEngine: "rule-engine-v2",
        classifiedAt: new Date(),
        priorityScore: priorityResult.score,
        priorityLevel: priorityResult.level,
        priorityFactors: priorityResult.factors as any,
        isImportant: priorityResult.isImportant,
      },
    });

    // 5. Idempotent candidate deadline persistence
    // Check existing deadlines to avoid re-inserting duplicates
    const existingDates = new Set(
      email.deadlines.map((d) => d.dueDate.toISOString().slice(0, 10))
    );

    let createdDeadlines = 0;
    for (const candidate of candidateDeadlines) {
      const dateKey = candidate.dueDate.toISOString().slice(0, 10);
      if (!existingDates.has(dateKey)) {
        await prisma.deadline.create({
          data: {
            userId: email.userId,
            emailId: email.id,
            title: candidate.title?.toWellFormed() || "Untitled Deadline",
            description: candidate.actionText ? candidate.actionText.toWellFormed() : null,
            dueDate: candidate.dueDate,
            category: finalCategory,
            confidenceScore: candidate.confidenceScore,
            isCandidate: true, // Marked as candidate until user confirms
            evidenceSnippet: candidate.evidenceSnippet ? candidate.evidenceSnippet.toWellFormed() : null,
            status: "PENDING",
          },
        });
        existingDates.add(dateKey);
        createdDeadlines++;
      }
    }

    // 6. Placement Opportunity Grouping (Phase 7 Workstream C)
    if (finalCategory === "CDC_AND_PLACEMENT") {
      try {
        const { associateEmailOpportunity } = await import("@/lib/placement-matcher");
        await associateEmailOpportunity(email.id);
      } catch (oppErr) {
        console.warn(`Opportunity grouping warning for email ${email.id}:`, oppErr);
      }
    }

    return {
      emailId: email.id,
      category: finalCategory,
      priorityScore: priorityResult.score,
      priorityLevel: priorityResult.level,
      deadlinesCount: createdDeadlines,
      success: true,
    };
  } catch (err: any) {
    console.error(`Error processing intelligence for email ${emailId}:`, err);
    return {
      emailId,
      category: email.category,
      priorityScore: email.priorityScore,
      priorityLevel: email.priorityLevel,
      deadlinesCount: 0,
      success: false,
      error: err.message,
    };
  }
}

/**
 * Reprocesses existing emails in bounded batches for a user.
 * Supports up to 1000 emails when forceAll is requested.
 */
export async function reprocessUserEmails(
  userId: string,
  options: { limit?: number; forceAll?: boolean } = {}
): Promise<BatchProcessingSummary> {
  const maxLimit = options.forceAll ? 1000 : 100;
  const limit = Math.min(options.limit || (options.forceAll ? 1000 : 50), maxLimit);

  const whereClause: any = { userId };
  if (!options.forceAll) {
    // Process records that haven't been processed by Phase 5 engine yet
    whereClause.classifiedAt = null;
  }

  const emails = await prisma.email.findMany({
    where: whereClause,
    take: limit,
    select: { id: true },
    orderBy: { receivedAt: "desc" },
  });

  const summary: BatchProcessingSummary = {
    processed: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  for (const item of emails) {
    const res = await processEmailIntelligence(item.id);
    summary.results.push(res);
    if (res.success) {
      summary.processed++;
    } else {
      summary.failed++;
    }
  }

  return summary;
}
