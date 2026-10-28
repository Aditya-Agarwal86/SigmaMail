"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Star,
  Calendar,
  GraduationCap,
  FileCheck2,
  Briefcase,
  PartyPopper,
  Building2,
  Settings,
  ShieldAlert,
  Sparkles,
  Award,
  Bus,
  Trophy,
  Users,
  Code2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  stats: {
    unread: number;
    important: number;
    deadlines: number;
    byCategory: Record<string, number>;
  };
  isDemoUser?: boolean;
}

export function Sidebar({ stats, isDemoUser }: SidebarProps) {
  const pathname = usePathname();

  const mainNavigation = [
    {
      name: "Inbox",
      href: "/",
      icon: Inbox,
      count: stats.unread,
    },
    {
      name: "Important",
      href: "/important",
      icon: Star,
      count: stats.important,
    },
    {
      name: "Deadlines",
      href: "/deadlines",
      icon: Calendar,
      count: stats.deadlines,
      badgeColor: "bg-red-500 text-white",
    },
  ];

  // 13 Canonical Categories for Phase 6
  const categories = [
    {
      name: "Dean Academics",
      href: "/categories/DEAN_ACADEMICS",
      icon: Award,
      count: stats.byCategory["DEAN_ACADEMICS"] || 0,
      color: "text-purple-600",
    },
    {
      name: "Registrar",
      href: "/categories/REGISTRAR",
      icon: Building2,
      count: stats.byCategory["REGISTRAR"] || 0,
      color: "text-indigo-600",
    },
    {
      name: "Asst. Dean Academics",
      href: "/categories/ASST_DEAN_ACADEMICS",
      icon: Award,
      count: stats.byCategory["ASST_DEAN_ACADEMICS"] || 0,
      color: "text-violet-600",
    },
    {
      name: "Academics",
      href: "/categories/ACADEMICS",
      icon: GraduationCap,
      count: stats.byCategory["ACADEMICS"] || 0,
      color: "text-blue-600",
    },
    {
      name: "Examinations",
      href: "/categories/EXAMINATIONS",
      icon: FileCheck2,
      count: stats.byCategory["EXAMINATIONS"] || 0,
      color: "text-red-600",
    },
    {
      name: "CDC & Placement",
      href: "/categories/CDC_AND_PLACEMENT",
      icon: Briefcase,
      count: (stats.byCategory["CDC_AND_PLACEMENT"] || 0) + (stats.byCategory["PLACEMENTS_AND_INTERNSHIPS"] || 0),
      color: "text-amber-600",
    },
    {
      name: "SDC",
      href: "/categories/SDC",
      icon: Code2,
      count: stats.byCategory["SDC"] || 0,
      color: "text-teal-600",
    },
    {
      name: "Schools",
      href: "/categories/SCHOOLS",
      icon: Layers,
      count: stats.byCategory["SCHOOLS"] || 0,
      color: "text-cyan-600",
    },
    {
      name: "Events & Clubs",
      href: "/categories/EVENTS_AND_CLUBS",
      icon: PartyPopper,
      count: stats.byCategory["EVENTS_AND_CLUBS"] || 0,
      color: "text-pink-600",
    },
    {
      name: "Transport",
      href: "/categories/TRANSPORT",
      icon: Bus,
      count: stats.byCategory["TRANSPORT"] || 0,
      color: "text-orange-600",
    },
    {
      name: "Hostel",
      href: "/categories/HOSTEL",
      icon: Users,
      count: (stats.byCategory["HOSTEL"] || 0) + (stats.byCategory["ADMINISTRATIVE_AND_HOSTEL"] || 0),
      color: "text-emerald-600",
    },
    {
      name: "Sports",
      href: "/categories/SPORTS",
      icon: Trophy,
      count: stats.byCategory["SPORTS"] || 0,
      color: "text-yellow-600",
    },
    {
      name: "Other",
      href: "/categories/OTHER",
      icon: HelpCircle,
      count: (stats.byCategory["OTHER"] || 0) + (stats.byCategory["GENERAL_ANNOUNCEMENTS"] || 0) + (stats.byCategory["UNCATEGORIZED"] || 0),
      color: "text-slate-500",
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-110px)]">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 tracking-tight dark:text-white">SigmaMail</h1>
            <p className="text-xs text-slate-500 font-medium">vitapstudent.ac.in</p>
          </div>
        </div>

        {/* Primary Views */}
        <nav className="space-y-1">
          <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Mailbox
          </p>
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                </div>
                {item.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      item.badgeColor || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Categories */}
        <nav className="space-y-0.5">
          <div className="flex items-center justify-between px-2 pb-1.5">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Categories ({categories.length})
            </p>
          </div>
          {categories.map((cat) => {
            const isActive = pathname === cat.href;
            return (
              <Link
                key={cat.name}
                href={cat.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <cat.icon className={cn("h-4 w-4 shrink-0", cat.color)} />
                  <span className="truncate text-xs">{cat.name}</span>
                </div>
                {cat.count > 0 && (
                  <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                    {cat.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800",
            pathname === "/settings" && "bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800"
          )}
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Settings</span>
        </Link>
        {isDemoUser ? (
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Development Mode</span>
            </div>
          </div>
        ) : (
          <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>VIT-AP Sync Ready</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
