import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SurveyActions } from "./quick-gable-workspace";

const render = (state: "saving" | "unsaved" | "saved", saveDisabled: boolean) => renderToStaticMarkup(<SurveyActions state={state} version={3} saveDisabled={saveDisabled} onList={() => undefined} />);

describe("SurveyActions", () => {
  it("keeps 'Mentés' as save and the material list as a separate action in every state", () => {
    for (const state of ["saving", "unsaved", "saved"] as const) expect(render(state, state !== "unsaved")).toContain("Anyaglista készítése");
    expect(render("unsaved", false)).toMatch(/<button type="submit" form="field-survey-editor-form" class="primary-button">Mentés<\/button>/);
  });
  it("disables Save when nothing needs saving and explains why the material list is unavailable", () => {
    const saved = render("saved", true);
    expect(saved).toContain("Mentve · V3");
    expect(saved).toMatch(/disabled=""[^>]*>Mentés<\/button>/);
    expect(saved).not.toContain("előbb mentsd");
    const unsaved = render("unsaved", false);
    expect(unsaved).toContain("Nincs mentve");
    expect(unsaved).toMatch(/disabled=""[^>]*>Anyaglista készítése/);
    expect(unsaved).toContain("előbb mentsd");
  });
  it("shows a saving state without allowing a second submit", () => {
    const saving = render("saving", true);
    expect(saving).toContain("Mentés…");
    expect(saving).toMatch(/disabled=""[^>]*>Mentés…<\/button>/);
  });
});
