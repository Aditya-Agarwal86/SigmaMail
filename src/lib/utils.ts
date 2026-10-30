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

/**
 * Premium Restrained Category Metadata
 * Subtle pale sage / forest green / warm neutral badges instead of rainbow coloring
 */
export const CATEGORY_METADATA: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  DEAN_ACADEMICS: {
    label: "Dean Academics",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  REGISTRAR: {
    label: "Registrar",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  ASST_DEAN_ACADEMICS: {
    label: "Asst. Dean Academics",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  ACADEMICS: {
    label: "Academics",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  EXAMINATIONS: {
    label: "Examinations",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  CDC_AND_PLACEMENT: {
    label: "CDC & Placement",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  SDC: {
    label: "SDC",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  SCHOOLS: {
    label: "Schools",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  EVENTS_AND_CLUBS: {
    label: "Events & Clubs",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  TRANSPORT: {
    label: "Transport",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  HOSTEL: {
    label: "Hostel",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  SPORTS: {
    label: "Sports",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  OTHER: {
    label: "Other",
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  // Legacy backward mappings
  PLACEMENTS_AND_INTERNSHIPS: {
    label: "CDC & Placement",
    color: "text-primary",
    bg: "bg-secondary",
    border: "border-primary/25",
  },
  ADMINISTRATIVE_AND_HOSTEL: {
    label: "Hostel",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  GENERAL_ANNOUNCEMENTS: {
    label: "Other",
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  UNCATEGORIZED: {
    label: "Other",
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
};

/**
 * Restrained Priority Metadata
 * Genuine amber and red status colors used strictly for urgent / high priority
 */
export const PRIORITY_METADATA: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  URGENT: {
    label: "Urgent",
    color: "text-rose-700 dark:text-rose-400 font-semibold",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-600 dark:bg-rose-500",
  },
  HIGH: {
    label: "High",
    color: "text-amber-700 dark:text-amber-400 font-semibold",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-600 dark:bg-amber-500",
  },
  NORMAL: {
    label: "Normal",
    color: "text-muted-foreground",
    bg: "bg-muted/70",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
  LOW: {
    label: "Low",
    color: "text-muted-foreground/80",
    bg: "bg-muted/40",
    border: "border-border",
    dot: "bg-muted-foreground/60",
  },
};
