"use client";

import { Moon, Sun } from "lucide-react";
import { getQuickToggleMode, getToggleLabel } from "@/lib/theme";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { mode, effectiveTheme, setMode } = useTheme();
  const nextModeLabel = getToggleLabel(effectiveTheme);
  const Icon = effectiveTheme === "dark" ? Sun : Moon;

  return (
    <button className="theme-toggle" type="button" onClick={() => setMode(getQuickToggleMode(effectiveTheme))} aria-label={`Váltás: ${nextModeLabel}`} title={`Váltás: ${nextModeLabel}`} data-theme-mode={mode}>
      <Icon aria-hidden="true" className="size-4" />
      <span>{nextModeLabel}</span>
    </button>
  );
}
