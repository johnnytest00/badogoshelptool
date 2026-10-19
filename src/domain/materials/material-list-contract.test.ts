import { describe, expect, it } from "vitest";
import { workflowMaterialListInputSchema } from "./material-list-contract";

const ids = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  categoryId: "00000000-0000-4000-8000-000000000002",
  variantId: "00000000-0000-4000-8000-000000000003",
  requestKey: "00000000-0000-4000-8000-000000000004",
  itemId: "00000000-0000-4000-8000-000000000005",
  surveyId: "00000000-0000-4000-8000-000000000006",
  surveyRevisionId: "00000000-0000-4000-8000-000000000007",
  sectionId: "00000000-0000-4000-8000-000000000008",
  measurementId: "00000000-0000-4000-8000-000000000009",
};

const input = (item: Record<string, unknown>) => workflowMaterialListInputSchema.safeParse({
  organizationId: ids.organizationId, listId: null, executionPlanId: null, name: "DEMO lista",
  expectedVersion: 0, requestKey: ids.requestKey, items: [{
    id: ids.itemId, kind: "manual", description: "DEMO lemez", materialCategory: "other", categoryId: null,
    quantity: "2,5", unit: "linear_meter", variantId: null, priceId: null, manualPriceAmount: "", manualPriceKind: null,
    ...item,
  }],
});

describe("workflow material list contract", () => {
  it("allows an empty standalone draft but requires a line when importing a survey", () => {
    expect(workflowMaterialListInputSchema.safeParse({
      organizationId: ids.organizationId, listId: null, executionPlanId: null, name: "DEMO üres lista",
      expectedVersion: 0, requestKey: ids.requestKey, items: [],
    }).success).toBe(true);
    expect(workflowMaterialListInputSchema.safeParse({
      organizationId: ids.organizationId, listId: null, executionPlanId: null, name: "DEMO üres felmérési lista",
      expectedVersion: 0, requestKey: ids.requestKey,
      surveySource: { surveyId: ids.surveyId, surveyRevisionId: ids.surveyRevisionId, surveyVersion: 1, allowStaleSource: false },
      items: [],
    }).success).toBe(false);
  });

  it("accepts manual items without a catalog reference and normalizes Hungarian decimals", () => {
    const parsed = input({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.items[0].quantity).toBe("2.5");
  });

  it("allows an explicit zero price and requires its net or gross basis", () => {
    expect(input({ manualPriceAmount: "0", manualPriceKind: "gross" }).success).toBe(true);
    expect(input({ manualPriceAmount: "0", manualPriceKind: null }).success).toBe(false);
  });

  it("lets a catalog row carry either a catalog price or a manual override, never both", () => {
    const base = { kind: "catalog", categoryId: ids.categoryId, variantId: ids.variantId };
    expect(input({ ...base, manualPriceAmount: "2500", manualPriceKind: "net" }).success).toBe(true);
    expect(input({ ...base, priceId: "00000000-0000-4000-8000-0000000000aa", manualPriceAmount: "2500", manualPriceKind: "net" }).success).toBe(false);
    expect(input({ ...base, manualPriceKind: "net" }).success).toBe(false);
  });

  it("requires an organization category and variant for catalog rows", () => {
    expect(input({ kind: "catalog", categoryId: ids.categoryId, variantId: ids.variantId }).success).toBe(true);
    expect(input({ kind: "catalog", variantId: ids.variantId }).success).toBe(false);
    expect(input({ kind: "manual", categoryId: ids.categoryId }).success).toBe(false);
  });

  it("rejects zero and malformed quantity or price", () => {
    expect(input({ quantity: "0" }).success).toBe(false);
    expect(input({ manualPriceAmount: "1.234", manualPriceKind: "net" }).success).toBe(false);
  });

  it("requires exact survey revision provenance and rejects incompatible source units", () => {
    const measurementRef = { type: "measurement", sectionId: ids.sectionId, measurementId: ids.measurementId };
    expect(input({ sourceRef: measurementRef }).success).toBe(false);
    const validSource = workflowMaterialListInputSchema.safeParse({
      organizationId: ids.organizationId, listId: null, executionPlanId: null, name: "DEMO survey lista",
      expectedVersion: 0, requestKey: ids.requestKey,
      surveySource: { surveyId: ids.surveyId, surveyRevisionId: ids.surveyRevisionId, surveyVersion: 1, allowStaleSource: false },
      items: [{ id: ids.itemId, kind: "manual", description: "DEMO eresz", materialCategory: "gutter", categoryId: null,
        quantity: "2", unit: "linear_meter", variantId: null, priceId: null, manualPriceAmount: "", manualPriceKind: null, sourceRef: measurementRef }],
    });
    expect(validSource.success).toBe(true);
    if (validSource.success) expect(validSource.data.items[0].sourceRef).toEqual(measurementRef);

    expect(workflowMaterialListInputSchema.safeParse({
      organizationId: ids.organizationId, listId: null, executionPlanId: null, name: "DEMO hibás egység",
      expectedVersion: 0, requestKey: ids.requestKey,
      surveySource: { surveyId: ids.surveyId, surveyRevisionId: ids.surveyRevisionId, surveyVersion: 1, allowStaleSource: false },
      items: [{ id: ids.itemId, kind: "manual", description: "DEMO eresz", materialCategory: "gutter", categoryId: null,
        quantity: "2", unit: "piece", variantId: null, priceId: null, manualPriceAmount: "", manualPriceKind: null, sourceRef: measurementRef }],
    }).success).toBe(false);
  });
});
