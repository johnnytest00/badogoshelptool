import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getOrganization: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); } }));
vi.mock("@/features/projects/organization", () => ({ getProjectOrganization: state.getOrganization }));

import StandaloneFlashingPage from "./page";

describe("legacy standalone flashing route", () => {
  it("sends new calculator visits back to the calculator suite", async () => {
    state.getOrganization.mockResolvedValue({ organization: { id: "org-1" }, needsSelection: false });
    await expect(StandaloneFlashingPage({ searchParams: Promise.resolve({ organization: "org-1" }) }))
      .rejects.toThrow("NEXT_REDIRECT:/kalkulatorok?organization=org-1");
  });
});
