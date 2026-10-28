"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  formatDueDate,
  formatDate,
  CATEGORY_METADATA,
  getKolkataDayDifference,
  getKolkataDateKey,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Bell,
  Edit2,
  Check,
  RotateCcw,
  AlertTriangle,
  Archive,
  Layers,
  History,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface DeadlineItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | string;
  category: string;
  confidenceScore: number;
  isCandidate: boolean;
  evidenceSnippet?: string | null;
  status: "PENDING" | "COMPLETED" | "DISMISSED";
  reminderMinutesBefore?: number | null;
  email: {
    id: string;
    subject: string;
    sender: string;
    receivedAt?: Date | string;
  };
}

interface DeadlinesListClientProps {
  deadlines: DeadlineItem[];
}

type TabType =
  | "upcoming"
  | "dueToday"
  | "overdue"
  | "candidates"
  | "historical"
  | "completed";

export function DeadlinesListClient({ deadlines }: DeadlinesListClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("candidates");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Quick edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminder, setEditReminder] = useState<number | null>(1440);

  // Repeated announcements grouping helper map
  const repeatedGroups = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    for (const d of deadlines) {
      const normalizedTitle = d.title.trim().toLowerCase().replace(/\s+/g, " ");
      const dateKey = getKolkataDateKey(d.dueDate);
      const groupKey = `${normalizedTitle}::${dateKey}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(d);
    }
    return map;
  }, [deadlines]);

  // Categorize deadlines into tabs
  const {
    dueTodayList,
    upcomingList,
    overdueList,
    pendingCandidatesList,
    historicalList,
    completedList,
  } = useMemo(() => {
    const today: DeadlineItem[] = [];
    const upcoming: DeadlineItem[] = [];
    const overdue: DeadlineItem[] = [];
    const pendingCandidates: DeadlineItem[] = [];
    const historical: DeadlineItem[] = [];
    const completed: DeadlineItem[] = [];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const d of deadlines) {
      if (d.status === "COMPLETED") {
        completed.push(d);
        continue;
      }

      if (d.status === "DISMISSED") {
        historical.push(d);
        continue;
      }

      if (d.isCandidate) {
        const dueDateObj = new Date(d.dueDate);
        if (dueDateObj < thirtyDaysAgo) {
          historical.push(d);
        } else {
          pendingCandidates.push(d);
        }
        continue;
      }

      const diffDays = getKolkataDayDifference(d.dueDate);
      if (diffDays < 0) {
        overdue.push(d);
      } else if (diffDays === 0) {
        today.push(d);
      } else {
        upcoming.push(d);
      }
    }

    // Sort by target due date ascending
    const sortByDateAsc = (a: DeadlineItem, b: DeadlineItem) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    // Sort historical descending
    const sortByDateDesc = (a: DeadlineItem, b: DeadlineItem) =>
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();

    today.sort(sortByDateAsc);
    upcoming.sort(sortByDateAsc);
    overdue.sort(sortByDateAsc);
    pendingCandidates.sort(sortByDateAsc);
    historical.sort(sortByDateDesc);
    completed.sort(sortByDateDesc);

    return {
      dueTodayList: today,
      upcomingList: upcoming,
      overdueList: overdue,
      pendingCandidatesList: pendingCandidates,
      historicalList: historical,
      completedList: completed,
    };
  }, [deadlines]);

  const handleAction = async (
    id: string,
    action: "CONFIRM" | "DISMISS" | "COMPLETE" | "RESTORE" | "REACTIVATE",
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

  const handleSaveEdit = async (id: string) => {
    setLoadingId(id);
    try {
      const updatePayload: any = {};
      if (editTitle.trim()) updatePayload.title = editTitle.trim();
      if (editDueDate) updatePayload.dueDate = new Date(editDueDate).toISOString();
      updatePayload.reminderMinutesBefore = editReminder;

      const res = await fetch(`/api/deadlines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to save deadline edit:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const startEdit = (dl: DeadlineItem) => {
    setEditingId(dl.id);
    setEditTitle(dl.title);
    const d = new Date(dl.dueDate);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditDueDate(localIso);
    setEditReminder(dl.reminderMinutesBefore ?? 1440);
  };

  const confirmedActiveTotal = dueTodayList.length + upcomingList.length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E1E5DC] bg-white shadow-card">
        <div>
          <h3 className="text-sm font-bold text-[#252923] flex items-center gap-2">
            <span>Student Academic Calendar & Reminders</span>
            {confirmedActiveTotal > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]">
                {confirmedActiveTotal} Active
              </span>
            )}
          </h3>
          <p className="text-xs text-[#697168] mt-0.5">
            Synchronize student-confirmed deadlines with Google Calendar, Apple Calendar, or Outlook (Asia/Kolkata).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/calendar/export.ics"
            download
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#244A3A] hover:bg-[#1B382C] text-white shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export iCal (.ics)</span>
          </a>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1.5 border-b border-[#E1E5DC] text-xs font-medium pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "candidates"
              ? "bg-[#244A3A] text-white font-semibold shadow-xs"
              : "text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB]"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
          <span>Pending Candidates ({pendingCandidatesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("dueToday")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "dueToday"
              ? "bg-[#244A3A] text-white font-semibold shadow-xs"
              : "text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB]"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Due Today ({dueTodayList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "upcoming"
              ? "bg-[#244A3A] text-white font-semibold shadow-xs"
              : "text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB]"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Upcoming Confirmed ({upcomingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("overdue")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "overdue"
              ? "bg-[#244A3A] text-white font-semibold shadow-xs"
              : "text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB]"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          <span>Overdue ({overdueList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("historical")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "historical"
              ? "bg-[#244A3A] text-white font-semibold shadow-xs"
              : "text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB]"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Historical Archive ({historicalList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "completed"
              ? "bg-[#244A3A] text-white font-semibold shadow-xs"
              : "text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB]"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Completed ({completedList.length})</span>
        </button>
      </div>

      {/* Tab: Pending Candidates */}
      {activeTab === "candidates" && (
        <div className="space-y-3">
          {pendingCandidatesList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <CheckCircle2 className="h-9 w-9 text-[#244A3A] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252923]">
                All Current Candidates Reviewed
              </h4>
              <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                No pending active candidates. Older past items (&gt;30 days) are safely organized under Historical Archive.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingCandidatesList.map((dl) => {
                const meta = CATEGORY_METADATA[dl.category] || CATEGORY_METADATA.UNCATEGORIZED;
                const normalizedTitle = dl.title.trim().toLowerCase().replace(/\s+/g, " ");
                const dateKey = getKolkataDateKey(dl.dueDate);
                const related = repeatedGroups.get(`${normalizedTitle}::${dateKey}`) || [];
                const otherSources = related.filter((r) => r.id !== dl.id);

                return (
                  <div
                    key={dl.id}
                    className="p-4 rounded-xl border border-[#E1E5DC] bg-white shadow-card flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                          {formatDueDate(dl.dueDate)}
                        </span>
                        <span className="text-[10px] text-[#244A3A] bg-[#E5EBE1] border border-[#D3DCD0] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>Candidate Suggestion ({(dl.confidenceScore * 100).toFixed(0)}%)</span>
                        </span>
                        {otherSources.length > 0 && (
                          <span className="text-[10px] text-[#697168] bg-[#F0F2EB] border border-[#E1E5DC] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            <span>{otherSources.length + 1} Announcements</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-[#252923]">
                        {dl.title}
                      </h4>

                      {dl.evidenceSnippet && (
                        <p className="text-xs text-[#697168] font-mono bg-[#F7F8F4] p-2 rounded-lg border border-[#E1E5DC]">
                          &ldquo;{dl.evidenceSnippet}&rdquo;
                        </p>
                      )}

                      <div className="text-[11px] text-[#697168] flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="font-medium text-[#252923]">
                          Target (IST): {formatDate(dl.dueDate)}
                        </span>
                        <span>•</span>
                        <Link
                          href={`/email/${dl.email.id}`}
                          className="hover:text-[#244A3A] hover:underline truncate max-w-md flex items-center gap-1"
                        >
                          <span>Circular: {dl.email.subject}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      </div>

                      {/* Repeated Announcement Source Links */}
                      {otherSources.length > 0 && (
                        <div className="text-[11px] text-[#697168] pt-1.5 border-t border-[#E1E5DC]">
                          <span className="font-medium text-[#252923]">
                            Also announced in {otherSources.length} other email(s):
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {otherSources.slice(0, 3).map((os) => (
                              <Link
                                key={os.id}
                                href={`/email/${os.email.id}`}
                                className="px-2 py-0.5 rounded bg-[#F7F8F4] border border-[#E1E5DC] text-[10px] text-[#697168] hover:text-[#244A3A] truncate max-w-xs"
                              >
                                {os.email.subject}
                              </Link>
                            ))}
                            {otherSources.length > 3 && (
                              <span className="text-[10px] text-[#697168] self-center">
                                +{otherSources.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={loadingId === dl.id}
                        onClick={() => handleAction(dl.id, "CONFIRM")}
                        className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirm Deadline</span>
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Due Today */}
      {activeTab === "dueToday" && (
        <div className="space-y-3">
          {dueTodayList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <Clock className="h-9 w-9 text-[#697168] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252923]">No Deadlines Due Today</h4>
              <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                You have no confirmed tasks or submissions due today in Asia/Kolkata timezone.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {dueTodayList.map((dl) => {
                const meta = CATEGORY_METADATA[dl.category] || CATEGORY_METADATA.UNCATEGORIZED;
                return (
                  <div
                    key={dl.id}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          Due Today
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#252923]">
                        {dl.title}
                      </h4>
                      <p className="text-xs text-[#697168]">
                        Target Time: {formatDate(dl.dueDate)} • Circular: {dl.email.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={loadingId === dl.id}
                        onClick={() => handleAction(dl.id, "COMPLETE")}
                        className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark Complete</span>
                      </Button>
                      <Link
                        href={`/email/${dl.email.id}`}
                        className="p-2 text-[#697168] hover:text-[#244A3A]"
                        title="View source email"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Upcoming Confirmed */}
      {activeTab === "upcoming" && (
        <div className="space-y-3">
          {upcomingList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <Calendar className="h-9 w-9 text-[#697168] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252923]">
                No Upcoming Confirmed Deadlines
              </h4>
              <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                Review and confirm pending candidates from the &quot;Pending Candidates&quot; tab to activate reminders and include them in your export.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {upcomingList.map((dl) => {
                const meta = CATEGORY_METADATA[dl.category] || CATEGORY_METADATA.UNCATEGORIZED;
                const isEditing = editingId === dl.id;

                return (
                  <div
                    key={dl.id}
                    className="p-4 rounded-xl border border-[#E1E5DC] bg-white shadow-card space-y-3"
                  >
                    {isEditing ? (
                      <div className="space-y-3 bg-[#F7F8F4] p-3.5 rounded-lg border border-[#E1E5DC]">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#252923]">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[#E1E5DC] bg-white text-[#252923] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#252923]">
                              Target Date & Time (Local)
                            </label>
                            <input
                              type="datetime-local"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[#E1E5DC] bg-white text-[#252923] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#252923]">
                              Reminder Timing
                            </label>
                            <select
                              value={editReminder ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setEditReminder(val === 0 ? null : val);
                              }}
                              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[#E1E5DC] bg-white text-[#252923] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
                            >
                              <option value="1440">24 hours before (Default)</option>
                              <option value="2880">2 days before</option>
                              <option value="120">2 hours before</option>
                              <option value="60">1 hour before</option>
                              <option value="0">No reminder</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={loadingId === dl.id}
                            onClick={() => handleSaveEdit(dl.id)}
                            className="h-7 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white gap-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                            >
                              {meta.label}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium border border-[#E1E5DC] bg-[#F7F8F4] text-[#252923]">
                              {formatDueDate(dl.dueDate)}
                            </span>
                            <span className="text-[10px] text-[#244A3A] bg-[#E5EBE1] border border-[#D3DCD0] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Confirmed Active</span>
                            </span>
                            {dl.reminderMinutesBefore && dl.reminderMinutesBefore > 0 && (
                              <span className="text-[10px] text-[#697168] bg-[#F0F2EB] px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Bell className="h-3 w-3" />
                                <span>
                                  {dl.reminderMinutesBefore >= 1440
                                    ? `${Math.round(dl.reminderMinutesBefore / 1440)}d reminder`
                                    : `${Math.round(dl.reminderMinutesBefore / 60)}h reminder`}
                                </span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-[#252923]">
                            {dl.title}
                          </h4>

                          {dl.description && (
                            <p className="text-xs text-[#697168]">
                              {dl.description}
                            </p>
                          )}

                          <div className="text-[11px] text-[#697168] flex items-center gap-1.5 pt-0.5">
                            <span>Target: {formatDate(dl.dueDate)}</span>
                            <span>•</span>
                            <span className="truncate">Source: {dl.email.subject}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(dl)}
                            className="h-8 gap-1.5 text-xs text-[#697168] hover:text-[#252923]"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === dl.id}
                            onClick={() => handleAction(dl.id, "COMPLETE")}
                            className="h-8 gap-1.5 text-xs text-[#244A3A] border-[#D3DCD0] hover:bg-[#E5EBE1]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Complete</span>
                          </Button>

                          <Link
                            href={`/email/${dl.email.id}`}
                            className="p-1.5 text-[#697168] hover:text-[#244A3A]"
                            title="View source email"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Overdue */}
      {activeTab === "overdue" && (
        <div className="space-y-3">
          {overdueList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <CheckCircle2 className="h-9 w-9 text-[#244A3A] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252923]">No Overdue Deadlines</h4>
              <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                Great job! All your confirmed deadlines are currently up to date.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {overdueList.map((dl) => {
                const meta = CATEGORY_METADATA[dl.category] || CATEGORY_METADATA.UNCATEGORIZED;
                return (
                  <div
                    key={dl.id}
                    className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                          {formatDueDate(dl.dueDate)}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-[#252923] truncate">
                        {dl.title}
                      </h4>

                      <div className="text-[11px] text-[#697168] flex items-center gap-1.5 pt-0.5">
                        <span>Original Target: {formatDate(dl.dueDate)}</span>
                        <span>•</span>
                        <span className="truncate">From: {dl.email.subject}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={loadingId === dl.id}
                        onClick={() => handleAction(dl.id, "COMPLETE")}
                        className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark Complete</span>
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

                      <Link
                        href={`/email/${dl.email.id}`}
                        className="p-2 text-[#697168] hover:text-[#244A3A]"
                        title="View source email"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Historical Archive */}
      {activeTab === "historical" && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-lg border border-[#E1E5DC] bg-white text-xs text-[#697168] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-[#244A3A] shrink-0" />
              <span>
                <strong className="text-[#252923]">Historical Archive:</strong> Candidate dates &gt;30 days in the past or dismissed records preserved for audit and reference. Excluded from reminders and active exports.
              </span>
            </div>
          </div>

          {historicalList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <History className="h-9 w-9 text-[#697168] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252923]">No Historical Deadlines</h4>
              <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                No past candidate dates or dismissed records.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {historicalList.slice(0, 100).map((dl) => {
                const meta = CATEGORY_METADATA[dl.category] || CATEGORY_METADATA.UNCATEGORIZED;
                return (
                  <div
                    key={dl.id}
                    className="p-4 rounded-xl border border-[#E1E5DC] bg-white shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-90"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium text-[#697168] border border-[#E1E5DC] bg-[#F7F8F4]">
                          {formatDueDate(dl.dueDate)}
                        </span>
                        <span className="text-[10px] text-[#697168] bg-[#F0F2EB] px-1.5 py-0.5 rounded font-medium">
                          Historical Reference ({formatDate(dl.dueDate)})
                        </span>
                      </div>

                      <h4 className="text-sm font-medium text-[#252923] truncate">
                        {dl.title}
                      </h4>

                      {dl.evidenceSnippet && (
                        <p className="text-xs text-[#697168] font-mono line-clamp-1">
                          &ldquo;{dl.evidenceSnippet}&rdquo;
                        </p>
                      )}

                      <div className="text-[11px] text-[#697168] flex items-center gap-1.5 pt-0.5">
                        <span className="truncate">From: {dl.email.subject}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={loadingId === dl.id}
                        onClick={() => handleAction(dl.id, "RESTORE")}
                        className="gap-1.5 text-xs text-[#697168] hover:text-[#252923]"
                        title="Restore to active candidates"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Restore</span>
                      </Button>

                      <Link
                        href={`/email/${dl.email.id}`}
                        className="p-2 text-[#697168] hover:text-[#244A3A]"
                        title="View source email"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
              {historicalList.length > 100 && (
                <div className="p-3 text-center text-xs text-[#697168] border border-[#E1E5DC] rounded-lg bg-white">
                  Showing top 100 of {historicalList.length} historical reference items. All items are permanently accessible via their source emails.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Completed */}
      {activeTab === "completed" && (
        <div className="space-y-3">
          {completedList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
              <CheckCircle2 className="h-9 w-9 text-[#697168] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#252923]">No Completed Deadlines</h4>
              <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
                Completed deadlines will appear here for your academic tracking and records.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {completedList.map((dl) => {
                const meta = CATEGORY_METADATA[dl.category] || CATEGORY_METADATA.UNCATEGORIZED;
                return (
                  <div
                    key={dl.id}
                    className="p-4 rounded-xl border border-[#E1E5DC] bg-white shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-80"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium text-[#244A3A] bg-[#E5EBE1] border border-[#D3DCD0]">
                          Completed
                        </span>
                      </div>

                      <h4 className="text-sm font-medium text-[#697168] line-through truncate">
                        {dl.title}
                      </h4>

                      <div className="text-[11px] text-[#697168] flex items-center gap-1.5 pt-0.5">
                        <span>Original Target: {formatDate(dl.dueDate)}</span>
                        <span>•</span>
                        <span className="truncate">From: {dl.email.subject}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={loadingId === dl.id}
                        onClick={() => handleAction(dl.id, "REACTIVATE")}
                        className="gap-1.5 text-xs text-[#697168] hover:text-[#252923]"
                        title="Reopen deadline"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reopen</span>
                      </Button>

                      <Link
                        href={`/email/${dl.email.id}`}
                        className="p-2 text-[#697168] hover:text-[#244A3A]"
                        title="View source email"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
