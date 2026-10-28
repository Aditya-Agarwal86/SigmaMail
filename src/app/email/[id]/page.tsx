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
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8F4]">
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
                <span>Back to {meta.label}</span>
              </Link>
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#697168] bg-white border border-[#E1E5DC] hover:bg-[#F7F8F4] hover:text-[#252923] transition-colors"
            >
              <span>Inbox Stream</span>
            </Link>
          </div>

          {/* Email Container Card */}
          <div className="bg-white rounded-2xl border border-[#E1E5DC] shadow-card overflow-hidden">
            {/* Header Area */}
            <div className="p-6 border-b border-[#E1E5DC] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md font-medium text-xs border",
                      meta.bg,
                      meta.color,
                      meta.border
                    )}
                  >
                    {meta.label}
                  </span>

                  {priorityMeta && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-medium text-xs border",
                        priorityMeta.bg,
                        priorityMeta.color,
                        priorityMeta.border
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", priorityMeta.dot)} />
                      <span>{priorityMeta.label}</span>
                    </span>
                  )}

                  {email.school && (
                    <span className="px-2 py-0.5 rounded-md font-medium text-xs bg-[#F0F2EB] text-[#252923] border border-[#E1E5DC]">
                      {email.school}
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#697168] font-medium">
                  {formatDate(email.receivedAt)}
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-[#252923] tracking-tight leading-snug">
                {email.subject}
              </h1>

              <div className="flex items-center justify-between gap-4 pt-1 text-xs text-[#697168]">
                <div>
                  <span className="font-semibold text-[#252923]">From: </span>
                  <span className="font-medium text-[#252923]">{email.sender}</span>
                  {email.senderAddress && (
                    <span className="text-[#697168] ml-1 font-mono text-[11px]">
                      &lt;{email.senderAddress}&gt;
                    </span>
                  )}
                </div>

                {email.isManualOverride && (
                  <span className="px-2 py-0.5 rounded-md bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] text-[11px] font-medium">
                    Category Locked by Student
                  </span>
                )}
              </div>
            </div>

            {/* AI Summary Banner if present */}
            {email.aiSummary && (
              <div className="p-4 bg-[#F7F8F4] border-b border-[#E1E5DC] flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-[#244A3A] shrink-0 mt-0.5" />
                <div className="text-xs text-[#252923] space-y-1">
                  <h4 className="font-semibold text-[#244A3A]">Executive Summary</h4>
                  <p className="leading-relaxed">{email.aiSummary}</p>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-6 text-sm text-[#252923] leading-relaxed whitespace-pre-wrap font-sans">
              {email.bodyPlain || email.snippet}
            </div>
          </div>

          {/* Actionable Deadlines Extracted from this Email */}
          {email.deadlines && email.deadlines.length > 0 && (
            <DeadlineActionPanel deadlines={email.deadlines as any} />
          )}

          {/* Manual Category Override Component */}
          <ManualCategoryOverride
            emailId={email.id}
            currentCategory={email.category}
            isManualOverride={email.isManualOverride}
          />
        </main>
      </div>
    </div>
  );
}
