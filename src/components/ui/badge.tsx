import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "forest";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[#244A3A] text-white hover:bg-[#1B382C]",
    forest: "bg-[#244A3A] text-white hover:bg-[#1B382C]",
    secondary: "bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]",
    destructive: "bg-rose-50 text-rose-800 border border-rose-200",
    outline: "border border-[#E1E5DC] bg-white text-[#252923]",
    warning: "bg-amber-50 text-amber-900 border border-amber-200",
    success: "bg-[#E5EBE1] text-[#244A3A] border border-[#D3DCD0]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
