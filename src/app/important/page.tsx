import { getEmails, getEmailStats, getCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { EmailCard } from "@/components/email-card";
import { Star, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { PriorityLevel } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ImportantPageProps {
  searchParams: {
    filter?: "all" | "unread" | "urgent" | "high" | "normal";
    page?: string;
  };
}

export default async function ImportantPage({ searchParams }: ImportantPageProps) {
  const user = await getCurrentUser();
  const userId = user?.id;

  const currentFilter = searchParams.filter || "all";
  const page = parseInt(searchParams.page || "1", 10) || 1;

  let priorityLevel: PriorityLevel | undefined;
  let isRead: boolean | undefined;

  if (currentFilter === "unread") {
    isRead = false;
  } else if (currentFilter === "urgent") {
    priorityLevel = PriorityLevel.URGENT;
  } else if (currentFilter === "high") {
    priorityLevel = PriorityLevel.HIGH;
  } else if (currentFilter === "normal") {
    priorityLevel = PriorityLevel.NORMAL;
  }

  const [{ emails, totalCount, totalPages }, stats] = await Promise.all([
    getEmails({
      userId,
      isImportant: true,
      isRead,
      priorityLevel,
      page,
      pageSize: 25,
    }),
    getEmailStats(userId),
  ]);

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";

  // Derive concise reason for importance based on category, sender, and factors
  const getImportanceReason = (email: any): string => {
    if (email.category === "EXAMINATIONS") return "Examination Update";
    if (email.category === "CDC_AND_PLACEMENT") return "Placement Opportunity";
    if (email.category === "DEAN_ACADEMICS" || email.category === "REGISTRAR") return "Official University Communication";
    if (email.category === "ACADEMICS" || email.category === "ASST_DEAN_ACADEMICS") return "Important Academic Notification";
    if (email.deadlines && email.deadlines.length > 0) return "Upcoming Confirmed Deadline";
    if (email.senderAddress && (email.senderAddress.includes("finance") || email.senderAddress.includes("fee"))) {
      return "Fee or Administrative Action";
    }
    return "Official University Communication";
  };

  const FILTER_TABS = [
    { label: "All Important", value: "all" },
    { label: "Unread", value: "unread" },
    { label: "Urgent", value: "urgent" },
    { label: "High", value: "high" },
    { label: "Normal", value: "normal" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            {/* Header: Exact requested heading & subtitle */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5DC]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-[#687653] fill-[#687653]" />
                  <h1 className="text-xl font-bold tracking-tight text-[#252A24]">
                    Important Communications
                  </h1>
                </div>
                <p className="text-xs text-[#74786F]">
                  University announcements, critical updates, and communications requiring attention.
                </p>
              </div>

              <span className="text-xs font-semibold text-[#74786F] bg-[#F0F0E9] px-2.5 py-1 rounded-md border border-[#E5E5DC]">
                {totalCount} Messages
              </span>
            </div>

            {/* Filter Toolbar: All Important, Unread, Urgent, High, Normal */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F0F0E9] border border-[#E5E5DC] shadow-xs overflow-x-auto no-scrollbar w-fit">
              {FILTER_TABS.map((tab) => {
                const active = currentFilter === tab.value;
                const href = tab.value === "all" ? "/important" : `/important?filter=${tab.value}`;
                return (
                  <Link
                    key={tab.value}
                    href={href}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                      active
                        ? "bg-white text-[#252A24] font-semibold shadow-xs"
                        : "text-[#74786F] hover:text-[#252A24]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* Email List or Clean Empty State */}
            {emails.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-[#E5E5DC] bg-white">
                <Star className="h-10 w-10 text-[#74786F]/40 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-[#252A24]">No important communications matching this filter</h3>
                <p className="text-xs text-[#74786F] mt-1 max-w-sm mx-auto">
                  Communications from academic deans, exam controllers, placement drives, or emails you marked as important will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-xs border border-[#E5E5DC] overflow-hidden divide-y divide-[#E5E5DC]">
                  {emails.map((email) => (
                    <EmailCard
                      key={email.id}
                      email={email}
                      returnUrl="/important"
                      importanceReason={getImportanceReason(email)}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 pb-6 text-xs text-[#74786F]">
                    <span>
                      Page {page} of {totalPages} ({totalCount} total messages)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {page > 1 && (
                        <Link
                          href={`/important?page=${page - 1}${currentFilter !== "all" ? `&filter=${currentFilter}` : ""}`}
                          className="px-3 py-1.5 rounded-lg border border-[#E5E5DC] bg-white text-[#252A24] hover:bg-[#F0F0E9] flex items-center gap-1 font-medium transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          href={`/important?page=${page + 1}${currentFilter !== "all" ? `&filter=${currentFilter}` : ""}`}
                          className="px-3 py-1.5 rounded-lg border border-[#E5E5DC] bg-white text-[#252A24] hover:bg-[#F0F0E9] flex items-center gap-1 font-medium transition-colors"
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
