import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/sheet-metal/profile-actions", () => ({ saveSheetMetalProfileAction: vi.fn(), createProfileTakeoffDraftAction: vi.fn() }));

import { ProfileEditor } from "@/features/sheet-metal/profile-editor";

afterEach(() => vi.unstubAllGlobals());

describe("client calculator runtime without crypto.randomUUID", () => {
  it("renders the calculator initial state through getRandomValues fallback", () => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => { bytes.fill(0x5a); return bytes; } });
    const profile = renderToStaticMarkup(createElement(ProfileEditor, { organizationId: "org", projectId: "project", profiles: [], catalogCandidates: [] }));
    expect(profile).toContain("Lemezprofilok és hajtások");
  });
});
