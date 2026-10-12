"use client";

import { Moon, Sun } from "lucide-react";
import { getNextMode, getToggleLabel } from "@/lib/theme";
import { useTheme } from "@/components/theme/theme-provider";

const modeLabels = {
  system: "Rendszer szerint",
  light: "Világos",
  dark: "Sötét",
} as const;

export function ThemeToggle() {
  const { mode, effectiveTheme, setMode } = useTheme();
  const nextModeLabel = getToggleLabel(effectiveTheme);
  const Icon = effectiveTheme === "dark" ? Sun : Moon;

  return (
    <div className="theme-controls" aria-label="Téma beállításai">
      <label className="sr-only" htmlFor="theme-mode">Téma módja</label>
      <select id="theme-mode" className="theme-select" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
        {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button className="theme-toggle" type="button" onClick={() => setMode(getNextMode(mode))} aria-label={`Váltás: ${nextModeLabel}`}>
        <Icon aria-hidden="true" className="size-4" />
        <span>{nextModeLabel}</span>
      </button>
    </div>
  );
}
