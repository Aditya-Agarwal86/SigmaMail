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
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="pb-2 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Intelligence Pipeline Diagnostics
                </h2>
                <p className="text-xs text-muted-foreground">
                  Diagnostic inspector for classification engines, priority algorithms, and model routing
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                Development Only
              </span>
            </div>

            <div className="bg-card rounded-xl shadow-xs border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border text-foreground font-semibold">
                      <th className="p-3">Subject / Sender</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Engine / Conf</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Classification Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {emails.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 max-w-xs truncate">
                          <div className="font-semibold text-foreground truncate">{e.subject}</div>
                          <div className="text-muted-foreground truncate text-[11px]">{e.sender}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {CATEGORY_DISPLAY_NAMES[e.category] || e.category}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div>{e.classificationEngine}</div>
                          <div className="text-[10px] text-primary">{(e.classificationConfidence * 100).toFixed(0)}%</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border">
                            {e.priorityLevel} ({e.priorityScore})
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px] max-w-sm truncate">
                          {e.classificationReason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
