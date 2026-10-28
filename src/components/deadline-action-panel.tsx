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
    <div className="mx-6 my-4 space-y-4">
      {/* 1. Unreviewed Candidate Deadlines requiring user confirmation */}
      {pendingCandidates.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 space-y-3 dark:bg-amber-950/40 dark:border-amber-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider dark:text-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>Detected Candidate Deadlines (Needs Confirmation)</span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Conservative detection • Candidates are not active reminders until confirmed
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingCandidates.map((dl) => (
              <div
                key={dl.id}
                className="p-3.5 rounded-lg bg-white border border-amber-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 dark:bg-slate-900 dark:border-amber-900/50"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {dl.title}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold dark:bg-amber-900/50 dark:text-amber-300">
                      {(dl.confidenceScore * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  {dl.evidenceSnippet && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                      &ldquo;{dl.evidenceSnippet}&rdquo;
                    </p>
                  )}

                  <div className="text-[11px] text-rose-600 font-medium pt-0.5">
                    Target Date: {formatDueDate(dl.dueDate)} ({formatDate(dl.dueDate)})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === dl.id}
                    onClick={() => handleAction(dl.id, "CONFIRM")}
                    className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm & Activate</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={loadingId === dl.id}
                    onClick={() => handleAction(dl.id, "DISMISS")}
                    className="h-8 gap-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Confirmed Deadlines */}
      {confirmedDeadlines.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2 dark:bg-emerald-950/30 dark:border-emerald-900/60">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider dark:text-emerald-300">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span>Active Confirmed Deadlines</span>
          </div>
          <div className="space-y-2">
            {confirmedDeadlines.map((dl) => (
              <div
                key={dl.id}
                className="p-3 rounded-lg bg-white border border-emerald-200 shadow-xs flex items-center justify-between gap-3 dark:bg-slate-900 dark:border-emerald-900/40"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{dl.title}</h4>
                  <p className="text-[11px] text-slate-500">{formatDate(dl.dueDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {formatDueDate(dl.dueDate)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === dl.id}
                    onClick={() => handleAction(dl.id, "COMPLETE")}
                    className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <span>Done</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
