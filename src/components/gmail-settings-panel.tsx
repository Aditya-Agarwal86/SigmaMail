"use client";

import { useState } from "react";
import { Mail, RefreshCw, Key, ShieldCheck, AlertCircle, CheckCircle2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface GmailSettingsPanelProps {
  credential: {
    gmailAddress: string;
    scope: string;
    expiresAt: Date | string;
    lastHistoryId?: string | null;
    lastSyncAt?: Date | string | null;
    syncStatus: string;
    syncError?: string | null;
  } | null;
  isDemoUser?: boolean;
}

export function GmailSettingsPanel({ credential, isDemoUser }: GmailSettingsPanelProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isConnected = !!credential && credential.syncStatus !== "REVOKED";

  const handleSync = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to synchronize." });
      } else {
        setFeedback({
          type: "success",
          message: `Synced ${data.messagesProcessed} new messages successfully.`,
        });
        router.refresh();
      }
    } catch {
      setFeedback({ type: "error", message: "Network error triggering sync." });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Gmail? This will revoke mailbox synchronization tokens. (Local emails will remain preserved unless purged).")) {
      return;
    }

    setDisconnecting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/gmail/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to disconnect." });
      } else {
        setFeedback({ type: "success", message: "Gmail disconnected successfully." });
        router.refresh();
      }
    } catch {
      setFeedback({ type: "error", message: "Network error disconnecting Gmail." });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Official University Gmail Authorization
            </h3>
            <p className="text-xs text-slate-500">
              Read-only synchronization for campus announcements and deadlines
            </p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <Badge variant="success" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              <span>Connected ({credential?.gmailAddress})</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300">
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Scope and Security Notice */}
      <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Strict Read-Only Access (`gmail.readonly`)</span>
        </div>
        <p className="text-[12px]">
          SigmaMail only requests read-only permission to index incoming academic circulars and notices. It cannot compose, send, archive, or delete your emails in Google Workspace.
        </p>
      </div>

      {/* Encrypted Key Indicator */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-slate-400" />
          <span>
            <strong>Encrypted Token Storage:</strong> Tokens are encrypted at rest with AES-256-GCM.
          </span>
        </div>
        {credential?.lastSyncAt && (
          <div className="text-[11px] text-slate-500 pl-5">
            Last successful sync: {formatDate(credential.lastSyncAt)} (Status: {credential.syncStatus})
          </div>
        )}
        {credential?.syncError && (
          <div className="text-[11px] text-rose-600 pl-5 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>Sync warning: {credential.syncError}</span>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 flex flex-wrap items-center gap-3">
        {isConnected ? (
          <>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing || disconnecting}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Synchronizing..." : "Sync Messages Now"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={syncing || disconnecting}
              className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
            >
              <Unlink className="h-3.5 w-3.5" />
              <span>{disconnecting ? "Disconnecting..." : "Disconnect Gmail"}</span>
            </Button>
          </>
        ) : (
          <form action="/api/auth/gmail/connect">
            <Button type="submit" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Mail className="h-3.5 w-3.5" />
              <span>Connect University Gmail</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
