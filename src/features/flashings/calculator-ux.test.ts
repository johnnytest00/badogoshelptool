import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./flashing-actions", () => ({ saveFlashingCalculationAction: vi.fn(), createFlashingTakeoffDraftAction: vi.fn() }));
vi.mock("@/features/sheet-metal/profile-actions", () => ({ saveSheetMetalProfileAction: vi.fn(), createProfileTakeoffDraftAction: vi.fn() }));

import { FlashingCalculator } from "./flashing-calculator";
import { ProfileEditor } from "@/features/sheet-metal/profile-editor";

describe("szegély- és profilkalkulátor szakmai feliratai", () => {
  it("a szegélynél a további szál hasznos hosszát nevezi meg", () => {
    const html = renderToStaticMarkup(createElement(FlashingCalculator, {
      organizationId: "org", projectId: "project", suggestions: [], saved: null, catalogVariants: [],
    }));
    expect(html).toContain("Toldásonkénti átfedést adok meg");
    expect(html).toContain("Minden további szál hasznos fedési hosszát adom meg");
    expect(html).toContain("Átfedés nélküli kapcsolatot csak akkor adj meg");
    expect(html).toContain("Új, még nem mentett számítás");
    expect(html).not.toContain("F9.6.2");
  });
  it("a profilnál a tangensméretet, irányt és a BA/K forrásigényét mutatja", () => {
    const html = renderToStaticMarkup(createElement(ProfileEditor, {
      organizationId: "org", projectId: "project", profiles: [], catalogCandidates: [],
    }));
    expect(html).toContain("tangenciapontok közötti");
    expect(html).toContain("Az elfordulás balra pozitív, jobbra negatív");
    expect(html).toContain("A rendszer nem állít be gyártási alapértéket");
    expect(html).not.toContain("F9.6.3.4.1");
  });
});
