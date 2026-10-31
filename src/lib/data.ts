import { prisma } from "@/lib/prisma";
import { EmailCategory, SchoolCode, PriorityLevel } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/session";

export async function getCurrentUser(allowDemo = true) {
  return getAuthenticatedUser({ allowDemoFallback: allowDemo });
}

export interface GetEmailsParams {
  userId?: string;
  category?: EmailCategory;
  subCategory?: string;
  school?: SchoolCode;
  isImportant?: boolean;
  priorityLevel?: PriorityLevel;
  hasDeadlines?: boolean;
  facultyEmail?: string;
  unknownFaculty?: boolean;
  query?: string;
  opportunityId?: string;
  placementStat?: "ongoing" | "upcoming" | "completed" | "closing_soon" | "total";
  page?: number;
  pageSize?: number;
}

export async function getEmails(params?: GetEmailsParams) {
  let userId = params?.userId;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return { emails: [], totalCount: 0, totalPages: 0, page: 1 };
    userId = user.id;
  }

  const whereClause: any = {
    userId,
    isTrash: false,
    isArchived: false,
  };

  if (params?.category) {
    whereClause.category = params.category;
  }

  if (params?.subCategory) {
    whereClause.subCategory = params.subCategory;
  }

  if (params?.school) {
    whereClause.school = params.school;
  }

  if (params?.facultyEmail) {
    whereClause.senderAddress = params.facultyEmail.toLowerCase();
  } else if (params?.unknownFaculty) {
    // Exclude all known faculty addresses for this user
    const faculty = await prisma.facultyContact.findMany({
      where: { userId },
      select: { email: true },
    });
    const knownEmails = faculty.map((f) => f.email.toLowerCase());
    if (knownEmails.length > 0) {
      whereClause.senderAddress = { notIn: knownEmails };
    }
  }

  if (params?.isImportant !== undefined) {
    whereClause.isImportant = params.isImportant;
  }

  if (params?.priorityLevel) {
    whereClause.priorityLevel = params.priorityLevel;
  }

  if (params?.hasDeadlines) {
    whereClause.deadlines = {
      some: {
        status: { not: "DISMISSED" },
      },
    };
  }

  if (params?.query && params.query.trim().length > 0) {
    const q = params.query.trim();
    whereClause.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { sender: { contains: q, mode: "insensitive" } },
      { snippet: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params?.opportunityId) {
    whereClause.opportunityId = params.opportunityId;
  }

  if (params?.placementStat) {
    const now = new Date();
    const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (params.placementStat === "ongoing") {
      whereClause.opportunity = {
        currentStage: { in: ["REGISTRATION_OPEN", "ASSESSMENT_SCHEDULED", "INTERVIEW_SCHEDULED"] },
      };
    } else if (params.placementStat === "upcoming") {
      whereClause.opportunity = {
        currentStage: { in: ["DRIVE_ANNOUNCED", "PRE_PLACEMENT_TALK"] },
      };
    } else if (params.placementStat === "completed") {
      whereClause.opportunity = {
        currentStage: { in: ["SHORTLIST_ANNOUNCED", "OFFER_CONGRATULATIONS"] },
      };
    } else if (params.placementStat === "closing_soon") {
      whereClause.opportunity = {
        applicationDeadline: {
          gte: now,
          lte: threeDaysAhead,
        },
      };
    } else if (params.placementStat === "total") {
      whereClause.opportunityId = { not: null };
    }
  }

  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.max(1, Math.min(params?.pageSize || 25, 100));
  const skip = (page - 1) * pageSize;

  const [totalCount, emails] = await Promise.all([
    prisma.email.count({ where: whereClause }),
    prisma.email.findMany({
      where: whereClause,
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        deadlines: true,
        labels: true,
        opportunity: true,
      },
    }),
  ]);

  return {
    emails,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    page,
    pageSize,
  };
}

export interface GetOpportunitiesOptions {
  page?: number;
  pageSize?: number;
  company?: string;
  role?: string;
  studentStatus?: string;
  stage?: string;
  branch?: string;
}

export async function getOpportunities(userIdParam?: string, options: GetOpportunitiesOptions = {}) {
  let userId = userIdParam;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return { opportunities: [], totalCount: 0, totalPages: 0, page: 1, stats: null };
    userId = user.id;
  }

  const where: any = { userId };

  if (options.company) {
    where.companyName = { contains: options.company, mode: "insensitive" };
  }
  if (options.role) {
    where.jobRole = { contains: options.role, mode: "insensitive" };
  }
  if (options.studentStatus) {
    where.studentStatus = options.studentStatus as any;
  }
  if (options.stage) {
    where.currentStage = options.stage as any;
  }
  if (options.branch) {
    where.eligibleBranches = { has: options.branch };
  }

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(options.pageSize || 20, 50));
  const skip = (page - 1) * pageSize;

  // Real-time calculation of dashboard statistics from actual user opportunities
  const [totalCount, allUserOpps, opportunities] = await Promise.all([
    prisma.placementOpportunity.count({ where }),
    prisma.placementOpportunity.findMany({
      where: { userId },
      select: {
        id: true,
        currentStage: true,
        studentStatus: true,
        lastActivityAt: true,
        applicationDeadline: true,
      },
    }),
    prisma.placementOpportunity.findMany({
      where,
      orderBy: { lastActivityAt: "desc" },
      skip,
      take: pageSize,
      include: {
        emails: {
          select: {
            id: true,
            subject: true,
            receivedAt: true,
            subCategory: true,
            priorityLevel: true,
          },
          orderBy: { receivedAt: "asc" },
        },
      },
    }),
  ]);

  const now = new Date();
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const placementStats = {
    upcomingDrives: allUserOpps.filter((o) => o.currentStage === "DRIVE_ANNOUNCED" || o.currentStage === "PRE_PLACEMENT_TALK").length,
    ongoingDrives: allUserOpps.filter((o) => o.currentStage === "REGISTRATION_OPEN" || o.currentStage === "ASSESSMENT_SCHEDULED" || o.currentStage === "INTERVIEW_SCHEDULED").length,
    completedDrives: allUserOpps.filter((o) => o.currentStage === "SHORTLIST_ANNOUNCED" || o.currentStage === "OFFER_CONGRATULATIONS").length,
    closingSoon: allUserOpps.filter((o) => o.applicationDeadline && o.applicationDeadline >= now && o.applicationDeadline <= threeDaysAhead).length,
    totalDrives: allUserOpps.length,
    applied: allUserOpps.filter((o) => o.studentStatus === "APPLIED" || o.studentStatus === "ASSESSMENT_COMPLETED" || o.studentStatus === "INTERVIEW_SCHEDULED").length,
    shortlisted: allUserOpps.filter((o) => o.studentStatus === "SHORTLISTED" || o.studentStatus === "SELECTED" || o.currentStage === "SHORTLIST_ANNOUNCED").length,
    resultsAnnounced: allUserOpps.filter((o) => o.currentStage === "OFFER_CONGRATULATIONS" || o.currentStage === "SHORTLIST_ANNOUNCED").length,
    newOpportunities: allUserOpps.filter((o) => new Date(o.lastActivityAt) >= sevenDaysAgo).length,
  };

  return {
    opportunities,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    page,
    pageSize,
    stats: placementStats,
  };
}

export interface GetDeadlinesOptions {
  status?: "PENDING" | "COMPLETED" | "DISMISSED" | "ALL";
  isCandidate?: boolean;
}

export async function getUpcomingDeadlines(
  userIdParam?: string,
  options?: GetDeadlinesOptions
) {
  let userId = userIdParam;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return [];
    userId = user.id;
  }

  const where: any = { userId };

  if (options?.status && options.status !== "ALL") {
    where.status = options.status;
  } else if (!options?.status) {
    where.status = "PENDING";
  }

  if (options?.isCandidate !== undefined) {
    where.isCandidate = options.isCandidate;
  }

  return prisma.deadline.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: {
      email: {
        select: {
          id: true,
          subject: true,
          sender: true,
          receivedAt: true,
        },
      },
    },
  });
}

export async function getEmailStats(userIdParam?: string) {
  let userId = userIdParam;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) {
      return {
        total: 0,
        unread: 0,
        important: 0,
        deadlines: 0,
        byCategory: {} as Record<string, number>,
        bySubCategory: {} as Record<string, number>,
        bySchool: {} as Record<string, number>,
      };
    }
    userId = user.id;
  }

  const [total, unread, important, deadlines, categories, subCategories, schools] = await Promise.all([
    prisma.email.count({ where: { userId, isTrash: false, isArchived: false } }),
    prisma.email.count({ where: { userId, isRead: false, isTrash: false, isArchived: false } }),
    prisma.email.count({ where: { userId, isImportant: true, isTrash: false, isArchived: false } }),
    prisma.deadline.count({ where: { userId, status: "PENDING" } }),
    prisma.email.groupBy({
      by: ["category"],
      where: { userId, isTrash: false, isArchived: false },
      _count: true,
    }),
    prisma.email.groupBy({
      by: ["subCategory"],
      where: { userId, isTrash: false, isArchived: false, subCategory: { not: null } },
      _count: true,
    }),
    prisma.email.groupBy({
      by: ["school"],
      where: { userId, isTrash: false, isArchived: false, school: { not: null } },
      _count: true,
    }),
  ]);

  const byCategory: Record<string, number> = {};
  for (const item of categories) {
    byCategory[item.category] = item._count;
  }

  const bySubCategory: Record<string, number> = {};
  for (const item of subCategories) {
    if (item.subCategory) {
      bySubCategory[item.subCategory] = item._count;
    }
  }

  const bySchool: Record<string, number> = {};
  for (const item of schools) {
    if (item.school) {
      bySchool[item.school] = item._count;
    }
  }

  return {
    total,
    unread,
    important,
    deadlines,
    byCategory,
    bySubCategory,
    bySchool,
  };
}
