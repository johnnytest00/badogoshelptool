import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Loading from "./loading";
import ErrorFallback from "./error";

describe("route loading and error feedback", () => {
  it("announces loading as a distinct busy state", () => {
    const html = renderToStaticMarkup(createElement(Loading));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("betöltése folyamatban");
  });

  it("shows a safe recovery action without exposing internal error details", () => {
    const html = renderToStaticMarkup(createElement(ErrorFallback, { error: new Error("SQLSTATE private rpc detail"), retry: vi.fn() }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Újrapróbálás");
    expect(html).not.toContain("SQLSTATE");
    expect(html).not.toContain("private rpc detail");
  });
});
