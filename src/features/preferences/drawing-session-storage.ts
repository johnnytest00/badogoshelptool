/**
 * A1: engedélyezte-e a felhasználó, hogy ezen az ESZKÖZÖN folytathatóvá tegyük a rajzos munkát.
 *
 * Ez beállítás, nem tartalom, ezért a többi preferencia mellé, `localStorage`-ba kerül — a tartalom
 * (a v3 munkamenet-JSON) az IndexedDB-be. Alapértéke kikapcsolt: engedély nélkül semmilyen munkaadat nem
 * kerül az eszközre. Terv: `docs/DRAWING_SESSION_PERSISTENCE_DESIGN.md`.
 */
export const drawingSessionStorageKey = "tetopro-drawing-session-storage-v1";

export function parseDrawingSessionStoragePreference(raw: string | null): boolean {
  return raw === "true";
}

export function persistDrawingSessionStoragePreference(storage: Pick<Storage, "setItem">, enabled: boolean): void {
  storage.setItem(drawingSessionStorageKey, String(enabled));
}
