import Link from "next/link";
import { Star, Calendar, ChevronRight, Sparkles, AlertCircle } from "lucide-react";
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
        "block p-4 border-b border-slate-200 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40",
        !email.isRead && "bg-blue-50/20 dark:bg-blue-950/10"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          {/* Header row: Category & Priority & Time */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold text-[11px] border",
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
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] border",
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
              <Badge variant="destructive" className="gap-1 text-[11px]">
                <Calendar className="h-3 w-3" />
                <span>
                  {email.deadlines.length} {email.deadlines.length === 1 ? "Deadline" : "Deadlines"}
                </span>
              </Badge>
            )}

            <span className="text-slate-400">•</span>
            <span className="text-slate-500 text-[11px]">{formatDate(email.receivedAt)}</span>
          </div>

          {/* Subject & Sender */}
          <div>
            <h3
              className={cn(
                "text-sm font-semibold truncate",
                email.isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 font-bold dark:text-white"
              )}
            >
              {email.subject}
            </h3>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{email.sender}</p>
          </div>

          {/* AI Summary or Snippet */}
          {email.aiSummary ? (
            <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-100/80 rounded-md p-2 mt-1 border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-relaxed text-[12px]">{email.aiSummary}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed mt-1">{email.snippet}</p>
          )}
        </div>

        <div className="flex items-center pt-2 text-slate-400">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
