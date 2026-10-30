"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CategoryItem {
  id: string;
  name: string;
  href: string;
  icon: any;
  count: number;
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  hiddenCategories: string[];
  categoryOrder: string[] | null;
  onPreferencesUpdated: () => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  hiddenCategories: initialHidden,
  categoryOrder: initialOrder,
  onPreferencesUpdated,
}: CategoryManagerModalProps) {
  const router = useRouter();
  const [items, setItems] = useState<CategoryItem[]>(() => {
    if (!initialOrder || initialOrder.length === 0) return [...categories];
    const orderMap = new Map(initialOrder.map((id, index) => [id, index]));
    return [...categories].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return idxA - idxB;
    });
  });

  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleVisibility = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setHidden(next);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    setItems(next);
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    setItems(next);
  };

  const showAll = () => {
    setHidden(new Set());
  };

  const resetToDefault = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/categories/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (res.ok) {
        setHidden(new Set());
        setItems([...categories]);
        setFeedback("Reset to default layout.");
        onPreferencesUpdated();
        router.refresh();
      }
    } catch {
      setFeedback("Failed to reset layout.");
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const newOrder = items.map((i) => i.id);
      const hiddenList = Array.from(hidden);

      const res = await fetch("/api/categories/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryOrder: newOrder,
          hiddenCategories: hiddenList,
        }),
      });

      if (res.ok) {
        setFeedback("Category preferences saved successfully!");
        onPreferencesUpdated();
        router.refresh();
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setFeedback("Failed to save category preferences.");
      }
    } catch {
      setFeedback("Network error saving preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E1E5DC] space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E5DC]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#252923]">Edit Categories</h3>
              <p className="text-xs text-[#697168]">
                Reorder or hide categories according to your personal preference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#697168] hover:text-[#252923] p-1.5 rounded-lg hover:bg-[#F0F2EB]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <button
            onClick={showAll}
            className="text-xs text-[#244A3A] hover:underline font-semibold"
          >
            Show All Categories
          </button>
          <button
            onClick={resetToDefault}
            disabled={saving}
            className="text-xs text-[#697168] hover:text-[#252923] flex items-center gap-1 font-medium"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Draggable / Reorderable Category List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[#F0F2EB]">
          {items.map((cat, idx) => {
            const isHidden = hidden.has(cat.id);
            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors pt-2.5 ${
                  isHidden
                    ? "bg-[#F7F8F4] border-[#E1E5DC] opacity-60"
                    : "bg-white border-[#E1E5DC] hover:border-[#D3DCD0]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[#697168] cursor-grab">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="h-7 w-7 rounded-md bg-[#F0F2EB] flex items-center justify-center text-[#252923] shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-[#252923] truncate block">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-[#697168]">
                      {cat.count} messages
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Move Up Button */}
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded text-[#697168] hover:text-[#252923] disabled:opacity-30 hover:bg-[#F0F2EB]"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>

                  {/* Move Down Button */}
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                    className="p-1 rounded text-[#697168] hover:text-[#252923] disabled:opacity-30 hover:bg-[#F0F2EB]"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>

                  {/* Hide / Show Toggle */}
                  <button
                    onClick={() => toggleVisibility(cat.id)}
                    className={`p-1.5 rounded-md border text-xs font-medium flex items-center gap-1 ${
                      isHidden
                        ? "bg-[#F0F2EB] text-[#697168] border-[#E1E5DC]"
                        : "bg-[#E5EBE1] text-[#244A3A] border-[#D3DCD0]"
                    }`}
                    title={isHidden ? "Click to Show" : "Click to Hide"}
                  >
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="text-[11px]">{isHidden ? "Hidden" : "Visible"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {feedback && (
          <div className="text-xs p-2 rounded-lg bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] font-medium">
            {feedback}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E1E5DC]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-[#697168] hover:text-[#252923]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={saving}
            className="text-xs bg-[#244A3A] hover:bg-[#1b382c] text-white font-semibold"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
