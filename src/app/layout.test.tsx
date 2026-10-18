import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("root layout appearance bootstrap", () => {
  it("uses Next.js Script for the early inline theme bootstrap", () => {
    const source = readFileSync("src/app/layout.tsx", "utf8");

    expect(source).toContain('import Script from "next/script";');
    expect(source).toContain('<Script');
    expect(source).toContain('id="tetopro-appearance-bootstrap"');
    expect(source).toContain('strategy="beforeInteractive"');
    expect(source).not.toMatch(/<script(?=[\s>])/);
  });

  it("renders a skip link as the first body element and every page main is its target", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/<body><a className="skip-link" href="#main-content">Ugrás a tartalomra<\/a>/);
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(".skip-link:focus");
    expect(readFileSync("src/features/dashboard/dashboard.tsx", "utf8")).toContain('<main id="main-content" tabIndex={-1}');
  });
});
