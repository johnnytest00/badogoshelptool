# M10.1.5 — Célvalidáció, output-drift diagnosztika és transfer-state javítás

**Dátum:** 2026-10-27
**Git HEAD (javítás előtt):** `649b3ba5e775d127c1c9c1072c7754861f54cb9e`
**Elsődleges forrás:** [`M10_PHASE1_FINAL_ACCEPTANCE.md`](M10_PHASE1_FINAL_ACCEPTANCE.md) (FAIL, egy új P1 + két P2).

## 1. P1 — a célkalkulátor közvetlen `pitchDegrees` mezője 80°/81°-ot is elfogadott

### Gyökérok

A `roofGeometryInputSchema` (`src/domain/calculations/roof-geometry.ts`) a hat újabb tetőformára (shed, hip,
pyramid, halfHip, lShape, tShape) a megosztott `pitch = z.number().finite().positive().lt(80)` sémát használja.
A **gable** forma viszont a saját, ezeknél jóval régebbi `calculateGableRoof` motorját hívja
(`gableRoofInputSchema`, `src/domain/calculations/gable-roof.ts`), amelynek `roofPitchDegrees` mezője
`.lt(90)` — egy a többi formától eltérő, dokumentálatlan határ, amely még az F9.10 többtetős munka előttről
származik (`git log -S "lt(80)" -- src/domain/calculations/roof-geometry.ts` → `0aea2d9`: "A `gable` a meglévő
`calculateGableRoof` motort használja."). Mivel a `roof.material-takeoff`/`roof.timber-cutlist` alapértelmezett
tetőformája **gable**, a célkalkulátor közvetlen mezője innentől a lazább `<90°` határt "örökölte".

`gableRoofInputSchema` ugyanakkor a termékben sok más helyen (felmérések, önálló tetőmodellek, trapézlemez-/
cserepeslemez-fedés) is élő, önálló szerződés — a hatókör (csak M10.1 célkalkulátorok) és az "ne alakítsd át a
meglévő architektúrát" korlát miatt **nem** ezt a sémát szigorítottam.

### Javítás

A tényleges trust boundary a `ConstructionCalculatorSuite`/`computeConstruction` közvetlen mező-ellenőrzése
(`fieldContractIssues`, [`construction-computation.ts`](../src/features/calculators/construction-computation.ts)),
amelyet a kliens preview **és** a szerveroldali mentő Action (`construction-actions.ts` →
`isSaveableComputation(computeConstruction(...))`) is ugyanazzal a függvénnyel hív. Ide került egy explicit
`pitchDegrees` ellenőrzés, amely a megosztott `pitch` (`<80°`) sémát futtatja a nyers mezőértéken, formától
függetlenül:

```ts
if (field.key === "pitchDegrees" && !pitchDegreesSchema.safeParse(value).success)
  return [`${field.label}: 0°-nál nagyobb, de 80°-nál kisebb értéket adj meg.`];
```

A geometria/eredmény-számítást (`if (inputsReady) { try { ... } }`) most `fieldIssues.length === 0` is védi, így
egy tiltott mező esetén — a többi (hip/shed/stb.) formáéhoz hasonlóan — **sosem** készül teljes geometria vagy
eredmény; a `completeness.status` azonnal `"invalid"`, a Mentés gomb letiltva, a hibajelzés magyar és konkrét.

### Tesztek és böngészős bizonyíték

- Új `describe("pitch trust boundary ...")` blokk mindkét érintett kalkulátorra (`roof.material-takeoff`,
  `roof.timber-cutlist`): 79,9° elfogadás, 80° és 81° elutasítás, `geometry === null`, `isSaveableComputation ===
  false` — [`construction-computation.test.ts`](../src/features/calculators/construction-computation.test.ts).
- Élő, hitelesített `demo.owner@local.test` DEMO-munkamenetben (`roof.material-takeoff`, nyeregtető, 10000×8000
  mm): 81° → „Nem számítható” + „Tetőhajlás: 0°-nál nagyobb, de 80°-nál kisebb értéket adj meg.”, nincs
  geometria, Mentés letiltva; 80° → ugyanaz az elutasítás; 79,9° → teljes, menthető eredmény. Nem mentettem
  próbaadatot.

## 2. P2 — output-drift figyelmeztetés a mentett revíziók friss újranyitásakor

### Diagnosztika ebben a menetben

A jelen DEMO szervezetben egyetlen mentett, teljes `roof.timber-cutlist` revízió található
(`b9255f62-44c8-487e-8c66-0246eba772a5`, V1). Ennek friss, teljes böngésző-navigációval történő megnyitása
(`/kalkulatorok?...&calculation=...`) **nem** mutatta a drift-figyelmeztetést; a `comparableOutput` egyezett. A
korábbi QA jelentésben szereplő, átvitellel mentett DEMO material-takeoff/timber-cutlist rekordok ebben a
szervezetben már nem léteznek (a „Mentett számításaim” lista nem tartalmaz „Tetőanyag-kimutatás” csoportot), ezért
a pontos, korábban dokumentált reprodukciós lépéssor (transzfer → mentés → ugyanabban a kliens-munkamenetben
visszanyitás) nem volt újrajátszható a rendelkezésre álló idő/eszközök mellett.

**Gyökérok ezért továbbra sem ismert.** Nem fogadtam el és nem alkalmaztam semmilyen feltételezett javítást
(tolerancia-lazítás, verzió-összehasonlítás bekapcsolása) bizonyíték nélkül — ez megsértené a „csak azonosított
gyökérokot javíts” szabályt.

### Amit hozzáadtam: célzott, ideiglenes fejlesztői diagnosztikai helper

[`construction-save-panel.tsx`](../src/features/calculators/construction-save-panel.tsx):

- `outputDriftDiffPaths(a, b)` — tiszta, exportált függvény, amely két `{lines, takeoff, cutList}` projekció
  között pontos JSON-útvonalakat ad vissza (`lines[2].value`, `takeoff.parts[0].quantities[1].unit`, stb.), tömb
  hosszkülönbséget is jelez.
- Egy `useEffect`, amely csak fejlesztői módban (`NODE_ENV !== "production"`), revíziónként/bemenetenként
  legfeljebb egyszer, `console.debug`-gal kiírja a mentett és az élő `liveOutput` közötti pontos eltérő
  útvonalakat, amikor `outputDrift` igazra vált. Nem ír a UI-ba, nem változtat a drift-döntésen vagy a
  toleranciát, nem naplóz személyes vagy hitelesítési adatot.
- Teszt: `outputDriftDiffPaths` 3 eset (`construction-save-panel.test.tsx`).

Ez a helper a következő, élő browser-reprodukcióval rendelkező menetben azonnal megmutatja a pontos eltérő
mezőt a konzolban, érdemi kódváltoztatás nélkül.

### Nyitott blokk

**A P2 drift gyökéroka ebben a menetben nem reprodukálható és nem azonosítható.** Lezáráshoz egy olyan
browser-munkamenet szükséges, amely megismétli a teljes transzfer → mentés → ugyanazon munkamenetbeli
újranyitás lépéssort (vagy újra létrehozza a hiányzó DEMO rekordokat), és ekkor a most hozzáadott
`outputDriftDiffPaths` konzolnaplója megmutatja a pontos eltérő mezőt.

## 3. P2 — transfer-state átszivárgás kalkulátorváltáskor

### Gyökérok

`transferSource`/`transferApplied` a `ConstructionCalculatorSuite`-ban eddig **egyetlen, kalkulátor-független**
state volt (`useState<AppliedTransferDisplay | null>`), míg a hozzá tartozó mezőértékek (`drafts`),
anyagállapot (`materialByCalculator`) és mentési munkamenet (`sessions`) mind kalkulátoranként tárolódnak.
`selectCalculator` csak a `selectedId`-t váltja; sem reset, sem célhoz kötés nem történt, ezért kalkulátorváltás
után az előző cél „Adatok átvéve: … · V1” jelzése megmaradt egy üres célkalkulátor paneljén is.

### Javítás

`transferSource`/`transferApplied` kalkulátoranként tárolt map lett (`Record<calculatorId, ... | null>`), pontosan
úgy, ahogy `drafts`/`materialByCalculator`/`sessions` már kalkulátoranként tárolt — **nem** új globális store,
csak a meglévő mintázat követése. Az eredeti, suite-szintű `transferSource`/`transferApplied` nevek és a
gyermek (`ConstructionFieldTransferControl`) props-interfésze változatlan; a szülő a kiválasztott kalkulátorhoz
tartozó bejegyzést deriválja és írja (`transferAppliedByCalculator[selectedId]`). Így:

- kalkulátorváltáskor az új cél mindig a saját (üres vagy saját korábbi) eredetjelzését látja;
- visszaváltáskor a korábbi, még nem mentett átvétel és a hozzá tartozó forrásrevízió-azonosító (`drafts`-szal
  együtt) megmarad — **nem** törlődik, ahogy a feladat kifejezetten tiltja;
- egy teljesen más mentett kalkuláció betöltésekor (`saved.calculationId` váltás) mindkét map `{}`-re reset,
  ugyanúgy, ahogy `materialByCalculator`/`sessions` is;
- „Új kalkuláció” az egész mapet törli, mint eddig is minden kalkulátoradatot.

### Böngészős E2E bizonyíték

Élő, hitelesített `demo.owner@local.test` DEMO-munkamenetben:

1. `roof.material-takeoff` (A): adatok átvétele egy mentett „DEMO M10.1 gable forrás” `roof.rafter-cut`
   revízióból (szimmetria-jóváhagyással) → „Adatok átvéve: DEMO M10.1 gable forrás · V1” megjelenik.
2. Váltás `roof.timber-cutlist`-re (B): a mezők üresek, **nincs** „Adatok átvéve” jelzés — **PASS** (korábban ez
   volt a bizonyított hiba).
3. Vissza A-ra: az „Adatok átvéve: DEMO M10.1 gable forrás · V1” jelzés és a draft mezők (pl. bekapcsolt Karmi,
   HAP) változatlanul megvannak — **PASS**.

Teszt tooling-korlát: a projektben nincs React-komponens-interakciós tesztkönyvtár (`@testing-library/react`)
telepítve, és új függőség telepítése tiltott; a `construction-suite.tsx`-nek korábban sem volt saját unit
tesztje (kizárólag böngészős QA fedte). A per-kalkulátor state-átmenet ezért a fenti élő E2E-vel és
kódolvasással (TypeScript + a meglévő `construction-drafts.test.ts`/`construction-computation.test.ts` célzott
regressziói, amelyek a `applied`/`transferApplied` paramétert már eddig is lefedték) igazolt, nem önálló RTL
teszttel.

## 4. Összevont ellenőrzés

- **Célzott Vitest:** `construction-computation.test.ts`, `construction-save-panel.test.tsx`,
  `construction-drafts.test.ts`, `rafter-connection-fields.test.ts`, `roof-geometry.test.ts`,
  `gable-roof.test.ts` és a `construction/` domain mappa — **26 fájl / 298 teszt PASS**.
- **Teljes Vitest:** `npm test` (`vitest run`) — **192 fájl PASS / 8 SKIP, 1217 teszt PASS / 19 SKIP**.
- **ESLint:** `npm run lint` — PASS.
- **Típusellenőrzés:** `npm run typecheck` (`next typegen` + `tsc --noEmit`) — PASS. (A `next typegen` által
  módosított `next-env.d.ts` vissza lett állítva, hogy ne ütközzön a futó fejlesztői szerver `.next/dev`
  útvonalaival.)
- **Izolált production build:** `npm run build`, a munkafa `rsync`-elt másolatában (`/private/tmp/...`),
  symlinkelt `node_modules`/`.env.local`-lal, a futó `next dev` `.next` kimenetének érintése nélkül — PASS, 32
  statikus/dinamikus route.
- **`git diff --check`:** PASS (nincs trailing whitespace / konfliktusjelölő).
- **Böngészős E2E:** lásd 1. és 3. szakasz. A 2. szakasz (drift) nem reprodukálható ebben a menetben — lásd ott.
- DB/pgTAP újrafuttatás nem történt: a javítások nem érintenek DB-sémát, RPC-t vagy mentési integritást.

## 5. Nyitott P1/P2 és lezárási javaslat

- **P1 (pitch trust boundary):** megoldva és élő böngészőben igazolva mindkét célkalkulátoron.
- **P2 (transfer-state szivárgás):** megoldva és élő böngészőben igazolva (A→B→A kör).
- **P2 (output-drift):** **nyitva marad.** Gyökérok ebben a menetben nem reprodukálható; egy célzott, ideiglenes
  fejlesztői diagnosztikai helper (`outputDriftDiffPaths` + dev-only `console.debug`) készült, amely a következő,
  élő reprodukcióval rendelkező menetben azonnal megadja a pontos eltérő JSON-útvonalat.
- **Lezárási javaslat:** az M10.1 **nem zárható le teljesen** — a P1 és az egyik P2 bizonyítottan javítva, de a
  drift-figyelmeztetés gyökéroka továbbra is ismeretlen, és ez önmagában nem biztonsági vagy adatintegritási
  kockázat (a mentett revízió bizonyítottan változatlan marad, csak egy informatív banner jelenik meg), így nem
  blokkolja a használatot, de a dokumentált nyitott kérdést új menetben, élő reprodukcióval kell lezárni.

**Érintett fájlok:** `src/features/calculators/construction-computation.ts`,
`src/features/calculators/construction-computation.test.ts`,
`src/features/calculators/construction-save-panel.tsx`,
`src/features/calculators/construction-save-panel.test.tsx`,
`src/features/calculators/construction-suite.tsx`.

**Javasolt Conventional Commit:**
`fix(M10.1.5): enforce the shared pitch bound on the direct calculator field, scope transfer state per calculator, add output-drift diagnostics`
