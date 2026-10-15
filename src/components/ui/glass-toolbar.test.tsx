import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassToolbar } from "./glass-toolbar";

describe("GlassToolbar", () => {
  it("labels related controls as an accessible group by default", () => {
    const html = renderToStaticMarkup(<GlassToolbar ariaLabel="Projekt szűrők"><button>Szűrés</button></GlassToolbar>);

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Projekt szűrők"');
    expect(html).toContain('class="glass-toolbar"');
    expect(html).toContain("Szűrés");
  });

  it("supports a custom accessible label for the floating drawing control group", () => {
    const html = renderToStaticMarkup(<GlassToolbar ariaLabel="Rajz vezérlők"><button>Nagyítás</button></GlassToolbar>);

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Rajz vezérlők"');
  });
});
