import { getEmails, getEmailStats, getCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { EmailCard } from "@/components/email-card";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportantPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [{ emails, totalCount }, stats] = await Promise.all([
    getEmails({ userId, isImportant: true }),
    getEmailStats(userId),
  ]);

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4 w-full">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Priority & Important Communications
              </h2>
              <p className="text-xs text-slate-500">
                Filtered automatically based on high priority score, official Dean/CoE senders, and active deadlines
              </p>
            </div>
          </div>

          {emails.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Star className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No priority emails</h3>
              <p className="text-xs text-slate-500 mt-1">
                Emails with upcoming deadlines or from key administrative offices will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              {emails.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
