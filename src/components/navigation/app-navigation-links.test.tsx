// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useSearchParams: () => new URLSearchParams("organization=org-1") }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }));
vi.mock("@/components/navigation/guarded-link", () => ({ GuardedLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock("@/components/navigation/account-hub", () => ({ AccountHub: () => null }));

import { AppNavigationLinks } from "./app-navigation-links";

afterEach(() => cleanup());

describe("AppNavigationLinks", () => {
  it("opens the mobile menu and closes it with Escape", () => {
    render(<AppNavigationLinks displayName={null} email={null} organizations={[]} organizationId="org-1" />);
    const trigger = screen.getByRole("button", { name: "Menü megnyitása" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "Főmenü" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Műhely" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
