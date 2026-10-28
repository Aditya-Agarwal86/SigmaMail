import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning" | "success";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    destructive: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
    outline: "border border-slate-300 text-slate-800 dark:border-slate-700 dark:text-slate-200",
    warning: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
