# TetőPro – tetőkalkulátor termék- és UX-újratervezési terv

## Véglegesített termékdöntés és megvalósítás (2026-11-04)

A normál **Tetők és faszerkezetek** kategória egyetlen belépője a `roof.material-takeoff` Tetőanyag-kimutatás. A tetőforma az első érdemi választás; ezt a rajzos vagy kézi adatbevitel, a geometria, a kért anyagcsoportok, az eredmény és a mentés követi. A korábbi, alább olvasható B alternatíva és a külön látható speciális kalkulátorokra vonatkozó javaslat történeti elemzés; ezt a végleges felhasználói döntés felülírja.

A normál tetős felületről eltűnt a külön kalkulátorpanel, az elsődleges és további eszközök listája, a kereső és a mobil kalkulátorválasztó. A munkaterület a teljes rendelkezésre álló szélességet használja; a cím röviden „Tetőanyag-kimutatás”. A meglévő tetőforma-glyphok megmaradtak, világos témában kontrasztosabb színtokennel. A kézi és rajzos út meglévő fokozatos adatbekérése és számítási motorja továbbra is közös.

A `roof.timber-cutlist`, `roof.rafter-cut` és `roof.truss-members` motorja, azonosítója, mentett munkái és revíziói érintetlenek. Régi közvetlen hivatkozás és mentett munka a saját kalkulátorában nyílik meg; új tetős munka a központi kimutatásban indul. A rajzi feliratban szereplő falméretet a tetőméret mezőbe átvitel előtt külön meg kell erősíteni. Ez nem OCR-felismerés, és nem bizonyítja a méret szakmai helyességét.

Az alábbi rész az eredeti stratégiai elemzés megőrzött állapota; a fenti döntés az irányadó a jelenlegi felületre.

**Állapot:** elemzés és tervezés, alkalmazáskód-módosítás nélkül  
**Vizsgálat tárgya:** a jelenlegi kód, sémák, célzott tesztek és aktuális dokumentáció  
**Bizonyítási szabály:** a jelenlegi kód és a célzott tesztforrás az elsődleges; régi milestone-riport csak háttérmagyarázat.

## 1. Vezetői összefoglaló

### Döntés

Az új belépési logika szakmailag jó irány, de csak a **geometria-alapú tetőmunkákhoz**:

> **Tetőforma → rajz vagy kézi megadás → szükséges geometria → kért eredmények → szükséges anyagparaméterek → eredmény → mentés**

Nem vezetném át ezt változtatás nélkül az önálló szarufa-kiszabásra és a rácsostartó-elemekre. Ezeknek nincs ugyanaz a bemeneti és szakmai célmodelljük, ezért a közös tetős munkatérből elérhetők lehetnek, de külön kalkulátor-identitásként és külön mentési szerződéssel kell megmaradniuk.

### A legnagyobb jelenlegi használhatósági probléma

Nem a számítási motor szétválasztottsága a fő probléma, hanem az, hogy a felhasználónak ma elsősorban **kalkulátort kell választania**, miközben ő valójában egy tetőmunkát szeretne elvégezni. A jelenlegi suite ezt részben már felismerte: a kód szerint a szakmai feladat választása megelőzi a rajz/kézi módot, és a rajz állapota túléli a kalkulátorváltást (`src/features/calculators/construction-suite.tsx:190-198`). A felület azonban még katalógus-központú, és a tetőforma, a geometriai hiányok, a kért eredmények és az anyagprofilok nem egyetlen fokozatos munkafolyamatban jelennek meg.

### Legfontosabb termékdöntések

1. **B alternatíva:** központi tetőmunkafolyamat külön elérhető speciális kalkulátorokkal.
2. A `roof.material-takeoff` legyen a geometria-alapú tetőmunka fő munkafelülete; a `roof.timber-cutlist` ugyanazt a geometriai és adatátviteli alapot használja, de maradjon külön kimeneti/mentési nézet.
3. A `roof.rafter-cut` és `roof.truss-members` maradjon külön szakmai kalkulátor; a közös navigáció és rajzi infrastruktúra újrahasznosítható, a számítási modellt nem kell összevonni.
4. A tetőforma csak **keresési és mező-láthatósági kontextus**, soha nem bizonyíték.
5. Alaprajzi hossz/szélesség csak emberi ellenőrzés és fedett tetőrészhez kötés után vihető át; falméretből nem következik tetőméret.
6. Az OCR-műszaki kapu BLOCKED marad. A PDF.js szövegréteges, explicit címkézett javaslatok és a kézi jóváhagyás használható, de általános automatikus tetőgeometria-felismerés nem.

### Mit nem javaslok ebben a körben

Nem javaslok kalkulátorok törlését vagy technikai egyesítését, új OCR/AI/CAD motort, új adattárolót, statikai alapértékeket, automatikus tetőforma-felismerést vagy megbízhatósági százalékot.

## 2. Prompt- és vizsgálati megközelítés felülvizsgálata

A feladat jól meghatározza a biztonsági korlátokat, de a „három adatból legyen gyors számítás” kísértését a tényleges sémákhoz kell kötni. A vizsgálat ezért:

- a jelenlegi registryből és a `roof-calculator-definitions.ts`-ből azonosítja a támogatott tetőformákat és mezőket;
- a domain-sémákból választja szét a tetővetületet, a tetősík-felületet és a külön anyagparamétereket;
- a célzott tesztforrásból ellenőrzi a rajzi átviteli, egység-, konfliktus-, szakasz- és mentési kapukat;
- a dokumentált PASS/BLOCKED állapotokat nem kezeli friss futtatásként;
- minden javasolt automatikus lépést bizonyítékhoz, forráshoz és explicit felhasználói elfogadáshoz köt.

Ez a módszer szűkebb, de biztonságosabb, mint a teljes technológiai audit: a kérdés a tetőmunka termékarchitektúrája és UX-e, nem az egész alkalmazás újraértékelése.

## 3. Bizonyítékállapotok

| Jelölés | Jelentés ebben a dokumentumban |
|---|---|
| **Kódban jelen van, futtatás nélkül** | A funkció és a kapcsolódó tesztforrás olvasható; ebben a körben nem futott teljes regresszió. |
| **Részleges** | A technikai út egy része létezik, de a szakmai jelentés vagy lefedettség korlátozott. |
| **BLOCKED** | A meglévő dokumentáció vagy tesztbizonyíték szerint a kapu nem teljesült. |
| **Csak terv** | Dokumentációs szerződés vagy jövőbeli irány, nem bizonyított production működés. |
| **Hiányzik** | A vizsgált kódban nem találtam ilyen működést. |

### Rövid állapottérkép

| Terület | Állapot | Bizonyíték / értelmezés |
|---|---|---|
| Tetőformák és geometriai séma | **Kódban jelen van, futtatás nélkül** | Nyolc forma a `src/domain/calculations/roof-geometry.ts:8-20` sémában. |
| Közös geometriai motor | **Kódban jelen van, futtatás nélkül** | `calculateRoofGeometry` és a gable adapter ugyanazon kimeneti modellre épít (`roof-geometry.ts:170-205`, `gable-roof.ts:74-145`). |
| Anyagcsoportok kapcsolható kérése | **Kódban jelen van, futtatás nélkül** | A takeoff csak a kért csoportokat tekinti aktívnak (`roof-material-takeoff.ts:104-138`), a UI állapotban `timber/underlay/covering` külön él. |
| Mentett profil és kézi felülírás | **Kódban jelen van, futtatás nélkül** | `resolveMaterialSpec`, source-jelölés és profil-újrahasználás (`roof-material-spec.ts:1-170`). |
| PDF.js szöveg és koordináta | **Kódban jelen van, futtatás nélkül** | `docs/AI_DRAWING_EXTRACTION_RULES.md`, `src/infrastructure/drawings/pdf-text-extractor.ts`, célzott tesztforrások. |
| Explicit PDF-jelölt → mezőjavaslat | **Részleges** | Szűk, címkézett `roof.rafter-cut` szabályok vannak (`drawing-field-transfer.ts:90-147`). Általános tetőgeometriai mező-hozzárendelés nincs. |
| Koppintásos átadás és egységkapu | **Kódban jelen van, futtatás nélkül** | `drawing-quick-transfer.ts`, `drawing-field-transfer.ts:165-219`, célzott tesztek. |
| Kétreferenciás kalibráció | **Kódban jelen van, futtatás nélkül** | `drawing-calibration.ts` és `drawing-calibration.test.ts`; az eredmény nem jelent automatikus műszaki értelmezést. |
| OCR műszaki pontosság | **BLOCKED** | `docs/AI_DRAWING_EXTRACTION_RULES.md` M12.2 és `docs/AI_DRAWING_TEST_MATRIX.md`; a dokumentált E-01 eredmény nem ad általános elfogadási alapot. |
| Tetőszakasz-fedettség és mentési kapu | **Kódban jelen van, futtatás nélkül** | `drawing-roof-section.ts`, `drawing-roof-takeoff.test.ts`, `drawing-field-transfer.ts:27-87`. |
| Helyi rajzi munkamenet | **Kódban jelen van, futtatás nélkül** | v3 JSON, SHA-256 forráskötés, 7 napos inaktivitási TTL és konfliktusvédelem (`drawing-session-retention.ts:12-85`). |
| Automatikus tetőforma-felismerés | **Hiányzik / nem javasolt** | A `classifyDrawingPlan` csak `FÖLDSZINTI ALAPRAJZ` címkejelölést ad, nem tetőformát (`drawing-field-transfer.ts:102-126`). |

## 4. Jelenlegi architektúra

### 4.1. A tetőgeometriai alap

A jelenlegi geometriai séma a következő formákat támogatja:

- `gable` – nyeregtető;
- `shed` – félnyeregtető;
- `hip` – kontytető;
- `pyramid` – sátortető;
- `halfHip` – félkontytető;
- `lShape` – L alaprajzú tető;
- `tShape` – T alaprajzú tető;
- `mansard` – manzárdtető.

Ez a lista a domain-séma és a kalkulátor UI mezőláthatósága között összhangban van (`roof-geometry.ts:8-20`, `roof-calculator-definitions.ts:21-45`). Az `other` a közös domain-kontraktusban szerepelhet tetőtípusként, de a számítható geometriai input-sémában nincs benne; ezért a belépő UI-ban nem szabad támogatott tetőformaként megjeleníteni.

### 4.2. Négy vizsgált kalkulátor

| Kalkulátor | Szakmai cél | Fő input | Eredmény | Egyedi jelleg / korlát |
|---|---|---|---|---|
| `roof.material-takeoff` | Tetőgeometria és választható anyagcsoportok mennyiségi képe | Forma, geometria, opcionálisan timber/underlay/covering paraméterek | Tetőfelület, szarufa/léc geometriai mennyiség, fóliakiosztás, fedőtábla-kiosztás | A mennyiség nem automatikus beszerzési vagy statikai igazolás; a kért részekhez hiányos állapot is maradhat. |
| `roof.timber-cutlist` | Szarufa- és léckiosztás részletesebb, sorolt eredménnyel | Ugyanaz a tetőgeometria; a faanyagkérés kényszerített | Geometriai tengelyek, összhossz, cut-list sorok, névleges térfogat | Nem tartalmaz toldást, veszteségoptimalizálást, ácskötést vagy statikát. |
| `roof.rafter-cut` | Egy szarufa hossza és csomóponti/vágási geometria | Fél fesztáv, gerincemelkedés, vízszintes ereszkiülés, HAP; opcionális kapcsolati adatok | Gerendahossz, ereszrész, teljes hossz, hajlás, vágásszögek, csomóponti értékek | Nem tetőfelület-kalkulátor; keresztmetszet és kapcsolati adatok csak az opcionális részletekhez kellenek. |
| `roof.truss-members` | Egyenlő osztású háromszög burkológeometriája | Fesztáv, szerkezeti magasság, fél fesztáv osztásainak száma | Felső öv félhossza, talpszög, panelosztás | Nem számít rácsozatot, kapcsolatot, anyagkihozatalt vagy teherbírást. |

A katalógus explicit módon különíti el ezeket a célokat és korlátokat (`src/domain/calculations/construction/catalog.ts:14-19`). A közös engine-id csak a geometria-alapú számítások átfedését jelzi; nem bizonyítja, hogy a felhasználói felület vagy a mentési szerződés összevonható.

### 4.3. Átfedések és újrahasználható alapok

**Újrahasználható: **

- `roof.material-takeoff` és `roof.timber-cutlist` közös `roofShapeFields`, közös `roofGeometryInputFromFields`, közös geometriai kimenet és közös anyag-specifikációs réteg;
- közös PDF.js dokumentum, preview, kalibráció, forrásjelölt és koppintásos átadás;
- közös `RoofMaterialUiState`, profilforrás- és override-jelölés;
- közös tetőszakasz- és mentési kapuk a két felületnél, ahol a szakasz valóban értelmezhető;
- közös eredményjelentés és korlátozások megjelenítése.

**Nem összevonandó: **

- a `roof.rafter-cut` fél fesztáv/gerincemelkedés modellje nem ugyanaz, mint a teljes tető vetületi modellje;
- a `roof.truss-members` egy tartó burkológörbéjét számolja, nem tetősíkokat;
- a `roof.timber-cutlist` saját kimeneti jelentése és mentési identitása nem válhat a fő anyagkimutatás egyik „nézetévé” adatvesztés vagy félreérthető eredmény nélkül;
- a külön kalkulátorok adatai nem kerülhetnek át automatikusan egymásba, csak explicit, típus- és forrásazonos átadás után.

### 4.4. Jelenlegi állapot fő hiányossága

A motor már képes az opcionális anyagcsoportokat külön kezelni, és az eredményben külön jelzi a geometriai/layout/névleges jelentést (`roof-material-takeoff.ts:11-29`, `66-74`, `120-138`). A UX mégis könnyen egy teljes anyagprofil-sorozat érzetét keltheti, mert a `MaterialSpecEditor` négy csoportot képes megjeleníteni, miközben a felhasználó gyakran csak felületet vagy egyetlen csoportot kér. A redesign feladata ezért elsősorban **láthatósági és belépési sorrend**, nem új számítási motor.

## 5. Termékarchitektúra-alternatívák

| Szempont | A. Egyetlen központi tetőkalkulátor | B. Központi tetőmunkafolyamat + speciális kalkulátorok | C. Jelenlegi szerkezet + egyszerűbb UI |
|---|---|---|---|
| Szakmai lefedettség | Jó a geometria-alapú munkákhoz, gyenge az eltérő inputú rafter/truss feladatoknál | Teljes: közös tetőmunka, megmaradó külön szakmai célok | Teljes, de a belépési modell továbbra is katalógus-szerű maradhat |
| UX | Egy út könnyen túlterhelővé válik; sok feltételes mező | Jó: feladat szerint vezet, csak szükséges csoportot kér | Mérsékelt javulás, de a felhasználó továbbra is kalkulátort választ |
| Karbantarthatóság | Magas feltételes logika és nagy regressziós felület | Közös workflow/state, külön domain-kontraktusok | Legalacsonyabb kódváltozás, de több UI-ismétlés marad |
| Implementációs kockázat | Magas: identitás, mentés, adatátvitel és export összefonódna | Közepes: workflow-réteg és progresszív láthatóság kell | Alacsony-közepes |
| SaaS-bővíthetőség | Egy központi modell nehezen kezeli a későbbi speciális munkákat | Jó: új feladat külön szakmai modulként köthető a workflow-ba | Közepes, több katalógus- és UI-átfedéssel |
| Adatbiztonság | Rosszabb, ha „közös állapot” miatt összekeveri a kalkulátorokat | Jó, ha a calculatorId, sectionId és provenance megmarad | Jó, meglévő izoláció megőrzésével |

### Ajánlás: B, két belépési szinttel

1. **Tetőmunka / geometria-alapú út:** forma, rajz/kézi mód, geometria, eredménycsoportok és profilok.
2. **Speciális szakmai út:** szarufa-kiszabás és rácsostartó-elemek külön inputokkal, ugyanazzal a rajzi infrastruktúrával.

Ezzel a felhasználó nem négy hasonló „tetőkalkulátor” közül választ, de a szakmai különbségek sem tűnnek el. A `roof.material-takeoff` és a `roof.timber-cutlist` felületi munkamenete közösíthető; a számítási és mentési azonosító maradjon külön.

## 6. Tetőforma-first munkafolyamat

### 6.1. Javasolt képernyősorrend

**0. Központi tetőmunka belépő**

Ne legyen külön „Tetőmunka választása” képernyő. A `roof.material-takeoff` központi tetőmunkája közvetlenül a tetőforma-kérdéssel indul; a szarufa-kiszabás és rácsostartó-elemek külön, könnyen elérhető speciális kalkulátorok maradnak.

**1. Milyen tetőt számolsz?**

Vizuális, kis kártyák: Nyeregtető, Félnyeregtető, Kontytető, Sátortető, Félkonty, L/T alaprajz, Manzárd. A kártyán röviden csak a forma és a szakmai ábra legyen. A lista a ténylegesen számítható nyolc formát kövesse.

Legyen külön „Még nem tudom” út. Ez nem választ automatikusan formát, nem indít számítást, és a felhasználót az azonosítási szakaszban tartja.

**2. Hogyan adod meg az adatokat?**

- „Tervrajzból dolgozom” – PDF/kép betöltése, forrás és rajztípus megadása, majd csak bizonyított jelöltek kiválasztása.
- „Kézzel adom meg” – közvetlenül a választott forma első szükséges adatmezője.

A két út ugyanabba a `roofGeometryInput`-ba és ugyanabba az eredményfolyamatba fusson. A rajz csak javaslatot adhat; a kézi érték és a jóváhagyott átvitel azonos domain-szerződést használja.

**3. Szükséges geometria**

Egyenként kérje be a hiányzó mezőket, a választott forma szerint. A mező alatt jelenjen meg a mérési jelentés: épületméret, tetővetület, vízszintes ereszkiülés, tetősík tényleges lejtőhossza.

**4. Kért eredmény / anyagcsoport**

Előbb a kért anyagcsoportok választása jelenjen meg. A jelenlegi P0.1/P0.3 szerződésben a faanyagcsoport még együtt kezeli a szarufa- és léckimutatást; külön alszegmens-választás csak P2 után kerülhet be. A geometria eredménye már az első érvényes geometriai input után látható lehet.

**5. Csak a szükséges paraméterek**

- csak felület: nincs anyagprofil-panel;
- faanyag: a közös faanyagcsoport és kiosztási paraméterek;
- fólia: csak tekercs-, átfedés- és fektetési adatok;
- fedés: csak termék- és fedési paraméterek;
- teljes kimutatás: csoportonként egy ellenőrizhető profilkártya.

**6. Eredmény**

Az eredmény sorrendje: tetőforma és bemenet-provenance, tetővetület, tényleges tetőfelület, kért csoportok, állapot és korlátozások. A nem kért csoportok ne jelenjenek „hiányosként”.

**7. Mentés**

A mentés csak teljes és érvényes, kért eredményekre nyíljon meg. A rajzi szakaszoknál maradjon külön név, fedettségi jóváhagyás, assumption-gate és szakaszonkénti mentés.

### 6.2. Kivétel a tetőforma-first szabály alól

A `roof.rafter-cut` és `roof.truss-members` indítása esetén ne kérjük előbb a teljes tetőformát. Ezeknél a forma nem része a minimum inputnak. Ha a felhasználó tervrajzból indít, a rajzi forrás és a célmező-kapuk megmaradnak, de nem kell fiktív tetőszakasz-hatókört létrehozni. Ezt a jelenlegi kód is indokolja: a szakaszscope csak a `roof.material-takeoff` és `roof.timber-cutlist` esetén értelmezett (`drawing-field-transfer.ts:27-38`).

## 7. Minimális adatbekérési mátrix

### 7.1. Geometria tetőformánként

| Tetőforma | Kötelező minimum | Opcionális, de eredményt módosító | Biztonsági megjegyzés |
|---|---|---|---|
| Nyereg | épület/tetőhossz, épület/tetőszélesség, hajlás **vagy** tetőemelkedés | vízszintes ereszkiülés, elülső/hátsó homlokzati kiülés | A gable motor külön kezeli a falméretet, a tető teljes hosszát és az ereszkiülést (`gable-roof.ts:74-94`). A kiülés üres és explicit 0 nem ugyanaz a provenance szempontjából. |
| Félnyereg | hossz, szélesség, hajlás | alsó ereszkiülés | A jelenlegi modell az alsó ereszkiülést kezeli; felső/oldalsó túlnyúlásra nincs képlet (`drawing-field-transfer.ts:59-65`). |
| Konty | hossz, szélesség, hajlás | — | A hossz nagyobb kell legyen a szélességnél; a tetősíkok és hip-élek külön jönnek létre. |
| Sátortető | négyzetes oldal, hajlás | — | Nem hossz/szélesség téglalap; az oldalhossz kell. |
| Félkonty | hossz, szélesség, hajlás, félkonty ereszmagassága | — | A séma külön ellenőrzi, hogy a félkonty elférjen a tetőn. |
| L alaprajz | fő hossz, fő szélesség, hajlás, szárny szélessége, szárny kiülése | — | Külön szárnygeometria és vápás/kapcsolati topológia jelenik meg; fedettség és közös él nem következtethető rajzi számokból. |
| T alaprajz | fő hossz, fő szélesség, hajlás, szárny szélessége, szárny kiülése | — | Ugyanaz a topológiai kockázat, mint az L formánál. |
| Manzárd | hossz, szélesség, alsó futás, alsó emelkedés, felső emelkedés | — | Nincs egyetlen közös hajlásszög: a motor alsó és felső síkot külön kezeli (`roof-geometry.ts:101-109`). |

### 7.2. Eredménycsoportonkénti adat

### 7.2a. Tetőforma-támogatási mátrix (P0.1)

| Forma | Geometria / felület | Szarufa és léc | Alátétfólia | Fedőanyag | Megjegyzés |
|---|---|---|---|---|---|
| Nyereg, félnyereg, konty, manzárd | támogatott | geometriai kiosztás | támogatott | síkonkénti layout | A motor nem statikai vagy automatikus beszerzési terv. |
| Sátor, félkonty, L, T | támogatott geometriai layout | geometriai kiosztás | korlátozott / nem támogatott | síkonkénti layout, termékadat-függő | Összetett síkoknál a fedettség, közös él és vápa nem következtethető automatikusan. |

Ez a mátrix a tényleges domain-szerződést tükrözi: az underlay motor jelenleg csak nyeregtető, félnyeregtető, konty- és manzárdformát kezel teljesen; a többi forma nem kap teljes alátétfólia-ígéretet. A fedés általános sík/layout-kimenet, nem gyártói vagy beszerzési optimum.

| Kért eredmény | Szükséges adat | Mit ne kérjünk előre? | Kapu |
|---|---|---|---|
| Csak geometria/felület | Forma + a forma minimum geometriája | Szarufakeresztmetszet, kiosztás, fólia- vagy fedésprofil | Geometriai bemenet valid, ismeretlen szakaszok és nem támogatott topológia nélkül. |
| Szarufa geometriai kiosztás | Geometria + szarufa maximális tengelytávolság | Szarufa keresztmetszet, ha csak darabszám/összhossz kell | Az eredmény geometriai tengely, nem statika; a közös motor explicit limitationt ad. |
| Szarufa névleges térfogat | Geometria + tengelytávolság + teljes keresztmetszeti pár | Csak egy keresztmetszeti oldal | Mindkét oldal kell, a `sectionIssues` egyoldalas adatot hiányosnak kezeli (`roof-material-spec.ts:75-95`). |
| Tetőléc | Geometria + léc sortávolság | Szarufa keresztmetszet | Csak a léc csoportot aktiváld; a szarufát ne jelöld kértnek. |
| Alátétfólia | Geometria + tekercsszélesség/hossz + oldal-/végtoldás + fektetési irány | Szarufa- és fedésprofil | A jelenlegi motor explicit hiányzó paramétereket ad vissza, és nem használ területosztást tekercsdarabszámként (`roof-underlay.ts:105-132`). |
| Fedés | Geometria + termékadat: névleges/hasznos szélesség és hossz, szükséges forrás | Általános „cserép” vagy kitalált gyártói érték | Gyártói termékadat és forrás nélkül darabszám ne jelenjen meg; a kimenet layout, nem beszerzési optimum. |
| Rafter-cut | fél fesztáv + gerincemelkedés + ereszkiülés; HAP és kapcsolatok csak részletekhez | Teljes tetőforma és anyagprofil | Egyetlen szarufa-kalkulátor; a `roof-calculator-definitions.ts:70-121` szerint az extra csomóponti mezők nem a minimum hosszszámításhoz tartoznak. |
| Rácsostartó-elemek | fesztáv + szerkezeti magasság + félfesztáv-osztás | Roof shape, tetősíkok, anyagprofil | Burkológeometria, nem rácsozat vagy statika (`construction/catalog.ts:19`). |

### 7.3. Származtatás és alapértékek

Biztonságosan származtatható:

- gable esetén a tetőhajlásból a tetőemelkedés, illetve fordítva, ha a bemenet módja ezt engedi;
- gable esetén a tetősík tényleges lejtőhossza a vízszintes fél fesztávból, ereszkiülésből és hajlásból;
- tetősík-felület a validált síkpoligonokból;
- layout mennyiség a validált geometriai poligonból és explicit kiosztásból.

Nem származtatható biztonságosan:

- falméretből tetőméret;
- forma alapján ereszkiülés;
- alaprajzi méretből hajlás;
- `m²`-ből hossz;
- százalékos lejtésből fokérték automatikusan;
- tetőforma alapján szakaszfedettség;
- termékadat nélkül lécsortávolság, fóliaátfedés vagy fedési hasznos méret.

A jelenlegi kód több történelmi alapértéket megtart, például a gable `eaveOverhangMm: 0` és a `roofShape: gable` kezdőértéket. Ezeket az új rajzi útban ne kezeljük tényként: assumptionként jelenjenek meg, és szakaszos rajzi munkamenetben explicit jóváhagyást kérjenek (`drawing-field-transfer.ts:40-57`).

## 8. Alapérték- és anyagprofil-stratégia

### 8.1. Ajánlott forrási hierarchia

1. **Gyártói vagy szervezetileg ellenőrzött Anyagkezelő-profil** – csak akkor tölti elő az adott mezőt, ha a konkrét technikai mező létezik.
2. **Korábbi munkából átvett profil/snapshot** – csak ugyanazon profil- és forrásazonossággal, felhasználói ellenőrzéssel.
3. **Kézi érték** – mindig felhasználói adat, nem gyártói adat.
4. **DEMO** – csak teszt/kipróbálás; feltűnő DEMO jelöléssel, nem ajánlott szakmai alapértékként.

Ezt a meglévő `MaterialProfile`, `ResolvedSpec`, `sources`, `verification`, `sourceReference` és `overriddenKeys` modell már támogatja (`roof-material-spec.ts:20-61`, `104-151`). Új adattároló nem indokolt.

### 8.2. Profilkártya, nem párbeszédsorozat

Az anyagcsoport aktiválása után egy kártya legyen látható:

- profil neve és eredete;
- minden felhasznált érték és forrásjelölése: Termék / Felülírva / Kézi / DEMO;
- hiányzó mezők egy blokkban;
- „Profil cseréje”, „Kézi értékre váltás”, „Felülírás visszaállítása”;
- rövid szakmai korlát.

Ne nyissunk mezőnként külön modalt. A jelenlegi editor már egy csoportonkénti editorban kezeli a termék/kézi módot és a forrást; a redesign ennek a láthatósági helyét és a kártya hierarchiáját változtassa, ne az adatmodellt.

### 8.3. Konkrét szakmai korlátok

- Szarufaméretet nem szabad általános kezdőértékként beállítani statikai igazolás látszatával.
- Tetőléc-távolság és fóliaátfedés termék-, rendszer- és beépítésfüggő; megbízható külső forrás nélkül csak hiányzó mező.
- Fedési hasznos méretet csak konkrét termékadatból szabad használni.
- A meglévő DEMO profilok (`DEMO fedőtábla`, `DEMO alátétfólia`, `DEMO 80 × 200 mm`, `DEMO 50 × 30 mm`) nem szakmai ajánlások (`roof-material-spec.ts:242-251`).
- Egy profil átvétele nem viheti át a másik kalkulátor kért anyagcsoport-állapotát; a jelenlegi tesztek ezt az izolációt védik (`construction-material-transfer.test.tsx`).

## 9. Tervrajzfeldolgozás – valós állapot és célállapot

### 9.1. Ami használható

- PDF.js szövegréteg, oldal-, forrás- és koordináta-megőrzés;
- explicit mértékegység és magyar tizedesvessző kezelése;
- kétreferenciás kalibráció, amely csak a fizikai méréshez szükséges skálát adja;
- kattintható forrásfelirat és mezőfókusz;
- célmező- és egységellenőrzés;
- meglévő mező felülírásának külön jóváhagyása;
- `roof.rafter-cut` szűk, explicit címkézett szabályai;
- tetőszakasz név, vizuális kijelölés, fedettség- és feltételezés-jóváhagyás;
- v3 export/import, forráshash, helyi munkamenet és konfliktusvédelem.

### 9.2. Ami részleges vagy blokkolt

- A PDF szöveg pozíciója nem bizonyítja, hogy a szám tetőhossz, falhossz, helyiségméret vagy más kategória.
- A `classifyDrawingPlan` csak egy szűk földszinti alaprajz-címkejelölés; ez nem tetőalaprajz-felismerés.
- A jelenlegi általános gyorsátadás csak egyértelmű szám/egység/dimenzió esetén ad javaslatot; több jelölt esetén nincs bizonyíték-alapú automatikus kiválasztás.
- OCR esetén még magas confidence sem jelent műszaki pontosságot. Az aktuális dokumentáció szerint az M12.2 műszaki kapu BLOCKED; E-01-ben a kézi ellenőrzött 15 jelölés szó szerinti OCR-egyezése 0/15 volt.
- Valós, szakértő által címkézett tetőrajz-referenciakészlet, általános precision/recall és elfogadási küszöb nincs bizonyítva.

### 9.3. Javasolt bizonyítékalapú javaslattételi lánc

1. Determinisztikusan gyűjtsd a releváns PDF.js feliratokat, eredeti szöveggel, oldallal, forrással és koordinátával.
2. Ellenőrizd a számformátumot és az explicit egységet; `%`, `m²`, `db`, keresztmetszet és többértékű sor kiesik.
3. A választott tetőforma alapján csak a szükséges mezők szerepét add meg; ez mezőkészlet, nem hozzárendelési bizonyíték.
4. Alkalmazd a kizáró okokat: rajztípus ismeretlen, tetőfedettség nincs igazolva, több jelölt, szakasz bizonytalan, mértékegység konfliktus, alaprajzi falméret.
5. Jelenítsd meg a javaslatot a forrásfelirattal és a „miért erre a mezőre?” magyarázattal.
6. Kérj felhasználói elfogadást vagy javítást; meglévő érték felülírása külön kapu.
7. Csak jóváhagyás után írd a draftba, majd futtasd ugyanazt a validációt és számítást, mint kézi inputnál.

Több lehetséges méret esetén csak akkor adható célmező-javaslat, ha az explicit címke, az egység, a forrástípus, a térbeli kapcsolat és a tetőszakasz-scope együtt kizárja az alternatívákat. Ha bármelyik hiányzik, a helyes viselkedés a „válassz a jelöltek közül” vagy a tartózkodás. Ne jelenítsünk mesterséges százalékos megbízhatóságot.

## 10. Mobil- és desktop-UX terv

### Mobil-first

**Felső sáv:** vissza, munka neve, aktuális lépés; ne legyen egyszerre teljes kalkulátorkatalógus és rajzvezérlő.

**Lépéssáv:** 1 Forma, 2 Adatforrás, 3 Geometria, 4 Eredmény, 5 Beállítás, 6 Mentés. A lépések állapota legyen „kész / hiányos / ellenőrzendő”, ne csak dekoratív progress bar.

**Rajz és mező közelsége:** mobilon a rajzpreview és az aktuális egyetlen bekérendő mező legyen egymás közelében; a többi mező összecsukva maradjon. A koppintási zóna maradjon legalább érinthető méretű, de az átfedő jelöltek legyenek „több lehetséges jelölés” állapotban.

**Eredménycsík:** geometriai felület és állapot röviden legyen látható görgetés közben. A teljes korlátozáslista disclosure alatt maradhat, de a kritikus „nem statikai igazolás” és „nem automatikus beszerzési mennyiség” figyelmeztetés ne tűnjön el.

**Szerkesztés:** minden elfogadott mező legyen visszanyitható; a forrás/provenance maradjon az érték mellett, ne csak egy későbbi auditoldalon.

### Desktop

Három oszlopnál több nem szükséges:

- bal: lépések és tetőforma/eredménycsoport;
- közép: rajz vagy mezőpanel;
- jobb: rövid eredmény és aktív hiányok.

Összetett L/T és több szakasz esetén a középrajz legyen domináns; a jobb oldali összesítés ne sugalljon teljes tetőeredményt addig, amíg a fedettség és a szakaszok nincsenek igazolva.

### Állapotok

Minden képernyőn különüljenek el:

- hiányzó adat;
- érvénytelen adat;
- nem támogatott geometria;
- felhasználói feltételezésre vár;
- forrásból javasolt, még nem elfogadott érték;
- teljes, menthető eredmény.

## 11. Kötelező forgatókönyvek

### A. Egyszerű nyeregtető, csak felület

1. Tetőmunka → geometria és felület.
2. Nyeregtető.
3. Kézi megadás vagy rajzi hossz/szélesség jóváhagyása.
4. Hajlás vagy emelkedés megadása.
5. Ereszkiülésnél explicit 0 vagy tényleges érték; ne legyen csendes feltételezés.
6. „Csak tetőfelület”.
7. Felület és vetület megjelenítése, mentés.

Biztonsági kapu: alaprajzi falméretet ne tekintsük automatikusan tetőméretnek; rajzi út esetén fedett tetőrész-jóváhagyás.

### B. Egyszerű nyeregtető, teljes anyagkimutatás meglévő profilokkal

1. Forma és geometria ellenőrzése.
2. „Teljes anyagkimutatás” kiválasztása.
3. Csoportonként profilkártya: szarufa/léc, fólia, fedés.
4. Profilforrás és hiányzó mezők átnézése.
5. Csak a hiányzó paraméterek bekérése; nincs statikai állítás.
6. Eredménycsoportonként státusz; mentés csak teljes, érvényes kért eredménynél.

Biztonsági kapu: a profilok forrása és override-ja snapshotként maradjon; DEMO ne hasson gyártói adatnak.

### C. Egyszerű tető, csak szarufa- vagy léckimutatás

P2 pontosítás: ezt a külön szarufa-/léc-választást P0.1-ben nem implementáljuk. A jelenlegi `requested` szerződés a timber csoportot együtt kezeli (a kimenetben rafters és battens részletek jelenhetnek meg), ezért külön aktiválás csak későbbi, bizonyított domain-szerződés után kerülhet be P0.3-ba.

1. Tetőforma és geometria.
2. Későbbi szerződésmódosítás után választható külön faanyag-alszegmens.
3. Csak az adott csoport layout-adatai.
4. Keresztmetszet csak akkor, ha névleges térfogat kell; kiosztás a tényleges kérés szerint.

Biztonsági kapu: ha a felhasználó nem kéri a szarufát, ne kérjünk szarufakeresztmetszetet és kiosztást; ha csak geometriai hossz kell, ne jelenjen meg statikai vagy gyártási nyelv.

### D. Tervrajz, amelyről csak hossz és szélesség igazolható

1. Forma kézi kiválasztása vagy „nem azonosított” megállás.
2. Rajztípus és fedett szakasz megadása.
3. Két jelölt kiválasztása/ellenőrzése; explicit egység vagy egyszeri egységkérés.
4. Hossz és szélesség jóváhagyása forrással.
5. Hajlás, ereszkiülés és szakaszkapcsolatok külön bekérése.
6. Csak az igazolt szakaszra számítás.

Biztonsági kapu: a két igazolt méretből sem állapítható meg automatikusan a forma, hajlás vagy teljes tetőfedettség.

### E. Összetett, több szakaszos tető, bizonytalan kapcsolatokkal

1. Szakaszonként név és vizuális kijelölés.
2. Minden szakasz külön geometriai input és provenance.
3. Közös él, vápa, átfedés és összefüggés csak explicit szakmai jóváhagyással.
4. Bizonytalan kapcsolatnál csak szakaszonkénti rész-eredmény; nincs teljes tetőösszesítés.
5. Szakaszonkénti mentés és külön forrásazonosság.

Biztonsági kapu: a jelenlegi A3/P3.5.1 jellegű fedettségi és mentési kapuk maradjanak; a kijelölés nem egyenlő méréssel.

### F. Rajz nélküli gyors kézi számítás

1. Tetőmunka → kézi megadás.
2. Forma.
3. A forma első hiányzó kötelező mezője.
4. Az első geometriai eredmény azonnal látható.
5. Eredménycsoport aktiválása után a további paraméterek.
6. Mentéskor a bemenet, forrás és korlátozás snapshotja.

Biztonsági kapu: az út gyors, de a mentés és a korlátozások nem lazulnak.

## 12. Mit tartanék meg, egyszerűsítenék vagy halasztanék?

| Döntés | Tételek |
|---|---|
| **Változtatás nélkül megtartanám** | közös domain-geometria; zod validációk; eredmény/provenance; kért anyagcsoportok; profil source/override jelölés; PDF.js forrás- és koordináta-megőrzés; kétreferenciás kalibráció; explicit jóváhagyás; section coverage és save gate; calculatorId/sectionId izoláció; source hash és konfliktusvédelem. |
| **Egyszerűsíteném** | első belépést tetőmunka-központúra; a katalógus helyett forma- és feladatkártyák; a teljes űrlap helyett egyetlen hiányzó mező; anyagparamétereket csoport-aktiválás után; a korlátozásokat egy összefoglaló kártyába. |
| **Összevonnám felületi szinten** | `roof.material-takeoff` és `roof.timber-cutlist` tetőgeometriai munkaterét, rajzi útját, eredmény- és profilkártyáit. A domain- és mentési identitást nem vonnám össze. |
| **Elrejteném, de megtartanám** | fejlett csomóponti/HAP/gerincszelemen mezők; részletes underlay packing; fedési layout-korlátok; provenance technikai részletei, amelyek alapállapotban összefoglalóként jelennek meg. A szakmai figyelmeztetés nem rejthető el teljesen. |
| **Megszüntetném csak későbbi jóváhagyással** | párhuzamos, duplikált felső belépési útvonalak; olyan történelmi mezők vagy UI-panelek, amelyek bizonyítottan nem adnak értéket. Előbb usage- és mentési migrációs bizonyíték kell. |
| **Későbbi kutatásra halasztanám** | tetőrajz- és formafelismerés; általános méretmező-osztályozás; OCR pontossági kapu; gyártói kezdőérték-kutatás; veszteség- és szabásoptimalizálás; összetett vápák/közös élek teljes automatikus kezelése. |

## 13. Kockázatok és invariánsok

| Kockázat | Hatás | Kötelező védelem |
|---|---|---|
| Falméretből tetőméret lesz | Felület- és anyagmennyiség torzul | Forrásjelentés, fedettségi megerősítés, kézi jóváhagyás. |
| Csendes 0 ereszkiülés | Szisztematikus felületeltérés | Explicit `0` és „nincs megadva” külön állapot; rajzi úton assumption-gate. |
| Rossz tetőforma | Hibás mezők és síkok | Nincs automatikus kitalálás; „nem azonosított” megállás. |
| OCR számhibája | Tízszeres vagy rossz dimenzió | M12.2 BLOCKED; OCR-ből nincs automatikus numeric átvitel. |
| Alapérték statikának tűnik | Szakmai és felelősségi kockázat | Forrás/provenance kötelező; nincs új számszerű default kutatás nélkül. |
| Kért csoportok összekeverése | Felesleges input vagy hibás státusz | `requested` csoportonkénti gating; nem kért rész ne blokkolja az eredményt. |
| Szakaszok összeöntése | Dupla vagy hiányzó mennyiség | Szakaszonkénti calculation/session key, coverage és explicit whole-roof confirmation. |
| Két kalkulátor adatfolyamának szivárgása | Félrevezető eredmény vagy adatvesztés | Kalkulátoronkénti draft/material/source állapot; explicit kompatibilitás és source identity. |
| Geometriai mennyiség beszerzésként jelenik meg | Túlzott bizalom | A jelenlegi `GEOMETRIC/LAYOUT/NOMINAL/PROCUREMENT` jelentés maradjon látható; a roof takeoff nem automatikus beszerzési lista. |

## 14. Prioritásos roadmap

### P0 – Belépés és biztonság, külön tesztelhető

**P0.1 Tetőmunka-belépő és safe unknown forma**  
Függőség: nincs.  
Elfogadás: a központi `roof.material-takeoff` flow első érdemi döntése a tetőforma; utána a meglévő rajz/kézi módválasztó jelenik meg; ismeretlen forma nem indít számítást; a speciális kalkulátorok és a négy kalkulátor-identitás megmarad.

**P0.2 Forma-alapú mezőláthatóság és fokozatos hiánykérés**  
Függőség: `roof-calculator-definitions.ts`, meglévő `isFieldVisible`, `fieldContractIssues`.  
Elfogadás: csak a választott forma mezői látszanak; a következő hiányzó adat jelenik meg; validáció és szerveroldali újraszámítás változatlan marad.

**P0.2 megvalósítási állapot (2026-11-04): PASS.** A központi `roof.material-takeoff` út a forma és a kézi/rajzi mód után a meglévő definíciókból számolja a szükséges geometriai mezőket, és a „Következő szükséges adat” jelzéssel vezeti a hiányt. A történelmi 0 mm ereszkiülés új kézi munkamenetben nem számít explicit felhasználói értéknek: üresen marad, míg a ténylegesen beírt `0` érvényes bemenet. A material-paraméterek csak valid minimális geometria után jelennek meg; a meglévő mentési, rajzi jóváhagyási és szerveroldali számítási kapuk változatlanok maradtak. Új wizard, új anyagprofil, OCR és számítási motor nem készült.

**P0.3 megvalósítási állapot (2026-11-04): PASS WITH LIMITATIONS.** Valid geometria után a központi anyagkimutatás egyetlen, mobilbarát `requested` választóval kínálja a faanyag/léc, alátétfólia és fedőanyag csoportot. A geometriai eredmény anyagcsoport nélkül is megjelenik, de az anyagkimutatás mentése továbbra is tiltott, mert a meglévő mentett output-szerződés teljes anyagcsoportot és specifikációs snapshotot vár. A kért csoportok paraméterei kizárólag bekapcsoláskor renderelődnek; kikapcsoláskor nem törlődnek, visszakapcsoláskor visszaállnak. A `timber` domain-szerződés jelenleg a szarufát és a lécet közös csoportként kezeli, ezért külön kapcsoló nem készült.

**P0.3 Kért anyagcsoportok valódi UI-gatingje**  
Függőség: meglévő `requested` és `calculateRoofMaterialTakeoff`.  
Elfogadás: csak felület kérésénél nincs material editor; csak fóliánál nincs szarufa- vagy fedésprofil; nem kért csoport nem blokkolja a státuszt.

**P0.4 Rajzi bizonyíték- és scope-kapuk megtartása az új sorrendben**  
Függőség: `drawing-field-transfer`, `drawing-quick-transfer`, section/session állapot.  
Elfogadás: a forma kontextus, nem bizonyíték; falméret nem kerül automatikusan tetőmezőbe; meglévő érték felülírása és fedettség külön jóváhagyás.

### P1 – Profilok és kimenet

**P1.1 Csoportonkénti anyagprofil-kártya és gyakori anyagszett**  
Függőség: P0.3, meglévő `ResolvedSpec`.  
Elfogadás: product/override/manual/demo eredet látható; hiányzó mezők egy helyen; nincs új adattároló; snapshotban a ténylegesen használt érték marad. A „Saját alapanyagszettem / Gyakran használt beállításaim” meglévő Anyagkezelő-profilokra épülő, szerkeszthető UX-preset legyen, látható eredettel; ne jelentsen automatikus statikai vagy gyártói megfelelőséget.

**P1.1 megvalósítási pontosítás (2026-11-04):** külön anyagszett helyett az Anyagkezelő variánsának meglévő `technical_specs` mezője hordozhatja az egyetlen `roof_calculator_default_group` jelölést. Új munkánál csak pontosan egy, aktív katalógusból érkező, teljes, `verified` jelölt választható ki automatikusan. Hiányos, DEMO, becsült/felhasználói eredetű vagy többes jelölés esetén nincs találomra választás; a meglévő termékválasztó és kézi bevitel marad. A termékadatként előtölthető minimum: szarufa/léc keresztmetszetpár, fólia tekercsszélesség és -hossz, fedés névleges/hasznos szélesség és fizikai/használható hossz. Kiosztás, léc-/szarufatávolság és fóliaátfedés nem feltétele az automatikus kiválasztásnak, mert munkaspecifikus lehet. Ár nem kerül a kalkulátorba. Új tábla, migráció és tenant-szintű mintatermék-feltöltés nem készült.

**P1.1.1 stabilizálási pontosítás (2026-11-04):** a mentett output-specifikáció immutable revíziós snapshotként szolgál. Revízió újranyitásakor a kalkulátor historikus profilt épít vissza a snapshotból, ezért archivált vagy közben módosult katalógustermék nem cseréli le csendben a mentett értékeket; az eltérés az anyagpanelen látható és kézzel felülírható. Új revízió mentésekor a server action ugyanebből a snapshotból használ fallbacket, ha a korábbi termék már nem aktív. Ez kizárólag meglévő mezőket és szerződéseket használ; séma-, RLS- és RPC-változás nem történt.

**P1.2.1 anyagmező-pontosítás (2026-11-04):** az automatikus kiválasztási kapu és az immutable snapshot-szerződés nem változik. Az anyagcsoport egyetlen kompakt forrás-sort mutat, alatta a műszaki értékek azonnal szerkeszthetők. A termék és kézi mód közti váltás kontextuális művelet; nincs külön szegmenses módválasztó, kategóriaszűrő, ismételt összefoglaló vagy szerkesztési disclosure. A felülírt érték és a visszaállítás látható marad. A HAP mező és mérési szöveg megmarad, a külön HAP-ábra nem. Az UI a meglévő TetőPro tokeneket használja, új tároló, számítási ág, függőség vagy ármegjelenítés nélkül.

**P1.2 Eredmény- és korlátozás-hierarchia**  
Függőség: P0.3.  
Elfogadás: geometria előbb megjelenik; csak kért részek látszanak; `GEOMETRIC`, `LAYOUT`, `NOMINAL` jelentés és statikai/beszerzési korlát nem veszhet el.

**P1.3 Közös geometriai workspace, külön kalkulátor-azonosítókkal**  
Függőség: P0.1–P0.4.  
Elfogadás: material-takeoff és timber-cutlist megosztja a rajz- és formai munkateret; mentett revision, source identity, section key és output calculatorId továbbra is izolált.

### P2 – Mobil és összetett tetőmunka

**P2.1 Mobil rajz–mező közelség és vezetett one-field flow**  
Függőség: P0.4.  
Elfogadás: egy aktuális hiánymező, forrásfelirat és eredménycsík egy képernyőközelségben; 44 px körüli érintési célok; nincs vízszintes túlcsordulás; billentyűzet/fókusz működik.

**P2.2 Több tetőszakasz és bizonytalan kapcsolat kezelése**  
Függőség: meglévő section/session kapuk, P1.3.  
Elfogadás: rész-eredmény lehetséges; nem igazolt közös él/vápa nem kerül teljes összesítésbe; szakaszonkénti mentés és visszaköthető forrás megmarad.

### P3 – Bizonyítékgyűjtés, nem automatikus „AI-varázslat”

**P3.1 Címkézett tetőrajz-referenciakészlet**  
Függőség: szakértői együttműködés és adatkezelési jóváhagyás.  
Elfogadás: rajztípus, forma, fedett szakasz, dimenziókategória és egység címkézve; negatív minták is szerepelnek.

**P3.2 Mérhető extraction gate**  
Függőség: P3.1.  
Elfogadás: külön mérhető PDF.js/OCR küszöbök; az OCR confidence nem helyettesíti a műszaki pontosságot; a kapu teljesüléséig nincs automatikus mezőkitöltés.

**P3.3 Gyártói és szakmai default-kutatás**  
Függőség: gyártói források, termékverziók és felelősségi szabály.  
Elfogadás: minden defaultnak forrás, hatókör, érvényességi dátum és provenance van; statikai vagy termékalkalmassági állítás nincs forrás nélkül.

## 15. Rövid válaszok a végső kérdésekre

1. **Megtartanám-e a több külön tetőkalkulátort?** Igen, de közös tetőmunkafolyamatból navigálva. A material-takeoff és timber-cutlist felületileg közelíthető, a rafter-cut és truss-members szakmailag külön marad.
2. **Jó-e a Tetőforma → Rajz vagy kézi megadás sorrend?** Igen a geometria-alapú tetőmunkáknál; nem kötelező előlépés a formafüggetlen rafter-cut és truss-members speciális kalkulátoroknál.
3. **Hogyan lesz a legkevesebb kézi adatbevitel?** Forma alapján csak releváns mezők, egyenkénti hiánybekérés, PDF.js-ből csak explicit és forrással ellátott jelöltek, profilok újrahasználata, csoportonkénti késleltetett material input. Nem automatikus kitalálással.
4. **Mely funkciók használhatók újra?** A közös geometriai engine, `roofGeometryInputFromFields`, `isFieldVisible`, `requested` anyagcsoportok, `ResolvedSpec` profilmodell, PDF.js/kalibráció/átvitel, section coverage, save gate, v3 work-session és source hash.
5. **Első három legnagyobb felhasználói értékű fejlesztés:** (a) tetőmunka- és tetőforma-központú belépés, (b) valódi progresszív adatbekérés és anyagcsoport-gating, (c) forrással ellátott, ember által jóváhagyott rajzi gyorsátvitel mobilon.

## 16. Ellenőrzött hivatkozások

- [Tetőgeometriai input és kimenet](../src/domain/calculations/roof-geometry.ts:4) és [nyeregtető-séma](../src/domain/calculations/gable-roof.ts:14)
- [Tetőkalkulátor-mezők és kalkulátor-definíciók](../src/features/calculators/roof-calculator-definitions.ts:21)
- [Közös konstrukciós számítás és kért anyagcsoportok](../src/features/calculators/construction-computation.ts:60)
- [Tetőanyag-kimutatás és quantity jelentések](../src/domain/calculations/roof-material-takeoff.ts:9)
- [Anyagprofil, provenance és DEMO profilok](../src/domain/calculations/roof-material-spec.ts:20)
- [Kalkulátorkatalógus és szakmai korlátok](../src/domain/calculations/construction/catalog.ts:14)
- [Rajzi extraction szabályok és M12.2 BLOCKED státusz](AI_DRAWING_EXTRACTION_RULES.md)
- [Rajzi tesztmátrix](AI_DRAWING_TEST_MATRIX.md)
- [Rajzi scope, assumption és mentési kapuk](../src/features/calculators/drawing-field-transfer.ts:27)
- [Célmezős javaslat és jóváhagyás](../src/features/calculators/drawing-field-transfer.ts:90)
- [Koppintásos átadás](../src/features/calculators/drawing-quick-transfer.ts:1)
- [Helyi rajzi munkamenet és forráskötés](../src/features/calculators/drawing-session-retention.ts:12)
- [Projekt dokumentációs olvasási protokoll](README.md), [tudástérkép](LIBRARY.md), [forrástérkép](maps/SOURCE_INDEX.md)

## P0.4 QA — 2026-11-04

**Státusz: PASS WITH LIMITATIONS.**

- A tetőforma-választó baseline-ja a meglévő 2.5D szürke–sárga kalkulátorikon-rendszerhez igazodott: a chooser SVG-jei ugyanazt a vizuális nyelvet és témaváltozókat használják.
- A kártyákból kikerült az ismétlődő „Geometria és síkonkénti kiosztás” szöveg; csak a négy korlátozott alátétfólia-támogatású forma kap rövid, döntést segítő jelzést.
- A fő hierarchia most egy cím + egy rövid segítő mondat; az ismeretlen forma figyelmeztetése csak kiválasztás után jelenik meg.
- Valódi böngészős ellenőrzés: `localhost:3000/kalkulatorok?organization=demo`, sötét téma, 1440×900, 375×812 és 812×375. A chooser és a módválasztó vizuálisan renderelődött; a 375/812 px szélességeken a dokumentum szélessége megegyezett a viewporttal.
- Interakciós bizonyíték: a „Nyeregtető” kiválasztása a „Tervrajzból dolgozom / Kézzel adom meg” módválasztóhoz vezetett.
- Automatizált bizonyíték: 16 érintett rajzi/átviteli/mentési tesztfájl, 275 teszt zöld; TypeScript és érintett ESLint zöld; `git diff --check` zöld.
- A biztonsági, provenance-, konfliktus-, fedettség-, session-, revision- és mentési szerződésekhez nem nyúltam.
- Korlát: a `ui-ux-pro-max` skill jelzett útvonala ezen a gépen nem volt olvasható, ezért a tényleges UI baseline-t a meglévő komponensekből és CSS-tokenekből vettem; a light theme külön vizuális screenshotja nem készült, mert ezen az útvonalon a theme toggle nem volt renderelve.

## P0.4/P1 UI/UX audit és termékarchitektúra-terv — 2026-11-04 (tervezési kör)

**Státusz: AUDIT COMPLETE — PLAN ONLY / READY FOR USER DECISION.**

Ebben a körben az alkalmazáskódhoz, CSS-hez, komponensekhez, ikonokhoz, SVG-khez, adatbázishoz, kalkulációs motorhoz, kalkulátorazonosítóhoz és felhasználói változtatásokhoz nem nyúltam. A módosítás kizárólag ennek a tervdokumentumnak a melléklete. Commit, push, deploy, reset és clean nem történt.

### 17. A prompt szakmai felülvizsgálata

A kérés helyesen választja szét a felületi egyszerűsítést a számítási és mentési identitástól. A „központi tetőmunkafolyamat” nem jelenthet egyetlen motor vagy egyetlen `calculatorId` létrehozását: a `roof.material-takeoff`, `roof.timber-cutlist`, `roof.rafter-cut` és `roof.truss-members` külön szakmai eszköz és külön mentési identitás marad.

Az ikonokra vonatkozó korlátot szigorú invariánsként kezelem: a korábbi tetőforma-illusztrációk nem cserélhetők le új, önálló SVG-rendszerre jóváhagyás nélkül. A terv ezért új ikonok generálása helyett a már meglévő, geometria alapján renderelt illusztrációk újrahasználatát javasolja.

Az „egy elsődleges flow” javasolt értelmezése: a `roof.material-takeoff` az első belépési pont, a többi tetőeszköz másodlagos szakmai eszközként látszik, de közvetlenül elérhető marad. Ez a legkisebb olyan változtatás, amely csökkenti a döntési terhet és közben nem törli a meglévő workflow-kat.

Nyitott döntés marad, hogy a „Tetőmunka” csak vizuális munkaterület-címke legyen-e, vagy a globális `Kalkulátorok` navigációs címkét is átírja. A terv alapértelmezése az előbbi: a globális route és navigáció maradjon stabil, a központi munkaterület címe legyen egyértelműbb.

### 18. Felhasznált és hiányzó skill-ek

- `frontend-app-builder`: elolvastam; a meglévő komponens- és layout-szerkezet megtartására, valamint a vizuális QA szempontjaira használtam. Új koncepciókép vagy asset-generálás nem indokolt, mert ez a kör audit és terv, nem implementáció.
- `frontend-testing-debugging`: elolvastam; a működő localhost-felület, route/state viselkedés, viewportok, overflow és konzol ellenőrzéséhez használtam. A külön Browser skill nem volt elérhető, ezért az in-app browser CUA felületén ellenőriztem.
- `react-best-practices`: elolvastam; a route-állapot, local draft, saved session és külön kalkulátoridentitás szétválasztását vettem alapul.
- `systematic-debugging`: elolvastam; az URL/state eltérésnél reprodukció → kódútvonal → gyökérok sorrendet követtem.
- `verification-before-completion`: elolvastam; a terv állításait friss böngészős bizonyítékhoz kötöttem, és az implementációs „kész” állítást nem teszem meg.
- `ui-ux-pro-max`: nem volt olvasható a gépen a jelzett `/Users/bence/.agents/skills/ui-ux-pro-max/SKILL.md` útvonalon, ezért nem használtam és nem telepítettem. A terv a repository meglévő UI-rendszeréből és a tényleges renderből indul ki.

### 19. Az aktuális UI- és ikonállapot bizonyítékai

Az aktuális `construction-suite.tsx` a következő hierarchiát rendereli: globális `Kalkulátorok` cím, mentett számítások és új kalkuláció akció, három kategóriafül, bal oldali kalkulátorlista és kereső, majd jobb oldalon az `ELLENŐRZÖTT GEOMETRIAI SZÁMÍTÁS` eyebrow, a kiválasztott kalkulátor címe és a tetőforma-választó. Ez működő állapot, de ugyanazt a döntést több egymásra rakódó cím- és listaelem közvetíti.

Az eszközikonok forrása a `ConstructionCalculatorThumbnail` (`src/features/calculators/construction-thumbnails.tsx:315`), amely a `2.5d-gray-yellow` vizuális nyelvet deklarálja. Ezeket KEEP állapotban kell hagyni.

A korábbi, újrahasználható tetőforma-illusztrációk a `RoofTypeSelector` (`src/features/roof-models/roof-type-selector.tsx:7`) komponensben vannak: a `RoofTypeIllustration` a `calculateRoofGeometry` eredményéből síkokat és éleket rajzol, tehát nem puszta dekoráció. Hét formát fed le: félnyeregtető, nyeregtető, kontytető, sátortető, félkonty, L és T alak. A `mansard` szerepel a mintageometriában, de nincs benne a közös `roofTypeOptions` listában; ezt termékdöntésként kell kezelni, nem új ikon készítésével.

A jelenlegi kalkulátoros chooser külön, inline `RoofShapeGlyph` útvonalat használ (`src/features/calculators/construction-suite.tsx:157`, `:168`, `:175`). A Git-történetben erre a `RoofShapeGlyph` és a `.roof-shape-card` implementációra nem találtam korábbi commitot; ezért a történelmi szerző vagy a korábbi képernyő pontos eredete nem bizonyítható. Biztosan állítható viszont, hogy a jelenlegi chooser nem a már létező `RoofTypeIllustration` komponenst használja. Javaslat: az illusztráció-forrás jóváhagyása után a meglévő geometriai renderelést kell újrahasználni; ebben a körben nincs ikoncsere.

### 20. P0.1–P0.4 eltérések és bizonyított regressziók

| P0 | Bizonyíték | Megállapítás | Terv szerinti kezelés |
|---|---|---|---|
| P0.1 belépési hierarchia | 1440×900 böngészős render; globális cím + kategóriafül + bal lista + workspace eyebrow/cím + chooser | A tetőmunka központi flow létezik, de a felhasználó több katalógus- és címzési szinten navigál ugyanahhoz a döntéshez. Ez IA/UX regresszió, nem számítási hiba. | A `roof.material-takeoff` legyen az egyértelmű elsődleges flow; a többi tetőeszköz másodlagos disclosure alatt maradjon. |
| P0.2 forma- és ikonbaseline | A jelenlegi `RoofShapeGlyph` a `construction-suite.tsx`-ben külön inline rajzoló; a közös `RoofTypeSelector` geometria-alapú illusztrációkat használ; stand-alone tetőforma SVG assetet nem találtam. | A formai vizuális források duplikálódnak. Az ikoncsere történelmi eredete nem bizonyítható, a jelenlegi eltérés viszont kódból bizonyított. | Közös, már meglévő geometriai illusztráció-baseline; új SVG nélkül. A mansard lefedéséről külön döntés kell. |
| P0.3 kalkulátor- és URL-állapot | Reprodukció: közvetlenül megnyitottam `?calculator=roof.timber-cutlist` URL-t, majd a bal listában a „Tetőanyag-kimutatás” gombra kattintottam. A látható aktív elem material-takeoff lett, de az URL maradt `calculator=roof.timber-cutlist`. | Bizonyított state/deep-link regresszió nem mentett munkamenetben. A `selectCalculator` csak local `selectedId`-t állít; router-frissítés csak a „new calculation” mentett ágában látható (`construction-suite.tsx:388`, `:688`). | Külön, jóváhagyott javítás: minden kalkulátorváltásnál az URL, az aktív gomb, a reload és a szerveroldali `initialCalculatorId` legyen konzisztens. Ebben a tervezési körben nem javítottam. |
| P0.4 mobil/QA korlát | 375×812 és 812×375 render; `scrollWidth === innerWidth`; konzolban nem volt error/warning. A landscape első viewporta főleg fejlécet, kategóriákat és a mobil kalkulátorváltót mutatja. | Vízszintes overflow nem bizonyított, de a flow hosszú és fekvő mobilon kevés munkatér látszik egyszerre. Light theme screenshot nem készült. | A responsive tervben külön input–rajz–eredmény elrendezés, fókuszkezelés és light/dark ellenőrzés kell. |

Nem bizonyított ebben az auditban domain-geometriai, számítási, provenance-, adatbiztonsági vagy mentési identitás-regresszió. Ezeket a meglévő engine- és tesztinvariánsok miatt meg kell őrizni, de a jelen dokumentum nem állít új zöld tesztfutást.

### 21. Jelenlegi és javasolt információs architektúra

**Jelenlegi út:**

`App navigáció → Kalkulátorok oldalfejléc → Mentett számítások / Új kalkuláció → 3 kategóriafül → kalkulátorlista és kereső → kiválasztott kalkulátor címe → tetőforma → rajz vagy kézi bevitel → geometria → anyagcsoportok → eredmény/mentés`

**Javasolt út:**

`App navigáció → stabil Kalkulátorok route → Tetőanyag-kimutatás munkacím → tetőforma → rajz vagy kézi bevitel → csak a szükséges geometriai mezők → Mit szeretnél kiszámolni? → kért anyagcsoport-paraméterek → eredmény és mentés`

A `Faanyag és vágáslista`, `Szarufa kiszabása` és `Rácsos tartó elemei` a fő munkaterület alatt egy összecsukható **További szakmai eszközök** blokkban legyenek. Mindegyik közvetlen linkkel nyissa meg a saját kalkulátorazonosítóját és saját session/draft/snapshot állapotát. A material-takeoff és timber-cutlist felületileg közelíthető, de az eredménykártya soha ne állítsa, hogy ugyanaz a számítás.

A lépcső- és betonozási kategória nem törlendő. Első körben a tetőmunkafolyamat kapjon fókuszt; a többi kategória maradjon stabil, vagy vizuálisan kerüljön a tetőeszközöktől másodlagos helyre. A route, a mentett linkek és a négy `SAVEABLE_CONSTRUCTION_CALCULATORS` identitása maradjon változatlan.

### 22. Konkrét munkafolyamatok

**A. Geometriai előnézet.** Forma → kézi/rajzi mód → minimum geometria → geometriai eredmény. A felület írja ki, hogy ez geometriai előnézet, nem automatikus beszerzési lista.

**B. Teljes anyagkimutatás.** Ugyanezután a `requested` csoportválasztó jelenik meg: faanyag/léc, alátétfólia, fedés. Csak bekapcsolt csoport kérjen profil- és paraméteradatot. A mentési kapu és a specifikációs snapshot maradjon a meglévő szerződés szerint.

**C. Tervrajzi bevitel.** Forma → tervrajzból dolgozom → dokumentum, kalibráció és forráskötés → mezőjavaslat → emberi jóváhagyás → coverage/assumption ellenőrzés → hiányzó mezők kézi pótlása. A forma nem bizonyíték, a rajzból nem szabad automatikusan tetőjelentést kitalálni.

**D. Speciális eszköz.** A felhasználó a másodlagos eszközlistából például a `roof.rafter-cut` eszközt nyitja meg. A CTA legyen egyértelmű („Megnyitás szarufakiszabásként”), ne ígérje ugyanazt a kimenetet, mint a material-takeoff.

**E. Mentett munka.** Mentett URL megnyitásakor a mentett kalkulátorazonosító, revision, source identity, section/session állapot és draft ne essen vissza a központi alapértelmezett formára. A formai chooser csak akkor jelenjen meg új döntési lépésként, ha a mentett munka ezt valóban igényli.

### 23. Szöveges wireframe-ek

#### 1440×900 — desktop

```text
┌ App nav ┐ ┌──────────────────────────────────────────────────────────────────────┐
│ Műhely  │ │ Tetőanyag-kimutatás                         Mentett számítások →    │
│ ...     │ └──────────────────────────────────────────────────────────────────────┘
│         │ ┌──────────────────────────────────────────────────────────────────────┐
│         │ │ Tetőforma                                                            │
│         │ │ Rövid helper: a forma alapján csak a szükséges méretek jelennek meg. │
│         │ │ [Nyereg] [Félnyereg] [Konty] [Sátor]                                │
│         │ │ [Félkonty] [L alak] [T alak] [Manzárd / döntés szerint] [Nem tudom]  │
│         │ └──────────────────────────────────────────────────────────────────────┘
│         │ ┌─────────────────────┬────────────────────────────────────────────────┐
│         │ │ Mód                 │ Aktív geometriai mező / rajz                   │
│         │ │ [Tervrajzból]       │ [rajzfelület vagy mezőcsoport]                  │
│         │ │ [Kézzel]            │ hiányzó adat + forrás + jóváhagyás              │
│         │ └─────────────────────┴────────────────────────────────────────────────┘
│         │ ┌──────────────────────────────────────────────────────────────────────┐
│         │ │ Mit szeretnél kiszámolni? [Fa/léc] [Fólia] [Fedés]                   │
│         │ │ Geometriai eredmény | kért csoportok állapota | Mentés                │
│         │ └──────────────────────────────────────────────────────────────────────┘
│         │ [További szakmai eszközök ▸  Szarufa | Faanyag/vágáslista | Rácsos]    │
└─────────┘
```

#### 375×812 — portrait

```text
┌──────────────────────────────┐
│ ← Vissza a műhelyhez         │
│ Tetőanyag-kimutatás           │
│ [Mentett számítások →]        │
│ [Tetőforma ▾]                 │
│ [Nyeregtető                  │
│  illusztráció + kiválasztás] │
│ [Félnyeregtető ...]           │
│ [További formák ...]          │
│ [Tervrajzból dolgozom]        │
│ [Kézzel adom meg]             │
│ Következő szükséges adat      │
│ [egy mező + egység + forrás]  │
│ [Geometriai eredmény]         │
│ [Fa/léc] [Fólia] [Fedés]      │
│ [Mentés]                      │
│ További szakmai eszközök ▸    │
└──────────────────────────────┘
```

375 px-en a másodlagos kalkulátorlista ne foglalja el a fő képernyőt; egy mobil picker/disclosure legyen. A kártyák érintési célja legalább kb. 44 px, a rajz, aktív mező és eredmény pedig egymáshoz közel maradjon.

#### 812×375 — landscape mobile

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Műhely   Tetőanyag-kimutatás                         Mentett →            │
│ [Tetőforma ▾]       [További szakmai eszközök ▾]                            │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Forma / mód / aktív mező      │ Rajz vagy geometriai preview                │
│ [forma kártyák 2 oszlopban]   │ [forrás, kalibráció, jóváhagyás]             │
│ [Tervrajzból] [Kézzel]        │                                             │
├──────────────────────────────┴─────────────────────────────────────────────┤
│ Eredménycsík: geometria | kért anyagcsoportok | Mentés                      │
└────────────────────────────────────────────────────────────────────────────┘
```

Landscape módban nem javasolt vízszintes oldalcsúszás. A két hasáb aránya kb. 40/60 lehet; a másodlagos eszközlista és a hosszú globális kategórialista legyen összecsukva.

#### Light/dark

Mindkét témában azonos markup, állapotjelentés és kontrasztlogika maradjon. Dark módban a jelenlegi sötét felület, szürke–sárga eszközikonok és brand accent maradjon. Light módban a meglévő `data-theme` tokenek (`--foreground`, `--surface-*`, `--brand*`, `--glass-border`) legyenek az egyetlen színforrás; ne készüljön külön, kézzel színezett light ikonrendszer. A kalkulátor route-on a light theme vizuális renderét ebben a körben nem ellenőriztem, ezért ez F5 feladat.

### 24. KEEP / MODIFY / APPROVAL mátrix

| Elem | Bizonyított jelenlegi állapot | Javaslat | Kockázat | Külön jóváhagyás |
|---|---|---|---|---|
| Kalkulátor-eszközikonok | `ConstructionCalculatorThumbnail`, 2.5D szürke–sárga | KEEP, csak méret/pozíció igazítható | Alacsony | Nem |
| Tetőforma-illusztrációk | Külön inline glyph és külön geometriai `RoofTypeIllustration` | A meglévő geometriai illusztráció-baseline újrahasználata; új SVG nincs | Közepes | Igen, különösen mansard esetén |
| Felső címhierarchia | globális cím + eyebrow + kalkulátorcím + chooser-cím | Egy munkacím (`Tetőanyag-kimutatás`) és egy rövid helper; az eyebrow csökkentése vagy elhagyása | Közepes | Igen, copy-döntés |
| Bal oldali kalkulátorlista | négy roof tool folyamatosan látszik | `További szakmai eszközök` disclosure; közvetlen deep linkek maradnak | Közepes | Igen |
| Forma-választó | forma az első valódi döntés, 8 opció + „Még nem tudom” | KEEP mint workflow; vizuálisan közös geometriai render | Közepes | A mansard támogatásához igen |
| Rajzi workspace | meglévő kalibráció, transfer, coverage, jóváhagyás | KEEP; csak sorrend és közelség változzon | Közepes | Nem, ha a szerződések változatlanok |
| URL/state | látható kalkulátor és query eltérhet | F2/F5-ben javítandó; azonosítókat nem szabad összevonni | Magas | Igen, navigációs változtatás |

### 25. F1–F5 megvalósítási terv jóváhagyás után

#### F1 — baseline és regresszióvédelem

- Feladat: rögzíteni a stabil komponenseket, ikonforrásokat, route- és mentési invariánsokat; külön döntést készíteni a hét közös geometriai formáról és a mansard állapotáról.
- Érintett részek: `RoofTypeSelector`, `ConstructionCalculatorThumbnail`, `construction-suite`, route/navigation, mentett számítások.
- Elfogadás: nincs jóváhagyás nélküli ikon/SVG-csere; minden négy roof `calculatorId` és mentett link működési szerződése dokumentált.
- Kockázat: vizuális drift és történelmi baseline hiánya. Függőség: felhasználói ikonbaseline-döntés. Komplexitás: S/M.

#### F2 — központi tető-IA és navigáció

- Feladat: a `roof.material-takeoff` legyen az elsődleges workspace; a három speciális tool disclosure alatt, saját deep linkkel; a három másik építési kategória ne törlődjön.
- Érintett részek: `construction-suite`, `calculator-navigation`, `kalkulatorok` route, saved route/linkek.
- Elfogadás: kattintás, URL, reload, `initialCalculatorId`, aktív listaelem és mentett munka ugyanazt az ID-t mutatja; `timber-cutlist` nem változik material-takeoff-á.
- Kockázat: local draft/session vagy mentett revision elvesztése. Függőség: előbb a P0.3 URL/state regresszió javítása. Komplexitás: M.

#### F3 — forma-választó és copy

- Feladat: a jelenlegi forma-első sorrend megtartása, rövidebb címek/helper, meglévő geometriai illusztrációk reuse, korlátozások egy összefoglalóban, nem kártyánként ismételve.
- Érintett részek: `RoofTypeSelector`, `roof-shape-support`, chooser CSS, accessibility labels/tests.
- Elfogadás: kiválasztott állapot és billentyűzet/fókusz egyértelmű; minden támogatott forma vagy explicit „korlátozott/nem támogatott” állapotot kap; mansard nem kap csendes, félkész ikont.
- Kockázat: a formai lefedés és engine-támogatás összekeverése. Függőség: F1 termékdöntés. Komplexitás: S/M.

#### F4 — kézi/rajzi workspace és eredményhierarchia

- Feladat: forma → mód → minimális geometria → kért anyagcsoport → eredmény sorrend; one-field hiánykérés; drawing scope, source, calibration, approval, coverage és save gate változatlan.
- Érintett részek: `construction-suite`, field transfer, drawing session, computation/material editor, save panel.
- Elfogadás: falméret nem kerül automatikusan tetőmezőbe; explicit `0` és „nincs megadva” külön marad; nem kért csoport nem blokkol; mentett snapshot csak ténylegesen alkalmazott adatokból készül.
- Kockázat: a vizuális összevonás adatfolyam-szivárgást okoz. Függőség: F2 és a meglévő domain-tesztek. Komplexitás: M.

#### F5 — teljes UI regression QA

- Feladat: automated URL/state regression test; böngészős QA 1440×900, 375×812, 812×375 dark és light témában; touch target, focus, keyboard, overflow, chooser, drawing, saved deep link és console ellenőrzés.
- Érintett részek: suite tesztek, route tesztek, existing roof selector tests, browser QA checklist.
- Elfogadás: nincs vízszintes overflow; URL és visible selection azonos; light/dark kontraszt és fókusz látható; a négy kalkulátorazonosító és mentett route regressziómentes; a tesztlog és screenshotok archiválhatók.
- Kockázat: a jelenlegi light route-állapot és valódi mentett adatfolyam még nem lett vizuálisan végigellenőrizve. Függőség: F2–F4. Komplexitás: M.

### 26. Felhasználói döntési kérdések a megvalósítás előtt

1. A „Tetőmunka” csak munkaterület-címke legyen, vagy a globális `Kalkulátorok` címkét is átírjuk? **Javaslat:** csak munkaterület-címke.
2. A speciális eszközök ugyanazon az oldalon disclosure alatt legyenek, vagy külön tool-oldalra kerüljenek? **Javaslat:** ugyanazon oldalon, közvetlen deep linkkel.
3. Jóváhagyott baseline-e a meglévő geometriai `RoofTypeSelector` illusztráció? **Javaslat:** igen; mansardra külön döntés kell.
4. A négy tetőeszköz maradjon-e folyamatosan látható a desktop bal listában? **Javaslat:** csak az elsődleges legyen kiemelt, a három speciális kerüljön disclosure alá; törlés nincs.
5. Maradjon-e az `ELLENŐRZÖTT GEOMETRIAI SZÁMÍTÁS` eyebrow? **Javaslat:** ne legyen második fő cím; a szakmai jelentés rövid helperben vagy státuszkártyában maradjon.
6. Elfogadható-e a material-takeoff alapértelmezett első flow-ja úgy, hogy a timber-cutlist külön identitással és külön eredménnyel nyílik? **Javaslat:** igen; ez a domain- és mentési biztonság legkisebb kockázatú változata.

### 27. Ellenőrzött és nem ellenőrzött állítások

**Ellenőrizve ebben a körben:**

- a jelenlegi route és renderelt IA `localhost:3000/kalkulatorok?organization=demo` alatt;
- a desktop, portrait és landscape viewport képernyője, dokumentum-szélessége és console warning/error állapota;
- a kalkulátorváltás URL/state eltérése reprodukcióval;
- a `construction-suite` selector és heading útvonala;
- a meglévő `ConstructionCalculatorThumbnail` vizuális nyelv és a `RoofTypeSelector` geometria-alapú illusztrációja;
- a jelenlegi shape support lista és a mansard-opció eltérése;
- a `ui-ux-pro-max` skill elérhetetlensége.

**Nem ellenőrizve vagy nem állítom:**

- light theme tényleges böngészős screenshot a kalkulátor route-on;
- valódi mentett adatbázis-rekord teljes megnyitás–szerkesztés–mentés köre;
- teljes production build és teljes regressziós tesztfutás ebben a tervezési körben;
- fizikai érintőeszköz, valódi screen reader és billentyűzet teljes végigjárása;
- a korábbi UI pontos történelmi screenshotja vagy a jelenlegi inline glyph szerzője;
- bármely implementációs javítás.

**Jóváhagyási pont:** a F1–F5 terv csak a fenti döntések után válhat implementációs feladattá. Addig a meglévő alkalmazáskód és a korábbi felhasználói változtatások változatlanok maradnak.

## 28. F1/F2 megvalósítás — 2026-11-04

**Értékelés: PASS WITH LIMITATIONS.**

### 28.1 Szakmai önellenőrzés és legkisebb biztonságos megoldás

A route/state regresszió javításához nem hoztam létre új globális vagy párhuzamos állapotkezelőt. A meglévő `selectedId`, kalkulátoronkénti draft/session tárolás és A1 munkamenet változatlan maradt; a kattintás csak a navigációs URL-t szinkronizálja a már meglévő állapottal.

A URL-építés a jelenlegi `window.location` query-jét módosítja, ezért az `organization`, hash és egyéb query paraméterek megmaradnak. Ha mentett kalkulációból másik eszközre váltunk, a kalkulációhoz kötött `calculation` paraméter törlődik; így a másik eszköz nem töltheti be tévesen a mentett revisiont. A mentett kalkuláció maga nem törlődik: a korábbi deep link később továbbra is megnyitható.

### 28.2 Javított URL/state regresszió

**Gyökérok:** a `selectCalculator` korábban csak a local `selectedId`-t állította, router-navigáció nélkül. Emiatt a látható kalkulátor megváltozhatott, miközben a `calculator` query a korábbi azonosítót tartotta meg. A meglévő route-prop szinkron csak külső propváltozáskor futott, nem a kattintás pillanatában.

**Javítás:** `src/features/calculators/construction-suite.tsx` — kalkulátorváltáskor `router.push(..., { scroll: false })`, az aktuális query paraméterek megtartásával; mentett kalkulációból másik kalkulátorra váltásnál a `calculation` paraméter eldobásával. A browser back/forward propváltozását a meglévő route-szinkron kezeli.

**Regressziós védelem:** `src/features/calculators/construction-suite-drawing-entry.test.tsx` teszteli, hogy a query megmaradó részei és a `calculator` egyeznek, az aktív listaelem frissül, valamint a tetőnavigáció elsődleges/másodlagos felosztása megjelenik.

### 28.3 Központi tetőmunka-navigáció

- A globális `Kalkulátorok` oldal és route változatlan.
- A roof kategóriában a `roof.material-takeoff` jelenik meg **Elsődleges munkafolyamatként**, a workspace pedig közvetlenül a tetőforma-választóval indul.
- A `roof.timber-cutlist`, `roof.rafter-cut` és `roof.truss-members` natív, billentyűzet-kezelhető `details/summary` disclosure alatt, **További szakmai eszközök** csoportban maradnak.
- A lépcső- és betonozási kategória a korábbi külön listás navigációval elérhető maradt.
- Desktopon a speciális lista alapból zárt; deep linkelt speciális kalkulátornál megnyílik. Back navigációval az elsődleges material flow-ra visszatérve ismét zárt.
- A fejlécből kikerült az ismétlődő `ELLENŐRZÖTT GEOMETRIAI SZÁMÍTÁS` eyebrow; a kalkulációs korlátok és státuszok a munkafolyamat későbbi részeiben megmaradtak.

### 28.4 Vizuális regresszióvédelem

Ikon, tetőforma-illusztráció, SVG, grafikai asset, színpaletta, meglévő ikonnyelv vagy tetőforma-glyph nem lett lecserélve. A CSS-változás csak a másodlagos navigáció és az elsődleges lista minimális elrendezését formázza; új animációs vagy új dizájnrendszer nem került be.

Az F3 nyitva maradt: a `RoofTypeIllustration` újrahasználata, a manzárd közös illusztrációja és a light theme glyph-kontrasztjának vizuális döntése nem része ennek a körnek.

### 28.5 Skill- és útmutatóhasználat

- `ui-ux-pro-max` ténylegesen elérhető volt a repositoryban: `.agents/skills/ui-ux-pro-max/SKILL.md`. A deep linking/state preservation, back behavior, responsive secondary navigation, touch target, heading hierarchy és light/dark contrast szabályait alkalmaztam; a lokális keresések a `ux` domainből és `nextjs` stackből futottak.
- `frontend-testing-debugging`: in-app Browser/CUA használata, DOM/console/screenshot, viewport- és interaction-proof ellenőrzés.
- `frontend-app-builder`: meglévő design system és vizuális baseline megőrzése; ImageGen nem kellett, mert új asset és koncepció nem volt engedélyezve.
- `react-best-practices` és `vercel-react-best-practices`: meglévő state-határok megtartása, új párhuzamos store és felesleges render-réteg elkerülése.
- `systematic-debugging`: reprodukció → adatfolyam-követés → gyökérok → minimális fix.
- `test-driven-development`: bukó regressziós teszt, célzott javítás, zöld ellenőrzés.
- `verification-before-completion`: friss teszt-, typecheck-, lint-, diff- és browser-evidence alapján történt a lezárás.

### 28.6 Böngészős eredmények

| Ellenőrzés | Eredmény |
|---|---|
| 1440×900 desktop, dark | PASS: elsődleges material flow domináns, disclosure zárt, nincs eyebrow, nincs vízszintes túlcsordulás |
| 1440×900 desktop, light | PASS WITH LIMITATIONS: layout és navigáció működik; a meglévő világos tetőforma-glyph stroke kontrasztja mért érték szerint kb. 1.39:1, ezt F3-ra hagytam |
| 375×812 portrait, dark/light | PASS: `scrollWidth === innerWidth`, mobil picker és forma-first workspace renderel |
| 812×375 landscape, dark/light | PASS: `scrollWidth === innerWidth`, mobil picker renderel; a hosszú munkafolyamat függőlegesen görgethető |
| Direct deep link + refresh | PASS: material, timber-cutlist, rafter-cut és truss-members mind a megfelelő címmel és aktív állapottal maradt |
| Back/forward | PASS: timber → back esetén material + shape chooser, forward esetén timber + módválasztó |
| Mentett material/timber deep link | PASS: megfelelő kalkulátor, URL és `Mentve · V1` panel megmaradt frissítés után is |
| Mentettből speciális eszköz | PASS: a `calculation` paraméter eltávolodik, a speciális URL frissítés után is megmarad; az eredeti mentett URL visszanyitható |
| Console | PASS: alkalmazási error nem volt; a végső hot-reload ellenőrzésben csak fejlesztői Fast Refresh warning jelent meg |

### 28.7 Tesztbizonyíték

- Célzott Vitest: `31 passed / 31` — `src/features/calculators/construction-suite-drawing-entry.test.tsx`.
- Teljes Vitest: `226 passed / 8 skipped` fájl; `1596 passed / 19 skipped` teszt.
- TypeScript: `npm run typecheck` sikeres, route typegen sikeres.
- Érintett ESLint: `npx eslint src/features/calculators/construction-suite.tsx src/features/calculators/construction-suite-drawing-entry.test.tsx` — `No issues found`.
- `git diff --check` sikeres.

### 28.8 Megőrzött és nem módosított területek

Nem változott adatbázis, RLS, RPC, OCR, domain engine, számítási motor, `calculatorId`, `sectionId`, provenance, P0.1–P0.3 gating, P3.7 rajzos út, T10 dokumentumállapot, A1/A3.1 mentés/export-import, immutable revision, konfliktusvédelem vagy fedettségi jóváhagyás.

Az F3–F5 teljes átalakítása nem indult el. A light theme alacsony glyph-kontrasztja, a valódi fizikai touch/screen reader végigjárás és a teljes production build külön fennmaradó ellenőrzés; ezért a státusz **PASS WITH LIMITATIONS**, nem teljes PASS.

# P1.2.2 — opcionális ereszkiülés (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.**

- A központi anyagkimutatás gable motorja a `lengthMm`/`widthMm` értékeket a falsík menti épületméretként kezeli. A nyeregtetőnél `halfSpan = buildingWidth / 2`; az ereszkiülés hozzáadódik mindkét oldali vízszintes futáshoz, a ferde szarufahosszhoz és a tetővetülethez. A hosszhoz külön első/hátsó homlokzati túlnyúlás adható.
- Az üres ereszkiülés most nem kötelező, és a számítási adapter matematikai 0 mm-rel fut. Ez nem kerül 0-ként a mező- és input snapshotba; az explicit `0` megmarad külön értékként. A korábbi revisionök és számítási verziók nem változtak.
- A pozitív ereszkiülés továbbra is a falméretekhez adódik, mert a jelenlegi mezőszerződés nem tárolja a hossz/szélesség mérési referenciáját. Emiatt a rendszer nem tudja bizonyítani, hogy a pozitív ereszkiülés egy már teljes külső tetőméretet ne növeljen meg kétszer. A helper szöveg egyértelműsíti a jelenlegi szerződést: csak falaknál mért szélességhez kell megadni.
- A 12×6 m, 35° nyeregtető ereszkiülés nélkül 72 m² vetületet és `72 / cos(35°)` m² ferde felületet ad; explicit 0 ugyanezt adja, de eltérő input provenance-szel. 500 mm ereszkiülés falmérethez 84 m² vetületet ad. Ezek a gable motor meglévő geometriájából következnek.
- A közös geometria ugyanazt az eredményt szolgáltatja a faanyag-, fólia- és fedési motoroknak. Ez a módosítás nem változtatott a kiosztási vagy anyagképleteken, illetve a mentési kapun.
- Célzott Vitest: `construction-computation` és `construction-suite-drawing-entry`, 81/81 PASS. A kért teljes desktop/mobil, light/dark böngészős QA és a korábbi mentett revíziók tényleges visszanyitása ebben a körben nem igazolt.

## P1.2.2.1 — input contract és teljes tetőkalkulátor UI/UX review (2026-11-04)

**A: BLOCKED az új, verziózott outer-footprint jelentés implementációjára. B: PASS WITH LIMITATIONS, UI/UX audit elkészült.** A V1 mentett input nem tárolja, hogy a `lengthMm`/`widthMm` falvonal vagy külső ereszvonal. A mentési action a bejövő mezőkből újraszámol; immutable output önmagában nem elég az abból nyitott új revision jelentésének megőrzésére. Rajzi adat szemantikáját sem lehet a mező ürességéből megállapítani.

Új jelentés csak explicit, verziózott input contracttal biztonságos: régi snapshot → `legacy-wall`; új kézi út → `outer-footprint`; rajzi érték → jóváhagyott szemantikus provenance. Addig globális geometriai képlet, pozitív eresz kezelése és label átértelmezés változatlan marad. Az opcionális ereszmező előző P1.2.2 változtatása a régi szerződéshez tartozik, nem bizonyítja az outer-footprint adaptációt.

Az A/B audit részletes bizonyítéka, nyolc tetőforma és három speciális kalkulátor UI/UX-értékelése, P0/P1/P2 javaslatai: [ROOF_CALCULATORS_UI_UX_REVIEW.md](ROOF_CALCULATORS_UI_UX_REVIEW.md). A B fázisban UI-kód nem módosult. Live light desktopon a 12×6 m/35° gable referencia 72,00 m² vetület és 87,90 m² felület volt. A kért viewport/theme mátrix, mentett V1 újraszerkesztése és teljes rajzi QA nyitott maradt.


## P1.2.3/A — Geometry Contract Foundation (2026-11-04)

A verzió nélküli korábbi input snapshotokat a read oldali normalizálás `legacy-wall` szerződéssel adja át az editornek. Az editor a szerződést a kalkulátoronként izolált draftban tartja `__geometryContractVersion` metaadatként; a snapshotkészítés ezt külön `geometryContractVersion` mezőként menti. A mezőváltoztatások a draft többi adatát megtartják, a revíziócsere pedig a betöltött revízióhoz tartozó szerződést cseréli. Az anyagállapot külön tárolása nem érinti a draft metaadatát.

A save action explicit szerződést követel, és meglévő revízió új mentése előtt összeveti a beküldött szerződést az eredeti revízióéval. Ismeretlen értéket a szigorú Zod enum visszautasít; az `outer-footprint` jelen fázisban nem számítható és nem menthető, így nem fut a legacy képleteken. Új kalkulációk is explicit `legacy-wall` szerződést kapnak, amíg a V2 motor és szerveres replay készen nem áll. A geometriai képletek nem változtak.

QA: snapshot kompatibilitás, editor draft contract megőrzés/izoláció, ismeretlen verzió elutasítása és save action védelme célzott Vitestekkel ellenőrizendő. A V2 geometriai adapter, rajzi provenance és teljes böngészős/nyolc forma regresszió későbbi fázis.

## P1.2.3/B — Geometry Contract V2 aktiválás (2026-11-04)

A friss kézi tetőforma-munkafolyamatok alapértelmezett szerződése `outer-footprint`; a betöltött történeti revíziók explicit `legacy-wall` értéket tartanak. A közös adapter V2 nyeregtetőnél nullázza a számítási geometriában a külön eresz- és homlokzati kiülést, V2 félnyeregtetőnél az ereszkiülést; a külön megadott input/provenance a snapshotban változatlan marad. V1 ugyanazt a korábbi motort használja. Konty, sátor, félkonty, L, T és manzárd meglévő külső geometriai határmodellje változatlan; célzott tesztekben V1/V2 geometriájuk egyezik.

A kliens és a szerver ugyanazt a `geometryContractVersion` értéket adja a közös geometriamappernek, takeoff sornak és anyagmotoroknak. A belső `RoofCalculationSnapshot` külön, opcionális mezőben viszi tovább a szerződést; régi in-memory snapshot hiányzó mezője továbbra is V1. A szerver mentéskor explicit verziót kér, friss revíziónál összeveti a kiinduló revízióval, és változatlan immutable revision insertet használ. A V1/V2 szerződés explicit tetőforma-kalkulációk közti jóváhagyott mezőátvételnél is megmarad.

| Forma | V1 | V2 | Adapter |
|---|---|---|---|
| Nyeregtető | Régi eresz- és homlokzati kiülés képlete | Külső hossz/szélesség a teljes vetület; külön kiülés nem bővíti | Kiülések nullázása csak számítási geometriában |
| Félnyeregtető | Régi, alacsony oldali eresz | Külső határ a teljes vetület | Ereszkiülés nullázása csak számítási geometriában |
| Konty | Meglévő külső határmodell | Ugyanaz a már külső méretű határ | Nincs képletváltozás |
| Sátor | Oldalméret és meglévő külső modell | Ugyanaz | Nincs képletváltozás |
| Félkonty | Meglévő külső határmodell | Ugyanaz | Nincs képletváltozás |
| L alak | Főtest/szárny egyedi határai | Ugyanazok az egyedi külső határok | Nincs képletváltozás |
| T alak | Főtest/szárny egyedi határai | Ugyanazok az egyedi külső határok | Nincs képletváltozás |
| Manzárd | Meglévő külső határmodell | Ugyanaz | Nincs képletváltozás |

Minimális UI: V2-nél „Tető teljes hossza”, „Tető teljes szélessége (vízszintesen)” címke és eresz-segítszöveg; V1-nél a régi számítási mód jelölése, történeti mérési referencia igazolatlanságával. Nem került be mérési módválasztó.

Automata bizonyíték: célzott geometria/save/draft/rajz regressziók zöldek; teljes Vitest 226 fájl PASS / 8 skip, 1614 teszt PASS / 19 skip. Typecheck, production build, érintett ESLint és `git diff --check` zöld. A rajzi átvitelnél az opcionális eresz nem kötelező hiányzó mező és nem silent default; a forma és homlokzati kiülések továbbra is kapnak megerősítést. A docs checker 8 coverage-hibát jelez: törölt HAP fájlra maradt minta és 7 rajz/support fájl lefedettség nélkül. Teljes browser viewport QA nem futott. A rajzi feldolgozás/OCR nem változott; a meglévő tetőterv- és jóváhagyási kapu marad érvényben.

Korlátok: a `legacy-wall` csak történeti számítási kompatibilitás, nem méréstörténeti bizonyíték. A szarufa alátámasztásához, HAP-hoz, termékfedéshez és kiosztásokhoz továbbra is hiányozhat munkaspecifikus adat; ezek meglévő incomplete/unsupported jelzései nem válnak teljes számítássá a V2 szerződéstől.

## P1.2.4 — célzott szakmai UI finomítás (2026-11-04)

A közös kalkulátormező-súgó szerződés- és formafüggően nevezi meg az ereszt: V2 gable két oldala, V2 shed alacsony oldala már része a teljes külső méretnek; V1 az eredeti képlet oldalait jelöli, történeti referencia fenntartásával. Az L/T szárny szélesség/kiülés súgó a `roof-geometry.ts` koordinátáihoz igazodik, számítási képlet változtatása nélkül.

A dokumentációs coverage leltár javítva: törölt HAP minta elhagyva, hét valós rajzi/support modul besorolva. `node scripts/check-docs.mjs` PASS. A teljes böngészős QA nem történt meg, a `localhost:3000` nem futott; részleges anyagállapotot, glass tokeneket és mobil navigációt nem módosítottam bizonyíték hiányában.

## P1.2.6 — V1/V2 integritás, közös belépés és tetőforma-SVG (2026-11-04)

### Szerződés és mentés

A P1.2.5.3 „új V2” megfogalmazása revíziószámot jelentett a riport kontextusában, nem bizonyított `outer-footprint` geometry contractot. A lokális DEMO rekord nem volt biztonságosan azonosítható read-only ellenőrzéshez, így a konkrét DEMO revíziók contractja nem állapítható meg és rekordot nem módosítottam. A `construction-actions.test.ts` izolált fixture-je bizonyítja: régi, verzió nélküli V1 input hidratálásakor `legacy-wall` áll be; a következő mentés is ezt írja, a szerveroldali output megegyezik a kliens újraszámításával, és az eredeti input snapshot változatlan marad. A V2 új munkánál `outer-footprint`. Golden értékek: 12×6 m / 35° V2 = 72,00 m² vetület és 87,90 m² felület; 500 mm külön ereszkiülés mellett is 72,00 m². V1 ugyanilyen méretnél, 500 mm ereszkiüléssel = 84,00 m². Képlet nem módosult.

### Belépés és formaillusztrációk

A dashboard kalkulátor csempéje és az alkalmazás Kalkulátorok linkje ugyanazt az organization-szűkített `/kalkulatorok` oldalt nyitja. A friss `roof.material-takeoff` munka egyetlen közös `RoofShapeChooser`-t mutat, majd a meglévő kézi/rajzi adatút-választást. Mentett számítás, revízió, deep link és visszaállított draft külön folytatási állapota megmarad. A régi eltérés most nem reprodukálható; a jelenlegi kódban nincs dashboard-specifikus kalkulátor vagy initial-step ág, a folytatási módot a munkamenet állapota határozza meg.

A nyolc inline SVG külön síkfelületeket és tetőéleket használ, a már meglévő szürke/sárga árnyalatokkal és theme tokenekkel. A `roof-shape-support.ts` azonosítói, feliratai és támogatási jelzései változatlanok. Nincs új ikoncsomag, chooser-komponens vagy kalkulátormodul.

QA: a nyolc glyph azonosító- és választástesztje, V1/V2 mentési fixture, szerveres újraszámítás és immutable input assert célzottan lefedett. A desktop light/dark render és dashboard → közös chooser → kézi/rajzi út élőben ellenőrizve. A 1440×900 / 375×812 / 812×375 teljes téma-mátrix, browser console és production DEMO revision ellenőrzés a jelenlegi böngésző/eszközkörben nem igazolt; lásd a [P1.2.6 UI/UX QA bejegyzést](ROOF_CALCULATORS_UI_UX_REVIEW.md).

Lezáró QA: célzott Vitest 114/114; teljes Vitest 226 fájl PASS / 8 skip, 1617 teszt PASS / 19 skip. Typecheck, érintett ESLint, production build, docs checker és `git diff --check` PASS. CUA viewport-emuláció és konzol-API nem állt rendelkezésre; a konkrét DEMO contractot az izolált V1 fixture helyettesíti, rekordmódosítás nélkül.
