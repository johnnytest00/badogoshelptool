import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassSectionHeader } from "./glass-section-header";

describe("GlassSectionHeader", () => {
  it("renders a title-only section bubble and keeps optional actions", () => {
    const html = renderToStaticMarkup(
      <GlassSectionHeader title="Önálló ajánlatok" id="standalone-quotes" actions={<button type="button">Új ajánlat</button>} />,
    );

    expect(html.match(/<h2\b/g)).toHaveLength(1);
    expect(html).toContain("Önálló ajánlatok");
    expect(html).toContain('id="standalone-quotes"');
    expect(html).toContain("Új ajánlat");
    expect(html).not.toContain("section-eyebrow");
  });
});
