import { EmailCategory, PriorityLevel } from "@prisma/client";

export interface PriorityScoreResult {
  score: number; // 0 to 100
  level: PriorityLevel;
  isImportant: boolean;
  factors: PriorityFactor[];
  explanation: string;
}

export interface PriorityFactor {
  factor: string;
  points: number; // positive or negative
  reason: string;
}

export interface PriorityScoringInput {
  subject: string;
  sender: string;
  senderAddress: string;
  category: EmailCategory;
  body: string;
  snippet?: string;
  receivedAt: Date;
  deadlineDates?: Date[];
}

// Configurable priority thresholds
export const PRIORITY_THRESHOLDS = {
  URGENT: 75,
  HIGH: 55,
  NORMAL: 30,
};

// Trusted administrative and academic senders that warrant elevated priority consideration
const TRUSTED_AUTHORITY_PATTERNS = [
  /dean/i,
  /director/i,
  /registrar/i,
  /controller.*exam/i,
  /coe@/i,
  /cdc@/i,
  /pat@/i,
  /hostel\.warden/i,
  /proctor/i,
];

// Explicit urgency phrasing
const STRONG_URGENCY_PATTERNS = [
  { pattern: /\b(immediate\s*action\s*required|action\s*required)\b/i, points: 25, label: "Action required notice" },
  { pattern: /\b(deadline\s*today|closing\s*today|last\s*day\s*today|expires\s*today)\b/i, points: 30, label: "Immediate deadline today" },
  { pattern: /\b(final\s*reminder|last\s*call|strictly\s*before)\b/i, points: 20, label: "Final deadline reminder" },
  { pattern: /\b(mandatory\s*for\s*all|compulsory|strict\s*action)\b/i, points: 15, label: "Mandatory campus compliance" },
  { pattern: /\b(failure\s*to\s*(submit|attend|register)|will\s*be\s*debarred)\b/i, points: 25, label: "Penalty or debarment clause" },
];

// Negative signals that de-escalate priority
const LOW_PRIORITY_PATTERNS = [
  { pattern: /\b(newsletter|edition\s*[0-9]|weekly\s*digest|monthly\s*bulletin)\b/i, points: -20, label: "Periodic newsletter/digest" },
  { pattern: /\b(invitation\s*to\s*participate|cordially\s*invites|join\s*us\s*for|warm\s*greetings)\b/i, points: -15, label: "Generic event invitation" },
  { pattern: /\b(congratulations\s*to|celebrating\s*success|achievement)\b/i, points: -15, label: "Celebratory circular" },
  { pattern: /\b(photo\s*gallery|recap|highlights\s*of)\b/i, points: -20, label: "Event recap / gallery" },
  { pattern: /\b(lost\s*and\s*found|lost\s*item|found\s*in\s*room)\b/i, points: -10, label: "Lost and found inquiry" },
];

/**
 * Calculates a deterministic, explainable priority score between 0 and 100 for an email.
 */
export function calculatePriorityScore(input: PriorityScoringInput): PriorityScoreResult {
  let score = 25; // Neutral baseline for campus emails
  const factors: PriorityFactor[] = [
    { factor: "BASELINE", points: 25, reason: "Default baseline for university communications" },
  ];

  const fullText = `${input.subject}\n${input.body || input.snippet || ""}`.toLowerCase();
  const subjectLower = input.subject.toLowerCase();
  const senderAddress = (input.senderAddress || "").toLowerCase();
  const senderFull = (input.sender || "").toLowerCase();

  // 1. Category baseline weighting
  if (input.category === EmailCategory.EXAMINATIONS) {
    score += 20;
    factors.push({ factor: "CATEGORY_EXAMS", points: 20, reason: "Examination notices carry high academic consequence" });
  } else if (input.category === EmailCategory.PLACEMENTS_AND_INTERNSHIPS) {
    score += 15;
    factors.push({ factor: "CATEGORY_PLACEMENTS", points: 15, reason: "Placement drives have strict application windows" });
  } else if (input.category === EmailCategory.ACADEMICS) {
    score += 10;
    factors.push({ factor: "CATEGORY_ACADEMICS", points: 10, reason: "Academic course updates require student attention" });
  } else if (input.category === EmailCategory.EVENTS_AND_CLUBS) {
    score -= 10;
    factors.push({ factor: "CATEGORY_EVENTS", points: -10, reason: "Extracurricular club activities are optional" });
  }

  // 2. Sender authority check
  const isTrustedAuthority = TRUSTED_AUTHORITY_PATTERNS.some(
    (p) => p.test(senderAddress) || p.test(senderFull)
  );
  if (isTrustedAuthority) {
    score += 15;
    factors.push({ factor: "TRUSTED_SENDER", points: 15, reason: "From recognized institutional leadership or administrative office" });
  }

  // 3. Credible deadline proximity analysis
  if (input.deadlineDates && input.deadlineDates.length > 0) {
    const validDates = input.deadlineDates
      .map((d) => (d instanceof Date ? d : new Date(d)))
      .filter((d) => !isNaN(d.getTime()));

    if (validDates.length > 0) {
      // Find the earliest upcoming deadline
      const now = input.receivedAt instanceof Date ? input.receivedAt.getTime() : Date.now();
      const futureDeadlines = validDates.filter((d) => d.getTime() >= now - 12 * 60 * 60 * 1000); // within 12h leeway

      if (futureDeadlines.length > 0) {
        futureDeadlines.sort((a, b) => a.getTime() - b.getTime());
        const nearest = futureDeadlines[0];
        const hoursRemaining = (nearest.getTime() - now) / (1000 * 60 * 60);

        if (hoursRemaining <= 24) {
          score += 30;
          factors.push({ factor: "DEADLINE_URGENT", points: 30, reason: "Actionable deadline expires within 24 hours" });
        } else if (hoursRemaining <= 72) {
          score += 20;
          factors.push({ factor: "DEADLINE_SOON", points: 20, reason: "Actionable deadline expires within 3 days" });
        } else if (hoursRemaining <= 168) {
          score += 10;
          factors.push({ factor: "DEADLINE_UPCOMING", points: 10, reason: "Actionable deadline within 7 days" });
        }
      }
    }
  }

  // 4. Strong urgency phrasing in subject or body
  let urgencyMatched = 0;
  for (const item of STRONG_URGENCY_PATTERNS) {
    if (item.pattern.test(subjectLower)) {
      score += item.points;
      factors.push({ factor: "URGENCY_KEYWORD_SUBJECT", points: item.points, reason: `${item.label} in subject header` });
      urgencyMatched++;
      break; // count at most one primary urgency boost from subject
    } else if (item.pattern.test(fullText) && urgencyMatched === 0) {
      const halfPoints = Math.round(item.points * 0.7);
      score += halfPoints;
      factors.push({ factor: "URGENCY_KEYWORD_BODY", points: halfPoints, reason: `${item.label} in message content` });
      urgencyMatched++;
      break;
    }
  }

  // 5. Negative factors / low priority de-escalation
  for (const item of LOW_PRIORITY_PATTERNS) {
    if (item.pattern.test(subjectLower)) {
      score += item.points;
      factors.push({ factor: "DEESCALATE_SUBJECT", points: item.points, reason: `${item.label}` });
      break;
    } else if (item.pattern.test(fullText)) {
      score += Math.round(item.points * 0.6);
      factors.push({ factor: "DEESCALATE_CONTENT", points: Math.round(item.points * 0.6), reason: `${item.label}` });
      break;
    }
  }

  // Bound score between 0 and 100
  const boundedScore = Math.min(100, Math.max(0, score));

  // Determine priority level
  let level: PriorityLevel = PriorityLevel.LOW;
  if (boundedScore >= PRIORITY_THRESHOLDS.URGENT) {
    level = PriorityLevel.URGENT;
  } else if (boundedScore >= PRIORITY_THRESHOLDS.HIGH) {
    level = PriorityLevel.HIGH;
  } else if (boundedScore >= PRIORITY_THRESHOLDS.NORMAL) {
    level = PriorityLevel.NORMAL;
  }

  const isImportant = level === PriorityLevel.URGENT || level === PriorityLevel.HIGH;

  // Build transparent human-readable explanation
  const topReasons = factors
    .filter((f) => f.factor !== "BASELINE")
    .map((f) => `${f.reason} (${f.points > 0 ? "+" : ""}${f.points})`);

  const explanation = topReasons.length > 0
    ? `Score ${boundedScore}/100 (${level}): ${topReasons.slice(0, 3).join("; ")}.`
    : `Score ${boundedScore}/100 (${level}): Standard informational circular.`;

  return {
    score: boundedScore,
    level,
    isImportant,
    factors,
    explanation,
  };
}
