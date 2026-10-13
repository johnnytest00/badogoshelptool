import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./gutter-actions", () => ({ saveGutterCalculationAction: vi.fn(), createGutterTakeoffDraftAction: vi.fn() }));

import { GutterCalculator } from "./gutter-calculator";

describe("ereszcsatorna-kalkulátor felülete", () => {
  it("nem kínál forrás nélküli szálhosszt és jelzi a lefolyótartozékok átadását", () => {
    const html = renderToStaticMarkup(createElement(GutterCalculator, {
      organizationId: "org", projectId: "project", suggestions: [], saved: null, catalogVariants: [],
    }));
    expect(html).toContain("Választott ereszcsatorna-szál hossza (mm)");
    expect(html).toContain("A könyökök a rajzon megjelennek, de nem kerülnek automatikusan az anyagkimutatásba.");
    expect(html).not.toContain('value="4000"');
    expect(html).not.toContain("F9.6.1.1.1");
  });
});
