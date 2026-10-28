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
          <LogIn className="h-3.5 w-3.5 text-[#244A3A]" />
          <span>Sign In</span>
        </Button>
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#F0F2EB] transition-colors text-left focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-[#E5EBE1] border border-[#D3DCD0] flex items-center justify-center text-[#244A3A] font-bold text-xs overflow-hidden">
          {user.name ? user.name[0].toUpperCase() : "S"}
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#252923]">
              {user.name || "Student"}
            </span>
            <UserCheck className="h-3.5 w-3.5 text-[#244A3A]" />
          </div>
          <p className="text-[11px] text-[#697168] truncate max-w-[170px]">
            {user.email}
          </p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-[#697168]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#E1E5DC] shadow-dropdown py-1 z-50 text-xs">
          <div className="px-3.5 py-2.5 border-b border-[#E1E5DC]">
            <p className="font-semibold text-[#252923] truncate">{user.name || "Verified Student"}</p>
            <p className="text-[11px] text-[#697168] truncate">{user.email}</p>
            {isDemoUser && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                Demo Workspace
              </span>
            )}
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-[#252923] hover:bg-[#F7F8F4] transition-colors"
            >
              <Settings className="h-4 w-4 text-[#697168]" />
              <span>Account & Settings</span>
            </Link>
          </div>

          <div className="border-t border-[#E1E5DC] py-1">
            <form
              action={async () => {
                const { signOut } = await import("next-auth/react");
                signOut({ callbackUrl: "/login" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-700 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
