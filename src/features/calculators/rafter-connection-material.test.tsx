import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RafterMaterialSpecInput } from "./material-spec-editor";
import { initialSpecState } from "@/domain/calculations/roof-material-spec";

describe("rafter connection material input", () => {
  it("offers the same rafter product and manual section input inside the connection workflow", () => {
    const html = renderToStaticMarkup(<RafterMaterialSpecInput profiles={[]} state={initialSpecState(false)} onChange={vi.fn()} jointsOn />);
    expect(html).toContain("Szarufa keresztmetszet");
    expect(html).toContain("Termék");
    expect(html).toContain("Kézi megadás");
    expect(html).toContain("Szarufa magassága");
  });
});
