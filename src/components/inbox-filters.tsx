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
    <div className="space-y-3 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Sub-Filters / Modals based on active category */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {isAcademics && (
            <button
              onClick={() => setFacultyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] hover:bg-[#d9e2d4] font-semibold text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Manage Faculty Directory</span>
            </button>
          )}

          {isSchools && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[#697168] font-medium shrink-0 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                School:
              </span>
              <Link
                href={createFilterUrl({ school: null })}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                  !currentSchool
                    ? "bg-[#244A3A] text-white font-semibold"
                    : "bg-[#F0F2EB] text-[#252923] hover:bg-[#E5EBE1] border border-[#E1E5DC]"
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
                        ? "bg-[#244A3A] text-white font-semibold"
                        : "bg-[#F0F2EB] text-[#252923] hover:bg-[#E5EBE1] border border-[#E1E5DC]"
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
              <span className="text-[#697168] font-medium shrink-0 flex items-center gap-1">
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
                        ? "bg-[#244A3A] text-white font-semibold"
                        : "bg-[#F0F2EB] text-[#252923] hover:bg-[#E5EBE1] border border-[#E1E5DC]"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority Filter and Deadlines Quick Filter */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs overflow-x-auto">
          {/* Priority Pill Filters */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#F0F2EB] border border-[#E1E5DC]">
            {PRIORITY_TABS.map((p) => {
              const active = currentPriority === p.value;
              return (
                <Link
                  key={p.value}
                  href={createFilterUrl({ priority: p.value || null })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap",
                    active
                      ? "bg-white text-[#244A3A] font-semibold shadow-xs"
                      : "text-[#697168] hover:text-[#252923]"
                  )}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>

          {/* Has Deadlines Filter Toggle */}
          <Link
            href={createFilterUrl({ deadlines: hasDeadlines ? null : "true" })}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap",
              hasDeadlines
                ? "bg-[#E5EBE1] border-[#D3DCD0] text-[#244A3A] font-semibold"
                : "border-[#E1E5DC] bg-white text-[#697168] hover:bg-[#F7F8F4] hover:text-[#252923]"
            )}
          >
            <Calendar className={cn("h-3.5 w-3.5", hasDeadlines ? "text-[#244A3A]" : "text-[#697168]")} />
            <span>Deadlines Only</span>
          </Link>

          {/* Re-Classify All Emails Button */}
          <button
            onClick={() => setShowReclassifyAllModal(true)}
            disabled={reprocessing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#D3DCD0] bg-white text-[#244A3A] hover:bg-[#F0F2EB] shadow-xs transition-colors whitespace-nowrap"
            title="Re-run AI classification and deadline extraction across your mailbox"
          >
            <Sparkles className={cn("h-3.5 w-3.5", reprocessing ? "animate-spin text-[#244A3A]" : "text-[#244A3A]")} />
            <span>{reprocessing ? "Re-Classifying..." : "Re-Classify All"}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Re-Classification */}
      {showReclassifyAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E1E5DC] space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center shrink-0 text-[#244A3A]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#252923]">
                  Re-Classify University Mailbox?
                </h3>
                <p className="text-xs text-[#697168] leading-relaxed">
                  This will evaluate your emails against the latest classification rules, separate Transport from Hostel, extract deadlines, and re-calculate priority scores.
                  <br /><br />
                  <strong>Note:</strong> Any emails you manually locked will remain safely preserved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E1E5DC]">
              <button
                type="button"
                onClick={() => setShowReclassifyAllModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#697168] hover:text-[#252923] rounded-lg border border-[#E1E5DC]"
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
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#244A3A] hover:bg-[#1b382c] rounded-lg shadow-xs"
              >
                {reprocessing ? "Re-Classifying..." : "Start Reclassification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="text-xs p-2 rounded-lg bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] font-medium">
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
