import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { stableJsonStringify } from "@/features/roof-models/stable-json";
import { ConstructionSavePanel, outputDriftDiffPaths, outputsEquivalent, type ConstructionSaveSession } from "./construction-save-panel";
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

  it("reports the exact structural paths that differ between a saved and a live output (M10.1.5 dev diagnostic)", () => {
    expect(outputDriftDiffPaths({ lines: [{ label: "A", value: 1, unit: "mm" }], takeoff: null, cutList: null }, { lines: [{ label: "A", value: 1, unit: "mm" }], takeoff: null, cutList: null })).toEqual([]);
    expect(outputDriftDiffPaths({ lines: [{ label: "A", value: 1, unit: "mm" }], takeoff: null, cutList: null }, { lines: [{ label: "A", value: 2, unit: "mm" }], takeoff: null, cutList: null })).toEqual(["lines[0].value"]);
    expect(outputDriftDiffPaths({ lines: [{ label: "A", value: 1, unit: "mm" }] }, { lines: [] })).toEqual(["lines (length 1 vs 0)"]);
  });

  it("tolerates only machine-precision numeric noise, not any real difference (M10.1.7)", () => {
    // The three reproduced ~1e-14 Karmi ULP diffs (docs/M10_PHASE1_DRIFT_INDEPENDENT_QA.md §2).
    expect(outputsEquivalent(55.98065001017354, 55.98065001017355)).toBe(true);
    expect(outputsEquivalent(34.01934998982646, 34.01934998982645)).toBe(true);
    expect(outputsEquivalent(209.33121517077495, 209.33121517077498)).toBe(true);
    // Negative, near-zero and large magnitudes with the same ULP-scale noise.
    expect(outputsEquivalent(-55.98065001017354, -55.98065001017355)).toBe(true);
    expect(outputsEquivalent(0, 1e-15)).toBe(true);
    expect(outputsEquivalent(123456.789012345, 123456.789012346)).toBe(true);
    // Object key order never matters; array order does.
    expect(outputsEquivalent({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(outputsEquivalent([1, 2], [2, 1])).toBe(false);

    // Real differences stay drift.
    expect(outputsEquivalent(55.98, 56.5)).toBe(false); // meaningfully different angle
    expect(outputsEquivalent(5, 6)).toBe(false); // count
    expect(outputsEquivalent({ a: 1 }, { a: 1, b: null })).toBe(false); // missing field vs explicit null
    expect(outputsEquivalent({ a: 1 }, { a: "1" })).toBe(false); // type difference
    expect(outputsEquivalent([1, 2], [1, 2, 3])).toBe(false); // array length
    expect(outputsEquivalent("x", "y")).toBe(false); // text
    expect(outputsEquivalent(NaN, NaN)).toBe(false); // invalid number never falsely equal
    expect(outputsEquivalent(Infinity, Infinity)).toBe(false); // non-finite is never a valid driftless result, even against itself
    expect(outputsEquivalent(-Infinity, -Infinity)).toBe(false);
    expect(outputsEquivalent(Infinity, 1e300)).toBe(false);
  });

  it("compares discrete counts exactly, regardless of magnitude (M10.1.9, docs/M10_PHASE1_FINAL_NUMERICAL_QA.md P2)", () => {
    // A "db" unit marks a discrete count: no relative tolerance may hide a real +1, however large.
    expect(outputsEquivalent({ value: 1_000_000_000, unit: "db" }, { value: 1_000_000_001, unit: "db" })).toBe(false);
    expect(outputsEquivalent({ value: 1_000_000_000, unit: "db" }, { value: 1_000_000_000, unit: "db" })).toBe(true);
    // A continuous ("m") LAYOUT quantity of the same huge magnitude still tolerates only machine noise, not a real difference.
    expect(outputsEquivalent({ value: 1_000_000, unit: "m" }, { value: 1_000_000.001, unit: "m" })).toBe(false);
    expect(outputsEquivalent({ value: 1_000_000, unit: "m" }, { value: 1_000_000 + 1e-10, unit: "m" })).toBe(true);
    // A bare `count` key (cutList rows) is exact even without a sibling unit.
    expect(outputsEquivalent({ lengthMm: 4826, count: 36 }, { lengthMm: 4826, count: 37 })).toBe(false);
    expect(outputsEquivalent({ lengthMm: 4826, count: 36 }, { lengthMm: 4826, count: 36 })).toBe(true);
    // 100.000 vs 100.001 stays a real, professionally meaningful difference at ordinary magnitude.
    expect(outputsEquivalent(100.0, 100.001)).toBe(false);
  });

  it("suppresses a saved-vs-live drift warning that is only ULP noise but keeps a real one", () => {
    const noisy = { ...savedSession, viewedRevisionNumber: 1, baselineInput: stableJsonStringify(input), revisions: [revision(2), revision(1, input, { ...output, lines: output.lines.map((line, index) => index === 0 && typeof line.value === "number" ? { ...line, value: line.value + Number.EPSILON } : line) })] };
    expect(render(noisy)).not.toContain("A mentett V1 eredménye eltér a mostani számítástól.");
    const real = { ...savedSession, viewedRevisionNumber: 1, baselineInput: stableJsonStringify(input), revisions: [revision(2), revision(1, input, { ...output, lines: output.lines.map((line, index) => index === 0 && typeof line.value === "number" ? { ...line, value: line.value + 1 } : line) })] };
    expect(render(real)).toContain("A mentett V1 eredménye eltér a mostani számítástól.");
  });

  it("flags a real billion-scale LAYOUT count +1 as drift but tolerates the same-scale angle's ULP noise (M10.1.9)", () => {
    const hugeTakeoff = { status: "OK", parts: [{ id: "covering", label: "Fedés", status: "OK", quantities: [{ label: "Fedőtábla darabszám", value: 1_000_000_000, unit: "db", meaning: "LAYOUT" }] }] };
    const base = { ...savedSession, viewedRevisionNumber: 1, baselineInput: stableJsonStringify(input), revisions: [revision(2), revision(1, input, { ...output, takeoff: hugeTakeoff })] };
    const countDrift = { ...base, revisions: [revision(2), revision(1, input, { ...output, takeoff: { ...hugeTakeoff, parts: [{ ...hugeTakeoff.parts[0], quantities: [{ ...hugeTakeoff.parts[0].quantities[0], value: 1_000_000_001 }] }] } })] };
    expect(render(countDrift, true, { ...output, takeoff: hugeTakeoff })).toContain("A mentett V1 eredménye eltér a mostani számítástól.");
    expect(render(base, true, { ...output, takeoff: hugeTakeoff })).not.toContain("A mentett V1 eredménye eltér a mostani számítástól.");
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
