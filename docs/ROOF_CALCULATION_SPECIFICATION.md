# F9.33–F9.34 — Tetőszámítási specifikáció és bizonyítéki mátrix

**Állapot:** `PARTIAL` — az F9.33 közös geometriai eredményréteg elkészült és fókuszáltan ellenőrzött. Az F9.34 audit és hétformás edge-egyediség teszt PASS; a standalone mind a hét típusára kiterjedő felület nincs, mert a suite-ben nincs általános tetőforma-választó, az aszimmetrikus/összetett modellek és a teljes mobil-elfogadás pedig nincs igazolva.
**Dátum:** 2026-10-17
**Hatókör:** a meglévő `calculateRoofGeometry` eredményeinek újrahasznosítása a felmérésben és az önálló kalkulátorokban. Ez nem új geometriamotort, anyagkimutatást, statikai számítást vagy mentési folyamatot jelent.

## Besorolások

- `VERIFIED_EXISTING`: korábbi domainmotor és független fixture már ellenőrizte a számítási scope-ot.
- `VERIFIABLE_NEW`: meglévő, ellenőrzött csúcspontokból/élekből levezetett új kimenet; saját, külön felírt numerikus ellenőrzést igényel.
- `REQUIRES_ADDITIONAL_INPUT`: a jelenlegi tetőméretek önmagukban nem határozzák meg; minden szükséges adatot külön kell bekérni.
- `UNSUPPORTED`: nincs igazolt képlet, adatmodell vagy gyártói információ a kimenethez.
- `STRUCTURAL_DESIGN_REQUIRED`: statikai, szerkezeti, szabályozási vagy gyártási tervezés szükséges; geometriai becslés nem helyettesíti.

Az `m`, `mm`, `m²`, `°` és `%` mindig kifejezett egység. Az elérhetetlen érték típusos `unavailable` állapotot és magyarázatot kap; hiányzó élhez nem írunk `0 m`-t. A jelenlegi geometriai összegző legfeljebb 3 tizedest mutat, számítás közben nem kerekít.

## Geometriai eredmények

| Magyar név / domain azonosító | Gyakorlati cél | Alkalmazható tetőforma | Bemenetek és módszer | Egység; motor és független ellenőrzés | Besorolás, megjelenítési hely és korlát |
|---|---|---|---|---|---|
| Teljes ferde tetőfelület / `totalArea` | Tetősíkok geometriai összterülete; felmérési és előzetes felület-összehasonlítás | Mind a hét, ha a meglévő motor érvényes kimenetet ad | Az egyes poligonok csúcsaiból képzett `areaMm2` összege; nem alaprajzi terület | `m²`; `calculateRoofGeometry`; hét DEMO mérnöki fixture területképlete és projekciója | `VERIFIED_EXISTING`; Survey elsődleges eredmény, standalone három közös forma; ez nem rendelési mennyiség |
| Tetősík geometriai felülete / `plane.area` | Egy tetősík vagy azonos irányú, motor által részletekre bontott síkcsoport felületének áttekintése | Mind a hét | Patch-területek összege a motor felületazonosítója szerint | `m²`; közös geometria, `summarizeRoofGeometry`; részösszeg és teljes összeg egyezése a hét referencián | `VERIFIED_EXISTING`; Survey és standalone részletek; L/T esetén a csoport nem állítja, hogy egyetlen összefüggő poligon |
| Vízszintes vetületi terület / `projectedArea` | Épület-/tetőalaprajzi terület geometriájának összevetése | Mind a hét | A motor `projectedAreaMm2` kimenetének összege | `m²`; `calculateRoofGeometry`; független alaprajzi befoglaló/összeg fixture-ek (L/T esetén 10×6 + 4×5 = 80 m²) | `VERIFIED_EXISTING`; Survey és standalone részletek; nem eresz-, csatorna- vagy anyagterület |
| Tetőhajlás fokban / `pitchDegrees` | Hajlásszög áttekintése | Mind a hét jelenlegi azonos hajlású modellel | A síkcsúcsokból illesztett `z=ax+by+c` gradiens; `atan(√(a²+b²))` | `°`; `planeGradient` a megosztott összegzőben; független 45° fixture és trigonometrikus ellenőrzés | `VERIFIABLE_NEW`; Survey és standalone elsődleges érték; eltérő síkhajlásnál össztető-szög helyett csak síkonkénti érték |
| Hajlás százalékban / `pitchPercent` | Lejtés százalékos munkajelölése | Mind a hét | `tan(α)×100`; ugyanaz a hajlásirány, amelyből a fokérték származik | `%`; `summarizeRoofGeometry`; a fixture fokértékéből független trigonometrikus átváltás | `VERIFIABLE_NEW`; a fokérték alatt jelenik meg, nem külön mezőként |
| Tetősík vízszintes futása / `slopeRun` | Egy csoport hajlásirányú vízszintes kiterjedésének becslése | Mind a hét, ha a csoport csúcspontjaiból egyértelmű a lejtés | Vetületi koordináták szélsőértéke a gradiens irányában | `m`; `summarizeRoofGeometry`; gable 3 500 mm-es futás külön fixture | `VERIFIABLE_NEW`; tetősík részlete; összetett síkcsoportnál szélsőpontok közötti kiterjedés, nem kiosztott szarufa |
| Ferde hajlásirányú méret / `slopeLength` | Ferde síkhossz tájékoztató geometriai mérete | Mind a hét, azonos síkcsoporton belüli hajlásnál | `run×√(1+a²+b²)` a pontokból illesztett gradienssel | `m`; `summarizeRoofGeometry`; gable fixture-ben `√(3500²+3500²)` | `VERIFIABLE_NEW`; részletek; **nem egyedi, felfekvésre/kimetszésre kész szarufahossz** |
| Ereszélek összege / `eaveLength` | Valósított ereszélek hosszának összesítése | Mind a hét | `kind=eave` minősítésű élhosszak összege | `m`; `calculateRoofGeometry`; mind a hét fixture, explicit túlnyúlásos gable eset | `VERIFIED_EXISTING`; Survey és standalone elsődleges érték, ahol van ereszél |
| Magas oldali él összege / `upperLength` | Félnyeregtető felső határélének áttekintése | Félnyereg | `kind=upper` élek összege | `m`; közös motor és `upper` fixture | `VERIFIED_EXISTING`; csak létező élre jelenik meg |
| Gerinchossz / `ridgeLength` | Tetőgerinc tényleges szakaszainak összes hossza | Nyereg, konty, félkonty, L/T; nem sátortető | `kind=ridge` élek összege; nem következtetünk a befoglaló épülethosszból | `m`; közös motor és független alapesetek: nyereg 10 m, konty 4 m, sátor nincs | `VERIFIED_EXISTING`; Survey és standalone elsődleges, ha van. Sátortetőn `unavailable` |
| Oromélek összege / `rakeLength` | Ferdevonalú orom-/tetőszéli szakaszok áttekintése | Nyereg, félnyereg, félkonty és a motorban így osztályozott határok | `kind=rake` élek összege | `m`; közös motor, analitikus élvektor-fixture | `VERIFIED_EXISTING`; részletek; a jelentés az engine élosztályát követi |
| Kontyélek összege / `hipLength` | Kontyélek tényleges hosszának áttekintése | Konty, sátor, félkonty | `kind=hip` élek összege | `m`; közös motor, 10×6 m / 45° kontynál négy `√(3²+3²+3²)` él | `VERIFIED_EXISTING`; Survey és standalone elsődleges, ahol van |
| Vápák összege / `valleyLength` | Belső tetőmetszés vápavonalainak áttekintése | L/T | `kind=valley` élek összege | `m`; közös motor, L/T fixture: két `√(2²+2²+2²)` m vápa | `VERIFIED_EXISTING`; Survey elsődleges és részletes bontás. Nem jelent vízelvezetési méretezést |
| Egyedi él / `edgeSegments` | Gerinc-, eresz-, konty-, vápa- és egyéb szakaszt a rajzi/modellezett éllel összepárosítani | Mind a hét | A motor konkrét élazonosítója, kategóriája, két végpontja és szomszédos síkazonosítói | `m`; a `RoofGeometry.edges` változatlan méretértékei; drawing ID-egyezés teszt | `VERIFIED_EXISTING`; részletes bontás és SVG; csak a meglévő él-osztályozást jeleníti meg |
| Síkonkénti kerület / `plane.perimeter` | Az azonosított síkcsoport határ-élszakaszainak összege | Mind a hét | A síkcsoporthoz kapcsolt motorélek hossza | `m`; `summarizeRoofGeometry`; élkapcsolatok visszaellenőrzése a fixture-ben | `VERIFIABLE_NEW`; részletek; L/T összetett vagy patch-elt síkcsoportnál csak az engine szomszédsági topológiájára érvényes |

### Geometriai bemeneti határ tetőformánként

| Forma | Meglévő bemenetmodell | Igazolt geometriai határ |
|---|---|---|
| Nyeregtető | Épülethossz, szélesség, vagy emelkedés vagy hajlás, eresz- és külön első/hátsó oromtúlnyúlás | Hosszában különböző oromtúlnyúlást kezel; két tetőoldal azonos keresztmetszeti hajlása. Aszimmetrikus gerinceltolást/oldalhajlást nem kezel |
| Félnyeregtető | Hossz, szélesség, fok, opcionálisan nullától eltérő egységes ereszmodell nélkül | Egy sík; nincs túlnyúlás-bemenet |
| Kontytető | Hossz>szélesség, közös fok | Szimmetrikus alapmodell, egy hajlás és túlnyúlás nélkül |
| Sátortető | Négyzetes oldalhossz, közös fok | Négy azonos lejtésű háromszögsík |
| Félkonty | Hossz>szélesség, közös fok és félkonty alsó élmagassága | Sémával érvényesített, szimmetrikus modell; nincs külön oldali eltolás/túlnyúlás |
| L-alakú tető | Főhossz/szélesség, közös fok, szárnyszélesség és kinyúlás | Rögzített csatlakozási hely és azonos hajlás; tetszőleges L-poligon/eltolt csatlakozás nincs |
| T-alakú tető | Főhossz/szélesség, közös fok, középre helyezett szárnyszélesség és kinyúlás | Középre helyezett, azonos hajlású szárny; tetszőleges eltolás/nem ortogonális csatlakozás nincs |

A geometriai séma csak egész mm méreteket és `0° < pitch < 80°` értéket fogad. Lehetetlen vagy hiányos inputnál a séma, illetve a Survey adapter nem ad számítható geometriát; csonka, érvénytelen geometriából nem készül eredmény.

## Faanyag, lécezés és szerkezet

| Magyar név / domain azonosító | Szükséges további input | Módszer és egység | Motor / független verifikáció | Besorolás és korlát |
|---|---|---|---|---|
| Szarufakiosztás és darabszám / `rafterLayout` | Egyes tetősík szélessége/hossza, osztástávolság, szélső oszlop szabálya, nyílások/kihagyások és kiosztási irány | Pozíciók és egyenes szakaszok megszámolása; `db`, `mm` | Nincs közös, héttípusú elhelyezési motor; független végpont/darabszám fixture-ek szükségesek | `REQUIRES_ADDITIONAL_INPUT`; nem következtetünk a tetőterületből |
| Egyedi szarufa vágási hossza / `rafterCutLength` | Konkrét két végpont, felfekvés, ereszkiülés, gerincülék, madárszáj/kivágás, faanyag méret és fűrészelési konvenció | Egyenes geometriai középvonal lehet Pitagorasszal, de vágott elemhosszhoz a csomópontok is kellenek; `mm` | `calculateRafterGeometry` csak megadott félfutás/emelkedés/ereszkiülés geometriai hosszát adja; 3–4–5 fixture | `REQUIRES_ADDITIONAL_INPUT`; current full plane `slopeLength` nem cserélhető ki egyedi vágási hosszra |
| Szarufafa térfogata / `rafterTimberVolume` | Darabszám, elemhossz, keresztmetszet, toldás/levágás/kihozatal | `db×hossz×szélesség×vastagság`; `m³` | Nincs roof-type takeoff; nincs megfelelő kitárolási fixture | `REQUIRES_ADDITIONAL_INPUT`; rendelési veszteség és minőségi válogatás nélkül is csak geometriai térfogat lehet |
| Lécezési sorok / `battenRows` | Sík menti kezdő/záró távolság, sorosztás, termék/rögzítési szabály, áttörések | Szabályos kiosztásnál egész intervallumok és explicit végi szabály; `sor` | Nincs motor; sor/osztás boundary fixture szükséges | `REQUIRES_ADDITIONAL_INPUT`; gyártói termék-/telepítési szabály nélkül nem becsülhető |
| Összes léc hossz és térfogat / `battenLength`, `battenVolume` | Sorok, síkonkénti tényleges eresz-/gerincszakasz, léc keresztmetszet, toldási és veszteségi szabály | Minden kiosztási szakasz összege; térfogat = összhossz × keresztmetszet; `m`, `m³` | Nincs motor vagy független takeoff fixture | `REQUIRES_ADDITIONAL_INPUT`; nincs darab vagy volumen area × feltételezett osztásból |
| Szerkezeti teherbírás / `structuralCapacity` | Teher-, anyag-, támasz-, kapcsolati, stabilitási, környezeti és szabványos tervezési adatok, felelős tervező | Nem vezethető le pusztán tetőgeometriából | Nincs statikai motor vagy szabályzati audit | `STRUCTURAL_DESIGN_REQUIRED`; kimenet és megfelelőségi állítás nincs |

## Fedés, alátét és rögzítők

| Magyar név / domain azonosító | Szükséges további input | Módszer és egység | Besorolás, hely és korlát |
|---|---|---|---|
| Bruttó geometriai fedendő felület / `grossCoveringArea` | Meglévő érvényes tetőgeometria | A `totalArea`; `m²` | `VERIFIED_EXISTING`; minden elérhető tetőformánál, Survey/Advanced részletben. Nem átfedéses hasznos anyagterület |
| Alátét szükséglet / `underlayRequirement` | Tekercsszélesség, hasznos fedési szélesség, oldal-/végtoldás, irány, leterítés, áttörések és terméktípus | Síkosztásonként kiosztás; anyag/fedési méret; `m²` vagy tekercs | `REQUIRES_ADDITIONAL_INPUT`; az átfedés gyártói előírása kell, nincs területből vásárlási darab |
| Gyártói átfedés / `manufacturerOverlap` | Konkrét gyártó, terméknév, profil, útmutató verziója és lejtés/támasz feltételei | Gyártói dokumentum adatának snapshotja; `mm` | `REQUIRES_ADDITIONAL_INPUT`; termékspecifikus adatot nem találunk ki |
| Lemez hasznos mérete és kiosztása / `sheetLayout` | Fizikai és hasznos szélesség/hossz, max. egy darab hossz, toldási és vágási elvek, síkonkénti határ | Sáv-/lemezhelyezés poligonon; darab csak pontos kiosztásból | `REQUIRES_ADDITIONAL_INPUT`; meglévő gable metal-tile motor szűk, egyenes, toldás nélküli esethez kér explicit termékadatot |
| Lemez/vágott elemek száma és rendelési mennyiség / `sheetCount`, `purchaseQuantity` | Kiosztási geometria, átfedés, vágási terv, gyártói korlát, gyártási hossz, sérülés/veszteség szabály | Egész elem darabszáma csak tényleges elhelyezési terv alapján; m²-ből nem szabad `ceil` becslés | `REQUIRES_ADDITIONAL_INPUT`; jelen scope-ban nincs több soros, vápás vagy L/T anyagkiosztás |
| Rögzítők / `fastenerQuantity` | Rögzítendő termék, gyártói kiosztás, szélzóna, szélsáv/perem, faalap, terhelés, lejtés és konkrét geometriai elhelyezés | Kiosztási pontok megszámlálása | `REQUIRES_ADDITIONAL_INPUT`; terület × feltételezett sűrűség és Zhitov területi példa nem igazol darabszámot |

## Részletezés és szerkezeti kimenetek

| Eredmény | Magyar megjelenített név | Bemenet/módszer | Besorolás |
|---|---|---|---|
| Vágási szög / `rafterCutAngles` | Szarufavágás geometriai szöge | Megadott run/rise esetén `atan2`; a vágósík helye, fűrészbeállítás és anyagkeresztmetszet külön szükséges | `REQUIRES_ADDITIONAL_INPUT` |
| Tartó/rács tagméret / `trussMemberDimensions` | Rácsostartó elemméret | Csomóponti rendszer, fa/anyag, kapcsolatok, keresztmetszet, gyártási és terhelési adat kell | `STRUCTURAL_DESIGN_REQUIRED` |
| Szerelési/csomóponti részlet / `constructionDetail` | Csomóponti részletrajz | Anyag, rétegrend, szerelési hézag, felfekvés, rögzítés, kivitelezési szabály és helyszíni adat kell | `UNSUPPORTED` a jelenlegi geometriában; teherbírás/megfelelőség esetén `STRUCTURAL_DESIGN_REQUIRED` |
| Meglévő különálló manzárd geometria / `calculateMansardGeometry` | Két szakasz ferde hossza és geometriai felülete | Alsó/felső futás és emelkedés külön, szimmetrikus két szakaszú keresztmetszet; `m`, `m²` | `VERIFIED_EXISTING` a szűkített saját standalone motorra; nincs bekötve a hétformás közös summary/drawing motorba, és nem teljes Zhitov-egyenérték |
| Egyszerű háromszög rács burkológeometriája / `calculateTriangularTrussGeometry` | Felső öv geometriai hossza és osztási pontok | Fesztáv, gerincmagasság, osztás; fél fesztáv + emelkedés Pitagorasza | `VERIFIED_EXISTING` kizárólag a burkológeometriára; belső rács, vágás, kapcsolatok és statika nincs |

## Felülethez rendelés

- **Felmérés:** mind a hét meglévő `roofType` érvényes mérései után automatikusan, külön számítási gomb nélkül jelenik meg a közös motor rajza és a 4–6 elsődleges eredmény; az alapértelmezett nyeregmodellnél a már meglévő gable előnézeti rajz marad. A `RoofGeometryResults` összecsukható tetősík-, él- és anyagkorlát-részleteket ad, és külön jelzi a felmért inputot / számított kimenetet.
- **Önálló `/kalkulatorok`:** a 33 ref-es katalógusból a nyeregtető, félnyereg és kontytető használja a közös geometriát és ezt az eredményréteget. A külön szarufa, manzárd és háromszögű tartó marad saját, szűkített motorján; sátor, félkonty, L és T jelenleg nincs itt bekötve. A kalkulátor nem hoz létre projekt-, ügyfél-, felmérés-, anyaglista-, munkanapló- vagy ajánlatrekordot.
- **Rajz:** `createRoofDrawingModel` a számított geometriából veszi a poligon/él ID-ket. Patch-elt síkok azonos felületcsoporttal és részlet-számmal jelennek meg; a patch-közti belső mozaikvonal nem kap tetősík-körvonalat. A dimenziók, síkfelületek és élazonosítók ugyanazt a geometry outputot használják.
- **Tartós adat:** új DB-séma, calculation record vagy mentési művelet nincs. A Survey a méréseket és meglévő immutable revízióit használja; a geometriai output mindig az aktuális inputból újraszámolható. Korábbi snapshotot ez a feladat nem ír át.

## Zhitov referencia-felderítés

Az alábbi oldalak csak a mezők, kimenettípusok, rajzok, használati célok és a saját korlátaik feltárására szolgáltak; képletet, kódot vagy rajzot nem vettünk át. Nem követelmény a teljes Zhitov-paritás.

> **Felülírva.** A „nem követelmény a teljes Zhitov-paritás" kitétel és az alábbi § F9.34 „nincs általános tetőforma-választó" döntése felhasználói utasításra megszűnt. Az új szerződés: [ZHITOV_PARITY_REDESIGN.md](ZHITOV_PARITY_REDESIGN.md). A képletátvétel korlátja marad: ott § 5 sorolja fel tételesen, mit nem veszünk át és miért.

| Oldal | Bemenet/kimenet és használati megfigyelés | Megbízhatósági határ |
|---|---|---|
| [Rafter](https://www.zhitov.com/en/roof/) | X/Y/C/Z/B: félfesztáv/futás, emelkedés, túlnyúlás, kivágási távolság és szarufaszélesség; ferde hossz, szög és szarufarajz | A látható mezők nem adnak teljes támasz-/kivágási vagy statikai tervet |
| [Gable](https://www.zhitov.com/en/roof2/) | X/Y/C/B és opcionális tetőrész; szarufa/lécosztás és lemezméret/átfedés módok; felület, anyag/elem, rajz | A súgó jelzi, hogy területből számolt lap darab sor- és vágásgeometriánál tört/eltérő lehet, illetve a vágott fa volumenéből nem feltétlenül vonja le az oldalsó háromszöget; termékadat/veszteség külön feladat |
| [Single pitch](https://www.zhitov.com/en/roof3/) | X/Y/C/B és szarufa/léc/lemezes paraméterek; tetőfelület és oldalrajz | Area-only sheet estimate nem termékkiosztás; érvényes átfedés és hulladék nincs általánosítható |
| [Mansard](https://www.zhitov.com/en/roof4/) | Y/Y2/X/C/B és opcionális szarufa/léc/adat; kettős szakaszú forma, terület, fél-/teljes eredmény és rajz | Saját mezőértelmezés nem helyettesíti a TetőPro által külön bekért szakaszfutást/emelkedést |
| [Hip](https://www.zhitov.com/en/hip_roof/) | Gerincmagasság, tervhossz/szélesség, eresz és szarufa/léc keresztmetszet/osztás; konty-/élrészletek | Az egyenlő hajlású, szimmetrikus TetőPro alapeset nem az összes lehetséges kontytető |
| [Wooden truss](https://www.zhitov.com/en/wooden_truss/) | Fesztáv, magasság, gerenda, álló/merevítő és darabszámozás; háromszög tartó váz/anyaglista | A vázlatos taggeometria nem statikai, kapcsolat- vagy gyártási igazolás |
| [Plate fasteners](https://www.zhitov.com/en/plate_fasteners/) | Lemezméret, soros és peremkiosztás, felület; rögzítőmennyiség és rajz | Valós kiosztás gyártó-, terhelés-, alap- és szélzóna-függő; területi darab nem igazolható |

A referenciák méretbemenetei hossz-egységben szerepelnek; a lejtés/vágás szögben, a felület négyzetes egységben, a térfogat köbös egységben jelenik meg. A TetőPro táblákban minden kimeneti egységet külön feltüntetünk, a numerikus motort pedig egész mm belső geometriára normalizáljuk. A harmadik fél oldalain a tényleges hosszegység a saját mértékegység-beállítástól függ.

Példa eredményoldalak a félnyereg, nyeregtető, manzárd és konty számológépeknél böngészhetők voltak. Ezek felhasználói felületi minták, nem matematikai referenciák. A szarufa, rács és rögzítő dinamikus példái nem voltak minden futásnál hozzáférhetők; Zhitov numerikus egyezésvizsgálat nem történt.

## Független ellenőrzés és vállalt korlátok

- A hét `ROOF_ENGINEERING_REFERENCES` fixture a teljes felületet, vízszintes vetületet, hajlást és élosztály-hosszakat a production függvények meghívása nélkül rögzíti; a levezetések kézzel felírt síkterület- és élvektor-számítások.
- Az új run/slope output gable túlnyúlásos ellenőrzése `run=3500 mm`, `slope=√(3500²+3500²)`; a percent érték `tan(α)×100`. Tolerancia: a tesztek a kimeneti m²-t 9 tizedes, fokot 9, %-ot 8, élhosszt 8 tizedes közelségre hasonlítják; a meglévő geometry audit külön toleranciái `1e-6 mm`, `1e-3 mm²`, relatív `1e-10`.
- A Survey/standalone közös eredményegyenlősége hat nem-gable engineering fixture-en tesztelt; a Survey gable bemenet külön gable preview adaptert használ.
- Az input/geometry output schema és meglévő audit lefedi a pozitív egész mm méretet, pitch `0–80°` belső tartományát, impossible geometryt, topológiai peremeket és L/T átfedést. E feladat nem bővíti a geometry scope-ot aszimmetriára, eltérő lejtésre vagy túlnyúlásra.
- Run/slope/perimeter új összegzőknek független analitikus ellenőrzése csak base roof fixture-ekre és gable túlnyúlásra van; minden lehetséges összetett/túlnyúló forma, arbitrary polygon, nyílás, nem ortogonális/intersecting roof és szakaszonként eltérő pitch nincs igazolva.
- Új summary nem kerül adatbázisba; történeti Survey snapshot, mentett calculation, szervezeti határ és jogosultság nem változik. DB/RLS/concurrency teszt ehhez a tisztán megjelenítő/domain-levezető változáshoz nem releváns.
- Kézi, billentyűzetes, screen-readeres, csökkentett mozgású és fizikai mobil-touch/böngésző-layout tesztet nem szabad unit tesztből levezetni. A tényleges helyi autentikált smoke csak futtatott browser workflow alapján igazolható.

## F9.34 — Lefedettség és felületi alkalmazhatóság

A /kalkulatorok konstrukciós katalógusában 33 bejegyzés van; ebből hat tető/faszerkezet. A nyeregtető, félnyeregtető és kontytető általános geometriája használja a közös eredménypanelt. A sátor, félkonty, L és T a Survey meglévő tetőforma-választójában érhető el. A standalone suite nem tartalmaz általános tetőforma-választót, ezért a hét forma megjelenítéséhez nem keletkezett új vagy duplikált kalkulátor-bejegyzés. A szarufa, manzárd és háromszögű faszerkezet külön célú, inputú és motorú kalkulátor. A gable cserepeslemez-kimenet külön, termékparaméteres számítás; nem területből becsült anyagkihozatal.

A közös eredmény és standalone műszaki rajz ugyanazt a validált RoofGeometry objektumot használja. A motor a patch-éleket végpont szerint szétvágja és kulcsonként egyesíti; a koplanáris, azonos forrássíkhoz tartozó belső patch-határt elhagyja. A tényleges gerinc/hip/vápa szakaszt egyszer adja vissza, két szomszédos síkkal. Az F9.34 audit hét alapeseten ellenőrzi a geometriai végpontpárok egyediségét és a deklarált szomszédos síkok polygonhatárát. Ez élgeometria, nem anyagkiosztás.

## F9.35 — Követelmények: szarufák, lécek és faanyag-mennyiségek

**Állapot:** IMPLEMENTÁLVA, F9.35.1 matematikai és persistence ellenőrzéssel stabilizálva; teljes projektszintű Vitest és fizikai mobil/a11y nincs igazolva. A közös tiszta kiosztómotor, Survey panel, standalone gable/shed/hip felületek, rajzi réteg és Survey-snapshot mező elkészült. Az ellenőrzési adatokat és a helyi migrációs állapotot a `docs/TEST_MATRIX.md` rögzíti.

### Hatókör és kötelező inputok

- A cél geometriai elhelyezés és összesítés mind a hét meglévő RoofGeometry formán: nyereg, félnyereg, konty, sátor, félkonty, L és T. A számítás síkonként és síkpoligononként működjön; L/T különálló patch-ei maradjanak elkülönítve.
- A manzárd, önálló szarufahossz-kalkulátor és rácsostartó maradjon külön scope-ban; adapterhez új geometriai szerződés és fixture kell.
- Aszimmetria, eltérő hajlás, általános L/T eltolás, tetszőleges polygon és nyílás nincs a jelenlegi input-sémában; ezekre a motor ne inferáljon geometriát.

| Bemenet | Követelmény |
|---|---|
| Elemcsalád | Szarufa vagy léc; külön kiosztás és eredmény |
| Tengelytávolság | Felhasználó által megadott pozitív egész mm; alapérték nem feltételezhető |
| Kiosztási tengely és irány | Tetősíkhoz kötött. Szarufa eresz–gerinc irányú, pozíciója a tetőhosszon; léc eresz irányú, sorpozíciója a lejtős futáson |
| Kezdő/záró peremsáv | Mindkét kiosztási tengelyen explicit; az osztás pontos vagy legnagyobb érték szemantikája kötelező |
| Végpontszabály | Polygonhatárig tartó geometriai vég vagy felhasználói visszahúzás mm-ben; gyártási levonás nélkül |
| Keresztmetszet | Térfogatkéréshez explicit szélesség × magasság mm-ben; katalógusméret nem következtethető |
| Darabolási adatok | Vásárlási darabszámhoz stock length, toldás/illesztés, vágásrés és maradékszabály; ezek nélkül csak geometriai vonalhossz és névleges térfogat adható |
| Nyílás/kihagyás | Csak explicit síkhoz kötött mm-koordinátás polygonból. Más esetben input elutasítás vagy unsupported állapot. |

Nincs automatikus veszteség, faanyagminőség, termék, rögzítés vagy terhelés. Szarufavég, madárszáj, gerincülék, eresztúlnyúlás és felfekvés külön csomóponti specifikáció nélkül nem számítható.

### Geometriai módszer és eredmény

1. A sík koordinátarendszer az adott polygonból, lejtésből és eresz-/gerinc-élirányból eredjen; azonos globális X/Y irány nem feltételezhető minden formán.
2. Explicit kezdő és záró hely között az egyenletes pozíció xᵢ = x₀ + i·s. Legnagyobb osztásnál n = ceil((x₁−x₀)/s_max), a tényleges osztás s = (x₁−x₀)/n. Pontos osztásnál az utolsó peremsávot validálni kell.
3. Szarufánál a tengelyvonal és tetősík-polygon metszete adja a szakaszokat. Teljes téglalap-síkon a geometriai hossza √(run² + rise²); általános polygonon a levágott 3D szakaszok hosszösszege mérvadó.
4. Léceknél a sorvonal a síkpoligonnal metszendő. A sor hossza a kapott 3D szakaszok összege; a hip/vápa/síkhatár csak valós polygonkontúrból következhet.
5. Lineáris igény: a szakaszhosszak összege mm-ben és méterben. Névleges faanyag-térfogat: Σ(lengthMm × widthMm × heightMm) / 10⁹ m³, explicit keresztmetszettel. Toldás, vágási veszteség és rendelési ráhagyás nem része.
6. A geometriai vonalak egyetlen kiosztási pozícióból származzanak. Az azonos határszegmens geometriai összesítésben nem számolható kétszer; ebből a fizikai elem tagolása nem vezethető le, és fizikai darabszám nem becsülhető területből vagy kerületből.

Kimenetek: kiosztási hely és geometriai tengely/vonal szám (mm, db); geometriai szegmensek/összhossz (mm, m); explicit keresztmetszet (mm²); névleges geometriai térfogat (m³); validáció, provenance és kiosztási konvenció. A db geometriai egyedi vonal, nem fizikai faelem-darabszám és nem vásárolható csomag.

### Validáció és független fixture-ek

- Pozitív egész mm méretek, meglévő pitch/footprint-séma, explicit peremsáv, egyértelmű tengely és pontos/maximális osztásmód. Kétértelmű inputnál nincs mennyiségi eredmény.
- Mind a hét formához külön DEMO jelölt fixture: pontosan osztható és maradékos kiosztás, kézzel rögzített pozíciók, metszetszakaszok, darabszám és összhossz.
- Téglalap alapeset: pitch = emelkedés/futás; szarufa √(run²+rise²); lécsor teljes szélességű. Konty/sátor/félkonty tesztelje a hiphatárig vágást; L/T ellenőrizze a külön main/wing polygonokat és a vápa menti kettős számolás hiányát.
- Negatív esetek: hiányzó peremsáv, nulla/negatív osztás, túl széles perem, nullhosszú vagy duplikált szegmens, térfogatkérés keresztmetszet nélkül, nem támogatott nyílás.
- Az F9.34 roof geometry, rajzazonosság és Survey regressziót az új kiosztási tesztek után újra futtatni kell.

### Szerkezeti korlát

Az eredmények geometriai elhelyezést, vonalhosszt és névleges keresztmetszeti térfogatot írhatnak le. Nem igazolják a teherbírást, kihajlást, lehajlást, kapcsolatot/rögzítést, faanyag-osztályt, üzemi tényezőt, szél-/hó-/hasznos terhet, szabványi megfelelést vagy gyárthatóságot. Ehhez külön, felelős tervező által meghatározott és validált statikai folyamat kell; szakmai/gyártói alapérték nem tölthető be a felhasználó helyett.

### F9.35 — megvalósítási és bizonyítéki állapot

- `src/domain/calculations/roof-timber-layout.ts` a már validált `RoofGeometry` sík-polygonjait használja. A lejtésgradiensből helyi eave–ridge és eave-párhuzamos tengelyt rekonstruál, a maximum osztást egyenletesen felosztja, majd a helyeket az egyes sík-polygonokkal metszi. A léc osztása és peremsávja a tetősíkon mért ferde távolságban értendő; a szarufa a vízszintes eresz-tengelyen helyezkedik el. A koplanáris patch-vonalak egyesülnek, az azonos térbeli gerinc-/határszakasz egyszer számítódik.
- Csak teljesen megadott pozitív egész mm tengelytáv és nemnegatív egész mm kezdő/záró visszahúzás ad mennyiségi kimenetet. A megadott tengelytáv maximum; a tényleges távolság egyenletesen oszlik. A 2 000 kiosztási tengely feletti bemenet `unavailable` eredményt kap a túlméretes rajzi/kimeneti lista miatt.
- A keresztmetszet teljesen opcionális; térfogat kizárólag a szélesség és magasság együttes megadásakor jelenik meg. Darabolási/rendelési darabszám nincs.
- A motor mind a hét meglévő formára a síkpoligonokat használja. Analitikus szarufa-hossz ellenőrzés mind a hét formára készült. L/T DEMO fixture-ek: szarufahossz `40 500√2 mm` (L) és `40 000√2 mm` (T), léc-vonalhossz mindkettőn `142 200 mm`; az oracle a kézzel levezetett 45°-os metszetszakaszok összege, nem a kiosztófüggvényből származik.
- A Survey `roofTimberParameters` optional adatot az immutable section snapshot részeként validálja. Az additív migration a meglévő `private.valid_field_survey_sections` allowlistet bővíti; mentett rekordot, táblastruktúrát, revision writer/RLS jogosultságot nem ír át. A számítási eredmény snapshotban nem duplikálódik, a beolvasott paraméterekből újraszámolódik.
- A rajz a számítás szakaszait adja át az új „Szarufa- és lécekiosztás” rétegnek; a réteg neve és hozzáférhető kísérőszövege jelzi, hogy sematikus geometriai mennyiséget mutat, nem kivitelezési rajz. A meglévő viewport/pan/zoom állapota a kiosztási input frissítésekor megmarad.
- A Survey és standalone gable/shed/hip panelek a közös domain függvényt használják. A rafter, mansard és truss special-purpose kalkulátorok nem változtak, új katalógusbejegyzés nincs.

## F9.35.1 — minősítési állapotok és újraellenőrzés

- **VERIFIED GEOMETRIC QUANTITY:** a validált polygonokkal metszett geometriai tengelyek/vonalak és 3D mm-hosszuk, explicit peremsáv és egyenletes elosztási konvenció mellett.
- **ASSUMPTION-BASED ESTIMATE:** az egyenletes újraosztás a felhasználó max-távolságához és peremsávjaihoz kötött explicit matematikai konvenció. A motor nem állít ebből szakmai kiosztási ajánlást vagy fizikai kihozatalt.
- **UNSUPPORTED PHYSICAL LAYOUT:** nincs támasz-, rögzítés-, toldás-, csomópont-, nyílás- vagy vágásmodell. A közös gerincvonal egyszer számolható a geometriai vonalhosszban, de a fizikai batten folytonossága/tagolása nem ismert; a fizikai kiosztás ezért nem igazolt.
- A történeti Survey nézet a konkrét immutable section snapshot beállításait és az azokból azonos domain motorral újraszámolt mennyiségeket/rajzi overlayt mutatja.
- L/T számszerű kézi oracle, offsetsávok és egységek: `docs/CALCULATOR_MATH_VERIFICATION.md`; célzott teszt, Auth/RLS, lokális migráció és authenticated browser V1/V2 save/reopen állapot: `docs/TEST_MATRIX.md`.


## F9.36.1 — Alátétfólia mennyiségi alap és fedési paraméterszerződés

### Állapot és újrafelhasználás

- A már ellenőrzött `RoofGeometry` síkpoligonjai a Survey és az önálló `roof.gable`, `roof.shed`, `roof.hip` kalkulátor bemenetei. Mindkét UI a `calculateRoofUnderlayLayout` tiszta domain motort hívja; saját paraméterállapotuk külön marad.
- A gable trapézlemez (`gable-trapezoidal-covering`), cserepeslemez (`gable-metal-tile-covering`) és gable geometriai strip layout (`metal-sheet-layout`) marad a saját validált szerződésén. Ezek képlete nem duplikálódott és nem lett általános tetőmotorba átírva.
- Az új `roofCoveringProductParametersSchema` a tekercs és táblás fedés közös, szigorú termékadat-alapja. Kötelező `form`, opcionális explicit névleges/hasznos szélesség, fizikai/használható hossz, átfedések, irány, minimum/maximum hossz, szélességi/hosszanti vághatóság és hivatkozás kezelhető. Hiányzó adat nem kap szakmai alapértéket. Az alátétmotor ehhez validálja a megadott tekercsadatok normalizált részét. A meglévő sheet-termékmotorok automatikus átkötése nem része ennek a fázisnak.

### Alátét bemenet és képlet

`roofUnderlayParametersSchema`: tekercsszélesség és -hossz egész mm-ben; oldalátfedés és végtoldás egész mm-ben (a nulla is explicit adat); eresz–gerinc vagy gerinc–eresz telepítési irány. Hiány esetén `INCOMPLETE`, hibás méret/átfedés esetén `INVALID`. Nettó tetőfelület továbbra is megjeleníthető, ha a fóliaadat hiányos.

Síkpolygononként az engine 3D tetősíkból lejtő- és eresz-párhuzamos ortonormált helyi koordinátát állít elő, majd a polygon lejtőtengelyét tekercsszélességű sávokra vágja. A sorok eltolása `rollWidth − sideOverlap`; az első sor a választott fektetési irány szerinti peremről indul. A vágási hossz az adott sáv ereszirányú befoglaló hossza. A lap-polygonokat ugyanebből a sávból és a sorpárok metszetéből származtatja a motor. Hosszanti toldásnál az előretolás `rollLength − endOverlap`; `N` darabnál az utolsó vágás `cutLength − (N−1)×(rollLength−endOverlap)`, amely a kezdő toldást már magában foglalja. Minden koordináta/hossz mm, terület mm²; a UI m/m²-re vált.

A bruttó vágott felület a teljes szélességű blankok `rollWidth × cutLength` összege. A tekercsdarabszám kizárólag a blankhosszak tekercshosszon belüli, pontos korlátos 1D bin-packing minimuma lehet: maximum 24 vágási darab és 100 000 keresési csomópont. A szélességi maradék újrafelhasználása nincs benne. Ha egy csík hosszabb a tekercsnél és nincs explicit pozitív végtoldás, fizikai mennyiség helyett `UNSUPPORTED`; a packing korlát túllépésekor a geometria `PARTIAL`, a tekercsszám null. Area/roll-area hányados nem használható darabszámként.

### Támogatás és minősítési státusz

- **VERIFIED GEOMETRIC QUANTITY:** `gable`, `shed`, `hip`, érvényes konvex síkpoligon és teljes explicit tekercs/átfedés/irány bemenet esetén a levágott csíkok, hosszok, átfedési poligonok és bruttó blank-felület matematikailag ellenőrzött geometriája.
- **ASSUMPTION-BASED ESTIMATE:** a pontos 1D tekercsszám minimum teljes szélességű, téglalapként vágott blankok, kizárólag hosszmenti vágás és felhasználó-adta lapok feltételezésétől függ; UI kifejezetten vágási minimumnak és nem beszerzési mennyiségnek nevezi.
- **UNSUPPORTED PHYSICAL LAYOUT:** félkonty, sátor, L/T és minden más nem támogatott topológia; nem konvex/degenerált sík; hiányzó vagy ellentmondó termékadat; lehetetlen vágás; továbbá gyártói alkalmasság, felhajtás, áttörés, kivágás, szélesség-maradék újrahasznosítás és szerelési terv. Ezekre a motor null darabszámot ad.

Nem modellezett pótlék: élre felhajtás, eresz/gerinc túlnyúlás, nyíláslevonás, szél/toldás gyártói szabálya, veszteségszázalék és ár. Nincs ilyen default, illetve az F9.36.1 nem hoz létre anyaglistát.

### Survey, standalone és rajz

A tetőszakasz `roofUnderlayParameters` mezője opcionális, strict, csak roof szakaszon engedélyezett. A már meglévő revision snapshot mezője és írója őrzi a felhasználói paramétert; output nem duplikálódik a snapshotban, újbóli megnyitáskor ugyanabból a revízióból újraszámolódik. A csak geometriai workflow tekercsparaméter nélkül változatlanul menthető. Az additív helyi migration kizárólag a section JSON allowlist validátorát bővíti, táblát/writert/RLS-t nem módosít.

Az SVG ugyanazon `RoofUnderlayLayout.courses` és `.overlaps` poligonokat rajzolja, amelyből a panel számai jönnek. A rajz neve és leírása sematikus fóliageometriát, nem gyártási szabástervet jelent.

## F9.36.2 — Lemezkiosztás és beszerzési mennyiségek: implementációs követelmény

1. **Forrás-topológia:** csak validált `RoofGeometry` síkpolygon, adjacency, eave/ridge/hip/valley/side élazonosító és fizikai tetőhatár alapján induljon. Ha az élmapping vagy coplanar patch összevonás nem elég az anyagoldalankénti kiosztáshoz, `UNSUPPORTED`; ne használjon teljes tetőterületet vagy befoglaló téglalapot darabszámhoz.
2. **Termékadat snapshot:** termékforma/profil és forrásazonosító; névleges, fizikai, effektív és használható szélesség/hossz; oldal-, vég- és hosszanti átfedés külön; fektetési tengely/irány; megengedett min/max gyártási hossz; hossz- és szélességi vágási/forgathatóság; modul-/bordaméret, ha a megadott gyártói forrás előírja; explicit kompatibilitási megerősítés és forrás-verzió/dátum. Gyártói korlát csak hivatkozott adatként, soha nem becsült defaultként szerepelhet.
3. **Él- és kiterjesztés-szabály:** eresz-, gerinc-, orom-, konty-, vápa- és csatlakozó élhez szükséges tényleges szegély/visszafordulás, peremsáv, vágási hézag, végkorlát, csatlakozási átfedés, viharszegély/oldalsáv és minden nyílás kivágási poligonja sík lokális koordinátában; e nélkül az érintett sík kiosztása nem vásárlási szintű.
4. **Algoritmikus lépések:** síkonként határoló régió és szabályos sor/kolonna-generálás; hasznos szélesség/hossz és explicit átfedés szerinti fedési intervallum; lapos/törött végélű lapok fizikai hosszra vágása; kivágásokból megmaradó darab felhasználása kizárólag ha orientáció, vágás, toldás és gyártói megszorítás bizonyítható; anyagoldalanként és geometriánként külön darabjegyzék. A vágási optimalizálás pontos optimumot csak korlátos, reprodukálható algoritmus esetén állíthat; limitnél typed `PARTIAL/UNSUPPORTED`, és estimated darabszám nem jelölhető verified mennyiségnek. Terület-alapú darabszámtilalom.
5. **Fizikai különállás:** az azonos globális él vagy gerinc két tetősíkhoz tartozhat, de ez nem bizonyít egyetlen vagy közös lemezdarabot. A két fizikai sík darabszámát külön kell adni; közös anyag csak felhasználó vagy gyártói csomóponti szabály explicit levezetésével. A geometriai polygon-átfedés nem fizikai átfedés, amíg a termék- és szerelési kapcsolat nincs megadva.
6. **Kimenet és provenance:** nettó síkfelület, tényleges lefedett felület, teljes szélességű blank/bruttó anyag, névleges/hasznos darabméret, darabszám, hulladék és maradék külön mértékegységgel; minden mezőhöz `verified geometry`, `assumption-based estimate` vagy `unsupported physical layout` státusz, paraméter-forrás és indok. Sem az estimated darabszám, sem geometriai felület nem kerülhet verified beszerzési mennyiségként Survey/anyaglistába.
7. **Független fixture-k:** kézi polygonos gable/shed, hip trapez és háromszög sík, shared ridge/hip kétoldali fizikai tagolással, vágott ferde vég, L/T patchhatár, ablak/áttörés, aszimmetrikus polygon csak ha inputja létezik; minden fixture-hez kézi koordináta, hasznos szélesség/laplevezetés és kézzel számolt darab-oracle. Nulla/teljes/többszörös átfedés, tükrözött telepítési irány, max hossz, vágási korlát, maradék újrafelhasználás, túl nagy optimalizáció és invalid gyártói hivatkozás eset is kötelező.
8. **Integrációs korlát:** csak a meglévő roof workflow-kba bekötött közös domain engine; nincs új kalkulátorkatalógus-entry, duplikált formula, business workflow/takeoff mentés vagy hosted migráció e specifikáció önmagában alapján. Előfeltétel review: tervezett geometriai scope, termékadat provenance és a megoldható optimalizálási tartomány elfogadása.
