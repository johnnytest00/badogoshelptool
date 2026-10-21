import { describe, expect, it } from "vitest";
import { roofDetailSchema, roofDetailsSchema, roofDetailsSummary, roofDetailValues } from "./roof-details";
import { surveySectionSchema } from "./workspace";

const detail = (patch: Record<string, unknown> = {}) => ({
  id: "33333333-3333-4333-8333-333333333333", kind: "chimney", status: "measured",
  count: 1, widthMm: 600, heightMm: 800, lengthM: null, note: "", ...patch,
});
const section = (patch: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111", name: "Tető", workType: "roof",
  measurements: [], notes: "", photoIds: [], ...patch,
});

describe("meglévő tetőrészletek", () => {
  it("600 × 800 mm kéményt mért állapotban rögzít", () => {
    const parsed = roofDetailSchema.safeParse(detail());
    expect(parsed.success).toBe(true);
    expect(roofDetailValues(parsed.data!)).toEqual([{ key: "count", value: 1 }, { key: "widthMm", value: 600 }, { key: "heightMm", value: 800 }]);
  });
  it("12,4 m meglévő csatornát milliméter pontossággal fogad el, 12,4005 m-t nem", () => {
    expect(roofDetailSchema.safeParse(detail({ kind: "gutter", count: null, widthMm: null, heightMm: null, lengthM: 12.4 })).success).toBe(true);
    expect(roofDetailSchema.safeParse(detail({ kind: "gutter", count: null, widthMm: null, heightMm: null, lengthM: 12.4005 })).success).toBe(false);
  });
  it("a megerősített hiány és a nem vizsgált állapot nem ugyanaz", () => {
    expect(roofDetailSchema.safeParse(detail({ status: "absent", count: null, widthMm: null, heightMm: null })).success).toBe(true);
    expect(roofDetailsSummary([])).toContain("Nem vizsgált");
    expect(roofDetailsSummary([{ status: "absent" }])).toBe("1 megerősített hiány");
    expect(roofDetailsSummary([{ status: "measured" }, { status: "present_unmeasured" }])).toBe("1 felmérve · 1 hiányosan felmérve");
  });
  it("megerősített hiányhoz nem engedi a mért értéket", () => {
    const parsed = roofDetailSchema.safeParse(detail({ status: "absent" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("Megerősített hiányhoz");
  });
  it("felmért állapothoz legalább egy értéket kér, hiányos állapotot viszont elfogad", () => {
    const empty = { count: null, widthMm: null, heightMm: null, lengthM: null };
    expect(roofDetailSchema.safeParse(detail({ ...empty })).error?.issues[0]?.message).toContain("legalább egy értéket");
    expect(roofDetailSchema.safeParse(detail({ ...empty, status: "present_unmeasured", note: "nem elérhető" })).success).toBe(true);
  });
  it("nulla, negatív és nem egész méretet elutasít", () => {
    for (const widthMm of [0, -600, 600.5]) expect(roofDetailSchema.safeParse(detail({ widthMm })).success).toBe(false);
    expect(roofDetailSchema.safeParse(detail({ count: 0 })).success).toBe(false);
  });
  it("nem értelmezett méretet nem fogad el az adott típushoz", () => {
    expect(roofDetailSchema.safeParse(detail({ kind: "valley", count: 1, widthMm: 600, heightMm: null })).success).toBe(false);
    expect(roofDetailSchema.safeParse(detail({ kind: "valley", count: 1, widthMm: null, heightMm: null, lengthM: 3.2 })).success).toBe(true);
  });
  it("megerősített hiány mellett nem hagy másik bejegyzést ugyanabból a típusból", () => {
    const absent = detail({ status: "absent", count: null, widthMm: null, heightMm: null });
    const other = detail({ id: "44444444-4444-4444-8444-444444444444" });
    expect(roofDetailsSchema.safeParse([absent]).success).toBe(true);
    expect(roofDetailsSchema.safeParse([absent, other]).success).toBe(false);
    expect(roofDetailsSchema.safeParse([other, detail({ id: "44444444-4444-4444-8444-444444444445", kind: "skylight", count: 2, widthMm: null, heightMm: null })]).success).toBe(true);
  });
  it("a felmérésszakasz tetőrészlet nélkül és tetőrészlettel is menthető, nem tető szakaszhoz viszont nem", () => {
    expect(surveySectionSchema.safeParse(section()).success).toBe(true);
    expect(surveySectionSchema.safeParse(section({ roofDetails: [detail()] })).success).toBe(true);
    expect(surveySectionSchema.safeParse(section({ workType: "other", roofDetails: [detail()] })).success).toBe(false);
  });
});
