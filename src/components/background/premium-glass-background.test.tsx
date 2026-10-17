import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PremiumGlassBackground } from "./premium-glass-background";

describe("PremiumGlassBackground", () => {
  it("renders the ambient glow and dot pattern statically before restoring motion", () => {
    const html = renderToStaticMarkup(createElement(PremiumGlassBackground));

    expect(html).toContain('class="premium-glass-background"');
    expect(html).toContain('data-animation-enabled="false"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('class="premium-glass-background__ambient"');
    expect(html).toContain('class="premium-glass-background__dot-grid"');
    expect(html).not.toContain("<svg");
  });

  it("keeps the dot pattern static and animates only one slow transform glow", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const dotGridRule = css.match(/\.premium-glass-background__dot-grid\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(css).toContain("--premium-background: #f5f3ed");
    expect(css).toContain("--premium-dot: rgba(71, 85, 105, .38)");
    expect(css).toContain("--premium-background: #111923");
    expect(css).toContain("background-size: 32px 32px");
    expect(css).toContain("radial-gradient(circle, var(--premium-dot) .95px, transparent 1.2px)");
    expect(css).toContain("var(--premium-glow-warm)");
    expect(css).toContain("var(--premium-glow-cool)");
    expect(css).toMatch(/\.premium-glass-background__dot-grid\s*\{\s*opacity:\s*\.88;/);
    expect(css).toContain("animation: premium-glass-ambient 84s ease-in-out infinite alternate");
    expect(css.match(/animation:\s*premium-glass-ambient/g)).toHaveLength(1);
    expect(dotGridRule).not.toMatch(/animation|transform/);
    expect(css).toMatch(/@keyframes premium-glass-ambient\s*\{\s*from\s*\{\s*transform:/);
    expect(css).not.toContain("@keyframes premium-glass-grid");
    expect(css).toMatch(/prefers-reduced-motion:\s*no-preference[\s\S]*?animation:\s*premium-glass-ambient/);
    expect(css).toContain("prefers-reduced-transparency: reduce");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("pointer-events: none;");
  });

  it("describes the motion preference without implying that the dot grid moves", () => {
    const controls = readFileSync("src/features/preferences/liquid-glass-controls.tsx", "utf8");

    expect(controls).toContain("A pontminta statikus marad.");
    expect(controls).not.toContain("műszaki rácsának mozgása");
  });
});
