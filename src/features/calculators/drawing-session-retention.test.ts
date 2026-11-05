import { describe, expect, it } from "vitest";
import {
  ROOF_WORK_SESSION_TTL_MS,
  expiredRoofWorkSessionIds,
  isExpiredRoofWorkSession,
  roofWorkSessionRecordId,
  roofWorkSessionWriteDecision,
  shouldStoreRoofWorkSession,
  visibleRoofWorkSessions,
  type StoredRoofWorkSession,
} from "./drawing-session-retention";

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const record = (over: Partial<StoredRoofWorkSession> = {}): StoredRoofWorkSession => ({
  id: "u1:org1:aa", userId: "u1", organizationId: "org1", documentSha256: "aa",
  json: "{}", seq: 1, updatedAt: NOW, sectionCount: 2, sourceKind: "pdf", sourceName: "terv.pdf", ...over,
});

describe("rekordazonosság", () => {
  it("egy rajz + egy felhasználó + egy szervezet egyetlen rekord", () => {
    expect(roofWorkSessionRecordId("u1", "org1", "aa")).toBe("u1:org1:aa");
    // Ugyanaz a rajz más felhasználónál vagy más szervezetben külön rekord.
    expect(roofWorkSessionRecordId("u2", "org1", "aa")).not.toBe(roofWorkSessionRecordId("u1", "org1", "aa"));
    expect(roofWorkSessionRecordId("u1", "org2", "aa")).not.toBe(roofWorkSessionRecordId("u1", "org1", "aa"));
  });

  it("keeps material and timber sessions for the same drawing separate", () => {
    expect(roofWorkSessionRecordId("u1", "org1", "aa", "roof.material-takeoff")).not.toBe(
      roofWorkSessionRecordId("u1", "org1", "aa", "roof.timber-cutlist"),
    );
  });
});

describe("lejárat — 7 nap INAKTIVITÁS", () => {
  it("az utolsó írástól számol, nem a létrehozástól", () => {
    expect(isExpiredRoofWorkSession({ updatedAt: NOW - 6 * DAY }, NOW)).toBe(false);
    expect(isExpiredRoofWorkSession({ updatedAt: NOW - 7 * DAY }, NOW)).toBe(true);
    expect(isExpiredRoofWorkSession({ updatedAt: NOW - 8 * DAY }, NOW)).toBe(true);
    expect(ROOF_WORK_SESSION_TTL_MS).toBe(7 * DAY);
  });

  it("az aktívan szerkesztett munka nem jár le", () => {
    // Egy hét után írunk egyet: az óra újraindul.
    expect(isExpiredRoofWorkSession({ updatedAt: NOW - 1000 }, NOW)).toBe(false);
  });

  it("a lejárt rekord törlésre kerül, tulajdonostól függetlenül", () => {
    const records = [record({ id: "a", updatedAt: NOW - 8 * DAY }), record({ id: "b", userId: "más", updatedAt: NOW - 9 * DAY }), record({ id: "c" })];
    expect(expiredRoofWorkSessionIds(records, NOW)).toEqual(["a", "b"]);
  });
});

describe("felajánlás — izoláció adatvesztés nélkül", () => {
  const owner = { userId: "u1", organizationId: "org1" };

  it("csak a saját, ebben a szervezetben lévő, le nem járt munkát ajánlja fel", () => {
    const records = [
      record({ id: "sajat" }),
      record({ id: "mas-user", userId: "u2" }),
      record({ id: "mas-org", organizationId: "org2" }),
      record({ id: "lejart", updatedAt: NOW - 8 * DAY }),
    ];
    expect(visibleRoofWorkSessions(records, owner, NOW).map((item) => item.id)).toEqual(["sajat"]);
  });

  it("idegen rekordot nem mutat, de nem is töröl miatta — a fiókváltás nem vesz el munkát", () => {
    const records = [record({ id: "mas-user", userId: "u2" })];
    expect(visibleRoofWorkSessions(records, owner, NOW)).toHaveLength(0);
    // A takarítás kizárólag a lejáratra néz, a tulajdonosra nem.
    expect(expiredRoofWorkSessionIds(records, NOW)).toEqual([]);
  });

  it("a legutóbb mentett munka áll elöl", () => {
    const records = [record({ id: "regi", updatedAt: NOW - 2 * DAY }), record({ id: "friss", updatedAt: NOW - 1000 })];
    expect(visibleRoofWorkSessions(records, owner, NOW).map((item) => item.id)).toEqual(["friss", "regi"]);
  });
});

describe("több böngészőfül — frissebb munkamenetet nem írunk felül", () => {
  it("új rekord az 1. sorszámmal indul", () => {
    expect(roofWorkSessionWriteDecision(null, 0)).toEqual({ ok: true, seq: 1 });
  });

  it("a saját bázisára írva a sorszám nő", () => {
    expect(roofWorkSessionWriteDecision(4, 4)).toEqual({ ok: true, seq: 5 });
  });

  it("frissebb tárolt rekordnál az írás elmarad, nem fésül össze", () => {
    // A másik fül közben a 7-re vitte; ez a fül még az 5-nél tart.
    expect(roofWorkSessionWriteDecision(7, 5)).toEqual({ ok: false, reason: "conflict", storedSeq: 7 });
  });

  it("elavult bázisú fül a frissítés után újra írhat", () => {
    const conflict = roofWorkSessionWriteDecision(7, 5);
    expect(conflict.ok).toBe(false);
    // Miután a fül átvette a tárolt állapotot, a bázisa 7 lesz.
    expect(roofWorkSessionWriteDecision(7, 7)).toEqual({ ok: true, seq: 8 });
  });
});

describe("mikor mentünk egyáltalán", () => {
  it("a felajánlás megjelenése önmagában nem ír: üres rajzi állapotban nincs mit menteni", () => {
    expect(shouldStoreRoofWorkSession({ enabled: true, hasSource: false, sectionCount: 0 })).toBe(false);
    expect(shouldStoreRoofWorkSession({ enabled: true, hasSource: false, sectionCount: 2 })).toBe(false);
    expect(shouldStoreRoofWorkSession({ enabled: true, hasSource: true, sectionCount: 0 })).toBe(false);
  });

  it("engedély nélkül semmi nem kerül az eszközre", () => {
    expect(shouldStoreRoofWorkSession({ enabled: false, hasSource: true, sectionCount: 2 })).toBe(false);
  });

  it("betöltött forrás és legalább egy szakasz mellett mentünk", () => {
    expect(shouldStoreRoofWorkSession({ enabled: true, hasSource: true, sectionCount: 1 })).toBe(true);
  });
});
