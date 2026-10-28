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
    <div className="p-6 rounded-xl bg-white border border-[#E1E5DC] shadow-card space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A]">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#252923]">
              Official Gmail Mailbox Authorization
            </h3>
            <p className="text-xs text-[#697168]">
              Separate, opt-in OAuth authorization to synchronize university circulars & deadlines
            </p>
          </div>
        </div>

        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Authorized & Connected</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-[#697168] bg-[#F0F2EB] border border-[#E1E5DC] w-fit">
            <span>Not Connected</span>
          </span>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {isConnected && credential ? (
        <div className="space-y-4">
          <div className="text-xs text-[#697168] space-y-2 bg-[#F7F8F4] p-3.5 rounded-lg border border-[#E1E5DC]">
            <div className="flex justify-between py-1 border-b border-[#E1E5DC]">
              <span className="font-medium text-[#252923]">Connected Account</span>
              <span className="font-mono text-[#252923]">{credential.gmailAddress}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E1E5DC]">
              <span className="font-medium text-[#252923]">Granted Gmail Scopes</span>
              <span className="font-mono text-[11px] truncate max-w-xs text-[#252923]">
                {credential.scope}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E1E5DC]">
              <span className="font-medium text-[#252923]">Token Security</span>
              <span className="text-[#244A3A] font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>AES-256-GCM Encrypted at Rest</span>
              </span>
            </div>
            {credential.lastSyncAt && (
              <div className="flex justify-between py-1">
                <span className="font-medium text-[#252923]">Last Synchronized</span>
                <span className="text-[#252923]">{formatDate(credential.lastSyncAt)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Synchronizing Mailbox..." : "Check for New Emails"}</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="gap-2 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              <span>{disconnecting ? "Disconnecting..." : "Disconnect Gmail"}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-[#F7F8F4] border border-[#E1E5DC] text-xs text-[#697168] space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-[#252923]">
              <Key className="h-4 w-4 text-[#244A3A]" />
              <span>Why connect Gmail?</span>
            </div>
            <p>
              SigmaMail only requests read-only permission (<code>gmail.readonly</code>) to fetch official college emails, extract deadlines, and categorize academic communications into your workspace.
            </p>
          </div>

          <a href="/api/auth/gmail/connect" className="inline-block">
            <Button className="gap-2 text-xs">
              <Mail className="h-3.5 w-3.5" />
              <span>Authorize University Gmail Access</span>
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
