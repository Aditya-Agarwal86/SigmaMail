import { notFound } from "next/navigation";
import { EmailCategory, SchoolCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmails, getEmailStats, getCurrentUser, getOpportunities } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { EmailCard } from "@/components/email-card";
import { InboxFilters } from "@/components/inbox-filters";
import { OpportunitiesList } from "@/components/opportunities-list";
import { AcademicsFacultyFilter } from "@/components/academics-faculty-filter";
import { PlacementStatsDashboard } from "@/components/placement-stats-dashboard";
import { CATEGORY_METADATA } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Briefcase, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: {
    category: string;
  };
  searchParams: {
    subCategory?: string;
    school?: string;
    faculty?: string;
    unknownFaculty?: string;
    priority?: string;
    deadlines?: string;
    view?: string;
    placementStat?: "ongoing" | "upcoming" | "completed" | "closing_soon" | "total";
    page?: string;
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const categoryEnum = params.category as EmailCategory;

  if (!Object.values(EmailCategory).includes(categoryEnum)) {
    notFound();
  }

  const user = await getCurrentUser();
  const userId = user?.id;

  const page = parseInt(searchParams.page || "1", 10) || 1;
  const subCategory = searchParams.subCategory;
  const school = searchParams.school as SchoolCode | undefined;
  const facultyEmail = searchParams.faculty;
  const isUnknownFaculty = searchParams.unknownFaculty === "true";
  const priority = searchParams.priority as any;
  const hasDeadlines = searchParams.deadlines === "true";
  const placementStat = searchParams.placementStat;
  const isCDC =
    categoryEnum === EmailCategory.CDC_AND_PLACEMENT || categoryEnum === EmailCategory.PLACEMENTS_AND_INTERNSHIPS;
  const isAcademics = categoryEnum === EmailCategory.ACADEMICS;
  const isOpportunitiesView = isCDC && searchParams.view === "opportunities";

  // If viewing Academics, fetch user's configured faculty contacts and calculate email counts
  let facultyFilterData: any[] = [];
  let allAcademicsCount = 0;
  let unassignedFacultyCount = 0;

  if (isAcademics && userId) {
    const [facultyList, totalAcad] = await Promise.all([
      prisma.facultyContact.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.email.count({
        where: { userId, category: EmailCategory.ACADEMICS, isTrash: false, isArchived: false },
      }),
    ]);
    allAcademicsCount = totalAcad;

    const knownAddresses = facultyList.map((f: any) => f.email.toLowerCase());

    const [countsByFaculty, unassignedCount] = await Promise.all([
      Promise.all(
        facultyList.map(async (f: any) => {
          const count = await prisma.email.count({
            where: {
              userId,
              category: EmailCategory.ACADEMICS,
              senderAddress: f.email.toLowerCase(),
              isTrash: false,
              isArchived: false,
            },
          });
          return {
            id: f.id,
            name: f.name,
            email: f.email,
            courseLabel: f.courseLabel,
            count,
          };
        })
      ),
      prisma.email.count({
        where: {
          userId,
          category: EmailCategory.ACADEMICS,
          senderAddress: knownAddresses.length > 0 ? { notIn: knownAddresses } : undefined,
          isTrash: false,
          isArchived: false,
        },
      }),
    ]);

    facultyFilterData = countsByFaculty;
    unassignedFacultyCount = unassignedCount;
  }

  const [emailData, stats, oppsData, userPrefs] = await Promise.all([
    !isOpportunitiesView
      ? getEmails({
          userId,
          category: categoryEnum,
          subCategory,
          school,
          facultyEmail: isAcademics ? facultyEmail : undefined,
          unknownFaculty: isAcademics ? isUnknownFaculty : undefined,
          priorityLevel: priority,
          hasDeadlines,
          placementStat: isCDC ? placementStat : undefined,
          page,
          pageSize: 25,
        })
      : Promise.resolve({ emails: [], totalCount: 0, totalPages: 0 }),
    getEmailStats(userId),
    isCDC
      ? getOpportunities(userId, { page: isOpportunitiesView ? page : 1, pageSize: 15 })
      : Promise.resolve({ opportunities: [], totalCount: 0, totalPages: 0, stats: null }),
    userId
      ? prisma.userPreference.findUnique({
          where: { userId },
          select: { categoryNames: true },
        })
      : Promise.resolve(null),
  ]);

  const emails = emailData.emails;
  const totalCount = isOpportunitiesView ? oppsData.totalCount : emailData.totalCount;
  const totalPages = isOpportunitiesView ? oppsData.totalPages : emailData.totalPages;
  const opportunities = oppsData.opportunities as any[];

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";
  const meta = CATEGORY_METADATA[categoryEnum] || CATEGORY_METADATA.OTHER;
  const customNamesMap = (userPrefs?.categoryNames as Record<string, string>) || {};
  const categoryDisplayName = customNamesMap[categoryEnum] || meta.label;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4 w-full">
          {/* Category Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg font-semibold text-sm border ${meta.bg} ${meta.color} ${meta.border}`}
              >
                {categoryDisplayName}
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {categoryDisplayName} Feed
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verified university announcements categorized under {categoryDisplayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* CDC-Specific Toggle: Feed vs Tracked Company Opportunities */}
              {isCDC && (
                <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border text-xs">
                  <Link
                    href={`/categories/${categoryEnum}`}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      !isOpportunitiesView
                        ? "bg-card text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Email Stream
                  </Link>
                  <Link
                    href={`/categories/${categoryEnum}?view=opportunities`}
                    className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      isOpportunitiesView
                        ? "bg-card text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Company Drives</span>
                  </Link>
                </div>
              )}

              <span className="text-xs font-medium text-muted-foreground">
                {totalCount} Total Items
              </span>
            </div>
          </div>

          {/* Academics-Specific Faculty Filter */}
          {isAcademics && (
            <AcademicsFacultyFilter
              facultyList={facultyFilterData}
              allCount={allAcademicsCount}
              unassignedCount={unassignedFacultyCount}
              currentFacultyEmail={facultyEmail}
              isUnknownSelected={isUnknownFaculty}
            />
          )}

          {/* CDC & Placement Interactive Statistics Dashboard (Requirement 1) */}
          {isCDC && oppsData.stats && (
            <PlacementStatsDashboard
              stats={{
                ongoingDrives: oppsData.stats.ongoingDrives,
                upcomingDrives: oppsData.stats.upcomingDrives,
                completedDrives: oppsData.stats.completedDrives,
                closingSoon: oppsData.stats.closingSoon,
                totalDrives: oppsData.stats.totalDrives,
              }}
              activeStat={placementStat}
            />
          )}

          {/* Render Filters if in Stream view */}
          {!isOpportunitiesView && <InboxFilters currentCategory={categoryEnum} />}

          {/* Main List Render: Company Opportunities or Email Stream */}
          {isOpportunitiesView ? (
            <OpportunitiesList
              opportunities={opportunities}
              currentCategoryUrl={`/categories/${categoryEnum}?view=opportunities`}
              stats={oppsData.stats}
            />
          ) : emails.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No messages in this category</h3>
              <p className="text-xs text-muted-foreground mt-1">
                New emails matching {meta.label} will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl shadow-xs border border-border overflow-hidden divide-y divide-border">
                {emails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    returnUrl={`/categories/${categoryEnum}${page > 1 ? `?page=${page}` : ""}`}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-6 text-xs text-muted-foreground">
                  <span>
                    Page {page} of {totalPages} ({totalCount} total)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {page > 1 && (
                      <Link
                        href={`/categories/${categoryEnum}?page=${page - 1}${subCategory ? `&subCategory=${encodeURIComponent(subCategory)}` : ""}${school ? `&school=${encodeURIComponent(school)}` : ""}${priority ? `&priority=${encodeURIComponent(priority)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}${placementStat ? `&placementStat=${encodeURIComponent(placementStat)}` : ""}${isOpportunitiesView ? "&view=opportunities" : ""}`}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted flex items-center gap-1 font-medium transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/categories/${categoryEnum}?page=${page + 1}${subCategory ? `&subCategory=${encodeURIComponent(subCategory)}` : ""}${school ? `&school=${encodeURIComponent(school)}` : ""}${priority ? `&priority=${encodeURIComponent(priority)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}${placementStat ? `&placementStat=${encodeURIComponent(placementStat)}` : ""}${isOpportunitiesView ? "&view=opportunities" : ""}`}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted flex items-center gap-1 font-medium transition-colors"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
