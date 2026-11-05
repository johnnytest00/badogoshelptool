import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { PdfDocumentText } from "@/infrastructure/drawings/pdf-text-extractor";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import type { DrawingPlanKind } from "./drawing-field-transfer";
import type { DrawingRoofSection } from "./drawing-roof-sections";
import { calibrationReducer, emptyCalibrationDraft } from "./drawing-calibration";
import type { RoofWorkSession } from "./drawing-roof-work-session";

/**
 * S3/S4 (T10 előfeltétel): a rajzpanel azon állapota, amely a *dokumentumról* szól, nem a kalkulátorról — a betöltött
 * forrás (D), az éppen nézett oldal (P) és a tetőszakaszok geometriája (S-geo). Ez a három csoport kalkulátorváltáskor
 * nem veszítheti el az érvényességét, ezért a tulajdonosa a kalkulátort túlélő szülő, nem a `key={selectedId}`-vel
 * újramountolt panel.
 *
 * Ami NINCS itt: a kalkulátorspecifikus mező-/jóváhagyási állapot és az átmeneti UI-állapot. Azok maradnak a
 * panelben, és a remount nullázza őket — az izolációt továbbra is a szerkezet garantálja, nem írott resetszabály.
 *
 * Az `abort` ref és az `imageUrl` felszabadítása szándékosan itt van: az erőforrás életciklusa az állapot
 * tulajdonosához tartozik. Ha a panelben maradna, a kalkulátorváltás egy még élő blob-URL-t vonna vissza, és a képes
 * rajz előnézete elnémulna (`DRAWING_STATE_REDESIGN_PLAN.md` §5 első kockázata).
 */
export type DrawingDocument<TSectionData> = ReturnType<typeof useDrawingDocument<TSectionData>>;

export function useDrawingDocument<TSectionData>() {
  // D — a betöltött forrás
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pdf, setPdf] = useState<PdfDocumentText | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<DrawingTextSource[]>([]);
  const [workSessionSource, setWorkSessionSource] = useState<RoofWorkSession["source"] | null>(null);
  const [importedWorkSession, setImportedWorkSession] = useState(false);
  const [restoredSourceMatch, setRestoredSourceMatch] = useState<"pending" | "matched" | "different" | null>(null);
  // P1.1: a kalibráció egész életciklusa egy reducerben; a `calibration.accepted` dokumentum-SHA-256-hoz és
  // oldalszámhoz kötött, ezt a kötést a felemelés nem lazítja — a panel ugyanúgy ellenőrzi mindkettőt.
  const [calibration, dispatchCalibration] = useReducer(calibrationReducer, emptyCalibrationDraft);
  const [linkedMeasurement, setLinkedMeasurement] = useState<Readonly<{ source: DrawingTextSource; documentSha256: string; pageNumber: number; measure: readonly { x: number; y: number }[]; measuredMm: number }> | null>(null);

  // P — a dokumentumon belüli oldal
  const [page, setPage] = useState(1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [zoom, setZoom] = useState(1);
  // Amit a felhasználó az egyes lapokról állított (P0-2), oldalszám szerint: egy több lapos csomagban keveredhet
  // tetőterv és alaprajz.
  const [planKinds, setPlanKinds] = useState<Record<number, DrawingPlanKind>>({});
  const [planScopeConfirmed, setPlanScopeConfirmed] = useState<string[]>([]);

  // S-geo — a tetőszakaszok rajzi geometriája
  const [sections, setSections] = useState<DrawingRoofSection<TSectionData>[]>([]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [removedSections, setRemovedSections] = useState<{ section: DrawingRoofSection<TSectionData>; index: number }[]>([]);

  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abort.current?.abort();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  /**
   * S5: a dokumentum elengedése, ha a munka maga zárul le (új kalkuláció, másik mentett kalkuláció munkamenete).
   * Az `imageUrl`-t szándékosan csak nullázzuk: a fenti cleanup a változásra lefut az eddigi URL-lel, így a
   * felszabadítás egy helyen marad. A hívó felelőssége, hogy ez csak megnevezett adatvesztés után történjen.
   */
  const releaseDocument = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setFile(null); setBytes(null); setPdf(null); setImageUrl(null); setSources([]);
    setWorkSessionSource(null); setImportedWorkSession(false); setRestoredSourceMatch(null);
    dispatchCalibration({ type: "reset" }); setLinkedMeasurement(null);
    setPage(1); setRotation(0); setZoom(1); setPlanKinds({}); setPlanScopeConfirmed([]);
    setSections([]); setActiveSectionId(""); setRemovedSections([]);
  }, []);

  return {
    file, setFile, bytes, setBytes, pdf, setPdf, imageUrl, setImageUrl, sources, setSources,
    workSessionSource, setWorkSessionSource, importedWorkSession, setImportedWorkSession,
    restoredSourceMatch, setRestoredSourceMatch, calibration, dispatchCalibration,
    linkedMeasurement, setLinkedMeasurement,
    page, setPage, rotation, setRotation, zoom, setZoom, planKinds, setPlanKinds,
    planScopeConfirmed, setPlanScopeConfirmed,
    sections, setSections, activeSectionId, setActiveSectionId, removedSections, setRemovedSections,
    abort, releaseDocument,
  };
}

/**
 * S2: a szakasz rajzi geometriája kalkulátorfüggetlen, a `data`-ja viszont egy konkrét kalkulátor mezőihez tartozik.
 * Kalkulátorváltáskor a geometria (id, név, oldal, pontok, fedettség és annak igazolása) változatlan marad, a `data`
 * pedig kalkulátoronként külön él: a távozó kalkulátoré eltéve, a belépőé visszaállítva, vagy ha még nem járt itt,
 * üres kezdőadattal. Így egyetlen idegen mezőkulcs, anyagválasztás vagy jóváhagyott bejegyzés sem jut át a másik
 * kalkulátorba — a `DrawingRoofSection` típusa és a munkamenet v1–v3 exportszerződése pedig nem változik.
 */
export function retargetSectionData<T>(input: Readonly<{
  sections: readonly DrawingRoofSection<T>[];
  leaving: string;
  entering: string;
  stash: Readonly<Record<string, Readonly<Record<string, T>>>>;
  fresh: T;
}>) {
  const { sections, leaving, entering, stash, fresh } = input;
  const restored = stash[entering] ?? {};
  return {
    sections: sections.map((section) => ({ ...section, data: restored[section.id] ?? fresh })),
    stash: { ...stash, [leaving]: Object.fromEntries(sections.map((section) => [section.id, section.data])) },
  };
}
