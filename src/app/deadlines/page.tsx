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
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Academic & Placement Deadlines
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Extracted automatically from official university notifications & circulars
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {confirmedActiveCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {confirmedActiveCount} Active
                  </span>
                )}
                {activeCandidatesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {activeCandidatesCount} Candidates
                  </span>
                )}
                {historicalCandidatesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted border border-border">
                    {historicalCandidatesCount} Archived
                  </span>
                )}
              </div>
            </div>

            <DeadlinesListClient deadlines={deadlines as any} />
          </div>
        </main>
      </div>
    </div>
  );
}
