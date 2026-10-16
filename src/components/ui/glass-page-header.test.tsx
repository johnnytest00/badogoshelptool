import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassPageHeader } from "./glass-page-header";

describe("GlassPageHeader", () => {
  it("renders one concise primary heading and keeps page actions available", () => {
    const html = renderToStaticMarkup(<GlassPageHeader title="Projektek" actions={<button type="button">Új projekt</button>} />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Projektek");
    expect(html).toContain("Új projekt");
    expect(html).not.toContain("section-eyebrow");
  });
});
