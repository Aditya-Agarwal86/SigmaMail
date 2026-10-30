import { getEmailStats, getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sliders, Trash2, Database, Key } from "lucide-react";
import { GmailSettingsPanel } from "@/components/gmail-settings-panel";
import { PurgeDataButton } from "@/components/purge-data-button";

import { ThemeCustomizationPanel } from "@/components/theme-customization-panel";

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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar stats={stats} isDemoUser={isDemoUser} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} isDemoUser={isDemoUser} />

        <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 w-full">
          <div className="pb-3 border-b border-border">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Application Settings & Personalization
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize appearance, accent themes, Gmail authorization, AI preferences, and student data privacy
            </p>
          </div>

          <div className="grid gap-6">
            {/* 1. Theme & Appearance Customization */}
            <ThemeCustomizationPanel />

            {/* 2. College Account & Domain Status */}
            <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  University Identity Verification
                </h3>
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="font-medium text-foreground">Configured Domain Suffix</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
                    @vitapstudent.ac.in
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="font-medium text-foreground">Active Student Profile</span>
                  <span className="font-mono text-foreground">{user?.email}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-medium text-foreground">Identity Provider</span>
                  <span className="text-primary font-semibold">Google OpenID Connect (Verified)</span>
                </div>
              </div>
            </div>

            {/* 3. Separate Gmail Authorization Status */}
            <GmailSettingsPanel credential={credential} isDemoUser={isDemoUser} />

            {/* 4. AI Features & Preferences */}
            <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  AI & Processing Preferences
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <h4 className="font-semibold text-foreground">AI Summarization</h4>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Generate 2-sentence executive briefs for long circulars using Gemini Flash
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <h4 className="font-semibold text-foreground">Automated Deadline Extraction</h4>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Analyze email bodies for submission deadlines, exam timetables, and drive cutoffs
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Student Data Retention & Erasure */}
            <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-destructive" />
                <h3 className="text-sm font-bold text-foreground">
                  Student Data Governance & Deletion
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In strict compliance with student data sovereignty, you can purge your synchronized local emails, extracted deadlines, and classification history at any time.
              </p>
              <div className="pt-1">
                <PurgeDataButton isDemoUser={isDemoUser} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
