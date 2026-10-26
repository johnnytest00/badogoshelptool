import { describe, expect, it } from "vitest";
import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";
import { HAP_HELP } from "@/domain/calculations/construction/rafter-joints";
import { definitions } from "./roof-calculator-definitions";

const activeRoofCopy = [
  ...constructionCalculatorCatalog
    .filter((item) => item.category === "roof")
    .flatMap((item) => [item.title, item.scope, item.limitation]),
  HAP_HELP,
  ...Object.values(definitions).flatMap((definition) => [
    definition.note,
    definition.advancedHelp ?? "",
    ...(definition.fields ?? []).flatMap((field) => [field.label, field.help ?? ""]),
  ]),
].join("\n");

describe("active roof calculator terminology", () => {
  it("uses KARMI and does not expose the retired Hungarian term", () => {
    expect(activeRoofCopy).toContain("KARMI");
    expect(activeRoofCopy).not.toMatch(/madárszáj/i);
  });
});
