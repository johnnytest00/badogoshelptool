# Fejlesztési előrehaladás és bizonyítékok

## P1.4.3.6 — Mobil Menü és Beállítások navigáció (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** A profil-trigger látható felirata és accessible neve most „Beállítások”; a korábbi „Szia!” nem jelenik meg a navigációban. Mobilon, a Beállítások gomb bal oldalán külön „Menü” trigger nyitja meg a teljes alkalmazásnavigációt. A menü Escape-re bezár, külső kattintásra visszahúzódik, és bezárás után visszaadja a fókuszt a triggernek. A beállítási panelből kikerült a redundáns belső glass-keret; a profil-popover marad az egyetlen közös felület.

- A UI/UX Pro Max ikonkonzisztencia-, 44 px-es érintési cél-, fókusz-, billentyűzetes navigáció-, mobil-first és reduced-transparency elveit alkalmaztam. A `UI_SURFACE_GUIDELINES.md` közös Liquid Glass anyagát, átlátszó page-rootját, visszafogott belső vezérlőit, theme-aware hover/focus állapotait és forced-colors támogatását megtartottam.
- Két új, a meglévő sárga-narancs, világos-szürke 3D ikonnyelvhez illesztett PNG került az ikonlistába (`navigationIcons`): Menü és Beállítások. A navigációs route-ok, szervezeti query paraméterek és üzleti logika változatlan.
- **Ellenőrzés:** AccountHub, mobil navigáció, dashboard settings és preference tesztek 11/11 PASS; érintett ESLint, typecheck, production build, docs-check és `git diff --check` PASS.
- **Korlát:** ebben a körben nem volt elérhető Browser/CUA, ezért a 375×812 / 812×375 / desktop light-dark renderelt mátrixot nem tudtam friss screenshotokkal igazolni.

## P1.4.3.5 — Anyagkezelő termékadatlap egységvezérlő (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** Az egységválasztó a Termékadatok szakasz fejlécének jobb felső műveleti zónájába került, így nem töri meg a termékűrlap függőleges ritmusát. A korábbi narancssárga, külön belső panel megszűnt; a vezérlő a megosztott üvegfelület könnyű, kompakt kontrolljaként jelenik meg. A „Felhasználó által megadott” provenance-jelvény eltűnt, mert nem segítette a termékadatlap elsődleges feladatát.

- A UI/UX Pro Max látható űrlapcímkéit, következetes mezőritmusát, legalább 44 px-es interakciós céljait, billentyűzetes fókuszát és mobil-first tördelését alkalmaztam. A `UI_SURFACE_GUIDELINES.md` szerint a page root és a pontozott vászon változatlan, a termékadatok egy koherens munkafelületben maradnak, a vezérlők pedig nem kaptak új, redundáns glass-kártyát.
- A beszállítói árak és variánsok külön funkcionális szakaszai, az archiválás, az egység-tiltás árhoz kötött feltétele és minden mentési/adatfolyam-logika változatlan maradt.
- **Ellenőrzés:** anyagűrlap célzott Vitest 3/3 PASS (1 fájl további 2 tesztet skipel), typecheck, érintett ESLint, production build, dokumentációs ellenőrzés és `git diff --check` PASS.
- **Korlát:** ebben a körben a Browser/CUA eszköz nem volt elérhető, ezért friss renderelt desktop/mobil és light/dark screenshot-QA nem készült; a CSS-t a meglévő responsive és accessibility cascade ellenőrzése után módosítottam.

## P1.4.3.4 — Anyag hozzáadása a tételek elé (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** Az „Anyag hozzáadása” szakasz a lista neve után, a Tételek előtt jelenik meg. A JSX/DOM-sorrend is ezt követi, így a vizuális és billentyűzetes munkafolyamat egy irányba halad. A belső szakaszszélek és elválasztók egységesebbek lettek; nem került be új külső panel vagy design token.

- A UI/UX Pro Max feladatsorrendre, vizuális hierarchiára, 44 px-es vezérlőkre és mobilon is követhető fókuszsorrendre vonatkozó elveit alkalmaztam. A `UI_SURFACE_GUIDELINES.md` közös munkafelület-, hairline-elválasztó- és átlátszó page-root szabályai megmaradtak.
- Az Anyag hozzáadása címe ugyanabba a szakaszcím-hierarchiába került, mint a Tételek; a névmező, hozzáadási űrlap, sorlista és összesítő egységes belső szélességen marad.
- **Ellenőrzés:** célzott Anyaglista tesztek 15/15 PASS; typecheck, érintett ESLint, production build, docs-check és `git diff --check` PASS.
- **Korlát:** a jelenlegi körben a Browser/CUA eszköz nem volt elérhető, ezért az új sorrendről friss renderelt screenshot-ellenőrzés nem készült; a DOM-sorrendet regressziós teszt rögzíti.

## P1.4.3.3 — Kézi ár státuszfelirat és sorritmus finomítása (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** A kézi egységár alól eltűnt a redundáns „Kézi ár” státuszfelirat és az üresen maradó meta-sáv is. A katalógus-, kézi felülírás-, mentett és hiányzó árak informatív státusza megmaradt, a katalógusválasztó „Kézi ár” lehetősége változatlanul elérhető.

- A UI/UX Pro Max látható címkékre, egységes mezőritmusra, 44 px-es érintési célokra és szemantikus állapotokra vonatkozó elveit alkalmaztam. A `UI_SURFACE_GUIDELINES.md` közös, visszafogott felületanyagát, finom elválasztóit, fókuszállapotát és mobilon feladatalapú tördelését megtartottam; új keret vagy design token nem került be.
- A kézi sorok most az egységár-vezérlő és a részösszeg azonos magasságához igazodnak, így a feliratok, mezők és boxok egyenletesebb függőleges ritmust adnak.
- **Ellenőrzés:** célzott Anyaglista Vitest 15/15 PASS; érintett ESLint és `git diff --check` PASS. A korábbi production build, typecheck és docs-check a közvetlen előző körben PASS volt; a jelenlegi egyetlen JSX-feltétel változására külön böngészős screenshot-kört nem futtattam, mert a Browser/CUA eszköz ebben a körben nem volt elérhető.

## P1.4.3.2 — Kézi ár alapja a részösszegnél (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** A Nettó/Bruttó választó kikerült az egységár mező alól, és kattintható dropdownként a kézi ár részösszege után jelenik meg. Az új és alap nélkül mentett kézi ár alapértéke Bruttó; korábbi, explicit Nettó választás megmarad. A dropdown a meglévő ár-alap mezőt menti, az összesítő címkéje követi a választást.

- A UI/UX Pro Max adatbeviteli és vizuális hierarchia útmutatásából kompakt, kapcsolódó mezőcsoportot, következetes 44 px-es vezérlőt és jól látható fókuszt alkalmaztam. A `UI_SURFACE_GUIDELINES.md` ismétlődő, finoman elválasztott sorait, kb. 8%-os theme-aware hover/focus felületét és átlátszó, megosztott hátterét követtem. A részösszeg oszlopa kiszélesedett, a dropdown nem nyúlik teljes sorra; a mobil sorok nem lógnak túl.
- **Böngésző:** `localhost:3000` Anyaglista. 1440×900 világos és sötét, 375×812 világos és sötét, valamint 812×375 világos elrendezést vizsgáltam. Vízszintes túlcsordulás nem volt. A dropdown Nettó/Bruttó átállítása módosította az összesítő alapjelölését; az érték változatlan maradt. Csak az ellenőrző böngésző ideiglenes kliensállapotát módosítottam; mentés nem történt, újratöltés visszaállította a mentett listát és a világos témát.
- **Ellenőrzés:** 2 célzott Vitest fájl, 15/15 PASS; TypeScript, érintett ESLint, production build, dokumentációs ellenőrzés és `git diff --check` PASS. A dashboard/settings baseline két hibája továbbra is reprodukálható: `dashboard-controls` a `Bekapcsolva` szöveget várja, a `premium-glass-background` pedig egy másik, módosított fájlban keresi a statikus pontminta mondatát. Ezek a jelen Anyaglista-difftől független tesztfájlok; tiszta HEAD összehasonlítás nem történt.
- **Korlát:** a jelenlegi modell a részösszeg számításakor mennyiség × egységár értéket használ, nem végez ÁFA-konverziót. A dropdown a mentett nettó/bruttó ár-alapot és címkét váltja, az összeget nem számítja át.

## P1.4.3.1 — Anyaglista vizuális igazítása (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** Az Anyaglista kompakt, külön fejlécet kapott, alatta az ajánlatszerkesztőhöz illeszkedő önálló munkafelülettel. A tételcímkék és eredetjelzések a megnevezésnél maradtak, az eltávolítás a sor végére került, az ármező és árforrás egymás mellé rendeződött, a részösszeg azonosított oszlopba került. Az „Anyag hozzáadása” a tételsorok után, új belső panel nélkül következik; az alsó mentési sor kompakt és nem sticky.

- A JSX/CSS megjelenítési átrendezésén túl az egységármező csak jelző CSS-osztályt kapott a katalógusválasztó jelenlétéhez, hogy a kézi ármező ne kapjon indokolatlanul háromoszlopos rácsot. Az ár-, beszállító-, revízió-, snapshot-, mentési és továbbviteli logika, valamint az Árajánlat-szerkesztő változatlan maradt.
- A UI/UX Pro Max adatbeviteli és professzionális SaaS-irányelveiből az oszlopigazítást, következetes mezőritmust, jól látható fókuszt, accessible mezőneveket és 44 px-es mobil műveleti célt alkalmaztam. A `UI_SURFACE_GUIDELINES.md` alapján az oldal háttere átlátszó marad, csak a fejléc és egy munkafelület kap egységes glass anyagot; a belső szakaszokat tipográfia és finom elválasztók tagolják, a sűrű desktop sorok mobilon feladatalapú mezőcsoportokra törnek.
- **Böngésző:** élő Anyaglista-oldal dark témában 1440×900 és light/dark témában 375×812 méretben megtekintve. 812×375 dark nézetben a rövid magasságú, görgetett oldalt tekintettem meg; a light 812×375 teljes vizuális ellenőrzése nem történt meg. A light desktop nézetet nagy böngészőablakban is ellenőriztem. A felület adatmezőibe nem írtam, mentést nem indítottam.
- **Célzott regresszió:** a Material Takeoffs 9 releváns tesztfájlja 49/49 PASS; a teljes Vitest 228 fájl / 1 640 teszt PASS, 8 fájl / 19 teszt skip, 2 teszt hibás (`dashboard-controls`, `premium-glass-background`). A két bukás más modulok módosított fájljait érinti; az Anyaglista-változtatás nem érinti ezeket. Tiszta HEAD-en külön baseline futtatás nem történt, ezért a hibákat nem tulajdonítom automatikusan korábbi állapotnak.
- **Egyéb ellenőrzés:** typecheck, érintett ESLint, production build, `node scripts/check-docs.mjs` és `git diff --check` PASS.

## P1.4.3 — Anyaglista-szerkesztő elrendezés (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** A szerkesztő fejlécének címe „Anyaglista”; a lista neve csak az elsődleges munkafelületen lévő szerkeszthető mezőben szerepel. A névmező, tételek, hozzáadás és rövid összesítő egyetlen Liquid Glass munkafelületet használ. A tételmezők stabil desktop Gridben felül igazodnak; a kézi ár alapja a státusszal egy sorban marad, az eltávolítás a megnevezés mellett kap helyet. A hozzáadási rész belső glass kerete megszűnt; a sorokat finom közös elválasztók tagolják. 700 px alatt külön mezőtördelés van a mobil nézethez.

- A JSX csak a szerkesztő megjelenítését rendezte át; az árforrás-, mentési, snapshot- és továbbviteli logikát nem módosítottam. Az inputok accessible nevei és validációs vezérlése megmaradt.
- **QA:** Anyaglista editor teszt 8/8 PASS; `npm run typecheck`, érintett ESLint, production build, `node scripts/check-docs.mjs` és `git diff --check` PASS. Teljes Vitest: 228 fájl PASS / 8 skip, 1 640 teszt PASS / 19 skip; 2, más meglévő módosításhoz tartozó teszt bukott (`dashboard-controls` és `premium-glass-background`).
- **Böngésző:** az élő szerkesztőt desktop, sötét témában ellenőriztem. A screenshoton a mezők egy sorba igazodnak, a kézi ár mezői kompaktak, a hozzáadás a fő munkafelület része. Mobil álló/fekvő nézet és világos téma külön vizuális ellenőrzése nem történt meg. A vizuális ellenőrzés közben az oldalon megjelent egy nem mentett névmező-módosítás; nem mentettem és nem küldtem be.

## P1.4.2 — Ajánlati fejléc, revíziók és dokumentummezők (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** A fejlécből eltűnt a piszkozatjelzés, az alcím és a korlátozási mikroszöveg; a PDF-előnézet a jobb oldali fejlécművelet. A verziókapcsolók az alsó mentési állapot mellé kerültek, csak a korábbi revíziókat mutatják, verziószám szerint növekvő sorrendben. A címzettadatokból kikerült a belső hivatkozás és a feltételmező, a megjegyzés mező rövidült. Az érvényesség hiányzó dátuma az aktuális dátumtól 30 budapesti naptári napra áll be; mentett dátum és történeti revízió változatlan.

- A régi `reference` és `terms` snapshot mezőket a UI nem szerkeszti, de a meglévő adatok megmaradnak a snapshotban; adatbázis- és pénzügyi szerződés nem változott.
- **QA:** célzott dokumentum és szerkesztőtesztek 17/17 PASS; teljes Vitest 228 fájl PASS / 8 skip, 1 638 teszt PASS / 19 skip; typecheck, érintett ESLint, production build, `node scripts/check-docs.mjs` és `git diff --check` PASS.
- **Böngésző:** a kapott friss képernyőképeket és a komponens elrendezését áttekintettem; a módosítás utáni élő böngésző/viewport ellenőrzés nincs lefuttatva.

## P1.4.1 — Árajánlat-szerkesztő UX finomítás (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** A szerkesztő fejléce kompakt, az ajánlatnév csak a szerkeszthető mezőben szerepel. A revízióválasztás az első mező alá került, az összegeket nem mutatja, így hiányos áraknál sem jelenik meg félrevezető `0 Ft`. A munkadíj-felmérés a tételfelvételnél kompakt gombból nyílik meg; az ellenőrzött felmérési mennyiséget és a meglévő explicit hozzáadási folyamatot használja. A címzett státusza üres állapotban eltűnik, a két forrásdisclosure közös, összecsukható „Felhasznált források” csoportba került. Mentés és munkanapló-kapcsolás egy alsó sorban van; a mentés az elsődleges művelet. A mennyiségek fölösleges záró nullái csak megjelenítéskor tűnnek el, a piszkozatérték változatlan.

- **Adatfolyam:** nem változott az ajánlati sorok mentése, a revízióválasztás, a PDF-előnézet, a munkanapló-kapcsolás, az árképzés vagy a forráspillanatképek.
- **QA:** célzott editor teszt 3/3 PASS; teljes Vitest 228 fájl PASS / 8 skip, 1 632 teszt PASS / 19 skip; typecheck, érintett ESLint, production build, `git diff --check` és `node scripts/check-docs.mjs` PASS.
- **Böngésző:** nem ellenőrizve. A helyi localhost URL-hez a számítógép-vezérlő korábban hozzáférést tiltott; Playwright nincs telepítve a projektben, böngésző QA plugin nem érhető el.
- **Korlát:** a szerkesztő vizuális viselkedését desktop és mobil böngészőben, világos és sötét témában még ellenőrizni kell. Nincs DB-módosítás vagy migráció.

## P1.4 — Egységes munkafolyamat és ajánlat UX (2026-11-05)

**Státusz: PASS WITH LIMITATIONS.** Az anyaglista szerkesztő a fő tartalmat helyezi előtérbe; a munkanapló-kapcsolat és az ajánlatindítás a mentési sáv mellé került. A munkanapló-választó megerősítő dialógusban nyílik. Az ajánlat anyaglista-CTA-ja megmutatja a mentett revíziót és tételszámot; az új piszkozat az adott revízióból készül, a hiányzó árak hiányzóként maradnak. A régi ajánlatpiszkozatok listája kikerült a szerkesztőből.

- Az ajánlatszerkesztő tétel-hozzáadásai a tételek előtt, a címzett és dokumentumadatok utánuk, a forrás-revíziók pedig összecsukható részekben jelennek meg. A mentett kalkulációból átvett mennyiségek szerkeszthető előnézeten mennek át; az átvétel megőrzi a kalkuláció forráskulcsát, árat nem állít be. Az ajánlat munkanapló-kapcsolata a mentési sávhoz került; mentetlen módosításkor tiltott.
- **QA:** teljes Vitest 227 fájl PASS / 8 skip, 1 629 teszt PASS / 19 skip; `npm run build` PASS; `npm run typecheck` PASS; módosított TypeScript-fájlok ESLintje PASS; `git diff --check` és `node scripts/check-docs.mjs` PASS. A teljes `npm run lint` 12 `no-undef` hibával elbukik a már munkafában lévő, nem a feladathoz tartozó `scripts/check-docs.mjs` fájlban.
- **Böngésző:** a helyi Brave felületen ellenőriztem a mentett anyaglista fő elrendezését, az ajánlatpiszkozat megerősítő dialógusát, a munkanapló-kapcsoló dialógust, az ajánlat tétel- és forrás-sorrendjét, valamint a kalkulációs import szerkeszthető előnézetét. A böngészőablak desktop sötét témájú volt; mobil és világos témájú mátrixot nem ellenőriztem.
- **Korlátok:** új adatbázis-séma vagy kalkuláció→anyaglista író nem készült; az alkalmazás meglévő szerződése csak az ajánlatban kínál közvetlen kalkulációs átvételt, az új ajánlat létrehozásakor kiválasztott mentett revízióból. pgTAP és élő adatbázis-integritási teszt nem futott, mert nem változott adatbázis-séma vagy RPC.

## P1.2.6 — végső geometriai, belépési és SVG ellenőrzés (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A korábbi DEMO-mentés azonosítása és rekordja nem állt rendelkezésre biztonságos, read-only ellenőrzéshez, ezért azt nem módosítottam. A P1.2.5.3 jelentés „új V2”-je a revízió számozását írja le; a geometry contractot nem rögzítette, ezért a DEMO eredeti és új revíziójának contractja abból utólag nem állapítható meg. Izolált teszt-fixture igazolja, hogy a verzió nélküli régi input `legacy-wall`-ként töltődik vissza; az új revízió is `legacy-wall` marad, a kliens és szerver eredménye egyezik, az eredeti input objektum változatlan. A 12×6 m, 35° nyeregtetőn a V2 vetület 72,00 m² és a ferde felület 87,90 m²; 500 mm ereszkiülés ezt nem növeli. A V1 500 mm ereszkiüléssel 84,00 m². Geometriai képlet nem változott.

- **Belépés:** a dashboard csempe és a Kalkulátorok navigációja ugyanazt az organization-paraméteres `/kalkulatorok` útvonalat nyitja meg; mindkettő a `ConstructionCalculatorSuite` egyetlen tetőforma-választóját használja. Friss munkánál forma → kézi/rajzi adatbevitel a sorrend; mentett revision és visszaállított draft a meglévő folytatási út marad. A jelenlegi munkafában a korábbi eltérés nem reprodukálható; a két út külön kalkulátormodulja megszűnt a közös suite használatával.
- **SVG:** a nyolc glyph külön tetősík-felületeket és éleket rajzol a meglévő TetőPro szürke/sárga, theme-tokenes és Liquid Glass kártyastílusában. Az azonosítók, címkék és alátétkorlátozások nem változtak. Nem került be új ikoncsomag.
- **QA:** célzott Vitest 114/114 PASS (négy fájl); teljes Vitest 226 fájl PASS / 8 skip, 1617 teszt PASS / 19 skip. TypeScript typecheck, érintett ESLint, Next production build, `git diff --check` és `node scripts/check-docs.mjs` PASS. A teljes Vitest két dashboard renderben nem boolean `priority` attribútum figyelmeztetést és egy JSDOM navigációs „Not implemented” üzenetet jelzett; teszt nem bukott.
- **Böngésző:** helyi Codex in-app browserben desktop light/dark nézet, dashboard belépés, forma → kézi, valamint forma → rajzi út ellenőrizve. A CUA böngésző viewport-emulációt és konzolnaplót nem adott, ezért a 1440×900, 375×812 és 812×375 mátrix, a böngészőkonzol és fizikai mobil nem igazolt.
- **Státusz:** V1/V2 `PASS WITH LIMITATIONS` (a konkrét korábbi DEMO revision contractja nem hozzáférhető; a fixture lefedi); navigáció `PASS WITH LIMITATIONS` (az útvonal egységes, de a teljes viewport/deep-link mátrix nem friss); SVG/UI `PASS WITH LIMITATIONS` (desktopon mindkét téma, mobilmátrix nyitva). A `calculation_revisions_immutable` DB trigger és meglévő pgTAP negatív teszt az immutable output tárolási szerződést védi; DB tesztet ebben a körben nem futtattam.

## P1.2.1: Automatikus alapanyag-kiválasztás és professzionális anyagmezők (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A P1.1 biztonságos automatikus kiválasztása változatlanul csak pontosan egy aktív, teljes és `verified` alapértelmezett variánst fogad el. A kalkulátor anyagmezője most egyetlen kompakt forrás-sort használ: termékválasztó vagy kézi mód, mellette közvetlenül szerkeszthető műszaki értékek. A korábbi szegmenses módválasztó, kategóriaszűrő, ismételt összefoglaló és az „Érték felülírása” disclosure megszűnt. A felülírás és a termékadat-visszaállítás eredete továbbra is látható; ár nem jelenik meg.

- A HAP szöveges mezője, mértékegysége és mérési magyarázata megmaradt, de a külön HAP segédpanel és ábra kikerült. A szelemenmérési ábra változatlan.
- Vizuális döntés: a meglévő TetőPro tokenek, tipográfia és térköz maradt, mert ez folytatja a műhely vizuális nyelvét. Egyetlen `fieldset` fogja össze a terméket és az értékeket; nem készült új kártyaréteg vagy dekoratív glass elem. Sűrűség, ritmus és animáció: 1 / 1 / 1.
- TDD bizonyíték: a disclosure és HAP-ábra eltávolítását előbb két bukó teszt jelezte, majd a célzott suite **38/38 PASS**, a szélesebb érintett csomag **114/114 PASS** lett. Teljes regresszió: **Vitest 226 fájl / 1601 PASS, 8 fájl / 19 skip**; `npm run typecheck`, az érintett ESLint-futtatás, `git diff --check` és a Next.js production build PASS.
- Élő böngészős QA: termékválasztás, közvetlen 20 cm -> 22 cm felülírás, 20 cm-re visszaállítás, kézi mód és visszakapcsolás működött. A HAP mező megjelent, a „HAP mérési segédlet” nem. A 1440×900, 375×812 és 812×375 nézetet világos és sötét témában ellenőriztem; konzolhiba és látható vízszintes túlcsordulás nem jelent meg.

**Korlát:** a műhely három kompatibilis induló terméke `user_provided`, nem `verified`, ezért helyesen nem töltődik be automatikusan. A Lindab variáns a fix használható hossz hiánya miatt nem kompatibilis a jelenlegi fedésmodellel. Ezeket a rekordokat a feladat nem minősítette át és nem egészítette ki feltételezett adattal.

## P1.2/A — Valós induló anyagkatalógus (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A meglévő, `00000000-0000-4000-8000-000000000010` lokális műhely Anyagkezelőjében létrejött négy aktív, forrásolt `user_provided` termék/variáns: 75×200×5000 mm szarufa, 30×50×4000 mm tetőléc, Dörken DELTA-VENT S PLUS 1,5×50 m alátétfólia és Lindab LTP20 Classic 0,5 mm trapézlemez. Mind a nyolc meglévő kategória már rendelkezésre állt; új kategória és migráció nem készült. A részletes kutatási dokumentum: [MATERIAL_STARTER_CATALOG_RESEARCH.md](MATERIAL_STARTER_CATALOG_RESEARCH.md).

- Az Anyagkezelőbe csak bizonyítható mezők kerültek: méret, hossz, tekercsméret, fedő-/tényleges szélesség, forrás, dátum és ahol összehasonlítható volt, HUF bruttó referenciaár.
- Rögzített árak: szarufa **16 673 Ft/db bruttó** (2026-02-05), tetőléc **1 300 Ft/szál bruttó** (4 fm, 2026-11-04). A fólia ára nem volt megbízhatóan igazolható; a Lindab árforrás nettó/bruttó alapja nem volt egyértelmű, ezért egyik sem került be.
- Egyik rekord sem lett automatikusan `verified` vagy minden szervezet számára alapértelmezett. A szarufa statikai osztálya, a tetőléc léctávolsága, a fólia átfedései és a lemez fix használható hossza hiányzó/munka- vagy rendszerfüggő adat maradt.
- A Lindab LTP20 nem kapott P1.1 default-jelölést, mert a jelenlegi fedésmodell fix használható hosszt igényel, a termék pedig rendelhető hosszú.
- A P1.1/P1.1.1 kód- és ár-izoláció változatlan; kalkulátorban ár nem jelenik meg. Szervezeti jóváhagyás után a megfelelő rekordok külön `verified`/default döntéssel tehetők előtöltésre.

## P1.1.1 — Anyagkezelő-integráció stabilizálása és immutable revíziók (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A mentett kalkuláció most nem olvassa vissza csendben az aktuális katalógusértékeket: az output-specifikáció snapshotjából historikus `MaterialProfile` épül vissza. Archivált vagy közben módosult termék esetén a mentett érték és az eredet látható, szerkeszthető marad, és új revízió mentésekor a szerveroldali fallback is ezt a snapshotot részesíti előnyben. Az Anyagkezelő meglévő aktív-szűrése, szervezeti hatóköre, `created_by`-ellenőrzése és RLS-szerződése nem változott; fizikai törléshez új viselkedést nem vezettem be, a jelenlegi archive/restore életciklust használtam.

- Élő böngészős QA: archivált P1.1 DEMO-termékből mentett V1 újranyitásakor a `P1.1 QA – szarufa 80×200` historikus érték, az „eredeti termék már nem érhető el” jelzés és a 80×200 mm keresztmetszet megjelent; nem történt csendes termékcsere. A dashboardon lévő `ThemeToggle` sötét/világos váltása működött, a kalkulátorban nem volt vízszintes túlcsordulás és alkalmazáshiba.
- Célzott TDD: a historikus snapshot-helper és a szerveroldali újrevizió-fallback előbb piros teszttel, majd zöld teszttel készült. Fókuszált suite: **38/38 PASS**.
- Teljes regresszió: **Vitest 226 fájl, 1601 PASS, 8 fájl / 19 teszt skip**; `npm run typecheck` PASS; érintett ESLint PASS; `git diff --check` PASS. A teljes tesztkimenetben csak meglévő React `priority` attribútum- és JSDOM navigációs figyelmeztetések maradtak.
- Lokális Supabase integráció: **2/2 PASS** a meglévő F9.22 konkurens product/material-list revízió-serializációs tesztben, escalated Docker-hozzáféréssel. Ez nem külön P1.1 cross-tenant negatív teszt; új RLS/policy/migráció nem készült.
- Dokumentációs index-ellenőrzés továbbra is hét, ettől a feladattól független rajzos fájl hiányzó indexbejegyzése miatt jelez hibát.

**Korlát:** külön teljes böngészős T1-flowt nem futtattam úgy, hogy egy mentett terméket élőben módosítok, majd ugyanazt a revíziót újranyitom; ezt domain- és server-save tesztek fedik. A lapozva betöltött régebbi revíziók külön élő ellenőrzése sem történt meg. A lokális DB teszt saját DEMO fixture-ei nem kerültek külön takarításra.

## P1.1 — Anyagkezelő-alapú intelligens kalkulátor-előkitöltés (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A meglévő Anyagkezelő → `MaterialProfile` adapter kapott explicit, variánsszintű `roof_calculator_default_group` jelölést. Új kalkulációnál csoportonként csak pontosan egy, teljes műszaki adatsorú és `verified` jelölt választódik ki automatikusan. Több jelölt, hiányos adat, DEMO vagy gyengébb provenance esetén nincs katalógussorrend-, „első találat”- vagy időbélyeg-alapú választás; a meglévő kereshető választó marad üresen.

- Nincs új adattábla, RLS/RPC, árkezelés, anyagszett-modul vagy kalkulátorkártya. A beállítás az Anyagkezelő meglévő variánsűrlapjának „Műszaki adatok” disclosure-jában érhető el.
- Automatikusan használható termékadat: fedés névleges/hasznos szélessége és fizikai/használható hossza; fólia tekercsszélessége és -hossza; szarufa/léc teljes keresztmetszetpárja.
- A faanyag tengely-/sortávolsága és a többi munkaspecifikus adat nem része az automatikus kiválasztási kapunak. A kalkulátorban átvett érték továbbra is szerkeszthető munkapéldány; a visszaállítás és provenance a meglévő `resolveMaterialSpec`/`overriddenKeys` szerződést használja.
- A kalkulátor UI csak az „Automatikusan előtöltve” eredetjelzést kapta a meglévő anyagpanelen. Ár továbbra sem kerül a profiladatok közé.
- Nem történt automatikus tenant-adatfeltöltés és nem készült forrás nélküli „valódi” termék. Emiatt a funkció éles előkitöltése csak a műhelyben már meglévő, forrásolt és `verified` variánssal aktiválódik.
- Célzott TDD: a tesztek előbb hiányzó helper/default mapping miatt buktak, majd 3 fájl / 49 teszt PASS. Lefedett: egyértelmű jelölt, többes jelölés, hiányos/gyengébb provenance, üres katalógus, invalid default-csoport, szerkeszthető UI, ár hiánya.
- Teljes regresszió: Vitest 226 fájl / 1599 PASS (8 fájl / 19 teszt skip), `npm run typecheck` PASS, az érintett fájlok ESLintje PASS, célzott `git diff --check` PASS. A dokumentációs leltár a P1.1-től független, már jelen lévő hét rajzos fájl indexhiányán bukik.
- Élő DEMO: izolált, ár nélküli, `verified` 80×200 mm szarufa-variáns → Faanyag bekapcsolásakor automatikus kiválasztás és provenance-jelzés; 220 mm kézi felülírás → `Felülírva`; termékadat-visszaállítás és ki-/visszakapcsolás → 200 mm. A 90 cm-es munkaspecifikus tengelytávolság kézzel maradt, a V1 mentés visszanyitás után megőrizte a terméket, a 80×200 mm-t és a 90 cm-t. Az ár nem jelent meg a kalkulátor anyagpaneljén.
- Reszponzív böngészős QA: 1440×900, 375×812 és 812×375, mindháromban 0 px vízszintes túlcsordulás; a mobil álló és fekvő nézetben a választó, provenance és visszaállítási felület olvasható maradt. A helyi QA-terméket az ellenőrzés végén archiváltam; a mentett `P1.1 QA – automatikus szarufa` V1 revízió izolált DEMO-bizonyítékként megmaradt.

**Korlát:** a világos témát ellenőriztem, de az alkalmazás jelenlegi felületén a meglévő `ThemeToggle` nincs renderelve, a böngészővezérlő pedig nem ad színséma-emulációt, ezért a sötét téma külön élő bizonyítást igényel. A mentett output-spec snapshot immutable marad, de azt nem bizonyítottam külön, hogy egy később módosított/archivált katalógustermék mellett az újranyitott szerkesztő minden mezőben kizárólag a régi input-snapshotot mutatja. Referenciaár- és mintatermék-kutatás nem történt, mert ellenőrizetlen vagy automatikusan tenantba írt terméket nem hoztunk létre.

## Tetős kalkulátor UI/UX-helyreállítás — végleges egyetlen belépő (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A normál Tetők és faszerkezetek kategóriában a `roof.material-takeoff` az egyetlen látható kalkulátor. A bal oldali tetős lista, az elsődleges/további eszközök kártyái, a kereső és a mobil kalkulátorválasztó megszűnt. A munkaterület teljes szélességű; a fő cím „Tetőanyag-kimutatás”, utána a tetőforma az első döntés. A meglévő tetőforma-ábrákat és számítási komponenseket megőriztem, a világos téma glyph-színe kontrasztosabb. A módválasztó szövege és a kiválasztott forma jelzése rövidebb, a keskeny mobil kategóriafülek két sorba rendeződnek.

Az új tetős útvonal a kimutatást nyitja meg; a korábban megjegyzett speciális kalkulátor nem írja felül a közvetlen URL-t. A régi `roof.timber-cutlist`, `roof.rafter-cut` és `roof.truss-members` azonosítók, motorok, mentések és revíziók megmaradtak. A PDF-feliratból a tetőgeometriába történő gyors átvitelnél a falméretet említő felirat külön szakmai jóváhagyást kér; a meglévő egység-, szakasz-, felülírás-, forrás- és mentési kapuk változatlanok.

**Automatizált bizonyíték:** teljes Vitest 226 fájl / 1597 PASS (8 fájl, 19 teszt skip), `npm run typecheck` PASS, érintett ESLint PASS, `git diff --check` PASS. Az új célzott teszt védi az egyetlen tetős belépőt, a régi útvonalat és a falméret megerősítését.

**Élő böngészős QA:** 1440×900, 375×812 és 812×375 nézetet sötét és világos témában is ellenőriztem a fő belépőn és a rajzos munkaterületen; a vizsgált nézetekben nem volt vízszintes túlcsordulás. Kézi DEMO: nyeregtető, 1000×600 cm, 35°, 0 cm ereszkiülés → 73,25 m²; kézi fóliaadatokkal 6 csík, 90 m² és 2 tekercs, aktív mentési gomb. Rajzos DEMO: kétoldalas szintetikus PDF; 1. oldali források és fedett tetőszakasz jóváhagyása, két falméret külön megerősítése, egység és 1. oldali provenance, 2. oldali alaprajz külön kezelése, felülírás jóváhagyása → 85,45 m²; fóliával 6 csík, 90 m², 2 tekercs, aktív mentési gomb. Régi szarufa deep link, mentett faanyag-vágáslista visszanyitása, lépcső/beton fülek és böngésző vissza/előre működtek. A DEMO-kat nem mentettem tartós rekordként.

**Korlát:** nem ellenőriztem minden munkafolyamat-állapotot mind a hat téma/viewport kombinációban, fizikai mobilon és production buildben. A PDF-felirat jóváhagyása emberi szakmai ellenőrzés, nem automatikus felismerési bizonyíték; az OCR műszaki kapu továbbra is BLOCKED.

## P0.2 — Tetőforma-alapú, fokozatos geometriai adatbevitel (2026-11-04)

**Státusz: PASS célzott ellenőrzéssel.** A P0.1 tetőforma-first belépő folytatásaként a központi `roof.material-takeoff` kézi útja most csak a választott formához tartozó alapgeometriát kéri. A forma kiválasztása után megjelenik a következő hiányzó adat; a material-paraméterek és az anyagcsoport részletei csak a minimális geometria érvényessége után nyílnak meg.

### Biztonsági szerződés

- A gable/shed ereszkiülés új munkamenetben üresen indul; a felhasználó által beírt `0` külön, érvényes érték.
- A meglévő `isFieldVisible`, `fieldContractIssues`, rajzi provenance és mentési kapuk megmaradtak.
- Tetőforma-váltáskor a nem releváns mezők értékei nem kerülnek át a következő formába.
- Nem készült új wizard, material-profil, OCR/AI, adatbázis-módosítás vagy számítási motor.

### Ellenőrzési bizonyíték

- Célzott Vitest: `construction-suite-drawing-entry.test.tsx` + `construction-computation.test.ts` — **70/70 PASS**.
- Élő böngészős DEMO-flow: forma → kézi mód → 4 kötelező nyereggeometriai mező (`hossz`, `szélesség`, `hajlás`, `ereszkiülés`) → geometriai eredmény; a konzolban nem volt warning/error.
- A DEMO-flow minimális útja **6 felhasználói művelet**: 1 kalkulátor kiválasztás már alapállapotban aktív, 1 forma, 1 beviteli mód, 4 mezőkitöltés. A geometriai eredmény a 4. mező után megjelent; anyagprofil-paraméter nem előzte meg.
- Vizsgált böngészőnézet: 1280×720 élő IAB nézet. A kért 375×812, 812×375 és 1440×900 pontos viewport-átállítást a jelenlegi CUA/IAB vezérlő nem tette elérhetővé; a reszponzív CSS-t ezért nem tekintem teljesen bizonyítottnak.

### Ismert korlátok

- A P0.3 szerinti valódi anyagcsoport-gating külön feladat maradt.
- Nem futott teljes `npm test`, production build vagy fizikai mobilteszt.

## P0.3 — Intelligens anyagcsoport-választás és minimális anyagadat-bekérés (2026-11-04)

**Státusz: PASS WITH LIMITATIONS.** A P0.2 után a valid geometria nem kényszerít anyagcsoport-választásra, hanem külön, egy helyen kezelt `requested` választót ad. A geometriai eredmény anyagcsoport nélkül látható; a mentés a meglévő szerződés szerint továbbra is tiltott, mert a teljes mentett anyagkimutatásnak legalább egy kért és teljes anyagcsoportot, valamint specifikációs snapshotot kell tartalmaznia.

### Megvalósítás

- A `RoofMaterialInputs` választója „Mit szeretnél még kiszámolni?” címmel jelenik meg valid geometria után.
- Fólia, faanyag/léc és fedés többesével kérhető; csak a bekapcsolt csoport saját profil- és kézi paraméterei renderelődnek.
- Csoport kikapcsolásakor a `requested` érték változik, a `specs` és `layout` nem törlődik; visszakapcsoláskor a korábbi, továbbra is érvényes adat visszatér.
- A meglévő profil-, provenance-, DEMO-jelölés-, átvétel- és snapshot-modell változatlan maradt.
- A `timber` csoport jelenleg közösen aktiválja a szarufa- és léckiosztást. Külön kapcsoló UI nélkül a domain-szerződés nem lett félrevezetően megkerülve; a szarufa/léc szétválasztása P1.1 utáni külön feladat.

### Ellenőrzési bizonyíték

- Célzott Vitest: `construction-suite-drawing-entry.test.tsx` + `construction-computation.test.ts` — **76/76 PASS**.
- A tesztek külön fedik a geometry-only, fólia-only, timber-only, fedés-only, többes kiválasztás, ki-/visszakapcsolás és geometry-only mentési kapu viselkedést.
- Korábbi profilátviteli tesztek megőrzik, hogy az átvétel nem módosítja a `requested` állapotot.
- Élő DEMO-mérés, az alapállapotban már kiválasztott tetőanyag-kimutatással: csak geometria **6 művelet / 4 geometriai adat**; fólia-only DEMO-profillal **10 művelet / 0 kézi numerikus anyagadat** (anyagcsoport-kapcsoló, profil, fektetési irány); teljes, profilokat újrahasználó kimutatás **19 művelet / 6 kézi adat** (4 geometriai adat, 1 faanyag-kiosztási adat, 1 fektetési irány), plusz 4 profilválasztás.
- Élő böngészőben ellenőrizve: geometry-only, fólia-only, többes kapcsolás, ki-/visszakapcsolt kézi érték megőrzése és teljes DEMO-profilos eredmény; a konzolban nem volt warning/error.
- A módosítás nem érint adatbázist, RLS/RPC-t, PDF-formátumot, OCR-t, kalkulátormotort vagy új profil-tárolót.

### Szakmai pontosítás

A prompt szerinti „csak geometria” nem jelent új mentési szerződést: a jelenlegi output-validátor ezt nem tekinti újrahasználható, teljes anyagkimutatásnak. Ezért a UI a geometriát megmutatja, de a mentési kaput nem lazítja fel. A külön szarufa/léc-kapcsoló szintén szándékosan kimaradt, mert a motor most egy közös `timber` kérést kezel.

### Ismert korlátok

- A három kért pontos böngésző-viewport (`375×812`, `812×375`, `1440×900`) beállítása a jelenlegi IAB/CUA vezérlőben nem volt elérhető; reszponzív QA ezért csak a meglévő teszt- és élő desktopnézetre támaszkodik.
- Nem futott teljes `npm test`, production build vagy fizikai mobilteszt.

## A3 — Tetőszakasz-hatókör kiterjesztése a faanyag-vágáslistára (2026-11-04)

**Státusz: PASS.** A fedettségi kapu, a szakaszkezelés, a v3 munkamenet-export/import és az A1 helyi megőrzés mostantól a `roof.timber-cutlist`-en is él. **Nincs séma-, RLS-, RPC-, provenance- és képletváltozás**; új munkamenet-verzió sem keletkezett.

### Mit vizsgáltam a kiterjesztés előtt

A feladat nem azt kérte, hogy mind a négy tetőkalkulátor kapja meg — hanem hogy **ellenőrizzem a valódi képességeket**. A mezősémák összevetése döntött:

| Kalkulátor | Mezők | Szakasz-hatókör |
|---|---|---|
| `roof.material-takeoff` | 23 kulcs (tetőforma, méretek, kiülések…) | eddig is |
| `roof.timber-cutlist` | **ugyanaz a 23 kulcs** | **most** |
| `roof.rafter-cut` | 12 kulcs: fél fesztáv, gerincemelkedés — nincs tetőforma, nincs felület | nem |
| `roof.truss-members` | 3 kulcs: `spanMm`, `riseMm`, `panelCountPerHalf` | nem |

A `material-takeoff` és a `timber-cutlist` **azonos mezősémájú**, és mindkettő a tető vízszintes geometriájából számol mennyiséget, ezért értelmes megkérdezni, melyik fedett tetőrészről van szó. Egyetlen szarufánál és egyetlen rácsos tartónál a „fedett tetőrész" és a „teljes tetőt lefedi" állítás nem jelentene semmit — ott a kapu üres szertartás lenne. Ezek továbbra is kapnak rajzpanelt, kalibrációt és koppintásos átvitelt.

### A megoldás

Egy közös szerződés (`supportsRoofSectionScope`, `drawing-field-transfer.ts`), hogy a panel és a mentési kapu ne csúszhasson szét. Négy helyen váltotta ki a bedrótozott `"roof.material-takeoff"` összehasonlítást:

- `plan-field-transfer.tsx`: a `takeoffScopeActive` kapu, az **első szakasz létrehozása** fájlmegnyitáskor, és a szakaszok bemenet-ellenőrzése.
- `construction-suite.tsx`: a `takeoffDrawingScope` (vezetett bevitel, alapérték-kapuk) és a `saveScope` (mentési kapu).

**Kiterjesztés:** a v3 payload ugyanazon a 3-as verzión belül hordozza a `roof.material-takeoff` vagy `roof.timber-cutlist` kalkulátorazonosítót; a régi material fájlok változatlanul betölthetők. A munkafájl csak az azonos kalkulátortípusban tölthető be.

Az A1 rekordazonosság a régi material kulcsot megtartja, a timber kulcsa kalkulátor-specifikus. Így ugyanazon PDF két kalkulátora nem írhatja felül egymást; a hiányzó régi rekordmező materialként olvasódik.

### Futott ellenőrzések

- **Célzott Vitest:** `calculators` + `calculations` — 39 fájl / **429 teszt PASS** (1 skip). Új: 4 eset a szerződésre (`drawing-field-transfer.test.ts`, köztük egy, amely **a két mezőséma azonosságát** is ellenőrzi, hogy a döntés alapja ne romolhasson el észrevétlenül), és 2 suite-szintű eset (`construction-suite-drawing-entry.test.tsx`): a vágáslista megkapja a szakaszkezelést és a P3.5.1 igazolatlan checkboxot; a szarufa-kiszabás rajzpanelt kap, szakaszkezelést nem.
- **`npx tsc --noEmit` PASS**, ESLint PASS. Meglévő teszt nem igényelt módosítást.
- **Élő böngészős QA** (375×812, hitelesített munkamenet, valódi DEMO rajz):
  - `roof.timber-cutlist`: szakaszsáv és „Fedett tetőrész" lépés megjelent, a fedettség kiválasztása után a megerősítő checkbox **üresen** látszik, a chip „Tetőszakasz 1 · **fedett, nem igazolt**" — a P3.5.1 viselkedés pontosan reprodukálódik.
  - `roof.rafter-cut`: a rajz betöltve, 25 felirat-koppintási cél és a kalibráció elérhető, de **nincs szakaszsáv és nincs fedettségi lépés**.

### Ismert korlátok

- A `DRAWING_WORKFLOW_REDESIGN_PLAN.md` A.3 képesség-táblázata 2026-10-31-i állapot, és ezt a sort már nem tükrözi (történeti audit, nem frissítettem).
- Nem futott: teljes `npm test`, production build, fizikai telefonteszt.

## B5 — A forráslista létrehozói szűrőjének regressziós védelme (2026-11-04)

**Státusz: PASS.** Az „Adatok átvétele" forráslistát eddig egyetlen, teszttel nem őrzött alkalmazásszintű szűrő tartotta a saját munkákra. **Nincs kódváltozás a terméklogikában** — se séma, se RLS, se RPC, se alkalmazásviselkedés; a kör kizárólag bizonyítékot és kaput adott hozzá.

### A kockázat mostantól bizonyított tény, nem feltételezés

A `CLAUDE_HANDOFF.md` eddig prózában állította, hogy az izolációt a `created_by` adja, nem az RLS. Az új `066_transfer_source_creator_scope.sql` ezt **méréssel igazolja** (6/6 PASS, valódi helyi DB):

- linkelés **előtt** a másik szervezeti tag nem látja sem a kalkulációt, sem a revíziót;
- a létrehozó a saját revízióját munkanaplóhoz kapcsolja (támogatott művelet);
- linkelés **után** a másik tag **olvassa** a kalkulációt és a revíziót is, és a látott sor `created_by`-ja bizonyítottan a MÁSIK felhasználó.

Ezt a `calculations_linked_member_read` / `calculation_revisions_linked_member_read` policy (20261025110000) okozza: `construction.%` kalkulációra aktív munkanapló-link mellett **minden szervezeti tagnak** ad olvasást, a létrehozótól függetlenül.

### A valódi rés: a védtelen ikerfüggvény

A `listRoofShapeTransferSources`-nak volt izolációs tesztje, a **`listRafterCutTransferSources`-nak viszont egyetlen teszt sem** — pedig ugyanazt a `created_by` szűrőt viseli és ugyanaz a kockázat terheli. Ez a kör öt esettel fedi le (saját forrás felajánlva; kolléga kalkulációja nem; projekthez kötött nem; idegen szervezet nem; hatókörön kívül `ok: false`). A meglévő roof-shape eset pedig megnevezi a tényleges fenyegetést, nem csak a mechanikát.

### A kapu bizonyítottan fog — mutációs próba

A szűrőt **ideiglenesen eltávolítottam mindkét függvényből**, és pontosan a két megnevezett B5 teszt bukott el (2 failed / 18 passed); visszaállítás után 20/20 PASS. A forrásfájl a kör végén bájtra azonos a kiindulással.

### Futott ellenőrzések

- **pgTAP:** új `066_transfer_source_creator_scope.sql` **6/6 PASS**; a teljes csomag 68 fájl / 1391 teszt. Változatlanul bukik a `046` 9. esete (meglévő tesztizolációs hiba: `project_id is null` listák globális, fixture-szűrés nélküli számlálása korábbi munkamenetek adatain) — nem e kör következménye.
- **Célzott Vitest:** `calculations` + `calculators` — 39 fájl / **423 teszt PASS** (1 skip); ebből `construction-data.test.ts` 20/20.
- **`npx tsc --noEmit` PASS**, ESLint PASS.

### Ismert korlátok

- A védelem továbbra is **alkalmazásszintű**: a `created_by` szűrő eltávolítása adatfelfedést okozna, és ezt most már teszt fogja — de az RLS önmagában nem szűkít létrehozóra. A szűkebb policy külön termékdöntés.
- A `066` teszt a mai policy-viselkedést rögzíti. Ha egyszer azzal bukik el, hogy az idegen tag **már nem** látja a linkelt sort, az jó hír: akkor az RLS szűkült, és a tesztet felül kell vizsgálni.
- Nem futott: teljes `npm test`, production build.

## A1 — A rajzos munkamenet helyi megőrzése és visszaállítása (2026-11-04)

**Státusz: PASS.** A rajzos munka túléli az oldalfrissítést: engedélyhez kötött, IndexedDB-alapú megőrzés a meglévő v3 munkamenet-sémával, a tervrajz bájtjai nélkül. **Nincs séma-, RLS-, RPC-, provenance- és képletváltozás**; szerveroldali tárolás nem keletkezett. Terv: [`DRAWING_SESSION_PERSISTENCE_DESIGN.md`](DRAWING_SESSION_PERSISTENCE_DESIGN.md) v0.2.0.

### Architektúra — miért kicsi

- A **formátumot nem duplikáltuk**: a tár ugyanazt a v3 JSON-t írja, amit a kézi „Munkaállapot mentése" exportál (`createRoofWorkSessionJson`), és ugyanazon a `parseRoofWorkSessionJson`-on olvassa vissza. A `drawing-roof-work-session.ts` **nem változott**. A payload összeállítása egy helyre került (`buildWorkSessionJson`), így az export és a megőrzés bizonyítottan azonos.
- A **döntések tárolástól függetlenek** (`drawing-session-retention.ts`): lejárat, tulajdonosszűrés, `seq`-ütközés, „mikor mentünk egyáltalán". Így IndexedDB nélkül is maradéktalanul tesztelhetők — nem vettünk fel teszteszköz-függőséget.
- Az **adapter nem dönt** (`roof-work-session-store.ts`): egyetlen object store, nem általános keretrendszer. Az olvasás-ellenőrzés-írás egyetlen `readwrite` tranzakcióban fut.
- Az **engedély beállítás**, ezért `localStorage`-ba került a többi preferencia mellé; a **tartalom** IndexedDB-be. A precedens (tartalom sosem localStorage-ba) sértetlen.

### A három elfogadási feltétel

1. **Adatvesztés elleni védelem.** A mentés feltétele `enabled && betöltött forrás && legalább egy szakasz`, ezért a **felajánlás megjelenése önmagában nem ír** — élőben igazolva: a felajánlás kirajzolódott, és a tárolt `seq` két másodperc után is **2** maradt. Több fül: monoton `seq`, a tárolt rekord frissebb sorszámánál az írás elmarad. Élőben: egy „másik fül" 7-re vitte, ez a fül (bázis 2) próbált menteni — a rekord **érintetlen maradt** (`seq 7`, régi név), a felhasználó pedig egyértelmű hibaüzenetet kapott.
2. **Szakmai biztonság.** A visszaállítás a fájlimporttal **azonos kapun** megy be (`applyWorkSession`). SHA-256-egyezés előtt a forráshoz kötött bizonyíték nem él: élőben a visszaállítás után „Válaszd ki az eredeti rajzot a kijelölésekhez", vászon nélkül. Egyezés után „A rajz egyezik (SHA-256); a kijelölések újra láthatók" — de a szakasz **„tisztázandó"** állapotba került, vagyis a tárolt `coverageConfirmed: true` ellenére a **P3.5.1 fedettségi megerősítést újra kell adni**.
3. **Használhatóság.** A mentés 1,2 s tétlenség után fut, a JSON csak ekkor épül fel — a rajzon végzett munkát nem lassítja. Az állapot sosem néma: `saving` / `saved · időpont` / `blocked` / `quota` / `conflict`, a hibák a **meglévő** `.plan-alert-line is-error` elemen, a kiút pedig mindig a kézi „Munkaállapot mentése". A felajánlás szövege kimondja, hogy a tervrajzot újra ki kell választani.

### Futott ellenőrzések

- **Célzott Vitest:** `calculators` + `calculations` + `preferences` — 43 fájl / **431 teszt PASS** (1 skip). Új: `drawing-session-retention.test.ts` **14 teszt** (rekordazonosság, 7 napos inaktivitási lejárat, izoláció törlés nélkül, `seq`-ütközés, mentési feltétel), `drawing-session-store-wiring.test.tsx` **7 teszt** (engedély nélkül semmi, tulajdonos nélkül semmi, a felajánlás nem ír, „Eldobom", visszaállítás `pending` kapuval és `coverageConfirmed: false`, kikapcsolás törlése).
- **`npx tsc --noEmit` PASS**, ESLint a három érintett könyvtáron PASS.
- **Élő böngészős QA** (375×812, hitelesített munkamenet, valódi P3.1 DEMO rajz, valódi IndexedDB):
  - A tárolt rekord **1386 bájt**, `hasPdfBytes: false`, kulcsa `userId:organizationId:sha256`.
  - Munkavégzésre a `seq` 1 → 2 nőtt, a szakasznév perzisztált.
  - **Oldalfrissítés után** a felajánlás megjelent (`a1-demo.pdf · 1 szakasz · nov. 4. 04:15`).
  - **Lejárat és izoláció** egy menetben: 8 napos rekord **törlődött**, az idegen felhasználóé **megmaradt, de nem jelent meg**, a sajátja felajánlva — pontosan egy ajánlat.
  - A kikapcsolás ürítette a tárat (0 rekord) és visszaállította az engedélykérést.

### Ismert korlátok

- **Az IndexedDB-adaptert unit teszt nem fedi** (nincs IDB a jsdom-ban, és nem vettünk fel függőséget): a bizonyíték az élő böngészős QA. A döntéslogika viszont teljesen tesztelt.
- Az IndexedDB nem titkosított, és fiókváltáskor **szándékosan nem törlünk** — a tárolt metaadat (szakasznevek, méretek) eszközhozzáféréssel olvasható. Ellensúly: nincs rajzbájt, 7 napos lejárat, eszközszintű törlés.
- A mentési jelzés a `signature`-re épül (szakasz-metaadat + lépték + az aktív szakasz adata); egy nem aktív szakasz háttérbeli módosulása csak a következő jelzésváltozáskor íródik ki.
- Nem futott: teljes `npm test`, production build, fizikai telefonteszt, valódi második böngészőfül (a konfliktust a tárban szimuláltuk).

## P3.7 — Adatbeviteli mód a kalkulátor kiválasztása után (2026-11-04)

**Státusz: PASS.** A két felső belépési gomb („Kalkulátort választok" / „Rajzból indítok") megszűnt. A szakember előbb a szakmai feladatot választja, majd a kalkulátor munkaterületén egyetlen kérdésre válaszol: tervrajzból vagy kézzel. **Nincs séma-, RLS-, RPC-, provenance- és képletváltozás**; új adatbeviteli logika sem keletkezett.

### A korábbi két útvonal valódi működése

A `entry` állapot (`"calculator" | "drawing"`) nem csak megjelenítést vezérelt: a „Rajzból indítok" **kalkulátort is váltott** (`setCategory("roof")` + `setSelectedId("roof.material-takeoff")`), átrendezte a layoutot (`is-drawing-first`), átírta a lista feliratát („Mit szeretnél kiszámítani?"), és nyitotta a rajzpanelt (`openPanel`). Így ugyanahhoz a munkához két párhuzamos belépés létezett, és a rajzos út a feladatválasztást a felhasználó helyett döntötte el.

### A választott megoldás

- `entry` helyett **kalkulátoronkénti** `inputModeByCalculator` (`"drawing" | "manual"`), mert a mezők is kalkulátoronként izoláltak (S2). A mód **levezetett**, nem duplikált állapot:
  - nem `roof` kategória → `"manual"` (nincs módválasztó; lépcső és betonozás változatlan),
  - kifejezett választás → az győz,
  - különben nyitott rajznál `"drawing"` (T10/S4: a dokumentumállapot túléli a kalkulátorváltást, ezért nem kérdezzük újra),
  - különben folyamatban lévő vagy visszanyitott munkánál `"manual"`,
  - különben `null` → **csak a módválasztó renderelődik**.
- A tervrajzos támogatás feltétele ugyanaz maradt, ami eddig is (`definition.reference.category === "roof"`), tehát nem feltételeztem képességet: pontosan ott van módválasztó, ahol a `PlanFieldTransfer` eddig is renderelődött.
- Módváltás: rajz→kézi **nyitott rajznál** a meglévő `requestConfirmation`-t kéri, és elfogadás után elengedi a dokumentumot **és nullázza a tetőszakasz-hatókört** — így nem marad mögöttünk élő, de láthatatlan rajzi munkamenet, és a fedettségi mentési kapu sem kerülhető meg. Minden más váltás adatvesztés nélküli, ezért kérdés nélkül megtörténik.
- Törölve: `entry`, `setEntry`, `startFromDrawing`, a két gomb, az `entry-steps` sor, a `is-drawing-first` és `construction-suite-entry` CSS. Az „Új kalkuláció" a módválasztást is nullázza.

### Módosított fájlok

`src/features/calculators/construction-suite.tsx`, `src/app/globals.css`, `src/features/calculators/construction-suite-drawing-entry.test.tsx`.

### Futott ellenőrzések

- **Célzott Vitest:** `src/features/calculators` + `src/features/calculations` — 37 fájl / **397 teszt PASS** (1 skip). A T10 belépési tesztcsomag **15/15**; a „Rajzból indítok" blokkja átírva az új folyamatra (nem javítva: a régi elvárás megszűnt), 8 új eset: a régi gombok hiánya, módválasztó előbb, űrlap/eredmény/rajzpanel nélkül, kézi mód, rajzos mód, kalkulátoronkénti mód, felesleges megerősítés hiánya, nyitott rajznál megerősítés, T10 nem kérdez újra, nem tetős kalkulátor változatlan.
- **`npx tsc --noEmit` PASS**, ESLint az érintett fájlokon PASS.
- **Élő böngészős QA** (helyi, hitelesített munkamenet):
  - 375×812: a régi gombok eltűntek; a módválasztó előtt **nincs** űrlap, eredmény és rajzpanel; a dokumentummagasság **2639 → 1029 px**. Kártyák 323×134 és 323×116 px.
  - Kézi mód: mód-sáv „Kézzel adod meg", 8 mezős űrlap, rajzpanel nincs.
  - Rajzos mód: megerősítés nélkül vált (nincs mit elveszteni), a panel **nyitva** jön, a DEMO PDF betölt.
  - Nyitott rajznál a kézi módra váltás megerősítést kér; **elutasítva** a rajz marad, **elfogadva** a panel és a dokumentum eltűnik, az űrlap megjelenik.
  - **Lépcsők**: nincs módválasztó és mód-sáv, a munkaterület azonnal jön.
  - **Mentett B·V1 visszanyitása**: nincs újabb kérdés, mód „Kézzel adod meg", eredmény változatlanul **85,45 m²**.
  - 812×375 (kártyák egy oszlopban, 721×98) és 1440×900 (két oszlop, 366×134): nincs vízszintes túlcsordulás; világos és sötét téma a meglévő tokenekkel.
  - **T10 állapotmegőrzés:** nyitott rajznál a másik tetős kalkulátorra váltás nem kérdez újra és nem veszti el a rajzot (élőben és tesztben is).

### Ismert korlátok

- A rajzos módban a kalkulátorűrlap továbbra is a panel alatt marad: ez a meglévő T7 folyamat (az átvett értékek oda kerülnek, és a vezetett mezőbekérés erre épül), nem változtattam rajta.
- A rajz→kézi váltás a már **átvett mezőértékeket meghagyja** (csak a rajzot, a szakaszokat és a léptéket dobja el) — ez megegyezik a kalkulátorváltás eddigi viselkedésével, nem e körben bevezetett határ.
- Nem futott: teljes `npm test`, production build, fizikai telefonteszt.

## P3.6 — Álló telefonon nagyobb rajz (kártya-padding visszanyerése) (2026-11-04)

**Státusz: PASS.** A tervrajz álló telefonon 295×209 px-ről **345×244 px**-re nőtt (**+36% rajzfelület**), egyetlen CSS-szabállyal. **Nincs TypeScript-, séma-, RLS-, RPC-, provenance- és képletváltozás.**

### Miért ez volt a következő lépés

A P3.4 G-listája (G.1–G.4) és a terv P3.3a–f pontjai lezárultak; a maradék nyitott tételek fizikai eszközt igényelnek (valódi érintés: NOT TESTED), szándékos termékdöntések, vagy már meglévő mechanizmus fedi őket. A mérésekből egy valódi, eddig nem kezelt hiányosság maradt: a **P3.3b a fekvő nézetnek megszerezte a helyet (296 px vászon), az álló nézet soha nem kapta meg ugyanezt** — és a bádogos a telefont jellemzően állva tartja.

### Bizonyított gyökérok

A vászon **szélességre illeszkedik** (fekvő A4 → 1,41 képarány), tehát a méretét a szélesség dönti el, nem a magassági keret — a `max-height` 471 px-et engedne, a vászon mégis 209 px magas volt. A 375 px-es kijelzőből **80 px (21%)** három egymásba ágyazott kártya paddingjára ment el (élőben mérve):

| Szint | Elvesz | Marad |
|---|---:|---:|
| `dashboard-shell` | 26,25 | 349 |
| `roof-workspace` | 26 | 323 |
| `plan-field-transfer` | 26 | 297 |
| preview keret | 2 | **295** |

A felbontás nem volt hibás: a vászon backing store-ja 842×596 (DPR 2 mellett 2,86×), tehát a rajz nem homályos volt, csak kicsi.

### A javítás

Egy szabály a `globals.css`-ben: `@media (max-width: 560px)` alatt a **rajzelőnézet** kifut a két belső kártya paddingjából (`margin-inline: -1.5rem`, oldalsó keret és lekerekítés nélkül). A körülötte lévő szöveg és vezérlők megtartják a margójukat; a rajz a külső oldalmargóig ér (15 px szegély marad). Más nem változott.

Biztonsági szempont: a szakaszkijelölés pontjai **normalizáltak** (0..1), a feliratok találati számítása pedig `getBoundingClientRect`-ből jön, ezért az átméretezés nem érvénytelenít meglévő kijelölést és nem tolja el a koppintást.

### Mért előtte/utána (élő, hitelesített munkamenet, valódi P3.1 DEMO rajz)

| Nézet | Vászon előtte | Vászon utána | Bleed aktív |
|---|---|---|---|
| 375×812 | 295×209 | **345×244** (+36% terület) | igen |
| 320×720 | — | 292×207 (arányos) | igen |
| 812×375 | 416×294 | **416×294 (változatlan)** | nem |
| 1440×900 | 713×505 | **713×505 (változatlan)** | nem |

Vízszintes túlcsordulás egyik nézetben sincs (`scrollWidth === clientWidth`). A 25 felirat-overlay mindegyike a vászon határain belül maradt.

**Funkcionális ellenőrzés az új méreten:** szakaszkijelölés két sarokkal → fedettség + P3.5.1 kifejezett igazolás → célmező `Tető hossza` → valódi koppintás a „10,00 m" feliraton → **`✓ Tető hossza: 10000 mm · „10,00 m - fal/tető hossza" (egység a rajzon: m)`**. Igazolás előtt a koppintás helyesen blokkolódott („Előbb nevezd meg a tetőszakaszt…"), tehát a P3.5.1 kapu sértetlen.

### Futott ellenőrzések

- Célzott Vitest (`src/features/calculators`, `src/features/calculations`): 37 fájl / **391 teszt PASS** (1 skip).
- `npx tsc --noEmit` PASS.
- A QA-hoz ideiglenesen kiszolgált DEMO PDF a menet végén törölve; a `public/` tiszta.

### Ismert korlátok

- **A változás CSS-only, ezért unit teszttel nem fedhető** (a vitest/jsdom nem futtat layoutot): a bizonyíték az élő, mért böngészős ellenőrzés. Regressziót a meglévő komponenstesztek fognak, a méretet nem.
- Valódi telefonos érintés továbbra is **NOT TESTED**; a +36% felület csökkenti, de nem bizonyítja a közeli feliratok ujjal való szétválaszthatóságát.
- Nem futott: teljes `npm test`, production build.
- A nyereség a rajz képarányától függ: álló tájolású lapnál a vászon továbbra is magasságkorlátos lehet, ott a nyereség kisebb.

## P3.5.1 — A fedettség igazolása kifejezett megerősítés legyen (2026-11-04)

**Státusz: PASS.** A P3.4 G.4 megállapítása javítva. **Nincs séma-, RLS-, RPC-, provenance- és képletváltozás**; egyetlen UI-állapot alapértéke változott.

- **Gyökérok (pontosítva a jelentéshez képest):** a megerősítő checkbox **létezett** (`plan-field-transfer.tsx:680`, „A rajzon ellenőriztem, hogy ez a szakasz tetővel fedett; a teraszokat külön vizsgáltam."), de a fedettségválasztó maga pipálta be: `coverageConfirmed: status === "covered" && hasSectionSelection`. Mivel a szakasz ezzel „kész" lett (`sectionReady`), a lépés (`showSectionStep`) **azonnal be is zárult**, így a felhasználó jellemzően **meg sem látta** azt a checkboxot, amelynek az állítását a rendszer a nevében megtette.
- **Miért kapu:** a `coverageConfirmed` vezérli a `canSaveDrawingTakeoff` mentési kaput, az eredménysáv „Nem igazolt fedettség · előnézet" figyelmeztetését, a „Javaslat hozzáadása" gombot, a szakasz-chip ✓/⚠ ikonját és a „teljes tető" checkbox feloldását. Egy `<select>` megváltoztatása tehát szakmai igazolást elégített ki és mentést engedett.
- **Javítás:** a választó soha nem igazol (`coverageConfirmed: false`). Az igazolás a felhasználó kifejezett pipája marad — ugyanaz a minta, amit a `wholeRoofConfirmed` már eddig is követett. A fedettség újraválasztása hatókör-változás, ezért a korábbi igazolást érvényteleníti.
- **Ára:** a folyamat **+1 koppintás**; a szakasz-lépés a fedettség kiválasztása után nyitva marad, amíg a felhasználó nem igazol.

### Futott ellenőrzések

- **Célzott Vitest:** `src/features/calculators`, `src/features/calculations`, `src/domain/calculations` — 65 fájl / **752 teszt PASS** (1 skip). A `plan-field-transfer.test.tsx` 51/51.
- **Átírt teszt, nem „megjavított":** a `section step order (T5)` esete korábban kifejezetten az automatikus igazolást rögzítette („Selection plus confirmed coverage … closes on its own"). Most az új szándékot bizonyítja: a választó után a checkbox **engedélyezett, de üres**, a scope `coverageConfirmed: false`, nincs „Kész" gomb, és csak a pipa zárja a lépést. Új eset: a fedettség újraválasztása **visszavonja** a korábbi igazolást.
- **`npx tsc --noEmit` PASS**, ESLint az érintett két fájlon PASS.
- **Élő böngészős QA** (375×812, hitelesített helyi munkamenet, valódi `tests/fixtures/drawings/roof-workflow-p31-demo.pdf`): a „Tetővel fedett" kiválasztása után a lépés **nyitva marad**, a checkbox látható, engedélyezett és üres (érintési cél 271×66 px), a szakasz-chip „⚠ Tetőszakasz 1 · **fedett, nem igazolt**", és nincs „Kész" gomb. A pipa után a chip „· fedett", a lépés bezárul, a „fedettség nincs igazolva" figyelmeztetés eltűnik. A QA-hoz ideiglenesen kiszolgált PDF a menet végén törölve.

### Ismert korlátok

- A változás viselkedésbeli: a már folyamatban lévő rajzos munkamenetekben (és importált munkaállapotnál, amely eddig is `coverageConfirmed: false`-szal tért vissza) a felhasználónak igazolnia kell, mielőtt menthet. Ez szándékos.
- Nem futott: teljes `npm test`, production build, fizikai telefonteszt.

## P3.5 — Anyagátvétel az Anyag lépésből és egyértelmű fóliaeredmény (2026-11-04)

**Státusz: PASS.** Két, a P3.4 DEMO-ban bizonyított UX-probléma megszűnt. **Nincs séma-, RLS-, RPC-, provenance- és képletváltozás**; a számított értékek azonosak.

- **P3.5/A gyökérok:** a `ConstructionFieldTransferControl` az `independentContent`-ben renderelődik, ami a `RoofWorkspace` `actions` sávja (a mentőpanel mellett), míg az anyagbeállítások a `measurements` sávban, a `#construction-material-inputs` blokkban állnak. A kettő közt nem volt semmilyen kapcsolat. **Mérve 375×812-n, a valós munkafolyamatban** (mindhárom anyagcsoport bekapcsolva): a panel **3064 px**-rel a blokk alatt volt, ami ≈3,8 képernyőnyi görgetés; üres űrlapon is 669 px.
- **P3.5/A megoldás:** az Anyag blokk élén egy `secondary-button` (`Anyagbeállítások átvétele korábbi kalkulációból`) a már létező panelt nyitja meg, görgeti oda és fókuszálja (`openFieldTransferPanel`, a panel `id`-ja a vezérlő mellett él, hogy ne tudjon elcsúszni). **Nincs második átvételi felület, forráslista, állapot vagy adatátviteli logika** — a forrásválasztás, a diff, az explicit jóváhagyás és a visszavonás ugyanaz a P3.3c panel. Jóváhagyott *anyag*átvétel után a nézet visszagörög az anyagbeállításokhoz; a fókusz a panelen marad, hogy a visszavonás elérhető legyen. A geometriai átvétel útja változatlan.
- **P3.5/B gyökérok:** a `drawingResultStrip` minden részhez vakon a `part.quantities[0]`-t írta ki `part.label` alatt. Az alátétfóliánál az első mennyiség a **Csíkok száma**, ezért a csík a „Alátétfólia” címke alatt **`6 db`**-ként jelent meg, tekercsnek olvashatóan. Más csoportot ez nem érint (szarufa/léc/fedőtábla első mennyisége a saját darabszáma).
- **P3.5/B megoldás:** a fólia a két saját mennyiségét nevén nevezve kapja: **`6 csík · 2 tekercs`**. Az értékek a már kiszámított domain-eredményből (`takeoff.underlay.courseCount`, `rollCount`) jönnek, címkeegyeztetés és új képlet nélkül; a tekercs csak akkor kerül ki, ha a domain ki is számolta, így hamis `0` nem jelenhet meg. Nem `VALID` résznél továbbra is az állapot áll a szám helyén. A részletes kimutatás felirata (`Csíkok száma`, `Tekercs · pontos vágási minimum`) változatlan és konzisztens az újjal.

### Módosított fájlok

`src/features/calculators/drawing-result-strip.ts`, `construction-field-transfer-control.tsx`, `construction-suite.tsx`, `src/app/globals.css` (két scoped térközszabály), valamint a `drawing-result-strip.test.ts` és `construction-material-transfer.test.tsx` tesztek.

### Futott ellenőrzések

- **RED bizonyítás:** a `drawing-result-strip.test.ts` új esete a javítás előtt `6 db`-ot kapott `6 csík · 2 tekercs` helyett, a valódi `computeConstruction` → `drawingResultStrip` úton (nem mockolva).
- **Célzott Vitest:** `src/features/calculators` 60 fájl / 726 teszt PASS; `src/features/calculations` 5 fájl / 26 teszt PASS (1 skip). Új esetek: fólia csík/tekercs, a többi anyagcsoport és a 85,45 m² változatlansága, hiányos fóliaadatnál „hiányos" szám helyett, és a panel kívülről nyithatósága / fókusza / „a megnyitás nem módosít anyagállapotot".
- **`npx tsc --noEmit` PASS**, ESLint az öt érintett fájlon PASS.
- **Élő böngészős QA** (helyi, hitelesített `admin1@testadmin.com`, `roof.material-takeoff`): 375×812-n a belépési pont az anyagblokk **0 px**-én; a gomb megnyitja, odagörgeti és fókuszálja a panelt (`summary` a `document.activeElement`); a `DEMO - teljes nyeregtető · V1` same-type forrás jóváhagyása után a nézet visszatér az anyagblokkra (a blokk teteje a viewport 24 px-énél), a `requested` csoportok változatlanok, a `Visszavonás` elérhető, az eredmény pedig pontosan a referencia: **85,45 m² · 28 szarufa · 40 fedőtábla · 6 csík / 2 tekercs**. Érintési cél 376×51 px. Vízszintes túlcsordulás nincs 375×812, 812×375 és 1440×900 nézetben; világos és sötét téma ellenőrizve.

### Ismert korlátok

- A kompakt eredménysáv (`drawingResultStrip`) a tervrajzpanelhez tartozik; az új `6 csík · 2 tekercs` szöveg **a valódi számítási úton futó teszttel** bizonyított, megnyitott tervrajzzal böngészőben nem jelenítettük meg (PDF-feltöltést igényelt volna). A részletes kimutatás élőben ellenőrzött.
- Nem futott: teljes `npm test`, production build, fizikai telefonteszt, és a nézetméret×téma teljes mátrixa.
- Valós szakemberi időmérés nem történt; a mérések görgetési távolságok és aktiválásszám, nem időmegtakarítás.

## P3.4.1 — Same-type anyagátvétel mentési szerződése (2026-11-04)

**Státusz: PASS.** A P3.4 B útvonalát blokkoló `42501` gyökéroka bizonyított és javított, valódi helyi adatbázis-integrációval és élő, hitelesített böngészős E2E-vel; a korábban blokkolt B · V1 mentés és újranyitás lefutott.

- **Bizonyított gyökérok:** a `save_standalone_construction_calculation` pármátrixa a `20261027020000` migrációban a `material-takeoff`/`timber-cutlist` célnál a `v_source_calculator_type is distinct from p_calculator_type` feltétellel kizárta az azonos típusú forrást, miközben a P3.3c felületi forráslista (`listRoofShapeTransferSources`) ugyanazt a kalkulátortípust is felajánlja. Reprodukálva a tényleges RPC-n: `065_construction_field_transfer_same_type.sql` első esete javítás előtt `42501: A kiválasztott forrás nem használható adatátvételhez.`, a pármátrix `raise`-énél.
- **Minimális javítás:** `supabase/migrations/20261104120000_construction_field_transfer_same_type.sql` (új, forward-only, `create or replace`). Egyetlen feltétel szűnt meg (a típus-különbözőség), és helyére **explicit, korai önhivatkozási guard** került (`v_source_calculation_id = p_calculation_id` → `42501`) — eddig erre a same-type kizárás adott védelmet, nélküle csak a dependency-trigger generikus `P0001`-e fogta volna meg, a revízió- és attestáció-beszúrás után. Nincs új tábla, RLS-policy, provenance-mező és alkalmazáskód-változás.
- **Engedélyezési mátrix változása:** cél `material-takeoff`/`timber-cutlist` + forrás **ugyanaz a típus** → eddig `42501`, most engedett. Minden más pár változatlan: `rafter-cut → rafter-cut` és a nem támogatott célkalkulátorok (`truss-members`) elutasítva maradnak.
- **Megmaradt kapuk (változatlan kód):** forrás csak azonos szervezetű, `ownership_scope='standalone'`, `created_by = p_actor_id` revízió lehet — pontosan a felületi forráslista hatóköre; a `20261026020000` dependency-trigger ciklus-, self-reference- és scope-védelme, a QA08 attestáció, a snapshot-teljességi kapu és az operation-ledger idempotencia érintetlen.

### Futott ellenőrzések

- **Valódi helyi DB-integráció** (`supabase test db`, helyi `127.0.0.1:54322`, nem mockolt kliens): új `supabase/tests/database/065_construction_field_transfer_same_type.sql` — **14/14 PASS**. Pozitív: same-type mentés, V1 revízió, pontos `field-transfer:roof.material-takeoff->roof.material-takeoff` provenance, attestáció, az anyagállapot és a 85,45 m² eredmény változatlan visszaolvasása. Negatív (mind `42501`): önhivatkozás, nem létező forrás, idegen felhasználó azonos típusú forrása, idegen szervezet forrása, `rafter-cut → rafter-cut`, nem támogatott célkalkulátor. Regresszió: a cross-type `rafter-cut → material-takeoff` út változatlanul menthető.
- **Teljes pgTAP csomag:** 67 fájl, 1385 teszt. A transfer-, trust-boundary- és quotation-source tesztek (`056`–`064`) PASS. A `064_writer_transaction_pooler_timeout.sql` korábbi bukását a helyi DB-ből hiányzó `20261028100000` migráció okozta; `supabase migration up --local` után PASS.
- **Élő böngészős E2E** (helyi, hitelesített `admin1@testadmin.com` munkamenet, `DEMO TetőPro Kft.`, a P3.4 eredeti forrásának tulajdonosa — a P3.4/B blokkolt útvonalának megismétlése): új `roof.material-takeoff` → forrás `Tetőanyag-kimutatás … · DEMO - teljes nyeregtető · V1` (same-type) → a **pontos forrásrevízió** megjelent (`a felhasznált revízió dátuma: 2026-10-31`) → anyagdiff áttekintve → `Az anyagadatokat is átveszem ebből a revízióból.` bejelölve → `Adatok átvétele`. Átvett: geometria (6000 × 10000 mm, 35°, 500 mm ereszkiülés, 0/0 homlokzati kiülés), **14 anyagparaméter** (fedőtábla 5, alátétfólia 5, szarufa 2, léc 2) és a kiosztás (szarufa 800 mm, léc 350 mm). A `requested` anyagcsoportok **nem másolódtak** — a három kapcsoló az átvétel után is kikapcsolt maradt, a felület ezt ki is írja. A referenciaeredmény pontosan: **85,45 m² · szarufa 28 db · léc 27 db · fóliatekercs 2 db · fedőtábla 40 db**.
- **B · V1 mentés és újranyitás:** `DEMO P3.4.1/B - same-type anyagátvétel` (`3e115527-b701-4108-a305-a26705f254df`) mentve, **V1** revízió `ad30e03f-a25b-47ca-b242-d7c448611a41`. DB-vel kereszt-ellenőrizve: dependency `field-transfer:roof.material-takeoff->roof.material-takeoff` a forrás V1-re (`ea37931e-…`), attestáció 1 db, és a mentett `material.specs` **bitazonos** a forrásrevízióéval. Újranyitás után a geometria, a mentett anyagcsoportok, a 85,45 m² és mind a négy anyagmennyiség változatlan; a Karmi kapcsoló kikapcsolt, egyezve a mentett snapshottal.
- **Nem futott:** teljes Vitest, ESLint, typecheck és production build — a változás kizárólag SQL, TypeScript nem módosult. Nézetméret×téma mátrix és mobil fizikai teszt nem futott.

### Ismert korlátok

- A böngészős E2E egyetlen tetőformán (nyeregtető) és egy forrás–cél páron futott; a többi same-type kombináció csak DB-szinten bizonyított. A menet végén egy teszt-kalkuláció (`DEMO P3.4.1/B - same-type anyagátvétel`, V1) maradt a helyi DEMO szervezetben — törölhető, ha nem kívánt.
- A `046_takeoff_material_list_source.sql` 9. esete a helyi DB-ben bukik (`project_id is null` listák globális, fixture-szűrés nélküli számlálása korábbi munkamenetek adatain) — **meglévő tesztizolációs hiba**, nem e változás következménye.
- A migráció a helyi adatbázison alkalmazva; hosted/staging/production környezetben **nem**.
- A `42501` felületi szövege változatlan: a javított szerződés mellett a támogatott útvonalon forráskompatibilitási hiba már nem áll elő, ezért új UI-elem nem indokolt.

## P3.3f — Alapértékek egy kártyán (2026-11-01)

**Státusz: PASS.** A négy soronkénti alapérték-elfogadás helyére egy kártya és **egy** jóváhagyás lépett, a kiírt értékekkel. **Nincs séma-, RLS-, képlet- és mentésikapu-változás**; a `drawing-field-transfer.ts` (`unconfirmedDrawingAssumptions`, `drawingAssumptionToken`, `canSaveDrawingTakeoff`) egy karaktert sem változott. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3f.

- **Atomi jóváhagyás:** `confirmAssumption(key)` → `confirmAssumptions(keys)`. A négy kulcs **egyetlen** `updateActiveSection`-hívásban kapja meg az értékét és a tokenjét. Ez nem kozmetika: a token `${tetőforma}|${érték}` alakú, ezért a tokeneket a már teljesen kiírt `nextFields`-ből kell képezni — négy egymás utáni hívás elavult `current`/`snapshot()` állapotra épült volna.
- **Hatókör:** a jóváhagyás pontosan a kártyán kiírt kulcsokra vonatkozik. Egy később megjelenő alapértéknek nincs tokenje, ezért újra kér — ezt teszt bizonyítja (új szakasz: 4 tétel, gomb „(4)"), ahogy azt is, hogy más tetőformánál csak a látható tételek kapnak tokent.
- **Megmaradt:** a soronkénti „valós érték megadása" út (`cededFieldKey` → `renderField`, egyszerre egy kérdés), a figyelmeztetés szövege, a `plan-todo` többi blokkja, a mentési kapu (`unconfirmedAssumptions` blokkolása), és a P3.3a–e eredményei (kompakt lépéssáv 161 px, anyagátvétel, P3.2 kapuk, rajzi munkamenet-tájékoztató).

### Mért előtte/utána (élő, bejelentkezett, 375×812, DEMO-kép)

| Elem | Előtte | Utána |
|---|---:|---:|
| Alapérték-blokk (`.plan-assumptions`) | 504 px | **373 px** |
| „Teendők és figyelmeztetések" blokk | 686 px | **555 px** |
| Jóváhagyó koppintás 4 alapértékhez | 4 | **1** |
| Teendőblokk elfogadás után | — | 267 px |

Egy koppintás után a kártya eltűnt, a lépéssáv „Mezők" chipje `3 hiányzik, 4 megerősítendő` → `3 hiányzik` értékre váltott, a mentés gomb helyesen `disabled` maradt a `Hiányos kalkuláció` kapu miatt. A jóváhagyó gomb 61 px magas (≥ 44 px), vízszintes túlcsordulás 0.

### Futott ellenőrzések

- `npx vitest run src/features/calculators src/features/calculations` — **37 passed, 1 skipped (386 teszt)**. A `plan-field-transfer.test.tsx` 51 esete zöld: 12 eset a kártya-jóváhagyásra állt át, és új eset bizonyítja, hogy a jóváhagyás csak a kiírt tételeket érinti.
- `npx tsc --noEmit -p tsconfig.typecheck.json` — **No errors found**; `npx eslint` a 2 érintett fájlra — **No issues found**.
- Élő mobil QA 375×812-en (fent), adatbázisba semmi nem íródott.

### Teljes regresszió és build a P3.3a–f lezárásához (2026-11-01)

- `npm test` — **224 fájl PASS, 8 SKIP; 1534 teszt PASS, 19 SKIP, 0 FAIL** (9,6 s). A 19 kihagyott eset mind `*.local.integration.test.ts`, futó helyi Supabase-példányt igényel; egyik sem érinti a rajzpanelt, a lépéssávot, az alapérték-kártyát vagy az anyagátvételt.
- `npx next build --webpack` — **EXIT 0**, `✓ Compiled successfully`, TypeScript 1287 ms hibátlan, 34/34 statikus oldal, **55 route**, 0 error / 0 warning. Az AGENTS.md szerint izolált környezetben futott (`rsync` másolat, symlinkelt `node_modules`), mert a fő checkout `.next` könyvtárát aktív `next dev` használja; a másolat a build után törölve, a megosztott `.next` érintetlen.
- **Korlát:** a P3.3c forráslista-szűrése (`created_by`, `excludeCalculationId`) mockolt Supabase-klienssel van lefedve; valódi RLS-végrehajtással nem, mert az ezt bizonyító integrációs tesztek a kihagyottak között vannak.

### Ismert korlátok

- A **részleges** elfogadás (3 a 4-ből) megszűnt: aki egy alapértéket nem akar elfogadni, annak előbb meg kell adnia a valós értéket (ekkor az a sor kikerül a kártyáról), és utána elfogadni a maradékot. Ez a terv szándékolt viselkedése, de viselkedésváltozás.
- A `roof.timber-cutlist` munkaállapot-exportja **nem** bővült (külön termékdöntés).
- A teljes `npm test` és a `npm run build` **nem futott**; valódi telefonos érintés továbbra is NOT TESTED.

## P3.3e — Mentési állapot: a két perzisztencia megnevezése (2026-11-01)

**Státusz: PASS.** A `Mentve · V{n}` mellé — **csak nyitott rajzi munkamenet esetén** — egy sor kerül, amely megnevezi, mit rögzít a revízió és mit nem. **Nincs séma-, RLS-, képlet- és mentésikapu-változás**; a `src/domain/**` érintetlen. P3.1 F.4 közvetlen orvoslása. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3e.

- **Szöveg (mentés után):** „A V{n} a kalkuláció mentett revíziója: a mezőket és az anyagadatokat rögzíti. A megnyitott tervrajz, a tetőszakaszok és a léptékhitelesítés **nem része** — …". Mentés előtt: „A mentés a kalkuláció revízióját hozza létre: …", tehát nem hivatkozik nem létező V-számra.
- **Kalkulátorfüggő folytatás, igazoltan:** `roof.material-takeoff`-nál a panel a létező „Munkaállapot mentése" exportra irányít; `roof.timber-cutlist`-nél ez a gomb **nem létezik** (`isTakeoff` kapu a `plan-field-transfer.tsx`-ben), ezért ott a szöveg azt mondja, hogy a rajzi munkamenet csak a böngészőmunkamenetben él. A panel nem ígér olyan utat, ami nincs.
- **Zajmentesség:** a sor a `drawingSession` prop nélkül nem jelenik meg; a hívó ugyanazt a feltételt adja át, amit az „Új kalkuláció" guard is használ (`drawingDoc.file !== null || drawingDoc.sections.length > 0`). Rajz nélküli kalkulátorhasználatkor a mentési blokk változatlan.
- **Változatlan:** a navigációs/mentetlen-változás guard, a `Hiányos kalkuláció` kapu, a `blockedReason`, a revíziólista, a drift-figyelmeztetés és a munkanapló-kapcsolás.

### Futott ellenőrzések

- `npx vitest run src/features/calculators src/features/calculations` — **37 passed, 1 skipped (385 teszt)**; új eset a `construction-save-panel.test.tsx`-ben: rajz nélkül nincs sor, exportálható és nem exportálható változat, mentés előtti szöveg V-szám nélkül, és a státusz + mentési kapu változatlansága.
- `npx tsc --noEmit -p tsconfig.typecheck.json` — **No errors found**; `npx eslint` a 3 érintett fájlra — **No issues found**.
- **Élő böngészős QA, bejelentkezve, 375×812:** rajz betöltése előtt a sor nincs; DEMO-kép betöltése után `roof.material-takeoff`-nál a „Munkaállapot mentése" szövegváltozat, `roof.timber-cutlist`-re váltva a „csak ebben a böngészőmunkamenetben él" változat jelent meg. Vízszintes túlcsordulás 0. Adatbázisba semmi nem íródott.

### Ismert korlátok

- A **mentés utáni** `A V{n} …` szövegváltozat élőben nem volt reprodukálva (tényleges mentés kellett volna hozzá); célzott teszt fedi.
- A teljes `npm test` és a `npm run build` **nem futott**.

## P3.3d.1 — Lépéssáv kompakt mobilnézete (2026-11-01)

**Státusz: PASS.** A P3.3d-vel 315 px-re nőtt lépéssáv 375 px-en **161 px**, 812×375-ben **93 px**. Lépéslogika, `drawing-step-bar` szerződés, figyelmeztetések és mentési kapuk **nem módosultak**; a változás egy megjelenítési kapcsoló, egy `aria-label` és egy CSS-blokk. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3d.

- **Megoldás:** keskeny (`max-width: 63.999rem`) és fekvő (`(orientation: landscape) and (max-height: 520px)`) nézetben a chip alapból csak a lépés nevét és állapotikonját mutatja. Az állapot nem vész el: minden chip `aria-label`-je `"{lépés}: {állapot}"`, a teendő állapota pedig a sáv alatti „Következő" sorban továbbra is teljes szöveggel áll. A „Minden állapot" kapcsoló (`aria-expanded`) egy koppintással kiírja mind a hatot.
- **Változatlan:** a lépések száma, sorrendje, `done`/`optional` szerződése, az `aria-current="step"`, a Lépték és a nem kért Anyag opcionalitása, a „Teendők és figyelmeztetések" blokk és a jóváhagyási kapuk.
- **Széles nézet:** a kapcsoló `display: none`, a chipek minden állapotot kiírnak — a rövidítés és a kapcsoló megjelenése pontosan ugyanarra a médiafeltételre van kötve, így nincs olyan méret, ahol a szöveg rejtve marad, de a kibontás elérhetetlen.

### Mért előtte/utána (élő, bejelentkezett, DEMO-kép, azonos görgetési pozíció: a sáv a viewport tetején)

| Nézet | Sáv magassága előtte | utána | Chipsorok | Látható rajzterület előtte | utána |
|---|---:|---:|---:|---:|---:|
| 375×812 | 315 px | **161 px** | 6 → **2** | 209 px (teljes) | 209 px (teljes), de **154 px-rel feljebb** |
| 812×375 | 117 px | **93 px** | 2 → **1** | 221 / 294 px | **245 / 294 px** |
| 1280×900 | 167 px | **167 px** | változatlan | — | — |

375 px-en a mérhető munkafolyamat-nyereség: a vászon alja a sáv tetejétől 537 px-ről **383 px-re**, a „Teendők és figyelmeztetések" blokk teteje 726 px-ről **572 px-re** került, azaz a rajz és a kötelező jóváhagyások (pl. „Nyeregtető elfogadása") **egy képernyőre kerültek**, ami korábban nem fért ki.

### Futott ellenőrzések

- `npx vitest run src/features/calculators src/features/calculations` — **37 passed, 1 skipped (384 teszt)**; a `plan-field-transfer.test.tsx` lépéssáv-esete kiegészült a rövidített chipek `aria-label`-jeivel, a kapcsoló `aria-expanded` állapotával és azzal, hogy a kibontás csak megjelenítés (sorrend és aktuális lépés változatlan).
- `npx tsc --noEmit -p tsconfig.typecheck.json` — **No errors found**; `npx eslint` a 2 érintett forrásfájlra — **No issues found**.
- **Élő böngészős QA** 375×812, 812×375 és 1280×900 nézetben: érintési célok 44 px (chip és kapcsoló is mérve), vízszintes túlcsordulás 0 mindhárom méretben, a kapcsoló oda-vissza működik, desktopon a sáv és a kapcsoló rejtettsége változatlan. Adatbázisba semmi nem íródott.

### Ismert korlátok

- A „Következő" sor és a „Minden állapot" kapcsoló 375 px-en két sorba tördelődik (a kapcsoló saját sorba kerül); emiatt a 161 px-ből kb. 63 px a hint-blokk. További rövidítés csak a „Következő" szöveg rovására lenne lehetséges.
- Valódi telefonos érintés továbbra is **NOT TESTED**; a mérések emulált viewportban készültek.
- A teljes `npm test` és a `npm run build` **nem futott**.

## P3.3d — Lépéssáv: „Anyag" és „Mentés" lépés + mentési ugrási cél (2026-11-01)

**Státusz: PASS.** A rajzpanel lépéssávja két új lépéssel egészült ki, és a mentési panel megkapta a hiányzó ugrási célt. **Nincs séma-, RLS-, RPC- és képletváltozás**; a `src/domain/**` érintetlen. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3d.

- **Sorrend:** `A lap → Szakasz → Lépték → Mezők → Anyag → Mentés`.
- **„Anyag":** a kalkulátor saját `materialTakeoff.status`-át és a `takeoffInputs.requested` feloldott értékét közvetíti (a csak-faanyag kalkulátor kényszerével együtt); a `geometry` rész nem anyagcsoport. Nem kért csoport → `nincs kérve`, `optional: true`, sosem „következő lépés" és sosem nyitott munka. Amíg a geometria hiányos, a kalkulátor nem állít anyagstátuszt (`materialTakeoff === null`) → `még nem értékelhető`; a sáv ilyenkor sem állít semmit.
- **„Mentés":** `nincs mentve` / `V{n} · mentetlen módosítás` / `V{n} · mentve`. A prop szándékosan szűk: `{ revisionNumber, dirty }`. A mentési kapu, a név, a konfliktus- és revíziókezelés a mentési panelé maradt.
- **Ugrás:** `Anyag` → `construction-material-inputs`, `Mentés` → az új `id="construction-save-panel"`.
- **Szerkezet:** a `drawingTransfer` JSX a `session`/`activeDirty` kiszámítása után áll elő (13 sor áthelyezése), mert a `save` prop onnan jön. Logika nem változott.

### Futott ellenőrzések

- `npx vitest run src/features/calculators src/features/calculations` — **37 passed, 1 skipped (384 teszt)**; a `drawing-step-bar.test.ts` 5 új esettel 11-re nőtt, a `plan-field-transfer.test.tsx` lépéssáv-esete kiegészítve.
- `npx tsc --noEmit -p tsconfig.typecheck.json` — **No errors found**; `npx eslint` az 6 érintett fájlra — **No issues found**.
- **Élő böngészős QA, bejelentkezve, 375×812** (`/kalkulatorok?calculator=roof.material-takeoff`, DEMO-kép injektálva): mind a 6 chip megjelent; `Anyag · nincs kérve` opcionálisként, a „Következő" továbbra is `A lap`; a faanyag bekapcsolása után `Anyag · még nem értékelhető`; az `Anyag` chip az anyagbemenetekhez, a `Mentés` chip a mentési panelhez görgetett; `scrollWidth − clientWidth = 0` az oldalon és a sávon belül is. Adatbázisba semmi nem íródott.

### Ismert korlátok

- A sáv magassága 375 px-en ~210 px-ről **~315 px-re** nőtt (4 → 6 chip). A chipek már wrappelnek; további rövidítés csak az állapotszöveg rovására lenne lehetséges.
- A `VALID` anyagstátusz és a `V{n} · mentve` állapot **élőben nem** volt reprodukálható (teljes geometria és tényleges mentés kellett volna hozzá); ezeket célzott teszt fedi.
- A teljes `npm test` és a `npm run build` **nem futott**.

## P3.3c — Anyagprofil újrahasználata mentett kalkulációból (2026-11-01)

**Státusz: PASS.** A korábban mentett kalkuláció anyagállapota explicit, külön jóváhagyott művelettel átvehető az „Adatok átvétele" panelben. **Nincs új tábla, migráció, RLS-policy, RPC és domain-változás**; a `src/domain/**`, a képletek, a P3.2 adatátviteli védelmei és a mentési szabályok érintetlenek. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3c.

- **Architektúra:** a mentett revízió `input_snapshot`-ja már tartalmazta a teljes anyagállapotot (`material = { requested, layout, specs }`), a `listRoofShapeTransferSources` eddig csak a `fields` ágát adta ki. A P3.3c ennek az ágnak a bekötése — párhuzamos profiltároló nélkül.
- **D1:** a kizárás a szerkesztett `calculationId` (`.neq("id", …)`), nem a kalkulátortípus, így ugyanaz a kalkulátortípus is forrás lehet („ugyanaz az anyag, új ház").
- **D2:** egy jóváhagyó jelölőnégyzet, **alapból kikapcsolva**, csoportonként rendezett teljes diff-előnézettel; fejlécben a forrás neve, `V{n}` és a **felhasznált revízió saját `created_at` dátuma** (nem a kalkuláció `updated_at`-ja). A mező- és az anyagátvételi döntés elkülönül.
- **Szerződés:** `requested` nem kerül át; `roof.timber-cutlist` csak `rafter`/`batten`-t kap; üres forráscsoport és hiányzó `layout` kulcs nem ír felül semmit; a `SpecState` egészben megy át, ezért az override/`Visszaállít` út változatlan; a `profileId` az **élő** katalógussal oldódik fel, nem feloldható termék esetén az adott csoport látható hibát kap és kimarad; `DEMO`- és provenance-jelölés megmarad; a `Visszavonás` a korábbi anyagállapotot pontosan visszaállítja.

### Jogosultsági bizonyíték (ellenőrzött, nem történeti következtetés)

A `calculations_select_authorized` / `calculation_revisions_select_authorized` (`20261014010000`) standalone esetén `created_by = auth.uid()`-ra szűkít. **Korlát:** a `calculations_linked_member_read` / `calculation_revisions_linked_member_read` (`20261025110000`) permissive policy egy kivitelezési tervhez linkelt `construction.%` kalkulációt a szervezet többi tagjának is olvashatóvá tesz, ezért az RLS önmagában nem tartja creator-only körben a forráslistát. A felhasználói izolációt az alkalmazásszintű explicit `created_by` szűrő adja — ez kódmegjegyzésben rögzítve, és teszt fedi.

### Futott ellenőrzések

- `npx vitest run src/features/calculations src/features/calculators` — **37 passed, 1 skipped (379 teszt)**, benne 5 új forráslista-eset (`construction-data.test.ts`) és 7 új átvételi eset (`construction-material-transfer.test.tsx`).
- `npx tsc --noEmit -p tsconfig.typecheck.json` — **No errors found**.
- `npx eslint` a 6 érintett fájlra — **No issues found**.
- **Élő böngészős QA, bejelentkezve, 375×812** (`/kalkulatorok?calculator=roof.material-takeoff`): a „DEMO - teljes nyeregtető" V1 forrás előnézetében mind a **14 anyagparaméter** megjelent mértékegységgel, csoportonként, `Kézi` eredettel; jóváhagyás után mind a 14 bekerült a kalkulátorba, a `requested` nem változott; a `Visszavonás` minden anyagmezőt és mezőértéket visszaállított; `scrollWidth = clientWidth = 375` (nincs vízszintes túlcsordulás); konzolhiba nincs. Adatbázisba semmi nem íródott (mentés nem történt).

### Ismert korlátok

- A **nem feloldható termék** ága és a **DEMO termék** jelölése célzott tesztben bizonyított, élő böngészőben nem — a DEMO-szervezet Anyagkezelőjében nincs olyan aktív termék, amivel ez reprodukálható lett volna.
- Valódi telefonos érintés továbbra is **NOT TESTED**.
- A teljes `npm test` és a `npm run build` **nem futott**.

## P3.3b — Fekvő mobilnézet: alsó navigáció magasságfeltétele (2026-11-01)

**Státusz: PASS.** A fekvő telefon (812×375) megkapja ugyanazt az alsósáv-kezelést, amit az álló mobil már használ, így a rajzos munkaterület a teljes képernyőmagasságot kapja. Alkalmazáskód, TSX, domain-számítás, adatbázis, a P3.2 adatátviteli védelmei, a T7/T10 munkafolyamat és a P3.3a eredménysáv **nem változott**. A módosítás **egyetlen CSS-médiafeltétel**. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3b.

- **Gyökérok:** az alsó sáv opt-in kapuja `@media (max-width: 700px)` volt, a fekvő telefon viszont 812 px **széles**, tehát kiesett belőle; a sáv `--app-nav-bar` = 64,4 px-et foglalt a 375 px magasságból. Maga az alsó sáv a `63.999rem`-es breakpointig él.
- **Javítás:** `@media (max-width: 700px), (orientation: landscape) and (max-height: 520px) and (max-width: 63.999rem)`. A második feltétel a tájolás és a magasság párosa — ugyanaz, amit a rajzi munkaterület fekvő elrendezése (`.plan-workspace`) már használ —, a `63.999rem`-es felső határral, hogy az asztali oldalsáv (`min-width: 64rem`) egy alacsony asztali ablakban se tűnjön el.
- **Elérhetőség:** a blokk a `.settings-mobile-navigation { display: block }` szabályt is tartalmazza, ezért a „Alsó navigáció megjelenítése" kapcsoló fekvő telefonon **megjelenik** a Műhely → Beállítások panelen, és a sáv egy koppintással visszakapcsolható. Bekapcsolva a sáv 61 px, elemenként 57 px-es érintési céllal; a `safe-area-inset-bottom` kezelése változatlan.

### Mért előtte/utána (812×375, valódi `roof-workflow-p31-demo.pdf`, azonos görgetési pozíció)

| Mérés | Előtte | Utána | Változás |
|---|---:|---:|---:|
| Alsó sáv által foglalt magasság | 61 px | 0 px | −61 px |
| Használható függőleges terület | 314 px | **375 px** | +61 px (+19%) |
| `--app-nav-bar` | 64,4 px | 0 px | — |
| Rajzvászon doboz magassága (`max-height`) | 247 px (246,6) | **296 px** (max 311) | +49 px |
| Ebből ténylegesen látszó rajz | 117 px | **179 px** | +62 px (+53%) |
| Renderelt rajz magassága | 294 px | 294 px | a rajz **már nem vágódik le** (294 ≤ 296) |
| Gyorssáv látható magassága | 105 px | 105 px | változatlan |
| Eredménysáv (P3.3a) | 84 px | 84 px | változatlan |

### Futott ellenőrzések

- **812×375 (elsődleges):** sötét és világos témában azonos mérés; a rajz, az eszköztár (70 px), a gyorssáv (105 px) és az eredménysáv (84 px) **egymást nem takarja** (páronkénti téglalap-metszet ellenőrzés: nincs átfedés); vízszintes túlcsordulás nincs (`scrollWidth === innerWidth === 812`).
- **Aktív mérés:** a „Lépték megadása" után a vászon `is-calibrating` módban 292,5 px (78svh), a koppintássáv felette, **átfedés nélkül**; két koppintás a rajzon regisztrálódott (overlay 2 pont, a sáv „2/4 pont"-ra váltott és a valós méretet kérdezi) — az overlay és a rajzi koppintás **sértetlen**.
- **Navigáció opt-in körút:** a kapcsoló 812×375-ben látható (`display: block`, 52 px-es összecsukó fej); bekapcsolva `data-mobile-nav="visible"`, sáv 61 px, `--app-nav-bar` visszaáll; kikapcsolva ismét rejtett. Bekapcsolt sávval oldalváltás `/` → `/kivitelezes` működik, az aktív elem jelölve. (A rajzi munkafelületről indított váltást a T10 mentetlen-munka guard helyesen megállította — változatlan viselkedés.)
- **375×812 álló regresszió:** sötét és világos témában **változatlan** (vászon 211 px, eredménysáv 104 px, gyorssáv 105 px, nincs átfedés, nincs túlcsordulás).
- **1440×900 asztali regresszió:** az oldalsáv megmarad (216 px, `--app-nav-rail: 13.5rem`), nincs túlcsordulás. **1440×500 alacsony asztali ablak:** az oldalsáv **nem tűnik el** (216 px, 6 elem) — a `63.999rem`-es felső határ bizonyítottan véd.
- Célzott regresszió (`mobile-navigation`, `drawing-result-strip`, `plan-field-transfer`, `drawing-calibration`, `drawing-quick-transfer`, `construction-suite-drawing-entry`, `drawing-calculator-switch`): **7 fájl / 104 teszt PASS, 0 fail**. `npx tsc --noEmit -p tsconfig.typecheck.json` PASS; célzott ESLint PASS (a `globals.css`-t az ESLint-konfiguráció nem fedi).

**Korlát:** a teljes `npm test` **nem futott** (CSS-only változás, célzott kör készült); production build nem futott (a dev szerver birtokolja a `.next`-et); fizikai telefonos, ujjal végzett érintés és valódi eszköz-tájolásváltás **NOT TESTED** — a mérés böngészős viewport-emulációval készült. A rejtett alsó sáv felfedezhetősége fekvőben ugyanaz, mint állóban: a navigáció a Műhely felületéről és a visszanavigálásból érhető el, a sáv pedig a beállításokból kapcsolható vissza; ezen a terven nem változtattunk. A böngészős QA-hoz a fixture PDF ideiglenesen a `public/` alá került, és utána törölve lett.

**Javasolt Conventional Commit:** `fix(P3.3b): free the landscape phone viewport from the fixed bottom navigation`.

## P3.3a — Élő eredménysáv a rajzpanelben (2026-10-31)

**Státusz: PASS.** A rajzpanel a lépéssáv alatt, a vászon felett kiírja a számított kulcsszámokat, így egy téves átvitel a rajz elhagyása nélkül látszik. Képlet, domain-számítás, adatbázis, Auth/RLS, mentési RPC, a P3.2 gyorsátviteli kapui, a T7 bekérés és az M12.2 OCR-kapu **nem változott**. Terv: `docs/DRAWING_WORKFLOW_EFFICIENCY_PLAN.md` P3.3a.

- **Egy számítómotor:** új állapot és új számítás nincs; a csík a panel már meglévő `calculation` propjából dolgozik. Új, tiszta modul: `drawing-result-strip.ts` — csak jelent, nem számol és nem kapuz. A tetőfelület a `summarizeRoofGeometry` kiemelt eredménye, az anyagszámok a `materialTakeoff` **kért** részeinek első mennyisége, a formázás a közös `formatQuantity`.
- **Csak igazolt érték jelenik meg.** Igazolt (`VALID`) részhez a mennyiség, `INCOMPLETE`/`INVALID` részhez `hiányos` / `hibás adat` kerül a szám helyére. Hiányzó vagy érvénytelen mezőnél a `computeConstruction` geometriája `null`, ezért a csík **eltűnik** — korábbi érték nem marad ott.
- **Kalkulátoronként eltérő eredmény.** Szarufa-kiszabásnál (nincs tetőgeometria) a csík meg sem jelenik; faanyag-vágáslistánál csak `Tetőfelület · Szarufa · Léc`; anyagkimutatásnál a ténylegesen bekapcsolt csoportok. Szarufa- vagy lécsoreredményt a csík sehol nem feltételez.
- **Minősítés:** a távoli eredményblokk szóhasználatát ismétli (`Nem számítható` / `Hiányos · előnézet` / `Nem igazolt fedettség · előnézet` / `Tetőszakasz-eredmény · nem a teljes tető` / `Teljes eredmény`), saját minősítést nem ad.
- **Navigáció:** egyetlen `Teljes eredmény` ugrógomb (44 px) a számok sorában, új `id="construction-results"` célponttal. A csík nem szerkeszthető, nem lebeg a rajz fölött (a visszavont sticky gyorssáv tanulsága szerint), és nem von el figyelmeztetést: a „Teendők és figyelmeztetések", az alapérték-megerősítések, a részletes kimutatás és a mentési kapu változatlan.

### Futott ellenőrzések

- Új: `drawing-result-strip.test.ts` — **9 teszt PASS**: 85,45 m² P3.1 referencia; az F.1/B téves 10 000 mm hátsó kiülés 170,91 m²-e; 28 db szarufa; hiányos rész állapotjelzése; mind az öt minősítés; továbbá a **valódi `computeConstruction`-nal** szarufa-kiszabás (nincs csík), faanyag-vágáslista (csak a kért csoportok) és érvénytelen/hiányzó mezőérték (nincs csík).
- `plan-field-transfer.tsx` **+3 eset**; célzott regressziós kör (`plan-field-transfer`, `drawing-result-strip`, `drawing-step-bar`, `construction-suite-drawing-entry`, `drawing-calculator-switch`, `drawing-quick-transfer`, `drawing-field-transfer`, `construction-computation`, `construction-save-panel`): **9 fájl / 202 teszt PASS, 0 fail**.
- `npx tsc --noEmit -p tsconfig.typecheck.json` PASS; célzott ESLint PASS.
- **Élő böngészős QA**, bejelentkezve, `localhost:3000`, valódi `roof-workflow-p31-demo.pdf`, 375×812: rajzbetöltés után geometria nélkül a csík **nem jelenik meg**; 10,00 × 6,00 m / 35° után `Tetőfelület 73,25 m²`, a csík (104 px) és a **teljes vászon egy képernyőn**, görgetés nélkül (csík 24, vászon 244–455, viewport 812). A kötelező hossz kiürítése után a csík **eltűnt**, javítás után `146,49 m²`-rel tért vissza; érvénytelen (−600 cm) szélességnél szintén eltűnt, majd javítás után visszatért. A `Teljes eredmény` gomb a részletes eredményblokkhoz ugrott (2327 px). 812×375-ben a csík egy sorba fut (84 px), 1440×900-on 63 px. Vízszintes túlcsordulás egyik nézetben sincs (`scrollWidth === innerWidth`), böngészőkonzol-hiba 0.

**Korlát:** a teljes `npm test` **nem futott** (célzott kör készült); fizikai telefonos érintés és sötét téma **NOT TESTED**; production build nem futott (a dev szerver birtokolja a `.next`-et). A böngészős QA-hoz a fixture PDF ideiglenesen a `public/` alá került, és az ellenőrzés után törlésre került. A csík 375 px-en 104 px magas (az ugrógomb 44 px-es érintési célja nélkül 82 px lenne); a vászon ettől a képernyőn belül marad.

**Javasolt Conventional Commit:** `feat(P3.3a): show the computed roof result next to the drawing`.

## P3.2 — Rajzi gyorsátvitel szakmai biztonsági javítása (2026-10-31)

**Státusz: PASS.** A P3.1 C.2/F.1 két P1 esete a javítás előtti regressziós futásban reprodukálódott, majd a P3.1 DEMO PDF-fel élő böngészőben is újraellenőrzésre került. Képlet, adatbázis, Auth/RLS, mentési RPC, T7, T10 és az M12.2 OCR-kapu nem változott.

- **Gyökérok A:** a gyors döntés az egységet és a dimenziót ellenőrizte, de az explicit feliratszemantikát nem; így a `0,50 m ereszkiülés` bármely mm-es célmezőbe automatikusan bekerülhetett. Most az explicit `ereszkiülés` és `homlokzati kiülés` csak a megfelelő célmezőkkel automatikus; az ellentmondó párosítás a gyorssávban forrás–cél–egység–régi→új összegzést és külön jóváhagyást kap. A kézi felülbírálás provenance-ben megmarad.
- **Gyökérok B:** a feliratkoppintás kizárólag az aktív gyors célmezőt nézte, a befejezett, de még össze nem kapcsolt mérésnek nem adott elsőbbséget. A kalibráció/mérés indítása most semlegesíti a célmezőt; aktív mérési munkaterületen az össze nem kapcsolt felirat csak mérési forrásként jelölhető ki. Explicit felirat–mérés kapcsolat esetén a meglévő 10×/100× konfliktuskapu változatlanul működik.
- **Közös kapu:** a közvetlen és a külön jóváhagyott gyors út is az `approveDrawingFields` validációján halad át. Bármely nem üres meglévő érték, az explicit `0` is, külön jóváhagyást igényel. Jóváhagyáskor a célmező friss állapota újraellenőrződik; megszakítás nem ír adatot. A biztonságos üresmezős gyors út és az automatikus, látható következőmező-kiválasztás megmaradt; ha nincs következő mező, a cél semlegesre áll.
- **Provenance és életciklus:** forrásdokumentum, oldal, pozíció, keret, egységeredet, felülírás, szemantikai felülbírálás, szakasz/SHA-kötött visszavonás megmaradt. Oldal-, forrás- és szakaszváltási érvénytelenítéshez, kalibrációhoz és munkamenethez nem került új párhuzamos állapotgép.

### Futott ellenőrzések

- RED reprodukció: 4 várt bukás, köztük `500 mm` szélesség és `10 000 mm` hátsó kiülés.
- Célzott komponens/domain: **2 fájl / 57 teszt PASS**; kapcsolódó kalibráció, részletes átvitel, mixed-unit, számítás, munkamenet és kalkulátorváltás: **6 fájl / 94 teszt PASS**.
- Teljes regresszió: `npm test` → **222 fájl PASS, 8 skipped; 1506 teszt PASS, 19 skipped; 0 fail**.
- `npx tsc --noEmit -p tsconfig.typecheck.json` PASS; célzott ESLint PASS.
- Élő QA, bejelentkezett `localhost:3000`, `roof-workflow-p31-demo.pdf`: 375×812-en az A eset értéke üres maradt a jóváhagyásig, a B esetben a hátsó kiülés üres maradt és a felirat a mérési kapcsolathoz jelölődött ki. A normál `10,00 m` → `10 000 mm` gyors út és a visszavonás PASS. 812×375-ben a gyorssáv saját függőleges görgetésével mindkét 44 px-es művelet elérhető; 1440×900-ban a panel teljesen látható. Vízszintes dokumentum-túlcsordulás és böngészőkonzol-hiba nincs.

**Korlát:** a felirat jelentése csak explicit, bizonyítható címkeszavaknál ellenőrizhető; címke nélküli vagy szakmailag többértelmű számot a rendszer továbbra sem minősít találgatással. Az M12.2 OCR műszaki pontossági kapuja továbbra is BLOCKED. A teljes P3.1 DEMO újrajátszása nem szükséges; a C.2/F.1 célzott biztonsági kör és a normál gyors út megismétlése megtörtént.

**Javasolt Conventional Commit:** `fix(P3.2): gate risky drawing quick transfers and prioritize active measurement`.

## P3.0.1 — T10.1 célzott stabilizálás (2026-10-31)

**Státusz: PASS. Alkalmazáskód nem módosult** — a célzott ellenőrzések nem tártak fel bizonyított hibát, így a „csak bizonyított hibára javíts” szabály szerint csak tesztek készültek.

Új: `construction-suite-drawing-entry.test.tsx` — **9 eset a VALÓDI `ConstructionCalculatorSuite`-on** (`organizationId`/`userId` nélkül a mentési és átvételi panel nem renderelődik, így a Supabase-határ kimarad; a szerveroldali action-lánc mockolt).

| Ellenőrzés | Eredmény |
|---|---|
| Rajz megnyitása konkrét kalkulátor kiválasztása nélkül | PASS — a panel csukva indul, a belépési pont nyitja, a rajz betölthető |
| Korábbi, kalkulátorból induló folyamat | PASS — változatlan (lista felirat, elrendezés, csukott panel) |
| A→B→A: rajz, oldalválasz, szakasz | PASS — megmarad, a lap típusát nem kérdezi újra |
| Kalkulátorspecifikus mezőérték izolációja | PASS — B-ben nem jelenik meg, A-ba visszatérve visszajön |
| Object URL kalkulátorváltáskor | PASS — nem kerül visszavonásra, a kép forrása él |
| „Új kalkuláció” megerősítés | PASS — megnevezi a tervrajzot és a tetőszakaszt; elfogadás után a dokumentum elengedve, URL felszabadítva |
| Elutasított megerősítés | PASS — a rajz érintetlen, nincs felszabadítás |
| Dokumentumbezárás | PASS — Object URL felszabadul |
| Forráscsere | PASS — az előző URL felszabadul, az új él |
| Kalibráció oldal-/SHA-kötése kalkulátorváltáson át | PASS — az 1. oldalra igazolt lépték a váltás után is igazolt, a 2. oldalon a lépéssáv „nem kötelező” |

**Valódi, szintetikus kétoldalas DEMO PDF (böngésző, bejelentkezve, tényleges pdfjs-lánc):** kézzel épített PDF érvényes xref-fel, Helvetica szöveggel. Szövegkinyerés oldalanként helyes (1. lap: „17,00 m”, „8,20 m”; 2. lap: „5,00 m”), a canvas ténylegesen kifestve (1608 / 781 nem-fehér pixel), hiba nincs. A rajztípus **oldalanként külön** kérdés — az 1. lap „Tetőterv” válasza nem szivárgott a 2. lapra. Kalkulátorváltás után a 2. oldalon maradt, mindkét oldalankénti válasz és az előnézet megőrződött.

**NOT TESTED:** a kalibráció vászonra rajzolásának *élő böngészős* végigvitele (az overlay szintetikus egéreseményekkel nem vezérelhető megbízhatóan) — automatizált teszttel viszont fedett, lásd fent. Production build továbbra is **NEM FUTOTT** (dev szerver birtokolja a `.next`-et).

`npm test` → **222 fájl / 1504 teszt PASS**, 19 skipped, 0 fail. `tsc` PASS, `eslint src/features/calculators` PASS, `git diff --check` tiszta.

## P3.0 — S2–S5 + T10: „Rajzból indítok", dokumentumközpontú belépés (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A rajz dokumentum-, oldal- és szakaszgeometriai állapota túléli a kalkulátorváltást, és új, rajz-elsődleges belépési pont került a kalkulátorfelületre. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet v1–v3 séma, kalibráció, egységkezelés, forráskövetés és minden jóváhagyási kapu **változatlan**; adatbázis és migráció nem érintett.

### A terv egy állítása tévesnek bizonyult

A `DRAWING_STATE_REDESIGN_PLAN.md` szerint a `key={selectedId}` „a T10 egyetlen valódi akadálya". **Nem az.** A `loadConstructionCalculatorDefinition` mindig aszinkron (`await import`), ezért minden `setSelectedId` után legalább egy commitban `loadedDefinition.id !== selectedId`, és a `workspace` a betöltő `<div>`-et rendereli — a `drawingTransfer` **egyáltalán nem renderelődik**. A panel tehát a kulcstól függetlenül is unmountolt. Ez zárja ki azt a megoldást, amely csak a kulcsot veszi ki; az állapot felemelése nem opcionális, hanem kikényszerített.

### Architektúra: állapotfelemelés, a törzs átírása nélkül

`useDrawingDocument` (`use-drawing-document.ts`) tartja a **D + P + S-geo** csoportot és az erőforrás-életciklust (`abort` ref, `imageUrl` felszabadítás). A hook értéke **egyetlen `doc` propként** megy le, és a panel tetején **ugyanazokkal a változónevekkel** destrukturálódik, ezért a `plan-field-transfer.tsx` ~800 soros törzse **egyetlen sorban sem változott**. Context, összevont reducer és modulszintű dokumentumtároló **nem készült**.

- **C + U izoláció:** a `key` marad, tehát a kalkulátorspecifikus és átmeneti állapot nullázását továbbra is a **szerkezet** garantálja, nem írott resetszabály.
- **S2:** a `DrawingRoofSection` típusa és az exportszerződés **nem változott**; a `data` kalkulátoronként él a tiszta `retargetSectionData`-n keresztül (geometria marad, `data` cserélődik, a távozóé eltéve).
- **S3:** tiszta mozgatás, a 84 meglévő panelteszt **módosítás nélkül** zöld maradt.
- **S5:** új, explicit elengedési pont (`releaseDocument` + `documentEpoch` a kulcsban) az „Új kalkuláció"-nál és másik mentett kalkuláció munkamenetének betöltésekor; az „Új kalkuláció" megerősítése **megnevezi** a rajz és a szakaszgeometria elvesztését.

### T10 folyamat

„Kalkulátort választok" (változatlan) · „Rajzból indítok": tetőanyag-kimutatás előválasztása **kérdés nélkül**, nyíló rajzpanel, asztali nézetben rajz-elsődleges elrendezés, a kalkulátorlista „Mit szeretnél kiszámítani?" feliratra vált. A rajztípus-kérdés, a szakaszkezelés és a T7 vezetett bekérés a meglévő úton fut; új kalkulátor, felismerőmotor és űrlapmotor **nem készült**.

### Tesztek (FUTTATVA, 2026-10-31)

`npm test` → **221 fájl / 1495 teszt PASS**, 19 skipped, 0 fail. `npx tsc --noEmit` PASS, `npx eslint src/features/calculators` PASS, `git diff --check` tiszta. Új: `drawing-calculator-switch.test.tsx` (6 eset — `retargetSectionData` geometriamegőrzés / A→B→A körút / nem járt kalkulátor; valamint rajz túlélése, C-csoport nullázása, szakasz megmaradása valódi panellel).

**Production build: NEM FUTOTT** — a fejlesztői szerver használja a checkout `.next` könyvtárát (`AGENTS.md`).

### Élő böngészős QA — FUTOTT (bejelentkezett, DEMO-kép injektálva)

`localhost:3000/kalkulatorok`, 1440×900 / 375×812 / 812×375. Kalkulátorváltás után a `blob:` URL **azonos, él és a kép renderelődik** (`fetch` ok, `img.complete`) — a terv első számú kockázata (visszavont élő Object URL) bizonyítottan nem áll fenn. A↔B↔A körútban a fájlnév, a lapválasz („Tetőterv") és a „Tetőszakasz 1" a nevével megmaradt. Mobilon nincs vízszintes túlcsordulás, a belépési gombok 46 px magasak.

**Mobil javítás QA közben:** a feladatválasztót eredetileg a rajz alá rendeztem, ami 375 px-en ~3900 px-rel lejjebb, gyakorlatilag elérhetetlen helyre került; a rajz-elsődleges sorrend most csak asztali nézetben hat.

### Ismert korlátok

- A **szakaszkezelés továbbra is csak a `roof.material-takeoff`-ban aktív** — más kalkulátorra nem általánosítottuk. Másik kalkulátorban a szakaszcsík eltűnik, de az állapot megmarad és visszatéréskor visszajön.
- Ha a rajzot nem a tetőanyag-kimutatásban nyitják meg, majd oda váltanak, **nem jön létre automatikusan szakasz** — az „Új tetőszakasz" gombbal hozható létre.
- A T10 belépési pontra **nincs automata teszt**, csak böngészős bizonyíték; a nem prezentációs logika (életciklus, szakaszadat) tesztelt.
- Oldalfrissítés után a rajz **nem áll vissza** — nincs hozzá perzisztencia, és ilyet nem is ígér a felület.

## P2.9 — T7: hiányzó kötelező adatok vezetett bekérése a rajz mellett (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A vezetett hiányzóadat-bekérés **megvalósult**. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció, egységkezelés, forráskövetés, szakaszizoláció és minden jóváhagyási kapu változatlan. S2–S5, T10, adatbázis és képletek érintetlenek.

- **Sorrend egyetlen tiszta függvényben:** `guidedDrawingFieldKey` (`drawing-field-transfer.ts`) — **tetőforma → hiányzó kötelező méretek → megmaradt alapértékek**, `""` ha nincs mit kérni. A tetőforma azért előzi meg a többit, mert ő dönti el, mely mezők léteznek egyáltalán (`isFieldVisible`). A függvény csak sorrendet mond; mindkét listát a meglévő `missingRequiredDrawingFields` és `unconfirmedDrawingAssumptions` állítja elő, így a láthatóság és a validáció szabálya nem változott.
- **Egy döntéshozó:** a `cededFieldKey`-t a `ConstructionCalculatorSuite` számolja, és **propként** adja a panelnek (`cededFieldKey`), amely már nem találgat. Az űrlap ugyanezt a mezőt helyettesíti az „A rajz mellett adod meg →” sorral, tehát egy mezőnek továbbra is egyetlen aktív szerkesztési helye van.
- **Nincs új blokk:** a bekért kötelező mező a meglévő „Még szükséges” figyelmeztetésen **belül** jelenik meg, egy „Következő adat: <név> (<egység>)” sorral. Új űrlapmotor, új mezőállapot nem készült; a `renderField`, `LengthField`, `values`, `lengthDrafts` és a meglévő validáció működik.
- **Továbblépés feltétele:** a mező addig marad bekérve, amíg a meglévő validáció szerint nem rögzült érvényes érték — ez nem új logika, hanem következmény: érvénytelen szövegre a `LengthField` üres kanonikus értéket ad, így a mező hiányzó marad. Érvénytelen vagy félbehagyott szöveg nem vész el, a hibaüzenet mellette látszik.
- **Visszalépés:** amint egy mező értéke rögzült, visszakerül a kalkulátorűrlapra az értékével és egységével együtt, és ott módosítható; az űrlapon maradó mutató sor gombja a panelt is kinyitja, ha össze volt csukva.

### Tesztek (FUTTATVA, 2026-10-31, `test-runner` subagent)

`npx vitest run src/features/calculators src/components/ui` → **34 fájl / 335 teszt PASS**; `npx tsc --noEmit` PASS; `npx eslint src/features/calculators src/components/ui` PASS. Célzott ellenőrzés, nem teljes regresszió.

Új esetek: `drawing-field-transfer.test.ts` +4 (sorrend: tetőforma elöl, hiányzó kötelezők, maradék alapértékek, üres eredmény); `plan-field-transfer.test.tsx` +6 a valódi `LengthField`/select renderelővel (egyszerre egy mező névvel és egységgel; érvénytelen bevitel nem lép tovább és nem vész el; érvényes érték továbblép a kalkulátor saját egységében; tetőformaváltásnál csak látható mező kérhető be; teljes kitöltésnél nincs üres kártya és nincs „Még szükséges”; új szakasz saját vezetett bevitellel indul, a másik szakasz értéke nélkül).

### Élő böngészős QA — FUTOTT (bejelentkezett, DEMO-adat, 375×812)

A felhasználó bejelentkezett munkamenetében, a már futó dev szerveren (`localhost:3000`), `synthetic-scale-drawing.pdf` DEMO fixture-rel (fájlinjektálás `fetch` + `DataTransfer` + `change` eseménnyel; a natív OS-dialógus nem vezérelhető).

| Ellenőrzés | Eredmény |
|---|---|
| Egy aktív szerkesztő | A teendők blokkban mindvégig **pontosan 1** vezérlő; duplikált `id` **nincs** egyetlen lépésben sem. |
| Sorrend | Tetőforma → „Következő adat: Tető hossza (mm)” → „Tető szélessége (mm)” → „Tetőhajlás (°)” → maradék alapértékek. |
| Érvénytelen bevitel | `12x` beírásakor a bekért mező **nem váltott**, a szöveg megmaradt, a hibaüzenet mellette látszott („Adj meg érvényes számot…”). |
| Érvényes bevitel | A `1200` rögzülése után a bekérés a következő mezőre lépett, a mező visszakerült az űrlapra. |
| Teljes kitöltés | A vezetett kártya és a mutató sor **eltűnt**; a teendők blokk **762 px → 238 px**-re csökkent. Üres kártya nem maradt. |
| Hely | A vezetett kártya maga 92 px; nincs vízszintes oldaltúlcsordulás. |

- **NEM TESZTELT:** a `blockedReason` („Nem megerősített alapérték…”) **élőben továbbra sem jelent meg**, és most már ismert a pontos oka: csak akkor renderelődik, ha a számítás egyébként menthető, miközben van meg nem erősített alapérték. A vezetett bekérés végigvitele után nem maradt megerősítetlen alapérték, a mentést pedig a hiányzó **anyagcsoport-választás** blokkolta — ez másik kapu, a T7 hatókörén kívül. A kombináció eléréséhez anyagkatalógus-választás kell. Szintén NEM TESZTELT: fizikai eszköz és valódi ujjérintés, 812×375 fekvő nézet, világos téma, és a szakaszizoláció élőben (jsdom-teszt fedi).
- **Javasolt Conventional Commit:** `feat(P2.9): guide the missing required calculator fields one at a time next to the drawing`.

## P2.8 — T7 előkészítés: a kétpéldányos mező bizonyítottan hibás, helyette mezőátvétel (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció, szakaszizoláció és minden jóváhagyási kapu változatlan. A T7 vezetett bekérése **nem** készült el; S2–S5 és T10 nem indult.

### Igazolt: ugyanaz a mező két helyen nem működik együtt

Új, interaktív jsdom-teszt (`src/components/ui/length-field-two-instances.test.tsx`, **4 PASS**) két `LengthField`-et renderel közös szülőállapottal. Ok: a `LengthField` saját belső `useState`-et tart, és a `draftState`-et **csak mountkor** olvassa.

| Eset | Viselkedés |
|---|---|
| Teljes érték beírása | **Átmegy** — a szülő kanonikus milliméterén keresztül. |
| Érvénytelen szöveg (`25x`) | A mező **üres kanonikus értéket küld**, tehát a tárolt érték **törlődik**: a szerkesztett példány mutatja a szöveget és a hibaüzenetet, a másik **kiürül**. Egy mező, két doboz, két különböző tartalom. |
| Mértékegység-váltás | **Nem megy át** (a fizikai méret nem változik, így nincs kibocsátás) — a két példány eltérő egységet mutathat ugyanarra az értékre. |
| Közös piszkozat (`lengthDrafts`) | **Az utolsó író nyer**; kanonikus érték kibocsátásakor a másik példány újraszinkronizál, és eldobja az ott félbehagyott szöveget. |

Ez az adatvesztés nem elméleti: elég érvénytelen szöveget gépelni az egyik példányban, és a kalkulátor értéke eltűnik, miközben a másik dobozban nem látszik hibaüzenet.

### Ezért: mezőátvétel, nem duplikálás

- Amíg a rajzpanel kéri be a soron következő megerősítetlen alapértéket, **az a mező csak ott szerkeszthető**; a kalkulátorűrlap a helyén egy odamutató sort rajzol („A rajz mellett adod meg →”). Így egyetlen példány létezik, egyetlen `id`-val, egyetlen piszkozatíróval — a fenti négy eltérés mindegyike megszűnik.
- **Egy döntéshozó:** a `cededFieldKey` a `ConstructionCalculatorSuite`-ban, a már meglévő `unconfirmedDrawingAssumptions` hívásából. Az űrlap csak olyan mezőt enged át, amit maga is annak tart; a panel is csak azt rajzolja ki. Új mezőállapot és új űrlaprendszer **nem** jött létre.
- **Az S1 `idPrefix` megoldása feleslegessé vált és törölve lett**: átvételnél egyetlen példány van, így az `id` maradhat a mező saját kulcsa, és a `getElementById` alapú mezőfókusz változatlanul a valódi mezőre talál.
- **Elérhetetlenség elleni védelem:** ha a panel össze van csukva, az átvett mező sehol nem lenne szerkeszthető. Ezért a mutató gomb előbb kinyitja a panelt (a `<details>` DOM-nyitása kiváltja a saját vezérelt `onToggle`-ját, tehát nem keletkezik párhuzamos nyitottság-állapot), és csak utána görget.

- **Tesztek (FUTTATVA, 2026-10-31):** `length-field-two-instances.test.tsx` 4 PASS (új); `src/features/calculators` + `src/components/ui` együtt **34 fájl / 325 teszt PASS**; `tsc --noEmit` PASS; `eslint` PASS. Meglévő teszt nem igényelt módosítást.
### Élő böngészős QA — FUTOTT (2026-10-31, bejelentkezett munkamenet)

A felhasználó bejelentkezett a böngészőpanelben (`admin1@testadmin.com`, DEMO TetőPro Kft.); a már futó dev szerver (`localhost:3000`) szolgált ki, szervert nem indítottam és nem állítottam le. A `synthetic-scale-drawing.pdf` DEMO fixture-t a `public/` alól `fetch` + `DataTransfer` + `change` eseménnyel injektáltam a rejtett fájlmezőbe (a natív OS-dialógus nem vezérelhető) — ez a feldolgozási láncot igazolja, nem a fájlválasztót.

| Ellenőrzés | Eredmény |
|---|---|
| Átvétel ténye | A teljes dokumentumban **egyetlen** `roofShape` select van, és az a rajzpanelben; az űrlapon a helyén „Tetőforma · A rajz mellett adod meg →” sor. |
| Duplikált `id` | **Nincs** — a mérést a folyamat minden lépésében megismételtem. |
| Egy kérdés egyszerre | A megerősítendő alapértékek közül mindig pontosan **egy** kap beviteli mezőt (`panelFieldCount: 1`), a többi csak szöveg + elfogadó gomb. |
| Értékkörút | A panelben beírt `50` cm a kalkulátorba került: a mező megszűnt megerősítetlen alapérték lenni, **visszakerült az űrlapra**, és ott az értékét és az egységét is megőrizte (`50`, cm). Az átvétel a következő alapértékre lépett. |
| Érvénytelen szöveg | `12x` beírásakor **egy** példány van, mellette a hibaüzenet („Adj meg érvényes számot, pl. 250 vagy 2,5.”). A kétpéldányos esetben itt ürült volna ki némán a másik doboz — ez a hiba megszűnt. |
| Összecsukott panel | A mutató sor az űrlapon **látható marad**; a gombra kattintva a panel kinyílik és a mező ott van. Az átvett mező sosem válik elérhetetlenné. |
| Mentési kapu | A mentés **tiltott** marad, a „Nem megerősített alapérték” indoklás látszik. |
| Elavult szöveg (T1) | A „3/4 Geometria” hivatkozás sehol nem jelenik meg. |
| Mobil 375×812 | Az alapérték-blokk 362 px, a mutató sor 44 px magas és befér, nincs vízszintes oldaltúlcsordulás. |

Mellékesen élőben is igazolt: a T4 lépéssáv állapotai és a „Következő:” sor, a T5 sorrend (kijelölés gomb a névmező előtt), a T3 „· még szükséges” jelölés a mezőválasztóban.

- **NEM TESZTELT:** a `blockedReason` új, „Teendők és figyelmeztetések”-re mutató szövege (T1) **élőben nem jelent meg**, mert az csak akkor renderelődik, ha a számítás egyébként teljes; ebben a menetben három kötelező méret hiányzott, így az általános „Hiányos kalkuláció” üzenet látszott. Szintén nem tesztelt: fizikai eszköz és valódi ujjérintés, 812×375 fekvő nézet, világos téma, több tetőszakasz közti váltás átvett mezővel, és az átvétel viselkedése kalkulátorváltáskor (ez a T10/S3–S5 hatóköre). Az átvétel űrlapoldali felére továbbra sincs automatizált teszt (nincs harness a `ConstructionCalculatorSuite`-hoz) — most élő QA igazolja.
- **Apró, nem ebben a körben keletkezett észrevétel:** a panelbe átvett `LengthField` placeholder-szövege a szűk mezőben levágódik („nincs meg…”); ez a mező saját `placeholder`-e, nem az átvétel következménye.
- **Következő biztonságos T7-lépés:** az átvétel kiterjesztése a hiányzó **kötelező** mezőkre (`missingRequiredDrawingFields`), továbbra is egyszerre egy mezőre, ugyanezzel az egy-döntéshozós mintával; utána élő ellenőrzés arra az esetre, amikor a számítás teljessé válik (ekkor jelenik meg a `blockedReason` szövege is).
- **Javasolt Conventional Commit:** `fix(P2.8): let the drawing panel take a field over instead of rendering it twice`.

## P2.7 — S1: a kalkulátor mezőrenderelője átadható a rajzpanelnek (T7 előfeltétel) (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A `docs/DRAWING_STATE_REDESIGN_PLAN.md` S1 lépése. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció, szakaszizoláció és minden jóváhagyási kapu változatlan. T7/T10 implementáció nem indult, állapotfelemelés (S3–S5) nem történt.

- **`renderField` prop a `PlanFieldTransfer`-en.** Hiányában a panel pontosan úgy viselkedik, mint eddig — ezt külön teszt állítja. A `ConstructionCalculatorSuite` átadja a saját renderelőjét.
- **Ütköző `id`-k elkerülése — ez a lépés valódi tartalma.** A `renderField` eddig minden mezőre `id={field.key}`-t adott. Ha a panel ugyanazt a mezőt kirajzolná, két azonos `id` keletkezne, és a `document.getElementById(key)?.focus()` alapú mezőfókusz a panelbeli másolatra ugrana (a panel a vászon felett, az űrlap felett van). Ezért a renderelő opcionális `idPrefix` paramétert kapott (alapértéke `""`, tehát a kalkulátor saját űrlapja bitre változatlan), a panel pedig `"plan-"` prefixszel kapja. Nyers `id={field.key}` nem maradt a fájlban.
- **Mellékesen javított latens hiba:** négy helyen `fields.map(renderField)` alakban hívódott a renderelő, ami a `map` indexét adta volna át az új második paraméterként. Mind a négy explicit `(field) => renderField(field)` alakra váltott; `tsc` ezt ki is fogta.
- **Egy renderelési hely, egy kérdés egyszerre.** A prop a „Megerősítendő alapértékek” sorainál jelenik meg, ahol a szöveg eddig is azt mondta, hogy „fogadd el, **vagy add meg a valós értéket**” — de nem volt itt beviteli mező, a felhasználónak el kellett görgetnie. Mérés 375 px-en: a blokk **432 px** mező nélkül, **504 px** csak a soron következő alapértékkel, és **720 px** lenne mind a néggyel. Ezért csak az első, még megerősítetlen alapérték kap mezőt — ez egyben a `DRAWING_WORKFLOW_REDESIGN_PLAN.md` C szakaszának „egy kérdés egyszerre” elvét követi.
- **Tesztek (FUTTATVA, 2026-10-31):** `plan-field-transfer.test.tsx` **40 PASS** (2 új: prop nélkül nincs beviteli mező az alapérték-blokkban és az elfogadó gombok változatlanok; proppal pontosan egy mező jelenik meg, az elsőhöz tartozó, a többinél nem, és az alapérték elfogadása mellette változatlanul működik). Teljes `src/features/calculators` **28 fájl / 306 teszt PASS**; `tsc --noEmit` PASS; `eslint src/features/calculators` PASS.
- **NEM TESZTELT:** a bejelentkezett, valódi alkalmazásbeli folyamat — így az, hogy a panelbeli mező és a lenti űrlap ugyanazt az értéket írja és a `LengthField` piszkozatkezelése (`lengthDrafts`) a két példány között helyesen viselkedik, **élőben nem igazolt**; a jsdom-teszt egy egyszerű stub-mezőt ad át, nem a valódi `renderField`-et. Ez a T7 első körének kötelező ellenőrzése. Szintén NEM TESZTELT: fizikai eszköz, 812×375 fekvő nézet, világos téma.
- **Nyitott kérdés a T7-hez:** két példány ugyanabból a mezőből két fókusz- és piszkozatforrást jelent. A T7 tervezésekor el kell dönteni, hogy a panelbeli bekérés **átveszi-e** a mezőt (és a lenti űrlap elrejti), vagy a két példány együtt él.
- **Javasolt Conventional Commit:** `feat(P2.7): let the drawing panel render the calculator's own field for the next outstanding default`.

## P2.6 — T8: szabálykiemelés a rajzpanelből; a komponensbontás tudatosan elmaradt (2026-10-31)

**Státusz: PASS WITH LIMITATIONS — a T8 eredeti célja NEM teljesült, helyette a kockázatmentes rész készült el.** Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció és minden jóváhagyási kapu változatlan.

### Miért nem komponensbontás lett

A T8 a `PlanFieldTransfer` komponensekre bontását írta elő. A fájl felmérése ezt nem támasztja alá:

| Mérés | Érték |
|---|---|
| Teljes fájl | 841 sor |
| Ebből állapot, effektek és kezelők | **561 sor** |
| Ebből JSX | 279 sor |
| `useState` / `useReducer` / `useEffect` | 20 / 1 / 6 |
| A legnagyobb JSX-blokk (`plan-workspace`: vászon, eszköztár, kalibrációs munkaterület, gyorssáv) | 108 sor, **87 komponens-szintű kötésre hivatkozik** |
| A második (`plan-todo`) | 18 sor, 14 kötésre hivatkozik |

A fájl kétharmada tehát nem JSX, hanem egymásra épülő állapot. A legnagyobb blokk külön komponensként 87 propot igényelne — ez olvashatóbbá nem, csak hosszabbá tenné a kódot, miközben pont azt a hibalehetőséget hozná be (elfelejtett vagy rossz sorrendű prop), ami ellen a T8 védeni akart. Valódi bontáshoz az állapotot kellene átszervezni (context vagy összevont reducer) — az viszont nem refaktor, hanem újratervezés, és a felhasználónak semmilyen előnyt nem ad. **Ezt nem végeztem el; külön döntést igényel.**

### Ami elkészült: három szabály kiemelése tiszta, tesztelt függvénybe

A komponensben három olyan üzleti szabály élt closure-ként, amelyet önmagában nem lehetett tesztelni. Mindhárom változatlan logikával került a saját modulba:

- **`drawingQuickScopeIssue`** (`drawing-field-transfer.ts`) — a gyorsátvitel kapulánca: mit mutat a lap → melyik fedett szakaszhoz tartozik → a méret tényleg a fedett tetőrészé-e. A sorrend szakmailag lényeges, eddig csak a komponensteszten keresztül, közvetve volt ellenőrizve.
- **`activeMeasurementLink`** (`drawing-calibration.ts`) — a P1.4.1 felirat–mérés párosítás érvényességi szabálya (felirat-objektum, dokumentum-SHA-256, oldalszám és a mérés két pontjának referencia-azonossága).
- **`drawingCoverageLabel`** (`drawing-roof-sections.ts`) — a szakasz fedettségének felirata; a „fedett” csak igazolt állapotban mondható ki.

A feleslegessé vált `isRoofDimension` closure törölve.

- **Tesztek (FUTTATVA, 2026-10-31):** **10 új teszt** a kiemelt szabályokra — `drawing-field-transfer.test.ts` 49 PASS (5 új: a kapulánc átengedése, a kérdések sorrendje, a tetőtervnél kihagyott hatókör-kérdés de meg nem kerülhető szakaszkapu, a nem-tetőméretek érintetlensége, a szakaszkapu hiánya szakasz nélküli kalkulátornál), `drawing-calibration.test.ts` 18 PASS (3 új: a párosítás csak változatlan felirat/dokumentum/oldal/mérés mellett él, az azonos koordinátákra történő újramérés is bontja, párosítás vagy kijelölt felirat nélkül nincs állítás), `drawing-roof-sections.test.ts` (2 új). Teljes `src/features/calculators` **28 fájl / 304 teszt PASS** (előtte 294); `tsc --noEmit` PASS; `eslint src/features/calculators` PASS.
- **A T8 elfogadási feltétele teljesült:** a `plan-field-transfer.test.tsx` 38 tesztje **egyetlen módosítás nélkül** zöld maradt — ez igazolja, hogy a viselkedés nem változott. Új állapot és új szabály nem jött létre.
- **Fájlméret:** 841 → **834 sor**. A haszon tehát nem a méret, hanem hogy három szakmai szabály önállóan olvasható és tesztelt lett.
- **NEM TESZTELT:** böngészős ellenőrzést ehhez a körhöz nem végeztem, mert a változás tiszta logikai kiemelés, felületi hatás nélkül; a viselkedés változatlanságát a módosítás nélkül zöld komponenstesztek igazolják. A bejelentkezett alkalmazásbeli folyamat továbbra sem ellenőrzött (a munkamenet nem hitelesített a böngészőpanelben).
- **Javasolt Conventional Commit:** `refactor(P2.6): extract the quick-transfer gate chain, the measurement pairing rule and the coverage label into tested modules`.

## P2.5 — T5: a szakaszlépés a rajzi kijelöléssel kezd, az elnevezés utána jön (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A `docs/DRAWING_WORKFLOW_REDESIGN_PLAN.md` T5 feladata. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció és minden jóváhagyási kapu változatlan.

- **Mi változott:** a „Fedett tetőrész” lépésben a „Szakasz neve” mező a rajzi kijelölés **alá** került. Az új sorrend: cím → „Szakasz kijelölése a rajzon” (+ „Kijelölés törlése”) → a kijelölés eredménysora → **Szakasz neve** → Fedettség → fedettség-igazolás → Kész/Törlés. A lépés címe („Jelöld ki a fedett tetőrészt”) eddig is kijelölés-első volt, az űrlap viszont névvel kezdődött; ez az ellentmondás szűnt meg. A JSX-en belüli sorrendcsere, logikai változás nélkül.
- **A kapuk érintetlenek:** `sectionReady` (`név + kijelölés + fedett + igazolt`) és `canSaveDrawingTakeoff` (`név + igazolt fedettség + elfogadott alapértékek`) változatlan; a fedettség-igazoló jelölő továbbra is csak tényleges rajzi kijelölés mellett engedélyezett (`disabled={!hasSectionSelection}`).
- **Tesztek (FUTTATVA, 2026-10-31):** `plan-field-transfer.test.tsx` **38 PASS** (2 új: (1) a kijelölés gombja dokumentumsorrendben megelőzi a névmezőt; (2) a kapuk megmaradnak — kijelölés nélkül a fedettség-igazolás `disabled` és nincs „Kész”, kijelöléssel + fedettséggel a lépés magától lezár és a scope `coverageConfirmed: true`, majd a lépéssávból újranyitva az alapértelmezett név kiürítése visszaveszi a „kész” állapotot és a scope neve üres lesz). A `drawing-roof-section.test.ts` és `drawing-roof-sections.test.ts` változatlanul zöld. Teljes `src/features/calculators` **28 fájl / 294 teszt PASS**; `tsc --noEmit` PASS; `eslint` PASS a módosított fájlokra.
- **Mobil mérés: nem releváns.** A változás tiszta sorrendcsere — ugyanazok az elemek, ugyanazokkal a stílusokkal; a lépés magassága és szélessége nem változik, ezért külön 375 px-es mérést nem végeztem. Az, hogy a kijelölés gombja így a lépés tetején, görgetés nélkül elérhető-e a valódi oldalon, **NEM TESZTELT** (lásd lent).
- **NEM TESZTELT:** a bejelentkezett, valódi alkalmazásbeli folyamat (ez a munkamenet nem volt hitelesítve a böngészőpanelben, jelszót nem adtam meg), így az új sorrend tényleges használhatósága — különösen az, hogy a felhasználó a rajzra koppintás után kényelmesen eléri-e a névmezőt — élőben nem igazolt. Szintén NEM TESZTELT: fizikai eszköz, valódi ujjérintés, 812×375 fekvő nézet, világos téma.
- **Javasolt Conventional Commit:** `fix(P2.5): ask for the drawing selection before the section name`.

## P2.4 — T9: az oldalválasztó mutatja, mely lapokat válaszoltad már meg (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A `docs/DRAWING_WORKFLOW_REDESIGN_PLAN.md` T9 feladata. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció és minden jóváhagyási kapu változatlan.

- **Mi változott:** a többlapos rajz oldalválasztójának opciói eddig puszta sorszámok voltak (`1`, `2`, `3`); mostantól az adott lap megválaszolt rajztípusát is viszik: `1. · Alaprajz`, `2. · nincs megadva`. Egyetlen JSX-sor; új állapot, új szabály és új mentett adat nincs — a `planKinds` oldalankénti térképét olvassa, amit a panel eddig is vezetett.
- **Az oldalváltás viselkedése változatlan:** a kijelölt felirat, az átvezetési javaslatok, a mérés és a laptípus-szerkesztés ugyanúgy törlődik, mint eddig; ezt a teszt külön állítja, nem csak az új címkéket.
- **Tesztek (FUTTATVA, 2026-10-31):** `plan-field-transfer.test.tsx` **36 PASS** (1 új, többlapos eset: a kezdeti „nincs megadva” mindkét lapon, az 1. lap megválaszolása után csak az 1. lap címkéje változik, a lapváltás eldobja a kijelölést, a 2. lap saját kérdése visszatér, és a 2. lap megválaszolása az 1. lapét nem írja felül). A PDF-mock mostantól a `parsedPdf.pageCount` szerint épít oldalakat; alapértéke 1, ezért a többi teszt viselkedése nem változott. Teljes `src/features/calculators` **28 fájl / 292 teszt PASS**; `tsc --noEmit` PASS; `eslint` PASS a módosított fájlokra.
- **Mért hely (FUTTATVA, élő stíluslap, 375×812):** a `plan-toolbar` magassága **70 px → 98 px (+28 px)**, mert a `<select>` 32 px-ről 162 px-re szélesedik és a sor tördel. Semmi nem csordul túl, az eszköztár nem görget vízszintesen, nincs vízszintes oldaltúlcsordulás. **Ez a költség csak többlapos rajznál jelentkezik**, mert az oldalválasztó egylapos dokumentumnál meg sem jelenik (`pdf.pageCount > 1`) — tehát pontosan ott, ahol az információ hasznos.
- **Ismert átfedés (tudatos):** a becsukott `<select>` az **aktuális** lap állapotát mutatja, amit a P2.3 lépéssáv „A lap” chipje is kiír. A T9 tényleges haszna a **többi** lap állapota, ami csak a lista kinyitásakor látszik; natív `<select>`-nél a becsukott felirat nem rövidíthető külön. Ha a +28 px zavarónak bizonyul, az opciócímke egyetlen sorban rövidíthető.
- **NEM TESZTELT:** a bejelentkezett, valódi alkalmazásbeli folyamat (ez a munkamenet nem volt hitelesítve a böngészőpanelben, jelszót nem adtam meg), így valódi többlapos PDF-fel élőben nem próbáltam ki; a viselkedést jsdom-komponensteszt, az elrendezést a fenti élő CSS-mérés igazolja. Szintén NEM TESZTELT: fizikai eszköz, 812×375 fekvő nézet, világos téma, és a natív `<select>` lenyíló listájának megjelenése mobilon (azt a platform rajzolja).
- **Javasolt Conventional Commit:** `feat(P2.4): show each page's declared plan kind in the drawing page picker`.

## P2.3 — T4: egységes, kompakt lépéssáv a rajzpanelben (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A `docs/DRAWING_WORKFLOW_REDESIGN_PLAN.md` T4 feladata. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció és minden jóváhagyási kapu változatlan. T5–T10 nem indult, nagy refaktor nem történt.

- **Mi készült:** egy `nav.plan-step-bar` („A rajzos kitöltés állapota”) közvetlenül a vászon felett, négy lépéssel: **A lap · Szakasz · Lépték · Mezők**. Minden lépés mutatja a tényleges állapotát, a következő kötelező lépés `aria-current="step"` jelölést és vizuális kiemelést kap, és egy sor mondja ki szövegesen is, mi a következő teendő. A lépésre koppintva oda lehet jutni (laptípus újranyitása, szakaszszerkesztés, Lépték panel, görgetés a mezőkhöz/teendőkhöz) — ez váltja ki a megszűnt „Módosítás” gombokat.
- **A logika külön, tiszta modulban:** `drawing-step-bar.ts` (`drawingSteps`, `nextDrawingStep`), saját teszttel. Nem dönt és nem blokkol semmit, csak jelenti azt az állapotot, amit a panel eddig is kiszámolt. A `plan-field-transfer.tsx` csak a sáv megjelenítésével bővült; komponensbontás (T8) nem történt.
- **A kalibráció opcionális, és ez kódszinten is igaz:** a „Lépték” lépés `optional: true`, ezért **soha nem lehet a következő lépés**, és soha nem teszi befejezetlennek a munkát; állapota „nem kötelező”, illetve „igazolva”. Külön teszt rögzíti.
- **Megszűnt párhuzamos blokkok:** a laptípus külön státuszsora és a szakasz külön státuszsora (ikon + szöveg + „Módosítás”) — ezek tartalmát most a sáv viszi. A szakasz-blokkból **megmaradt** a „Ez az egyetlen szakasz a teljes épület tetejét lefedi.” jelölő, mert az valódi kapu, nem státusz.
- **Semmilyen figyelmeztetés nem veszett el.** A „Teendők és figyelmeztetések” (`plan-todo`) változatlan: hiányzó mezők, laptípus-figyelmeztetés, megerősítendő alapértékek az elfogadó gombokkal, számítási korlát, többszakaszos figyelmeztetés, hibás szakaszadat. A mentési kapu (`canSaveDrawingTakeoff`) és a `construction-suite` saját alapérték-üzenete sem változott. Külön regressziós teszt állítja mindezek jelenlétét a sáv mellett.

### Mért hely (FUTTATVA, élő stíluslap, 375×812)

| Állapot | Magasság |
|---|---|
| Korábbi két státuszblokk (laptípus + szakasz, mindkettő megválaszolva) | **141 px** |
| Új sáv + a megmaradt teljes-tető jelölő, „Következő:” sor **nélkül** | 142 px |
| Ugyanaz a „Következő:” sorral (ez a megvalósított) | **165 px** |

Tehát maga a sáv gyakorlatilag ingyen van (+1 px) ahhoz képest, amit lecserél, és ráadásul a Lépték és a Mezők állapotát is megmutatja, amihez korábban nem volt kompakt jelző; a szöveges „következő teendő” sor **+24 px**. A sáv **tördel, nem vízszintesen görget** (a T3 tanulsága: a `.plan-quick-chips` elrejtett scrollbarja miatt ott a listavégi elemek felfedezhetetlenek voltak) — 375 px-en 2–3 sor, minden chip 44 px magas, mind a sávon belül marad, nincs vízszintes oldaltúlcsordulás. Legrosszabb eset (minden lépés hátravan, hosszú szakasznév): 167 px, 3 sor.

- **Tesztek (FUTTATVA, 2026-10-31):** új `drawing-step-bar.test.ts` **6 PASS** (lépéssorrend, a kalibráció soha nem következő lépés és nem hiányosság, hiányzó mező + megerősítendő alapérték együtt, nevesítetlen vs. kijelöletlen szakasz, szakasz nélküli kalkulátor, többlapos címke); `plan-field-transfer.test.tsx` **35 PASS** (3 új: állapotjelentés és aria-current, a laptípus újranyitása a sávból, valamint a figyelmeztetések/megerősítések/mentési kapu együttes elérhetősége). Teljes `src/features/calculators` **28 fájl / 291 teszt PASS**; `tsc --noEmit` PASS; `eslint` PASS a módosított fájlokra. Meglévő teszt nem igényelt módosítást.
- **NEM TESZTELT:** a bejelentkezett, valódi alkalmazásbeli folyamat (ez a munkamenet nem volt hitelesítve a böngészőpanelben, jelszót nem adtam meg), így a sáv tényleges megjelenése a `/kalkulatorok` oldalon élőben nem látható; a viselkedést jsdom-komponensteszt, az elrendezést a fenti élő CSS-mérés igazolja. Szintén NEM TESZTELT: fizikai eszköz, 812×375 fekvő nézet, világos téma, és a sáv viselkedése aktív kalibrációs pont-koppintás közben (a sáv szándékosan láthatóan marad, szemben a P1.6-ban elrejtett `plan-todo`-val).
- **Javasolt Conventional Commit:** `feat(P2.3): add one compact phase strip to the drawing panel and retire the duplicate status rows`.

## P2.2 — T6: a destruktív megerősítések a design system saját párbeszédébe kerülnek (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A `docs/DRAWING_WORKFLOW_REDESIGN_PLAN.md` T6 feladata. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció és minden jóváhagyási kapu változatlan.

- **Talált állapot:** a `plan-field-transfer.tsx` volt az **egyetlen** hely az alkalmazásban, amely natív `window.confirm`-ot használt; a `requestConfirmation` (`components/feedback/app-interaction-provider.tsx`, `<dialog>` + fókuszcsapda + `danger` tónus + saját „Mégse” felirat) már a ház bevett mintája, ~20 hívási hellyel, köztük magában a `construction-suite.tsx`-ben. Új komponens nem készült, csak a meglévő minta került be.
- **Öt hívási hely, nem négy.** A terv négyet nevezett meg (`:370`, `:375`, `:390`, `:440`); a felméréskor kimaradt az ötödik, a „Fájl és javaslatok elvetése” gomb (`:807`). Mind az öt átállt, `window.confirm` nem maradt a fájlban (ellenőrizve: 0 találat).
- **Szövegek:** minden párbeszéd címet kapott, az üzenet pedig kifejezetten felsorolja, mi **veszik el** és — ahol van ilyen — mi **marad meg** (pl. forráscserénél a szakaszok neve, kézi geometriája és anyagadata). A megerősítő gomb `danger` tónusú és a műveletet nevezi meg, nem „OK”.
- **Megszakítás-szemantika megőrizve:** mind az öt út `!await requestConfirmation(...) → return` alakú, tehát megszakításkor pontosan ugyanúgy semmilyen állapot nem változik, mint a szinkron `window.confirm` mellett. Az `async` átállás nem igényelt átrendezést: mind az öt hívás már eleve `async` függvényben volt, az ötödik JSX-kezelő `void (async () => …)()` alakot kapott.
- **Tesztek (FUTTATVA, 2026-10-31):** `plan-field-transfer.test.tsx` **32 PASS** (a `window.confirm` spy helyett a provider modul mockja, vezérelhető válasszal; két új eset: (1) az „Új rajz megnyitása” megszakításakor a mezőérték, az undo-előzmény, a választott egységek listája és a laptípus-válasz is megmarad — a tényleges betöltés mindhármat törli; (2) az elvetés megszakításakor a rajz megmarad, elfogadás után tisztul, és a párbeszéd a várt címmel és „Elveszik:” kezdetű üzenettel hívódik). Teljes `src/features/calculators` **27 fájl / 282 teszt PASS**; `tsc --noEmit` PASS; `eslint` PASS a módosított fájlokra.
- **Mobil ellenőrzés (FUTTATVA, élő stíluslap, 375×812):** a `glass-confirmation-dialog` a három leghosszabb szövegű esettel: **343×308 / 343×308 / 343×287 px**, mindhárom belefér a nézetbe szélességben és magasságban, a gombok 44 px magasak és a párbeszéden belül maradnak, az üzenet nem csonkul (`scrollHeight === clientHeight`), és nincs vízszintes oldaltúlcsordulás. A mérés a már futó dev szerver (`localhost:3000`, PID 61761) által kiszolgált feldolgozott stíluslappal, a böngészőpanelben készült; szervert nem indítottam és nem állítottam le.
- **NEM TESZTELT:** a bejelentkezett, valódi alkalmazásbeli folyamat (ez a munkamenet nem volt hitelesítve a böngészőpanelben, jelszót nem adtam meg), így az öt párbeszéd tényleges kiváltása a `/kalkulatorok` oldalon élőben nem történt meg — a viselkedést jsdom-komponensteszt, az elrendezést a fenti élő CSS-mérés igazolja. Szintén NEM TESZTELT: fizikai eszköz, valódi ujjérintés, 812×375 fekvő nézet, világos téma, billentyűzetes fókuszcsapda ezekben a konkrét párbeszédekben (a fókuszcsapdát a provider saját, változatlan kódja adja).
- **Javasolt Conventional Commit:** `fix(P2.2): replace the drawing panel's native confirms with the app confirmation dialog`.

## P2.1 — T1–T3: elavult útmutató, a rajzpanel nyitott alapállapota, a mezőválasztó duplikációjának megszüntetése (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A `docs/DRAWING_WORKFLOW_REDESIGN_PLAN.md` T1–T3 feladata. Képlet, domain, Supabase, Auth/RLS, OCR-kapu, mentési szerződés, munkamenet-séma, kalibráció és minden jóváhagyási kapu változatlan.

- **T1 — elavult útmutató.** A mentési panel blokkoló szövege a „Kitöltés tervrajzból” **3/4 Geometria** lépésére hivatkozott (`construction-suite.tsx:562`), amely a jelenlegi UI-ban nem létezik; mostantól a „Teendők és figyelmeztetések” részre mutat. Tartalmi logika nem változott.
- **T2 — a rajzpanel nyitva indul, ha van munka.** A `plan-field-transfer` `<details>` alapból csukott volt betöltött rajz vagy importált munkamenet mellett is. Új `panelOpen` state + egy effekt, amely `file || importedWorkSession || sections.length > 0` esetén **csak bekapcsolja** (a P1.5 kalibrációs panel mintájára), így a felhasználó szándékos összecsukása megmarad.
- **T3 — a terv iránya a mérés alapján megfordult.** A terv a `<select>` eltávolítását és a chipsor megtartását írta elő. Élő, 375 px-es méréssel (lásd lent) ez **bizonyítottan rossz mobilon**, ezért a `<select>` maradt a teljes mezőlista vezérlője, és helyette a **duplikált chipsor** szűnt meg. Logika nem veszett el: a következő hiányzó mezőt a `runQuickTransfer` eddig is magától élesítette (`plan-field-transfer.tsx:264`), a chipsor csak egy redundáns rövidítés volt. A `<select>` opciói mostantól a „· még szükséges” jelölést is viszik, tehát a chipsor egyetlen plusz információja sem veszett el. Egyetlen setter maradt (`chooseTargetField`).

### Mért bizonyíték a T3 irányváltásra (FUTTATVA, élő stíluslap, 375×812)

A már futó dev szerver (`localhost:3000`, PID 61761, ugyanez a checkout — nem indítottam és nem állítottam le szervert) kiszolgálta az alkalmazás feldolgozott stíluslapját; a `.plan-quick-bar` → `.plan-quick-chips` DOM-ot a valódi ősosztály-lánccal (`dashboard-shell` → `dashboard-container` → `plan-field-transfer` → `plan-field-transfer-body` → `plan-workspace`) mértem meg a böngészőpanelben.

| Változat | Chipsor tartalma | Sáv szélessége | Tartalom | Elrejtve | Teljesen látható chip |
|---|---|---|---|---|---|
| Tervezett T3 (minden mező + „Nincs” + „· még szükséges”) | 7 chip | 300 px | 1567 px | **1267 px** | **1** („Nincs · részletes átvitel”) |
| Ugyanaz jelölés nélkül | 7 chip | 300 px | 954 px | 654 px | 2 |
| Korábbi állapot (csak a hiányzó mezők) | 6 chip | 300 px | 801 px | 501 px | 2 |

A `.plan-quick-chips` nem tördel (`flex` + `white-space: nowrap` + `flex: 0 0 auto`) és **elrejti a saját scrollbarját** (`scrollbar-width: none`), ezért a kicsúszott chipek nem felfedezhetők. A magyar mezőcímkék hossza miatt 375 px-en semmilyen chip-variáns nem tartja a teljes listát; a natív `<select>` viszont 300 px-en 44 px magas, nem csordul túl, és egy koppintással a teljes listát megnyitja. A chipsor eltávolítása után nincs vízszintes oldaltúlcsordulás (`documentElement.scrollWidth` 375 = viewport 375).

- **Tesztek (FUTTATVA, 2026-10-31):** teljes `src/features/calculators` **27 fájl / 280 teszt PASS** (ebből `plan-field-transfer.test.tsx` 30, új eset a T2-re: a panel csukva indul rajz nélkül, rajz betöltésekor magától nyit, kézi összecsukás után nem nyit vissza); `tsc --noEmit` PASS; `eslint` PASS a módosított fájlokra.
- **NEM TESZTELT:** a bejelentkezett, valódi alkalmazásbeli folyamat. Ez a munkamenet nem volt hitelesítve a böngészőpanelben, és jelszót nem adtam meg; ezért a T2 nyitott kezdőállapotát és a `<select>`-et **a tényleges `/kalkulatorok` oldalon, bejelentkezve nem láttam** — a T2-t jsdom-komponensteszt, a T3-at a fenti élő CSS-mérés igazolja. Szintén NEM TESZTELT: fizikai eszköz, valódi ujjérintés, 812×375 fekvő nézet, világos/sötét téma ezekre a konkrét változásokra.
- **NEM változott:** rajztípus-kérdés, fedettségi kapu, feliratonkénti egységválasztás, egységkonfliktus-blokkolás, alapérték-megerősítés, szakasz-izoláció, SHA-256 kötés, undo, provenance.
- **Következmény a tervre:** a `DRAWING_WORKFLOW_REDESIGN_PLAN.md` T3 leírása a megvalósítottal ellentétes irányt javasol; a T4 („egységes lépéssáv”) tervezésénél figyelembe kell venni, hogy a `.plan-quick-chips` minta magyar címkékkel 375 px-en nem alkalmas hosszú listára.
- **Javasolt Conventional Commit:** `fix(P2.1): open the drawing panel when work exists, drop the duplicate missing-field chip row and fix a stale step reference`.

## P1.6.1 — a P1.6 élő böngészős QA pótlása (2026-10-31)

**Státusz: PASS.** A P1.6-ban dokumentált "Élő böngészős QA — NEM FUTOTT" korlát ebben a körben megszűnt: a már futó, bejelentkezett dev szerveren (port 3000), a `synthetic-scale-drawing.pdf` szintetikus DEMO rajzzal elvégeztem a teljes élő QA-t. Kódváltozás nem történt — nem volt bizonyított hiba.

- **Fájlfeltöltés a böngészőeszközökkel:** a natív OS fájlválasztó nem vezérelhető a `mcp__Claude_Browser__*` eszközökkel (nincs natív dialógus-kezelés); a `qa-regression` subagent emiatt NOT TESTED-del zárta a funkcionális teszteket. A korlátot megkerültem: a `public/ocr/fixtures/` statikusan kiszolgált (Next.js `public/`), ezért a fájlt `fetch` + `DataTransfer` + `input.files` + `change` esemény kombinációval, a böngészőpanel saját JS-végrehajtásával (nem OS-szintű automatizálással) injektáltam a rejtett `<input type="file">`-ba — ez a feldolgozási láncot igazolja, nem a natív fájlválasztó dialógust.
- **A.  Kalibráció — PASS.** Két független referencia (10,00 m, 6,00 m) megjelölése és megerősítése: "Lépték igazolva a(z) 1. oldalon · a két referencia eltérése 0.32%". Megszakítás (Mégse) a 2. referencia felénél tesztelve: tisztán visszaállt a "Lépték megadása" kiinduló állapotba, adatvesztés vagy hibaállapot nélkül. Megjegyzés: alacsony (100–150%) in-app nagyítás mellett a kézi, képernyőkép-alapú pontkijelölés pixelpontatlansága (néhány px eltérés a 13 px/m-es alapléptéknél) hamis "A két méret nem ugyanazt a léptéket adja" hibát adott — ez a tesztmódszer, nem az alkalmazás korlátja; 175%-os in-app nagyítás mellett a pontos kijelölés stabilan, nagy pontossággal sikerült.
- **B. Mérés — PASS.** Rövid szakasz (4,00 m, ugyanaz, amit a P1.6 szövege is említ) kijelölésekor: "A kijelölt mérés túl rövid a megbízható összevetéshez." — a rendszer helyesen utasítja el. Hosszabb szakasz (6,00 m) mérése: "Mért hossz: 6010 mm" — a kalibrált skálázás helyesen működik. Az eredmény és az "Összekapcsolás a kijelölt felirattal" munkafolyamat közvetlenül a vászon felett jelent meg, görgetés nélkül olvasható.
- **C. Egységkonfliktus — PASS.** Egyértelmű egységű felirat ("6,00 m") esetén tájékoztató jelzés, nem blokkol. Egység nélküli felirat ("1250") "m" egységgel választva: "Az érték nem egyezik a mért hosszal." — a "Javaslat hozzáadása" gomb ténylegesen inaktív (kattintásra nem történt állapotváltozás), amíg a "Tudom, hogy ellentmond a mért hossznak…" checkbox nincs bejelölve. Bejelölés után a hozzáadás sikeres, és az átvezetés-áttekintőben pontosan megjelenik: "Fél fesztáv: 1250000 mm · „1250” (1. oldal, pdf-text, m · általad választva) · mért hossznak ellentmondó, kézi felülbírálás". Az "Eltávolítás" gomb a bejegyzést hiba nélkül törölte, a mező visszaállt "még szükséges" állapotba.
- **D. "Teendők és figyelmeztetések" elrejtés — PASS.** Aktív mérés indításakor (pont-koppintás mód) a blokk eltűnt a DOM-ból; "Mégse" után azonnal visszatért.
- **E. Mobil-first nézetek — PASS.** 375×812: nincs vízszintes túlcsordulás, a mérési munkafolyamat (indítás → két végpont → eredmény) ugyanúgy görgetés nélkül látható a vászon felett, mint asztalin; a lebegő "Ugrás a tetejére" és export gombok nem takarják a vezérlőket. 812×375 (fekvő): kétoszlopos elrendezésre vált (vászon balra, mezőpanel jobbra), nincs átfedés vagy túlcsordulás, az alsó navigáció nem zavarja a tartalmat. Világos téma (375×812, `colorScheme: light`): a kontraszt és a kijelölt felirat kiemelése (narancssárga keret) helyesen látszik, nincs olvashatatlan vagy eltűnő elem.
- **F. UX-metrika (1440×900):** a "Lépték megadása" gomb a vászon alatti, alapból csukott panelban van — ennek eléréséhez 1 görgetés szükséges induláskor. Utána minden aktív lépés (pont-koppintás, hosszbevitel, mérés, összekapcsolás, konfliktus, felülbírálás) közvetlenül a vászon felett, görgetés nélkül zajlik — ez megfelel a P1.6-ban dokumentált "0 görgetés mérés közben" célnak; az egyetlen fennmaradó görgetés a kezdeti panel-megkeresés, nem a tényleges munkafolyamat.
- **Talált hiba:** nincs. A kezdeti "lépték-eltérés" hibaüzenetek a saját, képernyőkép-koordinátás kattintásom pontatlanságából adódtak, nem reprodukálhatók pontos kattintással — ezt kódmódosítás nélkül, a módszer finomításával (nagyobb in-app zoom) igazoltam.
- **NOT TESTED marad:** fizikai eszköz/valódi ujjérintés (két ujjas nagyítás/forgatás), explicit 90°-os forgatás a mérési munkafolyamattal kombinálva, 200%/400% in-app nagyítás kombinálva aktív méréssel (csak 100–175% lett tesztelve), m²/m³ és OCR-bizonytalansági felirat a mérés-összevetéssel kombinálva.
- **Legkisebb, valódi felhasználói értéket adó következő lépés:** a "Lépték megadása" gomb elérését lehetne 1 görgetéssel csökkenteni (pl. a rajz betöltése után automatikusan a Lépték panel nézetéhez görgetve, hasonlóan a P1.5-ben már bevált auto-nyitáshoz) — ez egy kis, célzott UX-javítás lenne egy következő körben, nem történt meg ebben a körben (hatókörön kívül: a brief kifejezetten kérte, hogy ne legyen teljes redesign).

## P1.6 — a kalibráció/mérés munkaterület a vászon mellé kerül, kalibráció alatt kevesebb egyidejű információ (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** Célzott UX-átszervezés `plan-field-transfer.tsx`-ben a P1.5 jelzett, ideiglenes megoldása (auto-nyíló panel + "Ugrás ide" linkek) helyett. Képlet, domain, Supabase, Auth/RLS, OCR-pontossági kapu, mentési szerződés, v1–v3 munkamenet-séma nem változott; a kalibráció reducere (`drawing-calibration.ts`) érintetlen.

- **Felmért fő probléma:** a kalibrációs/mérési interakció (pont-koppintás, hosszbeírás, mért eredmény, felirat–mérés összevetés) a vászon alatt egy messze lévő, alapból csukott `<details>`-ben élt, miközben a kijelölt felirat szerkesztője feljebb jelent meg — ez okozta a P1.4.1 élő QA-ban dokumentált, ismétlődő oda-vissza görgetést. A P1.5 "Ugrás ide" linkekkel csak tüneti kezelést adott.
- **Mit változtattam:** a teljes aktív kalibráció/mérés munkaterület (pont-koppintás hint+Vissza/Mégse, hosszbeírás+mértékegység+Kész, túl rövid/mért hossz, felirat–mérés összevetés, "Összekapcsolás" és "Ugrás a kijelölt felirathoz" gomb) most közvetlenül a vászon felett jelenik meg (`#plan-calibration-workspace`), nem egy távoli panelben. A régi `<details>` panel csak a nem-ismétlődő, ritka műveleteket tartja meg: "Lépték megadása" indítás, "igazolva" összefoglaló, "Méret mérése a rajzon", "Újrakalibrálás" — nincs duplikált tartalom két helyen.
- **Információs sűrűség:** a "Teendők és figyelmeztetések" (`plan-todo`: hiányzó mezők, alapérték-megerősítés, számítási korlát stb.) pont-koppintás vagy aktív mérés közben elrejtve marad, utána automatikusan visszatér — semmilyen figyelmeztetés nem veszik el, csak nem verseng a koppintásra fókuszáló pillanattal.
- **Komponensarchitektúra:** nem bontottam szét a `PlanFieldTransfer`-t külön fájlokra/komponensekre — a meglévő reducer és state újrahasznosítva, csak a JSX-tartalom helye és láthatósági feltétele változott; ez a konkrét UX-javításhoz elegendő volt, új párhuzamos állapot nem jött létre.
- **Mi maradt változatlan:** feliratonkénti egységválasztás, oldalankénti rajztípus-kérdés, fedett/fedetlen/tisztázandó szakaszok, szakaszizoláció, gyors- és részletes átvitel, felülírásvédelem+visszavonás, két független referenciás kalibráció, explicit felirat–mérés összekapcsolás, egységkonfliktus-ellenőrzés és kötelező felülbírálás+provenance, SHA-256+oldalszám kötés, munkamenet export/import.
- **Tesztek (FUTTATVA, célzott kör):** `plan-field-transfer.test.tsx` 29 PASS (a `calibrationPanel` tesztsegéd a mostantól két helyen élő tartalom miatt a teljes dokumentumra szűkítve, nem csak a "Lépték" régióra), `drawing-calibration.test.ts` 15 PASS, `drawing-quick-transfer.test.ts` 9 PASS, `tsc --noEmit` PASS, `eslint` PASS a módosított fájlokra.
- **Élő böngészős QA (375×812, 812×375, 1440×900, világos/sötét, 100/200/400%, 0°/90°) — NEM FUTOTT:** a checkoutban másik munkamenet dev szervere fut a 3000-es porton (saját `.env.local`-lal); ez a munkamenet nem férhet hozzá ehhez a szerverhez anélkül, hogy megzavarná a másik munkamenetet, és új, ütköző szervert az `AGENTS.md` szabálya szerint nem indíthatok a megosztott `.next` miatt. Emiatt a mobil-first elrendezés, a téma- és nagyítás-mátrix, valamint a billentyűzet/fókusz-viselkedés élőben **NEM TESZTELT** — ez a fő nyitott korlát, nem logikai hiba.
- **Előtte/utána:** mérés közben korábban minimum 1 görgetés + 1 kattintás (csukott panel megkeresése és kinyitása) kellett az eredmény/összevetés megtekintéséhez, utána további 1 görgetés vissza a szerkesztőhöz; most az eredmény és az összevetés azonnal, görgetés nélkül látható a vászon alatt, és a szerkesztő felé csak egy opcionális "Ugrás a kijelölt felirathoz" gomb marad. Pont-koppintás/mérés közben eggyel kevesebb, egyidejűleg látható figyelmeztető blokk (plan-todo elrejtve).
- **UX-adósság későbbi körre:** a brief további pontjai (pl. a már elvégzett lépések egységes kompakt státuszjelzővé alakítása a teljes panelen, a figyelmeztetések egységes súlyossági hierarchiája, a `PlanFieldTransfer` tényleges komponensekre bontása) szándékosan kimaradtak ebből a körből — nagyobb, kockázatosabb változások lennének, és élő böngészős ellenőrzés nélkül nem lenne felelős bevezetni őket.
- **Javasolt Conventional Commit:** `refactor(P1.6): move the active calibration/measurement workspace next to the canvas and declutter plan-todo during tapping`.

## P1.5 — a "Lépték" panel és a felirat-szerkesztő közti görgetés csökkentése (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** UX-audit a tervrajzos munkafolyamatra (`plan-field-transfer.tsx`); számítási képlet, domain, Supabase, Auth/RLS, mentési szerződés nem változott.

- **Talált hiba:** a kalibrációs/mérési "Lépték" panel alapból csukott `<details>`, a vászon és a feliratszerkesztő alatt messze lent. A P1.4.1 élő QA-ja (lásd lent) pontosan ezt a mintát dokumentálta: felirat kijelölése → görgetés a Lépték panelhez az "Összekapcsolás"-ért → görgetés vissza a szerkesztőbe a jóváhagyásért.
- **Javítás:** a Lépték panel automatikusan megnyílik, amint a kalibráció aktív, mérés fut, vagy már elfogadott/visszaállított állapotban van (importált munkánál sem kell manuálisan megkeresni); két "Ugrás ide" gomb köti össze a szerkesztőt és a Lépték panelt. A `scrollTo` helper defenzívvé vált (`?.scrollIntoView?.(...)`).
- **Mi maradt változatlan:** kalibráció matematikája, felirat–mérés összekapcsolás szabálya, konfliktusellenőrzés, mobil kompakt elrendezés (P1.2).
- **Tesztek (FUTTATVA):** célzott kör — `plan-field-transfer.test.tsx` 29 PASS, `drawing-calibration.test.ts` 15 PASS; `tsc --noEmit` PASS; `eslint src/features/calculators/plan-field-transfer.tsx` PASS.
- **Élő böngészős QA — NEM FUTOTT:** a checkoutban másik munkamenet dev szervere fut; izolált környezet nélkül nem indítható ellenőrzés anélkül, hogy a megosztott `.next`-et érintené. Az új "Ugrás ide" gombok és az auto-nyitás tényleges scroll-viselkedése ezért NEM TESZTELT élőben.
- **Javasolt Conventional Commit:** `fix(P1.5): auto-open the calibration panel and add jump links to cut scrolling between it and the label editor`.

## P1.4.1 — a felirat–mérés hozzárendelés explicitté tétele, gyorsátvitel, rövid mérés kizárása (2026-10-31)

**Státusz: LEZÁRVA — PASS WITH LIMITATIONS.** A hozzárendelési és gyorsátvitel-logika unit-, komponens- ÉS élő böngészős teszttel (hitelesített munkamenet, szintetikus DEMO PDF, 375×812/812×375) is igazolva lett; részletek lent, a „Végső lezáró ellenőrzés” és az azt követő „Élő böngészős QA — FUTOTT” szakaszban. Fennmaradó, nem blokkoló NOT TESTED tételek: fizikai eszköz/ujjérintés, m²/m³ és OCR-bizonytalansági felirat a mérés-összevetéssel kombinálva. A P1.4 felülvizsgálata egy tényleges hozzárendelési hibát talált: a felirat–mérés összevetés nem a felhasználó explicit párosításán alapult, csak azon, hogy éppen melyik felirat van kijelölve és éppen fut-e egy mérés. Ez a kör ezt javítja, és a gyorsátvitelbe is beköti ugyanazt a logikát.

- **Volt-e tényleges hozzárendelési hiba?** Igen. A `measuredMm`/`labelEvidence` korábban kizárólag abból állt össze, hogy `selected` (a kijelölt felirat) és `calibration.measure` (a legutóbbi 2 pontos mérés) *egyszerre* léteznek — nem abból, hogy a felhasználó ezeket kifejezetten összekapcsolta. Egy korábbi mérés megmaradt volna egy később kijelölt, teljesen más felirathoz is párosítva, kizárólag azért, mert ugyanazon az oldalon, ugyanabban a munkamenetben voltak.
- **Mit módosítottam — hozzárendelés (részletes átvitel):** új, explicit „Összekapcsolás a kijelölt felirattal” lépés a „Lépték” panelben. A pár csak akkor érvényes (`activeLinkFor`), ha pontosan ugyanaz a felirat-objektum, dokumentum-SHA-256, oldalszám ÉS a mérés két pontja (referencia-azonosság) egyezik a párosítás pillanatában rögzítettel — bármelyik megváltozik (új kijelölés, új/törölt mérés, oldal-, dokumentum- vagy szakaszváltás, mert az is kijelölést töröl), a pár automatikusan érvénytelenné válik, új összekapcsolás szükséges.
- **Mit módosítottam — gyorsátvitel:** a gyorsátvitel (`runQuickTransfer`) most ugyanazt az `activeLinkFor` + `measurementConflict` függvényt hívja, amit a részletes átvitel: ha a megkoppintott felirathoz van érvényes, explicit párosítás, és a feloldott egység ellentmond neki, a gyors átvitel NEM hagyja jóvá észrevétlenül — a részletes átvitelbe irányítja (ugyanaz a `review`-útvonal, amit az OCR-feliratok is használnak), nincs párhuzamos szabály. Ha nincs explicit párosítás ehhez a konkrét felirathoz, a gyors átvitel változatlanul fut, akkor is, ha egy másik mérés aktív — ez szándékos, nem hiba (ld. teszt: „never claims measurement backing… even with an active measurement”).
- **Mi maradt változatlan:** feliratonkénti egységválasztás, laptípus-/fedettség-kapu, felülírás-jelölés, undo — mindegyik a `decideQuickTransfer` meglévő döntési láncában, a konfliktusellenőrzés csak az `apply` döntés UTÁN, külön lépésként fut rá.
- **Egyezés vs. ellentmondás vs. kézi, bizonyíték nélküli adat — hogyan különül el:** (1) nincs párosítás → nincs mérésre hivatkozó jelzés sehol, az érték tisztán kézi, auditnyomban nincs `measurementOverride` jelzés; (2) van párosítás, egység a toleranciában → „A mérés a(z) X olvasatot támasztja alá”, nem blokkol; (3) van párosítás, egység kifejezetten ellentmond → blokkol, a checkbox szövege kifejezetten leszögezi, hogy ez **nem** teszi méréssel igazolttá, és az elfogadott érték a bevitel-előnézetben és a „Átvitt értékek forrása” auditlistában is megkapja a „mért hossznak ellentmondó, kézi felülbírálás” jelzést (nem csak egy eltűnő checkbox-állapot). A hétköznapi, konfliktusmentes esetben a jóváhagyások száma nem nőtt.
- **Pontosság — rövid/megbízhatatlan mérés:** az ad hoc (nem-kalibrációs) két-pontos mérés eddig bármilyen rövidségben megbízható mm-értéket adott. Most a kalibráció saját minimális referenciahosszával (`CALIBRATION_MIN_SEGMENT_POINTS`, 100 pt) azonos küszöb alatt a mérés „túl rövid a megbízható összevetéshez” hibát ad, mért hossz nem jelenik meg, bizonyítékot nem képez — nincs második, párhuzamos küszöbérték bevezetve.
- **Tesztek (FUTTATVA):** célzott kör — `plan-field-transfer.test.tsx` 29 PASS (új esetek: hozzárendelés elvesztése más felirat kijelölésénél, túl rövid mérés kizárása, gyorsátvitel blokkolása explicit párosítással, gyorsátvitel változatlan lefutása párosítás nélkül, auditnyom a felülbírálásra), `drawing-calibration.test.ts` 15 PASS; teljes `src/features/calculators` 279 PASS. `tsc --noEmit` PASS. `eslint` PASS a módosított fájlokra. `git diff --check` PASS.
- **Élő böngészős QA — NEM FUTOTT, és miért:** a checkoutban már fut egy másik munkamenet dev szervere, ezért a szabály szerint izolált környezetben kellett volna ellenőrizni. Létrehoztam egy különálló git worktree-t, APFS copy-on-write klónnal a `node_modules`-hoz (gyors, nem igényelt új telepítést), és a szintetikus `synthetic-scale-drawing.pdf` fixture-t is átemeltem. A szerver azonban futás közben helyi Supabase-konfigurációt (`.env.local`) követelt; ennek átmásolását a környezet biztonsági szabálya **elutasította** (érzékeny forrásadat), ezért a próbát nem erőltettem tovább workaround-dal, és a worktree-t eltávolítottam. Emiatt ez a kör is csak a jsdom-alapú komponensteszteken (valós DOM-események, valós állapotátmenetek) igazolt — ez NEM fizikai vagy élő böngészős teszt.
- **NOT TESTED marad:** fizikai eszköz/ujjérintés; élő böngészős 375×812/812×375 nézet ezekre a konkrét új állapotokra (link-gomb, túl rövid mérés, gyorsátvitel-blokkolás); m²/m³ és OCR-bizonytalansági esetek a mérés-összevetéssel kombinálva (a mérés-összevetés csak explicit, egyértelmű egyszámjegyű feliratra érhető el, ami ezeket a típusokat a meglévő `isUnitlessDrawingMeasurement`/`unitEvidence` szabályok miatt eleve kizárja a részletes vagy gyors úton is — ez konzisztens a P1.1–P1.4 szabállyal, de nem lett külön, célzottan újra letesztelve ebben a körben).
- **P1.4 lezárható PASS WITH LIMITATIONS státusszal?** A hozzárendelési és gyorsátvitel-hiányosság javítva és teszttel igazolva; a fennmaradó korlát kizárólag az élő böngészős QA hiánya (a Supabase-env korlát miatt), nem logikai hiba. Éles mobil/böngésző QA-t a következő, erre dedikált körben javasolt elvégezni, amint elérhető egy olyan izolált dev-környezet, amely nem igényli a `.env.local` átmásolását (pl. a másik munkamenet szerverének leállása után, ugyanebben a checkoutban).
- **Javasolt Conventional Commit:** `fix(P1.4.1): require an explicit label-to-measurement link and reuse it in quick transfer`.

### Végső lezáró ellenőrzés (ugyanazon napon, külön kör)

Megismételt kísérlet az élő böngészős QA-ra, majd a teljes regresszió/lint/typecheck/build a már meglévő, fejlesztői szerverre és izolált buildre bontva. Kódváltozás nem történt (nem volt bizonyított hiba).

- **Élő böngészős QA a meglévő, már futó dev szerverrel:** megpróbálva, de blokkolva. A port 3000-en futó szerver minden kérést (bejelentkezés nélkülieket is) 503-cal zár le helyi Supabase-konfiguráció hiányában a middleware-szintű `src/infrastructure/supabase/proxy.ts`-ben — ez a checkout-szintű, folyamatban lévő munkamenettől független, megelőzi a bejelentkezési képernyőt is. A `db:local-auth` script jelszót írna a DEMO felhasználóra (auth-módosítás) és `.env.local`-t generálna — mindkettő tiltott ebben a körben, ezért nem futott. **Eredmény: NOT TESTED, igazolt környezeti korlát, nem megkerülve.**
- **Izolált production build:** FUTOTT, PASS. Külön git worktree-ben (APFS copy-on-write klón a `node_modules`-hoz és az érintett, nem verziókövetett `src/features/calculators`, `src/features/drawings`, `src/infrastructure/drawings` fájlokhoz), `.env.local` bevonása nélkül: `npm run build` (34 route, mind legenerálva) és `npm run typecheck` (`next typegen` + `tsc`) is PASS — a build-idő nem igényel Supabase-titkot, csak a futásidejű middleware.
- **Teljes projekt regresszió:** `npx vitest run` a teljes repóra — **1448 PASS, 19 SKIP, 0 FAIL** (218 fájl; a skip-ek nem e kör változásaihoz tartoznak).
- **Teljes lint:** `npx eslint .` — 12 hiba, mind a `scripts/check-docs.mjs`-ben (`no-undef`), amely a párhuzamos Codex DOCS.1 munka része; nem érintett fájl, nem nyúltam hozzá, nem saját hiba. A P1.4.1 által módosított fájlok célzott lintje külön is PASS.
- **Összefoglaló:** PASS — hozzárendelés/gyorsátvitel/rövid mérés logika (unit+komponensteszt); PASS — teljes regresszió, izolált build, izolált typecheck, célzott lint; FAIL — nincs (nem volt bizonyított hiba, nem történt kódváltozás); NOT TESTED — élő böngészős/mobil interakció (375×812, 812×375, fizikai eszköz), a dokumentált Supabase-env/auth-korlát miatt, amelyet ez a kör sem hágott át.

### Élő böngészős QA — FUTOTT (a felhasználó bejelentkezett a megosztott munkamenetben)

A felhasználó saját maga bejelentkezett a port 3000-en futó, meglévő dev szerveren (`admin1@testadmin.com`), ezzel feloldva az addigi blokkolót `.env.local` másolása vagy auth-módosítás nélkül. Innentől a Claude vezette az interakciókat ugyanabban a böngészőpanelben, a „Szarufa kiszabása” kalkulátor „Kitöltés tervrajzból” paneljén, a `public/ocr/fixtures/synthetic-scale-drawing.pdf` szintetikus DEMO rajzzal (programból a fájlválasztóba injektálva — ez a feldolgozási láncot igazolja, nem az OS natív fájlválasztó-dialógusát, ahogy a brief is kéri). Semmilyen tartós adatot nem mentettem (a kalkuláció mindvégig „Hiányos kalkuláció · helyi előnézet” maradt, `Kalkuláció mentése` nem lett megnyomva).

- **Kalibráció:** 10,00 m + 6,00 m referencia megadva két ponttal → „Lépték igazolva a(z) 1. oldalon · a két referencia eltérése 0.95%”. **PASS.**
- **Túl rövid/megbízhatatlan mérés kizárása:** a rajz „4,00 m” és „1250” méretvonalai ténylegesen rövidebbek az 1:50 léptékű DEMO rajzon, mint a megbízhatósági küszöb (ugyanaz, mint a kalibráció saját min. referenciahossza) — ezt a rendszer élesben, ténylegesen reprodukálta: „A megjelölt szakasz túl rövid a pontos léptékhez” (kalibrációs referenciánál) és „A kijelölt mérés túl rövid a megbízható összevetéshez” (ad hoc mérésnél), mindkétszer helyesen. **PASS** (bónuszként nem szándékolt, de valós reprodukció).
- **Mérés + explicit összekapcsolás:** 6,00 m vonal lemérve (6029 mm, illetve ismételve 6000 mm), a „1250” felirat kijelölve → a Lépték panel helyesen jelezte: „A „1250” felirat még nincs összekapcsolva ezzel a méréssel.” Az „Összekapcsolás a kijelölt felirattal” gombra kattintva az evidencia lista megjelent (✕ mm/cm/m, mind ellentmondó, akár 20 634%-os eltéréssel). **PASS.**
- **10×-es (és nagyobb) egységkonfliktus a részletes átvitelben:** „Fél fesztáv” mezőre, „m” egységgel (1250 → 1 250 000 mm) a „Javaslat hozzáadása” gomb vizuálisan és ténylegesen letiltva, „Az érték nem egyezik a mért hosszal.” figyelmeztetéssel. A felülbírálás-checkbox bepipálása után a gomb újra aktív; hozzáadás után az előnézet-listában a „mért hossznak ellentmondó, kézi felülbírálás” jelzés élesben megjelent. **PASS.**
- **Új kijelölés utáni érvénytelenítés:** másik felirat („4,00 m”) kijelölésekor a Lépték panel azonnal „A „4,00 m” felirat még nincs összekapcsolva ezzel a méréssel.”-re váltott — a korábbi pár nem öröklődött át. Ugyanazon felirat (”1250”) újbóli kijelölésekor, változatlan mérés mellett, a pár automatikusan érvényben maradt (identitás-alapú, nem kér felesleges újra-összekapcsolást). **PASS.**
- **Gyorsátvitel irányítása a részletes szerkesztőbe:** célmező „Gerincemelkedés”-re állítva, „1250” megkoppintva a gyors úton → egységkérdés (nincs rajzi egység) → „cm” válasz → a rendszer NEM hagyta jóvá észrevétlenül, hanem élesben ezt írta ki: „„1250” ellentmond a hozzá kapcsolt mért hossznak (6029 mm). Ellenőrizd a részletes átvitelben.”, és átváltott a részletes szerkesztőre. **PASS.**
- **Gyorsátvitel párosítás nélkül, változatlan működés:** a „10,00 m” felirat (amihez nincs explicit párosítás) a gyors úton simán kitöltötte a „Gerincemelkedés” mezőt 10 000 mm-rel, annak ellenére, hogy egy másik mérés aktív volt a lapon — nincs álkonfliktus proximitásból. **PASS.**
- **Visszavonás:** a fenti gyorsátviteli érték „Visszavonás” gombbal élesben visszaállt üresre („Visszavonva: Gerincemelkedés ismét üres.”). A részletes átvitel „Eltávolítás” gombja is élesben eltávolította a jóváhagyás előtti, felülbírált bejegyzést. **PASS.**
- **375×812 és 812×375:** a teljes flow (fájltöltés, Lépték panel, mérés, összekapcsolás, konfliktusfigyelmeztetés + checkbox) újra végigjátszva mindkét nézetben. Nincs vízszintes túlcsordulás, a figyelmeztető doboz és a checkbox jól tördelve, érthető marad, a rajz a lehető legtöbb helyet kapja, a P1.2-es kompakt elrendezés (tap-sáv a vászon felett) megmaradt. **PASS.** (Megjegyzés: ez emulált nézetméret a böngészőpanelben, nem fizikai eszköz — ujjérintés, két ujjas nagyítás továbbra is NOT TESTED.)
- **NOT TESTED marad:** fizikai eszköz / valódi ujjérintés; m²/m³ és OCR-bizonytalansági felirat a mérés-összevetéssel kombinálva (ezek a típusok a meglévő `isUnitlessDrawingMeasurement` szabály miatt eleve ki vannak zárva az összevetésből, külön nem lett újra igazolva élőben).
- **Végső összefoglaló:** **PASS** — hozzárendelés, 10×-es egységkonfliktus (részletes és gyors úton egyaránt), érvénytelenítés, visszavonás, 375×812/812×375 UX mind élő böngészőben, hitelesített munkamenetben, szintetikus DEMO PDF-fel igazolva. **FAIL:** nincs. **NOT TESTED:** fizikai eszköz/ujjérintés, m²/m³/OCR-bizonytalanság kombinálva a méréssel. **A P1.4 ezzel PASS WITH LIMITATIONS státusszal lezárható**, a fennmaradó NOT TESTED tételek a jövőbeli fizikai/eszközspecifikus QA körébe tartoznak, nem blokkolják a funkció használatát.

## P1.4 — kalibrált mérés és felirat összevetésének becsatolása a részletes átvitelbe (2026-10-31)

**Státusz: PASS WITH LIMITATIONS (unit teszttel és célzott komponensteszttel igazolt; böngészős QA nem futott).** A P1.1-ben már megvolt a kalibráció, a pont-pont mérés és a felirat–mérés kettős-bizonyítékú egységellenőrzés (`unitEvidence`/`settledUnit`), de ez csak a „Lépték” panelben jelent meg tájékoztatásként: a tényleges mezőátvitel (a kijelölt felirat → kalkulátormező folyamat) soha nem nézett bele ebbe az eredménybe. Ez a kör ezt a hiányzó integrációs pontot zárja le.

- **Mit tud most a bádogos:** ha egy felirat kijelölése közben már van kalibrált méréssel igazolt összevetés ugyanarra a feliratra, és az éppen választott egység (rajzi vagy felhasználó által választott) a mért hosszhoz képest súlyos eltérést mutat, a „Javaslat hozzáadása” gomb letiltva marad, és egy rövid figyelmeztetés + külön checkbox kéri a tudatos felülírást („A felirat és a mért hossz közti eltérés ellenére is ezt az értéket adom hozzá.”). A checkbox minden új kijelölésnél, mezőváltásnál, egységváltásnál és új/törölt mérésnél automatikusan visszaáll.
- **Pontosan mit módosítottam:** `drawing-calibration.ts` új, tiszta függvénye (`measurementConflict`) ismétli meg a már létező `unitEvidence` eredményét a tényleges átvitelre választott egységre; `plan-field-transfer.tsx` ezt a kijelölt felirat szerkesztőjébe (`valueSuggestion.sourceUnit`) kötötte be, `addEntry` guard-dal és a gomb `disabled` feltételével. Nincs új állapotmodell, nincs új csomag, a kvantitatív kalibráció/mérés matematikája változatlan.
- **Mikor jelez egyezést/ellentmondást/bizonytalanságot:** nincs mérés vagy nincs kijelölt felirat → nincs jelzés (változatlan viselkedés). Van mérés és kijelölt felirat, de a választott egység a toleranciasávon belül van → nincs blokkolás. Van mérés, és a választott egység kifejezetten a `unitEvidence` tolerancián kívül esik → blokkolás, feloldható explicit jóváhagyással. (A „nincs egyértelmű olvasat” eset — amikor több vagy nulla egység felel meg — változatlanul csak tájékoztatás a Lépték panelben, nem blokkol, mert ott nincs egyetlen „választott” egység, amit konkrétan ellentmondásosnak lehetne nevezni.)
- **Kalkulátorbemenet:** automatikus mentés nincs; a blokkolt érték a felhasználó döntése nélkül nem kerül be, jóváhagyás után a meglévő `approve`/undo folyamat változatlan.
- **Tesztek (FUTTATVA):** `drawing-calibration.test.ts` új esete a `measurementConflict`-ra (egység-specifikus igen/nem, üres bizonyíték, nem-hossz egység); `plan-field-transfer.test.tsx` új komponensteszt a teljes blokkolás→jóváhagyás→átvitel útra. Célzott kör: `plan-field-transfer.test.tsx` 25 PASS, `drawing-calibration.test.ts` 15 PASS; teljes `src/features/calculators` 275 PASS. `tsc --noEmit` PASS. `eslint` PASS a módosított fájlokra.
- **Böngészős/mobil QA:** NEM FUTOTT (a meglévő tap/kalibráció/mérés UX-et a P1.1–P1.3 körök már élőben igazolták; ez a kör csak egy meglévő adatra épülő feltételes blokkolást kötött be, új vizuális elemet a már bevált `plan-alert is-warning`/`plan-check` mintával).
- **Ismert korlát (P1.4.1-ben javítva):** ebben a körben a gyors (egykoppintásos) átvitel útvonala még nem végezte el ezt az ellenőrzést, és a felirat–mérés összevetés sem volt explicit felhasználói hozzárendeléshez kötve. Lásd a fenti P1.4.1 bejegyzést.
- **Javasolt Conventional Commit:** `feat(P1.4): block the detailed drawing transfer when its chosen unit conflicts with the user's own measurement`.

## P1.2 — mobil-first kalibrációs munkafolyamat (UX-stabilizálás) (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A P1.1 kalibrációs prototípus matematikáját és szerződését nem változtatja; kizárólag a mobilos kijelölési UX-et javítja. Formula, domain, kalkulátor-alapérték, Supabase, Auth/RLS, mentési RPC, állapotok száma és a kalibráció különálló tesztelhetősége változatlan; új dependency nincs.

- **Talált hiba:** a pontkoppintás lépéseihez tartozó vezérlők (lépés-hint, pontszámláló, Pont vissza, Mégse) csak a vászon alatt, messze lent, egy alapból zárt `<details>`-ben jelentek meg. Koppintás közben a felhasználónak oda-vissza kellett görgetnie a rajz (fent) és a vezérlők (lent) között. Élőben, böngészős QA-val reprodukálva (`src/features/calculators/plan-field-transfer.tsx`).
- **Javítás:** a pont-koppintási lépéseknél (`markingCalibration`, `measuringCalibration`) egy kompakt sáv jelenik meg közvetlenül a vászon felett (lépés-hint + Pont vissza/Mégse, ill. mérésnél a hint + Mégse), ugyanazokkal a `dispatchCalibration` hívásokkal, új állapot nélkül. A hosszbeírás lépésnél (ahol nincs rajzinterakció) a vezérlők változatlanul a lenti „Lépték” panelben maradnak; a két hely között nincs tartalmi duplikáció. Mellékhatásként az aktív kalibráció UX-je immunissá vált a korábban dokumentált, forgatáskor a `<details>`-t összecsukó kozmetikai hibára, mert már nem onnan él.
- **Nagyobb hely a rajznak:** kalibráció/mérés közben az előnézet `max-height`-ja `min(58svh,44rem)` → `min(78svh,60rem)`-re nő (mért érték 375×812-n: 510px → 686px, kb. +35%).
- **QA (FUTTATVA, élő alkalmazás, izolált git worktree + saját dev szerver, `synthetic-scale-drawing.pdf`):** 375×812 és 812×375 (fekvő, kétoszlopos elrendezés), 100% nagyítás, pontkoppintás+hosszbeírás+pontvissza+mégse, elfogadott kalibráció (0,00% eltérés), mérés (5000 mm, pontos), forgatás aktív kalibráció közben (a sáv látható maradt, a lenti `<details>` dokumentáltan összecsukódott). **NEM TESZTELT:** fizikai eszköz, valódi ujjérintés, két ujjas nagyítás, 200%/400% nagyítás és 90°/180°/270° kombinációk ebben a körben (ezek geometriája a P1.1 QA-ban és a 14 `drawing-calibration.test.ts` tesztben már igazolt, és ez a változás a koordináta-/lépték-logikát nem érinti).
- **Tesztek:** célzott `vitest` (`plan-field-transfer.test.tsx` 20, `drawing-calibration.test.ts` 14 → mindkettő PASS, összesen 37; teljes `src/features/calculators` 271 PASS), `tsc --noEmit` PASS, `eslint src/features/calculators/plan-field-transfer.tsx` PASS.
- **Javasolt Conventional Commit:** `fix(P1.2): surface drawing calibration tap controls above the canvas on mobile`.

## P1.1 — rajzkalibráció és kettős bizonyítékú méretellenőrzés (kísérleti prototípus) (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** Új, elkülönített kísérleti funkció; nem része automatikus adatátvitelnek. Képlet, domain, kalkulátor-alapérték, Supabase, Auth/RLS, mentési RPC nem változott, új függőség nincs. A mentett munkamenet-formátum (v2) sem változott: a kalibráció **nem** kerül bele, a lap bezárásával elvész.

### P0-3 nagyítási/forgatási QA (FUTTATVA, élő alkalmazás, hitelesített helyi munkamenet, szintetikus DEMO PDF)

Minden számot tartalmazó felirat megkoppintva a saját vizuális középpontján, és összevetve azzal, melyik forrást választotta ki a panel:

| Nézet | Nagyítás | Forgatás | Eredmény |
|---|---|---|---|
| 375×812 | 100% | 0° | 11/13 közvetlen találat, 2 kérdés (a `43,38 m` + külön `²` valódi átfedése) — **PASS** |
| 375×812 | 200% | 0° | ugyanaz — **PASS** |
| 375×812 | 400% | 0° | 13/13 közvetlen, az átfedő pár is szétválik — **PASS** |
| 375×812 | 100% | 90° | 9/13 kérdés — lásd lent, nem téves választás |
| 375×812 | 200% / 400% | 90° | 11/13, illetve 13/13 közvetlen — **PASS** |
| 812×375 | 100% | 180° | 11/13 közvetlen, vízszintes túlcsordulás nincs — **PASS** |

Egyetlen esetben sem történt önkényes automatikus kiválasztás, és a kiválasztott forrás mindig a megkoppintott felirat volt. A 90°/100% eset oka mérés szerint nem hiba: a forgatott lap szélességre igazítva **295×208 px**-re zsugorodik (az álló laphoz képest 1,4×-es kicsinyítés), így a méretsorok 12–18 px-re kerülnek egymástól, a 44 px-es érintési célok pedig valóban átfednek. A rendszer ilyenkor kérdez, nem talál. Enyhítés: nagyítás; 200%-tól a kérdések eltűnnek. Ez a fit-to-width viselkedés a P1.1 előtt is így volt; nem a P0-3 hozta be.

### A kalibrációs prototípus

- **Modul (`drawing-calibration.ts`, 251 sor, tiszta függvények + egy reducer):** `distanceInPoints`, `evaluateCalibration`, `measureMm`, `unitEvidence`, `settledUnit`, `canonicalPageSize`, `calibrationReducer`. A panel egyetlen új `useReducer`-t és egyetlen `useState`-et kapott (a most gépelt hossz), nem nyolc különállót.
- **Folyamat:** két pont egy ismert méreten → a valós hossz és egysége → két pont egy **független** második méreten → annak hossza → a rendszer összeveti a két léptéket. Elfogadás csak egyezés esetén.
- **Koordináták:** a pontok oldal-normalizáltak a lap saját, forgatatlan rendszerében (ugyanaz a szerződés, mint a szakaszoverlayé), a távolság PDF-pontban számolódik a lap méretarányával. Ezért a nagyítás soha nem változtatja a fizikai eredményt, az átlós távolság pedig nem torzul.
- **Kapuk:** 100 PDF-pontnál rövidebb referencia (`too-short`), ugyanaz a méret kétszer (`same-reference`), nem pozitív hossz (`invalid-length`), 2%-nál nagyobb eltérés a két lépték között (`scale-mismatch`).
- **Kötés:** a kalibráció a rajz **SHA-256**-jához és az oldalszámhoz kötött. Másik oldalon kiírja, hogy ott nem használható; fájlcserénél, importnál és elvetésnél törlődik.
- **Kettős bizonyíték:** kalibrált lapon a felhasználó megmér egy méretvonalat, és ha közben ki van jelölve egy felirat, a panel kiírja, hogy a felirat száma melyik egységben konzisztens a méréssel. **Nem tölt ki mezőt**, és a felirat–méretvonal összerendelés kizárólag a felhasználóé; semmi nem következtet helyzetből.

### Mért pontosság (FUTTATVA, élő alkalmazás, `synthetic-scale-drawing.pdf`, 375×812, valódi koppintásokkal)

A fixture egzakt: 50 mm valós hossz / PDF-pont (200 pt = 10 m, 120 pt = 6 m, 80 pt = 4 m, 25 pt = 1250 mm).

| Mérés | Eredmény | Hiba |
|---|---|---|
| Két referencia egyezése (200% nagyítás, valódi koppintás) | 0,17% eltérés | elfogadva |
| 4 m-es vonal mérése valódi koppintással | 4037 mm | **0,92%** |
| 4 m-es vonal mérése egzakt koordinátán | 3987 mm | 0,33% |
| Ugyanaz 100% és 400% nagyításon | 3987 mm mindkettőn | **0,00% eltérés** |
| Ugyanaz 90°, 180°, 270° forgatás után és vissza | 3987 mm mindegyiken | **0,00% eltérés** |

**A 10×-es egységhiba kimutatása (élőben):** a `1250` felirat kijelölve, a hozzá tartozó 25 pt-os méretvonal megmérve → mért hossz 1278 mm, és a panel kiírta: `✓ mm: 1250 mm · eltérés 2%` · `✕ cm: 12500 mm · eltérés 878%` · `✕ m: 1250000 mm · eltérés 97680%`, majd „A mérés a(z) mm olvasatot támasztja alá… ez a jelzés nem tölt ki semmit.” A 2% mérési hiba mellett a 10×-es tévedés 878%-os eltéréssel kizárható.

### Az élő QA-ban talált és javított hibák

1. **Mérés közben a feliratgombok elnyelték a koppintást**, ezért a méretvonal vége nem volt megjelölhető, ha felirat esett rá. Javítás: a feliratgombok pontjelölés alatt nem renderelődnek, ugyanúgy, ahogy szakaszkijelöléskor sem.
2. **Forgatás után a kalibráció eltűnt**, mert a forgatás új `sourceDocumentId`-t generál (ismert M12-T6). Javítás: a kalibráció a dokumentum SHA-256-jához kötött, így a forgatás nem érvényteleníti. Igazolva: 3987 mm mind a négy állásban.

### Tesztek (FUTTATVA, 2026-10-31)

Teljes `npx vitest run`: **218 fájl PASS, 8 SKIP; 1440 PASS, 19 SKIP, 0 FAIL** (P0 után: 217 / 1423). Új: `drawing-calibration.test.ts` 14 teszt (pontosság a fixture egzakt geometriáján, 1 px-es elcsúszás 400%-on, elutasítás 100%-on mért elcsúszásnál, rövid/ismételt/érvénytelen referencia, zoom- és forgatásfüggetlenség, átlós távolság, 10× szétválasztása, életciklus), `plan-field-transfer.test.tsx` +3 (elfogadás és nulla mezőátvitel, eltérő lépték elutasítása, mérés és bizonyítás átvitel nélkül). `tsc --noEmit` PASS, `eslint src/features/calculators` PASS, `git diff --check` PASS, **izolált másolatban `next build --webpack` PASS** (34 statikus oldal, 0 hiba; a fő `.next`-et a másik munkamenet dev szervere használja, érintetlen maradt).

### Korlátok és NEM TESZTELT

- A kalibráció **nem bizonyítja** a tetőformát, a fedettséget, a gerincet, az ereszt, és nem állítja, hogy a falméret tetőméret. Nem ad jogot automatikus mezőkitöltésre; a P0-1/P0-2/P0-3 védelmek változatlanul érvényesek.
- Csak egységes léptékű, born-digital rajzterületre érvényes. Torzult, perspektivikus vagy fényképezett lapon, több léptékű részletrajznál az eredmény nem megbízható — a panel ezt kiírja, de **nem tudja felismerni**; a 2%-os egyezéskapu csak akkor fog, ha a két referencia épp eltérő léptékű területre esik.
- Az 1%-os cél a megfelelően nagyított (≥200%), jól kijelölhető born-digital mintára vonatkozik. 100%-on telefonon egy pixel ≈ 2 PDF-pont, ezért ott a kapu inkább elutasít, mint hamis pontosságot adjon.
- **NEM TESZTELT:** fizikai iOS/Android készülék és valódi érintés; két ujjas nagyítás; szkennelt/fényképezett rajz kalibrációja; a kalibráció megőrzése munkamenet-exportban (szándékosan nincs benne); ferde (nem vízszintes/függőleges) referenciák valódi rajzon; OCR-forrás melletti használat.
- A forgatás összecsukja a „Lépték” lenyitót (React újrarendereli a `details`-t) — kozmetikai, nem veszít állapotot.
- **Javasolt Conventional Commit:** `feat(P1.1): add an experimental two-reference page calibration with dual-evidence unit checking`.

## P0 — rajzi adatértelmezés szigorítása: feliratonkénti egység, laptípus-kérdés, 44 px érintési célok (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** A 2026-10-31-i stratégiai technológiai audit P0-1, P0-2 és P0-3 tétele (a jelentés nem került a repóba). Képlet, domain, kalkulátor-alapérték, Supabase, Auth/RLS, mentési RPC és a kézi kalkulátorok nem változtak. A P0-4 (tartós helyi mentés) nincs benne: nyitott termékdöntést igényel.

- **P0-1 – feliratonkénti egység (`drawing-quick-transfer.ts`, `plan-field-transfer.tsx`):** megszűnt a számformátumhoz kötött egységöröklés (`formatUnits`, `unitlessLabelFormat`, `labelFormatName` és a „Megadott egységek” chipsor törölve). Egység nélküli feliratnál minden felirat külön kérdez, és a válasz csak arra a feliratra érvényes. **Ok:** egész számos terven a `mm` és a `cm` írásmódja azonos, ezért egy `1250` (falméret, mm) `cm`-ként átvitt értéke 12 500 mm = 12,5 m lett volna — hihető tetőszélesség, amit a mezőszerződés (`CONSTRUCTION_MAX_LENGTH_MM = 1 000 000`) nem fog meg. A rajzon kiírt egység elsőbbsége, a feliratonkénti felülbírálás és az Undo változatlan. Új, állandóan látható lista a gyorssávban: minden olyan átvitt érték, amelynek az egységét a felhasználó választotta, a forrásfelirattal és az egységgel együtt szerepel (`plan-quick-chosen`), nem csak az eltűnő visszajelzésben. Nincs nagyságrend- vagy méretalapú egységtippelés.
- **P0-2 – a laptípust a felhasználó mondja meg (`drawing-field-transfer.ts`, `plan-field-transfer.tsx`):** a `classifyDrawingPlan` kulcsszófelismerés (`FÖLDSZINTI` + `ALAPRAJZ`) már csak **javaslat**; a hatóköri döntést a felhasználó válasza hozza, oldalanként: Tetőterv / Alaprajz / Metszet / Nem tudom (`drawingPlanKindChoices`). A `requiresRoofGeometryConfirmation` megfordult: **minden olyan lapon kötelező a fedett-tetőrész megerősítés, amelyet a felhasználó nem minősített tetőtervnek** — a meg nem válaszolt lapot is beleértve. **Ok:** korábban csak a felismert „földszinti alaprajz” cím kapott védelmet, így egy máshogy címzett alaprajz, egy szkennelt lap és minden képforrás a nem-tetőanyag tetőkalkulátorokban őrizetlenül jutott a tetőmezőkhöz. A tetőgeometriai mező átvitele a válaszig blokkolt (`quickScopeIssue`); a szakaszkapu (név, kijelölés, igazolt fedettség) a laptípustól függetlenül érvényben van. Tetőtervnél megszűnt a mezőnkénti „nem alaprajzi külső méret” megerősítés, mert ott nincs értelme (korábbi audit T8). A figyelmeztetőblokk szövege a válaszból jön (`drawingPlanWarnings`: alaprajz / metszet / tisztázatlan). A laptípus-válasz új rajznál, importnál és forráscserénél törlődik.
- **P0-3 – érintési célok (`globals.css`):** a rajzi feliratok gombja 44 px érzékelési zónát kap (`.plan-field-transfer-hit::after`, `max(100%, 2.75rem)`), miközben a vizuális kiemelés feliratméretű marad; a korábbi 20 px a WCAG 2.2 AA webes 24 px minimumot sem érte el. A szélesebb zónák a méretláncon átfedhetnek, ezért a koppintás koordinátájából dolgozó `numericSourcesAt` választókérdése **mindkét** átviteli úton megjelenik (korábban csak akkor, ha már volt kiválasztott célmező). A „Miért?” lenyitó 36 → 44 px.
- **P0-3 utólagos javítás – az érintés feloldása geometriával, nem festési sorrenddel (igazolt hiba, a P0-3 hozta be):** a 44 px-es zónák valódi terven vízszintesen és függőlegesen is átfednek; az átfedő sávban az a gomb sül el, amelyiket a böngésző utoljára festette, ami nem feltétlenül a közelebbi felirat. A jelöltgyűjtés toleranciája eddig fix 0,01 oldalegység (≈3,75 px) volt, ezért az ilyen koppintás **0 jelöltet** adott, nem jelent meg a választókérdés, és a rendszer a megkoppintott gombhoz tartozó feliratot vitte át. 20 px-es zónáknál ez a sáv nem létezett. **Javítás:** a `numericSourcesAt` tengelyenkénti toleranciát kap, a `tapSource` pedig a zónához igazítja (22 px / a kirajzolt oldal px-mérete, tehát nagyítással együtt skálázódik), és a feloldott jelölttel dolgozik tovább, nem a megkoppintott gombbal. Így bármely valódi koppintás legalább egy jelöltet ad, két elérhető felirat pedig **mindig kérdés**. Nagy feliratnál a 22 px kissé túlnyúlik a zónán: ez csak több választókérdést okozhat, néma téves hozzárendelést nem.
- **P0-3 utólagos javítás 2. – a jelölt a felirat közepétől mérve (élő böngészős QA-ban derült ki):** a jelölttesztem a felirat `bounds`-át bővítette 22 px-szel, így a tényleges elérés ≈25 px lett. A valódi renderen (375 px-es nézet, 295 px széles oldal) a méretsorok 24,7 px-re vannak egymástól, ezért **minden koppintás kérdéssé vált**, az egyértelmű is. Javítás: a `numericSourcesAt` a felirat **közepétől** mér, zónamérete `max(felirat, reach)` tengelyenként — pontosan a CSS `max(100%, 2.75rem)` zóna. Így az egyértelmű koppintás egy jelöltet ad, és csak a sorok közötti valóban kétértelmű sáv kérdez.
- **P0-3 utólagos javítás 3. – a feliratgomb a feliratra központozva (meglévő hiba P1.1-ből, élő QA-ban mérve):** a gomb `left/top`-ja a felirat bal felső sarkára volt állítva, majd a 20 px-es minimumra nőtt, ezért a látható kiemelés és a zóna ~8 px-rel a szöveg alá/mellé került; a felhasználó a szövegre célzott, a koppintás a szomszédos sor zónájába esett. Javítás: a gomb a felirat közepére pozicionált `translate(-50%, -50%)`-kel, így a szöveg, a 20 px-es kiemelés és a 44 px-es zóna koncentrikus. Regressziós teszt a pozícionálásra is van.
- **Élő böngészős QA (FUTTATVA, 2026-10-31, hitelesített helyi munkamenet a beépített böngészőben, 375×812, szintetikus DEMO terv):**
  - **P0-2:** a laptípus-kérdés megjelenik, válasz nélkül a tetőméret átvitele blokkolt („Előbb add meg, mit mutat ez a lap (1. oldal).”), mező nem íródik. „Alaprajz” válaszra egysoros összefoglaló + figyelmeztetés; „Tetőterv” válaszra (2. oldal) **nincs** hatókör-jelölőnégyzet, és a `4,55 m` közvetlenül átmegy. A válasz **oldalanként** él: a 2. oldalra adott válasz nem oldja fel az 1. oldalt, és visszalépve az 1. oldal „Alaprajz” válasza megmarad.
  - **P0-1:** `17,00` → egységkérdés → m → 17 000 mm; az azonos formátumú `14,50` **újra kérdez**. A 10×-es eset élőben: `1250` cm-ként 12 500 mm (hihető tetőszélesség) — csak explicit válasszal érhető el, a gyorssávban tartósan látszik („Tető szélessége: 12 500 mm · „1250” = mm/cm, általad választva”), és a feliratonkénti egységváltóval 1250 mm-re javítható. Undo visszaállítja az üres mezőt. Kiírt egységnél (`4,55 m`) nincs kérdés, és az érték kikerül a „választott egységű” listából.
  - **P0-3:** a `43,38 m` és a különálló `²` közé koppintva választókérdés jelenik meg mindkét felirattal, néma hozzárendelés nincs; a `43,38 m` kiválasztva „felső index (²/³)” címen elutasítva. Élőben mért zóna: vizuális kiemelés 20×20 px, érzékelési zóna 44×44 px (függőleges szomszédnál 44×25, mert a szomszéd zónája osztozik a sávon).
  - **Két szakasz:** új szakasz üres mezőkkel, undo-előzmény és „választott egység” lista nélkül indul; visszaváltva az első szakasz értékei és listája sértetlenek.
  - **Mobil elrendezés:** nincs vízszintes túlcsordulás (375 px), rajz 419 px + gyorssáv 179 px egy képernyőn, átfedés 0 px; a hiányzó mező („Még szükséges: Tetőhajlás”) és a számítási előnézet működik; az egysoros összefoglalók megőrzik a P1.3-ban egyszerűsített felületet.
- **Böngészős CSS-mérés (FUTTATVA, 375×812 és 812×375, az alkalmazás lefordított CSS-ével):** a rajzi feliratgombok érzékelési zónája **44 px**, a vizuális kiemelés a korábbi 20 px-es feliratméret marad; minden felirat elérhető. A mérés egyben igazolta az átfedést: függőlegesen szomszédos feliratoknál a mért zóna 23–32 px-re csökken, mert a szomszéd nyeri az átfedő sávot — ez a fenti hiba valós megjelenése. A mérés a `synthetic-mixed-unit-plan.pdf` valódi PDF.js `bounds` értékeivel futott, önálló próbalapon (a lap a mérés után törölve); **az alkalmazás saját felülete nem volt elérhető**, mert az `/kalkulatorok` hitelesítés nélkül csak a skip-linket rendereli.
- **Valódi PDF-parse QA (FUTTATVA):** új DEMO fixture `public/ocr/fixtures/synthetic-mixed-unit-plan.pdf` (1. oldal: méretlánc m-ben, nyílászárók cm-ben, falméretek mm-ben, `8,20 m`, `4,0%`, `30x50`, `43,38 m` + külön `2`; 2. oldal: tetőterv) és `drawing-mixed-unit-plan.test.ts`. Valódi `processPdfDocument` parse-on: minden egység nélküli felirat külön kérdez, az `1250` csak explicit válasszal lesz 1250 vagy 12 500 mm, a kiírt egység nem kérdez, a `%`/összetett/m² felirat elutasítva. A lap címe szándékosan ékezet nélküli („FOELDSZINTI”), ezért a kulcsszójavaslat `null` — vagyis a P0-2 előtt ezen a lapon **semmilyen** védelem nem lett volna. A sűrű méretláncot a PDF.js egyetlen spanná vonta össze (`1015 2400 1015 900`), amit a döntési szabály „nem egyetlen, egyértelmű méret” címen elutasít.
- **Tesztek (FUTTATVA, 2026-10-31):** teljes `npx vitest run` **217 fájl PASS, 8 SKIP; 1423 PASS, 19 SKIP, 0 FAIL**. A P0-3 regressziós teszt bizonyítottan fogja a hibát: a javítás nélkül (fix 0,01 tolerancia) elbukik, a javítással átmegy. Korábbi állapot ugyanebben a menetben: 216 fájl / 1420 PASS. Célzott `src/features/calculators` + `src/infrastructure/drawings`: **29 fájl / 279 teszt PASS**. Új/átírt: `drawing-quick-transfer.test.ts` (nincs egységújrahasznosítás: ugyanaz az `1250` csak explicit válasszal lesz 1250 vagy 12 500 mm), `drawing-field-transfer.test.ts` (a `""`/`unknown`/`section`/`floor-plan` lap egyaránt megerősítést kér, a `roof-plan` nem), `plan-field-transfer.test.tsx` (laptípus-kérdés mint első kapu, tetőterv-út megerősítés nélkül, választott egységek listája, egységújrakérdés más feliratnál). `tsc --noEmit -p tsconfig.typecheck.json` PASS, `eslint src/features/calculators` PASS, `git diff --check` PASS.
- **NEM TESZTELT:** képforrás (JPG/PNG) laptípus-kérdése és OCR-útja élőben; fizikai iOS/Android készülék és valódi érintés; két ujjas nagyítás; nagyítás melletti koppintási pontosság (csak 100%-on mérve); kalkuláció tényleges mentése; `next typegen`/`next build` (a fő `.next`-et másik munkamenet dev szervere használja); E-01 vagy bármely valódi ügyfélterv. A `db:local-auth` nem futott: a hitelesítés a felhasználó korábbi, a beépített böngészőben megmaradt munkamenetéből származik, `.env.local` és adatbázis nem módosult.
- **Korlátok:** a feliratonkénti egységkérdés egy koppintással több méretenként, ha a rajzon nincs kiírt egység — ez a tudatosan vállalt ár a 10×-es hiba kizárásáért. A választott egység utólagos módosítása továbbra is csak a legutóbbi átvitelre lehetséges (a lista a többinél csak láthatóvá teszi); a végleges megoldás a kalibrációs kettős bizonyíték (P1-1/P1-2). A laptípus-válasz oldalanként él, de a dokumentumon belüli oldalváltás után újra kérdez.
- **Javasolt Conventional Commit:** `fix(P0): ask the unit per drawing label and the page type per page, and resolve widened label touch targets by tap position`.

## P1.3 — vegyes mértékegység védelme, tervrajzos felület egyszerűsítése, görgetési rétegezési hiba (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** Képlet, adatbázis, Auth/RLS, mentési RPC nem változott; a kézi kalkulátorok és mentési védelmek változatlanok.

- **Vegyes egység (`drawing-quick-transfer.ts`):** az egység nélküli felirat egysége a felirat számformátumához kötött (`unitlessLabelFormat`: egész szám / 1 / 2 tizedesjegy). A felhasználó válasza csak az azonos formátumú feliratokra érvényes; más formátumnál (pl. `17,00` m után `90`) a sáv újra rákérdez, a meglévő választásokat megnevezve. A korábbi, minden egység nélküli feliratra érvényes „Rajz egysége” beállítás megszűnt. A rajzon kiírt egység elsőbbsége, a feliratonkénti felülbírálás és az Undo változatlan. Fokban mért mezőbe egység nélküli szám nem kerül át. A megadott egységek chipként láthatók és egyenként törölhetők. Nincs automatikus műszaki következtetés (nincs méretnagyság-alapú egységtippelés).
- **Görgetési hiba (videó, 2026-10-31 0:19):** a `.plan-quick-bar` `position: sticky; bottom: 0` volt, áttetsző, elmosott felülettel (`--surface-glass` + `backdrop-filter`). Görgetéskor a rajz fölé tapadt (szürke doboz a fehér PDF-en), eltakarta és elnyelte a feliratok érintését, és nem számolt a mobil alsó navigációval (`--app-nav-bar`). Javítás: a rajz saját, korlátozott magasságú görgetési nézet (`max-height: min(58svh, 44rem)`), a sáv közvetlenül alatta normál folyamban, átlátszatlan felülettel; fekvő telefonon a rajz és a sáv egymás mellett, a navigáció fölött.
- **Felület:** fájl nélkül két gomb és egy mondat. Szakaszválasztó chipek állapotikonnal; a „fedett rész” lépés csak hiányos szakasznál nyitott, utána egysoros összefoglaló. Ikonos rajzeszköztár; kompakt gyorssáv (Visszavonás + feliratonkénti egység egy sorban, hiányzó mezők egy görgethető sorban). Összevont „Teendők és figyelmeztetések” blokk; a hosszú magyarázat „Miért?” lenyitóban. A feliratlista, a forrásnapló és a ritka műveletek (export, import, másik rajz, elvetés) lenyitható részben. Megszűnt a négylépéses szöveges útmutató, a dupla feliratlista és az ismételt szakaszmegjegyzés.
- **Tesztek:** `drawing-quick-transfer.test.ts` (vegyes egység), `plan-field-transfer.test.tsx` (vegyes egység, fokmező, frissített egységkérdés). Teljes `npm test` **216 fájl PASS, 8 SKIP; 1419 PASS, 19 SKIP, 0 FAIL**; lint, typecheck, izolált `next build`, `git diff --check` PASS.
- **Böngészős QA (in-app, autentikált helyi dev, szintetikus DEMO alaprajz):** 375×812 sötét, 812×375 sötét, 643 px és 1366×850 világos. Végiggörgetett átfedés-mérés minden nézetben: a gyorssáv és a rajz átfedése 0, a látható feliratokat a sáv nem takarja (150–200 felirat-ellenőrzés nézetenként). Gyorssáv 375×812-ben 200–273 px; rajz + sáv egy képernyőn. Egységkérdés (`17,00` → m), azonos formátum automatikusan (`14,50`), `%` hajlásként és egység nélküli szám fokként elutasítva, m²- és összetett felirat elutasítva, Undo, szakaszok elkülönítése PASS. Vízszintes túlcsordulás nincs.
- **Korlátok:** a globális lebegő kisegítő gomb (`scaling-bubble`, 51×51 px) és a mobil alsó navigáció görgetéskor szándékosan a tartalom fölött marad, és alattuk egy-egy felirat ideiglenesen nem érinthető. Az egész számos felirat két különböző egységben (cm és mm) ugyanazon a terven nem különíthető el formátum alapján (a visszajelzés és az Undo látható). A vegyes egységű E-01-gyel böngészőben nem futtatva; fizikai készülék, két ujjas nagyítás NOT TESTED.
- **Javasolt Conventional Commit:** `feat(P1.3): format-bound units for mixed-unit drawings and a simplified drawing takeoff panel`.

## P1.2 — tetőforma és kiülés megerősítése rajzos tetőszakaszon (2026-10-31)

**Státusz: PASS WITH LIMITATIONS.** Termékdöntés (felhasználó): a nem megerősített alapérték kizárólag a végleges kalkulációmentést tiltja. Képlet, kalkulátor-alapérték, Supabase, Auth/RLS, mentési RPC nem változott; a kézi kalkulátorok működése változatlan.

- **Szabály (`drawing-field-transfer.ts`):** aktív rajzos tetőszakasznál (tetőanyag-kalkulátor, betöltött rajz; nem csak „földszinti alaprajz” címfelismerés esetén) a `roofShape`, `eaveOverhangMm`, `frontGableOverhangMm`, `rearGableOverhangMm` közül a látható, üres vagy kalkulátor-alapértékű mező feltételezés, amíg a felhasználó el nem fogadja (`unconfirmedDrawingAssumptions`). Más beírt vagy átvitt érték explicit. Az elfogadás a mezőértékhez és a tetőformához kötött (`drawingAssumptionToken`); formaváltáskor újra kell. Üres mező elfogadása kiírja a tényleges értéket (nyeregtető, 0 mm), a 0 mm így tudatos érték.
- **Mentés:** `canSaveDrawingTakeoff(scope, unconfirmed)` tiltja; a mentőpanel konkrét okot mutat (`blockedReason`, a „Hiányos kalkuláció” helyett). Az előnézet számol, az eredményrészben „Nem megerősített alapérték” sor sorolja fel a feltételezéseket.
- **UI:** „3/4 Geometria” lépésben elfogadógombok (44 px), a gyorssáv hiányzó-mező gombjai között a kiülésmezők is. Nem támogatott formánál nincs új képlet: „Számítási korlát” sor (félnyeregtető: csak az alsó eresz; konty/sátor/félkonty/L/T/manzárd: nincs külön kiülés, a megadott méret a tető vízszintes vetülete).
- **Munkamenet-fájl:** szakaszonként opcionális `assumptionConfirmations` (v2 marad); megerősítés nélkül is exportálható/importálható; ismeretlen mezőkulcs elutasítva. Az ilyen mezőt tartalmazó új fájlt a korábbi kódverzió nem tölti be.
- **Tesztek:** új/bővített: `drawing-field-transfer.test.ts`, `drawing-roof-work-session.test.ts`, `plan-field-transfer.test.tsx` (+2), `construction-save-panel.test.tsx`. Teljes `npm test` **216 fájl PASS, 8 SKIP; 1416 PASS, 19 SKIP, 0 FAIL**; lint, typecheck, izolált `next build`, `git diff --check` PASS.
- **Böngészős QA (in-app, autentikált helyi dev, szintetikus DEMO alaprajz és DEMO alátétadat, mentés nélkül):** 4 feltételezés listázva; teljes, fedett szakasznál a mentés csak emiatt tiltott, pontos okkal; elfogadás + valós 400 mm után engedélyezett (mentés nem indítva); félnyeregtetőre váltva az ereszkiülés újra kérdés; kontytetőnél korlátsor, lista nincs; rajz elvetése után kézi módban nincs jelzés/tiltás; 375×812-ben nincs túlcsordulás, gombok 44 px.
- **NOT TESTED:** E-01-gyel, fizikai készülék, export-fájl letöltése böngészőben (unit tesztben lefedve), mentés tényleges végrehajtása.
- **Javasolt Conventional Commit:** `feat(P1.2): require confirming roof shape and overhang defaults before saving a drawing section`.

## P1.1 — koppintásos tervrajzi mezőkitöltés (2026-10-30)

**Státusz: PASS WITH LIMITATIONS** (a böngészős QA két hibája javítva, lásd lent). A „Kitöltés tervrajzból” panel új gyors sávja: a felhasználó kiválasztja a kitöltendő mezőt, majd a rajzon a méretfeliratra koppint; egyértelmű, kompatibilis PDF.js-feliratnál ez maga a jóváhagyás, az érték a mentetlen draftba kerül, visszajelzéssel és visszavonással. A részletes, külön jóváhagyásos átvitel változatlanul elérhető (mező nélkül koppintva, illetve minden bizonytalan esetben). Képlet, Supabase, Auth/RLS, mentési RPC nem változott.

- **Döntési szabály (`drawing-quick-transfer.ts`, `decideQuickTransfer`):** csak látható hossz- (mm) és hajlás- (°) mező; OCR-felirat → részletes szerkesztő (M12.2 **BLOCKED**); `%` hajlásként tiltott; egyetlen szám kell, összetett/területi/előjeles/darab felirat elutasítva; a rajzon szereplő egység elsőbbséget élvez, egység nélküli feliratnál a dokumentumegység vagy feliratonkénti felülbírálás, egyik sem → egységkérés (választás után automatikusan átvisz); dimenzióütközés elutasítva; végül a meglévő `approveDrawingFields` mezőszerződés. Tetőgeometriai mezőnél tetőanyag-kalkulátorban név + kijelölés + igazolt fedettség, továbbá szakaszonként egyszeri megerősítés kell, hogy a rajzi méret a fedett tetőrészhez tartozik (alaprajzi külső méret nem válik automatikusan tetőméretté). Átfedő feliratoknál (`numericSourcesAt`) választás kérése.
- **Művelet egy egyértelmű méretre:** előkészítés után 2 (mező kiválasztása + koppintás); a következő hiányzó mezőre ugrás miatt a további méretek 1-1 koppintással. Egyszeri előkészítés szakaszonként: a meglévő név/kijelölés/fedettség lépések + 1 megerősítés; dokumentumonként 1 egységválasztás. Korábban 8–10 művelet/méret.
- **Visszavonás:** veremszerű, lépésenkénti; visszaállítja a korábbi értéket és a korábbi forrásbejegyzést. Csak ugyanabba a szakaszba és ugyanarra a rajzra (SHA-256) ír vissza, és csak ha a mező még az átvitt értéket tartalmazza; szakaszváltás, új/törölt/visszaállított szakasz, PDF-csere, import üríti.
- **Mobil:** a gyors sáv a panelben ragadós (sticky) alsó elem; a hiányzó mezők 44 px-es gombokként, egységválasztás a `LengthField` meglévő 44 px-es szegmensgombjaival; nagyítás 4×-ig (korábban 2×), eltolás görgetéssel. Két ujjas nagyítás nincs.
- **M12.10 kiegészítés:** szakasz mentése után a kalkulátor mentetlennek marad jelölve, amíg rajzi szakaszok vannak nyitva (`construction-suite.tsx`), mert a többi szakasz, kijelölés és PDF csak memóriában él.
- **Tesztkörnyezet:** új dev-függőség `jsdom@30.1.3`, `@testing-library/react@16.3.3` (pontos verzió, `--ignore-scripts`); a kötelező peer `@testing-library/dom@10.4.2` npm által automatikusan települt. Fájlonkénti `@vitest-environment jsdom`; az alapértelmezett környezet változatlan.
- **Tesztek:** `drawing-quick-transfer.test.ts` 6, `plan-field-transfer.test.tsx` 13, `calculator-field-focus.test.tsx` 2. Teljes `npm test` **216 fájl PASS, 8 SKIP; 1407 PASS, 19 SKIP, 0 FAIL** (kétszer futtatva). Egy komponensteszt teljes terhelésnél időzítés miatt egyszer elbukott (kép hash-elése alatt tiltott OCR-gomb); a teszt most megvárja a gomb engedélyezését, globális timeout nem változott. Lint PASS; izolált `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS.
- **Böngészős QA (in-app, autentikált helyi dev):** mezőfókusz billentyűnként PASS. E-01 (valós alaprajz, felhasználói kérésre, csak helyben, 127.0.0.1-ről; repóba/logba nem került): „földszinti alaprajz” jelzés és hiányzó mezők PASS; `17,00`/`14,50` valódi koppintással 17 000 / 14 500 mm, `4,0%` hajlásként elutasítva, lépésenkénti visszavonás PASS; 35°-kal tetősík 300,92 m². **FAIL:** a `12,84 m` + külön `2` span (helyiségterület, m²) hosszként átment; a ragadós gyorssáv 375×812-ben 540 px, 812×375-ben 313 px magas (fekvőben a rajzból 38 px látszik). **Hiány:** ereszkiülés (0 mm) és tetőforma (nyeregtető) alapérték, nem kérdezi meg. Részletek: tesztmátrix P1.1.
- **QA-javítások:** (1) `hasSplitPowerSuffix`: a PDF.js külön spanként adja a felső indexet (`12,84 m` + `2`), ezért a feliratot érintő, a szövegvastagságnál kisebb `2`/`3`/`²`/`³` elem esetén a felirat terület/térfogat; a gyors átvitel elutasítja, a részletes szerkesztő nem ad értékjavaslatot és tiltja a hozzáadást. Helyben az E-01-en pontosan a 14 helyiségterületet jelöli. (2) Gyorssáv: legfeljebb `min(42vh, 20rem)`, belül görgethető; a visszajelzés és a Visszavonás (44 px) a mezőválasztó alatt; a megerősítés pipálás után egy rövid sorrá zsugorodik; 520 px alatti magasságon (fekvő telefon) nem ragad. Újramérve: 375×812-ben 301–320 px, látható Visszavonás; 812×375-ben a rajzból 351 px látszik. Teljes `npm test` **216 fájl PASS, 8 SKIP; 1410 PASS, 19 SKIP, 0 FAIL**; lint, typecheck, izolált build, `git diff --check` PASS.
- **Nyitott:** vegyes egységű terv (E-01: méretlánc m, nyílászárók cm) — „m” dokumentumegységgel egy egész szám (pl. `90`) 90 000 mm lenne; látható és visszavonható, de nincs automatikus védelem. Ereszkiülés/tetőforma alapértéke alaprajznál → P1.2-ben megoldva. Feliratok olvashatósága telefonon.
- **NOT TESTED:** natív fájlválasztó és `confirm` az in-app böngészőben, az E-01-es böngészős újrafuttatás a javítás után (helyi Node-ellenőrzés megtörtént), fizikai iOS/Android, két ujjas nagyítás.
- **Időmegtakarítás igazolása (terv):** 3–5 bádogos, azonos, jogtiszta szintetikus vagy engedélyezett terv (nyeregtető és L alakú tető), saját módszer vs. TetőPro gyors sáv, véletlenszerű sorrend; mért: idő a teljes geometria-bevitelig, koppintás/gépelés száma, téves érték (szakember által ellenőrizve), visszavonások száma. Elfogadás: a rajzos út medián ideje ne legyen hosszabb a kézi gépelésnél, téves átvitt érték 0.
- **Javasolt Conventional Commit:** `feat(P1.1): tap-to-fill calculator fields from drawing labels with undo`.

## M12.10 — stabilizálás: mezőfókusz, szakasztörlés visszavonása, munkaállapot-export, szakaszonkénti mentés (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A [`M12_CLAUDE_AUDIT.md`](M12_CLAUDE_AUDIT.md) T1, T2, T4 és T5 tétele célzottan javítva. DB, mentési RPC, Auth/RLS, képlet és függőség nem változott.

- **T1 – fókuszvesztés (javítva):** a `renderField` `Fragment` kulcsa tartalmazta a mező értékét, így minden értékváltozás újramountolta az inputot. **Bizonyíték:** valódi böngészőben (in-app, React 19.3.0) a pontos kulcsminta izolált, szintetikus reprodukciója valódi billentyűleütésekkel: értékes kulccsal az első `3` után a fókusz `BODY`-ra került, az `5` elveszett (érték `3`); stabil kulccsal `35`, fókusz megmaradt. Az alkalmazás saját kalkulátoroldala auth nélkül nem renderel, ott a fókuszt **nem teszteltem**. Javítás: `calculatorFieldKey(calculatorId, draftEpoch, fieldKey)` (`construction-drafts.ts`), érték nélkül. A külső átvitel (`onApply`, `onSectionActivate`, mentett revízió) továbbra is `draftEpoch`-ot léptet, a `LengthField` a nem egyező draftot továbbra is eldobja; a `discardLengthDraftsForFields` változatlan.
- **T2 – szakasztörlés (javítva):** törléskor a szakasz a legutóbbi szerkesztett adataival (ID, név, oldal, kijelölés, fedettség, mezők, anyag, LengthField-draft, jóváhagyott források) visszavonási verembe kerül; „Visszavonás” a korábbi helyére teszi és aktiválja (`restoreRoofSection`, `plan-field-transfer.tsx`). Új fájl, import vagy forráscsere üríti a vermet; 30 szakasznál a visszavonás tiltott. A veremben lévő szakasz nem része az exportnak.
- **T5 – munkaállapot-export (javítva):** a JSON-munkafájl a munka megőrzésére szolgál, nem a szakmai érvényesség igazolására. Az export/import csak szerkezeti épséget ellenőriz: ismert mezőkulcs, választható/checkbox érték, numerikus mezőben számszerű draft (pl. `85`, `-5`, `35,`), ismert anyagparaméter-kulcs és típus, méret- és darabkorlátok. A tartományon kívüli, negatív, tört vagy egymásnak ellentmondó érték megmarad; a `roofWorkSectionHasInvalidInput` a meglévő mezőszerződéssel és anyagsémákkal külön jelzi, a panel szakasznévvel kiírja, a kalkulátor pedig a betöltés után a szokott módon hibásnak/hiányosnak mutatja. Számítás és kalkulációmentés továbbra is csak érvényes, teljes bemenettel lehetséges.
- **T5 – képforrás (javítva):** a munkafájl formátuma `version: 2`, a forrás `kind: "pdf" | "image"` (képnél 1 oldal) és SHA-256. Képből indított munka is menthető; folytatáskor a kijelölések csak azonos típusú és azonos hash-ű rajzhoz kapcsolódnak vissza, egyébként leválnak, a kézi adat megmarad. A `version: 1` (PDF) fájlok továbbra is betölthetők; v2-ben a `kind` kötelező.
- **T4 – szakaszonkénti mentés (javítva, DB/RPC nélkül):** a mentési feltétel `canSaveDrawingTakeoff`: megnevezett és fedettségében igazolt szakasz, érvényes, teljes számítással; a „teljes tető” megerősítés már csak címke. Minden rajzi szakasz saját mentési sessiont és így saját `calculationId`-t kap (`drawingTakeoffSessionKey`), ezért B szakasz mentése nem lesz A kalkulációjának új revíziója. Az alapértelmezett kalkulációnév a hatókört jelöli: „… · Szakasznév (tetőszakasz, nem teljes épület)”, teljes tető megerősítésekor „… · Szakasznév” (`drawingTakeoffCalculationName`; szerkeszthető). A mentés utáni URL-váltásnál a munkaterület akkor is megmarad, ha egy másik, ebből a munkaterületből mentett kalkulációra vált (`justSavedHere` a korábbi kalkuláció memóriakulcsából másol); ez a nem rajzos, más kalkulátorból mentett új kalkulációra is érvényes.
- **T4 korlátai:** a szakasz hatóköre csak a kalkuláció nevében él, a mentett input snapshotban nincs; a mentett tetőanyag-kalkulációt más kalkulátor átvételkor nem különbözteti meg teljes tetőtől. Ehhez verziózott snapshotmező kell, külön jóváhagyással. A mentetlen-változás jelző kalkulátoronként, nem szakaszonként működik: B mentése után A mentetlen módosításaira nem figyelmeztet.
- **Tesztek:** új regresszió `construction-drafts.test.ts` (kulcs stabil gépelés közben, változik epoch/kalkulátor/mező szerint) és `drawing-roof-sections.test.ts` (visszaállítás változatlan adattal és pozícióval, más szakasz érintetlen, ID nem duplikálódik, pozíció korlátozva). A `drawing-field-transfer.test.ts` mentési feltétel-, session-kulcs- és névtesztje; a `drawing-roof-work-session.test.ts` 12 tesztje (félkész/ellentmondó értékek megőrzése és jelzése, szerkezetileg hibás érték elutasítása, képforrás mentése és hash-alapú visszakötése, v1 import). Teljes `npm test` **213 fájl PASS, 8 SKIP; 1386 PASS, 19 SKIP, 0 FAIL**; lint PASS; izolált másolatban `npm run typecheck` és `npm run build` (Webpack) PASS (a futó dev szerver `.next`-je érintetlen); `git diff --check` PASS.
- **Nem tesztelt:** `PlanFieldTransfer` visszavonás-UI, az export/import fájlválasztó és a képforrásos folytatás, a két szakasz egymás utáni mentése, valamint a kalkulátormezők fókusza az alkalmazásban (nincs DOM-tesztkörnyezet, a böngészős oldal auth-ot igényel); fizikai mobil.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Javasolt Conventional Commit:** `fix(M12.10): keep field focus, undo section deletion, save roof sections separately and export unfinished work`.

## M12.9 — biztonságosan folytatható tető-anyagkigyűjtési munkamenet (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A „Kitöltés tervrajzból” panel explicit JSON exportot és importot ad a `roof.material-takeoff` többszakaszos munkájához. A fájl verziózott, szigorúan validált, legfeljebb 1 MB és legfeljebb 30 szakaszt tartalmaz. Export csak gombnyomásra indul; nincs automatikus böngésző-, felhő- vagy szervermentés.

- **Mentett adatok:** szakaszazonosító és név, tetőforma/geometriamezők, fedettségi jelölés, anyagkiosztás és paraméterértékek, LengthField-piszkozat, oldalszám és normalizált vizuális koordináták, valamint a PDF parser munkamenetazonosítója, helyi SHA-256 hash-e és oldalszáma.
- **Kizárt adatok:** PDF-bájtok, teljes PDF.js/OCR szöveg és tokenlista, forrásfelirat-jóváhagyás, hitelesítési adat, diagnosztika, korábbi számítási eredmény. A kiválasztott profilból feloldott anyagértékek mentéskor kézi paraméterként rögzülnek, így későbbi katalógusváltozás nem cseréli észrevétlenül a használt méretet. Importkor a felhasználónak újra ellenőriznie kell őket.
- **Importvédelem:** formátum/verzió, JSON-méret, szakaszazonosítók, forrásazonosság, pontkoordináták, oldalszám, ismert kalkulátormezők és a meglévő mező-/anyagparaméter-sémák validálódnak. Ismeretlen kulcs, hibás vagy ellentmondó paraméter elutasítva. Korábbi számítás nincs a sémában; az aktív szakasz mezői a meglévő kalkulátormotorral számolódnak újra.
- **Újraellenőrzés:** importkor minden fedettségi jóváhagyás és PDF-hez kötött mezőproveniencia törlődik; `wholeRoofConfirmed` hamis, a kalkuláció nem menthető. PDF nélkül is szerkeszthetők a szakaszok/mezők, de a kijelölés csak visszaválasztott, bájtszinten azonos (SHA-256 és oldalszám egyező) PDF-nél jelenik meg újra; ezt követően is újra meg kell erősíteni a fedettséget és a mezőket. Más PDF elfogadásakor a régi koordináták törlődnek, a kézi geometria és anyagadat megmarad, jóváhagyás nem öröklődik.
- **Adatvédelem/adatvesztés:** a JSON bizalmas munkaméreteket, szakaszneveket és kézi anyagforrás-megnevezéseket tartalmazhat; külön, helyben őrizd. Az eredeti PDF nem része az exportnak. A böngészőmunkamenet továbbra sem tartós, explicit JSON mentés nélkül az adatok elveszhetnek.
- **Tesztelés:** szintetikus session helper regresszió **9/9 PASS**, a kapcsolódó mező/section/takeoff/computation tesztekkel együtt **6 fájl / 101 PASS**. Két szakasz adatköre, hibás/unknown mezők, ismeretlen verzió, manipulált payload, 1 MB limit, PDF nélküli import/újraszámítás, SHA-egyezés, anyagparaméter-konzisztencia és profilértékek ellenőrzése automatizáltan futott.
- **Böngésző:** **NOT TESTED.** A támogatott CUA fájlválasztó korábbi `DOM.setFileInputFiles` timeoutja miatt az export letöltését, importválasztást és fájlcserét nem automatizáltam; kerülőutat nem használtam. Mobil viewport és fizikai iPhone sem lett ellenőrizve.
- **Minőségi kapuk:** teljes `npm test`: **213 fájl PASS, 8 SKIP; 1378 PASS, 19 SKIP, 0 FAIL**; célzott 101 PASS; lint, izolált typecheck, izolált production build/Webpack **PASS**. `git diff --check` a dokumentáció után futtatva. Nincs DB/Auth/RLS/RPC, képlet vagy új dependency módosítás.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Fiókhoz kötött mentés előfeltétele:** szerveroldali új sémát külön döntéssel tervezni, szervezethez kötött jogosultsági/RLS tesztekkel, verzió- és konkurenciakezeléssel, visszaállítási/audit és megőrzési szabállyal; ezen mérföldkőben egyik sem készült el.
- **Javasolt Conventional Commit:** `feat(M12.9): export and resume roof takeoff sessions`.

## M12.8.1 — többszakaszos workflow végső QA és stabilizálás (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A korlátozott böngészős E2E-ben a szintetikus, tagolt alaprajzon két külön rajzi téglalap jelent meg. A/B váltáskor a saját kijelölések megmaradtak; A nyeregtető 6×4 m / 25°, B kontytető 7×5 m / 30° értékei elkülönültek. B-hez külön 60/30 cm faanyag-kiosztást is megadtam. A teljes anyageredmény mindkét szakaszon keresztüli visszaváltás utáni újraellenőrzése, a kijelölés módosítása, törlése és az összes művelet megszakítás nélküli teljes E2E-lánca nem igazolt.

- **Adatvesztés elleni védelem:** meglévő fájl mellett a másik PDF kiválasztása előtt `window.confirm` figyelmeztet a kijelölések, jóváhagyások, szakaszgeometriák, anyagadatok és esetleges aktív kalkulátordraft törlésére; elutasításkor nincs reset. A panel teljes elvetése is megerősítést kér. A megerősítő dialógus elfogadása/elutasítása, PDF A→B és többoldalas oldalváltás **NOT TESTED**: a szintetikus fájlt betöltő UI-automatizálás CDP `DOM.setFileInputFiles` timeouttal megállt, és nem használtam kerülőutat.
- **Fedettség és eredményállapot:** nem igazolt fedettségnél a panel és az anyagkimutatás „nem tetőszakasz-eredmény” / „csak kalkulátor-előnézet” szöveget mutat. A fedettség visszavonásakor az egyező, forrásból jóváhagyott geometria törlődik, a később kézzel módosított érték megmarad; célzott helper teszt ezt igazolja. Fedetlen és tisztázandó választás UI-böngészőben **NOT TESTED**.
- **Böngésző:** sötét témában a támogatott CUA tab tényleges viewportja 1280×720 volt; két PDF-oldali polygon overlay, szakaszváltás és A/B értékmegőrzés ellenőrizhető volt. A kért 375×812, 812×375 és 1440×900 nézet, világos téma, nagyítás/forgatás, törlés és konzolnapló **NOT TESTED** ebben a körben. Fizikai iPhone **NOT TESTED**. A fájlválasztó timeoutja után a konzol lekérése is elérhetetlenné vált.
- **Korábbi 5 s timeoutok:** a 21 ismétléses 1/50/200 terv benchmark 63 teljes workspace-lekérést és többszörös eredmény-ellenőrzést végez; a PDF.js karakterkorlát-teszt 100 001 karakteres PDF-szöveget generál és dolgoz fel. Most a benchmark fájl külön **1,36 s**, a PDF parser tesztfájl külön **1,04 s** alatt futott, és a teljes suite is alapértelmezett timeout mellett sikeres. A korábbi timeout terhelésérzékeny tesztidőzítés; forráskódot és timeout-beállítást nem módosítottam.
- **Minőségi kapuk:** célzott regresszió **4 fájl / 45 PASS**; teljes `npm test` **212 fájl PASS, 8 SKIP; 1369 PASS, 19 SKIP, 0 FAIL**; lint, izolált typecheck, izolált production build/Webpack: **PASS**. `git diff --check`: a dokumentáció frissítése után ellenőrizendő. DB, Auth, RLS és számítási képlet nem változott.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.** A munkamenet kliensoldali és nem tartós; bezárás vagy megszakadás adatvesztést okozhat.
- **Következő indokolt lépés:** csak a fájlválasztó dialógus és teljes szakasz módosítás/törlés E2E újbóli ellenőrzése támogatott böngészővezérléssel, utána a kért viewport/tema QA. Új funkció jelenleg nem indokolt.
- **Javasolt Conventional Commit:** `fix(M12.8.1): protect multi-section drawing workflow state`.

## M12.8 — több vizuális tetőszakasz és szakaszonkénti anyagkigyűjtés (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A meglévő tervrajzpanel egy munkameneten belül több, egyedi azonosítójú és szerkeszthető nevű szakaszt tart nyilván. Minden szakaszhoz külön vizuális kijelölés, fedettség, tetőforma, geometriai draft, anyagparaméter, LengthField-piszkozat és jóváhagyott forrás tartozik. A kijelölés továbbra is két sarkú téglalap; csak vizuális referencia, képpontból sem méretet, sem területet nem számítunk. Több szakasznál kizárólag az aktív szakasz eredménye látható, közös elem és teljes épülettető-összeg nincs.

- **Több szakaszos böngésző-DEMO:** a jogtiszta, szintetikus, tagolt alaprajz PDF.js előnézete és 12 PDF.js szövegeleme betöltődött. Két külön nevű szakaszhoz külön geometria és faanyag-kiosztás tartozott: A főszárny DEMO — nyeregtető, 6×4 m, 25°, 50 cm szarufa- és 30 cm léctávolság: 26 szarufa / 57,376 m összhossz, 17 lécsor / 102 m; B szárny DEMO — kontytető, 7×5 m, 30°, 60 cm / 30 cm: 38 szarufa / 69,924 m összhossz, 41 lécsor / 152 m. A geometriát és kiosztási eredményt a meglévő motor számolta; csak munkameneti előnézet, nem beszerzési lista vagy statikai igazolás. B szárny kijelölése a rajzon látható volt. A szintetikus kiosztási adatok DEMO-paraméterek, nem szakmai ajánlás.
- Szakaszváltáskor B szárny neve, 7×5 m geometria, 30° hajlás, 60/30 cm kiosztás és kijelölés visszaállt; A főszárny saját másik geometriával és kiosztással számolt. A felületen a két szakasz kapcsolata/átfedése „ellenőrizetlen”, közös elemek és teljes épülettető-összeg nem készül. Kalkuláció teljes épületként nem menthető.
- **Rajzreferencia:** `public/ocr/fixtures/synthetic-multisection-ground-plan.pdf` csak DEMO-val jelölt, nem léptékhelyes szintetikus alaprajz. Külön ROOF AREA A/B, fedetlen és ismeretlen fedettségű terasz, valamint ismeretlen csatlakozás címkét tartalmaz. Az alaprajzi `17,00 × 14,50 m` kifejezetten csak DEMO kontúrméret, nem tetőméret.
- **Böngészős QA:** Codex in-app böngésző, sötét téma, 375×812 viewport; PDF.js előnézet és szövegek láthatók, a dokumentum nem lógott túl a 375 px-es viewporton (document/body 360 px), szakaszváltás és két külön meglévőmotor-eredmény működött, konzol **0 warning / 0 error**. A 812×375 fekvő viewport, desktop/light téma, második vizuális téglalap teljes lezárása, fedetlen/nyitott terasz-workflow, törlés UI-próbája, fájl-/oldalváltás és fizikai iPhone **NOT TESTED**. Böngészőfelületi fájlcsere nem történt ebben a körben. E-01-et nem töltöttük fel, automatizált QA-ban nem használtuk.
- A forrás PDF, szakaszok és provenance a kliensoldali munkamenetben élnek; az oldal bezárása/munkamenet elvesztése ezeket elveszítheti. DB, mentési RPC, OCR, kalkulációs képlet és geometriai motor nem változott. A teljes tetőhöz E-01 esetén továbbra is hiányzik az igazolt fedettség/tetőkontúr, tetőforma, tetősíkonkénti méret és hajlás, gerinc/eresz, kapcsolatok/vápák/átfedések, valamint ellenőrzött anyagparaméter.
- **Minőségi kapuk:** célzott Vitest **47/47 PASS**; teljes Vitest `--testTimeout=15000`: **1368 PASS, 19 SKIP, 0 FAIL**; lint, izolált typecheck, izolált production build és diff-check **PASS**. A Vitest alapértelmezett 5 s tesztkorlátjával a teljes suite két lassú, M12.8-tól független karakterizációs teszten timeoutolt: a PDF-karakterkorlát teszt külön futtatva PASS; az execution-data 21 ismétlésű benchmarkja 5 s felett, 15 s-os kapuval PASS. Tesztkonfigurációt vagy nem kapcsolódó kódot nem módosítottunk.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Javasolt Conventional Commit:** `feat(M12.8): calculate roof material takeoffs per visual section`.

## M12.7 — vizuális tetőszakasz-kijelölés és vezetett anyagkigyűjtés (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A meglévő „Kitöltés tervrajzból” PDF-előnézetben egy vizuális, téglalap alakú tetőszakasz jelölhető két sarokkal. A kijelölés oldalhoz kötött, módosítható és törölhető; nagyításkor helyben marad, forgatáskor együtt fordul. A fedettség külön „fedett / fedetlen / tisztázandó” állapotú; csak felhasználó által kijelölt és igazolt szakaszhoz enged tovább geometriai draftátvitelt. A rajzi pixelekből/oldalméretből nem készül terület- vagy léptékszámítás.

- A meglévő `roof.material-takeoff` kezeli a támogatott tetőformák geometriai felületét/vetületét, éleit, faanyag- és fedőanyag-kigyűjtését. A `roof.timber-cutlist` csak faanyag-kiosztásra használható. Új motor, termékadatbázis vagy képlet nem készült.
- **Szintetikus böngésző-pilot:** a DEMO alaprajzon két sarokkal kijelölt szakasz; kijelölés törlése; forrásszöveges `8000 mm`/`6000 mm` kézi mezőválasztás és közös jóváhagyás; 8×6 m nyeregtető, 35°; explicit `90 cm` szarufa- és `30 cm` lécosztás, `8×20 cm` fa keresztmetszet, DEMO táblaadatok. A meglévő motor 58,60 m² tetősíkot, 48,00 m² vetületet, 16,00 m ereszt, 8,00 m gerincet, 20 szarufát, 27 lécsort és 16 fedőtáblát adott. Ez csak egy szintetikus szakasz; nem teljes épülettető vagy igazolt beszerzési lista, és nem statikai igazolás.
- **Böngésző QA:** 125%-os zoom és 90° forgatás mellett a kijelölés pozíciója stabil/forgatott; 375×812 és 812×375 nézetben 0 px vízszintes túlcsordulás; mobilon kijelölés és törlés működött; konzol **0 hiba**. A forrásváltás új PDF-re **NOT TESTED**: a támogatott fájlválasztó a panel reset után nem indult el, ezért nem használtam kerülőutat. E-01-et helyben, csak olvasási renderen ellenőriztem; böngészőbe nem töltöttem és nem számítottam belőle.
- **Korlátok:** egyszerre egy téglalap-szakasz kezelhető; az overlay nem kerül a kalkulációs snapshotba, csak az aktuális panelmunkamenetben él. Összetett tető több külön szakaszra bontása és közös összesítése nem támogatott. Rajz-alapú terület, lépték, tetőforma, fedettség vagy tetőméret-felismerés nincs. Világos téma és fizikai iPhone **NOT TESTED**.
- **Minőségi kapuk:** célzott Vitest **3 fájl / 43 teszt PASS**; teljes Vitest **211 fájl PASS, 8 SKIP; 1366 PASS, 19 SKIP, 0 FAIL**; `npm run lint`, izolált `npm run typecheck`, izolált `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: **PASS**. A teljes suite 2 meglévő React `priority` nem-boolean figyelmeztetést írt ki dashboard tesztekben.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Javasolt Conventional Commit:** `feat(M12.7): select roof sections on plan for takeoff`.

## M12.6 — vezetett tetőszakasz → geometria → anyagkigyűjtés (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A meglévő „Kitöltés tervrajzból” panel kiegészült a szakasz megnevezésével, fedettség-ellenőrzéssel, geometria/anyag mezőkhöz navigáló lépésekkel és a teljes tető lefedettségének külön jóváhagyásával. Az alaprajzi méret draftba vitele csak a szakasz neve, fedettségi megerősítés és mezőnkénti geometriai megerősítés után lehetséges. A teljes épületként történő mentést egy új szakaszkapu tiltja, amíg a felhasználó nem jelzi, hogy az egyetlen számított szakasz a teljes fedett tetőt lefedi. Változtatott geometriai bemenet ezt a jóváhagyást visszavonja.

- A DEMO E2E fixture (`synthetic-simple-roof-plan.pdf`) PDF.js-en keresztül 8000 × 6000 mm méreteket ad. Kézi mező-hozzárendelés/jóváhagyás, nyeregforma, 35°, meglévő material-takeoff motor és DEMO lemez/faanyag specifikációk mellett az eredmény geometriai felület: 58 597 180 mm²; szarufa kiosztás: 20 db; fedőtábla: 16 db. A számított és anyagmennyiségi eredmény a meglévő motorból származik; a fixture eredménye nem szakmai referencia és nem E-01 számítás.
- E-01-et csak helyi referenciaként vizsgáltuk, automatizált böngészőbe nem töltöttük. A földszinti alaprajz nem bizonyít tetőformát, fedett részeket, tetőméretet, gerincet, fokban vett hajlást vagy ereszt; a 17,00 × 14,50 m nem használható automatikusan tetőméretként. A teljes E-01 anyagkigyűjtéshez ellenőrzött tetőterv/metszet vagy szakaszonként megerősített méretlista szükséges.
- **Szintetikus böngésző-pilot:** autentikált lokális kalkulátorban PDF.js beolvasás; kézi `8000 mm`/`6000 mm` mező-hozzárendelés és külön jóváhagyás; LengthField `800`/`600 cm` kijelzése; 35° és DEMO anyagadatok. Meglévő motor: 58,60 m² geometriai felület, 20 szarufa, 73,246 m szarufa-összhossz, 1,172 m³ névleges faanyag és 16 fedőtábla. Az eredmény részleges szakaszként jelent meg és nem mentettük. A teljes lefedettség igazolása után a mentési gomb engedélyeződött; a geometria módosításakor a checkbox törlődött és a mentés ismét tiltott lett. A→B DEMO PDF-cserénél a kijelölés/jóváhagyás/hatókör resetelődött, a korábban jóváhagyott méretek draftértékei megmaradtak. Másik kalkulátor üres drafttal indult, visszaváltáskor a 800/600 cm draft megmaradt.
- **Böngészős mobil QA:** 375×812 és 812×375, sötét témában; a dokumentum vízszintes túlcsordulása 0 px mindkét szélességen. PDF-előnézet, 125%-os zoom, 90° forgatás és forrásszöveg-kijelölés működött. A böngészőkonzolban alkalmazáshiba nem volt; négy Next.js Fast Refresh fejlesztői figyelmeztetés jelent meg a szerkesztés/HMR alatt. Világos téma és valódi mobil billentyűzet **NOT TESTED**; a felületen nem volt téma-váltó, a browser eszköz nem szimulál natív billentyűzetet. Fizikai iPhone **NOT TESTED**.
- **Minőségi kapuk:** célzott Vitest **2 fájl / 40 teszt PASS**; teljes Vitest **210 fájl PASS, 8 SKIP; 1363 PASS, 19 SKIP, 0 FAIL**; `npm run lint`, izolált `npm run typecheck`, izolált `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: **PASS**.
- Adatkezelési út változatlan: PDF csak helyi memóriában; nincs képlet, új motor, DB/Auth/RLS, automatikus mentés vagy szerveroldali validációs változás. Forráslista a panel munkamenetében marad, PDF és rajzi provenance nem része a mentett snapshotnak.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Javasolt Conventional Commit:** `feat(M12.6): guide roof section takeoff from plan dimensions`.

## M12.5 — földszinti alaprajz korlátozott, ember által ellenőrzött tetőgeometriai átvitele (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A helyben feldolgozott E-01 egyértelmű címe földszinti alaprajzot azonosít; a rajz nem ad bizonyított tetőformát, tetőszakaszokat, gerincet, hajlásszöget vagy ereszkiülést. Emiatt abból nem készült tetőgeometria vagy anyagkimutatás. A panel PDF.js-szövegből jelzi a rajztípust, és alaprajzból származó tetőgeometriai mezőnél külön megköveteli annak megerősítését, hogy az érték a ténylegesen fedett tetőszakaszhoz tartozik. A százalékos lejtés nem vihető át fokként. OCR nem osztályoz.

- **Meglévő átvitel auditja:** részleges, egyenkénti draftátvitel már támogatott. Célmező-séma validáció és meglévő érték külön felülírás-jóváhagyása kötelező; a hiányzó kötelező mezők látszanak; teljes számítás/mentés csak a meglévő teljes és érvényes bemenettel működik. Képlet, szerveroldali validáció, DB/Auth/RLS nem változott.
- **Szintetikus negatív minta:** a DEMO alaprajz szövegrétege tartalmaz külső méretet, dimenzióláncot, teraszokat, `4,0%`, területet és keresztmetszetjelölést. Ezekből a `roof.rafter-cut` szabálymotor 0 mezőjavaslatot adott; a PDF címfelismerése kizárólag ugyanazon oldalon talált PDF.js `FÖLDSZINTI` + `ALAPRAJZ` szövegre támaszkodik. Az alaprajzi geometriamező átviteléhez külön, emberi megerősítés szükséges. A célzott teszt: **2 fájl / 59 teszt PASS**.
- **Valós E-01 értékelés:** PDF.js szövegforrás 1 oldalas, 1191×842 pt rajzon címet, külső `17,00` × `14,50` méretet, belső méretláncokat, `4,0%` jelölést, `12×16,25/27` keresztmetszetjelölést és több teraszfeliratot mutat. A rajzi kép földszinti alaprajz; nincs rajta igazolt tetőkontúr, gerinc, tetőhajlás fokban vagy ereszkontúr. A két külső méretből nem vezethető le tetőméret. Nem készült számítás és a PDF nem került a repóba.
- **Böngésző QA:** a lokális kalkulátoroldal autentikált DEMO környezetben betöltődött. A böngésző fájlválasztója nem nyílt meg támogatott módon, a hozzáférhető CUA API nem adott biztonságos szintetikus `setFiles` műveletet; ezért PDF parse/preview, A→B csere, 375×812 / 812×375 és világos/sötét UI, billentyűzetes korrekció, görgetés/túlcsordulás és böngészőkonzol célzott QA-ja **NOT TESTED**. Fizikai iPhone **NOT TESTED**. A fájlválasztót nem kerültük meg.
- **Minőségi kapuk:** célzott Vitest **2 fájl / 59 teszt PASS**; teljes Vitest **209 fájl PASS, 8 SKIP; 1361 PASS, 19 SKIP, 0 FAIL**; `npm run lint`, izolált `npm run typecheck`, izolált `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: **PASS**. A suite két korábbi dashboard React `priority` attribútum nem-boolean figyelmeztetést jelzett.
- **Szakmai korlát és hiányzó adat:** meglévő material-takeoff/timber-cutlist mezők használhatók, de a kalkulátor alakzatai idealizáltak; az alaprajz önmagában nem bizonyítja, mely teraszok fedettek, hány tetőszakasz van, milyen a gerinc iránya, vagy az egyes szakaszok mérete, fokban vett hajlása és ereszkiülése. Ezekhez ellenőrzött tetőterv/metszet vagy bádogos által igazolt méretlista kell. Anyagválasztás és specifikáció szintén hiányzik; szerkezeti teherbírást a meglévő faanyag-kalkulátor nem igazolja.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Javasolt Conventional Commit:** `feat(M12.5): guard roof geometry transfer from floor plans`.

## M12.4 — szabályalapú méretértelmezés és fokozatos draftátvitel (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A `Kitöltés tervrajzból` panel most egyenként is jóváhagy és a mentetlen kalkulátordraftba visz át mezőket, akkor is, ha más kötelező bemenet hiányzik. A meglévő célmező-validáció és felülírásvédelem megmarad; a teljes számítást és mentést továbbra is a meglévő teljes kalkulációs bemenet szabályozza. A panel a hiányzó mezőket mutatja, és az elfogadott mezők forrásszövegét, dokumentum-/oldalazonosítóját, pozícióját/keretét, egységét és szabályazonosítóját a fájlmunkamenetben visszakereshetően megtartja.

- **Első műszaki szabályok:** kizárólag `roof.rafter-cut`, `pdf-text` + `pdfjs-dist@6.4.299`, megbízható oldalszám/pozíció/keret, valamint egyetlen text span pontos `címke: szám mértékegység` alakja. `Fél fesztáv`/`Fél tetőfesztáv` → `horizontalHalfSpanMm`; `Gerincemelkedés`/`Tetőemelkedés a gerincig` → `riseMm`; `Vízszintes ereszkiülés`/`Eresz vízszintes kiülése` → `eaveProjectionMm`. A címke, érték, egység és rajzi hely együtt ugyanabban a PDF.js spanben szükséges; közelségből nem fűzünk össze elemeket. OCR és más kalkulátor nem kap műszaki javaslatot.
- **Szintetikus PDF mérés:** két jogtiszta, DEMO jelölt rajz (`public/ocr/fixtures/synthetic-rafter-dimensions*.pdf`). 6/6 explicit pozitív címke helyes célmezőre térképeződött, 0 téves javaslat a 13 negatív/kétértelmű szövegre, mind a 13 kihagyva. A teszt a PDF.js parseren át a két külön dokumentumazonosítót is ellenőrzi. Mind a 6 javaslat kezdetben függő; a felhasználó a forrást és értéket ellenőrzi/javíthatja, majd jóváhagyási kaput használ. A jelölőnégyzet és a jóváhagyó művelet egy átviteli csomagra vonatkozik, így egyetlen mező önállóan is átvihető, vagy több együtt jóváhagyható. A szintetikus minta nem ad reprezentatív false-positive rátát.
- **Ellenőrzés:** célzott parser/átvitel és PDF.js fixture regresszió **2 fájl / 47 teszt PASS**; teljes Vitest **209 fájl PASS, 8 SKIP; 1356 PASS, 19 SKIP, 0 FAIL**; lint, typecheck és Next.js 16.4.2/Webpack production build **PASS**; `git diff --check` és az új PDF/Markdown whitespace checks **PASS**. Build/typecheck külön `/tmp` másolatban futott, miközben az eredeti checkout dev szervere a saját `.next`-ét használta. Böngészőben az autentikált kalkulátoroldal betöltődött, de a szintetikus PDF kiválasztása/feldolgozása, A→B csere, mobil viewportok és konzol **NOT TESTED**; a CUA nem adott támogatott fájlválasztó/viewport vezérlést, és adatvédelmi kerülőutat nem alkalmaztunk. Fizikai iPhone **NOT TESTED**.
- **Korlátok:** a negatív példák csak a megadott mintaszövegekre bizonyítanak elutasítást. Valós, szakértő által címkézett roof rafter PDF referencia-készlet, gyártói geometriai minimumok és valódi mobil böngészős bizonyíték továbbra sincs. A `17,00`, `GERINC 8,20 m`, lejtés, terület, keresztmetszet, külső alaprajzi méret és `HAP` nem ad a szabálymotortól mezőjavaslatot.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.**
- **Javasolt Conventional Commit:** `feat(M12.4): suggest explicit rafter dimensions with reviewable draft transfer`.

## M12.3C — explicit egységválasztás és draftkonzisztencia (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A PDF.js egyetlen pozitív számot tartalmazó, egység nélküli szövege (`17,00`, `14,50`, `4,55`) csak az adott felirathoz kézzel kiválasztott mm/cm/m egységgel ad szerkeszthető értékjavaslatot. A `17,00` + cm → `170 mm` és `14,50` + m → `14500 mm` normalizálás unit tesztben PASS; a böngészőben `17,00` + cm → `170 mm` draftátvitel PASS. A rajzon szereplő `8,20 m` egységválasztás nélkül is `8200 mm`, és a felhasználói választás nem írja felül a PDF explicit egységét.

- Forrásváltáskor mind a rajzképi overlay, mind a feliratlista törli az egység-, célmező-, érték-, felülírás- és jóváhagyásállapotot. A böngészőben reprodukált overlay-hiba GREEN lett: korábbi cm után új, egység nélküli `14,50` forrás blank unit selectorral és letiltott hozzáadással jelent meg. Oldalváltás is törölte a korábbi oldali javaslatot/egységet; kétoldalas szintetikus PDF valóban beolvasódott.
- A korábbi stale LengthField eltérés két UI-állapot együttélésével volt összhangban: a kalkulátor kanonikus draftja mm-ben frissült, miközben LengthField saját kijelzési draftja külön maradt. Az átvitt mezőkhöz tartozó kijelzési draft most célzottan törlődik; `draftEpoch`/érték kulcs frissíti a kontrollált mezőt. A regressziós unit teszt igazolja, hogy csak az érintett mezők draftja törlődik. Az eredeti, korábban HMR-en átesett tab állapotának pontos történeti gyökéroka önmagában nem bizonyítható.
- Korábbi valódi böngészős DEMO bizonyíték: hiányzó kötelező adat a jóváhagyást tiltotta; kézi pótlás után a meglévő motor 5002,889 mm / 88,053° eredményt adott. A 17 cm és 500 cm draft a másik roof kalkulátorra váltás után, majd visszatérve megmaradt. 125% / +90° esetben a screenshoton a forráskiemelés a feliraton maradt. Mentés nem történt. A régi jegyzet nem rögzítette, hogy a 170 mm célmezője mi volt; ez az eredmény 5000 mm félfesztáv és 170 mm `riseMm` (Gerincemelkedés) esetén áll elő. A tetőhajlás 1,947°, a 88,053° a függőleges vágásszög. A rafter-cut hosszvalidáció pozitív, max. 1 000 000 mm értékeket enged, nincs hajlásszögkorlát; alacsony hajlásra nem találtam meglévő figyelmeztetési szabályt. Gyártói minimum nélkül ezt ellenőrző, nem blokkoló üzenetként lehetne később jelezni, de igazolt küszöb híján most nem implementáltuk.
- Nem javasolt értéket: OCR, `%`, `m²`, keresztmetszet, lépték vagy több számtoken; `1450` nem lesz `14,50`. A mező továbbra is kézi választás, az egység nélküli szám mm/célmező dimenziójától eltérő esetén nincs javaslat. A szakmai jelentés nincs kikövetkeztetve.
- Friss kapuk (2026-10-30): célzott Vitest **4 fájl / 42 teszt PASS**; teljes Vitest **209 fájl PASS, 8 SKIP; 1333 PASS, 19 SKIP, 0 FAIL**; `npm run lint`, `npm run typecheck`, Next.js 16.4.2/Webpack `npm run build`: **PASS**. A teljes suite két nem blokkoló, korábbi dashboard `priority` attribútum React-figyelmeztetést írt ki. Az eredeti `.next`-et használó dev szerver futott; a typecheck és build ezért izolált `/tmp` másolatban zajlott.
- A friss fájlcserés QA-hoz két jogtiszta, kétszintes DEMO PDF készült a `/tmp`-ben. Az in-app böngésző megmutatta a helyi kalkulátort, de a fájlkiválasztó esemény nem nyílt meg. A telepített Brave auth nélküli helyi útvonalán HTTP 200 mellett csak a skip-link renderelődött, konzolhiba nélkül, mert a kalkulátor Auth/organization állapot nélkül nem ad lapot. Így a PDF A→B csere, a csere utáni egység/mező/érték/jóváhagyás reset és a draft/LengthField újraellenőrzése ebben a körben **NOT TESTED**. A korábbi reset/oldalváltás/kalkulátordraft-bizonyíték megmarad, de nem bizonyítja a második fájl betöltését.
- 375×812, 812×375, világos/sötét és célútvonalas böngészőkonzol QA **NOT TESTED**: a CUA nem biztosított pontos viewport-override-ot, a normál Brave munkamenet pedig nem volt DEMO autentikált. Fizikai iPhone szintén **NOT TESTED**. A PDF.js korábbi tényleges parse/render/worker bizonyítéka megmarad; Worker-instance külön introspekció nincs.
- **M12.2 OCR-pontossági kapu: BLOCKED, változatlanul.** E-01-t ebben a körben nem használtuk.
- **Javasolt Conventional Commit:** `feat(M12.3C): require explicit units for unitless drawing values`.

## M12.3B — egységgel ellátott PDF-szöveg értékjavaslata (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A rajzpanel csak explicit mértékegységű, egyetlen, egyértelmű PDF.js-szövegtokenből ajánl szerkeszthető számértéket. A mező kiválasztása kézi; hozzáadás, forrásellenőrzés, kötelező adatok és meglévő érték felülírása továbbra is védett, draftátvitel csak külön jóváhagyás után történik. OCR-ből nincs numerikus javaslat vagy műszaki besorolás.

- `8,20 m` → `8200 mm` javaslat és a 820 cm mezőkijelzés friss böngészőmunkamenetben; meglévő motorral 8440,379 mm eredmény. Hiányzó kötelező gerincemelkedés blokkolta a jóváhagyást, kézi megadás után mentetlen draftként átkerült. A meglévő 3000 mm érték külön felülírás-jóváhagyást igényelt.
- Bizonyított elutasítás: egység nélküli `17,00`/`1450`, `4,0%`, `m2`, keresztmetszet, többértékű sor; OCR forrásból nincs javaslat. A `1450` nem változik `14,50`-re. Nincs automatikus mezőosztályozás, OCR-javaslat vagy mentés.
- Célzott Vitest: **3 fájl / 35 PASS**, benne két regresszió, amelyek a több számot tartalmazó méretsor téves javaslatát előbb reprodukálták, majd szigorítás után kizárták. Teljes `npm test`: **209 fájl PASS, 8 SKIP; 1327 PASS, 19 SKIP, 0 FAIL**. `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: **PASS**. A fejlesztői szervert a typecheck/build előtt leállítottuk. Egy korábban megnyitott, fejlesztői hot reloadon átesett tab stale meződraftot mutatott; pontos gyökéok nem igazolt. Tiszta tabban a 820 cm kijelzés és 8440,379 mm számítás PASS, konzol 0 warning/error.
- **M12.2 OCR pontossági kapu: BLOCKED, változatlanul.** E-01 0/15 pontos OCR-egyezés; sem OCR sem PDF szövegréteg nem ad automatikusan műszaki igazságot.
- **Javasolt Conventional Commit:** `feat(M12.3B): suggest explicitly unitized PDF values`.

## M12.3A — ember által jóváhagyott tervrajzátvitel (2026-10-30)

**Státusz: M12.3A funkcionális elfogadás PASS WITH LIMITATIONS; adatvédelmi QA PASS WITH LIMITATIONS; M12.2 OCR műszaki pontossági kapu továbbra is BLOCKED.** A `Kitöltés tervrajzból` panel mind a négy jelenlegi, `roof` kategóriájú kalkulátoron elérhető: `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members`. A PDF.js/OCR csak forrásjelöltet ad; a felhasználó választ mezőt, kézzel ad meg értéket, majd külön jóváhagyja a draftátvitelt. Ez nem automatikus OCR-mezőillesztés. A hiányzó kötelező mezők a kiválasztott kalkulátor sémájából jönnek; meglévő érték külön jóváhagyás nélkül nem írható felül.

- **Adatút és jogosultság:** fájl bájtjai/preview lokálisan, memóriában; nincs Supabase/API/Storage, séma, migráció, automatikus mentés vagy kalkulációs képlet változtatás. A jóváhagyás csak a meglévő, mentetlen kalkulátordraftot frissíti; meglévő kalkulátor-mentési és jogosultsági út nem változott. A módosítás nem vezet új tartós adatot vagy jogosultsági határt.
- **Szám-biztonság:** OCR confidence csak metaadat; forrásértékből nincs gépi konverzió. Valódi, helyi Tesseract a szintetikus `DEMO TETO 1450 m` sort ellenőrizendő OCR-jelöltként adta vissza; mező és kézi érték üres maradt. A `14,50` kézi normalizálása `14.50`-re történik, míg a `1450` változatlan marad. A felülírási próbában a meglévő 310 cm érték a külön jóváhagyás hiányában változatlan maradt.
- **Böngészős bizonyíték:** meglévő Auth/DEMO műhelyben mind a négy kalkulátorban szintetikus, jogtiszta, helyi PDF-fel végigment a mezőhozzárendelés, kézi érték és emberi jóváhagyás. A `roof.rafter-cut` 3000/2000 mm értékből 3605,551 mm szarufahosszt és 33,69° hajlást adott. A `roof.truss-members` 6000/2000 mm, 6 osztásból 3605,551 mm fél felső övet, 33,69° talpszöget és 500 mm osztást számolt; hiányos értékeknél a jóváhagyás letiltott. A `roof.material-takeoff` átvette a 10000/8000 mm, 30° geometriát (92,38 m² tetősík, 80,00 m² vetület), de anyagcsoport nélkül nem menthető. A `roof.timber-cutlist` geometriája átkerült, a meglévő validáció specifikáció hiánya miatt hiányosként jelölte; mentés nem történt. A rejlett nyeregtető-specifikus mezők téves hiányjelzését reprodukáltuk, majd a meglévő `isFieldVisible` szabállyal javítottuk és böngészőben újra ellenőriztük.
- **Adatvédelmi QA:** az incidens oka Playwright locator-ambiguitás volt: a `+` kiválasztó több UI-elemet talált, és a runner a jelöltek ARIA-címkéit beleírta saját selector-diagnosztikájába. A PDF-felirat ARIA-labelben és látható listában való szerepeltetése az alkalmazás hozzáférhető UI-jának része; a PDF/OCR feldolgozó nem ír dokumentumszöveget loggerbe vagy konzolra, hibái általános, statikus üzeneteket használnak. A `/devtools/m12-pdf` szöveget és OCR-eredményt mutató diagnosztikája `NODE_ENV=development` esetén érhető el. Az incidens gyökérokát a rendelkezésre álló forrás és hiba környezete alátámasztja, de külső böngésző-kiegészítők/telemetria összes kimenete nem volt auditálva. A záró kör kizárólag szintetikus anyagot használt; E-01-et nem nyitottuk meg.
- **PDF.js/zoom/forgatás:** a szintetikus PDF valódi böngészőben parse-olódott és renderelődött; 125% zoom, +90° mellett a kiemelés vizuálisan a feliraton maradt. Böngészőkonzol `warn/error`: 0/0 ebben a záró futásban. Worker instance/network response introspekció nem érhető el a CUA-ban, de a PDF.js render/parse workeres út ténylegesen működött. 375 px light/dark és `roof.rafter-cut` korábbi UI-probája PASS; fizikai iPhone, natív billentyűzet és iOS PWA **NOT TESTED**.
- **Ellenőrzések:** célzott `drawing-field-transfer.test.ts`: **10/10 PASS**. Teljes `npm test`: **208 fájl PASS, 8 SKIP; 1310 PASS, 19 SKIP, 0 FAIL**. `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack), `git diff --check`: **PASS**. A fejlesztői szervert a typecheck/build előtt leállítottuk. A korábbi 413 és PDF renderer mock teszteltérések jelenlegi teljes regresszióban PASS.
- **Korlát:** automatikus műszaki illesztés/kérdésgenerálás, tartós forrásproveniencia és M12.2 OCR-pontossági kapu nincs megoldva. Az OCR `1450` félreolvasásának biztonságos blokkolása korábban szintetikus valós Tesseract próbával igazolt; valódi tervlap OCR-pontosságának eredménye 0/15, ezért M12.2 továbbra is **BLOCKED**.
- **Javasolt Conventional Commit:** `feat(M12.3A): add human-approved drawing transfer`.

## M12.2 — helyi OCR-motor és rajzfelirat-felismerés (2026-10-30)

Státusz: **az OCR-alapmotor PASS WITH LIMITATIONS; a valós tervrajz kritikus fáziskapu BLOCKED**. E-01 valódi, lokális rajzon lefutott a PDF.js és a Tesseract böngészős feldolgozása, de a kézzel ellenőrzött 15 műszaki feliratból **0/15 szó szerinti OCR-egyezés** lett. Két célzott 90°-os bounding box helyes helyre esett (2/2), de a szövegük `3,85→3.85` és `14,50→14.50` konfliktus. Tesseract.js 7.0.0 böngészőben, lokális worker/WASM/magyar modell assetekkel fut. JPG/PNG/WebP képet és explicit indítású, szövegréteg nélküli PDF-oldalt kezel; a szövegréteges PDF OCR útja elutasított.

- **Kimeneti szerződés:** a PDF.js és OCR `DrawingTextSource` típust használ, dokumentumazonosítóval, oldalszámmal, eredeti/normalizált szöveggel, lexikai tokenekkel, normalizált pozícióval/kerettel, módszerrel, pontos motorverzióval és confidence/uncertainty mezőkkel. `confidence < 60` esetén OCR `ambiguous`; minden más esetben is műszaki jelentése `unknown`. Sem mezőbesorolás, kalkulátor-előtöltés, adatbázis, sem feltöltési útvonal nem épült.
- **E-01 valós tervlap:** 1 oldal, 1190.55 × 841.89 pt, 467 PDF.js span. Széles ROI OCR 1×/2× kb. 10,7/16,9 s, és sok méretlánc összeolvasztásával járt: `4,55→455`, `2,35→235`, `7,75→775`, `17,00→17.00`. Célzott 90° ROI `3.85` (88%) és `14.50` (79%) olvasatot adott, a képen jó helyű bboxokkal, de mindkettő konfliktus a vesszőt tartalmazó forrásszöveggel. A 15 címkés minta pontos aránya 0/15; 13 sor nem párosítható megbízható OCR-kimenettel. Memória high-water nem mérhető. Az eredeti csak lokális memóriában volt, a title block és személyes mezők kimaradtak; fájl/érték/log nem került repóba vagy külső szolgáltatásba. Részletes táblázat az implementation planben.
- **JPG/WebP böngészőpróba:** a PNG-ből ideiglenesen `/private/tmp` alatt készült 1600×800 tesztképeken valódi Tesseract futott. JPG 3 sort adott, `14,50→1450` (73%); WebP szintén 3 sort és `14,50→1450`-et (74%). `8.20 m` és `38 cm` olvasat megmaradt. A temp képek a futás után törölve.
- **Hibabiztonság:** `1450`-ből nem következtethető `14,50`; vessző/pont eltérés konfliktus. Az OCR confidence nem műszaki bizonyíték. Automatikusan megbízható E-01 méretet nem adott.
- **Eszközkorlátok:** 16 MiB kép, 8 MP canvas (JPG/PNG/WebP fejlécből, dekódolás előtt ellenőrizve), opcionális normalizált ROI, manuális forgatás, opcionális 2× méretrészlet. 2× Node-próba segített visszaolvasni a vesszőt, de OCR-idő kb. 66 ms-ról 168 ms-ra nőtt; ezért nincs alapértelmezett upscale. PSM 11 kismértékű javulás, PSM 7 többsoros hibás olvasat, kontraszt/szürkeárnyalat/élesítés nem oldotta meg stabilan a vesszőt. Eredmények kis DEMO mintáról.
- **Assetek/függőségek:** package.json/lock pontos `tesseract.js@7.0.0`, `npm ls --depth=0` hibamentes, telepítéskor npm audit 0 sebezhetőséget jelzett. 12 csomag hozzáadva. Worker/core/Hungarian tessdata `public/ocr/` alatt, összesen kb. 22 MiB, same-origin URL és `cacheMethod: none`; Apache-2.0 notice/licencfájlok mellékelve. Telepítés fsevents és donation postinstall script figyelmeztetést jelzett; a scriptek nem futottak.
- **Ellenőrzések:** célzott rajzfeldolgozó tesztek **4 fájl / 28 teszt PASS**; teljes `npm test`: **207 fájl PASS, 8 SKIP; 1300 PASS, 19 SKIP, 0 FAIL**. `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack), `npm ls --depth=0` és `git diff --check`: **PASS**. A production build sikeres; a production szerver 404 viselkedését most nem sikerült újraellenőrizni (`listen EPERM`), korábbi böngészős 404 bizonyíték megmarad. A valódi rajzra vonatkozó elfogadási feltétel nem teljesült, ezért az M12.2 kapu nem zárható le.
- **Kapu:** **BLOCKED**. Az alaprajz ezen a módszerrel nem támogatható műszaki méretbemenetként; OCR-forrásszöveg/oldal/módszer és képen ellenőrzött koordináta csak `unknown`/`conflict` bizonyítékként továbbítható M12.3 felé.
- **Nem ellenőrzött:** fizikai iOS/Android memória és sebesség, más böngészőmotor, többrajzos címkézett pontosság, metszet/homlokzat/tetőalaprajz/csomópont és valódi kézírás. Browser console: 0 warn / 0 error; külön Worker/network introspekció nem volt elérhető. Production szerver újraindítása sandbox `EPERM` miatt nem történt meg.
- **Javasolt Conventional Commit:** `feat(M12.2): add local drawing OCR engine`.

## M12.1 — PDF-feldolgozó alapmotor és végső regresszió (2026-10-30)

Státusz: **PASS WITH LIMITATIONS**. A kliensoldali PDF.js alapmotor szekvenciálisan, lusta importtal olvassa a PDF szövegrétegét, megőrzi az oldalt/eredeti szöveget/módszert, számolja az oldalméretet, forgatást és megbízható normalizált szövegfutam-geometriát. A fejlesztői `/devtools/m12-pdf` felületen lokális fájlpreview, overlay, zoom és forgatás ellenőrizhető; éles módban a route 404.

- **Böngésző és adatkezelés:** Codex in-app böngészőben Next.js fejlesztői szerverrel valós PDF.js fájlbetöltés, szövegkinyerés, canvas preview, 2× zoom és +90° forgatás futott. A helyi E-01 egyoldalas; 467 szövegelemet adott, az overlay a látható feliratokhoz igazodott, a forgatott/zoomolt overlay együtt mozdult a renderrel. Böngészőkonzol: 0 warning / 0 error. A PDF-et nem másoltuk a repóba, a tartalmát nem írtuk terminálba/alkalmazáslogba; csak helyi memóriában dolgoztuk fel. Az M12.0 szintetikus fixture automata tesztben is maradt.
- **Feldolgozási határok:** fájl ≤32 MiB, ≤100 oldal, ≤100 000 szövegelem, ≤5 MiB szöveg, ≤200 000 token; előnézet ≤8 MP. Két bemeneti bájttömb másolata miatt maximum 64 MiB bemeneti JS-array memory mellett a PDF.js/böngésző további memóriát használhat; az RGBA preview 8 MP-nél elméletileg 32 MB. Ezek technikai korlátok, nem mobileszközön mért teljes memória-/latencia-garanciák. Csak PDF szövegréteg támogatott; keret metrikai szövegfutam-befoglaló, nem glyph-pontos. Nincs OCR, kategorizálás, méretértelmezés vagy kalkulátorintegráció.
- **Két regressziós teszt:** fotó route-korlátok nem változtak; a teszt pontosan 3 MiB/fájl és 4 MiB/kérés elfogadást, illetve mindkettő +1 bájtos 413-at bizonyít. PDF riportteszt a `renderExecutionReportPdfStream` mockkal és streamelt PDF válasz alapszerződésével frissült. Mindkettő a teljes suite-ban PASS; üzleti route kód nem változott.
- **Ellenőrzések:** célzott regresszió + PDF: **5 fájl / 35 teszt PASS**; teljes `npm test`: **206 fájl PASS, 8 SKIP; 1291 teszt PASS, 19 SKIP, 0 hiba**. `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack), `git diff --check`: **PASS**. `npm ls --depth=0`: függőségi fa hibamentes; közvetlen Next.js 16.4.2 és PDF.js 6.4.299 rögzítve. Production build után a `/devtools/m12-pdf` route böngészőben **404**.
- **Nem ellenőrzött:** más böngészőmotor, fizikai iOS/Android, mobileszköz-memória/latencia, Supabase/adatbázis (nem érintett), szkennelt PDF és OCR, szakmai méretértelmezés, kalkulátorkitöltés. A teljes-suite korábban két elavult teszteltérése M12.1-ben javítva, a jelenlegi regresszió zöld.
- **Javasolt Conventional Commit:** `feat(M12.1): add bounded client-side PDF processing engine`.

## M12.0 — Tervrajz-PDF szövegkinyerési PoC (2026-10-30)

Az alábbi bejegyzés az M12.0 akkori lezárási állapotát őrzi; a két teszteltérést a következő M12.1 bejegyzésben dokumentált, tesztszintű módosítás megszüntette, ezért a teljes aktuális suite zöld.

Státusz: **PASS WITH LIMITATIONS** a PDF.js PoC-kapu; a teljes regressziós suite **FAIL két bizonyítottan elavult, M12-től független teszteltérés miatt**. A kódaudit első pilotjelöltje a meglévő `roof.rafter-cut`; a kalkulátor és mentési folyamat nem változott. Az adapter PDF.js 6.4.299-cel oldalanként kiolvassa a szövegréteget, oldalméretet és normalizált szövegkezdőpontot. Node alatt a legacy buildet, böngészőn a normál buildet használja. Nem OCR, nem műszaki osztályozó, nem kalkulátor-kitöltés.

- **Függőség és állapot:** `package.json` és `package-lock.json` pontosan `pdfjs-dist@6.4.299`-ot rögzít (Apache-2.0; Node engine `>=22.13.0 || >=24`). A telepítés után az `espree` lockolt `acorn-jsx@5.3.2` függősége hiányzott a `node_modules`-ból, emiatt az ESLint nem indult. A csomagot `npm install --no-save --ignore-scripts acorn-jsx@5.3.2` állította vissza; manifest és lockfile nem változott. A függőségi fa utána hibátlan, csak platform- és feature-opcionális hiányokat listáz. A Vite által opcionálisan használt `fsevents@2.3.3` telepített.
- **PoC és adatkezelés:** a jogtiszta, egylapos PDF-et a Vitest és a böngésző memóriában generálja. `M12 DEMO 17,00 m`, oldal 1, 300×400 pontos lap és (0,24; 0,20) normalizált kezdőpont: **1/1 PASS**; a piros koordinátapont a renderelt felirat kezdetére esik. Tiszta böngészőtabon worker elindult, konzol **0 warning / 0 error**. Az E-01 helyi, egyoldalas, olvasási próbája **467 szövegpozíciót** adott; a vizuális overlay feliratkezdésekhez igazodott. A PDF nem került a repóba, tartalmi szöveg/személyes adat nem került terminálkimenetbe vagy alkalmazáslogba; nincs API-feltöltés vagy adatbázis-változás.
- **Next.js kompatibilitás:** Next.js 16.4.2/Webpack build közben ideiglenes Client Component importálta a modult; a worker asset kibocsátódott. A QA route és a lokális dev szerver eltávolítva/leállítva. Végleges `npm run build` **PASS** (a saját QA route generált `.next/dev/types` maradványának eltakarítása után).
- **Ellenőrzések:** `npm run lint` **PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS**; PDF.js szintetikus Vitest **1/1 PASS**; böngésző synthetic + E-01 **PASS**; `git diff --check` **PASS**. Teljes `npm test`: **202 fájl PASS, 8 SKIP; 1270 teszt PASS, 19 SKIP, 2 FAIL**. A hibák bizonyítottan elavult, commitolt tesztfeltételek: a fotóteszt 10 MiB-t vár, miközben a route 3 MiB/fájl, 4 MiB/kérés korlátú (a jelenlegi korlát M11.1-es); a riport route már `renderExecutionReportPdfStream`-et hív, a régebbi mock még `renderExecutionReportPdf`-et exportál. Nem módosítottunk nem kapcsolódó üzleti kódot vagy e teszteket; M12 előtti külön teljes tesztbaseline nem futott.
- **Korlát:** a szövegpozíció csak kezdőpont, nem bounding box; E-01 ellenőrzés nem bizonyít minden PDF-re kiterjedő koordinátapontosságot, rajzi kategorizálást vagy méretjelentést. A teljes Vitest piros; a két régi tesztet a felelős regressziójavítás előtt hozzá kell igazítani a jelenlegi szerződéshez. OCR, méretparser, visszakérdezés és kalkulátor-kitöltés nem készült.
- **Javasolt Conventional Commit:** `feat(M12.0): add local PDF text and coordinate proof of concept`.

## M11.4 — Mentett kalkulációk hozzárendelése új munkanaplóhoz (2026-10-29)

Státusz: **READY WITH LIMITATIONS**. Az új munkanapló űrlap kereshető, többszörös és opcionális választót kapott a felhasználó saját, mentett építési kalkulációihoz; üres állapotból a Kalkulátorok és a Mentett kalkulációk oldalak nyithatók meg. A projektoldali munkanapló-létrehozásban az elfogadott ajánlat mellé is választható kalkuláció. A meglévő `execution_plan_document_links` kapcsolat tárolja a kalkuláció és az immutable revízió azonosítóját; a számítás tartalma nem változik. A munkanapló megnyitásakor a meglévő kapcsoltkalkuláció-panel mutatja az adott V-revíziót és a kalkulátorhoz visszavezető linket. Séma- vagy RLS-változás nem kellett.

- **Jogosultság és konzisztencia:** a lista a meglévő szervezeti tagság-ellenőrzést és kalkulációs RLS-t használja, és csak az RPC által linkelhető négy menthető építési kalkulátort mutatja; a szerver a kiválasztott revízió teljességét ellenőrzi. A `link_execution_plan_document` RPC ismét ellenőrzi a szervezetet, a munkanaplót, a kalkuláció tulajdonosát/típusát és a pontos revíziót; meglévő aktív kapcsolatnál nem duplikál. Az ajánlati forrás meglévő létrehozási RPC-je változatlanul kezeli az elfogadott ajánlat és véglegesített revízió ellenőrzését. Sikertelen részleges kapcsolásnál az elkészült munkanapló és a már rögzült kapcsolatok megmaradnak, azonos munkanapló-kéréskulccsal újrapróbálhatók.
- **Ellenőrzés:** célzott Vitest 4 fájlban **23 PASS**; egy meglévő helyi integrációs teszt **SKIP**. Teljes `npm run lint` **PASS**, `npm run typecheck` **PASS**, `npm run build` **PASS**, `git diff --check` **PASS**. A korábban blokkolt `supabase test db --local supabase/tests/database/057_execution_plan_calculation_links.sql` most **PASS, 21/21**: bizonyította a pontos revíziót, a meglévő kapcsolat duplikációmentes visszaadását, az idempotenciát, a más szervezet elutasítását, valamint hogy a tag nem kapcsolhat más revíziót vagy más tulajdonos kalkulációját. A korábbi `permission denied` a sandbox Docker API-hozzáférési korlátja volt; a socket tulajdonosa a jelenlegi felhasználó, módja `srwxr-xr-x`, változatlan maradt. A lokális teszt tranzakciója rollbackelt. Böngészős asztali/mobil ellenőrzés nem történt; Browser plugin és Playwright nincs telepítve, helyi app nem futott.
- **Korlát:** jelenleg az adatbázis üzleti szabálya szerint csak a kalkuláció létrehozója kapcsolhat építési kalkulációt; szervezeti tagok a már kapcsolt revíziót olvashatják. A mentett kalkulációk típusonként az alkalmazás meglévő 100-as listakorlátját követik.
- **Javasolt Conventional Commit:** `feat(M11.4): link saved calculation revisions to new work logs`.

## M11.3 — iPhone PWA és edge-to-edge megjelenés (2026-10-29)

Státusz: **READY WITH LIMITATIONS**. Az App Router manifest neve `TetőPro`, a standalone telepítési mód és a meglévő ikonok változatlanul használatban maradtak; a Next.js meglévő `apple-icon.png` assetje biztosítja az Apple ikont. A viewport `cover` módban marad, a standalone oldalak a felső/alsó safe-area insetet figyelembe veszik. A theme-color a korai téma-bootstrapban és a téma váltásakor a tényleges light/dark app-háttérhez igazodik. Auth útvonal, alsó navigáció, üzleti logika és adatbázis nem változott; offline cache/service worker nincs bevezetve.

- **Ellenőrzés:** célzott Vitest 5 fájl / 14 teszt PASS; érintett ESLint PASS; `npx tsc --noEmit -p tsconfig.typecheck.json` PASS; izolált `npm run build` Next.js 16.4.2-vel PASS; `git diff --check` PASS. A manifest, Apple ikon, bejelentkezés és recovery callback útvonal szerepelt a sikeres buildben. A helyi böngésző accessibility tree-je a dashboardot és navigációt megjelenítette.
- **Korlát:** iPhone Safari, telepített Home Screen app, 375 px-es viewport, fizikai safe-area/keyboard viselkedés és valódi téma-váltás böngészőben nem ellenőrizhető ebben a környezetben; ezekhez külön Browser/Playwright eszköz és/vagy fizikai iPhone szükséges. Az iOS Safari böngésző eszköztára továbbra is a rendszer része; a weboldal csak harmonizáló theme-color/háttérszínt adhat.
- **Javasolt Conventional Commit:** `feat(M11.3): add iPhone PWA edge-to-edge support`.

## M11.2 — Supabase Auth jelszó-helyreállítás (2026-10-28)

Státusz: **READY WITH LIMITATIONS**. A bejelentkezésről elérhető az elfelejtett jelszó oldal. A helyreállító kérelem a Supabase `resetPasswordForEmail()`-t és ugyanazon origin dedikált PKCE callbackjét használja; a callback egyszer használatos kódot cserél sessionre, majd rövid életű HttpOnly recovery-jelölést állít be. Jelszó csak érvényes Supabase-felhasználói session és callback-jelölés mellett módosítható; siker után a helyi session lezárul. A Beállítások jelszócseréje ugyanazt az új jelszó/megerősítés validációt használja, és támogatja az opcionálisan megadott jelenlegi jelszót (`current_password`). Séma, RLS, kalkulátor és üzleti adat nem változott.

- **Ok:** korábban nem volt helyreállító űrlap vagy callback útvonal; a Supabase alap Site URL-re irányíthatta a levelet, ezért a felhasználó a bejelentkezésre jutott. SSR-kliens `@supabase/ssr` PKCE flow-ja már létezett.
- **Ellenőrzés:** célzott Vitest **4 fájl / 11 teszt PASS**; érintett ESLint **PASS**; izolált `npm run build` Next.js 16.4.2-vel **PASS**; a builden belüli TypeScript ellenőrzés **PASS**. Helyi `localhost:3000` böngészőben a belépési link, recovery űrlap, üres/hibás e-mail validációja és code nélküli callback hibája ellenőrizve; recovery levélküldés nem történt.
- **Hosted beállítás szükséges:** a Supabase Auth Redirect URLs listájához vedd fel pontosan `https://badogoshelptool.vercel.app/auth/callback/recovery` címet. A meglévő Site URL maradjon az éles app gyökere. Ellenőrizd, hogy a Recovery email template linkje a `{{ .ConfirmationURL }}`-t használja; egyedi template esetén az oda-visszairányítás a `{{ .RedirectTo }}` értékét tartsa meg.
- **Korlát:** hosted Supabase redirect/template konfigurációt, valódi emailt, lejárt/újrahasznált hosted recovery kódot és tényleges új jelszavas belépést nem teszteltem. Light theme és 375 px viewport böngészős ellenőrzése sem történt; fizikai mobilteszt nincs.
- **Javasolt Conventional Commit:** `feat(M11.2): add PKCE password recovery and unify password changes`.

## M11.1 — Vercel DEMO feltöltési előkészítés (2026-10-28)

Státusz: **READY WITH LIMITATIONS**. A felmérési és kivitelezési fotók kliensoldali optimalizálást kaptak, 3 MiB fájl/4 MiB kérés határral; kivitelezési képek egyesével mennek Server Actionön keresztül. A szerver mindkét úton Sharp-pal újrakódol és eltávolítja az EXIF/GPS adatokat. A fotós kivitelezési PDF beágyazott képei legfeljebb 2000 px-esek, a PDF streamelve készül. A writer adapterek transaction-pooler kompatibilisek: a 10 s statement timeout role-level migrationben van, nem session startup paraméterként. Nincs adatmodell- vagy táblaséma-változás. Részletek: [Vercel DEMO preflight](VERCEL_DEMO_PREFLIGHT.md).

- **Ellenőrzés:** célzott Vitest 5 fájl / 15 teszt PASS (optimalizáló, felmérési fotók, report képméretezés, normalizáló, riport PDF/stream); ESLint PASS; `npm run typecheck` PASS; izolált `npm run build` Next.js 16.4.2-vel PASS; `git diff --check` PASS. QA-ban a 12 Node `pg.Client` writer egyedi `statement_timeout` startup paraméterét kiváltottam; új `064` pgTAP assertion és forward migration a 10 s timeoutot restricted role-ra teszi. Migration pgTAP nem futott, mert a local Supabase sem futott. Böngészős smoke nem futott (local app/DB port nem hallgatott; Playwright nincs telepítve), és nincs valós DEMO-képkészlet. Hosted Supabase/Vercel, valós DEMO fotóminőség, jogosultsági ellenőrzés és restore **nem ellenőrzött**.
- **Javasolt Conventional Commit:** `feat(M11.1): optimize photo uploads and prepare Vercel DEMO limits`

## M10.3.2 — Keresztforrásos ajánlati tételátfedés jelzése (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. Az ajánlatszerkesztő a pontosan egyező, normalizált megnevezésű és egységű, anyaglista- és kalkulációs forrásból származó anyagsorokat nem blokkoló figyelmeztetéssel jelzi, megmutatva a forrást és a rögzített revíziót. Az eredeti sorok, mennyiségek, egységárak és összegek változatlanok maradnak; automatikus összevonás, mennyiségi korrekció, fuzzy egyezés és DB/üzleti szabály nem került be.

- **Bizonyíték:** `src/features/quotations` Vitest: 15 fájl / 57 teszt PASS; érintett ESLint PASS; izolált `npm run typecheck` és production build PASS. Böngészős DEMO V1-ben a jelzés újranyitás után megjelent (ajánlat `e3308e98-cfb1-402e-af38-ac844dd4ae71`, V1 `6f4f8259-8fb4-4de7-9175-5ee3484a8ef3`); az eltérő megnevezésű V2-ben eltűnt, majd a változatlan történeti V1 megnyitásakor visszatért. 375×812 és 1440×900 méreten világos/sötét témában vizuálisan ellenőrizve; 375/1440 px vízszintes túlcsordulás nem volt, konzolhiba nem jelent meg.
- **Korlátok:** csak pontos név+egység egyezést jelez; az eltérő specifikációkat, mennyiségeket nem értelmezi. Fizikai mobilteszt, PDF újrarenderelés és adatbázis-teszt nem futott; nem volt PDF-, DB- vagy jogosultsági kód/migráció változás. A PDF/UI pénzügyi újraegyeztetéshez az ár nélküli DEMO sorok nem alkalmasak.
- **Javasolt Conventional Commit:** `feat(M10.3.2): warn about potential cross-source quotation item overlaps`.

## M10.3.1 — Kombinált anyaglista + kalkulációs forrás egy ajánlati revízióban (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. A végső QA lefedte az E11 RPC negatív eseteit és atomikus rollbackjét (18/18 combined-source pgTAP), a többoldalas PDF-et, a pénzügyi paritást, a négy kért Chromium responsive viewportot, a célzott Vitestet (51/51), lintet, izolált typechecket/buildet és a kapcsolódó pgTAP-regressziót (összesen 61/61). A teljes Vitest-regressziót nem futtattam újra, a responsive ellenőrzés nem valódi eszközön történt, E03 lehetséges átfedési jelzése pedig csak dokumentált, nem implementált UX-javaslat. Részletek: [M10.3.1 végső QA](M10_PHASE3_QA_REMEDIATION.md).

Egy standalone ajánlat-piszkozat mostantól **egy mentésben** vehet át mennyiséget egy anyaglista-revízióból ÉS egy kalkulációs revízióból is. A `save_standalone_quotation_from_calculation`/`save_standalone_quotation_from_material_list` RPC-k és validációik változatlanok; az új, forward-only migráció (`20261027030000_quotation_combined_source.sql`) regisztrálja a `save_standalone_quotation_from_material_list_and_calculation` wrappert. Az action-réteg a meglévő form-adatok alapján választja ki a három RPC közül a megfelelőt.

### Az eredeti implementációs napló (remediáció előtti állapot)

Az alábbi állítások az első combined-source implementáció átadáskori állapotát rögzítik, a fenti remediation még nem történt meg. Az ottani teszt- és QA-eredmények történeti jelentések; a friss átvételi bizonyíték a [remediation riportban](M10_PHASE3_QA_REMEDIATION.md) található.

- **Nem változott:** a két meglévő önálló RPC, a kliens UI forráspanelek, a PDF-generálás, a pénzügyi/ÁFA szerződés, a korábbi (csak egy forrású) ajánlatok és revízióik.
- **Ellenőrzés:** új `063_quotation_combined_source.sql` pgTAP 10/10 PASS (kombinált mentés, idempotens retry duplikáció nélkül, ütköző sor-hozzárendelés elutasítása); teljes `supabase test db --local` 65 fájl/1362 teszt PASS; `database.types.ts` újragenerálva (`npm run db:types`); célzott Vitest (`standalone-quotation-calculation-source.test.ts` + teljes `src/features/quotations`/`src/app/ajanlatok`) 12 fájl/49 teszt PASS; teljes `npm test` 192 fájl PASS/8 SKIP, 1236 teszt PASS/19 SKIP; ESLint PASS; izolált (`git worktree`) `npm run typecheck` és production build PASS; `git diff --check` PASS. Böngészős E2E nem futott ebben a menetben (a hatókör egy DB RPC + action-routing változás, UI-komponens nem módosult).
- **Javasolt Conventional Commit:** `feat(M10.3.1): allow a standalone quotation to combine a material-list and a calculation source in one revision`.

### M10.3.1 remediation ellenőrzés

- **Megvalósítva:** normál UI két egymástól független, mentett revíziót választó vezérlője; PDF egység- és forrás/revízió címkéi; helyes tételszám; stabil React-listakulcsok. A kombinált V1 mentés/újranyitás és V2 létrehozás böngészőből ellenőrizve.
- **Végső ellenőrzés:** helyi pgTAP `063` 18/18, `033` 13/13, `058` 16/16 és `062` 14/14 PASS; `npm exec vitest run src/features/quotations` 26 fájl / 51 teszt PASS; érintett ESLint PASS; izolált `npm run typecheck` és `npm run build` PASS. A PDF valódi, 4 oldalas A4 render; a felülettel egyező nettó összeg 366 200 HUF. A kért 375×812 világos/sötét, 812×375 fekvő és 1440×900 Chromium responsive-emulációban ellenőrizve; 375/812 szélességen mért vízszintes túlcsordulás nincs; konzolhiba nem jelent meg.
- **Korlátok:** teljes Vitest-regressziót ebben a záró menetben nem futtattam; fizikai mobil eszközt nem teszteltem; E03 nem blokkoló duplikációs figyelmeztetés nincs implementálva (az ajánlást lásd a QA riportban). A végső `git diff --check` PASS.
- **Javasolt Conventional Commit:** `fix(M10.3.1): complete combined-source acceptance and PDF provenance`.

## M10.3 — Anyagszükséglet → árajánlat: felmérés és a PDF-forrásjelzés lezárása (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. A kért "mentett anyagszükséglet → árajánlat" munkafolyamat célzott felmérése azt mutatta, hogy a teljes folyamat (kalkuláció → ajánlattétel-jelölt, kézi anyag-/munkadíjsor, árazás, mentés, revízió, nyomtatás) **már megvalósult** az M4 (`687a9cc`, 2026-10-25) és a megelőző F8/F9.x mérföldkövekben — nem épült mellé második árajánlat-rendszer. Három, a felmérésben dokumentált, nyitott korlátból egyet zártam le; a másik kettő tudatosan nyitva maradt.
- **Lezárva:** a standalone piszkozat PDF (`/api/ajanlatok/[quotationId]/pdf`) mostantól feltünteti a mennyiségi forrás kalkulátorát, nevét és revízióját (`Mennyiségi forrás: <kalkulátor> · <név> · v<szám>`), ha a revízióhoz van kalkulációs forrás. Érintett fájlok: [`standalone-quotation-pdf.ts`](../src/features/quotations/standalone-quotation-pdf.ts), [`quotation-document.tsx`](../src/features/quotations/quotation-document.tsx), [`route.ts`](../src/app/api/ajanlatok/[quotationId]/pdf/route.ts).
- **Már megvolt, nem igényelt kódot:** önálló munkadíjsor bármely ajánlathoz szabadon felvehető ("+ Munkadíj" az ajánlatszerkesztőben), tetszőleges mennyiséggel/egységgel/árral — függetlenül attól, hogy a többi tétel kalkulációból vagy anyaglistából érkezett.
- **Tudatosan nyitva maradt, később lezárva:** egy ajánlati revízió ekkor még csak egyféle automatikus forrásból (anyaglista VAGY kalkuláció) vehetett át mennyiséget. Lásd [M10.3.1](#m1031--kombinált-anyaglista--kalkulációs-forrás-egy-ajánlati-revízióban-2026-10-27) — a felhasználó jóváhagyásával, külön menetben lezárva.
- **Ellenőrzés:** célzott Vitest (`standalone-quotation-pdf.test.ts`, `calculation-quotation-source.test.ts`, teljes `src/features/quotations` + `src/app/api/ajanlatok`) 13 fájl/62 teszt PASS; izolált (`git worktree`) `npm run typecheck` és ESLint PASS a módosított fájlokra. Teljes Vitest-regresszió, production build és böngészős E2E ebben a menetben nem futott (a hatókör — egy opcionális PDF-sor hozzáadása — nem indokolta).
- **Javasolt Conventional Commit:** `feat(M10.3): show the calculation source on the standalone quotation PDF`.

## M10.2.1 — RPC trust-boundary javítás és négyirányú E2E véglegesítés (2026-10-27)

Státusz: **PASS**. A független M10.2 QA ([`M10_PHASE2_INDEPENDENT_QA.md`](M10_PHASE2_INDEPENDENT_QA.md), FAIL) két blokkolóját javítottam: (1) a `save_standalone_construction_calculation` RPC forrás-lekérdezése NULL-ra futott idegen létrehozójú/szervezetű vagy nem létező forrásnál, ezért a tervezett korai `42501` guard helyett a dependency-trigger `P0001` hibájával bukott el — javítva egy új, forward-only migrációval (`20261027020000`) explicit `is null` ellenőrzéssel, ugyanazzal a nem-szivárogtató hibaüzenettel. (2) A négy új kapcsolat (material-takeoff↔timber-cutlist, material-takeoff/timber-cutlist→rafter-cut) teljes mentés–újranyitás E2E-je élő böngészőből, DB-vel kereszt-ellenőrizve lezajlott; a fordított geometria (8000 mm/35°/HAP 60 mm) pontosan `4000 mm` fél fesztávot és `2860.830152838839 mm` gerincemelkedést adott mindkét forrásnál. Részletek: [M10.2.1 riport](M10_PHASE2_P1_REMEDIATION_AND_E2E.md).

- **Ellenőrzés:** `supabase test db --local` (060–062, 2 új negatív assertion) 60/60 PASS; célzott Vitest 3 fájl/60 teszt PASS; ESLint PASS; izolált (`git worktree`) typecheck és production build PASS; `git diff --check` PASS; négy élő böngészős E2E (mentés→teljes újranyitás→DB-dependency-ellenőrzés) mind a négy irányra PASS; Mégse/Confirm/Undo és kézi-szerkesztés-utáni Undo-tiltás élőben PASS; 375×812 világos/sötét, 812×375, 1440×900 nézetmátrix PASS, konzolhiba nélkül. Teljes Vitest-regresszió ebben a menetben nem futott újra (a hatókör nem indokolta).
- **Javasolt Conventional Commit:** `fix(M10.2.1): make the field-transfer source guard NULL-safe and verify all four new connections end-to-end`.

## M10.2 — Kalkulátorok közötti geometriai adatkapcsolatok bővítése (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. Az M10.1 egyirányú (`roof.rafter-cut → roof.material-takeoff`/`roof.timber-cutlist`) mezőátviteli rendszere két új, szakmailag bizonyított iránnyal bővült: (1) `roof.material-takeoff ↔ roof.timber-cutlist` teljes mezőkészlet-átvétel (azonos mezőséma, bármely tetőforma, konverzió nélkül); (2) `roof.material-takeoff`/`roof.timber-cutlist` (gable) → `roof.rafter-cut`, az M10.1 gable-geometria konverzió matematikai inverze (`convertRafterCutGeometryFromGable`), kötelező forrás-HAP-pal és explicit szimmetria-jóváhagyással. A `save_standalone_construction_calculation` RPC forrás/cél-ellenőrzése egy új, forward-only migrációban (`20261027010000`) egy explicit pármátrixra általánosítva; a `roof.truss-members` tudatosan kimaradt (nincs közös mező semelyik másik kalkulátorral). Nincs új Felmérés/Projekt modul, a Kalkulátorok maradtak a kiindulópont. Részletek: [M10.2 riport](M10_PHASE2_CALCULATOR_CONNECTIONS.md).

- **Ellenőrzés:** célzott Vitest (domain reverse-konverzió, mezőleképezés, adatlekérdezés) 60 teszt PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1235 teszt PASS/19 SKIP; ESLint PASS; `tsc --noEmit` PASS; izolált (rsync-elt) production build PASS; `git diff --check` PASS; helyi, reset nélküli migráció-alkalmazás és rollback-be csomagolt funkcionális RPC-smoke (új párok sikeresek, `truss-members` forrás elutasítva) PASS; élő böngészős E2E mindkét új irányra valós DEMO forrásokkal (8000mm/35°/HAP 60mm gable → rafter-cut teljes eredményig, és teljes 23 mezős material-takeoff↔timber-cutlist diff) PASS. NOT VERIFIED: teljes viewport×téma mátrix, Undo élő próbája az új irányokra, pgTAP (nincs séma/RLS-változás).
- **Javasolt Conventional Commit:** `feat(M10.2): add material-takeoff/timber-cutlist sibling transfer and reverse gable geometry into rafter-cut`.

## M10.1.10 — Végső numerikus QA és M10.1 lezárás (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. Függetlenül ellenőriztem az M10.1.9 production outputsEquivalent comparatorát. A unit: "db"-s lines és beágyazott takeoff értékek, valamint a cutList.count pontos összehasonlítása nagy nagyságrenden is driftet jelez; a folytonos eltérések 1e-6 felső toleranciával, a struktúra/type/missing-field eltérések pedig szigorúan viselkednek. A három dokumentált Karmi ULP-különbség nem okoz hamis driftet. A két kért DEMO V1 rekordot frissen újranyitottam: mindkettő Mentve · V1, drift nélkül, letiltott V2 mentéssel és látható számított eredményekkel. Nincs fennmaradó bizonyított P1/P2; az M10.1 lezárható.

- **Ellenőrzés:** célzott save-panel Vitest 13/13 PASS; ideiglenes production-comparator szélsőérték-teszt 3/3 PASS (a fájlt eltávolítottam); mindkét V1 friss böngészős újranyitása PASS; git diff --check PASS. A m²/m³ szakmai toleranciája nincs külön formalizálva, ez P3 korlát; teljes suite, build, lint, typecheck és DB előtte/utána lekérdezés nem futott.
- **Javasolt Conventional Commit:** docs(M10.1.10): record final numerical QA and close M10.1

## M10.1.9 — Domain-aware output-drift összehasonlítás véglegesítése (2026-10-27)

Státusz: **PASS**. A független M10.1.8 numerikus QA ([`M10_PHASE1_FINAL_NUMERICAL_QA.md`](M10_PHASE1_FINAL_NUMERICAL_QA.md)) bizonyított P2-jét javítottam: a korábbi `outputsEquivalent` korlátlanul a nagysággal növő relatív toleranciája milliárdos `LAYOUT` darabszámnál elrejthetett egy valódi `+1` eltérést. A javítás diszkrét mezőket (`unit: "db"`, `cutList`-`count`) pontosan hasonlít össze, függetlenül a nagyságtól; a folytonos mezők (hossz, szög, terület, térfogat) toleranciáját egy domain-kontraktushoz illesztett felső korláttal (`1e-6`) zártam le. `NaN`/`Infinity` mostantól sosem egyenértékű, még önmagával összevetve sem. Részletek: [M10.1.9 riport](M10_PHASE1_FINAL_NUMERIC_REMEDIATION.md).

- **Ellenőrzés:** célzott `construction-save-panel.test.tsx` 13/13 PASS (4 új/kibővített teszt); teljes Vitest 192 fájl PASS/8 SKIP, 1221 teszt PASS/19 SKIP; ESLint PASS; izolált (`git worktree`) typecheck és production build PASS; `git diff --check` PASS. Böngészős ellenőrzés egy élő `roof.timber-cutlist` mentett revízión hamis drift nélkül; a feladatban megnevezett két konkrét DEMO azonosító ebben a szervezetben nem volt elérhető — a két konkrét revízió újranyitása **nem verifikált**.
- **Javasolt Conventional Commit:** `fix(M10.1.9): cap continuous-value drift tolerance and compare discrete counts exactly`.

## M10.1.7 — Output-drift tolerancia és M10.1 lezárása (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. A független M10.1.6 QA ([`M10_PHASE1_DRIFT_INDEPENDENT_QA.md`](M10_PHASE1_DRIFT_INDEPENDENT_QA.md)) által bizonyított egyetlen nyitott P2-t javítottam: a mentett vs. élő output-összehasonlítás eddig pontos JSON-string egyezést követelt, ezért a Karmi trigonometrikus eredmények gépi pontosságú (`~1e-14`) utolsó-bit eltérése hamis drift-figyelmeztetést okozott. Az összehasonlítás mostantól egy rekurzív, strukturális `outputsEquivalent` függvény (`construction-save-panel.tsx`), amely csak `number`–`number` pár között enged szűk (`1e-9` abszolút + relatív) toleranciát; struktúra, típus, string, hiányzó/`null` mező és minden érdemi numerikus/darabszám-eltérés továbbra is driftet jelez. Az M10.1.5 ideiglenes dev-only drift-logoló `useEffect`/`console.debug` eltávolítva; a `outputDriftDiffPaths` diagnosztikai helper tiszta, tesztelt utilityként megmaradt. Részletek: [M10.1.7 javítási riport](M10_PHASE1_DRIFT_FIX_AND_CLOSURE.md).

- **Ellenőrzés:** célzott `construction-save-panel.test.tsx` 13/13 PASS (2 új teszt); 7 fájlos célzott regressziós kör 109/109 PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1219 teszt PASS/19 SKIP; ESLint PASS; izolált (`git worktree`) typecheck és production build PASS; `git diff --check` PASS. Böngészős E2E a két korábbi DEMO revízión **NEM VERIFIKÁLT** — az `admin1@testadmin.com` munkamenet nem volt elérhető ebben a menetben, és jelszó nélkül nem kíséreltem bejelentkezést.
- **Javasolt Conventional Commit:** `fix(M10.1.7): tolerate machine-precision output-drift noise and drop the dev-only drift logger`.

## M10.1.5 — Célvalidáció, output-drift diagnosztika és transfer-state javítás (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. A végső független QA ([`M10_PHASE1_FINAL_ACCEPTANCE.md`](M10_PHASE1_FINAL_ACCEPTANCE.md), FAIL) egy új P1-jét és két P2-jét vizsgáltam. **P1 javítva:** a célkalkulátor (`roof.material-takeoff`/`roof.timber-cutlist`) `pitchDegrees` mezője 80°/81°-ot is elfogadott gable formánál, mert a gable-geometria saját, régebbi motorja `<90°`-ot enged, míg a többi tetőforma a megosztott `<80°` sémát használja. A gyökérok az eltérő, dokumentálatlan forma-specifikus séma volt. A tényleges javítás a célkalkulátor közös trust boundary-jében (`fieldContractIssues`, `construction-computation.ts`) történt — ugyanazt a `pitch` (`<80°`) sémát futtatja a nyers mezőn, kliens és szerveroldali mentő Action egyaránt (ugyanaz a `computeConstruction` hívás), és érvénytelen mezőnél soha nem készül teljes geometria/eredmény. **P2 (transfer-state szivárgás kalkulátorváltáskor) javítva:** `transferSource`/`transferApplied` kalkulátoranként tárolt map lett, a már meglévő `drafts`/`materialByCalculator`/`sessions` mintázatot követve — kalkulátorváltás nem mutat idegen eredetjelzést, visszaváltáskor a még nem mentett átvétel megmarad. **P2 (output-drift) nyitva maradt:** a jelen DEMO szervezetben a korábbi QA-ban mentett átviteles rekordok már nem léteznek, a pontos reprodukciós lépéssor ebben a menetben nem volt újrajátszható, ezért gyökérokot nem azonosítottam és nem alkalmaztam feltételezett javítást; helyette egy ideiglenes, dev-only strukturális diff-helper (`outputDriftDiffPaths`) készült a következő menethez. Részletek: [M10.1.5 riport](M10_PHASE1_VALIDATION_AND_DRIFT_REMEDIATION.md).

- **Ellenőrzés:** célzott Vitest (construction-computation/save-panel/drafts + roof-geometry/gable-roof/construction domain) 26 fájl/298 teszt PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1217 teszt PASS/19 SKIP; ESLint PASS; `npm run typecheck` PASS; izolált production build (rsync-elt másolat, symlinkelt `node_modules`/`.env.local`) PASS; `git diff --check` PASS; élő böngészős E2E a helyi hitelesített `demo.owner@local.test` DEMO-munkamenetben: 79,9°/80°/81° pitch határeset mindkét célkalkulátoron, A→B→A kalkulátorváltás transfer-state konzisztencia.
- **Javasolt Conventional Commit:** `fix(M10.1.5): enforce the shared pitch bound on the direct calculator field, scope transfer state per calculator, add output-drift diagnostics`.

## M10.1.3 — Mezőnkénti geometriai invalidáció és atomi forma-váltás (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A végső független QA ([`M10_PHASE1_FINAL_INDEPENDENT_QA.md`](M10_PHASE1_FINAL_INDEPENDENT_QA.md) §16.4, FAIL) által élőben bizonyított P1-et javítottam: `invalidateGableGeometryOnShapeChange` eddig a `widthMm`/`pitchDegrees` mezőt egyetlen `.every()`-vel kezelte, ezért csak az egyik kézi módosítása után a másik (változatlan) mező is bent maradt forma-váltás után. A javítás mezőnként, egymástól függetlenül dönt. Architekturálisan a forma-váltás és az invalidáció egyetlen atomi draft-frissítéssé lett (`applyFieldChange`, `construction-drafts.ts`), a tulajdonos (`ConstructionCalculatorSuite.updateValue`) hívja; az átvétel-nyomkövetés (`applied`) a szülőbe került, a gyermek `ConstructionFieldTransferControl` már nem végez saját, render utáni korrekciót. A material-takeoff output-drift (§16.6) gyökérokát egy valódi, a helyi DB-ben megmaradt mentett revízión vizsgáltam: a mentés/visszaolvasás snapshot-logikája a jelenlegi kóddal bit-pontosan reprodukálja a mentett eredményt — a snapshot-matematikában nincs hiba; az élő, pillanatnyi előfordulás nem reprodukálható újra, nyitott kockázatként dokumentálva. Részletek: [M10.1.3 végső javítási riport](M10_PHASE1_P1_FINAL_REMEDIATION.md).

- **Ellenőrzés:** célzott `rafter-connection-fields.test.ts` 18/18 PASS, új `construction-drafts.test.ts` tulajdonos-szintű állapotátmenet-tesztek 8/8 PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1210 teszt PASS/19 SKIP; ESLint PASS; `tsc --noEmit` PASS; `git diff --check` PASS; élő böngészős QA a helyi hitelesített DEMO session-ben (gable átvétel → csak `widthMm` kézi módosítás → gable→hip váltás → `widthMm` megmaradt, `pitchDegrees` resetelt; hip→gable nem éleszt újra; „Új kalkuláció” törli az átvétel-feliratot) PASS. Production build nem futott (aktív `next dev` a fő checkoutban, izolált build nem volt elérhető ebben a menetben); mobil/tájkép/desktop vizuális mátrix ebben a menetben nem futott újra.
- **Javasolt Conventional Commit:** `fix(M10.1.3): invalidate transferred gable geometry per field, make the shape-change draft update atomic in the owner`.

## M10.1.2 — Független QA P1/P2 javítás (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A független audit ([`M10_PHASE1_INDEPENDENT_QA.md`](M10_PHASE1_INDEPENDENT_QA.md), FAIL) két P1 és egy P2 hibáját javítottam: (1) a gable-transfer helper mostantól a cél tényleges `<80°` validátorát hívja újra a korábbi, tőle eltérő `>=90°` határ helyett; (2) tetőforma-váltáskor (gable → hip/shed) az átvételből származó, azóta kézzel nem módosított `widthMm`/`pitchDegrees` automatikusan visszaáll az átvétel előtti értékre, hogy ne szennyezze más tetőforma számítását — a Karmi-mezőket és a kézi módosítást nem érinti; (3) a preview mostantól „≈” jelöléssel és a teljes pontosságú értékkel együtt mutatja a kerekített hajlásszöget. Részletek: [M10.1.2 javítási riport](M10_PHASE1_P1_REMEDIATION.md).

- **Ellenőrzés:** célzott `construction.test.ts`+`rafter-connection-fields.test.ts` 2 fájl/35 teszt PASS; kiterjesztett célzott kör 8 fájl/87 teszt PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1201 teszt PASS/19 SKIP; ESLint PASS; izolált git worktree-ben typecheck és build PASS; `git diff --check` PASS. Mentés–újranyitás E2E és vizuális mátrix a blokkolt helyi bejelentkezés miatt NOT VERIFIED.
- **Javasolt Conventional Commit:** `fix(M10.1.2): align gable pitch bound with target schema, stop cross-shape geometry leak, clarify rounded preview`.

## M10.1 — Nyeregtető geometriai adatátadás (Fázis 1, 2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. Mentett `roof.rafter-cut` revízióból, kizárólag gable célformánál és a felhasználó explicit szimmetria-jóváhagyása mellett, a `widthMm`/`pitchDegrees` mezők matematikai konverzióval (`widthMm = 2 × horizontalHalfSpanMm`, HAP-pal csökkentett `pitchDegrees = atan2(rise − HAP, halfSpan)`) átvehetők a meglévő „Adatok átvétele” vezérlőn keresztül. A jóváhagyás nélkül csak a már bizonyított csatlakozási/eresz mezők vehetők át; nem-gable formáknál a geometriai szekció meg sem jelenik. Hiányzó/érvénytelen/tartományon kívüli forrásgeometria explicit hibakóddal (`MISSING_HAP`/`INVALID_HAP`/`INVALID_SOURCE_GEOMETRY`/`TARGET_RANGE`) utasítja el az átvételt, becslés nélkül. Élő böngészős E2E-vel igazolva (4000/2800/100 mm forrás → 8000 mm / 34,01934998982646° pontos átvétel, Visszavonás, tetőforma-váltás utáni azonnali geometriai szekció-eltűnés, mobil 375×812 nézet). Részletek: [M10 Fázis 1 gable geometria riport](M10_PHASE1_GABLE_GEOMETRY_IMPLEMENTATION.md).

- **Ellenőrzés:** célzott `construction.test.ts` + `rafter-connection-fields.test.ts` 29/29 PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1195 teszt PASS/19 SKIP; ESLint PASS; izolált typecheck és build PASS; `git diff --check` PASS.
- **Javasolt Conventional Commit:** `feat(M10.1): transfer validated gable geometry from saved rafter cuts`.

## M10.1 — Vízszintes ereszkiülés mezőleképezés (Fázis 1, 2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A tervdokumentum `[ELLENŐRZENDŐ]` ereszkiülés-névváltozat kérdését (`roof.rafter-cut` `eaveProjectionMm` vs. a geometriai kalkulátorok `eaveOverhangMm`-je) forráskód-szinten (nem csak szöveg alapján) igazoltam azonosnak — mindkettő ugyanarra a fél fesztávra rakódik rá vízszintesen, ugyanazzal a `halfSpan = width/2` és `atan2(rise, halfSpan)` képlettel. A mezőleképezés explicit kulcstáblázattá alakítva (`RAFTER_JOINT_TRANSFER_FIELD_MAP`), az ereszkiülés mostantól átvehető a meglévő "Adatok átvétele" vezérlőn keresztül. Élő böngészős próbával igazolva (0 mm → 500 mm előnézet és tényleges kitöltés). Szándékosan **nem** valósult meg a fél fesztáv/emelkedés ↔ szélesség/hajlásszög leképezés, mert a `halfSpan = width/2` összefüggés csak nyereg-/félnyeregtetőre igazolt, a többi (kontytető, sátortető, stb.) formára nem — ez a tervdokumentum saját tiltása szerint külön, formánkénti igazolást igénylő, önálló feladat. Részletek: [M10 Fázis 1 riport](M10_PHASE1_EAVE_OVERHANG_MAPPING.md).

- **Ellenőrzés:** célzott `rafter-connection-fields.test.ts` 8/8 PASS; teljes Vitest izolált worktree-ben 192 fájl PASS/8 SKIP, 1189 teszt PASS/19 SKIP; ESLint PASS; izolált typecheck és build PASS; `git diff --check` PASS.
- **Javasolt Conventional Commit:** `feat(M10.1): map the eave-overhang field between rafter-cut and the geometry-based roof calculators`.

## M10.0.3 — Adatátvételi UX, DB-regresszió és TypeScript-kompatibilitás véglegesítése (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. Az M10 mezőátvételi felület kétlépésessé vált (előnézet mezőnkénti jelenlegi/új érték összehasonlítással, csak megerősítés után ír draftot), rövid, konfliktusbiztos visszavonást kapott, és a forráslista mostantól megkülönbözteti a betöltési hibát a valódi üres állapottól. Két hiányzó pgTAP-regresszió pótolva és lefuttatva (dependency-hiba utáni teljes rollback; M10 célrevízió sikeres ajánlatforrás-kapcsolása) — **Files=6, Tests=112, PASS**. A `database.types.ts` szinkronizálva a tényleges 10 paraméteres RPC-vel (egyetlen releváns sornyi diff). Teljes Vitest (1187/1187 PASS), lint, izolált típusellenőrzés és production build mind PASS. A helyi `tetopro_covering_writer` DB-writer `28P01` hitelesítési hibáját diagnosztizáltam (a szerepkörnek jelszó nélküli, friss migráció-állapota volt) és a dokumentált helyi eljárással, kizárólag ezt az egy, saját elkülönített fejlesztői szerepkört érintve javítottam. Ezután élő böngészős E2E mindkét célkalkulátoron: DEMO forrás mentése, előnézet (egyező/változó mező helyes megkülönböztetése), Mégse (draft változatlan), megerősítés, Visszavonás (draft-visszaállítás), ismételt megerősítés, mentés, friss navigációval újranyitás (érték perzisztál), dependency és attestáció közvetlen DB-ellenőrzése — mind **PASS**. 375×812 világos/sötét téma PASS. NOT VERIFIED maradt: 812×375 tájfekvés, a teljes 8 mezős mátrix egyszerre, és a kézi-módosítás-utáni Visszavonás-eltűnés élő reprodukciója. Részletek: [M10 Fázis 0.3 riport](M10_PHASE0_UX_AND_REGRESSION_FINALIZATION.md).

- **Javasolt Conventional Commit:** `feat(M10.0.3): add field-transfer preview/undo UX, two pgTAP regressions and type sync`.

## M9.16 — Karmi-kiszabás szakmai és használhatósági véglegesítése (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A „Vízszintes ereszkiülés” mező korábbi, lejtésirányú megfogalmazása ("Ereszkiülés a lejtés irányában") javítva mindhárom kalkulátorban (közös definíció, `eaveOverhangMm`); a domainkód bizonyítottan vízszintes vetületi távolságként kezeli ezt az értéket. HAP, derékszelemen és gerinckapcsolat mezői felülvizsgálva: már korábban pontosak, nem módosítottam. Felhasználói jóváhagyás után helyi teszt-bejelentkezéssel (`demo.owner@local.test`) élő böngészős workflow-QA mindhárom kalkulátoron: Karmi-only, anyag-only, kombinált, kontytető-fallback és mentés–újranyitás E2E mind PASS, a 88,00 m² vízszintes vetületi terület pontosan igazolja az ereszkiülés-javítást. Derékszelemen disclosure élő tesztje nem reprodukálta a korábban dokumentált korlátot. NOT VERIFIED maradt: teljes nézetméret×téma mátrix, fizikai telefonteszt, régi snapshotok kompatibilitása. Részletek: [M9.16 QA riport](M916_KARMI_PROFESSIONAL_WORKFLOW_QA.md).

- **Ellenőrzés:** célzott `npx vitest run src/features/calculators` 16 fájl/90 teszt PASS; teljes `npm test` 192 fájl PASS/8 SKIP, 1184 teszt PASS/19 SKIP; `npm run lint` PASS; izolált git worktree-ben `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS.
- **Javasolt Conventional Commit:** `fix(M9.16): correct the horizontal eave-overhang label and finalize Karmi terminology QA`.

## M9.15 — Karmi workflow és szarufatermék-választó (2026-10-26)

Státusz: **PARTIAL / célzott UI-változás ellenőrizve; a teljes elfogadási mátrix nincs bizonyítva.** A három tetőkalkulátorban a Karmi- és csatlakozási beállítások önálló, „Szarufák és bevágások” nevű blokkba kerültek, a generikus opcionális számítások disclosure-ja mellől. Az anyagkimutatás és a faanyag-vágáslista meglévő bekapcsolója indítja a progresszív mezősort: szarufa-keresztmetszet → talpszelemen/szarufa → derékszelemen → gerinckapcsolat. A közös szarufatermék/kézi keresztmetszet-szerkesztő ebben a szekcióban használható; ugyanaz a state táplálja a bevágásszámítást és a faanyagkalkulátort, duplikált szerkesztő nélkül. A szarufa-kiszabás HAP mezője az alapgeometriában marad.

- **HAP terminológia:** a UI mezőcíme most „Szarufa felső élének magassága a talpszelemen felett (HAP)”. A magyar tetőfedő mesteroktatási jegyzet a „kármi” szót kivágásként használja, de nem ad külön magyar nevet ennek a függőleges bemeneti méretnek. A forrás és geometriai összevetés: [M9.15 riport](M915_KARMI_WORKFLOW_UX.md). A kód és az input adapter mindhárom kalkulátorban ugyanazt a `seatCutHeightMm` bemenetet használja.
- **Rajz és adat:** a meglévő méretezett áttekintő, csatlakozásválasztó és részletrajz változatlan domain-eredményekből épül. A képletek, snapshotkulcsok, domainazonosítók, mentési validáció és jogosultsági/DB-határok nem változtak. A HAP domain eredménysorának stabil régi címkéje megmaradt; csak a beviteli mező elnevezése változott.
- **Ellenőrzés:** TDD RED/GREEN a mezőbesorolásra és a közös szarufaspecifikáció-szerkesztőre; célzott tesztek **8 fájl / 73 teszt PASS**. Teljes `npm test` → **192 fájl PASS / 8 SKIP; 1173 teszt PASS / 19 SKIP**. `npm run lint` → **PASS**; izolált, `/private/tmp` másolatban `npm run typecheck` és `npm run build` → **PASS**; `git diff --check` → **PASS**. Helyi Brave-ben rafter-cut blokkot képernyőképpel/AX-állapottal, mindhárom kalkulátor megnyitását, a material/timber bekapcsolót, a szarufatermék-szerkesztőt, a duplikáció hiányát és a gerincdeszka mezőt ellenőriztem.
- **Még nem ellenőrzött / korlát:** az új `roof.material-takeoff` és `roof.timber-cutlist` teljes adatbeviteles böngészős workflow-ja, 375 px/812 px/tablet viewportok és téma/szövegméret mátrix, valamint a részleges/hibás csatlakozás-rajz nincs bizonyítva. Nincs új derékszelemen jelenlét-választó vagy új rajzinterakció; a mezők opcionális csoportban vannak, és a már létező csatlakozásválasztó/részletrajz viselkedés maradt. Valódi ácsszakmai peer review nem történt.
- **Javasolt Conventional Commit:** `feat(M9.15): surface the rafter joint workflow across roof calculators`.

## M9.13 — Karmi terminológiai egységesítés és tető workflow QA (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A felhasználói felületen és az aktív kalkulátor-szövegekben a korábbi „madárszáj” megnevezés egységesen **Karmi** lett; a belső `birdsmouth*` típusok, property-k, kulcsok, snapshotok, RPC-k, migrációk és történeti bizonyítékok változatlanok. A célzott terminológiai teszt, az érintett kalkulátortesztje és a kitöltött helyi böngészős workflow-k PASS állapotot adtak. A részletes bemeneteket, eredményeket, korlátokat és a teljes verifikációs naplót a [Karmi terminológia és tető workflow QA riport](KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md) tartalmazza.

- **Aktív felület:** `roof.rafter-cut`, `roof.material-takeoff` és `roof.timber-cutlist` látható szövegei, HAP-/csomópont-segédek, eredménysorok és rajzfeliratok Karmi-t használnak.
- **Böngészős bizonyíték:** helyi, hitelesített DEMO Brave munkamenetben mentés nélkül ellenőrizve: kitöltött szarufa-kiszabás Karmi-részletrajzzal; teljes nyereg tetőanyag-kimutatás kézi, `DEMO` forrású alátét- és fedőtábla-adatokkal; kitöltött faanyag-vágáslista; konty- és sátortető geometriai smoke, dokumentált nem támogatott felsővágásokkal.
- **Adatbiztonság:** DB-migráció, mentés, éles Supabase-művelet, commit és deploy nem történt. A kézi anyagadatok csak helyi előnézetben szerepeltek, gyártói vagy áradatként nem lettek bemutatva.
- **Korlát:** a gyártói termékkatalógusos fedés workflow nem volt igazolható kiválasztott termékkel; a rendszer ezt helyesen hiányzó specifikációként jelzi. A mobil/tablet nézet e mérföldkőben nem kapott külön viewport-szintű újramérést.
- **Javasolt Conventional Commit:** `feat(M9.13): standardize Karmi terminology and verify roof workflows`.

## M9.12 — Egymást fedő csomópont-buborékok javítása a szarufarajzokon (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (csak prezentációs javítás; a számított geometria, szerződés és mentés nem változott). Felhasználói képernyőkép: erősen ránagyított „Szarufák és támaszok · áttekintő” rajzon a „Talpszelemen” és „Derékszelemen” csomópont-buborék egymásra csúszva, olvashatatlanul jelent meg.

- **Gyökérok:** a `SectionView` ([rafter-joint-drawing.tsx](../src/features/calculators/rafter-joint-drawing.tsx)) a buborékok helyét a támasz vetített pontjából számolja, a vászon aljához és széléhez klippelve (`Math.min(size.height-16, ...)`). Ha két támasz vetített pontja a vászon alsó szélén kívülre esik (nagy nagyításnál, elpanorázva), mindkét buborék ugyanarra a klippelt sorra kerül — ugyanazzal a bal szélű x-klippel is —, és pontosan fedésbe kerülnek. A buborékok eddig csak a méretcímkéknek számítottak akadálynak (M9.7), egymásnak nem.
- **Javítás:** minden buborék néhány függőleges eltolást próbál ki (közelebbit előbb, mindkét irányban), és az elsőt választja, amely nem fedi a már elhelyezett buborékokat — a vászon méretein belül maradva. Ha egyik eltolás sem szabad, az eredeti (klippelt) pozíció marad, ugyanazzal az elfogadott kompromisszummal, mint amit a `nudgeOffSegments` már a méretcímkéknél is használ. A megoldás a fájlban már meglévő `hitsAny`/`LabelBox` dobozütközés-ellenőrzést használja újra (korábban csak méretcímkéknél volt bevetve), nem vezet be új mechanizmust.
- **Ellenőrzés:** `npx eslint` PASS; izolált worktree-ben `npm run typecheck` PASS (a nem commitolt változással lefuttatva, a futó dev szerver `.next`-je érintetlen); `npx vitest run src/features/calculators src/domain/drawings` **19 fájl / 111 teszt PASS**. Böngésző (helyi dev, mentés nélkül), `roof.rafter-cut`-on a hibát pontosan reprodukáló bemenettel (fél fesztáv 600 cm, HAP 20 cm, derékszelemen 15/5 cm, 4×nagyítás): javítás előtt mérve a „Talpszelemen” és „Derékszelemen” buborék pontosan fedésben (mindkettő 386–410 px, bal szél 2 px); javítás után a két buborék külön sorban, fedés nélkül, mindkettő a 414 px magas vásznon belül. Ugyanez 375 px-es mobil nézetben is fedés nélkül. A `RoofJointDrawing` (a képernyőképen szereplő, két oldalas áttekintő) ugyanazt a `SectionView`-t használja, külön kóduttal nem rendelkezik. Konzolhiba nem jelent meg.
- **Nem változott:** a csomópontok geometriája, a `calculateRafterJoints`/`createRafterJointDrawingModel` kimenete, a méretcímkék (`nudgeOffSegments`) elhelyezési logikája.
- **Nem ellenőrzött / korlát:** a hiba automatizált, determinisztikus regressziós teszttel nem fedett — a kamera (nagyítás/pan) állapota nem elérhető propon keresztül a `RafterJointDrawing`/`RoofJointDrawing` nyilvános API-jából, ezért `renderToStaticMarkup`-pal nem reprodukálható kamera-szimuláció nélkül; a böngészős reprodukció és javítás-ellenőrzés szolgál bizonyítékul, ugyanúgy, mint a hasonló M9.7 címke-ütközési javításoknál. Teljes Vitest-regresszió és `npm run build` nem futott.
- **Javasolt Conventional Commit:** `fix(M9.12): keep overview joint badges from overlapping when clamped to the same edge`.

## M9.11 — Szarufa/léc keresztmetszet megadás egyszerűsítése (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (prezentációs egyszerűsítés; a termékválasztás, a kézi felülírás, a mentett szerződés és a számítás nem változott). Felhasználói képernyőkép és jelzés alapján: a `MaterialSpecEditor` ([material-spec-editor.tsx](../src/features/calculators/material-spec-editor.tsx)) „Termék” módban mindig egyszerre mutatta a termékválasztót és a nyers szélesség/magasság mezőket kitöltve — ugyanazt a két értéket két helyen.

- **Vizsgálat:** a `MaterialSpecEditor`/`RoofMaterialInputs` már ma is egységes mind a négy anyagcsoportra (szarufa, léc, alátét, fedőtábla) és mindkét kalkulátorra (`roof.material-takeoff`, `roof.timber-cutlist`); az eltérés nem a kalkulátorok között volt, hanem a `roof.rafter-cut` eltérő, egyszerű mezője (nincs anyagmennyiség-kontextusa) és a termék-mód belső zsúfoltsága között. **Döntés:** a `roof.rafter-cut` sima „Szarufa magassága” mezőjét szándékosan nem alakítottam termékválasztóssá — ott nincs anyagmennyiség-számítás, a termékkatalógus-UI indokolatlan többletkomplexitás lenne egy ma egyszerű kalkulátorban.
- **Rejtett kettős szerep felszínre hozva:** amikor a „Szarufacsatlakozások számítása” be van kapcsolva `roof.material-takeoff`-ban vagy `roof.timber-cutlist`-ben, a szarufa keresztmetszet magassága adja a bevágás-számítás bemenetét is ([plane-birdsmouth.ts:119](../src/domain/calculations/construction/plane-birdsmouth.ts:119)). Ez eddig láthatatlan volt; most a szekció tetején megjelenik: „A magasság adja a szarufacsatlakozások (madárszáj, szelemenek) bevágás-számításának »Szarufa magassága (keresztmetszet)« bemenetét is.” — a két eltérő mezőnév (itt „Keresztmetszet magassága”, a hiányzó-adat üzenetben „Szarufa magassága (keresztmetszet)”) között hidat képezve, kódváltoztatás nélkül.
- **Tömörítés termék módban:** ha termék van kiválasztva és nincs hiányzó/hibás adat, a nyers mezők helyett egy sortömör összegzés látszik (pl. „Keresztmetszet szélessége: 80 mm · Keresztmetszet magassága: 200 mm”), a szerkeszthető mezőrács pedig egy „Érték felülírása” `GlassDisclosure` mögé kerül — csukva, ha nincs felülírás, nyitva, ha már van. Hiányzó vagy hibás adatnál (`spec.issues`/`spec.missingKeys`), illetve kézi módban a mezők továbbra is közvetlenül, nyitva látszanak — semmi, ami figyelmet igényel, nincs panel mögé rejtve.
- **Ellenőrzés:** `npx eslint` PASS az érintett fájlokra; izolált worktree-ben `npm run typecheck` PASS (a nem commitolt változásokkal lefuttatva, a futó dev szerver `.next`-je érintetlen); `npx vitest run src/features/calculators src/domain/calculations` **41 fájl / 431 teszt PASS**. Böngésző (helyi dev, mentés nélkül): `roof.material-takeoff`-ban DEMO szarufa-termék kiválasztása után a tömör összegzés és a csukott „Érték felülírása” panel megjelent (mért magasság: csukva 45 px, az eredeti `construction-suite-advanced` mintával azonos viselkedés), kinyitva a DEMO termék · badge-es mezők láthatók; a „Léc keresztmetszet” (nincs kiválasztott termék) és `roof.timber-cutlist` változatlanul a nyers mezőket mutatja. Szarufacsatlakozás bekapcsolása után a hídszöveg megjelent, kikapcsolva nem. 375 px-en vízszintes túlcsordulás 0, az „Érték felülírása” gomb 44,8 px. Konzolhiba nem jelent meg.
- **Nem változott:** `resolveMaterialSpec`, `setSpecEntry`, `restoreProductValues`, `switchSpecMode`, a mentett input/output szerződés, a `roofMaterialTakeoff`/`calculateRafterJoints` bemenetei.
- **Nem ellenőrzött / korlát:** valódi (nem DEMO) Anyagkezelő-termékkel, tabletnézetben és sötét témában külön nem futtattam vizuális összevetést; teljes Vitest-regresszió és `npm run build` nem futott.
- **Javasolt Conventional Commit:** `feat(M9.11): collapse resolved product values behind an override disclosure`.

## M9.10 — Derékszelemen mérési segédlet a szarufacsatlakozásos kalkulátorokban (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (csak mérési segédlet és mezőleírás; számítás, szerződés, snapshot, mentés és DB változatlan). Felhasználói jelzés alapján: a derékszelemen (közbenső felfekvés) két mezője — `purlinFaceMm`, `purlinTopMm` — eddig a HAP-pal ellentétben sem mezőleírást (`help`), sem mérési vázlatot (`figure`) nem kapott, holott a bevágása ugyanazt a `notchValues` függvényt használja (`rafter-joints.ts`), mint a talpszelemen.

- **Szakmai ellenőrzés:** a `purlinFaceMm` a talpszelemen külső függővágási síkjától (x = 0) **vízszintesen**, a `purlinTopMm` a talpszelemen felső síkjától (y = 0) **függőlegesen** mért érték — ugyanaz az origó, mint a HAP-nál (`rafter-joints.ts` `notch()`/`notchValues()`, és a már meglévő `ROOF_ADVANCED_HELP` szöveg is ezt írja le). Ez a vonatkoztatás szakmailag konzisztens volt a kódban, csak a felületen nem volt megjelenítve. A gerincszelemen (`ridgePurlinTopMm`) **nem** kapott segédletet: annak vízszintes helye a gerinctengelytől (nem a talpszelemen síkjától) származik, ezért más vázlat kellene — ennek bevezetése külön jóváhagyást igényel.
- **Új elemek:** `PURLIN_FACE_HELP`/`PURLIN_TOP_HELP` szöveg a `rafter-joints.ts`-ben (HAP_HELP mintájára); `PurlinFigure`/`PurlinMeasuringHelp` ([purlin-figure.tsx](../src/features/calculators/purlin-figure.tsx)) — a HAP-vázlattal azonos origóból, a valós `notch()` képletekkel (nem kitalált arányokkal) felépített, csukva induló séma, amely a talpszelemen- és a derékszelemen-bevágást is mutatja. A `Field.figure` unió `"hap" | "purlin"`-re bővült, a `construction-suite.tsx` `renderField` megjeleníti a `purlinTopMm` mezőnél.
- **Hatókör:** mindhárom kalkulátor, ahol a derékszelemen mező ténylegesen megjelenik — `roof.rafter-cut` (saját mezőlista) és a közös `birdsmouthFields` tömbön keresztül `roof.material-takeoff`, `roof.timber-cutlist`. Más kalkulátorban a mező nem létezik, ezért nem is kapott segédletet.
- **Ellenőrzés:** `npx eslint` PASS az érintett fájlokra; izolált worktree-ben `npm run typecheck` PASS (a worktree a nem commitolt változásokkal is lefuttatva, a futó dev szerver `.next`-je érintetlen); `npx vitest run src/features/calculators src/domain/calculations/construction` **21 fájl / 233 teszt PASS**. Böngésző (helyi dev, mentés nélkül): mindhárom kalkulátoron bekapcsolt szarufacsatlakozásokkal a mező, a mezőleírás és a „Derékszelemen mérési segédlet” csukva jelenik meg; kinyitva a vázlat két felfekvést rajzol ugyanabból az origóból (programozott DOM-ellenőrzéssel igazolva: `polygon` pontjai, két `rect.purlin-plate`, hat `text` felirat). 375 px-en vízszintes túlcsordulás 0, az összegző gomb érintési célmérete 44,8 px. Konzolhiba nem jelent meg.
- **Nem változott:** `calculateRafterJoints`, `notchValues`, mentett input/output szerződés, a már létező, élő `RafterJointDrawing`/`RoofJointDrawing` részletrajz.
- **Nem ellenőrzött / korlát:** valós ácsszakmai (nem csak geometriai) peer review nem történt; a sötét/világos téma vizuális összevetése és a teljes Vitest-regresszió/`npm run build` nem futott.
- **Javasolt Conventional Commit:** `feat(M9.10): add a purlin measuring-help sketch to the rafter-joint calculators`.

## M9.9 — Kalkulátor UI/UX modernizáció, 1. fázis: progresszív korlátlista (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (szándékosan szűk hatókör; a teljes 31 kalkulátoros modernizáció nincs elvégezve). Egy nagy hatókörű UI/UX modernizációs kérés érkezett az összes kalkulátorra; a projekt „ne kezdj általános alkalmazás-refaktorba” szabálya és a lazy-dev elv miatt a felhasználóval egyeztetve a hatókört egy megosztott komponensre és egy reprezentatív kalkulátoron (`roof.rafter-cut`, illetve ellenőrzésképp `roof.timber-cutlist` kontytetővel) való igazolásra szűkítettem. A fennmaradó 30 kalkulátor egyedi átvizsgálása és a teljes design-rendszer audit külön, jóváhagyott menetet igényel.

- **Probléma:** a `ConstructionCalculatorSuite` állapot-/korlátblokkja (`statusContent` a `construction-suite.tsx`-ben) a nem alkalmazható/nem támogatott csatlakozások listáját mindig nyitva, a `.form-message` elemen belül, elkülönítés nélkül jelenítette meg — hosszabb listánál egybefüggő szövegfalként.
- **Javítás:** a nem blokkoló `limitations` lista (amely csak a `complete` státuszú, dokumentált korláttal járó eredménynél jelenik meg) a már meglévő `GlassDisclosure` mintába került (`Nem alkalmazható vagy nem támogatott csatlakozás · N tétel`), ugyanúgy, ahogy a `RoofMaterialTakeoffSummary` „Korlátok és feltételezések” blokkja már működik. A mentésblokkoló `completeness.reasons` lista változatlanul mindig látható marad (biztonsági/blokkoló információ nem rejthető el). A `.form-message` megosztott osztály `display:grid; gap:.5rem`-et kapott, a benne lévő `ul` pedig saját térközt, hogy a cím, a leírás és a listák vizuálisan elkülönüljenek.
- **Nem változott:** `completeness` domain-logika, státuszok, menthetőség, a `limitations`/`reasons` tartalma és sorrendje, számítási eredmény, DB, szerződés.
- **Ellenőrzés:** `npx eslint` PASS az érintett fájlra; izolált worktree-ben `npm run typecheck` (next typegen + tsc) PASS a futó dev szerver `.next`-jét érintetlenül hagyva; `npx vitest run src/features/calculators` **13 fájl / 76 teszt PASS**. Böngésző (helyi dev, mentés nélkül): `roof.rafter-cut` alapállapotban („Teljes kalkulációs eredmény”), `roof.timber-cutlist` kontytetővel (2 tételes, nem támogatott gerinccsatlakozás) — a diszkloszúr csukva helyesen összegez, kinyitva pontosan a korábbi listatartalmat adja vissza; `roof.timber-cutlist` hiányos bemenettel a blokkoló okok lista nyitva maradt. 375 px-en mért vízszintes túlcsordulás 0, a diszkloszúr-fejléc érintési célmérete 44,8 px. Konzolhiba nem jelent meg.
- **Nem ellenőrzött / korlát:** a másik 30 kalkulátor, a lépcső- és betonkalkulátorok egyedi felülete, a tablet/landscape nézetek, a sötét/világos téma vizuális összevetése, a teljes Vitest-regresszió és `npm run build` nem futott (a módosítás a meglévő, már tesztelt `GlassDisclosure`/`form-message` primitíveket használja újra, nem igényelt új komponenst vagy sémát). A teljes „Liquid Glass” tipográfiai/térköz-token revízió, a kalkulátorválasztó navigáció és a rajzok/toolbar modernizálása a briefben leírtak szerint nem történt meg.
- **Javasolt Conventional Commit:** `fix(M9.9): collapse non-blocking joint limitations into a disclosure`.

## M9.8 — Váltható tetőrajz-nézetek és soha nem néma szarufa-vágásrajz (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (csak prezentáció és navigáció; számítás, szerződés, snapshot, mentés és DB változatlan).

- **Probléma:** a `roof.material-takeoff` és a `roof.timber-cutlist` rajzai egymás alá voltak halmozva, a térbeli részlet és a tetőforma pedig zárt „További nézetek” disclosure-ben; a szarufa-vágásrajz ráadásul **némán hiányzott**, ha a „Szarufacsatlakozások számítása” jelölő (a „Részletes számítás” alatt, `advanced`) ki volt kapcsolva — `planeBirdsmouthsFor` ilyenkor `null`-t ad. A felhasználó így kitöltött tetőformával sem látta, hol kell vágni.
- **Váltható nézetek:** a `RoofDrawingStack` helyére `RoofDrawingViews` lépett: Liquid Glass pirulaváltó (`GlassToolbar` + `aria-pressed` kapcsológombok, a rajz saját oldal- és csomópontválasztójával azonos minta), egyszerre egy nézet, fölötte a nézet egymondatos leírása. Négy nézet: Szarufa vágásai · Szarufaosztás · Térbeli részlet · Tetőforma. Egyetlen nézetnél nincs váltó.
- **Nincs néma hiány:** ha a csatlakozások nincsenek bekapcsolva, a „Szarufa vágásai” nézet a `RafterJointsInvitation` panelt mutatja: megnevezi a két hiányzó adatot (szarufa keresztmetszet-magassága, HAP), és a gombja bekapcsolja a jelölőt, kinyitja a „Részletes számítás” panelt és a HAP mezőre fókuszál.
- **Reszponzív:** a váltó asztalon kitölti a sort, 560 px alatt vízszintesen görgethető (a levágott következő pirula jelzi a görgethetőséget), minden gomb 44 px magas; `prefers-reduced-motion` esetén nincs átmenet.
- **Ellenőrzés:** `npx tsc --noEmit` PASS, `eslint` PASS, teljes Vitest **189 fájl PASS / 8 SKIP, 1170 PASS / 19 SKIP** (2 új teszt: a váltó csak az aktív nézetet rendereli, és a bekapcsoló panel tartalma). Böngésző (helyi dev, mentés nélkül), a felhasználó bemenetével (nyeregtető 1200×600 cm, 35°, eresz 0, osztás 25/50 cm): mindkét tetős kalkulátorban négy nézet, váltás mind a négyre ellenőrizve; a bekapcsoló gomb bepipálja a jelölőt, megnyitja a panelt és fókuszálja a HAP-ot (mérve); HAP 20 cm és 10×20 cm keresztmetszet megadása után a vágásrajz kirajzolódik. 375×812: gombok 44 px, a váltó görgethető (491/321 px), vízszintes oldaltúlcsordulás nincs. Világos és sötét témában ellenőrizve.
- **Nem változott:** a `roof.rafter-cut` eredménysorrendje (`RafterCutFlow`), a rajzok belső vezérlői és a `technical-drawing` saját „Nézetek és rétegek” panelje.
- **Korlát:** a nézetválasztás nem őrződik meg újratöltés vagy kalkulátorváltás után (munkamenetbeli állapot). `npm run build` nem futott.
- **Javasolt Conventional Commit:** `feat(M9.8): switchable roof drawing views with a guided rafter-cut entry`.

## M9.7 — Szarufarajz E2E vizuális audit és P1 javítások (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (audit + három P1 rajzi javítás; számítási eredmény, snapshot, mentés, szerződés és DB változatlan). Teljes audit: [M9.7 rajzi E2E audit](M97_ROOF_DRAWING_E2E_VISUAL_AUDIT.md).

- **Audit:** 17 tételes ellenőrzés a `roof.rafter-cut` és a `roof.timber-cutlist` szarufarajzain (kattintás-kiválasztás, zoom/pan/reset/billentyű, tetősík- és szelemenválasztók, tetőformák, mobil és sötét téma), PASS/FAIL/PARTIAL/FEATURE GAP/NOT VERIFIED besorolással és mért bizonyítékkal. A megszakadt Codex-futásból csak 5 képernyőkép maradt, ebből kettő „dark” néven világos témában készült — ez dokumentálva, a sötét téma pótolva.
- **F-03 javítva:** egyetlen érvénytelen **derékszelemen** többé nem tünteti el az egész rajzot. A `drawing` csak akkor marad el, ha a talpszelemen vagy a gerinc érvénytelen (ezek rögzítik a 0-pontot és a felső véget); az érvénytelen derékszelemen csak a saját támaszát veszíti el, és „nem számítható” státusszal, indokkal jelenik meg. Kívánt mellékhatás: a manzárd alsó tetősíkjai mostantól rajzot kapnak (síkonként egyet).
- **F-01 javítva:** a csomópont-buborékok a címkeelhelyezés elé kerültek, befoglalóik akadályok (`labelObstacles`), így a méretcímkék **elmozdulnak** róluk; a közös ütközéslista a vászon mindkét tetőoldalára érvényes. A korábban mért 88×20 px-es `Talpszelemen` × `magasság 20` átfedés megszűnt.
- **F-02 javítva:** a tükrözött tetőoldal saját buborékokat kap, így mindkét oldal kattintható, és a kiválasztás a rajzon is látszik. Telefonszélességű vásznon (< 600 px) a tükrözött oldal csak a kiválasztott buborékot mutatja; minden csatlakozás elérhető marad a gombsorból.
- **Ellenőrzés:** `npx tsc --noEmit` PASS, `eslint` PASS az érintett fájlokra, teljes Vitest **189 fájl PASS / 8 SKIP, 1169 PASS / 19 SKIP**. Böngésző (helyi dev, mentés nélkül): `roof.rafter-cut` és `roof.timber-cutlist` 1440×900 és 375×812, illesztett és nagyított nézetben **0 mért címkeátfedés**; jobb oldali buborék kattintása a részletet, az oldalgombot és a kiemelést együtt váltja; az F-03 reprodukciós bemenet (derékszelemen felső síkja 140 cm) rajzot ad. Bizonyítékképek: `docs/evidence/m97/`.
- **F-04 javítva:** a `notchValues` reason-szövegei már nem ismétlik a csomópont nevét (a `prefix` paraméter megszűnt); minden megjelenítési és mentési hely külön is megnevezi a csomópontot. `Derékszelemen: Derékszelemen: …` → cím `Derékszelemen · nem számítható` + `A támasz felső síkja eléri a szarufa felső élét.`
- **F-06 javítva:** a buborékok 44 px magas, átlátszó találati területet kaptak (a látható pirula marad 24 px), és 600 px-nél keskenyebb vásznon a leghosszabb név a megkülönböztető szavára rövidül (`Szembefutó szarufák` → `Szembefutó`; a teljes név megmarad az akadálymentes névben, a gombsorban és a részlet címében). Mérve 375×812-n: legnagyobb buborékszélesség a vászon 51% → 29%-a.
- **Nyitott / korlát:** F-05 rétegkapcsolók a szarufarajzon (FEATURE GAP, P3; új funkció, jóváhagyás kell). Zsúfolt nézetben néhány méretcímke szövege eltűnik (az érték a rajz alatti listában van, nagyításra visszajön). Valódi érintéses gesztus, fókuszgyűrű és a tetőmodell műszaki rajza nem ellenőrzött; `npm run build` nem futott.
- **Javasolt Conventional Commit:** `fix(M9.7): draw proven rafter joints and make drawing badges readable`.

## M9.6 — Szarufarajzok UI/UX finomítása (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (csak prezentáció; számítás, snapshot, mentés, teljességi státusz, DB változatlan). Forrás: [M9.5 vizuális UX-audit](M95_RAFTER_VISUAL_UX_REVIEW.md) (változatlanul megőrizve).

- **HAP-segédlet:** a pontos címke és az egymondatos mérési definíció a mező alatt marad (`aria-describedby`); a `HapFigure` alapból zárt „HAP mérési segédlet” `GlassDisclosure`-ba került (natív `details`, 44,8 px-es összefoglaló, látható fókusz) mindhárom kalkulátorban. Az ábra négy referenciája változatlan; a képaláírás már nem ismétli a mezőhelpet („Vázlat, nem méretarányos. A mérés helye a külső függővágási sík (x = 0).”).
- **Szarufa kiszabása:** új sorrend (`RafterCutFlow`): állapot → méretezett szarufa-áttekintő + „Mit hol jelölj” lista → csatlakozásválasztó → kiválasztott részletrajz + „Ennyit kell bevágni” → fő eredmények → „Csomópontok · állapot és szakmai korlátok” → zárt „Részletes eredmények és kiindulási adatok” → mentés. A `RafterJointsPanel` állapotot és D-korlátokat nyitva mutat, az összes A/B értéket zárt „Csomópontok összes értéke” listában (adat nem törlődött).
- **Tetőanyag-kimutatás és faanyag-vágáslista:** az eredmények (anyagösszesítő, illetve vágáslista és kritikus hiányok) a rajzok elé kerültek (`RoofDrawingStack`): közös szarufa-metszet a hozzá tartozó részlettel → geometriai szarufavonalak → zárt „További nézetek” (térbeli szarufarészlet és általános tetőrajz). Eltérés a briefhez képest: a kiválasztott csatlakozás részlete az audit P1.4 pontja szerint közvetlenül a közös metszet alatt maradt, nem a szarufavonalak után.
- **Rajz:** a rajz és méretlistája, illetve a részletrajz és a bevágási blokk egy csoportban, ≥ 45 rem széles rajzszekciónál (container query) egymás mellett, mobilon egy oszlopban. A rajzvásznak opak háttere eltakarja a globális pontmintát. A részletrajz lépésszámai akadályként szerepelnek a feliratelhelyezésben, így a „2” már nem fedi az „ülék” értéket. Zoom/pan/csippentés/billentyű/reset és tetőoldalválasztás változatlan.
- **Ellenőrzés:** új `rafter-result-flow.test.tsx` (5): HAP-disclosure zárt + négy referencia + mindhárom kalkulátor mezőszerződése, kiszabási és tetős DOM-sorrend, zárt további nézetek, panelben minden érték megvan zárt listában, lépésszám–felirat ütközésmentesség (a javítás nélkül piros, vele zöld). Teljes Vitest **189 fájl PASS / 8 SKIP, 1169 PASS / 19 SKIP**; `npm run lint` PASS; izolált másolatban `npm run typecheck` és `npm run build` PASS (a futó dev szerver `.next`-je érintetlen); `git diff --check` PASS. Böngésző (helyi dev, mentés nélkül; szimulált viewport): 375×812 sötét (üres, hiányos, teljes kiszabás; vágáslista és anyagkimutatás teljesen), 812×375, 1440×900 világos; HAP-disclosure nyitás/zárás, vízszintes túlcsordulás 0, DOM-sorrend mindhárom kalkulátorban, „További nézetek” megnyitva rajzol, érvénytelen HAP → nincs vágási rajz. Szimulált pointer: egyujjas touch nem mozgat, kétujjas pinch 100→200%, „0” reset.
- **Nem ellenőrzött / korlát:** valódi érintőképernyős natív görgetés és pinch (csak szimulált pointer és számított `touch-action`); hitelesített mentés nem futott. 1440 px-es desktopon a rajzszekció a menük miatt kb. 740 px, ezért a kétoszlopos rajz kb. 465 px széles. Anyagkimutatásban szarufa nélkül az általános tetőrajz is a zárt „További nézetek” alatt van, így a mérésfókusz-kiemelése csak megnyitva látszik. A konzolban a köztes szerkesztés HMR parse-hibái maradtak naplóban; a végleges kód fordul.
- **Javasolt Conventional Commit:** `feat(M9.6): reorder rafter calculators around the dimensioned drawing`.

## M9.5 — Közös szarufa-áttekintő, szelemen- és gerinccsatlakozás a tetős kalkulátorokban (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [független audit](CLAUDE_ROOF_ENGINEERING_REVIEW.md) CRR-01–CRR-09 megállapításait kezeli (az audit szövege változatlan; CRR-10 history-átírás nélkül marad).

- **Inputmodell (döntés, tartós szerződésváltozás nélkül):** a `roof.material-takeoff` és `roof.timber-cutlist` előre deklarált lapos mezőket kapott, a `roof.rafter-cut`-tal azonos kulccsal és jelentéssel (`purlinFaceMm`, `purlinTopMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`), progresszívan: Talpszelemen + HAP → opcionális Derékszelemen → gerinckapcsolat → csak a választott típus adatai (`visibleWhen` több feltétellel, gerincmezők csak gerincet adó formáknál). Az adatok a fő tetőoldal saját függőleges metszetében értendők; csak az azonos hajlású és futású, eresszel párhuzamos gerincre futó síkokra alkalmazzuk, minden más síkon explicit `unsupported` okkal. `construction-suite.input.v1`/`output.v1` marad; DB-migráció nincs (a restricted writer RPC tetszőleges további output-kulcsot elfogad). Régi M9.3/M9.4 revízió: az új kulcsok `initial`/üres értékkel hidratálódnak, nem lesz hamis „módosított” (teszt).
- **Domain:** `plane-birdsmouth.ts` per-plane adapter lett: minden S1/S2/S3 érték továbbra is a `calculateRafterJoints`-ból jön (új képlet nincs). Új `RafterJointResult` állapotok: `not-applicable`, `unsupported` (csak az adapter adja). `planeJointStatuses` (mentett `jointStatus` provenance) és `roofSectionViews` (két szemközti, azonos metszetű sík közös keresztmetszete). Közös megnevezés: `jointName`/`RIDGE_JOINT_NAME` (Talpszelemen, Derékszelemen, Szembefutó szarufák, Gerincdeszka, Gerincszelemen, ill. „Felső vég” nem modellezett felső végnél); az S1–S3 csak belső azonosító. Gerincdeszka 0 vastagság → `invalid` (korábban hiányzónak számított).
- **Támogatottság (táblavezérelt teszt, 8 forma):** nyereg: mindkét sík S1/S2/S3; félnyereg: S1/S2, felső vég `unsupported` (felső támasz nincs modellezve); konty: főtetősíkok S1/S2/S3, kontyos vég síkjai S3 `unsupported` (gerinc végpontja); sátor: S3 mindenütt `unsupported` (kontyél); félkonty: fősíkok teljes, félkonty-vég síkok S2/S3 `unsupported` (eltérő futás); L/T: fősíkok teljes, szárnyak S2/S3 `unsupported`; manzárd: alsó sík S1 (S2 a futáson belül), felső vég `unsupported` (törésvonal), felső síkok `not-applicable`. Kontyél- és vápaszarufa nincs a layoutban, rájuk vágás nem készül.
- **Számítás/mentés:** `computeConstruction` közös mezőszerződése (`fieldContractIssues`, CRR-07) kliensen és Server Actionben is: megadott, de nem szám / negatív / tiltott 0 / 1 000 000 mm feletti / nem választható érték → `invalid`, nem menthető (az action az első okot adja vissza). `completeness.limitations` (CRR-03): `not-applicable` és `unsupported` nem blokkol, de a státusz „Teljes eredmény a támogatott csatlakozásokra · dokumentált korláttal”, és az output `jointStatus` síkonként/csatlakozásonként megőrzi okkal. `isCompleteConstructionOutput` elutasítja a hiányos/hibás `jointStatus`-t, régi outputot változatlanul elfogad. Mentett sorok: `Madárszáj · …` (változatlan), új `Derékszelemen · …`, `Gerincszelemen/Gerincdeszka · …` (hajlásonként egyszer).
- **Rajz:** új „Szarufák és támaszok · áttekintő” (`RoofJointDrawing`) a tetős kalkulátorokban: nyeregnél a bal sík és a tükrözött jobb sík egy keresztmetszetben, mindkettő a saját `calculateRafterJoints` eredményéből (`mirrorRafterJointDrawingModel`); egyező értékű jobb oldalon a méretek/címkék nem duplikálódnak; több metszetnél tetőoldal-választó. Alatta „Mit hol jelölj · a szarufa alsó végétől” lista és közvetlenül „Szarufa- és szelemenkapcsolat · részlet” (oldal- és csatlakozásválasztó gombok `aria-pressed`-del, valódi vágáskontúr, „Ennyit kell bevágni · …”). A korábbi kompakt madárszáj-blokk a szarufavonal-nézetből ide költözött. Látható keret: geometriai szarufavonalak, nem framing terv + `physicalLayout.reason`, konty/vápa figyelmeztetés, nem alkalmazható síkok és nem támogatott csatlakozások listája.
- **CRR-01 HAP:** címke „HAP · szarufa felső élének magassága a talpszelemen felett”, mérési definíció a mező alatt (`aria-describedby`), vázlatos referenciaábra (talpszelemen felső sík, külső függővágási sík, felső él, függőleges HAP) mindhárom kalkulátorban; a mentett input „Kiindulási adatok” visszanézetében is megjelenik.
- **CRR-02/09:** „Geometriai szarufavonalak · tetősíkonként” cím, „vonal” darabnyelv, `physicalLayout.reason` mindig látható; felső élcímke csak homogén végcsoportnál, különben „vegyes felső végek – lásd a listát”. Az M8 rajz címe „Szarufatengelyek · térbeli közeli nézet”.
- **CRR-04/05/08:** egyujjas érintés a rajzon mindig oldalgörgetés (`touch-action: pan-y`, egyujjas touch nem mozgatja a kamerát), két ujjal pan + pinch; egér húzás/görgő, billentyűk, reset változatlan. `useFontSize` `MutationObserver`-rel követi a `--tp-text-scale` élő váltását. Akadálymentes összefoglaló állapotfüggő: fit / no-fit / nincs szélesség és minden csatlakozás állapota. Az áttekintőn az egymást takaró érték felirata elmarad (a vonal marad), az érték a rajz alatti listában szerepel.
- **Ellenőrzés:** célzott Vitest: `plane-birdsmouth` 17 (3-4-5 és 45° független kézi értékek, 8 formás mátrix, párosítás, gerincdeszka/nevek/sorok), `construction-computation` 31 (S2/S3 nyeregen független képlettel, hiányos/hibás pár, manzárd/félnyereg korlát + `jointStatus`, mezőláthatóság, régi revízió nem dirty, 7 manipulált mezőeset, output-guard), `construction-actions` 5 (manipulált kérés nem ír), rajzok 9 + 3 + domain tükrözés. Teljes Vitest **188 fájl PASS / 8 SKIP, 1164 PASS / 19 SKIP**; `npm run lint` PASS; izolált másolatban `npm run typecheck` és `npm run build` (Next 16.4.2 webpack) PASS (a futó dev szerver `.next`-je érintetlen); `git diff --check` PASS. Böngésző (helyi dev, mentés nélkül): 375×812 sötét/világos, 812×375, desktop: HAP-ábra, nyereg mindhárom csatlakozással (bal/jobb, derékszelemen 8,3/9,9/6,3 cm = kézi érték), konty és manzárd korlátlista, vízszintes túlcsordulás 0, konzolhiba 0; szintetikus pointer: egyujjas touch nem mozgat, egér húzás mozgat, kétujjas pinch 100→200%, billentyű +/0, reset; `--tp-text-scale` 1,3 → felirat 13 → 16,9 px újramount nélkül.
- **Nem ellenőrzött / korlát:** valódi érintőképernyős natív oldalgörgetés (csak számított `touch-action` és szintetikus pointer); hitelesített mentés böngészőben és DB E2E nem futott (`npm run db:test` a korábbi helyi migrációs állapot miatt nem futtatva). Eltérő bal/jobb hajlás a jelenlegi tetőbemenetből nem adható meg, ezért párosítás csak azonos metszetnél van. Statikai megfelelőség, megengedett bevágás, kontyél-/vápaszarufa és manzárd-töréscsomópont nincs; ács/statikus szakmai review nem történt.
- **Javasolt Conventional Commit:** `feat(M9.5): unify rafter overview and purlin joint details`.

## M9.4 — Madárszáj a tetős kalkulátorokban, 1. fázis (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. Jóváhagyott döntések: **D1** a tetősík a szarufa felső éle, a tető szélességének széle (nyereg/félnyereg: a kiülés nélkül) a talpszelemen külső síkja; **D2** új mező „Madárszáj vízszintes vágásának magassága”; **D3** más tetőformán nincs új ereszkiülés-mező; **D4** opcionális „Talpszelemen szélessége · ellenőrzéshez” mindhárom kalkulátorban; **D5** gerinc-/derékszelemen a tetős kalkulátorokban későbbi fázis. Skill: `test-driven-development` (minden új viselkedés RED → GREEN).

- **Domain:** új `plane-birdsmouth.ts`: tetősíkonként az eresznél kezdődő leghosszabb szarufából a vízszintes futás és a kiülés (`−z / tanα`), majd a meglévő `calculateRafterJoints` talp-csomópontja (új képlet nincs; a madárszáj csak α, h és HAP függvénye, így a konty rövid szarufáira is ugyanaz). Ereszen nem kezdődő sík (manzárd felső) → „nem értelmezett”. `plateFitOf` (rafter-joints): ülék ≤ talpszelemen-szélesség, csak geometriai. `edgeKindAt` a számítási rétegbe költözött (`roof-geometry-edges.ts`).
- **Kalkulátorok:** `roof.material-takeoff` és `roof.timber-cutlist` új mezői (Részletes számítás): „Madárszáj számítása a szarufákhoz” jelölő, alatta a madárszáj magassága és a talpszelemen szélessége. A szarufa magassága a szarufa-keresztmetszetből jön. Csak bekapcsolt jelölő + kért szarufaszámítás esetén számol; hiány → „Hiányos” konkrét listával, érvénytelen → „Nem számítható” (QA-04 szabály). Mentett sorok: „Madárszáj · {hajlás}° · …” hajlásonként egyszer. A „Szarufa kiszabása” kapott talpszelemen-szélesség mezőt (sor nélkül, csak kijelzés).
- **Kijelzés:** a Szarufa-elrendezésben a kiválasztott tetősík alatt „Madárszáj ezen a tetősíkon”: a meglévő részletrajz (S1, lépésszámokkal) és „Ennyit kell bevágni” doboz; az 1. lépés a szarufa alsó végétől mér (kiülés / cosα), a 0-pont itt rejtve; talpszelemen-ellenőrzés („ráfér” / „nem fér rá, X cm-rel túlnyúlik”). Az eresz-végvágás szövege erre mutat.
- **Mentés/adat:** DB-migráció nincs — a `private.is_complete_construction_snapshot` tetszőleges `fields` objektumot és számszerű sorokat fogad. Régi revízió: a `comparableConstructionInput` az új kulcsokat üresen pótolja, így nem lesz „Mentetlen módosítás” (teszt), és madárszáj-sor sem keletkezik.
- **Ellenőrzés:** új Vitest: tetősík-madárszáj 6 (3-4-5 kézi érték 150/200/120/80 = kiszabás-kalkulátor, konty 45° minden síkon 182,84, manzárd felső sík nem értelmezett, hiány/HAP 0, talpszelemen ráfér/túlnyúlik, sorok hajlásonként), kalkulátor-integráció 4 (teljes, hiányos, kikapcsolt = változatlan sorok + régi revízió, takeoff szarufa nélkül), rafter-joints 1, komponens 3. Teljes Vitest **188 PASS / 8 SKIP fájl, 1133 PASS / 19 SKIP teszt**; `eslint .`, `tsc` PASS; `npm run typecheck` + `next build --webpack` ideiglenes másolatban PASS. Böngésző 375 px sötét: faanyag-vágáslista nyereg 10×6 m, 45°, 60 cm, 8×20 cm: jelölő → „Hiányos · Madárszáj vízszintes vágásának magassága”; 10 cm → „Teljes”, 18,3 / 18,3 / 12,9 cm, 7,1 cm marad (= 200/cos45 − 100 stb.), talpszelemen 15 cm → „nem fér rá, 3,3 cm-rel túlnyúlik”; konty 3. sík ugyanígy; túlcsordulás 0.
- **Nem futott / korlát:** tényleges mentés hitelesített böngészőben nem futott (a szerver ugyanazt a `computeConstruction` utat használja; DB-ellenőrzés nem kellett). Konty/sátor/félkonty/L/T/manzárd: nincs ereszkiülés (D3), ezért a madárszáj a szarufa alsó végén van. Kontyél-/vápaszarufa és a rövid szarufák felső vágása, félnyereg felső támasza, gerinc-/derékszelemen a tetős kalkulátorokban (D5): nem része.
- **Javasolt Conventional Commit:** `feat(M9.4): per-plane birdsmouth in roof takeoff and timber cut list`.

## M9.3 — Szarufa-elrendezés és kijelölési lépések minden szarufás kalkulátorban (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (megjelenítés; számítás, kiosztómotor, mentés, DB változatlan). Skill: `test-driven-development` (RED → GREEN mindhárom új viselkedésre).

- **Szarufa kiszabása:** a részletrajzon 1–4 lépésszám ott, ahol a lépés történik (1 jelölés a felső élen, 2 függővonal, 3 bevágás sarka, 4 ülék), egyezik az „Ennyit kell bevágni” doboz számozott lépéseivel.
- **Tetőanyag-kimutatás (bepipált szarufával) és faanyag-vágáslista:** új „Szarufa-elrendezés · kiosztási terv” (`rafter-layout.ts` + `RafterLayoutDrawing`) az M8-részlet előtt: a választott tetősík valós méretben (kiterítve), számozott szarufák, osztás (1–2), teljes szélesség (1–n), leghosszabb szarufa hossza, cm alapértelmezés; tetősík-választó; lista: darabszám, tényleges osztás, hajlás, „n db × hossz” csoportok, végek vágása, összecsukható „Szarufák helye az 1. szarufától”. Végvágás: gerinc/felső él → függővágás 90° − hajlás a szarufa éléhez; eresz → madárszáj, méretei a „Szarufa kiszabása” kalkulátorban (talpszelemen- és madárszáj-adat kell); kontyél/vápa → „ferde (kettős) vágás, a rendszer nem számolja”. Forrás kizárólag a meglévő `RoofTimberLayout` szakaszok és a tetőgeometria élei (M8 `edgeKindAt` újrahasznosítva).
- **Ellenőrzés:** új Vitest: elrendezés-modell 4 (18 szarufa, 588,24 mm, 0…10 000 mm, 5000 mm, valós méret 10 000 × 5000, gerinc 36,87°, eresz érték nélkül; konty: kontyél-végű jack szarufák, több hosszcsoport, darabösszeg; síkválasztás, null), komponens 2, lépésszám 1. Teljes Vitest **187 PASS / 8 SKIP fájl, 1119 PASS / 19 SKIP teszt**; `eslint .`, `tsc` PASS; `npm run typecheck` + `next build --webpack` ideiglenes másolatban PASS (fő `.next` érintetlen). Böngésző 375 px sötét: faanyag-vágáslista nyereg 10×6 m, 45°, 60 cm → 18 db, 58,8 cm, 1–18: 1000 cm, 18 × 424,3 cm; konty: 4 tetősík (16/16/9/9), 3. sík 1 × 424,3, 2 × 339,4, 2 × 254,6, 2 × 169,7, 2 × 84,9 cm, 8 kontyél-végű; szarufa kiszabása: 4 lépésszám; túlcsordulás 0.
- **Korlát:** a konty háromszög síkjának középső szarufája a gerinc végpontjába fut, ezért „gerinc” függővágásként jelenik meg — szakmailag ellenőrizendő. Az elrendezésben a madárszáj méretei nem számolhatók (talpszelemen, madárszáj-magasság és a tetősík ↔ szarufa felső él viszonya nem bemenet), ezért nincs automatikus átadás a „Szarufa kiszabása” kalkulátorba. Valódi érintőképernyő nem tesztelt.
- **Javasolt Conventional Commit:** `feat(M9.3): rafter layout plan and marking steps across rafter calculators`.

## M9.2 — Szarufarajzok cm-ben, egyszerűbb leolvasás (2026-10-25)

Státusz: **PASS** (csak megjelenítés; számítás, mentett eredménysorok és a „Csomópontok” táblázat változatlan, mm).

- **cm alapértelmezés:** a szarufa-kiszabási rajz és az M8 axonometrikus szarufa-részlet is cm-ben indul (mm/m választható). A cm 0,1 cm-re (= 1 mm) kerekít, közös `formatDrawingLength` mindkét rajzban; a rajz sarkában „méretek: cm”.
- **Egyszerűsítés:** a rajzon szavas rövid feliratok („függő 15”, „ülék 20”, „bevágás 12”, „marad 8”, „teljes hossz 550”, szög csak „53,1°”) a ↕/↔/⊥/∠ jelek helyett; az „O” helyett „0” pont; az A/B/C/M betűk és a pontlista elhagyva. A rajz alatt „Mit hol jelölj a szarufán” lista (teljes hossz, magasság, ereszvég / S1–S3 / gerincvég a 0-ponttól), a részlet alatt teljes nevű sorok (pl. „Bevágás mélysége · a szarufára merőlegesen”), színes jelmagyarázat („Itt kell vágni”, „Ez a rész esik ki”, „Jelölővonal”, „Méret (cm)”), rövid figyelmeztető szöveg. Rajzfelirat 13 px × szövegskála.
- **Ellenőrzés:** célzott Vitest 34/34 (cm: 2468,75 mm → 246,9 cm; M8: 500 cm, 58,8 cm); teljes Vitest **185 PASS / 8 SKIP fájl, 1113 PASS / 19 SKIP teszt**; `eslint .` és `tsc --noEmit` PASS (typegen/build nem futott, a fő `.next` érintetlen). Böngésző 375×812 sötét és világos: főrajz, lista, S1 részlet, jelmagyarázat; vízszintes túlcsordulás 0.
- **Finomítás (olvashatóság):** a méret- és szögértékek kitöltött címkén („pill”) állnak, így nem futnak rá a fára, sraffozásra és méretvonalakra; a 0-pont kiemelt címke; széles (≥ 600 px) vásznon 1,2× betűméret; „Méretek: cm” az eszköztárban (nem takarja a rajzot); a listák széles képernyőn több oszlopba tördelnek, hangsúlyosabb értékkel. Teljes Vitest **185 PASS / 8 SKIP fájl, 1113 PASS / 19 SKIP**; `eslint .`, `tsc` PASS; böngésző: desktop világos és 375 px sötét, túlcsordulás 0.
- **„Mennyit kell bevágni” (kijelölési útmutató):** a kiválasztott csatlakozás részletrajza alatt kiemelt doboz a három fő számmal (függővágás az alsó éltől a függővonalon, ülék a sarokból merőlegesen, bevágás mélysége + megmaradó magasság), és az ácsok kijelölési sorrendjében 5 számozott lépés: hely a 0-ponttól → függővonal a felső éllel bezárt szöggel (eresz felőli oldalon, 90° − α) → függővágás felmérése az alsó éltől → ülék merőlegesen a gerinc felé → kivágás és ellenőrzés a megmaradó magassággal. Végvágásnál / bevágás nélküli felfekvésnél rövidített lépések. A részletes méretlista „Összes méret és szög” alá csukva. Csak a meglévő csomópontértékek; a bevágás megengedett mértékéről (pl. gyakorlati 1/3-os ökölszabály) a rendszer továbbra sem dönt.
- **Javasolt Conventional Commit:** `feat(M9.2): show rafter drawings in cm with plain-language labels`.

## M9.1 — Szarufa-kiszabási rajz és vágásjelölések (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (a meglévő M9 rajz finomítása; számítási szerződés, snapshot, DB változatlan).

- **Főrajz:** a szarufa kontúrja (felső él, alsó él a bevágásokkal) mellett külön kiemelt vágásélek: mindhárom bevágás függő- és ülékvágása, ereszvég és (gerincszelemennél) gerincvég függővágása; sraffozott kivágandó rész; „felső él / alsó él” felirat; **O** közös mérési kiindulópont = az S1 függővágás jelölővonala a felső élen; lánc O-tól, h ⊥ keresztmetszet és L. A rajz alatt mindig látható „Kiszabási méretek” lista: teljes hossz, h, ereszvég / S1 / S2 / S3 / gerincvég helye O-tól a felső él mentén és a láncméretek — a rajzon helyhiány miatt elhagyott felirat itt megvan.
- **Részletrajz:** A (függővágás az alsó élen), B (függő- és ülékvágás metszéspontja), C (ülék vége), M (jelölőpont a felső élen; S1-nél M = O) pontok; jelölővonal B→M; ↕ függőleges, ↔ vízszintes, ⊥ merőleges méret, ∠ vágási szög a szarufa tengelyéhez (az ív a vágásban, az érték mutatóvonallal a csúcson túl). „Hely: O → M” sor. Gerincdeszka / szembefutó gerincnél csak végvágás, kitalált bevágás nélkül. Feliratok: a meglévő ütközésfeloldás + új `nudgeOffSegments` (felirat nem kerül vágásélre), vásznon tartás.
- **Zoom:** a fő- és részletrajz közös `InteractiveCanvas` vásznon (zoom gomb/görgő/csippentés/húzás/billentyűk); a részlet saját „Részlet visszaállítása” gombot kapott, csatlakozásváltáskor a saját alapnézetére áll. Kezdőnézet: a geometria befoglalója + a betűmérethez kötött feliratsáv. Dupla koppintás a fő rajzon a csatlakozást egy szarufamagasságnyi környezettel mutatja (a 3-4-5 adatnál 454%, korábban 862%), felső korlát 14×. Mértékegység: mm (táblázattal azonos kerekítés), cm, m ugyanabból a 0,1 mm-re kerekített értékből.
- **Domain:** `rafter-joint-drawing.ts` csak a meglévő pontokat rendezi: `cut` (kivágandó háromszög, vágásélek, jelölővonal, A/B/C/M), `positionMm`, `origin`, `endCuts`, `stations`, `depthMm`; kisebb fókuszmargó. Új geometriai képlet nincs; S2 helye a táblázat „Felfekvés távolsága” értéke, S3/gerincvég helye x/cosα.
- **Ellenőrzés:** új/bővített Vitest (domain 9, komponens 3): kontúr ↔ méretpontok azonossága, függő/ülék él iránya és hossza, ⊥ mélység + ⊥ maradék = h, ⊥ ≠ ↕, O → M távolság = hely, láncösszeg = L, 10° és 70° hajlás, 2 mm-es bevágás, gerincdeszka/szembefutó végvágás, felirat-eltolás vágásélről, mm/cm/m. Teljes Vitest **185 PASS / 8 SKIP fájl, 1113 PASS / 19 SKIP teszt**; `eslint .` PASS; `tsc --noEmit` PASS; `npm run typecheck` és `next build --webpack` csak ideiglenes másolatban (a fő `.next` és `next-env.d.ts` érintetlen).
- **Böngésző (helyi, mentés nélkül):** 375×812 sötét: főrajz, lista, S1/S2/S3 részlet; részlet-csippentés 200%, S-váltás → 100%, + → 125%, visszaállítás 100%; dupla koppintás S2 → 454% és S2 kiválasztva; vízszintes túlcsordulás 0. Desktop világos: S1 részlet. cm/m váltás (550 cm, 5,5 m; 15/20/12/8 cm). Szembefutó gerinc, gerincdeszka (O → M 4968,8 mm), hiányzó szarufa-magasság (rajz tiltva, hiánylista).
- **ConstructionSavePanel konzolhiba:** szervezeti URL-lel, mentett faanyag-revízióból, kalkulátorváltással és újrakitöltéssel sem reprodukálódott; a konzolban csak az M9 alatti, HMR-időszaki egyetlen bejegyzés látszik. Kód szerint a `definition` a suite-ban mindig objektum, undefined csak a dinamikusan betöltött definíciómodul hiányos állapotából eredhet (valószínűleg HMR). Nem javítva, külön megfigyelés.
- **Korlát:** a talp- és derékszelemen szélessége, a szelemenmagasság és a gerincdeszka magassága nem bemenet: az ülék felfekvése nem ellenőrzött, a szelemenek vázlatosak. Kis bevágásnál (pl. 50 mm a 200 mm-es szarufán) a részlet alapnézete a teljes keresztmetszetet mutatja, a bevágás nagyításhoz a részletzoom kell; helyhiánynál a szögív elmarad (érték a listában). Valódi érintőképernyő nem tesztelt. Az ereszvég végvágása függőleges (meglévő modell).
- **Javasolt Conventional Commit:** `feat(M9.1): rafter cutting drawing with cut edges, marking points and detail zoom`.

## M9 — Méretezett szarufarajz a három szelemen-csatlakozással (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (a „Szarufa kiszabása” kalkulátor rajza kész; az anyagos kalkulátorok M8-as axonometrikus részlete változatlan, ott a csomópontadat továbbra sem bemenet).

- **Működés:** a `roof.rafter-cut` rajzterületén a korábbi „a/b/L” sematikus háromszög és a „Csomópontok” panel méret nélküli metszete helyett `RafterJointDrawing`. Forrás kizárólag a `calculateRafterJoints` kimenete (`src/domain/drawings/rafter-joint-drawing.ts`): a pontok a meglévő körvonalból és támaszokból, minden felirat a csomópont-táblázat ugyanazon értéke (vagy két modellpont távolsága a felső él mentén). S1 talpszelemen, S2 derékszelemen, S3 gerincszelemen / gerincdeszka / szembefutó gerinc; hiányzó derékszelemen „nincs megadva”, gerincszelemen nélkül nincs kitalált S3-bevágás. Fő rajz: felső él menti lánc (eresz–S1–S2–S3–gerinc) és teljes hossz; részletnézet: függővágás, ülékhossz, ⊥ bevágási mélység, ⊥ megmaradó magasság, függő- és ülékvágás szöge a szarufa tengelyéhez (nem a tetőhajlás). A támasz nem bemenet-kiterjedése (talp-/derékszelemen szélessége, magasság) szaggatott, vázlatos. Hiányzó szarufa-magasságnál vagy érvénytelen csomópontnál nincs metszet, csak a konkrét hiány/ok. Minimális adatbővítés: a `RafterJointDrawing` típus `rafterDepthMm`, `ridgeAxisXMm`, `ridgeJoint` mezőt kapott (nem perzisztált; a mentett eredménysorok változatlanok).
- **Nézet:** px-alapú SVG (ResizeObserver), a feliratok nagyításkor nem skálázódnak, `--tp-text-scale`-t követnek; a kezdő kamera a három csatlakozás befoglaló dobozát illeszti a tényleges vászonra, a „Teljes rajz” a teljes szarufát. Zoom gombok/görgő/csippentés, húzás, nyilak/+/−/0, dupla koppintás → legközelebbi csatlakozás fókusza és kiválasztása. Kézi nézet megmarad inputváltozáskor, a csatlakozás-szerkezet (támaszok, gerinctípus) változásakor visszaáll. Feliratütközés: a meglévő `resolveAnnotationLabelPositions`; vásznon kívüli méretvonal felirata nem jelenik meg, a képernyőn túl rövid méret és a hely nélküli szögív kimarad (érték a jelmagyarázatban).
- **Ellenőrzés:** új Vitest: modell 5 (független 3-4-5 kézi értékek: S1 150/200/120/80, S2 ⊥40, S3 60/80; minden méretvonal geometriai hossza = felirata; lánc 500 + 2500 + 2400 + 100 = 5500 = `calculateRafterGeometry` teljes hossz; gerincdeszka 5500 − 31,25; hiányzó/érvénytelen → nincs metszet; kamera illesztés/zoom-fixpont/pan), komponens 2. Teljes Vitest **185 fájl PASS / 8 SKIP, 1108 PASS / 19 SKIP**; `npm run lint` (egy nem használt konstans javítása után a módosított fájlokra újrafuttatva), `npm run typecheck` és utána `tsc --noEmit` PASS; izolált `next build --webpack` ideiglenes másolatban PASS. DB-változás nincs, pgTAP nem futott.
- **Böngésző (helyi, mentés nélkül):** 375×812 sötét és világos, desktop sötét. Mindhárom szelemennel: fő rajz 500/2500/2400/L = 5500, S1/S2/S3 részlet a táblázattal azonos értékekkel; zoom gomb 125% megmarad S-váltáskor; dupla koppintás S2-re → 862% és S2 kiválasztva; „Teljes rajz” 94%, visszaállítás 100%; szintetikus kétujjas csippentés 60 → 180 px = 300%. Szembefutó gerinc + derékszelemen nélkül: S2 „nincs megadva”, S3 függővágás 53,1°. Gerincdeszka 50 mm: L = 5468,8. Szarufa-magasság nélkül: „A méretezett szarufarajz nem készíthető” + hiánylista, nincs körvonal. Vízszintes túlcsordulás 0 (scrollWidth = 375).
- **Nem ellenőrzött / korlát:** valódi érintőképernyő (csak szintetikus pointer); a részletnézet statikus illesztett nézet (nem nagyítható külön); a ResizeObserver nélküli környezet 360×280-as tartalékmérettel rajzol. A talp- és derékszelemen szélessége nem bemenet (ülék ráférése nem ellenőrzött), az eresz végvágása továbbra is függőleges. Az anyagos kalkulátorok axonometrikus részletéhez nincs csomópontadat, ezért ott S-bevágás nem jelenik meg. A futó dev szerver mellett az `npm run typecheck` `next typegen` lépése a fő `.next` típusait írta (nem izoláltan); az általa átírt `next-env.d.ts` visszaállítva. Egy `ConstructionSavePanel` konzolhiba (`definition` undefined) HMR közben egyszer megjelent, friss betöltés és újrakitöltés után nem ismétlődött; a komponens nem változott.
- **Javasolt Conventional Commit:** `feat(M9): dimensioned rafter drawing with S1–S3 purlin joint details`.

## QA-10 — Staging migration, multi-user Auth/RLS és release gate (2026-10-25)

Státusz: **PREFLIGHT BLOCKED; STAGING/PRODUCTION NOT MODIFIED**. A [részletes preflight](QA10_STAGING_RELEASE_VALIDATION.md) szerint a checkout nincs Supabase-projekthez linkelve, a lokális env csak `127.0.0.1` célpontokat tartalmaz, a CLI-hez nincs access token, a Supabase MCP projektleltár pedig nem érhető el. Emiatt az elkülönített staging célpont, remote migration history/sémadrift, backup/PITR, backfill, writer credential és staging app-verzió nem bizonyítható; a kötelező döntési kapu előtt megálltam.

- Nem történt staging- vagy fő helyi DB-írás, migráció, linkelés, reset/repair, fixture, credential-módosítás, deploy, commit vagy push.
- A forrás 119 migrációt tartalmaz, utolsóként a `20261025154642_qa08_rpc_trust_boundary.sql` fájlt. A távoli hiánylista nem ismert, ezért nem állítható, hogy kizárólag ez az egy migráció vár alkalmazásra.
- Backup/restore és többfelhasználós Auth/RLS E2E nem futott. A következő kapuhoz exact staging project ref, read-only hozzáférés, staging app SHA és bizonyított backup/PITR + elkülönített restore-próba szükséges; a migrációhoz ezután is külön konkrét jóváhagyás kell.
- Javasolt Conventional Commit: `docs(QA-10): record blocked staging release preflight`.

## QA-09 — RPC migrációintegráció, Auth E2E és release readiness (2026-10-25)

Státusz: **COMPLETE az elkülönített helyi hatókörre; READY FOR CONTROLLED STAGING ROLLOUT; fő helyi/hostolt DB NOT APPLIED**. A [részletes bizonyíték](QA09_MIGRATION_INTEGRATION_READINESS.md) szerint a teljes 119 migrációs lánc, a restricted writer, a privát attesztáció, a downstream guardok és a tényleges Next.js + Supabase Auth workflow egy külön helyi Supabase-projektben működik. A fő helyi DB továbbra is `20261025140000`, attesztációs tábla nélkül; a meglévő dev szerver nem állt le.

- TDD-ben bizonyított backfill-hiba: a korábbi `server_recomputed` metaadat + struktúra egy ledger nélküli hamis fixture-t is attesztált (**5/5**). A migráció most csak pontos immutable revízió ↔ korábbi restricted-writer operation-ledger egyezést fogad; GREEN: **4 legitim, 0 hamisított, 0 mismatch**. Az új globális pgTAP állítás miatt a teljes DB suite **62 fájl / 1319 PASS**.
- Valódi authenticated böngészős E2E: hiányos mentés tiltott; szarufa V1→V2→történeti V1→V3; új munkanapló és pontos V3-link; vágáslista V1-ből forráskulcsos ajánlati sor, mentés és újranyitás. DB-bizonyíték: **4/4 E2E revízió attesztált + ledgerelt, 1 munkanapló-link, 1 ajánlatforrás, 0 attesztáció/ledger eltérés**.
- Régi upgrade-snapshot: 4/4 korábbi writer-revízió backfillelt; régi revízió authenticated olvasása/új linkje és aktív történeti kapcsolat leválasztása rollbackelt tranzakcióban sikeres. Teljes Vitest **183 PASS / 8 SKIP fájl, 1101 PASS / 19 SKIP teszt**; lint, izolált typecheck és Next 16.4.2 webpack build PASS; DB lint 0 error, korábbi független warningokkal.
- Hostolt rollout továbbra is blokkolt a backfill dry-run kézi jóváhagyásáig, igazolt backup/PITR restore-ig, szerveroldali writer credential preflightig és többtagú staging Auth/RLS smoke-ig. A rollback nem tekinthető veszteségmentesnek; fail-closed + roll-forward az elsődleges recovery.
- Javasolt Conventional Commit: `fix(QA-09): harden RPC backfill and prove release readiness`.

## QA08-RPC-01 — Calculation RPC trust boundary (2026-10-25)

Státusz: **COMPLETE a helyi forrásra és izolált DB-bizonyítékra; hostolt/megosztott migráció NOT APPLIED**. A [részletes bizonyíték](QA08_RPC01_TRUST_BOUNDARY.md) szerint a tényleges rés nem a már korlátozott konstrukciós writer közvetlen hívhatósága, hanem a downstream `authenticated` RPC-k eredetellenőrzés nélküli bizalma volt. A restricted writer most csak strukturálisan teljes snapshotot fogad el, atomikus privát attesztációt készít, a munkanapló- és ajánlatforrás-guard pedig kizárólag ilyen pontos org/kalkuláció/revízió hármast fogad el.

- A böngésző továbbra is csak inputot küld; a Server Action meglévő TypeScript motorja újraszámít és teljességet ellenőriz. Az `authenticated` és `service_role` nem hívhatja a writert; kizárólag a minimális `tetopro_covering_writer` szerepkör. RLS-lazítás, service-role általánosítás és SQL-ben újraírt geometriai motor nincs.
- TDD RED: **10/26 FAIL** a régi sémán, rollbackelve. GREEN az eldobható DB-klónon: célzott pgTAP `057/058/060` **63/63 PASS**, teljes pgTAP **62 fájl / 1318 PASS**. Két párhuzamos V2 mentésből pontosan egy sikerült, a másik `40001`; 2 revízióhoz 2 attesztáció tartozott.
- Célzott Vitest **24/24 PASS**; teljes Vitest **183 PASS / 8 SKIP fájl, 1101 PASS / 19 SKIP teszt**; lint és Next typegen + TypeScript PASS. Alkalmazáskód nem változott, ezért production build nem futott. A régi immutable snapshotok nem változtak; a későbbi QA-09 hardening a backfillt pontos restricted-writer operation-ledger egyezéshez kötötte, mert a `server_recomputed` metaadat önmagában nem bizonyult elégségesnek.
- Új migráció: `20261025154642_qa08_rpc_trust_boundary.sql`; hostolt és megosztott helyi adatbázisra nem alkalmazva. Javasolt Conventional Commit: `fix(QA08-RPC-01): attest trusted calculation revisions`.

## QA-08 — Teljes end-to-end és integrációs ellenőrzés (2026-10-25)

Státusz: **PASS WITH LIMITATIONS; az akkori P2 integritási finding helyi follow-upban lezárva**. A [részletes QA-08 bizonyíték](QA08_FULL_E2E_VERIFICATION.md) szerint a helyi teljes Vitest **183 fájl PASS / 8 SKIP, 1101 PASS / 19 SKIP teszt**, a helyi pgTAP **61 fájl / 1292 PASS**, lint, typecheck, izolált webpack build és a célzott PDF/kalkulátor suite (**5 fájl / 28 teszt**) zöld. Hitelesített helyi Brave-ban a 31 kalkulátor-katalógus 4/17/10 kategóriás selector-mátrixa, mentett kalkuláció, munkanapló, ajánlat, anyaglista és anyagkezelő olvasási útvonala ellenőrzött.

- Teljes tartós A–F E2E nem minősíthető COMPLETE-nek: nem volt igazoltan elkülönített eldobható auth/fixture; új mentés, fotófeltöltés, PDF-generálás, 101/201/525/51/125-ös böngészős adatmennyiség és mobil viewport-mátrix nem futott.
- A közvetlen authenticated `link_execution_plan_document` RPC tranzakciós próbája üres konstrukciós `output_snapshot`-ot **`created: true`** eredménnyel elfogadott; a `ROLLBACK` után a fixture és link 0/0 maradt. Ez nyitotta a QA08-RPC-01 findingot; a későbbi célzott javítás helyi forrásban és izolált DB-klónon **lezárta**, de hostolt/megosztott migráció nélkül ott még nem aktív.
- Nincs adatbázis-, RLS-, kalkulációs-, mentési- vagy történeti snapshot-módosítás. Javasolt Conventional Commit: `docs(QA-08): record full end-to-end integration verification`.

## QA-07 — Munkanapló-üresállapot és navigációs konzisztencia (2026-10-25)

Státusz: **COMPLETE a QA-07 célzott mérföldkőre**. A munkanapló-lista és a dashboard üres munkanapló-állapota már nem ígér felmérésből indított, kivezetett létrehozási folyamatot. Az új szöveg: „Munkanaplót önállóan vagy mentett kalkulációból indíthatsz.”

- Az „Új munkanapló” CTA továbbra is a tényleges `/kivitelezes/uj?organization=…` útvonalra mutat; a nem üres lista meglévő `/kivitelezes/:planId?organization=…` navigációja változatlan.
- Célzott red→green UI-regresszió: üres és nem üres `ExecutionIndexPage`, dashboard-üresállapot, régi „felmérésből” szöveg hiánya és CTA-célútvonalak: **8/8 PASS**.
- Nincs adatbázis-, RLS-, kalkulációs-, mentési- vagy történeti felmérés-snapshot módosítás. A történeti felmérés-olvasók és a meglévő felmérés→munkanapló kapcsolási útvonalak érintetlenek.
- Javasolt Conventional Commit: `fix(QA-07): align worklog empty-state navigation copy`.

## QA-06 — Teljes kalkulációs revíziótörténet és lapozás (2026-10-25)

Státusz: **COMPLETE a QA-06 célzott mérföldkőre**. A [részletes bizonyíték](QA06_CALCULATION_REVISION_HISTORY.md) szerint a korábbi 50-es lekérdezési korlát helyett 50-es szerveroldali oldalak és látható „Régebbi revíziók betöltése” vezérlő működik. Az első oldal 51 sort kér a további oldal detektálásához; V51/V125 és a legrégebbi snapshot kurzorozott lapon érhető el.

- A revíziók `revision_number DESC, id DESC` sorrendben, szervezet + kalkuláció szűréssel töltődnek; a lapok rekord-ID szerint deduplikálva, async elavulásvédelemmel kerülnek a munkamenetbe. A direkt revízióforrás-olvasás nem függ az első oldaltól.
- Célzott adat/action/panel: **21/21 PASS**; teljes Vitest **182 fájl PASS / 8 SKIP, 1098 PASS / 19 SKIP teszt**; lint, typecheck, izolált webpack build, `git diff --check` PASS; helyi pgTAP **61 fájl / 1292 PASS**. Hitelesített browser E2E nem futott: nem volt futó helyi szerver és 51/125-ös tartós fixture.
- Nincs séma-, RLS-, snapshot-, formula- vagy migrációmódosítás. Javasolt Conventional Commit: `fix(QA-06): paginate complete calculation revision history`.

## QA-04 — Kalkulációteljesség és biztonságos továbbadás (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA04_CALCULATION_COMPLETENESS.md) szerint a menthetőség most a kért eredmény teljességéből következik, nem pusztán az érvényes tetőgeometriából. A teljes, hiányos, érvénytelen és nem támogatott állapot külön kezelt; a kliens és a szerver ugyanazzal a domain-szabállyal dönt. Történeti hiányos revízió megnyitható, de az alkalmazás normál szerveres útvonalán nem adható tovább ajánlatba vagy új munkanapló-kapcsolatba.

- Hitelesített helyi Brave: faanyag-kalkulátor kiosztás nélkül „Hiányos”, konkrét hiánylistával és tiltott mentéssel; 80 cm szarufakiosztás után „Teljes” és engedélyezett mentés. Desktop és DevTools iPhone SE 375×667; tartós mentés nélkül.
- Végső célzott regresszió **11 fájl / 61 PASS**; teljes Vitest **181 PASS / 8 SKIP fájl, 1085 PASS / 19 SKIP teszt**; lint, közvetlen tsc, izolált `npm run typecheck`/`npm run build`, teljes helyi pgTAP **61 fájl / 1292 PASS** és `git diff --check` PASS. Nincs migráció, RLS-változás vagy képletmódosítás.
- Korlát: tartós piszkozat külön migrációt és teljes RPC/downstream státuszszerződést igényel, ezért csak a QA-03 munkamenet-draft maradt. A QA-04 idején a downstream RPC-k közvetlen hívása még nem ismerte a teljességi szabályt; ezt a QA08-RPC-01 helyi follow-up attesztációs kapuval lezárta, hostolt/megosztott migráció nélkül ott még nem aktív. Javasolt commit: `fix(QA-04): gate calculation saving and downstream use on completeness`.

## QA-03.1 — Történeti revízió és browser back/forward (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**; mindkét hiba helyben reprodukálva és javítva. A [részletes bizonyíték](QA03_1_COMPATIBILITY_NAVIGATION.md) szerint a régi DEMO szarufa V2 változatlan megnyitáskor „Mentve · V2”, a tényleges szerkesztés dirty. A mentett snapshot változatlan; ismeretlen régi mező explicit inkompatibilitási állapot. A kliensoldali browser back/forward felhasználó-, szervezet- és számításkulcsos munkamenetmemóriából visszaállítja a draftot, a kifejezett elvetés törli azt.

- Hitelesített helyi Brave: V2 200→210 cm, back→forward után 210 cm; „Kilépés mentés nélkül” után 200 cm; új kalkuláció 300 cm back→forward és A→B→A után megmaradt. Puszta 200 cm→2 m egységváltás nem kérdezett rá. Teljes dokumentumos backnél a `beforeunload` figyelmeztetés megszakítható volt.
- Teljes Vitest **180 PASS / 8 SKIP fájl, 1074 PASS / 19 SKIP teszt**; lint, közvetlen tsc, izolált `npm run typecheck`/`npm run build` és `git diff --check` PASS. DB-séma, RLS és mentett adat nem változott.
- Korlát: teljes újratöltés/lapbezárás böngészőfüggő `beforeunload`; élő második szervezet és tartós böngészős revíziómentés nem tesztelt. Javasolt commit: `fix(QA-03.1): compare historical snapshots and retain navigation drafts`.

## QA-03 — Kalkulátor-draft megőrzése és biztonságos váltás (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA03_CALCULATOR_DRAFT_PRESERVATION.md) szerint a kalkulátoronkénti, csak memóriában élő mező- és mértékegység-draft A→B→C→A/B váltáskor megmarad; azonos választás nem töröl. A mentett revízió explicit felülírása és az új kalkuláció megerősített, a szervezeti kontextus új munkateret kap. A számítás és rajz a visszaállított kanonikus mm-adatból számolódik.

- Hitelesített asztali és 375×667 mobil DEMO: 400/300 cm szarufa → visszaváltás után 5000 mm; részleges B és opcionális A értékek, 4 m kijelzés megmaradt; új kalkuláció törlése/cancel és V2→V1 revízióválasztás ellenőrzött, tartós írás nélkül.
- Teljes Vitest **179 PASS / 8 SKIP fájl, 1070 PASS / 19 SKIP teszt**; lint, közvetlen tsc, izolált typecheck/build és `git diff --check` PASS. DB-séma/RLS/migráció nem változott.
- Korlát: a meglévő guard nem védi a SPA browser back/forward eseményt; valódi érintőkészülék és élő szervezeti váltás nem tesztelt. Régi DEMO M2 V2 snapshot megnyitáskor már dirty státuszt mutat, külön történeti kompatibilitási vizsgálat kell. Javasolt commit: `fix(QA-03): preserve calculator drafts across in-session switching`.

## QA-05 — pgTAP tesztizoláció és teljes helyi regresszió (2026-10-25)

Státusz: **COMPLETE a helyi QA-05 mérföldkőre**. A [részletes bizonyíték](QA05_PGTAP_TEST_ISOLATION.md) szerint a `040` teszt korábbi, teljes táblát számláló negatív RLS-állítása helyett kizárólag a saját két privát link-ID-jét ellenőrzi. Új pozitív állítás bizonyítja, hogy a létrehozó mindkét helyes fixture-rekordot látja. A korábban hibát okozó, M3 szerint jogszerű aktív kalkulációs kapcsolat továbbra is látható a szervezeti tagnak.

- Red→green: eredeti `040` **23/24 PASS, 1 FAIL**; javított `040` **25/25 PASS**. M3 `057`-tel együtt mindkét sorrendben **46/46 PASS**; teljes `npm run db:test` két egymást követő futásban **61 fájl / 1292 PASS**.
- `npm test` **178 PASS / 8 SKIP fájl, 1067 PASS / 19 SKIP teszt**; lint és `git diff --check` PASS. SQL-teszten és dokumentáción kívül nincs módosítás; typecheck/build ezért nem futott. Nincs migráció, reset, hosted DB-művelet vagy tartós tesztadat.
- Javasolt Conventional Commit: `test(QA-05): scope document-link RLS assertions to owned fixtures`.

## QA-02 — Anyagkatalógus teljessége és közvetlen termékmegnyitás (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA02_MATERIAL_CATALOG_COMPLETENESS.md) szerint a termékrészlet pontos, szervezetre szűrt ID-lekérdezést használ; az Anyagkezelő 50-es szerveroldali lapokat és keresést kapott. Az ajánlat/anyaglista induláskor 50 terméket és a mentett variánsokat tölti, a közös kiválasztó kereséssel és további oldalakkal minden aktív termékhez hozzáfér. A teljes katalógust igénylő kimutatás/kalkulátor/szerverfogyasztó ellenőrzött lapozást használ; az árverziók sem csonkolódnak.

- Red→green mock-regresszió: 0/1/199/200/201/525 termék, direkt ID és szervezeti izoláció, archivált hozzáférés, 11. oldal, keresés/rendezési tie-breaker, 201. kalkulátorprofil és tetőfedési opció, 1101 árverzió. Az 525 elemű szintetikus fixture-ben az első katalógusoldal 200 helyett 50 terméksort küld (terméksor-JSON: 77 939 → 19 489 byte); valós DB-mérés nem történt.
- Célzott tesztek PASS; teljes Vitest **178 PASS / 8 SKIP fájl, 1067 PASS / 19 SKIP teszt**; lint PASS; izolált typecheck/build PASS; `git diff --check` PASS. DB-migráció és tartós adatírás nincs.
- Korlát: élő, autentikált 201+ termékes böngészős E2E és production teljesítménymérés nem futott; a helyi dev oldal betöltőhéjnál maradt. A korábban ismert QA-05 pgTAP hibát nem érintettük.
- Javasolt Conventional Commit: `fix(QA-02): page complete material catalog and open products by exact ID`.

## QA-01 — Munkanapló és PDF teljes adatbetöltése (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA01_EXECUTION_DATA_COMPLETENESS.md) szerint a közös munkanapló-loader globális 100-as napló/esemény/fotó limitje helyett ellenőrzött, 100 soros lapozás működik; a terv és feladat is teljesen lapozott. A PDF a kért tervet olvassa, hiányos adatnál 502-t ad dokumentum helyett. A szándékosan limitált áttekintő lista nem változott.

- Red→green, kétterves 0/1/100/101/275 rekordos azonosító-, sorrend- és kapcsolatteszt; második laphiba, `42501`, duplikált lap, megváltozott számlálás és 40 soros szerverlimit. A PDF-route 101 ID-t ad a renderelőnek; a valódi renderer 101 bejegyzésből többoldalas PDF-et készít. Signed URL-kérések legfeljebb 16 párhuzamos hívásban.
- Teljes Vitest **176 PASS / 8 SKIP fájl, 1053 PASS / 19 SKIP teszt**; lint PASS; izolált `npm run typecheck` és `npm run build` PASS. DB-migráció, tartós adatírás nincs.
- Nem futott: élő 101+ rekordos DB/browser E2E, hostolt RLS és teljes pgTAP; a QA-05 miatt korábban ismert pgTAP FAIL továbbra sincs kijavítva. Párhuzamos adatváltozásnál nincs több HTTP-queryre kiterjedő tranzakciós snapshot.
- Javasolt Conventional Commit: `fix(QA-01): load complete execution history for work logs and PDF`.

## QA-2026.10 — Teljes rendszer QA audit (2026-10-25)

Státusz: **PARTIAL / javítást igényel**. A [részletes audit](FULL_SYSTEM_QA_AUDIT.md) 31 kalkulátort és 10 fő funkciócsoportot leltároz; 2 kalkulátoron történt nem mentő böngészős részpróba. P0: 0, P1: 2, P2: 4, P3: 1. Fő hibák: munkanapló/PDF csendes 100 soros csonkolása, anyagkatalógus 200-as korlátja miatti elérhetetlen termék, kalkulátorváltáskori mentetlenadat-vesztés. Az alkalmazáskód és a DB nem változott.

- Friss ellenőrzések: teljes Vitest **175 PASS / 8 SKIP fájl, 1039 PASS / 19 SKIP teszt**; ESLint PASS; közvetlen `tsc` PASS; elkülönített Next.js production build PASS; `git diff --check` az audit elején és a dokumentációs módosítás után PASS.
- Helyi pgTAP **61 fájl / 1291 állítás / 1 FAIL** (`040`, 13. állítás). A teszt az egész táblát számolja, és egy korábbi, M3 szerint látható aktív kalkulációs link miatt bukik; a két saját privát link másik tag számára nem látszott. Ideiglenes, saját rekordokra szűkített diagnosztikai másolat 24/24 PASS. Az eredeti teljes DB suite **nem PASS**.
- Nem igazolt: teljes A–E E2E mentés/újranyitás, mobil viewportok, hostolt Supabase/Storage, exportok képi paritása és production teljesítmény. Tartós tesztírást az elkülönített tesztadat hiánya miatt nem végeztünk.
- Javasolt Conventional Commit: `docs(QA-2026.10): record full-system audit findings and verification gaps`.

## M8 — Szarufa-részletrajz a két anyagos kalkulátorban

Státusz: **PASS WITH LIMITATIONS** (kiosztási nézet kész; csomóponti bevágás nem, szakmai adat/döntés hiányában).

- **Működés:** a „Tetőanyag-kimutatás” (ha a szarufa és léc kért) és a „Tetőszerkezet faanyag és vágáslista” rajzterületén a teljes tetőrajz *előtt* automatikusan megjelenik a „Szarufa-részlet · közeli nézet”. Forrás: `RoofTimberLayout.rafters.segments` változatlanul (`src/domain/drawings/rafter-detail.ts`); a legtöbb szarufát tartalmazó tetősík középső 2–3 szarufája, egy kijelölve. Ortografikus axonometria (60° forgatás, 25° dőlés); a feliratok (hossz, tényleges osztás, hajlás) domainértékek, nem vetített hosszak. Helyi mm/cm/m kijelzés `formatLength`-del. Zoom/pan/csippentés/görgő a meglévő `drawing-viewport.ts` függvényekkel, nyilak/+/−/0 billentyűk, „Nézet visszaállítása” a közeli alapnézetre; azonos szarufa-geometriájú újraszámolás (pl. léctávolság) nem állítja vissza a nézetet, új szarufa-kiosztás igen. Hiányzó/érvénytelen osztásnál magyarázó állapot.
- **Referenciatérkép (döntés):** a kiosztás vonalai a tetősíkban futnak (z = 0 a falsík vonalában); a `rafter-joints.ts` metszete a talpszelemen külső síkjától és a madárszájjal süllyesztett felső éltől mér. Ezek az anyagos kalkulátorokban nem adottak, és az sem rögzített, hogy a tetősík a szarufa felső éle. Ezért **minden csomópont C**: alsó felfekvés és gerinc „További adat szükséges” a hiányzó paraméterek listájával; kontyél/vápa/törésvonal/oromél végnél „a 2D csomópontmodell nem alkalmazható”. Bevágási sokszög, vágási szög, gerendatest nincs rajzolva; a keresztmetszet csak szövegesen. Derékszelemen nincs megadva, nem rajzolt. D-szöveg: bevágás, gyengítés, statika, faanyagminőség, jóváhagyott csomópont szakemberi döntés.
- **Ellenőrzés:** új Vitest: modell 7 (független kézi érték: 6 m / 4 m nyeregtető → 5000 mm szarufa, 10 000/17 osztás; szegmens-azonosság a kiosztással; vetítés linearitása és pont-paritás; 2 szarufás eset; C-állapotok, keresztmetszet-függés; konty: eresz→gerinc, sátor: kontyél → nem alkalmazható; szarufa nélkül null), komponens 1 (statikus render: 3 tengely, domain-feliratok, nincs vágási sokszög). Teljes Vitest **175 fájl PASS / 8 SKIP, 1039 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. DB-változás nincs, pgTAP nem futott; izolált build nem futott (fut a dev szerver).
- **Böngésző (helyi DEMO):** 375×812 sötét és világos, 812×375 sötét. Faanyag: 10×6 m, 45°, 60 cm → 3/18 szarufa, 4242,6 mm, 588,2 mm; sorrend: részlet → teljes rajz. 2 szarufás eset; zoom gomb, egérhúzás, szintetikus kétujjas érintés (267%), billentyűk, visszaállítás; mm/cm/m paritás; vízszintes túlcsordulás 0. Tetőanyag: kontytető, faanyag ki → nincs részlet; be, osztás nélkül → magyarázó állapot; 60 cm → hosszú tetősík közös szarufái (eresz → gerinc). Mentett faanyag V1 újranyitva „Mentve · V1”-ként: 4883,1 mm (= 4000 / cos 35°), vágáslista 26 × 4883 mm változatlan. Konzol: csak a meglévő beforeunload-figyelmeztetés.
- **Nem ellenőrzött / korlát:** valódi érintőképernyő (csak szintetikus pointer-esemény); nagy tető válaszideje nincs mérve (a modell csak a kiválasztott sík elemeit rendereli); L/T, félkonty, manzárd böngészőben nem nézve (modell: élfajta szerinti C-állapot); csomópont-bemenet mentése nem készült (új szakmai bemenet és snapshot-szerződés kellene). A rajz kezelőlogikája részben a `TechnicalDrawing`-éval párhuzamos (közös hook nem készült, hogy a meglévő rajz változatlan maradjon).
- **Javasolt Conventional Commit:** `feat(M8): axonometric rafter detail view from the computed timber layout`.

## M7.1 — Lépcsőhajlás és hajlásvonal javítása

Státusz: **PASS.** A kalkulátor-átnézés talált szakmai hibája: az egyenes (fa és fém), a csiga-, a húzott fokos és a betonlépcső a hajlást a teljes emelkedés / vízszintes futás arányából számolta, pedig a fokok száma eggyel kevesebb a fellépésekénél; így a hajlás túl nagy volt (például 175/280 mm-nél 33,69° a helyes 32,005° helyett), és eltért a pihenős lépcső értékétől.

- **Javítás:** minden lépcsőtípusnál a hajlás = atan(fellépő / belépő) (csiga- és húzott fokos lépcsőnél a járóvonal-belépővel). A hossz az első fokéltől a felső szint éléig tartó hajlásvonal: fokszám × √(fellépő² + belépő²); a pihenős lépcső karjainál ugyanez karonként. A „Pofafa/tartó tengelyének geometriai hossza” és a „ferde vetületi hossz” felirat helyett „Hajlásvonal hossza · első fokéltől a felső szint éléig”; az egyenes lépcső leírása kimondja, hogy ez nem a pofafa szabási hossza. A rajzon a hajlásvonal és a szögjel a fokéleken fut. A betonék térfogata nem változott (kézzel ellenőrizve egyenlő a fokos tömör test térfogatával).
- **Ellenőrzés:** független kézi értékek: 15 × √(175² + 280²) = 4952,84 mm; pihenős kar 7 fok × (187,5 / 250) → 3-4-5 háromszög, 2187,5 mm; új teszt: azonos fokméretnél az egyenes, a beton- és a pihenős lépcső ugyanazt a hajlást adja. Teljes Vitest **173 fájl PASS / 8 SKIP, 1031 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. Böngésző (mobil): egyenes 32,005° / 4952,84 mm, beton 32,005° / 5,88 m³, pihenős 36,87° / 2187,5 mm, csiga 36,927°, húzott fokos 28,62° / 5427,97 mm, mind egyezik a kézi számítással.
- **Korlát:** a pofafa tényleges szabási hossza (pofafa szélessége, csatlakozás) továbbra sem számított. Mentett lépcső-kalkuláció nincs (a lépcsők nem menthetők), így régi eredmény nem változik.
- **Javasolt Conventional Commit:** `fix(M7.1): use riser/going pitch and pitch-line length for all stair types`.

## M7 — Integráció, teljes ellenőrzés, dokumentáció

Státusz: **PASS WITH LIMITATIONS.** A kalkulátor-központú munkafolyamat (Kalkulátor → mentett revízió → munkanapló / árajánlat) helyben végig működik.

- **Javítás 1 (M6-regresszió):** a 0 peremsávval, de explicit `…InsetMm: 0` kulcsokkal mentett régi faanyag-revízió megnyitáskor „Mentetlen módosítás”-t mutatott, és letiltotta a munkanapló- és ajánlat-gombot. A mentett bemenet olvasáskor normalizálva (`normalizedConstructionInput`, `construction-data.ts`); a DB-ben tárolt snapshot változatlan. Új teszt.
- **Javítás 2 (M5-maradvány):** a munkanaplóban üres „Csatolt felmérések · 0” szakasz és egy már nem igaz útmutatás („Felmérésből … csatolható”) jelent meg. Kapcsolt felmérés nélkül a szakasz nem jelenik meg; hibás vagy elérhetetlen kapcsolat figyelmeztetése megmaradt. Új teszt.
- **Ellenőrzés:** `eslint .` PASS; `tsc` PASS; teljes Vitest **173 fájl PASS / 8 SKIP, 1030 PASS / 19 SKIP**; teljes pgTAP **61 fájl / 1291 PASS** (helyi); izolált `next build --webpack` PASS (a munkakönyvtár másolatában, a futó dev szerver `.next`-jét nem érintve), a javítások után újrafuttatva.
- **Böngésző (helyi DEMO):** mobil 375×812: dashboard (Kalkulátorok elöl, alsó sáv öt elemmel), mentett lista, faanyag-revízió újranyitása „Mentve · V1”-ként, szarufa-kalkuláció csomópontokkal → új munkanapló létrehozása és kapcsolása → a naplóban a V1 eredmény a csomópont-értékekkel. Tablet 768×1024: faanyag V1 → „Árajánlat készítése” → kalkulációs forráspanel 3 átvihető mennyiséggel (26 db, 126,960557 m, 26 × 4883 mm). Desktop: oldalsáv-navigáció, csomópont-szekció és metszeti rajz. Konzolhiba nincs (csak a böngésző beforeunload-figyelmeztetése).
- **Nem ellenőrzött / korlát:** hostolt adatbázis és deploy; világos téma ebben a körben nem nézve; ajánlatpiszkozat mentése ebben a körben nem futott (M4-ben igen); a nyitott döntések (12/3, 12/4, 12/11) és a belső felmérés-kód eltávolítása külön kapu.
- **Javasolt Conventional Commit:** `fix(M7): keep pre-M6 revisions unmodified on reopen and hide empty retired survey section`.

## M6 — Peremsáv-szabály és szarufa-csomópontok

Státusz: **PASS WITH LIMITATIONS.** Döntések: 12/1 — „A”: a peremsáv mindig 0, a lécre is; 12/2 — mindhárom csomópont, mérési referencia a szarufa felső éle (mai modell: a madárszáj magassága csökkenti a hatásos emelkedést, így a hajlást is).

- **Peremsáv:** a `roof.material-takeoff` és `roof.timber-cutlist` kiosztási mezői közül a négy peremsáv-mező kikerült; a suite bemenete a régi kulcsokat eldobja (`withoutEdgeStrips`), a `roofTimberInputFromParameters` hiányzó peremsávot 0-nak vesz. Történeti snapshot (felmérés, projekt-kalkuláció) a saját tárolt peremsávjával számol tovább. Az eredmény feltételezései kiírják, hogy a szélső szarufa a (kiülést tartalmazó) tetősík határán áll. A helyi mentett faanyag-revízió eleve 0 peremsávval készült, így eltérés nincs.
- **Csomópontok:** új `src/domain/calculations/construction/rafter-joints.ts`. Koordináták: x vízszintesen a talpszelemen külső síkjától (madárszáj függővágása), y függőlegesen a talpszelemen felső síkjától; felső él `y = HAP + x·tanα`. Alsó felfekvés: függő- és ülékvágás szöge (A); szarufa-magassággal függővágás-magasság, ülékhossz, merőleges bevágási mélység, megmaradó magasság (B). Derékszelemen: felfekvés távolsága a felső él mentén és bevágás vagy alátétezési hézag a szelemen helyéből és magasságából (B). Gerinc: szembefutó (A), gerincdeszka `(t/2)/cosα` hosszcsökkenés (B), gerincszelemen bevágás (B). Hiányzó bemenet: C-lista; bevágás megengedhetősége, méretezés, kapcsolóelemek: D-szöveg, a rendszer nem dönt. A táblázat és a metszeti SVG ugyanabból a kimenetből készül. A B-értékek a mentett revízió eredménysoraiba kerülnek; csomópont-bemenet nélkül a sorok változatlanok (régi revízió nem jelez eltérést).
- **Ellenőrzés:** új Vitest: csomópontok (6, független kézi trigonometria: 3-4-5 háromszög, HAP 100, h 200 → függővágás 150, ülék 200, mélység 120, maradék 80; derékszelemen 50/66,7/40, felfekvés 2500; gerincdeszka 31,25; gerincszelemen 60/80), suite (2: peremsáv-eldobás, sorstabilitás). Teljes Vitest **173 fájl PASS / 8 SKIP, 1029 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. Adatbázis-változás nincs, pgTAP nem futott.
- **Böngésző (helyi DEMO, 375×812):** a kézi tesztadatok mind a négy csomópont-esetben pontosan ugyanazokat az értékeket adták; a metszeti rajz a két bevágással megjelent; a gerinctípus-váltó a releváns mezőket mutatja; a faanyag-kalkulátorban nincs peremsáv-mező. Valódi mentés: V1 a szerveren újraszámolva, a csomópont-értékek az eredményben (helyi DB).
- **Korlát / nem ellenőrzött:** a tesztadat független kézi számítás, nem CAD- vagy szakemberi ellenőrzés. A talpszelemen szélessége nem bemenet (az ülék ráférése nem ellenőrzött); az eresz végvágása függőlegesnek rajzolt. A visszavont felmérés-szerkesztő peremsáv-mezői változatlanok (UI-ból nem érhető el). Izolált build nem futott (fut a dev szerver; M7).
- **Javasolt Conventional Commit:** `feat(M6): zero edge strip layout and classified rafter joint geometry`.

## M5 — Felmérések kivezetése, kalkulátor-központú navigáció

Státusz: **PASS WITH LIMITATIONS.** Döntések: 12/5 — a meglévő felmérésekre nincs szükség (mind DEMO), ezért nem készült csak olvasható nézet; az adatok törlés nélkül megmaradnak. 12/10 — mobil alsó sáv: Műhely, Kalkulátorok, Munkanaplók, Árajánlatok, Anyaglisták.

- **Navigáció:** a Felmérések kikerült a dashboardról és a menüből; a Kalkulátorok az első funkció; a dashboard felmérés-piszkozat értesítője eltűnt. A `/felmeresek`, `/felmeresek/uj`, `/felmeresek/[surveyId]` és a régi kalkulátor-átadó útvonal a `/kalkulatorok`-ra irányít (`retired-survey-route.ts`).
- **Új felmérés tiltása:** a `saveFieldSurveyAction` új felmérésnél adatbázis-hívás nélkül elutasít; DB-szinten BEFORE INSERT trigger (`docs/DATABASE.md` M5). A munkanaplóban és az anyaglistában a „felmérés megnyitása” linkek kikerültek, a kapcsolt felmérési adatok és azonosítók továbbra is inline látszanak.
- **Ellenőrzés:** teljes Vitest **172 fájl PASS / 8 SKIP, 1021 PASS / 19 SKIP** (a felmérés-action, dashboard, útvonal és anyaglista tesztek az új viselkedéshez igazítva, új teszt a tiltásra); `eslint .` PASS; `tsc` PASS. pgTAP `059` 4/4, teljes **61 fájl / 1291 PASS** (helyi). Helyi PostgREST-hívás helyben aláírt teszt-JWT-vel: `save_field_survey` → `55000`, a felmérések száma 39 maradt.
- **Böngésző (helyi DEMO, 375×812):** alsó sáv: Műhely · Kalkulátorok · Munkanaplók · Árajánlatok · Anyaglisták (Anyagkezelő csak széles nézetben); a dashboard funkciói Kalkulátorokkal kezdődnek, felmérés nélkül; `/felmeresek/uj` és egy felmérés-részletoldal valódi navigációval a `/kalkulatorok`-ra jut. A dev szerver a munka közben leállt, a `launch.json` `tetopro-dev` konfigurációjával indítottam újra.
- **Korlát / nem ellenőrzött:** a belső felmérés-kód (szerkesztő, actionök, fotó-API, felmérésből indított munkanapló/ajánlat/anyaglista actionök) a helyén maradt, UI-ból nem érhető el; végleges eltávolítása és bármilyen adattörlés külön jóváhagyás. A trigger csak az új felmérést tiltja, a meglévők módosítását nem. Az `execution-linked-surveys.tsx` módosítása a commitolatlan F9.73.1 fájlban történt (vegyes fájl). Hosted DB.
- **Javasolt Conventional Commit:** `feat(M5): retire field survey creation and make calculators the primary entry`.

## M4 — Kalkulációból árajánlat

Státusz: **PASS WITH LIMITATIONS.** Mentett suite-kalkulációból közvetlenül ajánlatpiszkozat indítható, munkanapló és anyaglista nélkül. Döntések: 12/8 — ajánlati mennyiségként csak kiosztási (LAYOUT) mennyiség és vágáslista-sor vihető át, minden más tájékoztató; 12/9 — marad a nettó HUF, ÁFA nélkül.

- **Működés:** a kalkulátor mentés-sávjában „Árajánlat készítése a Vn revízióból” (mentetlen módosításnál tiltva). Az ajánlatszerkesztő „Kalkulációs forrás” panele listázza az átvihető mennyiségeket és a tájékoztató eredményeket; sort nem tölt elő automatikusan (a faanyagnál ugyanaz a 26 szarufa kiosztásként és vágáslistaként is szerepel, az automatikus felvétel duplázna). Felvett sor: kézi anyag, hiányzó ár, szerkeszthető mennyiség, a meglévő katalógus- és árválasztóval árazható; a sor forrásjelölése mutatja az eredeti mennyiséget, a mennyiség- vagy egységeltérést. Újranyitáskor a forrás visszaáll.
- **Újrahasznosítás:** meglévő standalone mentés (wrapper, a közös sor-szerződés változatlan: a forráskulcsot az action leválasztja), `WorkflowMaterialProductPicker`, árforrás-választás, PDF-útvonal, anyaglista-forrás mintája.
- **M3-javítás menet közben:** a teljes pgTAP-ban a `040` elbukott: a böngészős próbából maradt *leválasztott* kalkulációs linket a többi tag is látta. Új migráció korlátozza (aktív link: tagok; leválasztott: csak létrehozó); `057` kiegészítve.
- **Ellenőrzés:** új Vitest: forrásjelölt-építés (4), action-útválasztás (4); teljes Vitest **172 fájl PASS / 8 SKIP, 1020 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. pgTAP `058` 16/16, teljes **60 fájl / 1287 PASS** (helyi). DB-típusok újragenerálva.
- **Böngésző (helyi DEMO, 375×812):** faanyag V1 → ajánlat: panel 3 átvihető mennyiséggel (26 db, 126,960557 m, vágáslista 26 db × 4883 mm), tájékoztató eredmények külön; vágáslista-sor felvétele → „Hiányzó egységár”, gomb „Felvéve”; mentés → v1. DB: forrás a pontos V1-re, SQL-ből rögzített címke/mennyiség, projekt nélküli ajánlat, a sor-snapshotban nincs új mező. Újranyitás: forrásjelölés és „Felvéve” visszaállt.
- **Utólag javítva (M4.1):** (1) mobilon az alsó navigáció eltakarta a „Piszkozat mentése” gombot — a `.quotation-savebar` ragadó alsó távolsága nem számolt a fix alsó navigációval; most `max(--app-nav-bar + .5rem, safe-area)`. Böngészőben 375×812: ragadó állapotban 19 px hely a navigáció fölött, a gomb közepe a gombot találja, valódi kattintás ment (változatlan tartalomnál új revízió nélkül); 1280×800: változatlan 8 px. (2) Újranyitott önálló ajánlatnál a JSONB `null` mezők felülírták a szerkesztő üres alapértékeit (`textarea` `null` figyelmeztetés); betöltéskor a `null` mezők kimaradnak. Jelölővel ellenőrizve: újratöltés és sorkinyitás után nincs figyelmeztetés. Ajánlat-tesztek 12 fájl / 46 PASS, lint és typecheck PASS. Más ragadó mentés-sávok (pl. `.preparation-save-bar`) azonos mintáját nem vizsgáltam.
- **Nem ellenőrzött / korlát:** módosított mennyiségű újramentés böngészőben (pgTAP fedi); PDF-ben a kalkulációs forrás nem jelenik meg külön; egy ajánlati revízió egyszerre csak egy forrásból (anyaglista vagy kalkuláció) vehet át mennyiséget; a `040` pgTAP az összes látható linket számolja, aktív helyi kalkulációs link mellett szándékoltan elbukhat; hosted DB/RLS.
- **Javasolt Conventional Commit:** `feat(M4): start standalone quotations from verified calculation quantities`.

## M3 — Kalkulációból munkanapló

Státusz: **PASS WITH LIMITATIONS.** Mentett suite-kalkulációból új munkanapló hozható létre, vagy meglévőhöz kapcsolható; a kapcsolat a pontos revízióra mutat. A munkanapló opcionális marad, a kalkuláció a kapcsolástól nem változik. Döntés (12/6): a napló látói csak olvashatják a kapcsolt revíziót; szerkeszteni, új revíziót menteni és leválasztani a létrehozó tud.

- **Újrahasznosítás:** meglévő `execution_plan_document_links` + link/unlink RPC (bővítve), `ExecutionPlanLinkControl` (új `calculation` típus, revíziócímke, mentetlen módosításnál tiltott kapcsolás), a meglévő kétlépcsős „létrehozás és kapcsolás” action (mindkét lépés request-key idempotens; részleges hibánál a napló megmarad, és ugyanazzal a gombbal duplikátum nélkül újrapróbálható). Új: `execution-calculation-links.ts` olvasó és `ExecutionPlanCalculations` panel a munkanaplón (hibaizolált szekció, hiányzó/eltérő revízió `unavailable`, nem csendes).
- **Ellenőrzés:** új Vitest: link-olvasó (4), mentés-sáv kapcsolási állapotok (1), link-action kalkulációs ág (1); teljes Vitest **170 fájl PASS / 8 SKIP, 1012 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. pgTAP `057` 20/20, teljes **59 fájl / 1270 PASS** (helyi). DB-típusok újragenerálva.
- **Böngésző (helyi DEMO, 375×812):** mentett szarufa V2 → „Új munkanapló · DEMO M3 tetőfelújítás” → kalkulátorban „DEMO M3 tetőfelújítás · V2”; DB: `calculation`, pontos V2, projekt nélküli napló, revíziószám változatlan (2). Munkanaplón „Kapcsolt kalkulációk · 1”, V2 eredménysorai, „Megnyitás a kalkulátorban”; megerősített leválasztás → 0, DB audit-bélyeg. Közben javítva: a név/típus és az eredménysorok mobilos tördelése. Konzolhiba nincs.
- **Nem ellenőrzött:** másik műhelytag olvasási nézete böngészőben (pgTAP igazolja: tag olvas, kívülálló nem, leválasztás után nincs hozzáférés); meglévő naplóhoz kapcsolás böngészőben (ugyanaz az RPC, unit-teszt); hálózati/részleges hiba böngészőben; hosted DB/RLS. A munkanapló nem hivatalos e-építési napló.
- **Javasolt Conventional Commit:** `feat(M3): link saved calculation revisions to work logs`.

## M2 — Kalkulátor-suite mentése, újranyitása, revíziói (első kör: 4 tetős kalkulátor)

Státusz: **PASS WITH LIMITATIONS.** A `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist` és `roof.truss-members` menthető, projekt/felmérés nélkül. Mentés nélkül továbbra is számol; a nem mentett eredmény „Nincs mentve · helyi előnézet” jelölést kap.

- **Architektúra:** a suite számítása közös, keretrendszer-független modulba került (`src/features/calculators/construction-computation.ts`): ugyanaz a függvény adja a böngészős előnézetet és a szerveroldali újraszámítást. A böngésző csak az input-snapshotot küldi (kanonikus mm mezők + anyagos kalkulátornál kért csoportok, kiosztás, specifikációs szándék); a `saveConstructionCalculationAction` friss katalógussal újraszámol, és a korlátozott íróval menti (`src/infrastructure/supabase/construction-calculation-writer.ts`). Részletek: `docs/DATABASE.md` M2.
- **UI:** `ConstructionSavePanel` — név, állapot (nincs mentve / mentve Vn / mentetlen módosítás / korábbi Vk megnyitva), „Új revízió mentése · Vn+1”, ütközésnél „Aktuális változat betöltése”, revíziólista, eltérésjelzés, ha a mentett kimenet nem egyezik a mostani számítással (pl. katalógusváltozás). Mentetlen módosításra a meglévő navigációs védelem figyelmeztet. A `/kalkulatorok?calculation=` újranyit, a `/kalkulatorok/mentett` listázza az új típusokat.
- **Ellenőrzés:** új Vitest: számítás/snapshot (7), mentés-sáv (4), server action (3); teljes Vitest **169 fájl PASS / 8 SKIP, 1006 PASS / 19 SKIP**; `eslint .` PASS; `tsc --noEmit -p tsconfig.typecheck.json` PASS. pgTAP `056` 17/17, teljes pgTAP **58 fájl / 1250 PASS** (helyi). DB-típusok újragenerálva (csak hozzáadás). `next typegen`/build nem futott (aktív dev szerver a közös `.next`-en).
- **Böngésző (helyi DEMO, 375×812):** szarufa 300/200/50 cm → V1 mentve, DB-ben `construction.roof.rafter-cut`, standalone, projekt nélkül, 3000 mm input, 4206,476 mm szerveroldali output; módosítás → „Mentetlen módosítás”, V2 mentve; újratöltés után V2 értékei és neve (4326,662 mm, kézi számítással egyező); V1 megnyitása → „V1 megnyitva (korábbi) · mentéskor új V3 készül”. Faanyag-vágáslista mentése és újratöltése: kiosztás 90 cm, 26 db, 4883 mm, „Mentve · V1” (az anyagállapot snapshotja stabil). Mentett lista → megnyitás. Konzolhiba nincs. Közben a dev szerver egy régi lefordított modult szolgált ki; tartalomváltozás után helyreállt, kódhiba nem volt.
- **Nem ellenőrzött / korlát:** `roof.material-takeoff` és `roof.truss-members` mentése böngészőben (domain- és action-teszt fedi); ütközés és hálózati hiba böngészőben; hosted DB/RLS; a többi 27 suite-kalkulátor (12/7 döntés szerint későbbi kör). Munkanapló/ajánlat kapcsolat az M3/M4 része.
- **Javasolt Conventional Commit:** `feat(M2): save, reopen and revise roof suite calculations`.

## M1.2 — Hosszbevitel a dedikált tető-, fedés- és profilűrlapokon

Státusz: **PASS WITH LIMITATIONS.** A közös `LengthField` (cm alapértelmezés, mm/cm/m) bekerült: nyeregtető- és többsíkú tetőmodell-űrlap (`gable-roof-form`, `multi-roof-form`), standalone nyeregtető (`standalone-gable-preview`), faanyag- és alátétpanel (projekt, kalkulátor és felmérési tetőszakasz közösen), trapézlemez- és cserepeslemez-termékadatok, cserepeslemez-geometria, profilszerkesztő tangens- és darabhossz, felmérési tetőrészletek szélesség/magasság mezői.

- **Pontosság a mezők saját szerződése szerint:** tetőgeometria, faanyag, alátét, felmérési részletek egész mm; fedési termékadat és profilhossz 0,01 mm (a domain és a DB nem kerekít, így a meglévő tört mentett érték sem válik érvénytelenné). A `LengthField` opciója `integerMm` helyett `mmDecimals`; a `formatLength` most bármely mentett tizedes értéket pontosan jelenít meg (korábban tized mm-re kerekített volna).
- **Szándékosan mm-ben maradt (JÓVÁHAGYÁST IGÉNYEL):** profil anyagvastagság, belső sugár, hajlítási pótlék — tized mm alatti anyag-/gyártási paraméterek, nem elhelyezési hosszak.
- **Nem került bekötésre:** a felmérési mérések (`measurements`) — a mentett `{value, unit}` párt a `private.valid_field_survey_measurements` csak `mm`/`m` egységgel fogadja el; cm-hez migráció kellene egy kivezetendő (M5) funkcióban. A meglévő mm/m váltó marad. A `roofDetails.lengthM` (m-ben tárolt) és darabszám mezők változatlanok.
- **Tesztek:** 3 meglévő teszt elvárása mm-megjelenítésről cm-re pontosítva (szándékuk megmaradt; a „nincs gomb” állítás a mentő-/akciógombokra szűkült). Új: hiba/leíró/disabled, tört mentett érték pontos megjelenítése, mezőnkénti pontosság. Teljes Vitest **166 fájl PASS / 8 SKIP, 992 PASS / 19 SKIP**; `eslint .` PASS; `tsc --noEmit -p tsconfig.typecheck.json` PASS. `next typegen`/build nem futott (aktív dev szerver a közös `.next`-en).
- **Böngésző (helyi DEMO, 375×812):** nyeregtető 1000×800/300/50 cm → 112,50 m², 36,9°, 5,00/5,63 m (kézi számítással egyező); cserepeslemez 118,25 cm névleges szélesség → 120,615 m² névleges felület (1182,5 mm pontosan átment), 20 db; profil 7,25 cm → rajzon „S1: 72,5 mm”, mm-re váltva „72,5”. Nincs vízszintes túlcsordulás. Konzol: csak dev szerver HMR WebSocket-hiba. **Nem futott:** trapézlemez-panel és felmérési tetőrészletek böngészőben, tablet/desktop, fizikai eszköz.
- **Javasolt Conventional Commit:** `feat(M1.2): extend mm/cm/m length input to roof, covering and profile forms`.

## M1 — Egységes hosszbevitel (cm alapértelmezés, mm/cm/m)

Státusz: **PASS WITH LIMITATIONS.** A kalkulátor-központú terv ([0. fázis](CALCULATOR_FIRST_PHASE0_AUDIT.md)) első mérföldköve. Új `src/domain/measurements/length-input.ts`: pontos, decimális-szöveges mm/cm/m → mm konverzió (`1,001 m = 1001 mm` drift nélkül), tizedesvessző és pont, üres/köztes/érvénytelen állapot, egész-mm mezőn tört mm elutasítása (nincs csendes kerekítés), egyéb mezőn legfeljebb 0,1 mm. Új közös `src/components/ui/length-field.tsx`: alapértelmezés cm, mezőnkénti 44 px-es mm/cm/m váltó; érvényes értéknél a váltás a fizikai méretet megtartja, a szülő és a domain csak kanonikus mm-t kap.

- **Bekötve:** a `/kalkulatorok` suite minden `unit: "mm"` mezője (a meglévő `integer` jelölés szerint egész mm vagy 0,1 mm), a faanyag-kiosztás és az anyagspecifikáció mm-mezői (egész mm). Szög, darab, %, terület, térfogat, tömeg, ár változatlan. Számítási motor, mentési szerződés, DB nem változott; az eredmény- és bemenet-visszhang továbbra is mm-ben jelenik meg (12/4. döntés nyitott).
- **Nincs még bekötve:** dedikált tetőmodell-, trapéz-/cserepeslemez-, profil- és felmérési űrlapok (M1 második kör). A nem használt `units.ts` `mToMm`/`cmToMm` lebegőpontos korlátja változatlan; a bevitel nem azt használja.
- **Ellenőrzés:** új tesztek 2 fájl / 14 PASS (köztük 0–20 000 mm minden egységpárra oda-vissza driftmentesség); érintett mappák 38 fájl / 371 PASS; teljes Vitest 166 fájl PASS / 8 SKIP, 989 PASS / 19 SKIP; `eslint .` PASS; `tsc --noEmit -p tsconfig.typecheck.json` PASS. A `next typegen` és a build nem futott, mert aktív dev szerver használja a közös `.next`-et.
- **Böngésző (helyi, authenticated DEMO, 375×812 sötét/világos és 320 px): PASS.** `roof.rafter-cut`: 300/200/50 cm → 3605,551 / 600,925 / 4206,476 mm, 33,69° (független számítással egyező); cm→m→mm→cm váltás 300→3→3000→300, eredmény változatlan; `2,001 m` → 2001 mm; `2,3,4` → hibaüzenet, `aria-invalid`, eredmény elrejtve. `roof.timber-cutlist`: `12,34 cm` egész-mm mezőn elutasítva; 1000×800 cm, 35°, 90 cm osztás → 26 szarufa, 4883 mm, 126,961 m; a kiosztási mezőn 90 cm→900 mm→0,9 m mellett is azonos eredmény. 44 px-es egységgombok, vízszintes túlcsordulás nincs; konzolhiba és React-figyelmeztetés nincs. Az ellenőrzés során talált gyenge sötét témás kiemelést (csak színkülönbség) kerettel javítottam. Tablet/desktop és fizikai eszköz nem futott.
- **Javasolt Conventional Commit:** `feat(M1): add mm/cm/m length input with cm default to calculators`.

## F9.73.1 — Munkanapló betöltési hibáinak izolálása

Státusz: **PASS WITH LIMITATIONS.** Az anyaglista, a kapcsolt dokumentumtípusok és az önálló ajánlatjelöltek hibája a saját panelt/forrást érinti; az egymástól független munkanapló-részek tovább használhatók. A jogosultsági hiba külön állapot; hiányzó cél, current revision vagy exact felmérésforrás nem lesz üres/teljes adatként vagy másik revízióval bemutatva. A kötelező workspace- és immutable ajánlatforrás hard failure maradt.

- **Ellenőrzés:** célzott 6 fájl / 44 teszt PASS; lint PASS; teljes Vitest 164 fájl PASS / 8 SKIP, 975 PASS / 19 SKIP; izolált typecheck és Next.js 16.4.2 Webpack build PASS (32 statikus oldal); `git diff --check` PASS.
- Authenticated DEMO browser smoke: az első betöltés error boundary állapotot adott; manuális reload után az üres anyaglista-panel és két kapcsolt dokumentum betöltött. Az első hiba oka ismeretlen. Hosted DB/RLS és böngészős hibaszcenárió nem futott.
- Ismert, e körön kívüli blokkoló lehetőség: a projekt-metaadat ugyanabban a page-level `Promise.all`-ban maradt. Részletes határok, tesztmátrix és bizonyíték: [`WORKSPACE_FAULT_ISOLATION_F9.73.1.md`](WORKSPACE_FAULT_ISOLATION_F9.73.1.md).
- **Javasolt Conventional Commit:** `fix(F9.73.1): isolate optional workspace read failures`.

## F9.73 — Workspace betöltés és kapcsolt rekordok hibatűrése

Státusz: **PASS WITH LIMITATIONS.** A hibás vagy hiányzó kapcsolt felmérési revízió már nem állítja le a munkanapló oldalát: a helyes testvérrekordok megmaradnak, a hiányos forrás külön figyelmeztetést kap. A felmérési olvasási hiba, jogosultság-megtagadás és valóban üres kapcsolat külön állapot. A felmérési fotó aláírási hibája csak a fotót érinti. Az immutable ajánlati forrás exact quotation/revision olvasási vagy párosítási hibája hard failure marad; így az oldal/PDF nem mutat hiányos forrást teljesként.

- A lekérdezések szervezeti szűrése, exact revision matching, read-only F9.70.1 kompatibilitás és migrációs FK/RLS-szerződés megmaradt; adatbázis- vagy hostolt RLS-változás nem történt.
- Célzott execution tesztek: **7 fájl / 30 PASS**; teljes Vitest: **161 fájl PASS / 8 SKIP, 949 PASS / 19 SKIP**; lint PASS; izolált typecheck PASS; izolált Next.js 16.4.2 Webpack build PASS (32 statikus oldal).
- Helyi, authenticated DEMO böngészősmoke: munkanaplólista és egy exact linked survey card megjelent a részletoldalon. Hibaállapotok tesztkomponenssel ellenőrizve; hosted DB/RLS és storage-hiba nem futott. `git diff --check` PASS; az új, még nem tracked szövegfájlokban sincs záró whitespace.
- Ismert korlát: az execution részlet shared `Promise.all`-jában az anyaglista-, kapcsoltdokumentum- és ajánlatjelölt-betöltés hibája továbbra is blokkolhatja az oldalt. Részletes besorolás és bizonyíték: [`WORKSPACE_RELIABILITY_F9.73.md`](WORKSPACE_RELIABILITY_F9.73.md).
- **Javasolt Conventional Commit:** `fix(F9.73): isolate related workspace failures`.

## F9.70.1 — Történeti felmérési pillanatképek kompatibilitása

Státusz: **PASS WITH LIMITATIONS.** A F9.70 utáni reader megerősített regresszióját javítottam: a migrációk által érvényesnek tekintett, `semanticType` nélküli régi mérés most explicit `custom` alapértéket kap kizárólag az execution olvasási határán. A hiányzó/nullable `sections` flat fallbackje, a pontos revízió és a szervezeti szűrés megmaradt. A teljes `surveySectionsSchema` most az üres/hibás section-listát is elutasítja; az immutable forrásadatot nem módosítja.

- Az érintett fogyasztó a `/kivitelezes/[planId]` kapcsolt felmérés panelje; a kivitelezési PDF nem olvas felmérési sectionöket. A sérült linked revision explicit reader-hibát okoz, és a lap közös `Promise.all` betöltése miatt továbbra is blokkolhatja a teljes tervoldalt; az app error boundary újrapróbálást ad.
- **Ellenőrzések:** execution **6 fájl / 22 PASS**; lint PASS; teljes Vitest **160 fájl PASS / 8 SKIP, 941 PASS / 19 SKIP**; izolált `npm run typecheck` PASS; izolált `npm run build` PASS (Next.js 16.4.2 Webpack, 32 statikus oldal); `git diff --check` PASS.
- Az aktív Next.js szerverfolyamat ellenőrzését a rendszer megtagadta (`ps` permission denied), ezért typegen és build ideiglenes, külön `.next` kimenetű másolaton futott. DB/pgTAP, hosted RLS/Storage és böngésző nem futott; hosted adatot nem érintettem.
- Részletes szerződés-összevetés, előtte/utána viselkedés és nem igazolt régi formátumok: [`HISTORICAL_SNAPSHOT_COMPATIBILITY_F9.70.1.md`](HISTORICAL_SNAPSHOT_COMPATIBILITY_F9.70.1.md).
- **Javasolt Conventional Commit:** `fix(F9.70.1): preserve historical survey snapshots`.

## F9.72.2 — AI fejlesztői útmutatók pontosítása

Státusz: **dokumentáció-only módosítás kész.** Az `AGENTS.md` pontosítja a mérföldkő-hatókört, az implementáció bizonyítékait, a közös `.next` védelem feltételeit és a kockázatalapú böngészőellenőrzést. A `CLAUDE.md` készségválasztási szabálya rugalmasabb, az útmutatók közös részei az `AGENTS.md`-re támaszkodnak.

- Ellenőrizve: csomagparancsok, dokumentumhivatkozások, kritikus biztonsági szabályok és a Next.js által generált blokk hash-e. `git diff --check` PASS.
- Aktív Next.js folyamatlista nem volt lekérdezhető (`sysmond` nem elérhető); build, typegen és alkalmazásteszt nem futott.

Javasolt Conventional Commit: `docs(F9.72.2): harden agent development guidance`.

## F9.72.1 — Dokumentációs kontextus és duplikáció ellenőrzése

Státusz: **célzott docs-konszolidáció kész.** A megerősített ismétléseket rövidítettem az `AGENTS.md`/`CLAUDE.md` között, és pontosítottam, hogy csak az aktuális összefoglaló és a releváns `PROGRESS.md`-rész olvasandó. A kontextusmérést, betöltési bizonyítékokat és korlátokat a [`DOCUMENTATION_CONTEXT_REVIEW_F9.72.1.md`](DOCUMENTATION_CONTEXT_REVIEW_F9.72.1.md) rögzíti; történeti és biztonsági tartalom megmaradt.

Javasolt Conventional Commit: `docs(F9.72.1): reduce duplicated agent guidance`.


## F9.72 — Dokumentációs audit és konszolidáció

Státusz: **dokumentációs-only cleanup; forráskód és adat nem változott.** Az aktív napló F9.63.1–F9.71 részletei megmaradtak; a 217 korábbi teljes bejegyzés az [`archive/PROGRESS_HISTORY.md`](archive/PROGRESS_HISTORY.md)-be került, régi anchorokhoz aktív címsor-indexszel. Az [`README.md`](README.md) adja a dokumentációs útmutatót, a részletes audit és teljes fájlleltár a [`DOCUMENTATION_CLEANUP_F9.72.md`](DOCUMENTATION_CLEANUP_F9.72.md) alatt található.

- Javítva a pilot-, projekt- és átadódokumentumok fotó-EXIF/GPS-állítása, az eltávolított gutter/flashing útvonalak térképe és két F9.59 után törött forráslink. Hosted ingress, régi fotók/retention és F9.70 történeti snapshot-kompatibilitás továbbra is nyitott.
- Nem töröltem vagy vontam össze bizonytalan/egyedi bizonyítékot tartalmazó auditot.
- Futtatott ellenőrzések és mérőszámok: F9.72 auditjelentés.

Javasolt Conventional Commit: `docs(F9.72): consolidate project documentation`.

## Jelenlegi állapot — 2026-10-23

- Az utolsó befejezett mérföldkő az F9.71 URL-architektúra-audit; az alkalmazáskódban nem talált igazolt, hardcode-olt production app-origin hibát.
- Az alkalmazás URL-stratégiája azonos hosthoz relatív; hosted Auth, proxy/CDN, deployment és pilot-ready működés továbbra sincs igazolva.
- A felmérési fotó feltöltés Sharp segítségével újrakódolja a képet, ezért az EXIF/GPS metaadatok eltávolításra kerülnek. Az alkalmazási méretkorlát bizonyított (10 MiB/fájl, 11 MiB/kérés), a hosting ingress korlátja nem.
- Az F9.70.1 igazolta és javította a régi, `semanticType` nélküli felmérési mérések olvasását. A hibás linked section teljes oldalt blokkoló hibáját az F9.73 izolálta; hosted snapshotok és további, nem bizonyított történeti alakok továbbra sem voltak ellenőrizve.
- Pilotblokkolók: hosted környezet, cross-org staging, backup/restore, RPO/RTO, adatvédelmi és retention döntések, valamint szakmai/jogi review. Lásd [pilot readiness](PILOT_READINESS.md).

A legutóbbi mérföldkövek teljes, ellenőrzési részletekkel ellátott bejegyzései alább maradnak. A korábbi teljes bejegyzések változatlan tartalommal az [archívumban](archive/PROGRESS_HISTORY.md); a fejezetcímek megmaradtak, hogy a meglévő hivatkozások továbbra is oda navigáljanak.

## F9.71 — URL-architektúra és production-readiness audit

Státusz: **audit complete; igazolt production URL-hiba nincs.** 39 loopback URL-találat helyi tesztet, segédscriptet vagy Supabase Auth-konfigurációt szolgál; két `192.168.1.31` hivatkozás a meglévő LAN-fejlesztői beállítás. 177 alkalmazáskódbeli URL-/navigációs kifejezést vizsgáltam: a belső útvonalak relatívak, Supabase-origin külön konfigurált, alkalmazás-`APP_URL` jelenleg nem szükséges. A hostolt Auth és proxy/CDN konfiguráció nem volt hozzáférhető, ezért ellenőrizetlen.

- **Módosítás:** csak ez az előrehaladási bejegyzés és az új [`URL_ARCHITECTURE_AUDIT_F9.71.md`](URL_ARCHITECTURE_AUDIT_F9.71.md); kód, route, környezeti fájl, külső beállítás és adat nem változott.
- **Ellenőrzés:** célzott Auth/API tesztek **3 fájl / 19 PASS**; `git diff --check` PASS. Teljes regresszió, lint, typecheck, build, DB és browser nem futott; csak dokumentáció változott.
- **Javasolt Conventional Commit:** `docs: F9.71 record URL architecture audit`

## F9.70 — Execution Data Layer Type Safety & Mapping Optimization

Státusz: **a `LooseClient`/`any` határ megszűnt; a lekérdezések a generált Supabase sémából tipizáltak, a tervkapcsolatok egyszeri indexeléssel készülnek.** Az overview/workspace queryk, oszlopok, explicit organization szűrők, RLS-t használó SSR kliens, signed URL-ek, sorrendek és limitek nem változtak. Az export route addigi típuscastjai eltűntek; a subtotal alkalmazási típusa a DB-sémában tárolt számot tükrözi.

- **Paritás és mock mérés:** a régi implementáción előre futtatott, majd az új kódon változatlanul futtatott tesztek a workspace/overview/survey export-kimenetet, üres állapotot, nullable/hiányzó kapcsolásokat és cross-org/unrelated sorokat fednek. Ugyanazon 21-futásos mock medián 1/50/200 tervnél **0.020/0.392/4.349 ms → 0.019/0.154/0.737 ms**; mindegyiknél 7 DB-kérés maradt. Ez nem production vagy hálózati gyorsulási bizonyíték.
- **Ellenőrzések:** 5 célzott teszt PASS; izolált `npm run lint`, `npm run typecheck`, teljes `npm test` **160 fájl / 938 PASS / 8 fájl és 19 teszt SKIP**, `npm run build` (Next.js 16.4.2 Webpack, 32 statikus oldal) PASS. A typegen/build a 3000-es fejlesztői szerver fő `.next` könyvtárát nem érintő másolaton futott. `git diff --check` a végső diff áttekintés után.
- **Korlát:** élő Supabase/pgTAP, hosted RLS/Storage és böngészős ellenőrzés nem futott; memóriahasználatot nem mértem. A survey JSON snapshot szakaszai meglévő domain sémával validálódnak; hibás vagy a sémától eltérő történeti JSON esetén az új, szűk típusos határ hibát adhat a korábbi loose cast továbbadásával szemben. DB/migration/RLS/auth/RPC/írási út és történeti adat nem változott.
- Részletes bizonyíték és mérési korlátok: [`EXECUTION_DATA_REFACTOR_F9.70.md`](EXECUTION_DATA_REFACTOR_F9.70.md).
- **Javasolt Conventional Commit:** `refactor: F9.70 type execution data mappings`

## F9.69 — Biztonságos fotófeltöltési határ és erőforrás-védelem

Státusz: **az alkalmazási multipart parser előtti korlát megvalósítva; a hosted ingress-korlát és teljes DoS-védelem nem igazolt.** A Route Handler auth után 11 MiB teljes body-t olvas streamből, 10 MiB kép + 1 MiB multipart/mező többletkerettel; hiányzó vagy kisebbre mondott `Content-Length` mellett is számlál. A túllépés parser előtt 413, írási mellékhatás nélkül. A meglévő 10 MiB/kép szerződés, MIME/magic-byte, Sharp/EXIF, auth/org, reservation/attach/retry és privát Storage út változatlan.

- **Ellenőrzések:** fókuszteszt 1 fájl / 12 PASS; lint PASS; teljes Vitest 159 fájl PASS / 8 SKIP, 933 PASS / 19 SKIP; izolált `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS. HTTP/hosted ingress, DB/pgTAP és browser teszt nem futott.
- **Nyitott rollout-kapu:** repositoryban nincs igazolt deployment platform vagy pre-parser ingress-limit. Hoszt tulajdonosa erősítse meg legalább 11 MiB teljes kérés kompatibilitását; a handler korlátja nem ingress vagy konkurencia-limit.
- Részletes adatút, kockázat, host-kompatibilitási döntés, tesztmátrix és korlátozások: [`PHOTO_UPLOAD_SECURITY_F9.69.md`](PHOTO_UPLOAD_SECURITY_F9.69.md).
- **Javasolt Conventional Commit:** `fix: F9.69 bound survey photo request bodies`

## F9.68 — Mérnöki architektúra-, kódminőség- és működési audit

Státusz: **AUDIT COMPLETE — nincs igazolt P0/P1 kódhiba; 4 P2 finding és 2 hosted/operációs rollout-kapu dokumentálva.** Audit-only: alkalmazáskód, konfiguráció, adatbázis és build cache nem változott. A munkafa induláskor tiszta volt; a lokális `main` egy commit-tal előrébb állt az `origin/main`-nél, és a 3000-es dev szervert érintetlenül hagytam.

- **Fő findings:** munkanapló adatlekérő loose `any`/cast határa és ismételt sor-keresése; survey photo multipart fájlméret-ellenőrzése csak `request.formData()` után; a fotó EXIF/GPS-stripping tényleges működése eltér a pilot dokumentációjától; `.next` 6.2 GB, ebből 2.9 GB Next 16.4.0-s verzióspecifikus Turbopack cache és 1.8 GB külön Webpack build cache. Nem állítok production runtime lassulást a cache-méretből.
- **Megőrzendő:** feature/domain/infrastructure határok, auth/org + RLS/RPC ellenőrzés, immutable revision/snapshot, expected-version és idempotens retry; a vizsgált új survey ID és retry szerződés megfelelő. Hosted cross-org/Storage, backup-restore, RPO/RTO, monitoring és mobil terepi ellenőrzés nincs bizonyítva, ezért széles SaaS rollout előtt kapu marad.
- **Ellenőrzések:** `npm test` **159 fájl PASS / 8 SKIP; 924 teszt PASS / 19 SKIP; 4,13 s**. `npm run lint` **PASS**, ESLint: no issues. A typecheck/build nem futott, mert a 3000-es aktív dev szerver mellett `next typegen` és build ugyanazt a `.next` területet érintheti. DB/pgTAP és browser/hosted teszt nem futott.
- Részletes bizonyíték, lefedettségi korlát, maturity matrix, cache-bontás és roadmap: [`ENGINEERING_EXCELLENCE_AUDIT_F9.68.md`](ENGINEERING_EXCELLENCE_AUDIT_F9.68.md). A következő javasolt implementációs milestone: F9.69 — a fotó API hosting/ingress request-body korlátjának ellenőrzése, és ha hiányzik, a legkisebb platformszintű védelem.
- **Javasolt Conventional Commit:** `docs: F9.68 record engineering excellence audit`

## F9.67 — Safe Snapshot JSON Helper Deduplication

Státusz: **a három viselkedésazonos kulcsrendező helper egy közös TypeScript függvénybe került; snapshot/revízió/persistence contract változatlan.** A két saved-covering reader összehasonlításra használja, a trapezoidal panel pedig dirty state és edit-signature meghatározásra. A helper JSON.stringify replacere rekurzívan `localeCompare` szerint rendezi az objektumkulcsokat, a tömbök sorrendjét megtartja; sem decode, sem adatírás nem történik.

- **TDD / parity:** a két régi loader tesztben előbb rögzítettem a nested, eltérő kulcssorrendű historikus output elfogadását és az input változatlanságát; ezek a régi kóddal 7/7 PASS voltak. Ezután a közös `stableJsonStringify` négy tesztje rögzíti az objektum/tömb sorrendet, null/undefined, IEEE-754 JSON-kimenetet, fagyasztott bemenetet, BigInt `TypeError`-t és a ciklikus input korábbi `RangeError`-át.
- **Érintett kód/teszt:** `src/features/roof-models/stable-json.ts`; a két covering data reader és a `gable-trapezoidal-covering-panel.tsx`; a dedikált helper, két reader és meglévő UX/persistence tesztek.
- **Ellenőrzés:** fókuszteszt 6 fájl / 22 PASS; `npm run lint`, `npm run typecheck`, teljes `npm test` (159 fájl / 924 PASS, 8 fájl és 19 teszt SKIP), `npm run build` (Next.js 16.4.2 webpack, 32 statikus oldal) PASS. `git diff --check` végleges dokumentáció után.
- **Adatintegritás:** nincs schema/migration, revision ID, képlet, snapshot formátum, mentett adat vagy Supabase-művelet változás. Böngésző- és DB-teszt nem futott; csak strukturális összehasonlítás és UI dirty-state kód érintett.
- **Javasolt Conventional Commit:** `refactor: F9.67 share stable snapshot JSON serialization`

## F9.66 — Safe Dependency Cleanup & Dead-Code Verification

Státusz: **az igazoltan nem használt `liquid-glass-react@1.1.1` eltávolítva; további törlés nincs bizonyítva.** A kód/config/dinamikus belépők, tesztek, SSR/runtime oldalhatások, npm dependency graph és F9.39.1 kompatibilitási előzmény ellenőrizve. A saját CSS-tokenes Liquid Glass rendszer változatlan. Egy három helyen ismétlődő snapshot-JSON helper külön, kis hasznú deduplikációs jelölt; a legacy `/kalkulatorok/epitesi` redirect és minden migration/route megmaradt.

- **Footprint:** runtime dependency 12→11; lock package rekord 350→349; telepített csomag 208 KiB volt; npm diff csak a package deklarációt és az egyetlen 14 soros lockbejegyzést távolította el.
- **Ellenőrzés:** célzott Liquid Glass teszt 2 fájl / 8 PASS; lint, typecheck, teljes Vitest (158 fájl / 918 PASS, 8 fájl és 19 teszt SKIP), Next.js 16.4.2 webpack build PASS. `git diff --check` a végleges dokumentumok után újrafuttatva.
- **Korlát:** böngésző smoke és DB teszt nem indokolt/nem futott, DB és üzleti adat nem változott. Knip nincs telepítve; teljes exported-symbol dead-code gráf ezért nem igazolt. Részletes jelöltek és evidence: [`CODE_CLEANUP_F9.66.md`](CODE_CLEANUP_F9.66.md).
- **Javasolt Conventional Commit:** `chore: F9.66 remove unused liquid-glass dependency`

## F9.65 — Anyagkatalógus- és kalkulátor-adatbetöltés optimalizálása

Státusz: **megvalósítva és lokálisan ellenőrizve**. A kalkulátor hub dedikált profilreadje már nem tölti le az árverziókat és az Anyagkezelő számára szükséges mezőket. A takeoff két kategóriánkénti, legfeljebb 200 termékes rendezett olvasása megmarad, a gyártó/kategória/variáns/ár kapcsolati betöltő viszont csak egyszer fut. A Material Manager általános loaderje, ár-historyje, auth/RLS, snapshotok és számítási eredmények nem változtak.

- **Azonos fixture, deterministic Supabase mock:** kalkulátor 6→4 kérés, 7→4 visszaadott sor, **2458→580 B** tömörítetlen JSON-válasz (**−76%**); üres katalógus 3→1 kérés. A kalkulátor profilok teljes kimenete megegyezik a régi teljes katalógus + domain profilépítő eredményével. Az új read csak a szükséges termék/gyártó/kategória/variáns mezőket választja ki, árat nem.
- **Takeoff mock összevetés:** két nem üres kategórián 12→7 kérés (**−42%**), 13→10 visszaadott sor, **3052→2534 B** mock JSON-válasz (**−17%**); üres kategóriákon 6→2 kérés. A tetőfedés/lemez sorrend, piece variáns, műszaki adat, provenance, teljes ár-historyből származó effective latest price és `latestPrice` szabály megmaradt. A két külön termékkérés szándékos, hogy mindkét kategória saját 200-as limitje és rendezése változatlan legyen.
- **Adatvédelem/konzisztencia:** minden új query explicit `organization_id` szűrésű és a meglévő SSR Supabase klienst/RLS-t használja; nincs privilegizált kliens, cache vagy árazási logika duplikálása. Külön szervezet és nem kért kategória fixture sora nem kerül az eredménybe. A történeti snapshot/írási kód érintetlen.
- **Ellenőrzések:** RED→GREEN regressziós tesztek; célzott 2 fájl / 5 teszt PASS; `npm run lint` PASS; `npm run typecheck` PASS; teljes `npm test` **158 fájl, 918 PASS, 19 skip**; izolált Next 16.4.2 webpack `npm run build` PASS (32 statikus oldal); `git diff --check` PASS. Böngészős smoke és élő DB/RLS timing nem futott: a kliensoldali viselkedés változatlan, a mock mérések nem mutatnak valódi hálózati vagy adatbázis-időt.
- **Mérési korlát:** a bájtok a tesztfixture kiválasztott JSON sorainak tömörítetlen méretei; nem tartalmaznak HTTP overheadet, compressiont vagy Postgres időt. A kalkulátor régi/új rekord- és byte-összehasonlítása ugyanazon, kisméretű DEMO-jellegű fixture-en történt. Production hatás nem állítható.
- **Javasolt következő mérföldkő:** ha valós felhasználói méret mellett továbbra is lassú a katalógus, külön, RLS alatti request/timing mérés reprezentatív több gyártós/árverziós lokális fixture-rel; indexet vagy cache-t csak ilyen bizonyíték után mérlegeljünk.
- **Javasolt Conventional Commit:** `perf: F9.65 narrow calculator and takeoff catalog reads`

## F9.64 — Backend-, adatbázis- és renderelési teljesítményaudit

Státusz: **AUDIT COMPLETE — PASS WITH FINDINGS**. Kód- és migrációváltozás nélkül, külön production builden és helyi authenticated DEMO sessionben készült. Három read-only RLS `EXPLAIN (ANALYZE, BUFFERS)` terv lokálisan lefutott; a minimális adatmennyiség nem alkalmas production következtetésre. Két material/takeoff többletolvasási minta forrásból igazolt, runtime hatásuk nyitott. A böngészőben vizsgált dashboard, felmérés, kalkulátor és anyagkeresés működött; mért renderköltség nem igazolt szűk keresztmetszetet. CSS/GPU, mobil, quote/worklog runtime, memory-trend és szerveroldali route query-count nincs teljesen ellenőrizve.

- **Mérés:** dashboard 49 request, 293 670 B átvitel; DCL 179 ms, Load 330 ms. Survey input labor-INP 72 ms, CLS 0; kalkulátor eredmény és SVG helyesen frissült. Izolált build CSS: 553 474 B raw / 76 855 B gzip. Ezek egyetlen lokális DEMO session mérési adatai, nem production becslések.
- **Ajánlás:** külön F9.65 read-model optimalizálás a kalkulátor profil-only és takeoff kategória betöltéshez, előtte/utána azonos RLS alatt mért query/byte/idő adatokkal. Részlet/takeoff snapshot fallback optimalizálás külön követendő. Auth/cache, index és CSS módosításra nincs bizonyíték.
- **Ellenőrzés:** izolált `npm run build` PASS; 3 lokális read-only RLS query plan; célzott böngészős workflow-k. Teszt/lint/typecheck nem futott, adatbázis- vagy termékkód nem módosult. Részletes evidence, finding-kockázatok, tesztterv és mérési korlátok: [`docs/PERFORMANCE_AUDIT_F9.64.md`](PERFORMANCE_AUDIT_F9.64.md).
- **Skills/eszközök:** `ponytail`, `supabase`, `supabase-postgres-best-practices`, `build-web-apps:react-best-practices`, `build-web-apps:frontend-testing-debugging`; helyi Postgres read-only query plan, külön production build, Brave DevTools. Nincs telepítés vagy új plugin.
- **Javasolt Conventional Commit:** `docs: F9.64 record backend and rendering performance audit`

## F9.63.4 — Production kalkulátorbetöltés és lazy-loading megbízhatóság

Státusz: **PASS WITH FINDINGS**. Külön temp munkafán futtatott Next 16.4.2 webpack production build és 3100-as helyi szerver; a meglévő 3000-es dev szerver és annak `.next` könyvtára érintetlen maradt. Bejelentkezett helyi DEMO Brave sessionben a `/kalkulatorok`, kategóriachunkok, rajz betöltése, 375×812 deep link és 3G gyors kategóriaváltás működött. Egy concrete chunk DevTools blokkolása a kiválasztást megtartó, újrapróbálható hibaállapotot adott; a tiltás feloldása után 200-as válasszal helyreállt. Megerősített regressziót nem találtam.

- **Cold cache / production Network:** 1440px route load: 16 JS / 51 kérés; **233 906 B (~234 kB) JS** / **623 260 B** összes átvitel; DCL 179 ms, Load 297 ms. Stair: két chunk, 7 491 B átvitel; concrete definíció: 4 951 B; első rajz a teljesen cold 375×812 cölöp deep linken két chunk, 21 335 B. Ezek átviteli adatok, nem parse/execute idő és nem F9.63.2 manifest-gzip közvetlen összevetés.
- **3G + retry:** 5,75 s DCL / 17,51 s Load / 24,86 s hálózati Finish. Stair→concrete váltás alatt mindkét chunk pending volt; a kiválasztott concrete kalkulátor maradt aktív. Visszaváltáskor nem történt új chunkkérés. Blokkolt `7708…js`: UI `alert` + Retry, a szabály levétele után 200 OK és betöltött form; Console-ban csak az irányított blokkolás warningja volt.
- **Ellenőrzés:** izolált `npm run build` PASS; `npm test -- src/features/calculators/construction-calculator-loading.test.ts` PASS (1 fájl / 3 teszt); `git diff --check` a dokumentáció véglegesítése után. Teljes suite/lint/typecheck, CPU/Performance trace, INP/CLS, light theme és exact pending-request unmount race nem ellenőrzött. Részletes mátrix, forrás-review, korlátok és F9.63.2 baseline: [`docs/PERFORMANCE_VALIDATION_F9.63.4.md`](PERFORMANCE_VALIDATION_F9.63.4.md).
- **Döntés:** F9.63 kódszétválasztás funkcionális és hibatűrő elfogadása lezárható **PASS WITH FINDINGS** státusszal; runtime sebességelőny nem állítható. Következő ajánlott lépés: **F9.64 — RLS/query-plan és CSS/GPU audit, valós felhasználói mérés**; nem indítottam el.
- **Javasolt Conventional Commit:** `test: F9.63.4 validate production calculator loading`

## F9.63.3 — Kalkulátor runtime és betöltési validáció

Státusz: **PASS WITH FINDINGS**. A három kalkulátorkategóriát és a `concrete.pile` deep linket valós, hitelesített helyi DEMO-munkamenetben, Brave-ben ellenőriztem. Reprezentatív tető-, lépcső- és betoneredmények, rajzbetöltés, kategória- és history-navigáció, 375/768/1440 px-es reszponzív nézet és billentyűzetes kategóriaváltás működött; megerősített regressziót nem találtam.

- **Network (meleg cache, Next 16.4.2 dev/Turbopack, throttling nélkül):** `/kalkulatorok` 45 kérés / 24 JS, 25 131 B átvitel / 6 912 370 B erőforrás; a tető modul az induló naplóban jelent meg. Stair és concrete kiválasztás külön JS chunkkérést adott hozzá; ismételt stair-választás nem kért új chunkot. Érvényes cölöpbemenet után jelent meg a 309 kB-os fejlesztői rajzchunk. A 304-es válaszok és disk cache miatt ez nem cold vagy production átviteli mérés.
- **Forrás és ellenőrzés:** async ID-őr, kiválasztott kalkulátorhoz kötött betöltés és státusz/hiba/retry UI kódból ellenőrizve. `npm test -- src/features/calculators/construction-calculator-loading.test.ts`: 1 fájl / 3 teszt PASS; Console: 0 üzenet. Teljes teszt/lint/typecheck/build ebben a mérföldkőben nem futott.
- **Nem ellenőrzött:** production runtime/cold cache, lassított hálózatú race, chunkhiba és retry, teljes invalid input mátrix, kalkulátor input módosításának újraszámítása, React Profiler/long task/CLS/INP. Részletes környezet, Network értékek, mátrix, besorolás és követés: [`docs/PERFORMANCE_VALIDATION_F9.63.3.md`](PERFORMANCE_VALIDATION_F9.63.3.md).
- **Javasolt Conventional Commit:** `test: F9.63.3 validate calculator runtime loading`

## F9.63.2 — Kalkulátormotorok kategória szerinti lusta betöltése

Státusz: **megvalósítva és build-artifactokkal, valamint Vitesttel ellenőrizve**; a tényleges böngészős interakciót nem sikerült igazolni. A képletek, eredmények, azonosítók, katalógus, mentési/adatbázis-szerződések nem változtak. Nincs commit; az F9.63.1 és a korábbi munkafa-módosítások megmaradtak.

- **Előtte:** a `construction-suite.tsx` kliensmodul statikusan importálta mind a 31 kalkulátor definícióját/motorját, valamint a lépcső- és betonrajzokat. A kiválasztás szinkron `definitions[item.id]` lookup volt.
- **Utána:** a könnyű katalógus maradt a választó forrása; a tető, lépcső, illetve beton/segéd kategória definíciója külön dinamikus modulként, csak kiválasztáskor töltődik be. Az import eredményét a kijelölt azonosítóhoz kötjük; gyors váltásnál az elavult válasz nem írhatja felül az aktuálisat. A betöltésnek elérhető, újrapróbálható állapota van, amely `clamp(24rem, 58vh, 40rem)` minimális munkaterület-magassággal mérsékli az elrendezés-ugrást. A thumbnail közvetlenül a könnyű modulból érkezik, a lépcső- és betonrajzok csak a számított nézetnél töltődnek.
- **Build-artifact mérés, azonos `npm run build` / `next build --webpack` mód:** a Next client-reference manifest `construction-suite.tsx` bejegyzésének egyedi, statikusan hozzárendelt chunkjait a Node `zlib.gzipSync` mérte. A suite statikus chunkkészlete **359 264 B / 94 023 B gzip → 257 155 B / 78 218 B gzip**, azaz **−28,4% nyers / −16,8% gzip**. A route-specifikus chunk **204 604 / 54 876 → 105 864 / 30 472 B**, **−48,3% / −44,5%**; a hozzá rendelt megosztott chunkok együtt **154 660 / 49 147 → 151 291 / 47 746 B**. Ez manifest szerinti artifactméret, nem böngészőben mért hálózati átvitel, parse/execute idő vagy felhasználói sebesség.
- **Késleltetett chunkok:** tető definíció **5 282 / 1 879 B gzip**; lépcső definíció **24 993 / 6 894 B gzip** két szükséges chunkon; beton/segéd definíció **17 434 / 4 621 B gzip**. A rajzmodul további **76 939 / 20 719 B gzip** (a lépcső/beton rajzhoz közös chunkokkal), és csak a rajz megjelenítésekor kérődik le. A statikus suite chunklistában egyik kategóriadefiníció chunkja sincs benne; a buildelt route-loader ezeket kategóriánként aszinkron chunkként hivatkozza. A katalógus metaadatai továbbra is a kezdeti útvonal részei.
- **Szerződés/regresszió:** a 31 ellenőrzött katalógus-ID mindegyike a saját kategóriadefiníciójához oldódik; az invalid/default ID a korábbi `roof.rafter-cut` alapértelmezést használja. A mező-alapértékek és `advanced` jelölések, anyagállapot ID szerinti megőrzése, rajz- és számítási motorok változatlanok. Új reprezentatív szarufa- és cölöperedmény-paritásteszt. Két korábbi statikus HTML teszt most a mezőmetaadatot és a szerveroldali loading shellt ellenőrzi, mert a definíció csak kliensoldali aszinkron betöltés után áll rendelkezésre.
- **Ellenőrzések:** fókuszált 4 fájl / **115 teszt PASS**; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` **156 fájl PASS / 8 skip, 913 PASS / 19 skip** (a kiinduló 910 PASS-hoz képest 3 új); `npm run build` PASS; `git diff --check` a lezáró ellenőrzésben. A lokális production szerver elindult. Az IAB böngészőben a `/kalkulatorok` csak üres háttérrel és hozzáférési híddal jelent meg, kalkulátor DOM nélkül, ezért mobil/desktop, kategóriaváltás és Network/CPU runtime smoke **nem igazolt**; nem következtetek ennek okára.
- **Skill-ek:** `ponytail`, `build-web-apps:react-best-practices` (dinamikus import/splitting útmutató), `build-web-apps:frontend-testing-debugging` (a böngészőellenőrzés megkísérlése), `test-driven-development`, `verification-before-completion`, továbbá a telepített Next 16.4 lazy-loading útmutató. Külön böngésző-plugin nem volt az aktív eszközleltárban; új eszköz vagy függőség nem került telepítésre.
- **Korlát/következő lépés:** az induló UI a betöltés idejére rövid loading panelt mutat; a tényleges késleltetés és váltási élmény böngészőben még mérendő, a teljes matek/render kompatibilitást pedig nem bizonyítja kizárólag a loader teszt. Javasolt következő mérföldkő: **F9.63.3 — böngészős betöltési és navigációs mérés**.
- **Javasolt Conventional Commit:** `perf: F9.63.2 lazy-load calculator categories`

## F9.63.1 — Backend N+1 lekérdezések megszüntetése

Státusz: **implementálva és lokálisan ellenőrizve**. A két mentett fedéslista kalkulációazonosítók szerint batchben tölti a revíziókat, 1000 soros oldalazással, majd kalkulációnként a legfrissebb 100-at validálja és adja vissza. A felmérés nyeregtető-ellenőrzése három önállóan szervezeti hatókörű, legfeljebb 100 ID-s batchben olvassa a modellrevíziót, kalkulációs revíziót és dependency sort; az exact model–revision–calculation párosítás és az eredmény újraszámítása megmaradt. A dependency-kérdés explicit `organization_id` szűrést is kapott.

- **Lekérdezésszám (forráskódból számolt előtte, mockolt Supabase utána; nem DB-időmérés):** két számításnál a revíziókérés **2 → 1** (teljes lista a számításlistával együtt **3 → 2**); két jelölt modellnél az ellenőrzési hármas **6 → 3**. 1001 revíziónál a fedéslista két 1000-es oldalt kér le, és továbbra is pontosan a legfrissebb 100-at adja vissza. A lokális `max_rows = 1000` API-beállításhoz igazodik az oldalhatár.
- **Szerződés és biztonság:** a szervezet- és verziószűrés, validációs függvények, current revision ID kiválasztása, sorrend, 100/revízió limit és hiányzó/invalid/mismatch kizárás megmaradt. Nincs séma-, jogosultsági policy-, adat- vagy képletváltozás; snapshothoz nem ír.
- **Ellenőrzések:** célzott 6 fájl / 23 teszt PASS; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (**155 fájl / 910 PASS / 19 skip**, 8 további fájl skip); `npm run build` PASS; `git diff --check` PASS.
- **Skill-ek:** `ponytail` a minimális megvalósításhoz, `supabase` / `supabase-postgres-best-practices` a batch és org/RLS határokhoz, `test-driven-development` a regressziós tesztek piros-zöld ciklusához, `verification-before-completion` a lezáró ellenőrzéshez. Az aktív leltárt a `docs/AI_TOOLING.md` alapján ellenőriztem; további plugin vagy külső adatbázis-kapcsolat nem kellett.
- **Korlát:** nem futott valódi DB/RLS-integráció vagy production query-plan/időmérés; a query-count állításokat teszt-double-ok igazolják, nem valós Supabase-forgalom. Javasolt következő mérföldkő: **F9.63.2 calculator bundle splitting**.
- **Javasolt Conventional Commit:** `perf: F9.63.1 batch roof revision reads`

## Korábbi mérföldkövek — teljes bejegyzések az archívumban

## F9.59 — Az F9.58 audit négy megerősített hibájának javítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-000).

## F9.57 — Mennyiség-formázás és asztali oldalbelsők a navigációs héjhoz

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-001).

## F9.56 — Alkalmazás-héj: navigáció, PWA-telepíthetőség és designrendszer-egységesítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-002).

## F9.55 — UI/UX újraértékelés és célzott finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-003).

## F9.54 — Felmérés 2.0 záró felületi ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-004).

## F9.53 — Felmérés 2.0 felületfinomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-005).

## F9.52 — Felmérés 2.0: meglévő tetőrészletek + mérési eredet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-006).

## F9.50.5.1 — Univerzális kereshető terméválasztó

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-007).

## F9.50.5 — Anyagkezelő ↔ tető-kalkulátor integráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-008).

## F9.50.4 — Faanyag-érvényesség és látható korlátok (F9.50.3 Codex-visszajelzés után)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-009).

## F9.50.3 — Kalkulátor-integritás javítások (F9.50.2 Codex FAIL után)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-010).

## F9.50.2 — Intelligens kalkulátor-bemenet (termék vagy kézi specifikáció)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-011).

## F9.50 — Nyereg- és félnyeregtető anyag-kimutatás lezárása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-012).

## F9.49 — Általános tetőfedés-kiosztás minden tetőformára

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-013).

## F9.48 — Manzárdtető a közös tetőgeometria-motorban

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-014).

## F9.47 — Tetőkalkulátorok feladat-alapú átalakítása (zhitov-elv)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-015).

## F9.46.1 — „Bádogos elemek hozzáadása” eltávolítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-016).

## F9.46 — Kontyolt/sátor/félkonty/L/T tetők egységes felmérés-felülete

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-017).

## F9.45.4 — Egységes felmérés-munkaterület és UX-finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-018).

## F9.45.3 — Felmérés-felület egyszerűsítése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-019).

## F9.45.2 — Láthatatlan, böngészőlokális felmérés-piszkozat (QA-javítva)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-020).

## F9.45.1 — Félnyeregtető: gyors mérés és QA-javítások

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-021).

## F9.44.6 — Felmérés-felület egységesítése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-022).

## F9.44.5 — Részletes nyeregtetőmérés és egyszerűbb felmérés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-023).

## F9.44.4 — Mérési eredet és duplikátum-felismerés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-024).

## F9.44.3 — Moduláris bádogos munkaelemek egy felmérésben

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-025).

## F9.44.2 — Gyors mérés → ellenőrzött forrás → anyaglista → ajánlat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-026).

## F9.44.1 — Moduláris felmérés: gyors tetőmérés (nyeregtető) — 1. fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-027).

## F9.43.2 — Termékoldal, műszaki rajz és felmérési mentősáv finomítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-028).

## F9.43.1 — Egységes árszerkesztő és Liquid Glass finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-029).

## F9.43 — Beszállítói áropciók és központosított munkadíj-szerkesztés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-030).

## F9.42.16 — Migráció-reprodukálhatóság és típusbiztonság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-031).

## F9.42.15 — Lemezprofil → anyagkimutatás → anyaglista → ajánlat-piszkozat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-032).

## F9.42.14 — Önálló lemezprofil → anyagkimutatás munkafolyamat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-033).

## F9.42.13 — Régi Project UI kivezetése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-034).

## F9.42.11 — Ereszcsatorna/szegély kalkulátorok és elavult fixture-ök kivezetése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-035).

## F9.42.10 — Helyi DEMO takarítás, felmérési ereszcsatorna/szegély kivezetése, minimális DEMO adatkészlet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-036).

## F9.42.8 — Többtetőformás munkafolyamat böngészős ellenőrzése és tesztstabilizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-037).

## F9.42 — Felmérés → anyaglista → ajánlatpiszkozat → munkanapló

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-038).

## F9.41.1 — Célzott Liquid Glass finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-039).

## F9.41 — Liquid Glass rendszer-egységesítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-040).

## F9.40.7 — Mobil UI/UX optimalizálás (U10 lezárva)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-041).

## F9.40.6 — Felmérés-szerkesztő elrendezés finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-042).

## F9.40.5 — UI/UX audit lezárás és munkafolyamat-ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-043).

## F9.40.4 — Ajánlat-szerkesztő UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-044).

## F9.40.3 — Globális tipográfia és akadálymentesség

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-045).

## F9.40.2 — Felmérés-szerkesztő UX véglegesítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-046).

## F9.40.1 — Felmérés-szerkesztő UX (mentés, mérőmezők, rajz)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-047).

## F9.39.1 — Elrendezési ritmus, Liquid Glass konszolidáció, horgonyzott beállításpanel

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-048).

## F9.39 — Precision Liquid Glass UI/UX modernizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-049).

## 2026-10-18 — Fejlécikon és favicon csere

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-050).

## F9.38.6 — Zhitov-referenciaszellemű, saját 2.5D kalkulátorikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-051).

## F9.38.5 — Geometriahű kalkulátorikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-052).

## F9.38.4 — Prémium minimalista műszaki ikonfinomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-053).

## F9.38.3 — Profi kalkulátorválasztó-ikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-054).

## F9.38.2 — Reszponzív kalkulátorikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-055).

## F9.37.4 — Claude Code fejlesztői projektátadás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-056).

## F9.38 — Lépcső- és betonozási kalkulátorok eredmény-lefedettsége

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-057).

## F9.38.1 — Bemenetek egyszerűsítése és műszaki rajzok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-058).

## F9.37.3 — Háttér finomítása és Safari React script-hiba javítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-059).

## F9.37.2 — Premium ambient dot-grid globális háttér

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-060).

## F9.37 — Premium Liquid Glass globális háttér

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-061).

## F9.31 — legacy kalkulátorfüggőségek és biztonságos mentésjavítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-062).

## F9.30 — Survey geometry különálló kalkulátoroktól

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-063).

## F9.29 — Architecture Audit & Workflow Rationalization

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-064).

## F9.27.2 — Anyaglista szerkesztő UX-stabilizálása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-065).

## F9.27 — Felmérésből szerkeszthető anyaglista

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-066).

## F9.27.1 — Felmérés-anyaglista provenance visszaállítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-067).

## F9.27 — ajánlati termékpanel és új tétel elhelyezése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-068).

## F9.26 — Regression repair és workflow-stabilizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-069).

## F9.26 — Kategóriás ajánlati termékválasztó

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-070).

## F9.25 — Egységes Liquid Glass felületszín

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-071).

## F9.25 — Kalkulátor-konszolidáció és napi workflow UX-audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-072).

## F9.24 — Tetőkalkulátorok előtérben és árva fájlok takarítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-073).

## F9.24.1 — Független építési kalkulátorcsomag

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-074).

## F9.23.1 — Árajánlat-szerkesztő UX és katalóguskapcsolat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-075).

## F9.22 — termék-UX és Anyagkezelő

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-076).

## F9.22.1 — Globális Vanta.NET teljesítmény és Liquid Glass alapfedettség

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-077).

## F9.23 — Anyagkezelő navigáció és kategóriás termékválasztó

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-078).

## F9.22.2 — Világos témájú Liquid Glass világosítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-079).

## F9.18 — iOS hibajavítások és mobil UX-megerősítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-080).

## F9.18.1 — Mérési UX és globális információhierarchia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-081).

## F9.18.3 — Globális oldalcímek és tetőelőnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-082).

## F9.18.2 — iOS rajzstabilitás és interakció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-083).

## F9.17 — Globális Liquid Glass interakció és visszajelzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-084).

## F9.16 — Mobile Acceptance & Closed Beta Readiness

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-085).

## F9.15.3 — Unified Liquid Glass Project Workspace

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-086).

## F9.15.1 — Project UX & Mobile Navigation Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-087).

## F9.15.0 — Settings UX, Mobile Header & Brand Identity

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-088).

## F9.7.6.6.3.2d — quotation pénzügyi konzisztencia és PDF hardening

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-089).

## F9.7.6.6.3.2d.1 — standalone PDF HTTP security acceptance

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-090).

## F9.7.6.5.2 — standalone számítás projektpéldánya (frontend)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-091).

## F9.7.6.5.1 — standalone számítás projektkapcsolása (backend)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-092).

## F9.7.6.4 — standalone calculator frontend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-093).

## F9.7.6.3 — standalone calculation persistence

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-094).

## F9.7.6.2 — standalone ownership és globális tetőgeometria

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-095).

## F9.7.6.1 — globális navigáció és standalone alapozás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-096).

## F8.1 — ajánlati piszkozatok (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-097).

## F8.2 — professzionális PDF-ajánlat (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-098).

## F8.3.1 — ajánlatkezelés és véglegesítés (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-099).

## F8.3.2 — ajánlati életciklus és státusztörténet (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-100).

## Katalógushoz kötött, verziózott lemezkiosztás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-101).

## F7.3.2 korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-102).

## Tetőlemez-kiosztás és ideiglenes SVG-előnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-103).

## F7.3.1 ismert határok és F7.3.2

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-104).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-105).

## F7.2 elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-106).

## F7.2 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-107).

## F7.2.3 mobil UX és SVG stabilizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-108).

## F7.2.4 touch pan finomhangolás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-109).

## F7.2 nyitott korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-110).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-111).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-112).

## F7.1 elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-113).

## F7.1 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-114).

## F7.1 nyitott korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-115).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-116).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-117).

## F6.1 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-118).

## F6 elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-119).

## F6 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-120).

## F6 ismert korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-121).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-122).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-123).

## Elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-124).

## Szándékosan nincs benne

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-125).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-126).

## Ismert hiányok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-127).

## F5 ellenőrzés állapota

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-128).

## F9.5 — termékérettségi audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-129).

## F9.5.1 — pilot readiness és üzembiztonság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-130).

## F9.5.2 — szakmai terepi pilot előkészítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-131).

## F9.6.1 — ereszcsatorna-anyagbecslés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-132).

## F9.6.1.1 — ereszcsatorna-kalkulátor alkalmazásintegráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-133).

## F9.6.1.1.1 — integráció lezárása és konkurens revízióbiztonság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-134).

## F9.6.1.2 — anyagkatalógus-kapcsolat, draft átadás és technikai séma

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-135).

## F9.6.1.2.1 — végső integrációs hardening

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-136).

## F9.6.2 — Bádogos szegélyek kalkulátora — COMPLETE (LOCAL)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-137).

## F9.6.2.3 — anyagkatalógus, atomi draft-átadás és műszaki SVG

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-138).

## F9.6.3.0 — lemezprofilok és hajtások: kutatás és domain-terv

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-139).

## F9.6.3.1 — lemezprofil-geometria és hajlítási domainmotor

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-140).

## F9.6.3.2 — interaktív lemezprofil-szerkesztő

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-141).

## F9.6.3.3 — lemezprofil-mentés és immutable revíziók

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-142).

## F9.6.3.4.1 — profilanyag-mennyiség

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-143).

## F9.6.3.4.2 — profilanyag átadása új draftba

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-144).

## F9.6.3 — végső helyi elfogadás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-145).

## F9.7.0 — Product UX & Workflow Audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-146).

## F9.7.1 — projekt-navigáció és összecsukható kivitelezés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-147).

## F9.7.1.1 — magyar szakmai UX és valósághűségi audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-148).

## F9.7.2 — Egységes projektfolyamat-áttekintő

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-149).

## F9.7.3 — kalkulátor UX-konzisztencia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-150).

## F9.7.3.1 — végső kalkulátor UX-konzisztencia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-151).

## F9.7.4.1 — iPad runtime és UX korrekciók

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-152).

## F9.7.5 — végső UX-finomságok és interakciós megbízhatóság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-153).

## F9.7.5.1 — maradék UX-megbízhatósági javítások

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-154).

## F9.7.5.2 — ajánlatpiszkozat helyreállítása navigáció után

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-155).

## F9.7.6.6.1a — backend-validációs kör

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-156).

## F9.7.6.6.1b — final standalone quotation backend acceptance

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-157).

## F9.7.6.6.2 — standalone quotation frontend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-158).

## F9.7.6.6.3.1 — standalone véglegesítés és PDF architektúra

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-159).

## F9.7.6.6.3.2a — quotation document data & issuance foundation

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-160).

## F9.7.6.6.3.2b — pénzügyi contract, adóalap és kiállítási readiness

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-161).

## F9.7.6.6.3.2c — authenticated standalone draft PDF preview

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-162).

## F9.7.7.1 — trapézlemez-fedés mennyiségi előnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-163).

## F9.7.7.2a — trapézlemez-fedés mentési backend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-164).

## F9.7.7.2a.1 — secure persistence completion

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-165).

## F9.7.7.2b — trapézlemez-fedés mentés és revízió UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-166).

## F9.7.7.3a — projekt fedésből takeoff piszkozat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-167).

## F9.7.7.3b — trapézlemez-fedés anyagkimutatás UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-168).

## F9.7.7.4a — cserepeslemez-fedés motor és előnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-169).

## F9.7.7.4b.1 — cserepeslemez perzisztencia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-170).

## F9.7.7.4b.2 — cserepeslemez mentési és revíziós UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-171).

## F9.7.7.4c.1 — cserepeslemez → anyagkimutatás backend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-172).

## F9.7.7.4c.2 — cserepeslemez takeoff egyszerűsített UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-173).

## F9.7.8.1 — helyszíni felmérés MVP

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-174).

## F9.7.8.2 — felmérési fotók és kalkulátor-átadás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-175).

## F9.7.8.3 — helyszíni felmérés mobil használhatósága

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-176).

## F9.7.9 — egységes helyszíni felmérési munkafelület

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-177).

## F9.7.10 — valós helyszíni munkafolyamat és mobil UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-178).

## F9.8 — anyagkimutatás és ajánlat-előkészítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-179).

## F9.8.1 — beszerzési és műhely-előkészítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-180).

## F9.9 — okos tetőgeometria és kapcsolt munkafolyamatok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-181).

## F9.10 — többtetős geometria és vizuális tetőválasztás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-182).

## F9.10.1 — navigáció és tetőválasztás UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-183).

## F9.10.2 — professzionális tetőválasztó és teljes integráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-184).

## F9.11 — professzionális tetőmérés és intelligens UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-185).

## F9.12 — product integration és workflow hardening

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-186).

## F9.12.1 — dashboard kártyarács javítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-187).

## F9.13 — valós munkafolyamatok célzott keményítése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-188).

## F9.13.1 — napi workflow acceptance lezárása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-189).

## F9.14 — független mérnöki számítási audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-190).

## F9.14.1 — kompakt, interaktív tetőmérési UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-191).

## F9.14.2 — globális Liquid Glass UX és egységes munkaterület

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-192).

## F9.14.3 — Liquid Glass vizuális audit és UX finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-193).

## F9.14.4 — fluid Liquid Glass UI átalakítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-194).

## F9.14.5 — Global Fluid Liquid Glass & Application Recovery

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-195).

## F9.14.6 — Product UI Architecture & Visual Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-196).

## F9.14.7 — Final Interface & Workflow Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-197).

## F9.14.8 — Project & Calculator UI Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-198).

## F9.14.9 — Settings, Account Management & Mobile Quick Scaling

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-199).

## F9.19 — Workflow egyszerűsítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-200).

## F9.19 folytatás — Liquid Glass és régi gyűjtőoldalak

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-201).

## F9.20 — Globális Liquid Glass és munkanapló

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-202).

## F9.20.1 — Felmérési munkafelület és térközök

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-203).

## F9.20.2 — Felmérés folytatása, mentett számítások és önálló ajánlat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-204).

## F9.20.2 — Globális Vanta.NET háttér

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-205).

## F9.21 — Globális Liquid Glass React-integráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-206).

## F9.24.2 — Lépcsők professzionális rajzai és vizuális navigáció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-207).

## F9.24.3 — Pihenős lépcsők és betonlépcső szűkített geometriája

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-208).

## F9.24.4 — Húzott fokú lépcsők ellenőrzött geometriája

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-209).

## F9.24.5 — Beton- és alapozási műszaki rajzrendszer

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-210).

## F9.28 — Architektúra-leltár, anyagválasztó és felmérés→kalkuláció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-211).

## F9.32 — Daily workflow E2E validáció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-212).

## F9.33 — Comprehensive Roof Calculation Enhancement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-213).

## F9.34 — Complete Roof Geometry Coverage & UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-214).

## F9.35 — Szarufa, lécezés és faanyag-mennyiségek

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-215).

## F9.36.1 — tető alátétfólia és fedési mennyiségi alap

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-216).

- M9.15.1 (PARTIAL): a „Szarufa vágásai” Karmi-rajz a „Szarufa és léc” kiosztás nélkül is megjelenik (megjelenítési előnézet, számítás/mentés változatlan). Részletek: `docs/M9151_KARMI_WORKFLOW_FINALIZATION.md`.
- M9.15.2 (PARTIAL): a Karmi-előnézet bizonyított előfeltételhez kötött (téglalap síkok: nyereg/félnyereg), kapcsolócsempés „Karmi és csatlakozások” / „Anyagszükséglet” UI. Részletek: `docs/M9152_KARMI_PREVIEW_VERIFICATION.md`.
- M9.15.3 (PARTIAL): a Karmi-előnézet kiosztás nélkül, a kanonikus tetősíkokból számol (nyereg/félnyereg bizonyítva), külön Karmi- és anyagállapot. Részletek: `docs/M9153_KARMI_GEOMETRY_AND_UX_FINALIZATION.md`.

## P0.4 — Tetőforma-választó UI/UX és rajzos workflow QA (2026-11-04)

- PASS WITH LIMITATIONS: a chooser vizuális hierarchiája egyszerűsödött, a kártyák a meglévő 2.5D szürke–sárga ikonnyelvet követik, és a korlátozási szöveg csak releváns formáknál látható.
- A forma-first, kézi/rajzos módválasztó, anyagcsoport-gating, rajzi átviteli, konfliktus- és mentési kapuk nem változtak; 275 érintett teszt zöld, TypeScript és ESLint zöld.
- Böngészős QA: 1440×900, 375×812 és 812×375 sötét témában; a chooser és a módválasztó renderelése, kiválasztási állapota és mobil overflow ellenőrizve.
- Light-theme screenshot és a teljes vizuális P0.4 flow külön, valós dokumentumfeltöltéssel nem készült; a domain- és adatkezelési szerződések változatlanok maradtak.

## F1/F2 — központi tetőmunka-navigáció és URL/state regresszió (2026-11-04)

**PASS WITH LIMITATIONS.**

- A `roof.material-takeoff` lett a tetős munkaterület elsődleges belépési pontja; a `roof.timber-cutlist`, `roof.rafter-cut` és `roof.truss-members` a natív `További szakmai eszközök` disclosure alatt maradnak.
- Javítva a bizonyított URL/state hiba: kalkulátorváltáskor az URL, az aktív navigáció és a tényleges `selectedId` együtt frissül; az `organization` és egyéb query paraméterek megmaradnak. Mentett kalkulációból másik eszközre váltva a `calculation` paraméter nem keveri a saved revisiont az új eszközzel.
- A globális `Kalkulátorok` route, a lépcső- és betonozási kategória, a négy calculatorId és a mentési/draft/session szerződések változatlanok. Ikonok, tetőforma-illusztrációk és SVG-k nem változtak; F3 nyitva maradt.
- QA: direct deep link + refresh, back/forward, saved material/timber, savedből speciális eszköz, 1440×900 / 375×812 / 812×375 light/dark; szélesség-túlcsordulás nem volt, alkalmazási console error nem volt.
- Tesztek: célzott 31/31; teljes 1596 pass, 19 skip; TypeScript, érintett ESLint és `git diff --check` zöld.
- Korlát: light témában a meglévő tetőforma-glyph stroke kontrasztja kb. 1.39:1; ezt nem módosítottam, mert ikon- és vizuális cserére F1/F2-ben nem volt jóváhagyás. Ez F3 külön döntési pontja.

# P1.2.2 — ereszkiülés opcionálissá tétele (2026-11-04)

**PASS WITH LIMITATIONS.** A központi Tetőanyag-kimutatás mezője opcionális; üres és explicit 0 számításkor azonos geometriát, de eltérő input snapshot provenance-t ad. A meglévő gable motor falméretként kezeli a hosszt és szélességet, pozitív ereszkiüléssel mindkét oldali futást bővíti. Célzott teszt: 81/81 PASS. Nincs történeti revízió migráció vagy képletváltozás.

Korlát: nincs eltárolt mérési referencia a tetőméretekhez; ezért a teljes külső tetőméret + pozitív ereszkiülés esetén a dupla hozzáadás nem zárható ki gépileg. A helper szöveg a jelenlegi falméret-szemantikához igazodik. Teljes responsive/light-dark browser QA és visszanyitási próba nem történt.

## P1.2.2.1 — input contract audit és tetőkalkulátor UI/UX review (2026-11-04)

**A fázis: BLOCKED a biztonságos outer-footprint implementációra. B fázis: PASS WITH LIMITATIONS az audit dokumentálására.** A régi gable input falméret + ereszkiülés szerződésű; a persisted `construction.input` snapshot csak calculatorId/fields/material adatot tartalmaz, nincs mérési referencia. Verzió nélküli mezőátértelmezés a V1 revisionök újraszámítását veszélyeztetné, ezért a régi motort nem értelmeztem át.

Az élő, már futó localhost alkalmazásban light desktopon kipróbáltam a 12×6 m, 35° gable kézi utat (eresz üres): 72,00 m² vetület és 87,90 m² felület. Mind a nyolc forma chooser/mezőútját megnyitottam; a rafter-cut, timber-cutlist és truss-members közvetlen útvonalát is ellenőriztem. Mentés nem történt. Nincs 1440×900 / 375×812 / 812×375 dark/light vizuális lefedettség; ezért a teljes böngészős PASS nem állítható.

Részletes, prioritásos javaslatok és tetőforma-értékelések: [Tetőkalkulátor UI/UX review](ROOF_CALCULATORS_UI_UX_REVIEW.md). A B fázisban UI-módosítás nem történt.

## P1.2.3/A — Geometry Contract Foundation (2026-11-04)

**PASS WITH LIMITATIONS.** A történeti, verzió nélküli snapshot a betöltési rétegben explicit `legacy-wall` értéket kap; a suite ezt kalkulátoronként izolált draft metaadatként viszi át a módosításokon, session workspace-en és mentési snapshoton. A szerver explicit szerződés nélküli save-et elutasít, meglévő revíziónál ellenőrzi a szerződés egyezését, az `outer-footprint` mentését/számítását pedig a még hiányzó V2 motor miatt blokkolja. A régi geometriai képletek változatlanok.

Célzott tesztcsomag: konstrukciós számítás/snapshot, save action és load/data, valamint draft állapot: 93/93 PASS. Teljes typecheck, ESLint, dokumentációs leltár, build és élő böngészős V1 round-trip külön QA-kapuk; csak tényleges futásuk után tekinthetők igazoltnak.

## P1.2.3/B — Geometry Contract V2 aktiválás (2026-11-04)

**PASS WITH LIMITATIONS.** Az új tetőforma-kézi kalkuláció V2 (`outer-footprint`) szerződéssel számol; a betöltött régi snapshot és újraszerkesztése V1 (`legacy-wall`) marad. A közös adapter csak gable/shed külön eresz/homlokzati kiülését veszi ki a V2 alapgeometriából; inputérték/provenance változatlanul mentődik. A többi hat forma meglévő külső geometriája változatlan. Sibling tetőkalkuláció adatátvétele a forrás szerződését is továbbviszi.

Numerikus tesztek: V2 gable 12×6 m/35°: 72,00 m² vetület, kb. 87,90 m² sík; üres/0/500 mm eresz esetén egyezik, homlokzati kiülés sem duplázódik. V1 ugyanez 500 mm eresznél: 84,00 m². V2 shed egyoldali 500 mm eresz nélkül 60 m², V1 65 m². V1 kliens/server round-trip integration teszt: szerződés és kiszámított output azonos, bemeneti eredeti revízió változatlan. V2 action tesztben a kliens és szerver output snapshotjai egyeznek.

QA: 12 releváns Vitest fájl, 219/219; TypeScript typecheck sikeres. Production buildet, teljes Vitestet és browser viewports QA-t ebben a fázisban nem futtattam. A docs-leltár külön, meglévő 8 hibája: törölt HAP hivatkozás és 7 nem kapcsolódó fedetlen drawing/roof-support fájl. OCR/M12.2 státusz változatlan. Szerkezeti és termékspecifikus hiányadatok továbbra is incomplete/unsupported állapotban maradnak.

## P1.2.4 — célzott szakmai UI finomítás (2026-11-04)

**PASS WITH LIMITATIONS.** A gable/shed V1/V2 eresz-súgó forma és contract szerint pontosítva; L/T szárnysegítség a domain koordinátáihoz kötve. Nincs geometriaképlet-változás. A docs checker 8 korábbi hibáját rendeztem; a `CALC-CONSTRUCTION` coverage teljes.

Teljes Vitest 226 fájl PASS / 8 skip; 1614 teszt PASS / 19 skip. Typecheck, érintett ESLint, production build, `git diff --check` és docs checker PASS. A helyi szerver nem volt elérhető, ezért valódi böngészős, viewport/téma, mobilbillentyűzet, mentett V1/V2 és rajzi referencia vizuális QA nem történt. Anyagcsoport-állapotok, Liquid Glass tokenek és mobil ugrólink változatlanok maradtak.

# P1.3 — Anyagkezelő UX egyszerűsítés és beszállítófüggő anyagválasztás (2026-11-05)

**PASS WITH LIMITATIONS.** Új termék/kategória modal és termékszerkesztő egyszerűsítve, a forrás/provenance és műszaki adatok szerveroldali megőrzésével. Az új termék az opcionális első árhoz beszállítót kapcsolhat a meglévő ár-opciós modellen. Az anyaglistában egy variáns aktív ajánlatai külön sorok; a kiválasztott ár ID megmarad. A quote meglévő priceId/snapshot útvonala és az ár nélküli műszaki kalkulátormodell változatlan. Mobilos tapadós méretező beállítása a Beállításokban.

QA: teljes Vitest 227 fájl / 1626 teszt PASS, 8 fájl és 19 teszt skip; TypeScript, érintett ESLint, build, docs-check és diff whitespace PASS. Helyi Supabase migráció alkalmazva, a `034_material_manager.sql` pgTAP 35/35 PASS, benne az anyaglista ár-ID/beszállító pillanatkép és a régi idempotens retry ellenőrzése. Brave-ben modalok, anyaglista supplier találatok és beállítás ki/be állapot ellenőrizve.

Korlát: normál szerkesztőből új variánst és műszaki paramétert nem lehet karbantartani, a már mentett műszaki/provenance adatok változatlanok. Kalkulátori anyagválasztás továbbra sem tárol beszállítót vagy árat; ajánlati és munkanapló teljes UI round-trip böngészőteszt nem készült.

## P1.2.5 — Visual Quality Gate (QA-kör, 2026-11-04)

**BLOCKED / részleges QA.** Az alkalmazás beépített böngészőben elérhető volt a localhost címen. Valódi renderelt `roof.material-takeoff` L alakú tető ellenőrzés készült világos témában 1440×900 desktopon és 375×812 mobilon; mindkét mérési mező és súgó látható. Mobilon `scrollWidth=360`, `innerWidth=375`, vízszintes túlcsordulás nem volt. Shell `curl` ugyanakkor localhoston `EPERM`/kapcsolódási hibát jelzett.

A teljes 8 forma × 3 speciális kalkulátor, dark/light, 812×375 landscape, anyagcsoport-részlegesség, mentett V1/V2 és mobil billentyűzet QA nem készült el. Screenshot-alapú bizonyíték csak a vizsgált L alakú állapotra készült. Mivel nem volt bizonyított vizuális hiba, ebben a QA-körben UI/CSS-módosítás nem történt. Teljes kapu nyitott marad.
