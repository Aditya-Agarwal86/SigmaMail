"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { UserCheck, LogOut, Settings, LogIn, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfileMenuProps {
  user: {
    id?: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  isDemoUser?: boolean;
}

export function UserProfileMenu({ user, isDemoUser }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link href="/login">
        <Button size="sm" variant="outline" className="gap-2 text-xs">
          <LogIn className="h-3.5 w-3.5 text-blue-600" />
          <span>Sign In</span>
        </Button>
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors dark:hover:bg-slate-800 text-left focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs overflow-hidden dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
          {user.name ? user.name[0].toUpperCase() : "S"}
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {user.name || "Student"}
            </span>
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
            {user.email}
          </p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-lg py-2 z-50 dark:bg-slate-900 dark:border-slate-800 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user.name || "Student"}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
            {isDemoUser && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Demo Student Preview
              </span>
            )}
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>Settings & Privacy</span>
            </Link>
          </div>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <form
              action={async () => {
                const { signOut } = await import("next-auth/react");
                await signOut({ callbackUrl: "/login" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
