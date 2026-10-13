# F4 — Domain calculation foundation

## F9.6.1 — Ereszcsatorna-anyagbecslés

Az első, gyártófüggetlen ereszcsatorna-domain modul azonosítója `gutters.material-estimate`, verziója 1.0.0. A tiszta TypeScript motor egymástól független ereszszakaszokat, külön lefolyómeneteket és explicit kézi komponensmennyiségeket fogad.

- Eresz- és lefolyószál: `ceil(hossz_mm / kereskedelmi_szálhossz_mm)` szakaszonként. Ez előzetes kereskedelmi szálbecslés, nem vágási vagy toldási terv.
- Maradék hossz szakaszonként megmarad; független menetek nem kerülnek összevonásra.
- Konzolbecslés csak felhasználó által megadott kiosztás esetén készül: `ceil(hossz / kiosztás) + 1`; az eredmény külön figyelmeztetést kap, nem gyártói előírás.
- Végzáró, összekötő, kifolyó, könyök és egyéb tartozék kézi mennyiségként adható meg.
- Nem történik hidraulikai méretezés, csatorna- vagy lefolyóátmérő-következtetés, szabvány- vagy gyártói megfelelés-igazolás.
- A bemenet megőrzi a mérési forrást és tetőél-referenciát; az F9.6.1.1.1 projektkalkulátor explicit geometry-javaslatból tölti, és a mentett revízióhoz tetőmodell-revízió dependency kapcsolódik.

Az egységtesztek lefedik az egy- és többszakaszos esetet, pontos szálhatárt, részleges szálat, lefolyót, kézi komponenst, konzolbecslést, hibás bemenetet és registry-integrációt. A perzisztens revíziót az F9.6.1.1.1 integráció kezeli; katalóguskapcsolat és material takeoff átadás külön implementációs feladat.

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

## F9.6.1.2 — gutter integrációs határ

A gutter adapter a tiszta kalkulátor `gutterRuns`, `downpipeRuns` és kézi
komponens-kimenetéből előzetes `piece` jelölt tételeket képez. A kereskedelmi
szál darabszám nem folyóméter, és egyik mennyiségből sincs automatikus csomag- vagy
gyártói konverzió. A katalógusvariáns csak explicit kiválasztással és aktív,
szervezethez tartozó rekordként kapcsolható; az egységütközés vagy hiányzó
kapcsolat `incompatible`/`unmapped` marad.

Az SVG ugyanebből a bemenetből épít determinisztikus, független szakaszokat és
kereskedelmi szálhatárokat. Lefolyó és eresz között csak tárolt kapcsolat
jeleníthető meg; hiányzó kapcsolatnál a lefolyó önálló sematikus elem. A rajz nem
hitelesített szerelési dokumentáció.

## F9.6.2.1 — `sheet_metal.flashings.material-estimate`

A tiszta TypeScript kalkulátor a production registryben szerepel, és az `orom` (`verge`), `fal` (`wall`), `eresz` (`eaves`), `gerinc` (`ridge`), `vápa` (`valley`) és `egyedi` (`custom`) szegélyfutásokat azonos, gyártófüggetlen mennyiségi logikával kezeli. A szakaszokat a hívó explicit módon adja meg; nincs roof-edge import, kategóriánkénti automatikus szabály, adatbázis, UI vagy takeoff-adapter ebben a fázisban.

Minden hossz egész, pozitív, safe-integer `mm`; a végkiterjesztés és tartalék egész, nemnegatív `mm`. `D = hossz + kezdő kiterjesztés + végkiterjesztés`, `Dᵣ = D + tartalék`. A számítás a `Dᵣ` tervezési célra ad előzetes darabszámot, de külön mutatja `D`-t és a tartalékot. Minden futás független; közös vágás és maradék-újrafelhasználás nincs.

- `no_overlap_confirmed`: explicit nullás átfedés, `n = ceil(Dᵣ / S)`.
- `explicit_overlap` esetén `0 ≤ O < S`: `n=1`, ha `Dᵣ ≤ S`; különben `n = ceil((Dᵣ−O)/(S−O))`. A kapacitás `nS−(n−1)O`, az explicit átfedés-fogyasztás `(n−1)O`.
- `effective_length_supplied` esetén `0 < U ≤ S`, ahol `U` a következő szál hozzáadott fedési hossza: `n=1`, ha `Dᵣ ≤ S`; különben `n=1+ceil((Dᵣ−S)/U)`. Ebből a tényleges fizikai átfedés nem következik, ezért az átfedés-fogyasztás null/hiányzó.
- `unknown` módnál a szál- és összesített névleges mennyiség `null`, az eredmény `incomplete`; átfedést nem feltételez.

A `totalNominalStockLengthMm` a darabszám × névleges szálhossz. `availableCoverageCapacityMm` és `unallocatedCoverageCapacityMm` a választott matematikai modellben elérhető és a tervezési célon felüli fedési kapacitás; ezek nem offcut-maradékok, nem újrafelhasználható készlet és nem vágási veszteség. Az output provenance-t őriz a hosszmérésről, forrásrevízió-hivatkozásról és névleges/kapcsolati paraméterekről. A `geometry` hossz forrás-revíziót és élhivatkozást követel. A DEMO forrás külön warningot ad; semmilyen gyártói verified állapotot nem gyárt.

Érvénytelen/hiányzó/nem egész vagy nem biztonságos hossz, `O ≥ S`, `U > S`, ismétlődő azonosító vagy geometriai forráshivatkozás nélküli geometry input a Zod határon elutasított. A köztes összegek és szorzatok BigInttel készülnek, majd safe-integer eredményre korlátozottak; túlfutás `NUMERIC_OVERFLOW`. A kalkulátor nem validál gyártói minimum/maximumot, hajlást, lemezvastagságot, csomópontot, rögzítést, sarok- vagy végszabályt; ezeket és a végleges beszerzési mennyiséget minden eredmény kifejezetten feloldatlanul/előzetesként jelzi. Gyártói útmutató vagy SKU hiányában nincs alapátfedés, veszteség vagy rendelési kerekítés.

## F9.6.2.2 — projektintegráció

A `/projektek/[projectId]/szegelyek` oldal a domain kalkulátort használja, több független szakaszt kezel, mind a hat kategóriát elérhetővé teszi, és a számítási inputot Zod validálja. A hosszmezők szöveges draftként maradnak a kliensben, ezért hibás/üres érték javításkor nem vész el. Ismeretlen kapcsolatnál a darabszám `null`, a felület pedig kifejezetten jelzi a hiányzó átfedést/hasznos hosszt. Nincs gyártói alapérték, katalógus, takeoff vagy SVG.

A `roof.gable` adapter kizárólag ellenőrzött, aktuális modell- és kalkulációs revízióból ajánl hét explicit élt: két eresz, egy gerinc, négy ferde oromél. A `flashing-geometry.ts` megőrzi a pontos eredeti geometriai hosszt; mivel a motor mm-egész számot kér, a beviteli hossz felfelé kerekített egész mm. Referencia rögzíti a tetőmodell-ID/revízió, kalkuláció-ID/revízió, élkulcs, kimeneti mező, eredeti hossz és felülírás állapotát. A falszegély/vápa geometriája nem következtetett.

`20261013080500_flashing_calculation_persistence.sql` a meglévő immutable kalkulációs revíziókat és dependency gráfot használja, SECURITY INVOKER RPC-vel, tagság/projekt/forráspár ellenőrzéssel, advisory lockkal és expected revision kontrollal. A szerver újraszámol mentés előtt; a PostgreSQL RPC ismét ellenőrzi az exact upstream revíziókat, él/mező/kategória-kapcsolatot és eredeti hosszt, majd mindkét forrásfüggőséget tranzakcióban rögzíti. A régi revíziók változatlanok; megváltozott geometria történeti snapshotokat stale-ként jelöl.

## F9.6.2.3 — katalógus-hozzárendelés, takeoff és SVG

A `flashing-material-integration.ts` a mentett outputból állít elő hat kategóriára draftjelöltet. A nem-null előzetes szálbecslés `piece`; külön alternatíva a `planningTargetLengthMm / 1000` explicit `linear_meter` érték, amelyben a tartalék benne van. Egy futáshoz legfeljebb egy mennyiségi forma választható. Ismeretlen kapcsolatnál a darabszám `null` marad, és a jelölt csak az explicit ismert tervezési hossz lehet; ez sem végleges beszerzési mennyiség. Kézi komponens — ha van — külön `piece` jelölt.

A mapping aktív, műhelytulajdonú `flashing` vagy `sheet_metal` terméket és pontosan egyező egységet igényel. A felhasználó választ, a rendszer nem következtet terméknévből profilra. A sematikus SVG a mentett geometriai/hosszadatokat, szükséges fedést, tartalékot, kiterjesztéseket, ismert szálhatárokat, explicit átfedést és forrásrevíziókat ábrázolja. Ismeretlen kapcsolati szabályhoz nem rajzol becsült határt; tetőtopológiát, keresztmetszetet és szerelést nem mutat. A dimenziók a mentett mm-s snapshotból készülnek.
