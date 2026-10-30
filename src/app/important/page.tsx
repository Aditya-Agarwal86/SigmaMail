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
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Star className="h-4 w-4 fill-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Priority & Important Communications
                </h2>
                <p className="text-xs text-muted-foreground">
                  Filtered automatically based on official administrative senders, critical updates, and pending deadlines
                </p>
              </div>
            </div>

            {emails.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card">
                <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No priority emails</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Emails with upcoming deadlines or from key administrative offices will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-xs border border-border overflow-hidden divide-y divide-border">
                {emails.map((email) => (
                  <EmailCard key={email.id} email={email} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
