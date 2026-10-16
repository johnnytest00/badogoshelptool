import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => createElement("img", props) }));
vi.mock("@/components/theme/theme-provider", () => ({ useTheme: () => ({ mode: "light", setMode: vi.fn() }) }));
vi.mock("@/features/preferences/scaling-controls", () => ({ ScalingControls: () => createElement("div", { className: "mock-scaling-controls" }) }));
vi.mock("@/components/navigation/guarded-link", () => ({ GuardedLink: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => createElement("a", { href, className }, children) }));
vi.mock("@/features/auth/actions", () => ({ logoutAction: vi.fn() }));

import { DashboardHeader, DashboardSettings } from "./dashboard";

describe("dashboard shared mobile header and full settings", () => {
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
    const html = renderToStaticMarkup(createElement(DashboardSettings, { onOpenAccount: () => undefined }));
    expect(html).toContain("Fiókbeállítások");
    expect(html).toContain('class="settings-logout-form"');
    expect(html).toContain("Kilépés");
    expect(html.match(/Kilépés/g)).toHaveLength(1);
  });
});
