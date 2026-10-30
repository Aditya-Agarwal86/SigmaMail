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
    <div className="bg-white border border-[#E1E5DC] rounded-xl p-3.5 shadow-card space-y-3">
      {/* Top Header with Search and Manage Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#244A3A]" />
          <span className="text-xs font-bold text-[#252923]">Filter by Faculty:</span>
          <span className="text-[11px] text-[#697168]">
            ({facultyList.length} faculty registered)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-2 text-[#697168]" />
            <input
              type="text"
              placeholder="Search faculty name / course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-[#E1E5DC] bg-[#F7F8F4] focus:outline-hidden focus:border-[#244A3A] w-48 text-[#252923]"
            />
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0] hover:bg-[#d9e2d4] transition-colors shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Manage Directory</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Faculty Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {/* All Faculty Pill */}
        <Link
          href={createUrl({ faculty: null, unknownFaculty: null })}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
            isAllSelected
              ? "bg-[#244A3A] text-white border-[#244A3A] font-semibold shadow-xs"
              : "bg-[#F0F2EB] text-[#252923] hover:bg-[#E5EBE1] border-[#E1E5DC]"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>All Faculty</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              isAllSelected ? "bg-white/20 text-white" : "bg-white text-[#697168] border border-[#E1E5DC]"
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
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
                isSelected
                  ? "bg-[#244A3A] text-white border-[#244A3A] font-semibold shadow-xs"
                  : "bg-[#F0F2EB] text-[#252923] hover:bg-[#E5EBE1] border-[#E1E5DC]"
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
                  isSelected ? "bg-white/20 text-white" : "bg-white text-[#697168] border border-[#E1E5DC]"
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
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
            isUnknownSelected
              ? "bg-[#244A3A] text-white border-[#244A3A] font-semibold shadow-xs"
              : "bg-[#F0F2EB] text-[#252923] hover:bg-[#E5EBE1] border-[#E1E5DC]"
          )}
        >
          <HelpCircle className="h-3.5 w-3.5 text-[#697168]" />
          <span>Unassigned / Unknown Faculty</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              isUnknownSelected ? "bg-white/20 text-white" : "bg-white text-[#697168] border border-[#E1E5DC]"
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
