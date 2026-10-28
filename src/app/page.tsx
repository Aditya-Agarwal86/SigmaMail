import { getEmails, getEmailStats, getCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { EmailCard } from "@/components/email-card";
import { InboxFilters } from "@/components/inbox-filters";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { Inbox, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { EmailCategory, PriorityLevel, SchoolCode } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    category?: string;
    subCategory?: string;
    school?: string;
    priority?: string;
    deadlines?: string;
    page?: string;
  };
}) {
  const query = searchParams.q;
  const categoryParam = searchParams.category as EmailCategory | undefined;
  const subCategoryParam = searchParams.subCategory;
  const schoolParam = searchParams.school as SchoolCode | undefined;
  const priorityParam = searchParams.priority as PriorityLevel | undefined;
  const hasDeadlines = searchParams.deadlines === "true";
  const page = parseInt(searchParams.page || "1", 10) || 1;

  const user = await getCurrentUser();
  const userId = user?.id;

  const [{ emails, totalCount, totalPages }, stats] = await Promise.all([
    getEmails({
      userId,
      query,
      category: categoryParam && Object.values(EmailCategory).includes(categoryParam) ? categoryParam : undefined,
      subCategory: subCategoryParam,
      school: schoolParam,
      priorityLevel: priorityParam && Object.values(PriorityLevel).includes(priorityParam) ? priorityParam : undefined,
      hasDeadlines,
      page,
      pageSize: 25,
    }),
    getEmailStats(userId),
  ]);

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        {/* Real-time Gmail Sync & Import All Status Banner */}
        <SyncStatusBar />

        <main className="flex-1 overflow-y-auto">
          {/* Top Banner Notice */}
          {isDemoUser ? (
            <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>SigmaMail Synthetic Preview</strong> — Domain enforcement configured for{" "}
                  <code>vitapstudent.ac.in</code>. All emails shown are synthetic demonstration records.
                </span>
              </div>
              <span className="font-semibold">{totalCount} Demo Messages</span>
            </div>
          ) : (
            <div className="bg-blue-50/70 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between text-xs text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>
                  <strong>University Mailbox Connected</strong> — Showing synced messages for{" "}
                  <code>{user?.email}</code>.
                </span>
              </div>
              <span className="font-semibold">{totalCount} Total Messages in Inbox</span>
            </div>
          )}

          {/* List Content */}
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {query ? `Search Results for "${query}"` : "College Inbox"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phase 6: Full Gmail Sync, Custom University Categories & Faculty Directory
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Showing {emails.length} of {totalCount}
              </span>
            </div>

            {/* Smart Filters Toolbar */}
            <InboxFilters currentCategory={categoryParam} />

            {emails.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
                <Inbox className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No emails found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {query
                    ? "Try adjusting your search terms or clearing the filter."
                    : "No messages are currently matching this filter in your inbox."}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                  {emails.map((email) => (
                    <EmailCard key={email.id} email={email} />
                  ))}
                </div>

                {/* Server-Side Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 pb-6 text-xs text-slate-500">
                    <span>
                      Page {page} of {totalPages} ({totalCount} total messages)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {page > 1 && (
                        <Link
                          href={`/?page=${page - 1}${categoryParam ? `&category=${categoryParam}` : ""}${subCategoryParam ? `&subCategory=${encodeURIComponent(subCategoryParam)}` : ""}${schoolParam ? `&school=${encodeURIComponent(schoolParam)}` : ""}${priorityParam ? `&priority=${encodeURIComponent(priorityParam)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 font-medium"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          href={`/?page=${page + 1}${categoryParam ? `&category=${categoryParam}` : ""}${subCategoryParam ? `&subCategory=${encodeURIComponent(subCategoryParam)}` : ""}${schoolParam ? `&school=${encodeURIComponent(schoolParam)}` : ""}${priorityParam ? `&priority=${encodeURIComponent(priorityParam)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 font-medium"
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
