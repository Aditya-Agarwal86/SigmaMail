import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Converts a Date to an Asia/Kolkata date key string (YYYY-MM-DD)
 */
export function getKolkataDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Calculates calendar day difference in Asia/Kolkata between target and today
 */
export function getKolkataDayDifference(date: Date | string): number {
  const targetKey = getKolkataDateKey(date);
  const todayKey = getKolkataDateKey(new Date());

  const targetMidnight = new Date(`${targetKey}T00:00:00+05:30`).getTime();
  const todayMidnight = new Date(`${todayKey}T00:00:00+05:30`).getTime();

  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

export function formatDueDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffDays = getKolkataDayDifference(d);

  if (diffDays < 0) {
    if (diffDays === -1) return "Overdue (Yesterday)";
    return `Overdue (${Math.abs(diffDays)}d ago)`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `Due in ${diffDays} days`;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export const CATEGORY_METADATA: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  DEAN_ACADEMICS: {
    label: "Dean Academics",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-200 dark:border-purple-800",
  },
  REGISTRAR: {
    label: "Registrar",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  ASST_DEAN_ACADEMICS: {
    label: "Asst. Dean Academics",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/50",
    border: "border-violet-200 dark:border-violet-800",
  },
  ACADEMICS: {
    label: "Academics",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
  },
  EXAMINATIONS: {
    label: "Examinations",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-200 dark:border-red-800",
  },
  CDC_AND_PLACEMENT: {
    label: "CDC & Placement",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
  },
  SDC: {
    label: "SDC",
    color: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-950/50",
    border: "border-teal-200 dark:border-teal-800",
  },
  SCHOOLS: {
    label: "Schools",
    color: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-50 dark:bg-cyan-950/50",
    border: "border-cyan-200 dark:border-cyan-800",
  },
  EVENTS_AND_CLUBS: {
    label: "Events & Clubs",
    color: "text-pink-700 dark:text-pink-300",
    bg: "bg-pink-50 dark:bg-pink-950/50",
    border: "border-pink-200 dark:border-pink-800",
  },
  TRANSPORT: {
    label: "Transport",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    border: "border-orange-200 dark:border-orange-800",
  },
  HOSTEL: {
    label: "Hostel",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  SPORTS: {
    label: "Sports",
    color: "text-yellow-800 dark:text-yellow-300",
    bg: "bg-yellow-50 dark:bg-yellow-950/50",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  OTHER: {
    label: "Other",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
  },
  // Legacy backward mappings
  PLACEMENTS_AND_INTERNSHIPS: {
    label: "CDC & Placement",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
  },
  ADMINISTRATIVE_AND_HOSTEL: {
    label: "Hostel",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  GENERAL_ANNOUNCEMENTS: {
    label: "Other",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900",
    border: "border-slate-200 dark:border-slate-800",
  },
  UNCATEGORIZED: {
    label: "Other",
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    border: "border-zinc-300 dark:border-zinc-700",
  },
};

export const PRIORITY_METADATA: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  URGENT: {
    label: "Urgent",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/60",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  HIGH: {
    label: "High",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/60",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  NORMAL: {
    label: "Normal",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  LOW: {
    label: "Low",
    color: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-100/70 dark:bg-zinc-900",
    border: "border-zinc-200 dark:border-zinc-800",
    dot: "bg-zinc-400",
  },
};
