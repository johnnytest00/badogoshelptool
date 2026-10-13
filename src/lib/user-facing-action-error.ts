export type ActionError = { code?: string; message?: string } | null;

/** Converts database/RPC failures to safe, actionable Hungarian UI copy. */
export function userFacingActionError(error: ActionError, fallback: string) {
  if (error?.code === "40001" || error?.message?.toLowerCase().includes("stale")) {
    return "Az adat időközben megváltozott. Töltsd újra az oldalt, ellenőrizd az aktuális állapotot, majd próbáld újra.";
  }
  if (error?.code === "42501") return "Nincs jogosultságod ehhez a művelethez. Kérj megfelelő hozzáférést a műhely tulajdonosától.";
  if (error?.code === "23503") return "A kapcsolódó forrásadat már nem érhető el. Frissítsd az oldalt, és válaszd ki újra a forrást.";
  if (error?.code === "23514" || error?.code === "22P02") return "Ellenőrizd a megadott adatokat, majd próbáld újra.";
  if (error?.code === "55000") return "Ez az adat már véglegesített vagy nem módosítható.";
  return fallback;
}
