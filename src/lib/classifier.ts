import { EmailCategory, SchoolCode } from "@prisma/client";

export interface ClassificationResult {
  category: EmailCategory;
  subCategory?: string; // e.g. PLACEMENT_DRIVE, PLACEMENT_RESULT, PLACEMENT_CONGRATULATIONS, PLACEMENT_UPDATE, PLACEMENT_GENERAL
  school?: SchoolCode;
  confidence: number; // 0.0 to 1.0
  evidence: string[];
  explanation: string;
  ruleMatched?: string;
}

export interface ClassificationInput {
  subject: string;
  sender: string;
  senderAddress: string;
  body: string;
  snippet?: string;
  userFacultyEmails?: string[]; // Lowercase normalized faculty emails configured by the current user
  userFacultyContacts?: Array<{ name: string; email: string; courseLabel?: string | null }>;
}

// 13 Primary Canonical Categories for Phase 6
export const CANONICAL_CATEGORIES: EmailCategory[] = [
  EmailCategory.DEAN_ACADEMICS,
  EmailCategory.REGISTRAR,
  EmailCategory.ASST_DEAN_ACADEMICS,
  EmailCategory.ACADEMICS,
  EmailCategory.EXAMINATIONS,
  EmailCategory.CDC_AND_PLACEMENT,
  EmailCategory.SDC,
  EmailCategory.SCHOOLS,
  EmailCategory.EVENTS_AND_CLUBS,
  EmailCategory.TRANSPORT,
  EmailCategory.HOSTEL,
  EmailCategory.SPORTS,
  EmailCategory.OTHER,
];

export const CATEGORY_DISPLAY_NAMES: Record<EmailCategory, string> = {
  [EmailCategory.DEAN_ACADEMICS]: "Dean Academics",
  [EmailCategory.REGISTRAR]: "Registrar",
  [EmailCategory.ASST_DEAN_ACADEMICS]: "Assistant Dean Academics",
  [EmailCategory.ACADEMICS]: "Academics",
  [EmailCategory.EXAMINATIONS]: "Examinations",
  [EmailCategory.CDC_AND_PLACEMENT]: "CDC & Placement",
  [EmailCategory.SDC]: "SDC",
  [EmailCategory.SCHOOLS]: "Schools",
  [EmailCategory.EVENTS_AND_CLUBS]: "Events & Clubs",
  [EmailCategory.TRANSPORT]: "Transport",
  [EmailCategory.HOSTEL]: "Hostel",
  [EmailCategory.SPORTS]: "Sports",
  [EmailCategory.OTHER]: "Other",
  // Legacy mappings for display safety
  [EmailCategory.PLACEMENTS_AND_INTERNSHIPS]: "CDC & Placement",
  [EmailCategory.ADMINISTRATIVE_AND_HOSTEL]: "Hostel",
  [EmailCategory.GENERAL_ANNOUNCEMENTS]: "Other",
  [EmailCategory.UNCATEGORIZED]: "Other",
};

export interface TrustedSenderRuleDefinition {
  senderEmail: string; // Exact normalized email
  targetCategory: EmailCategory;
  targetSubtype?: string;
  school?: SchoolCode;
  displayName: string;
  priority: number; // Higher numbers run first
}

// Centralized maintainable registry of verified university senders discovered from actual mailbox records & specifications
export const TRUSTED_SENDER_REGISTRY: TrustedSenderRuleDefinition[] = [
  // 1. Dean Academics
  {
    senderEmail: "dean.acad@vitap.ac.in",
    targetCategory: EmailCategory.DEAN_ACADEMICS,
    displayName: "Dean Academics",
    priority: 100,
  },
  // 2. Registrar
  {
    senderEmail: "registrar@vitap.ac.in",
    targetCategory: EmailCategory.REGISTRAR,
    displayName: "Registrar VIT-AP",
    priority: 100,
  },
  // 3. Assistant Dean Academics
  {
    senderEmail: "asstdean2.acad@vitap.ac.in",
    targetCategory: EmailCategory.ASST_DEAN_ACADEMICS,
    displayName: "Assistant Dean, Academics",
    priority: 100,
  },
  {
    senderEmail: "asstdean.acad@vitap.ac.in",
    targetCategory: EmailCategory.ASST_DEAN_ACADEMICS,
    displayName: "Assistant Dean Academics",
    priority: 100,
  },
  // 4. Controller of Examinations (CoE)
  {
    senderEmail: "coe@vitap.ac.in",
    targetCategory: EmailCategory.EXAMINATIONS,
    displayName: "Controller of Examinations",
    priority: 95,
  },
  {
    senderEmail: "controller.exam@vitap.ac.in",
    targetCategory: EmailCategory.EXAMINATIONS,
    displayName: "Controller of Examinations",
    priority: 95,
  },
  {
    senderEmail: "exam@vitap.ac.in",
    targetCategory: EmailCategory.EXAMINATIONS,
    displayName: "Examination Cell",
    priority: 95,
  },
  // 5. Hostel (Chief Warden MH / LH)
  {
    senderEmail: "cw.mh@vitap.ac.in",
    targetCategory: EmailCategory.HOSTEL,
    displayName: "Chief Warden-MH",
    priority: 95,
  },
  {
    senderEmail: "cw.lh@vitap.ac.in",
    targetCategory: EmailCategory.HOSTEL,
    displayName: "Chief Warden-LH",
    priority: 95,
  },
  {
    senderEmail: "hostel@vitap.ac.in",
    targetCategory: EmailCategory.HOSTEL,
    displayName: "Hostel Office",
    priority: 95,
  },
  // 6. Transport Manager
  {
    senderEmail: "transportmanager@vitap.ac.in",
    targetCategory: EmailCategory.TRANSPORT,
    displayName: "Transport Manager",
    priority: 95,
  },
  {
    senderEmail: "transport@vitap.ac.in",
    targetCategory: EmailCategory.TRANSPORT,
    displayName: "Transport Department",
    priority: 95,
  },
  // 7. Sports (Physical Education Department)
  {
    senderEmail: "ped@vitap.ac.in",
    targetCategory: EmailCategory.SPORTS,
    displayName: "Physical Education Department",
    priority: 95,
  },
  {
    senderEmail: "sports@vitap.ac.in",
    targetCategory: EmailCategory.SPORTS,
    displayName: "Sports Office",
    priority: 95,
  },
  // 8. Events & Clubs (Clubs and Chapters)
  {
    senderEmail: "asstdir.cac@vitap.ac.in",
    targetCategory: EmailCategory.EVENTS_AND_CLUBS,
    displayName: "Assistant Director – Clubs and Chapters",
    priority: 95,
  },
  {
    senderEmail: "sw.events@vitap.ac.in",
    targetCategory: EmailCategory.EVENTS_AND_CLUBS,
    displayName: "Student Welfare Events",
    priority: 90,
  },
  // 9. SDC
  {
    senderEmail: "noreply.sdc@vitap.ac.in",
    targetCategory: EmailCategory.SDC,
    displayName: "Skill Development Centre (SDC)",
    priority: 95,
  },
  {
    senderEmail: "sdc@vitap.ac.in",
    targetCategory: EmailCategory.SDC,
    displayName: "SDC Office",
    priority: 95,
  },
  // 10. CDC & Placement Senders
  {
    senderEmail: "students.cdc2027@vitap.ac.in",
    targetCategory: EmailCategory.CDC_AND_PLACEMENT,
    displayName: "No Reply CDC Info (2027 CDC)",
    priority: 90,
  },
  {
    senderEmail: "placement@vitap.ac.in",
    targetCategory: EmailCategory.CDC_AND_PLACEMENT,
    displayName: "PAT VIT-AP / Career Development Centre",
    priority: 90,
  },
  {
    senderEmail: "cdc@vitap.ac.in",
    targetCategory: EmailCategory.CDC_AND_PLACEMENT,
    displayName: "Career Development Centre",
    priority: 90,
  },
  {
    senderEmail: "pat@vitap.ac.in",
    targetCategory: EmailCategory.CDC_AND_PLACEMENT,
    displayName: "PAT Office",
    priority: 90,
  },
  // 11. Schools (Verified Deans / School offices)
  {
    senderEmail: "dean.vish@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.VISH,
    displayName: "Dean In-Charge VISH",
    priority: 85,
  },
  {
    senderEmail: "dean.scope@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.SCOPE,
    displayName: "Dean SCOPE",
    priority: 85,
  },
  {
    senderEmail: "dean.sense@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.SENSE,
    displayName: "Dean SENSE",
    priority: 85,
  },
  {
    senderEmail: "dean.smec@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.SMEC,
    displayName: "Dean SMEC",
    priority: 85,
  },
  {
    senderEmail: "dean.sas@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.SAS,
    displayName: "Dean SAS",
    priority: 85,
  },
  {
    senderEmail: "dean.vsl@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.VSL,
    displayName: "Dean VSL",
    priority: 85,
  },
  {
    senderEmail: "dean.vsb@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.VSB,
    displayName: "Dean VSB",
    priority: 85,
  },
  {
    senderEmail: "dean.sbst@vitap.ac.in",
    targetCategory: EmailCategory.SCHOOLS,
    school: SchoolCode.SBST,
    displayName: "Dean SBST",
    priority: 85,
  },
];

// Helper to sanitize and normalize email address
export function normalizeEmailAddress(raw: string): string {
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  const email = match ? match[1] : raw;
  return email.trim().toLowerCase();
}

/**
 * Cleans and normalizes email subject headers by stripping common email prefixes
 */
export function normalizeSubject(subject: string): string {
  if (!subject) return "";
  let clean = subject.trim();
  const prefixRegex = /^(\s*(re|fwd|fw|aw|sv|vs|ext|external)\s*:\s*|\[(ext|external)\]\s*)+/i;
  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, "").trim();
  }
  return clean;
}

/**
 * Normalizes email text content, isolating first message in forwarded/replied emails
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  // Strip quoted reply chains (e.g. "On Mon, Oct 20 ... wrote:" or "-----Original Message-----")
  let clean = text.replace(/(\r\n|\r|\n)On .* wrote:[\s\S]*/i, "");
  clean = clean.replace(/-----Original Message-----[\s\S]*/i, "");
  return clean.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Detects school identity from sender, subject, and body text
 */
export function detectSchool(senderAddress: string, subject: string, text: string): SchoolCode | undefined {
  const normSender = senderAddress.toLowerCase();
  const normSubj = subject.toLowerCase();
  const normText = text.toLowerCase();

  const schoolMap: { code: SchoolCode; patterns: RegExp[] }[] = [
    { code: SchoolCode.SCOPE, patterns: [/\bscope\b/i, /school of computer science/i] },
    { code: SchoolCode.SENSE, patterns: [/\bsense\b/i, /school of electronics/i] },
    { code: SchoolCode.SMEC, patterns: [/\bsmec\b/i, /school of mechanical/i] },
    { code: SchoolCode.SAS, patterns: [/\bsas\b/i, /school of advanced sciences/i] },
    { code: SchoolCode.VISH, patterns: [/\bvish\b/i, /school of social sciences and humanities/i] },
    { code: SchoolCode.VSL, patterns: [/\bvsl\b/i, /vit-ap school of law/i, /school of law/i] },
    { code: SchoolCode.VSB, patterns: [/\bvsb\b/i, /vit-ap school of business/i, /school of business/i] },
    { code: SchoolCode.SBST, patterns: [/\bsbst\b/i, /school of bio sciences/i] },
  ];

  // 1. Sender match
  for (const item of schoolMap) {
    if (normSender.includes(item.code.toLowerCase())) {
      return item.code;
    }
  }

  // 2. Subject match
  for (const item of schoolMap) {
    for (const pattern of item.patterns) {
      if (pattern.test(normSubj)) {
        return item.code;
      }
    }
  }

  // 3. Body match
  for (const item of schoolMap) {
    for (const pattern of item.patterns) {
      if (pattern.test(normText)) {
        return item.code;
      }
    }
  }

  return undefined;
}

/**
 * Classifies CDC & Placement messages into drives, updates, congratulations, or results
 */
export function detectPlacementSubtype(subject: string, text: string): { subtype: string; evidence: string } {
  const normSubj = subject.toLowerCase();
  const normText = text.toLowerCase();
  const combined = `${normSubj} ${normText}`;

  // 1. Congratulations / Selection Results
  if (
    /\b(hearty congratulations|congratulations to|selected for|selection list|list of selected|shortlisted students|placement results|offers released)\b/i.test(combined) &&
    !/\b(registration link|apply before|eligibility criteria)\b/i.test(normSubj)
  ) {
    if (/\b(congratulations|congrats|felicitations)\b/i.test(combined)) {
      return { subtype: "PLACEMENT_CONGRATULATIONS", evidence: "Placement congratulations announcement" };
    }
    return { subtype: "PLACEMENT_RESULT", evidence: "Placement selection results" };
  }

  // 2. Drive Updates (cancellation, postponement, venue change, time extension)
  if (
    /\b(postponed|rescheduled|slot change|time extension|deadline extended|link updated|revised schedule|drive update|shortlist for round)\b/i.test(normSubj) ||
    (/\b(update|amendment|extension|correction)\b/i.test(normSubj) && /\b(drive|test|interview)\b/i.test(normSubj))
  ) {
    return { subtype: "PLACEMENT_UPDATE", evidence: "Placement drive schedule or details update" };
  }

  // 3. Placement Drive (New drive, application, eligibility, registration)
  if (
    /\b(campus drive|placement drive|hiring|recruitment|internship opportunity|registration link|job description|ctc|package|eligibility criteria|apply before|superset)\b/i.test(combined)
  ) {
    return { subtype: "PLACEMENT_DRIVE", evidence: "New placement or internship drive announcement" };
  }

  return { subtype: "PLACEMENT_GENERAL", evidence: "General placement/CDC communication" };
}

/**
 * Multi-Stage Deterministic Classifier
 * Stage 1: Normalize message data
 * Stage 2: Resolve trusted role senders (Explicit University Roles)
 * Stage 3: Student-managed faculty addresses -> ACADEMICS
 * Stage 4: Verified School Senders / Signals -> SCHOOLS
 * Stage 5: Content Classification with weighted signals
 * Stage 6: Fallback to OTHER
 */
export function classifyEmail(input: ClassificationInput): ClassificationResult {
  const normSenderAddress = normalizeEmailAddress(input.senderAddress || input.sender);
  const normSubject = normalizeSubject(input.subject);
  const cleanSubject = normSubject.toLowerCase();
  const cleanBody = normalizeText(input.body || input.snippet || "");
  const senderFull = (input.sender || "").toLowerCase();

  // ----------------------------------------------------
  // STAGE 2: Explicit Trusted Role Senders (Highest Precedence)
  // ----------------------------------------------------
  // Check exact normalized sender email against trusted registry
  const trustedSender = TRUSTED_SENDER_REGISTRY.find(
    (rule) => rule.senderEmail.toLowerCase() === normSenderAddress
  );

  if (trustedSender) {
    let subCategory = trustedSender.targetSubtype;
    let school = trustedSender.school;

    // If it's a CDC / Placement sender, determine exact subcategory
    if (trustedSender.targetCategory === EmailCategory.CDC_AND_PLACEMENT) {
      const placementInfo = detectPlacementSubtype(cleanSubject, cleanBody);
      subCategory = placementInfo.subtype;
      return {
        category: EmailCategory.CDC_AND_PLACEMENT,
        subCategory,
        confidence: 0.98,
        evidence: [`Verified sender: ${trustedSender.displayName} (${trustedSender.senderEmail})`, placementInfo.evidence],
        explanation: `Classified as CDC & Placement (${subCategory}) from verified sender ${trustedSender.displayName}.`,
        ruleMatched: `trusted-sender:${trustedSender.senderEmail}`,
      };
    }

    // If it's a School sender
    if (trustedSender.targetCategory === EmailCategory.SCHOOLS) {
      return {
        category: EmailCategory.SCHOOLS,
        school: school || SchoolCode.UNASSIGNED,
        confidence: 0.98,
        evidence: [`Verified school sender: ${trustedSender.displayName} (${trustedSender.senderEmail})`],
        explanation: `Classified as Schools (${school || "Unassigned"}) from verified sender ${trustedSender.displayName}.`,
        ruleMatched: `trusted-sender:${trustedSender.senderEmail}`,
      };
    }

    return {
      category: trustedSender.targetCategory,
      subCategory,
      school,
      confidence: 0.98,
      evidence: [`Verified sender: ${trustedSender.displayName} (${trustedSender.senderEmail})`],
      explanation: `Classified as ${CATEGORY_DISPLAY_NAMES[trustedSender.targetCategory]} from verified role sender ${trustedSender.displayName}.`,
      ruleMatched: `trusted-sender:${trustedSender.senderEmail}`,
    };
  }

  // ----------------------------------------------------
  // STAGE 3: Student-Managed Faculty Directory
  // ----------------------------------------------------
  const facultyContacts = input.userFacultyContacts || [];
  const facultyEmails = (input.userFacultyEmails || []).map((e) => e.toLowerCase());

  // Also collect emails from facultyContacts if userFacultyEmails wasn't passed directly
  for (const contact of facultyContacts) {
    if (contact.email && !facultyEmails.includes(contact.email.toLowerCase())) {
      facultyEmails.push(contact.email.toLowerCase());
    }
  }

  if (facultyEmails.length > 0 || facultyContacts.length > 0) {
    // 3A: Direct sender email match
    const directMatchedEmail = facultyEmails.find(
      (facultyEmail) => facultyEmail === normSenderAddress
    );
    if (directMatchedEmail) {
      return {
        category: EmailCategory.ACADEMICS,
        confidence: 0.95,
        evidence: [`Student-managed faculty address: ${normSenderAddress}`],
        explanation: `Classified as Academics from student's configured faculty directory (${normSenderAddress}).`,
        ruleMatched: "user-faculty-directory:direct-email",
      };
    }

    // 3B: Faculty name match in sender display name (e.g. Google Classroom "Venu Gopal (Classroom)")
    for (const contact of facultyContacts) {
      const contactName = (contact.name || "").trim().toLowerCase();
      // Remove honorifics like "dr.", "prof.", "sir" when matching names if needed
      const cleanContactName = contactName.replace(/\b(dr|prof|professor|sir|faculty)\.?\b/gi, "").trim();
      const nameParts = cleanContactName.split(/\s+/).filter((p) => p.length >= 3);

      const senderDisplay = senderFull;
      const isSenderMatch = cleanContactName.length >= 3 && senderDisplay.includes(cleanContactName);
      const isClassroomMatch =
        (normSenderAddress === "no-reply@classroom.google.com" || senderDisplay.includes("classroom")) &&
        nameParts.length > 0 &&
        nameParts.some((part) => senderDisplay.includes(part));

      if (isSenderMatch || isClassroomMatch) {
        return {
          category: EmailCategory.ACADEMICS,
          confidence: 0.95,
          evidence: [
            `Student-managed faculty sender: ${contact.name} (${input.sender})`,
            contact.courseLabel ? `Course: ${contact.courseLabel}` : "Academics",
          ],
          explanation: `Classified as Academics from student's configured faculty member ${contact.name}.`,
          ruleMatched: "user-faculty-directory:sender-name",
        };
      }
    }

    // 3C: Forwarded email from faculty (e.g., student received forwarded email originally sent by faculty)
    // Matches patterns like:
    // "---------- Forwarded message ---------\r\nFrom: G Soma Sekhar <somasekhar.g@vitap.ac.in>"
    // or mentions of faculty email inside the forwarded header block
    for (const fEmail of facultyEmails) {
      const escapedEmail = fEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fwdRegex = new RegExp(`from:[^\\n<]+<${escapedEmail}>|from:[^\\n]*${escapedEmail}`, "i");
      if (fwdRegex.test(input.body) || (input.snippet && fwdRegex.test(input.snippet))) {
        return {
          category: EmailCategory.ACADEMICS,
          confidence: 0.95,
          evidence: [`Forwarded message from student-managed faculty: ${fEmail}`],
          explanation: `Classified as Academics because message is forwarded from configured faculty (${fEmail}).`,
          ruleMatched: "user-faculty-directory:forwarded-faculty",
        };
      }
    }

    // 3D: Forwarded message matching faculty name in From: header
    for (const contact of facultyContacts) {
      const contactName = (contact.name || "").trim().toLowerCase();
      const cleanContactName = contactName.replace(/\b(dr|prof|professor|sir|faculty)\.?\b/gi, "").trim();
      if (cleanContactName.length >= 4) {
        const escapedName = cleanContactName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const fwdNameRegex = new RegExp(`from:[^\\n<]*${escapedName}`, "i");
        if (fwdNameRegex.test(input.body) || (input.snippet && fwdNameRegex.test(input.snippet))) {
          return {
            category: EmailCategory.ACADEMICS,
            confidence: 0.94,
            evidence: [`Forwarded message originally from faculty member: ${contact.name}`],
            explanation: `Classified as Academics from forwarded communication by faculty member ${contact.name}.`,
            ruleMatched: "user-faculty-directory:forwarded-name",
          };
        }
      }
    }
  }

  // ----------------------------------------------------
  // STAGE 4: Strong School Identity
  // ----------------------------------------------------
  // Check if sender or subject is explicitly a school office
  const detectedSchool = detectSchool(normSenderAddress, normSubject, cleanBody);
  const isSchoolSender = /(school\s*of|dean\.[a-z]+@vitap\.ac\.in|hod\.[a-z]+@vitap\.ac\.in)/i.test(normSenderAddress) ||
    /(\[scope\]|\[sense\]|\[smec\]|\[sas\]|\[vish\]|\[vsl\]|\[vsb\]|\[sbst\])/i.test(normSubject);

  if (detectedSchool && isSchoolSender) {
    return {
      category: EmailCategory.SCHOOLS,
      school: detectedSchool,
      confidence: 0.90,
      evidence: [`School communication for ${detectedSchool}`],
      explanation: `Classified as Schools (${detectedSchool}) based on school sender identity.`,
      ruleMatched: `school-identity:${detectedSchool}`,
    };
  }

  // ----------------------------------------------------
  // STAGE 5: Content & Context Signals
  // ----------------------------------------------------

  // 5A: CDC & Placement Content
  if (
    /(placement\s*drive|campus\s*drive|recruitment\s*drive|aptitude\s*test|interview\s*schedule|shortlist|superset|congratulations.*placement|selected.*campus)/i.test(cleanSubject) ||
    (normSenderAddress.includes("placement") || normSenderAddress.includes("cdc"))
  ) {
    const placementInfo = detectPlacementSubtype(cleanSubject, cleanBody);
    return {
      category: EmailCategory.CDC_AND_PLACEMENT,
      subCategory: placementInfo.subtype,
      confidence: 0.88,
      evidence: [placementInfo.evidence, `Subject: ${normSubject.slice(0, 50)}`],
      explanation: `Classified as CDC & Placement (${placementInfo.subtype}) based on placement keywords.`,
      ruleMatched: "content:cdc-placement",
    };
  }

  // 5B: Examinations Content
  if (
    /\b(hall\s*ticket|admit\s*card|exam\s*timetable|examination\s*schedule|midterm\s*exam|endterm\s*exam|fat\s*exam|cat\s*exam|re-evaluation|grade\s*sheet|backlog\s*exam)\b/i.test(cleanSubject) ||
    (normSenderAddress.includes("exam") || normSenderAddress.includes("coe"))
  ) {
    return {
      category: EmailCategory.EXAMINATIONS,
      confidence: 0.88,
      evidence: ["Examination notice or hall ticket indicator", `Subject: ${normSubject.slice(0, 50)}`],
      explanation: "Classified as Examinations based on examination schedule or assessment indicators.",
      ruleMatched: "content:examinations",
    };
  }

  // 5C: Transport Content (Bus timings, routes, day-scholar transport)
  const isTransportSubject = /\b(transport|bus\s*route|bus\s*timings?|bus\s*schedule|pickup\s*point|day\s*scholar\s*bus|transport\s*fee|bus\s*pass|shuttle\s*service|transport\s*terminal)\b/i.test(cleanSubject);
  const isTransportBody = /\b(bus\s*routes?|bus\s*timings?|transport\s*terminal|day\s*scholars?|vijayawada\s*routes?|guntur\s*routes?|departure\s*timings?|transport\s*helpdesk)\b/i.test(cleanBody);
  const isTransportSender = normSenderAddress.includes("transport");

  if (isTransportSubject || isTransportSender || (isTransportBody && !normSenderAddress.includes("warden") && !cleanSubject.includes("hostel"))) {
    return {
      category: EmailCategory.TRANSPORT,
      confidence: (isTransportSender || isTransportSubject) ? 0.95 : 0.88,
      evidence: ["Transport schedule, day-scholar route, or bus notice"],
      explanation: "Classified as Transport based on university bus and transit notices.",
      ruleMatched: "content:transport",
    };
  }

  // 5D: Hostel Content (Rooms, Mess, Wardens, Turnstiles, In-Hostel notices)
  const isHostelSubject = /\b(hostel|warden|room\s*allotment|hostel\s*fee|mess\s*menu|mess\s*change|outpass|night\s*curfew|vacation\s*hostel|block\s*[a-z0-9]+\s*hostel|biometric\s*turnstile|hostel\s*admin)\b/i.test(cleanSubject);
  const isHostelBody = /\b(chief\s*warden|hostel\s*reception|room\s*occupancy|turnstile\s*access|gate\s*pass\s*deactivation|block\s*[a-z0-9]+|resident\s*students?)\b/i.test(cleanBody);
  const isHostelSender = normSenderAddress.includes("warden") || normSenderAddress.includes("hostel");

  if (isHostelSubject || isHostelSender || isHostelBody) {
    return {
      category: EmailCategory.HOSTEL,
      confidence: (isHostelSender || isHostelSubject) ? 0.95 : 0.85,
      evidence: ["Hostel, mess or room allotment notice"],
      explanation: "Classified as Hostel based on hostel management indicators.",
      ruleMatched: "content:hostel",
    };
  }

  // 5E: Sports Content
  if (
    /\b(sports\s*trial|physical\s*education|badminton\s*tournament|cricket\s*match|football\s*tournament|chess\s*competition|sports\s*day|marathon)\b/i.test(cleanSubject) ||
    normSenderAddress.includes("ped@") || normSenderAddress.includes("sports")
  ) {
    return {
      category: EmailCategory.SPORTS,
      confidence: 0.88,
      evidence: ["Sports trials, tournaments, or physical education notice"],
      explanation: "Classified as Sports based on athletic trials or sports event notices.",
      ruleMatched: "content:sports",
    };
  }

  // 5F: Events & Clubs Content
  if (
    /\b(hackathon|ideathon|club\s*recruitment|cultural\s*fest|techno\s*fest|guest\s*lecture|webinar|workshop|audition)\b/i.test(cleanSubject) ||
    normSenderAddress.includes("club") || normSenderAddress.includes("chapter")
  ) {
    return {
      category: EmailCategory.EVENTS_AND_CLUBS,
      confidence: 0.85,
      evidence: ["Club event, fest, or hackathon announcement"],
      explanation: "Classified as Events & Clubs based on club or activity notice.",
      ruleMatched: "content:events-and-clubs",
    };
  }

  // 5G: Academics Content (Assignments, FFCS, LMS, Course registration)
  if (
    /\b(assignment\s*[0-9]|assignment\s*submission|course\s*registration|add\/drop|ffcs|lecture\s*notes|moodle|extra\s*class|attendance\s*shortage)\b/i.test(cleanSubject) ||
    /\b(assignment\s*submission|course\s*syllabus|lab\s*experiment)\b/i.test(cleanBody)
  ) {
    return {
      category: EmailCategory.ACADEMICS,
      confidence: 0.82,
      evidence: ["Academic coursework or assignment notice"],
      explanation: "Classified as Academics based on curriculum, course, or assignment signals.",
      ruleMatched: "content:academics",
    };
  }

  // 5H: School content if school detected in text but sender wasn't school office
  if (detectedSchool) {
    return {
      category: EmailCategory.SCHOOLS,
      school: detectedSchool,
      confidence: 0.75,
      evidence: [`Mention of school: ${detectedSchool}`],
      explanation: `Classified as Schools (${detectedSchool}) from message content references.`,
      ruleMatched: `content:school:${detectedSchool}`,
    };
  }

  // ----------------------------------------------------
  // STAGE 6: Safe Fallback to OTHER
  // ----------------------------------------------------
  return {
    category: EmailCategory.OTHER,
    confidence: 0.40,
    evidence: ["No decisive sender or content match found"],
    explanation: "No reliable sender identity or distinctive content match found. Placed in Other.",
    ruleMatched: "fallback:other",
  };
}
