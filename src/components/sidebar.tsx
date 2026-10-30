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
  Mail,
  Award,
  Bus,
  Trophy,
  Users,
  Code2,
  Layers,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { CategoryManagerModal } from "@/components/category-manager-modal";
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
      badgeColor: "bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]",
    },
  ];

  // 13 Canonical Categories with stable IDs
  const rawCategories = [
    {
      id: "DEAN_ACADEMICS",
      name: "Dean Academics",
      href: "/categories/DEAN_ACADEMICS",
      icon: Award,
      count: stats.byCategory["DEAN_ACADEMICS"] || 0,
    },
    {
      id: "REGISTRAR",
      name: "Registrar",
      href: "/categories/REGISTRAR",
      icon: Building2,
      count: stats.byCategory["REGISTRAR"] || 0,
    },
    {
      id: "ASST_DEAN_ACADEMICS",
      name: "Asst. Dean Academics",
      href: "/categories/ASST_DEAN_ACADEMICS",
      icon: Award,
      count: stats.byCategory["ASST_DEAN_ACADEMICS"] || 0,
    },
    {
      id: "ACADEMICS",
      name: "Academics",
      href: "/categories/ACADEMICS",
      icon: GraduationCap,
      count: stats.byCategory["ACADEMICS"] || 0,
    },
    {
      id: "EXAMINATIONS",
      name: "Examinations",
      href: "/categories/EXAMINATIONS",
      icon: FileCheck2,
      count: stats.byCategory["EXAMINATIONS"] || 0,
    },
    {
      id: "CDC_AND_PLACEMENT",
      name: "CDC & Placement",
      href: "/categories/CDC_AND_PLACEMENT",
      icon: Briefcase,
      count: (stats.byCategory["CDC_AND_PLACEMENT"] || 0) + (stats.byCategory["PLACEMENTS_AND_INTERNSHIPS"] || 0),
    },
    {
      id: "SDC",
      name: "SDC",
      href: "/categories/SDC",
      icon: Code2,
      count: stats.byCategory["SDC"] || 0,
    },
    {
      id: "SCHOOLS",
      name: "Schools",
      href: "/categories/SCHOOLS",
      icon: Layers,
      count: stats.byCategory["SCHOOLS"] || 0,
    },
    {
      id: "EVENTS_AND_CLUBS",
      name: "Events & Clubs",
      href: "/categories/EVENTS_AND_CLUBS",
      icon: PartyPopper,
      count: stats.byCategory["EVENTS_AND_CLUBS"] || 0,
    },
    {
      id: "TRANSPORT",
      name: "Transport",
      href: "/categories/TRANSPORT",
      icon: Bus,
      count: stats.byCategory["TRANSPORT"] || 0,
    },
    {
      id: "HOSTEL",
      name: "Hostel",
      href: "/categories/HOSTEL",
      icon: Users,
      count: (stats.byCategory["HOSTEL"] || 0) + (stats.byCategory["ADMINISTRATIVE_AND_HOSTEL"] || 0),
    },
    {
      id: "SPORTS",
      name: "Sports",
      href: "/categories/SPORTS",
      icon: Trophy,
      count: stats.byCategory["SPORTS"] || 0,
    },
    {
      id: "OTHER",
      name: "Other",
      href: "/categories/OTHER",
      icon: HelpCircle,
      count: (stats.byCategory["OTHER"] || 0) + (stats.byCategory["GENERAL_ANNOUNCEMENTS"] || 0) + (stats.byCategory["UNCATEGORIZED"] || 0),
    },
  ];

  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Load custom preferences on mount
  const fetchPreferences = () => {
    fetch("/api/categories/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (Array.isArray(data.categoryOrder)) setCategoryOrder(data.categoryOrder);
          if (Array.isArray(data.hiddenCategories)) setHiddenCategories(data.hiddenCategories);
          if (data.categoryNames && typeof data.categoryNames === "object") setCategoryNames(data.categoryNames);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  // Apply custom ordering, display names, and filter out hidden categories
  const orderedCategories = useMemo(() => {
    const list = rawCategories.map((cat) => ({
      ...cat,
      name: categoryNames[cat.id] || cat.name,
    }));
    if (categoryOrder && categoryOrder.length > 0) {
      const orderMap = new Map(categoryOrder.map((id, index) => [id, index]));
      list.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
        return idxA - idxB;
      });
    }
    return list.filter((cat) => !hiddenCategories.includes(cat.id));
  }, [categoryOrder, hiddenCategories, categoryNames, stats]);

  return (
    <>
      <aside className="w-64 border-r border-[#E1E5DC] bg-[#F0F2EB] flex flex-col justify-between shrink-0 overflow-hidden">
        <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-110px)]">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="h-9 w-9 rounded-xl bg-[#244A3A] flex items-center justify-center text-white shadow-xs">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-[#252923] tracking-tight text-base">SigmaMail</h1>
              <p className="text-[11px] text-[#697168] font-medium">vitapstudent.ac.in</p>
            </div>
          </div>

          {/* Primary Views */}
          <nav className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-[#697168] uppercase">
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
                      ? "bg-[#E5EBE1] text-[#244A3A] font-semibold border border-[#D3DCD0]"
                      : "text-[#252923] hover:bg-[#E5EBE1]/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-4 w-4", isActive ? "text-[#244A3A]" : "text-[#697168]")} />
                    <span>{item.name}</span>
                  </div>
                  {item.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        item.badgeColor || (isActive ? "bg-white text-[#244A3A]" : "bg-white/80 text-[#697168] border border-[#E1E5DC]")
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
              <p className="text-[11px] font-semibold tracking-wider text-[#697168] uppercase">
                Categories ({orderedCategories.length})
              </p>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-[11px] font-semibold text-[#244A3A] hover:underline flex items-center gap-1"
                title="Edit, reorder, or hide categories"
              >
                Edit
              </button>
            </div>
            {orderedCategories.map((cat) => {
              const isActive = pathname === cat.href;
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#E5EBE1] text-[#244A3A] font-semibold border border-[#D3DCD0]"
                      : "text-[#252923] hover:bg-[#E5EBE1]/50"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <cat.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#244A3A]" : "text-[#697168]")} />
                    <span className="truncate text-xs">{cat.name}</span>
                  </div>
                  {cat.count > 0 && (
                    <span className="text-[11px] text-[#697168] font-medium bg-white px-1.5 py-0.5 rounded-full border border-[#E1E5DC]">
                      {cat.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-[#E1E5DC] space-y-2 bg-[#F0F2EB]">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-[#252923] hover:bg-[#E5EBE1]/60 transition-colors",
            pathname === "/settings" && "bg-[#E5EBE1] text-[#244A3A] font-semibold border border-[#D3DCD0]"
          )}
        >
          <Settings className="h-4 w-4 text-[#697168]" />
          <span>Settings</span>
        </Link>
        {isDemoUser ? (
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span>Development Mode</span>
            </div>
          </div>
        ) : (
          <div className="px-2.5 py-1.5 rounded-lg bg-[#E5EBE1] border border-[#D3DCD0]">
            <div className="flex items-center gap-1.5 text-[#244A3A] font-semibold text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#244A3A]" />
              <span>VIT-AP Sync Ready</span>
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* Category Customization Modal */}
    <CategoryManagerModal
      isOpen={isCategoryModalOpen}
      onClose={() => setIsCategoryModalOpen(false)}
      categories={rawCategories}
      hiddenCategories={hiddenCategories}
      categoryOrder={categoryOrder}
      categoryNames={categoryNames}
      onPreferencesUpdated={fetchPreferences}
    />
  </>
  );
}
