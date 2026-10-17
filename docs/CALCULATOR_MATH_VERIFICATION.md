# F9.24.1 — Független építési kalkulátorok matematikai ellenőrzése

## Verifikációs határ

Ellenőrzés kizárólag a `src/domain/calculations/construction/` tiszta függvényeire és a korábbi, már auditált TetőPro tetőmotorok felhasználására vonatkozik. Nem statikai, gyártói, építési szabályozási, talajmechanikai vagy szakértői tanúsítás.

Az inputok hossza mm-ben, terület m²-ben, térfogat m³-ben, tömeg kg-ban, szög fokban, ívhossz ugyanabban a lineáris egységben jelenik meg. A kód belsőleg is explicit mm→m (`/1000`), mm²→m² (`/10⁶`) és mm³→m³ (`/10⁹`) átváltást használ. Minden numerikus méret pozitív és véges; az opcionális kiülés/fedés nullát is elfogadhat. A darabszám egész pozitív. A motorok `NaN`, végtelen, nulla vagy negatív fizikai méret, lehetetlen belső gyűrű, nem férő mesh-fedés és túl nagy eredmény esetén leállnak.

## Képletek és feltételezések

| Számítás | Képlet / levezetés | Egység és kerekítés | Domain / érvényesség |
|---|---|---|---|
| Átló, szarufa, felsőöv | Derékszögű háromszög: `c=√(a²+b²)`; szög `atan2(emelkedés, vízszintes futás)`. Vízszintes ereszkiülés a félfesztávhoz adódik a szarufahosszhoz. | Bemenet mm; hossz mm; kijelzési szög °. Hossz belső számítása nem egész mm-re kerekít. | Mindkét befogó >0, túlnyúlás ≥0. Rafter pitch a fal félfesztávjára, nem a kiülésre épül. |
| Manzárd, egyszerű háromszög | Egy-egy törésponti szakasz `√(futás²+emelkedés²)`; szimmetrikus teljes felület `2 × épülethossz × (alsó ferde hossz + felső ferde hossz)`. | mm bemenet; m² kimenet; nincs köztes kerekítés. | Két szimmetrikus, állandó hosszirányú keresztmetszeti szakasz. Nincs levonás, csomópont, fal/tetőhéjazat. |
| Meglévő nyeregtető/félnyereg/konty | Meglévő `calculateRoofGeometry` motor. A TetőPro [TP1]/[TP2] audit külön, háromdimenziós/területi invariantokat és skálázást vizsgál. | Kanonikus mm/mm²; eredmény m² külön explicit osztással. | Csak az egyes meglévő típusmodellek támogatott szimmetriája és inputkorlátai. |
| Cserepeslemez-darabszám | Meglévő `calculateGableMetalTileCovering`: egy teljes hosszú sor/sík; `oszlop=ceil(tetőhossz/hasznos fedési szélesség)`, két sík; szükséges hossz = ferde fedési hossz + explicit eresz- és gerincvégi ráhagyás. | Egész lemezdarab; névleges terület fizikai szélesség × fizikai hossz. | Csak explicit névleges/hasznos szélesség, fizikai/hasznos hossz, termékadatforrás és igazolt hosszkompatibilitás mellett. Hosszirányú toldás nem támogatott; ilyen esetben nincs darabszám. |
| Egyenes lépcső | `fellépő=teljes emelkedés/fellépések száma`; felső padló az utolsó fellépés, ezért `fokok= fellépések−1`; `belépő=vízszintes hely/fokok`; pofafa geometriai hossza `√(run²+rise²)`. | Minden méret mm; szög °; hányadosnál tört mm maradhat. | 2–200 fellépés, pozitív összemelkedés és vízszintes hely. A `2R+G` kijelzett érték puszta aritmetika, nem jogszabályi/ergonómiai minősítés. |
| Csigalépcső | Járóvonal sugara `r=(belső sugár+külső sugár)/2`; fordulási ív `s=rθ`, ahol `θ=fordulás°·π/180`; fokonkénti járóvonal-belépő `s/fokszám`; fellépő `teljes emelkedés/fellépésszám`. | mm és ° bemenet; a trigonometria radiánt használ. | Külső átmérő > belső; fordulás `0° < fordulás ≤ 1440°`; fok- és fellépésszám explicit. Ez geometriai középvonal, nem járhatósági igazolás. |
| Ferde lépcsőelem | `átló=√((belépő+orrkiülés)²+fellépő²)`; `dőlésszög=atan2(fellépő, belépő+kiülés)`; kiegészítő vágásszög `90°−dőlésszög`. | mm, fok; kijelzési kerekítés 3 tizedes. | Pozitív belépő/fellépő/fok- és lapvastagság; nem tartalmaz fűrészrés- vagy kötésráhagyást. |
| Sávalap, alaplemez, cölöp, gyűrű | Téglalap-prizma `V=LWT`; henger `V=π(D/2)²L`; gyűrű `V=πh(R²−r²)`; belső tér `πhr²`; él-/oldalzsaluzat az explicit függőleges oldalfelület. | mm³→m³ `/10⁹`; mm²→m² `/10⁶`. | Állandó keresztmetszet és homogén geometriai test. Nem levonás betonacélra, üregre, csatlakozásra vagy munkahézagra, hacsak az input nem tartalmazza. |
| Térkő | `terület=L×W`; `lapterület=l×w`; `darab=ceil(terület/lapterület)`. | m² és pozitív egész darabszám, felfelé kerekítve. | Csak területi arány: vágást, fugát, kiosztást, forgatást, mintát, szegélyt és veszteséget nem számol. |
| Téglalap körüli sáv | `(L+2s)(W+2s)−LW`; rétegtérfogat = sávterület × explicit rétegvastagság. | m²/m³, mm átváltás explicit. | Téglalap alaprajz és minden oldalon állandó szélesség. Nem általános polygon offset. |
| Betonkeverék | `cement kg = cél m³ × felhasználó által megadott cement kg/m³`; más tömegek = cementtömeg × megadott arány / cementarány. Zsák = `ceil(cement kg/zsáktömeg)`. | kg, egész zsák felfelé kerekítve. | Arány és cementigény kötelező input; nincs receptalapérték, hozam-, nedvesség- vagy szilárdsági feltevés. |
| Betonacél-rúd | `A=π(d/2)²`; `tömeg=A×összhossz×ρ`. Alapértelmezett `ρ=7850 kg/m³` [G4], módosítható. | d mm→m; hossz m; tömeg kg. | Hengeres, egyenes, megadott hosszú rudak. Hajlítás, toldás és veszteség nincs. |
| Háló | Tiszta méret `L−2fedés`, `W−2fedés`; intervallum `ceil(tiszta méret/max osztás)`; rúdszám intervallum+1; valós osztás `tiszta méret/intervallum`; tömeg kör keresztmetszet × összhossz × ρ. | Osztás és hossz mm/m; tömeg kg; rúdszám egész. | Téglalap ortogonális háló, állandó átmérő, végek a megadott fedésen. Átlapolás, réteg, kapcsolás vagy tervi megerősítés nincs. |

## Független deterministic fixtures

Az elvárt értékek az implementált függvényektől külön felírt geometriai képletekből származnak. `construction.test.ts` futtatja őket; a régi motorok saját audit/fixure tesztjei nem helyettesítik az új függvényteszteket.

| Fixture | Várt független eredmény | Ellenőrzött invariáns |
|---|---|---|
| 3–4–5 derékszögű háromszög | 3 000 mm és 4 000 mm → 5 000 mm | Pitagorasz és egyenes skálázás |
| Rafter 3–4–5 | 3 000 mm félfutás + 4 000 mm emelkedés → 5 000 mm ferde hossz, 53,130102° | Szög és komplementer vágásszög 90° |
| Broken pitch | 10 m hossz, (2,2)m alsó és (1,2)m felső futás/emelkedés | Szakaszhosszak `√8` és `√5` m; teljes felület 2× hossz × szakaszhosszösszeg |
| Háromszög rács burkolóvonal | 8 m fesztáv, 3 m gerinc → félöv 5 m | 3–4–5 háromszög; 5 csomópont 4 egyenlő részre |
| Egyenes lépcső | 2 800 mm, 16 fellépés, 4 200 mm hely → 175 mm, 15 fok, 280 mm | Azonos fellépő, count convention, 2R+G=630 mm |
| Spirál | 2 000/400 mm külső/belső, 360°, 18 fellépés → járóvonal-r=600 mm; s=1 200π mm; 17 fok | Radiános ívhossz; fellépő 3 000/18 mm; a felső padló az utolsó fellépés |
| Sávalap | 30 m összes tengelyhossz, 0,4×0,8 m → 9,6 m³; két oldal 48 m² | V=H×W×D és oldalfelület |
| Alaplemez | 10×8×0,2 m → 16 m³; élzsaluzat 7,2 m² | Volumen és négy oldal |
| 12 hengeres cölöp | 12×Ø400 mm×2 m → `12π×0,2²×2`=3,015929 m³ | Darabszám-szorzás és henger |
| Betongyűrű | Ø1 500, fal 100, h 1 000 mm → `π(0,75²−0,65²)`=0,439823 m³ | Külső átmérő−2×fal = belső átmérő |
| Térkő | 10×1,2 m felület, 200×100 mm lap → 600 db | Területarány; egész mennyiség |
| Téglalap körüli sáv | 10×8 m épület, 1 m sáv → (12×10−10×8)=40 m²; 100 mm beton →4 m³ | Szimmetrikus kerület-offset terület |
| Betonkeverék | 1,2 m³; cement 300 kg/m³; 1:2:4 tömegarány; 25 kg zsák → 360/720/1 440 kg és 15 zsák | Tömegarány, cement igény, ceil |
| Betonacél | 10×6 m, Ø12 mm, ρ=7 850 → `60×π×0,006²×7850`=53,27 kg | M=L×A×ρ; diameter scale squared |
| Háló | 5×4 m, 30 mm fedés, 200 mm max osztás, Ø10 mm | 21 és 26 rúd; mindkét tényleges osztás ≤200 mm |
| Existing nyeregtető + lemez | 10×6 m, emelkedés 4 m → 100 m²; explicit 1 200/1 000 mm névleges/hasznos szélesség és 5 100/5 000 mm fizikai/effektív hossz →20 db, 122,4 m² névleges terület | Existing tető + termékspecifikus teljes hosszú egysoros fedés; [TP3] |

## Szélső esetek és tesztmátrix

| Vizsgálat | Bizonyíték | Állapot |
|---|---|---|
| Nulla/negatív/nem véges bemenetek; negatív/0 méretek | Zod sémákban `positive`, `finite`, `nonnegative`; `construction.test.ts` elutasítási esetek | Futó Vitest-kimenet a `docs/TEST_MATRIX.md` F9.24.1 sorában |
| Lehetetlen gyűrű/háló/spirál | Gyűrű és spirál belső átmérője kisebb a külsőnél; fedés után mindkét hálóméret pozitív; spirál vízszintes fok = fellépés − 1 | Futó Vitest-kimenet a `docs/TEST_MATRIX.md` F9.24.1 sorában |
| Integer kerekítés | Burkolólap `ceil`; zsák `ceil`; mesh `ceil` intervallumszám, majd tényleges egyenletes osztás | Futó Vitest-kimenet a `docs/TEST_MATRIX.md` F9.24.1 sorában |
| Dimenzió és skálázás | Hosszak 2×, területek 4×, térfogatok/tömegek 8× skálázása; lépcsőszög változatlan | Futó Vitest-kimenet; régi tetőmodell skálateszt `CALCULATION_VERIFICATION_MATRIX.md` |
| Tető szimmetria, síkterület/él invariáns | Existing RoofPro audit és geometry fixture-ek | **VERIFIED** az existing `TP1/TP2` scope-ban |
| Paraméterek nélküli mix recipe | Nincs alaprecept; szükséges inputok hiányában Zod hiba, eredmény nincs | **VERIFIED** a mező-sémával; keverék minőség/hozam nem számított |
| Zhitov-kimenetek összehasonlítása | Nem használtuk oracle-ként. Publikus kalkulátorok mezői/segédszövege vizsgált; egyes aktuális kimeneti példák HTML/iframe-ből nem olvashatók ki | **Nem futott**; nincs Zhitov numerikus összehasonlítás |
| Statika, normatív megfelelés, gyártói termék-/talajadat | Kívül esik a tiszta geometriai függvények határán | **Nem vizsgált / nincs kimenet** |

## Forrásjegyzék

- [OpenStax — Geometric Formulas](https://openstax.org/books/prealgebra-2e/pages/c-geometric-formulas)
- [OpenStax — Radian angles and arc length](https://openstax.org/books/precalculus-2e/pages/5-1-angles)
- [OpenStax — Volume and Surface Area](https://openstax.org/books/prealgebra-2e/pages/9-6-solve-geometry-applications-volume-and-surface-area)
- [NIST — Material: Steel](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=101567)
- Existing TetőPro audit: [docs/CALCULATION_VERIFICATION_MATRIX.md](CALCULATION_VERIFICATION_MATRIX.md)
- Zhitov public reference index and individual URLs: [docs/CALCULATOR_COVERAGE_MATRIX.md](CALCULATOR_COVERAGE_MATRIX.md)

## F9.24.2 — Lépcsőrajzok matematikai ellenőrzése

### A rajz és a számítás kapcsolata

- **Egyenes lépcső (S1/S2/S10/S11):** a rajzi fokosztás a `calculateStraightStairGeometry` kimenetéből készül. `R = teljes emelkedés / fellépések`, `N_fok = N_fellépés − 1`, `G = vízszintes hely / N_fok`. Az `i` indexű fok vízszintes határai `i·G` és `(i+1)·G`, magassága `(i+1)·R`; ezért a vízszintes végpont `teljes futás`, az utolsó fok fölötti záró fellépés pedig a `teljes emelkedés`. Ezt a [rajzi adattranszformáció](../src/domain/drawings/construction-stairs.ts) állítja elő, nem a React.
- A teljes emelkedés és futás aránya a vetületi tartóvonalé: `L = √(futás² + emelkedés²)` és `α = atan2(emelkedés, futás)`. A viewBox-hoz csak közös, pozitív méretarány tartozik; az SVG méretfeliratok az eredeti mm értéket írják ki. A pan/zoom kizárólag megjelenítési transzformáció, nem változtatja meg a geometriát.
- **Felülnézet:** kizárólag az opcionálisan megadott kar-szélességet és a már számított fokosztást vetíti. Szélesség nélkül felülnézet-gombot nem jelenít meg. A kar-szélesség rajzi többletbemenet; nem módosítja az egyenes lépcső motorjának kimenő mennyiségeit.
- **Csigalépcső (S9):** a körgyűrű-határok sugara `külső/belső átmérő ÷ 2`; a járóvonal sugara ezek számtani közepe; fokonkénti szög `teljes fordulás / (fellépések − 1)`. A plan nézet körgyűrű-szektort rajzol, a másik nézet csak a teljes emelkedésen egyenletesen kiosztott fellépéseket. 360°-os vagy nagyobb egy fokra jutó szögnél a plan teljes körgyűrű-vetületet rajzol, és jelzi az átfedő fordulatokat; ezzel elkerüli a teljes körív azonos végpontú, érvénytelen SVG-ívét. A 1 440°/1 fok felső határ determinisztikus tesztet kapott.
- **Ferde lépcsőelem (S16):** a rajz a meglévő motor háromszögéből indul: `vízszintes = belépő + orrkiülés`, `átló = √(vízszintes² + fellépő²)`, `dőlésszög = atan2(fellépő, vízszintes)`. A vágási profil nem tartalmaz lapvastagságból származó metszést, illesztést vagy fűrészrést; nem gyártási rajz.
- A 11 még nem támogatott fordulós, húzott fokú, háromkarú vagy betonlépcső variánshoz sem számított eredmény, sem adatból következőnek látszó technikai rajz nem készül. A saját index-SVG-k csak típust jelölő navigációs ikonok; nem geometriai eredmény-ábrák.

### F9.24.2 deterministic fixtures és határvizsgálat

| Vizsgálat | Várt invariáns / független érték | Teszt |
|---|---|---|
| Egyenes lépcső, 2 800×4 200 mm, 16 fellépés | 15 fok; 175 mm fellépő; 280 mm belépő; a rajz utolsó vízszintes koordinátája 4 200 mm, utolsó fokszintje 2 625 mm, felső záró szintje 2 800 mm | `src/domain/drawings/construction-stairs.test.ts` |
| Egyenes geometria 2× skálázása | Hosszméretek 2×, szög változatlan; a szélesség csak rajzi input, nem módosítja a geometriai eredménysort | `src/domain/drawings/construction-stairs.test.ts` |
| 360° spirál, Ø2 000/400 mm, 18 fellépés | Járóvonal-sugár 600 mm; 17 egyenlő fok; a fokszögek összege 360°; a fokonkénti ívhossz összege a teljes járóvonal-ív | `src/domain/drawings/construction-stairs.test.ts` |
| Spirál határ: 1 440°, 1 fok | Véges ívhossz és belépő; renderelt plan teljes körgyűrűt használ, `NaN`/`Infinity` és hibás, körülforduló SVG-ív nélkül | `src/domain/drawings/construction-stairs.test.ts`, `src/domain/calculations/construction/catalog.test.tsx` |
| Nem támogatott 90°-os húzott fokú lépcső | Nincs eredményrajz | `src/domain/calculations/construction/catalog.test.tsx` |
| Indexikon-lefedettség | 17 különböző lépcső ikon + 10 különböző beton/alapozás/segédikon; nem használ távoli vagy referencia-SVG-t | `src/domain/calculations/construction/catalog.test.tsx` |

### Korlátok

Az automatikusan generált rajzok a hat már korábban geometriailag ellenőrzött lépcsőmotor eredményét jelenítik meg; a rajzoló geometriai leképezését és a spirál szélső esetét külön fixture fedi. Nincs lépcsőergonómiai/normatív megfelelés, szabad fejmagasság, pofafa-kivágás, fűrészfogas tartó, csomópont, statika, gyártási tűrés vagy betonlépcső-mennyiség. A referenciaoldali képernyőkép/funkciók nem önálló numerikus oracle-ok.

## F9.24.3 — Pihenős lépcsők és tömör betonék független ellenőrzése

### Ortogonális pihenős lépcsőgeometria (S3/S5/S7/S12–S15)

**Bemenetek és tartomány:** teljes szintemelkedés `H>0` mm, lépcsőkar-szélesség `W>0` mm, közös vízszintes belépő `G>0` mm, pihenőmélység `L≥W`, karonkénti egész fellépésszám `rᵢ≥2`, összesen legfeljebb 200. Kétkarú elrendezésnél két, háromkarúnál három darab `rᵢ` kell. Az opcionális alaprajzi befoglaló méretek pozitívak; ezek kizárólag `kiterjedés≤megadott méret` ellenőrzések, nem valós nyíláskontúr-/ütközésvizsgálat. A U-alakú `gap≥0` mm csak explicit karhézag. A bal/jobb irány a saját alaprajz Y-tengely körüli tükrözése.

**Fok- és magasságképletek:** `N=Σrᵢ` összes fellépés; `R=H/N` közös fellépő; `nᵢ=rᵢ−1` karonkénti fokszám, mivel a következő pihenő/felső padló a kar utolsó fellépésének végszintje; `N_fok=Σ(rᵢ−1)`; karfutás `runᵢ=(rᵢ−1)G`; kar végi magasság `R×Σ_{j≤i}rⱼ`. Ezért az összes kar első pontjától az utolsó padlóig a magasság pontosan `H`; a pihenők nem adnak hozzá további fellépést. Minden koordináta és pihenő téglalap a megadott mm értékekből készül; a 90°/háromkarú útvonal negyedfordulója, a 180° útvonala párhuzamos visszatérő karokat tartalmaz. A kód közös pozitív koordináta-transzlációval normálja a tervet; nem kerekíti a geometriai számot.

**Független, kézzel ellenőrzött esetek:**

- 90°: `H=3000`, `W=L=900`, `G=250`, `r=[8,8]` → `R=187,5`, `N_fok=14`, karfutás 1750/1750 mm, befoglaló terv 2650×2650 mm.
- 180°: `H=2800`, `W=900`, `L=1000`, `gap=200`, `G=280`, `r=[8,8]` → `R=175`, futás 1960 mm/kar, befoglaló terv 2960×2000 mm és a két kar tényleges hézaga 200 mm.
- Háromkarú: `H=3000`, `W=L=900`, `G=250`, `r=[6,6,6]` → `R=166,666…`, karzáró szintek 1000/2000/3000 mm, 15 fok, 1250 mm futás/kar, befoglaló terv 2150×3050 mm.

A fenti alaprajzi végpontok, fokdarabszám, szintintervallum, kétirányú tükör/befoglaló méret, egyenlő karfutás, U-hézag, 2× méretezés, rossz kar-darabszám, keskeny pihenő, elégtelen megadott befoglaló méret és nem véges/negatív/0 méretek a `src/domain/calculations/construction/stair-landings.test.ts` fixture-jeiben ellenőrzöttek. A `src/domain/drawings/construction-stairs.test.ts` és `catalog.test.tsx` szerveroldali SVG-renderelésben véges rajzot, átfogó típuslefedést és letiltott húzott fokos eredményrajzot vizsgál.

### Betonlépcső tömör, fokos éke (S17 szűkített változat)

**Feltételezett test:** állandó `W` szélességű egyenes kar; a keresztmetszet alsó határa vízszintes, felső határa egyenletes lépcsőprofil; nincs pihenő, külön karlemez, fellépőlemez, orrkiülés, vasalás vagy zsaluzat. `H>0` emelkedés, `X>0` vízszintes vetület, `n≥2` egész fellépés. Minden `mm`-ben, kimeneti térfogat m³-ben.

`R=H/n`, `n_fok=n−1`, `G=X/(n−1)`. A fokos profil keresztmetszeti területe a vízszintes `G` szélességű sávok összege: `A=Σ_{i=1}^{n−1}(i·R·G)=R·G·n(n−1)/2=H·X/2`. Tömör prizma: `V=W·A/10⁹ = W·X·H/(2·10⁹) m³` mm-ben megadott bemenetből. Ez pontos, nem kerekített térfogat a fenti kizárólagos testdefinícióra; az eredmény **nem** jelenti, hogy a valós betonlépcső ezt a szerkezeti keresztmetszetet kapja.

Fixture: `H=2800`, `X=4200`, `W=1000` mm, `n=16` → `R=175`, `G=280`, 15 fok. Külön sávösszeg: `Σ_{i=1}^{15}i=120`, ezért `W×G×R×120/10⁹=5,88 m³`; független háromszög-terület: `W×H×X/(2×10⁹)=5,88 m³`. A két út a kimenettől külön felírt, egyező eredményt ad. A tartomány- és hibateszt a `stair-landings.test.ts` fájlban van.

### Független formulaforrás

Az ortogonális fok/pihenőpoligonokat és a lépcsőék keresztmetszeti összegét elemi téglalapok területeként, a hasáb térfogatát alapterület×szélességként vezetjük le. Ezekhez a már felvett [G1] alapgeometria és [G3] hasáb-térfogat forrás használatos. A publikus Zhitov oldalak az űrlapok és referenciafunkciók azonosításához szolgáltak; a bemutatott eredményeket nem tekintettük képletforrásnak. Lásd: `https://www.zhitov.com/en/lestnica2/`, `/en/lestnica4/`, `/en/lestnica6/`, `/en/metal_ladder2/`, `/en/metal_ladder4/`, `/en/concrete_stairs/`.

### Korlátok és státusz

Az S3/S5/S7/S12–S15 eredménye **VERIFIED csak a fent leírt ortogonális pihenős alaprajz- és fokgeometriára**; nem igazol fa-/fém tartómodellt, lépcsőszabályt, fejmagasságot, gyárthatóságot vagy statikát. S17 **VERIFIED csak a tömör fokos ék geometriai térfogatára**; vasalást, mixet, normatív/teherbírási megfelelést nem ad. S4/S6/S8 húzott fokos modellek nem implementáltak és nem adnak eredményt.
