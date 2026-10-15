import { describe, expect, it } from "vitest";
import { materialPreparationCsv, preparationListSaveSchema, type MaterialPreparationItem } from "./contracts";

const base = { organizationId: "00000000-0000-4000-8000-000000000010", projectId: "00000000-0000-4000-8000-000000000030", preparationId: null, name: "DEMO felújítás", sourceTakeoffIds: [], items: [], expectedVersion: 0, requestKey: "00000000-0000-4000-8000-000000000001" };

describe("material preparation contracts", () => {
  it("requires explicit manual workshop provenance and a valid exact unit", () => {
    const manual = { id: "00000000-0000-4000-8000-000000000002", sourceItemIds: [], category: "workshop", status: "prepare", description: "DEMO kézi szegély", quantity: "2.5", unit: "piece", manualTechnicalData: { lengthMm: "1200", materialSpec: "DEMO lemez" } };
    expect(preparationListSaveSchema.safeParse({ ...base, items: [manual] }).success).toBe(true);
    expect(preparationListSaveSchema.safeParse({ ...base, items: [{ ...manual, category: "purchasing" }] }).success).toBe(false);
    expect(preparationListSaveSchema.safeParse({ ...base, items: [{ ...manual, quantity: "-1" }] }).success).toBe(false);
  });

  it("rejects duplicate source identities and duplicate takeoff selections", () => {
    const id = "00000000-0000-4000-8000-000000000020";
    const line = { id: "00000000-0000-4000-8000-000000000002", sourceItemIds: [id], category: "purchasing", status: "required", description: "DEMO lemez" };
    expect(preparationListSaveSchema.safeParse({ ...base, sourceTakeoffIds: ["00000000-0000-4000-8000-000000000021", "00000000-0000-4000-8000-000000000021"], items: [line] }).success).toBe(false);
    expect(preparationListSaveSchema.safeParse({ ...base, items: [line, { ...line, id: "00000000-0000-4000-8000-000000000003" }] }).success).toBe(false);
  });

  it("exports semicolon CSV with a BOM, escaped cells, status and explicit manual source", () => {
    const items: MaterialPreparationItem[] = [{
      id: "1", kind: "manual", category: "workshop", status: "prepare", description: "=HYPERLINK(\"x\")",
      quantity: "2.5", unit: "piece", dimensions: { lengthMm: 1200 }, sourceItemIds: [], sourceSnapshots: [], supplier: null, notes: "\"DEMO\"", provenance: "manual",
    }];
    const csv = materialPreparationCsv("DEMO; próba", items, { piece: "db" });
    expect(csv.startsWith("\uFEFF\"Lista\";\"Kategória\";\"Tétel\"")).toBe(true);
    expect(csv).toContain("'=HYPERLINK(" );
    expect(csv).toContain("lengthMm: 1200");
    expect(csv).toContain("\"Kézi tétel\"");
    expect(csv).toContain("\"\"DEMO\"\"");
  });
});
