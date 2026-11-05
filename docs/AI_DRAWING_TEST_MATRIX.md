# Tervrajz-feldolgozás tesztmátrix

## P1.1 — koppintásos tervrajzi mezőkitöltés (2026-10-30)

**Állapot: PASS WITH LIMITATIONS.** A böngészős QA két hibája (m² felső index, mobil gyorssáv) javítva és újraellenőrizve. Komponens- (jsdom + Testing Library) és unit tesztek PASS; autentikált in-app böngészős QA desktopon és emulált mobil nézetben 2026-10-30-án.

| Ellenőrzés | Eredmény | Bizonyíték |
|---|---|---|
| Kiválasztott mező + egy koppintás egyértelmű PDF.js méretre → mentetlen draft, visszajelzés, következő hiányzó mező | PASS | `plan-field-transfer.test.tsx` |
| Egységkonverzió: rajzon szereplő egység elsőbbsége, dokumentumegység, feliratonkénti felülbírálás | PASS | `drawing-quick-transfer.test.ts`, `plan-field-transfer.test.tsx` |
| Egység nélküli felirat dokumentumegység nélkül: egységkérés, választás után átvitel | PASS | `plan-field-transfer.test.tsx` |
| Elutasítás: `%` hajlásként, összetett (`30x50`), `m²`, előjeles, `db`, több számot tartalmazó felirat, dimenzióütközés (`°` ↔ hossz) | PASS | `drawing-quick-transfer.test.ts`, `plan-field-transfer.test.tsx` |
| OCR-felirat: nincs közvetlen átvitel, részletes, külön jóváhagyandó szerkesztő | PASS | `plan-field-transfer.test.tsx` |
| Tetőszakasz-kapu: név, kijelölés, fedettség és szakaszonkénti rajzi-méret megerősítés nélkül nincs átvitel | PASS | `plan-field-transfer.test.tsx`, `drawing-quick-transfer.test.ts` |
| Átfedő feliratok: választás kérése, nincs csendes döntés | PASS | `numericSourcesAt` unit + komponensteszt |
| Felülírás látható korábbi értékkel; több egymást követő átvitel lépésenkénti visszavonása; `LengthField` kijelzés szinkron | PASS | `plan-field-transfer.test.tsx` |
| Visszavonás nem ír felül azóta kézzel módosított mezőt; nem ír másik szakaszba vagy rajzba | PASS | `quickTransferUndoState` unit + komponensteszt |
| Két tetőszakasz elkülönítése (érték, visszavonási előzmény, oda-vissza váltás) | PASS | `plan-field-transfer.test.tsx` |
| PDF-csere: visszavonás, dokumentumegység és rajzi-méret megerősítés törlődik | PASS | `plan-field-transfer.test.tsx` |
| Fókusz: billentyűnkénti gépelés stabil kulccsal (natív + `LengthField`), kontroll a régi kulccsal; aktivált feliratgomb fókusza megmarad | PASS | `calculator-field-focus.test.tsx`, `plan-field-transfer.test.tsx` |
| Böngésző (in-app, autentikált helyi dev, desktop): mezőfókusz billentyűnként (`35`, LengthField `800` cm) | PASS | Valódi billentyűleütések; fókusz végig a mezőn. |
| Böngésző, E-01 (valós alaprajz, a felhasználó kérésére, csak helyben): PDF.js 346 szövegelem, „földszinti alaprajz” jelzés, hiányzó mezők listája | PASS | A fájl csak 127.0.0.1-ről, ideiglenesen jutott a laphoz (az in-app fájlválasztó nem engedte); repóba, logba nem került. |
| Böngésző, E-01: szakaszkijelölés két valódi kattintással, fedettség; `17,00` → Tető hossza 17 000 mm, `14,50` → szélesség 14 500 mm valódi koppintással, következő mezőre lépés; `4,0%` hajlásként elutasítva | PASS | 35° kézi hajlással: tetősík 300,92 m², vetület 246,50 m², ereszél 34,00 m, gerinc 17,00 m (246,50 / cos 35° egyezik). |
| Böngésző, E-01: lépésenkénti visszavonás valódi kattintással (12 840 → 17 000; 14 500 → üres) | PASS | |
| Böngésző, E-01: helyiségterület (`12,84 m` + külön `2` felső index span = m²) tetőhosszként | FAIL → **javítva** | Első futáskor 12 840 mm-ként átment. Javítás: `hasSplitPowerSuffix` (a feliratot érintő, a szövegvastagságnál kisebb `2`/`3`/`²`/`³` span → terület/térfogat), gyors és részletes átvitelben is elutasítva. Helyi E-01 ellenőrzés: pontosan a 14 helyiségterület jelölődik, más felirat nem; javítás után 0 „… m” végű felirat vihető át hosszként. Szintetikus regresszió: `drawing-quick-transfer.test.ts`, `plan-field-transfer.test.tsx`. Az E-01-es böngészős újrafuttatás nem történt meg. |
| Böngésző 375×812: vízszintes túlcsordulás nincs; egységgombok 44×44 px | PASS | |
| Böngésző 375×812: gyorssáv magassága | FAIL → **javítva** | Első futás 540 px. Most legfeljebb `min(42vh, 20rem)` (mérve 301–320 px), belül görgethető; visszajelzés és Visszavonás közvetlenül a mezőválasztó alatt, látható; Visszavonás 90×44 px; új szakasznál a megerősítés látható. Szintetikus DEMO rajzzal újramérve. |
| Böngésző 812×375: gyorssáv | FAIL → **javítva** | Első futás: 313 px, a rajzból 38 px látszott. Most 520 px alatti magasságon nem ragad (`position: static`); a rajzból 351 px látszik, takarás és vízszintes túlcsordulás nincs. |
| Böngésző 375×812: méretfeliratok olvashatósága, 20×20 px-es feliratérintési cél | **NYITOTT (UX)** | A rajz telefonon 312 px széles; 4× nagyítás és görgetés van, két ujjas nagyítás nincs. Az átfedő feliratoknál választás kérése véd a téves koppintás ellen. |
| Vegyes egységű terv (E-01: méretlánc m-ben, nyílászárók pl. `90`/`210` cm-ben) | NYITOTT → **javítva (P1.3)** | Az egységválasztás a felirat számformátumához kötött; eltérő formátumnál a sáv újra kérdez. Unit + komponensteszt, szintetikus DEMO böngészős QA. E-01-gyel böngészőben nem futtatva. |
| Görgetés: gyorssáv a rajz fölött (videó 2026-10-31) | FAIL → **javítva (P1.3)** | Ok: `sticky` + áttetsző felület. Most normál folyam, korlátozott rajznézet; átfedés-mérés 375×812, 812×375, 643 px, 1366×850: 0. |
| Ereszkiülés és tetőforma alaprajznál | HIÁNY → **javítva (P1.2)** | Minden aktív rajzos tetőszakasznál megerősítendő; nem megerősítve a végleges mentés tiltott, az előnézet jelölve számol, a munkamenet-export működik. Nem támogatott formáknál számítási korlát sor. Szintetikus DEMO rajzzal böngészőben ellenőrizve (2026-10-31); E-01-gyel nem futtatva. |
| Natív fájlválasztó és `window.confirm` dialógus az in-app böngészőben | NOT TESTED | A fájlválasztó nem engedett fájlt választani; a QA alatt a `confirm` „igen”-re volt állítva. |
| Fizikai iOS/Android, valós érintés, két ujjas nagyítás | NOT TESTED | |
| Időmegtakarítás valódi bádogossal | NOT TESTED | Mérési terv: `PROGRESS.md` P1.1. |

## M12.6 — vezetett geometria és anyagkigyűjtés újraellenőrzése (2026-10-30)

**Állapot: PASS WITH LIMITATIONS.** A szintetikus, 8×6 m-es nyeregtető E2E újrafutott a jelenlegi forráskóddal, a már jóváhagyott méreteket a meglévő `roof.material-takeoff` motor kapta meg. Az E-01-ről nincs bizonyított tetőfedettség vagy tetőgeometria, ezért abból most sem készült számítás. A böngészős pilot korábbi M12.6 QA-bizonyíték; ebben az újraellenőrzésben nem futott újra, mert a hozzáférhető Brave-lap az éles Vercel alkalmazást nyitotta, nem a jelenlegi, nem publikált munkafát.

| Ellenőrzés | Eredmény | Bizonyíték |
|---|---|---|
| Szintetikus alaprajzból méretkinyerés, kézi mező-hozzárendelés/jóváhagyás, meglévő motorral geometria és anyagkigyűjtés | PASS | `drawing-roof-takeoff.test.ts`; a 8×6 m, 35° DEMO eredmény 58,60 m² geometria, 20 szarufa, pozitív faanyagtérfogat és 16 fedőtábla. |
| Tetőszakasz-kezelés és fokozatos draftátvitel regresszió | PASS | Célzott 4 fájl / 46 teszt; teljes Vitest 1378 PASS, 19 SKIP. |
| Lint, TypeScript, production build, diff-check | PASS | `npm run lint`, `npx tsc --noEmit -p tsconfig.typecheck.json`; izolált másolaton `npm run build`; `git diff --check`. |
| Friss böngészős E2E a jelenlegi, helyi forráskóddal | NOT TESTED | Csak az éles Vercel alkalmazás volt elérhető; a régebbi szintetikus böngésző QA az M12.6 jelentésben szerepel. |
| E-01 teljes tető | NOT CALCULATED | A 17,00 × 14,50 m külső alaprajzi méret nem bizonyít tetőméretet; tetőforma, fedett részek, eresz, hajlás és kapcsolatok továbbra is hiányoznak. |

Az anyagmennyiségek DEMO paraméterekkel készültek, nem beszerzési lista vagy statikai igazolás. Az M12.2 OCR-pontossági kapu változatlanul **BLOCKED**.

## M12.9 — strukturált tetőmunka export/import (2026-10-30)

**Állapot: PASS WITH LIMITATIONS.** Az export/import JSON verzió `1`, a tartalom szigorú sémával validálódik. Böngészős letöltés/fájlválasztás nem bizonyított.

| Ellenőrzés | Eredmény | Bizonyíték |
|---|---|---|
| Két különböző tetőszakasz export/import | PASS | Helper-regresszió megőrzi a neveket, formákat, mezőket, anyagkiosztást, oldalt, koordinátákat és aktív szakaszt. |
| Hiányos szakasz és PDF nélküli folytatás | PASS | Hiányos mezők importálhatók draftként; mentett eredmény nincs, hiányzó geometria a meglévő motorban hiányos marad. |
| Sérült/manipulált JSON, unknown verzió/mező, méretlimit, duplikált ID | PASS | 8 session unit teszt; strict Zod payload schema. |
| Hibás anyag/kalkulátor mező | PASS | Kalkulátormező-kontrakt, anyagmező-kulcsok, pozitív/egész mm, timber/layout és covering/underlay tartományvalidálás. |
| Anyagprofil paraméterei | PASS | Profilérték exportkor effektív kézi paraméterértékké fagy; ismeretlen aktív profil mentése visszautasítva. Import értékei kézi, újraellenőrzendő draftok. |
| Előző számítás újrahasználata | PASS | Eredménymező nem szerepel a sémában; teszt az importált geometriát `computeConstruction`-nel újraszámolja, hiányos változatot hiányosnak hagyja. |
| SHA-256 azonos PDF visszakapcsolása | PASS helper | Hash + oldalszám egyezésekor pontok visszakötődnek az új PDF.js session ID-hoz, de jóváhagyás/coverage hamis marad. |
| Eltérő PDF visszakapcsolása | PASS helper / UI NOT TESTED | Egyezés hiányában koordináták törlődnek; geometry/material draft megmarad. A UI előtte `window.confirm`-ot kér. |
| Import/export böngésző E2E | NOT TESTED | CUA fájlválasztó korábbi `DOM.setFileInputFiles` timeoutja; támogatott útvonal hiányában nem próbáltam workaroundot. |
| Minőségi kapuk | PASS | Célzott 6 fájl / 101 PASS; teljes 1378 PASS, 19 SKIP; lint, typecheck és production build PASS. |

Az importált munkamenetben a `coverageConfirmed`, forrásjóváhagyások és teljes tetőjóváhagyás nem állnak vissza igazként. Minden megnyitott szakasz a meglévő kalkulátormotorral számolódik újra; épületszintű összesítés nincs. Az M12.2 OCR-pontossági kapu változatlanul **BLOCKED**.

## M12.8.1 — többszakaszos végső stabilizálási QA (2026-10-30)

**Állapot: PASS WITH LIMITATIONS.** A működő sötét asztali böngészőtabon (1280×720) a DEMO PDF-en két külön SVG polygon kijelölés jelent meg. A/B szakaszváltáskor megmaradtak a külön téglalapok, a nyeregtető/6×4 m/25° és kontytető/7×5 m/30° kalkulátordraftok. A B szakaszhoz külön anyag-kiosztás került megadva. A teljes anyageredmény újraellenőrzése mindkét szakaszra, módosítás, törlés és a fájlcsere dialógus-válaszai nem teljes E2E bizonyíték.

| Ellenőrzés | Eredmény | Bizonyíték / korlát |
|---|---|---|
| Két külön rajzi kijelölés | PASS részlegesen | A DEMO PDF ugyanazon oldalán két SVG polygon; mindkettőhöz saját név tartozik. |
| Geometria elkülönítése és váltás | PASS | A: gable, 600×400 cm, 25°; B: hip, 700×500 cm, 30°. Az értékek szakaszonként álltak vissza. |
| Anyag és számítás | PASS WITH LIMITATIONS | A korábbi M12.8 A szakaszeredmény megmaradt; ebben a körben B-hez 60/30 cm kiosztás került be. A teljes anyageredmény két szakaszon keresztüli visszaváltás után nem lett újra végig ellenőrizve. |
| Kijelölés módosítása és szakasztörlés | NOT TESTED | A viewportot görgető UI-vezérlés nem adott megbízható útvonalat a folytatáshoz. |
| PDF A→B / többoldalas oldalváltás | NOT TESTED | A másik szintetikus PDF beállítása CDP `DOM.setFileInputFiles` timeouttal meghiúsult; nincs kerülőút. |
| Fájlcsere figyelmeztetés és jóváhagyás | Kódban jelen van; böngészőben NOT TESTED | A `window.confirm` reset előtti megerősítést kér; dialógus válasza nem volt elérhető. |
| Fedetlen/tisztázandó fedettség | Kódszint + célzott teszt | UI a számított mennyiséget nem nevezi igazolt tetőszakaszeredménynek; fedettség elvesztésekor csak a forrásjóváhagyással egyező értékeket törli. Helper-regresszió lefedi, UI-interakció nem. |
| Viewport/téma | NOT TESTED | A tényleges tab 1280×720 sötét nézetű volt. 375×812, 812×375, 1440×900 és világos téma nem volt beállítható a támogatott CUA API-val. Fizikai iPhone NOT TESTED. |
| Tesztstabilitás | PASS most | Célzott 45 PASS; teljes alapértelmezett suite 1369 PASS / 19 SKIP / 0 FAIL. A korábbi 5 s timeout-fájlok külön 1,36 s és 1,04 s alatt futottak. |
| Lint / typecheck / build / diff | PASS | Lint, temp checkoutban typecheck és production build PASS; diff-check végső futtatása a dokumentációs szerkesztés után szükséges. |

A fájlválasztó automatizálási timeout miatt a konzolnapló, oldalváltás, törlés és a dialógus elfogadás/elutasítása **nem bizonyított**. Az M12.2 OCR-pontossági kapu változatlanul **BLOCKED**. A szakaszadatok csak a kliensoldali munkamenetben maradnak; a teljes épületre vonatkozó összegzés továbbra sincs igazolva.

## M12.8 — több tetőszakasz, DEMO anyagkigyűjtés és biztonságos összesítés

| ID | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| M8-01 | Két külön szakasz, név/azonosító/adatok | Geometria, anyag, kijelölés, fedettség és forrás szakaszonként elkülönül | PASS, szakaszállapot unit teszt + browser szakaszváltás |
| M8-02 | Szakasz törlése | Csak a kiválasztott szakasz törlődik; másik forrása és adata változatlan | PASS, unit teszt; browser törlés **NOT TESTED** |
| M8-03 | Szintetikus E-01-szerű, tagolt PDF; ROOF A/B és teraszok | PDF.js forrásszöveg látható; a teraszfelirat nem válik automatikusan tetővé | PASS, browser preview és 12 PDF.js szövegelem; a terasz-fedettségi út **NOT TESTED** |
| M8-04 | Két tetőforma és külön kiosztás | A meglévő motor szakaszonként számít, szakaszváltás nem keveri a draftot | PASS, browser: A gable 6×4 m / 25° / 50/30 cm = 26 szarufa, 17 lécsor; B hip 7×5 m / 30° / 60/30 cm = 38 szarufa, 41 lécsor |
| M8-05 | Kapcsolódó/átfedő szakasz, `CONNECTION UNKNOWN` | Közös elem és teljes épülettető-összeg nincs; csak aktív szakaszeredmény jelenik meg | PASS, browser figyelmeztetés; összesítés tiltva |
| M8-06 | Hiányzó hajlásszög/anyagparaméter | A meglévő validáció részleges vagy hibás állapotot mutat, mennyiséget nem talál ki | PASS, meglévő kalkulátormotor és UI állapot; közvetlen browser hiányzó-hajlás eset **NOT TESTED** |
| M8-07 | A PDF fájl-/oldalváltása | Régi szakaszok és provenance nem keverednek az új forrással | NOT TESTED browserben; kódút forrásazonosítóval, fájlválasztócsere ebben a körben nem próbált |
| M8-08 | Fedett és fedetlen terasz | Fedetlen/ellenőrizetlen terület ne számítódjon tetőszakasznak jóváhagyás nélkül | PARTIAL: demo forrás felirata látható; fedetlen/ellenőrizetlen UI út **NOT TESTED** |
| M8-09 | 375×812 mobil, sötét téma | Preview olvasható, vízszintes túlcsordulás és konzolhiba nélkül | PASS: in-app Chromium 375×812, document/body szélesség 360/360, 0 warning/error |
| M8-10 | 812×375 fekvő mobil, desktop, világos téma | Preview és interakciók mindegyik nézeten elérhetők | NOT TESTED: jelenlegi CUA nem tudott viewport override-ot állítani; téma váltó nem volt elérhető a vizsgált felületen |
| M8-11 | Fizikai iPhone | Érintés, natív billentyűzet és iOS viewport | NOT TESTED |

**Két szakaszos DEMO eredmény:** az `A főszárny DEMO` 6×4 m nyeregtető 25° mellett 26 szarufa / 57,376 m összhossz és 17 lécsor / 102 m; a `B szárny DEMO` 7×5 m kontyolt tető 30° mellett 38 szarufa / 69,924 m és 41 lécsor / 152 m. DEMO kiosztás: A 50/30 cm, B 60/30 cm. Ezek a meglévő számító motor geometriai/kiosztási előnézetei, nem beszerzési mennyiségek és nem statikai igazolások. A közös csatlakozás/átfedés ismeretlen, ezért nincs teljes épületösszeg.

**Referencia és adatkezelés:** az E-01 valódi PDF nem került automatizált böngészőbe vagy repóba. A szintetikus fixture nem léptékhelyes, és a benne lévő `17.00 × 14.50 m` csak alaprajzi kontúrcímke. A szakaszok és PDF-provenance csak memóriabeli munkamenetadatok; bezárás vagy munkamenetvesztés esetén elveszhetnek. OCR-pontosság és tartós mentés nincs.

**Állapot (2026-10-30):** M12.8 **PASS WITH LIMITATIONS**. Célzott Vitest **47/47 PASS**; teljes Vitest `--testTimeout=15000`: **1368 PASS, 19 SKIP, 0 FAIL**; lint, izolált typecheck/build és diff-check PASS. Az alapértelmezett 5 s timeouttal a teljes suite-ban két lassú, külön futtatással vagy 15 s-os teljes futással átmenő teszt timeoutolt. A két szakaszos DEMO anyagkigyűjtés, 375×812 sötét témájú böngészőút és tiszta konzol igazolt. Fekvő viewport, világos téma, fájl-/oldalváltás és fizikai iPhone **NOT TESTED**. M12.2 OCR műszaki pontossági kapu változatlanul **BLOCKED**.

## M12.7 — vizuális tetőszakasz és anyagkigyűjtés

| ID | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| M7-01 | Két sarok kijelölése szintetikus PDF-en | Oldalhoz rögzített vizuális téglalap, területmérés nélkül | PASS, böngésző |
| M7-02 | 125% zoom és 90° forgatás | A jelölés azonos PDF-részhez igazodik | PASS, DOM koordináták + böngésző |
| M7-03 | Szakasz törlése | Overlay eltűnik, fedettségi megerősítés visszaáll | PASS, böngésző |
| M7-04 | Fedett/fedetlen/tisztázandó állapot | Csak fedett és megerősített szakasz használható geometriához | PARTIAL, fedett út böngészőben; fedetlen/tisztázandó állapotok **NOT TESTED** |
| M7-05 | Kézi méret-hozzárendelés és hiányzó hajlás | Jóváhagyott 8000/6000 mm mentetlen draftba kerül; a 35°-ot a felhasználó adja meg | PASS, böngésző |
| M7-06 | Szintetikus geometria és anyagparaméterek | Meglévő material-takeoff: 58,60 m², 20 szarufa, 27 lécsor, 16 tábla; csak szakasz | PASS, böngésző + meglévő motor |
| M7-07 | Forrásváltás PDF A → PDF B | Új forráskor rajzi kijelölés és megerősítés resetelődik | NOT TESTED, a támogatott fájlválasztó nem indult el; kerülőút nélkül |
| M7-08 | Mobil 375×812 / 812×375 | Kijelölő gomb elérhető, vízszintes túlcsordulás nélkül | PASS, sötét téma; 0 px mindkettő |
| M7-09 | Böngészőkonzol | Nincs alkalmazáshiba | PASS, 0 error |
| M7-10 | E-01 | Valós tetőméret vagy fedettség ne következzen földszinti méretekből | PASS, helyi render földszinti alaprajzot mutat; browser **NOT TESTED**, feltöltés és számítás nem történt |
| M7-11 | Fizikai iPhone / világos téma | Natív érintés és light theme QA | NOT TESTED |

## M12.6 — vezetett tetőszakasz és anyagkigyűjtés

| ID | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| M6-01 | Szintetikus PDF.js alaprajz, `8000 mm` és `6000 mm` | Méretek kiolvashatók, de felhasználói mezőválasztás/ellenőrzés kell | PASS, parser + compositional E2E |
| M6-02 | Fedett rész neve és igazolása hiányzik | Geometriaméret draftátvitelét blokkolja | PASS, UI guard + save-scope unit teszt |
| M6-03 | Alaprajzi méret jóváhagyása | Csak mentetlen draftot módosít; mezővalidáció és felülírásvédelem megmarad | PASS, meglévő transfer helper + compositional E2E |
| M6-04 | Hiányzó geometria/anyagadat | Hiányzó mezők és meglévő takeoff státusz látható; nincs kitalált mennyiség | PASS, panel + existing engine compositional E2E |
| M6-05 | DEMO 8×6 m nyereg, 35°, DEMO léc/faanyag | Meglévő motor: 58 597 180 mm², 20 szarufa, 16 fedőtábla | PASS, compositional Vitest; browser **NOT TESTED** |
| M6-06 | Egyetlen szakasz, teljes épület lefedettsége nincs megerősítve | Részleges eredményként jelenik meg, mentés tiltott | PASS, scope helper unit test; browser **NOT TESTED** |
| M6-07 | Geometria módosítása teljes tető megerősítés után | Megerősítés törlődik | PASS, state wiring; browser **NOT TESTED** |
| M6-08 | E-01 | A 17,00 × 14,50 m nem válik tetőméretté; tetőinformáció hiányában nincs számítás | PASS, korábbi helyi forrásvizsgálat; nem futott át kalkulátoron |
| M6-09 | Szintetikus PDF fájlválasztás/előnézet, zoom/forgatás, 375×812 és 812×375 | PDF.js feldolgozás, szövegkijelölés, layout és vízszintes scroll ellenőrzése | PASS, sötét témában; 0 px túlcsordulás, 125% zoom és 90° forgatás; világos téma **NOT TESTED** |
| M6-10 | Értékjavítás és böngészőkonzol | Szerkeszthető értékek, alkalmazáshiba nélkül | PASS, kézi mezők javíthatók; 0 app error, 4 HMR warning; natív mobil billentyűzet **NOT TESTED** |
| M6-11 | Fizikai iPhone | Eszköz QA | NOT TESTED |

## M12.5 — alaprajzból tetőgeometria: szintetikus negatív és biztonsági kapuk

| ID | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| M5-01 | Azonos oldali PDF.js címrészek: `FÖLDSZINTI` + `ALAPRAJZ` | `ground-floor-plan` besorolás | PASS, unit teszt + szintetikus PDF.js fixture |
| M5-02 | OCR címrész vagy két oldalon szétszórt cím | Nincs rajztípus-besorolás | PASS, unit teszt |
| M5-03 | Külső/dimenziólánc-méret, `TERASZ`, `4,0%`, terület, keresztmetszet | Nincs `roof.rafter-cut` mezőjavaslat | PASS, szintetikus PDF fixture; 0 javaslat |
| M5-04 | Alaprajzi méret tetőgeometriamezőhöz kerülne | Külön megerősítés kell a fedett tetőszakaszra; felülírásvédelem és mezővalidáció változatlan | PASS kódszintű unit teszt; böngésző NOT TESTED |
| M5-05 | Százalékos forrás `pitchDegrees` mezőhöz | Hozzáadás tiltott, nincs konverzió fokra | PASS kódszintű védelmi ág; böngésző NOT TESTED |
| M5-06 | Egy érvényes mező, más kötelező mező hiányzik | Mentetlen draftba részleges átvitel; hiányzó mezők látszanak; teljes számítás/mentés blokkolt marad | PASS, helper unit teszt; browser NOT TESTED |
| M5-07 | E-01 valós alaprajz | Tetőkontúr/forma/gerinc/hajlás/eresz nem igazolható; nincs tetőkimutatás | PASS, helyi PDF.js szöveg és vizuális vizsgálat; nincs automatikus következtetés |
| M5-08 | 375×812, 812×375, light/dark, forgatás/zoom, billentyűzet, scroll/overflow, konzol | Minden kritikus vezérlő használható, konzolhiba nélkül | NOT TESTED: szintetikus PDF feltöltése és viewport-vezérlés nem volt elérhető a támogatott CUA műveletekkel |
| M5-09 | Fizikai iPhone | Eszköz QA | NOT TESTED |

Szintetikus negatív mintában helyes tetőmezőjavaslat **0**, téves tetőmezőjavaslat **0**, bizonytalanság miatt kihagyott alaprajzi számjelölt **8** (a fixture-ben ellenőrzött külső méretek, méretlánc, lejtés, terület, keresztmetszet és terasz címkék). Felhasználói jóváhagyást igénylő lépés: a tetőgeometriai mező draftba vitele előtti fedett szakasz-megerősítés, majd a megszokott átviteli csomag jóváhagyása. E-01-ből nem készült mezőjavaslat.

## M12.4 — explicit műszaki felirat és fokozatos draftátvitel

| ID | Bemenet/cél | Elvárt eredmény | Állapot |
|---|---|---|---|
| M4-01 | `Fél fesztáv: 3000 mm` egy pozíciózott PDF.js spanben | `horizontalHalfSpanMm=3000` javaslat, nem jóváhagyott | PASS, parser + PDF fixture |
| M4-02 | `Gerincemelkedés: 2,00 m` | `riseMm=2000` javaslat | PASS, parser + PDF fixture |
| M4-03 | `Vízszintes ereszkiülés: 40 cm` | `eaveProjectionMm=400` javaslat | PASS, parser + PDF fixture |
| M4-04 | A 3 támogatott szinonima | Ugyanahhoz a célmezőhöz/rule ID-hoz térképeződik | PASS, parser unit test |
| M4-05 | `GERINC 8,20 m`, `17,00`, `14,50`, `4,0%`, `43,38 m²`, `12×16,25/27`, alaprajzi külső méret, `HAP` | Nincs műszaki mezőjavaslat | PASS, 10/10 negatív/kétértelmű text span |
| M4-06 | Két méret ugyanabban a címkézett szövegspanben | Nincs javaslat, nincs proximity alapú összevonás | PASS, parser unit test |
| M4-07 | OCR, más kalkulátor, hiányzó hely/keret, implicit egység | Nincs szabályjavaslat | PASS, parser unit test |
| M4-08 | Egy jóváhagyott mező, más kötelező mező hiányzik | Érvényes részleges célmező átkerül a mentetlen draftba; hiányzó adat látszik | PASS, helper teszt; böngésző **NOT TESTED** |
| M4-09 | Rossz célmezőérték / meglévő érték felülírása | Mezőszerződés elutasít / explicit felülírás kell | PASS, helper teszt |
| M4-10 | Forráskijelölés, emberi javítás, jóváhagyás | Külön user review; forrásszöveg, oldal, position/bounds, unit, rule ID visszakereshető | PASS kódszint; browser **NOT TESTED** |
| M4-11 | PDF A → PDF B és 375×812 / 812×375 light/dark | Új forrásállapot és reszponzív használat | NOT TESTED, fájlválasztó/auth elérhetőségétől függ |

Szintetikus mérés a két PDF fixture-ben: **6 helyes / 6 pozitív, 0 téves / 13 negatív-kétértelmű, 13 kihagyott**. Mindegyik javaslat függő marad emberi forrásellenőrzésig. A review jelölő és jóváhagyás az aktuális átviteli csomagra érvényes; a felhasználó egyesével vagy együtt vihet át mezőket, és szerkesztheti az értéket vagy célmezőt. A minta nem tekinthető általános false-positive becslésnek.

## M12.3C — kézi egységválasztás és draftkonzisztencia

| ID | Bemenet/cél | Elvárt eredmény | Állapot |
|---|---|---|---|
| C3-01 | Unitless `17,00`, egység nélkül | Nincs javaslat/hozzáadás | PASS, unit test + böngésző, add disabled |
| C3-02 | `17,00` + felhasználó által választott cm → mm | `170 mm`, user provenance | PASS, unit test + böngésző |
| C3-03 | `14,50` + m → mm; `4.55` + mm → mm | `14500`; `4.55`; nincs `1450` → `14,50` javítás | PASS, unit test |
| C3-04 | PDF `8,20 m` + eltérő korábbi unit kiválasztás | Explicit PDF egység az elsődleges, `8200 mm` | PASS, unit test + böngésző |
| C3-05 | `%`, m², keresztmetszet, több érték, OCR | Nincs hossz-javaslat | PASS, parser unit test; browserban unitless add disabled |
| C3-06 | Overlay és listás forrásváltás | Korábbi egység/mező/érték/felülírás/jóváhagyás törlődik | PASS böngésző; a korábbi overlay-ágban cm-öröklés reprodukálva és javítva |
| C3-07 | Oldalcsere | Jelölt, unit, mező és nem jóváhagyott lista törlődik; új oldalon nincs implicit egység | PASS böngésző, kétoldalas synthetic PDF |
| C3-08 | Kötelező kalkulátoradat hiányzik | Jóváhagyás blokkol | PASS böngésző; kézi érték után meglévő számítás futott |
| C3-09 | Hosszmező érték draftátvitele | Csak érintett mező stale display-draftja törlődik | PASS helper unit test + böngésző kijelzés 170 mm / 17 cm |
| C3-10 | Kalkulátorváltás és visszatérés | Saját mentetlen draft megmarad, más kalkulátor draftja nem keveredik | PASS böngésző, rafter 17 cm / 500 cm |
| C3-11 | 125% zoom, +90° forgatás | Preview és forráshighlight egymáson marad | PASS screenshoton, szintetikus PDF |
| C3-12 | Új fájl, 375 px, világos/sötét, console | Unit és forrás reset; reszponzív állapot/console mérése | NOT TESTED: két jogtiszta, kétszintes DEMO PDF készült, de az in-app browser fájlválasztója nem nyílt meg; auth nélküli lokális Brave oldalon csak skip-link renderelődött. 375 px, konzol célútvonala és fizikai iPhone szintén NOT TESTED |
| C3-13 | `17,00` + cm → 170 mm → szokatlan geometria | Helyes mező, meglévő képlet, validáció és meglévő figyelmeztetési szabály ellenőrzése | PARTIAL: a régi böngészőbizonyíték a célmezőt nem rögzíti. Az eredmény 5000 mm félfesztáv + `riseMm` 170 mm mellett pontosan 5002,889 mm hossz, 1,947° tetőhajlás és 88,053° függőleges vágás. A rafter-cut validáció engedi; alacsony hajlásra meglévő küszöb/figyelmeztetés nincs, ezért nem implementáltunk önkényeset |

M12.3C célzott Vitest: **4 fájl / 42 teszt PASS**. Teljes Vitest: **209 fájl PASS, 8 SKIP; 1333 PASS, 19 SKIP, 0 FAIL**. Lint, typecheck és Next.js 16.4.2/Webpack production build PASS. A dev szerver az eredeti `.next` könyvtárat használta, ezért a typecheck/build izolált `/tmp` másolatban futott. A régi HMR stale állapot gyökérokát teljesen rekonstruálni nem sikerült; a modellezett UI-draft invalidálása célzottan tesztelve. A teljes új fájlcserés bizonyíték továbbra is hiányzik.

## M12.3B — egységhez kötött értékjavaslat

| ID | Bemenet/cél | Elvárt eredmény | Állapot |
|---|---|---|---|
| B3-01 | PDF.js `8,20 m` → mm | Javaslat `8200`; a mezőt ember választja ki | PASS, unit teszt + böngésző |
| B3-02 | PDF.js `14.50 m` → mm | `14500`; csak szerkeszthető javaslat | PASS, unit teszt |
| B3-03 | OCR eredet | Nincs numerikus javaslat | PASS, unit teszt |
| B3-04 | Egység nélküli `17,00` vagy `1450` | Nincs javaslat; nincs tizedesjel-találgatás | PASS, unit teszt + UI |
| B3-05 | `4,0%`, `43,38 m2`, `12x16,25/27 mm` | Nincs hossz- vagy fokjavaslat | PASS, unit teszt + UI |
| B3-06 | Több számot tartalmazó sor, nulla/negatív érték, nem egész `db`, inkompatibilis dimenzió | Elutasítás | PASS, unit teszt |
| B3-06a | `G1 8,20 m` vagy `8,20 m 1:100` | Több szám-token miatt nincs javaslat | PASS, regressziós teszt |
| B3-07 | Meglévő 3000 mm félfesztáv | Hozzáadás tiltott külön felülírási jóváhagyásig | PASS, böngésző |
| B3-08 | Kötelező gerincemelkedés hiányzik | Átvitel tiltott, amíg kézi adatot nem adnak meg | PASS, böngésző |
| B3-09 | `8,20 m` jóváhagyása cm-es mezőkijelzés mellett | 820 cm kijelzés, meglévő motor 8440,379 mm eredménnyel | PASS, friss böngészőmunkamenet |

M12.3B célzott tesztek: **3 fájl / 35 teszt PASS**. A két új eset először hibázott, a parser szigorítása után PASS lett. Teljes Vitest **209 fájl PASS, 8 SKIP; 1327 PASS, 19 SKIP, 0 FAIL**; lint, typecheck, production build és `git diff --check`: **PASS**. Egy már megnyitott, fejlesztői hot reloadon átesett tab stale meződraftot mutatott az átvitel után; a pontos gyökérok nem igazolt. Tiszta tabban az értékszinkron PASS, konzol 0 warning/error. Ez a friss munkameneti bizonyíték nem igazolja általánosan az összes korábban megnyitott fejlesztői tab állapotát.

## Fáziskapuk

| Azonosító | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| P0-01 | Szintetikus, szöveges PDF; több elem és oldal | Szöveg, oldal, oldalméret és ismert koordináta visszanyerhető | PASS, automata Vitest; többoldalas és normalizált pont egyezése |
| P0-02 | PDF.js App Router/Webpack worker | Lusta böngészőimport, kibocsátott helyi worker asset, böngészős feldolgozás/renderelés | PASS WITH LIMITATIONS: asset kibocsátva, lokális workerSrc beállítva, tényleges browser parse/render PASS; konzol 0 warn/0 error. Külön hálózati Worker-instance/response introspekciót a browser API nem tett elérhetővé; PDF.js `verbosity: 0` mellett saját diagnosztikai üzenetei is némák. |
| P0-03 | Helyi E-01, kizárólag olvasás | Feliratkezdő pozíciók a látható feliratokhoz esnek; fájl nem kerül repóba/logba | PASS, 1 oldal / 467 szövegelem; böngészőmemória; nem került repóba |
| P0-04 | Zoom és forgatás | A preview és az overlay azonos viewport-transzformációt használ | PASS, E-01 2× és +90°; canvas 1684×2382 px, a szövegdarabszám 467 maradt |
| P0-05 | Production diag route | `/devtools/m12-pdf` nem szolgálható ki éles környezetben | PASS, production build után `/devtools/m12-pdf` 404 |
| P0-06 | Bizonytalan vagy lapról kilógó koordináta | Koordináta/keret `null`, hamis pontos keret nélkül | PASS, Vitest |
| P0-07 | Sérült/jelszavas/nagy/összetett PDF | Biztonságos, típusos hiba; nincs dokumentumtartalom-log | PASS, Vitest: hibás, jelszóvédett marker, fájl-, oldal-, karakter- és tokenkorlát |
| P0-08 | Megszakítás/erőforrás-életciklus | Megszakítás jelzett; PDF.js erőforrások felszabadulnak; következő munkamenet működik | PASS, Vitest; a teljes suite unhandled stream hibák nélkül fut |
| P0-09 | Lexikai normalizálás | NFC/whitespace, magyar tizedesvessző, mértékegység-/szimbólum-tokenek; kétértelmű szám nem kap kitalált értéket | PASS, Vitest; műszaki kategorizálás nincs |

## M12.2 OCR fáziskapu

| ID | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| O2-01 | Szintetikus JPG/PNG/WebP út | Tesseract böngésző worker, eredeti szöveg, confidence, pozíció/keret | PASS: PNG, 1600×800 JPG és WebP valódi böngészős OCR; JPG 73%, WebP 74% a hibás `1450` olvasatra |
| O2-02 | Képalapú, szövegréteg nélküli PDF | PDF.js render + explicit oldalszintű OCR, oldalszám/koordináta megőrzés | PASS: synthetic PDF; 1 oldal, 0 PDF-szövegelem, 3 OCR-sor |
| O2-03 | Szövegréteges PDF | OCR ne fusson és ne hozzon létre duplikált elemet | PASS: OCR-modul szövegréteg észlelésekor `text_layer_available`; automata OCR nem indul az inspectorban, de külön unit negatív teszt még nincs |
| O2-04 | Worker, WASM és magyar modell | Helyi origin, nincs CDN; felismerés lefut; böngészőkonzol tiszta | PASS WITH LIMITATIONS: valós OCR igazolja worker/core/model útvonal működését; közvetlen network request/Worker introspekció nem volt elérhető |
| O2-05 | Magyar tizedesvessző és szám | Az eredeti olvasat maradjon visszakövethető; OCR confidence nem válik igazságértékké | FAIL: E-01 14,50→14.50 79–81%; 17,00→17.00 61%; széles ROI 4,55→455 és 7,75→775. Minden érték `unknown`; normalizáló nem javítja át |
| O2-06 | ROI, 90° forgatás és 2× méretrészlet | Geometria teljes oldalhoz viszonyítva, canvas ≤8 MP | PASS WITH LIMITATIONS: E-01 célzott 90° ROI 2× bbox a 3,85/14,50 feliratokra esett; 0° ROI egyik számot sem olvasta. Szövegérték továbbra is konfliktus |
| O2-07 | Kontraszt, szürkeárnyalat, élesítés, PSM | Csak mért esetben legyen kötelező feldolgozás | PASS, kísérleti Node mintán: 2× növelte a konfidenciát, PSM 11 kis javulást, PSM 7 hibás sort adott; preprocesszálás nem volt következetes |
| O2-08 | Kézírás, egyértelmű / kétértelmű / hiányzó jelölés | Referenciával igazolt támogatás, különben `unknown`/`ambiguous` | BLOCKED: három fonttal rajzolt szintetikus vázlat böngészőben tesztelve; 3,20 m → `3.20m` (39%, ambiguous), átfedő 1,00/7,00 → `1,00 X 7,0` (52%, ambiguous), hiányzó méretet nem következtette ki. Nem valódi kézírás és nem pontosságvalidáció |
| O2-09 | Hibás/túlméretes fájl és ROI | Elutasítás dekódolás/feldolgozás előtt, tartalom nélküli hiba | PASS, unit: nem támogatott típus, 16 MiB+1 bájt, PNG fejlécből >8 MP elutasítás és abort; invalid ROI ág kódolt, közvetlen unit teszt hiányzik |
| O2-10 | Megszakítás és erőforrás-felszabadítás | Worker terminate, bitmap/canvas/PDF.js resource cleanup | PASS BY CODE PATH; Vitestben abort worker-indítás előtt tesztelve. Élő böngészős megszakítás és memória-mérés nem történt |
| O2-11 | Same-origin assetek és csomaglicenc | Saját `/ocr/` worker/core/lang, Apache licencjelölés | PASS: Tesseract tényleges böngészős futás; workerBlobURL false és local paths konfigurálva; license/notice fájlok vendorizálva |
| O2-12 | Szövegforrás-kimeneti szerződés | PDF.js és OCR azonos mezőkkel; uncertainty nem műszaki osztály | PASS, közös típus + confidence policy unit teszt; nincs kalkulátorkapcsolat |
| O2-13 | Jogtiszta valódi tervrajz OCR és látható pozíciók egyeztetése | 10–15 műszaki felirat, exact match és bbox egyeztetés | FAIL: E-01 15 kézzel ellenőrzött jelölés; 0/15 pontos szöveg-egyezés, 2/2 célzott bbox helyes, a 13 további sor nem párosítható biztonságosan |

## M12.3A ember által jóváhagyott draftátvitel

| ID | Eset | Elvárt eredmény | Állapot |
|---|---|---|---|
| A3-01 | PDF szöveg vagy OCR-képjelölt kiválasztása | Forrásszöveg/koordináta látható; nincs automatikus mezőillesztés | PASS WITH LIMITATIONS: jogtiszta szintetikus PDF tényleges browser parse/render; zoom és elforgatás után a kiemelés a kijelölt feliraton maradt. E-01-et ebben a záró körben nem használtuk. |
| A3-02 | Mező, egység és kézzel megadott érték | A kiválasztott kalkulátor tényleges mezősémája jelenik meg; a felhasználó írja be az értéket | PASS: mind a négy roof kalkulátoron böngészős, szintetikus, kézzel jóváhagyott draftátvitel; a meglévő kalkulátorséma és számítás maradt érvényben |
| A3-03 | Hibás mező, szám vagy nem számítható input | Elutasítás az existing `fieldContractIssues` + `computeConstruction` útvonalon | PASS, célzott Vitest; hiányzó gerincemelkedés a böngészős UI-ban blokkolta a jóváhagyást |
| A3-04 | Meglévő nem üres érték | Felülírás külön jelölés nélkül elutasítva | PASS: Vitest és UI; a 310 cm draftérték változatlan maradt, amíg nem volt explicit felülírás-jóváhagyás |
| A3-05 | `14,50` és `1450` | Csak kézzel beírt tizedeselválasztó normalizálódhat; nincs motor által kitalált átalakítás | PASS: explicit `14,50` → `14.50`; `1450` megmarad `1450`-nek |
| A3-06 | Hiányzó kötelező bemenet és végső jóváhagyás | Hiányos draft nem vihető át; teljes számítható bemenet + emberi ellenőrzés kell | PASS: hiányos rácsostartó-bemenetnél jóváhagyás letiltott. A teszt a nyeregtetőnél rejtett mezők téves hiányjelzését reprodukálta; a kapu az `isFieldVisible` szerződéshez igazítva, célzott regresszióteszttel és valós böngészős jóváhagyással ellenőrizve. |
| A3-07 | Megszakítás | Jóvá nem hagyott javaslat elvethető; forrásfájl nincs tartósan tárolva | PASS: szintetikus és E-01 fájlt a „Fájl és javaslatok elvetése” kiürítette; forrásgombok száma 0 |
| A3-08 | Adatkezelés | Csak memóriabeli helyi feldolgozás, nincs Storage/API/DB/automatikus mentés | PASS WITH LIMITATIONS BY CODE PATH: nincs dokumentumszöveg-log vagy tartós feltöltés. A szöveg szándékosan megjelenik a helyi UI/accessibility labelben; a fejlesztői PDF-inspector is mutatja a kiválasztott szöveget, de csak `NODE_ENV=development` alatt. |
| A3-09 | Minden jelenlegi tetőkalkulátor | Tervrajzpanel a `roof` kategóriájú kalkulátorokon; mezőhozzárendelés a saját sémájuk szerint | PASS browser UI: `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members`. A három további kalkulátornál a jóváhagyott draft és a meglévő számítási/hiányossági állapot is ellenőrizve; mentés nem történt. |
| A3-10 | 125% zoom és 90° forgatás | A nagyított canvas és a forrás-overlay azonos méretezett konténeren marad | PASS, 375 px szintetikus PDF; a korábbi canvas bitmap-méret-változás CSS-méret-változás nélkül hibája javítva |
| A3-11 | 375 px, világos/sötét | Panel, kalkulátorválasztó és olvasható tördelés; fizikai iPhone külön jelölve | PASS böngészőviewport 375 px light/dark; fizikai iPhone, natív billentyűzet és iOS PWA NOT TESTED |
| A3-12 | Szintetikus OCR félreolvasás | A `1450` OCR-szöveg nem írhat kalkulátormezőbe értéket; confidence csak metaadat | PASS, valódi helyi Tesseract: 3 jelölt, mind `ellenőrizendő`; mező-hozzárendelés és numeric input üres |
| A3-13 | Böngészőkonzol és worker | PDF.js render/parse és Tesseract valós böngészőben; console hibamentes | PASS WITH LIMITATIONS: e záró körben PDF.js szintetikus parse/render, 3 kalkulátor draftátvitele, 0 browser warning/error. Tesseract valós szintetikus OCR-jének korábbi bizonyítéka A3-12 alatt; Worker instance/network response introspekció nem elérhető. |

**Adatvédelmi vizsgálat:** az előző incidensben a Playwright locator nem volt egyértelmű (`+` több gombot talált), és a böngészős automatizáló a jelöltek ARIA-címkéit belefoglalta a saját selector-hiba diagnosztikájába. A `PlanFieldTransfer` a forrásszöveget szándékosan megjeleníti az UI-ban és a forrás-overlay ARIA-címkéjében; ez az accessibility/UI tartalom, nem alkalmazáslog. A rajzfeldolgozási és hibakezelési kód dokumentumszöveget nem logol, hibákhoz statikus, általános üzenetet ad; a `/devtools/m12-pdf` forrásszöveget és OCR-sort megjelenítő diagnosztika csak fejlesztői módban érhető el. Az incidens gyökéroka a teszteszköz selector-diagnosztikájában bizonyított; ez nem bizonyít minden böngészőeszköz/kiegészítő kimenetére vagy telemetriájára, ezért valódi dokumentumon automata DOM/accessibility snapshot továbbra sem használható. Biztonságos QA: csak szintetikus fájl, pontos egyedi locatorok, nincs teljes dokumentumszöveget olvasó snapshot, és a munkamenet végén fájl elvetése.

M12.3A záró ellenőrzés: célzott `drawing-field-transfer.test.ts` **10/10 PASS**; teljes suite **208 fájl PASS, 8 SKIP; 1310 PASS, 19 SKIP, 0 FAIL**. `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: PASS. A korábbi 413 és PDF renderer mock regressziós tesztek ebben a teljes suite-ban PASS. A material-takeoff jóváhagyott geometriája után anyagcsoport hiánya, a timber-cutlistnél specifikációhiány miatt a meglévő validáció helyesen hiányos/nem menthető állapotot jelzett; a draftértékek alkalmazása PASS, mentés egyiknél sem történt. E-01 aktuális vizuális ellenőrzése, fizikai iPhone, natív billentyűzet, más böngészőmotor és mobil memória/latencia **NOT TESTED**. M12.2 változatlanul **BLOCKED**.

### Szintetikus OCR-kimenet (Codex in-app browser)

- PNG: `DEMO TETO 1450 m` 57% (`ambiguous`), `GERINC 8.20 m` 67% (`unknown`), `FAL 38 cm` 95% (`unknown`). A valódi, `14,50` minta hibásan `1450` lett: a tizedesvessző-elvesztés bizonyított.
- Szkennelt PDF: `DEMO TETO 14,50 m` 56% (`ambiguous`), `GERINC 8.20 m` 73%, `FAL 38 cm` 95%. A scan modell nem tesz műszakilag helyessé feliratot akkor sem, ha vesszőt olvas.
- Mindkét bemenet 1600×800 ismert koordinátájú szintetikus kép; sorok pozíció/bounding box értékei látható felirathoz estek. Egész ügyféltervre vagy általános OCR-pontosságra következtetés nincs.
- Kézírás-hatású font fixturek: a `3,20 m`-t ponttal olvasta és alacsony confidence-t adott; átfedő karaktereknél a számot megváltoztatta; méret nélküli rajzon csak a DEMO captiont adta vissza, nem talált ki méretet. Ezek a fixturek a hibakorlátot mutatják, nem kézírás-támogatást.
- Browser console: 0 warn / 0 error (a Next/React fejlesztői info üzenetek kivételével). Külön Worker instance és hálózati resource timing introspekció nem volt elérhető.

### E-01 valódi rajzi OCR (Codex in-app browser, lokális)

- 1 oldal, 1190.55 × 841.89 pt, 467 PDF.js span; az eredeti nem került repóba, tesztfixture-be vagy logba. A title block és a személyes/kapcsolati adatok kívül maradtak a vizsgált ROI-n.
- Kézzel ellenőrzött minta: `14,50`, `3,85`, `17,00`, `4,55`, két `2,35`, `7,75`, `9,20`, `4,30`, `1,55`, `1,50`, `2,00`, `3,30`, `4,0%`, `43,38 m²`. A tervben keresztmetszetszerű `12×16,25/27`, `15/15`, `30/30` jelek is láthatók, OCR-olvasatuk nem igazolt. A teljes mérési tábla az implementation planben van.
- Pontos műszaki felirat-arány **0/15**. Célzott 90° OCR két doboza (2/2) a vizuálisan ellenőrzött `3,85` és `14,50` méretre esett, de a kimenet `3.85` és `14.50`; ez két konfliktus, nem egyezés. Széles ROI 1×/2× mért futása 10,7/16,9 s; célzott futása 6,8/5,7 s. Memória high-water mark nem volt elérhető.
- Hibák: széles méretlánc `4,55`→`455`, `2,35`→`235`, `7,75`→`775`; `17,00`→`17.00`; a célzott, magas confidence sem őrizte meg a magyar vesszőt. Lejtés és terület szövegét nem lehetett megbízhatóan összerendelni.
- Alaprajzon a belső/külső, részméret és összméret olvasata nem használható közvetlenül. Ezen az egy lapon a metszet- és keresztmetszet-olvasás, tetőalaprajz, homlokzat, csomópont, méretezett kézi vázlat és más rajztípus **nem támogatott / nem validált**.
- Browser console: 0 warning / 0 error. A lokális OCR-result nem kapott `validated` státuszt; confidence önmagában nem minősít műszaki adatot.

## Automatizált negatív/szakmai esetek

| ID | Bemeneti minta | Elvárt védelem | Állapot |
|---|---|---|---|
| E01-N01 | Alaprajzi méret | Nem tetőhossz, nincs kalkulátormező-javaslat | NOT IMPLEMENTED; kategorizáló nincs |
| E01-N02 | Belső/külső méret | Nem szarufahossz | NOT IMPLEMENTED |
| E01-N03 | Százalékjelölés | Nem fokban megadott tetőhajlás | NOT IMPLEMENTED |
| E01-N04 | Területfelirat | Nem tetőfelület | NOT IMPLEMENTED |
| E01-N05 | Keresztmetszetjelölés | Nem egyszerű hosszméret | NOT IMPLEMENTED |
| E01-N06 | Rajzi lépték | Nincs skálaalapú pixel–méter konverzió | PASS BY ABSENCE; ilyen számítás nincs |
| E01-N07 | Hiányzó tetőgeometria | Pontosító kérdés; üres kalkulátorbemenet | NOT IMPLEMENTED |

## Regressziós tesztkorrekciók (2026-10-30)

| Teszt | Korábbi eltérés oka | Módosítás és bizonyíték | Állapot |
|---|---|---|---|
| `src/app/api/felmeresek/[surveyId]/photos/route.test.ts` | A teszt 10 MiB-ot várt, a route jelenlegi szerződése 3 MiB/fájl és 4 MiB/kérés | Teszt: pontosan 3 MiB fájl és 4 MiB kérés elfogadva; 3 MiB+1 fájl és 4 MiB+1 kérés 413. Production limit változatlan. | PASS |
| `src/app/api/projektek/[projectId]/kivitelezesi-dokumentacio/route.test.ts` | Mock elavult `renderExecutionReportPdf` exportot adott, a route `renderExecutionReportPdfStream`-et hív | Mock Readable streamre frissítve; 200, `application/pdf` és `%PDF-1.4` body igazolt. | PASS |

A két korábbi teljes-suite eltérés a mostani állapotban javítva van. A route-korlát és renderer üzleti kódját nem módosítottuk. A M12.0 előtti külön teljes suite baseline továbbra sincs, ezért történetileg a commit előtti tényleges futáshibát nem állítjuk; a régi tesztek és route-szerződések eltérése a forrásból megállapítható.

## Futtatott kapuk és korlátok

- M12.1 célzott regressziók: fotó és PDF-riport tesztek a PDF-modul célzott tesztjeivel együtt **5 fájl / 35 teszt PASS**.
- M12.2 célzott rajzfeldolgozó tesztek: **4 fájl / 28 teszt PASS**.
- M12.1 teljes suite történeti eredménye: **206 fájl / 1291 PASS, 19 SKIP**.
- M12.2 jelen záró ellenőrzés teljes `npm test`: **207 fájl PASS, 8 SKIP; 1300 PASS, 19 SKIP, 0 hiba**.
- `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2, Webpack), `npm ls --depth=0` és `git diff --check`: **PASS**. Npm auditot ebben a körben nem futtattunk; telepítéskori jelentés 0 vulnerability volt.
- Böngésző: M12.1 E-01 lokális olvasás és PDF.js zoom/forgatás, M12.2 Tesseract image/PDF + három synthetic sketch; ezen zárásban E-01 OCR, JPG és WebP OCR. Browser console 0 warn/0 error. A production build sikeres; az éles `/devtools/m12-pdf` 404-et ebben a záró körben nem ellenőriztük, mert a lokális production szerver indítása `listen EPERM` hibával blokkolt.
- Node/automata: teljes Vitest; böngésző: csak Codex in-app Chromium. Más böngészőmotor, iOS/Android fizikai eszköz és Supabase-adatbázis teszt nem futott.
- A 32 MiB PDF/100 oldal/100 000 szövegelem/5 MiB szöveg/200 000 token, OCR 16 MiB és 8 MP korlát kód- és határtesztelt; mobilon nem mért memória/latencia.

## Későbbi fázisok

Az M12.2 kapu **BLOCKED**: több, eltérő tervtípuson címkézett minta, tizedesjel-megőrző vagy konfliktust felismerő feldolgozás, valamint valódi mobil latencia/memória-becslés szükséges. Műszaki méretosztályozás, kérdésgenerálás, kalkulátor-bemenet és tartós adatkezelés **nem implementált**. M12.3 felé kizárólag nyers OCR/PDF.js szöveg, oldal, motor/módszer és vizuálisan ellenőrzött koordináta továbbítható `unknown`/`conflict` állapotban, soha nem numerikus kalkulátorértékként.
