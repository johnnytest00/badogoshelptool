import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { stableJsonStringify } from "@/features/roof-models/stable-json";
import { ConstructionSavePanel, type ConstructionSaveSession } from "./construction-save-panel";
import { computeConstruction, constructionInputSnapshot, constructionOutputSnapshot } from "./construction-computation";
import { definitions } from "./roof-calculator-definitions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/calculations/construction-actions", () => ({ saveConstructionCalculationAction: vi.fn() }));
vi.mock("@/features/execution/execution-document-link-actions", () => ({ linkExecutionPlanDocumentAction: vi.fn(), unlinkExecutionPlanDocumentAction: vi.fn(), createExecutionPlanAndLinkDocumentAction: vi.fn() }));

const definition = definitions["roof.rafter-cut"];
const values = { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" };
const input = constructionInputSnapshot(definition, Object.fromEntries(definition.fields.map((field) => [field.key, values[field.key as keyof typeof values] ?? field.initial ?? ""])), null);
const output = constructionOutputSnapshot("roof.rafter-cut", computeConstruction(definition, values, null, []));
const revision = (revisionNumber: number, revisionInput = input, revisionOutput = output) => ({ revisionId: `r${revisionNumber}`, revisionNumber, createdAt: "2026-10-25T10:00:00Z", input: revisionInput, output: revisionOutput });
const savedSession: ConstructionSaveSession = { calculationId: "c", name: "DEMO szarufa", revisionNumber: 2, baselineInput: stableJsonStringify(input), savedName: "DEMO szarufa", viewedRevisionNumber: 2, revisions: [revision(2), revision(1)] };
const render = (session: ConstructionSaveSession, saveable = true, liveOutput = output, extra: Partial<Parameters<typeof ConstructionSavePanel>[0]> = {}) => renderToStaticMarkup(<ConstructionSavePanel organizationId="org" calculatorId="roof.rafter-cut" definition={definition} session={session} input={input} liveOutput={liveOutput} saveable={saveable} onSessionChange={() => undefined} onLoadRevision={() => undefined} {...extra} />);
const planLinks = { plans: [{ id: "p1", title: "DEMO napló", projectId: null, updatedAt: "2026-10-25" }], links: [{ linkId: "l1", planId: "p0", planTitle: "DEMO régi napló", origin: "link" as const, documentId: "r1", detail: "V1" }] };

describe("ConstructionSavePanel", () => {
  it("labels an unsaved result as a local preview and needs a complete result to save", () => {
    const fresh: ConstructionSaveSession = { ...savedSession, revisionNumber: 0, baselineInput: null, savedName: null, viewedRevisionNumber: null, revisions: [] };
    expect(render(fresh)).toContain("Nincs mentve · helyi előnézet");
    expect(render(fresh)).toContain(">Kalkuláció mentése</button>");
    expect(render(fresh, false)).toMatch(/<button[^>]*disabled=""[^>]*>.*Kalkuláció mentése/);
    expect(render(fresh, false)).toContain("Hiányos kalkuláció");
    expect(render(fresh, false)).toContain("Mentéshez teljes, kiszámítható eredmény szükséges.");
  });

  it("shows a clean saved revision and offers no redundant save", () => {
    const html = render(savedSession);
    expect(html).toContain("Mentve · V2");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Új revízió mentése · V3/);
    expect(html).toContain("Revíziók · 2");
  });

  it("exposes an explicit older-page control without changing the current revision", () => {
    const html = render({ ...savedSession, revisions: [revision(50), revision(49)], revisionNumber: 50, viewedRevisionNumber: 50, hasOlderRevisions: true, nextBeforeRevisionNumber: 49 });
    expect(html).toContain("Revíziók · 2+");
    expect(html).toContain("Régebbi revíziók betöltése");
    expect(html).toContain("V50 · aktuális");
  });

  it("opens unchanged historical V2 as clean, detects an edit, and blocks an unknown legacy field", () => {
    const historical = { ...input, fields: { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" } };
    const hydrated = constructionInputSnapshot(definition, Object.fromEntries(definition.fields.map((field) => [field.key, historical.fields[field.key as keyof typeof historical.fields] ?? field.initial ?? ""])), null);
    const session = { ...savedSession, baselineInput: stableJsonStringify(historical), revisions: [revision(2, historical)] };
    expect(render(session, true, output, { input: hydrated })).toContain("Mentve · V2");
    expect(render(session, true, output, { input: { ...hydrated, fields: { ...hydrated.fields, riseMm: "2100" } } })).toContain("Mentetlen módosítás · utolsó mentés V2");
    const incompatible = { ...historical, fields: { ...historical.fields, removedField: "42" } };
    const html = render({ ...session, revisions: [revision(2, incompatible)] }, true, output, { input: hydrated });
    expect(html).toContain("Nem kompatibilis mentett revízió");
    expect(html).toContain("A mentett adat változatlan");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Új revízió mentése/);
  });

  it("marks changed input or name as unsaved", () => {
    expect(render(savedSession, true, output, { input: { ...input, fields: { ...input.fields, riseMm: "2100" } } })).toContain("Mentetlen módosítás · utolsó mentés V2");
    expect(render({ ...savedSession, name: "Új név" })).toContain("Mentetlen módosítás · utolsó mentés V2");
  });

  it("names an older open revision and warns when its stored output differs from the current engine", () => {
    const older = { ...savedSession, viewedRevisionNumber: 1, baselineInput: "{}", revisions: [revision(2), revision(1, input, { ...output, lines: [{ label: "Régi", value: 1, unit: "mm" }] })] };
    const html = render(older);
    expect(html).toContain("V1 megnyitva (korábbi) · mentéskor új V3 készül");
    expect(html).toContain("A mentett V1 eredménye eltér a mostani számítástól.");
  });

  it("offers work log linking for the latest saved revision and blocks it while changes are unsaved", () => {
    const linked = render(savedSession, true, output, { planLinks });
    expect(linked).toContain("Munkanaplóhoz csatolás");
    expect(linked).toContain("DEMO régi napló");
    expect(linked).toContain("· V1");
    const dirty = render(savedSession, true, output, { planLinks, input: { ...input, fields: { ...input.fields, riseMm: "2100" } } });
    expect(dirty).toContain("Mentetlen módosítás van. Munkanaplóhoz mindig mentett revízió kapcsolódik");
    expect(dirty).not.toContain("Munkanaplóhoz csatolás");
    expect(render(savedSession, true, output, { planLinksUnavailable: true })).toContain("A munkanaplók most nem tölthetők be");
    expect(render({ ...savedSession, revisionNumber: 0, baselineInput: null, savedName: null, viewedRevisionNumber: null, revisions: [] }, true, output, { planLinks })).not.toContain("Munkanapló");
  });

  it("blocks quotation and work-log reuse for a historical incomplete revision", () => {
    const incompleteOutput = { ...output, lines: [] };
    const incompleteSession = { ...savedSession, revisions: [revision(2, input, incompleteOutput), revision(1)] };
    const html = render(incompleteSession, false, incompleteOutput, { planLinks });
    expect(html).toContain("Mentett V2 · hiányos");
    expect(html).toContain("Hiányos kalkuláció nem adható tovább ajánlatba vagy munkanaplóba.");
    expect(html).not.toContain("Árajánlat készítése");
    expect(html).not.toContain("Munkanaplóhoz csatolás");
  });
});
