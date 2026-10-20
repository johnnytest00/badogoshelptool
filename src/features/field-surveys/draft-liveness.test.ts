import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const held = new Set<string>();
const fakeLocks = () => ({
  request: (name: string, cb: () => unknown) => { held.add(name); return Promise.resolve(cb()); },
  query: async () => ({ held: [...held].map((name) => ({ name })) }),
});
const sessionOf = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
// Minimal BroadcastChannel: delivers to every other open channel of the same name, asynchronously.
const openChannels = new Set<FakeChannel>();
class FakeChannel {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  constructor(public name: string) { openChannels.add(this); }
  postMessage(data: unknown) { setTimeout(() => { for (const other of openChannels) if (other !== this && other.name === this.name) other.onmessage?.({ data }); }, 0); }
  close() { openChannels.delete(this); }
}

beforeEach(() => { held.clear(); openChannels.clear(); vi.resetModules(); });
afterEach(() => vi.unstubAllGlobals());

describe("tab identity", () => {
  it("is generated once and survives a refresh, even if the old page's lock lingers", async () => {
    const session = sessionOf(); vi.stubGlobal("sessionStorage", session); vi.stubGlobal("navigator", { locks: fakeLocks() }); vi.stubGlobal("BroadcastChannel", FakeChannel);
    const first = await (await import("./draft-liveness")).ensureTabId();
    expect(session.getItem("tetopro-tab")).toBe(first);
    openChannels.clear(); vi.resetModules(); // refresh: the old page is gone and answers nothing; its lock may still be listed
    expect(await (await import("./draft-liveness")).ensureTabId()).toBe(first);
  });
  it("a duplicated tab (copied sessionStorage while the original is alive) gets a NEW id", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    vi.stubGlobal("BroadcastChannel", FakeChannel); vi.stubGlobal("navigator", { locks: fakeLocks() });
    vi.stubGlobal("sessionStorage", sessionOf({ "tetopro-tab": id }));
    expect(await (await import("./draft-liveness")).ensureTabId()).toBe(id);
    vi.resetModules(); vi.stubGlobal("sessionStorage", sessionOf({ "tetopro-tab": id })); // the copy; the original page stays alive
    const mod = await import("./draft-liveness");
    const copy = await mod.ensureTabId();
    expect(copy).not.toBe(id);
    expect([...(await mod.liveTabIds())]).toEqual(expect.arrayContaining([id, copy]));
  });
  it("works without Web Locks, BroadcastChannel and with blocked sessionStorage (per-load id, nothing live)", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } }); vi.stubGlobal("navigator", {}); vi.stubGlobal("BroadcastChannel", undefined);
    const mod = await import("./draft-liveness");
    expect(await mod.ensureTabId()).toMatch(/^[0-9a-f-]{36}$/);
    expect((await mod.liveTabIds()).size).toBe(0);
  });
});
