# F9.7.1.1 — Magyar szakmai UX és valósághűségi audit

**Állapot: COMPLETE (VERIFIED SCOPE), forráskód és célzott helyi ellenőrzések alapján.** Ez nem szakmai, gyártói, jogi vagy terepi tanúsítás. A böngészős megjelenés és az éles adatokból álló munkafolyamat nincs igazolva.

## Lefedettség: tényleges útvonalak és közös felületek

A `src/app/**/page.tsx` szerinti **19 felhasználói útvonalat** és a hozzájuk tartozó címeket, mezőket, választékokat, súgókat, üres állapotokat, visszajelzéseket, párbeszédeket és PDF-feliratokat vizsgáltam:

| Terület | Útvonalak | Vizsgált közös felület |
|---|---|---|
| Műhely és beállítások | `/` | `dashboard`, témaváltó, megjelenítésméret, szervezetválasztó, kijelentkezés. Önálló beállítások útvonal nincs. |
| Projektek | `/projektek`, `/projektek/uj`, `/projektek/[projectId]` | Lista, projekt- és ügyfélűrlapok, életciklus, kalkulátorlinkek, navigáció, összecsukható kivitelezés. |
| Tető és lemezkiosztás | `/projektek/[projectId]/tetomodellek/uj`, `/projektek/[projectId]/tetomodellek/[roofModelId]` | Nyeregtető-bemenet, geometriai eredmény és séma, lemezkiosztás, forrás- és katalógusadatok. |
| Három projektkalkulátor | `/projektek/[projectId]/ereszcsatorna`, `/projektek/[projectId]/szegelyek`, `/projektek/[projectId]/lemezprofilok` | Mindhárom bemenet, opció, eredmény, figyelmeztetés, rajz, mentett változat és anyagkimutatás-átadás. |
| Anyagkimutatás és ajánlat | `/projektek/[projectId]/anyagkimutatas`, `/projektek/[projectId]/ajanlatok` | Tételűrlap, jóváhagyás, ajánlatszerkesztés, állapot- és megerősítő ablakok, mindkét PDF-felület. |
| Anyagok | `/anyagok`, `/anyagok/uj`, `/anyagok/[productId]` | Gyártó, termék, változat, ár és forrásmezők, keresés és üres állapot. |
| Ügyfelek | `/ugyfelek`, `/ugyfelek/uj`, `/ugyfelek/[clientId]` | Lista, létrehozás és részletek. |
| Belépés és bemutató | `/bejelentkezes`, `/demo/meretezes` | Belépési üzenetek, hozzáférési állapot, külön jelölt DEMO-felület. |

A munkanapló, a fényképek és a belső PDF-összefoglaló a projektoldali kivitelezésben találhatók; nincs külön route-juk. A közös `src/components` navigációs, skálázási és témaelemeket, a szerveroldali hibaszövegeket, a számítási szerződéseket és a PDF-dokumentumokat is áttekintettem. Az API/PDF útvonalak nem önálló oldalak.

## Javított, igazolt problémák

| Minősítés | Terület és bizonyíték | Javítás |
|---|---|---|
| **INCORRECT** | Felhasználói címekben fáziskódok, `draft`, `immutable`, `snapshot`, `VAT`, `Dashboard`, `viewBox` és `reflow` szerepeltek. | Természetes magyar címek és magyarázatok; a belső azonosítók és adatbázisértékek változatlanok. |
| **INCORRECT** | Az új ereszcsatorna-számítás 4000 mm, az új lefolyó 3000 mm szálhosszal indult; az új nyeregtető 12×8 m és más konkrét méretekkel indult forrás/DEMO-jelölés nélkül. Ezek a kliensbeli kezdőértékek voltak, nem katalógusadatok. | Az új adatok üresek, a választott termék és tényleges geometria értékeit meg kell adni. A mentett revíziók bemenete érintetlen. |
| **INCORRECT** | Az anyagkimutatás szabad szöveges belső `measurementKey`-t kért, minden változat árát kínálta, és a módszereket nem szűrte beszerzési egység szerint. A szerver csak meghatározott terület-/hossz-kulcsokat és kompatibilis egységet fogad el. | Magyar, egységes mértékegységet is mutató geometriai választék; feltételes, valóban szükséges mezők; csak a kijelölt változat ára. A szerveroldali szerződés változatlan. |
| **INCORRECT** | A lefolyó könyökszáma a rajzhoz kerül, a kapcsolódó tartozékok a mentett bemenetben maradnak; egyik sem kerül automatikusan átadási tételként a kimutatásba. | Közvetlen figyelmeztetés és feljegyzésként jelölt vezérlő; a kézi tételeknél dupla konzolbeszámításra is figyelmeztetés. Funkcionális változtatás nem történt. |
| **INCORRECT** | Az `Ellenőrzött` katalógus-eredet felhasználó által kiválasztható, forrásigazolás nem kényszerített. | A megjelenítés `Ellenőrzöttnek jelölt`; nem állít független gyártói jóváhagyást. A bizonyítási folyamat továbbra sincs kialakítva. |
| **VERIFIED** | A szegélymotor a további szálak **hasznos fedési hosszát** használja, nem teljes szálhosszt vagy általános toldási szabályt; a profil az előjeles elfordulásból és külön BA/K-ból számol. | A kapcsolati opciókat, profil-súgót, teríték- és forrásfeliratokat a tényleges számításhoz igazítottam. |

A tető eredménye most a megadott adatokból számított geometriai értékként jelenik meg. A szegély és profil továbbra is becslésként jelölt, a rajz nem gyártási terv. Az ajánlat elfogadása nem aláírt szerződés, a kivitelezési PDF nem hivatalos e-építési napló; ezek az alkalmazásban továbbra is külön jelöltek.

## Mezők, opciók és adattakarékosság

- **Ereszcsatorna:** az önálló eresz- és lefolyószakasz hossza és a választott kereskedelmi szálhossz szükséges a `ceil(hossz/szálhossz)` becsléshez. A mérési forrás a visszakövethetőséghez kell. A konzoltávolság opcionális; csak megadva keletkezik konzolbecslés. Lefolyó és kézi tartozék opcionális. A könyök és lefolyóhoz kapcsolt feljegyzés átadási szerepe nyitott.
- **Szegély:** a kategória, a lefedendő hossz és a termék szálhossza a bemenet; a kezdő/záró kiterjesztés és tartalék a tervezési célhosszt módosítja. Átfedés vagy további szál hasznos fedése nélkül darabszám nincs. Tetőél-javaslat külön gombbal kerül be; vápa/falcsatlakozás nem következtetett. A `0` kezdő kiterjesztés/tartalék nem gyártói szabály, ezt a felhasználónak ellenőriznie kell.
- **Profil:** tangenciapontok közötti kész méret, előjeles elfordulás, belső sugár és vastagság kell a 2D geometriához. BA/K nélkül terítékszélesség nincs; darabhossz és darabszám nélkül nettó terítékfelület nincs. Anyagazonosító/katalóguskapcsolat az átadáshoz kell, és csak paraméteregyezést igazol.
- **Egyéb űrlapok:** ügyfélnél csak a név kötelező; projekt, katalógus és ár mezőit a meglévő mentési/ajánlati/forráslánc szerint hagytam. A katalógus további műszaki JSON-mezője opcionális, de az adapter perzisztálja, ezért eltávolítása nem bizonyítottan biztonságos. Az ajánlat ügyfél nélküli piszkozatként menthető, véglegesítéséhez ügyfél kell. Szervezeti jogosultsági, forrás- és korrekciós mezőt nem vettem el.

## Nyitott szakmai döntések és következő lépések

| Minősítés / érintett felület | Pontos hiány és jelentőség | Meglévő bizonyíték | Következő lépés |
|---|---|---|---|
| **UNVERIFIED** — eresz és szegély | Konkrét termék szálhossza, toldása, rögzítése és helyszíni szabása nélkül a szálbecslés nem rendelési mennyiség. | `gutter-material.ts`, `flashing-material.ts`; a [szegélyterv](FLASHING_CALCULATOR_DESIGN.md) egyes Lindab-részleteket termékspecifikus példaként kezel. | Termék és szerelési útmutató szerinti adatot, valamint bádogos felülvizsgálatot kérni; nem bevezetni általános értéket. |
| **UNVERIFIED** — lefolyó és kimutatás | A könyökök és kapcsolódó tartozékok rögzítése nincs összekötve az anyagátadással; kettős kézi felvétel és kihagyás lehetséges. | `gutter-material.ts` csak a szálakat, konzolbecslést és `manualComponents` elemeket adja át; rajz `selectedBends`-et használ. | Külön termékdöntés: kézi feljegyzés maradjon, vagy verziózott átadási szabály és célzott teszt készüljön. |
| **UNVERIFIED** — profil | BA/K alkalmazhatósága, minimális sugár/karima, gép–szerszám kalibráció és vágási veszteség nincs bizonyítva. | [Profilterv](SHEET_METAL_PROFILE_DESIGN.md), `sheet-metal-profile.ts`; az ott hivatkozott CAD- és gyártói példák nem általános gépbeállítások. | Azonosított anyag–gép–szerszám és mért próbadarab alapján szakmai review. |
| **UNVERIFIED** — katalógus és ár | A `verified` eredet szabadon választható; hiteles forrás és aktuális ár nincs automatikusan ellenőrizve. | `materials/contracts.ts`, `material-forms.tsx` és mentési action. | Forráskövetelmény és felülvizsgálati folyamat meghatározása külön feladatban. |
| **UNVERIFIED** — anyagkimutatás és terep | Az új választók működése böngészőben, mobilon és valós hitelesített projekttel nincs ellenőrizve. | Szerveroldali markup és opciótesztek, sikeres build; korábbi helyi szerverindítás `EPERM` hibával zárult. | Egy hitelesített böngészős smoke az anyagkimutatás, három kalkulátor és PDF megtekintésével, amikor a helyi szerver elérhető. |

**NOT APPLICABLE:** önálló beállítási oldal, hivatalos e-napló, gép által kalibrált gyártási profil, új hitelesítési folyamat és későbbi üzleti modul nem része a megvalósított UI-nak.

## Források és ellenőrzés

A helyi műszaki/termékforrások: [termékkészültségi audit](PRODUCT_READINESS_AUDIT.md), [szegélyterv](FLASHING_CALCULATOR_DESIGN.md), [profilterv](SHEET_METAL_PROFILE_DESIGN.md), [számítási motor](CALCULATION_ENGINE.md), `PROJECT_BLUEPRINT.md` és az aktuális `src/` szerződések. A korábbi kutatás [Lindab SRP Click útmutatót](https://www.lindab.hu/globalassets/commerce/lindabwebproductsdoc/pdf/profile/hu/seamline/lindab_seamline_srp-click_szerelesi-utmutato.pdf?v=1771111103) és [SOLIDWORKS K-Factor leírást](https://help.solidworks.com/2022/english/solidworks/sldworks/c_K_Factor.htm) idéz; a külső oldalakat ebben a körben nem nyitottam újra, és nem emeltem át belőlük általános kivitelezési szabályt.

**Futtatva:** `npx vitest run` a 4 új UI/opció-, a 3 kapcsolódó számítási, valamint a profil-, projekt-navigációs és kivitelezési áttekintő tesztfájlra: **10 fájl / 39 teszt PASS**; külön `npx vitest run src/domain/materials/contracts.test.ts src/features/dashboard/dashboard.test.ts`: **2 fájl / 6 teszt PASS**. `npm run typecheck`, `npm run lint`, `npm run build` PASS; végső `git diff --check` külön. **Nem futtatva:** teljes regresszió, adatbázis/pgTAP, böngésző/valódi készülék. A szerveroldali szerződés, képlet, RLS, séma, migráció, történeti változat és üzleti állapot nem módosult. Az anyagkimutatás meglévő actionje továbbra is szervezet/projekt és aktív variáns szerint ellenőriz, a jóváhagyás verziót továbbít az RPC-nek; ennek adatbázisos konkurencia- és jogosultsági bizonyítása nem része e körnek.

## F9.14.2 — Egységes Liquid Glass és RoofWorkspace döntések

- A központi változók: `--surface`, `--surface-subtle`, `--surface-glass`,
  `--glass-border`, `--glass-highlight`, `--border`, `--focus-ring`,
  `--shadow-surface`, `--shadow-control`, `--radius-*` és `--space-section`.
  A brand narancs marad az elsődleges kiemelés; a dark mode külön felületi,
  határ- és szemantikus színeket kap.
- A `glass-navigation` és `glass-toolbar` csak chrome-hoz használatos. Az
  űrlapmezők, rajzok, eredmények, táblázatok, státuszkártyák és dialog tartalmak
  megfelelően átlátszatlan felületet kapnak. A blur `@supports`-fallbackdal,
  reduced-transparency és increased-contrast szabállyal működik.
- A `RoofWorkspace` a mérések, rajz, eredmény és műveletek közös kompozíciója.
  A survey a már meglévő `SectionDraft` mérési értékeit szerkeszti; külön tető-
  űrlapadat nem keletkezik. A guidance fix magasságú, rövid élő szöveget és
  `<details>`-ben elérhető hosszabb magyarázatot ad. Az aktív SVG-méretek
  pointerről és billentyűzetről visszafókuszálhatók a megfelelő inputra.
- A mérőrács desktopon legfeljebb 4, tablet szélességen 3–4, mobilon 2 oszlopra
  vált. Szerkeszthető szövegvezérlők minimum 16 px-esek; ikonvezérlők minimum
  44 px-es célméretet kapnak. A survey L/T modellfeltételezés, a fedési és
  anyagkiosztási részletek az SVG/eredmény után progresszíven jelennek meg.
- Keskeny survey nézetben a tetőmunkaterület mentése az eredmény után marad és
  nem ragad rá az SVG-re; a többi munkatípus meglévő sticky mentősávját ez nem
  változtatja meg.

Az F9.14.2 browser smoke local és hitelesített volt, de nem teljes platform QA.
Az előtte screenshot, Safari/valós eszköz, dialog-központozás, képernyőolvasó és
valós reduced-motion/contrast emuláció nem bizonyított; ezért ez a bejegyzés nem
minősíti COMPLETE-ra a mérföldkövet. Részletes bizonyíték: `PROGRESS.md` és
`TEST_MATRIX.md` F9.14.2 szakasza.

## F9.14.5 — munkaterület- és útvonal-audit

**Státusz: PARTIAL.** A jelenlegi appstruktúrát, a projekt részletoldalt,
`ProjectWorkflowOverview`, a tetőválasztót és a közös CSS-t vizsgáltam. A
dashboard hat útvonalválasztója önálló, fontos navigáció maradt (**KEEP**). A
projekt munkafolyamatok és alapadatok/szerkesztés egymásba ágyazott, ismétlődő
surface-ei dekoratív keretét eltávolítottam (**REMOVE**); az önálló rekordokat
elválasztó (**KEEP**), a workflow linkjeit folyamatos, szemantikus listává
alakítottam (**REPLACE**). A tetőmodell-, ajánlat- és anyagrekordok továbbra is
felismerhető, önálló választások.

A változás a meglévő React/Next/CSS rendszert bővíti, nem hoz létre párhuzamos
design systemet. A `ProjectWorkflowOverview` `nav > ul > li > Link` szerkezetű,
az organization/project hrefek változatlan kontextust visznek. Közös CSS ad
nyitott section-, elválasztós lista-, fókusz-, tetőválasztó- és munkafolyamat
mintát. A korábbi workflow grid keskeny oszlopot és címkére futó műveletet
okozott; teljes szélességű grid javítja, desktopon két oszloppal és keskeny
nézetben egy oszloppal.

**Könyvtárdöntés:** shadcn/ui, Motion és creativoma Liquid Glass opciót az
aktuális React 19 / Next 16 stackhez és helyi függőségekhez auditáltam. A natív
linkek, mezők, `<details>`, meglévő CSS tokenek és SVG primitívek elegendőek;
refraction filter nem került az SVG-re, új UI dependency nincs.

**Bizonyíték és korlát:** a projektworkflow javítása böngészőben látható volt.
A sötét és világos dashboardot ellenőriztem; a sötét téma visszaállítva. Az
izolált, helyi hitelesített server főútvonalai betöltődtek; a korábbi
`:3001` projekt-ChunkLoadError oka nem bizonyított. A kilenc előírt route
azonos állapotú screenshot-párja nem készült el és nem lett képfájlként
exportálva. Pontos 1440/1024/768/390/320 viewport, fizikai mobil/Safari,
dialog-billentyűzet, screen reader és valós média-preferencia teszt F9.14.5 alatt
nem történt. Emiatt a route smoke és célzott tesztek mellett sem igazolt a
globális vizuális és reszponzív elfogadás; részletek `PROGRESS.md` és
`TEST_MATRIX.md` F9.14.5 szakaszában.
