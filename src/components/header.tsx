"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RefreshCw, Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfileMenu } from "@/components/user-profile-menu";
import { useTheme } from "@/components/theme-provider";

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
  const { appearance, resolvedIsDark, setAppearance } = useTheme();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/");
    }
  };

  const toggleAppearance = () => {
    if (resolvedIsDark) {
      setAppearance("light");
    } else {
      setAppearance("dark");
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0 transition-colors">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="max-w-md w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search subject, faculty, CDC drives, or deadlines..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-muted/30 text-xs text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </form>

      {/* Header Actions & Profile */}
      <div className="flex items-center gap-2">
        {/* Quick Appearance Toggle */}
        <button
          type="button"
          onClick={toggleAppearance}
          className="p-2 rounded-xl border border-border text-foreground hover:text-primary hover:bg-muted/50 transition-colors"
          title={`Switch to ${resolvedIsDark ? "Light" : "Dark"} mode`}
        >
          {resolvedIsDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Link
          href="/deadlines"
          className="p-2 rounded-xl border border-border text-foreground hover:text-primary hover:bg-muted/50 transition-colors relative"
          title="View Actionable Deadlines & Reminders"
        >
          <Bell className="h-4 w-4" />
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-semibold rounded-xl"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* Profile Dropdown Menu */}
        <div className="pl-2 border-l border-border">
          <UserProfileMenu user={user} isDemoUser={isDemoUser} />
        </div>
      </div>
    </header>
  );
}
