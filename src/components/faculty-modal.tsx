"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, UserPlus, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FacultyContact {
  id: string;
  name: string;
  email: string;
  courseLabel: string | null;
}

export function FacultyDirectoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [contacts, setContacts] = useState<FacultyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [courseLabel, setCourseLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faculty");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Faculty name and email are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, courseLabel }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Added ${name} to your faculty directory.`);
        setName("");
        setEmail("");
        setCourseLabel("");
        fetchContacts();
      } else {
        setError(data.error || "Failed to add faculty contact.");
      }
    } catch {
      setError("Network error adding contact.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/faculty?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setContacts(contacts.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#252923]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E1E5DC] shadow-dropdown max-w-lg w-full overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-[#E1E5DC] pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A]">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#252923]">Faculty Directory</h3>
              <p className="text-xs text-[#697168]">
                Route emails from these professors straight to Academics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2.5 py-1 rounded-md text-[#697168] hover:bg-[#F0F2EB] hover:text-[#252923]"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0] text-[#244A3A] text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Add Faculty Form */}
        <form onSubmit={handleAdd} className="space-y-3 bg-[#F7F8F4] p-4 rounded-xl border border-[#E1E5DC]">
          <h4 className="text-xs font-semibold text-[#252923]">Add Professor or Course Instructor</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Professor Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2 rounded-lg border border-[#E1E5DC] bg-white text-[#252923] placeholder:text-[#697168] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
            />
            <input
              type="email"
              placeholder="Faculty Email (*@vitap.ac.in) *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-2 rounded-lg border border-[#E1E5DC] bg-white text-[#252923] placeholder:text-[#697168] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Course Code / Subject (Optional)"
              value={courseLabel}
              onChange={(e) => setCourseLabel(e.target.value)}
              className="flex-1 p-2 text-xs rounded-lg border border-[#E1E5DC] bg-white text-[#252923] placeholder:text-[#697168] focus:ring-1 focus:ring-[#244A3A] focus:outline-none"
            />
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5 text-xs bg-[#244A3A] hover:bg-[#1B382C] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{submitting ? "Adding..." : "Add"}</span>
            </Button>
          </div>
        </form>

        {/* Directory List */}
        <div className="space-y-2 max-h-56 overflow-y-auto">
          <h4 className="text-xs font-semibold text-[#697168] uppercase tracking-wider">
            Registered Professors ({contacts.length})
          </h4>

          {loading ? (
            <p className="text-xs text-[#697168] py-4 text-center">Loading faculty list...</p>
          ) : contacts.length === 0 ? (
            <p className="text-xs text-[#697168] py-4 text-center bg-[#F7F8F4] rounded-lg border border-[#E1E5DC]">
              No custom professors added yet. Emails from verified @vitap.ac.in professors are automatically matched.
            </p>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#E1E5DC] bg-white text-xs"
              >
                <div>
                  <p className="font-semibold text-[#252923]">{c.name}</p>
                  <p className="text-[11px] text-[#697168] font-mono">{c.email}</p>
                  {c.courseLabel && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] font-medium">
                      {c.courseLabel}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-[#697168] hover:text-rose-700 transition-colors"
                  title="Remove from directory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
