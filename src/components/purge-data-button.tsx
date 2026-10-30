"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PurgeDataButton({ isDemoUser = false }: { isDemoUser?: boolean }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handlePurge = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/user/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to purge local data");
      }

      setFeedback({
        type: "success",
        message: `Purged ${data.counts?.emails || 0} emails and ${data.counts?.deadlines || 0} deadlines.`,
      });
      setShowConfirm(false);
      router.refresh();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "An error occurred during data purge.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="gap-2 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Purge Local Synchronized Emails</span>
      </Button>

      {feedback && (
        <p
          className={`text-xs p-2 rounded-lg font-medium border ${
            feedback.type === "success"
              ? "bg-[#E5EBE1] text-[#244A3A] border-[#D3DCD0]"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E1E5DC] space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#252923]">
                  Purge Local Synchronized Data?
                </h3>
                <p className="text-xs text-[#697168] leading-relaxed">
                  This action will permanently delete all locally synchronized emails, AI summaries, deadlines, and company opportunities from your SigmaMail database.
                  <br /><br />
                  <strong>Your actual Gmail account and messages on Google servers will NOT be deleted or altered.</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E1E5DC]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
                className="text-xs text-[#697168] hover:text-[#252923]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePurge}
                disabled={loading}
                className="text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold"
              >
                {loading ? "Purging..." : "Confirm Purge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
