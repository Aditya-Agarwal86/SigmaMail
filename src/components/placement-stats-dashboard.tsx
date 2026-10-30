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
      color: "text-amber-800",
      activeBg: "bg-amber-100/70 border-amber-400 ring-2 ring-amber-500/20",
      iconBg: "bg-amber-100 text-amber-800",
    },
    {
      key: "upcoming",
      label: "Upcoming Drives",
      count: stats.upcomingDrives,
      subtitle: "Announced future drives",
      icon: Calendar,
      color: "text-blue-800",
      activeBg: "bg-blue-100/70 border-blue-400 ring-2 ring-blue-500/20",
      iconBg: "bg-blue-100 text-blue-800",
    },
    {
      key: "completed",
      label: "Completed Drives",
      count: stats.completedDrives,
      subtitle: "Shortlists & offers concluded",
      icon: CheckCircle,
      color: "text-[#244A3A]",
      activeBg: "bg-[#E5EBE1] border-[#244A3A] ring-2 ring-[#244A3A]/20",
      iconBg: "bg-[#E5EBE1] text-[#244A3A]",
    },
    {
      key: "closing_soon",
      label: "Closing Soon",
      count: stats.closingSoon,
      subtitle: "Deadlines in < 3 days",
      icon: AlertCircle,
      color: "text-rose-800",
      activeBg: "bg-rose-100/70 border-rose-400 ring-2 ring-rose-500/20",
      iconBg: "bg-rose-100 text-rose-800",
    },
    {
      key: "total",
      label: "Total Opportunities",
      count: stats.totalDrives,
      subtitle: "All identified company drives",
      icon: Briefcase,
      color: "text-[#252923]",
      activeBg: "bg-[#E5EBE1] border-[#244A3A] ring-2 ring-[#244A3A]/20",
      iconBg: "bg-[#F0F2EB] text-[#252923]",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#697168] uppercase tracking-wider">
          Placement Activity Overview
        </span>
        {activeStat && (
          <Link
            href={createFilterUrl(null)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#244A3A] hover:underline"
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
              className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between group shadow-card ${
                isActive
                  ? `${card.activeBg} shadow-sm`
                  : "bg-white border-[#E1E5DC] hover:border-[#D3DCD0] hover:bg-[#FDFDFD]"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-[#252923] group-hover:text-[#244A3A] truncate">
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
                    <span className="text-[10px] font-semibold text-[#244A3A] bg-white/80 px-1.5 py-0.2 rounded border border-[#D3DCD0]">
                      Active Filter
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#697168] mt-0.5 truncate">{card.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
