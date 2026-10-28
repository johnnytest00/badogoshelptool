import { describe, expect, it } from "vitest";
import { getEffectiveTheme, getNextMode, getQuickToggleMode, getThemeChromeColor, getToggleLabel, isThemeMode } from "@/lib/theme";

describe("theme foundation", () => {
  it("cycles through system, light and dark modes", () => {
    expect(getNextMode("system")).toBe("light");
    expect(getNextMode("light")).toBe("dark");
    expect(getNextMode("dark")).toBe("system");
  });

  it("resolves system mode and exposes the next-mode label", () => {
    expect(getEffectiveTheme("system", true)).toBe("dark");
    expect(getEffectiveTheme("system", false)).toBe("light");
    expect(getToggleLabel("dark")).toBe("Világos");
    expect(getToggleLabel("light")).toBe("Sötét");
  });

  it("accepts only supported persisted modes", () => {
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("sepia")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it("makes the quick toggle explicit when system mode is active", () => {
    expect(getQuickToggleMode("dark")).toBe("light");
    expect(getQuickToggleMode("light")).toBe("dark");
  });

  it("matches the browser chrome color to the app's selected theme", () => {
    expect(getThemeChromeColor("light")).toBe("#f5f7fb");
    expect(getThemeChromeColor("dark")).toBe("#0b1220");
  });
});
