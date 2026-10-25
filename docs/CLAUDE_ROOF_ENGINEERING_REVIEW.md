# TetőPro — Claude M9–M9.4 független tetőszerkezeti mérnöki audit

**Audit dátuma:** 2026-10-25  
**Vizsgált forrásállapot:** `a634eed98b1473a9e6092d328d4036594cacfdf7`  
**Ág:** `feat/m1-length-input` (a vizsgálat elején tiszta munkafa, az upstreamhez képest 1 commit előny)  
**Összstátusz:** **PASS WITH MATERIAL LIMITATIONS / JAVÍTÁS SZÜKSÉGES KISZABÁSI HASZNÁLAT ELŐTT**  
**Findingok:** P0: **0**, P1: **1**, P2: **6**, P3: **3**

## 1. Vezetői összefoglaló

Az M9–M9.4 fejlesztés technikailag erős, következetes és a korábbi TetőPro-architektúrába jól illesztett bővítés. A madárszáj alapgeometriája matematikailag helyes a deklarált kétdimenziós modellen belül; a táblázat, a vágási kontúr és a méretvonalak ugyanabból a domain-geometriából készülnek. A 3–4–5 kézi példa és a 45°-os példa független újraszámítása egyezett a kóddal és a tesztekkel. A rendszer helyesen különíti el a geometriai eredményt a statikai, gyártói és kivitelezési jóváhagyástól.

A legerősebb megoldások:

- egyetlen `calculateRafterJoints` domainmotor szolgálja ki a számértékeket, az SVG-kontúrt, a kiszabási lépéseket és a tetősíkonkénti madárszájat;
- a rajzi modell tiszta, milliméteres domainkoordinátákat használ, a kamera és a felirat-elhelyezés külön réteg;
- hiányzó vagy érvénytelen csomópontadatból nem készül megtévesztő vágási rajz;
- a kliens és a Server Action ugyanazzal a `computeConstruction` útvonallal számol újra; a mentés immutable revízióra, szervezeti jogosultságra és optimista konkurenciakezelésre épül;
- a régi revíziók új mezőit üres értékkel hidratáló összehasonlítás célzott teszttel védi a hamis dirty állapot ellen.

A fő kockázat nem egy hibás trigonometriai képlet, hanem a **támogatási határ és a műhelyben használt referenciák kommunikációja**. A „Madárszáj vízszintes vágásának magassága” mező önmagában nem mondja ki egyértelműen, hogy a talpszelemen felső síkjától a szarufa felső éléig, a külső függővágási síkban mért függőleges HAP-értéket várja. Téves értelmezése közvetlenül hibás függővágást, ülékhosszt és megmaradó keresztmetszetet ad. Ezért a jelenlegi rendszer geometriai kalkulátorként megbízható, de felügyelet nélküli kiszabási útmutatóként még nem tekinthető kiadásra késznek.

A második lényegi határ: a tetősík-layout **nem tetőszerkezeti framing terv**. A motor a tetősík lejtésirányával párhuzamos geometriai szakaszokat állít elő. Ezek között vannak közönséges és rövid/jack szarufák, de nincs külön kontyélszarufa vagy vápaszarufa. A közös madárszáj helyes az azonos síkban, azonos lejtésirányban, azonos keresztmetszettel és azonos talpszelemen-referenciával futó közönséges és rövid szarufákra; nem vihető át a kontyél- vagy vápaszarufák diagonális, összetett geometriájára.

### Rövid döntés

| Felhasználás | Értékelés |
|---|---|
| Geometriai kalkulátor | **Megbízható a dokumentált 2D modellen belül** |
| Méretezett szemléltető rajz | **Jó, számérték és kontúr konzisztens** |
| Helyszíni felmérési segédeszköz | **Használható feltételezések és referenciák ismeretében** |
| Kiszabási útmutató | **Feltételes; a HAP-bemenet és a támogatási határ pontosítása szükséges** |
| Kivitelezési/gyártási műszaki terv | **Nem**; nincs statika, kapcsolatterv, hip/valley framing, ráhagyás vagy szakági jóváhagyás |

## 2. Vizsgálati határ és módszer

Az audit az `AGENTS.md`, a `CLAUDE.md`, a releváns `docs/PROGRESS.md` és `funkciok.md` részek, a jelenlegi forrás, a két érintett commit, valamint a ténylegesen futtatott ellenőrzések alapján készült. A `PROJECT_BLUEPRINT.md` állításait nem tekintettem megvalósítási bizonyítéknak.

### 2.1 Commit- és eredetleltár

Az M9–M9.2 tényleges kódja egyetlen, `24439ef` azonosítójú `feat(M9.2)` commitban látható. Ez hozzáadta a `rafter-joint-drawing` domaint és React-komponenst, illetve módosította a csomóponti motort, a suite-ot, a CSS-t és a teszteket. Ugyanez a commit egy QA-10 dokumentumot is hozzáadott; az nem része a tetőgeometriai implementációnak.

Az M9.3–M9.4 tényleges kódja az `a634eed` azonosítójú `feat(M9.4)` commitban van. Ez hozta be a tetősíkonkénti madárszájat, az élazonosítást, a kiterített szarufa-layoutot, a közös vászon hookokat, a kalkulátorintegrációt és a célzott teszteket.

A korábbi QA-01–QA-10 infrastruktúrát nem tulajdonítottam az M9-nek. Az M9 csak újrahasználja a QA-04 teljességi kaput, az M2–M4 mentés/downstream modellt és a QA08/QA09 restricted-writer + attesztációs védelmet; nem módosítja azok SQL-szerződését.

### 2.2 Elsődlegesen vizsgált fájlok

- `src/domain/calculations/construction/rafter-joints.ts`
- `src/domain/calculations/construction/plane-birdsmouth.ts`
- `src/domain/calculations/construction/roofs.ts`
- `src/domain/calculations/roof-timber-layout.ts`
- `src/domain/calculations/roof-geometry-edges.ts`
- `src/domain/drawings/rafter-joint-drawing.ts`
- `src/domain/drawings/rafter-layout.ts`
- `src/features/calculators/rafter-joint-drawing.tsx`
- `src/features/calculators/rafter-layout-drawing.tsx`
- `src/features/calculators/drawing-canvas-hooks.ts`
- `src/features/calculators/construction-computation.ts`
- `src/features/calculators/roof-calculator-definitions.ts`
- `src/features/calculations/construction-actions.ts`
- `src/infrastructure/supabase/construction-calculation-writer.ts`
- `supabase/migrations/20261025154642_qa08_rpc_trust_boundary.sql`
- az ezekhez tartozó domain-, komponens-, computation- és action-tesztek.

UI-szempontból a projekt saját design rendszerét és a friss [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) irányelveit, adatvédelmi kontextusban a Supabase hivatalos [RLS dokumentációját](https://supabase.com/docs/guides/database/postgres/row-level-security) vettem figyelembe. Ezek nem helyettesítették a jelenlegi kód vizsgálatát.

## 3. Fejlesztési leltár

### 3.1 Szarufa kiszabása (`roof.rafter-cut`)

| Funkció | Állapot | Bizonyíték / határ |
|---|---|---|
| Teljes felsőél-hossz, ereszhossz, testhossz | Működik | `calculateRafterGeometry`; kanonikus mm |
| S1 talpszelemen-madárszáj | Működik | függővágás, ülék, merőleges mélység, maradék |
| S2 derékszelemen | Működik megadott arc- és felsősík-adattal | hiányos pár esetén `incomplete`, hibás helyzetnél `invalid` |
| S3 szembefutó gerinc | Működik | végvágási szög; kapcsolóelem nincs méretezve |
| S3 gerincdeszka | Működik | `t/2` vízszintes és `t/(2 cos α)` felsőél-hossz korrekció |
| S3 gerincszelemen | Működik geometriai bevágásként | szélesség + felsősík kell; statika nincs |
| Talpszelemen-szélesség ellenőrzése | Működik geometriai összevetésként | ülék ≤ szélesség + 0,5 mm tolerancia |
| 2D áttekintő és részletek | Működik | közös domainpontok, vágásélek, offcut, méretek, szögek |
| Zoom/pan/pinch/double-tap/keyboard | Implementálva | valódi érintőkészüléken ebben az auditban nem reprodukált |
| Statikai vagy gyártási megfelelőség | Nem támogatott | helyesen figyelmeztet a UI |

### 3.2 Tetőanyag-kimutatás és faanyag-vágáslista

- A madárszáj csak bekapcsolt jelölő, kért szarufaanyag és rendelkezésre álló szarufakiosztás esetén számolódik.
- A szarufamagasság a kiválasztott/kézi keresztmetszetből jön; a HAP külön mező; a talpszelemen-szélesség opcionális.
- A motor tetősíkonként keresi az eresznél kezdődő lejtésirányú szarufákat, a leghosszabbat használja a sík futásának és ereszkiülésének meghatározásához, majd újrahasználja az S1 számítást.
- A rajzi nézet kiterített tetősíkot, szarufaszámot, tényleges geometriai osztást, hosszcsoportokat, végél-típust és opcionális madárszáj-részletet mutat.
- A kompakt útmutató a szarufa alsó végétől adja meg a jelölés helyét; a távolság `ereszkiülés / cos α`. Kiülés nélküli modellekben ez 0.
- A mentett eredménysorok hajlásonként egyszer szerepelnek; az input snapshotban az új mezők megmaradnak.
- Hiányos madárszáj-bemenet blokkolja a mentést. Érvénytelen bevágás `invalid`. A `not-applicable` síkok viszont nem teszik hiányossá az összeredményt; ez külön finding.

### 3.3 Tényleges támogatottsági mátrix

| Tetőforma / szarufatípus | Madárszáj | Felső vég | Bizonyítottság és korlát |
|---|---|---|---|
| Nyeregtető, közönséges szarufa | **Támogatott** | gerinc-függővágás | kézi 3–4–5 példa + domain- és integrációs teszt; ereszkiülés modellezett |
| Félnyeregtető, párhuzamos szarufák | **Forrás alapján támogatott** | felső él függővágás | nincs külön M9 madárszáj-regresszió; ereszkiülés modellezett |
| Kontytető, közönséges és rövid/jack szarufák | **Támogatott a lejtésirányú szakaszokra** | ridge/hip vég szerint | 45°-os domain teszt; hip vég összetett vágása nem számolt |
| Sátortető, rövid/jack szarufák | **Forrás alapján támogatott** | hip/ridge vég szerint | nincs külön M9 madárszáj-teszt; kontyélszarufa nincs a layoutban |
| Félkontytető, eresznél induló alsó síkrészek | **Részleges** | hip/ridge/break szerint | a nem eresznél induló síkok `not-applicable`; nincs külön M9-teszt |
| L/T alaprajz, lejtésirányú common/jack szakaszok | **Részleges** | valley/hip/ridge szerint | vápaszarufa nincs; valley/hip összetett végvágás nem számolt; nincs külön M9-teszt |
| Manzárd alsó szarufák | **Támogatott a talpszelemennél** | törésvonal nem számolt | teszt igazolja, hogy felső sík nem kap talpszelemen-madárszájat |
| Manzárd felső szarufák | **Nem alkalmazható ebben a modellben** | törés/gerinc | nincs talpszelemen; a break-csomópont más geometria |
| Kontyélszarufa | **Nem támogatott** | nem támogatott | diagonális valódi hajlás, ferde/összetett ülék; nincs önálló elem a layoutban |
| Vápaszarufa | **Nem támogatott** | nem támogatott | diagonális valódi hajlás és összetett csomópont; nincs önálló elem a layoutban |
| Azonos síkú rövid/jack szarufa | **Támogatott feltételekkel** | hip/valley felső vég nem számolt | azonos α, keresztmetszet, HAP és talpszelemen-sík esetén az S1 keresztmetszet azonos |
| Eltérő hajlású, eresznél induló síkok | **A domain képes síkonként számolni** | síkonként | a jelenlegi katalógusformák nem adnak széles, külön eave-pitch tesztmátrixot |

**Válasz a kritikus kérdésre:** egy tetősíkon nem „minden szarufa” kap automatikusan ugyanilyen madárszájat. Ugyanaz a keresztmetszeti madárszáj alkalmazható az azonos tetősík lejtésirányával párhuzamos, azonos méretű, azonos fal- és talpszelemen-referenciára ülő közönséges és rövid/jack szarufákra. A kontyél- és vápaszarufa nem ilyen: tengelye diagonális, tényleges hajlása és csomóponti vágása eltér, ezért a jelenlegi eredmény rájuk nem használható.

## 4. Geometriai és műszaki audit

### 4.1 Koordináták és bemenetek

A `rafter-joints.ts` kétdimenziós függőleges metszetet használ:

- `x = 0`: a talpszelemen külső síkja és az S1 függővágási síkja;
- `y = 0`: a talpszelemen felső síkja;
- a szarufa felső éle: `y = k + x·tan α`;
- `k` (HAP): a felső él függőleges magassága a talpszelemen felső síkja felett `x = 0`-nál;
- `h`: a szarufa keresztmetszeti magassága a szarufára merőlegesen;
- minden tartós és rajzi hossz domainben mm.

A tetőanyag/faanyag kalkulátorban a tetőhajlás a tetősíkból jön; a HAP nem módosítja azt. Az önálló szarufa-kalkulátorban viszont a megadott `riseMm` felsőél-magasság, ezért a pitch `atan2(rise − HAP, halfSpan)`. Ez belsőleg konzisztens, de a két UI-környezet eltérő mentális modellje miatt különösen fontos az egyértelmű HAP-magyarázat.

### 4.2 Madárszáj-képletek

Legyen `α` a tetőhajlás, `h` a szarufamagasság és `k` a HAP. A szarufa függőleges vetületi vastagsága `H = h / cos α`. Talpszelemen esetén:

```text
függővágás             v = h / cos α − k
vízszintes ülékhossz   b = v / tan α
merőleges bevágás      d = v · cos α = h − k cos α
megmaradó magasság     r = h − d = k cos α
```

Ez megegyezik a kóddal (`rafter-joints.ts:65–85`). A független 3–4–5 ellenőrzés `α = 36,869897°`, `h = 200 mm`, `k = 100 mm` mellett `v = 150`, `b = 200`, `d = 120`, `r = 80 mm`. A 45°-os ellenőrzés `182,8427 / 182,8427 / 129,2893 / 70,7107 mm`. Mindkét eredmény egyezik a futtatott tesztekkel.

10° és 70° szélső ellenőrzésnél a képlet véges és következetes maradt; a sekély hajlás nagy ülékhossza és a meredek hajlás kis maradó keresztmetszete jól mutatja, miért nem szabad a geometriai érvényességet statikai megfelelőségként értelmezni.

Az S2 általánosítja ugyanezt a tartó ereszoldali `xₚ` síkjára és `yₚ` felső síkjára. A rendszer helyesen elutasítja a felső élig érő tartót, a teljes keresztmetszetet átvágó bevágást, a gerinctengelyen túlnyúló üléket, valamint jelzi az alátétezést igénylő hézagot.

### 4.3 Szögek, hosszak és fizikai értelmezés

- Függővágás szöge a szarufa tengelyéhez: `90° − α`.
- Ülékvágás szöge a szarufa tengelyéhez: `α`.
- A mélység `d` nem függőleges, hanem a szarufára merőleges valódi keresztmetszeti mélység.
- A `0` pont az S1 függővágás felső éllel vett metszéspontja; az S2/S3 és a láncméretek innen, a felső él mentén értendők.
- A kompakt tetősík-rajzon a kijelölés a fizikai alsó végétől indul. A megadott távolság a lejtős ereszkiülés; kiülés nélküli formáknál 0.
- A kijelzés mm-ben 0,1 mm-re, cm-ben 0,1 cm-re (1 mm-re), méterben az előbb 0,1 mm-re kerekített érték pontos decimális átalakításával történik. A számítás és mentés ettől függetlenül mm marad.

### 4.4 Talpszelemen-szélesség

A program azt ellenőrzi, hogy a vízszintes ülék hossza belefér-e a megadott vízszintes talpszelemen-szélességbe: `b ≤ width + 0,5 mm`. Ez a D1 feltevés mellett helyes geometriai ellenőrzés, ha az `x = 0` külső síktól a szelemen teljes szélessége a gerinc felé áll rendelkezésre. Nem ellenőrzi a tényleges felfekvési hosszt, a fal/szelemen pozíciós eltérését, a rostirányt, a rögzítést, a teherbírást vagy bármely szakmai bevágási korlátot.

### 4.5 „Ennyit kell bevágni”

A kimeneti útmutató a számított értékeket többnyire helyesen és műhelyben követhető sorrendben adja:

1. felső élen kijelölendő pozíció;
2. eresz felőli függővonal a megadott szögben;
3. a függővonalon az alsó éltől mért `v`;
4. a saroktól a függővonalra merőlegesen, a gerinc felé húzott vízszintes ülék `b`;
5. kivágás, majd a merőleges maradék `r` ellenőrzése.

Ez a **kimeneti** folyamat a vizsgált számított esetekben egyértelmű. A legnagyobb probléma előtte, a **bemeneti** HAP meghatározásánál van: a tetős kalkulátorok nem adnak ugyanilyen konkrét referenciadiagramot vagy definíciót. Lásd `CRR-01`.

### 4.6 Szakembert igénylő következtetések

Gyakorló ács/tetőszerkezeti szakember és szükség szerint statikus ellenőrzése kell legalább a megengedhető bevágási mélységhez, a szükséges felfekvési hosszhoz, a keresztmetszet gyengítéséhez, a faanyag hibáihoz, a rögzítésekhez, a gerinc- és derékszelemen méretezéséhez, a kontyél/vápa kialakításhoz, valamint a helyszíni mérettűrésekhez. A TetőPro jelenleg ezek egyikére sem állít megfelelőséget; ez helyes termékhatár.

## 5. CAD és rajzi megjelenítés

### 5.1 Pontosság

A rajz nem dekoratív illusztráció: az outline ugyanabból a `notch()` geometriából készül, mint a számértékek. A részletrajz dimenziói a sarok, ülék-vég, vágatlan alsó él és felső él pontjai közti valódi távolságokra mutatnak. A tesztek nem csak stringeket hasonlítanak: több méretvonal tényleges euklideszi hosszát is összevetik a feliratozott értékkel. Ez megtartandó kialakítás.

A támasz ismeretlen kiterjedése szaggatott és `is-schematic`; a vágásél külön, kiemelt stílusú; a kieső rész sraffozott. A program nem rajzol S1/S2/S3 bevágást, ha az adott geometriát érvénytelennek minősítette. A szembefutó gerinc és a gerincdeszka végvágásként, nem kitalált bevágásként jelenik meg.

### 5.2 Méretezés és olvashatóság

Pozitívumok:

- valódi milliméteres modell és külön képernyőkamera;
- a feliratok pixelméretűek, zoomnál nem nagyulnak olvashatatlanul;
- ütközésfeloldás, vágáséltől eltolás és vásznon tartás;
- cm az alapértelmezés, választható mm/cm/m;
- a rajzon kívüli, mindig olvasható szöveges kiszabási lista tartalék csatorna;
- S1/S2/S3 állapotok, hiánylista és szakmai korlátok szövegesen is jelen vannak.

Korlátok:

- a kiterített tetősík-rajz statikus fit-to-width nézet, nem zoomolható;
- a felső él általános felirata az első szarufa felső végének élkódját veszi, miközben ugyanazon síkon kevert végcsoportok is lehetnek (`CRR-09`);
- a megadott talpszelemen-szélesség nincs valódi szélességként a rajzon; csak szöveges fit-check készül;
- a rajz alatti általános akadálymentes összefoglaló a szélesség megadása esetén is azt állítja, hogy nincs szélesség és nincs ellenőrzés (`CRR-08`).

## 6. Mobil és desktop UI/UX

### 6.1 Forrásból és tesztből igazolt

- A rajz konténerszélességre méretez, a feliratméretet a `--tp-text-scale` kezdeti értékéhez igazítja.
- A kezelők legalább 2,75 rem magasak; van látható fókusz, névvel ellátott gomb és billentyűzetes pan/zoom (`nyilak`, `+`, `−`, `0`).
- A S1/S2/S3 választók valódi gombok és `aria-pressed` állapotot használnak.
- Az SVG kap `<title>`-t, fókuszt és szerepet; az értékek HTML-listában is elérhetők.
- A zoom, húzás, kétujjas csippentés, dupla koppintás, teljes nézet és reset eseménykezelése implementált.
- A hosszabb kiszabási magyarázat nem lebeg az SVG-n, hanem külön, tördelhető HTML-blokk.
- A sötét/világos színek tokenekből származnak; hardcoded világos háttér nem került a rajzba.

### 6.2 Nem igazolt és kockázatos

Az in-app böngésző elérte a futó `localhost:3000` alkalmazást, de hitelesítés nélkül a `/bejelentkezes` oldalon állt meg. Bejelentkezési adatot nem használtam és helyi fixture-t nem hoztam létre. Emiatt a 375 px portrait, landscape, tablet, desktop, sötét/világos, vizuális túlcsordulás, valódi pinch/double-tap és screen-reader viselkedés ebben az auditban **NOT VERIFIED**.

Forrásból két valós mobil/accessibility kockázat látszik:

- a részletrajz wrapper `touch-action: pan-y`, de a teljes felületet kitöltő belső SVG `touch-action: none`; a böngésző a leszármazotti metszetet veszi, ezért a rajzon indított egyujjas függőleges oldal-scroll blokkolódhat (`CRR-04`);
- a `useFontSize()` csak mountkor olvassa a `--tp-text-scale` értéket, ezért a futás közben módosított adaptív szövegméret nem frissíti a rajz feliratait és a collision becslést (`CRR-05`).

## 7. Kódminőség és architektúra

### 7.1 Megtartandó megoldások

- **Rétegirány:** a képletek és a rajzi modellek domainben vannak; React csak állapotot, kamerát és megjelenítést kezel.
- **Egyetlen képletforrás:** `plane-birdsmouth.ts` nem másolja le a madárszáj-képletet, hanem a `calculateRafterJoints` eredményét használja.
- **Konzervatív hibakezelés:** invalid joint esetén nincs rajz; hiányos adatok meg vannak nevezve.
- **Típusozott státuszok:** `computed/incomplete/invalid/not-applicable` és QA-04 `complete/incomplete/invalid/unsupported` külön fogalmak.
- **Rajzi adatmodell:** kamera-, annotáció- és geometriai logika tesztelhető React nélkül.
- **Teljesítmény:** a drágább modellek `useMemo`-val készülnek; pointeres kameraállapot refből épül tovább, így sűrű események között sem veszít mozgást.
- **Nincs indokolatlan dependency vagy új absztrakció.**

### 7.2 Indokolt javítások

A fő architekturális javítás nem nagy refaktor: a domain státuszokat és feltételezéseket pontosabban kell továbbvinni a UI- és snapshot-határig. Különösen a `physicalLayout.status = unsupported` és a `PlaneBirdsmouth.status = not-applicable` információ vész el vagy gyengül az összesített „Teljes” és „kiosztási terv” kommunikációban.

A másik indokolt változtatás a mentési trust boundary mezőszintű validációja. A snapshot jelenleg csak stringhosszakat és ismert kulcsokat ellenőriz, majd az egyes számítások implicit konverzióira hagyatkozik. A fő kötelező mezők hibái többnyire fail-closed állapotba jutnak, de több opcionális csomópontmező hibás negatív értéke „nincs megadva” állapotra eshet vissza. Ez nem jogosultsági rés, de gyengébb, mint a projekt deklarált tartósadat-szerződése.

## 8. Mentés, revízió és adatkonzisztencia

### 8.1 Bizonyított út

1. A kliens `constructionInputSnapshot` formában csak inputot küld.
2. A Server Action Zod-sémával, calculator ID-val, ismert mezőkulcsokkal és szervezeti tagsággal ellenőriz.
3. A szerver ugyanazt a betöltött definíciót és `computeConstruction` függvényt futtatja, mint az előnézet.
4. Csak `isSaveableComputation === true` esetén hívja a restricted PostgreSQL writert.
5. A writer paraméterezett RPC-t használ, expected revisionnel és operation ID-val; `40001` konfliktus külön kezelve.
6. A konstrukciós input/output immutable revízióban marad; a downstream link pontos revision ID-ra mutat.

Az új M9.4 mezők a generikus `fields` objektumba kerülnek, ezért nem kellett migráció. A régi snapshotok újranyitásakor a hiányzó `birdsmouth`, `seatCutHeightMm` és `plateWidthMm` üres értéket kap az összehasonlításhoz, az eredeti snapshot átírása nélkül; célzott teszt igazolja, hogy ettől nem lesz hamis dirty állapot és nem keletkezik új eredménysor.

A numerikus eredménysorok mm-ben maradnak; a cm/m csak megjelenítés. A downstream anyag-/ajánlati út a mentett sorokat és vágáslistát kapja, nem az interaktív rajzot. A madárszáj-sorok hajlás szerint deduplikáltak, de nem őrzik meg a `not-applicable` síkokat; lásd `CRR-03`.

### 8.2 DB-bizonyíték állapota

A jelenlegi M9-kód nem változtat adatbázist vagy RLS-t. A QA08/QA09 forrásban meglévő védelme megmaradt: restricted writer, privát attesztáció, szervezeti ellenőrzés, advisory lock, expected revision és immutable revision.

A saját helyi `npm run db:test` futás **FAIL/BLOCKED** lett, nem M9-sémahiba miatt: a lokális adatbázis migrációs állapota `20261025140000`-ig tart, miközben a repóban megvan a `20261025154642_qa08_rpc_trust_boundary.sql`. A `060_calculation_rpc_trust_boundary.sql` 3. állítása a hiányzó `private.construction_revision_attestations` táblánál leállt; a 27 tervezett állításból csak 3 futott. Migrációt, resetet vagy javítást nem alkalmaztam. Ezért a **jelenlegi fő lokális DB-n az M9 mentés + attesztáció E2E nem igazolt**.

## 9. Tesztlefedettség és bizonyítékok

### 9.1 Ténylegesen futtatott ellenőrzések

| Ellenőrzés | Eredmény | Minősítés |
|---|---:|---|
| 9 célzott domain/UI/computation/action fájl | 63/63 PASS | **TEST-CONFIRMED** |
| Teljes `npm test` | 188 fájl PASS, 8 SKIP; 1133 teszt PASS, 19 SKIP | **TEST-CONFIRMED** |
| `npm run lint` | 0 hiba | **TEST-CONFIRMED** |
| `npm run typecheck` izolált Git-archívumban | PASS | **TEST-CONFIRMED** |
| `npm run build` izolált Git-archívumban, Next.js 16.4.2 webpack | PASS; build, TypeScript és oldaladat-generálás sikeres | **TEST-CONFIRMED** |
| Független kézi trigonometria: 3–4–5, 45°, 10°, 70° | kóddal egyező | **REPRODUCED** |
| Helyi `npm run db:test` | FAIL a hiányzó QA08 migráció miatt | **BLOCKED** |
| `supabase migration list --local` | repo `20261025154642`, DB oldalon hiányzik | **SOURCE/ENV-CONFIRMED** |
| Böngésző: app elérés | loginig elérhető | **REPRODUCED** |
| Védett kalkulátor vizuális/gesztus teszt | hitelesítés nélkül nem érhető el | **NOT VERIFIED** |

A célzott 63 teszt a madárszáj-domaint, a rajzi modellt, a layoutot, a komponens SSR-kimenetet, a teljességi állapotot, a mentési panelt és a szerver actiont fedte. A komponens-tesztek szöveges/SSR ellenőrzések; nem hajtanak végre pointer-, pinch-, wheel-, resize-, theme- vagy live scaling interakciót.

### 9.2 Függetlenség és hiányok

Jó tesztbizonyíték:

- a 3–4–5 és 45° várt értékek kézzel származtatottak;
- a rajzi méretvonalak tényleges geometriai hosszát is ellenőrzik;
- flat/steep/tiny-notch esetek vannak;
- invalid/hiányos, talpszelemen fit/no-fit és régi snapshot kompatibilitás fedett;
- a teljes regresszió zöld.

Hiány:

- tetősíkonkénti madárszáj célzottan csak nyereg, konty és manzárd formán tesztelt;
- nincs külön félnyereg, sátor, félkonty, L és T M9.4 regresszió;
- nincs olyan teszt, amely bizonyítja, hogy a kontyél/vápaszarufa nincs a generált elemhalmazban és az UI ezt félreérthetetlenül közli;
- nincs `not-applicable` + összesített completeness/snapshot teszt;
- nincs server-action teszt az új madárszájmezőkkel és manipulált opcionális negatív értékekkel;
- nincs interakciós böngészőteszt zoomra, pinchre, double-tapre, oldal-scrollra, billentyűzetre, live text-scale-re vagy 375 px túlcsordulásra.

## 10. Részletes hibajegyzék

### CRR-01 — P1 — A HAP bemenet mérési referenciája félreérthető

1. **Azonosító / súlyosság:** CRR-01 / P1.  
2. **Kódhely:** `src/features/calculators/roof-calculator-definitions.ts:52–56,72–82`; `src/domain/calculations/construction/rafter-joints.ts:3–8`; `src/features/calculators/rafter-joint-drawing.tsx:275–296`.  
3. **Probléma:** a domain pontosan definiálja a HAP-ot, de a tetős kalkulátor UI csak „Madárszáj vízszintes vágásának magassága” feliratot ad. Nem mondja ki, hogy ezt a talpszelemen felső síkjától a szarufa felső éléig, a külső függővágási síkban, függőlegesen kell mérni. A felhasználó könnyen a bevágás függőmélységét, a merőleges notch depth-et vagy az ülék helyét írhatja be.  
4. **Bizonyíték:** **SOURCE-CONFIRMED**; a domain komment és a képlet mutatja a jelentést, a mező és az anyagos kalkulátor advanced help nem.  
5. **Várt / tényleges:** várt: explicit HAP-definíció és referenciavázlat a mezőnél; tényleges: szakmai háttérismeretre támaszkodó rövid címke.  
6. **Következmény:** matematikailag konzisztens, de szakmailag rossz kiszabási számok keletkezhetnek helyesnek látszó rajzzal.  
7. **Legkisebb javítás:** a mezőcímke/help egészítse ki a referenciát; fókuszra mini keresztmetszeti guide jelölje `talpszelemen felső sík → szarufa felső él, x=külső sík`; ugyanaz a definíció jelenjen meg a mentett input visszanézetében.  
8. **Regressziós teszt:** komponens-teszt a teljes mérési definícióra, böngészős vizuális teszt 375 px-en; szakmai review egy áccsal.  
9. **Bizonyosság:** magas a kommunikációs résre, közepes a felhasználói félreértés gyakoriságára.

### CRR-02 — P2 — A „kiosztási terv” erősebbet állít, mint a layout szerződése

1. **Kódhely:** `src/domain/calculations/roof-timber-layout.ts:31–38,180–208`; `src/features/calculators/rafter-layout-drawing.tsx:69–120`.  
2. **Probléma:** a domain explicit `physicalLayout.status: "unsupported"`, mert nem tudja, mely tengelyek alkotnak fizikai faelemet. A rajz viszont „Szarufa-elrendezés · kiosztási terv”, „N db szarufa” és számozott elemek formájában jelenik meg, a fizikai-layout korlátozás nélkül. A motor csak lejtésirányú síkszakaszokat generál; kontyél/vápaszarufát nem.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**.  
4. **Várt / tényleges:** várt: „geometriai szarufa-vonalak” és mindig látható fizikai/framing korlát; tényleges: a material summary általános figyelmeztetése mellett a részletes rajz terv- és darabnyelvet használ.  
5. **Következmény:** a felhasználó teljes framing/kiszabási listának olvashatja a common/jack vonalakat, és hiányolás nélkül hagyhatja a kontyél-/vápaszarufát.  
6. **Legkisebb javítás:** cím és darabcímkék „geometriai vonal”-ra pontosítása, a `physicalLayout.reason` mindig látható átadása, külön „kontyél/vápa nincs benne” figyelmeztetés releváns formáknál.  
7. **Regressziós teszt:** hip/L/T render teszt a figyelmeztetésre és elemkategóriákra.  
8. **Bizonyosság:** magas.

### CRR-03 — P2 — A `not-applicable` sík nem gyengíti a „Teljes” státuszt és nem kerül a snapshot sorai közé

1. **Kódhely:** `src/features/calculators/construction-computation.ts:121–141`; `src/domain/calculations/construction/plane-birdsmouth.ts:67–71`.  
2. **Probléma:** csak az `incomplete` és `invalid` madárszáj-státusz kerül a teljességi okok közé. A `not-applicable` nem; a mentett sorok csak `computed` síkokból készülnek. Manzárd felső vagy más, eresznél nem induló sík mellett az összeredmény „Teljes”, miközben a kért madárszáj nem készült minden megjelenített szarufacsoportra.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**; a manzárd domain-teszt igazolja a `not-applicable` állapotot, de nincs completeness teszt.  
4. **Várt / tényleges:** várt: „teljes a támogatott síkokra, N sík nem alkalmazható” és megőrzött státusz; tényleges: üres reasonlista és csak számított számsorok.  
5. **Következmény:** mentett/downstream nézetből eltűnhet, hogy egyes síkokra nem volt kiszabási adat.  
6. **Legkisebb javítás:** ne feltétlenül blokkolja a mentést, de a completeness legyen `complete-with-limitations`-ként kommunikálva vagy tartalmazzon megőrzött warningot; az output snapshot tárolja a síkonkénti státuszt/reasont.  
7. **Regressziós teszt:** manzárd és félkonty computation + snapshot + újranyitás.  
8. **Bizonyosság:** magas.

### CRR-04 — P2 — A részletrajz érintésen blokkolhatja az oldal függőleges görgetését

1. **Kódhely:** `src/app/globals.css:5087–5091`; `src/features/calculators/rafter-joint-drawing.tsx:247–249`.  
2. **Probléma:** a detail wrapper `touch-action: pan-y`, de a teljes gyermek SVG `touch-action: none`. Ez a rajzon indított egyujjas navigációt a saját pan gesztushoz foglalja, és megakadályozhatja a dokumentum scrollját.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**, fizikai érintőeszközön **NOT VERIFIED**.  
4. **Várt / tényleges:** várt: egyujjas függőleges oldal-scroll, kétujjas vagy explicit mód a rajz mozgatására; tényleges: minden touch gesztus az SVG-é.  
5. **Következmény:** 17–24 rem magas mobilrajzon nehéz lehet továbbgörgetni.  
6. **Legkisebb javítás:** a detail SVG-re is `pan-y`, és csak aktív kétujjas/pan módban `none`, vagy külön „rajz mozgatása” mód.  
7. **Regressziós teszt:** 375 px Playwright touch emuláció + lehetőség szerint valódi iOS/Android smoke.  
8. **Bizonyosság:** közepes–magas.

### CRR-05 — P2 — A rajz nem követi élőben az adaptív szövegméret-váltást

1. **Kódhely:** `src/features/calculators/drawing-canvas-hooks.ts:26–30`; `src/features/calculators/rafter-joint-drawing.tsx:159–164`; `src/features/calculators/rafter-layout-drawing.tsx:39–52`.  
2. **Probléma:** `useFontSize()` egyszer, mountkor olvassa a CSS-változót. A beállítási buborék későbbi skálaváltása nem triggerel új olvasást, ezért a rajzfelirat és az ütközésbecslés a régi méreten marad.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**, böngészőben **NOT VERIFIED**.  
4. **Várt / tényleges:** várt: élő adaptív rajzméret; tényleges: csak újramount/frissítés után biztos a friss méret.  
5. **Következmény:** accessibility beállítás látszólag nem hat a műszaki rajz kritikus felirataira.  
6. **Legkisebb javítás:** a scaling context értékét kapja a hook, vagy figyelje a dokumentumelem style/class változását.  
7. **Regressziós teszt:** render → text scale váltás → `--rj-font`, layout és clipping assert.  
8. **Bizonyosság:** magas.

### CRR-06 — P2 — A támogatott tetőformák és gesztusok tesztmátrixa hiányos

1. **Kódhely:** `src/domain/calculations/construction/plane-birdsmouth.test.ts`; `src/features/calculators/rafter-joint-drawing.test.tsx`; `src/features/calculators/rafter-layout-drawing.test.tsx`.  
2. **Probléma:** a madárszáj célzott tesztje nyereg/konty/manzárd; nincs shed/pyramid/halfHip/L/T. A komponens-tesztek SSR-szöveget vizsgálnak, nem interakciót, viewportot vagy a11y állapotváltozást.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**.  
4. **Várt / tényleges:** várt: a deklarált forma- és mobilinterakciós határ kockázatarányos regressziója; tényleges: jó mély domainmag, de hiányos szélességi mátrix.  
5. **Következmény:** forma-specifikus élazonosítás, not-applicable státusz, overflow vagy gesture regresszió rejtve maradhat.  
6. **Legkisebb javítás:** egy táblavezérelt domain teszt a 8 formára és egy fókuszált böngészőspec 375/landscape/desktop + touch/keyboard témákra.  
7. **Regressziós teszt:** maga a javasolt mátrix.  
8. **Bizonyosság:** magas.

### CRR-07 — P2 — Az opcionális csomópontmezők szerveroldali szemantikai validációja nem egységes

1. **Kódhely:** `src/features/calculations/construction-actions.ts:15–48`; `src/features/calculators/construction-computation.ts:22–28`; `src/domain/calculations/construction/rafter-joints.ts:34–53,91–95`.  
2. **Probléma:** a snapshot schema stringként engedi a mezőket, majd `Number()` konvertál. A böngésző `LengthField` jól tiltja a negatív értéket, de manipulált kérésnél például negatív talpszelemen-szélesség `plateFit = null` lesz, negatív opcionális szarufamagasság pedig hiányzóként kezelhető; az alap-kalkuláció ettől még lehet menthető.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**; támadó HTTP-reprodukció nem történt.  
4. **Várt / tényleges:** várt: minden ismert mező domain-sémája szerveren is ugyanúgy érvényesül; tényleges: kötelező geometria többnyire Zod-fail, egyes opcionális adatok csendben eldobódnak.  
5. **Következmény:** hibás input snapshot menthető úgy, mintha az opcionális ellenőrzést nem kérték volna; ez adatminőségi, nem jogosultsági rés.  
6. **Legkisebb javítás:** calculator-specifikus szerveroldali mezőséma vagy közös field-contract validáció; „megadott, de hibás” soha ne váljon „hiányzóvá”.  
7. **Regressziós teszt:** action teszt negatív/NaN/0 opcionális joint mezőkkel és biztos mentési tiltással.  
8. **Bizonyosság:** magas a kódútra, alacsony a normál UI-beli előfordulásra.

### CRR-08 — P3 — Az akadálymentes összefoglaló ellentmondhat a fit-checknek

1. **Kódhely:** `src/features/calculators/rafter-joint-drawing.tsx:286–288,368`.  
2. **Probléma:** a részlet helyesen kiírja, hogy az ülék ráfér/nem fér rá a megadott talpszelemenre, az összefoglaló mégis mindig azt mondja: „A szelemenek szélessége nincs megadva… az ülék felfekvése nem ellenőrzött.” Kompakt nézetben a „Csomópontok táblázattal egyeznek” állítás is lehet kontextusidegen.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**.  
4. **Várt / tényleges:** várt: állapotfüggő summary; tényleges: statikus szöveg.  
5. **Következmény:** screen-reader és látó felhasználó eltérő/ellentmondó információt kap.  
6. **Legkisebb javítás:** `plateFit` és `compact` alapján generált összefoglaló.  
7. **Regressziós teszt:** fit, no-fit, no-width és compact SSR eset.  
8. **Bizonyosság:** magas.

### CRR-09 — P3 — A tetősík felső élének felirata csak az első szarufából következik

1. **Kódhely:** `src/features/calculators/rafter-layout-drawing.tsx:60,89`; `src/domain/drawings/rafter-layout.ts:44–54`.  
2. **Probléma:** a központi felső címke `first.upperEnd.edgeKind`, miközben a részletes lista helyesen több felső végcsoportot tud mutatni. Kevert ridge/hip/valley végű síkon az egyetlen felirat túláltalánosíthat.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**; konkrét képernyős félreolvasás **SUSPECTED**.  
4. **Várt / tényleges:** várt: élhez kötött címkék vagy „vegyes felső végek”; tényleges: egyetlen első-elem címke.  
5. **Következmény:** kisebb rajzi félreértés; a lista megadja a helyes csoportokat.  
6. **Legkisebb javítás:** csak homogén végcsoportnál írjon egy élnevet, különben „vegyes felső végek – lásd lista”.  
7. **Regressziós teszt:** konty háromszög és L/T kevert végcsoport.  
8. **Bizonyosság:** közepes–magas.

### CRR-10 — P3 — A mérföldkő és commit eredet nem egy-az-egyhez követhető

1. **Kódhely:** Git history `24439ef`, `a634eed`; `docs/PROGRESS.md` M9–M9.4.  
2. **Probléma:** öt dokumentált mérföldkő két commitba van összevonva, a `feat(M9.2)` commit QA-10 dokumentumot is tartalmaz. A jelenlegi működés auditálható, de az egyes Claude-lépések diff-alapú eredete nem rekonstruálható pontosan.  
3. **Bizonyíték:** **SOURCE-CONFIRMED**.  
4. **Várt / tényleges:** várt: milestone/commit vagy explicit squash-manifest; tényleges: dokumentációs idővonal és git-egység eltér.  
5. **Következmény:** regresszióbisect és felelősségi határ nehezebb, funkcionális hiba nincs.  
6. **Legkisebb javítás:** a jövőben egy rövid commit-manifest a squasholt mérföldkövekhez; a mostani history átírása nem javasolt.  
7. **Regressziós teszt:** nem szükséges.  
8. **Bizonyosság:** magas.

## 11. Konkrét továbbfejlesztési terv

### Következő javasolt mérföldkő: M9.5 — Kiszabási biztonság és támogatási határ

| Sorrend | Feladat | Komplexitás | Fő függőség |
|---:|---|---|---|
| 1 | HAP referenciadefiníció + fókusz-diagram mindhárom kalkulátorban | Alacsony–közepes | szakmai szöveg jóváhagyása ácstól |
| 2 | `physicalLayout` és hip/valley kizárás mindig látható a layouton | Alacsony | nincs |
| 3 | `not-applicable` síkok warningja és snapshot-provenance megőrzése | Közepes | output schema kompatibilitási döntés |
| 4 | Opcionális csomópontmezők szerveroldali mezősémája | Közepes | kalkulátordefiníció field-contract |
| 5 | Touch scroll és live text-scale javítása | Alacsony–közepes | böngészős interakcióteszt |
| 6 | 8 tetőformás domainmátrix + 375/landscape/desktop böngészőspec | Közepes | hitelesített eldobható DEMO session |
| 7 | Állapotfüggő accessibility summary és kevert végélcímke | Alacsony | nincs |

### Későbbi szakmai pontossági fázis

- Kontyél- és vápaszarufa külön 3D tengely-, valódi hajlás- és összetett vágási modellje: **magas** komplexitás; tetőszerkezeti szakértői specifikáció és új framing adatmodell kell.
- Manzárd töréscsomópont, félnyereg felső támasz, tetős kalkulátorbeli S2/S3: **magas**; támaszhelyek, keresztmetszetek és kapcsolattípusok szükségesek.
- Nyílások, toldások, vágási ráhagyások, tényleges faelem-darabszám: **magas**; nem építhető megbízhatóan a jelenlegi puszta tetősík-poligonból.
- Szakmai bevágási korlát vagy teherbírás: csak külön, jóváhagyott szabványi/tervezői szerződéssel; a jelenlegi geometriai modulba nem szabad ökölszabályt beégetni.

## 12. Végső mérnöki értékelés

### Geometriai kalkulátorként

**Jó és kellően igazolt a deklarált 2D esetre.** A képletek helyesek, a szélsőértékek fail-closed ellenőrzései értelmesek, a mértékegység-kezelés konzisztens. Nincs bizonyított numerikus P1 hiba.

### Méretezett szemléltető rajzként

**Erős.** A kontúr, a vágásél és a dimenzió ugyanabból a geometriából jön. A sematikus támasz és a valódi vágás vizuálisan különül. A feliratkezelés átgondolt, de a live text-scale és néhány állapotfüggő szöveg javítandó.

### Helyszíni felmérési segédeszközként

**Feltételesen alkalmas.** Az inputreferenciák ismeretében gyors és informatív. A HAP mérési helyének jelenlegi megfogalmazása, a hitelesített mobil E2E hiánya és a scroll-kockázat miatt képzés vagy helyi szakmai kontroll nélkül nem ajánlott.

### Kiszabási útmutatóként

**Csak közönséges és azonos síkú, lejtésirányú rövid/jack szarufák S1 madárszájához, valamint az önálló kalkulátor megadott S2/S3 2D eseteihez kellően igazolt.** Nem használható kontyél- vagy vápaszarufára, összetett végvágásra, manzárd törésre, nem modellezett támaszra vagy ráhagyásos gyártási listára. A `CRR-01` lezárása előtt a számot második személynek/szakembernek ellenőriznie kell.

### Kivitelezési vagy gyártási műszaki tervként

**Nem tekinthető annak.** Hiányzik a statikai méretezés, a kapcsolóelemek és rögzítések terve, a teljes framing elemhalmaz, a helyszíni tűrés, a faanyagminőség, a ráhagyás/toldás és a szakági jóváhagyás. A termék jelenlegi figyelmeztetései ezt nagyrészt helyesen közlik.

## 13. Auditkorlátok

- Védett kalkulátoroldali vizuális teszt nem futott: a böngésző loginig jutott, hitelesítést vagy fixture-t nem hoztam létre.
- Fizikai telefon, Safari, screen reader és valódi többujjas gesztus nem volt elérhető.
- A fő lokális DB a repónál egy migrációval régebbi; nem módosítottam, ezért az attesztációs pgTAP és a mentési E2E blokkolt.
- Hosted/staging Supabase, production adatok, deploy és élő többfelhasználós konkurencia nem került vizsgálatra.
- Ács/statikus szakmai jóváhagyás nem történt; a geometriai audit nem helyettesíti azt.
- Nem módosult alkalmazáskód, teszt, adatbázis vagy meglévő dokumentum.

**Javasolt Conventional Commit:** `docs(M9.4): add independent roof engineering audit`
