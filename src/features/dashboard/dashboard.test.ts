import { describe, expect, it } from "vitest";
import { dashboardFunctionHref, dashboardFunctions, demoProjects } from "@/features/dashboard/dashboard.data";
import { getNextDashboardTab } from "@/features/dashboard/dashboard.utils";

describe("dashboard foundation", () => {
  it("contains only implemented Hungarian launchers", () => {
    expect(dashboardFunctions).toHaveLength(6);
    expect(dashboardFunctions.map((item) => item.label)).toEqual([
      "Gyors felmérés", "Projektek", "Kalkulátorok", "Árajánlatok", "Anyagok", "Kivitelezés",
    ]);
  });

  it("keeps the selected organization in every global module route", () => {
    const organizationId = "a1b2-c3d4";
    expect(dashboardFunctions.map((item) => dashboardFunctionHref(item.id, organizationId))).toEqual([
      "/felmeresek/uj?organization=a1b2-c3d4",
      "/projektek?organization=a1b2-c3d4",
      "/kalkulatorok?organization=a1b2-c3d4",
      "/ajanlatok?organization=a1b2-c3d4",
      "/anyagok?organization=a1b2-c3d4",
      "/kivitelezes?organization=a1b2-c3d4",
    ]);
    expect(() => dashboardFunctionHref("documents", organizationId)).toThrow("Ismeretlen dashboard funkció");
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
