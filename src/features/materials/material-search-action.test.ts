import { beforeEach, expect, it, vi } from "vitest";
import { getAuthContext } from "@/features/auth/auth.server";
import { getMaterialProductPage } from "./material-data";
import { searchMaterialProductsAction } from "./material-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn() }));
vi.mock("./material-data", () => ({ getMaterialProductPage: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("rejects an unauthenticated or foreign organization before reading products", async () => {
  vi.mocked(getAuthContext).mockResolvedValueOnce(null).mockResolvedValueOnce({ organizations: [] } as never);
  await expect(searchMaterialProductsAction("org", { page: 11 })).rejects.toThrow("A munkamenet lejárt");
  await expect(searchMaterialProductsAction("org", { page: 11 })).rejects.toThrow("nincs hozzáférésed");
  expect(getMaterialProductPage).not.toHaveBeenCalled();
});

it("passes only the authorized organization to the paged loader", async () => {
  vi.mocked(getAuthContext).mockResolvedValue({ organizations: [{ id: "org" }] } as never);
  vi.mocked(getMaterialProductPage).mockResolvedValue({ products: [], total: 0, page: 1, pageSize: 50, hasNext: false });
  const filters = { search: "DEMO panel", page: 1 };
  await expect(searchMaterialProductsAction("org", filters)).resolves.toMatchObject({ total: 0 });
  expect(getMaterialProductPage).toHaveBeenCalledExactlyOnceWith("org", filters);
});
