# F4 — Domain calculation foundation

## F7.2 material takeoff boundary

Az F7.2 nem módosítja a `roof.gable` matematikáját. A takeoff kizárólag a
mentett, verified `calculation_revisions.output_snapshot` értéket használja,
és a `GABLE_CALCULATOR_VERSION` / `GABLE_INPUT_SCHEMA_VERSION` egyezését
ellenőrzi. Területnél nincs implicit ráhagyás: a felhasználó által megadott
százalék kerül alkalmazásra. Vonalhossznál az F5 mm érték explicit módon m-re
konvertálódik. Kézi mennyiség nem kap automatikus geometriai igazolást.

## Határ

Az F4 tiszta, determinisztikus TypeScript domain-alapot ad. Nincs benne React,
Next.js, Supabase, PostgreSQL, DOM, hálózat, perzisztencia, árképzés vagy valós
tető-, anyag- és ajánlatkalkulátor.

## Mértékegységek és pontosság

- A hosszúság kanonikus egysége a milliméter (`mm`), egész safe integerként.
- Területnél az alapegység `mm²`, térfogatnál `mm³`; a méter-alapú egységek
  explicit konverzióval érhetők el.
- A szögek fok és radián között explicit függvényekkel válthatók.
- `NaN`, végtelen, negatív dimenzió és nem biztonságos kanonikus érték nem
  fogadható el.
- A koordináták egész mm-ek. A trigonometria IEEE-754 `Math` műveleteket használ;
  összehasonlításra explicit relatív tolerancia (`1e-9`) szolgál.
- A `roundTo`, a geometriai közép-/vetítési műveletek és a területi eredmények
  központi, dokumentált kerekítést használnak. Megjelenítési kerekítés nincs a
  domain bemenetére ráterhelve.

## Geometriai alapok

A `src/domain/geometry/primitives.ts` Point2D/3D, Vector2D/3D, 2D/3D szakasz és
2D sokszög primitíveket, valamint távolságot, hosszt, skalár- és vektoriális
szorzatot, normalizálást, felezőpontot, transzformációt, területet, kerületet és
szakaszra vetítést ad. A konstruktorok és a sokszög-validátorok elutasítják a
nulla szakaszt, a kevés vagy önmetsző pontot, a duplikált szomszédot és a
degenerált területet.

## Kalkulátor-kontraktus és registry

Minden `CalculatorDefinition` stabil azonosítót, implementációs verziót,
bemeneti- és eredményséma-verziót, Zod sémákat és tiszta `calculate` függvényt
ad. Az engine előbb validál, majd számol, az outputot újra validálja, és egységes
sikeres vagy strukturált hibás eredményt ad. A hibakódok többek között:
`INVALID_DIMENSION`, `MISSING_REQUIRED_INPUT`, `INVALID_GEOMETRY`,
`NUMERIC_OVERFLOW` és `UNSUPPORTED_OPERATION`.

A registry explicit; duplikált vagy ismeretlen azonosítót elutasít. Production
tetőkalkulátor nincs regisztrálva. A tesztben használt téglalap-terület DEMO
fixture kizárólag a kontraktus integrációját demonstrálja.

A F4 eredményverziói későbbi számítási revíziók reprodukálhatóságát készítik
elő, de ebben a fázisban nem írnak adatbázisba, nem kezelnek dependency DAG-ot,
nem futtatnak hátteret és nem végeznek történeti újraszámítást.

## F5 — `roof.gable`

A `src/domain/calculations/gable-roof.ts` az első valódi calculator-registry
modul. A modell téglalap alaprajzot, középre helyezett vízszintes gerincet és két
szimmetrikus síkot feltételez. Az X a hosszanti, Y a keresztirányú, Z a
függőleges tengely; a fal megtámasztási síkja Z=0, a gerinc középen van. Az
eresz túlnyúlása vízszintes, az oromfal-túlnyúlás hosszanti irányú.

Fő képletek: `halfSpan = width / 2`, magasság módban
`pitch = atan2(rise, halfSpan)`, szög módban `rise = halfSpan * tan(pitch)`,
`slope = (halfSpan + eaveOverhang) / cos(pitch)`,
`planeArea = overallRoofLength * slope`, ahol
`overallRoofLength = buildingLength + frontOverhang + rearOverhang`. A ferde
hossz geometriai hossz, nem statikailag igazolt szarufavágási hossz.

Az implementation/input/result verzió `1.0.0`. A szerver mentés előtt ugyanazt a
tiszta kalkulátort futtatja, amelyet a böngésző élő előnézethez használ; a kliens
eredménye nem kerül elfogadásra hiteles számításként. Az F6 a síkok négy
koordinátás vertex-listáját használja technikai rajzforrásként.

## F6 — rajzmodell és vetületek

A `src/domain/drawings/gable-drawing.ts` tiszta modellje nem számol új tetőgeometriát.
A `roof.gable` kimenetéből közvetlenül készít négy vetületet: X/Y felülnézetet,
Y/Z orom- és keresztmetszetet, valamint X/Z hosszanti oldalnézetet. A fizikai
koordináták és az SVG-koordináták külön maradnak; a függőleges képernyőirány
inverziója egyetlen központi transzformációban történik.

A rajzmodell külön kezeli a síkokat, kontúrokat, gerinc/eresz éleket,
méretvonalakat, szögeket és segédvonalakat. A méretfeliratok forrása mindig F5
eredménymező (`overallRoofLengthMm`, `horizontalRoofWidthMm`, `roofRiseMm`,
`slopeLengthIncludingEaveMm` stb.), nem képernyőpixel-távolság. A
`formatDrawingMeasurement` magyar vesszős mértékformátumot ad.

Az SVG-renderer natív React elemeket használ, rétegei kapcsolhatók, és a méret-
illetve numerikus eredmények a rajzon kívül is szövegesen elérhetők. A nézetváltás
és a zoom/pan kizárólag megjelenítési állapot; nem hoz létre revíziót és nem ír
adatbázisba. A Scaling Provider rajzskálája a viewport ideiglenes zoomjától
független, így nincs kettős geometriai skálázás.

## F7.3.1 — `covering.metal-sheets.layout`

A tiszta lemezkiosztás-kalkulátor az F5 `roof.gable` eredményéből kapja a tető
hosszanti X-kezdő-/végpontját és az eresztől gerincig mért ferde hosszt. A
tetőgeometriát nem számolja újra. Az első hatókör két téglalap alakú,
szimmetrikus nyeregtető-sík, egy darabból futó sávokkal és keresztirányú toldás
nélkül.

`stripsPerPlane = ceil(roofLongitudinalLength / effectiveCoveringWidth)`. A
maradék nulla esetén minden fedési intervallum teljes; különben az utolsó,
indulási irány szerinti szélső intervallum részleges. Balról indulva a részleges
sáv a jobb X-szélen, jobbról indulva a bal X-szélen van. Az irány nem változtatja
meg a fedett hosszt vagy a darabszámot.

A hasznos fedési szélesség és az opcionális névleges lemezszélesség külön,
felhasználó által megadott adat. A kalkulátor nem következtet fizikai vágási
szélességre, átfedésre, vastagságra vagy gyártói előírásra. A geometriai
lemezhossz az F5 ferde hossza; az opcionális végoldali ráhagyás külön mezőként
növeli az ideiglenes hosszt. A kézi minimum/maximum csak megfelelőségi jelzést
ad, automatikus darabolást vagy keresztirányú átfedést nem készít.

A domain kimenet mindkét tetősík determinisztikus X-intervallumait és sáv-ID-it
adja az SVG-rétegnek; Reactben nincs második kiosztási képlet. Tetősíkonként 400
sáv felett a kalkulátor renderbiztonsági `UNSUPPORTED_OPERATION` hibát ad,
csonkolás nélkül. Az F7.3.1 eredmény élő, ideiglenes előnézet. Verziózott mentés,
katalógusvariáns-kapcsolat és jóváhagyott anyagmennyiség csak F7.3.2-ben
készülhet.

## F7.3.2 — katalógusmapping és reprodukálható layout-revíziók

A katalógusadapter kizárólag az explicit `effective_width_mm`,
`nominal_width_mm`, valamint a dokumentált `minimum_sheet_length_mm`,
`maximum_sheet_length_mm` és `end_allowance_mm` JSON-kulcsokat térképezi. A
névleges szélességből nincs hasznos szélesség-, átfedés- vagy gyártási
határkövetkeztetés. A kézi felülírás elsőbbséget kap, de minden paraméter forrása
`catalog` vagy `user_provided` jelöléssel megmarad.

A mentett inputsnapshot három külön része a tiszta `calculatorInput`, a konkrét
tető-/geometriarevízió-azonosítók és az anyag katalógussnapshotja + tényleges
értékei + mezőnkénti provenance. A server action a jelenlegi verified
`roof.gable` outputból újra összeállítja és futtatja az 1.0.0 layout-kalkulátort;
kliens által küldött outputot nem ment.

A történeti SVG a mentett layout outputot a hozzá tartozó upstream gable outputtal
rendereli. Új tető- vagy releváns anyagspecifikáció nem számolja újra a régi
revíziót, csak külön stale jelzést ad. Az ár nem kalkulációs input, ezért önmagában
nem invalidálja a kiosztást. Anyagkimutatási automatikus javaslat csak ellenőrzött
négyzetméteres területből készülhet; a geometriai sávszám nem tekinthető
automatikusan megvásárolható darab-, folyóméter- vagy csomagmennyiségnek.
