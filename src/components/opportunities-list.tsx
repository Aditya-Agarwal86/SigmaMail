import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, Building2, Calendar, ChevronRight, Layers } from "lucide-react";
import { OpportunityStage } from "@prisma/client";

interface OpportunityWithEmails {
  id: string;
  companyName: string;
  normalizedKey: string;
  batchCycle: string | null;
  currentStage: OpportunityStage;
  statusSnippet: string | null;
  lastActivityAt: Date;
  emails: Array<{
    id: string;
    subject: string;
    receivedAt: Date;
    subCategory: string | null;
    priorityLevel: string;
  }>;
}

interface OpportunitiesListProps {
  opportunities: OpportunityWithEmails[];
  currentCategoryUrl: string;
}

const STAGE_LABELS: Record<OpportunityStage, { label: string; bg: string; text: string; border: string }> = {
  DRIVE_ANNOUNCED: { label: "Drive Announced", bg: "bg-[#E5EBE1]", text: "text-[#244A3A]", border: "border-[#D3DCD0]" },
  REGISTRATION_OPEN: { label: "Registration / Eligibility", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  ASSESSMENT_SCHEDULED: { label: "Assessment Scheduled", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  PRE_PLACEMENT_TALK: { label: "Pre-Placement Talk", bg: "bg-[#F0F2EB]", text: "text-[#252923]", border: "border-[#E1E5DC]" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  SHORTLIST_ANNOUNCED: { label: "Shortlist / Result", bg: "bg-[#E5EBE1]", text: "text-[#244A3A]", border: "border-[#D3DCD0]" },
  OFFER_CONGRATULATIONS: { label: "Selected / Congrats", bg: "bg-[#E5EBE1]", text: "text-[#244A3A]", border: "border-[#D3DCD0]" },
  UPDATE_GENERAL: { label: "General Update", bg: "bg-[#F0F2EB]", text: "text-[#697168]", border: "border-[#E1E5DC]" },
};

export function OpportunitiesList({ opportunities, currentCategoryUrl }: OpportunitiesListProps) {
  if (opportunities.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-[#E1E5DC] bg-white">
        <Building2 className="mx-auto h-8 w-8 text-[#697168] mb-2" />
        <h3 className="text-sm font-semibold text-[#252923]">
          No Company Opportunities Tracked Yet
        </h3>
        <p className="text-xs text-[#697168] mt-1 max-w-sm mx-auto">
          Placement opportunities will automatically appear here as CDC drives, tests, shortlists, and offers are received.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opp) => {
        const stageConfig = STAGE_LABELS[opp.currentStage] || STAGE_LABELS.UPDATE_GENERAL;

        return (
          <div
            key={opp.id}
            className="bg-white border border-[#E1E5DC] rounded-xl p-5 shadow-card space-y-4 hover:border-[#D3DCD0] transition-colors"
          >
            {/* Header: Company Name, Batch Cycle & Current Stage */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1E5DC] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center font-bold text-sm text-[#244A3A]">
                  {opp.companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-[#252923] tracking-tight">
                      {opp.companyName}
                    </h3>
                    {opp.batchCycle && (
                      <span className="text-[11px] font-medium text-[#697168] bg-[#F0F2EB] px-2 py-0.5 rounded-full border border-[#E1E5DC]">
                        Batch {opp.batchCycle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#697168]">
                    Last activity: {formatDistanceToNow(new Date(opp.lastActivityAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${stageConfig.bg} ${stageConfig.text} ${stageConfig.border}`}
                >
                  {stageConfig.label}
                </span>
              </div>
            </div>

            {/* Status Snippet */}
            {opp.statusSnippet && (
              <p className="text-xs text-[#252923] bg-[#F7F8F4] p-3 rounded-lg border border-[#E1E5DC] leading-relaxed">
                {opp.statusSnippet}
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
  );
}
