import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getGutterGeometrySuggestions } from "@/features/gutters/gutter-data";
import { getFlashingGeometrySuggestions } from "@/features/flashings/flashing-data";
import { getSheetMetalProfiles } from "@/features/sheet-metal/profile-data";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

function query(response: { data: unknown; error: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "is", "order", "limit"]) builder[method] = () => builder;
  builder.then = (resolve: (value: typeof response) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(response).then(resolve, reject);
  return builder;
}

function configureQuery(response: { data: unknown; error: { message: string } | null }) {
  vi.mocked(createClient).mockResolvedValue({ from: () => query(response) } as never);
}

describe("calculator data loading states", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps successful empty source data distinct from query failures", async () => {
    configureQuery({ data: [], error: null });
    await expect(getGutterGeometrySuggestions("org", "project")).resolves.toEqual([]);
    await expect(getFlashingGeometrySuggestions("org", "project")).resolves.toEqual([]);
    await expect(getSheetMetalProfiles("org", "project")).resolves.toEqual([]);
  });

  it("surfaces failures from the first query instead of reporting empty data", async () => {
    configureQuery({ data: null, error: { message: "private database detail" } });
    await expect(getGutterGeometrySuggestions("org", "project")).rejects.toThrow("A tetőadatok betöltése nem sikerült.");
    await expect(getFlashingGeometrySuggestions("org", "project")).rejects.toThrow("A tetőadatok betöltése nem sikerült.");
    await expect(getSheetMetalProfiles("org", "project")).rejects.toThrow("A mentett profilok betöltése nem sikerült.");
  });
});
