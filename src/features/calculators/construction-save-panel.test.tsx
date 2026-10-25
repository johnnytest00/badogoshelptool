import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { stableJsonStringify } from "@/features/roof-models/stable-json";
import { ConstructionSavePanel, type ConstructionSaveSession } from "./construction-save-panel";
import { computeConstruction, constructionInputSnapshot, constructionOutputSnapshot } from "./construction-computation";
import { definitions } from "./roof-calculator-definitions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/calculations/construction-actions", () => ({ saveConstructionCalculationAction: vi.fn() }));

const definition = definitions["roof.rafter-cut"];
const values = { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" };
const input = constructionInputSnapshot(definition, values, null);
const output = constructionOutputSnapshot("roof.rafter-cut", computeConstruction(definition, values, null, []));
const revision = (revisionNumber: number, revisionInput = input, revisionOutput = output) => ({ revisionId: `r${revisionNumber}`, revisionNumber, createdAt: "2026-10-25T10:00:00Z", input: revisionInput, output: revisionOutput });
const savedSession: ConstructionSaveSession = { calculationId: "c", name: "DEMO szarufa", revisionNumber: 2, baselineInput: stableJsonStringify(input), savedName: "DEMO szarufa", viewedRevisionNumber: 2, revisions: [revision(2), revision(1)] };
const render = (session: ConstructionSaveSession, saveable = true, liveOutput = output) => renderToStaticMarkup(<ConstructionSavePanel organizationId="org" calculatorId="roof.rafter-cut" session={session} input={input} liveOutput={liveOutput} saveable={saveable} onSessionChange={() => undefined} onLoadRevision={() => undefined} />);

describe("ConstructionSavePanel", () => {
  it("labels an unsaved result as a local preview and needs a complete result to save", () => {
    const fresh: ConstructionSaveSession = { ...savedSession, revisionNumber: 0, baselineInput: null, savedName: null, viewedRevisionNumber: null, revisions: [] };
    expect(render(fresh)).toContain("Nincs mentve · helyi előnézet");
    expect(render(fresh)).toContain(">Kalkuláció mentése</button>");
    expect(render(fresh, false)).toMatch(/<button[^>]*disabled=""[^>]*>.*Kalkuláció mentése/);
    expect(render(fresh, false)).toContain("Mentéshez teljes, kiszámítható eredmény szükséges.");
  });

  it("shows a clean saved revision and offers no redundant save", () => {
    const html = render(savedSession);
    expect(html).toContain("Mentve · V2");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Új revízió mentése · V3/);
    expect(html).toContain("Revíziók · 2");
  });

  it("marks changed input or name as unsaved", () => {
    expect(render({ ...savedSession, baselineInput: "{}" })).toContain("Mentetlen módosítás · utolsó mentés V2");
    expect(render({ ...savedSession, name: "Új név" })).toContain("Mentetlen módosítás · utolsó mentés V2");
  });

  it("names an older open revision and warns when its stored output differs from the current engine", () => {
    const older = { ...savedSession, viewedRevisionNumber: 1, baselineInput: "{}", revisions: [revision(2), revision(1, input, { ...output, lines: [{ label: "Régi", value: 1, unit: "mm" }] })] };
    const html = render(older);
    expect(html).toContain("V1 megnyitva (korábbi) · mentéskor új V3 készül");
    expect(html).toContain("A mentett V1 eredménye eltér a mostani számítástól.");
  });

});
