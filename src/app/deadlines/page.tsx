import { getUpcomingDeadlines, getEmailStats, getCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Calendar } from "lucide-react";
import { DeadlinesListClient } from "@/components/deadlines-list-client";
import { getKolkataDayDifference } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [deadlines, stats] = await Promise.all([
    getUpcomingDeadlines(userId, { status: "ALL" }),
    getEmailStats(userId),
  ]);

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Exact 6 category counts
  let pendingCandidatesCount = 0;
  let dueTodayCount = 0;
  let upcomingConfirmedCount = 0;
  let overdueCount = 0;
  let historicalArchiveCount = 0;
  let completedCount = 0;

  for (const d of deadlines) {
    if (d.status === "COMPLETED") {
      completedCount++;
      continue;
    }

    if (d.status === "DISMISSED") {
      historicalArchiveCount++;
      continue;
    }

    if (d.isCandidate) {
      const dueDateObj = new Date(d.dueDate);
      if (dueDateObj < thirtyDaysAgo) {
        historicalArchiveCount++;
      } else {
        pendingCandidatesCount++;
      }
      continue;
    }

    // Confirmed deadlines
    const diffDays = getKolkataDayDifference(d.dueDate);
    if (diffDays < 0) {
      overdueCount++;
    } else if (diffDays === 0) {
      dueTodayCount++;
    } else {
      upcomingConfirmedCount++;
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5DC]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#687653]/10 border border-[#687653]/20 flex items-center justify-center text-[#687653]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#252A24]">
                    Academic & Placement Deadlines
                  </h1>
                  <p className="text-xs text-[#74786F]">
                    Extracted automatically from official university notifications & circulars
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold text-[#74786F] bg-[#F0F0E9] px-2.5 py-1 rounded-md border border-[#E5E5DC]">
                {deadlines.length} Total Deadlines
              </span>
            </div>

            {/* Overview Summary Cards: 6 Exact Categories */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-[#E5E5DC] shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 block">
                  Pending Candidates
                </span>
                <span className="text-xl font-bold text-[#252A24] mt-0.5 block">{pendingCandidatesCount}</span>
                <span className="text-[10px] text-[#74786F]">Needs Review</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E5DC] shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 block">
                  Due Today
                </span>
                <span className="text-xl font-bold text-[#252A24] mt-0.5 block">{dueTodayCount}</span>
                <span className="text-[10px] text-[#74786F]">Urgent Action</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E5DC] shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#687653] block">
                  Upcoming Confirmed
                </span>
                <span className="text-xl font-bold text-[#252A24] mt-0.5 block">{upcomingConfirmedCount}</span>
                <span className="text-[10px] text-[#74786F]">Student Confirmed</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E5DC] shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 block">
                  Overdue
                </span>
                <span className="text-xl font-bold text-[#252A24] mt-0.5 block">{overdueCount}</span>
                <span className="text-[10px] text-[#74786F]">Past Due Date</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E5DC] shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#74786F] block">
                  Historical Archive
                </span>
                <span className="text-xl font-bold text-[#252A24] mt-0.5 block">{historicalArchiveCount}</span>
                <span className="text-[10px] text-[#74786F]">&gt; 30 Days Ago</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E5DC] shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 block">
                  Completed
                </span>
                <span className="text-xl font-bold text-[#252A24] mt-0.5 block">{completedCount}</span>
                <span className="text-[10px] text-[#74786F]">Resolved</span>
              </div>
            </div>

            <DeadlinesListClient deadlines={deadlines as any} />
          </div>
        </main>
      </div>
    </div>
  );
}
