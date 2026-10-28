import { describe, it, expect } from "vitest";
import {
  escapeICalText,
  formatICalDateUTC,
  generateICalendarFeed,
  ICalEventInput,
} from "@/lib/ical-generator";

describe("iCalendar (RFC 5545) Formatter (Phase 8)", () => {
  it("should escape special characters per RFC 5545 section 3.3.11", () => {
    const raw = "Submit FAT assignment, project; note: C:\\path\nNext line";
    const escaped = escapeICalText(raw);

    expect(escaped).toBe("Submit FAT assignment\\, project\\; note: C:\\\\path\\nNext line");
  });

  it("should format dates in UTC timestamp format YYYYMMDDTHHMMSSZ", () => {
    // 2026-11-05 18:30:00 UTC
    const date = new Date(Date.UTC(2026, 10, 5, 18, 30, 0));
    const formatted = formatICalDateUTC(date);

    expect(formatted).toBe("20261105T183000Z");
  });

  it("should generate a valid RFC 5545 VCALENDAR feed with events and VALARM", () => {
    const events: ICalEventInput[] = [
      {
        uid: "deadline_test_101",
        title: "Digital Assignment 2 Submission",
        description: "Submit PDF on V-TOP portal strictly before cut-off.",
        dueDate: new Date(Date.UTC(2026, 10, 10, 18, 29, 0)),
        category: "ACADEMICS",
        sourceEmailSubject: "DA2 Submission Instructions for Winter Sem",
        reminderMinutesBefore: 1440, // 24 hours
        url: "http://localhost:3001/email/msg_test_101",
      },
    ];

    const ics = generateICalendarFeed(events, "SigmaMail Test Deadlines");

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//SigmaMail//VIT-AP Student Deadline Calendar//EN");
    expect(ics).toContain("X-WR-CALNAME:SigmaMail Test Deadlines");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:deadline_test_101@campusinbox.vitapstudent.ac.in");
    expect(ics).toContain("DTSTART:20261110T182900Z");
    expect(ics).toContain("SUMMARY:Digital Assignment 2 Submission");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("URL:http://localhost:3001/email/msg_test_101");
    // VALARM check
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT1440M");
    expect(ics).toContain("END:VALARM");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");

    // Must end with CRLF
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("should exclude VALARM if reminderMinutesBefore is null or 0", () => {
    const events: ICalEventInput[] = [
      {
        uid: "deadline_test_102",
        title: "CDC Drive Registration",
        dueDate: new Date(Date.UTC(2026, 10, 12, 12, 0, 0)),
        reminderMinutesBefore: null,
      },
    ];

    const ics = generateICalendarFeed(events);

    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:CDC Drive Registration");
    expect(ics).not.toContain("BEGIN:VALARM");
  });

  it("should handle empty event list gracefully", () => {
    const ics = generateICalendarFeed([]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
