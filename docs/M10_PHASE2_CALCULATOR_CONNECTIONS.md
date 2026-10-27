# M10.2 — kalkulátorok közötti geometriai adatkapcsolatok bővítése

Státusz: **PASS WITH LIMITATIONS**. Az M10.1-ben elkészült, egyirányú (`roof.rafter-cut → roof.material-takeoff`/`roof.timber-cutlist`) mezőátviteli rendszert két új, szakmailag bizonyított iránnyal bővítettem, a meglévő UI-t, dependency-infrastruktúrát és attestációt újrahasznosítva. Nincs új Felmérés/Projekt modul, nincs kötelező Munkanapló-függőség; a kalkulátorok maradtak a kiindulópont.

## 1. Forrás–cél kompatibilitási mátrix

| Forrás | Cél | Tetőforma | Közvetlenül másolható | Biztonságosan számítható | Kézzel megadandó | Nem támogatott |
|---|---|---|---|---|---|---|
| `roof.rafter-cut` | `roof.material-takeoff` / `roof.timber-cutlist` | bármely (Karmi), **gable** (geometria) | `seatCutHeightMm`, `plateWidthMm`, `purlinFaceMm`, `purlinTopMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`, `eaveProjectionMm→eaveOverhangMm` | `widthMm`/`pitchDegrees` gable célnál, explicit szimmetria-jóváhagyással | `roofShape`, `lengthMm`, nem-gable `widthMm`/`pitchDegrees` | hip/pyramid/halfHip/lShape/tShape/mansard szélesség/hajlás (változatlan M10.1 korlát) |
| `roof.material-takeoff` ↔ `roof.timber-cutlist` | egymás | **bármely** (azonos mezőséma) | **a teljes mezőkészlet** 1:1 (incl. `roofShape`, `widthMm`, `pitchDegrees`, `lengthMm`, minden Karmi-mező) | — (nincs konverzió, a két kalkulátor szó szerint ugyanazt a `fields` tömböt definiálja) | — | — |
| `roof.material-takeoff`/`roof.timber-cutlist` (**gable**) | `roof.rafter-cut` | bármely (Karmi), **gable** (geometria) | a fenti Karmi-mezők fordított irányban | `horizontalHalfSpanMm`/`riseMm`/`eaveProjectionMm` gable forrásnál, explicit szimmetria-jóváhagyással, kötelező forrás-HAP | `rafterDepthMm` (nincs megfelelő forrásmező) | nem-gable forrás geometriája |
| `roof.truss-members` | bármelyik | — | — | — | — | **UNSUPPORTED / REQUIRES DATA** — teljesen más mezőmodell (`spanMm`/`riseMm`/`panelCountPerHalf`); nincs `roofShape`, nincs HAP/Karmi-mező, nincs közös kulcs semelyik másik kalkulátorral |

A mátrixot a tényleges kódból (`roof-calculator-definitions.ts`, `rafter-connection-fields.ts`) vezettem le, nem feltételezésből. Az azonos nevű mezők fizikai jelentését a meglévő M10.1 bizonyítás (eresz, HAP) és az új inverz-formula levezetés (lásd 3. pont) igazolja.

## 2. M10.1-ből újrahasznosított komponensek

- `ConstructionFieldTransferControl` (előnézet/megerősítés/Undo UI) — kibővítve `targetCalculatorId` prop-pal, új forráskör-ágakkal, de **nincs** párhuzamos modal/wizard.
- `calculation_dependencies` tábla, `calculation_dependency_insert_guard`, a ciklus- és projekt/creator-scope validáló trigger (20261026020000) — változatlan, újra felhasznált.
- `save_standalone_construction_calculation` RPC — **generalizálva** egyetlen új, forward-only migrációban (20261027010000), a snapshot-teljességi kapu, advisory lock, idempotencia-ledger és attestáció érintetlen.
- `private.construction_revision_attestations`, `require_attested_construction_revision` — változatlan.
- A gable geometria-konverzió képlete (`convertGableGeometryFromRafterCut`) — **nem módosult**; az új irány a matematikai inverze, külön függvényként (`convertRafterCutGeometryFromGable`).

## 3. Újonnan megvalósított kapcsolatok

### 3.1 `roof.material-takeoff` ↔ `roof.timber-cutlist` (Prioritás A)

A két kalkulátor a kódban szó szerint ugyanazt a mezőtömböt (`[...roofShapeFields, ...birdsmouthFields]`) definiálja (`roof-calculator-definitions.ts`). Emiatt a teljes mentett `fields` snapshot — bármely tetőformánál — közvetlenül, konverzió nélkül átmásolható: `roofShape`, `widthMm`/`lengthMm`/stb., az összes Karmi/gerinc/eresz mező. Ez a legbiztosabb, legszélesebb új kapcsolat: minden 8 támogatott tetőformára működik, nem csak gable-re.

### 3.2 `roof.material-takeoff`/`roof.timber-cutlist` → `roof.rafter-cut` (Prioritás B, M10.1 fordítottja)

Az M10.1 gable-konverzió (`widthMm = 2×halfSpan`, `pitch = atan2(rise−HAP, halfSpan)`) matematikai inverze:

```
halfSpanMm = widthMm / 2
riseMm = HAP + halfSpanMm × tan(pitchDegrees)
eaveProjectionMm = eaveOverhangMm   (M10.1-ben már bizonyított egyenértékűség)
```

`convertRafterCutGeometryFromGable` (`src/domain/calculations/construction/roofs.ts`) csak gable forrásnál és explicit felhasználói szimmetria-jóváhagyás mellett fut; a cél `rafterGeometryInputSchema`-ja a végső érvényességi kapu (`TARGET_RANGE`). A forrás HAP hiánya (`MISSING_HAP`) soha nem kezelhető 0-ként — pontosan az M10.1-logika tükörképe. A Karmi/gerinc/eresz mezők (`seatCutHeightMm`, `plateWidthMm`, `purlinFaceMm`, `purlinTopMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`, `eaveOverhangMm→eaveProjectionMm`) a `RAFTER_JOINT_TRANSFER_FIELD_MAP` **programozott inverzeként** (`ROOF_SHAPE_TO_RAFTER_CUT_FIELD_MAP`) kerülnek át, bármely tetőformánál — nem csak gable-nél —, mert ezek a mezők már M10.1-ben bizonyítottan forma-függetlenek.

Élő böngészős próbával igazolva: `widthMm=8000mm`, `pitchDegrees=35°`, `HAP=60mm` forrásból `horizontalHalfSpanMm=4000mm`, `riseMm≈2860.8302mm` (teljes pontossággal tárolva), `eaveProjectionMm=0mm` — a célkalkulátor ezután teljes, menthető eredményt számol.

### 3.3 Konverziók szakmai feltételei

- A gable-geometria konverzió (mindkét irányban) kizárólag a felhasználó explicit, minden előnézet-megnyitáskor és tetőforma-váltáskor visszaálló szimmetria-jóváhagyása mellett fut.
- Hiányzó HAP soha nem válik hallgatólagos nullává (`MISSING_HAP`).
- A cél saját validátora (`rafterGeometryInputSchema` / a gable-tető `<80°` hajlásséma) a végső kapu, nem a segédfüggvény saját, lazább tartománya.
- Preview nem ír draftot; csak a kifejezett megerősítés.

### 3.4 Kötelezően kézzel megadandó adatok

- `roof.rafter-cut` célnál: `rafterDepthMm` (nincs megfelelő forrásmező egyik irányban sem).
- Nem-gable forrás/cél geometriája (`widthMm`/`pitchDegrees`/`horizontalHalfSpanMm`/`riseMm`) — csak a Karmi-mezők vehetők át, a geometria kézi marad.

### 3.5 Nem támogatott tetőformák és indoklásuk

A hip/pyramid/halfHip/lShape/tShape/mansard formák és a `roof.rafter-cut` fél-fesztáv modellje közötti geometriai megfeleltetés **nincs** szakmailag bizonyítva (a `halfSpanMm = widthMm/2` összefüggés csak szimmetrikus nyereg-/félnyeregtetőre igazolt). Ezeknél a geometriai mezők átvitele tiltott marad; a Karmi-mezők attól függetlenül átvehetők. A `roof.truss-members` teljes egészében kimaradt — nem mulasztás, hanem bizonyított hiány: a mezőmodellje (`spanMm`/`riseMm`/`panelCountPerHalf`) nem oszt egyetlen kulcsot sem a többi kalkulátorral.

## 4. UI és mentési munkafolyamat

A célkalkulátoron belüli „Adatok átvétele” vezérlő egy listában mutatja az összes kompatibilis forrást, forrástípus szerinti felirattal (`mentett szarufa-kiszabásból` / `másik mentett tetőgeometriai kalkulációból` / `mentett tetőgeometriai kalkulációból`). Az előnézet megkülönbözteti az Átvett és a Számított mezőket, a forrás nevét és revízióját mutatja, a megerősítés előtt nem ír draftot. A meglévő Undo, a mezőnkénti invalidáció tetőforma-váltáskor (`invalidateGableGeometryOnShapeChange`) és a kalkulátoronként skálázott transfer-state (`transferSourceByCalculator`/`transferAppliedByCalculator`) változatlanul, új kódduplikáció nélkül vonatkozik az új irányokra is.

## 5. DB/RLS/dependency változások

Egy új, forward-only migráció (`20261027010000_construction_field_transfer_pairs.sql`): a `save_standalone_construction_calculation` RPC forrás/cél-ellenőrzése egy explicit, mindkét irányú pármátrixra általánosítva (`rafter-cut ↔ {material-takeoff, timber-cutlist}`, `material-takeoff ↔ timber-cutlist`); minden más pár (pl. bármi `truss-members` forrással) elutasított. A `dependency_type` mostantól a tényleges forrás-kalkulátort is tartalmazza (`field-transfer:<forrás>-><cél>`). Az attestáció, snapshot-teljességi kapu, advisory lock és idempotencia-ledger logika változatlan.

Helyi, izolált `supabase db` menetben, **reset nélkül** (`supabase migration up --local`) alkalmazva, majd egy rollback-be csomagolt funkcionális próbával igazolva: `material-takeoff → timber-cutlist` és `material-takeoff → rafter-cut` sikeres mentés+dependency, `truss-members` forrás `42501` hibával elutasítva. Hosted/production adatbázist nem érintettem.

## 6. Teszt- és E2E-eredmények

- Célzott Vitest: `construction.test.ts` (21, incl. 3 új reverse-konverziós teszt), `rafter-connection-fields.test.ts` (26, incl. 10 új), `construction-data.test.ts` (13, incl. 3 új `listRoofShapeTransferSources` teszt) — mind **PASS**.
- Teljes `npx vitest run`: **192 fájl PASS / 8 SKIP, 1235 teszt PASS / 19 SKIP** (az M10.1.10 záró 1221-ről nőtt, regresszió nélkül).
- `npm run lint` (célzott, az érintett fájlokra): **PASS**.
- `npx tsc --noEmit`: **PASS**.
- Izolált (rsync-elt, symlinkelt `node_modules`/`.env.local`) `npm run build`: **PASS**.
- `git diff --check`: **PASS**.
- Élő böngészős E2E (futó helyi dev szerveren, DEMO munkamenetben): mindkét új irány végigjátszva valós mentett DEMO forrásokkal — `roof.material-takeoff/timber-cutlist (gable, 8000mm/35°/HAP 60mm) → roof.rafter-cut` (szimmetria-jóváhagyás, előnézet, megerősítés, a célkalkuláció ezután **Számítható**/**Teljes kalkulációs eredmény** állapotba került) és `roof.timber-cutlist → roof.material-takeoff` (teljes 23 mezős 1:1 diff, helyes `roofShape`/`widthMm`/`pitchDegrees`/Karmi-mezők). Mindkét esetben Mégse nem módosította a draftot.

**Nem ellenőrzött / korlát ebben a menetben:** a teljes 375×812/812×375/1440×900 viewport×téma mátrix (csak az alap desktop nézet futott élőben); az Undo élő próbája az új irányokra (a logika kód szerint azonos a bizonyított M10.1 mechanizmussal, de külön élő próbát nem futtattam rá); pgTAP regresszió nem futott (nincs RLS/tábla-séma változás, csak egyetlen meglévő SECURITY DEFINER függvény belső logikája bővült — funkcionális smoke teszttel igazolva helyette).

## 7. Fennmaradó kockázatok és későbbre hagyott kapcsolatok

- Nem-gable geometriai konverzió (hip/pyramid/halfHip/lShape/tShape/mansard ↔ `roof.rafter-cut` vagy egymás között) — szakmailag nincs igazolva, tudatosan kihagyva.
- `roof.truss-members` bármely más kalkulátorral — tudatosan `UNSUPPORTED`.
- Mobil/sötét téma és a teljes nézetméret-mátrix élő ellenőrzése a következő menetre maradt.

## 8. Javasolt Conventional Commit

```
feat(M10.2): add material-takeoff/timber-cutlist sibling transfer and reverse gable geometry into rafter-cut
```
