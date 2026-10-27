import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuotationItemOverlapWarning } from "./quotation-item-overlap-warning";
import type { PotentialOverlapLine } from "./quotation-item-overlaps";

const lines: PotentialOverlapLine[] = [
  { id: "material-1", type: "MATERIAL" as const, description: "Szarufa", quantity: "36", unit: "piece", sourceMaterialItemId: "material-1" },
  { id: "calculation-1", type: "MATERIAL" as const, description: " szarufa ", quantity: "36", unit: "db", calculationSourceKey: "cut/rafters/0" },
];

describe("QuotationItemOverlapWarning", () => {
  it("renders a non-blocking warning with each source, revision, quantity, and unit", () => {
    const html = renderToStaticMarkup(<QuotationItemOverlapWarning
      lines={lines}
      materialSourceLabel="Anyaglista · DEMO tető · V2"
      calculationSourceLabel="Kalkuláció · DEMO tető · V1"
    />);

    expect(html).toContain('role="status"');
    expect(html).toContain("Lehetséges átfedés az ajánlati tételek között");
    expect(html).toContain("Anyaglista · DEMO tető · V2");
    expect(html).toContain("Kalkuláció · DEMO tető · V1");
    expect(html.match(/36/g)).toHaveLength(2);
    expect(html).toContain("A rendszer egyik tételt sem módosította.");
  });

  it("renders nothing when there is no cross-source match", () => {
    expect(renderToStaticMarkup(<QuotationItemOverlapWarning lines={lines.slice(0, 1)} materialSourceLabel="Anyaglista" calculationSourceLabel="Kalkuláció" />)).toBe("");
  });
});
