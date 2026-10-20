# Kalkulátor-átalakítás zhitov-elv szerint — specifikáció

Ez a dokumentum a `/kalkulatorok` felület és a kalkulátor-katalógus átalakításának szerződése. Nem matematikai referencia: a tetőszámítás matematikája a [ROOF_CALCULATION_SPECIFICATION.md](ROOF_CALCULATION_SPECIFICATION.md), a lefedettség a [CALCULATOR_COVERAGE_MATRIX.md](CALCULATOR_COVERAGE_MATRIX.md) alatt marad.

## 0. Státusz és felülírt döntések

A felhasználó kifejezett utasítására a kalkulátorainknak **funkciójukban ugyanazt kell ellátniuk, mint a zhitov megfelelőiknek**. Ez két korábban rögzített döntést ír felül:

| Felülírt | Hol | Új állapot |
|---|---|---|
| „Nem követelmény a teljes Zhitov-paritás." | ROOF_CALCULATION_SPECIFICATION.md § Zhitov referencia-felderítés | A funkcionális paritás mostantól követelmény. A képleteket továbbra sem másoljuk: a §5 tételesen felsorolja, hol és miért térünk el. |
| „A standalone suite nem tartalmaz általános tetőforma-választót… nem keletkezett új vagy duplikált kalkulátor-bejegyzés." | ROOF_CALCULATION_SPECIFICATION.md § F9.34 | A katalógus kulcsa feladat lesz, a tetőforma bemenetté válik. Lásd §4. |

Ez a dokumentum tervet rögzít, nem megvalósult állapotot. Implementáció még nem történt.

## 1. Az elvi különbség

A két rendszer nem ugyanarra a kérdésre válaszol, és ez már az elnevezésekből kiolvasható.

| zhitov oldal címe | a mi katalógusunk neve |
|---|---|
| Szarufák méretének kiszámítása | Szarufa-hossz és vágásszögek |
| **Tetőfedő anyagok kiszámítása** nyeregtetőnél | Nyeregtető |
| Félnyeregtetőhöz **anyagok kiszámítása** | Félnyeregtető |
| A manzárdtető **tetőfedő anyagainak kiszámítása** | Manzárdtető |
| Konty tetőhöz szükséges **anyagok kiszámítása** | Kontytető |

Náluk a név a **kimenetet** nevezi meg, a tetőforma csak jelző. Nálunk a név a **tetőforma**, a kimenetről nem mond semmit. Ugyanez a gombfeliratokon: „KONTYTETŐ SZARUFA KIOSZTÁSÁNAK KISZÁMÍTÁSA", és az oldal fejlécében: „Ingyenes szolgáltatás **építőanyagok** kiszámításához".

Következmény: náluk **egy tetőformához több kalkulátor is tartozhat** (a `roof` és a `roof2` ugyanarról a nyeregtetőről szól, de az egyik egy szarufa kiszabását adja, a másik a megvásárolandó anyagot). A mi azonosítóink formára vannak kulcsolva (`roof.gable`, `roof.shed`, `roof.hip`), ezért ebbe a szerkezetbe nem fér bele két kalkulátor ugyanarra a tetőre.

## 2. Zhitov-szempontok tételesen

Minden sor megfigyelés, nem feltételezés. A §3 jelöli, melyiket mi igazoltuk futtatással.

### A. Információs architektúra

| # | zhitov | nálunk ma | döntés |
|---|---|---|---|
| A1 | A kalkulátor neve a kimenetet nevezi meg | a tetőformát nevezi meg | Átnevezés feladat szerint |
| A2 | Egy formához több kalkulátor tartozhat | forma = katalógusbejegyzés, 1:1 | Katalógus újrakulcsolása (§4) |
| A3 | A tetőforma bemenet (Típus 1 / Típus 2 képes választó) | a forma maga a kalkulátor | Formaválasztó bemenetként, képes kártyákkal |
| A4 | Kategóriaoldal képes rácsa (Tető / lépcső / alapozás) | szöveges lista | Képes kategóriarács |

### B. Bemeneti űrlap

| # | zhitov | nálunk ma | döntés |
|---|---|---|---|
| B1 | Minden méret mm-ben, egyszer kiírva a panel tetején | vegyesen mm / fok / m² | Átvesszük: mm mindenhol, a panel tetején egyszer kiírva |
| B2 | Betűkódos mezők (X, Y, C, B, S1–S4, O1/O2/R, L1–L3), a rajzon ugyanaz a betű | nincs betűkód; van viszont kattintható mező↔rajz kiemelés | Betűkód hozzáadása; a kiemelést megtartjuk (ez több, mint náluk) |
| B3 | Önálló „**Tető anyagok**" szekció a fő űrlapon | ugyanezek a mezők `advanced: true`, lenyitható | Felhozzuk a fő űrlapra, saját szekciócímmel |
| B4 | Minden mezőnek van alapértéke, az űrlap sosem üres | több mező üres, eredmény nélkül | Alapérték minden **geometriai és kiosztási** mezőre. Gyártói termékadatra nem (§5) |
| B5 | A „Számítás" mindig ad eredményt | `roof.shed` és `roof.hip` `calculate`-je `return []` | Minden kalkulátor ad számokat |
| B6 | Méretarány-választó (1:1 … 1:10) a rajzhoz | zoom / fit / reset | Megtartjuk a sajátunkat, egyenértékű |
| B7 | Színes / fekete-fehér rajz kapcsoló (nyomtatáshoz) | nincs | Átvesszük a nyomtatási nézetben |
| B8 | „számítás új ablakban" | nincs | Megfelelője: nyomtatható eredménylap (C1) |
| B9 | Anyagár-mezők → tételes költség + végösszeg (**csak az alapozásnál, tetőnél nincs**) | külön `pricing` és ajánlat domain | Tetőnél nem vezetünk be ad-hoc ármezőt; „Ajánlatba" átadás a meglévő domainnel |

### C. Eredménydokumentum

| # | zhitov | nálunk ma | döntés |
|---|---|---|---|
| C1 | Önálló, nyomtatható eredményoldal | eredménypanel a kalkulátor alatt | Nyomtatható eredménylap; a PDF-útvonal már létezik (`api/ajanlatok/.../pdf`) |
| C2 | Kötött sorrend: rajzok → „Kiindulási adatok" → méretek → anyagok → (költség) | nincs kötött sorrend | Átvesszük ezt a sorrendet |
| C3 | „Kiindulási adatok": **minden bemenet visszaolvasva, mértékegységgel** | nincs visszaolvasás | Átvesszük. Ez teszi a lapot önmagában értelmezhetővé |
| C4 | Több nevesített nézet (Oldalnézet, Elölnézet, felülnézet, Lécezés, Szarufák oldalán X, Szarufák a bordák, Gerincrajz, elemrajzok) | egy rajz nézetváltóval | Nevesített nézetek, mind egyszerre a nyomtatott lapon |
| C5 | Méretszámok a rajzon | **szándékosan** nincs: a rajz szöveg nélkül rajzol, alatta akadálymentes legenda (F9.38.1) | Méretszám a rajzra **a legenda megtartása mellett**; a legenda nem tűnhet el |
| C6 | Alkatrész-számozás a rajzon ↔ vágáslista („Részletek 5. 4220 mm – 2 db") | nincs számozás, nincs vágáslista | Átvesszük; az adat megvan a `RoofTimberFamilyResult.segments`-ben |
| C7 | Kettős szám: „11 (22)" = fél tető (teljes) | nincs | **Nem vesszük át**, zavaró. Helyette síkonkénti + összesen táblázat |
| C8 | Alternatív kiszerelés: „0,58 m³ **vagy** 26 db 6 m"; „5 tekercs (15 m²) **vagy** 4 tekercs (20 m²)" | nincs | Átvesszük. Szálhossz/tekercsméret bemenet, a kiszerelés az eredményben |
| C9 | A korlát a lapon marad kiírva („Atfedés 10%", „A pontosabb kiszámítása anyagok olvasni") | a korlát a katalógusban van, az eredményen nem | Átvesszük: a vállalt korlát az eredménylapon is szerepel |

### D. Tájékoztatás — „ugyanolyan jól informáljunk"

| # | zhitov | nálunk ma | döntés |
|---|---|---|---|
| D1 | Minden oldal alján „SEGÍTSÉG" blokk | szűkszavú `note` mező | Teljes súgóblokk minden kalkulátorhoz |
| D2 | A súgó megismétli a betűjelmagyarázatot szövegesen („X – a ház szélessége") | nincs | Átvesszük |
| D3 | Leírja, **mire való** a program | részben, a `scope` mezőben | A `scope` mező a súgó első bekezdése lesz |
| D4 | Leírja, **mit NEM csinál**, és miért — nyíltan, pl. a roof2 beismeri, hogy a Típus 2 szarufatérfogatából nem vonja le az oromfali kivágást, „mert ez a program megvalósításában nehézséget okozna" | a `limitation` mező már pontosan ezt tartalmazza, de nem jelenik meg a felhasználónak | A `limitation` a súgó „Mit nem számol" szakasza lesz. **Ez már megírva létezik mind a 33 bejegyzéshez** |
| D5 | Megmondja, hogyan kell a tört eredményt kezelni („2,8 sor × 7,7 lap → a valóságban 3 sor") | nincs | Átvesszük ott, ahol tört eredményt mutatunk |
| D6 | Szakmai ökölszabályok (lépcső: 2h+b = 63±3 cm, kényelmes dőlés 30–40°, belépő ≥ 28–30 cm; beton: homok 1200–1700 kg/m³) | részben a lépcsőnél (`stepRuleMm`) | Átvesszük, **forrásmegjelöléssel**; ami nem igazolható, az nem kerül bele |
| D7 | Minősítő verdikt az eredmény tetején, emberi nyelven: „A képletnek megfelelő / Megfelelő lépcső dőlés 39,8° / **Kényelmes lépcső**" | nincs | Átvesszük. Tetőnél a megfelelője: a tetőhajlás vs. a választott fedés minimális hajlásszöge — **csak termékadatból**, különben „nem ellenőrizhető" |
| D8 | Emlékeztet a hulladékra / ráhagyásra vásárláskor | nincs | Átvesszük |

### E. Megőrzés és megosztás

| # | zhitov | nálunk ma | döntés |
|---|---|---|---|
| E1 | Mentett számítások fiókkal, e-mailben küldhető | `/kalkulatorok/mentett`, DB-ben, revíziózva | Már erősebb; marad |

## 3. Visszafejtett és igazolt képletek

Paraméterezett `calculator.php` hívásokkal ellenőrizve. **A felületi alapértékekből nem szabad következtetni**: azok szerver oldali session-értékek, és a `roof3` esetében ellentmondtak a kontrollált futtatásnak.

### `roof` — szarufa kiszabása (5 futtatás: Z = 0/50/100/200, B = 50/150/300)

```
α' = atan((Y − Z) / (X/2))
gerendahossz az ereszig = hypot(X/2, Y − Z)
eresz hossza a gerendán = C / cos(α')
teljes hossz            = a kettő összege
bevágás szöge           = 90° − α'        (egészre kerekítve)
```

- **Z nem vízszintes eltolás, hanem a madárszáj vízszintes vágásának magassága** (függőleges méret). Ezért rövidíti a szarufát.
- **B (szarufamagasság) egyetlen számot sem befolyásol**, csak a rajzot. B = 50 és B = 300 azonos eredményt adott.

### `roof2` / `roof3` — tetőfedő anyagok (2 kontrollált lécfuttatás, 2 átfedésfuttatás)

```
α             = atan(Y / (X/2))         // roof3: atan(Y / X), és eresz MINDKÉT végén
szarufahossz  = (X/2 + C) / cos α
tetőfelület   = szarufahossz × B        // oromfali túlnyúlás nélkül
szarufaszám   = floor((B − 2·S4) / S3) + 1
szarufa m³    = db × hossz × S1 × S2
lécsorok      = ceil(szarufahossz / (O1 + Rob))
léc m³        = sorok × B × O1 × O2
léc darab     = ceil(sorok × B / 6000)
```

Ezek determinisztikusak és reprodukálhatók, **átvehetők**.

### Amit igazoltan NEM szabad átvenni

```
lemezdarab = ceil(félfelület / (L1 × L2)) × 2    // az átfedést NEM veszi figyelembe
alátét m²  = ceil(teljes felület)                 // átfedés nélkül
tekercs    = ceil(m² / 15), illetve ceil(m² / 20)
```

Bizonyíték: `L3=0` és `L3=10` futtatás **ugyanazt a 36 lapot** adja; az átfedés csak a tájékoztató „szárnyszélesség" számot mozdítja. A súgójuk maga írja, hogy a felhasználó kerekítsen fel. A mi `roof-underlay.ts` (valódi sávkiosztás oldal- és végátfedéssel) és `gable-metal-tile-covering.ts` (gyártói adattal igazolt kiosztás) motorunk ennél bizonyíthatóan pontosabb.

### Nem ellenőrzött

A `roof4` (manzárd), `hip_roof` és `wooden_truss` képleteit **nem** fejtettük vissza kontrollált futtatással; csak a kimenet szerkezetét rögzítettük. A `hip_roof`-nál két gyanús jelenség: az ereszkiülés a két irányban eltérően számolódik (X: 6000 → 7333, azaz +666,7 oldalanként; Z: 4500 → 5500, azaz pontosan +500), és a „Hosszúság korcsolyát 23367 mm (5842×4)" nem gerinc lehet (az X−Z = 1500 lenne). Ezeket **nem másoljuk**; a saját, tesztelt kontymodellünk marad.

## 4. Az új kalkulátor-struktúra

A hat zhitov tetőoldal négy különböző kérdésre válaszol, nem hat formára. A három anyagkalkulátoruk (`roof2`/`roof3`/`roof4`) csak azért külön oldal, mert a képleteik formaspecifikus zárt alakok. A mi `roof-geometry.ts`-ünk hét formát kezel egységesen, ezért nálunk egy kalkulátor fedi le mindhármat — **több formára, nem kevesebbre**.

| Új kalkulátor | Kérdés, amire válaszol | Lefedi | Motor |
|---|---|---|---|
| **Szarufa kiszabása** | Hogyan szabom ki az egy szarufát? | `roof` | `roofs.ts` (javítás után, §6) |
| **Tetőanyag-kimutatás** | Mit kell megvennem erre a tetőre? | `roof2`, `roof3`, `roof4` és azon túl sátor / félkonty / L / T | `roof-geometry` + `roof-timber-layout` + `roof-underlay` + fedésmotorok |
| **Tetőszerkezet faanyag és vágáslista** | Milyen hosszú elemeket vágjak? | `hip_roof` | `roof-timber-layout` (`segments`) |
| **Rácsos tartó** | Milyen elemekből áll a tartó? | `wooden_truss` | `roofs.ts` + új rácsozat |

A tetőforma minden anyag- és faanyag-kalkulátorban **bemenet** lesz, képes választóval.

A „Tetőanyag-kimutatás" egy lapon adja a négy anyagcsoportot (szarufa, léc, fedés, alátét), csoportonkénti paraméterszekcióval. Amelyik csoport paramétereit nem töltöd ki, az nem jelenik meg — de a geometria és a faanyag alapértékkel mindig számol.

## 5. Amit szándékosan nem veszünk át

1. **Fedés- és alátétdarabszám területosztással** — §3 bizonyítja, hogy az átfedést elhagyja. Ez nálunk visszalépés lenne.
2. **A `hip_roof` eresz- és gerinckezelése** — §3 szerint belső ellentmondásos.
3. **A „11 (22)" kettős számkonvenció** — helyette síkonkénti bontás.
4. **Léctérfogat / darabszám eltérő sorszámból** — egy futtatásban a térfogat 43, a darabszám 44 sorral számolt. Nálunk egy forrásból jön mindkettő.
5. **Gyártói termékadat alapértékezése** — a lemezhossz/szélesség/átfedés nem kaphat kitalált alapértéket. Helyette a saját anyagkatalógusunkból (`src/domain/materials`) választható termék. Ez §B4 alóli kivétel, és egyben több, mint amit zhitov ad.

## 6. Megtalált hiba a saját kódunkban

`calculateRafterGeometry` (`src/domain/calculations/construction/roofs.ts`):

```ts
const horizontalRunMm = input.horizontalHalfSpanMm + input.eaveProjectionMm;
const slopeLengthMm = Math.hypot(horizontalRunMm, input.riseMm);
const pitchDegrees = Math.atan2(input.riseMm, input.horizontalHalfSpanMm) * 180 / Math.PI;
```

A `slopeLengthMm` és a `pitchDegrees` nem konzisztens: az eresz meghosszabbítja a vízszintes futást, de az emelkedést változatlanul hagyja, ezért ellaposítja a tetőt. X=6000, Y=2000, C=500 mellett **4031 mm jön ki a helyes 4207 mm helyett — 176 mm, 4% hiány**. A helyes alak `(halfSpan + eave) / cos(pitch)`.

Ez meglévő hiba, nem hiányzó funkció; a javítása független az átalakítástól, és regressziós teszttel kell járnia.

## 7. Érintett kódpontok és migrációs kockázat

| Pont | Hatás |
|---|---|
| `src/domain/calculations/construction/catalog.ts` | Az `id` és a `title` is változik. A 33-as darabszám-őr (`if (… !== 33) throw`) frissítendő |
| `catalog.ts` `status` mező | Ma a `verified` azt jelenti, „a geometria ellenőrzött", nem „a kalkulátor kész". Kettébontandó: geometria kész / anyagmennyiség kész |
| `src/features/calculators/construction-suite.tsx` | A `definitions` rekord kulcsai, a mezőlisták és a `calculate` kimenetek |
| `calculator-navigation.ts` | A `?calculator=` paraméter értékei |
| **Mentett számítások** | A `calculatorType` **adatbázisban tárolt érték**. Átnevezés nélkül a régi mentések nem nyithatók meg → migráció vagy id-alias kell. Ezt a részt még nem vizsgáltam meg |
| `src/domain/field-surveys/calculator-handoff.ts` | Alacsony kockázat: a `calculator: "roof"` címke általános, nem formaspecifikus |
| `construction-visuals.tsx` | Méretszámok a rajzra (C5), alkatrész-számozás (C6) — a legenda megtartásával |

## 8. Nyitott kérdések

1. A lépcsős és betonos csoportnál ugyanez a névadási minta érvényes-e? (A „Sávalap számítás" alapján ott lehet, hogy a forma a helyes kulcs.) Nem vizsgáltam.
2. A mentett számítások `calculatorType` migrációja: átnevezés + alias, vagy a régi id-k megtartása új címkékkel?
3. A D6 ökölszabályokhoz kell-e magyar szabványhivatkozás, vagy elég a „tájékoztató" jelölés?
