import { describe, it, expect } from "vitest";
import { extractDeadlines } from "@/lib/deadline-extractor";

describe("Deadline Extractor Accuracy & Timezone Verification", () => {
  it("extracts exact date November 15, 2026 without 12-day offset", () => {
    const input = {
      subject: "[ACADEMICS] Digital Assignment 2 Submission Portal Open - Fall 2026",
      body: "All submissions must be uploaded in PDF format by November 15, 2026, 11:59 PM IST.",
      receivedAt: new Date("2026-10-31T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    const deadline = candidates[0];

    // In IST (+5:30), Nov 15 23:59 IST is Nov 15 18:29 UTC
    const dateKey = deadline.dueDate.toISOString().slice(0, 10);
    expect(dateKey).toBe("2026-11-15");
    expect(deadline.evidenceSnippet).toContain("November 15, 2026");
  });

  it("extracts FAT Hall Ticket date November 20, 2026 at 5:00 PM", () => {
    const input = {
      subject: "[EXAMINATION] Fall 2026 FAT Schedule & Hall Ticket",
      body: "Report discrepancies before November 20, 2026, 5:00 PM.",
      receivedAt: new Date("2026-10-31T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    const deadline = candidates[0];
    expect(deadline.dueDate.toISOString().slice(0, 10)).toBe("2026-11-20");
  });

  it("extracts placement registration date November 10, 2026", () => {
    const input = {
      subject: "[CDC PLACEMENT] Super Dream Opportunity: Nexus Cloud Systems",
      body: "Fill out the Google Form link provided below before November 10, 2026 at 6:00 PM IST.",
      receivedAt: new Date("2026-10-31T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].dueDate.toISOString().slice(0, 10)).toBe("2026-11-10");
  });

  it("extracts hackathon registration date November 12, 2026", () => {
    const input = {
      subject: "[EVENT] Campus Hackathon: HackAP 2026",
      body: "Registration Deadline: November 12, 2026, 11:59 PM.",
      receivedAt: new Date("2026-10-31T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].dueDate.toISOString().slice(0, 10)).toBe("2026-11-12");
  });

  it("extracts hostel biometric registration date November 14, 2026", () => {
    const input = {
      subject: "[HOSTEL ADMIN] Mandatory Room Verification & Biometric Fingerprint Update",
      body: "Verification Timings: Every evening from 6:30 PM to 9:30 PM. Final Date: November 14, 2026.",
      receivedAt: new Date("2026-10-31T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].dueDate.toISOString().slice(0, 10)).toBe("2026-11-14");
  });

  it("extracts DD/MM/YYYY date formats correctly", () => {
    const input = {
      subject: "Course Fee Due Date Notification",
      body: "All pending dues must be cleared on or before 25/11/2026 at 4:00 PM.",
      receivedAt: new Date("2026-10-31T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].dueDate.toISOString().slice(0, 10)).toBe("2026-11-25");
  });

  it("extracts exact time from 'Oct 2, 2026 at 1:02 PM' without matching date digit as hour (13:02 IST, not 02:00 AM)", () => {
    const input = {
      subject: "PAT VIT-AP Recruitment Drive Updates",
      body: "On Fri, Oct 2, 2026 at 1:02 PM PAT VIT-AP <pat@vitap.ac.in> wrote: Please register before Oct 2, 2026 at 1:02 PM.",
      receivedAt: new Date("2026-10-02T00:00:00.000Z"),
    };

    const candidates = extractDeadlines(input);
    expect(candidates.length).toBeGreaterThan(0);
    const deadline = candidates[0];
    
    // In IST (+5:30), Oct 2, 2026 13:02 IST is Oct 2, 2026 07:32:00 UTC
    // Prior bug matched " 2" from date day number, yielding 2:00 AM IST (Oct 1 20:30 UTC)!
    const utcHours = deadline.dueDate.getUTCHours();
    const utcMinutes = deadline.dueDate.getUTCMinutes();
    expect(utcHours).toBe(7); // 13 - 5.5 = 7.5 -> 7:32 UTC
    expect(utcMinutes).toBe(32);
    expect(deadline.hasExplicitTime).toBe(true);
  });
});
