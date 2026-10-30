"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Briefcase, Clock, Calendar, CheckCircle, AlertCircle, X } from "lucide-react";

export interface PlacementStatsData {
  ongoingDrives: number;
  upcomingDrives: number;
  completedDrives: number;
  closingSoon: number;
  totalDrives: number;
}

interface PlacementStatsDashboardProps {
  stats: PlacementStatsData;
  activeStat?: string;
}

export function PlacementStatsDashboard({ stats, activeStat }: PlacementStatsDashboardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createFilterUrl = (statKey: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!statKey || next.get("placementStat") === statKey) {
      next.delete("placementStat");
    } else {
      next.set("placementStat", statKey);
    }
    next.delete("page"); // reset pagination
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const cards = [
    {
      key: "ongoing",
      label: "Ongoing Drives",
      count: stats.ongoingDrives,
      subtitle: "Active recruiting / tests",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      activeBg: "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/20",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
      key: "upcoming",
      label: "Upcoming Drives",
      count: stats.upcomingDrives,
      subtitle: "Announced future drives",
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      activeBg: "bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/20",
      iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    },
    {
      key: "completed",
      label: "Completed Drives",
      count: stats.completedDrives,
      subtitle: "Shortlists & offers concluded",
      icon: CheckCircle,
      color: "text-primary",
      activeBg: "bg-primary/15 border-primary ring-2 ring-primary/20",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      key: "closing_soon",
      label: "Closing Soon",
      count: stats.closingSoon,
      subtitle: "Deadlines in < 3 days",
      icon: AlertCircle,
      color: "text-rose-600 dark:text-rose-400",
      activeBg: "bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/20",
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
    {
      key: "total",
      label: "Total Opportunities",
      count: stats.totalDrives,
      subtitle: "All identified company drives",
      icon: Briefcase,
      color: "text-foreground",
      activeBg: "bg-primary/15 border-primary ring-2 ring-primary/20",
      iconBg: "bg-muted text-foreground",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Placement Activity Overview
        </span>
        {activeStat && (
          <Link
            href={createFilterUrl(null)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <X className="h-3 w-3" />
            <span>Clear Statistics Filter</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {cards.map((card) => {
          const isActive = activeStat === card.key;
          const Icon = card.icon;

          return (
            <Link
              key={card.key}
              href={createFilterUrl(card.key)}
              className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between group shadow-xs ${
                isActive
                  ? `${card.activeBg}`
                  : "bg-card border-border hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                  {card.label}
                </span>
                <div
                  className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                    {card.count}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-primary bg-background/80 px-1.5 py-0.5 rounded border border-primary/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
