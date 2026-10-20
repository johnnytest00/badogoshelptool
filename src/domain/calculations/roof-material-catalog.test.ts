import { describe, expect, it } from "vitest";
import { materialVariantInputSchema } from "@/domain/materials/contracts";
import type { MaterialProductRecord, MaterialVariantRecord } from "@/features/materials/material-data";
import { catalogProfilesFromProducts } from "./roof-material-catalog";
import { createCalculationSnapshot, replayRoofCalculation } from "./roof-calculation-snapshot";
import { resolveMaterialSpec, restoreProductValues, setSpecEntry, switchSpecMode, type SpecState } from "./roof-material-spec";

const variant = (over: Partial<MaterialVariantRecord> = {}): MaterialVariantRecord => ({ id: "v1", productId: "p1", name: "V", sku: "SKU-1", purchasingUnit: "piece", nominalWidthMm: 1_100, effectiveWidthMm: 1_000, thicknessMm: null, lengthMm: 4_000, packagingQuantity: null, technicalSpecs: { usable_covering_length_mm: "3900" }, provenance: "user_provided", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null, prices: [], priceOptions: [], latestPrice: null, ...over });
const product = (over: Partial<MaterialProductRecord> = {}): MaterialProductRecord => ({ id: "p1", organizationId: "o1", manufacturerId: null, manufacturerName: "Gyártó", category: "roof_covering", categoryId: "c1", categoryName: "Fedés", categoryActive: true, name: "Tábla", description: null, productCode: null, status: "active", provenance: "verified", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null, createdAt: "", updatedAt: "", variants: [variant()], ...over });
const pick = (id: string): SpecState => ({ mode: "product", profileId: id, entered: {} });

describe("catalog variant → roof MaterialProfile", () => {
  it("keeps identity, takes only present values and the weaker provenance", () => {
    const [profile] = catalogProfilesFromProducts([product()]);
    expect(profile).toMatchObject({ id: "v1", group: "covering", verification: "user_provided", catalog: { productId: "p1", variantId: "v1", sku: "SKU-1" }, values: { nominalWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, physicalLengthMm: 4_000, usableCoveringLengthMm: 3_900 } });
  });
  it("maps underlay and timber keys, skips invalid text, never invents missing values", () => {
    const underlay = catalogProfilesFromProducts([product({ category: "insulation", variants: [variant({ technicalSpecs: { roll_width_mm: "1500", roll_length_mm: "abc", side_overlap_mm: "0", installation_direction: "x" } })] })])[0];
    expect(underlay.values).toEqual({ rollWidthMm: 1_500, sideOverlapMm: 0 });
    const timber = catalogProfilesFromProducts([product({ category: "timber", variants: [variant({ technicalSpecs: { section_width_mm: "80", section_height_mm: "200" } })] })]);
    expect(timber.map((item) => item.group)).toEqual(["rafter", "batten"]);
    expect(timber[0].values).toEqual({ sectionWidthMm: 80, sectionHeightMm: 200 });
    expect(resolveMaterialSpec("rafter", pick("v1"), [underlay]).profile).toBeNull(); // wrong group
  });
  it("excludes archived products, inactive categories and other categories", () => {
    expect(catalogProfilesFromProducts([product({ status: "archived" }), product({ categoryActive: false }), product({ category: "other" }), product({ category: "gutter" })])).toEqual([]);
  });
  it("override → restore → manual transitions keep the catalog value intact", () => {
    const profiles = catalogProfilesFromProducts([product()]);
    let state = setSpecEntry(pick("v1"), "nominalWidthMm", 1_200);
    const spec = resolveMaterialSpec("covering", state, profiles);
    expect(spec).toMatchObject({ values: { nominalWidthMm: 1_200 }, overriddenKeys: ["nominalWidthMm"], productValues: { nominalWidthMm: 1_100 }, profile: { catalog: { variantId: "v1" } } });
    state = restoreProductValues(state, spec);
    expect(resolveMaterialSpec("covering", state, profiles).values.nominalWidthMm).toBe(1_100);
    state = switchSpecMode(state, "manual", resolveMaterialSpec("covering", state, profiles));
    const manual = resolveMaterialSpec("covering", state, profiles);
    expect(manual.profile).toBeNull();
    expect(Object.values(manual.sources).every((source) => source === "manual")).toBe(true);
  });
  it("reports unspecified product values as missing", () => {
    const profiles = catalogProfilesFromProducts([product({ variants: [variant({ nominalWidthMm: null, effectiveWidthMm: null, lengthMm: null, technicalSpecs: {} })] })]);
    expect(resolveMaterialSpec("covering", pick("v1"), profiles).missingKeys).toContain("physicalLengthMm");
  });
  it("snapshot with catalog identity replays identically after a JSON round trip", () => {
    const profiles = catalogProfilesFromProducts([product()]);
    const spec = resolveMaterialSpec("covering", pick("v1"), profiles);
    const snapshot = createCalculationSnapshot({ calculatorId: "roof.material-takeoff", roofShape: "shed", fields: { lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 30, eaveOverhangMm: 0 }, requested: { timber: false, underlay: false, covering: true }, timberLayout: {}, specs: [spec] });
    const copy = JSON.parse(JSON.stringify(snapshot));
    expect(copy.specifications.groups.covering.profile.catalog.variantId).toBe("v1");
    expect(replayRoofCalculation(copy)).toEqual(replayRoofCalculation(snapshot));
  });
});

describe("Anyagkezelő roof technical_specs validation", () => {
  const base = { productId: "00000000-0000-4000-8000-000000000001", name: "x", purchasingUnit: "piece", nominalWidthMm: null, effectiveWidthMm: null, thicknessMm: null, lengthMm: null, packagingQuantity: null, dataProvenance: "user_provided" };
  it("accepts valid, rejects invalid values, keeps legacy keys working", () => {
    const ok = (technicalSpecs: Record<string, string>) => materialVariantInputSchema.safeParse({ ...base, technicalSpecs }).success;
    expect(ok({ roll_width_mm: "1500", side_overlap_mm: "0", installation_direction: "eave-to-ridge", minimum_sheet_length_mm: "abc" })).toBe(true);
    expect(ok({ roll_width_mm: "0" })).toBe(false);
    expect(ok({ section_width_mm: "-5" })).toBe(false);
    expect(ok({ installation_direction: "sideways" })).toBe(false);
  });
});
