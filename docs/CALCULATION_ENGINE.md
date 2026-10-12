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
