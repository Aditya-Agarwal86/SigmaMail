"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Users, User, HelpCircle, Search, UserPlus } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FacultyDirectoryModal } from "@/components/faculty-modal";

export interface FacultyFilterItem {
  id: string;
  name: string;
  email: string;
  courseLabel?: string | null;
  count: number;
}

interface AcademicsFacultyFilterProps {
  facultyList: FacultyFilterItem[];
  allCount: number;
  unassignedCount: number;
  currentFacultyEmail?: string | null;
  isUnknownSelected?: boolean;
}

export function AcademicsFacultyFilter({
  facultyList,
  allCount,
  unassignedCount,
  currentFacultyEmail,
  isUnknownSelected,
}: AcademicsFacultyFilterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const createUrl = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete("page");
    const q = next.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return facultyList;
    const q = searchQuery.toLowerCase();
    return facultyList.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        (f.courseLabel && f.courseLabel.toLowerCase().includes(q))
    );
  }, [facultyList, searchQuery]);

  const isAllSelected = !currentFacultyEmail && !isUnknownSelected;

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs space-y-3">
      {/* Top Header with Search and Manage Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Filter by Faculty:</span>
          <span className="text-[11px] text-muted-foreground">
            ({facultyList.length} faculty registered)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search faculty name / course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-border bg-muted/40 focus:outline-hidden focus:border-primary w-48 text-foreground"
            />
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Manage Directory</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Faculty Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {/* All Faculty Pill */}
        <Link
          href={createUrl({ faculty: null, unknownFaculty: null })}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
            isAllSelected
              ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border-border"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>All Faculty</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              isAllSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-card text-muted-foreground border border-border"
            )}
          >
            {allCount}
          </span>
        </Link>

        {/* Individual Faculty Members */}
        {filteredFaculty.map((faculty) => {
          const isSelected = currentFacultyEmail === faculty.email.toLowerCase();
          return (
            <Link
              key={faculty.id}
              href={createUrl({ faculty: faculty.email, unknownFaculty: null })}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border-border"
              )}
            >
              <User className="h-3.5 w-3.5" />
              <span>{faculty.name}</span>
              {faculty.courseLabel && (
                <span className="text-[10px] opacity-75 font-normal">
                  ({faculty.courseLabel})
                </span>
              )}
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                )}
              >
                {faculty.count}
              </span>
            </Link>
          );
        })}

        {/* Unassigned / Unknown Faculty Pill */}
        <Link
          href={createUrl({ faculty: null, unknownFaculty: "true" })}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
            isUnknownSelected
              ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border-border"
          )}
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Unassigned / Unknown Faculty</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              isUnknownSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-card text-muted-foreground border border-border"
            )}
          >
            {unassignedCount}
          </span>
        </Link>
      </div>

      <FacultyDirectoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
