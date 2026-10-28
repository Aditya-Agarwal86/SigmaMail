import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244A3A] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none";
    
    const variants = {
      default: "bg-[#244A3A] text-white shadow-xs hover:bg-[#1B382C] active:bg-[#142820]",
      destructive: "bg-rose-700 text-white shadow-xs hover:bg-rose-800",
      outline: "border border-[#E1E5DC] bg-white text-[#252923] shadow-xs hover:bg-[#F7F8F4] hover:text-[#244A3A] hover:border-[#D3DCD0]",
      secondary: "bg-[#E5EBE1] text-[#244A3A] hover:bg-[#d9e2d4]",
      ghost: "text-[#697168] hover:bg-[#E5EBE1]/60 hover:text-[#252923]",
      link: "text-[#244A3A] underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-lg px-8 text-base",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
