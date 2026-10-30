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
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load preferences and saved collapse state
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
    const savedCollapse = localStorage.getItem("sigmamail_sidebar_collapsed");
    if (savedCollapse === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sigmamail_sidebar_collapsed", String(next));
  };

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
      <aside
        className={cn(
          "border-r border-border bg-muted/50 flex flex-col justify-between shrink-0 overflow-hidden transition-all duration-300 relative",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-3.5 space-y-5 overflow-y-auto max-h-[calc(100vh-110px)]">
          {/* Brand & Collapse Toggle */}
          <div className="flex items-center justify-between px-1.5 pt-1">
            <Link href="/" className="flex items-center gap-2.5 truncate group">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0 transition-transform group-hover:scale-105">
                <Mail className="h-4 w-4" />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-foreground tracking-tight text-base leading-none">
                    SigmaMail
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">
                    vitapstudent.ac.in
                  </p>
                </div>
              )}
            </Link>
          </div>

          {/* Primary Mailbox Navigation */}
          <nav className="space-y-1">
            {!isCollapsed && (
              <p className="px-2 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Mailbox
              </p>
            )}
            {mainNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? `${item.name} (${item.count})` : undefined}
                  className={cn(
                    "flex items-center rounded-xl px-2.5 py-2 text-xs font-medium transition-all group relative",
                    isCollapsed ? "justify-center" : "justify-between",
                    isActive
                      ? "bg-secondary text-primary font-bold border border-primary/25 shadow-xs"
                      : "text-foreground hover:bg-secondary/40 hover:text-primary"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                        isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground"
                      )}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {item.count > 0 && !isCollapsed && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                        isActive
                          ? "bg-card text-primary border-primary/30"
                          : "bg-card text-muted-foreground border-border"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                  {isCollapsed && item.count > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Categories Navigation */}
          <nav className="space-y-0.5">
            <div className="flex items-center justify-between px-2 pb-1.5">
              {!isCollapsed && (
                <>
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Categories ({orderedCategories.length})
                  </p>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider"
                    title="Edit, reorder, rename, or hide categories"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
            {orderedCategories.map((cat) => {
              const isActive = pathname === cat.href;
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  title={isCollapsed ? `${cat.name} (${cat.count})` : undefined}
                  className={cn(
                    "flex items-center rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all group relative",
                    isCollapsed ? "justify-center" : "justify-between",
                    isActive
                      ? "bg-secondary text-primary font-bold border border-primary/25 shadow-xs"
                      : "text-foreground hover:bg-secondary/40 hover:text-primary"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <cat.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                        isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground"
                      )}
                    />
                    {!isCollapsed && <span className="truncate text-xs">{cat.name}</span>}
                  </div>
                  {cat.count > 0 && !isCollapsed && (
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.2 rounded-full border",
                        isActive
                          ? "bg-card text-primary border-primary/30"
                          : "bg-card text-muted-foreground border-border"
                      )}
                    >
                      {cat.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Settings & Collapse Controls */}
        <div className="p-3 border-t border-border space-y-2 bg-muted/40">
          <Link
            href="/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors",
              isCollapsed ? "justify-center" : "gap-2.5",
              pathname === "/settings" && "bg-secondary text-primary font-bold border border-primary/25"
            )}
          >
            <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>

          {/* Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors text-xs font-medium"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="text-[11px] font-medium">
              {isCollapsed ? "→" : "← Collapse Sidebar"}
            </span>
          </button>
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
