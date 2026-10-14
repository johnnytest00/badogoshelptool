import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { flashingMaterialCalculator } from "@/domain/calculations/flashing-material";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";
import { sheetMetalProfileCalculator } from "@/domain/calculations/sheet-metal-profile";
import { getOrCreateAssociationIdentity, standaloneCalculatorRoute, standaloneProjectRevisionHref, StandaloneAssociationConfirmation } from "./standalone-project-association";

vi.mock("./standalone-actions", () => ({ associateStandaloneCalculationAction: vi.fn(), getStandaloneAssociationTarget: vi.fn(), searchStandaloneAssociationProjects: vi.fn() }));

describe("standalone project association frontend contract", () => {
  it("maps only supported calculators to their existing project routes", () => {
    expect(standaloneCalculatorRoute(gutterMaterialCalculator.id)).toBe("ereszcsatorna");
    expect(standaloneCalculatorRoute(flashingMaterialCalculator.id)).toBe("szegelyek");
    expect(standaloneCalculatorRoute(sheetMetalProfileCalculator.id)).toBe("lemezprofilok");
    expect(standaloneProjectRevisionHref("project-id", "org-id", flashingMaterialCalculator.id, "target-calculation", "target-revision"))
      .toBe("/projektek/project-id/szegelyek?organization=org-id&calculation=target-calculation&revision=target-revision");
  });

  it("reuses the same operation and profile target IDs for retries and creates new IDs for a new intent", () => {
    const ids = ["operation-1", "target-1", "operation-2", "target-2"];
    const uuid = () => ids.shift()!;
    const first = getOrCreateAssociationIdentity(null, sheetMetalProfileCalculator.id, uuid);
    const retry = getOrCreateAssociationIdentity(first, sheetMetalProfileCalculator.id, uuid);
    expect(retry).toBe(first);
    expect(retry).toEqual({ calculatorType: sheetMetalProfileCalculator.id, operationId: "operation-1", projectCalculationId: "target-1" });

    const nextIntent = getOrCreateAssociationIdentity(null, sheetMetalProfileCalculator.id, uuid);
    expect(nextIntent).toEqual({ calculatorType: sheetMetalProfileCalculator.id, operationId: "operation-2", projectCalculationId: "target-2" });
    expect(getOrCreateAssociationIdentity(null, gutterMaterialCalculator.id, () => "operation-3")).toEqual({ calculatorType: gutterMaterialCalculator.id, operationId: "operation-3" });
  });

  it("shows the exact saved revision and requires an explicit choice when editor changes are unsaved", () => {
    const html = renderToStaticMarkup(createElement(StandaloneAssociationConfirmation, {
      sourceName: "DEMO mentett szegély", sourceRevisionNumber: 4, calculatorType: flashingMaterialCalculator.id, hasUnsavedChanges: true,
      target: { expectedProjectRevisionNumber: 2, project: { id: "project", name: "DEMO tetőfelújítás", location: "Budapest", projectType: "residential", status: "active", version: 3 } },
    }));
    expect(html).toContain("Ellenőrizd a másolatot");
    expect(html).toContain("V4");
    expect(html).toContain("nem mentett szerkesztéseket nem veszi át");
    expect(html).toContain("Másolat létrehozása a projektben");
    expect(html).toContain("az önálló számítás változatlanul megmarad");
  });
});
