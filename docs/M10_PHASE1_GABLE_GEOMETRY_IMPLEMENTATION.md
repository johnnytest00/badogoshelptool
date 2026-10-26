# M10 Fázis 1 — nyeregtető geometriai adatátadás implementációs riport

Státusz: **PASS WITH LIMITATIONS**. A tervdokumentum ([M10 Fázis 1 geometriai terv](M10_PHASE1_GEOMETRY_TRANSFER_DESIGN.md)) MVP-körét valósítottam meg: mentett `roof.rafter-cut` revízióból, kizárólag gable célformánál és explicit szimmetria-jóváhagyás mellett, a `widthMm`/`pitchDegrees` mezők matematikai konverzióval átvehetők a meglévő „Adatok átvétele” vezérlőn keresztül.

## 1. Megvalósított geometriai konverziók

- Új, tiszta domain-helper: `convertGableGeometryFromRafterCut` ([roofs.ts](../src/domain/calculations/construction/roofs.ts)).
  - `widthMm = 2 × horizontalHalfSpanMm`.
  - `pitchDegrees = atan2(riseMm − seatCutHeightMm, horizontalHalfSpanMm) × 180 / π`, pontosan a `calculateRafterGeometry` már bizonyított képletével megegyezően.
  - Belső számítás teljes `number` pontossággal; a cél mezőbe a nem kerekített `String(pitchDegrees)` kerül (soha nem a kijelzett, kerekített szövegből számol vissza). Az előnézet legfeljebb 3 tizedesre kerekítve mutatja.
- Három független, kézi trigonometriával ellenőrzött példa (4000/2800/100 → 8000 mm, 34,019°; 3000/1500/0 → 6000 mm, 26,565°; 5000/3200/200 → 10 000 mm, 30,964°) — lásd teszt 3. pont.

## 2. Szimmetria-feltétel kezelése

- A `ConstructionFieldTransferControl` ([construction-field-transfer-control.tsx](../src/features/calculators/construction-field-transfer-control.tsx)) gable célnál egy explicit, nem előre bepipált jelölőnégyzetet mutat: „A tető szimmetrikus nyeregtető, a két tetősík vízszintes fél fesztávja azonos.”
- A jóváhagyás hiánya csak a `widthMm`/`pitchDegrees` átvételét blokkolja; a csatlakozási (Karmi/gerinc/eresz) mezők jóváhagyás nélkül is átvehetők (2.1 követelmény).
- A jóváhagyás minden előnézet-újranyitáskor és tetőforma-váltáskor (`useEffect` a `roofShape`/`previewing.revisionId` függőségeken) automatikusan visszaáll — nem marad érvényben egy már nem releváns korábbi döntés.

## 3. Támogatott és tiltott tetőformák

- Kizárólag `roofShape === "gable"` eredményezhet `widthMm`/`pitchDegrees` átvételi sort. A `shed`, `hip`, `pyramid`, `halfHip`, `lShape`, `tShape`, `mansard` célformákra a geometriai szekció (jelölőnégyzet, számított sorok) egyáltalán nem jelenik meg; csak a már korábban bizonyított csatlakozási/ereszmezők kínálhatók fel, forma szerint szűrve.
- Az ereszkiülés (`eaveProjectionMm` → `eaveOverhangMm`) M10 Fázis 0/1 leképezése változatlan; az előnézet/megerősítés logikája nem változott ennél a mezőnél.

## 4. Pontosság és validáció

- `convertGableGeometryFromRafterCut` explicit hibakódokat ad becslés helyett: `INVALID_SOURCE_GEOMETRY` (nem véges/0/negatív fél fesztáv vagy gerincemelkedés), `MISSING_HAP` (a forrás snapshotban a `seatCutHeightMm` kulcs egyáltalán nincs jelen — régi, mező előtti snapshot), `INVALID_HAP` (negatív, vagy nem kisebb a gerincemelkedésnél), `TARGET_RANGE` (a számított szélesség nem egész mm, ≤0, >100 000, vagy a hajlás nem esik (0°, 90°) tartományba — a gable cél séma `buildingWidthMm`/`roofPitchDegrees` határaival konzisztensen).
- A cél meglévő sémavalidációja (`gableRoofInputSchema`, `roofGeometryInputSchema`) marad a végső érvényességi kapu; a helper csak a nyilvánvalóan érvénytelen/tartományon kívüli esetet szűri ki előre, hogy ne jelenjen meg becsült érték átvehetőként.

## 5. Meglévő adatátviteli UI bővítése

- Nincs új adatátviteli felület: a meglévő `ConstructionFieldTransferControl` bővült.
- Az előnézet táblázata új, negyedik „Eredet” oszlopot kapott: minden sor explicit „Átvett” vagy „Számított · ⟨rövid indok⟩” címkét visel (pl. „Számított · szimmetrikus nyeregtető alapján”, „Számított · gerincemelkedésből és HAP-ból számítva”).
- Sikertelen gable-konverziónál (jóváhagyás megadva, de a forrás nem konvertálható) rövid, magyar hibaüzenet jelenik meg a jóváhagyási jelölőnégyzet alatt, a konkrét ok szerint (`GABLE_SKIP_REASON_LABEL`), becslés nélkül.
- Mégse/Megerősítés/Visszavonás viselkedése (M10 Fázis 0) változatlan: az előnézet nem ír draftot, csak a megerősítés, a visszavonás a megerősítés előtti mezőértékeket állítja vissza.
- Forma-/draftváltozás kezelése: a komponens minden renderben a friss `roofShape`/`currentFields` propokból számol (nincs befagyasztott snapshot), így tetőforma-váltás a nyitott előnézeten belül azonnal eltünteti/visszahozza a geometriai szekciót és újraszámolja a diffet — nem marad megerősíthető, elavult előnézet.

## 6. Mentési és dependency-garanciák

- Nem változott: szerveroldali Action/writer útvonal, immutable input/output snapshot, QA08/QA09 attestáció, revíziószám és optimistic concurrency, idempotens mentés, szervezeti/jogosultsági izoláció, dependency-rögzítés forrásrevízióval. Nincs új SQL-migráció, tábla, snapshot-séma- vagy writer-változás.
- A hiányzó kötelező `lengthMm` (tetőhossz) és homlokzati kiülések továbbra sem kapnak automatikus értéket; a cél csak a felhasználó kézi kiegészítése után menthető teljes eredményként.

## 7. Tesztek

- **Domain unit** ([construction.test.ts](../src/domain/calculations/construction/construction.test.ts)): a tervdokumentum három számpéldája, hiányzó HAP, HAP ≥ rise, negatív/0/nem véges bemenet, tartományon kívüli (>100 000 mm) fél fesztáv — mind PASS.
- **Mezőszerződés integráció** ([rafter-connection-fields.test.ts](../src/features/calculators/rafter-connection-fields.test.ts)): `rafterCutTransferFields` — a csatlakozási mezők mindig átmennek (gable-jóváhagyástól függetlenül), `widthMm`/`pitchDegrees` csak gable + jóváhagyás esetén jelenik meg, sosem nem-gable célnál, és sosem konvertálhatatlan forrásnál — mind PASS.
- **Böngészős E2E** (helyi, hitelesített dev környezet, `organization=00000000-0000-4000-8000-000000000010`): `DEMO M10.1 gable forrás` néven mentett `roof.rafter-cut` (4000/2800/100) → `roof.material-takeoff` gable cél. Jóváhagyás nélkül csak a csatlakozási mezők jelennek meg a diffben; jóváhagyás után a táblázat pontosan `8000 mm` / `34,01934998982646 °` sort mutat „Számított” jelöléssel; megerősítés után a tényleges mezők (`Tető szélessége` = 800 cm, `Tetőhajlás` = 34,01934998982646) helyesen kitöltődnek, a „Hiányos kalkuláció” lista a `Tető hossza`-ra szűkül; Visszavonás pontosan az eredeti (üres) állapotot állítja vissza. Kontytető célformára váltva a geometriai szekció és a `widthMm`/`pitchDegrees` sorok nem jelennek meg, csak a csatlakozási mezők. Mobil (375×812) nézetben a jelölőnégyzet és a táblázat olvasható, a táblázat a meglévő vízszintes görgetési szabály szerint viselkedik.

## 8. Nem ellenőrzött esetek

- 812×375 tájfekvés és 1440×900 desktop nézet külön nem lett újramérve ennél a mérföldkőnél (a mobil 375×812 nézet igazolt).
- Sötét/világos téma-váltás külön nem lett összehasonlítva (a dev környezet alapértelmezett témájában igazolva).
- Tényleges mentés (`roof.material-takeoff` teljes, `lengthMm`-mel kiegészített, menthető kalkulációként) és újranyitás utáni perzisztencia nem lett böngészőben végigfuttatva ennél a mérföldkőnél — a mezőkitöltés és a séma-validáció korábbi M10 Fázis 0 böngészős bizonyítékai, valamint a jelen célzott tesztek adják az alapot.
- pgTAP/DB-regresszió nem futott újra: a mentési adatút és DB-szerződés nem változott.

## 9. Módosított fájlok

- [src/domain/calculations/construction/roofs.ts](../src/domain/calculations/construction/roofs.ts) — `convertGableGeometryFromRafterCut` helper.
- [src/domain/calculations/construction/construction.test.ts](../src/domain/calculations/construction/construction.test.ts) — domain unit tesztek.
- [src/features/calculations/construction-data.ts](../src/features/calculations/construction-data.ts) — `RafterCutTransferSource.geometry` mező (csak a szükséges forrásmezők).
- [src/features/calculators/rafter-connection-fields.ts](../src/features/calculators/rafter-connection-fields.ts) — `rafterCutTransferFields` pure helper.
- [src/features/calculators/rafter-connection-fields.test.ts](../src/features/calculators/rafter-connection-fields.test.ts) — integrációs tesztek.
- [src/features/calculators/construction-field-transfer-control.tsx](../src/features/calculators/construction-field-transfer-control.tsx) — szimmetria-jóváhagyás UI, Átvett/Számított megkülönböztetés.
- [src/features/calculators/construction-suite.tsx](../src/features/calculators/construction-suite.tsx) — `roofShape` prop átadása a vezérlőnek.
- [src/app/globals.css](../src/app/globals.css) — `.field-transfer-symmetry` minimális stílus.

## 10. Ellenőrzés

Célzott: `npx vitest run src/domain/calculations/construction/construction.test.ts src/features/calculators/rafter-connection-fields.test.ts` → **29/29 PASS**.
Teljes: `npx vitest run` → **192 fájl PASS/8 SKIP, 1195 teszt PASS/19 SKIP**.
`npx eslint` az érintett fájlokra → **PASS**.
Izolált (`/private/tmp` másolat, futó dev szerver `.next`-je érintetlen) `npx tsc --noEmit` → **PASS**; `npm run build` → **PASS**.
`git diff --check` → **PASS**.
Élő böngészős E2E a fenti 7. pont szerint → **PASS**.

**Javasolt Conventional Commit:** `feat(M10.1): transfer validated gable geometry from saved rafter cuts`

## 11. Következő javasolt lépés

A tervdokumentum 5. pontja szerint a shed forrásvégpont-azonosítás (forrás gerinctengely vs. shed cél fél szélesség) külön, formánkénti bizonyítást igénylő, önálló jövőbeli mérföldkő — ebben a fázisban szándékosan nem valósult meg.
