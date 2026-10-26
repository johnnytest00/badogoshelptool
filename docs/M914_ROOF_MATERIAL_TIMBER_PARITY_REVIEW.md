# M9.14 — Tetőanyag- és faanyagkalkulátorok eredményparitásának célzott ellenőrzése

**Dátum:** 2026-10-26  
**Hatókör:** nyeregtető, tetőanyag-kimutatás, tetőszerkezet faanyag és vágáslista  
**Módszer:** forrás- és domain-ellenőrzés, független kézi számítás, helyi alkalmazás valódi Brave böngészős futtatása, célzott domain-tesztek  
**Változtatási korlát:** alkalmazáskód, képletek, adatbázis, migráció, függőség és konfiguráció nem módosult; mentés, commit, push és deploy nem történt.

## Vezetői összefoglaló

| Ellenőrzési pont | Státusz | Megállapítás |
|---|---|---|
| 37 léc vs. 35 léc | **PASS — helyes eltérő inputeredmény** | A M9.13-ban rögzített két futás nem azonos ereszkiüléssel készült: az anyagkimutatás 400 mm-rel, a vágáslista 0 mm-rel. |
| 175,792 m vs. 193,371 m szarufa-összhossz | **PASS — helyes geometriai különbség** | 175,792 m a 0 mm ereszkiüléses, 4 000 mm-es vízszintes félfutás; 193,371 m a 400 mm ereszkiüléses, 4 400 mm-es vízszintes félfutás eredménye. |
| Azonos inputú kalkulátoreredmény | **PASS** | A két kalkulátor 10 000 × 8 000 mm, 35°, 400 mm, 600/300 mm bemenetekkel ugyanazt adta: 36 szarufa / 193,371 m és 37 léc / 370 m. |
| Ereszkiülés kezelése | **PASS** | A gable geometria az ereszkiülést a ferde tetősíkba és a tetősík-polygonba beépíti. |
| Tényleges fizikai vágáslista | **NOT VERIFIED / támogatottan korlátozott** | A rendszer geometriai vonalakat és névleges hosszt ad, nem gyártási vagy statikai tervet; KARMI-, vágási ráhagyás-, toldás- és száloptimalizálás nincs a timber-layout mennyiségben. |

**Összesített státusz: PASS WITH DOCUMENTATION LIMITATION.** Valódi számítási vagy paritási hiba nem bizonyított. A javítandó pont a M9.13 bizonyítékának pontosítása: a vágáslista futásánál az ereszkiülés nem szerepelt explicit inputként.

## 1. Ellenőrzött források és kódbeli eredet

Az ellenőrzés célzottan ezekre terjedt ki:

- `docs/KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md` — a M9.13 böngészős bizonyíték és a két vitatott eredménysor.
- `src/features/calculators/roof-calculator-definitions.ts` — a két kalkulátor közös mezői, közös `takeoffLines` útvonala és a faanyag-vágáslista timber-only kérése.
- `src/domain/calculations/roof-calculation-snapshot.ts` — a mezők normalizálása nyeregtető-geometriává; a `eaveOverhangMm` a gable input része.
- `src/domain/calculations/gable-roof.ts` — félfesztáv, ereszkiüléssel növelt vízszintes futás, ferde hossz és tetősík-csúcspontok.
- `src/domain/calculations/roof-timber-layout.ts` — peremsáv, `ceil(span / maxSpacing)`, két tetősík, gerincnél történő geometriai deduplikáció, 3D vonalhossz.
- `src/domain/calculations/roof-material-takeoff.ts` — a timber darabszám és hossz jelentése (`LAYOUT`), valamint a geometriai és beszerzési mennyiség szétválasztása.
- `src/features/calculators/construction-suite.tsx` — felhasználói eredménysorok, vágáslista-megjegyzés és a `Szarufaosztás` rajznézet.
- Releváns tesztek: `src/domain/calculations/roof-timber-layout.test.ts`, `src/domain/calculations/roof-material-takeoff.test.ts`, `src/domain/calculations/construction/construction.test.ts`, `src/domain/calculations/construction/plane-birdsmouth.test.ts`.

A két kalkulátordefiníció ugyanazt a `roofShapeFields` mezőkészletet, ugyanazt a `roofGeometryInputFor` → `calculateExistingRoofGeometry` → `calculateRoofMaterialTakeoff` útvonalat és ugyanazt a timber-layout eredményt használja. A `roof.timber-cutlist` csak azt kényszeríti, hogy a kért csoport a timber legyen; nem cserél geometriát vagy kiosztási algoritmust.

Forrásból ellenőrizhető, hogy:

- az ereszkiülés felhasználói mezője `eaveOverhangMm`, alapértéke 0 mm;
- a gable mezők `inputMode: "angle"`, `buildingLengthMm`, `buildingWidthMm`, `roofPitchDegrees`, `eaveOverhangMm` és a két homlokzati kiülés értékeire normalizálódnak;
- a timber eredmény címkéi **Geometriai tengely / vonal**, **Geometriai összhossz**, jelentésük `LAYOUT`;
- a vágáslista UI külön kiírja: „Névleges geometriai hosszak, vágási ráhagyás és toldás nélkül.”

## 2. Pontos bemeneti mátrix

### 2.1 A M9.13-ban rögzített futások

| Normalizált adat | Tetőanyag-kimutatás | Faanyag-vágáslista |
|---|---:|---:|
| Tetőforma | `gable` | `gable` |
| Épület/tető hossza | 10 000 mm | 10 000 mm |
| Épület/tető szélessége | 8 000 mm | 8 000 mm |
| Tetőhajlás | 35° | 35° |
| Lejtésirányú ereszkiülés | **400 mm** | **0 mm** — a mező alapértéke |
| Homlokzati kiülés elöl/hátul | üres → 0 mm | üres → 0 mm |
| Szarufa legnagyobb tengelytávolság | 600 mm | 600 mm |
| Léc legnagyobb sortávolság | 300 mm | 300 mm |
| Szarufa keresztmetszet | 80 × 200 mm | 80 × 200 mm |
| Léc keresztmetszet | 50 × 50 mm | 50 × 50 mm |
| Peremsáv | 0 / 0 mm | 0 / 0 mm |
| Eredmény | 36 szarufa, 193,371 m; 37 léc, 370 m | 36 szarufa, 175,792 m; 35 léc, 350 m |

A két sor ezért nem ugyanazon normalizált geometriát írja le. A különbséget nem a `roof.material-takeoff` és a `roof.timber-cutlist` eltérő képlete okozza.

### 2.2 Azonos inputú valódi böngészős ellenőrzés

Helyi `localhost:3000` alkalmazásban, valódi Brave böngészőben mindkét kalkulátorban egymás után beállítva:

- Nyeregtető;
- tetőhossz: 1 000 cm = 10 000 mm;
- tetőszélesség: 800 cm = 8 000 mm;
- tetőhajlás: 35°;
- ereszkiülés: 40 cm = 400 mm;
- szarufa kiosztás: 60 cm = 600 mm;
- léc kiosztás: 30 cm = 300 mm;
- kézi keresztmetszet: szarufa 8 × 20 cm, léc 5 × 5 cm.

Mindkét képernyőn látható eredmény:

- szarufa: **36 db**, **193,371 m**;
- léc: **37 db**, **370 m**.

A két nézetben a `Szarufaosztás` rajz ugyanazt mutatta: a kiválasztott tetősíkon **18 geometriai szarufavonal**, tényleges osztásként **58,8 cm**, vonalhosszként **18 db × 537,1 cm**. Ez a 36 darabos kétoldali eredménnyel konzisztens.

Nem nyomtam meg a kalkulációmentő gombot; adatbázis- vagy külső rendszerírás nem történt.

## 3. Független kézi ellenőrzés

### 3.1 Szarufák

A szarufák a tető hosszán, a két tetősíkon futnak.

Hosszanti kiosztás:

```text
ceil(10 000 / 600) = 17 intervallum
17 + 1 = 18 szarufavonal / tetősík
18 × 2 tetősík = 36 szarufa
```

Az ereszkiülés a lejtésirányú hosszt módosítja, a hosszanti szarufakiosztás darabszámát nem.

35° esetén:

```text
cos(35°) = 0,8191520443
```

**0 mm ereszkiülés:**

```text
vízszintes félfutás = 8 000 / 2 = 4 000 mm
ferde geometriai hossz = 4 000 / cos(35°)
                         = 4 883,098 mm
36 × 4 883,098 mm / 1 000 = 175,7915 m → 175,792 m
```

**400 mm ereszkiülés:**

```text
vízszintes félfutás = 4 000 + 400 = 4 400 mm
ferde geometriai hossz = 4 400 / cos(35°)
                         = 5 371,408 mm
36 × 5 371,408 mm / 1 000 = 193,3707 m → 193,371 m
```

Mindkét képlet egyezik a forráskóddal: a gable geometria a `halfSpanMm + eaveOverhangMm` értéket használja a ferde futáshoz, és a tetősík csúcspontjai az eresz kiülésével együtt kerülnek a polygonba.

### 3.2 Lécek

A lécek a lejtésirányban futnak, ezért a kiosztandó felület egy tetősík ferde szélessége. A 0 mm-es peremsáv miatt a szélső sorok is bekerülnek:

- alsó szélső sor: ereszél;
- felső szélső sor: gerinc/felső él;
- a két gable tetősík közös gerincvonali lécsora pontos geometriai végpont-egyezéssel egyszer szerepel.

**0 mm ereszkiülés:**

```text
ferde tetősík-szélesség = 4 883,098 mm
ceil(4 883,098 / 300) = 17 intervallum / tetősík
17 + 1 = 18 sor / tetősík
18 + 18 − 1 közös gerincsor = 35 lécvonal
35 × 10 000 mm = 350 000 mm = 350 m
```

**400 mm ereszkiülés:**

```text
ferde tetősík-szélesség = 5 371,408 mm
ceil(5 371,408 / 300) = 18 intervallum / tetősík
18 + 1 = 19 sor / tetősík
19 + 19 − 1 közös gerincsor = 37 lécvonal
37 × 10 000 mm = 370 000 mm = 370 m
```

Ezért a **37 és 35 nem azonos mennyiség eltérő számítása**. A két szám két külön tetősík-szélességre, illetve két külön ereszkiülésre vonatkozó, helyes geometriai kiosztás.

## 4. Algoritmikus ellenőrzés

A `roof-timber-layout` működése a vizsgált esetre:

1. A tetősíkok közös lejtésirányú csoportba kerülnek.
2. A rafters család a hosszanti tengelyen (`axis: "t"`) oszt; ezért a 10 000 mm hossz és a 600 mm felső korlát 18 vonalat ad síkonként.
3. A battens család a lejtésirányú tengelyen (`axis: "u"`) oszt.
4. A ferde geometriai skála a megadott 300 mm-es felületi sortávolsághoz igazodik.
5. A `positions()` a `ceil(span / maxSpacing)` intervallumszámot, majd egyenletes tényleges osztást használja.
6. A két sík közös gerincvonalán a végpontokból képzett placement-kulcs egy sort deduplikál.
7. A hossz a tetősík-polygonból metszett 3D szakaszok egyedi összege; nincs automatikus hulladék-, toldás- vagy vágási ráhagyás.

A material takeoff a timber-layout `count` és `totalLengthM` eredményét adja vissza. A cutlist ugyanazt a layoutot használja, csak a material contextben timber-only kérést állít be. Ezért azonos normalizált inputnál az eredményparitás elvárt és a böngészőben bizonyított.

## 5. Ereszkiülés és a szarufahossz megnevezése

### Támogatott geometria

A 40 cm-es lejtésirányú ereszkiülés támogatott mező. A gable kalkuláció:

- a vízszintes félfutást 4 000 mm-ről 4 400 mm-re növeli;
- az eresz `z` szintjét a 35°-os lejtéshez igazítja;
- a tetősík-polygon alsó élét az eresz kiüléséig kiterjeszti;
- a layoutból származó geometriai szarufavonal ezért 5 371,408 mm lesz.

### Geometriai hossz és tényleges kiszabási hossz

A 175,792 m és 193,371 m nem gyártási beszerzési mennyiség. A kód és a UI egyaránt geometriai értékként jelöli:

- „Geometriai tengely / vonal”;
- „Geometriai összhossz”;
- „Névleges geometriai hosszak, vágási ráhagyás és toldás nélkül”;
- fizikai framing-layout: támogatottan `unsupported`.

A valódi kiszabási hosszhoz külön kellene kezelni legalább a KARMI/ülékbevágást, végvágásokat, csomóponti levonásokat, kereskedelmi szálhosszakat, toldást, hulladékot és statikai/framing-döntéseket. Ezeket ez a kalkulátor nem állítja elő. A HAP és a KARMI-részlet a kapcsolati geometria ellenőrzését szolgálja; nem írja át a timber-layout alapvonal-hosszát.

Így a **175,792 m megnevezése a jelenlegi „geometriai összhossz” címkével pontos**, de önmagában, az ereszkiülés és a geometriai korlátok feltüntetése nélkül félreérthető lehet.

## 6. Követelményenkénti minősítés

| Kérdés | Státusz | Minősítés |
|---|---|---|
| Valódi számítási hiba van a 37/35 eltérés mögött? | **PASS** | Nem. A bemenetek eltérnek az ereszkiülésben; az algoritmus kézzel és böngészőben reprodukálható. |
| A 37 és 35 eltérő, de helyes mennyiségdefiníció? | **PASS** | Igen, ugyanaz a geometriai lécvonal-fogalom, de más ereszkiüléses tetősík-szélesség. |
| A 40 cm ereszkiülés nem támogatott? | **PASS** | Nem. A lejtésirányú ereszkiülés támogatott nyeregtető-bemenet. |
| A 175,792 m tartalmazza a 40 cm-es ereszkiülést? | **FAIL — inputértelmezésként** | Nem; 0 mm ereszkiüléshez tartozik. Ez nem képlethiba. |
| A 175,792 m tényleges fizikai vágási összhossz? | **NOT VERIFIED / nem ez a modell** | Geometriai, névleges vonalhossz; fizikai vágás- és beszerzési optimalizálás nincs. |
| A két kalkulátor azonos inputnál paritásos? | **PASS** | A közös domainútvonal és a valódi böngészős futás alapján igen. |
| A tetősík-rajz konzisztens? | **PASS** | Mindkét kalkulátorban 18 vonal / tetősík és 58,8 cm tényleges szarufaosztás jelent meg a 400 mm-es esetben. |

## 7. Hibajegyek és legkisebb indokolt javítások

### M914-P2-DOC-01 — A M9.13 vágáslista-inputja nem rögzíti az ereszkiülést

- **Típus:** félrevezető QA-bizonyíték / dokumentációs hiány.
- **Hatás:** a „same 1000/800 cm, 35°...” megfogalmazás alapján az olvasó azonos inputokra következtethet, miközben a material futás 400 mm, a cutlist futás 0 mm ereszkiüléssel készült.
- **Bizonyíték:** `docs/KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md`, material bekezdésben 40 cm szerepel, a cutlist bekezdésben az ereszkiülés hiányzik; a cutlist eredménye pontosan a 0 mm-es képletet követi.
- **Legkisebb javítás:** a M9.13 riportban explicit módon rögzíteni `eaveOverhangMm=0` értéket a 35 léc / 175,792 m futás mellett, és külön megadni, hogy 400 mm-nél 37 léc / 193,371 m várható.
- **Alkalmazáskód módosítása ebben a mérföldkőben:** nem szükséges.

### M914-P3-TEST-01 — Hiányzik a két kalkulátordefiníció közvetlen parity-regressziója

- **Típus:** regressziós teszt hiánya.
- **Hatás:** a közös domainmotor tesztelve van, de nincs olyan célzott teszt, amely közvetlenül kimondja: azonos normalizált gable + timber inputnál a material takeoff és a timber cutlist azonos timber-countot és timber-lengthet ad.
- **Legkisebb javítás:** jövőbeli tesztfixture ugyanazzal az inputtal mindkét definition-útvonalra; külön elvárás 0 mm esetén 35/350, 400 mm esetén 37/370, valamint a két útvonal azonossága azonos inputnál.
- **Alkalmazáskód módosítása ebben a mérföldkőben:** nem történt.

### P1 hibajegy

**Nincs.** Nem találtam adatvesztést, jogosultsági hibát, eltérő képletet vagy azonos inputnál számszerű paritási hibát.

## 8. Ellenőrzési bizonyíték

### Forrás- és képletellenőrzés

**PASS.** A fenti kódútvonalakban az ereszkiülés, a két tetősík, a peremsorok, a gerinc-deduplikáció és a geometriai hossz eredete visszakövethető.

### Valódi böngészős ellenőrzés

**PASS.** Helyi `localhost:3000` alkalmazás, Brave, azonos 10 000 × 8 000 mm / 35° / 400 mm / 600–300 mm inputokkal:

- Tetőanyag-kimutatás: 36 szarufa, 193,371 m; 37 léc, 370 m.
- Tetőszerkezet faanyag és vágáslista: 36 szarufa, 193,371 m; 37 léc, 370 m.
- `Szarufaosztás`: 18 vonal a kiválasztott tetősíkon, 58,8 cm tényleges osztás, 537,1 cm geometriai vonalhossz.

### Célzott tesztek

Futtatott parancs:

```text
rtk bypass npx vitest run \
  src/domain/calculations/roof-timber-layout.test.ts \
  src/domain/calculations/roof-material-takeoff.test.ts \
  src/domain/calculations/construction/construction.test.ts \
  src/domain/calculations/construction/plane-birdsmouth.test.ts
```

Eredmény: **4 tesztfájl PASS, 49 teszt PASS**.

### Nem futtatott / nem bizonyított ellenőrzések

- teljes regressziós tesztkészlet nem futott;
- fizikai tetőn vagy kivitelezési vágásmintán végzett validáció nem történt;
- mentett revízió, adatbázis-replay és több szervezeti felhasználó közötti perzisztencia nem volt e feladat része;
- mobil és több viewportos vizuális regresszió nem volt e célzott parity-ellenőrzés része;
- a nem támogatott fizikai framing- és beszerzési optimalizálás nem minősíthető a jelen kalkulátor geometriai eredményhibájának.

## Végső döntés

1. A **37 léc és 35 léc közötti különbség nem valódi számítási hiba**: helyes, de eltérő ereszkiülésű inputok következménye. 400 mm ereszkiüléssel 37, 0 mm-rel 35 léc adódik.
2. A **175,792 m szarufa-összhossz nem a 40 cm-es ereszkiüléses eset**: helyesen a 0 mm ereszkiülésű, 4 000 mm vízszintes félfutású geometriai vonalhossz. 40 cm ereszkiüléssel a megfelelő eredmény 193,371 m.
3. A jelenlegi eltérés **dokumentációs félrevezetés és hiányzó közvetlen parity-regresszió**, nem alkalmazáskódban bizonyított képlethiba.

**Javasolt Conventional Commit üzenet a mérföldkőhöz (commit nem készült):** `docs(m9.14): document roof material and timber parity review`
