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
  query?: string;
  opportunityId?: string;
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

export async function getOpportunities(userIdParam?: string, options: { page?: number; pageSize?: number } = {}) {
  let userId = userIdParam;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return { opportunities: [], totalCount: 0, totalPages: 0, page: 1 };
    userId = user.id;
  }

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(options.pageSize || 20, 50));
  const skip = (page - 1) * pageSize;

  const [totalCount, opportunities] = await Promise.all([
    prisma.placementOpportunity.count({ where: { userId } }),
    prisma.placementOpportunity.findMany({
      where: { userId },
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

  return {
    opportunities,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    page,
    pageSize,
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
