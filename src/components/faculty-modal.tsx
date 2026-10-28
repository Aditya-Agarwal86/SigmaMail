"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, UserPlus, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

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
        body: JSON.stringify({ name, email, courseLabel: courseLabel || null }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Added faculty ${name}. Mailbox re-analyzed!`);
        setName("");
        setEmail("");
        setCourseLabel("");
        fetchContacts();
      } else {
        setError(data.error || "Failed to add faculty.");
      }
    } catch {
      setError("Network error adding faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, facultyName: string) => {
    if (!confirm(`Remove ${facultyName} from your faculty directory? Historical emails will be preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/faculty?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess(`Removed ${facultyName}.`);
        fetchContacts();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove faculty.");
      }
    } catch {
      setError("Network error deleting faculty.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Manage Faculty Directory</h3>
              <p className="text-xs text-slate-500">
                Emails from your faculty members are classified into Academics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-800 text-xs dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Add Faculty Form */}
        <form onSubmit={handleAdd} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-3">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Add Teaching Faculty
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Professor Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              type="email"
              placeholder="faculty@vitap.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Course / Subject (Optional)"
              value={courseLabel}
              onChange={(e) => setCourseLabel(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{submitting ? "Saving..." : "Add Faculty Contact"}</span>
          </button>
        </form>

        {/* Faculty List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Configured Faculty ({contacts.length})
            </h4>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading directory...</p>
          ) : contacts.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <BookOpen className="h-6 w-6 text-slate-300 mx-auto mb-1" />
              <p className="text-xs text-slate-500">No faculty members configured yet.</p>
              <p className="text-[11px] text-slate-400">
                Add your course professors to organize their coursework emails into Academics.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {contacts.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">{c.email}</p>
                    {c.courseLabel && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] dark:bg-blue-950/50 dark:text-blue-300">
                        {c.courseLabel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                    title="Remove from directory"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
