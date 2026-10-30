"use client";

import { useState } from "react";
import { Sun, Moon, Laptop, Palette, Check } from "lucide-react";
import { useTheme, AppearanceMode, ColorThemeKey, COLOR_THEMES } from "@/components/theme-provider";

export function ThemeCustomizationPanel() {
  const { appearance, colorTheme, setAppearance, setColorTheme } = useTheme();
  const [savingMessage, setSavingMessage] = useState<string | null>(null);

  const appearanceOptions: Array<{
    mode: AppearanceMode;
    label: string;
    description: string;
    icon: any;
  }> = [
    {
      mode: "light",
      label: "Light Mode",
      description: "Warm neutral ivory background with soft contrasting card surfaces",
      icon: Sun,
    },
    {
      mode: "dark",
      label: "Dark Mode",
      description: "Deep charcoal background with elevated surfaces for night reading",
      icon: Moon,
    },
    {
      mode: "system",
      label: "System Default",
      description: "Automatically match your operating system's appearance setting",
      icon: Laptop,
    },
  ];

  const handleAppearanceChange = async (mode: AppearanceMode) => {
    await setAppearance(mode);
    setSavingMessage(`Switched appearance to ${mode}`);
    setTimeout(() => setSavingMessage(null), 3000);
  };

  const handleColorThemeChange = async (themeKey: ColorThemeKey) => {
    await setColorTheme(themeKey);
    const found = COLOR_THEMES.find((t) => t.key === themeKey);
    setSavingMessage(`Accent theme updated to ${found?.name || themeKey}`);
    setTimeout(() => setSavingMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Appearance Mode Selection */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
              <Sun className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Appearance Mode
              </h3>
              <p className="text-xs text-muted-foreground">
                Choose how SigmaMail looks across day and night sessions
              </p>
            </div>
          </div>

          {savingMessage && (
            <span className="text-xs text-primary font-medium animate-in fade-in">
              {savingMessage}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {appearanceOptions.map((opt) => {
            const isSelected = appearance === opt.mode;
            const Icon = opt.icon;

            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => handleAppearanceChange(opt.mode)}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                  isSelected
                    ? "bg-secondary/40 border-primary ring-2 ring-primary/20 shadow-xs"
                    : "bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground">
                    {opt.label}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Accent Color Theme Selection */}
      <div className="p-6 rounded-xl bg-card border border-border shadow-card space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Accent Color Palette
            </h3>
            <p className="text-xs text-muted-foreground">
              Personalize primary action colors, highlights, badges, and focus rings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {COLOR_THEMES.map((theme) => {
            const isSelected = colorTheme === theme.key;

            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => handleColorThemeChange(theme.key)}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                  isSelected
                    ? "bg-secondary/40 border-primary ring-2 ring-primary/20 shadow-xs"
                    : "bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className="h-6 w-6 rounded-full shadow-xs border border-white/40 flex items-center justify-center"
                      style={{ backgroundColor: theme.previewColor }}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">
                    {theme.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
