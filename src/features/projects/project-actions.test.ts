import { describe, expect, it } from "vitest";
import { projectStatusLabels, projectTypeLabels } from "@/domain/projects/contracts";

describe("project lifecycle presentation contracts", () => {
  it("has Hungarian labels for every persisted project type and status", () => {
    expect(Object.keys(projectTypeLabels)).toHaveLength(4);
    expect(Object.keys(projectStatusLabels)).toHaveLength(6);
    expect(projectStatusLabels.archived).toBe("Archiválva");
  });

  it("keeps archive as a reversible lifecycle state", () => {
    expect(projectStatusLabels.in_progress).toBe("Folyamatban");
    expect(projectStatusLabels.archived).not.toBe("Törölve");
  });
});
