import { getEmailStats, getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sliders, Trash2, Database, Key } from "lucide-react";
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
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8F4]">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 w-full">
          <div className="pb-2 border-b border-[#E1E5DC]">
            <h2 className="text-xl font-bold tracking-tight text-[#252923]">
              Application Settings & Privacy Controls
            </h2>
            <p className="text-xs text-[#697168]">
              Manage university email eligibility, Gmail authorization, AI preferences, and data retention
            </p>
          </div>

          <div className="grid gap-6">
            {/* 1. College Account & Domain Status */}
            <div className="p-6 rounded-xl bg-white border border-[#E1E5DC] shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#244A3A]" />
                <h3 className="text-sm font-bold text-[#252923]">
                  University Identity Verification
                </h3>
              </div>
              <div className="text-xs text-[#697168] space-y-2">
                <div className="flex justify-between py-1.5 border-b border-[#E1E5DC]">
                  <span className="font-medium text-[#252923]">Configured Domain Suffix</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]">
                    @vitapstudent.ac.in
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E1E5DC]">
                  <span className="font-medium text-[#252923]">Active Student Profile</span>
                  <span className="font-mono text-[#252923]">{user?.email}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-medium text-[#252923]">Identity Provider</span>
                  <span className="text-[#244A3A] font-semibold">Google OpenID Connect (Verified)</span>
                </div>
              </div>
            </div>

            {/* 2. Separate Gmail Authorization Status */}
            <GmailSettingsPanel credential={credential} isDemoUser={isDemoUser} />

            {/* 3. AI Features & Preferences */}
            <div className="p-6 rounded-xl bg-white border border-[#E1E5DC] shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#244A3A]" />
                <h3 className="text-sm font-bold text-[#252923]">
                  AI & Processing Preferences
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#F7F8F4] border border-[#E1E5DC]">
                  <div>
                    <h4 className="font-semibold text-[#252923]">AI Summarization</h4>
                    <p className="text-[#697168] text-[11px] mt-0.5">
                      Generate 2-sentence executive briefs for long circulars using Gemini Flash
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#F7F8F4] border border-[#E1E5DC]">
                  <div>
                    <h4 className="font-semibold text-[#252923]">Automated Deadline Extraction</h4>
                    <p className="text-[#697168] text-[11px] mt-0.5">
                      Analyze email bodies for submission deadlines, exam timetables, and drive cutoffs
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Student Data Retention & Erasure */}
            <div className="p-6 rounded-xl bg-white border border-[#E1E5DC] shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-rose-700" />
                <h3 className="text-sm font-bold text-[#252923]">
                  Student Data Governance & Deletion
                </h3>
              </div>
              <p className="text-xs text-[#697168] leading-relaxed">
                In strict compliance with student data sovereignty, you can purge your synchronized local emails, extracted deadlines, and classification history at any time.
              </p>
              <div className="pt-1">
                <Button variant="outline" size="sm" className="gap-2 text-xs text-rose-700 border-rose-200 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purge Local Synchronized Emails</span>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
