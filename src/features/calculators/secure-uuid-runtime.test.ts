import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/gutters/gutter-actions", () => ({ saveGutterCalculationAction: vi.fn(), createGutterTakeoffDraftAction: vi.fn() }));
vi.mock("@/features/flashings/flashing-actions", () => ({ saveFlashingCalculationAction: vi.fn(), createFlashingTakeoffDraftAction: vi.fn() }));
vi.mock("@/features/sheet-metal/profile-actions", () => ({ saveSheetMetalProfileAction: vi.fn(), createProfileTakeoffDraftAction: vi.fn() }));

import { GutterCalculator } from "@/features/gutters/gutter-calculator";
import { FlashingCalculator } from "@/features/flashings/flashing-calculator";
import { ProfileEditor } from "@/features/sheet-metal/profile-editor";

afterEach(() => vi.unstubAllGlobals());

describe("client calculator runtime without crypto.randomUUID", () => {
  it("renders all three calculator initial states through getRandomValues fallback", () => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => { bytes.fill(0x5a); return bytes; } });
    const gutter = renderToStaticMarkup(createElement(GutterCalculator, { organizationId: "org", projectId: "project", suggestions: [], saved: null, catalogVariants: [] }));
    const flashing = renderToStaticMarkup(createElement(FlashingCalculator, { organizationId: "org", projectId: "project", suggestions: [], saved: null, catalogVariants: [] }));
    const profile = renderToStaticMarkup(createElement(ProfileEditor, { organizationId: "org", projectId: "project", profiles: [], catalogCandidates: [] }));
    expect(gutter).toContain("Ereszcsatorna-kalkulátor");
    expect(flashing).toContain("Bádogos szegélyek kalkulátora");
    expect(profile).toContain("Lemezprofilok és hajtások");
  });
});
