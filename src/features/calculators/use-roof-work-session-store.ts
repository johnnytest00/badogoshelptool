"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { drawingSessionStorageKey, parseDrawingSessionStoragePreference, persistDrawingSessionStoragePreference } from "@/features/preferences/drawing-session-storage";
import { clearRoofWorkSessionsOnDevice, listRoofWorkSessions, putRoofWorkSession, removeRoofWorkSession } from "@/infrastructure/drawings/roof-work-session-store";
import { roofWorkSessionRecordId, shouldStoreRoofWorkSession, type StoredRoofWorkSession } from "./drawing-session-retention";
import type { RoofWorkCalculatorId, RoofWorkSource } from "./drawing-roof-work-session";

/**
 * A1: a helyi rajzos munkamenet megőrzésének munkafolyamata — engedély, késleltetett mentés, állapot és
 * felajánlás. A szabályok a `drawing-session-retention.ts`-ben, a tárolás a
 * `infrastructure/drawings/roof-work-session-store.ts`-ben van; ez a hook csak összeköti őket a panellel.
 *
 * Terv: `docs/DRAWING_SESSION_PERSISTENCE_DESIGN.md`.
 */
export type RoofWorkSessionStatus = "off" | "idle" | "saving" | "saved" | "blocked" | "quota" | "conflict";

export type RoofWorkSessionOwner = Readonly<{ userId: string; organizationId: string }>;

/** A mentés 1,2 s tétlenség után fut: a rajzon végzett munkát (koppintás, húzás) nem lassíthatja. */
const SAVE_DELAY_MS = 1200;

export function useRoofWorkSessionStore(input: Readonly<{
  owner: RoofWorkSessionOwner | null;
  source: RoofWorkSource | null;
  sourceName: string;
  calculatorId: RoofWorkCalculatorId;
  sectionCount: number;
  /** Olyan olcsó jelzés, amely minden mentendő változásra más; a JSON csak a késleltetés lejártakor épül fel. */
  signature: string;
  buildJson: () => string;
}>) {
  const { owner, source, sourceName, calculatorId, sectionCount, signature, buildJson } = input;
  const [enabled, setEnabledState] = useState(false);
  const [status, setStatus] = useState<RoofWorkSessionStatus>("off");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [offers, setOffers] = useState<readonly StoredRoofWorkSession[]>([]);
  /** A fül bázisa: melyik `seq`-et látta utoljára. Frissebb tárolt rekordot nem írunk felül. */
  const baseSeq = useRef(0);
  const lastJson = useRef<string | null>(null);
  const latest = useRef({ source, sourceName, calculatorId, sectionCount, buildJson, owner, enabled });
  latest.current = { source, sourceName, calculatorId, sectionCount, buildJson, owner, enabled };

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(drawingSessionStorageKey); } catch { /* Tár nélkül a biztonságos alapérték a kikapcsolt állapot. */ }
    const next = parseDrawingSessionStoragePreference(stored);
    setEnabledState(next);
    setStatus(next ? "idle" : "off");
  }, []);

  const refreshOffers = useCallback(async () => {
    const current = latest.current;
    if (!current.enabled || !current.owner) { setOffers([]); return; }
    const listing = await listRoofWorkSessions(current.owner);
    if (!listing.ok) { setOffers([]); setStatus("blocked"); return; }
    setOffers(listing.records.filter((record) => (record.calculatorId ?? "roof.material-takeoff") === current.calculatorId));
  }, []);

  useEffect(() => { void refreshOffers(); }, [refreshOffers, enabled, calculatorId, owner?.userId, owner?.organizationId]);

  const setEnabled = useCallback(async (next: boolean) => {
    setEnabledState(next);
    try { persistDrawingSessionStoragePreference(window.localStorage, next); } catch { /* A kapcsoló elvesztése nem akaszthatja meg a munkát. */ }
    if (!next) {
      // Kikapcsoláskor azonnali, teljes törlés — felfedés nélkül.
      await clearRoofWorkSessionsOnDevice();
      setOffers([]); setSavedAt(null); lastJson.current = null; baseSeq.current = 0;
      setStatus("off");
      return;
    }
    setStatus("idle");
    await refreshOffers();
  }, [refreshOffers]);

  /**
   * Késleltetett mentés. A felajánlás megjelenése önmagában SOHA nem ír: forrás vagy szakasz nélkül a
   * `shouldStoreRoofWorkSession` hamis, így a tárolt munkát nem írhatja felül egy üres állapot.
   */
  useEffect(() => {
    const current = latest.current;
    if (!shouldStoreRoofWorkSession({ enabled: current.enabled, hasSource: current.source !== null, sectionCount: current.sectionCount }) || !current.owner || !current.source) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const now = latest.current;
        if (!now.owner || !now.source) return;
        let json: string;
        try { json = now.buildJson(); } catch { return; }
        if (json === lastJson.current) return;
        setStatus("saving");
        const result = await putRoofWorkSession({
          id: roofWorkSessionRecordId(now.owner.userId, now.owner.organizationId, now.source.sha256, now.calculatorId),
          userId: now.owner.userId, organizationId: now.owner.organizationId, documentSha256: now.source.sha256,
          json, sectionCount: now.sectionCount, sourceKind: now.source.kind, sourceName: now.sourceName, calculatorId: now.calculatorId,
        }, baseSeq.current);
        if (result.ok) {
          baseSeq.current = result.seq; lastJson.current = json; setSavedAt(Date.now()); setStatus("saved");
          return;
        }
        setStatus(result.reason);
      })();
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [signature, sectionCount, enabled, calculatorId, owner?.userId, owner?.organizationId, source?.sha256]);

  /** Visszaállítás után a fül bázisa a tárolt rekordé lesz, különben a következő írás ütközést jelentene. */
  const adoptRestored = useCallback((record: StoredRoofWorkSession) => {
    baseSeq.current = record.seq; lastJson.current = record.json; setSavedAt(record.updatedAt); setStatus("saved");
  }, []);

  const discard = useCallback(async (id: string) => {
    await removeRoofWorkSession(id);
    if (lastJson.current !== null) { lastJson.current = null; baseSeq.current = 0; }
    await refreshOffers();
  }, [refreshOffers]);

  const clearDevice = useCallback(async () => {
    await clearRoofWorkSessionsOnDevice();
    lastJson.current = null; baseSeq.current = 0; setSavedAt(null);
    await refreshOffers();
  }, [refreshOffers]);

  return { enabled, setEnabled, status, savedAt, offers, refreshOffers, adoptRestored, discard, clearDevice } as const;
}
