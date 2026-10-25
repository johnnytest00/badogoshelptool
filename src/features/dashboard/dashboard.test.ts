import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard, ProjectsView } from "@/features/dashboard/dashboard";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ScalingProvider } from "@/features/preferences/scaling-provider";
import { vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => createElement("img", props) }));
import { dashboardFunctionHref, dashboardFunctions } from "@/features/dashboard/dashboard.data";
import { getDashboardGreeting, getNextDashboardTab } from "@/features/dashboard/dashboard.utils";

describe("dashboard foundation", () => {
  it("contains only implemented Hungarian launchers", () => {
    expect(dashboardFunctions).toHaveLength(5);
    expect(dashboardFunctions.map((item) => item.label)).toEqual([
      "Kalkulátorok", "Munkanaplók", "Árajánlatok", "Anyaglisták", "Anyagkezelő",
    ]);
  });

  it("keeps the selected organization in every global module route", () => {
    const organizationId = "a1b2-c3d4";
    expect(dashboardFunctions.map((item) => dashboardFunctionHref(item.id, organizationId))).toEqual([
      "/kalkulatorok?organization=a1b2-c3d4",
      "/kivitelezes?organization=a1b2-c3d4",
      "/ajanlatok?organization=a1b2-c3d4",
      "/anyaglistak?organization=a1b2-c3d4",
      "/anyagkezelo?organization=a1b2-c3d4",
    ]);
    expect(() => dashboardFunctionHref("documents", organizationId)).toThrow("Ismeretlen dashboard funkció");
  });

  it("supports arrow-key tab navigation in both directions", () => {
    expect(getNextDashboardTab("functions", "forward")).toBe("work");
    expect(getNextDashboardTab("work", "forward")).toBe("functions");
    expect(getNextDashboardTab("work", "backward")).toBe("functions");
    expect(getNextDashboardTab("functions", "backward")).toBe("work");
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

    expect(html).toContain('id="dashboard-tab-functions"');
    expect(html).toContain('id="dashboard-tab-work"');
    expect(html.indexOf("Funkciók")).toBeLessThan(html.indexOf("Aktuális munkák"));
    expect(html).not.toContain('href="/projektek?organization=org-demo"');
    expect(dashboardFunctions.every(({ label }) => html.includes(`>${label}</strong>`))).toBe(true);
  });

  it("keeps the worklog empty state aligned with supported entry points", () => {
    const html = renderToStaticMarkup(createElement(ProjectsView, { plans: [], organizationId: "org-demo" }));
    expect(html).toContain("Munkanaplót önállóan vagy mentett kalkulációból indíthatsz.");
    expect(html).not.toContain("felmérésből");
    expect(html).toContain('href="/kivitelezes/uj?organization=org-demo"');
  });
});
