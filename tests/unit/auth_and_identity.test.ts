import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { verifyCollegeEmail, isAllowedCollegeEmail, getAllowedEmailDomains } from "@/lib/env";
import { syncGoogleIdentity } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";

describe("Strict Server-Side Domain Verification", () => {
  it("allows valid vitapstudent.ac.in emails with case-insensitivity", () => {
    const r1 = verifyCollegeEmail("student.21bce9999@vitapstudent.ac.in", true);
    expect(r1.isValid).toBe(true);
    expect(r1.normalizedEmail).toBe("student.21bce9999@vitapstudent.ac.in");

    const r2 = verifyCollegeEmail("STUDENT.TEST@VITAPSTUDENT.AC.IN", true);
    expect(r2.isValid).toBe(true);
    expect(r2.normalizedEmail).toBe("student.test@vitapstudent.ac.in");
  });

  it("rejects unverified Google email claims", () => {
    const result = verifyCollegeEmail("student.21bce9999@vitapstudent.ac.in", false);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("not verified");
  });

  it("rejects lookalike domains and subdomains", () => {
    // Suffix match attacks
    expect(isAllowedCollegeEmail("student@evil-vitapstudent.ac.in")).toBe(false);
    expect(isAllowedCollegeEmail("student@vitapstudent.ac.in.attacker.com")).toBe(false);
    expect(isAllowedCollegeEmail("student@fakevitapstudent.ac.in")).toBe(false);

    // Subdomains (not in exact allowlist)
    expect(isAllowedCollegeEmail("student@cse.vitapstudent.ac.in")).toBe(false);
    expect(isAllowedCollegeEmail("student@sub.vitapstudent.ac.in")).toBe(false);

    // Common personal and other institutional domains
    expect(isAllowedCollegeEmail("student@gmail.com")).toBe(false);
    expect(isAllowedCollegeEmail("student@vitap.ac.in")).toBe(false); // Staff/faculty domain
    expect(isAllowedCollegeEmail("student@vit.ac.in")).toBe(false);
  });

  it("rejects malformed email formats, multiple @, and whitespace", () => {
    expect(isAllowedCollegeEmail("student@@vitapstudent.ac.in")).toBe(false);
    expect(isAllowedCollegeEmail("student vitapstudent.ac.in")).toBe(false);
    expect(isAllowedCollegeEmail("student@vitapstudent.ac.in extra")).toBe(false);
    expect(isAllowedCollegeEmail("@vitapstudent.ac.in")).toBe(false);
    expect(isAllowedCollegeEmail("student@")).toBe(false);
    expect(isAllowedCollegeEmail("")).toBe(false);
    expect(verifyCollegeEmail(null as any).isValid).toBe(false);
  });
});

describe("Google Identity to User Mapping & Data Scoping", () => {
  const testSub1 = "google_sub_test_unique_101";
  const testSub2 = "google_sub_test_unique_102";
  const testEmail1 = "test.verified.student1@vitapstudent.ac.in";
  const testEmail2 = "test.verified.student2@vitapstudent.ac.in";

  beforeEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail1, testEmail2] },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail1, testEmail2] },
      },
    });
    await prisma.$disconnect();
  });

  it("creates a new User on first verified Google sign-in with stable sub", async () => {
    const res = await syncGoogleIdentity({
      googleSubjectId: testSub1,
      email: testEmail1,
      isEmailVerified: true,
      name: "Verified Student One",
      image: "https://example.com/avatar.jpg",
    });

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.googleSubjectId).toBe(testSub1);
    expect(res.user?.email).toBe(testEmail1);

    // Check user preferences were auto-created
    const prefs = await prisma.userPreference.findUnique({
      where: { userId: res.user!.id },
    });
    expect(prefs).toBeDefined();
    expect(prefs?.aiSummariesEnabled).toBe(true);
  });

  it("safely retrieves the existing user on subsequent sign-ins using googleSubjectId", async () => {
    // First sign-in
    const firstRes = await syncGoogleIdentity({
      googleSubjectId: testSub1,
      email: testEmail1,
      isEmailVerified: true,
      name: "Initial Name",
    });
    expect(firstRes.success).toBe(true);

    // Second sign-in with updated name
    const secondRes = await syncGoogleIdentity({
      googleSubjectId: testSub1,
      email: testEmail1,
      isEmailVerified: true,
      name: "Updated Name",
    });

    expect(secondRes.success).toBe(true);
    expect(secondRes.user?.id).toBe(firstRes.user?.id);
    expect(secondRes.user?.name).toBe("Updated Name");
  });

  it("rejects identity hijacking if a different Google sub attempts to claim an existing email", async () => {
    // Legitimate student signs in
    await syncGoogleIdentity({
      googleSubjectId: testSub1,
      email: testEmail1,
      isEmailVerified: true,
      name: "Legit Student",
    });

    // Attacker attempts with same email but different sub
    const hijackAttempt = await syncGoogleIdentity({
      googleSubjectId: testSub2,
      email: testEmail1,
      isEmailVerified: true,
      name: "Imposter",
    });

    expect(hijackAttempt.success).toBe(false);
    expect(hijackAttempt.code).toBe("IDENTITY_MISMATCH");
  });

  it("enforces tenant data isolation between distinct users", async () => {
    const u1 = await syncGoogleIdentity({
      googleSubjectId: testSub1,
      email: testEmail1,
      isEmailVerified: true,
      name: "User 1",
    });

    const u2 = await syncGoogleIdentity({
      googleSubjectId: testSub2,
      email: testEmail2,
      isEmailVerified: true,
      name: "User 2",
    });

    // Create an email belonging to User 1
    const email1 = await prisma.email.create({
      data: {
        userId: u1.user!.id,
        gmailMessageId: "isolated_msg_001",
        gmailThreadId: "isolated_th_001",
        sender: "Dean <dean@vitap.ac.in>",
        senderAddress: "dean@vitap.ac.in",
        recipient: testEmail1,
        subject: "Confidential Grades for User 1",
        snippet: "Your grades are 9.5",
        receivedAt: new Date(),
      },
    });

    // Query with User 2's ID should return null (denied access)
    const crossAccess = await prisma.email.findFirst({
      where: {
        id: email1.id,
        userId: u2.user!.id, // User 2 query
      },
    });

    expect(crossAccess).toBeNull();

    // Query with User 1's ID succeeds
    const legitAccess = await prisma.email.findFirst({
      where: {
        id: email1.id,
        userId: u1.user!.id, // User 1 query
      },
    });
    expect(legitAccess).toBeDefined();
    expect(legitAccess?.id).toBe(email1.id);
  });
});
