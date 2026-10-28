import { getEmailStats, getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sliders, Trash2, Database } from "lucide-react";
import { GmailSettingsPanel } from "@/components/gmail-settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [stats, credential] = await Promise.all([
    getEmailStats(userId),
    userId ? prisma.gmailCredential.findUnique({ where: { userId } }) : null,
  ]);

  const isDemoUser = user?.email === "fictional.student@vitapstudent.ac.in";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 w-full">
          <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Application Settings & Privacy Controls
            </h2>
            <p className="text-xs text-slate-500">
              Manage university email eligibility, Gmail authorization, AI preferences, and data retention
            </p>
          </div>

          <div className="grid gap-6">
            {/* 1. College Account & Domain Status */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  University Identity Verification
                </h3>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium">Configured Domain Suffix</span>
                  <Badge variant="secondary">@vitapstudent.ac.in</Badge>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium">Active Student Profile</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-medium">Identity Provider</span>
                  <span className="text-emerald-600 font-semibold">Google OpenID Connect (Verified)</span>
                </div>
              </div>
            </div>

            {/* 2. Separate Gmail Authorization Status */}
            <GmailSettingsPanel credential={credential} isDemoUser={isDemoUser} />

            {/* 3. AI Features & Preferences */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  AI & Processing Preferences
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">AI Summarization</h4>
                    <p className="text-slate-500 text-[11px]">Generate concise summaries for long circulars and emails</p>
                  </div>
                  <Badge variant="success">Enabled</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Deadline & Event Extraction</h4>
                    <p className="text-slate-500 text-[11px]">Parse assignment due dates and examination schedules</p>
                  </div>
                  <Badge variant="success">Enabled</Badge>
                </div>
              </div>
            </div>

            {/* 4. Privacy & Data Erasure */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Privacy & Data Erasure (&quot;Forget Me&quot;)
                </h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                As detailed in <code>PRIVACY.md</code>, students retain full sovereignty over their data. Disconnecting your
                account immediately revokes tokens and cascades deletion across all local email copies and deadlines.
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Database className="h-4 w-4 text-slate-400" />
                <span>Local Retention Window: 90 days</span>
              </div>

              <div className="pt-2">
                <Button variant="destructive" size="sm" disabled className="opacity-60 cursor-not-allowed">
                  Disconnect Mailbox & Purge Local Data
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
