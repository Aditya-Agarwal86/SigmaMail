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
    <div className="space-y-2.5 pb-1">
      {/* Category Sub-Filters Strip (CDC Section / Schools / Academics) */}
      {(isCDC || isSchools || isAcademics) && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-card border border-border overflow-x-auto no-scrollbar shadow-xs">
          {isAcademics && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium text-xs shrink-0 flex items-center gap-1.5 pl-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Faculty:
              </span>
              <button
                onClick={() => setFacultyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-semibold text-xs transition-colors shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Manage Faculty Directory</span>
              </button>
            </div>
          )}

          {isSchools && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-muted-foreground font-semibold text-xs shrink-0 flex items-center gap-1.5 pl-1.5 pr-1">
                <Layers className="h-3.5 w-3.5 text-primary" />
                School:
              </span>
              <Link
                href={createFilterUrl({ school: null })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  !currentSchool
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
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
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
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
              <span className="text-muted-foreground font-semibold text-xs shrink-0 flex items-center gap-1.5 pl-1.5 pr-1">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
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
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
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

      {/* Primary Priority, Deadlines, and Re-Classification Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Priority Filter Group */}
        <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border shadow-xs overflow-x-auto no-scrollbar shrink-0">
          {PRIORITY_TABS.map((p) => {
            const active = currentPriority === p.value;
            return (
              <Link
                key={p.value}
                href={createFilterUrl({ priority: p.value || null })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Quick Action Buttons (Deadlines Only & Re-Classify All) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Has Deadlines Filter Toggle */}
          <Link
            href={createFilterUrl({ deadlines: hasDeadlines ? null : "true" })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shadow-xs h-9",
              hasDeadlines
                ? "bg-primary/10 border-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Calendar className={cn("h-3.5 w-3.5", hasDeadlines ? "text-primary" : "text-muted-foreground")} />
            <span>Deadlines Only</span>
          </Link>

          {/* Re-Classify All Emails Button */}
          <button
            onClick={() => setShowReclassifyAllModal(true)}
            disabled={reprocessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-primary/30 bg-card text-primary hover:bg-primary/10 shadow-xs transition-colors whitespace-nowrap h-9 cursor-pointer"
            title="Re-run AI classification and deadline extraction across your mailbox"
          >
            <Sparkles className={cn("h-3.5 w-3.5", reprocessing ? "animate-spin text-primary" : "text-primary")} />
            <span>{reprocessing ? "Re-Classifying..." : "Re-Classify All"}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Re-Classification */}
      {showReclassifyAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  Re-Classify University Mailbox?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will evaluate your emails against the latest classification rules, separate Transport from Hostel, extract deadlines, and re-calculate priority scores.
                  <br /><br />
                  <strong>Note:</strong> Any emails you manually locked will remain safely preserved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowReclassifyAllModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border"
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
                className="px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-xs"
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
