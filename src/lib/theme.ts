export const themeModes = ["system", "light", "dark"] as const;
export const themeStorageKey = "tetopro-theme";

export type ThemeMode = (typeof themeModes)[number];

export function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && themeModes.includes(value as ThemeMode);
}

export function getNextMode(mode: ThemeMode): ThemeMode {
  const index = themeModes.indexOf(mode);
  return themeModes[(index + 1) % themeModes.length];
}

export function getEffectiveTheme(mode: ThemeMode, systemIsDark: boolean): Exclude<ThemeMode, "system"> {
  return mode === "system" ? (systemIsDark ? "dark" : "light") : mode;
}

export function getToggleLabel(effectiveTheme: Exclude<ThemeMode, "system">): string {
  return effectiveTheme === "dark" ? "Világos" : "Sötét";
}

export function getQuickToggleMode(effectiveTheme: Exclude<ThemeMode, "system">): Exclude<ThemeMode, "system"> {
  return effectiveTheme === "dark" ? "light" : "dark";
}
