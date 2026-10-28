import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getEmailStats, getCurrentUser } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDueDate, CATEGORY_METADATA, PRIORITY_METADATA, cn } from "@/lib/utils";
import { ArrowLeft, Sparkles, Calendar, Star, ShieldCheck, Info } from "lucide-react";
import { DeadlineActionPanel } from "@/components/deadline-action-panel";
import { ManualCategoryOverride } from "@/components/manual-override";

export const dynamic = "force-dynamic";

interface EmailViewProps {
  params: {
    id: string;
  };
  searchParams?: {
    returnUrl?: string;
  };
}

export default async function EmailDetailPage({ params, searchParams }: EmailViewProps) {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const [email, stats] = await Promise.all([
    prisma.email.findFirst({
      where: {
        id: params.id,
        userId: user.id, // STRICT USER OWNERSHIP ENFORCEMENT
      },
      include: {
        deadlines: true,
        labels: true,
      },
    }),
    getEmailStats(user.id),
  ]);

  if (!email) {
    notFound();
  }

  const isDemoUser = user.email === "fictional.student@vitapstudent.ac.in";
  const meta = CATEGORY_METADATA[email.category] || CATEGORY_METADATA.UNCATEGORIZED;
  const priorityMeta = PRIORITY_METADATA[email.priorityLevel] || PRIORITY_METADATA.NORMAL;
  const priorityFactors = Array.isArray(email.priorityFactors) ? (email.priorityFactors as any[]) : [];

  // Determine back-to-category link. Use returnUrl if provided and safe, or construct fallback from email.category
  const returnUrl = searchParams?.returnUrl;
  const isSafeRelativeUrl = returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//");
  const categoryFallbackUrl = email.category ? `/categories/${email.category}` : null;
  const backToCategoryHref = isSafeRelativeUrl ? returnUrl : categoryFallbackUrl;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 w-full">
          {/* Back Navigation Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {backToCategoryHref && (
              <Link
                href={backToCategoryHref}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border shadow-xs",
                  meta.bg,
                  meta.color,
                  meta.border,
                  "hover:opacity-90"
                )}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to {meta.label} Mails</span>
              </Link>
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Inbox</span>
            </Link>
          </div>

          {/* Email Container */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            {/* Header info */}
            <div className="p-6 border-b border-slate-200 space-y-4 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}
                >
                  {meta.label}
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border",
                    priorityMeta.bg,
                    priorityMeta.color,
                    priorityMeta.border
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", priorityMeta.dot)} />
                  <span>{priorityMeta.label} Priority (Score: {email.priorityScore}/100)</span>
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Rule Confidence: {(email.classificationConfidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Manual Category Override Component */}
              <div className="pt-1">
                <ManualCategoryOverride
                  emailId={email.id}
                  currentCategory={email.category}
                  isManualOverride={email.isManualOverride}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight dark:text-white">
                  {email.subject}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1 mt-2">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">From: </span>
                    <span>{email.sender}</span>
                  </div>
                  <span>{formatDate(email.receivedAt)}</span>
                </div>
              </div>

              {/* Priority Contributing Factors Card */}
              {priorityFactors.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Info className="h-3.5 w-3.5 text-blue-500" />
                    <span>Explainable Priority Factors</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    {priorityFactors.map((f: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="truncate">{f.reason}</span>
                        <span className={cn("font-bold ml-2 shrink-0", f.points >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {f.points >= 0 ? `+${f.points}` : f.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary Highlight Box */}
            {email.aiSummary && (
              <div className="m-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 dark:bg-blue-950/40 dark:border-blue-900">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider dark:text-blue-300">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>AI Executive Summary</span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed dark:text-slate-200">
                  {email.aiSummary}
                </p>
              </div>
            )}

            {/* Interactive Deadline Action Panel */}
            <DeadlineActionPanel deadlines={email.deadlines} />

            {/* Email Body */}
            <div className="p-6 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line border-t border-slate-100 dark:border-slate-800 dark:text-slate-200">
              {email.bodyPlain || email.snippet}
            </div>

            {/* Classification Reasoning Footer */}
            {email.classificationReason && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
                <span>
                  <strong>Classification Logic:</strong> {email.classificationReason}
                </span>
                <span className="text-[11px] text-slate-400">ID: {email.gmailMessageId}</span>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
