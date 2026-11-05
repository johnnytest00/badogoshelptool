/**
 * A1: a helyben megőrzött rajzos munkamenet DÖNTÉSEI — tárolástól függetlenül, ezért maradéktalanul tesztelhetők.
 *
 * A tároló (IndexedDB) ezek köré épül, és maga nem dönt semmiről: `src/infrastructure/drawings/roof-work-session-store.ts`.
 * A tárolt tartalom a meglévő v3 munkamenet-JSON — pontosan az, amit a kézi „Munkaállapot mentése" ír fájlba
 * (`drawing-roof-work-session.ts`); ez a modul sem formátumot, sem validációt nem duplikál, csak a rekord köré
 * tartozó kérdésekre felel: kié, meddig él, szabad-e írni, mit ajánlunk fel.
 *
 * Terv: `docs/DRAWING_SESSION_PERSISTENCE_DESIGN.md`.
 */

/** A rajz bájtjai sosem kerülnek a tárba; a rekord a v3 JSON-t és a felajánláshoz szükséges keveset tartja. */
export type StoredRoofWorkSession = Readonly<{
  id: string;
  userId: string;
  organizationId: string;
  /** A forrásrajz SHA-256-ja: a visszakötés és a rekord azonosságának alapja. */
  documentSha256: string;
  /** A v3 munkamenet-JSON, változatlanul. */
  json: string;
  /** Monoton; csak a tár növeli. A több füles ütközés ezen dől el. */
  seq: number;
  /** Az utolsó írás ideje (epoch ms). A lejárat ettől számít, nem a létrehozástól. */
  updatedAt: number;
  /** A felajánláshoz, hogy a listázás ne legyen kénytelen JSON-t parse-olni. */
  sectionCount: number;
  /** A forrás típusa és neve a felajánlás szövegéhez; a fájl tartalma nem. */
  sourceKind: "pdf" | "image";
  sourceName: string;
  /** Missing on records written before calculator isolation; those are material takeoffs. */
  calculatorId?: "roof.material-takeoff" | "roof.timber-cutlist";
}>;

/** 7 nap INAKTIVITÁS: az aktívan szerkesztett munka sosem jár le, mert minden írás frissíti az `updatedAt`-et. */
export const ROOF_WORK_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Egy rajz + egy felhasználó + egy szervezet = egy rekord. Két fül ugyanazon a rajzon ezért ütközhet. */
export const roofWorkSessionRecordId = (userId: string, organizationId: string, documentSha256: string, calculatorId = "roof.material-takeoff") =>
  calculatorId === "roof.material-takeoff" ? `${userId}:${organizationId}:${documentSha256}` : `${userId}:${organizationId}:${calculatorId}:${documentSha256}`;

export const isExpiredRoofWorkSession = (record: Pick<StoredRoofWorkSession, "updatedAt">, now: number, ttlMs = ROOF_WORK_SESSION_TTL_MS) =>
  now - record.updatedAt >= ttlMs;

/**
 * Amit a felhasználónak felajánlunk: a sajátja, ebben a szervezetben, és még nem járt le.
 * Idegen rekordot nem mutatunk — de nem is törlünk miatta: egy fiókváltás nem vehet el munkát (terv 3. szakasz).
 */
export function visibleRoofWorkSessions(
  records: readonly StoredRoofWorkSession[],
  owner: Readonly<{ userId: string; organizationId: string }>,
  now: number,
  ttlMs = ROOF_WORK_SESSION_TTL_MS,
): readonly StoredRoofWorkSession[] {
  return records
    .filter((record) => record.userId === owner.userId && record.organizationId === owner.organizationId && !isExpiredRoofWorkSession(record, now, ttlMs))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Lejárt rekord nem marad rejtve: beolvasáskor törlődik, tulajdonostól függetlenül (lusta takarítás). */
export const expiredRoofWorkSessionIds = (records: readonly StoredRoofWorkSession[], now: number, ttlMs = ROOF_WORK_SESSION_TTL_MS) =>
  records.filter((record) => isExpiredRoofWorkSession(record, now, ttlMs)).map((record) => record.id);

export type RoofWorkSessionWriteDecision =
  | Readonly<{ ok: true; seq: number }>
  | Readonly<{ ok: false; reason: "conflict"; storedSeq: number }>;

/**
 * Több böngészőfül: a fül megjegyzi, melyik `seq`-et töltötte be vagy írta utoljára (a bázisát). Ha a tárban
 * időközben FRISSEBB rekord lett, nem írunk felül — összefésülni nem tudunk találgatás nélkül, a csendes
 * felülírás pedig adatvesztés. A hívó ezt a döntést egyetlen `readwrite` tranzakción belül használja, ezért
 * az ellenőrzés és az írás között nincs versenyhelyzet.
 */
export function roofWorkSessionWriteDecision(storedSeq: number | null, baseSeq: number): RoofWorkSessionWriteDecision {
  if (storedSeq === null) return { ok: true, seq: 1 };
  if (storedSeq > baseSeq) return { ok: false, reason: "conflict", storedSeq };
  return { ok: true, seq: storedSeq + 1 };
}

/**
 * Mikor írunk egyáltalán. A felajánlás megjelenése ÖNMAGÁBAN nem menthet: üres rajzi állapotban (nincs betöltött
 * forrás vagy nincs szakasz) nincs mit tárolni, ezért a tárolt munka nem írható felül egy üressel. Ez ugyanaz a
 * feltétel, amivel a kézi export is dolgozik (`workSessionSource && sections.length > 0`).
 */
export const shouldStoreRoofWorkSession = (input: Readonly<{ enabled: boolean; hasSource: boolean; sectionCount: number }>) =>
  input.enabled && input.hasSource && input.sectionCount > 0;
