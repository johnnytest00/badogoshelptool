import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScalingProvider } from "./scaling-provider";
import { ScalingControls } from "./scaling-controls";
import { parseScalingPreferences, persistScalingPreferences, resetScalingPreferences, scalingDefaults, scalingStorageKey, serializeScalingPreferences, updateScaling } from "./scaling";

describe("F9.7.4 display preferences", () => {
  it("keeps text size as the only adjustable display scale", () => {
    expect(scalingDefaults.text).toBe(100);
    expect(updateScaling(scalingDefaults, "text", 150).text).toBe(150);
    expect(Object.hasOwn(scalingDefaults, "ui")).toBe(false);
    expect(Object.hasOwn(scalingDefaults, "drawing")).toBe(false);
    expect(Object.hasOwn(scalingDefaults, "spacing")).toBe(false);
  });

  it("keeps the mobile sticky control enabled for existing settings and persists its preference", () => {
    const legacy = JSON.stringify({ version: 1, text: 110, ui: 115, drawing: 100, spacing: 100 });
    expect(parseScalingPreferences(legacy).mobileStickyEnabled).toBe(true);
    const next = { ...scalingDefaults, mobileStickyEnabled: false };
    expect(parseScalingPreferences(serializeScalingPreferences(next)).mobileStickyEnabled).toBe(false);
  });

  it("persists the text size without storing removed scale options", () => {
    const next = updateScaling(scalingDefaults, "text", 150);
    expect(next).toEqual({ ...scalingDefaults, text: 150 });
    expect(parseScalingPreferences(serializeScalingPreferences(next))).toEqual(next);
    expect(parseScalingPreferences(null)).toEqual(scalingDefaults);
  });

  it("persists preferences and stores defaults when reset is requested", () => {
    const stored = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => stored.set(key, value) };
    persistScalingPreferences(storage, { ...scalingDefaults, text: 160 });
    expect(JSON.parse(stored.get(scalingStorageKey)!)).toMatchObject({ text: 160 });
    expect(Object.hasOwn(JSON.parse(stored.get(scalingStorageKey)!), "ui")).toBe(false);
    expect(resetScalingPreferences(storage)).toEqual(scalingDefaults);
    expect(parseScalingPreferences(stored.get(scalingStorageKey)!)).toEqual(scalingDefaults);
  });

  it("renders one labelled keyboard-operable text range and reset action", () => {
    const html = renderToStaticMarkup(createElement(ScalingProvider, null, createElement(ScalingControls, { compact: true })));
    expect((html.match(/type="range"/g) ?? []).length).toBe(1);
    expect(html).toContain("Szövegméret");
    expect(html).not.toContain("Felületméret");
    expect(html).not.toContain("Műszaki rajz");
    expect(html).not.toContain("Felület térközei");
    expect(html).toContain("Alapértelmezett beállítások");
  });
});
