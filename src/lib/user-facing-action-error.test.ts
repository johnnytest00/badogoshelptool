import { describe, expect, it } from "vitest";
import { userFacingActionError } from "./user-facing-action-error";

describe("userFacingActionError", () => {
  it("gives actionable guidance for revision conflicts and permissions", () => {
    expect(userFacingActionError({ code: "40001", message: "SQLSTATE stale RPC detail" }, "Mentés nem sikerült"))
      .toContain("Töltsd újra");
    expect(userFacingActionError({ code: "42501", message: "permission denied for table" }, "Mentés nem sikerült"))
      .toContain("Nincs jogosultságod");
  });

  it("never exposes database or RPC implementation details", () => {
    const technical = "SQLSTATE 99999: rpc save_quotation_draft failed at internal_id abc";
    expect(userFacingActionError({ code: "99999", message: technical }, "Az ajánlat mentése nem sikerült."))
      .toBe("Az ajánlat mentése nem sikerült.");
  });

  it("explains missing sources and invalid data separately", () => {
    expect(userFacingActionError({ code: "23503" }, "fallback")).toContain("forrásadat");
    expect(userFacingActionError({ code: "23514" }, "fallback")).toContain("Ellenőrizd");
  });
});
