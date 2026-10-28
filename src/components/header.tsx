"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RefreshCw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfileMenu } from "@/components/user-profile-menu";

interface HeaderProps {
  user: {
    id?: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  isDemoUser?: boolean;
}

export function Header({ user, isDemoUser }: HeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/");
    }
  };

  return (
    <header className="h-16 border-b border-[#E1E5DC] bg-white px-6 flex items-center justify-between shrink-0">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="max-w-md w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#697168]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search subject, faculty, CDC drives, or deadlines..."
          className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#E1E5DC] bg-[#F7F8F4] text-sm text-[#252923] placeholder:text-[#697168] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#244A3A] focus:border-transparent transition-all"
        />
      </form>

      {/* Header Actions & Profile */}
      <div className="flex items-center gap-2">
        <Link
          href="/deadlines"
          className="p-2 rounded-lg border border-[#E1E5DC] text-[#252923] hover:text-[#244A3A] hover:bg-[#F7F8F4] transition-colors relative"
          title="View Actionable Deadlines & Reminders"
        >
          <Bell className="h-4 w-4" />
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-medium"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#697168]" />
          <span>Refresh</span>
        </Button>

        {/* Profile Dropdown Menu */}
        <div className="pl-3 border-l border-[#E1E5DC]">
          <UserProfileMenu user={user} isDemoUser={isDemoUser} />
        </div>
      </div>
    </header>
  );
}
