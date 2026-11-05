# A rajzpanel állapotkezelésének minimális átalakítása (T7/T10 előfeltétel)

Dátum: 2026-10-31 · **Tervezési kör: alkalmazáskód nem módosult.** Előzmény: `DRAWING_WORKFLOW_REDESIGN_PLAN.md` T7/T10, `PROGRESS.md` → P2.6 (a T8 komponensbontás mérés alapján elmaradt).
Érintett funkcióterületek: `DRAW-PDF`, `DRAW-INTERPRET`, `DRAW-SECTIONS`, `DRAW-SESSION`, `CALC-CONSTRUCTION`.

---

## 1. A tényleges blokkoló

`PlanFieldTransfer` **38 `useState` + 1 `useReducer` + 2 `useRef`** állapotot tart, és a szülő `key={selectedId}`-vel rendereli (`construction-suite.tsx:346`). Kalkulátorváltáskor tehát a komponens **újramountol, és minden rajzi állapot elvész** — ez a T10 („Rajzból indítok") egyetlen valódi akadálya.

A T7-nek ehhez viszont **semmi köze**: ott az akadály az, hogy a kalkulátor mezőrenderelője (`renderField`, `construction-suite.tsx:335`) a szülőben él, és a `selectedId`, `draftEpoch`, `values`, `lengthDrafts`, `setLengthDrafts`, `markDirty` fölött zár. Ez **egy render-prop**, nem állapot-átalakítás. A két feladat előfeltétele külön kezelendő.

## 2. Állapottérkép élettartam szerint

### D — Dokumentumhoz kötött (kalkulátorváltást túl kell élnie)
`file`, `bytes`, `pdf`, `imageUrl`, `sources`, `workSessionSource`, `importedWorkSession`, `restoredSourceMatch`, `planKinds`, `calibration` (reducer), `linkedMeasurement`, `abort` ref
Érvénytelenítés: új forrásfájl, munkamenet-import, „Fájl és javaslatok elvetése". **Kalkulátorváltás nem.**

### P — Oldalhoz kötött (a dokumentumon belül)
`page`, `rotation`, `zoom`
Érvénytelenítés: oldalváltás törli a mérést (`clear-measure`) és a kijelölést; a forgatás új `sourceDocumentId`-t generál, de a kalibrációt a SHA-256-kötés megvédi (P1.1). A `calibration.accepted` oldalhoz és dokumentum-hash-hez kötött — ez a kötés **változatlanul marad**.

### S — Tetőszakaszhoz kötött, két külön élettartammal
- **S-geo (dokumentum):** `id`, `sourceDocumentId`, `name`, `page`, `points`, `coverage`, `coverageConfirmed` — a rajzon lévő területről szól, kalkulátortól független.
- **S-data (kalkulátor):** `data.fields`, `data.materials`, `data.lengthDrafts`, `data.approvedEntries`, `data.assumptionConfirmations` — egy konkrét kalkulátor mezőihez tartozik, **más kalkulátorban értelmetlen**.
Ma a kettő egy objektumban van (`DrawingRoofSection<SectionData>`), ezért a szakasz egésze kalkulátorhoz tapad. A szétválasztásra **már van precedens a kódban**: a mentés `drawingTakeoffSessionKey` szerint `${calculatorId}#section:${sectionId}` kulcsot használ.
Továbbá: `sections`, `activeSectionId`, `removedSections`, `planScopeConfirmed` (kulcsa `activeSectionId || "document"`).

### C — Kalkulátorhoz kötött (váltáskor el KELL dobni)
`entries`, `fieldKey`, `value`, `selectedUnit`, `overwrite`, `reviewed`, `geometryConfirmed`, `measurementConflictAcknowledged`, `applied`, `targetFieldKey`, `quickHistory`
Mind konkrét `fieldKey`-eket hordoz. Ha kalkulátorváltáskor életben maradnának, idegen mezőkulcsok szivárognának be — **ez sértené a szakasz- és mezőizolációt.**

### U — Átmeneti UI (bármely navigációnál törlendő)
`selected`, `tapCandidates`, `pendingUnitSource`, `quickMessage`, `editingPlanKind`, `editingSection`, `selectingSection`, `busy`, `error`, `workSessionError`, `calibrationLength`, `calibrationPanelOpen`, `panelOpen`, `canvas` ref

### Mi marad életben kalkulátor- és nézetváltáskor
Csak **D + P + S-geo**. A C és az S-data kalkulátoronként külön; az U mindig tiszta lappal indul. Ez a válasz a 3. kérdésre.

## 3. Két megoldás összevetése

### A opció — a D/P/S-geo csoport felemelése a szülőbe egy hookban, plusz render-prop
`useDrawingDocument()` a `ConstructionCalculatorSuite`-ban hívódik, az értéke propként megy le. A `key={selectedId}` **marad**: a gyermek továbbra is újramountol, tehát a C és U csoport magától, a jelenlegi mechanizmussal nullázódik — az izolációt nem szabállyal, hanem szerkezettel garantáljuk. Az S-data a szülő már meglévő, kalkulátoronkénti map-jeibe kerül (ahova az `onSectionActivate` ma is visszaírja).
- Új párhuzamos állapot: nincs — ugyanaz az állapot, egy szinttel feljebb.
- Új fogalom: nincs (se Context, se új reducer).
- A T10-hez elég, a T7-hez egy `renderField` prop kell mellé.

### B opció — megosztott állapotkezelés (Context vagy összevont reducer vagy modulszintű memória)
- **Context:** provider, újrarenderelési fanout, és a C/U csoportot külön kellene kézzel nullázni kalkulátorváltáskor — a mai automatikus izoláció helyett írott szabály. Több kód, több hibalehetőség.
- **Összevont reducer (39 állapot egy reducerbe):** a P2.6 mérése szerint 561 sor állapot és kezelő átírása, felhasználói haszon nélkül. Legnagyobb regressziós kockázat.
- **Modulszintű memória (`construction-workspace-memory` mintájára):** túlélné az útvonalváltást is, de második igazságforrást és feltámasztási hibákat hoz; a `file`/`bytes`/`imageUrl` élő böngészőerőforrás, modulszintű Map-ben tartása blob-URL- és memóriaszivárgással jár.

### Választás: **A opció.**
A legkisebb kockázatú, mert az izolációt a meglévő `key={selectedId}` adja, nem új kód; Contextet és reducert nem indokol semmi ebben a hatókörben.

## 4. Lépések, külön ellenőrizhetően

| # | Lépés | Elfogadási feltétel | Kockázat |
|---|---|---|---|
| **S1** ✅ | `renderField` opcionális prop + `idPrefix` a renderelőn (ütköző `id` nélkül), egy renderelési hellyel az alapérték-soroknál. **KÉSZ (2026-10-31), lásd `PROGRESS.md` → P2.7.** | `plan-field-transfer.test.tsx` változatlanul zöld; a prop nélküli hívás viselkedése azonos. | alacsony |
| **S2** | `DrawingRoofSection` szétválasztása: a geometria/meta marad, a `data` külön map-be kerül `${calculatorId}:${sectionId}` kulccsal. A `drawingTakeoffSessionKey` szerződése **nem változik**. | `drawing-roof-section(s).test.ts`, a szakaszizolációs és munkamenet-tesztek zöldek; az export/import v1–v3 séma bitre azonos kimenetet ad ugyanarra a bemenetre. | **közép** |
| **S3** | A D+P+S-geo csoport kiemelése `useDrawingDocument()` hookba, **még a `PlanFieldTransfer`-en belül hívva**. Tiszta mozgatás. | Minden meglévő teszt módosítás nélkül zöld. | alacsony |
| **S4** | A hook hívásának felvitele a `ConstructionCalculatorSuite`-ba, az érték propként le. A `key={selectedId}` marad. Az `imageUrl` revoke és az `abort` abort a hookkal együtt költözik. | Új teszt: kalkulátorváltás után a rajz, az oldal, a kalibráció és a szakaszgeometria megmarad, miközben `entries`, `targetFieldKey`, `quickHistory` és a mezőértékek nullázódnak. | **közép** |
| **S5** | Nullázási pontok rögzítése: `startNewCalculation`, `loadRevision`, `discardMemory`, `workspaceKey` változása. | Új teszt mindegyik útra: a rajz vagy megmarad, vagy megerősítés után tűnik el — észrevétlenül soha. | közép |

A T7 az S1 után indulhat; a T10 az S5 után. **S2 és S4 között ne legyen közbeékelt funkciófejlesztés.**

## 5. Kockázatok

- **Blob-URL visszavonás remount közben (konkrét, ma is kódban van).** A `plan-field-transfer.tsx:334-337` unmount-cleanupja `URL.revokeObjectURL(imageUrl)`-t hív és megszakítja a futó PDF-feldolgozást. Ha az `imageUrl` felkerül a szülőbe, de a cleanup a gyermekben marad, **kalkulátorváltáskor egy élő blob-URL-t vonnánk vissza**, és a képes rajz előnézete elnémulna. Az S4 elfogadási feltétele, hogy a cleanup az állapottal együtt költözzön.
- **Mezőkulcs-szivárgás kalkulátorok között.** Ha a C csoport bármely eleme véletlenül felkerül a szülőbe, idegen `fieldKey`-ek jutnának az `approveDrawingFields`-be. Védelem: a C csoport maradjon a gyermekben, és az S4 tesztje kifejezetten állítsa a nullázódásukat.
- **Szakaszadat-keveredés (S2).** A `data` kiemelésekor egy rossz kulcs más kalkulátor adatát rendelné a szakaszhoz. Védelem: a kulcs ugyanaz a `calculatorId`+`sectionId` pár, amit a mentés már használ; a meglévő izolációs tesztek nem módosíthatók.
- **Adatvesztés nullázási ponton (S5).** A legnagyobb felhasználói kockázat: a rajz és a szakaszok nincsenek tartósan mentve (`SOURCE_INDEX`: „Adatbázis: nincs"). Minden új nullázási pontnak a meglévő `requestConfirmation` párbeszédet kell használnia, az elvesző adatok felsorolásával (P2.2 minta).
- **Kalibráció érvényessége.** A `calibration.accepted` dokumentum-SHA-256-hoz és oldalszámhoz kötött. A felemelés után is csak akkor szabad érvényesnek látszania, ha mindkettő egyezik — az S3 tesztje erre külön térjen ki.

## 6. Amit ez a terv nem érint

A kalibráció matematikája és kapui, a forrásazonosság (SHA-256, oldalszám, rebind), a szakaszizoláció mentési szerződése (`drawingTakeoffSessionKey`, `drawingTakeoffCalculationName`), a mezővalidáció (`approveDrawingFields`, `fieldContractIssues`), a felülbírálás és provenance (`measurementOverride`, `unitOrigin`, `approvedEntries`), a mentési kapu (`canSaveDrawingTakeoff`), az OCR-kapu, a munkamenet v1–v3 sémája. Egyik sem módosul egyik lépésben sem.
