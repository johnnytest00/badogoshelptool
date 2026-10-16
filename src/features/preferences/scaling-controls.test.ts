import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScalingProvider } from "./scaling-provider";
import { ScalingControls } from "./scaling-controls";
import { parseScalingPreferences, persistScalingPreferences, resetScalingPreferences, scalingDefaults, scalingStorageKey, serializeScalingPreferences, updateScaling } from "./scaling";

describe("F9.7.4 display preferences", () => {
  it("uses the larger UI default and permits a practical smaller interface scale", () => {
    expect(scalingDefaults.ui).toBe(115);
    expect(updateScaling(scalingDefaults, "ui", 80).ui).toBe(80);
    expect(parseScalingPreferences(serializeScalingPreferences({ ...scalingDefaults, ui: 120 })).ui).toBe(120);
  });

  it("adjusts sliders independently and persists the fourth spacing preference", () => {
    const next = updateScaling(scalingDefaults, "text", 150);
    const adjusted = updateScaling(next, "spacing", 125);
    expect(adjusted).toEqual({ text: 150, ui: 115, drawing: 100, spacing: 125 });
    expect(parseScalingPreferences(serializeScalingPreferences(adjusted))).toEqual(adjusted);
    expect(parseScalingPreferences(null)).toEqual(scalingDefaults);
  });

  it("persists preferences and stores defaults when reset is requested", () => {
    const stored = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => stored.set(key, value) };
    persistScalingPreferences(storage, { text: 160, ui: 120, drawing: 140, spacing: 130 });
    expect(JSON.parse(stored.get(scalingStorageKey)!)).toMatchObject({ text: 160, ui: 120, drawing: 140, spacing: 130 });
    expect(resetScalingPreferences(storage)).toEqual(scalingDefaults);
    expect(parseScalingPreferences(stored.get(scalingStorageKey)!)).toEqual(scalingDefaults);
  });

  it("renders four labelled keyboard-operable range controls and reset action", () => {
    const html = renderToStaticMarkup(createElement(ScalingProvider, null, createElement(ScalingControls, { compact: true })));
    expect((html.match(/type="range"/g) ?? []).length).toBe(4);
    expect(html).toContain("Szövegméret");
    expect(html).toContain("Gombok és vezérlők mérete");
    expect(html).toContain("Felület térközei");
    expect(html).toContain("Műszaki rajz megjelenítése");
    expect(html).toContain("Alapértelmezett beállítások");
  });

  it("can render only the two independent quick controls without a reset action", () => {
    const html = renderToStaticMarkup(createElement(ScalingProvider, null, createElement(ScalingControls, { compact: true, keys: ["text", "ui"], labels: { text: "Szövegméret", ui: "Felületméret" }, showReset: false, idPrefix: "quick-scale" })));
    expect((html.match(/type="range"/g) ?? []).length).toBe(2);
    expect(html).toContain("Szövegméret");
    expect(html).toContain("Felületméret");
    expect(html).not.toContain("Műszaki rajz");
    expect(html).not.toContain("Alapértelmezett beállítások");
    expect(html).toContain('id="quick-scale-text"');
    expect(html).toContain('id="quick-scale-ui"');
  });
});
