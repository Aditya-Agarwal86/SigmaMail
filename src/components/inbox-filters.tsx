"use client";

import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Filter, Calendar, Sparkles, UserPlus, Layers, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { FacultyDirectoryModal } from "@/components/faculty-modal";

const SCHOOLS = ["SCOPE", "SENSE", "SMEC", "SAS", "VISH", "VSL", "VSB", "SBST"];

const CDC_SUBTYPES = [
  { label: "All Placement", value: "" },
  { label: "Placement Drives", value: "PLACEMENT_DRIVE" },
  { label: "Drive Updates", value: "PLACEMENT_UPDATE" },
  { label: "Congratulations & Results", value: "PLACEMENT_CONGRATULATIONS" },
  { label: "Other CDC", value: "PLACEMENT_GENERAL" },
];

const PRIORITY_TABS = [
  { label: "All Priorities", value: "" },
  { label: "Urgent", value: "URGENT" },
  { label: "High", value: "HIGH" },
  { label: "Normal", value: "NORMAL" },
  { label: "Low", value: "LOW" },
];

export function InboxFilters({ currentCategory }: { currentCategory?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = currentCategory || searchParams.get("category") || "";
  const currentSubCategory = searchParams.get("subCategory") || "";
  const currentSchool = searchParams.get("school") || "";
  const currentPriority = searchParams.get("priority") || "";
  const hasDeadlines = searchParams.get("deadlines") === "true";

  const [reprocessing, setReprocessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);

  const createFilterUrl = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    }
    // Always reset page to 1 on filter changes
    nextParams.delete("page");
    const query = nextParams.toString();
    const base = pathname || "/";
    return query ? `${base}?${query}` : base;
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/emails/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAll: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Re-classified ${data.processed} emails with Phase 6 rules.`);
        router.refresh();
      } else {
        setFeedback(data.error || "Failed to reprocess emails.");
      }
    } catch {
      setFeedback("Network error running email intelligence.");
    } finally {
      setReprocessing(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const isAcademics = activeCategory === "ACADEMICS";
  const isSchools = activeCategory === "SCHOOLS";
  const isCDC = activeCategory === "CDC_AND_PLACEMENT" || activeCategory === "PLACEMENTS_AND_INTERNSHIPS";

  return (
    <div className="space-y-3 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Sub-Filters / Modals based on active category */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {isAcademics && (
            <button
              onClick={() => setFacultyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-semibold text-xs dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Manage Faculty Directory</span>
            </button>
          )}

          {isSchools && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                School:
              </span>
              <Link
                href={createFilterUrl({ school: null })}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                  !currentSchool
                    ? "bg-cyan-700 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                All Schools
              </Link>
              {SCHOOLS.map((sch) => {
                const active = currentSchool === sch;
                return (
                  <Link
                    key={sch}
                    href={createFilterUrl({ school: sch })}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-cyan-700 text-white font-semibold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {sch}
                  </Link>
                );
              })}
            </div>
          )}

          {isCDC && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                Section:
              </span>
              {CDC_SUBTYPES.map((sub) => {
                const active = currentSubCategory === sub.value;
                return (
                  <Link
                    key={sub.value}
                    href={createFilterUrl({ subCategory: sub.value || null })}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-amber-600 text-white font-semibold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Action: Reprocess intelligence button */}
        <button
          onClick={handleReprocess}
          disabled={reprocessing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300 shrink-0 self-start sm:self-auto"
        >
          <Sparkles className={cn("h-3.5 w-3.5", reprocessing && "animate-spin")} />
          <span>{reprocessing ? "Re-classifying..." : "Re-classify Emails"}</span>
        </button>
      </div>

      {/* Secondary Row: Priority Level & Deadline Filter */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Priority:
        </span>
        {PRIORITY_TABS.map((tab) => {
          const active = currentPriority === tab.value;
          return (
            <Link
              key={tab.value}
              href={createFilterUrl({ priority: tab.value || null })}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {tab.label}
            </Link>
          );
        })}

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* Deadline toggle */}
        <Link
          href={createFilterUrl({ deadlines: hasDeadlines ? null : "true" })}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors border",
            hasDeadlines
              ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
          )}
        >
          <Calendar className="h-3 w-3" />
          <span>Deadlines Only</span>
        </Link>
      </div>

      {feedback && (
        <div className="text-xs p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {feedback}
        </div>
      )}

      {/* Modal for Faculty Management */}
      <FacultyDirectoryModal
        isOpen={facultyModalOpen}
        onClose={() => {
          setFacultyModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
