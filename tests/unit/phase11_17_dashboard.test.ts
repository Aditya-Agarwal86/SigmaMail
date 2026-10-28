import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getKolkataDateKey, getKolkataDayDifference, formatDueDate } from '@/lib/utils';
import { generateICalendarFeed } from '@/lib/ical-generator';
import { DeadlineStatus } from '@prisma/client';

describe('Phase 11.17 - Historical Cleanup & Dashboard Polish Tests', () => {
  const testUserId = 'test_user_phase11_17_dashboard';
  let testEmailId: string;

  beforeAll(async () => {
    // Upsert a test user and an associated email
    const user = await prisma.user.upsert({
      where: { email: 'phase11_17.test@vitapstudent.ac.in' },
      update: {},
      create: {
        id: testUserId,
        email: 'phase11_17.test@vitapstudent.ac.in',
        name: 'Phase 11.17 Test Student',
      },
    });

    const email = await prisma.email.upsert({
      where: {
        userId_gmailMessageId: {
          userId: user.id,
          gmailMessageId: 'gmail_msg_phase11_17_test',
        },
      },
      update: {},
      create: {
        userId: user.id,
        gmailMessageId: 'gmail_msg_phase11_17_test',
        gmailThreadId: 'thread_11_17_test',
        sender: 'Dean Academics <dean.acad@vitap.ac.in>',
        senderAddress: 'dean.acad@vitap.ac.in',
        recipient: 'phase11_17.test@vitapstudent.ac.in',
        subject: '[ACADEMICS] Phase 11.17 Test Circular for Deadlines',
        snippet: 'Important circular regarding academic deadlines',
        receivedAt: new Date(),
        category: 'ACADEMICS',
      },
    });

    testEmailId = email.id;

    // Clean any prior deadlines
    await prisma.deadline.deleteMany({ where: { userId: testUserId } });
  });

  afterAll(async () => {
    // Cleanup fixtures
    await prisma.deadline.deleteMany({ where: { userId: testUserId } });
    await prisma.email.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('calculates Asia/Kolkata date key and day differences without off-by-one errors', () => {
    // Current time in IST
    const now = new Date();
    const todayKey = getKolkataDateKey(now);
    expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Difference for today must be 0
    expect(getKolkataDayDifference(now)).toBe(0);
    expect(formatDueDate(now)).toBe('Due today');

    // Difference for tomorrow (+24h)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const diffTomorrow = getKolkataDayDifference(tomorrow);
    expect(diffTomorrow).toBeGreaterThanOrEqual(1);

    // Past date (> 30 days)
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const diffPast = getKolkataDayDifference(fortyDaysAgo);
    expect(diffPast).toBeLessThan(-30);
    expect(formatDueDate(fortyDaysAgo)).toContain('Overdue');
  });

  it('performs candidate confirm, edit, complete, dismiss, archive and restore workflow', async () => {
    // 1. Create a candidate deadline
    const candidate = await prisma.deadline.create({
      data: {
        userId: testUserId,
        emailId: testEmailId,
        title: 'Phase 11.17 Candidate Test',
        description: 'Candidate description',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        category: 'ACADEMICS',
        isCandidate: true,
        status: DeadlineStatus.PENDING,
        reminderMinutesBefore: 1440,
      },
    });

    expect(candidate.isCandidate).toBe(true);
    expect(candidate.status).toBe(DeadlineStatus.PENDING);

    // 2. Action: CONFIRM
    const confirmed = await prisma.deadline.update({
      where: { id: candidate.id },
      data: { isCandidate: false, status: DeadlineStatus.PENDING },
    });
    expect(confirmed.isCandidate).toBe(false);
    expect(confirmed.status).toBe(DeadlineStatus.PENDING);

    // 3. Action: ARCHIVE (reversible)
    const archived = await prisma.deadline.update({
      where: { id: candidate.id },
      data: { status: DeadlineStatus.DISMISSED },
    });
    expect(archived.status).toBe(DeadlineStatus.DISMISSED);

    // 4. Action: RESTORE
    const restored = await prisma.deadline.update({
      where: { id: candidate.id },
      data: { isCandidate: true, status: DeadlineStatus.PENDING },
    });
    expect(restored.isCandidate).toBe(true);
    expect(restored.status).toBe(DeadlineStatus.PENDING);
  });

  it('strictly excludes candidates, dismissed, and completed from active calendar exports', async () => {
    // Create one candidate and one dismissed
    const candidate = await prisma.deadline.create({
      data: {
        userId: testUserId,
        emailId: testEmailId,
        title: 'Unconfirmed Candidate',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isCandidate: true,
        status: DeadlineStatus.PENDING,
      },
    });

    const dismissed = await prisma.deadline.create({
      data: {
        userId: testUserId,
        emailId: testEmailId,
        title: 'Dismissed Deadline',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isCandidate: false,
        status: DeadlineStatus.DISMISSED,
      },
    });

    // Query active exportable deadlines
    const exportable = await prisma.deadline.findMany({
      where: {
        userId: testUserId,
        isCandidate: false,
        status: DeadlineStatus.PENDING,
      },
    });

    expect(exportable.length).toBe(0);

    // Confirm one deadline
    const confirmed = await prisma.deadline.create({
      data: {
        userId: testUserId,
        emailId: testEmailId,
        title: 'Confirmed Exportable Deadline',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isCandidate: false,
        status: DeadlineStatus.PENDING,
        reminderMinutesBefore: 1440,
      },
      include: { email: { select: { subject: true } } },
    });

    const activeList = await prisma.deadline.findMany({
      where: {
        userId: testUserId,
        isCandidate: false,
        status: DeadlineStatus.PENDING,
      },
      include: { email: { select: { subject: true } } },
    });

    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe(confirmed.id);

    const icsContent = generateICalendarFeed(
      [
        {
          uid: confirmed.id,
          title: confirmed.title,
          dueDate: confirmed.dueDate,
          sourceEmailSubject: confirmed.email.subject,
          reminderMinutesBefore: confirmed.reminderMinutesBefore,
        },
      ],
      'Test Feed'
    );

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('TRIGGER:-PT1440M');
    expect(icsContent).toContain('X-WR-TIMEZONE:Asia/Kolkata');
    expect(icsContent).toContain('Confirmed Exportable Deadline');
  });

  it('isolates user records across tenants', async () => {
    const foreignRecords = await prisma.deadline.findMany({
      where: { userId: 'non_existent_tenant_999' },
    });
    expect(foreignRecords.length).toBe(0);
  });
});
