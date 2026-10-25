import { describe, expect, it } from "vitest";
import { DEMO_MATERIAL_PROFILES, initialSpecState } from "@/domain/calculations/roof-material-spec";
import { computeConstruction, constructionOutputSnapshot } from "@/features/calculators/construction-computation";
import { definitions } from "@/features/calculators/roof-calculator-definitions";
import { calculationQuoteCandidates, quotationQuantity } from "./calculation-quotation-source";

const timberOutput = constructionOutputSnapshot("roof.timber-cutlist", computeConstruction(definitions["roof.timber-cutlist"],
  { roofShape: "gable", lengthMm: "10000", widthMm: "8000", pitchDegrees: "35", eaveOverhangMm: "0" },
  { requested: { timber: true, underlay: false, covering: false }, layout: { rafterMaxSpacingMm: 900, rafterStartInsetMm: 0, rafterEndInsetMm: 0 },
    specs: { covering: initialSpecState(false), underlay: initialSpecState(false), rafter: { mode: "manual", profileId: null, entered: { sectionWidthMm: 75, sectionHeightMm: 150 } }, batten: initialSpecState(false) } },
  DEMO_MATERIAL_PROFILES));

describe("calculationQuoteCandidates", () => {
  it("offers only layout quantities and cut-list rows, with the keys the database resolves", () => {
    const { candidates, informational } = calculationQuoteCandidates(timberOutput);
    expect(candidates.map((candidate) => [candidate.sourceKey, candidate.unit, candidate.meaning])).toEqual(expect.arrayContaining([
      ["cut/rafters/0", "db", "CUT_LIST"], [expect.stringMatching(/^takeoff\/\d+\/\d+$/), "db", "LAYOUT"], [expect.stringMatching(/^takeoff\/\d+\/\d+$/), "m", "LAYOUT"],
    ]));
    expect(candidates.find((candidate) => candidate.sourceKey === "cut/rafters/0")).toMatchObject({ label: "Szarufa · 4883 mm", quantity: 26 });
    expect(candidates.some((candidate) => candidate.unit === "m³" || candidate.unit === "m²")).toBe(false);
    expect(informational.some((line) => line.unit === "m³")).toBe(true);
  });

  it("keeps single-element results such as rafter angles informational", () => {
    const rafter = constructionOutputSnapshot("roof.rafter-cut", computeConstruction(definitions["roof.rafter-cut"], { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" }, null, []));
    const { candidates, informational } = calculationQuoteCandidates(rafter);
    expect(candidates).toEqual([]);
    expect(informational.map((line) => line.label)).toContain("Tetőhajlás");
  });

  it("ignores malformed snapshots instead of inventing quantities", () => {
    expect(calculationQuoteCandidates(null)).toEqual({ candidates: [], informational: [] });
    expect(calculationQuoteCandidates({ takeoff: { parts: [{ label: "X", quantities: [{ label: "Y", value: "26", unit: "db", meaning: "LAYOUT" }] }] }, cutList: { rafters: [{ lengthMm: 1000, count: 0 }] } }).candidates).toEqual([]);
  });

  it("rounds the editable line quantity to six decimals", () => {
    expect(quotationQuantity(126.9612434)).toBe("126.961243");
    expect(quotationQuantity(26)).toBe("26");
  });
});
