# TetőPro P3.1 — szakmai tetőmunkafolyamat E2E DEMO-jelentés

**Ellenőrzés dátuma:** 2026-10-31

**Környezet:** helyi fejlesztői szerver, hitelesített DEMO-szervezet (`00000000-0000-4000-8000-000000000010`)

**Elsődleges nézet:** 375×812; kiegészítő nézetek: 812×375 és 1440×900

**Minősítés:** **NOT DEMO READY** felügyelet nélküli szakmai bemutatóra

## A. Vezetői összefoglaló

A teljes pozitív út a tényleges böngészős alkalmazásban végigvihető volt: a szintetikus PDF megnyitásától az oldaltípusok, tetőszakasz, kétreferenciás kalibráció és forrásolt mezőátvitel kezelésén át a teljes anyagkimutatásig, V1 mentésig, újranyitásig és kalkulátorváltási körútig.

Az egyszerű nyeregtető számítómotorja a független referencia-számítással minden ellenőrzött tételben egyezett. A geometriai felület, élek, szarufa- és léckiosztás, fólia- és fedőtábla-mennyiség egyaránt **PASS**. A kimenet helyesen különbözteti meg a geometriai/kiosztási mennyiséget a végleges beszerzési mennyiségtől, és nem állít statikai megfelelőséget.

A professzionális DEMO minősítést egy adatbiztonsági hiba akadályozza. A mobil rajzon egymáshoz közeli feliratok közül egy rossz koppintással a `0,50 m ereszkiülés` forrás **500 mm tetőszélességként** került be, figyelmeztetés nélkül. Egy másik próbában a megmaradt „hátsó homlokzati kiülés” célmezőbe a `10,00 m` hossz került, miközben a kalibrált mérés aktív volt; a geometriai felület 85,45 m²-ről 170,91 m²-re változott. Az explicit mérés–felirat összevetés külön nézetben helyesen jelezte a 10×/100× eltéréseket, de a gyorsátvitel ezt a védelmet meg tudta kerülni. Mindkét téves érték javítható/visszavonható volt, de nem maradt észrevétlenül blokkolva.

Következtetés: a P3.1 munkafolyamat **belső, moderált technikai DEMO-ként bemutatható**, de egy átlagos szakember számára mobilon még nem elég biztonságos ahhoz, hogy felügyelet nélkül szakmai DEMO READY minősítést kapjon.

## B. DEMO-adatok

### B.1 Tervrajz és tetőgeometria

Használt fixture: `tests/fixtures/drawings/roof-workflow-p31-demo.pdf`

- 1. oldal: egyszerű nyeregtető-tetőterv, M=1:100, két tetősík, egy gerinc, két eresz.
- 2. oldal: földszinti alaprajz, negatív kontrollokkal.
- Falvetületi hossz: 10,00 m.
- Falvetületi szélesség: 6,00 m.
- Tetőhajlás: 35°.
- Vízszintes ereszkiülés: 0,50 m oldalanként.
- Homlokzati kiülés elöl/hátul: 0,00 m.
- Kalibrációs referenciák: 10,00 m és 6,00 m, az 1. oldalon.
- Kalibráció elfogadott kétreferenciás eltérése: 0,89%.
- Kalibrált kontrollmérés: 9 955 mm a 10 000 mm-es felirathoz; az összevetés a méterértelmezést támogatta.

A PDF teljesen szintetikus DEMO-adatot tartalmaz. Nem statikai, gyártási vagy árazási dokumentum.

### B.2 Tetőszakasz

- Név: `DEMO - teljes nyeregtető`.
- Fedettség: fedett.
- A teljes épülettető lefedettsége csak a teljes, számítható anyagkimutatás után volt megerősíthető.
- A számítás egyetlen, közös él/vápa nélküli szakaszra készült.

### B.3 DEMO anyagbeállítások

A DEMO-szervezet Anyagkezelőjében nem volt aktív, megfelelő termék. A profilt ezért kézzel, egyértelműen nem gyártói DEMO-adatként adtam meg.

| Beállítás | Érték | Státusz |
|---|---:|---|
| Szarufa legnagyobb tengelytávolság | 800 mm | szintetikus DEMO-feltételezés |
| Léc legnagyobb sortávolság | 350 mm | szintetikus DEMO-feltételezés |
| Szarufa névleges keresztmetszet | 80×200 mm | szintetikus DEMO-adat |
| Léc névleges keresztmetszet | 50×30 mm | szintetikus DEMO-adat |
| Fóliatekercs | 1 500×50 000 mm | szintetikus DEMO-adat |
| Fólia oldal-/végtoldási átfedés | 100/100 mm | szintetikus DEMO-adat |
| Fólia fektetési irány | eresztől a gerinc felé | felhasználói beállítás |
| Fedőtábla névleges/hasznos szélesség | 1 100/1 000 mm | szintetikus DEMO-adat |
| Fedőtábla fizikai/használható hossz | 4 000/3 900 mm | szintetikus DEMO-adat |
| Adatforrás | `DEMO – szintetikus P3.1 profil, nem gyártói adat` | explicit jelölés |

Nem alkalmaztam gyártói veszteségi tényezőt, árat, statikai méretezést vagy végleges beszerzési ráhagyást.

## C. Munkafolyamat-ellenőrzés

| Szakasz | Állapot | Böngészős bizonyíték | Megfigyelés |
|---|---|---|---|
| A — Belépés és rajzmegnyitás | PASS | A „Rajzból indítok” után a PDF fájlválasztón át betöltődött; két oldal és PDF.js-feliratok jelentek meg. | Nem kellett előre kalkulátort választani; a rendszer a támogatott `roof.material-takeoff` munkaterületet nyitotta meg. |
| B — Rajztípus és tetőszakasz | PARTIAL | Az 1. oldal `Tetőterv`, a 2. oldal `Alaprajz`; a `DEMO - teljes nyeregtető` szakasz létrejött. | Az oldaltípus-megerősítés és T4/T5 sorrend működött. A „fedett” kiválasztása külön megerősítés nélkül lezárta a lépést. |
| C — Kalibráció és méretátvitel | FAIL | 0,89%-os kétreferenciás kalibráció; 9 955 mm kontrollmérés; explicit felirat–mérés kapcsolat. | A részletes összevetés jó, de a gyorsátvitel két esetben észrevétlenül fogadott el szakmailag rossz, ugyanazon dimenziójú értéket. |
| D — Kalkulátor és hiányzó adatok | PASS | 10 000×6 000 mm, 35°, 500 mm, 0/0 mm után `Mezők: kész`. | A következő mező logikusan lépett tovább. A tetőforma és a 0 mm alapértékek explicit jóváhagyhatók voltak. |
| E — Anyagkimutatás | PASS | 85,45 m²; 28 szarufa; 27 lécsor; 2 fóliatekercs; 40 fedőtábla. | Minden ellenőrzött érték egyezett a független referenciával. A profil kézi DEMO-adat volt. |
| F — Mentés és újranyitás | PARTIAL | V1 mentés: `7f1e36ff-2ada-49a0-9058-d1f21e013277`; böngésző-újratöltés után PDF, szakasz, kalibráció, mezők, 85,45 m² és 28 db megmaradt. | A normál újranyitás sikerült. Az explicit „Kilépés mentés nélkül” után a V1 számítás megmaradt, a rajzi munkamenet eltűnt — a figyelmeztetésnek és a két külön perzisztenciamechanizmusnak megfelelően. |
| G — Kalkulátorváltás | PASS | Anyagkimutatás → szarufa-kiszabás → anyagkimutatás. | PDF, oldaltípusok és oldalkötött kalibráció megmaradt; az anyagkimutatás-specifikus eredmény nem jelent meg a másik kalkulátorban; visszatéréskor a szakasz, V1 és eredmények helyreálltak. |

### C.1 Pozitív út röviden

1. `Kalkulátorok` → `Rajzból indítok` → DEMO PDF feltöltése.
2. Oldalankénti `Tetőterv` / `Alaprajz` megerősítés.
3. Tetőszakasz kijelölése, elnevezése és fedettségének megadása.
4. Kétreferenciás kalibráció 10 m és 6 m hosszal.
5. Hossz, szélesség, hajlás és ereszkiülés forrásolt átvitele; 0/0 mm alapértékek jóváhagyása.
6. Kalibrált 10 m kontrollmérés és explicit felirat–mérés összekapcsolás.
7. Faanyag, fólia és fedőanyag bekapcsolása, kézi DEMO-profil megadása.
8. Teljes tető megerősítése, eredmények ellenőrzése, V1 mentés és újratöltés.
9. Kalkulátorváltási körút és azonos adatokkal hagyományos ellenőrző számítás.

### C.2 Negatív és biztonsági próbák

| Próba | Eredmény | Állapot |
|---|---|---|
| 4,0% lejtés tetőhajlásként | „A százalékos lejtés nem fokérték” — átvitel blokkolva. | PASS |
| 43,38 m² terület hosszmezőbe | Nem egyértelmű hosszméret — átvitel blokkolva. | PASS |
| Alaprajzi 10 m falméret tetőhosszba | Külön fedett-tetőrész megerősítést követelt; automatikusan nem került át. | PASS |
| 1. oldali kalibráció használata a 2. oldalon | „Ezen az oldalon nem használható.” | PASS |
| 10 m felirat méréshez kapcsolva | mm: 10 mm/100%; cm: 100 mm/99%; m: 10 000 mm/0% — helyes értelmezés kijelölve. | PASS |
| 0,50 m ereszkiülés tetőszélességbe | 500 mm szélességként azonnal bekerült, figyelmeztetés nélkül. | FAIL |
| 10,00 m hossz aktív hátsó kiülés célmezőbe | 10 000 mm hátsó kiülésként bekerült; 170,91 m² hibás felület keletkezett. | FAIL |
| Téves gyorsátvitel visszavonása | A `Visszavonás` helyreállította a 0 mm-t és a 85,45 m²-t. | PASS |
| Egység nélküli, félreérthető felirat | A `Homlokzati kiülés: 0,00 m` összetett feliratot a gyorsátvitel nem tekintette egyetlen méretnek. | PARTIAL |

### C.3 Invariánsok

- **Oldalankénti rajztípus:** bizonyított, PASS.
- **Alaprajzi falméret nem automatikus tetőméret:** bizonyított, PASS.
- **Kétreferenciás kalibráció:** bizonyított, PASS.
- **Kalibráció oldalszámkötése:** bizonyított, PASS.
- **Felirat–mérés explicit kapcsolat:** bizonyított, PASS.
- **10×/100× konfliktus kijelzése a mérés-összevetésben:** bizonyított, PASS.
- **Minden gyorsátviteli út egység-/nagyságrendi védelme:** megcáfolt, FAIL.
- **Forrás SHA-256 UI-bizonyítéka:** NOT VERIFIED; az oldalkötés látható volt, a hash nem jelent meg a felületen.
- **Szakaszadatok izolációja:** egyetlen szakasz és kalkulátor-körút alapján PASS; több szakasz közös éle/vápája NOT TESTED.
- **OCR műszaki pontosság:** **BLOCKED (M12.2)**; a DEMO szövegréteges PDF.js-forrást használt, nem igazol OCR-pontosságot.

## D. Számítási referenciaellenőrzés

### D.1 Független képletek

Az ellenőrzés nem a TetőPro kimenetének visszamásolásából készült.

- Egy tetősík vízszintes futása: `6 / 2 + 0,5 = 3,5 m`.
- Ferde síkhossz: `3,5 / cos(35°) = 4,272711 m`.
- Teljes tetősíkfelület: `2 × 10 × 4,272711 = 85,454221 m²`.
- Vízszintes vetület: `2 × 10 × 3,5 = 70,00 m²`.
- Hajlás százalékban: `tan(35°) × 100 = 70,0208%`.
- Szarufa: `2 × (ceil(10 / 0,8) + 1) = 28 db`; összhossz `28 × 4,272711 = 119,63591 m`.
- Léc: tetősíkonként `ceil(4,272711 / 0,35) + 1 = 14` vonal; a közös felső vonal egyszer számítva `2 × 14 - 1 = 27`, összesen `27 × 10 = 270 m`.
- Fólia: 1,5 m névleges és 0,1 m oldalátfedés mellett 3 csík/tetősík, összesen 6×10 m = 60 m vágott hossz, ezért 2×50 m tekercs a pontos vágási minimum.
- Fedőtábla: 10 oszlop/tetősík a 1,0 m hasznos szélességből, 2 sor a 3,9 m hasznos hosszból: `2 × 10 × 2 = 40 db`.

### D.2 Eredménytábla

| Tétel | Független referencia | TetőPro | Eltérés | Állapot |
|---|---:|---:|---:|---|
| Teljes tetősíkfelület | 85,454221 m² | 85,45 m² | -0,004221 m², kijelzési kerekítés | PASS |
| Vízszintes vetületi terület | 70,00 m² | 70,00 m² | 0 | PASS |
| Tetőhajlás | 35° / 70,0208% | 35° / 70% | -0,0208 százalékpont, kijelzési kerekítés | PASS |
| Összes ereszél | 20,00 m | 20,00 m | 0 | PASS |
| Gerinc | 10,00 m | 10,00 m | 0 | PASS |
| Szarufák | 28 db | 28 db | 0 | PASS |
| Szarufa összhossz | 119,63591 m | 119,636 m | +0,00009 m | PASS |
| Szarufa névleges térfogat | 1,914175 m³ | 1,914 m³ | -0,000175 m³, kijelzési kerekítés | PASS |
| Lécsorok | 27 db | 27 db | 0 | PASS |
| Léc összhossz | 270 m | 270 m | 0 | PASS |
| Léc névleges térfogat | 0,405 m³ | 0,405 m³ | 0 | PASS |
| Fóliacsíkok | 6 db | 6 db | 0 | PASS |
| Fólia vágott hossz/felület | 60 m / 90 m² | 60 m / 90 m² | 0 | PASS |
| Fóliatekercs pontos vágási minimum | 2 db | 2 db | 0 | PASS |
| Fedőtábla-oszlopok | 20 db | 20 db | 0 | PASS |
| Fedőtáblák | 40 db | 40 db | 0 | PASS |
| Fedőtábla névleges felület | 176 m² | 176 m² | 0 | PASS |

Az eredmények geometriai, névleges vagy kiosztási mennyiségek. Nem igazolt gyártói beszerzési mennyiségek, és nem tartalmaznak gyártói csomagolási/kiosztási korlátozást, veszteségi ráhagyást vagy statikai megfelelőséget.

### D.3 Rajzos és hagyományos út összehasonlítása

Azonos geometria és azonos kézi DEMO anyagprofil mellett a rajzos és a hagyományos kalkulátorút minden összevetett eredménye azonos volt:

- 85,45 m² tetőfelület;
- 28 db / 119,636 m szarufa;
- 27 db / 270 m léc;
- 6 fóliacsík, 60 m, 90 m², 2 tekercs;
- 40 fedőtábla, 20 oszlop, 176 m² névleges felület.

A rajzos út három nettó geometriai mezőbevitelt takarított meg a hagyományos úthoz képest, de oldalbesorolást, szakaszkijelölést, kalibrációt és forrás-jóváhagyást tett hozzá. Egyetlen egyszerű, ismert tetőn a hagyományos út gyorsabb. A rajzos út értéke nem elsősorban a sebesség, hanem a forrás-visszakövethetőség és a tervhez kötött bizonyítás — feltéve, hogy a gyorsátviteli hiba javul.

## E. UX-értékelés

### E.1 Műveletszám és kézi adatbevitel

- A pozitív rajzos út V1 mentésig legalább **40 vezérlőaktiválást** és **16 szöveg-/számmező-szerkesztést** igényelt; a negatív QA-próbák ebben nincsenek benne.
- A 16 kézi mezőből 1 a szakasz neve, 14 numerikus DEMO anyagparaméter és 1 adatforrás-megnevezés volt. Geometriai méretet nem kellett kézzel begépelni.
- A hagyományos összehasonlító út 4 geometriai és 15 anyagprofil-mezőt, továbbá 3 anyagkapcsolót és 1 irányválasztást igényelt.
- A rajzos út tehát ezen az egyszerű példán csak 3 nettó kézi mezőt takarított meg, miközben jelentősen több navigációs és jóváhagyási lépést adott hozzá.
- Legalább **7 távoli panelváltás/görgetési szakasz** kellett az upload, oldaltípus, szakasz, kalibráció, gyorsátvitel, anyagadatok, eredmény és mentés között. A pontos fizikai swipe-szám NOT TESTED.
- Használati időt nem mértem; időmegtakarítási százalékot nem állapítok meg.

### E.2 375×812 mobil

**Erősségek**

- A belépési pont és a következő teendő egyértelmű.
- A T4 lépéssáv röviden mutatja a hiányzó és megerősítendő állapotot.
- Nem volt vízszintes CSS-túlcsordulás (`scrollWidth = innerWidth = 375`).
- A sötét és világos téma olvasható, a fő vezérlők elérhetők.
- A százalék-, terület-, oldalkötési és alaprajzi-scope hibák üzenetei szakmailag érthetők.

**Korlátok**

- A rajz 100%-on körülbelül 295×209 px volt. A közel fekvő függőleges 6,00 m és 0,50 m feliratok biztonságos megkülönböztetése egy koppintással nem reális.
- A gyors célmező „ragadós”; egy korábban kiválasztott célmező mellett a következő feliratkoppintás azonnal adatot írhat.
- A hosszú anyagprofil-űrlap és a mentés távol van a rajztól; a rajz és az eredmény nem látható egyszerre.
- A fedettség kiválasztása külön megerősítő lépés nélkül lezárja a szakaszt.
- A téma közvetlenül a kalkulátoroldalon nem váltható; a Műhely oldalon lévő globális váltót kellett használni.

### E.3 812×375 fekvő mobil

- Sötét és világos témában nem volt vízszintes túlcsordulás (`812 = 812`).
- A fix alsó navigáció a 375 px magasságból jelentős területet elvesz; a tartalomra nagyjából 320 px marad.
- A nagy rajzi és munkaterület-blokkok között egyoldalas görgetések üres vagy csak részben hasznos képernyőt eredményeztek. A fekvő mobilnézet működik, de hatékony helyszíni munkára gyenge.

### E.4 1440×900 asztali

- Sötét és világos témában stabil kétoszlopos elrendezés, vízszintes túlcsordulás nélkül (`1440 = 1440`).
- A kalkulátorlista, rajz, kalibráció és geometriai mezők egyszerre jobban áttekinthetők.
- A forrásfeliratok pontos kiválasztása lényegesen kevésbé kockázatos, mint mobilon.

### E.5 Adatvesztési visszajelzés

- Az `Új kalkuláció` egyértelműen jelezte, hogy a nem mentett kalkulátoradat, tervrajz és szakaszgeometria elveszhet.
- A navigációs guard `Mentetlen módosítások` üzenettel és `Kilépés mentés nélkül` / `Maradok` választással működött.
- A V1 adatbázis-kalkuláció megmaradt, de az explicit eldobás után a rajzi munkamenet eltűnt. Ez megfelel a dokumentált külön perzisztenciának, de a felhasználónak könnyen félreérthető, ha a „Mentve · V1” állapotból a forrásrajz tartós tárolására következtet.

### E.6 Fizikai érintés

A teszt böngészőautomatizálással és koordinátakattintásokkal készült. A 375×812 vizuális és interakciós kockázat igazolt, de **valódi telefonon, ujjal végzett érintéses teszt NOT TESTED**.

## F. Hibajegyzék

### F.1 P1 — A gyors rajzi átvitel szakmailag téves, de dimenzió-kompatibilis értéket észrevétlenül elfogad

**Reprodukció A**

1. 375×812 nézetben töltsd be a fixture 1. oldalát.
2. Válaszd célmezőnek a `Tető szélessége` mezőt.
3. Koppints a 6,00 m falvetületi méret közelében lévő `0,50 m ereszkiülés` feliratra.

**Tényleges:** `Tető szélessége: 500 mm` bekerül, és a folyamat továbblép.

**Várt:** a felirat szemantikai szerepe vagy a korábbi/mért referencia alapján konfliktus, legalább külön megerősítés.

**Reprodukció B**

1. Hagyd célmezőként kiválasztva a `Homlokzati kiülés · hátul` mezőt.
2. Indíts 10 m-es kalibrált mérést.
3. Koppints a `10,00 m - fal/tető hossza` feliratra.

**Tényleges:** 10 000 mm hátsó kiülés kerül be; a felület 85,45 m²-ről 170,91 m²-re változik. Az explicit mérés-összevetés helyett a gyorsátvitel elsőbbséget kap.

**Várt:** aktív mérésnél először a felirat–mérés kapcsolat készüljön el, és a korábbi 0 mm-hez képest nagyságrendi konfliktus blokkolja az automatikus felülírást.

**Érintett terület:** `src/features/calculators/plan-field-transfer.tsx`, a gyors célmező, feliratkattintás, mérési mód és konfliktusellenőrzés prioritása.

**Javítási irány:** egy közös, minden átvitelre kötelező validációs kapu; aktív mérési mód elsőbbsége; meglévő érték és kalibrált hossz nagyságrendi összevetése; eltérő szemantikai címkékhez explicit jóváhagyás; a célmező visszaállítása `Nincs` állapotra sikeres átvitel után vagy jól látható „következő mező” fókusz.

### F.2 P2 — A „fedett” kiválasztása önmagában igazolja a szakaszt

**Reprodukció:** új tetőszakasz kijelölése után válaszd a fedettséget `fedett` értékre.

**Tényleges:** a lépés külön jóváhagyó művelet nélkül készre vált.

**Várt:** a jelentős szakmai scope-döntést külön, egyértelmű megerősítés zárja le, vagy a felület szövege tegye világossá, hogy maga a választás a jóváhagyás.

**Érintett terület:** `src/features/calculators/plan-field-transfer.tsx`, tetőszakasz-fedettség állapota.

**Javítási irány:** külön „Fedettség megerősítése” vagy egyértelműbb, visszavonható választó és összefoglaló.

### F.3 P2 — A fekvő mobilnézet hasznos magassága kevés

**Reprodukció:** 812×375 nézet, rajzos munkaterület, görgetés a rajz és az anyagadatok között.

**Tényleges:** a fix alsó navigáció jelentős magasságot foglal, egyoldalas görgetés nagy, részben üres blokkokra ugorhat.

**Várt:** fekvő nézetben kompaktabb navigáció és a rajz/gyorsátvitel panelhez illesztett görgetési célok.

**Érintett terület:** mobil navigáció és a rajzi munkaterület reszponzív elrendezése.

**Javítási irány:** 500 px alatti magasságnál csökkentett/automatikusan rejtett alsó navigáció; kalibráció és gyorsátvitel sticky mini-panel; kisebb vertikális hézagok.

### F.4 P3 — A mentett kalkuláció és a rajzi munkamenet kapcsolata könnyen túlértelmezhető

**Reprodukció:** V1 mentés, majd navigáció és `Kilépés mentés nélkül`.

**Tényleges:** a V1 számítás megmarad, a rajzi munkamenet eltűnik. A guard helyesen figyelmeztet, de a `Mentve · V1` önmagában tartós forrásrajz-mentést sugallhat.

**Várt:** rövid, közvetlen jelzés a mentés mellett: „A kalkuláció mentve; a rajzi munkamenet külön exportálandó/nem része a V1-nek.”

**Érintett terület:** mentési státusz és rajzi munkamenet-guard.

**Javítási irány:** a két perzisztenciát közvetlenül a mentési blokkban külön megnevezni.

## G. Prioritásos fejlesztési javaslatok

1. **P1 — Egységesítsd a gyorsátvitel biztonsági kapuját.** A mérés-, egység-, nagyságrend-, oldalscope- és meglévőérték-ellenőrzés minden forráskattintásnál ugyanazon validátoron menjen át.
2. **P1 — Aktív mérési mód kapjon elsőbbséget.** Ilyenkor a feliratkattintás ne írhasson mezőt; előbb csak mérés–felirat kapcsolat és összevetés jöjjön létre.
3. **P2 — Mobil címke-kiválasztás nagyítása és megerősítése.** Koppintás után nagyított címkekártya mutassa a teljes feliratot, oldalt, egységet, célmezőt és a régi → új értéket, mielőtt az adat bekerül.
4. **P2 — Fekvő mobil compact mód.** Rejthető alsó navigáció, kisebb vertikális hézag és a rajzhoz rögzített gyorssáv.
5. **P2 — DEMO anyagprofilok külön, explicit tesztadatként.** Ha a környezet célja bemutató, legyen előre betöltött, mindenhol `DEMO / nem gyártói adat` jelölésű profil; valódi terméknek ne tűnhessen.
6. **P2 — Rajzos és kalkulációs mentés állapotát külön jelenítsd meg.** Például `Kalkuláció: V1 mentve` és `Rajzi munkamenet: csak helyi / exportálatlan`.
7. **P3 — A fedettség jóváhagyását tedd explicit vagy egyértelműbbé.** A scope-döntés legyen jól láthatóan visszavonható és auditálható.

## H. Végső minősítés

### NOT DEMO READY

Ez a minősítés a **felügyelet nélküli, mobilos, szakmai DEMO-ra** vonatkozik. Nem azt jelenti, hogy a számítómotor vagy a teljes munkafolyamat használhatatlan.

**Bizonyítottan működik:** a PDF-megnyitás, oldalbesorolás, tetőszakasz, kétreferenciás kalibráció, explicit mérés–felirat kapcsolat, vezetett hiányzóadat-kezelés, anyagkimutatás, függetlenül helyes matematika, V1 mentés/újratöltés, kalkulátorváltási állapotmegőrzés, hagyományos út egyezése, világos/sötét téma és a három nézetméret.

**A minősítést blokkolja:** egyetlen mobilos rossz feliratkoppintás vagy megmaradt célmező észrevétlenül szakmailag hibás, akár kétszeres tetőfelülethez vezető adatot vihet be. Ez közvetlenül sérti a DEMO sikerkritériumát, hogy tévesen értelmezett méret ne kerülhessen észrevétlenül a számításba.

Az F.1 P1 hiba javítása és célzott böngészős regressziója után a jelenlegi bizonyítékok alapján a rendszer várhatóan **DEMO READY WITH LIMITATIONS** szintre emelhető.

## I. Ellenőrzési jegyzék és korlátok

**Ténylegesen futtatott ellenőrzések**

- Teljes böngészős fő út 375×812 nézetben.
- Negatív egység-, terület-, oldalkötés-, alaprajzi scope- és nagyságrendi próbák.
- Független JavaScript-referencia-számítás a rögzített DEMO-adatokból.
- V1 mentés és normál böngésző-újratöltés.
- Kalkulátorváltási körút.
- Hagyományos, rajz nélküli összehasonlító számítás.
- 375×812, 812×375 és 1440×900; sötét és világos téma; `scrollWidth` ellenőrzés.
- Böngésző `warn`/`error` napló: 0 bejegyzés a végső ellenőrzéskor.
- Fixture PDF vizuális renderelése és szövegrétegének szemantikai ellenőrzése.

**NOT TESTED / BLOCKED**

- Fizikai telefonos érintés, pinch-zoom és valós kültéri használat: NOT TESTED.
- Képalapú feltöltés és OCR műszaki pontosság: NOT TESTED; M12.2 továbbra is BLOCKED.
- Több tetőszakasz, közös él, vápa, részleges fedettség és összesítési tilalom: NOT TESTED.
- Valódi gyártói profil, csomagolás, ár, veszteségi ráhagyás és beszerzési lista: NOT TESTED.
- Többfelhasználós Auth/RLS, konkurens mentés és szervezetek közötti izoláció: NOT TESTED; a DEMO-felület tulajdonosi szövegét láttam, közvetlen adatbázis-próba nem történt.
- Teljes automatikus regressziós csomag: nem futott; a feladat böngészős E2E fókuszú volt, alkalmazáskód nem változott.

Sem alkalmazáskód, sem adatbázisséma, Auth/RLS, kalkulációs képlet vagy éles környezet nem módosult. Commit, push és deploy nem történt.
