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
