import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

describe("F9.14.9 theme controls", () => {
  it("keeps the header theme toggle separate from the settings mode selector", () => {
    const html = renderToStaticMarkup(createElement(ThemeProvider, null, createElement(ThemeToggle)));
    expect(html).toContain('class="theme-toggle"');
    expect(html).toContain('aria-label="Váltás: Sötét"');
    expect(html).not.toContain("Rendszer szerint");
    expect(html).not.toContain("<select");
  });
});
