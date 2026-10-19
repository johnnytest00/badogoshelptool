import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PriceLine } from "@/domain/pricing";
import { UnitPriceField } from "./unit-price-field";

const price: PriceLine = { id: "p1", optionId: "o1", amount: 3200, currency: "HUF", purchasingUnit: "square_meter", priceKind: "net", effectiveDate: "2026-01-01", recordedAt: "2026-01-01T00:00:00Z", provenance: "demo", sourceName: "Lindab" };
const render = (props: Partial<Parameters<typeof UnitPriceField>[0]> = {}) => renderToStaticMarkup(<UnitPriceField label="T18" unit="square_meter" amount="3200" kind="net" origin="catalog" priceId="p1" choices={[price]} selected={price} hasCatalog onSelect={vi.fn()} onManual={vi.fn()} {...props} />);

describe("UnitPriceField", () => {
  it("shows the editable amount, the unit, the saved supplier prices and the catalog origin", () => {
    const html = render();
    expect(html).toContain('value="3200"');
    expect(html).toContain("Ft/m²");
    expect(html).toContain("Lindab");
    expect(html).toContain("Katalógus · Lindab");
    expect(html).toContain("Kézi ár");
  });
  it("marks a manual override on a catalog line and offers the net/gross basis", () => {
    const html = render({ origin: "override", priceId: null });
    expect(html).toContain("Kézi felülírás");
    expect(html).toContain("árának alapja");
  });
  it("renders a missing price without a basis selector and a plain manual line without the supplier list", () => {
    expect(render({ origin: "missing", amount: "", kind: null, priceId: null })).toContain("Ár hiányzik");
    const manual = render({ origin: "manual", hasCatalog: false, priceId: null, choices: [], selected: null });
    expect(manual).not.toContain("beszállítói árai");
    expect(manual).toContain("Kézi ár");
  });
  it("flags an invalid amount", () => expect(render({ amount: "12,345" })).toContain('aria-invalid="true"'));
});
