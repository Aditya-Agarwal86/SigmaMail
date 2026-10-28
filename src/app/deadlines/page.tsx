import { getUpcomingDeadlines, getEmailStats, getCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { DeadlinesListClient } from "@/components/deadlines-list-client";

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

  const confirmedActiveCount = deadlines.filter((d) => d.status === "PENDING" && !d.isCandidate).length;
  const activeCandidatesCount = deadlines.filter(
    (d) => d.status === "PENDING" && d.isCandidate && new Date(d.dueDate) >= thirtyDaysAgo
  ).length;
  const historicalCandidatesCount = deadlines.filter(
    (d) => d.status === "DISMISSED" || (d.status === "PENDING" && d.isCandidate && new Date(d.dueDate) < thirtyDaysAgo)
  ).length;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8F4]">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1E5DC]">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A]">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#252923]">
                  Academic & Placement Deadlines
                </h2>
                <p className="text-xs text-[#697168]">
                  Extracted automatically from official university notifications & circulars
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {confirmedActiveCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]">
                  {confirmedActiveCount} Active
                </span>
              )}
              {activeCandidatesCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                  {activeCandidatesCount} Candidates
                </span>
              )}
              {historicalCandidatesCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-[#697168] bg-[#F0F2EB] border border-[#E1E5DC]">
                  {historicalCandidatesCount} Archived
                </span>
              )}
            </div>
          </div>

          <DeadlinesListClient deadlines={deadlines as any} />
        </main>
      </div>
    </div>
  );
}
