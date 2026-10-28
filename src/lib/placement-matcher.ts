import { prisma } from "@/lib/prisma";
import { normalizeSubject } from "@/lib/classifier";
import { OpportunityStage } from "@prisma/client";

export interface CompanyExtractionResult {
  companyName: string;
  normalizedKey: string;
  batchCycle?: string;
  stage: OpportunityStage;
  confidence: number;
}

// Known common recruiter companies visiting campus with canonical branding
const KNOWN_COMPANIES: Array<{ name: string; key: string; patterns: RegExp[] }> = [
  { name: "Google", key: "google", patterns: [/\bgoogle\b/i] },
  { name: "Microsoft", key: "microsoft", patterns: [/\bmicrosoft\b/i] },
  { name: "Amazon", key: "amazon", patterns: [/\bamazon\b/i] },
  { name: "Nvidia", key: "nvidia", patterns: [/\bnvidia\b/i] },
  { name: "Tata Power", key: "tatapower", patterns: [/\btata\s*power\b/i] },
  { name: "Leadsquared", key: "leadsquared", patterns: [/\bleadsquared\b/i] },
  { name: "Kanini", key: "kanini", patterns: [/\bkanini\b/i] },
  { name: "Nykaa", key: "nykaa", patterns: [/\bnykaa\b/i] },
  { name: "Citi", key: "citi", patterns: [/\bciti(?:group)?\b/i, /\bcitibank\b/i] },
  { name: "Vcomply", key: "vcomply", patterns: [/\bvcomply\b/i] },
  { name: "Myfacto", key: "myfacto", patterns: [/\bmyfacto\b/i] },
  { name: "Scienaptic", key: "scienaptic", patterns: [/\bscienaptic\b/i] },
  { name: "ZS Associates", key: "zsassociates", patterns: [/\bzs\s*associates\b/i, /\bzs\b/i] },
  { name: "Zanskar Tech", key: "zanskartech", patterns: [/\bzanskar(?:\s*tech)?\b/i] },
  { name: "Arrowhead AI", key: "arrowheadai", patterns: [/\barrowhead(?:\s*ai)?\b/i] },
  { name: "Goldman Sachs", key: "goldmansachs", patterns: [/\bgoldman(?:\s*sachs)?\b/i] },
  { name: "Morgan Stanley", key: "morganstanley", patterns: [/\bmorgan\s*stanley\b/i] },
  { name: "JPMorgan Chase", key: "jpmorgan", patterns: [/\bjpmorgan(?:\s*chase)?\b/i, /\bjp\s*morgan\b/i] },
  { name: "Oracle", key: "oracle", patterns: [/\boracle\b/i] },
  { name: "Cisco", key: "cisco", patterns: [/\bcisco\b/i] },
  { name: "Intel", key: "intel", patterns: [/\bintel\b/i] },
  { name: "Qualcomm", key: "qualcomm", patterns: [/\bqualcomm\b/i] },
  { name: "Deloitte", key: "deloitte", patterns: [/\bdeloitte\b/i] },
  { name: "PwC", key: "pwc", patterns: [/\bpwc\b/i, /\bpricewaterhouse\b/i] },
  { name: "EY", key: "ey", patterns: [/\b(?:ernst\s*&\s*young|ey)\b/i] },
  { name: "KPMG", key: "kpmg", patterns: [/\bkpmg\b/i] },
  { name: "Infosys", key: "infosys", patterns: [/\binfosys\b/i] },
  { name: "TCS", key: "tcs", patterns: [/\btcs\b/i, /\btata\s*consultancy\b/i] },
  { name: "Wipro", key: "wipro", patterns: [/\bwipro\b/i] },
  { name: "Cognizant", key: "cognizant", patterns: [/\bcognizant\b/i, /\bcts\b/i] },
  { name: "Accenture", key: "accenture", patterns: [/\baccenture\b/i] },
  { name: "Capgemini", key: "capgemini", patterns: [/\bcapgemini\b/i] },
  { name: "IBM", key: "ibm", patterns: [/\bibm\b/i] },
  { name: "Samsung", key: "samsung", patterns: [/\bsamsung\b/i] },
  { name: "Optum", key: "optum", patterns: [/\boptum\b/i] },
  { name: "DE Shaw", key: "deshaw", patterns: [/\bd\.?\s*e\.?\s*shaw\b/i] },
  { name: "Barclays", key: "barclays", patterns: [/\bbarclays\b/i] },
  { name: "Wells Fargo", key: "wellsfargo", patterns: [/\bwells\s*fargo\b/i] },
  { name: "Schneider Electric", key: "schneider", patterns: [/\bschneider(?:\s*electric)?\b/i] },
];

/**
 * Extracts academic/placement batch cycle from text (e.g. "2027 batch", "2026 Batch", "2027")
 */
export function extractBatchCycle(text: string): string | undefined {
  const match = text.match(/\b(202[4-9])\s*(?:batch|passout)?\b/i);
  return match ? match[1] : undefined;
}

/**
 * Determines stage in recruitment pipeline based on subject and body indicators.
 */
export function detectOpportunityStage(subject: string, bodyText: string): OpportunityStage {
  const text = `${subject} ${bodyText}`.toLowerCase();

  // 1. Explicit registration or application phase (higher precedence than generic "offer" in subjects like "Internship Offer - Registration")
  if (/\b(registration|register here|apply before|superset link|registration link|eligibility criteria|batch registration)\b/i.test(subject)) {
    return OpportunityStage.REGISTRATION_OPEN;
  }
  // 2. Offer / congratulations / final selection
  if (/\b(congratulations|congrats|selected students|selection list|placed candidates)\b/i.test(subject) || (/\boffer\b/i.test(subject) && !/\bregistration\b/i.test(subject))) {
    return OpportunityStage.OFFER_CONGRATULATIONS;
  }
  // 3. Shortlist
  if (/\b(shortlist|shortlisted|selected for next round|round 2|round 3)\b/i.test(subject)) {
    return OpportunityStage.SHORTLIST_ANNOUNCED;
  }
  // 4. Interview
  if (/\b(interview|technical interview|hr interview|virtual interview|interview schedule)\b/i.test(subject)) {
    return OpportunityStage.INTERVIEW_SCHEDULED;
  }
  // 5. Pre-placement talk
  if (/\b(ppt|pre-placement talk|pre placement talk|presentation)\b/i.test(subject)) {
    return OpportunityStage.PRE_PLACEMENT_TALK;
  }
  // 6. Assessment / test
  if (/\b(online test|assessment|aptitude test|coding test|technical test|test is scheduled)\b/i.test(subject)) {
    return OpportunityStage.ASSESSMENT_SCHEDULED;
  }
  // 7. Drive announced
  if (/\b(campus drive|recruitment drive|hiring|opportunity|internship offer)\b/i.test(subject)) {
    return OpportunityStage.DRIVE_ANNOUNCED;
  }

  return OpportunityStage.UPDATE_GENERAL;
}

/**
 * Extracts company metadata from email subject and snippet deterministically.
 */
export function extractCompanyOpportunity(
  subject: string,
  snippet: string = "",
  body: string = ""
): CompanyExtractionResult | null {
  const cleanSubject = normalizeSubject(subject);
  const combined = `${cleanSubject} ${snippet} ${body.slice(0, 500)}`;
  const batchCycle = extractBatchCycle(combined);
  const stage = detectOpportunityStage(cleanSubject, combined);

  // 1. Check known company list
  for (const c of KNOWN_COMPANIES) {
    for (const pattern of c.patterns) {
      if (pattern.test(cleanSubject)) {
        return {
          companyName: c.name,
          normalizedKey: c.key,
          batchCycle,
          stage,
          confidence: 0.95,
        };
      }
    }
  }

  // Check known companies in snippet if subject starts with standard patterns like "Congratulations!!" or "Report immediately :"
  if (/^(congratulations|report immediately|kind attention|urgent|reminder)/i.test(cleanSubject)) {
    for (const c of KNOWN_COMPANIES) {
      for (const pattern of c.patterns) {
        if (pattern.test(snippet)) {
          return {
            companyName: c.name,
            normalizedKey: c.key,
            batchCycle,
            stage,
            confidence: 0.90,
          };
        }
      }
    }
  }

  // 2. Pattern extraction for phrases like:
  // - "Congratulations!! [Company Name] Super Dream Internship..."
  // - "[Company Name] next round of selection..."
  // - "[Company Name] online test is scheduled..."
  // - "Report immediately : [Company Name] Pre-placement talk..."
  const patterns = [
    /congratulations!*[:\s]+([A-Za-z0-9\s&.-]{3,30}?)\s+(?:super\s*dream|dream|regular|internship|selection)/i,
    /report\s*immediately\s*:\s*([A-Za-z0-9\s&.-]{3,30}?)\s+(?:pre-placement|online\s*test|next\s*round|campus\s*drive)/i,
    /([A-Za-z0-9\s&.-]{3,30}?)\s+next\s*round\s*of\s*selection/i,
    /([A-Za-z0-9\s&.-]{3,30}?)\s+(?:online\s*test|communication\s*test|aptitude\s*test)\s+is\s+scheduled/i,
    /([A-Za-z0-9\s&.-]{3,30}?)\s+(?:dream|super\s*dream)\s+internship\s+offer/i,
  ];

  for (const p of patterns) {
    const match = cleanSubject.match(p);
    if (match && match[1]) {
      const rawName = match[1].trim();
      // Filter out generic phrases
      if (
        !/^(dear|attention|urgent|update|cdc|placement|vit|campus|hall|all|students|notice|reminder)$/i.test(rawName) &&
        rawName.length >= 2 &&
        rawName.length <= 40
      ) {
        const normalizedKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
        return {
          companyName: rawName,
          normalizedKey,
          batchCycle,
          stage,
          confidence: 0.85,
        };
      }
    }
  }

  return null;
}

/**
 * Associates an email with a company placement opportunity in PostgreSQL.
 * User-isolated, idempotent, and updates the opportunity's latest activity and stage.
 */
export async function associateEmailOpportunity(emailId: string): Promise<string | null> {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    select: {
      id: true,
      userId: true,
      subject: true,
      snippet: true,
      bodyPlain: true,
      category: true,
      receivedAt: true,
      opportunityId: true,
    },
  });

  if (!email || email.category !== "CDC_AND_PLACEMENT") {
    return null;
  }

  const extraction = extractCompanyOpportunity(
    email.subject,
    email.snippet,
    email.bodyPlain || ""
  );

  if (!extraction) {
    return null;
  }

  const { companyName, normalizedKey, batchCycle, stage } = extraction;
  const cycleKey = batchCycle || "GENERAL";

  // Upsert the PlacementOpportunity for this user and company
  let opportunity = await prisma.placementOpportunity.findFirst({
    where: {
      userId: email.userId,
      normalizedKey,
      batchCycle: cycleKey,
    },
  });

  if (opportunity) {
    opportunity = await prisma.placementOpportunity.update({
      where: { id: opportunity.id },
      data: {
        companyName,
        lastActivityAt: email.receivedAt > opportunity.lastActivityAt ? email.receivedAt : opportunity.lastActivityAt,
        currentStage: stage,
        statusSnippet: normalizeSubject(email.subject).slice(0, 150),
      },
    });
  } else {
    opportunity = await prisma.placementOpportunity.create({
      data: {
        userId: email.userId,
        companyName,
        normalizedKey,
        batchCycle: cycleKey,
        currentStage: stage,
        statusSnippet: normalizeSubject(email.subject).slice(0, 150),
        lastActivityAt: email.receivedAt,
      },
    });
  }

  // Link the email to this opportunity
  await prisma.email.update({
    where: { id: emailId },
    data: { opportunityId: opportunity.id },
  });

  return opportunity.id;
}

/**
 * Reprocesses opportunities for all CDC & Placement emails for a given user.
 */
export async function reprocessUserOpportunities(userId: string): Promise<{ processed: number; matched: number }> {
  const emails = await prisma.email.findMany({
    where: {
      userId,
      category: "CDC_AND_PLACEMENT",
    },
    select: { id: true },
    orderBy: { receivedAt: "asc" }, // Process chronologically so lastActivityAt and stage reflect latest email
  });

  let matched = 0;
  for (const item of emails) {
    const oppId = await associateEmailOpportunity(item.id);
    if (oppId) matched++;
  }

  return { processed: emails.length, matched };
}
