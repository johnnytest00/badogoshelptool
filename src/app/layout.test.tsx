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
});
