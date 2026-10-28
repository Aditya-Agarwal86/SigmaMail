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
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  REGISTRAR: {
    label: "Registrar",
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  ASST_DEAN_ACADEMICS: {
    label: "Asst. Dean Academics",
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  ACADEMICS: {
    label: "Academics",
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  EXAMINATIONS: {
    label: "Examinations",
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  CDC_AND_PLACEMENT: {
    label: "CDC & Placement",
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  SDC: {
    label: "SDC",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  SCHOOLS: {
    label: "Schools",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  EVENTS_AND_CLUBS: {
    label: "Events & Clubs",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  TRANSPORT: {
    label: "Transport",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  HOSTEL: {
    label: "Hostel",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  SPORTS: {
    label: "Sports",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  OTHER: {
    label: "Other",
    color: "text-[#697168]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  // Legacy backward mappings
  PLACEMENTS_AND_INTERNSHIPS: {
    label: "CDC & Placement",
    color: "text-[#244A3A]",
    bg: "bg-[#E5EBE1]",
    border: "border-[#D3DCD0]",
  },
  ADMINISTRATIVE_AND_HOSTEL: {
    label: "Hostel",
    color: "text-[#252923]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  GENERAL_ANNOUNCEMENTS: {
    label: "Other",
    color: "text-[#697168]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
  },
  UNCATEGORIZED: {
    label: "Other",
    color: "text-[#697168]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
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
    color: "text-rose-800",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-600",
  },
  HIGH: {
    label: "High",
    color: "text-amber-900",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-600",
  },
  NORMAL: {
    label: "Normal",
    color: "text-[#697168]",
    bg: "bg-[#F0F2EB]",
    border: "border-[#E1E5DC]",
    dot: "bg-[#8C948B]",
  },
  LOW: {
    label: "Low",
    color: "text-[#8C948B]",
    bg: "bg-[#F7F8F4]",
    border: "border-[#E1E5DC]",
    dot: "bg-[#697168]",
  },
};
