"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Layers,
  Clock,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { OpportunityStage, StudentApplicationStatus } from "@prisma/client";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface OpportunityWithEmails {
  id: string;
  companyName: string;
  normalizedKey: string;
  batchCycle: string | null;
  currentStage: OpportunityStage;
  statusSnippet: string | null;
  lastActivityAt: Date | string;
  jobRole?: string | null;
  jobLocation?: string | null;
  ctc?: string | null;
  stipend?: string | null;
  eligibleBranches: string[];
  eligibleDegrees: string[];
  minCgpa?: number | null;
  backlogCriteria?: string | null;
  applicationDeadline?: Date | string | null;
  applicationLink?: string | null;
  studentStatus: StudentApplicationStatus;
  studentNotes?: string | null;
  emails: Array<{
    id: string;
    subject: string;
    receivedAt: Date | string;
    subCategory: string | null;
    priorityLevel: string;
  }>;
}

interface PlacementStats {
  upcomingDrives: number;
  ongoingDrives: number;
  closingSoon: number;
  applied: number;
  shortlisted: number;
  resultsAnnounced: number;
  newOpportunities: number;
}

interface OpportunitiesListProps {
  opportunities: OpportunityWithEmails[];
  currentCategoryUrl: string;
  stats?: PlacementStats | null;
}

const STAGE_LABELS: Record<OpportunityStage, { label: string; bg: string; text: string; border: string }> = {
  DRIVE_ANNOUNCED: { label: "Drive Announced", bg: "bg-[#E5EBE1]", text: "text-[#244A3A]", border: "border-[#D3DCD0]" },
  REGISTRATION_OPEN: { label: "Registration / Apply", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  ASSESSMENT_SCHEDULED: { label: "Assessment Scheduled", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  PRE_PLACEMENT_TALK: { label: "Pre-Placement Talk", bg: "bg-[#F0F2EB]", text: "text-[#252923]", border: "border-[#E1E5DC]" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-200" },
  SHORTLIST_ANNOUNCED: { label: "Shortlist / Results", bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200" },
  OFFER_CONGRATULATIONS: { label: "Selected / Offers", bg: "bg-[#E5EBE1]", text: "text-[#244A3A]", border: "border-[#D3DCD0]" },
  UPDATE_GENERAL: { label: "General Update", bg: "bg-[#F0F2EB]", text: "text-[#697168]", border: "border-[#E1E5DC]" },
};

const STUDENT_STATUS_LABELS: Record<StudentApplicationStatus, { label: string; color: string }> = {
  INTERESTED: { label: "Interested", color: "text-[#697168]" },
  ELIGIBLE: { label: "Eligible", color: "text-blue-700" },
  APPLIED: { label: "Applied", color: "text-amber-700 font-semibold" },
  ASSESSMENT_COMPLETED: { label: "Assessment Done", color: "text-indigo-700" },
  INTERVIEW_SCHEDULED: { label: "Interview Set", color: "text-purple-700 font-semibold" },
  SHORTLISTED: { label: "Shortlisted", color: "text-emerald-700 font-semibold" },
  SELECTED: { label: "Selected / Offered 🎉", color: "text-[#244A3A] font-bold" },
  REJECTED: { label: "Not Selected", color: "text-rose-700" },
  WITHDRAWN: { label: "Withdrawn", color: "text-[#697168]" },
};

export function OpportunitiesList({ opportunities, currentCategoryUrl, stats }: OpportunitiesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (oppId: string, newStatus: StudentApplicationStatus) => {
    setUpdatingId(oppId);
    try {
      const res = await fetch(`/api/opportunities/${oppId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error("Status update error:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Placement Status Overview Cards (Section 6A) */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#697168] block">Upcoming</span>
            <span className="text-xl font-bold text-[#252923] mt-0.5 block">{stats.upcomingDrives}</span>
            <span className="text-[10px] text-[#697168]">Future Drives</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 block">Ongoing</span>
            <span className="text-xl font-bold text-amber-900 mt-0.5 block">{stats.ongoingDrives}</span>
            <span className="text-[10px] text-[#697168]">Open Drives</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 block">Closing Soon</span>
            <span className="text-xl font-bold text-rose-900 mt-0.5 block">{stats.closingSoon}</span>
            <span className="text-[10px] text-[#697168]">Deadline &lt; 3 Days</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#244A3A] block">Applied</span>
            <span className="text-xl font-bold text-[#244A3A] mt-0.5 block">{stats.applied}</span>
            <span className="text-[10px] text-[#697168]">Submitted</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-700 block">Shortlisted</span>
            <span className="text-xl font-bold text-blue-900 mt-0.5 block">{stats.shortlisted}</span>
            <span className="text-[10px] text-[#697168]">Qualified</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 block">Results</span>
            <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{stats.resultsAnnounced}</span>
            <span className="text-[10px] text-[#697168]">Announced</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E1E5DC] shadow-card col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#244A3A] block">New (7 Days)</span>
            <span className="text-xl font-bold text-[#252923] mt-0.5 block">{stats.newOpportunities}</span>
            <span className="text-[10px] text-[#697168]">Fresh Notices</span>
          </div>
        </div>
      )}

      {/* 2. Opportunities Cards List */}
      {opportunities.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
          <Building2 className="mx-auto h-8 w-8 text-[#697168] mb-2" />
          <h3 className="text-sm font-semibold text-[#252923]">
            No Placement Opportunities Matching Filter
          </h3>
          <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or clear active placement filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => {
            const stageConfig = STAGE_LABELS[opp.currentStage] || STAGE_LABELS.UPDATE_GENERAL;

            return (
              <div
                key={opp.id}
                className="bg-white border border-[#E1E5DC] rounded-xl p-5 shadow-card space-y-4 hover:border-[#D3DCD0] transition-colors"
              >
                {/* Header: Company, Batch, CTC, Role */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E1E5DC] pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center font-bold text-base text-[#244A3A] shrink-0">
                      {opp.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-[#252923] tracking-tight">
                          {opp.companyName}
                        </h3>
                        {opp.batchCycle && (
                          <span className="text-[11px] font-medium text-[#697168] bg-[#F0F2EB] px-2 py-0.5 rounded-full border border-[#E1E5DC]">
                            Batch {opp.batchCycle}
                          </span>
                        )}
                        {opp.ctc && (
                          <span className="text-[11px] font-bold text-[#244A3A] bg-[#E5EBE1] px-2 py-0.5 rounded-full border border-[#D3DCD0]">
                            {opp.ctc}
                          </span>
                        )}
                      </div>

                      {opp.jobRole && (
                        <p className="text-xs font-semibold text-[#252923] mt-0.5">
                          Role: {opp.jobRole}
                        </p>
                      )}

                      <p className="text-[11px] text-[#697168] mt-0.5">
                        Last activity: {formatDistanceToNow(new Date(opp.lastActivityAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Stage and Student Application Status Selector */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${stageConfig.bg} ${stageConfig.text} ${stageConfig.border} whitespace-nowrap`}
                    >
                      {stageConfig.label}
                    </span>

                    {/* Student Status Dropdown Tracker */}
                    <div className="flex items-center gap-1.5 bg-[#F7F8F4] px-2 py-1 rounded-lg border border-[#E1E5DC] text-xs">
                      <span className="text-[#697168] text-[11px] font-medium">My Status:</span>
                      <select
                        value={opp.studentStatus}
                        onChange={(e) => handleStatusChange(opp.id, e.target.value as StudentApplicationStatus)}
                        disabled={updatingId === opp.id}
                        className="text-xs font-semibold bg-transparent text-[#252923] focus:outline-hidden cursor-pointer"
                      >
                        {Object.entries(STUDENT_STATUS_LABELS).map(([statusKey, cfg]) => (
                          <option key={statusKey} value={statusKey}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Extracted Opportunity Details (Section 6C) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#F7F8F4] p-3 rounded-lg border border-[#E1E5DC]">
                  <div>
                    <span className="text-[#697168] block text-[10px] uppercase font-semibold">Eligibility</span>
                    <span className="font-medium text-[#252923]">
                      {opp.eligibleBranches.length > 0 ? opp.eligibleBranches.join(", ") : "Not Specified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#697168] block text-[10px] uppercase font-semibold">Min CGPA</span>
                    <span className="font-medium text-[#252923]">
                      {opp.minCgpa !== null ? `>= ${opp.minCgpa}` : "Not Specified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#697168] block text-[10px] uppercase font-semibold">Stipend</span>
                    <span className="font-medium text-[#252923]">
                      {opp.stipend || "Not Specified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#697168] block text-[10px] uppercase font-semibold">Location</span>
                    <span className="font-medium text-[#252923]">
                      {opp.jobLocation || "Not Specified"}
                    </span>
                  </div>
                </div>

                {/* Status Snippet */}
                {opp.statusSnippet && (
                  <p className="text-xs text-[#252923] bg-white p-3 rounded-lg border border-[#E1E5DC] leading-relaxed">
                    <strong>Latest Update:</strong> {opp.statusSnippet}
                  </p>
                )}

                {/* Grouped Communications */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold text-[#697168] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#244A3A]" />
                    <span>Related Announcements & Updates ({opp.emails.length})</span>
                  </h4>

                  <div className="space-y-1.5">
                    {opp.emails.map((e) => (
                      <Link
                        key={e.id}
                        href={`/email/${e.id}?returnUrl=${encodeURIComponent(currentCategoryUrl)}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-[#E1E5DC] bg-[#F9FAF7] hover:bg-[#F0F2EB] transition-colors text-xs text-[#252923] group"
                      >
                        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                          <span className="truncate font-medium group-hover:text-[#244A3A] transition-colors">
                            {e.subject}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-[#697168]">
                          <span>{new Date(e.receivedAt).toLocaleDateString()}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-[#697168] group-hover:text-[#244A3A] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
