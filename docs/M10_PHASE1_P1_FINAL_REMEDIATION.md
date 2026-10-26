# M10.1.3 — Geometriai draftbiztonság és output-drift javítása (végső)

**Dátum:** 2026-10-26
**Elsődleges dokumentum:** [`M10_PHASE1_FINAL_INDEPENDENT_QA.md`](M10_PHASE1_FINAL_INDEPENDENT_QA.md) §16.3–16.8 (FAIL)
**Végső státusz:** **PASS WITH LIMITATIONS**

## 1. P1 — mezőnkénti geometriai invalidáció: gyökérok és javítás

**Gyökérok:** `invalidateGableGeometryOnShapeChange` (`src/features/calculators/rafter-connection-fields.ts`) a két átvett gable-geometria mezőt (`widthMm`, `pitchDegrees`) egyetlen `.every(...)` ellenőrzéssel kezelte: ha a kettő közül csak az egyiket módosította kézzel a felhasználó, az `untouchedSinceConfirm` igazság-érték hamis lett, és a függvény `null`-t adott — **semelyik** mezőt nem érvénytelenítette, a másik, változatlanul hagyott mezőt sem. Ez pontosan a QA §16.4-ben élőben bizonyított hiba: csak `widthMm` kézi módosítása után, gable→hip váltáskor, a változatlan `pitchDegrees` bent maradt és a hip kalkuláció felhasználta.

**Javítás:** a függvény mostantól a két mezőt **egymástól függetlenül** vizsgálja (`untouchedKeys = geometryKeys.filter(...)`), és csak a tényleg változatlan mezőt állítja vissza az átvétel előtti értékre; a kézzel módosított mező és a `nextApplied` nyomkövetés is mezőnként pontos marad.

```ts
// src/features/calculators/rafter-connection-fields.ts
const untouchedKeys = geometryKeys.filter((key) => (currentFields[key] ?? "") === applied.newFields[key]);
if (untouchedKeys.length === 0) return null;
const resetFields = Object.fromEntries(untouchedKeys.map((key) => [key, applied.snapshot[key] ?? ""]));
```

## 2. Kritikus architekturális javítás — atomi, tulajdonos-szintű állapotátmenet

A QA kifejezetten megkövetelte, hogy a forma-váltás és a geometriai invalidáció **egyetlen determinisztikus állapotátmenet** legyen a tulajdonos (`ConstructionCalculatorSuite`) state-kezelésében, ne egy gyermekkomponens passive `useEffect`-je után következő, külön korrekció. A javítás előtt:

- a `roofShape` mezőváltás a **szülőben** (`updateValue`) azonnal `setDrafts`-ot hívott;
- az átvett geometria érvénytelenítése a **gyermek** `ConstructionFieldTransferControl` saját, `roofShape`-re figyelő `useEffect`-jében futott, egy render-rel később, egy **külön** `setDrafts` hívással;
- emellett a `applied` (átvétel-nyomkövetés) állapot is a gyermekben élt lokálisan, ezért a szülő `updateValue`-ja nem tudott róla, és nem tudta a két frissítést egybe vonni.

**Javítás:**

1. Az `applied` (átvétel-nyomkövetés: `displayName`, `revisionNumber`, `newFields`, `snapshot`) állapot felkerült a szülőbe (`transferApplied`/`setTransferApplied`), a gyermek `ConstructionFieldTransferControl` mostantól `applied`/`onAppliedChange` propokon keresztül kapja/módosítja — nincs saját lokális `applied` state, nincs saját `roofShape`-re figyelő `useEffect`.
2. A szülő `construction-drafts.ts`-ben egy új, tisztán tesztelhető `applyFieldChange(drafts, id, key, value, applied)` függvény végzi **egyetlen hívásban** a draft-frissítést: `roofShape` kulcsnál a forma-érték írása és `invalidateGableGeometryOnShapeChange` eredménye (`resetFields`) **egyetlen** `mergeCalculatorDraft` hívásban landol, a `nextApplied` pedig ugyanabban a függvényhívásban számolódik ki. `ConstructionCalculatorSuite.updateValue` ezt az egy függvényt hívja, és a kapott `drafts`/`nextApplied` pár egyetlen szinkron eseménykezelőben (React batching) kerül state-be — nincs köztes render, amely az új tetőformát a régi, gable-specifikus geometriával együtt látná.

```ts
// src/features/calculators/construction-drafts.ts
export function applyFieldChange<TApplied extends AppliedTransfer>(drafts, id, key, value, applied): FieldChangeResult<TApplied> {
  if (key !== "roofShape") return { drafts: mergeCalculatorDraft(drafts, id, { [key]: value }), nextApplied: applied };
  const transition = invalidateGableGeometryOnShapeChange(String((drafts[id] ?? {}).roofShape ?? "gable"), value, applied, drafts[id] ?? {});
  const nextApplied = transition ? (transition.nextApplied && applied ? { ...applied, ...transition.nextApplied } : null) : applied;
  return { drafts: mergeCalculatorDraft(drafts, id, { [key]: value, ...(transition?.resetFields ?? {}) }), nextApplied };
}
```

3. A `startNewCalculation` mostantól `setTransferApplied(null)`-t is hív a már meglévő `setTransferSource(null)` mellett — a QA §16.4 5. pontjában bizonyított, új kalkuláció indítása után is látható, megtévesztő „Adatok átvéve” felirat és a hozzá tartozó dependency-kockázat megszűnt.

## 3. Kézi adatok megőrzése

A fenti per-mezős javítás pontosan ezt garantálja: a kézzel módosított geometriai mező (akár `widthMm`, akár `pitchDegrees`, akár mindkettő) soha nem íródik felül; csak a még változatlan, átvétel-eredetű mező áll vissza. A Karmi/eresz mezők (`seatCutHeightMm`, `ridgeJoint`, stb.) és minden egyéb manuális adat (anyagspecifikáció, szarufa-kiosztás) a `GABLE_GEOMETRY_KEYS`-en kívül esik, ezeket a függvény soha nem érinti.

## 4. React/state regressziók

**Helper-szintű** (`src/features/calculators/rafter-connection-fields.test.ts`, bővítve): mindkét mező érintetlen → hip/shed (mindkét kulcs reset); csak `widthMm` kézi → csak `pitchDegrees` reset; csak `pitchDegrees` kézi → csak `widthMm` reset; mindkettő kézi → nincs reset; gable→hip→gable nem éleszti újra; csak Karmi-mezők átvétele → nincs geometria-hatás; gable-en maradás / nincs átvétel → no-op. **18/18 PASS.**

**Tulajdonos-szintű** (`src/features/calculators/construction-drafts.test.ts`, új `describe` blokk): ugyanezek a forgatókönyvek, de a **tényleges `applyFieldChange` függvényen** keresztül, amit `ConstructionCalculatorSuite.updateValue` valóban hív — nem csak az elszigetelt helper. Lefedi: mindkét mező érintetlen (hip és shed); csak width kézi; csak pitch kézi; mindkettő kézi; gable→hip→gable; gyors egymás utáni hip→shed váltás a gable-elhagyás után; nem-`roofShape` mezőváltás és a nem kapcsolódó kézi adat érintetlensége; no-op, ha nincs átvétel. **8/8 PASS.**

Élő böngészős ellenőrzés (helyi hitelesített DEMO session, `roof.material-takeoff`, a `DEMO M10.1 gable forrás · V1` meglévő rekordból): gable átvétel szimmetria-jóváhagyással (`widthMm=8000`, `pitchDegrees=34.01934998982646`) → `widthMm` kézi módosítása `9500`-ra → gable→hip váltás: **`widthMm` megmaradt 9500, `pitchDegrees` üresre állt** (a korábban élőben bizonyított P1 pontosan ez volt, és itt már nem reprodukálható). Hip→gable visszaváltás: a `pitchDegrees` nem éledt újra. „Új kalkuláció” megerősítése után az „Adatok átvéve” felirat eltűnt. Konzolhiba nem volt. **PASS.**

## 5. Material-takeoff output-drift — vizsgálat eredménye

A QA §16.6-ban dokumentált `„A mentett V1 eredménye eltér a mostani számítástól”` figyelmeztetést a `ConstructionSavePanel`-ben a `outputDrift` konstans adja (`src/features/calculators/construction-save-panel.tsx:88`): igaz, ha a mentett revízió inputja (`comparableConstructionInput`) megegyezik a jelenlegi draft inputjával, **de** a `comparableOutput` (`{lines, takeoff, cutList}` stabil JSON-sztring) eltér.

**Konkrét bizonyíték (nem feltételezés):** a helyi Supabase DB-ben megmaradt a korábbi QA-menet valódi mentett rekordja (`calculation_revisions.id = 2b5c850f-1141-4dda-9c31-9cb036b861d1`, `roof.material-takeoff` V1). Kiolvastam a valódi `input_snapshot`/`output_snapshot` oszlopokat, és a jelenlegi kódbázissal, a perzisztált inputból (`materialStateFromSnapshot` + `computeConstruction` + `constructionOutputSnapshot`) **újraszámítottam** az eredményt. A `comparableOutput`-tal megegyező `{lines, takeoff, cutList}` kivonat **bit-pontosan egyezett** a DB-ben tárolt kivonattal (célzott, eldobott reprodukciós teszttel ellenőrizve, lásd alább). Két további, tiszta-kód round-trip reprodukció (kézi anyagadatokkal, illetve termék-módú fedéssel) ugyanígy bit-pontos egyezést adott.

**Következtetés:** a mentés→újranyitás snapshot-matematika (`constructionInputSnapshot` → `materialStateFromSnapshot` → `computeConstruction` → `constructionOutputSnapshot` → `comparableOutput`/`stableJsonStringify`) ezen a konkrét, valódi rekordon **veszteségmentes és determinisztikus** — nem azonosítható benne lebegőpontos, sorrend- vagy `undefined`/`null` eredetű reprezentációs hiba. A QA által élőben látott figyelmeztetés ennek a mentés/visszaolvasás-logikának a hibájaként **a jelenlegi kódra és a valódi mentett adatra nem reprodukálható**.

**Nem zárható le teljesen:** a konkrét élő előfordulás (ugyanazon böngésző-munkamenetben, friss újratöltés után) ebben a környezetben — élő böngésző-munkamenet nélkül, csak a megmaradt DB-rekorddal — nem reprodukálható újra a pillanat szintjén. A legvalószínűbb, dokumentált, de **nem bizonyított** magyarázat: a `outputDrift` kifejezés a `liveOutput`-ot a komponens aktuális render-jéből olvassa, és ha a revízió betöltése (`materialByCalculator`/`drafts` két különálló `setState`-je a `loadRevision`/betöltő effectben) átmenetileg nem-egyidejű állapotot eredményez, a figyelmeztetés egyköztes renderen téves pozitívot adhat, mielőtt az állapot rendbe áll — ugyanabba a hiba-osztályba tartozna, mint a most javított P1, de **erre konkrét diff-bizonyíték nincs**, ezért kódváltoztatást ehhez nem végeztem.

**Javítási szabály követve:** mivel nem bizonyított hibás összehasonlítás/normalizálás, és nem bizonyított valódi domain-eltérés sem, **nem** nyúltam a toleranciához, nem rejtettem el a figyelmeztetést, és nem írtam át meglévő immutable revíziót.

## 6. Pitch-validáció és P2 UX

Nem módosítottam; a `<80°` validáció és a preview kerekített/teljes pontosságú megkülönböztetése (`construction-field-transfer-control.tsx` `renderPreview`) változatlan, célzottan ellenőrizve (lásd 7. szakasz).

## 7. Tényleges teszt- és E2E-eredmények

- `npx vitest run` (teljes): **192 fájl PASS / 8 SKIP, 1210 teszt PASS / 19 SKIP.**
- `npx tsc --noEmit -p .`: **PASS**, hiba nélkül (futó `next dev` mellett is, mert a típusellenőrzés nem ír a `.next`-be).
- `npx eslint src/features/calculators/...` (érintett fájlok + a teljes `src/features/calculators/`): **No issues found.**
- `git diff --check`: **PASS** (nincs whitespace-hiba).
- Production build: **nem futott** — a főkivonatban aktív `next dev` szerver fut (`next-server v16.4.2`), és az AGENTS.md szerint a build izolált környezetet igényelne; ezt az AGENTS.md "ha nincs ütköző folyamat, az izolált build nem követelmény" kitétele alapján belátom, hogy **van** ütköző folyamat, ezért a build-et ebben a menetben szándékosan kihagytam, hogy ne írjon a megosztott `.next`-be.
- Élő böngészős ellenőrzés: helyi, már hitelesített DEMO session (`demo.owner@local.test`, `DEMO TetőPro Kft.`), `roof.material-takeoff` kalkulátor — lásd 4. szakasz. Mobil/tájkép/desktop nézetmátrix és light/dark váltás **ebben a menetben nem futott** (a hatókör a P1/architektúra és a drift-vizsgálat volt, nem UI-reszponzivitás; a korábbi menetek már lefedték ezt gable-geometria witch nélkül).

## 8. Fennmaradó kockázatok

- A material-takeoff output-drift élő, pillanatnyi reprodukciója nyitott kérdés marad; ha újra előfordul, a legjobb következő lépés a `liveOutput`/`materialState` betöltési effect atomicitásának auditja (ugyanaz a mintázat, mint a most javított P1), konkrét render-szintű bizonyítékkal.
- A `ConstructionFieldTransferControl` `applied` állapota (most a szülőben) calculator-váltáskor (pl. material-takeoff → timber-cutlist, mindkettő `canTransferFields`) nem resetelődik automatikusan — ez a viselkedés megegyezik a javítás előtti állapottal (a gyermek lokális state-je sem resetelt ott), nem újonnan bevezetett regresszió, de nem ellenőrzött külön.
- Mobil/tájkép/desktop vizuális mátrix és a timber-cutlist E2E ebben a menetben nem futott újra.

## 9. Végső státusz

**PASS WITH LIMITATIONS.** A bizonyított P1 (forma-váltási draft-szennyezés) gyökéroka azonosítva és mezőnkénti, atomi, tulajdonos-szintű javítással megszűnt — élő böngészőben és automatikus regresszióval egyaránt igazolva. A material-takeoff output-drift gyökéroka konkrét DB-bizonyítékkal **kizárva a mentés/visszaolvasás snapshot-logikájából**, de a pillanatnyi élő előfordulás nem reprodukálható újra ebben a menetben, ezért kódváltoztatás nélkül, nyitott kockázatként dokumentálva marad.

## 10. Javasolt Conventional Commit

`fix(M10.1.3): invalidate transferred gable geometry per field, make the shape-change draft update atomic in the owner`
