"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDueDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface DeadlineCandidateItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | string;
  confidenceScore: number;
  isCandidate: boolean;
  evidenceSnippet?: string | null;
  status: string;
  reminderMinutesBefore?: number | null;
}

interface DeadlineActionPanelProps {
  deadlines: DeadlineCandidateItem[];
}

export function DeadlineActionPanel({ deadlines }: DeadlineActionPanelProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (deadlines.length === 0) return null;

  const handleAction = async (
    id: string,
    action: "CONFIRM" | "DISMISS" | "COMPLETE",
    reminderMinutesBefore?: number | null
  ) => {
    setLoadingId(id);
    try {
      const body: any = { action };
      if (reminderMinutesBefore !== undefined) {
        body.reminderMinutesBefore = reminderMinutesBefore;
      }
      const res = await fetch(`/api/deadlines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update deadline:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const pendingCandidates = deadlines.filter((d) => d.status === "PENDING" && d.isCandidate);
  const confirmedDeadlines = deadlines.filter((d) => d.status === "PENDING" && !d.isCandidate);

  return (
    <div className="rounded-xl border border-[#E1E5DC] bg-white p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[#244A3A]" />
        <h3 className="font-bold text-sm text-[#252923]">
          Detected Deadlines & Dates
        </h3>
      </div>

      <div className="space-y-3">
        {deadlines.map((dl) => (
          <div
            key={dl.id}
            className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              dl.isCandidate
                ? "bg-[#F7F8F4] border-[#E1E5DC]"
                : "bg-[#E5EBE1]/40 border-[#D3DCD0]"
            }`}
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-[#252923]">{dl.title}</span>
                {dl.isCandidate ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                    Candidate Date
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]">
                    Confirmed
                  </span>
                )}
              </div>
              <p className="text-[#697168]">
                Due: <strong className="text-[#252923]">{formatDate(dl.dueDate)}</strong> ({formatDueDate(dl.dueDate)})
              </p>
              {dl.evidenceSnippet && (
                <p className="text-[#697168] italic font-mono text-[11px]">
                  &ldquo;{dl.evidenceSnippet}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dl.isCandidate && (
                <>
                  <Button
                    size="sm"
                    disabled={loadingId === dl.id}
                    onClick={() => handleAction(dl.id, "CONFIRM")}
                    className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === dl.id}
                    onClick={() => handleAction(dl.id, "DISMISS")}
                    className="gap-1.5 text-xs text-[#697168] hover:text-rose-700"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </Button>
                </>
              )}

              {!dl.isCandidate && dl.status === "PENDING" && (
                <Button
                  size="sm"
                  disabled={loadingId === dl.id}
                  onClick={() => handleAction(dl.id, "COMPLETE")}
                  className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Done</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
