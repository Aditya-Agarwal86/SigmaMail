"use client";

import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Filter, Calendar, Sparkles, UserPlus, Layers, Briefcase, X, ArrowUpDown } from "lucide-react";
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

const READ_STATUS_TABS = [
  { label: "All Emails", value: "" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Starred", value: "starred" },
];

const PRIORITY_TABS = [
  { label: "All Priorities", value: "" },
  { label: "Urgent", value: "URGENT" },
  { label: "High", value: "HIGH" },
  { label: "Normal", value: "NORMAL" },
  { label: "Low", value: "LOW" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Highest Priority", value: "priority" },
];

export function InboxFilters({ currentCategory }: { currentCategory?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = currentCategory || searchParams.get("category") || "";
  const currentSubCategory = searchParams.get("subCategory") || "";
  const currentSchool = searchParams.get("school") || "";
  const currentPriority = searchParams.get("priority") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentSort = searchParams.get("sortBy") || "newest";
  const hasDeadlines = searchParams.get("deadlines") === "true";

  const [reprocessing, setReprocessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [showReclassifyAllModal, setShowReclassifyAllModal] = useState(false);

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

  const hasActiveFilters = Boolean(
    currentPriority || currentStatus || hasDeadlines || currentSchool || currentSubCategory || currentSort !== "newest"
  );

  const clearAllFiltersUrl = () => {
    const nextParams = new URLSearchParams();
    if (activeCategory) nextParams.set("category", activeCategory);
    const q = searchParams.get("q");
    if (q) nextParams.set("q", q);
    const base = pathname || "/";
    const query = nextParams.toString();
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
        setFeedback(`Re-classified ${data.processed} emails with intelligence rules.`);
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
    <div className="space-y-2 pb-1">
      {/* Category Sub-Filters Strip (CDC Section / Schools / Academics) */}
      {(isCDC || isSchools || isAcademics) && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-card border border-[#E5E5DC] overflow-x-auto no-scrollbar shadow-xs">
          {isAcademics && (
            <div className="flex items-center gap-2">
              <span className="text-[#74786F] font-medium text-xs shrink-0 flex items-center gap-1.5 pl-1.5">
                <Layers className="h-3.5 w-3.5 text-[#687653]" />
                Faculty:
              </span>
              <button
                onClick={() => setFacultyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0F0E9] text-[#252A24] border border-[#E5E5DC] hover:bg-[#E5E5DC] font-semibold text-xs transition-colors shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Manage Faculty Directory</span>
              </button>
            </div>
          )}

          {isSchools && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#74786F] font-semibold text-xs shrink-0 flex items-center gap-1.5 pl-1.5 pr-1">
                <Layers className="h-3.5 w-3.5 text-[#687653]" />
                School:
              </span>
              <Link
                href={createFilterUrl({ school: null })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  !currentSchool
                    ? "bg-[#687653] text-white font-semibold shadow-xs"
                    : "bg-[#F0F0E9] text-[#74786F] hover:text-[#252A24] hover:bg-[#E5E5DC] border border-[#E5E5DC]"
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
                      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-[#687653] text-white font-semibold shadow-xs"
                        : "bg-[#F0F0E9] text-[#74786F] hover:text-[#252A24] hover:bg-[#E5E5DC] border border-[#E5E5DC]"
                    )}
                  >
                    {sch}
                  </Link>
                );
              })}
            </div>
          )}

          {isCDC && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#74786F] font-semibold text-xs shrink-0 flex items-center gap-1.5 pl-1.5 pr-1">
                <Briefcase className="h-3.5 w-3.5 text-[#687653]" />
                Section:
              </span>
              {CDC_SUBTYPES.map((sub) => {
                const active = currentSubCategory === sub.value;
                return (
                  <Link
                    key={sub.value}
                    href={createFilterUrl({ subCategory: sub.value || null })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-[#687653] text-white font-semibold shadow-xs"
                        : "bg-[#F0F0E9] text-[#74786F] hover:text-[#252A24] hover:bg-[#E5E5DC] border border-[#E5E5DC]"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Filter Bar: Read Status, Priority, Deadlines, Sorting, Reclassify */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Read / Unread / Starred Status Filter */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#F0F0E9] border border-[#E5E5DC] shadow-xs shrink-0">
            {READ_STATUS_TABS.map((tab) => {
              const active = currentStatus === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={createFilterUrl({ status: tab.value || null })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-white text-[#252A24] font-semibold shadow-xs"
                      : "text-[#74786F] hover:text-[#252A24]"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#F0F0E9] border border-[#E5E5DC] shadow-xs shrink-0">
            {PRIORITY_TABS.map((p) => {
              const active = currentPriority === p.value;
              return (
                <Link
                  key={p.value}
                  href={createFilterUrl({ priority: p.value || null })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-white text-[#252A24] font-semibold shadow-xs"
                      : "text-[#74786F] hover:text-[#252A24]"
                  )}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>

          {/* Deadlines Only Toggle */}
          <Link
            href={createFilterUrl({ deadlines: hasDeadlines ? null : "true" })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shadow-xs h-8",
              hasDeadlines
                ? "bg-[#687653]/10 border-[#687653]/30 text-[#687653] font-semibold"
                : "border-[#E5E5DC] bg-white text-[#74786F] hover:bg-[#F0F0E9] hover:text-[#252A24]"
            )}
          >
            <Calendar className={cn("h-3.5 w-3.5", hasDeadlines ? "text-[#687653]" : "text-[#74786F]")} />
            <span>Deadlines Only</span>
          </Link>

          {/* Clear Filters Action */}
          {hasActiveFilters && (
            <Link
              href={clearAllFiltersUrl()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#74786F] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors h-8"
              title="Reset all active filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Link>
          )}
        </div>

        {/* Right side: Sort order & Re-classify button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Sorting Dropdown/Control */}
          <div className="flex items-center gap-1.5 text-xs text-[#74786F] bg-white border border-[#E5E5DC] rounded-lg px-2.5 py-1 shadow-xs h-8">
            <ArrowUpDown className="h-3 w-3 text-[#74786F]" />
            <select
              value={currentSort}
              onChange={(e) => {
                router.push(createFilterUrl({ sortBy: e.target.value === "newest" ? null : e.target.value }));
              }}
              className="bg-transparent text-xs font-medium text-[#252A24] focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Re-Classify All Emails Button */}
          <button
            onClick={() => setShowReclassifyAllModal(true)}
            disabled={reprocessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E5E5DC] bg-white text-[#252A24] hover:bg-[#F0F0E9] hover:border-[#687653]/40 shadow-xs transition-colors whitespace-nowrap h-8 cursor-pointer"
            title="Re-run AI classification and deadline extraction across your mailbox"
          >
            <Sparkles className={cn("h-3.5 w-3.5", reprocessing ? "animate-spin text-[#687653]" : "text-[#687653]")} />
            <span>{reprocessing ? "Re-Classifying..." : "Re-Classify All"}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Re-Classification */}
      {showReclassifyAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E5DC] space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-[#687653]/10 border border-[#687653]/20 flex items-center justify-center shrink-0 text-[#687653]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#252A24]">
                  Re-Classify University Mailbox?
                </h3>
                <p className="text-xs text-[#74786F] leading-relaxed">
                  This will evaluate your emails against the latest classification rules, separate Transport from Hostel, extract deadlines, and re-calculate priority scores.
                  <br /><br />
                  <strong>Note:</strong> Any emails you manually locked will remain safely preserved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E5DC]">
              <button
                type="button"
                onClick={() => setShowReclassifyAllModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#74786F] hover:text-[#252A24] rounded-lg border border-[#E5E5DC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReclassifyAllModal(false);
                  handleReprocess();
                }}
                disabled={reprocessing}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#687653] hover:bg-[#687653]/90 rounded-lg shadow-xs"
              >
                {reprocessing ? "Re-Classifying..." : "Start Reclassification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="text-xs p-2 rounded-lg bg-[#F0F0E9] text-[#252A24] border border-[#E5E5DC] font-medium">
          {feedback}
        </div>
      )}

      {/* Faculty Directory Management Modal */}
      <FacultyDirectoryModal
        isOpen={facultyModalOpen}
        onClose={() => setFacultyModalOpen(false)}
      />
    </div>
  );
}
