import Link from "next/link";
import { ShieldX, ArrowLeft, MailQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason || "Unauthorized email domain.";

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-6 dark:bg-slate-900 dark:border-rose-900/60">
        <div className="h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center dark:bg-rose-950/60 dark:text-rose-400">
          <ShieldX className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight dark:text-white">
            Access Restricted
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            SigmaMail is exclusively available to verified students with active university accounts.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-left text-xs text-rose-900 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <MailQuestion className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Eligibility Requirement</span>
          </div>
          <p className="leading-relaxed">
            Your Google Account email did not match the authorized domain allowlist (<code>vitapstudent.ac.in</code>).
          </p>
          {reason && (
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 pt-1 border-t border-rose-200/60 dark:border-rose-900">
              Details: {reason}
            </p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <Link href="/login" className="w-full block">
            <Button className="w-full">
              Try Again with University Email
            </Button>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Return to Demo Preview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
