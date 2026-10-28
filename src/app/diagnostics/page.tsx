import { getEmailStats, getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { notFound } from "next/navigation";
import { Shield, Sparkles, Filter, CheckCircle2 } from "lucide-react";
import { CATEGORY_DISPLAY_NAMES } from "@/lib/classifier";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  // In production, diagnostics page is strictly disabled for security & privacy compliance
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const [emails, stats] = await Promise.all([
    prisma.email.findMany({
      where: { userId: user.id },
      orderBy: { receivedAt: "desc" },
      take: 50,
      select: {
        id: true,
        gmailMessageId: true,
        sender: true,
        senderAddress: true,
        subject: true,
        category: true,
        subCategory: true,
        school: true,
        classificationConfidence: true,
        classificationReason: true,
        classificationEngine: true,
        isManualOverride: true,
        userCategoryOverride: true,
        priorityScore: true,
        priorityLevel: true,
        receivedAt: true,
      },
    }),
    getEmailStats(user.id),
  ]);

  const isDemoUser = user.email === "fictional.student@vitapstudent.ac.in";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6 w-full">
          <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Classification Diagnostics & Observability
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Developer/diagnostic inspection of rule execution, sender normalization, and override state
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {emails.length} of {stats.total} Emails Inspected
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800/60 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Sender & Subject</th>
                    <th className="px-3 py-3">Normalized From</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Subtype / School</th>
                    <th className="px-3 py-3">Confidence</th>
                    <th className="px-4 py-3">Reason / Matched Rule</th>
                    <th className="px-3 py-3">Override?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{email.subject}</p>
                        <p className="text-[11px] text-slate-500 truncate">{email.sender}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {email.senderAddress}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {CATEGORY_DISPLAY_NAMES[email.category] || email.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {email.subCategory || email.school || "—"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {(email.classificationConfidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate" title={email.classificationReason || ""}>
                        {email.classificationReason || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {email.isManualOverride ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/60 dark:text-purple-300">
                            MANUAL
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Auto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
