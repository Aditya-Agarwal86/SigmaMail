import { PrismaClient, EmailCategory, DeadlineStatus, SyncStatus } from "@prisma/client";
import { encryptToken } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding synthetic development data for CampusInbox...");

  // 1. Create or upsert a verified synthetic student user
  const demoStudentEmail = "fictional.student@vitapstudent.ac.in";
  const user = await prisma.user.upsert({
    where: { email: demoStudentEmail },
    update: {},
    create: {
      email: demoStudentEmail,
      name: "Demo Student",
      googleSubjectId: "synthetic-google-sub-10001",
      emailVerified: new Date(),
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=campusinbox-demo",
      preferences: {
        create: {
          aiSummariesEnabled: true,
          aiDeadlineExtraction: true,
          allowedAiProviders: "gemini",
          autoArchiveRead: false,
          retentionDays: 90,
          notifyDeadlines: true,
        },
      },
    },
    include: {
      preferences: true,
    },
  });

  console.log(`✅ Demo User ready: ${user.name} (${user.email})`);

  // 2. Create synthetic Gmail credential mock (Disconnected / Standby state with encrypted token test)
  const mockTokens = encryptToken("mock-oauth-refresh-token-for-dev-environment");
  await prisma.gmailCredential.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      gmailAddress: demoStudentEmail,
      encryptedAccessToken: "mock_encrypted_access_token",
      encryptedRefreshToken: mockTokens.ciphertext,
      tokenIv: mockTokens.iv,
      tokenTag: mockTokens.tag,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      syncStatus: SyncStatus.IDLE,
      lastHistoryId: "1234567",
      lastSyncAt: new Date(),
    },
  });

  // 3. Define 8 synthetic email archetypes matching the documented specifications
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysFromNow = (d: number, hour = 23, minute = 59) => {
    const target = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    target.setHours(hour, minute, 0, 0);
    return target;
  };

  const syntheticEmails = [
    {
      gmailMessageId: "msg_synthetic_acad_01",
      gmailThreadId: "th_synthetic_acad_01",
      sender: "Prof. Rajesh Sharma <dean.academics@vitap.ac.in>",
      senderAddress: "dean.academics@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[ACADEMICS] Digital Assignment 2 Submission Portal Open - Fall 2026",
      snippet: "Dear Students, The submission portal for Digital Assignment 2 for all core engineering courses is now open on V-TOP. All submissions must be uploaded in PDF format by November 15, 2026, 11:59 PM.",
      bodyPlain: `Dear Students,

The submission portal for Digital Assignment 2 for all core engineering courses is now open on V-TOP.
Please ensure that your assignment contains proper references and adheres to the code of academic integrity.

Key Details:
- Courses: All Core Engineering (Fall 2026-27)
- Format: Single PDF document with registration number in header
- Deadline: November 15, 2026, 11:59 PM IST
- Late submissions will attract a 20% penalty per day.

Office of the Dean Academics
VIT-AP University`,
      receivedAt: hoursAgo(2),
      isRead: false,
      isStarred: true,
      category: EmailCategory.ACADEMICS,
      isImportant: true,
      priorityScore: 0.95,
      classificationConfidence: 0.98,
      classificationReason: "Matched sender dean.academics@vitap.ac.in and keyword [ACADEMICS]",
      aiSummary: "Digital Assignment 2 portal is active on V-TOP. Strict deadline is Nov 15, 2026 at 11:59 PM. Must submit as a single PDF with penalty for late submissions.",
      deadlines: [
        {
          title: "Digital Assignment 2 Submission on V-TOP",
          description: "Upload single PDF for all Core Engineering courses with registration header.",
          dueDate: daysFromNow(7, 23, 59),
          category: EmailCategory.ACADEMICS,
          confidenceScore: 0.95,
        },
      ],
    },
    {
      gmailMessageId: "msg_synthetic_exam_02",
      gmailThreadId: "th_synthetic_exam_02",
      sender: "Controller of Examinations <coe.office@vitap.ac.in>",
      senderAddress: "coe.office@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[EXAMINATION] Fall 2026 Final Assessment Test (FAT) Schedule & Hall Ticket",
      snippet: "All students are requested to download their FAT Examination Hall Tickets from V-TOP. The verification window closes on November 20, 2026 at 5:00 PM.",
      bodyPlain: `Dear Students,

The comprehensive schedule for Fall 2026 Final Assessment Tests (FAT) has been released.
Hall tickets with designated examination hall seating will be available for download starting tomorrow.

Important Action Required:
1. Verify course codes and slot timings.
2. Report discrepancies to coe.office@vitap.ac.in before November 20, 2026, 5:00 PM.
3. Physical ID cards and printed hall tickets are mandatory.

Controller of Examinations
VIT-AP University`,
      receivedAt: hoursAgo(5),
      isRead: false,
      isStarred: true,
      category: EmailCategory.EXAMINATIONS,
      isImportant: true,
      priorityScore: 0.98,
      classificationConfidence: 0.99,
      classificationReason: "Matched official sender coe.office and subject FAT schedule",
      aiSummary: "Fall 2026 FAT Examination schedule published. Hall tickets available on V-TOP. Any course code discrepancy must be flagged by Nov 20, 5:00 PM.",
      deadlines: [
        {
          title: "FAT Hall Ticket Discrepancy Verification",
          description: "Check course codes and report exam slot issues to CoE office.",
          dueDate: daysFromNow(12, 17, 0),
          category: EmailCategory.EXAMINATIONS,
          confidenceScore: 0.98,
        },
      ],
    },
    {
      gmailMessageId: "msg_synthetic_place_03",
      gmailThreadId: "th_synthetic_place_03",
      sender: "Career Development Centre <cdc.placements@vitap.ac.in>",
      senderAddress: "cdc.placements@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[CDC PLACEMENT] Super Dream Opportunity: Nexus Cloud Systems (CTC: 24 LPA)",
      snippet: "Nexus Cloud Systems is conducting a campus recruitment drive for 2027 graduating batch. Role: Software Engineer - Distributed Systems. Registration deadline: Nov 10, 2026.",
      bodyPlain: `Greetings from CDC!

Company: Nexus Cloud Systems
Category: Super Dream (CTC: 24 LPA)
Eligible Branches: B.Tech CSE, ECE with CGPA >= 8.0 and zero standing arrears.
Role: Member Technical Staff - Distributed Systems

Selection Process:
1. Online Coding Round (Algorithms, OS, Networks)
2. Technical Interview I & II
3. HR Round

Interested and eligible candidates must fill out the Google Form link provided below before November 10, 2026 at 6:00 PM IST.

Career Development Centre
VIT-AP University`,
      receivedAt: hoursAgo(10),
      isRead: false,
      isStarred: false,
      category: EmailCategory.PLACEMENTS_AND_INTERNSHIPS,
      isImportant: true,
      priorityScore: 0.92,
      classificationConfidence: 0.96,
      classificationReason: "Matched CDC placement notification and Super Dream criteria",
      aiSummary: "Nexus Cloud Systems hiring MTS (24 LPA) for 2027 batch with CGPA >= 8.0. Registration closes Nov 10 at 6:00 PM.",
      deadlines: [
        {
          title: "Nexus Cloud Systems Registration Cut-Off",
          description: "Submit resume and register on CDC portal for Super Dream drive.",
          dueDate: daysFromNow(2, 18, 0),
          category: EmailCategory.PLACEMENTS_AND_INTERNSHIPS,
          confidenceScore: 0.99,
        },
      ],
    },
    {
      gmailMessageId: "msg_synthetic_school_04",
      gmailThreadId: "th_synthetic_school_04",
      sender: "School of Computer Science & Engineering <scope.office@vitap.ac.in>",
      senderAddress: "scope.office@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[SCOPE] Industry Guest Lecture on Advanced AI Agents by Google DeepMind",
      snippet: "The School of Computer Science invites all undergraduate students to a specialized guest lecture on Autonomous AI Systems in Central Block Auditorium on Nov 18.",
      bodyPlain: `Dear Students of SCOPE,

You are cordially invited to attend an upcoming distinguished industry guest lecture:
Topic: "Architecting Multi-Agent AI Systems for Enterprise Workloads"
Speaker: Senior Staff Research Engineer, Google DeepMind
Date: November 18, 2026
Time: 2:30 PM - 4:30 PM
Venue: Central Block Auditorium (AB-1, 4th Floor)

Attendance is compulsory for 3rd and 4th year AI/ML specialization students.

School of Computer Science and Engineering`,
      receivedAt: hoursAgo(18),
      isRead: true,
      isStarred: false,
      category: EmailCategory.GENERAL_ANNOUNCEMENTS,
      isImportant: false,
      priorityScore: 0.55,
      classificationConfidence: 0.88,
      classificationReason: "SCOPE School announcement",
      aiSummary: "Guest lecture on AI Agents by Google DeepMind on Nov 18, 2:30 PM at Central Block Auditorium. Compulsory for AI/ML specialization.",
      deadlines: [],
    },
    {
      gmailMessageId: "msg_synthetic_transport_05",
      gmailThreadId: "th_synthetic_transport_05",
      sender: "Campus Transport Department <transport@vitap.ac.in>",
      senderAddress: "transport@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[TRANSPORT] Revised Evening Day-Scholar Bus Timings for Vijayawada & Guntur Routes",
      snippet: "Please note the updated departure timings for day-scholar bus routes starting Monday due to highway infrastructure works.",
      bodyPlain: `Dear Day Scholars,

In view of road maintenance work on the Vijayawada-Amaravati bypass, evening bus departure timings have been revised:
- Vijayawada Routes (V1-V8): Buses will depart campus at 5:15 PM sharp.
- Guntur Routes (G1-G6): Buses will depart campus at 5:20 PM sharp.

Please arrive at the transport terminal 10 minutes prior to departure.

Transport Helpdesk
VIT-AP University`,
      receivedAt: hoursAgo(24),
      isRead: true,
      isStarred: false,
      category: EmailCategory.ADMINISTRATIVE_AND_HOSTEL,
      isImportant: false,
      priorityScore: 0.40,
      classificationConfidence: 0.92,
      classificationReason: "Administrative transport bulletin",
      aiSummary: "Day-scholar bus departures adjusted to 5:15 PM (Vijayawada) and 5:20 PM (Guntur) starting Monday.",
      deadlines: [],
    },
    {
      gmailMessageId: "msg_synthetic_event_06",
      gmailThreadId: "th_synthetic_event_06",
      sender: "Google Developer Student Club <gdsc.club@vitapstudent.ac.in>",
      senderAddress: "gdsc.club@vitapstudent.ac.in",
      recipient: demoStudentEmail,
      subject: "[EVENT] Campus Hackathon: HackAP 2026 - Registrations Closing Soon!",
      snippet: "Join 500+ student developers for HackAP 2026. Cash prizes worth 1.5 Lakhs. Form your teams and register before November 12, 2026.",
      bodyPlain: `Hey Hackers! 🚀

The countdown has begun for the biggest annual student hackathon on campus: HackAP 2026!
Tracks: Web3, Generative AI, Cloud Infrastructure, and Smart Campus Solutions.

Event Date: November 28-29, 2026
Team Size: 2 - 4 members
Registration Deadline: November 12, 2026, 11:59 PM

Register your squad on Devfolio today!

Cheers,
GDSC Core Team`,
      receivedAt: hoursAgo(30),
      isRead: false,
      isStarred: false,
      category: EmailCategory.EVENTS_AND_CLUBS,
      isImportant: false,
      priorityScore: 0.65,
      classificationConfidence: 0.94,
      classificationReason: "Matched student club and hackathon keywords",
      aiSummary: "HackAP 2026 hackathon team registration closes Nov 12 at 11:59 PM. Prizes worth 1.5L. Event on Nov 28-29.",
      deadlines: [
        {
          title: "HackAP 2026 Hackathon Team Registration",
          description: "Register team of 2-4 members on Devfolio.",
          dueDate: daysFromNow(4, 23, 59),
          category: EmailCategory.EVENTS_AND_CLUBS,
          confidenceScore: 0.92,
        },
      ],
    },
    {
      gmailMessageId: "msg_synthetic_admin_07",
      gmailThreadId: "th_synthetic_admin_07",
      sender: "Chief Warden Boys Hostel <warden.mh@vitap.ac.in>",
      senderAddress: "warden.mh@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[HOSTEL ADMIN] Mandatory Room Verification & Biometric Fingerprint Update",
      snippet: "All hostel residents of MH-1, MH-2, MH-3, and MH-4 must complete biometric validation at the hostel reception by November 14.",
      bodyPlain: `Dear Residents,

A new biometric turnstile access system has been installed at all Men's and Ladies' Hostel gates.
All resident students are hereby instructed to update their biometric finger impression and room occupancy records.

Verification Timings:
- Every evening from 6:30 PM to 9:30 PM
- Location: Ground Floor Reception Desk of respective blocks
- Final Date: November 14, 2026

Failure to complete biometric update will lead to gate pass deactivation.

Office of the Chief Warden
VIT-AP University`,
      receivedAt: hoursAgo(40),
      isRead: false,
      isStarred: true,
      category: EmailCategory.ADMINISTRATIVE_AND_HOSTEL,
      isImportant: true,
      priorityScore: 0.88,
      classificationConfidence: 0.95,
      classificationReason: "Hostel Warden administrative directive",
      aiSummary: "Mandatory biometric turnstile update at hostel reception from 6:30-9:30 PM. Must complete by Nov 14 to avoid gate pass deactivation.",
      deadlines: [
        {
          title: "Hostel Biometric & Turnstile Registration",
          description: "Complete fingerprint recording at hostel reception (6:30-9:30 PM).",
          dueDate: daysFromNow(6, 21, 30),
          category: EmailCategory.ADMINISTRATIVE_AND_HOSTEL,
          confidenceScore: 0.96,
        },
      ],
    },
    {
      gmailMessageId: "msg_synthetic_gen_08",
      gmailThreadId: "th_synthetic_gen_08",
      sender: "Registrar Office <registrar@vitap.ac.in>",
      senderAddress: "registrar@vitap.ac.in",
      recipient: demoStudentEmail,
      subject: "[ANNOUNCEMENT] University Holiday Notification - November 1",
      snippet: "The university will remain closed on November 1 on the occasion of Andhra Pradesh Formation Day. Regular instructional classes will resume on Monday.",
      bodyPlain: `Circular:

It is hereby notified for the information of all staff and students that the university will remain closed on November 1 on account of State Formation Day.
Essential services, including emergency campus medical center, transport, and dining services will function as per regular holiday schedules.

Registrar
VIT-AP University`,
      receivedAt: hoursAgo(60),
      isRead: true,
      isStarred: false,
      category: EmailCategory.GENERAL_ANNOUNCEMENTS,
      isImportant: false,
      priorityScore: 0.35,
      classificationConfidence: 0.99,
      classificationReason: "Official holiday circular from Registrar",
      aiSummary: "University closed on Nov 1 for AP Formation Day. Essential services open; regular classes resume Monday.",
      deadlines: [],
    },
  ];

  // 4. Upsert synthetic emails and associated deadlines
  for (const item of syntheticEmails) {
    const { deadlines, ...emailData } = item;

    const emailRecord = await prisma.email.upsert({
      where: {
        userId_gmailMessageId: {
          userId: user.id,
          gmailMessageId: emailData.gmailMessageId,
        },
      },
      update: {
        ...emailData,
      },
      create: {
        ...emailData,
        userId: user.id,
      },
    });

    // Delete existing deadlines for this email during re-seed to maintain repeatability
    await prisma.deadline.deleteMany({
      where: { emailId: emailRecord.id },
    });

    for (const dl of deadlines) {
      await prisma.deadline.create({
        data: {
          ...dl,
          userId: user.id,
          emailId: emailRecord.id,
          status: DeadlineStatus.PENDING,
        },
      });
    }

    // Attach basic labels
    await prisma.emailLabel.upsert({
      where: {
        emailId_name: {
          emailId: emailRecord.id,
          name: emailData.isRead ? "INBOX" : "UNREAD",
        },
      },
      update: {},
      create: {
        emailId: emailRecord.id,
        name: emailData.isRead ? "INBOX" : "UNREAD",
      },
    });
  }

  // 5. Add demo audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "SYNTHETIC_DEVELOPMENT_DATA_SEEDED",
      ipAddress: "127.0.0.1",
      userAgent: "CampusInbox Seed Script v1.0",
    },
  });

  const emailCount = await prisma.email.count({ where: { userId: user.id } });
  const deadlineCount = await prisma.deadline.count({ where: { userId: user.id } });

  console.log(`🎉 Successfully seeded ${emailCount} synthetic emails and ${deadlineCount} deadlines for demo student!`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
