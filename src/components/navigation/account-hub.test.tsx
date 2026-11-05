// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { setMode } = vi.hoisted(() => ({ setMode: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("organization=org-1") }));
vi.mock("@/components/theme/theme-provider", () => ({ useTheme: () => ({ mode: "dark", setMode }) }));
vi.mock("@/features/auth/account-management-dialog", () => ({ AccountManagementDialog: () => null }));
vi.mock("@/features/auth/auth-controls", () => ({ LogoutButton: () => <button type="button">Kilépés</button> }));
vi.mock("@/features/dashboard/dashboard", () => ({ DashboardSettings: () => <div>Meglévő megjelenítési beállítások</div> }));

import { AccountHub } from "./account-hub";

afterEach(() => { cleanup(); setMode.mockClear(); });

const props = { displayName: null, email: "bence@example.test", organizations: [{ id: "org-1", name: "Műhely" , role: "owner" as const }], organizationId: null };

describe("AccountHub", () => {
  it("shows a safe greeting and avatar, opens the menu, and restores focus on Escape", () => {
    const { container } = render(<AccountHub {...props} />);
    const trigger = screen.getByRole("button", { name: "Beállítások megnyitása" });
    expect(screen.getByText("Beállítások")).toBeTruthy();
    expect(container.querySelector(".app-account-avatar img")).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Profilmenü" })).toBeTruthy();
    expect(screen.getByText("Műhely")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Profilmenü" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Profilmenü" })).toBeNull();
  });

  it("uses the existing persisted theme control and opens the existing settings panel", () => {
    render(<AccountHub {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Beállítások megnyitása" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Téma" }), { target: { value: "light" } });
    expect(setMode).toHaveBeenCalledWith("light");
    fireEvent.click(screen.getByRole("button", { name: "Beállítások" }));
    expect(screen.getByText("Meglévő megjelenítési beállítások")).toBeTruthy();
  });
});
