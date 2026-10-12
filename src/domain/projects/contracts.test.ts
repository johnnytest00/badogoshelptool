import { describe, expect, it } from "vitest";
import { clientInputSchema, projectFilterSchema, projectInputSchema } from "./contracts";

describe("project and client contracts", () => {
  it("requires only a client name and accepts a reasonable Hungarian phone", () => {
    const result = clientInputSchema.parse({ name: "DEMO ügyfél", phone: "+36 30 123 4567" });
    expect(result.name).toBe("DEMO ügyfél");
  });

  it("validates project type and optional client", () => {
    const result = projectInputSchema.parse({ name: "DEMO munka", projectType: "gutter_work", clientId: "" });
    expect(result.projectType).toBe("gutter_work");
  });

  it("defaults filters to active projects sorted by latest activity", () => {
    expect(projectFilterSchema.parse({})).toEqual({ includeArchived: false, sort: "newest" });
  });
});
