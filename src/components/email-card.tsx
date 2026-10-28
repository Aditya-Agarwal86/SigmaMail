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
        "block p-4 border-b border-[#E1E5DC] transition-colors hover:bg-[#F7F8F4] bg-white",
        !email.isRead && "bg-[#F9FAF7]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-rose-50 text-rose-800 border border-rose-200">
                <Calendar className="h-3 w-3" />
                <span>
                  {email.deadlines.length} {email.deadlines.length === 1 ? "Deadline" : "Deadlines"}
                </span>
              </span>
            )}

            <span className="text-[#E1E5DC]">•</span>
            <span className="text-[#697168] text-[11px] font-normal">{formatDate(email.receivedAt)}</span>
          </div>

          {/* Subject & Sender */}
          <div>
            <h3
              className={cn(
                "text-sm tracking-tight truncate",
                email.isRead ? "text-[#252923] font-medium" : "text-[#244A3A] font-semibold"
              )}
            >
              {email.subject}
            </h3>
            <p className="text-xs text-[#697168] font-normal truncate mt-0.5">{email.sender}</p>
          </div>

          {/* AI Summary or Snippet */}
          {email.aiSummary ? (
            <div className="flex items-start gap-1.5 text-xs text-[#252923] bg-[#F7F8F4] rounded-md p-2 mt-1 border border-[#E1E5DC]">
              <Sparkles className="h-3.5 w-3.5 text-[#244A3A] shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-relaxed text-[12px]">{email.aiSummary}</p>
            </div>
          ) : (
            <p className="text-xs text-[#697168] line-clamp-1 leading-relaxed mt-0.5">{email.snippet}</p>
          )}
        </div>

        <div className="flex items-center pt-2 text-[#697168]">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
