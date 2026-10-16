import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassDisclosure } from "./glass-disclosure";

describe("GlassDisclosure", () => {
  it("uses a native details/summary control with a labelled content region", () => {
    const html = renderToStaticMarkup(<GlassDisclosure summary="Mérések" className="survey-disclosure"><label>Érték<input /></label></GlassDisclosure>);
    expect(html).toContain("<details class=\"glass-disclosure survey-disclosure\">");
    expect(html).toContain("<summary aria-controls=");
    expect(html).toContain("class=\"glass-disclosure-content\"");
    expect(html).toContain("Érték");
  });

  it("supports a deep link target and initially expanded state", () => {
    const html = renderToStaticMarkup(<GlassDisclosure id="execution" defaultOpen summary="Kivitelezés">Tartalom</GlassDisclosure>);
    expect(html).toContain('<details id="execution" class="glass-disclosure" open="">');
    expect(html).toContain("Kivitelezés");
  });
});
