import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { surveySectionsSchema } from "@/domain/field-surveys/workspace";
import { emptyRoofDetail, SurveyRoofDetails } from "./survey-roof-details";
import { roofDetailDraft, serializeRoofDetail, serializeSurveyDraftSections, type RoofDetailDraft, type SurveySectionDraft } from "./survey-draft-recovery";

const noop = () => undefined;
const render = (details: readonly RoofDetailDraft[]) => renderToStaticMarkup(<SurveyRoofDetails details={details} disabled={false} onChange={noop} newId={() => "33333333-3333-4333-8333-333333333333"} />);
const chimney = (patch: Partial<RoofDetailDraft> = {}): RoofDetailDraft => ({ ...emptyRoofDetail("chimney", "33333333-3333-4333-8333-333333333333"), ...patch });

describe("meglévő tetőrészletek felülete", () => {
  it("felmérési objektumokat kínál, tervezett munkát nem", () => {
    const html = render([]);
    expect(html).toContain("Meglévő tetőrészletek");
    expect(html).toContain("Kémény"); expect(html).toContain("Meglévő ereszcsatorna");
    expect(html).toContain("Nem vizsgált tetőrészletek");
    for (const forbidden of ["Bádogos elemek", "felszerelés", "beépítendő", "Új ereszcsatorna", "munkatétel"]) expect(html).not.toContain(forbidden);
  });
  it("új bejegyzés nem állít mérést, és nem dob hibát üres mezőkre", () => {
    const html = render([chimney()]);
    expect(html).toContain("Van, de nincs felmérve");
    expect(html).not.toContain("field-survey-inline-error");
  });
  it("mért kéményhez csak a típushoz tartozó mezőket kéri", () => {
    const html = render([chimney({ status: "measured", count: "1", widthMm: "600", heightMm: "800" })]);
    expect(html).toContain("Szélesség"); expect(html).toContain("Mélység"); expect(html).toContain("Darabszám");
    expect(html).not.toContain("Meglévő hossz");
    expect(html).not.toContain("field-survey-inline-error");
  });
  it("megerősített hiánynál nem mutat méretmezőt", () => {
    const html = render([chimney({ status: "absent" })]);
    expect(html).toContain("Nincs (ellenőrizve)");
    expect(html).not.toContain("survey-detail-33333333-3333-4333-8333-333333333333-widthMm");
  });
  it("mezőszintű magyar hibát ad érvénytelen és ellentmondó értékre", () => {
    expect(render([chimney({ status: "measured", widthMm: "0" })])).toContain("A méret legyen nagyobb nullánál.");
    expect(render([chimney({ status: "measured" })])).toContain("legalább egy értéket");
  });
  it("sosem vonja le az áttöréseket a tetőfelületből", () => {
    expect(render([chimney({ status: "measured", widthMm: "600" })])).toContain("a tetőfelületből sem vonunk le semmit");
  });
});

describe("tetőrészlet piszkozat és mentés", () => {
  it("magyar tizedesvesszőt fogad, az üres mező hiányzó marad és nem lesz nulla", () => {
    const parsed = serializeRoofDetail(chimney({ kind: "gutter", status: "measured", lengthM: "12,4" }));
    expect(parsed.lengthM).toBe(12.4);
    expect(parsed.count).toBeNull(); expect(parsed.widthMm).toBeNull();
  });
  it("mentett részlet visszatölthető, és körútban azonos marad", () => {
    const saved = serializeRoofDetail(chimney({ status: "measured", count: "1", widthMm: "600", heightMm: "800", note: "hátsó sík" }));
    expect(serializeRoofDetail(roofDetailDraft(saved))).toEqual(saved);
    expect(roofDetailDraft(saved).widthMm).toBe("600");
  });
  it("a szakasz piszkozata a részletekkel együtt menthető szerződésre fordul", () => {
    const section: SurveySectionDraft = {
      id: "11111111-1111-4111-8111-111111111111", name: "Tető", workType: "roof", notes: "", photoIds: [],
      measurements: [{ id: "22222222-2222-4222-8222-222222222222", label: "Tetőhossz", value: "10,5", unit: "m", semanticType: "roof_eave_run" }],
      roofDetails: [chimney({ status: "measured", count: "1", widthMm: "600", heightMm: "800" })],
    };
    const parsed = surveySectionsSchema.safeParse(serializeSurveyDraftSections([section]));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.[0].roofDetails?.[0]).toMatchObject({ kind: "chimney", status: "measured", count: 1, widthMm: 600, heightMm: 800, lengthM: null });
  });
  it("a régi, tetőrészlet nélküli szakasz változatlanul menthető", () => {
    const section: SurveySectionDraft = {
      id: "11111111-1111-4111-8111-111111111111", name: "Tető", workType: "roof", notes: "", photoIds: [],
      measurements: [{ id: "22222222-2222-4222-8222-222222222222", label: "Tetőhossz", value: "10,5", unit: "m", semanticType: "roof_eave_run" }],
    };
    const parsed = surveySectionsSchema.safeParse(serializeSurveyDraftSections([section]));
    expect(parsed.success).toBe(true);
    expect(JSON.stringify(parsed.data)).not.toContain("roofDetails");
  });
});
