import { describe, it, expect } from "vitest";
import {
  classifyEmail,
  normalizeSubject,
  normalizeEmailAddress,
  CANONICAL_CATEGORIES,
} from "@/lib/classifier";
import { calculatePriorityScore, PRIORITY_THRESHOLDS } from "@/lib/priority-scorer";
import { extractDeadlines } from "@/lib/deadline-extractor";
import { EmailCategory, PriorityLevel, SchoolCode } from "@prisma/client";

describe("Phase 6: Multi-Stage Email Classification Engine", () => {
  it("normalizes common reply and forward prefixes correctly", () => {
    expect(normalizeSubject("Re: Fwd: [EXT] Urgent Notice")).toBe("Urgent Notice");
    expect(normalizeSubject("Fw: AW: Important Schedule")).toBe("Important Schedule");
    expect(normalizeSubject("[EXTERNAL] Course Syllabus")).toBe("Course Syllabus");
  });

  it("normalizes email addresses correctly", () => {
    expect(normalizeEmailAddress("Dean Academics <dean.acad@vitap.ac.in>")).toBe("dean.acad@vitap.ac.in");
    expect(normalizeEmailAddress("  Registrar@vitap.ac.in  ")).toBe("registrar@vitap.ac.in");
  });

  it("classifies Dean Academics verified sender into DEAN_ACADEMICS with high precedence", () => {
    const res = classifyEmail({
      subject: "Academic Calendar Fall 2026-27 & Examination Circular",
      sender: "Dean Academics <dean.acad@vitap.ac.in>",
      senderAddress: "dean.acad@vitap.ac.in",
      body: "Please find attached the academic schedule and examination calendar.",
    });

    expect(res.category).toBe(EmailCategory.DEAN_ACADEMICS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
    expect(res.explanation).toContain("Dean Academics");
  });

  it("classifies Registrar verified sender into REGISTRAR", () => {
    const res = classifyEmail({
      subject: "Declaration of Holiday on account of Festival",
      sender: "REGISTRAR VIT-AP <registrar@vitap.ac.in>",
      senderAddress: "registrar@vitap.ac.in",
      body: "All academic activities remain suspended tomorrow.",
    });

    expect(res.category).toBe(EmailCategory.REGISTRAR);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies Assistant Dean Academics verified sender into ASST_DEAN_ACADEMICS", () => {
    const res = classifyEmail({
      subject: "Attendance Shortage Guidelines",
      sender: "Assistant Dean, Academics <asstdean2.acad@vitap.ac.in>",
      senderAddress: "asstdean2.acad@vitap.ac.in",
      body: "Guidelines regarding 75% mandatory attendance.",
    });

    expect(res.category).toBe(EmailCategory.ASST_DEAN_ACADEMICS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies Controller of Examinations into EXAMINATIONS", () => {
    const res = classifyEmail({
      subject: "Fall 2026 FAT Examination Hall Ticket Download & Schedule",
      sender: "Controller of Examinations <coe@vitap.ac.in>",
      senderAddress: "coe@vitap.ac.in",
      body: "Hall tickets for the upcoming FAT exams are now available on VTOP.",
    });

    expect(res.category).toBe(EmailCategory.EXAMINATIONS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies CDC & Placement verified senders with subcategory detection", () => {
    // Placement Drive
    const driveRes = classifyEmail({
      subject: "Campus Recruitment Drive 2027 - Google SDE Applications Open",
      sender: "'No Reply CDC Info' via 2027 CDC <students.cdc2027@vitap.ac.in>",
      senderAddress: "students.cdc2027@vitap.ac.in",
      body: "Google is hiring for SDE roles. CTC 45 LPA. Apply before Oct 30 via Superset.",
    });

    expect(driveRes.category).toBe(EmailCategory.CDC_AND_PLACEMENT);
    expect(driveRes.subCategory).toBe("PLACEMENT_DRIVE");

    // Congratulations / Result
    const congratsRes = classifyEmail({
      subject: "Hearty Congratulations - Microsoft Campus Selections",
      sender: "PAT VIT-AP <placement@vitap.ac.in>",
      senderAddress: "placement@vitap.ac.in",
      body: "We are pleased to announce the list of selected candidates for Microsoft. Hearty congratulations to all selected students!",
    });

    expect(congratsRes.category).toBe(EmailCategory.CDC_AND_PLACEMENT);
    expect(congratsRes.subCategory).toBe("PLACEMENT_CONGRATULATIONS");
  });

  it("classifies SDC emails into SDC", () => {
    const res = classifyEmail({
      subject: "Skill Development Certification Course Registration",
      sender: "noreply.sdc@vitap.ac.in",
      senderAddress: "noreply.sdc@vitap.ac.in",
      body: "Registration for AWS cloud certification is now open.",
    });

    expect(res.category).toBe(EmailCategory.SDC);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies Schools communications and detects exact school", () => {
    const res = classifyEmail({
      subject: "VISH Guest Lecture on Computational Linguistics",
      sender: "Dean In-Charge VISH <dean.vish@vitap.ac.in>",
      senderAddress: "dean.vish@vitap.ac.in",
      body: "VISH cordially invites all students to a guest lecture.",
    });

    expect(res.category).toBe(EmailCategory.SCHOOLS);
    expect(res.school).toBe(SchoolCode.VISH);
  });

  it("classifies student-configured faculty addresses into ACADEMICS", () => {
    const res = classifyEmail({
      subject: "Notes for Unit 3 Distributed Systems",
      sender: "Dr. Ramesh Babu <ramesh.babu@vitap.ac.in>",
      senderAddress: "ramesh.babu@vitap.ac.in",
      body: "Attached are the slides and lab experiment details for class tomorrow.",
      userFacultyEmails: ["ramesh.babu@vitap.ac.in"],
    });

    expect(res.category).toBe(EmailCategory.ACADEMICS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies forwarded emails from student-configured faculty into ACADEMICS", () => {
    const res = classifyEmail({
      subject: "Fwd: Digital Assessment-2",
      sender: "ADITYA AGARWAL <aditya.23bcb7086@vitapstudent.ac.in>",
      senderAddress: "aditya.23bcb7086@vitapstudent.ac.in",
      body: "---------- Forwarded message ---------\r\nFrom: G Soma Sekhar <somasekhar.g@vitap.ac.in>\r\nSubject: Digital Assessment-2\r\nVIT-School of Business (VSB)",
      userFacultyEmails: ["somasekhar.g@vitap.ac.in"],
      userFacultyContacts: [{ name: "Soma Sir", email: "somasekhar.g@vitap.ac.in" }],
    });

    expect(res.category).toBe(EmailCategory.ACADEMICS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies Google Classroom notifications for configured faculty into ACADEMICS", () => {
    const res = classifyEmail({
      subject: "New announcement: \"FAT Lab Experiments List\"",
      sender: "\"Venu Gopal (Classroom)\" <no-reply@classroom.google.com>",
      senderAddress: "no-reply@classroom.google.com",
      body: "Venu Gopal posted a new announcement in CSE3001 Lab.",
      userFacultyContacts: [{ name: "Venu Gopal", email: "no-reply@classroom.google.com" }],
    });

    expect(res.category).toBe(EmailCategory.ACADEMICS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies Transport Manager emails into TRANSPORT", () => {
    const res = classifyEmail({
      subject: "Vijayawada Bus Route 14 Timing Revision",
      sender: "Transport Manager <transportmanager@vitap.ac.in>",
      senderAddress: "transportmanager@vitap.ac.in",
      body: "Due to road work, bus route 14 will depart 15 minutes earlier.",
    });

    expect(res.category).toBe(EmailCategory.TRANSPORT);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies Chief Warden emails into HOSTEL", () => {
    const res = classifyEmail({
      subject: "Hostel Outpass and Biometric Registration Notice",
      sender: "Chief Warden-MH <cw.mh@vitap.ac.in>",
      senderAddress: "cw.mh@vitap.ac.in",
      body: "All hostel residents must register biometric attendance by Friday.",
    });

    expect(res.category).toBe(EmailCategory.HOSTEL);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies Physical Education Department into SPORTS", () => {
    const res = classifyEmail({
      subject: "Inter-University Cricket & Badminton Trials",
      sender: "Physical education department <ped@vitap.ac.in>",
      senderAddress: "ped@vitap.ac.in",
      body: "Selection trials for university sports teams will be held at sports complex.",
    });

    expect(res.category).toBe(EmailCategory.SPORTS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("classifies Assistant Director Clubs into EVENTS_AND_CLUBS", () => {
    const res = classifyEmail({
      subject: "Annual Technical Fest VTAPP 2027 Club Registrations",
      sender: "Assistant Director – Clubs and Chapters <asstdir.cac@vitap.ac.in>",
      senderAddress: "asstdir.cac@vitap.ac.in",
      body: "Club leads must register their event proposals by 5 PM.",
    });

    expect(res.category).toBe(EmailCategory.EVENTS_AND_CLUBS);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("falls back safely to OTHER for low-signal messages", () => {
    const res = classifyEmail({
      subject: "Random Campus Notice",
      sender: "unknown.vendor@gmail.com",
      senderAddress: "unknown.vendor@gmail.com",
      body: "Check out our external offer.",
    });

    expect(res.category).toBe(EmailCategory.OTHER);
  });

  it("ensures canonical categories array contains all 13 primary categories", () => {
    expect(CANONICAL_CATEGORIES).toHaveLength(13);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.DEAN_ACADEMICS);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.REGISTRAR);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.ASST_DEAN_ACADEMICS);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.CDC_AND_PLACEMENT);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.SDC);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.SCHOOLS);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.TRANSPORT);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.HOSTEL);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.SPORTS);
    expect(CANONICAL_CATEGORIES).toContain(EmailCategory.OTHER);
  });
});

describe("Phase 6: Priority Scoring Engine & Deadlines", () => {
  const baseTime = new Date("2026-11-01T10:00:00Z");

  it("assigns URGENT priority for FAT exam hall tickets with imminent deadlines", () => {
    const result = calculatePriorityScore({
      subject: "URGENT: FAT Examination Hall Ticket Download & Mandatory Verification",
      sender: "Controller of Examinations <coe@vitap.ac.in>",
      senderAddress: "coe@vitap.ac.in",
      category: EmailCategory.EXAMINATIONS,
      body: "Download your hall ticket immediately before Nov 2, 2026.",
      receivedAt: baseTime,
      deadlineDates: [new Date("2026-11-02T18:00:00Z")],
    });

    expect(result.level).toBe(PriorityLevel.URGENT);
    expect(result.score).toBeGreaterThanOrEqual(PRIORITY_THRESHOLDS.URGENT);
    expect(result.isImportant).toBe(true);
  });

  it("extracts ISO candidate deadlines reliably", () => {
    const candidates = extractDeadlines({
      subject: "Assignment Submission Deadline Extended",
      body: "All assignments must be uploaded before 2026-11-15 23:59 on the portal.",
      receivedAt: baseTime,
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].dueDate.toISOString()).toContain("2026-11-15");
  });
});
