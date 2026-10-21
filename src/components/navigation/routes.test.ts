import { describe, expect, it } from "vitest";
import { canonicalRoute, isNavigationTarget, isRouteActive } from "@/components/navigation/routes";

describe("navigációs útvonalak", () => {
  it("az anyagok aliast az anyagkezelőre képezi", () => {
    expect(canonicalRoute("/anyagok?organization=abc")).toBe("/anyagkezelo");
    expect(canonicalRoute("/anyagok/42?organization=abc")).toBe("/anyagkezelo/42");
    expect(canonicalRoute("/anyagok/uj")).toBe("/anyagkezelo/uj");
    expect(canonicalRoute("/anyagkezelo")).toBe("/anyagkezelo");
  });

  it("a termékoldalon az Anyagkezelő menüpont aktív", () => {
    expect(isRouteActive("/anyagok/42", "/anyagkezelo")).toBe(true);
    expect(isRouteActive("/anyagok", "/anyagkezelo")).toBe(true);
    expect(isRouteActive("/anyagkezelo", "/anyagkezelo")).toBe(true);
  });

  it("a Műhely csak a gyökéren aktív, más menüpont nem szivárog át", () => {
    expect(isRouteActive("/", "/")).toBe(true);
    expect(isRouteActive("/felmeresek", "/")).toBe(false);
    expect(isRouteActive("/anyaglistak", "/anyagkezelo")).toBe(false);
    expect(isRouteActive("/anyagkimutatasok", "/anyaglistak")).toBe(false);
  });

  it("a főútvonalakat felismeri, a beágyazott oldalakat nem", () => {
    expect(isNavigationTarget("/anyagok?organization=abc")).toBe(true);
    expect(isNavigationTarget("/felmeresek")).toBe(true);
    expect(isNavigationTarget("/")).toBe(true);
    expect(isNavigationTarget("/anyagok/42")).toBe(false);
    expect(isNavigationTarget("/projektek/123")).toBe(false);
  });

  it("a záró perjelet és a hash-t is levágja", () => {
    expect(canonicalRoute("/felmeresek/")).toBe("/felmeresek");
    expect(canonicalRoute("/felmeresek#main")).toBe("/felmeresek");
    expect(canonicalRoute("/")).toBe("/");
  });
});
