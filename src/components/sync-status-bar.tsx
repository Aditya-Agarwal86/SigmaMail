"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncStatusBar() {
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (e) {
      console.warn("Failed to fetch sync status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStandardSync = async () => {
    setSyncing(true);
    setProgressMsg("Checking Gmail for new updates...");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setProgressMsg(`Sync complete! ${data.messagesProcessed} new messages processed.`);
        router.refresh();
        fetchStatus();
      } else {
        setProgressMsg(data.error || "Sync failed.");
      }
    } catch {
      setProgressMsg("Network error during sync.");
    } finally {
      setSyncing(false);
      setTimeout(() => setProgressMsg(null), 6000);
    }
  };

  // Durable background synchronization for all historical messages
  const handleImportAll = async () => {
    setImportingAll(true);
    setProgressMsg("Starting autonomous background Gmail synchronization...");

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProgressMsg(`Failed to start job: ${data.error || "Unknown error"}`);
      } else {
        setProgressMsg("Background import running! You can safely close or navigate away.");
        fetchStatus();
      }
    } catch {
      setProgressMsg("Network error starting background sync.");
    } finally {
      setImportingAll(false);
      setTimeout(() => setProgressMsg(null), 10000);
    }
  };

  if (!syncStatus || !syncStatus.connected) {
    return null;
  }

  const cred = syncStatus.credential;
  const isSyncingAny = syncing || importingAll || cred.syncStatus === "SYNCING";

  return (
    <div className="bg-white border-b border-[#E1E5DC] px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 text-[#697168] flex-wrap">
        <span className="flex h-2 w-2 rounded-full bg-[#244A3A]" />
        <span>
          <strong className="text-[#252923]">Gmail Connected:</strong>{" "}
          <code className="text-[#252923] font-mono">{cred.gmailAddress}</code>
        </span>
        <span className="text-[#E1E5DC]">|</span>
        <span>
          <strong className="text-[#252923]">{cred.totalInDb}</strong> messages stored in DB
          {cred.totalEstimatedCount ? ` of ~${cred.totalEstimatedCount} total in mailbox` : ""}
        </span>
        {cred.lastSyncAt && (
          <span className="text-[#697168] hidden md:inline">
            (Last sync: {new Date(cred.lastSyncAt).toLocaleTimeString()})
          </span>
        )}
        {syncStatus.job && syncStatus.job.status === "RUNNING" && (
          <span className="px-2 py-0.5 rounded-full bg-[#E5EBE1] text-[#244A3A] font-semibold text-[10px] flex items-center gap-1 border border-[#D3DCD0]">
            <Loader2 className="h-3 w-3 animate-spin text-[#244A3A]" />
            <span>Worker Active (Batch #{syncStatus.job.batchCount})</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {progressMsg && (
          <span className="text-[#244A3A] font-medium truncate max-w-xs text-[11px]">
            {progressMsg}
          </span>
        )}

        <button
          onClick={handleStandardSync}
          disabled={isSyncingAny}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-[#252923] bg-[#F0F2EB] hover:bg-[#E5EBE1] border border-[#E1E5DC] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-[#244A3A]" : "text-[#697168]"}`} />
          <span>Sync New</span>
        </button>

        <button
          onClick={handleImportAll}
          disabled={isSyncingAny}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-[#244A3A] hover:bg-[#1B382C] disabled:opacity-50 transition-colors shadow-xs"
        >
          {importingAll || (syncStatus.job && syncStatus.job.status === "RUNNING") ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span>
            {syncStatus.job && syncStatus.job.status === "RUNNING"
              ? "Background Sync Active"
              : "Sync All Gmail Messages"}
          </span>
        </button>
      </div>
    </div>
  );
}
