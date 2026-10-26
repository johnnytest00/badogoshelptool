# M10 Fázis 1 — vízszintes ereszkiülés mezőleképezés

**Dátum:** 2026-10-26
**Hatókör:** [`docs/M10_UNIFIED_WORKFLOW_DESIGN.md`](M10_UNIFIED_WORKFLOW_DESIGN.md) 8. fejezet, "Fázis 1 — Mátrix bővítése a teljes roof.* körre" — kizárólag a `[ELLENŐRZENDŐ]` ereszkiülés-névváltozat mezőpár tisztázása és leképezése. A hajlásszög/gerincemelkedés referenciapont-kérdés és a nem-tetős/nem-saveable kalkulátorok (roof.gable, roof.truss-members, stb.) bevonása **nem** ebben a körben valósult meg — indoklás a "Szándékosan kihagyva" szakaszban.

## Mit bizonyít a forráskód

A tervdokumentum 4.2–4.3 pontja `[ELLENŐRZENDŐ]`-ként jelölte, hogy a `roof.rafter-cut` `eaveProjectionMm` mezője és a `roof.material-takeoff`/`roof.timber-cutlist` `eaveOverhangMm` mezője azonos vízszintes referenciapontot használ-e — a help-szöveg hasonlósága önmagában nem bizonyíték.

Forráskód-szintű ellenőrzés (nem vizuális/szöveges):

- [`src/domain/calculations/construction/roofs.ts:30`](../src/domain/calculations/construction/roofs.ts): `horizontalRunMm = input.horizontalHalfSpanMm + input.eaveProjectionMm` — az ereszkiülés a fél fesztávra (talpszelemen-tengelytől a gerincig mért vízszintes táv) rakódik rá.
- [`src/domain/calculations/gable-roof.ts:75,85`](../src/domain/calculations/gable-roof.ts): `halfSpanMm = buildingWidthMm / 2`, `horizontalSlopeRunMm = halfSpanMm + input.eaveOverhangMm` — ugyanaz a képlet, ugyanarra a fél fesztávra rakódva.
- Mindkét képletben a hajlásszög is ugyanúgy, a fél fesztávból és az emelkedésből számolódik (`atan2(rise, halfSpan)`), tehát a fél fesztáv mindkét oldalon ugyanazt a (talpszelemen-tengely → gerinc) vízszintes referenciapontot jelenti.
- A `eaveOverhangMm` mező (`roof-calculator-definitions.ts` `roofShapeFields`) kizárólag `shapes: ["gable", "shed"]`-nél aktív — ugyanaz a két tetőforma, amelyre a fenti gable-roof képlet ténylegesen vonatkozik. Más tetőformánál (kontytető, sátortető, stb.) a mező nem jelenik meg; a draftba írt érték ott egyszerűen felhasználatlan marad, ugyanúgy, mint bármely más forma-függő mező.

**Következtetés:** a két mező matematikailag és referenciapontban is igazoltan egyenértékű, mértékegység-eltérés nincs (mindkettő mm), ezért biztonságosan, átszámítás nélkül, egyszerű érték-másolással leképezhető.

## Mi NEM bizonyított, és ezért szándékosan kihagyva

A `horizontalHalfSpanMm`/`riseMm` (rafter-cut) ↔ `widthMm`/`pitchDegrees` (cél) pár **nem** került leképezésre:

- A `halfSpanMm = buildingWidthMm / 2` összefüggés csak a szimmetrikus nyereg-/félnyeregtető (`gable`/`shed`) modellre igazolt a fenti kódban. A cél kalkulátorok emellett kontytetőt, sátortetőt, félkontytetőt, L/T alaprajzot és manzárdtetőt is támogatnak, amelyeknél a `widthMm`/`lengthMm` jelentése és a fél fesztáv viszonya **nem lett formánként ellenőrizve** ebben a körben.
- Ez pontosan az a helyzet, amit a terv 4.3/9. fejezete kifejezetten tilt: "amíg nincs igazolva, a rendszernek **nem szabad** automatikus átszámítást felajánlania".
- Más különbség: a rafter-cut `riseMm`-et közvetlen bemenetként kéri, a cél kalkulátorok `pitchDegrees`-t (fokban) — ez nem egyszerű másolás, hanem származtatott átszámítás lenne, ami a 4.3 pont szerint külön, formánkénti igazolást igényel.

Ez a hiány dokumentált, nem hallgatott el; a teljes mátrix lezárásához formánkénti (hip/pyramid/halfHip/lShape/tShape/mansard) forráskód-ellenőrzés és célzott egységteszt szükséges — ez egy önálló, nagyobb, külön jóváhagyást igénylő feladat marad.

## Implementáció

- [`rafter-connection-fields.ts`](../src/features/calculators/rafter-connection-fields.ts): a korábbi lapos kulcslista explicit forrás→cél kulcs-leképezési táblázattá alakult (`RAFTER_JOINT_TRANSFER_FIELD_MAP`); az `eaveProjectionMm → eaveOverhangMm` páron kívül minden más kulcs változatlanul azonos nevű marad. `rafterJointTransferValues` mostantól a CÉL mezőkulcsokkal tér vissza (a hívó oldal, `construction-data.ts`/`construction-field-transfer-control.tsx`, már eddig is cél-kulcsként kezelte az eredményt, így nem igényelt módosítást).
- Nincs adatbázis-, migráció- vagy dependency-szerződés-változás: a `calculation_dependencies.dependency_type` a kalkulátorpárt jelöli, nem az átvitt mezőket.
- Az UI-oldali előnézet (a Fázis 0.3-ban elkészült táblázat) változtatás nélkül helyesen jeleníti meg az új mezőt, mert a cél kalkulátor valódi mező-definícióiból (`fields` prop) olvassa a címkét/mértékegységet — nem kódolt szöveg.

## Ellenőrzés

- **Új egységtesztek** [`rafter-connection-fields.test.ts`](../src/features/calculators/rafter-connection-fields.test.ts): az `eaveProjectionMm → eaveOverhangMm` leképezés, és hogy a fél fesztáv/emelkedés továbbra is kimarad. Célzott futás: **8/8 PASS**.
- **Teljes Vitest** (izolált worktree): **192 fájl PASS / 8 SKIP; 1189 teszt PASS / 19 SKIP** (2 új teszt).
- **ESLint**, izolált **`next typegen` + `tsc --noEmit`**, izolált **`npm run build`**: mind **PASS**.
- **Élő böngészős bizonyíték** (ugyanaz a DEMO helyi munkamenet, mint a Fázis 0.3-ban):
  1. A DEMO forrás ("DEMO M10 QA forrás") V2 revízióban 50 cm (500 mm) ereszkiülésre állítva és mentve.
  2. `roof.material-takeoff`-on az előnézet helyesen mutatta: "Vízszintes ereszkiülés · 0 mm → 500 mm", kiemelve.
  3. Megerősítés után a mező ténylegesen `50` (cm) lett — konzolhiba nélkül.
  4. Korábban, V1 (0 mm) forrással az előnézet "0 mm → 0 mm"-et mutatott (nem kiemelve) — bizonyítja, hogy az egyező/eltérő eset helyesen különül el erre a mezőre is.
- `git diff --check`: PASS.

## Elfogadási táblázat

| Terület | Státusz |
|---|---|
| `eaveProjectionMm ↔ eaveOverhangMm` referenciapont-azonosság igazolása | **PASS** (forráskód-szintű bizonyíték, nem csak szöveg) |
| Leképezés implementálása és tesztelése | **PASS** |
| Élő böngészős bizonyíték (előnézet, megerősítés) | **PASS** |
| Fél fesztáv/emelkedés ↔ szélesség/hajlásszög leképezés | **NEM MEGVALÓSÍTOTT** — szándékosan, nem igazolt formánkénti referenciapont-azonosság miatt; önálló feladat |
| Nem-saveable (roof.gable mint önálló UI, roof.geometry.* projekt oldali) kalkulátorok bevonása | **NEM MEGVALÓSÍTOTT** — a tervdokumentum eredetileg is külön, nagyobb vizsgálatot irányzott elő ehhez |

**Javasolt Conventional Commit:** `feat(M10.1): map the eave-overhang field between rafter-cut and the geometry-based roof calculators`
