import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard } from "@/features/dashboard/dashboard";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ScalingProvider } from "@/features/preferences/scaling-provider";
import { vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => createElement("img", props) }));
import { dashboardFunctionHref, dashboardFunctions, demoProjects } from "@/features/dashboard/dashboard.data";
import { getDashboardGreeting, getNextDashboardTab } from "@/features/dashboard/dashboard.utils";

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

  it("uses a greeting that matches the local hour", () => {
    expect(getDashboardGreeting(1)).toBe("Jó éjszakát!");
    expect(getDashboardGreeting(5)).toBe("Jó reggelt!");
    expect(getDashboardGreeting(11)).toBe("Jó napot!");
    expect(getDashboardGreeting(18)).toBe("Jó estét!");
    expect(getDashboardGreeting(22)).toBe("Jó éjszakát!");
  });

  it("renders the dashboard greeting as a dedicated desktop section and keeps compact mobile tab hooks", () => {
    const html = renderToStaticMarkup(createElement(ThemeProvider, null,
      createElement(ScalingProvider, null,
        createElement(Dashboard, { organizationId: "org-demo", displayName: "DEMO user" }),
      ),
    ));

    expect(html).toContain('class="greeting-section dashboard-greeting"');
    expect(html).toContain('id="dashboard-tab-functions"');
    expect(html).toContain('id="dashboard-tab-projects"');
    expect(html.indexOf("Funkciók")).toBeLessThan(html.indexOf("Aktuális munkák"));
    expect(dashboardFunctions.every(({ label }) => html.includes(`>${label}</strong>`))).toBe(true);
  });
});
