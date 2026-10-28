import { notFound } from "next/navigation";
import { EmailCategory, SchoolCode } from "@prisma/client";
import { getEmails, getEmailStats, getCurrentUser, getOpportunities } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { EmailCard } from "@/components/email-card";
import { InboxFilters } from "@/components/inbox-filters";
import { OpportunitiesList } from "@/components/opportunities-list";
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
    priority?: string;
    deadlines?: string;
    view?: string;
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
  const priority = searchParams.priority as any;
  const hasDeadlines = searchParams.deadlines === "true";
  const isCDC =
    categoryEnum === EmailCategory.CDC_AND_PLACEMENT || categoryEnum === EmailCategory.PLACEMENTS_AND_INTERNSHIPS;
  const isOpportunitiesView = isCDC && searchParams.view === "opportunities";

  const [emailData, stats, oppsData] = await Promise.all([
    !isOpportunitiesView
      ? getEmails({
          userId,
          category: categoryEnum,
          subCategory,
          school,
          priorityLevel: priority,
          hasDeadlines,
          page,
          pageSize: 25,
        })
      : Promise.resolve({ emails: [], totalCount: 0, totalPages: 0 }),
    getEmailStats(userId),
    isOpportunitiesView
      ? getOpportunities(userId, { page, pageSize: 15 })
      : Promise.resolve({ opportunities: [], totalCount: 0, totalPages: 0 }),
  ]);

  const emails = emailData.emails;
  const totalCount = isOpportunitiesView ? oppsData.totalCount : emailData.totalCount;
  const totalPages = isOpportunitiesView ? oppsData.totalPages : emailData.totalPages;
  const opportunities = oppsData.opportunities as any[];

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";
  const meta = CATEGORY_METADATA[categoryEnum] || CATEGORY_METADATA.OTHER;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4 w-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-md font-bold text-xs border ${meta.bg} ${meta.color} ${meta.border}`}
                >
                  {meta.label}
                </span>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Category Feed
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Showing all university communications categorized under {meta.label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isCDC && (
                <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-medium">
                  <Link
                    href={`/categories/${categoryEnum}`}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      !isOpportunitiesView
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    All Messages
                  </Link>
                  <Link
                    href={`/categories/${categoryEnum}?view=opportunities`}
                    className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                      isOpportunitiesView
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Company Opportunities</span>
                  </Link>
                </div>
              )}
              <span className="text-xs font-semibold text-slate-500">
                {totalCount} {isOpportunitiesView ? "Companies Tracked" : "Messages Total"}
              </span>
            </div>
          </div>

          {/* Sub-Filters (Faculty Directory button for Academics, School selector for Schools, Subtypes for CDC) */}
          {!isOpportunitiesView && <InboxFilters currentCategory={categoryEnum} />}

          {isOpportunitiesView ? (
            <>
              {(() => {
                const currentCategoryUrl = `/categories/${categoryEnum}?view=opportunities${page > 1 ? `&page=${page}` : ""}`;
                return <OpportunitiesList opportunities={opportunities} currentCategoryUrl={currentCategoryUrl} />;
              })()}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-6 text-xs text-slate-500">
                  <span>
                    Page {page} of {totalPages} ({totalCount} opportunities)
                  </span>
                  <div className="flex items-center gap-1">
                    {page > 1 && (
                      <Link
                        href={`/categories/${categoryEnum}?view=opportunities&page=${page - 1}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 font-medium"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/categories/${categoryEnum}?view=opportunities&page=${page + 1}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 font-medium"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : emails.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                No emails found in {meta.label}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                New communications matching this category or filter will automatically appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                {(() => {
                  const currentCategoryParams = new URLSearchParams();
                  if (page > 1) currentCategoryParams.set("page", page.toString());
                  if (subCategory) currentCategoryParams.set("subCategory", subCategory);
                  if (school) currentCategoryParams.set("school", school);
                  if (priority) currentCategoryParams.set("priority", priority);
                  if (hasDeadlines) currentCategoryParams.set("deadlines", "true");
                  const currentQuery = currentCategoryParams.toString();
                  const currentCategoryUrl = currentQuery
                    ? `/categories/${categoryEnum}?${currentQuery}`
                    : `/categories/${categoryEnum}`;

                  return emails.map((email) => (
                    <EmailCard key={email.id} email={email} returnUrl={currentCategoryUrl} />
                  ));
                })()}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-6 text-xs text-slate-500">
                  <span>
                    Page {page} of {totalPages} ({totalCount} total)
                  </span>
                  <div className="flex items-center gap-1">
                    {page > 1 && (
                      <Link
                        href={`/categories/${categoryEnum}?page=${page - 1}${subCategory ? `&subCategory=${encodeURIComponent(subCategory)}` : ""}${school ? `&school=${encodeURIComponent(school)}` : ""}${priority ? `&priority=${encodeURIComponent(priority)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 font-medium"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/categories/${categoryEnum}?page=${page + 1}${subCategory ? `&subCategory=${encodeURIComponent(subCategory)}` : ""}${school ? `&school=${encodeURIComponent(school)}` : ""}${priority ? `&priority=${encodeURIComponent(priority)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 font-medium"
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
