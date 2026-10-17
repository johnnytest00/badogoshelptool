import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => createElement("img", props) }));
vi.mock("@/components/theme/theme-provider", () => ({ useTheme: () => ({ mode: "light", setMode: vi.fn() }) }));
vi.mock("@/components/theme/theme-toggle", () => ({ ThemeToggle: () => createElement("button", { type: "button" }, "Téma") }));
vi.mock("@/features/preferences/scaling-controls", () => ({ ScalingControls: () => createElement("div", { className: "mock-scaling-controls" }) }));
vi.mock("@/features/auth/account-management-dialog", () => ({ AccountManagementDialog: () => null }));
vi.mock("@/components/navigation/guarded-link", () => ({ GuardedLink: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => createElement("a", { href, className }, children) }));
vi.mock("@/features/auth/actions", () => ({ logoutAction: vi.fn() }));

import { Dashboard, DashboardHeader, DashboardSettings } from "./dashboard";
import { LiquidGlassProvider } from "@/features/preferences/liquid-glass-provider";

describe("dashboard shared mobile header and full settings", () => {
  it("keeps one semantic title, the two tabs and six function cards without decorative introductions", () => {
    const html = renderToStaticMarkup(createElement(Dashboard, { organizationId: "demo-org" }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Műhely");
    for (const oldIntro of ["TETŐPRÓ · MŰHELY", "Miben segíthetünk ma?", "Gyorsindító", "Munkafolyamatok egy helyen", "Válassz egy területet a következő lépéshez"]) {
      expect(html).not.toContain(oldIntro);
    }
    const labels = ["Felmérések", "Munkanaplók", "Anyaglisták", "Anyagkezelő", "Árajánlatok", "Kalkulátorok"];
    expect(labels.every((label) => html.includes(label))).toBe(true);
    expect(labels.map((label) => html.indexOf(label))).toEqual([...labels.map((label) => html.indexOf(label))].sort((a, b) => a - b));
    expect(html).toContain("Aktuális munkák");
  });

  it("keeps brand, theme and settings while removing the account icon/menu and header logout", () => {
    const html = renderToStaticMarkup(createElement(DashboardHeader, {
      displayName: "DEMO felhasználó", email: "demo@local.test", organizationName: "DEMO műhely", settingsOpen: false, onToggleSettings: () => undefined,
    }));
    expect(html).toContain("TETŐPRO");
    expect(html).toContain('aria-label="Beállítások"');
    expect(html).not.toContain('aria-label="Fiókmenü"');
    expect(html).not.toContain("mobile-account-menu");
    expect(html).not.toContain("Kilépés");
  });

  it("keeps account management in full settings and places one secure logout form there", () => {
    const html = renderToStaticMarkup(createElement(LiquidGlassProvider, null, createElement(DashboardSettings, { onOpenAccount: () => undefined })));
    expect(html).toContain("Fiókbeállítások");
    expect(html).toContain("Méretezések");
    expect(html).toContain("Liquid Glass");
    expect(html).toContain('id="liquid-glass-opacity"');
    expect(html).toContain('value="10"');
    expect(html).toContain('name="liquid-glass-tint"');
    expect(html.match(/<details/g)).toHaveLength(3);
    expect(html).toContain('class="settings-logout-form"');
    expect(html).toContain("Kilépés");
    expect(html.match(/Kilépés/g)).toHaveLength(1);
  });
});
