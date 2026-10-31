import Link from "next/link";
import { Calendar, ChevronRight, Sparkles } from "lucide-react";
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
    classificationConfidence?: number;
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
  importanceReason?: string;
}

export function EmailCard({ email, returnUrl, importanceReason }: EmailCardProps) {
  const categoryMeta = CATEGORY_METADATA[email.category] || CATEGORY_METADATA.UNCATEGORIZED;
  const priorityMeta = email.priorityLevel ? PRIORITY_METADATA[email.priorityLevel] : null;

  const emailHref = returnUrl
    ? `/email/${email.id}?returnUrl=${encodeURIComponent(returnUrl)}`
    : `/email/${email.id}`;

  return (
    <Link
      href={emailHref}
      className={cn(
        "block p-4 border-b border-border transition-colors hover:bg-muted/40 relative group",
        !email.isRead ? "bg-white font-medium" : "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Subtle unread indicator dot instead of loud full border */}
        {!email.isRead && (
          <span className="h-2 w-2 rounded-full bg-[#687653] shrink-0 mt-2" title="Unread message" />
        )}

        <div className="space-y-1.5 min-w-0 flex-1">
          {/* Header row: Sender & Category & Single Priority & Date */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-semibold text-foreground text-xs truncate max-w-[200px] sm:max-w-[280px]">
                {email.sender}
              </span>

              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium border",
                  categoryMeta.bg,
                  categoryMeta.color,
                  categoryMeta.border
                )}
              >
                {categoryMeta.label}
              </span>

              {/* Single Clear Priority Badge */}
              {priorityMeta && priorityMeta.label !== "Normal" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                    priorityMeta.bg,
                    priorityMeta.color,
                    priorityMeta.border
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)} />
                  <span>{priorityMeta.label}</span>
                </span>
              )}

              {/* Deadline Badge if present */}
              {email.deadlines && email.deadlines.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {email.deadlines.length} {email.deadlines.length === 1 ? "Deadline" : "Deadlines"}
                  </span>
                </span>
              )}

              {/* Importance Reason if passed */}
              {importanceReason && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F0F0E9] text-[#252A24] border border-[#E5E5DC]">
                  {importanceReason}
                </span>
              )}
            </div>

            <span className="text-muted-foreground text-[11px] shrink-0 font-normal">
              {formatDate(email.receivedAt)}
            </span>
          </div>

          {/* Subject: bold if unread, elegant dark text */}
          <div>
            <h3
              className={cn(
                "text-sm tracking-tight truncate",
                email.isRead ? "text-[#252A24] font-normal" : "text-[#252A24] font-bold"
              )}
            >
              {email.subject}
            </h3>
          </div>

          {/* Snippet / Preview */}
          {email.aiSummary ? (
            <div className="flex items-start gap-1.5 text-xs text-[#252A24] bg-[#F0F0E9]/60 rounded-md p-1.5 mt-0.5 border border-[#E5E5DC]">
              <Sparkles className="h-3.5 w-3.5 text-[#687653] shrink-0 mt-0.5" />
              <p className="line-clamp-1 leading-relaxed text-[11px] text-[#74786F]">{email.aiSummary}</p>
            </div>
          ) : (
            <p className="text-xs text-[#74786F] line-clamp-1 leading-relaxed">{email.snippet}</p>
          )}
        </div>

        <div className="flex items-center pt-2 text-[#74786F] group-hover:text-[#687653] transition-colors">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
