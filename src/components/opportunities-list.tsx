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

const STAGE_LABELS: Record<OpportunityStage, { label: string; bg: string; text: string }> = {
  DRIVE_ANNOUNCED: { label: "Drive Announced", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  REGISTRATION_OPEN: { label: "Registration / Eligibility", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  ASSESSMENT_SCHEDULED: { label: "Assessment Scheduled", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  PRE_PLACEMENT_TALK: { label: "Pre-Placement Talk", bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  SHORTLIST_ANNOUNCED: { label: "Shortlist / Result", bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300" },
  OFFER_CONGRATULATIONS: { label: "Selected / Congrats", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  UPDATE_GENERAL: { label: "General Update", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" },
};

export function OpportunitiesList({ opportunities, currentCategoryUrl }: OpportunitiesListProps) {
  if (opportunities.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          No Company Opportunities Tracked Yet
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            {/* Header: Company Name, Batch Cycle & Current Stage */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {opp.companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                      {opp.companyName}
                    </h3>
                    {opp.batchCycle && opp.batchCycle !== "GENERAL" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Batch {opp.batchCycle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Latest Activity: {formatDistanceToNow(new Date(opp.lastActivityAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md ${stageConfig.bg} ${stageConfig.text}`}
                >
                  {stageConfig.label}
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {opp.emails.length} {opp.emails.length === 1 ? "Email" : "Emails"}
                </span>
              </div>
            </div>

            {/* Chronological Recruitment Timeline */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Timeline & Related Communications
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800/60 overflow-hidden">
                {opp.emails.map((email) => (
                  <Link
                    key={email.id}
                    href={`/email/${email.id}?returnUrl=${encodeURIComponent(currentCategoryUrl)}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-900/40 dark:hover:bg-slate-800/50 text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {email.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[11px]">
                      <span>{new Date(email.receivedAt).toLocaleDateString()}</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
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
