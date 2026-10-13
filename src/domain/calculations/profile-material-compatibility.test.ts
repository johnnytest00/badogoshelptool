import { describe, expect, it } from "vitest";
import { matchProfileMaterial, type ProfileCatalogCandidate } from "@/domain/calculations/profile-material-compatibility";

const candidate: ProfileCatalogCandidate = {
  productId: "DEMO-product", productName: "DEMO lemez", variantId: "DEMO-variant", variantName: "DEMO variáns",
  category: "sheet_metal", status: "active", purchasingUnit: "square_meter", thicknessMm: 0.5,
  materialSpec: "DEMO-A", provenance: "user_provided", sourceName: "DEMO felhasználói adat",
};

describe("profile catalog technical match", () => {
  it("requires explicit identity, thickness, unit and provenance", () => {
    expect(matchProfileMaterial(candidate, "DEMO-A", 0.5)).toBe("TECHNICALLY_MATCHED_PARAMETERS");
    expect(matchProfileMaterial(null, "DEMO-A", 0.5)).toBe("UNRESOLVED");
    expect(matchProfileMaterial({ ...candidate, materialSpec: null }, "DEMO-A", 0.5)).toBe("UNRESOLVED");
    expect(matchProfileMaterial({ ...candidate, sourceName: null }, "DEMO-A", 0.5)).toBe("UNRESOLVED");
    expect(matchProfileMaterial({ ...candidate, thicknessMm: null }, "DEMO-A", 0.5)).toBe("UNRESOLVED");
    expect(matchProfileMaterial(candidate, "DEMO-B", 0.5)).toBe("INCOMPATIBLE");
    expect(matchProfileMaterial(candidate, "DEMO-A", 0.6)).toBe("INCOMPATIBLE");
    expect(matchProfileMaterial({ ...candidate, purchasingUnit: "piece" }, "DEMO-A", 0.5)).toBe("INCOMPATIBLE");
    expect(matchProfileMaterial({ ...candidate, status: "archived" }, "DEMO-A", 0.5)).toBe("INCOMPATIBLE");
  });
});
