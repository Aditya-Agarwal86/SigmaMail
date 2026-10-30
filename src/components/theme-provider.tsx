"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AppearanceMode = "light" | "dark" | "system";

export type ColorThemeKey =
  | "sigma-green"
  | "ocean-blue"
  | "royal-purple"
  | "sunset-orange"
  | "rose-pink"
  | "emerald"
  | "teal"
  | "midnight";

export interface ColorThemeDefinition {
  key: ColorThemeKey;
  name: string;
  description: string;
  previewColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  {
    key: "sigma-green",
    name: "Sigma Green",
    description: "Original campus forest green identity",
    previewColor: "#244A3A",
    badgeBg: "bg-[#E5EBE1] dark:bg-[#1C3228]",
    badgeText: "text-[#244A3A] dark:text-[#4ADE80]",
    badgeBorder: "border-[#D3DCD0] dark:border-[#285240]",
  },
  {
    key: "ocean-blue",
    name: "Ocean Blue",
    description: "Professional cobalt & deep ocean tones",
    previewColor: "#1D58B5",
    badgeBg: "bg-blue-100 dark:bg-blue-950/70",
    badgeText: "text-blue-800 dark:text-blue-300",
    badgeBorder: "border-blue-200 dark:border-blue-800",
  },
  {
    key: "royal-purple",
    name: "Royal Purple",
    description: "Sophisticated plum and violet accents",
    previewColor: "#6B35A8",
    badgeBg: "bg-purple-100 dark:bg-purple-950/70",
    badgeText: "text-purple-800 dark:text-purple-300",
    badgeBorder: "border-purple-200 dark:border-purple-800",
  },
  {
    key: "sunset-orange",
    name: "Sunset Orange",
    description: "Warm amber and golden sunset glow",
    previewColor: "#C25310",
    badgeBg: "bg-amber-100 dark:bg-amber-950/70",
    badgeText: "text-amber-800 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
  },
  {
    key: "rose-pink",
    name: "Rose Pink",
    description: "Soft modern blush and rose palette",
    previewColor: "#BA2554",
    badgeBg: "bg-rose-100 dark:bg-rose-950/70",
    badgeText: "text-rose-800 dark:text-rose-300",
    badgeBorder: "border-rose-200 dark:border-rose-800",
  },
  {
    key: "emerald",
    name: "Emerald",
    description: "Deep jewel-toned emerald green",
    previewColor: "#0F764F",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/70",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    badgeBorder: "border-emerald-200 dark:border-emerald-800",
  },
  {
    key: "teal",
    name: "Modern Teal",
    description: "Fresh coastal teal and cyan hues",
    previewColor: "#156F6F",
    badgeBg: "bg-teal-100 dark:bg-teal-950/70",
    badgeText: "text-teal-800 dark:text-teal-300",
    badgeBorder: "border-teal-200 dark:border-teal-800",
  },
  {
    key: "midnight",
    name: "Midnight Indigo",
    description: "Executive midnight navy and blue steel",
    previewColor: "#1E3A78",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/70",
    badgeText: "text-indigo-800 dark:text-indigo-300",
    badgeBorder: "border-indigo-200 dark:border-indigo-800",
  },
];

interface ThemeContextType {
  appearance: AppearanceMode;
  colorTheme: ColorThemeKey;
  resolvedIsDark: boolean;
  setAppearance: (mode: AppearanceMode) => Promise<void>;
  setColorTheme: (theme: ColorThemeKey) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  appearance: "system",
  colorTheme: "sigma-green",
  resolvedIsDark: false,
  setAppearance: async () => {},
  setColorTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearanceMode>("system");
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>("sigma-green");
  const [systemIsDark, setSystemIsDark] = useState(false);

  // Monitor OS preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemIsDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch initial preferences from server or local storage
  useEffect(() => {
    // 1. Instant local read to prevent flash
    const localAppearance = localStorage.getItem("sigmamail_appearance") as AppearanceMode | null;
    const localTheme = localStorage.getItem("sigmamail_theme") as ColorThemeKey | null;

    if (localAppearance) setAppearanceState(localAppearance);
    if (localTheme) setColorThemeState(localTheme);

    // 2. Authoritative server sync
    fetch("/api/categories/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.appearanceMode) {
            setAppearanceState(data.appearanceMode as AppearanceMode);
            localStorage.setItem("sigmamail_appearance", data.appearanceMode);
          }
          if (data.colorTheme) {
            setColorThemeState(data.colorTheme as ColorThemeKey);
            localStorage.setItem("sigmamail_theme", data.colorTheme);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Calculate resolved dark state
  const resolvedIsDark =
    appearance === "dark" || (appearance === "system" && systemIsDark);

  // Apply dark class and data-theme attribute directly to documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (resolvedIsDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", colorTheme);
  }, [resolvedIsDark, colorTheme]);

  const setAppearance = async (mode: AppearanceMode) => {
    setAppearanceState(mode);
    localStorage.setItem("sigmamail_appearance", mode);

    try {
      await fetch("/api/categories/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearanceMode: mode }),
      });
    } catch (e) {
      console.error("Failed to persist appearance mode:", e);
    }
  };

  const setColorTheme = async (theme: ColorThemeKey) => {
    setColorThemeState(theme);
    localStorage.setItem("sigmamail_theme", theme);

    try {
      await fetch("/api/categories/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorTheme: theme }),
      });
    } catch (e) {
      console.error("Failed to persist color theme:", e);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        appearance,
        colorTheme,
        resolvedIsDark,
        setAppearance,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
