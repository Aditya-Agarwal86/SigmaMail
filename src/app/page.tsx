import { getEmails, getEmailStats, getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
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

  const now = new Date();
  const nextThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [
    { emails, totalCount, totalPages },
    stats,
    actionRequiredEmails,
    imminentDeadlines,
    activeDrivesCount,
  ] = await Promise.all([
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
    // Urgent / Attention Required messages
    userId
      ? prisma.email.findMany({
          where: {
            userId,
            isTrash: false,
            isArchived: false,
            OR: [
              { priorityLevel: "URGENT" },
              { isImportant: true, isRead: false },
            ],
          },
          take: 3,
          orderBy: { receivedAt: "desc" },
          select: {
            id: true,
            subject: true,
            sender: true,
            category: true,
            priorityLevel: true,
            receivedAt: true,
          },
        })
      : Promise.resolve([]),
    // Nearest Upcoming Deadlines (within 3 days or next upcoming)
    userId
      ? prisma.deadline.findMany({
          where: {
            userId,
            status: "PENDING",
            dueDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          take: 3,
          orderBy: { dueDate: "asc" },
          select: {
            id: true,
            title: true,
            dueDate: true,
            category: true,
            isCandidate: true,
          },
        })
      : Promise.resolve([]),
    // Active Placement Drives Count
    userId
      ? prisma.placementOpportunity.count({
          where: {
            userId,
            currentStage: { in: ["DRIVE_ANNOUNCED", "REGISTRATION_OPEN", "ASSESSMENT_SCHEDULED"] },
          },
        })
      : Promise.resolve(0),
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

          {/* Actionable Student Dashboard Overview Cards (Section 11) */}
          <div className="p-6 max-w-5xl mx-auto space-y-6 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#697168] block">Total Emails</span>
                <span className="text-xl font-bold text-[#252923] mt-0.5 block">{stats.total}</span>
                <span className="text-[10px] text-[#697168]">Synchronized</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#244A3A] block">Unread</span>
                <span className="text-xl font-bold text-[#244A3A] mt-0.5 block">{stats.unread}</span>
                <span className="text-[10px] text-[#697168]">Needs Attention</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 block">Important</span>
                <span className="text-xl font-bold text-amber-900 mt-0.5 block">{stats.important}</span>
                <span className="text-[10px] text-[#697168]">Priority Mails</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 block">Deadlines</span>
                <span className="text-xl font-bold text-rose-900 mt-0.5 block">{stats.deadlines}</span>
                <span className="text-[10px] text-[#697168]">Active / Pending</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-700 block">Placement</span>
                <span className="text-xl font-bold text-blue-900 mt-0.5 block">{activeDrivesCount}</span>
                <span className="text-[10px] text-[#697168]">Active Drives</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#244A3A] block">Action Today</span>
                <span className="text-xl font-bold text-[#252923] mt-0.5 block">{actionRequiredEmails.length}</span>
                <span className="text-[10px] text-[#697168]">High Priority</span>
              </div>
            </div>

            {/* Action Required Today & Nearest Deadlines Split Widget */}
            {(actionRequiredEmails.length > 0 || imminentDeadlines.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Action Required Today */}
                <div className="bg-white rounded-xl border border-[#E1E5DC] p-4 shadow-card space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1E5DC]">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 text-xs font-bold">
                        !
                      </div>
                      <h3 className="font-bold text-xs text-[#252923]">Action Required Today</h3>
                    </div>
                    <span className="text-[11px] text-[#697168]">Immediate Attention</span>
                  </div>

                  <div className="space-y-2">
                    {actionRequiredEmails.length === 0 ? (
                      <p className="text-xs text-[#697168] py-2">No urgent actions pending today.</p>
                    ) : (
                      actionRequiredEmails.map((e) => (
                        <Link
                          key={e.id}
                          href={`/email/${e.id}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#F7F8F4] hover:bg-[#F0F2EB] border border-[#E1E5DC] text-xs transition-colors group"
                        >
                          <div className="truncate min-w-0 pr-2">
                            <span className="font-semibold text-[#252923] group-hover:text-[#244A3A] truncate block">
                              {e.subject}
                            </span>
                            <span className="text-[10px] text-[#697168] truncate block">
                              From: {e.sender}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                            {e.priorityLevel}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Nearest Confirmed Deadlines */}
                <div className="bg-white rounded-xl border border-[#E1E5DC] p-4 shadow-card space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E1E5DC]">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A] text-xs font-bold">
                        📅
                      </div>
                      <h3 className="font-bold text-xs text-[#252923]">Nearest Upcoming Deadlines</h3>
                    </div>
                    <Link href="/deadlines" className="text-[11px] text-[#244A3A] font-semibold hover:underline">
                      View All
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {imminentDeadlines.length === 0 ? (
                      <p className="text-xs text-[#697168] py-2">No deadlines approaching in the next 3 days.</p>
                    ) : (
                      imminentDeadlines.map((d) => (
                        <Link
                          key={d.id}
                          href="/deadlines"
                          className="flex items-center justify-between p-2 rounded-lg bg-[#F7F8F4] hover:bg-[#F0F2EB] border border-[#E1E5DC] text-xs transition-colors group"
                        >
                          <div className="truncate min-w-0 pr-2">
                            <span className="font-semibold text-[#252923] group-hover:text-[#244A3A] truncate block">
                              {d.title}
                            </span>
                            <span className="text-[10px] text-[#697168] block">
                              {new Date(d.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
                              d.isCandidate
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-[#E5EBE1] text-[#244A3A] border-[#D3DCD0]"
                            }`}
                          >
                            {d.isCandidate ? "Candidate" : "Confirmed"}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="p-6 max-w-5xl mx-auto space-y-4 pt-2">
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
