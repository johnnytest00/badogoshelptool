# F9.28 — implementációs kézátadás

**Dátum:** 2026-10-17
**Forrás:** [funkciok.md](funkciok.md), az architekturális összefoglaló újraolvasva.

## Hatókör és verified flow

- Kizárólag UI/alkalmazási módosítás a meglévő felmérés, kalkuláció és anyaglista útvonalon. Nincs szükség DB-sémaváltoztatásra; a felmérés- és kalkulációrevíziók, RLS/RPC jogosultságok és forrás-snapshotok maradjanak változatlanok.
- A felmérés `field_survey_revisions`-be mentett, típusos méréseiből a gutter, flashing és roof handoff validált mezőket előtölt. A mentett számítás a `link_field_survey_calculation` RPC-n keresztül a pontos felmérés-revízióhoz kötődik. A roof panel geometriai, trapézlemez-fedési vagy cserepeslemez-fedési számítást menthet; a mentés önmagában nem anyaglista.
- Anyaglistába csak a már támogatott survey/takeoff-források, explicit ellenőrzés és mentés mellett kerül adat. Egység- és termék/árvalidáció meglévő, szerveroldali határait meg kell őrizni.

## Célfájlok

- Picker és add-item UI: `src/features/material-takeoffs/workflow-material-product-picker.tsx`, `src/features/material-takeoffs/workflow-material-list-editor.tsx`, a kapcsolódó picker/editor tesztek; popup stílusok: `src/app/globals.css`.
- Felmérés toolbar és action copy: `src/features/field-surveys/field-survey-editor.tsx`; stílusok a fenti globals CSS-ben.
- Számítás panel: `src/features/field-surveys/workspace-calculator.tsx`; handoff/load/association: `src/features/field-surveys/workspace-actions.ts`, `src/domain/field-surveys/calculator-handoff.ts`, `src/features/roof-models/standalone-gable-preview.tsx` és `src/features/roof-models/gable-metal-tile-covering-preview.tsx`.
- Bizonyíték és dokumentáció: `docs/PROGRESS.md`, `docs/TEST_MATRIX.md`; célzott tesztfájlok a fenti feature-ökben.

## Elkészült módosítások

- Anyagválasztó: `workflow-material-product-picker.tsx`, `workflow-material-list-editor.tsx`, `standalone-quotation-editor.tsx`; a törött natív label-aktiválási lánc megszűnt. Közös popupot használó anyaglista és önálló ajánlat wrapperét is javítottam. A picker kontextuális névvel azonosítható.
- Felmérés: `field-survey-editor.tsx`, `globals.css`; pontosan két elsődleges hozzáadási gomb, a specializált work type a szakasz-beállításban elérhető.
- Felmérésből kalkulátor: `workspace-calculator.tsx`, `standalone-gable-preview.tsx`, `gable-metal-tile-covering-preview.tsx`; a mentett geometria előtöltődik, az eredmény/drawing előtérben marad, a további inputok és technikai adatok fokozatosan jelennek meg. Domain motor, RPC és mentési réteg nem változott.
- Tesztek: a kapcsolódó öt Vitest fájlban 25 teszt sikeres.

## Tényleges verifikáció

- `funkciok.md`: 440/440 fájl, egyedi útvonalak, nincs hiány és nincs többlet; generált fájlok kizárva.
- Helyi DEMO böngésző: termék kiválasztása egérrel, Escape nélkül, hozzáadás, mentés és újranyitás PASS. Ellenőrző lista: `422d13dc-2706-43a0-a286-5a4a00e8a4cd`, V1 revision `46894eaa-e4c5-40e7-9316-4061623c8108`. A `.env.local`-ból csak a `NEXT_PUBLIC_SUPABASE_URL` hostnevét olvastam ki: `127.0.0.1`; ez helyi Supabase írás volt, hosted DB-változás nem történt.
- Helyi böngésző: mentett roof survey V5 → kalkulátor; 10 × 6 m, 3 m emelkedés → 84,853 m². Forrás survey revision `76e4ece1-69e8-4926-a294-d19cbdaa7468`; geometry és tile workflow is ugyanerre hivatkozik. Kalkuláció nem mentve.
- Gutter és flashing mentett mérések read-only megnyitása; két gyorshozzáadó, unsaved warning és tesztpiszkozat mentés nélküli elvetése ellenőrizve.
- `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack, 30 statikus oldal) PASS. Végleges dokumentáció után `git diff --check` PASS; az új, nem indexelt dokumentumok sorvégi szóköze külön is ellenőrizve.
- Nincs teljes Vitest, DB, hosted, mobile viewport, fizikai touch, screen reader, forced-colors vagy iOS ellenőrzés. A light/dark váltást a dashboardon ellenőriztem, az eredeti sötét módot visszaállítottam. Kategóriát és picker-terméket nyílbillentyű+Enterrel választottam; unit/validált ár megjelent, a további mentési út csak egérrel lett kipróbálva. A CUA ebben a munkamenetben nem nyújtott viewport-emulációt. Egyetlen tartós üzleti változás a helyi, kifejezetten DEMO anyaglista-elfogadási rekord; más felmérést/számítást nem mentettem.

**Context compaction:** nincs ehhez a turnhöz explicit compaction eszköz. Ez a fájl és a `funkciok.md` rövid referencia; tényleges kontextus-kompaktálás nem történt.
