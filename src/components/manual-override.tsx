"use client";

import { useState } from "react";
import { EmailCategory } from "@prisma/client";
import { Edit3, Check, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";

const CATEGORY_OPTIONS: { label: string; value: EmailCategory }[] = [
  { label: "Dean Academics", value: EmailCategory.DEAN_ACADEMICS },
  { label: "Registrar", value: EmailCategory.REGISTRAR },
  { label: "Asst. Dean Academics", value: EmailCategory.ASST_DEAN_ACADEMICS },
  { label: "Academics", value: EmailCategory.ACADEMICS },
  { label: "Examinations", value: EmailCategory.EXAMINATIONS },
  { label: "CDC & Placement", value: EmailCategory.CDC_AND_PLACEMENT },
  { label: "SDC", value: EmailCategory.SDC },
  { label: "Schools", value: EmailCategory.SCHOOLS },
  { label: "Events & Clubs", value: EmailCategory.EVENTS_AND_CLUBS },
  { label: "Transport", value: EmailCategory.TRANSPORT },
  { label: "Hostel", value: EmailCategory.HOSTEL },
  { label: "Sports", value: EmailCategory.SPORTS },
  { label: "Other", value: EmailCategory.OTHER },
];

export function ManualCategoryOverride({
  emailId,
  currentCategory,
  isManualOverride,
}: {
  emailId: string;
  currentCategory: EmailCategory;
  isManualOverride: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<EmailCategory>(currentCategory);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/emails/override", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, category: selected }),
      });
      if (res.ok) {
        setFeedback("Category updated and locked against auto-reprocessing!");
        setEditing(false);
        router.refresh();
      } else {
        const data = await res.json();
        setFeedback(data.error || "Failed to update category.");
      }
    } catch {
      setFeedback("Network error updating category.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset manual override and let the classifier determine category automatically?")) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/emails/override", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, category: null }),
      });
      if (res.ok) {
        setFeedback("Reset manual override.");
        setEditing(false);
        router.refresh();
      }
    } catch {
      setFeedback("Network error resetting override.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {editing ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as EmailCategory)}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px]"
          >
            <Check className="h-3 w-3" />
            <span>Save</span>
          </button>
          {isManualOverride && (
            <button
              onClick={handleReset}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] dark:bg-slate-800 dark:text-slate-300"
            >
              <Undo2 className="h-3 w-3" />
              <span>Reset to Auto</span>
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="text-slate-400 hover:text-slate-600 px-1 text-[11px]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isManualOverride && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-300 font-semibold">
              Manual Override
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold dark:text-blue-400"
          >
            <Edit3 className="h-3 w-3" />
            <span>Change Category</span>
          </button>
        </div>
      )}
      {feedback && <span className="text-[11px] text-emerald-600 font-medium">{feedback}</span>}
    </div>
  );
}
