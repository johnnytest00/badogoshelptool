# F9.50.1 — Kalkulátor input/output felelősségi audit

## Hatókör és bizonyíték

Ez a dokumentum célzott felelősségi audit, nem új kalkulációs motor és nem UI-redesign.
Az ellenőrzés elsődleges bizonyítéka a jelenlegi forráskód, a Zod-sémák, a katalógus és a meglévő dokumentáció.

- Vizsgált katalógus: `src/domain/calculations/construction/catalog.ts`.
- Vizsgált UI és mezőszerződés: `src/features/calculators/construction-suite.tsx`.
- Vizsgált tetőmotorok: `src/domain/calculations/roof-geometry.ts`, `roof-material-takeoff.ts`, `roof-timber-layout.ts`, `roof-underlay.ts`, `roof-covering-parameters.ts`, `roof-covering-layout.ts`.
- Vizsgált lépcső- és betonmotorok: `src/domain/calculations/construction/stairs.ts`, `winder-stairs.ts`, `concrete.ts`.
- A katalógusban 31 aktív, `verified` státuszú hivatkozás van: 4 tető, 17 lépcső, 10 beton, 1 segédprogram.
- A `verified` katalógusstátusz jelenleg azt bizonyítja, hogy van hozzárendelt definíció/motor; nem bizonyít teljes Zhitov-paritást, gyártói adatot vagy szerkezeti megfelelőséget.

Az aktuális körben hitelesített böngészős szervezeti munkamenet nem állt rendelkezésre. A `/kalkulatorok` oldal a `getProjectOrganization()` eredményétől függ, és szervezet nélkül üres, hozzáférési vagy szervezetválasztó állapotot ad. Ezért a lentiek kód- és séma-alapú megállapítások; a mezők tényleges vizuális sorrendje, fókusza és képernyőn megjelenő szövege nem minősül böngészőben bizonyítottnak.

## 1. Vezetői összefoglaló

1. A rendszer valóban feladat-alapú: a tetőformák a `roof.material-takeoff` és `roof.timber-cutlist` feladatokon belül választók, nem külön katalógusfeladatok. Ez jó irány, de a fő űrlap szerződése és a külön faanyag/alátét panelek szerződése jelenleg nincs egyetlen, explicit eredményobjektumba összekötve.
2. A geometriai felelősség többnyire helyes: a meredekség, lejtőhossz, síkterület, darabszám és kiosztás számított érték. A felület nem kér be olyan lejtőhosszt, amelyet a geometria már meghatároz.
3. A legnagyobb felelősségi rés a termék- és gyártói adat: fedés, alátétfólia, faanyag-keresztmetszet, burkolólap-méret és acélsűrűség kézzel írható, miközben ezeknek termék-/katalógusforrásból, forrás-pillanatképpel és egyértelmű expert override-dal kellene érkezniük.
4. A `roof.material-takeoff` eredményei jelenleg szándékosan geometriai elrendezésként és feltételes becslésként jelennek meg, nem igazolt beszerzési mennyiségként. Ez helyes biztonsági határ; ezt a határt nem szabad később elveszíteni.
5. A `roof.timber-cutlist` definíciójának `calculate: () => []` visszatérése és a külön `RoofTimberQuantityPanel` közötti eltérés architekturális hibakockázat: a katalóguscím vágáslistát ígér, miközben a fő kalkulátor-kontraktus üres sort ad.
6. Nincs bizonyított P0 numerikus hiba ebben az auditban. P1 szintű szerződés-, forrás- és összekapcsolási hiányok azonban fennállnak; ezek javítása szükséges, mielőtt a mennyiségek beszerzési vagy szakmai tervként kommunikálhatók.

## 2. Aktuális kalkulátorinventár

| Csoport | Aktív azonosítók | Jelenlegi motor-/UI-minta |
|---|---|---|
| Tető | `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members` | Közös tetőgeometria; a material-takeoff külön faanyag-, alátét- és fedésblokkal egészül ki |
| Fa lépcső | `stair.wood.closed_straight`, `stair.wood.open_straight`, `stair.wood.90_landing`, `stair.wood.90_winder`, `stair.wood.180_landing`, `stair.wood.180_winder`, `stair.wood.three_landing`, `stair.wood.three_winder`, `stair.wood.spiral` | Több azonos mezőszerződésű template, külön egyenes/pihenős/húzottfokos/spirál motor |
| Fém lépcső | `stair.metal.straight`, `stair.metal.zigzag`, `stair.metal.90_landing`, `stair.metal.90_zigzag`, `stair.metal.180_landing`, `stair.metal.180_zigzag` | A jelenlegi mezők és geometria nagyrészt a fa/pihenős template-ek újrahasznosítása |
| Lépcső segéd | `stair.beveled_riser`, `stair.concrete_straight` | Ferde elem, illetve tömör betonék geometriája |
| Beton | `concrete.strip`, `pile`, `slab`, `ring`, `paving`, `blind_area`, `mix`, `rebar`, `mesh` | Külön, képletezett geometriai/tömeg-becslések |
| Segéd | `aux.diagonal` | Pitagorasz- és szögszámítás |

A generált definíciók miatt több katalógusbejegyzés ugyanazt a mezőkészletet és motort használja. Ez elfogadható geometriai alapként, de a címben szereplő anyag- vagy gyártási jelentést nem szabad a megosztott geometriai motorból levezetettnek tekinteni.

## 3. Mezőszintű felelősségi mátrix

### 3.1. Tetőmezők — közös `roof.material-takeoff` és `roof.timber-cutlist`

Jelölések: **U** = felhasználói bemenet, **A** = automatikus kimenet, **I** = örökölt/importált érték, **P** = termék-/katalógusadat, **O** = opcionális expert override, **C** = feltételes, **R** = redundáns vagy rossz helyen kezelt.

| Mező | Jelenlegi besorolás | Feltétel és audit-megállapítás |
|---|---|---|
| `roofShape` / Tetőforma | U, C | Választó: nyeregtető, félnyeregtető, konty, sátor, félkonty, L, T, manzárd. Nem öröklődik automatikusan felmérésből. |
| `sideMm` / Négyzet oldalhossza | U, C | Csak `pyramid`; a sátortető alapnégyzete. |
| `lengthMm` / Tető hossza | U, C | A kiválasztott téglalap/L/T/manzárd geometria vízszintes hossza. Nem lejtőhossz. |
| `widthMm` / Tető szélessége | U, C | Vízszintes fesztáv/szélesség. Nem szabad kész lejtőhosszként kezelni. |
| `pitchDegrees` / Tetőhajlás | U, C | A motorból származó lejtőhossz és terület alapja; nem szabad visszakérni az abból számítható hosszt. |
| `lowerRunMm`, `lowerRiseMm`, `upperRiseMm` | U, C | Csak manzárd; két tetőszakasz explicit geometriája. Nincs automatikus statikai vagy break-edge ellenőrzés. |
| `eaveOverhangMm` / Ereszkiülés | U, C, default 0 | Nyereg/félnyereg lejtésirányú, vízszintes vetületi kiülés. A 0 alapérték csak kifejezett „nincs kiülés” értékként biztonságos. |
| `hipEaveHeightMm` | U, C | Félkonty külön magassági paramétere; hiány esetén a motor nem pótolja nullával. |
| `wingWidthMm`, `wingProjectionMm` | U, C | L/T szárnyparaméterek; átfedési/kompatibilitási szabályokat a geometria validálja, nem a UI. |
| `nominalWidthMm` | O/P | Fedőtábla gyártói névleges szélesség. Nem felhasználói geometria; termékválasztásból vagy forrásolt override-ból kellene jönnie. |
| `effectiveCoveringWidthMm` | O/P, C | A darabszám és oszlopkiosztás kritikus gyártói adata. Forrás nélkül `INCOMPLETE` marad. |
| `physicalLengthMm` | O/P | Tábla fizikai hossza; jelenleg csak kézzel megadható paraméter. |
| `usableCoveringLengthMm` | O/P, C | Átlapolással/gyártói megkötéssel használható hossz. Nem vezethető le biztonságosan csak hajlásszögből. |
| `manufacturerConstraintReference` | P | Szöveges forrásazonosító; jelenleg nem termékazonosító és nem immutábilis termék-pillanatkép. |

**Hiányzó vagy explicit döntést igénylő tetőmezők:** a nyeregtető motor ismeri a `frontGableOverhangMm` és `rearGableOverhangMm` értéket, de a material-takeoff UI ezeket jelenleg 0-ra hardcode-olja a `roofGeometryInputFor()` függvényben. Ha a feladat hatókörébe tartozik a homlokzati túlnyúlás, ez hiányzó input; ha nem, a kizárást a felületen és az eredményben kell kimondani. Félnyeregnél a motor csak az alacsony oldali ereszkiülést modellezi; magas oldali kiülést nem szabad hallgatólagosan azonosnak venni.

### 3.2. Tető faanyag, alátét és fedés — külön panelek

| Panel | Mezők | Felelősség |
|---|---|---|
| `RoofTimberQuantityPanel` | `rafterMaxSpacingMm`, `rafterStartInsetMm`, `rafterEndInsetMm`, `rafterSectionWidthMm`, `rafterSectionHeightMm`; ugyanez `batten*` néven | A maximális osztás és kezdő/véginset tervezési/kiosztási input. A keresztmetszet faanyag-/katalógusadat vagy expert override. A darabszám, elemenkénti geometriai hossz, összhossz és nominális térfogat automatikus. Nem vágási hulladék, stock-optimalizálás vagy statika. |
| `RoofUnderlayQuantityPanel` | `rollWidthMm`, `rollLengthMm`, `sideOverlapMm`, `endOverlapMm`, `installationDirection` | Tekercs- és átlapolási termék-/kivitelezési input. Kurzus-, darab-, blank terület- és korlátozott 1D tekercsszám automatikus. Nem teljes beszerzési mennyiség, nincs áttörés/flashing/waste. |
| `coveringProductInputFor()` | `effectiveCoveringWidthMm`, `usableCoveringLengthMm`, fizikai/névleges adatok, forrás | Gyártói termékszerződés kellene; jelenleg szabad szám- és szövegmező. A `calculateRoofCoveringLayout()` csak sheet-layoutot számít, és `INCOMPLETE` marad hiányzó kritikus adatoknál. |

Jelenleg a fő `CalculatorDefinition.fields` szerződés csak a geometriai és fedési alapmezőket tartalmazza; a faanyag- és alátétparaméterek külön React-state/panel szerződésben élnek. Ez a felhasználó számára egy folyamatnak látszik, a domain számára azonban több, lazán összekapcsolt részfolyamat.

### 3.3. Lépcsők — minden aktív azonosító és közös mezőszerződés

| Aktív azonosítók | Közös bemenetek | Automatikus eredmények | Audit-besorolás |
|---|---|---|---|
| `stair.wood.closed_straight`, `stair.wood.open_straight`, `stair.metal.straight`, `stair.metal.zigzag` | `totalRiseMm`, `availableRunMm`, `riserCount`; opcionális `stairWidthMm` csak rajzhoz | fellépőmagasság, fokszám, belépő, geometriai pofafa/tartóhossz, hajlás, `2R+G` | A három alapméret U; szélesség C/O. A fém/nyitott/fűrészfogas cím nem bizonyít gyártási vagy statikai számítást. |
| `stair.wood.90_landing`, `stair.metal.90_landing`, `stair.metal.90_zigzag` | `totalRiseMm`, `stairWidthMm`, `goingMm`, első/második kar fellépésszáma, `landingDepthMm`, `turnDirection`; opcionális ellenőrző nyílásméretek | karonkénti fok- és fellépőgeometria, pihenő, tervméret, hajlás | U/C. A nyílásméretek ellenőrző inputok, nem a fő geometria forrásai. A zigzag-tartó nincs modellezve. |
| `stair.wood.180_landing`, `stair.metal.180_landing`, `stair.metal.180_zigzag` | A fenti kétkaros mezők + `landingGapMm` | visszatérő karok, hézag, pihenő és összgeometria | U/C; a fém tartószerkezet és kapcsolatok hiányoznak. |
| `stair.wood.three_landing` | `totalRiseMm`, szélesség, belépő, pihenőmélység, fordulás, első/második/harmadik kar fellépésszáma; opcionális nyílásméretek | három kar és két pihenő geometriai ellenőrzése | U/C; ortogonális alaprajz, nem szerkezeti terv. |
| `stair.wood.90_winder`, `stair.wood.180_winder`, `stair.wood.three_winder` | `totalRiseMm`, `stairWidthMm`, `innerRadiusMm`, alsó/középső/felső fokszám, `windersPerTurn`, `turnDirection`; opcionális nyílásméretek | koncentrikus húzottfokok, járóvonal, fokszögek és átfedési ellenőrzés | U/C. A középső kar csak háromkarú esetben értelmezett; a húrközelítés nem gyártási rajz. |
| `stair.wood.spiral` | `totalRiseMm`, `outerDiameterMm`, `innerDiameterMm`, `turnDegrees`, `riserCount` | járóvonal-sugár és -ívhossz, fokszög, fokszám, fellépő, kiterített hajlás, alaprajzi terület | U/C; központi oszlop, kivágás, fejmagasság és statika hiányzik. |
| `stair.beveled_riser` | `goingMm`, `riserHeightMm`; opcionális `nosingProjectionMm` | vízszintes vetület, átló, ferde elem- és vágásszög | U/C/O; illesztési és megmunkálási ráhagyás nincs. |
| `stair.concrete_straight` | `totalRiseMm`, `availableRunMm`, `stairWidthMm`, `riserCount` | tömör betonlépcsőék geometriai térfogata | U; pihenő, vasalás, zsaluzat, statika nincs. |

Ezeknél a motorok következetesen számított értéket adnak vissza, de az anyag- és gyártási címkék több helyen csak template-szövegek. A „fém” vagy „zárt/nyitott” választó nem változtatja meg automatikusan a tartó-keresztmetszetet, kapcsolati részleteket vagy anyaglistát.

### 3.4. Beton és segédprogramok

| Azonosító | Felhasználói mezők | Automatikus eredmények | Felelősségi megjegyzés |
|---|---|---|---|
| `concrete.strip` | `totalCenterlineLengthMm`, `widthMm`, `depthMm` | beton m³, kétoldali zsaluzat m², névleges alapfelület | A tengelyhossz előre összesített U; a motor nem bont szakaszokra és nem számol vasalást. |
| `concrete.pile` | `count`, `diameterMm`, `lengthMm` | egy/összes cölöptérfogat, palást- és alapfelület | Egyenes henger; talpbővítés és teherbírás nincs. |
| `concrete.slab` | `lengthMm`, `widthMm`, `thicknessMm` | térfogat, élzsaluzat/alapterület | Egyenletes téglalap-lemez; talaj és vasalás nincs. |
| `concrete.ring` | `outerDiameterMm`, `wallThicknessMm`, `heightMm` | belső átmérő/térfogat, beton és belső térfogat | A belső átmérő számított, nem bemenet; pozitív falvastagság és geometriai ellenőrzés szükséges. |
| `concrete.paving` | épület `lengthMm`, `widthMm`, lap `tileLengthMm`, `tileWidthMm`; opcionális `baseLayerThicknessMm` | terület és felfelé kerekített lapdarabszám | A lapméret termékadat, jelenleg kézzel ismételt U; vágás, hézag, minta és veszteség nincs. Az alapréteg nincs bekötve teljes mennyiségi motorba. |
| `concrete.blind_area` | `buildingLengthMm`, `buildingWidthMm`, `apronWidthMm`; opcionális `concreteThicknessMm`, `gravelThicknessMm` | külső/belső terület, beton és kavics térfogat | Téglalap épület körüli sáv; lejtés, dilatáció, vízelvezetés és tetszőleges alaprajz nincs. |
| `concrete.mix` | `concreteVolumeM3`, `cementKgPerM3`, `cementRatio`, `sandRatio`, `aggregateRatio`; opcionális `bagWeightKg` | cement/homok/adalék tömeg és zsákszám | Receptet nem ajánl, hanem U által megadott receptet számol. A cementtípus és receptforrás nincs bekötve. |
| `concrete.rebar` | `barDiameterMm`, `cutLengthMm`, `pieceCount`; opcionális `steelDensityKgPerM3` | összhossz, keresztmetszet és tömeg | A sűrűség P/C érték kellene, nem szabad ismeretlen minőségként kezelni; nincs hajlítás/átlapolás/lehorgonyzás. |
| `concrete.mesh` | `lengthMm`, `widthMm`, `coverMm`, `spacingMm`, `barDiameterMm`; opcionális acélsűrűség | két irányú rúdszám, összhossz, tényleges osztás, keresztezés, geometriai tömeg | A cover/osztás/rúdátmérő tervezési U; sűrűség P/C. Szerkezeti hálóterv és átlapolás nincs. |
| `aux.diagonal` | `lengthMm`, `widthMm` | átló és alapirányú szög | Tiszta geometriai segédprogram, nincs rejtett anyagjelentés. |

## 4. Részletes `roof.material-takeoff` audit

### 4.1. Geometria

`roofGeometryInputFor()` a választott formát a közös `calculateExistingRoofGeometry()` motorba fordítja. A méretmezők vízszintes vetületi méretek; a lejtőhossz, síkterület, élhosszak és alakzati részterületek számítottak. Ez a felelősségi felosztás helyes.

- Nyereg: a material-takeoff jelenleg `frontGableOverhangMm: 0` és `rearGableOverhangMm: 0` értéket ad; ezek nem szerkeszthető inputok.
- Félnyereg: az `eaveOverhangMm` csak az alacsony oldali eresz felé hosszabbítja a síkot. Egyenlő magas oldali túlnyúlás nincs bizonyítva.
- Konty/sátor/félkonty/L/T/manzárd: a motor validálja a saját formai határokat, de az eredmény nem jelent statikai vagy kivitelezési tervet.
- A hiányzó input nem változik automatikusan nullává: a Zod-sémák és a státuszok `INCOMPLETE`/`INVALID` értéket adhatnak.

### 4.2. Szarufa és léc

A `calculateRoofTimberLayout()` a geometriai síkok alapján maximális osztásból, kezdő/véginsetből és opcionális keresztmetszetből számít. A kimenet: pozíciók/darabszám, geometriából adott hosszok, összhossz és — két keresztmetszeti méret esetén — nominális térfogat.

Ez nem azonos a megvásárolható szálhosszal vagy vágás-optimalizálással. A kimeneti címkének és minden downstream listának meg kell tartania a `geometric`/`nominal` jelölést; vágási ráhagyás, toldás, rögzítési csomópont, szálkiosztás és statika nincs.

### 4.3. Alátét

A `calculateRoofUnderlayLayout()` tekercsszélesség/hossz, oldalsó és végi átlapolás, valamint fektetési irány alapján kurzusokat, darabokat és blank területet számol. A kód explicit státuszokat használ; a konty, L/T és más nem támogatott geometria nem kaphat hamis valid mennyiséget.

Az alátét tekercsparaméterei termék- és szerelési adatok. Ezekből a motor nem tud önállóan gyártói ajánlást, áttörési tartalékot vagy teljes beszerzési mennyiséget következtetni.

### 4.4. Fedés

A `calculateRoofCoveringLayout()` ebben a feladatban sheet-formát támogat. Kötelező a hasznos fedési szélesség, használható fedési hossz és gyártói forrás; hiány esetén `INCOMPLETE`. A darabszám teljes szélességű oszlopok és a mért lejtőhossz alapján készül.

Kimenetei: fedőtábla-darabszám, oszlopszám és névleges megvásárolt táblafelület. Ez geometriai elrendezési mennyiség, nem gyártói alkalmassági, hulladék-, szegély-, vápás-, élgerinc-, áttörés- vagy villámvédelmi lista. A jelenlegi megfogalmazás ezt helyesen jelzi; automatikus „verified procurement” státusz nem adható.

### 4.5. Input-output és státuszkapcsolat

Jelenlegi lánc: `Field` parsing → `roofGeometryInputFor()` → geometria → opcionális faanyag/alátét/fedés panel → eredménypanelek. A fő `CalculatorDefinition.calculate()` csak fedési sorokat ad vissza; a faanyag és alátét külön UI-számításból kerül a munkaterületre. A lánc használható, de nem egyetlen domain aggregate.

`RoofMaterialTakeoffSummary` már aggregate-státuszokat és geometriai korlátozásokat közöl. A következő szerződésnek ezt formalizálnia kell: minden rész-eredményhez input-snapshot, státusz, forrás/provenance és `quantityMeaning` (geometric/layout/procurement) tartozzon.

## 5. Mi számít helytelen, redundáns vagy hiányzó inputnak?

### Megerősített felelősségi hibák

1. **Termékadat kézi ismétlése:** a fedőtábla méretei és forrása, az alátét tekercsadatai, valamint több faanyag-/acélparaméter szabad mezőként jelenik meg. Ezek nem tisztán geometriai U-k.
2. **Szerződés-szétválás:** a `roof.timber-cutlist` katalógusdefiníciója üres `ResultLine[]`-et ad, miközben a panelben létezik a tényleges faanyag-kimenet. A felhasználó ugyanazt a funkciót két eltérő output-contractként kapja.
3. **Hiányzó nyeregtető túlnyúlás:** a gable motor által támogatott homlokzati túlnyúlás a material-takeoff-ban hardcoded 0. Ez vagy hiányzó input, vagy dokumentálandó hatókör-korlát.
4. **Nincs explicit öröklés/import:** a kalkulátor nem kap felmérési/revíziós forrást és nem jelöli, mely geometria örökölt és melyik kézzel felülírt. Ez nem teszi hibássá a standalone kalkulátort, de növeli az ismételt adatbevitel és inkonzisztencia kockázatát.

### Nem hibás, de nem szabad automatikussá tenni

- Tetőhajlás, fesztáv, hossz, szárnyparaméterek: ezek tényleges geometriai U-k.
- Szarufa/léc maximális osztása és kezdő/véginset: kivitelezési vagy tervezési input; nem biztonságos tetőformából kitalálni.
- Beton vasalási osztás, fedés, rúdátmérő, lépcső fokszám: tervezési/specifikációs inputok.
- Lépcső nyílásmérete: ellenőrző/conditional input, nem redundáns, de világosan meg kell különböztetni a fő geometriai méretektől.

### Hiányzó lényegi döntési mezők

- termékazonosító és gyártói specifikáció-pillanatkép;
- felmérés/revízió kiválasztott forrása és override-szabálya;
- gable homlokzati túlnyúlás (ha scope-ban marad);
- fedés/alátét esetén a támogatott formai korlátok felhasználói szintű jelzése;
- anyaglistába továbbítható mennyiség jelentése: geometriai becslés vagy beszerzési mennyiség.

## 6. Automatikusan számítható eredmények

| Tartomány | Automatikusan számítható eredmények |
|---|---|
| Tetőgeometria | síkhosszok, lejtőhosszok, területek, élek, hajlásszögből adódó vetületek, formai státuszok |
| Szarufa/léc | kiosztási pozíciók, darabszám, geometriai elemenkénti hossz, összhossz, opcionális nominális térfogat |
| Alátét | kurzusok, darabok, átlapolás utáni blank terület, korlátozott tekercsszám |
| Fedés | teljes szélességű táblaoszlopok, darabszám, névleges táblafelület; csak forrásolt kritikus termékadat mellett |
| Egyenes lépcső | fellépő, belépő, fokszám, geometriai tartóhossz, hajlás, kényelmi mutató |
| Pihenős/húzott/spirál lépcső | kar-, pihenő-, járóvonal-, fok- és alaprajzi geometria, átfedési/nyílás-ellenőrzés |
| Beton | geometriai térfogat, felület, rúd-/háló-darabszám, összhossz, tömeg a megadott sűrűséggel, betonkeverék tömege |

Egyetlen felsorolt eredmény sem válhat automatikusan szerkezeti megfelelőségi vagy gyártási igazolássá. A motorok korlátozásai a katalógus `limitation` mezőiben és a UI-notes-ban jelenleg többnyire szerepelnek.

## 7. Termék-, katalógus- és gyártói adatok

Első osztályú termékforrásként kellene kezelni:

1. fedőtábla névleges/hasznos szélességét, fizikai/használható hosszát, átlapolását, minimum/maximum hosszát és gyártói forrását;
2. alátéttekercs szélességét/hosszát, átlapolási szabályait és fektetési irányát;
3. faanyag-keresztmetszetet, esetleges kapható szálhosszt és minőséget;
4. burkolólap névleges méretét, hézagát, gyártói vágási/veszteségi adatát;
5. betonacél/háló sűrűségét és termék-specifikus méreteit;
6. cement/adalék receptforrását, ha a mix-kalkulátor a kézi recipe-számításnál többet kíván.

A felhasználói expert override megengedhető, de kötelező hozzá:

- explicit „kézi felülírás” jelölés;
- forrás- vagy megjegyzésmező;
- mentett input-snapshot;
- a kimenet státuszának `calculated-with-override`/hasonló megkülönböztetése;
- a későbbi termékváltozáskor az immutábilis régi snapshot megőrzése.

## 8. Ideális workflow és függőségi modell

1. **Forrás kiválasztása:** standalone kézi méret vagy opcionális felmérés/revízió. Az importált snapshot látható, nem írható át csendben.
2. **Tetőforma és geometria:** csak az adott forma mezői jelennek meg; a vízszintes vetületek és túlnyúlások egyértelműen feliratozva.
3. **Geometriai eredmény:** síkok, lejtőhosszok és területek külön kimeneti csoportban, `VALID/INCOMPLETE/INVALID/UNSUPPORTED` státusszal.
4. **Szarufa/léc konfiguráció:** spacing/inset tervezési input; keresztmetszet választott faanyagból vagy jelölt expert override-ból.
5. **Alátét/fedés termék:** termékválasztás → immutable product snapshot → számítás; hiányzó gyártói adat csak explicit incomplete állapotot adhat.
6. **Összesített eredmény:** minden soron mennyiségi jelentés (`geometric`, `layout`, `nominal`, `procurement`), forrás, státusz és korlátozás.
7. **Továbbítás:** anyaglista/árajánlat csak olyan eredményt fogadjon, amelynek source revision, provenance és quantity semantics rögzített; geometriai becslés ne menjen át csendben beszerzési mennyiségként.
8. **Mentés:** a teljes input- és termék-snapshot legyen immutable; módosítás új számítás/revízió, nem meglévő kimenet felülírása.

## 9. Prioritásos javaslatok

### P0 — jelen auditban nincs bizonyított P0

Nincs reprodukált helytelen numerikus eredmény vagy adatvesztés a vizsgált forrásban. P0-kockázattá válna, ha egy későbbi downstream integráció a jelenlegi geometriai `totalSheetCount`, nominális térfogat vagy alátét-darabszámot gyártói/beszerzési mennyiségként, forrás nélkül mentené.

### P1 — funkcionális és adat-szerződés

1. **Egyesített tető-takeoff aggregate.**
   - **Hol:** `src/features/calculators/construction-suite.tsx`, `roof-material-takeoff.ts`, `RoofTimberQuantityPanel`, `RoofUnderlayQuantityPanel`.
   - **Mi a gond:** a fő definíció fedési sorokat ad, a faanyag/alátét külön panel-számításként működik; a `roof.timber-cutlist` definíció üres.
   - **Elvárt:** egy explicit input/output aggregate, rész-eredményenkénti státusszal és mennyiségi jelentéssel.
   - **Miért:** material list, revision és későbbi quotation csak egy visszakövethető szerződésből tud biztonságosan dolgozni.

2. **Termék-/katalógusforrás és immutable snapshot.**
   - **Hol:** `coveringProductInputFor()`, `roof-covering-parameters.ts`, `roof-underlay.ts`, timber panel, valamint a paving/rebar/mesh meződefiníciók.
   - **Elvárt:** `productId`/forrás, rögzített specifikáció, explicit expert override; ne puszta szabad számmező legyen.
   - **Miért:** a jelenlegi eredmények csak így különíthetők el a gyártói beszerzési adatoktól.

3. **Geometria-import és felülírási szabály.**
   - **Hol:** `ConstructionCalculatorSuite` és a felmérés/revízió adaptere; jelenleg nincs bekötés.
   - **Elvárt:** opcionális felmérés/revízió választás, forrásjelölés, override és invalidáció.
   - **Miért:** az ismételt kézi bevitel mérési eltérést és tetőforma-inkonzisztenciát okozhat, miközben a standalone módnak meg kell maradnia.

4. **Nyeregtető túlnyúlási scope.**
   - **Hol:** `roofGeometryInputFor()` gable ága és a `gable-roof` input.
   - **Elvárt:** `frontGableOverhangMm`/`rearGableOverhangMm` tényleges inputként, vagy jól látható „nem támogatott / 0-ra rögzített” korlátozás.
   - **Miért:** a gable motor már ismeri a paramétereket; a silent hardcode geometriai eltérést okozhat.

5. **Mennyiségi jelentés védelme downstream.**
   - **Hol:** `roof-material-takeoff.ts`, `roof-covering-layout.ts`, anyaglista- és quotation-adapterek.
   - **Elvárt:** `geometric/layout/nominal/procurement` külön típus és forráskövetelmény; incomplete/unsupported eredmény ne legyen továbbítható verified beszerzésként.
   - **Miért:** a geometriai fedés- és faanyagbecslés nem azonos vásárlási kiírással.

6. **Truss határainak kezelése.**
   - **Hol:** `roof.truss-members`, `calculateTriangularTrussGeometry()`.
   - **Elvárt:** vagy explicit envelope-only termékpozícionálás, vagy külön web-member/keresztmetszet/specifikációs scope. A hiányzó rácsozatot ne nevezzük teljes rácsos tartó kalkulátornak.

7. **Konkrét anyagadatok forrásosítása.**
   - **Hol:** `concrete.paving`, `concrete.mix`, `concrete.rebar`, `concrete.mesh` definíciók és `concrete.ts`.
   - **Elvárt:** csempe/lap méret, acélsűrűség és receptforrás termék-/katalógusadatként, kézi override-dal.

### P2 — használhatóság és prezentáció

1. A termékmezők legyenek „választott termék” blokkon belül; a kézi override legyen külön, erősen jelölt rész.
2. A tetőeredményekben jelenjen meg minden soron a „geometriai”, „névleges” vagy „beszerzési” jelentés és a forrás.
3. A `roof.timber-cutlist` és `roof.material-takeoff` cím/eredmény nézet legyen összhangban; ne legyen üres fő `ResultLine[]` a tényleges panelkimenet mellett.
4. A generált lépcső-template-eknél a fém/zigzag megnevezés mellett egyértelműen jelenjen meg, hogy csak közös geometria fut.
5. A `ConstructionDrawing` korai `roofGeometry` return-je mögötti régi `roof.mansard`/`roof.shed`/`roof.hip` ágakat meg kell szüntetni vagy kommentált legacy adapterré tenni, hogy ne sugalljanak elérhető shape-alapú azonosítókat.
6. A böngésző `min="0"` beállítása több pozitív tartományú mezőnél engedhet nullaértéket, amelyet csak a domain utasít el. Ez nem numerikus biztonsági hiba, de a pozitív minimumok és a mezőszintű hibaüzenetek javítandók.

## 10. Nyitott termék- és architekturális kérdések

1. A `roof.material-takeoff` hivatalosan készíthet-e material listet, vagy csak számított preview marad?
2. Melyik termékkatalógus és mely gyártói forrás legyen az egyetlen hiteles fedés-/alátétforrás?
3. A gable front/rear overhang és a shed magas oldali túlnyúlás benne van-e a vállalt scope-ban?
4. A faanyag spacing/inset/keresztmetszet adható-e alapértelmezett gyártói profilból, vagy minden esetben expert input marad?
5. Mely kimenetek kaphatják meg a `procurement` jelentést, és melyek maradnak csak `geometric/layout` állapotban?
6. A felmérés/revízió importnál az input zárolt snapshot legyen, vagy engedélyezett-e mezőnkénti override és hogyan jelölődjön?
7. A betonkeverék receptje TetőPro-adat, gyártói adat vagy kizárólag a felhasználó által adott recept legyen?
8. A `roof.truss-members` valódi rácsos tartóvá bővül, vagy a jelenlegi envelope-only feladat végleges és átnevezendő?
9. A katalógus `verified` státusza a motor jelenlétét, a geometriai tesztet vagy a teljes szakmai/purchasing paritást jelentse?

## 11. Ellenőrzött és nem ellenőrzött állapot

| Terület | Állapot | Bizonyíték/korlát |
|---|---|---|
| Aktív katalógus és azonosítók | ELLENŐRIZVE | `constructionCalculatorCatalog`, 31 elem és definíció-illesztés |
| Mezők, séma és motor-inputok | ELLENŐRIZVE | `construction-suite.tsx`, domain Zod-sémák és számítási modulok |
| Tető geometriai felelősség | ELLENŐRIZVE forrásból | Separate slope/area/overhang semantics; nincs független browser workflow |
| Product/provenance szerződés | ELLENŐRIZVE mint hiány | Free fields, textual source, nincs kiválasztott termék/snapshot |
| Anyaglista/quotation downstream | NEM BIZONYÍTOTT ebben az auditban | A construction suite `independentContent` szerint local preview; integrációs write-flow nem volt böngészőben vizsgálható |
| Böngészős UX és responsive megjelenés | NEM ELLENŐRIZVE | `/kalkulatorok` hitelesített szervezetet igényel az aktuális környezetben |
| Numerikus teljes szakmai helyesség | NEM TELJESEN BIZONYÍTOTT | A motorok és validációk ellenőrizve, minden építési gyártói/statikai eset külön bizonyítás nélkül |

## 12. Pontos érintett fájlok és komponensek

- `src/domain/calculations/construction/catalog.ts` — 31 aktív katalógusreferencia, scope/limitation/státusz.
- `src/features/calculators/construction-suite.tsx` — `Field`, `CalculatorDefinition`, `roofShapeFields`, `coveringProductFields`, `roofGeometryInputFor`, `coveringProductInputFor`, `coveringRows`, template-definíciók, input parsing és progressive disclosure.
- `src/domain/calculations/roof-geometry.ts` — tetőforma-sémák és geometriai státuszok.
- `src/domain/calculations/roof-material-takeoff.ts` — aggregate takeoff status/input/output.
- `src/domain/calculations/roof-timber-layout.ts` — szarufa/léc kiosztás és nominális térfogat.
- `src/features/roof-models/roof-timber-quantity-panel.tsx` — faanyag input és panel-output.
- `src/domain/calculations/roof-underlay.ts` — alátét tekercs-/átlapolás-számítás.
- `src/features/roof-models/roof-underlay-quantity-panel.tsx` — alátét input/UI.
- `src/domain/calculations/roof-covering-parameters.ts` — gyártói fedési paraméter-séma.
- `src/domain/calculations/roof-covering-layout.ts` — fedőtábla geometriai layout és `INCOMPLETE` feltételek.
- `src/domain/calculations/construction/roofs.ts` és `src/domain/calculations/gable-roof.ts` — rafter/triangular/gable geometria.
- `src/domain/calculations/construction/stairs.ts` és `src/domain/calculations/construction/winder-stairs.ts` — lépcsőmotorok.
- `src/domain/calculations/construction/concrete.ts` — beton, térburkolat, mix, rebar és mesh motorok.
- `src/features/roof-models/roof-material-takeoff-summary.tsx` — aggregate eredmény-/korlátozás-megjelenítés.
- `src/features/roof-models/construction-drawing.tsx` — technikai rajz és régi, jelenleg félrevezető shape-id ágak.
- `src/app/kalkulatorok/page.tsx` — szervezetfüggő elérhetőség; böngészős audit korlátja.

## Záró ítélet

A jelenlegi rendszer geometriai kalkulátor-készlete és a feladat-alapú katalógus használható alapot ad. A fő hiány nem az, hogy minden mező számított legyen, hanem hogy a geometriai input, a kivitelezési paraméter, a termékadat és az örökölt felmérési érték jelenleg nincs következetesen elkülönítve és forrásolva. A következő mérföldkőben először az aggregate output-szerződést, a termék-pillanatképet és a downstream quantity semantics-et kell rögzíteni; csak ezután érdemes új UI-mezőket vagy további shape-et hozzáadni.

**Ajánlott mérföldkő-üzenet (commit csak külön kérésre):** `docs(F9.50.1): audit calculator input-output responsibility`
