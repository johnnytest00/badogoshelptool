/**
 * A1: a helyi rajzos munkamenetek tárolója. Egyetlen IndexedDB object store, nem általános tárolási keretrendszer.
 *
 * Ez az adapter NEM dönt: a lejárat, a tulajdonosszűrés és a több füles ütközés szabályai a
 * `drawing-session-retention.ts`-ben vannak, és onnan hívódnak. A tárolt érték a meglévő v3 munkamenet-JSON,
 * változatlanul — ugyanaz, amit a kézi export ír fájlba. A tervrajz bájtjai SOHA nem kerülnek ide.
 *
 * Minden művelet hibatűrő: ha a tár nem elérhető (privát ablak, letiltott tárhely) vagy megtelt, a hívó
 * egyértelmű állapotot kap, a munkavégzés pedig nem akad meg. Terv: `docs/DRAWING_SESSION_PERSISTENCE_DESIGN.md`.
 */
import {
  expiredRoofWorkSessionIds,
  roofWorkSessionWriteDecision,
  visibleRoofWorkSessions,
  type StoredRoofWorkSession,
} from "@/features/calculators/drawing-session-retention";

const DB_NAME = "tetopro-drawings";
const DB_VERSION = 1;
const STORE = "roof-work-sessions";

export type RoofWorkSessionStoreFailure = "blocked" | "quota" | "conflict";
export type RoofWorkSessionWriteResult =
  | Readonly<{ ok: true; seq: number }>
  | Readonly<{ ok: false; reason: RoofWorkSessionStoreFailure; storedSeq?: number }>;

/** A böngésző megtelt-e, vagy egyszerűen nincs tár: a felhasználónak más a teendője, ezért külön állapot. */
const failureOf = (reason: unknown): "quota" | "blocked" =>
  reason instanceof DOMException && (reason.name === "QuotaExceededError" || reason.name === "NS_ERROR_DOM_QUOTA_REACHED") ? "quota" : "blocked";

const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error("indexeddb-request-failed"));
});

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Privát ablakban vagy letiltott tárhely mellett maga az `open` dob, vagy sosem jelez vissza.
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb-unavailable")); return; }
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: "id" }); };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("indexeddb-open-failed"));
    open.onblocked = () => reject(new Error("indexeddb-blocked"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE, mode);
    // Az olvasás-ellenőrzés-írás ugyanabban a tranzakcióban fut, ezért a `seq`-ellenőrzés és az írás közé
    // nem férhet be másik fül: ez a több füles védelem helyességi határa.
    const result = await run(transaction.objectStore(STORE));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb-transaction-aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb-transaction-failed"));
    });
    return result;
  } finally {
    db.close();
  }
}

export type RoofWorkSessionListing =
  | Readonly<{ ok: true; records: readonly StoredRoofWorkSession[] }>
  | Readonly<{ ok: false; reason: "blocked" }>;

/**
 * Felajánlható munkák. Előbb a LEJÁRT rekordokat törli (lusta takarítás: zárt tab és leállított alkalmazás
 * mellett is működik), és csak utána szűr tulajdonosra — lejárt rekord így sosem marad rejtve a tárban.
 */
export async function listRoofWorkSessions(owner: Readonly<{ userId: string; organizationId: string }>, now = Date.now()): Promise<RoofWorkSessionListing> {
  try {
    const records = await withStore("readwrite", async (store) => {
      const all = await request<StoredRoofWorkSession[]>(store.getAll());
      for (const id of expiredRoofWorkSessionIds(all, now)) store.delete(id);
      return all;
    });
    return { ok: true, records: visibleRoofWorkSessions(records, owner, now) };
  } catch {
    return { ok: false, reason: "blocked" };
  }
}

/**
 * Mentés. `baseSeq` a hívó fül bázisa (0, ha még nem látott rekordot); frissebb tárolt rekordnál az írás
 * elmarad, és a hívó `conflict`-ot kap — csendes felülírás nincs, összefésülés nincs.
 */
export async function putRoofWorkSession(record: Omit<StoredRoofWorkSession, "seq" | "updatedAt">, baseSeq: number, now = Date.now()): Promise<RoofWorkSessionWriteResult> {
  try {
    return await withStore("readwrite", async (store) => {
      const stored = await request<StoredRoofWorkSession | undefined>(store.get(record.id));
      const decision = roofWorkSessionWriteDecision(stored?.seq ?? null, baseSeq);
      if (!decision.ok) return { ok: false, reason: "conflict", storedSeq: decision.storedSeq } as const;
      await request(store.put({ ...record, seq: decision.seq, updatedAt: now } satisfies StoredRoofWorkSession));
      return { ok: true, seq: decision.seq } as const;
    });
  } catch (reason) {
    return { ok: false, reason: failureOf(reason) };
  }
}

export async function removeRoofWorkSession(id: string): Promise<boolean> {
  try {
    await withStore("readwrite", async (store) => { await request(store.delete(id)); });
    return true;
  } catch {
    return false;
  }
}

/**
 * Eszközszintű törlés: FELFEDÉS NÉLKÜL töröl. Bárki futtathatja — megosztott tableten ez a valódi válasz —,
 * de senki nem lát tőle más felhasználó munkájából semmit.
 */
export async function clearRoofWorkSessionsOnDevice(): Promise<boolean> {
  try {
    await withStore("readwrite", async (store) => { await request(store.clear()); });
    return true;
  } catch {
    return false;
  }
}
