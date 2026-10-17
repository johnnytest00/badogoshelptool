import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConstructionCalculatorSuite } from "@/features/calculators/construction-suite";
import { constructionCalculatorCatalog } from "./catalog";

describe("construction calculator coverage and selection", () => {
  it("accounts for all 33 requested references with verified and not implemented statuses", () => {
    expect(constructionCalculatorCatalog).toHaveLength(33);
    expect(constructionCalculatorCatalog.filter((item) => item.status === "verified")).toHaveLength(22);
    expect(constructionCalculatorCatalog.filter((item) => item.status === "not_implemented")).toHaveLength(11);
    expect(constructionCalculatorCatalog.every((item) => item.id && item.title && item.scope && item.limitation)).toBe(true);
  });

  it("shows only verified calculators behind the three requested category tabs", () => {
    const html = renderToStaticMarkup(<ConstructionCalculatorSuite />);
    expect(html).toContain("Tetők és faszerkezetek");
    expect(html).toContain("Lépcsők");
    expect(html).toContain("Betonozás és alapozás");
    expect(html).not.toContain("90°-os fa lépcső – húzott fokokkal");
    expect(html).not.toContain("Egyenes betonlépcső");
    expect(html).not.toContain("Invalid input");
  });
});
