import Link from "next/link";
import { Calendar, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, CATEGORY_METADATA, PRIORITY_METADATA, cn } from "@/lib/utils";

interface EmailCardProps {
  email: {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    receivedAt: Date;
    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;
    category: string;
    classificationConfidence: number;
    priorityScore?: number;
    priorityLevel?: string;
    aiSummary?: string | null;
    deadlines?: Array<{
      id: string;
      title: string;
      dueDate: Date;
      isCandidate?: boolean;
    }>;
  };
  returnUrl?: string;
}

export function EmailCard({ email, returnUrl }: EmailCardProps) {
  const categoryMeta = CATEGORY_METADATA[email.category] || CATEGORY_METADATA.UNCATEGORIZED;
  const priorityMeta = email.priorityLevel ? PRIORITY_METADATA[email.priorityLevel] : null;

  const emailHref = returnUrl
    ? `/email/${email.id}?returnUrl=${encodeURIComponent(returnUrl)}`
    : `/email/${email.id}`;

  return (
    <Link
      href={emailHref}
      className={cn(
        "block p-4 border-b border-border transition-all hover:bg-muted/40 relative group",
        !email.isRead ? "bg-secondary/15 font-medium" : "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Unread Indicator Bar */}
        {!email.isRead && (
          <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-primary" />
        )}

        <div className="space-y-1.5 min-w-0 flex-1 pl-1">
          {/* Header row: Category & Priority & Time */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span
              className={cn(
                "px-2 py-0.5 rounded-md font-medium text-[11px] border",
                categoryMeta.bg,
                categoryMeta.color,
                categoryMeta.border
              )}
            >
              {categoryMeta.label}
            </span>

            {priorityMeta && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-[11px] border",
                  priorityMeta.bg,
                  priorityMeta.color,
                  priorityMeta.border
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)} />
                <span>{priorityMeta.label}</span>
              </span>
            )}

            {email.deadlines && email.deadlines.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                <Calendar className="h-3 w-3" />
                <span>
                  {email.deadlines.length} {email.deadlines.length === 1 ? "Deadline" : "Deadlines"}
                </span>
              </span>
            )}

            {(email as any).confidenceTier && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded text-[10px] font-medium border",
                  (email as any).confidenceTier === "HIGH"
                    ? "bg-secondary text-primary border-primary/25"
                    : (email as any).confidenceTier === "MEDIUM"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                )}
                title={`Classification confidence: ${Math.round((email.classificationConfidence || 0.8) * 100)}%`}
              >
                {(email as any).confidenceTier}
              </span>
            )}

            <span className="text-muted-foreground/40">•</span>
            <span className="text-muted-foreground text-[11px] font-normal">{formatDate(email.receivedAt)}</span>
          </div>

          {/* Subject & Sender */}
          <div>
            <h3
              className={cn(
                "text-sm tracking-tight truncate",
                email.isRead ? "text-foreground font-medium" : "text-primary font-bold"
              )}
            >
              {email.subject}
            </h3>
            <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{email.sender}</p>
          </div>

          {/* AI Summary or Snippet */}
          {email.aiSummary ? (
            <div className="flex items-start gap-1.5 text-xs text-foreground bg-muted/40 rounded-lg p-2 mt-1 border border-border">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-relaxed text-[12px]">{email.aiSummary}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed mt-0.5">{email.snippet}</p>
          )}
        </div>

        <div className="flex items-center pt-2 text-muted-foreground group-hover:text-primary transition-colors">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
