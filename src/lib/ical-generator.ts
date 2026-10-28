/**
 * iCalendar (RFC 5545) Formatter for SigmaMail
 * Secure, clean, compliant iCal (.ics) generator for student deadlines
 */

export interface ICalEventInput {
  uid: string;
  title: string;
  description?: string | null;
  dueDate: Date;
  category?: string;
  sourceEmailSubject?: string;
  reminderMinutesBefore?: number | null;
  url?: string;
}

/**
 * Escapes characters per RFC 5545 section 3.3.11: Text
 * Backslash, semicolon, comma, and newlines must be escaped.
 */
export function escapeICalText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Formats a Date object to UTC string format required by iCalendar: YYYYMMDDTHHMMSSZ
 */
export function formatICalDateUTC(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates RFC 5545 compliant VCALENDAR string from confirmed student deadlines.
 */
export function generateICalendarFeed(
  events: ICalEventInput[],
  calendarName = "SigmaMail Academic & Placement Deadlines"
): string {
  const nowUtc = formatICalDateUTC(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SigmaMail//VIT-AP Student Deadline Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  for (const event of events) {
    const dtStart = formatICalDateUTC(event.dueDate);
    // End date defaults to 30 minutes after start date if point-in-time deadline
    const endDate = new Date(event.dueDate.getTime() + 30 * 60 * 1000);
    const dtEnd = formatICalDateUTC(endDate);

    let description = event.description || "";
    if (event.sourceEmailSubject) {
      description += description ? `\\nSource Circular: ${event.sourceEmailSubject}` : `Source Circular: ${event.sourceEmailSubject}`;
    }
    if (event.category) {
      description += `\\nCategory: ${event.category}`;
    }

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@campusinbox.vitapstudent.ac.in`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICalText(event.title)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      "STATUS:CONFIRMED"
    );

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    // Add VALARM if reminderMinutesBefore is specified
    if (event.reminderMinutesBefore && event.reminderMinutesBefore > 0) {
      const reminderMins = event.reminderMinutesBefore;
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:Reminder: ${escapeICalText(event.title)}`,
        `TRIGGER:-PT${reminderMins}M`,
        "END:VALARM"
      );
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}
