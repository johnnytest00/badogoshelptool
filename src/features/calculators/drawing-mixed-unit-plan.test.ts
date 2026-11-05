import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { processPdfDocument } from "@/infrastructure/drawings/pdf-text-extractor";
import { classifyDrawingPlan, requiresRoofGeometryConfirmation } from "./drawing-field-transfer";
import { decideQuickTransfer } from "./drawing-quick-transfer";
import { definitions } from "./roof-calculator-definitions";

/**
 * P0 QA on a real parse of a synthetic DEMO mixed-unit plan (`synthetic-mixed-unit-plan.pdf`): the dimension chain is
 * in m, the openings in cm and the wall sizes in mm, so several labels are written identically but mean 10x or 100x
 * apart. The page title is deliberately spelled "FOELDSZINTI", the way a plan that avoids accented glyphs would be,
 * so the keyword suggestion misses it — which is exactly the gap P0-2 closes by asking the user instead.
 */
const takeoff = definitions["roof.material-takeoff"];

async function pages() {
  const bytes = new Uint8Array(await readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-mixed-unit-plan.pdf")));
  return (await processPdfDocument(bytes)).pages;
}
const spanOf = (sources: Awaited<ReturnType<typeof pages>>[number]["textSpans"], text: string) =>
  sources.find(({ originalText }) => originalText.trim() === text)!;

describe("mixed-unit plan, real PDF.js parse (P0 QA)", () => {
  it("asks for the unit of every unitless label and keeps the two readings of one written form apart", async () => {
    const [first] = await pages();
    const decide = (text: string, labelUnit?: "mm" | "cm" | "m") =>
      decideQuickTransfer({ definition: takeoff, current: { roofShape: "gable" }, fieldKey: "lengthMm", source: spanOf(first!.textSpans, text), labelUnit, scopeIssue: "", pageSources: first!.textSpans });

    // Chain in m, openings in cm, wall sizes in mm: all unitless, so each one asks on its own.
    for (const text of ["17,00", "14,50", "90", "120", "1250", "3600"]) {
      expect(decide(text), text).toMatchObject({ kind: "needs-unit", reason: expect.stringMatching(/csak erre a feliratra/u) });
    }
    // The 10x case: "1250" is a wall in mm, but nothing in its written form rules out cm. Both readings are
    // reachable only by an explicit answer for this label, and both stay inside the field contract.
    expect(decide("1250", "mm")).toMatchObject({ kind: "apply", value: "1250" });
    expect(decide("1250", "cm")).toMatchObject({ kind: "apply", value: "12500" });
    // A printed unit never asks and never takes the answer given for another label.
    expect(decide("8,20 m", "cm")).toMatchObject({ kind: "apply", value: "8200", sourceUnit: "m", unitOrigin: "pdf" });
    // Rejected outright, whatever unit is offered.
    for (const text of ["4,0%", "30x50"]) expect(decide(text, "m").kind, text).toBe("reject");
    expect(decide("43,38 m", "m")).toMatchObject({ kind: "reject", reason: expect.stringMatching(/felső index/u) });
  });

  it("gives no plan-kind suggestion for an unaccented title, and then guards every page until the user answers", async () => {
    const parsed = await pages();
    expect(parsed).toHaveLength(2);
    // The keyword suggestion is spelling-bound and misses this title: before P0-2 that meant no guard at all.
    expect(classifyDrawingPlan(parsed[0]!.textSpans)).toBeNull();
    expect(requiresRoofGeometryConfirmation(takeoff, "", "lengthMm")).toBe(true);
    // The answer is per page: declaring page 2 a roof plan must not unguard page 1.
    expect(requiresRoofGeometryConfirmation(takeoff, "roof-plan", "lengthMm")).toBe(false);
    expect(requiresRoofGeometryConfirmation(takeoff, "floor-plan", "lengthMm")).toBe(true);
  });
});
