import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { LaborRatePanel } from "./labor-rate-panel";

const rate = { id: "r1", name: "DEMO tető", basis: "roof_area_m2" as const, rateAmount: "1500.00", priceClass: "net" as const };
const base = { itemId: "i1", label: "Tetőfelület", quantity: "73.246", unit: "m²" as const };
const render = (p: Partial<Parameters<typeof LaborRatePanel>[0]> = {}) => renderToStaticMarkup(<LaborRatePanel organizationId="o" rates={[rate]} bases={[base]} quotationClass={null} appliedKeys={[]} source={{ materialListId: "l", materialRevisionId: "v" }} onApply={() => undefined} {...p} />);
describe("LaborRatePanel", () => {
  it("explains the missing verified quantity instead of hiding the panel", () => { const html = render({ bases: [] }); expect(html).toContain("nincs ellenőrzött felmérési mennyiség"); expect(html).not.toContain("Munkadíjsor hozzáadása"); });
  it("offers an explicit line with the verified quantity", () => { const html = render(); expect(html).toContain("mért forrásmennyiség: 73.246 m²"); expect(html).toContain("109869.00 Ft nettó"); expect(html).not.toMatch(/disabled=""/); });
  it("blocks a rate of another price class and says why", () => { const html = render({ quotationClass: "gross" }); expect(html).toContain("keverhető"); expect(html).toMatch(/disabled=""/); });
  it("points to settings when no rule exists", () => expect(render({ rates: [] })).toContain("/beallitasok/munkadij"));
  it("offers the shared rate editor only to admins and only for rates not yet applied in the draft", () => {
    expect(render()).not.toContain("Szervezeti díj szerkesztése");
    expect(render({ canEditRates: true })).toContain("Szervezeti díj szerkesztése");
    expect(render({ canEditRates: true, appliedKeys: ["r1:other"] })).not.toContain("Szervezeti díj szerkesztése");
  });
  it("shows an editable quotation-level unit price that defaults to the stored rate", () => {
    const html = render();
    expect(html).toContain("Egységár (Ft/m²)");
    expect(html).toContain('value="1500.00"');
  });
});
