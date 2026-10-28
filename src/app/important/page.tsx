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
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8F4]">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4 w-full">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E1E5DC]">
            <div className="h-8 w-8 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A]">
              <Star className="h-4 w-4 fill-[#244A3A]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#252923]">
                Priority & Important Communications
              </h2>
              <p className="text-xs text-[#697168]">
                Filtered automatically based on official administrative senders, critical updates, and pending deadlines
              </p>
            </div>
          </div>

          {emails.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <Star className="h-10 w-10 text-[#697168] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#252923]">No priority emails</h3>
              <p className="text-xs text-[#697168] mt-1">
                Emails with upcoming deadlines or from key administrative offices will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card border border-[#E1E5DC] overflow-hidden">
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
