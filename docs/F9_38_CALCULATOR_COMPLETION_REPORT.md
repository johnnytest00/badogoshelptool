# F9.38 — Staircase & Concrete Calculator Completion Report

## F9.38.6 — Zhitov-referenciaszellemű 2.5D bélyegképek

**Státusz:** `IMPLEMENTED; FOCUSED TESTS, TYPECHECK, TARGETED ESLINT AND ISOLATED PRODUCTION BUILD PASS`. A teljes repós lint nem zöld: 286 előzetes hiba maradt a módosítatlan `.agents/` és `.claude/` segédszkriptekben; az érintett TypeScript-fájlokra célzott ESLint sikeres. A felhasználói képernyőkép a szín- és rajzi hangulatot adta; a saját 33 SVG-geometria nincs harmadik féltől másolva. Minden kalkulátorikon közös műszaki szürke kontúrt, szürke térbeli lapokat és visszafogott sárga felső felületet használ világos/sötét témában.

- **Vetület:** a lépcsőfordulók korábbi sík felülnézete axonometrikus, foklap/fellépő oldalakat megmutató 2.5D vetületté változott. A 90° L-, 180° U- és háromkarú alaprajzi lábnyom, fordulás, karok sorrendje és az egyetlen összefüggő pihenőfelület megmaradt. A húzott forduló egyedi ékfelületek sorát használja. Az egyenes fa/fém lépcsőn az oldalsó emelkedés és zárt/nyitott/fűrészfogas jel külön olvasható.
- **Tető:** a nyeregtetőn két sík és gerinc, a félnyeregnél egy sík, a manzárdnál két lejtés és törés, a kontynál négy sík és véges gerinc maradt; a rácsos tartó sekély mélységet kapott. A szarufa egyetlen ferde elemet és vágásjelzést mutat.
- **Beton/alap:** a sávalap, cölöp, lemez, gyűrű, térkő, épületsáv, keverő és háló sziluettje megmaradt a közös palettára hangolva. A betonacél rudak és a derékszögű átló segédmodell térbeli oldalfelületet kapott.
- **Méretezés/választó:** 56×51 arány és a meglévő 6/17/10 katalógus azonosítók megmaradtak. Mobil választó gördíthető maradt; sem kalkulátorkeresés, sem űrlap, sem motor nem változott.

| Katalógusazonosító | F9.38.6 geometriai státusz | Rövid megjegyzés |
| --- | --- | --- |
| `roof.rafter` | MEGTARTOTT | Ferde szarufagerenda és vágási jel |
| `roof.gable` | MEGTARTOTT | Két tetősík és közös gerinc |
| `roof.shed` | MEGTARTOTT | Egyetlen lejtős tetősík |
| `roof.mansard` | MEGTARTOTT | Két lejtés, látható törés |
| `roof.hip` | MEGTARTOTT | Véges gerinc és négy sík |
| `roof.truss` | FINOMÍTOTT | Szekunder térbeli mélység a háromszögű váznak |
| `stair.wood.closed_straight` | FINOMÍTOTT | Emelkedő fokok és tömör zárt oldal |
| `stair.wood.open_straight` | FINOMÍTOTT | Emelkedő fokok és nyitott tartóvonal |
| `stair.wood.90_landing` | FINOMÍTOTT | 2.5D L-karok, összefüggő pihenő |
| `stair.wood.90_winder` | FINOMÍTOTT | L-karok és külön húzott fordulófokok |
| `stair.wood.180_landing` | FINOMÍTOTT | 2.5D visszatérő karok, egy pihenő |
| `stair.wood.180_winder` | FINOMÍTOTT | Visszatérő karok és sugárirányú húzott fokok |
| `stair.wood.three_landing` | FINOMÍTOTT | Három kar, két külön pihenő |
| `stair.wood.three_winder` | FINOMÍTOTT | Három kar, két külön húzott forduló |
| `stair.wood.spiral` | FINOMÍTOTT | Nyolc szinteltolt sugárirányú fok |
| `stair.metal.straight` | FINOMÍTOTT | Emelkedő 2.5D fémfokok |
| `stair.metal.zigzag` | FINOMÍTOTT | Emelkedő fokok és fűrészfogas jel |
| `stair.metal.90_landing` | FINOMÍTOTT | L-karok, pihenő; tartómodell nélkül |
| `stair.metal.90_zigzag` | MEGTARTOTT | Ugyanaz a számított L-kar/pihenő lábnyom |
| `stair.metal.180_landing` | FINOMÍTOTT | Visszatérő karok és pihenő |
| `stair.metal.180_zigzag` | MEGTARTOTT | Ugyanaz a számított visszatérő lábnyom |
| `stair.beveled_riser` | FINOMÍTOTT | Külön térbeli ferde elem |
| `stair.concrete_straight` | FINOMÍTOTT | Fokozott felső profilú tömör lépcsőék |
| `concrete.strip` | MEGTARTOTT | Térbeli sávalap-szakasz |
| `concrete.pile` | MEGTARTOTT | Hengeres cölöptestek |
| `concrete.slab` | MEGTARTOTT | Téglalap lemez és oldalmélység |
| `concrete.ring` | MEGTARTOTT | Üreges körhenger |
| `concrete.paving` | MEGTARTOTT | Burkolt sík és rétegvastagság |
| `concrete.blind_area` | MEGTARTOTT | Téglalap alakú körüljáró sáv |
| `concrete.mix` | MEGTARTOTT | Betonkeverő tartály |
| `concrete.rebar` | FINOMÍTOTT | Testet és sárga fényélt kapott rudak |
| `concrete.mesh` | MEGTARTOTT | Rácsos háló és él |
| `aux.diagonal` | JAVÍTOTT | Térbeli, derékszögű átlósegéd |

**Minőségi kapu:** az ideiglenes auditoldal a katalógus valós sorrendjét használta, 56 és 64 px-es megjelenítésben mind a 33 ikont bemutatta, majd eltávolítottam. A helyi `/kalkulatorok` böngészőmátrixban 30 kategória/téma/viewport állapotot DOM-méréssel ellenőriztem; mindegyiknél nem volt vízszintes overflow vagy levágott címke. „betongyűrű” keresése egyetlen `concrete.ring` találatot adott, kiválasztása a megfelelő űrlapra váltott.

**Ellenőrzések:** `npx vitest run src/features/calculators/construction-thumbnails.test.tsx src/features/calculators/calculator-navigation.test.ts --reporter=dot` — 2 fájl / 9 teszt PASS; `npm run typecheck` PASS; az érintett három TypeScript-fájl célzott `npx eslint` futása PASS; `npm run build` PASS izolált, tiszta `.next` könyvtárú másolaton (Next.js 16.4.0 webpack, 30 statikus oldal, ideiglenes audit route nélkül); `git diff --check` PASS. A teljes `npm run lint` 286 hibával megállt a változatlan `.agents/` és `.claude/` segédszkripteken.

**Korlátok és határok:** a 90°/180° fűrészfogas fémlépcső katalógusában a fűrészfogas tartó nincs a számításban, ezért az ikon nem rajzol hozzá kitalált tartót. A sematikus fokszám és emelkedés nem bemeneti méretarány; az ikon nem gyártási, ergonómiai, statikai vagy szabványi terv. Nincs fizikai érintéses eszköz, pinch vagy képernyőolvasó-audit. Nincs számítási, adatbázis-, Auth/RLS, szervezeti jogosultsági, mentettadat- vagy üzletifolyamat-változás; tartós írás nem történt.

Javasolt Conventional Commit: `feat(F9.38.6): unify calculator thumbnails in gray-yellow 2.5D`.


## F9.38.5 — Geometriahű kalkulátorikonok

**Állapot:** `IMPLEMENTED; VISUALLY VERIFIED IN LOCAL BROWSER`. A 33 kalkulátorválasztó ikon a meglévő SVG-komponensben maradt; a számítási motor, katalógus, adatbázis, jogosultsági útvonal és üzleti workflow nem változott.

- **Tetők:** a nyeregtetőn külön tetősíkok és közös gerinc olvasható a tetőtest felett; a félnyereg egy folytonos lejtősík; a kontytető négy síkot, gerincet és kontyéleket; a manzárd mindkét oldalon két eltérő lejtést mutat. A szarufa a ferde faelemet és vágásjelet, a háromszögű tartó az öveket és belső rácsrudakat ábrázolja.
- **Lépcsők:** a 17 katalóguselem megőrzi a saját variánskülönbségét. A fa/fém egyenes lépcsők oldalnézeti foksort és tartójelet használnak; a 90°-os L, 180°-os U és háromkarú felülnézeti elrendezések külön láthatók. A pihenő összefüggő téglalap, a húzott forduló ék alakú fokokra osztott. A csigalépcső sugaras, a ferde elem külön metszett alakú.
- **Beton és alapozás:** a tíz meglévő sziluett – sávalap, cölöp, lemez, gyűrű, térburkolat, épület körüli sáv, keverő, betonacél, háló és átlósegéd – megmaradt. A közös kontúr- és felületstílus egyenletes vonalvastagságot, semleges árnyékolást és takarékos narancs kiemelést ad.
- **Méret:** a 56×51 viewBox az arányt megtartja. Desktopon a lista 48–56 px-es ikonmezőt, mobilon 44–48 px-es mezőt használ. Az opciósor minimuma 61,6 px; a címkék sortörése és ikonláthatósága a kis képeken ellenőrizve.
- **Összehasonlítás:** ideiglenes 48/64 px-es összehasonlító lapon mind a 33 ikon a nevével együtt szerepelt. A szarufa/nyereg/félnyereg/manzárd/konty és a fa/fém, pihenős/húzott, 90°/180°/háromkarú változatokat egymás mellett néztem át. A lapot a munka után eltávolítottam.
- **Referenciák:** a rajzok a projekt [kalkulátorfedettségi mátrixában](CALCULATOR_COVERAGE_MATRIX.md) lévő Zhitov referenciaoldalak geometriai leírásából merítenek; harmadik féltől származó SVG-t vagy képet nem másoltam. A bélyegképek szemléltető ikonok, nem gyártási vagy statikai tervek.
- **Böngésző:** helyi `/kalkulatorok`, mindhárom kategória, világos/sötét téma, 1440/768/390/320 CSS-pixel; 24 kategória-téma-viewport állapot képernyőképen átnézve. Vizuálisan nem látszott oldalirányú overflow, torzulás vagy SVG-levágás. Ez nem DOM-szélesség-mérés. Fizikai eszköz, érintés/pinch és képernyőolvasó-audit nem futott.
- **Ellenőrzés:** célzott teszt 2 fájl / 6 teszt PASS; typecheck, lint, production build (30 statikus oldal) és `git diff --check` PASS. Részletes parancsok és korlátok: [F9.38.5 tesztmátrix](TEST_MATRIX.md#f9385--geometriahu-kalkulatorikonok).

Javasolt Conventional Commit: `feat(F9.38.5): restore geometry in calculator icons`.

**Állapot:** `PARTIAL` — mind a 27 meglévő kalkulátort áttekintettem és a biztonságosan levezethető eredményeket, rajzviselkedést, illetve eredményhierarchiát továbbfejlesztettem. A feladat teljes Zhitov-funkcióparitása, minden variáns invalid-input browser mátrixa, mobil/tablet viewportok és tervi/gyártási megfelelőség nem bizonyított, ezért a milestone nem `COMPLETE`.

## Megvalósított scope

- A 17 stair, 9 concrete és 1 átló segédkalkulátor a meglévő 33 elemű, független önálló katalógusban maradt; új kalkulátor-azonosító vagy üzleti workflow nincs.
- A domain motorok meglévő tiszta TypeScript függvényeit bővítettem. A UI 4–6 elsődleges eredményt emel ki, további értékeket disclosure-ben mutat; a 2R+G figyelmeztetés a számított értéket a dokumentált referencia-tartományhoz hasonlítja, kifejezetten tájékoztató jelleggel.
- A C5 opcionálisan megadott alapréteg-vastagságot számol és metszeti nézeten mutatja. C6-nál csak megadott rétegvastagságból készül rétegtérfogat és metszeti ábra.
- Minden táblázati bemutatóérték kizárólag DEMO fixture. Nincs statikai, szabványi, gyártói, talajmechanikai, recept- vagy áradat-kimenet.

## Kalkulátoronkénti checklist

A 27 Zhitov-oldal publikus mezőleírásait és dokumentált kimeneteit felülvizsgáltam. A futó számító űrlapok és egyedi eredménylapok egy része beágyazott dinamikus iframe; ezek eredményeit nem lehetett ugyanazokra az adatokra újragenerálni, ezért a Zhitov-paritás nem bizonyított. A részletes hivatkozáslista a [kalkulátorfedettségi mátrixban](CALCULATOR_COVERAGE_MATRIX.md) található.

Az alábbi „böngésző” oszlop a 2026-10-17-i hitelesített, helyi `DEMO TetőPro Kft.` desktop Brave smoke-ra vonatkozik: mindegyik variánsnál érvényes DEMO bemenet, főeredmény és saját SVG megjelenését ellenőriztem. Hibás bemenetből interaktív browser ellenőrzés csak a C4 betongyűrűnél futott; néhány séma- és határesetet domain teszt fed, de mind a 27 kalkulátorra kiterjedő invalid-input mátrix nem futott. A rajz zoom, Enteres zoom-vezérlés és dimenziófelirat→mezőfókusz ellenőrzött; pan/húzás nem futott. Mobil/tablet nézet és 1440/1024/768/390/320 CSS-pixel viewport mátrix nem futott, mert a jelenlegi böngészővezérlés nem ad viewport-emulációs lehetőséget.

| # / kalkulátor | Zhitov referencia | Bemenet-lefedettség a TetőPróban | Támogatott eredmények | SVG nézet | Független matematikai bizonyíték | Browser státusz | Státusz és fennmaradó nem támogatott képesség |
|---|---|---|---|---|---|---|---|
| S1 Egyenes fa lépcső, zárt pofafa | [lestnica](https://www.zhitov.com/en/lestnica/) | Emelkedés, vízszintes hely, fellépésszám; opcionális kar-szélesség a tervhez | Fellépő, fokszám, belépő, ferde tengelyhossz, hajlás, 2R+G | Méretezett oldalnézet; szélesség megadásával felülnézet | 2 800/4 200 mm, 16 fellépés → 175/280 mm, 15 fok, 5 047,772 mm, 630 mm | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — pofafa kivágás, vastagság, fejmagasság, anyag, statika és compliance nélkül. |
| S2 Egyenes fa lépcső, nyitott tartó | [lestnica_k](https://www.zhitov.com/en/lestnica_k/) | S1-gyel azonos explicit geometriai bemenetek | S1 közös motorjának számai | Oldalnézet, opcionális szélességgel tervnézet; nincs számított fogazat | S1 független 3–4–5 háromszög fixture, közös motor | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — nyitott tartó profilja, keresztmetszet, csomópont és teherbírás nincs. |
| S3 90° fa lépcső, pihenővel | [lestnica2](https://www.zhitov.com/en/lestnica2/) | Emelkedés, szélesség, belépő, két kar fellépésszáma, pihenőmélység, irány | Közös fellépő, fokszám, karfutás/tengelyhossz, tervméret, fok/pihenő felület, hajlás, 2R+G | Méretezett 90° felülnézet | 3 000 mm, 8+8, 900/250 mm → 187,5 mm, 14 fok, 2 650×2 650 mm, 3,15/0,81 m² | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — nyílás-kontúr, fejmagasság, korlát, tartó, statika és ergonómiai minősítés nincs. |
| S4 90° fa lépcső, húzott fokokkal | [lestnica3](https://www.zhitov.com/en/lestnica3/) | Emelkedés, kar-szélesség, belső sugár, alsó/felső fokszám, fordulófok-szám, irány | Járóvonali belépő, belső/külső húr, fordulási szögosztás, kiterített futás/hajlás/hossz, összterület | Fokpoligon alaprajz, kiterített profil | 90°/3 fok, 300 mm sugár, 800 mm kar, 700 mm járóvonal-sugár; kézi ív/húr és chord-polygon terület fixture | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — egyenlő szögű koncentrikus modell; pofa, illesztés, fejmagasság, gyárthatóság és statika nincs. |
| S5 180° fa lépcső, pihenővel | [lestnica4](https://www.zhitov.com/en/lestnica4/) | Emelkedés, szélesség, belépő, két kar fellépésszáma, pihenőmélység, irány, opcionális karhézag | Fellépő, tervkiterjedés, futás, felületek, karonkénti méret és hajlás | U-alakú méretezett alaprajz | 2 800 mm, 8+8, 900×280 mm és 1 000 mm pihenő → 1 960 mm karfutás és 2 960×2 000 mm terv | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — tartó, nyíláskontúr, fejmagasság, szerkezet és statika nincs. |
| S6 180° fa lépcső, húzott fokokkal | [lestnica5](https://www.zhitov.com/en/lestnica5/) | S4-gyel azonos bemenetek; 180° forduló | Fokszám, járóvonali ívbelépő, húrok, szögosztás, kiterített profil és tervfelület | U-alakú fokpoligon nézet | 180°/4 egyenlő szektor, húr/ív fixture, tükrözési és átfedésvizsgálat | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — koncentrikus/azonos kiosztású geometria; gyártási tartó és statika nincs. |
| S7 Háromkarú fa lépcső, pihenőkkel | [lestnica6](https://www.zhitov.com/en/lestnica6/) | Emelkedés, szélesség, belépő, pihenő, három kar fellépésszáma, irány | Közös fellépő, 3 kar futás/hossz, terv, fok/pihenőfelület, fokszám, hajlás, 2R+G | 3 kar és 2 pihenő felülnézet | 3 000 mm, 6+6+6 → szintközi emelkedés 1 000 mm, 15 fok, 2 150×3 050 mm; tükörfixture | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — tartószerkezet, nyílás, fejmagasság, anyag és statika nincs. |
| S8 Háromkarú fa lépcső, húzott fordulókkal | [lestnica7](https://www.zhitov.com/en/lestnica7/) | Emelkedés, szélesség, sugár, három kar fokszáma, fordulónkénti húzott fok, irány | Mindkét forduló elkülönítése, fokpoligonok, járóvonal, terv, felületek, kiterített magasság | 3 kar / két külön indexű 90° forduló alaprajz | Két annularis szektor, karonkénti szintfixture, convex/non-overlap és bal/jobb tükrözés | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — két azonos irányú/azonos kiosztású forduló; pihenő, gyártási terv és statika nincs. |
| S9 Csigalépcső | [spiral_stairs](https://www.zhitov.com/en/spiral_stairs/) | Teljes emelkedés, külső/belső átmérő, fordulási fok és fellépésszám | Fok/fellépésszám, középvonal sugár/ív, fokonkénti belépő, hajlás, fejlesztett hossz, alaprajzi gyűrűterület, 2R+G | Felülnézet és függőleges fellépés-kiosztás | 2 000/400 mm, 3 000 mm, 360°, 18 → r=600 mm, 1 200π mm ív, 17 fok | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — oszlop, kivágás, fordulás iránya, fejmagasság és járhatóság nincs. |
| S10 Egyenes fémlépcső | [metal_ladder](https://www.zhitov.com/en/metal_ladder/) | Emelkedés, helyigény, fellépésszám | S1 geometriai eredménylista | Méretezett lépcső oldalnézet | S1 3–4–5 fixture; azonos, közös geometriamotor | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — acél profil, konzol, kötés, csavar/varrat, anyagmennyiség és teherbírás nincs. |
| S11 Egyenes fémlépcső, fűrészfogas tartó | [metal_ladder_z](https://www.zhitov.com/en/metal_ladder_z/) | S10-zel azonos explicit alapgeometria | S10 közös geometriai eredmény | Oldalnézet; a tartó nem rajzolódik meg | S1 független alapgeometriai fixture, közös motor | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — fűrészfog profil, acél elemhossz, kapcsolatok és statika nincs. |
| S12 90° fémlépcső | [metal_ladder2](https://www.zhitov.com/en/metal_ladder2/) | S3 pihenős 90° explicit inputkészlete | Kétkarú alaprajz és geometric summary | Méretezett pihenős terv | S3 fixture és azonos pihenőmotor | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — fém tartó, fordulócsomópont, anyag és statika nincs. |
| S13 90° fémlépcső, fűrészfogas | [metal_ladder_z2](https://www.zhitov.com/en/metal_ladder_z2/) | S12 pihenős geometriai inputjai | S12 geometriája | Pihenős terv, nincs zigzag tartóprofil | S3 fixture és azonos pihenőmotor | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — fűrészfog, acélalkatrész, konzol, csomópont és statika nincs. |
| S14 180° fémlépcső | [metal_ladder4](https://www.zhitov.com/en/metal_ladder4/) | S5 U-alakú explicit geometriája | Két kar, pihenő/hézag, tervméret és mennyiségek | U-alakú méretezett terv | S5 független tervméret- és hézagfixture | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — tartó, fordulókapcsolat, támasz, anyag és statika nincs. |
| S15 180° fémlépcső, fűrészfogas | [metal_ladder_z4](https://www.zhitov.com/en/metal_ladder_z4/) | S14 pihenős geometriai inputjai | S14 geometriája | U-alakú terv; zigzag tartó nincs | S5 független tervméret- és hézagfixture | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — fűrészfogas profil, acélkapcsolat, gyártás és statika nincs. |
| S16 Ferde lépcsőelem | [oblique_riser](https://www.zhitov.com/en/oblique_riser/) | Belépő, fellépő, orrkiülés, fok- és függőleges elemvastagság | Névleges átló, dőlés, kiegészítő vágásszög, függőleges blankhossz | Méretezett keresztmetszeti profil | 280/175/30 mm → `√(310²+175²)`, `atan2(175,310)`; komplementer szögösszeg 90° | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — kerf, élráhagyás, illesztés és kapcsolati terv nincs. |
| S17 Egyenes betonlépcső | [concrete_stairs](https://www.zhitov.com/en/concrete_stairs/) | Teljes emelkedés, helyigény, szélesség, fellépésszám | Ék-térfogat, fellépő/belépő, ferde hossza, hajlás, 2R+G | Tömör ék oldalnézete | Független `Σ(i×R×G)×szélesség` és háromszögprizma egyezés: 5,88 m³ | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — pihenő, waist/ferde lemez, vastagság, vasalás, zsaluzat és statika nincs. |
| C1 Sávalap | [fundament](https://www.zhitov.com/en/fundament/) | Összes tengelyhossz, szélesség, mélység | Beton, két oldali zsaluzat, névleges szakasz-alapterület | Egyenes névleges alaprajzi kiterítés és keresztmetszet | 30 m×0,4×0,8 → 9,6 m³; 48 m²; névleges terület 12 m² | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — nyomvonal, sarok/tee egyesítés, földmunka, rafts, vasalás és mix nincs. |
| C2 Hengeres cölöpalap | [pile_foundation](https://www.zhitov.com/en/pile_foundation/) | Darabszám, átmérő, hossz | Egyedi/összes térfogat, palást és kör alapfelület | Darabszámot jelző terv és cölöp-metszet | 12×Ø400×2 000 mm: `πr²h`, `πDh` és `πr²` darabonként | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — nem hengeres talp, oszlopforma, hely, gerendarács, vasalás és talajvizsgálat nincs. |
| C3 Alaplemez | [foundation_plate](https://www.zhitov.com/en/foundation_plate/) | Téglalap hossz/szélesség, állandó vastagság | Térfogat, terület, kerület és élzsaluzat | Alaprajz és metszet | 10×8×0,2 m → 16 m³, 80 m², 36 m, 7,2 m² | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — háló/vasalás, réteg, áttörés, teherbírás és anyagszükséglet nincs. |
| C4 Betongyűrű | [concrete_ring](https://www.zhitov.com/en/concrete_ring/) | Külső átmérő, falvastagság, magasság | Belső átmérő; beton- és belső térfogat; belső/külső palást, annulus-véglapok, teljes geometriai felület | Méretezett koncentrikus terv és gyűrűmetszet | Ø1 500/fal100/h1000 mm → ID 1 300 mm, 0,439823 m³; kézzel derivált felületek | PASS: érvényes DEMO + SVG; `wall=750 mm` rejected a magyar pozitív ID-hibaüzenettel | `COMPLETE_WITHIN_VERIFIED_SCOPE` — egységes, gyűrű keresztmetszetű geometria; termék/gyártás, vasalás, emelés és statika unsupported. |
| C5 Térburkolat | [sidewalk_tiles](https://www.zhitov.com/en/sidewalk_tiles/) | Téglalap burkolat és lap mérete; opcionális alapréteg-vastagság | Területarányos lapdarab, lapfelület, kerület, megadott alapréteg térfogata | Terület, lapméret és opcionális rétegmetszet | 10×1,2 m, 200×100 mm lap, 150 mm réteg → 600 db területi darab, 1,8 m³ | PASS: érvényes DEMO + SVG; 150 mm réteg eredménye 1,8 m³ | `PARTIAL` — lapkiosztás, fugák, vágás, pattern, szegély és veszteség nincs. |
| C6 Épület körüli sáv | [blind_area](https://www.zhitov.com/en/blind_area/) | Téglalap épület, egyenletes sáv, opcionális beton/kavics vastagság | Sávterület, külső méret/perem, belső perem, megadott rétegtérfogatok | Méretezett téglalap offset terv és rétegmetszet | 10×8 m, s=1 m → 40 m², külső 12×10 m, beton/kavics100/150 mm →4/6 m³ | PASS: érvényes DEMO + SVG; rétegtérfogatok 4/6 m³ | `PARTIAL` — tetszőleges kontúr, lejtés, vízelvezetés, szegély, geotextília, szigetelés, formwork nincs. |
| C7 Betonkeverék | [beton](https://www.zhitov.com/en/beton/) | Célmennyiség, cement kg/m³, explicit tömegarányok, opcionális zsáktömeg | Cement/homok/adalék tömege, száraz összeg, zsákszám | Explicit arányokat szemléltető mennyiségi sáv | 1,2 m³, 300 kg/m³, 1:2:4, 25 kg → 360/720/1440 kg, 15 zsák | PASS: érvényes DEMO, eredmény + SVG | `COMPLETE_WITHIN_VERIFIED_SCOPE` — user által megadott tömegarány algebra; recept, víz, szilárdság, hozam és ár unsupported. |
| C8 Betonacél rudak | [armature](https://www.zhitov.com/en/armature/) | Egyenes rúdátmérő, darabhossz, darabszám, módosítható sűrűség | Összhossz, tömeg, teljes térfogat, tömeg/m | Rúdnézet és jelképes keresztmetszet | 10×6 m, Ø12, 7850 kg/m³ → 60 m, 0,006786 m³, 0,887836 kg/m, 53,2702 kg | PASS: érvényes DEMO, eredmény + SVG | `COMPLETE_WITHIN_VERIFIED_SCOPE` — megadott egyenes hengerrúd; második input mód, vágás, hajlítás, toldás, grade és ár unsupported. |
| C9 Betonacél háló | [grid](https://www.zhitov.com/en/grid/) | Téglalap, fedés, egységes max osztás és közös rúdátmérő, sűrűség | Két irány rúdszáma/hossza, tényleges kiosztás, összhossz, térfogat/tömeg, metszésszám | Méretezett ortogonális rácsterv | Tiszta 4,94×3,94 m, 200 mm → 26/21 rúd, 206,18 m, 546 metszés; kézi keresztmetszet/tömeg formula | PASS: érvényes DEMO, eredmény + SVG | `PARTIAL` — eltérő x/y átmérő/osztás, átlapolás, réteg, kötés, vágás és szerkezeti vasalási terv nincs. |
| C10 Derékszögű átló | [diagonal](https://www.zhitov.com/en/diagonal/) | Két pozitív befogó | Átló és irányszög | Méretezett derékszögű vázlat | 3–4–5 fixture: 5 000 mm, 53,130102° | PASS: érvényes DEMO, eredmény + SVG | `COMPLETE_WITHIN_VERIFIED_SCOPE` — tiszta derékszögű geometria; szerkezeti méretezés nincs. |

### Fennmaradó képességek besorolása

Az `IMPLEMENTABLE_AND_VERIFIABLE` a jelenlegi inputokból önállóan számítható geometriai eredményeket jelöli; a biztonságosan levezetett ilyen kimeneteket ebben a körben implementáltam, ezért nem maradt ilyen nyitott hiány. Az alábbi 27 sor mindegyike külön kalkulátorra vonatkozik. A további hiányok besorolása:

| Kalkulátor | Fennmaradó képesség besorolása |
| --- | --- |
| S1 Egyenes fa, zárt pofafa | `REQUIRES_ADDITIONAL_INPUT` — fok/pofafa vastagság, orrkiülés, nyílás és csomóponti méretek; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — tartó, anyagkiírás és teherbírás. |
| S2 Egyenes fa, nyitott tartó | `REQUIRES_ADDITIONAL_INPUT` — fokvastagság, orrkiülés, fogazat- és nyitott tartóméret; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — csomópont, anyagkiírás és teherbírás. |
| S3 90° pihenővel | `REQUIRES_ADDITIONAL_INPUT` — nyíláskontúr, szabad magasság és korlátméret; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — tartószerkezet, teherbírás és megfelelőség. |
| S4 90° húzott fokokkal | `REQUIRES_ADDITIONAL_INPUT` — nyíláskontúr, fejmagasság, fok/pofafa vastagság; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — csatlakozás, gyárthatóság és teherbírás. |
| S5 180° pihenővel | `REQUIRES_ADDITIONAL_INPUT` — nyíláskontúr, fejmagasság és részletes tartóméret; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — fordulókapcsolat és teherbírás. |
| S6 180° húzott fokokkal | `REQUIRES_ADDITIONAL_INPUT` — nyíláskontúr, fejmagasság és gyártási méretek; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — szerkezet, kapcsolat és teherbírás. |
| S7 Háromkarú pihenőkkel | `REQUIRES_ADDITIONAL_INPUT` — nyíláskontúr, fejmagasság, korlát és tartóméretek; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — szerkezet és teherbírás. |
| S8 Háromkarú húzott fordulókkal | `REQUIRES_ADDITIONAL_INPUT` — nyíláskontúr, fejmagasság és eltérő forduló-/karparaméterek; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — tartó, gyárthatóság és teherbírás. |
| S9 Csigalépcső | `REQUIRES_ADDITIONAL_INPUT` — középoszlop, födémnyílás, fejmagasság és megtámasztás; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — járhatósági és teherbírási minősítés. |
| S10 Egyenes fém | `REQUIRES_ADDITIONAL_INPUT` — acélprofil, támasz, kötés és keresztmetszet; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — kapcsolati és szerkezeti tervezés. |
| S11 Egyenes fém, fűrészfogas tartó | `REQUIRES_ADDITIONAL_INPUT` — fűrészfog-profil, acélméret és kötés; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — gyártmány és teherbírás. |
| S12 90° fém | `REQUIRES_ADDITIONAL_INPUT` — forduló- és tartóprofil méretei; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — csomópont, teherbírás és gyártási terv. |
| S13 90° fém, fűrészfogas tartó | `REQUIRES_ADDITIONAL_INPUT` — zigzag tartó és acélprofil méretei; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — csomópont és teherbírás. |
| S14 180° fém | `REQUIRES_ADDITIONAL_INPUT` — tartó, pihenőkapcsolat és támaszméret; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — kapcsolati és szerkezeti tervezés. |
| S15 180° fém, fűrészfogas tartó | `REQUIRES_ADDITIONAL_INPUT` — zigzag profil, kötés és támaszméret; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — gyártmány és teherbírás. |
| S16 Ferde lépcsőelem | `REQUIRES_ADDITIONAL_INPUT` — fűrészrés, ráhagyás és csatlakozó alkatrész mérete; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — műhely- és illesztési terv. |
| S17 Egyenes betonlépcső | `REQUIRES_ADDITIONAL_INPUT` — pihenő, ferde lemezvastagság, lépcsőtest-részletek és vasalás geometriája; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — vasalás, zsaluzat és statika. |
| C1 Sávalap | `REQUIRES_ADDITIONAL_INPUT` — alapnyomvonal/csomópont-geometria, vasalás és mixadat; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — talaj, teherbírás és szerkezeti méretezés. |
| C2 Cölöp-/oszlopalap | `REQUIRES_ADDITIONAL_INPUT` — nem hengeres talp/oszlop, kiosztás, gerendarács és vasalás méretei; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — talajvizsgálat és alapozási terv. |
| C3 Alaplemez | `REQUIRES_ADDITIONAL_INPUT` — áttörések, vasalási háló és rétegek; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — teherbírás és szerkezeti vasalás. |
| C4 Betongyűrű | `REQUIRES_ADDITIONAL_INPUT` — termékprofil, huzalháló és gyártási méretek; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — emelés, vasalás és termékmegfelelőség. |
| C5 Térburkolat | `REQUIRES_ADDITIONAL_INPUT` — lapirány, fugaszélesség, mintázat, vágás, szegély és darabveszteség a kiosztási mennyiséghez. |
| C6 Épület körüli sáv | `REQUIRES_ADDITIONAL_INPUT` — nem téglalap kontúr, lejtés, további rétegek, szegély és vízelvezetés geometriája. |
| C7 Betonkeverék | `REQUIRES_ADDITIONAL_INPUT` — további user-receptadat, víz, adalékfrakció, hozam vagy helyi ár; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — recept- és szilárdsági minősítés. |
| C8 Betonacél rudak | `REQUIRES_ADDITIONAL_INPUT` — hajlított alak, vágási/horgonyzási hossz, anyagminőség és egységár; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — szerkezeti vasalási terv. |
| C9 Betonacél háló | `REQUIRES_ADDITIONAL_INPUT` — irányonként eltérő átmérő/osztás, átlapolás, réteg és kötés; `UNSUPPORTED_OR_ENGINEERING_REVIEW` — vasalási terv és lehorgonyzás. |
| C10 Derékszögű átló | `UNSUPPORTED_OR_ENGINEERING_REVIEW` — csak akkor, ha az átlót szerkezeti méretezésként vagy megfelelőségként kívánják használni. |

## Konzisztencia, adatvédelem és korlátozások

- A felületi eredménysorok a meglévő domain kimenetét jelenítik meg; a domain motorok függetlenek a Reacttől. A stair rajzok ugyanazon input-készletből szerkesztik a terv-/metszeti geometriát; a concrete rajzok az aktuális bemeneti méreteket használják.
- A kalkulátorok nem írnak adatbázisba. Szervezeti jogosultság, tartós snapshot és concurrency viselkedés ezért nem érintett és ehhez a változáshoz DB teszt nem releváns. Helyi böngészőben csak meglévő read-only DEMO szervezet kontextus volt nyitva; számítás nem mentődött.
- Domain fixture-ek nem eredményeznek statikai/építési megfelelőséget. Anyagár, gyártói adat, betonrecept, cölöptalp, tartóprofil és vasalási követelmény nincs kitalálva.
- A teljes projektszintű Vitest eredménye és a build/típus/lint/diff futási státusza a [TEST_MATRIX.md](TEST_MATRIX.md) F9.38 bejegyzésében van. `COMPLETE_WITHIN_VERIFIED_SCOPE` csak az ott körülhatárolt képlet- és bemenet-térre szól. Egyetlen kalkulátor sem kapott `UNSUPPORTED` teljes-kalkulátor státuszt, mert mind a 27-nek van számoló motorja és saját SVG-je; a hiányzó kimenetek kalkulátoronként felsorolva szerepelnek.

## F9.38.1 — Bemenetek egyszerűsítése és műszaki rajzok áttervezése

**Állapot:** `PARTIAL` — mind a 27 kalkulátor mezőkötelezettsége, rajzváltozata, értékjelmagyarázata és fő korlátja dokumentálva; a céltesztek, regresszió, teljes Vitest, typecheck, lint és build PASS. Egy helyi sötét témájú desktop smoke az S16 rajzát és számított legendáját igazolta. A kért 1440/1024/768/390/320 CSS-pixeles, két témás böngészőmátrixot a rendelkezésre álló natív böngészővezérlés nem tudta emulálni, ezért ezt nem jelölöm teljesítettnek.

Az alábbi tábla a korábbi F9.38 checklist aktuális input/rajz állapotát írja felül, és kalkulátoronként rögzíti a legszükségesebb mezőket, opcionális részleteket, igazolt eredményeket, ábrázolt geometriát és fennmaradó korlátot. A 27 sor a 17 lépcsővariánst, 9 beton/alapozási számítást és a C10 segédátlót fedi le; mind a 33 standalone kalkulátor megmaradt.

| ID | Kötelező alapbemenetek | Opcionális, részletes bemenetek | Igazolt eredmények és rajzi jelmagyarázat | Fennmaradó korlát |
|---|---|---|---|---|
| S1 | totalRiseMm, availableRunMm, riserCount | stairWidthMm a felülnézethez | Fellépő, belépő, fokszám, hajlás, geometriai ferde hossz és 2R+G; oldalnézet, megadott szélességnél terv | Pofafa, kivágás, anyag, fejmagasság és statika nincs. |
| S2 | totalRiseMm, availableRunMm, riserCount | stairWidthMm a tervnézethez | S1 közös egyenes geometriai eredménye; oldal- és opcionális tervnézet | A nyitott tartó fogazata és teherbírása nincs modellezve. |
| S3 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, firstFlightRiserCount, secondFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | 90° karok, fellépő/fokszám, futás, hajlás, befoglaló méret és felületek; tervrajz pihenővel | Csak ortogonális terv; nyíláskontúr, fejmagasság, tartó és statika nincs. |
| S4 | totalRiseMm, stairWidthMm, innerRadiusMm, lowerTreadCount, upperTreadCount, windersPerTurn, turnDirection | openingLengthMm, openingWidthMm | Járóvonali osztás, húrfokok, hajlás, tervfelület és kiterített geometria; fokpoligon-terv és profil | Egyenletes koncentrikus szögosztás; gyártás, ütközés, fejmagasság és statika nincs. |
| S5 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, landingGapMm, firstFlightRiserCount, secondFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | Fellépő/fokszám, két kar futása, tervkiterjedés és felületek; U-alakú terv | A karhézag kötelező, mert módosítja a tervet; tartó és fordulókapcsolat nincs. |
| S6 | totalRiseMm, stairWidthMm, innerRadiusMm, lowerTreadCount, upperTreadCount, windersPerTurn, turnDirection | openingLengthMm, openingWidthMm | S4 geometriai eredménye 180° fordulóhoz; U-alakú fokpoligon-terv és kiterített profil | Egyenletes koncentrikus kiosztás; pihenő, gyártási tartó és statika nincs. |
| S7 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, firstFlightRiserCount, secondFlightRiserCount, thirdFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | Három kar szintje/futása, pihenők, befoglaló méret, felületek és hajlás; háromkarú terv | Nyíláskontúr, fejmagasság, tartó és statika nincs. |
| S8 | totalRiseMm, stairWidthMm, innerRadiusMm, lowerTreadCount, middleTreadCount, upperTreadCount, windersPerTurn, turnDirection | openingLengthMm, openingWidthMm | Három kar, két forduló, járóvonal és fokpoligonok; alaprajz és kiterített profil | Két egyforma irányú/kiosztású forduló; tartó, gyártás és statika nincs. |
| S9 | totalRiseMm, outerDiameterMm, innerDiameterMm, turnDegrees, riserCount | nincs | Fellépő, fokszám, középvonal-sugár, fokonkénti belépő/szög, teljes ív és gyűrűfelület; terv és függőleges kiosztás | Teljes fordulási szög explicit, nincs 360° alapérték; oszlop, nyílás, fejmagasság és járhatóság nincs. |
| S10 | totalRiseMm, availableRunMm, riserCount | stairWidthMm a tervnézethez | S1 közös egyenes geometriai eredménye; oldalnézet és opcionális terv | Fémprofil, kötés, anyagmennyiség és statika nincs. |
| S11 | totalRiseMm, availableRunMm, riserCount | stairWidthMm a tervnézethez | S10 közös alapgeometriája; rajz a lépcsőkarra korlátozódik | A fűrészfogas tartóprofil és statika nincs modellezve. |
| S12 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, firstFlightRiserCount, secondFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | S3 közös 90°-os pihenős geometriai eredménye és tervrajza | Fém tartó/kapcsolat, fejmagasság és statika nincs. |
| S13 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, firstFlightRiserCount, secondFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | S12 közös geometriai eredménye; pihenős tervrajz | Zigzag tartóprofil, fémkapcsolat és statika nincs. |
| S14 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, landingGapMm, firstFlightRiserCount, secondFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | S5 közös U-alakú geometriai eredménye; hézagot mutató terv | A karhézag kötelező; fém tartó/kapcsolat és statika nincs. |
| S15 | totalRiseMm, stairWidthMm, goingMm, landingDepthMm, landingGapMm, firstFlightRiserCount, secondFlightRiserCount, turnDirection | openingLengthMm, openingWidthMm | S14 közös geometriai eredménye; U-alakú terv | Zigzag tartóprofil, fordulókapcsolat és statika nincs. |
| S16 | goingMm, riserHeightMm | nosingProjectionMm; üresen 0 mm vetületi többlet | Névleges átló, vágásvonal hajlása és vízszintes vetület; profilrajz | Fok-/lapvastagság kikerült, mert nem befolyásolta a képletet; kerf, illesztés és gyártási ráhagyás nincs. |
| S17 | totalRiseMm, availableRunMm, stairWidthMm, riserCount | nincs | Egyenletes fellépő/belépő, fokszám, ferde él és tömör lépcsőék térfogata; profilrajz | Pihenő, waist, vasalás, zsaluzat és statika nincs. |
| C1 | totalCenterlineLengthMm, widthMm, depthMm | nincs | Tengelyhosszból beton és kétoldali zsaluzat; egyenes kiterített terv és metszet, geometriai méretek a legendában | Nincs alapnyomvonal vagy csomóponti átfedés; mennyiség névleges összeg. |
| C2 | count, diameterMm, lengthMm | nincs | Hengercölöp egyedi/összes térfogata és felületei; darabszámot jelző terv és metszet | Nem téglalap talp, csoportkiosztás, vasalás vagy talajvizsgálat. Rajzon legfeljebb 12 elem látszik. |
| C3 | lengthMm, widthMm, thicknessMm | nincs | Beton, felület, kerület és élzsaluzat; terv és metszet | Téglalap, egyenletes vastagság; áttörés és vasalás nincs. |
| C4 | outerDiameterMm, wallThicknessMm, heightMm | nincs | Belső átmérő, beton/belső térfogat és geometriai felületek; gyűrűterv és metszet | Egységes gyűrűgeometria; termék, vasalás, emelés és statika nincs. |
| C5 | lengthMm, widthMm, tileLengthMm, tileWidthMm | baseLayerThicknessMm az alapréteg térfogatához | Felület, területarányos lapdarab és megadott alapréteg; terv, lapnézet és opcionális metszet | Nincs kiosztás, fugaszélesség, vágás vagy rendelési veszteség. |
| C6 | buildingLengthMm, buildingWidthMm, apronWidthMm | concreteThicknessMm, gravelThicknessMm a rétegtérfogathoz | Téglalap sávterület, külső méret/perem; tervrajz épületkontúrral, megadott réteghez metszet | Csak egyenletes sávú téglalap kontúr; lejtés/vízelvezetés nincs. |
| C7 | concreteVolumeM3, cementKgPerM3, cementRatio, sandRatio, aggregateRatio | bagWeightKg a cementzsákszámhoz | Megadott tömegarányokból komponens- és össztömeg; arányokat szemléltető sávok és hozzájuk tartozó legenda | Arányból nem lesz recept, szilárdság, vízigény vagy tényleges hozam. |
| C8 | barDiameterMm, cutLengthMm, pieceCount | steelDensityKgPerM3 a tömeghez | Darabszám, összhossz, acéltérfogat; tömeg csak megadott sűrűséggel; rúdsor és jelképes keresztmetszet | Nincs rejtett acélsűrűség; 12 felett rajzismétlés korlátozott, hajlítás/toldás nincs. |
| C9 | lengthMm, widthMm, coverMm, spacingMm, barDiameterMm | steelDensityKgPerM3 a tömeghez | Irányonkénti darabszám/hossz, tényleges osztás, metszések és térfogat; tömeg csak megadott sűrűséggel; rácsterv | Nincs rejtett acélsűrűség, átlapolás vagy szerkezeti vasalási terv; sűrű rács sematikusan ritkított. |
| C10 | lengthMm, widthMm | nincs | Derékszögű téglalap és számított átló; geometriai méretlegenda | Kitűzési segédgeometria, nem szerkezeti méretezés. |

### Közös rajzi és UX-szerződés

- A 27 fő technikai SVG-ben nincs látható szöveg vagy méretszám. A méretértékek közvetlenül a rajz alatt álló akadálymentes jelmagyarázatba kerültek; a nézethez nem tartozó tömeg- és betonvolumen kimenet az eredménypanelben marad.
- Kék jelöli a függőleges méretet/mélységet, narancs a vízszintes méretet/futást, zöld a lejtést/átlót, lila a különleges geometriát. A háló két rúdiránya pontozott és szaggatott vonalat kapott; a színekhez minta is társul.
- A rajzi méretvezérlők a megfelelő mezőre fókuszálnak; a közös rajznézet billentyűzetes zoomot, visszaállítást és nyilakkal mozgatást támogat, a pointer/touch pan és pinch kódútja megmaradt. A szöveg nélküli technikai SVG-k mellett képernyőolvasó által értelmezhető title/description és értékes jelmagyarázat áll.
- A jelmagyarázat rugalmas oszloprácsban jelenik meg, 390 px alatti szabálya egy oszlopba vált. Ez CSS- és komponensszintű implementációs tény; a kért viewportokon böngészőben nem futott vizuális próba.

### F9.38.1 bizonyíték

- Célzott regresszió: construction/domain, stair drawing coverage, rajz viewport és kalkulátor navigáció — **9 fájl / 145 teszt PASS**. A coverage teszt a 27 kalkulátor kötelező és opcionális mezőit, minden rajznézet szöveg nélküli SVG-jét, legendáját, geometriai értékeit, sűrűségi/default nélküli állapotát és a rajzi pattern-különbségeket ellenőrzi.
- Teljes Vitest, végső futás a rajzi legendakorrekció után: **141 fájl PASS, 9 skip; 718 teszt PASS, 27 skip (745 összes)**. Typecheck, lint és production build PASS; részletek [TEST_MATRIX F9.38.1](TEST_MATRIX.md).
- Böngésző: 2026-10-18-án meglévő helyi DEMO szervezet read-only felületén, sötét témájú desktop nézetben S16-ra 280/175 mm-et adtam meg. Opcionális orrkiülés nélkül sem lila rajzi szakasz, sem hozzá tartozó legendasor nem jelent meg. 30 mm opcionális kiülés megadásakor a vetület 310 mm, a ferde vágásvonal 355,985 mm lett; a rajzon lila szakasz és alatta a 30 mm-es legenda is látszott. Az SVG-ben nem volt látható méret- vagy magyarázó szöveg. Számítás nem mentődött.
- Nem futott: 1440/1024/768/390/320 CSS-pixeles böngészőmátrix, világos téma, fizikai mobil/touch, manuális screen-reader audit és minden egyes mező invalid-input browser próbája. A sötét téma aktuális állapotát nem változtattam meg.
- Nem releváns / nem érintett: adatbázis-, Auth/RLS-, szervezeti jogosultság-, snapshot- és konkurenciaviselkedés; nincs tartós adatírás vagy backend-módosítás. Commit, push, hosted módosítás és deploy nem történt.

Javasolt Conventional Commit: `feat(F9.38.1): simplify calculator inputs and redraw technical SVGs`.

## F9.38.2 — Reszponzív kalkulátorikonok

Státusz: **IMPLEMENTÁLVA ÉS A HELYI BÖNGÉSZŐS MÉRETMÁTRIXBAN ELLENŐRIZVE.**

- **Gyökérok:** az általános `.construction-suite-options button > svg` CSS-szabály 1rem-re (16 px) szorította a közös SVG-t desktopon. A mobil szabály ezt 2,5rem-re növelte, így a méretezés kategóriánként és töréspontonként eltért. A meglévő `64×54` viewBox a rajzot már megfelelően tartalmazta, ezért a kis méret oka a külső CSS-felülírás volt; a kisebb belső margójú viewBox a látható geometriát tovább növeli.
- **Módosítás:** a közös lista-ikon a sidebar oszlopszélességéhez igazodó 44–52 px szélességet kapott, `56:51` viewBox-aránnyal. A vonalstílus és eredeti SVG-geometria megmaradt, a viewBox `4 3 56 51` lett, így a szélső szakaszok nem vágódnak. A kártyamagasság legalább 62 px; mobilon a kategóriák gombja és a kiválasztó feliratai olvashatók maradtak.
- **Kategóriák:** roof 6/6, staircase 17/17, concrete/foundation 10/10 (9 betonreferencia és 1 átlósegéd) ugyanazt a komponenst és méretszabályt használja.
- **Böngésző:** helyi `/kalkulatorok` oldal, Chromium-alapú Codex in-app browser viewport emulációja. Mind a 15 kategória × szélesség kombináció (`3×5`) sötét és világos témában futott: 1440, 1024, 768, 390 és 320 CSS px. Mért SVG-szélesség sorrendben: 52, 45,6, 45,6, 46,8 és 44 px; mindenhol 1,10 tényleges szélesség/magasság arány. A kártyák minimum 62 px magasak, a mobil váltógomb 60 px, a kategóriafülek 46 px. A feliratok nem lógtak ki, és a dokumentum vízszintes túlcsordulása mind a 30 kombinációban hamis volt. A 1440 és 320 px kategóriaképernyők mindkét témában szemrevételezve; torzulás vagy SVG-vágás nem látszott.
- **Ellenőrzések:** a célzott thumbnail teszt, typecheck, lint, production build és `git diff --check` végleges eredménye a [F9.38.2 tesztmátrixban](TEST_MATRIX.md#f9382--kalkulatorikonok-es-reszponziv-valaszto) szerepel.
- **Korlátok és adatkonzisztencia:** fizikai mobilérintést, pinch-zoomot és képernyőolvasós manuális auditot nem futtattam. Az SVG-ket eredeti komponensekből használja újra; domain-/alkalmazási motor, tartós adat, DB/Auth/RLS, szervezeti jogosultság és business workflow nem változott.

Javasolt Conventional Commit: `fix(F9.38.2): enlarge responsive calculator selector icons`.

## F9.38.3 — Profi kalkulátorválasztó-ikonok

Státusz: **IMPLEMENTÁLVA ÉS HELYI BÖNGÉSZŐBEN ELLENŐRIZVE; fizikai mobil- és képernyőolvasó-teszt nélkül.**

- **Korábbi állapot:** a tető-, lépcső- és beton/alapozás-választó egyetlen közös SVG-komponensből épült. A F9.38.2-ben beállított, aránytartó 44–52 px-es méretezés a kis, sematikus geometriát is csak felnagyította; a tetőtípusok, fa/fém lépcsők, pihenő/húzott fokok, fordulók és alapozási variánsok több esetben nehezen különültek el.
- **Új SVG-k:** a [construction-thumbnails.tsx](../src/features/calculators/construction-thumbnails.tsx) fájlban a közös komponens megőrzi a katalógus-ID-kat, és mind a 33 tételhez saját, könnyű vektoros illusztrációt készít. A 56×51 viewBox és az explicit `xMidYMid meet` aránytartó illesztés közös maradt; a tényleges rajzelemek a megadott kereten belül vannak. A témafüggő kitöltések TetőPro-paletta-tokenekből épülnek, SVG-szűrő és külső asset nélkül.
- **Tetők (6):** nyeregtető, félnyeregtető, manzárd- és kontytető térbeli síkjai megkülönböztethetők; a szarufán vágási/irányjelölés, a háromszögű faszerkezetnél övrudak, rácsrudak és kötőlemezek jelennek meg.
- **Lépcsők (17):** külön rajz tartozik az egyenes nyitott/zárt tartóhoz, a 90°/180°-os pihenős és húzott fordulókhoz, a háromkarú változatokhoz, csigalépcsőhöz, fűrészfogas fém tartókhoz, ferde lépcsőelemhez és betonlépcsőhöz. A fa és acél felületek eltérő kék/lila, illetve fa/narancs árnyalatot és körvonalat kapnak.
- **Beton/alapozás (10):** sávalap, cölöp, lemez, betongyűrű, térburkolat, épület körüli beton sáv, keverő, betonacél, hegesztett háló és derékszögű átló saját formával jelenik meg; a föld, beton, betonacél és kiegészítő geometria eltérő színt kap.
- **Böngészős kiválasztás:** a helyi `/kalkulatorok` oldalon mind a 33 opciót egyenként kiválasztottam 1440 px-en világos és sötét témában. Mind a 66 esetben az ikon `data-calculator-icon` ID-je, az egyetlen aktív `aria-pressed` gomb és a kalkulátor címe egyezett.
- **Reszponzív ellenőrzés:** a Chromium-alapú Codex in-app browserben mindhárom kategóriát és mindkét témát ellenőriztem 1440/1024/768/390/320 CSS px szélességeken. Ez összesen 30 kategória×viewport×téma mérés; mindegyikben 6/17/10 külön ikon jelent meg. Az ikonkeretek szélessége 52/45,6/45,6/46,8/44 px, aránytartási eltérésük legfeljebb 0,0002. A rajzelemek tényleges böngésző-befoglaló téglalapja a bélyegkép keretén belül maradt; a címkék nem lógtak ki, a dokumentum vízszintes túlcsordulása mind a 30 esetben nulla volt, az opciókártyák legalább 61,6 px, a mobilváltó 59,2 px, a kategóriafülek legalább 46,4 px magasak voltak. A képernyőképeket mindhárom kategóriánál 1440, 768, 390 és 320 px-en, mindkét témában áttekintettem. A 1024 px-es nézetet DOM-méréssel ellenőriztem.
- **Teszt és build:** `npx vitest run src/features/calculators/construction-thumbnails.test.tsx src/features/calculators/calculator-navigation.test.ts --reporter=dot` — 2 fájl / 5 teszt PASS; `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS, Next.js 16.4.0 webpack, 30 statikus oldal. A végső whitespace-check eredménye a [tesztmátrixban](TEST_MATRIX.md#f9383--profi-kalkulatorvalaszto-ikonok) szerepel.
- **Korlátok és adatkonzisztencia:** fizikai telefonos érintést, pinch-zoomot és screen reader auditot nem végeztem. Az ikonok sematikus választó-illusztrációk, nem gyártási vagy statikai tervek. A kalkulátor-katalógus, kereső, kiválasztó viselkedés, domain motor, üzleti folyamat, Auth, szervezeti jogosultság, adatbázis és tartós adat nem változott.

Javasolt Conventional Commit: `feat(F9.38.3): redesign calculator selector SVG icons`.

## F9.38.4 — Prémium minimalista műszaki ikonfinomítás

Státusz: **COMPLETE A KÉRT KÓD-, AUTOMATIZÁLT ÉS EMULÁLT BÖNGÉSZŐS HATÁRON; fizikai mobil és képernyőolvasó nélkül.**

- **Dizájnrendszer:** mind a 33 SVG egy közös „Premium Minimal Technical 2.5D” nyelvet használ. A fő kontúr világos témában grafit, sötét témában lágy világosszürke; a másodlagos sík semleges felületkitöltés. A TetőPro meleg narancs csak gerincet, menetirányt, vágási élt vagy fontos szerkezeti élt emel ki. Nincs zöld, türkiz, lila, gradiens, glow, filter, Canvas vagy új grafikai függőség.
- **Tetők (6/6):** a négy tetőforma kevés, nagy tetősíkkal és eltérő gerinc/él sziluettel jelenik meg. A szarufa egy gerendát és vágási helyet, a háromszögű tartó a külső övet és a szükséges rácsvonalakat mutatja.
- **Lépcsők (17/17):** a 90°-os, 180°-os és háromkarú változatok tiszta alaprajzi L/U/háromkarú formák. A pihenő tömör semleges mező, a húzott forduló osztott háromszög/fan; az egyenes zárt, nyitott, fém, fűrészfogas, csiga-, ferde elem- és betonlépcső eltérő profilú. A fém tartók kettős/csomópontos vagy szaggatott külső szerkezeti jelet kapnak, további szín nélkül.
- **Beton/alapozás (10/10):** a sávalap, cölöpök, alaplemez, gyűrű, burkolat, épület körüli sáv, keverőedény, bordás rudak, ortogonális háló és derékszögű háromszög egyszerűsített, de különálló sziluett.
- **Konzisztencia:** az ideiglenes összehasonlító lapon 48 és 64 px-en, mindkét témában mind a 33 ikon egymás mellett szerepelt. A finomítás után a rajzok közös kontúrvastagságot, lekerekített vonalvéget és 56×51 artboardot használnak; a látható geometria vízszintesen 71–91%-ot foglal.
- **Desktop/mobil:** a helyi /kalkulatorok oldalon 1440, 768, 390 és 320 px-en, mindhárom kategóriában és mindkét témában 24 DOM-mérés futott. Nincs klippelés, torzulás vagy vízszintes overflow; az ikon 52/45,6/46,8/44 px, a kártya legalább 61,6 px, a mobilváltó 59,2 px, a kategóriafül legalább 46,4 px. Tényleges képernyőképet 1440 és 320 px-en mindhárom kategóriánál, 768 és 390 px-en reprezentatív kategóriáknál ellenőriztem mindkét témában.
- **Tesztek:** fókuszált Vitest 2 fájl / 5 teszt PASS; typecheck PASS; lint PASS; production build PASS (Next.js 16.4.0 webpack, 30 statikus oldal); végső git diff --check PASS.
- **Korlátok:** fizikai telefon/tablet, touch/pinch és manuális screen-reader audit nem futott. A böngésző viewport-emulációja valódi renderellenőrzés, de nem fizikai eszközteszt. A számítások, üzleti adatok, perzisztencia, Auth/RLS és adatbázis változatlanok.

Javasolt Conventional Commit: `refactor(F9.38.4): refine calculator icons into minimal two-tone system`.
