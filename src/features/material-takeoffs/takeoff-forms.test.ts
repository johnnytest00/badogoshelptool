import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MaterialVariantRecord } from "@/features/materials/material-data";

vi.mock("./takeoff-actions", () => ({
  addMaterialTakeoffStateAction: async () => ({ ok: false }),
  approveMaterialTakeoffStateAction: async () => ({ ok: false }),
}));

import { ApproveTakeoffForm, TakeoffItemForm } from "./takeoff-forms";

const variant = (purchasingUnit: MaterialVariantRecord["purchasingUnit"]): MaterialVariantRecord => ({
  id: purchasingUnit, productId: "product", name: `DEMO ${purchasingUnit}`, sku: null, purchasingUnit,
  nominalWidthMm: null, effectiveWidthMm: null, thicknessMm: null, lengthMm: null, packagingQuantity: null,
  technicalSpecs: {}, provenance: "demo", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null,
  prices: [], latestPrice: null,
});

describe("anyagkimutatás-tétel felülete", () => {
  it("a beszerzési egységeket magyarul és a kézi mennyiséget az alapállapotban mutatja", () => {
    const html = renderToStaticMarkup(createElement(TakeoffItemForm, {
      organizationId: "org", projectId: "project", takeoffId: "takeoff",
      variants: [variant("square_meter"), variant("linear_meter"), variant("piece")],
    }));
    expect(html).toContain("DEMO square_meter (négyzetméter)");
    expect(html).toContain("DEMO linear_meter (folyóméter)");
    expect(html).toContain("DEMO piece (db)");
    expect(html).toContain("Kézi mennyiség");
    expect(html).toContain("Felhasznált árverzió");
    expect(html).not.toContain("combinedRoofM2");
  });

  it("a jóváhagyás önálló, tördelhető és elkülönített akcióterületet kap", () => {
    const html = renderToStaticMarkup(createElement(ApproveTakeoffForm, { organizationId: "org", projectId: "project", takeoffId: "takeoff" }));
    expect(html).toContain('class="takeoff-approval-form"');
    expect(html).toContain("Kimutatás jóváhagyása");
  });
});
