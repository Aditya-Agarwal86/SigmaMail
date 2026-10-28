"use client";

import { useState } from "react";
import { EmailCategory } from "@prisma/client";
import { Edit3, Check, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="rounded-xl border border-[#E1E5DC] bg-white p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-[#244A3A]" />
          <h3 className="font-bold text-sm text-[#252923]">
            Manual Category Override
          </h3>
        </div>

        {!editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            className="text-xs h-8 gap-1.5"
          >
            <span>Change Category</span>
          </Button>
        )}
      </div>

      <p className="text-xs text-[#697168]">
        If an email was classified incorrectly, you can manually re-assign it. This locks the category and protects it from automated reprocessing.
      </p>

      {feedback && (
        <div className="text-xs p-2.5 rounded-lg bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] font-medium">
          {feedback}
        </div>
      )}

      {editing && (
        <div className="pt-2 space-y-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as EmailCategory)}
            className="w-full text-xs p-2.5 rounded-lg border border-[#E1E5DC] bg-[#F7F8F4] text-[#252923] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleSave}
              className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{submitting ? "Saving..." : "Lock Category"}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelected(currentCategory);
                setEditing(false);
              }}
              className="text-xs text-[#697168]"
            >
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
