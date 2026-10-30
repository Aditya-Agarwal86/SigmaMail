"use client";

import { useState, useEffect } from "react";
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
  Edit2,
  Undo2,
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
  categoryNames?: Record<string, string>;
  onPreferencesUpdated: () => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  hiddenCategories: initialHidden,
  categoryOrder: initialOrder,
  categoryNames: initialNames = {},
  onPreferencesUpdated,
}: CategoryManagerModalProps) {
  const router = useRouter();

  // Reorderable items list
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
  const [customNames, setCustomNames] = useState<Record<string, string>>({ ...initialNames });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sync state if initial props change
  useEffect(() => {
    setHidden(new Set(initialHidden));
    setCustomNames({ ...initialNames });
    if (!initialOrder || initialOrder.length === 0) {
      setItems([...categories]);
    } else {
      const orderMap = new Map(initialOrder.map((id, index) => [id, index]));
      setItems(
        [...categories].sort((a, b) => {
          const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
          const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
          return idxA - idxB;
        })
      );
    }
  }, [isOpen, initialHidden, initialOrder, initialNames, categories]);

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

  const startRename = (id: string, currentDisplayName: string) => {
    setEditingId(id);
    setEditingText(customNames[id] || currentDisplayName);
  };

  const saveRename = (id: string) => {
    const trimmed = editingText.trim();
    const next = { ...customNames };
    if (!trimmed) {
      delete next[id];
    } else {
      next[id] = trimmed;
    }
    setCustomNames(next);
    setEditingId(null);
    setEditingText("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingText("");
  };

  const resetOriginalName = (id: string) => {
    const next = { ...customNames };
    delete next[id];
    setCustomNames(next);
    if (editingId === id) {
      setEditingId(null);
      setEditingText("");
    }
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
        setCustomNames({});
        setItems([...categories]);
        setFeedback("Reset all category preferences to defaults.");
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
          categoryNames: customNames,
        }),
      });

      if (res.ok) {
        setFeedback("Category preferences and names saved!");
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
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-[#E1E5DC] space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E5DC]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#252923]">Edit Categories</h3>
              <p className="text-xs text-[#697168]">
                Reorder, rename, or hide categories according to your preference
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
            <span>Reset All Preferences</span>
          </button>
        </div>

        {/* Reorderable & Renamable Category List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[#F0F2EB]">
          {items.map((cat, idx) => {
            const isHidden = hidden.has(cat.id);
            const Icon = cat.icon;
            const customName = customNames[cat.id];
            const displayName = customName || cat.name;
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border transition-colors pt-2.5 gap-2 ${
                  isHidden
                    ? "bg-[#F7F8F4] border-[#E1E5DC] opacity-60"
                    : "bg-white border-[#E1E5DC] hover:border-[#D3DCD0]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-[#697168] cursor-grab shrink-0">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="h-7 w-7 rounded-md bg-[#F0F2EB] flex items-center justify-center text-[#252923] shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        placeholder={cat.name}
                        className="text-xs font-semibold px-2 py-1 rounded border border-[#244A3A] bg-white text-[#252923] w-full focus:outline-none focus:ring-1 focus:ring-[#244A3A]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(cat.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                      />
                      <button
                        onClick={() => saveRename(cat.id)}
                        className="p-1 rounded bg-[#244A3A] text-white hover:bg-[#1b382c]"
                        title="Save Name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1 rounded bg-[#F0F2EB] text-[#697168] hover:text-[#252923]"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-semibold text-[#252923] truncate">
                          {displayName}
                        </span>
                        {customName && (
                          <span className="text-[10px] text-[#697168] italic shrink-0">
                            (was: {cat.name})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#697168] block">
                        {cat.count} messages
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {/* Rename Option */}
                  {!isEditing && (
                    <button
                      onClick={() => startRename(cat.id, displayName)}
                      className="p-1.5 rounded text-[#697168] hover:text-[#252923] hover:bg-[#F0F2EB] flex items-center gap-1 text-[11px]"
                      title="Rename Category"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Rename</span>
                    </button>
                  )}

                  {/* Reset to Original Name (if customized) */}
                  {customName && (
                    <button
                      onClick={() => resetOriginalName(cat.id)}
                      className="p-1.5 rounded text-[#697168] hover:text-amber-800 hover:bg-amber-50 flex items-center gap-1 text-[11px]"
                      title="Reset to Original Name"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Reset Name</span>
                    </button>
                  )}

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
