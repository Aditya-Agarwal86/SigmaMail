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
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8F4]">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        {/* Real-time Gmail Sync & Status Banner */}
        <SyncStatusBar />

        <main className="flex-1 overflow-y-auto">
          {/* Top Banner Notice */}
          {isDemoUser ? (
            <div className="bg-[#E5EBE1] border-b border-[#D3DCD0] px-6 py-2.5 flex items-center justify-between text-xs text-[#244A3A]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#244A3A]" />
                <span>
                  <strong>SigmaMail Synthetic Preview</strong> — Domain enforcement configured for{" "}
                  <code className="font-mono">vitapstudent.ac.in</code>. All emails shown are synthetic demonstration records.
                </span>
              </div>
              <span className="font-semibold">{totalCount} Demo Messages</span>
            </div>
          ) : (
            <div className="bg-[#E5EBE1] border-b border-[#D3DCD0] px-6 py-2.5 flex items-center justify-between text-xs text-[#244A3A]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#244A3A]" />
                <span>
                  <strong>University Mailbox Connected</strong> — Showing synced messages for{" "}
                  <code className="font-mono">{user?.email}</code>.
                </span>
              </div>
              <span className="font-semibold">{totalCount} Total Messages in Inbox</span>
            </div>
          )}

          {/* List Content */}
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E1E5DC]">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#252923]">
                  {query ? `Search Results for "${query}"` : "College Inbox"}
                </h2>
                <p className="text-xs text-[#697168] mt-0.5">
                  Organized academic updates, notifications, and important communications
                </p>
              </div>
              <span className="text-xs font-medium text-[#697168]">
                Showing {emails.length} of {totalCount}
              </span>
            </div>

            {/* Smart Filters Toolbar */}
            <InboxFilters currentCategory={categoryParam} />

            {emails.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
                <Inbox className="h-10 w-10 text-[#697168] mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-[#252923]">No emails found</h3>
                <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                  {query
                    ? "Try adjusting your search terms or clearing the filter."
                    : "No messages are currently matching this filter in your inbox."}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-card border border-[#E1E5DC] overflow-hidden">
                  {emails.map((email) => (
                    <EmailCard key={email.id} email={email} />
                  ))}
                </div>

                {/* Server-Side Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 pb-6 text-xs text-[#697168]">
                    <span>
                      Page {page} of {totalPages} ({totalCount} total messages)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {page > 1 && (
                        <Link
                          href={`/?page=${page - 1}${categoryParam ? `&category=${categoryParam}` : ""}${subCategoryParam ? `&subCategory=${encodeURIComponent(subCategoryParam)}` : ""}${schoolParam ? `&school=${encodeURIComponent(schoolParam)}` : ""}${priorityParam ? `&priority=${encodeURIComponent(priorityParam)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                          className="px-3 py-1.5 rounded-lg border border-[#E1E5DC] bg-white text-[#252923] hover:bg-[#F7F8F4] flex items-center gap-1 font-medium transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          href={`/?page=${page + 1}${categoryParam ? `&category=${categoryParam}` : ""}${subCategoryParam ? `&subCategory=${encodeURIComponent(subCategoryParam)}` : ""}${schoolParam ? `&school=${encodeURIComponent(schoolParam)}` : ""}${priorityParam ? `&priority=${encodeURIComponent(priorityParam)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                          className="px-3 py-1.5 rounded-lg border border-[#E1E5DC] bg-white text-[#252923] hover:bg-[#F7F8F4] flex items-center gap-1 font-medium transition-colors"
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
