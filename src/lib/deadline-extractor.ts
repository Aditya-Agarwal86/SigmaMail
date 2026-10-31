export interface ExtractedDeadlineCandidate {
  title: string;
  dueDate: Date;
  hasExplicitTime?: boolean;
  confidenceScore: number; // 0.0 to 1.0
  evidenceSnippet: string;
  actionText: string;
}

export interface DeadlineExtractionInput {
  subject: string;
  body: string;
  receivedAt: Date;
}

// Indian Standard Time offset (UTC+5:30) in milliseconds
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Action trigger prefixes that accompany deadlines
const ACTION_PREFIXES = [
  /submit\s*(by|before|on)?/i,
  /submission\s*(deadline|date|is)?/i,
  /last\s*date\s*(for|to|of)?/i,
  /register\s*(by|before|on)?/i,
  /registration\s*(closes|ends|deadline)?/i,
  /due\s*(date|by|on)?/i,
  /applications?\s*(close|ends|by)?/i,
  /apply\s*(by|before|on)?/i,
  /payment\s*deadline/i,
  /fee\s*due\s*date/i,
  /hall\s*ticket\s*download\s*before/i,
  /strictly\s*before/i,
];

/**
 * Validates whether day, month (0-indexed), and year form a real calendar date.
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 2020 || year > 2035) return false;
  if (month < 0 || month > 11) return false;
  if (day < 1 || day > 31) return false;

  const testDate = new Date(Date.UTC(year, month, day));
  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month &&
    testDate.getUTCDate() === day
  );
}

/**
 * Parses optional time string (e.g. "5:00 PM", "11:59 pm", "23:59", "5 PM") into hours and minutes.
 * Also returns whether an explicit time was found or defaulted.
 */
function parseTimeString(timeText: string): { hour: number; minute: number; hasExplicitTime: boolean } {
  // Only accept time patterns with explicit AM/PM or HH:MM format
  const match = timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) || timeText.match(/(\d{1,2}):(\d{2})\b/);
  if (!match) return { hour: 23, minute: 59, hasExplicitTime: false }; // Default to end-of-day for academic deadlines

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toLowerCase() : null;

  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return { hour, minute, hasExplicitTime: true };
  }
  return { hour: 23, minute: 59, hasExplicitTime: false };
}

/**
 * Extracts candidate deadlines from college email content with IST normalization.
 */
export function extractDeadlines(input: DeadlineExtractionInput): ExtractedDeadlineCandidate[] {
  const candidates: ExtractedDeadlineCandidate[] = [];
  const fullText = `${input.subject}\n${input.body || ""}`;
  const lines = fullText.split(/\r?\n/);
  const receivedYear = (input.receivedAt instanceof Date ? input.receivedAt : new Date()).getFullYear();

  // Deduplication map by ISO date string (YYYY-MM-DD)
  const seenDates = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line contains an actionable prefix
    const hasActionPrefix = ACTION_PREFIXES.some((rx) => rx.test(line));

    // Regex 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyPattern = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g;
    let match: RegExpExecArray | null;

    while ((match = dmyPattern.exec(line)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const year = parseInt(match[3], 10);

      if (isValidCalendarDate(year, month, day)) {
        const afterMatch = line.slice(match.index + match[0].length);
        const timeMatch = afterMatch.match(/^\s*(?:at|by|before)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\b/i);
        const { hour, minute, hasExplicitTime } = parseTimeString(timeMatch ? timeMatch[1] : "");

        const utcMs = Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS;
        const dateObj = new Date(utcMs);
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (!seenDates.has(dateKey)) {
          seenDates.add(dateKey);
          const snippet = line.slice(Math.max(0, match.index - 30), Math.min(line.length, match.index + match[0].length + 40));
          const confidence = hasActionPrefix ? 0.90 : 0.65;

          candidates.push({
            title: deriveDeadlineTitle(input.subject, line),
            dueDate: dateObj,
            hasExplicitTime,
            confidenceScore: confidence,
            evidenceSnippet: snippet.trim(),
            actionText: extractActionText(line),
          });
        }
      }
    }

    // Regex 2: YYYY-MM-DD (ISO format)
    const isoPattern = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g;
    while ((match = isoPattern.exec(line)) !== null) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);

      if (isValidCalendarDate(year, month, day)) {
        const afterMatch = line.slice(match.index + match[0].length);
        const timeMatch = afterMatch.match(/^\s*(?:at|by|before)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\b/i);
        const { hour, minute, hasExplicitTime } = parseTimeString(timeMatch ? timeMatch[1] : "");

        const utcMs = Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS;
        const dateObj = new Date(utcMs);
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (!seenDates.has(dateKey)) {
          seenDates.add(dateKey);
          const snippet = line.slice(Math.max(0, match.index - 30), Math.min(line.length, match.index + match[0].length + 40));
          const confidence = hasActionPrefix ? 0.90 : 0.65;

          candidates.push({
            title: deriveDeadlineTitle(input.subject, line),
            dueDate: dateObj,
            hasExplicitTime,
            confidenceScore: confidence,
            evidenceSnippet: snippet.trim(),
            actionText: extractActionText(line),
          });
        }
      }
    }

    // Regex 3: Named month - Day first e.g. "15th November 2026", "15 Nov 2026"
    const monthNamePattern = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:\s*,?\s*(\d{4}))?\b/gi;
    while ((match = monthNamePattern.exec(line)) !== null) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const month = MONTH_NAMES[monthStr];
      const year = match[3] ? parseInt(match[3], 10) : receivedYear;

      if (month !== undefined && isValidCalendarDate(year, month, day)) {
        const afterMatch = line.slice(match.index + match[0].length);
        const timeMatch = afterMatch.match(/^\s*(?:at|by|before)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\b/i);
        const { hour, minute, hasExplicitTime } = parseTimeString(timeMatch ? timeMatch[1] : "");

        // Convert IST (UTC+5:30) date & time to UTC Date timestamp
        // UTC milliseconds = Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS
        const utcMs = Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS;
        const dateObj = new Date(utcMs);
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (!seenDates.has(dateKey)) {
          seenDates.add(dateKey);
          const snippet = line.slice(Math.max(0, match.index - 30), Math.min(line.length, match.index + match[0].length + 40));
          const confidence = hasActionPrefix ? 0.95 : 0.70;

          candidates.push({
            title: deriveDeadlineTitle(input.subject, line),
            dueDate: dateObj,
            hasExplicitTime,
            confidenceScore: confidence,
            evidenceSnippet: snippet.trim(),
            actionText: extractActionText(line),
          });
        }
      }
    }

    // Regex 4: Named month - Month first e.g. "November 15, 2026", "Nov 15 2026", "November 15th, 2026"
    const monthFirstPattern = /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/gi;
    while ((match = monthFirstPattern.exec(line)) !== null) {
      const monthStr = match[1].toLowerCase();
      const day = parseInt(match[2], 10);
      const month = MONTH_NAMES[monthStr];
      const year = match[3] ? parseInt(match[3], 10) : receivedYear;

      if (month !== undefined && isValidCalendarDate(year, month, day)) {
        const afterMatch = line.slice(match.index + match[0].length);
        const timeMatch = afterMatch.match(/^\s*(?:at|by|before)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\b/i);
        const { hour, minute, hasExplicitTime } = parseTimeString(timeMatch ? timeMatch[1] : "");

        // Convert IST (UTC+5:30) date & time to UTC Date timestamp
        const utcMs = Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS;
        const dateObj = new Date(utcMs);
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (!seenDates.has(dateKey)) {
          seenDates.add(dateKey);
          const snippet = line.slice(Math.max(0, match.index - 30), Math.min(line.length, match.index + match[0].length + 40));
          const confidence = hasActionPrefix ? 0.95 : 0.70;

          candidates.push({
            title: deriveDeadlineTitle(input.subject, line),
            dueDate: dateObj,
            hasExplicitTime,
            confidenceScore: confidence,
            evidenceSnippet: snippet.trim(),
            actionText: extractActionText(line),
          });
        }
      }
    }
  }

  // Filter out dates that are in the deep past (older than 60 days before received timestamp)
  const receivedTime = input.receivedAt instanceof Date ? input.receivedAt.getTime() : Date.now();
  const cutoffPast = receivedTime - 60 * 24 * 60 * 60 * 1000;

  return candidates
    .filter((c) => c.dueDate.getTime() >= cutoffPast)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3); // Bounded to top 3 candidate deadlines per email
}

function deriveDeadlineTitle(subject: string, line: string): string {
  // If line contains specific keywords, construct title
  if (/hall\s*ticket/i.test(line) || /hall\s*ticket/i.test(subject)) {
    return "Hall Ticket Download Deadline";
  }
  if (/assignment/i.test(line) || /assignment/i.test(subject)) {
    const match = (line + " " + subject).match(/assignment\s*[-#]?\s*[0-9]+/i);
    return match ? `${match[0].toUpperCase()} Submission Deadline` : "Course Assignment Submission";
  }
  if (/registration/i.test(line) || /register/i.test(line)) {
    return "Registration Closing Date";
  }
  if (/fee|payment/i.test(line) || /fee/i.test(subject)) {
    return "Tuition / Hostel Fee Due Date";
  }
  if (/application/i.test(line) || /internship|drive/i.test(subject)) {
    return "Application Deadline";
  }

  // Default to cleaned subject
  const cleanSubject = subject.replace(/^(re|fwd|fw):\s*/i, "").trim();
  return cleanSubject.length > 50 ? `${cleanSubject.slice(0, 47)}...` : cleanSubject;
}

function extractActionText(line: string): string {
  const match = line.match(/(?:submit|register|apply|pay|download|attend|complete)[^.,;]*/i);
  return match ? match[0].trim() : line.slice(0, 60).trim();
}
