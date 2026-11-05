import { describe, expect, it } from "vitest";
import { discardLengthDraftsForFields, forgetWorkspace, rememberWorkspace, rememberedWorkspace, workspaceKey } from "./construction-workspace-memory";

it("keeps back/forward drafts separate by user, organization and calculation, and discards explicitly", () => {
  const key = workspaceKey("user-a", "org-a", "calculation-a");
  const draft = { selectedId: "roof.rafter-cut", category: "roof" as const, drafts: { "roof.rafter-cut": { riseMm: "2100" } }, lengthDrafts: {}, dirtyDrafts: { "roof.rafter-cut": true }, materialByCalculator: {}, sessions: {}, draftEpoch: 0 };
  rememberWorkspace(key, draft);
  expect(rememberedWorkspace(key)?.drafts["roof.rafter-cut"].riseMm).toBe("2100");
  expect(rememberedWorkspace(workspaceKey("user-a", "org-b", "calculation-a"))).toBeUndefined();
  expect(rememberedWorkspace(workspaceKey("user-b", "org-a", "calculation-a"))).toBeUndefined();
  expect(rememberedWorkspace(workspaceKey("user-a", "org-a", null))).toBeUndefined();
  forgetWorkspace(key);
  expect(rememberedWorkspace(key)).toBeUndefined();
});

describe("discardLengthDraftsForFields", () => {
  it("removes only externally replaced fields for the selected calculator", () => {
    const drafts = {
      "roof.rafter-cut": { horizontalHalfSpanMm: { text: "300", unit: "cm" as const }, riseMm: { text: "200", unit: "cm" as const } },
      "roof.truss-members": { spanMm: { text: "600", unit: "cm" as const } },
    };
    expect(discardLengthDraftsForFields(drafts, "roof.rafter-cut", ["horizontalHalfSpanMm"])).toEqual({
      "roof.rafter-cut": { riseMm: { text: "200", unit: "cm" } },
      "roof.truss-members": { spanMm: { text: "600", unit: "cm" } },
    });
  });
});
