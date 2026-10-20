import { generateSecureUuid } from "@/lib/secure-uuid";

const PREFIX = "tetopro-tab:";
const CHANNEL = "tetopro-tab-identity";
const TAB_KEY = "tetopro-tab";
let cached: string | null = null;

/**
 * Asks other open pages whether a live page already uses this tab id. A refreshed tab's previous page is gone and never answers; a
 * duplicated tab (copied sessionStorage) is answered by the original. (A Web Lock is unreliable here: it can linger briefly after a refresh.)
 */
async function idInUse(id: string): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return false;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    const inUse = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 300);
      channel.onmessage = (event) => { if (event.data?.type === "alive" && event.data.id === id) { clearTimeout(timer); resolve(true); } };
      channel.postMessage({ type: "who", id });
    });
    if (inUse) { channel.close(); return true; }
    // Stay reachable for the lifetime of this page, so a later duplicate of this tab is detected.
    channel.onmessage = (event) => { if (event.data?.type === "who" && event.data.id === id) channel.postMessage({ type: "alive", id }); };
    return false;
  } catch { return false; }
}

/** Marks this tab id as live (for other tabs' dashboards). Waits quietly if a lingering previous page still holds it. */
function announceLive(id: string) {
  try { if (navigator.locks) void navigator.locks.request(PREFIX + id, () => new Promise<void>(() => undefined)).catch(() => undefined); } catch { /* Optional. */ }
}

/**
 * Stable identity of THIS browser tab: kept in sessionStorage (survives refresh, not shared between tabs). A duplicated tab copies
 * sessionStorage, so the id is only kept if no other live page answers for it; otherwise the copy gets a new id.
 * Without sessionStorage the id is per page load, which can never be mistaken for another tab's draft.
 */
export async function ensureTabId(): Promise<string> {
  if (cached) return cached;
  let id: string | null = null;
  try { id = sessionStorage.getItem(TAB_KEY); } catch { /* Blocked storage: fall back to a per-load id. */ }
  if (id && await idInUse(id)) id = null;
  if (!id) { id = generateSecureUuid(); await idInUse(id); try { sessionStorage.setItem(TAB_KEY, id); } catch { /* Optional. */ } }
  announceLive(id);
  cached = id;
  return id;
}

export function ownTabIdSync(): string | null { try { return sessionStorage.getItem(TAB_KEY); } catch { return null; } }

/** Tab ids of pages currently open in any tab. Without Web Locks nothing is "live": drafts stay visible, never hidden. */
export async function liveTabIds(): Promise<Set<string>> {
  try {
    const state = await navigator.locks.query();
    return new Set((state.held ?? []).flatMap((lock) => lock.name?.startsWith(PREFIX) ? [lock.name.slice(PREFIX.length)] : []));
  } catch { return new Set(); }
}
