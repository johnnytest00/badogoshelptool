import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { filterMaterialProductOptions, normalizeMaterialProductSearch, WorkflowMaterialProductPicker, type WorkflowMaterialProductOption } from "./workflow-material-product-picker";

const options: readonly WorkflowMaterialProductOption[] = [
  { id: "variant-roof", name: "Tetőcserép", detail: "db · Ár nincs megadva", searchText: "Alap egység" },
  { id: "variant-channel", name: "Csatorna 333 mm", detail: "m · 3 500 Ft/m", searchText: "antracit alap egység" },
];

describe("workflow material product picker", () => {
  it("returns every category option for an empty query and filters without Hungarian accents", () => {
    expect(filterMaterialProductOptions(options, "").map((option) => option.id)).toEqual(["variant-roof", "variant-channel"]);
    expect(normalizeMaterialProductSearch("Árvíztűrő tükörfúrógép")).toBe("arvizturo tukorfurogep");
    expect(filterMaterialProductOptions(options, "CSATORNA").map((option) => option.id)).toEqual(["variant-channel"]);
    expect(filterMaterialProductOptions(options, "ANTRACIT").map((option) => option.id)).toEqual(["variant-channel"]);
  });

  it("renders a labeled select-only trigger and a search-first combobox listbox", () => {
    const html = renderToStaticMarkup(createElement(WorkflowMaterialProductPicker, {
      options,
      value: "",
      disabled: false,
      idPrefix: "quotation-line-1",
      onSelect: () => undefined,
    }));

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('role="listbox"');
    expect(html.indexOf('id="quotation-line-1-search"')).toBeLessThan(html.indexOf('role="listbox"'));
    expect(html).toContain('id="quotation-line-1-options"');
    expect(html).toContain("Ár nincs megadva");
    expect(html).not.toContain('aria-selected="true"');
  });

  it("uses a contextual trigger label for its host workflow", () => {
    const html = renderToStaticMarkup(createElement(WorkflowMaterialProductPicker, {
      options,
      value: "variant-channel",
      disabled: false,
      label: "Katalógustermék",
      onSelect: () => undefined,
    }));

    expect(html).toContain('aria-label="Katalógustermék: Csatorna 333 mm. Másik termék kiválasztása"');
  });
});
