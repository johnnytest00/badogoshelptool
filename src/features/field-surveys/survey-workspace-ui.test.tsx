import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateQuickGable } from "@/domain/field-surveys/quick-gable";
import { calculateQuickShed } from "@/domain/field-surveys/quick-shed";
import { QuickGableWorkspace, QuickShedWorkspace, RoofModeSelector } from "./quick-gable-workspace";

const draft = (semanticType: "roof_eave_run" | "roof_plane_slope_a", value: string) => ({ id: semanticType, semanticType, unit: "m" as const, value });
const noop = () => undefined;

describe("compact measurement UI", () => {
  it("offers only the modes the roof supports, with one short description each", () => {
    const gable = renderToStaticMarkup(<RoofModeSelector mode="quick" onChange={noop} disabled={false} />);
    expect(gable).toContain("Gyors mérés"); expect(gable).toContain("Épületméretek"); expect(gable).toContain("Részletes mérés");
    expect(gable).toContain("Közvetlen tetőméretek"); expect(gable).not.toContain("Hogyan mérsz");
    const shed = renderToStaticMarkup(<RoofModeSelector shape="shed" mode="quick" onChange={noop} disabled={false} />);
    expect(shed).not.toContain("Részletes mérés");
  });
  it("shows no instructions, no result panel and only a calm placeholder before anything is entered", () => {
    const html = renderToStaticMarkup(<QuickShedWorkspace result={calculateQuickShed([draft("roof_eave_run", ""), draft("roof_plane_slope_a", "")])} drafts={[draft("roof_eave_run", ""), draft("roof_plane_slope_a", "")]} focused={null} guide="" inputs={<span>mezők</span>} disabled={false} />);
    expect(html).toContain("qg-placeholder");
    expect(html).not.toContain("Kezdd"); expect(html).not.toContain("Mérd le"); expect(html).not.toContain("missing-data"); expect(html).not.toContain("Így mérd");
    expect(html).not.toContain("Mentés"); expect(html).not.toContain("Anyaglista");
  });
  it("shows a prominent result and the plane question without repeated descriptions once measured", () => {
    const drafts = [draft("roof_eave_run", "10,5"), draft("roof_plane_slope_a", "4,2")];
    const html = renderToStaticMarkup(<QuickGableWorkspace result={calculateQuickGable(drafts, true)} drafts={drafts} planesMatch={true} onPlanesMatch={noop} focused={null} guide="" inputs={null} disabled={false} />);
    expect(html).toContain("88,20 m²"); expect(html).toContain("A két tetősík egyforma?"); expect(html).not.toContain("ugyanakkora");
    expect(html).not.toContain("Mentés");
  });
  it("still tells what is missing once the user started, and keeps invalid input visible as an alert", () => {
    const partial = [draft("roof_eave_run", "10,5"), draft("roof_plane_slope_a", "")];
    expect(renderToStaticMarkup(<QuickShedWorkspace result={calculateQuickShed(partial)} drafts={partial} focused={null} guide="" inputs={null} disabled={false} />)).toContain("Még hiányzik");
    const bad = [draft("roof_eave_run", "-1"), draft("roof_plane_slope_a", "4")];
    expect(renderToStaticMarkup(<QuickShedWorkspace result={calculateQuickShed(bad)} drafts={bad} focused={null} guide="" inputs={null} disabled={false} />)).toContain('role="alert"');
  });
});
