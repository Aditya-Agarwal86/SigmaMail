"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReclassifyEmailButtonProps {
  emailId: string;
  isManualOverride?: boolean;
  currentCategoryName?: string;
  onSuccess?: () => void;
}

export function ReclassifyEmailButton({
  emailId,
  isManualOverride = false,
  currentCategoryName,
  onSuccess,
}: ReclassifyEmailButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const runReclassification = async (forceOverwrite = false) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/emails/${emailId}/reclassify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceOverwrite }),
      });

      const data = await res.json();

      if (data.locked && !forceOverwrite) {
        setShowConfirmModal(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to reclassify email");
      }

      setFeedback({
        type: "success",
        message: "Email re-classified successfully using updated intelligence rules.",
      });
      setShowConfirmModal(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "An error occurred while re-classifying.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => runReclassification(false)}
          disabled={loading}
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244A3A] border-[#D3DCD0] bg-white hover:bg-[#F0F2EB] shadow-xs transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#244A3A]" : "text-[#244A3A]"}`} />
          <span>{loading ? "Re-Classifying..." : "Re-Classify Email"}</span>
        </Button>

        {feedback && (
          <span
            className={`text-xs px-2.5 py-1 rounded-md font-medium border animate-in fade-in ${
              feedback.type === "success"
                ? "bg-[#E5EBE1] text-[#244A3A] border-[#D3DCD0]"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {feedback.message}
          </span>
        )}
      </div>

      {/* Confirmation Modal for Overwriting Manual Lock */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E1E5DC] space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#252923]">
                  Overwrite Category Lock?
                </h3>
                <p className="text-xs text-[#697168] leading-relaxed">
                  This email is currently locked under{" "}
                  <strong>{currentCategoryName || "a custom category"}</strong> by your manual choice.
                  Re-classifying will run the latest AI classification engine and may change its category.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E1E5DC]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs text-[#697168] hover:text-[#252923]"
              >
                Keep Current Category
              </Button>
              <Button
                size="sm"
                onClick={() => runReclassification(true)}
                disabled={loading}
                className="text-xs bg-[#244A3A] hover:bg-[#1b382c] text-white font-semibold"
              >
                {loading ? "Re-Evaluating..." : "Confirm & Re-Classify"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
