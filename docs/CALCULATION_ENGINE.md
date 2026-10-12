# F4 — Domain calculation foundation

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

Az F4 eredményverziói későbbi számítási revíziók reprodukálhatóságát készítik
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
eredménye nem kerül elfogadásra hiteles számításként. Az F6 számára a síkok négy
koordinátás vertex-listája megmarad, de jelenleg nincs technikai SVG-renderer.
