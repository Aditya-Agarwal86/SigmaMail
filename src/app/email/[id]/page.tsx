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
import { ReclassifyEmailButton } from "@/components/reclassify-email-button";
import { EmailBodyRenderer } from "@/components/email-body-renderer";
import { EmailKeyInfoCard } from "@/components/email-key-info-card";
import { EmailAttachmentsList } from "@/components/email-attachments-list";
import { extractEmailAttachments } from "@/lib/email-sanitizer";
import { getAuthenticatedGmailClient } from "@/lib/gmail-client";
import { extractBodyContent } from "@/lib/gmail-sync";

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

  // On-demand HTML & inline image hydration from Gmail API if bodyHtml is missing or contains unresolved cids
  let renderedHtml = email.bodyHtml;
  if (!renderedHtml || renderedHtml.includes("cid:")) {
    try {
      const { gmail } = await getAuthenticatedGmailClient(user.id);
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: email.gmailMessageId,
        format: "full",
      });

      if (msgRes.data.payload) {
        const bodies = extractBodyContent(msgRes.data.payload, email.id);
        if (bodies.html) {
          renderedHtml = bodies.html;
          // Asynchronously persist to database so future visits are instantaneous
          prisma.email
            .update({
              where: { id: email.id },
              data: {
                bodyHtml: bodies.html.slice(0, 500000),
                bodyPlain: bodies.plain ? bodies.plain.slice(0, 10000) : email.bodyPlain,
              },
            })
            .catch((err) => console.warn(`[Email Detail] Failed to cache hydrated HTML for ${email.id}:`, err));
        }
      }
    } catch (hydrateErr) {
      // Graceful fallback to existing stored body
      console.warn(`[Email Detail] On-demand HTML hydration skipped for ${email.id}:`, hydrateErr);
    }
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
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-6 max-w-4xl mx-auto space-y-6">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-card border border-border hover:bg-muted hover:text-foreground transition-colors"
              >
                <span>Inbox Stream</span>
              </Link>
            </div>

            {/* Email Container Card */}
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              {/* Header Area */}
              <div className="p-6 border-b border-border space-y-4">
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
                      <span className="px-2 py-0.5 rounded-md font-medium text-xs bg-muted text-foreground border border-border">
                        {email.school}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground font-medium">
                    {formatDate(email.receivedAt)}
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-snug">
                  {email.subject}
                </h1>

                <div className="flex items-center justify-between gap-4 pt-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">From: </span>
                    <span className="font-medium text-foreground">{email.sender}</span>
                    {email.senderAddress && (
                      <span className="text-muted-foreground ml-1 font-mono text-[11px]">
                        &lt;{email.senderAddress}&gt;
                      </span>
                    )}
                  </div>

                  {email.isManualOverride && (
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                      Category Locked by Student
                    </span>
                  )}
                </div>

                {/* Action Toolbar: Re-Classify Button, Quick Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-border flex-wrap gap-2">
                  <ReclassifyEmailButton
                    emailId={email.id}
                    isManualOverride={email.isManualOverride}
                    currentCategoryName={meta.label}
                  />

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Confidence:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        email.confidenceTier === "HIGH"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : email.confidenceTier === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {email.confidenceTier} ({Math.round(email.classificationConfidence * 100)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Summary Banner if present */}
              {email.aiSummary && (
                <div className="p-4 bg-muted/30 border-b border-border flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground space-y-1">
                    <h4 className="font-semibold text-primary">Executive Summary</h4>
                    <p className="leading-relaxed text-muted-foreground">{email.aiSummary}</p>
                  </div>
                </div>
              )}

              {/* Key Information Summary Card */}
              <EmailKeyInfoCard
                deadlines={email.deadlines as any}
                bodyText={email.bodyPlain || email.snippet}
                receivedAt={email.receivedAt}
              />

              {/* Clean Responsive Email Body Renderer */}
              <EmailBodyRenderer
                bodyPlain={email.bodyPlain}
                bodyHtml={renderedHtml}
                snippet={email.snippet}
              />

              {/* Attachments Section */}
              <EmailAttachmentsList
                attachments={extractEmailAttachments(
                  `${email.bodyPlain || ""} ${renderedHtml || ""}`
                )}
              />
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
          </div>
        </main>
      </div>
    </div>
  );
}
