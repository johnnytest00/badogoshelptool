import { describe, expect, it } from "vitest";
import { dashboardFunctions, demoProjects } from "@/features/dashboard/dashboard.data";
import { getNextDashboardTab } from "@/features/dashboard/dashboard.utils";

describe("dashboard foundation", () => {
  it("contains the six planned Hungarian launchers", () => {
    expect(dashboardFunctions).toHaveLength(6);
    expect(dashboardFunctions.map((item) => item.label)).toEqual([
      "Projektek", "Kalkulátorok", "Árajánlatok", "Anyagok", "Munkacsomagok", "Dokumentumok",
    ]);
  });

  it("keeps project previews explicitly marked as demo data", () => {
    expect(demoProjects).toHaveLength(3);
    expect(demoProjects.every((project) => project.id.length > 0 && project.name.length > 0)).toBe(true);
  });

  it("supports arrow-key tab navigation in both directions", () => {
    expect(getNextDashboardTab("functions", "forward")).toBe("projects");
    expect(getNextDashboardTab("projects", "forward")).toBe("functions");
    expect(getNextDashboardTab("projects", "backward")).toBe("functions");
    expect(getNextDashboardTab("functions", "backward")).toBe("projects");
  });
});
