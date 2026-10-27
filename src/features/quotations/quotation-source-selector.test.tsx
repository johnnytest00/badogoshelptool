import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuotationSourceSelector } from "./quotation-source-selector";

describe("QuotationSourceSelector", () => {
  it("offers an exact material-list and calculation revision in one submission", () => {
    const html = renderToStaticMarkup(<QuotationSourceSelector
      organizationId="org-1"
      materialRevisions={[{ value: "list-1|list-rev-2", label: "DEMO anyaglista · V2" }]}
      calculationRevisions={[{ value: "calc-1|calc-rev-3", label: "DEMO kalkuláció · V3" }]}
      selectedMaterial="list-1|list-rev-2"
      selectedCalculation="calc-1|calc-rev-3"
    />);

    expect(html).toContain('name="materialSource"');
    expect(html).toContain('name="calculationSource"');
    expect(html).toContain('value="list-1|list-rev-2" selected=""');
    expect(html).toContain('value="calc-1|calc-rev-3" selected=""');
    expect(html).toContain("Források betöltése");
  });
});
