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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4 w-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-500" />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Academic & Placement Deadlines
                </h2>
                <p className="text-xs text-slate-500">
                  Extracted automatically from official university notifications & circulars
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {confirmedActiveCount > 0 && (
                <Badge variant="destructive">{confirmedActiveCount} Active</Badge>
              )}
              {activeCandidatesCount > 0 && (
                <Badge variant="warning">{activeCandidatesCount} Candidates</Badge>
              )}
              {historicalCandidatesCount > 0 && (
                <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-800">
                  {historicalCandidatesCount} Archived
                </Badge>
              )}
            </div>
          </div>

          <DeadlinesListClient deadlines={deadlines as any} />
        </main>
      </div>
    </div>
  );
}
