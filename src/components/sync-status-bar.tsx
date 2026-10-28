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
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
        <span>
          <strong>Gmail Connected:</strong> <code>{cred.gmailAddress}</code>
        </span>
        <span className="text-slate-400">|</span>
        <span>
          <strong>{cred.totalInDb}</strong> messages stored in DB
          {cred.totalEstimatedCount ? ` of ~${cred.totalEstimatedCount} total in mailbox` : ""}
        </span>
        {cred.lastSyncAt && (
          <span className="text-slate-400 hidden md:inline">
            (Last sync: {new Date(cred.lastSyncAt).toLocaleTimeString()})
          </span>
        )}
        {syncStatus.job && syncStatus.job.status === "RUNNING" && (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold text-[10px] flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Worker Active (Batch #{syncStatus.job.batchCount})</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {progressMsg && (
          <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-xs text-[11px]">
            {progressMsg}
          </span>
        )}

        <button
          onClick={handleStandardSync}
          disabled={isSyncingAny}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors dark:bg-slate-800 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>Sync New</span>
        </button>

        <button
          onClick={handleImportAll}
          disabled={isSyncingAny}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
