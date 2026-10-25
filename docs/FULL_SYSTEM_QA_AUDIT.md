# TetőPro — teljes rendszer QA audit, 2026-10-25

**Státusz: PARTIAL / további teljes rendszer-ellenőrzés szükséges.** A vizsgálat friss forrás-, build-, Vitest-, helyi pgTAP- és két kalkulátoron végzett, nem mentő böngészős bizonyítékot tartalmaz. Teljes felhasználói E2E, mobil eszköz, hostolt Supabase és szakmai tervjóváhagyás nélkül a rendszer egészére `COMPLETE` minősítés nem adható. A QA-07 follow-up bizonyítottan lezárta a kivezetett felmérés-létrehozásra utaló munkanapló-üresállapotot; a QA-08 eredménye a [teljes E2E jelentésben](QA08_FULL_E2E_VERIFICATION.md) található.

### QA08-RPC-01 closure addendum — 2026-10-25

A [QA08-RPC-01 follow-up](QA08_RPC01_TRUST_BOUNDARY.md) a downstream konstrukciós trust-boundary findingot helyi forrásban és eldobható DB-klónon lezárta. A restricted writerhez kötött atomikus privát attesztációt a közvetlen `authenticated` munkanapló- és ajánlat-RPC-k kötelezően ellenőrzik; nem attesztált revízió egyik downstream rekordot sem hozhatja létre. Célzott pgTAP **63/63**, teljes pgTAP **62 fájl / 1318 PASS**, kétkapcsolatos konkurencia-próba **1 siker / 1 `40001`**. A migráció megosztott helyi vagy hostolt adatbázisra nincs alkalmazva, ezért ott az állapot továbbra is `NOT VERIFIED`.

### QA-08 addendum — 2026-10-25

A QA-08 helyi újraellenőrzése a jelen állapotban **183 Vitest-fájl / 1101 PASS teszt**, **61 pgTAP-fájl / 1292 PASS**, lint, typecheck és izolált build PASS eredményt adott. Hitelesített desktop smoke-ban a 31 kalkulátor 4/17/10 kategóriás selector-leltára és a fő olvasási útvonalak elérhetők voltak. A tartós írási E2E, mobil viewportok, konzol, hosted Supabase/Storage és production teljesítmény továbbra sem igazolt.

Az eredetileg QA-04-ben jelzett downstream-teljességi korlátot QA-08 tranzakciós authenticated RPC-próba közvetlenül reprodukálta: üres konstrukciós `output_snapshot` mellett a `link_execution_plan_document` `{created: true}` eredményt adott. A tranzakció visszagörgetése után a fixture 0/0 maradt. Ez nyitotta a **QA08-RPC-01 / P2** ticketet; a closure addendum helyi forrásban és izolált DB-ben lezárta. A QA-08 akkori öt P2 tételéből így **négy maradt ebben a történeti auditlistában**; a későbbi follow-upok aktuális állapotát a `docs/PROGRESS.md` vezeti.

## 1. Vezetői összefoglaló

- **P0: 0, P1: 2, P2: 4, P3: 0 nyitott** probléma ennek a történeti auditnak a QA08-RPC-01 closure addenduma után. A korábbi P3 és a QA08-RPC-01 P2 tétel lezárult; a későbbi follow-upok és a fennmaradó rendszerkorlátok miatt az audit egészét nem minősítem át `COMPLETE`-re.
- A teljes Vitest futás **175 fájl sikeres, 8 kihagyott; 1039 teszt sikeres, 19 kihagyott**. ESLint, közvetlen `tsc` és elkülönített production build sikeres. Az eredeti teljes helyi pgTAP **61 fájl, 1291 állítás, 1 sikertelen állítás**; a hiba tesztizolációs okát külön diagnosztika igazolta, de az eredeti suite státusza továbbra is FAIL.
- A jelenlegi kód **31 építési kalkulátort** regisztrál, ezek közül **4 tetős kalkulátor menthető**. Két kalkulátoron történt közvetlen, nem mentő interakció; a 31 típus mindegyikének teljes E2E működése nem igazolt.
- A helyi DB-ben a legutóbbi öt migráció közül az M2–M5 (`20261025100000`–`20261025140000`) szerepel; öt megvizsgált üzleti táblán az RLS bekapcsolt. Ez nem bizonyítja a hostolt séma, Storage és minden policy megfelelőségét.

## 2. Aktuális architektúra és funkcióleltár

Next.js 16.4.2 App Router + React 19 + TypeScript; a route-ok `src/app/`, az alkalmazási folyamatok `src/features/`, a keretfüggetlen geometria/pénzügy `src/domain/`, a Supabase adapterek `src/infrastructure/`, az SQL és pgTAP `supabase/` alatt vannak. A felhasználói terhelésre több szervezeti tagot, hosszabb munkanaplót és több száz katalógusterméket feltételeztem; ez nem mért production forgalom.

**Leltári egységek:** 31 katalógusbeli építési kalkulátor (`src/domain/calculations/construction/catalog.ts`), plusz 10 fő funkciócsoport: (1) Auth/szervezet/dashboard/navigáció, (2) kalkuláció mentés/revízió, (3) munkanapló, (4) önálló és projektajánlat, (5) anyagkezelő, (6) anyaglista/beszerzés, (7) projekt/tetőmodell, (8) történeti felmérés és fotók, (9) PDF/CSV, (10) téma/méretezés/rajzkezelés. Ez **41 leltári egység**, nem 41 teljesen validált workflow. A 31 kalkulátorból 4 menthető: `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members`; a másik 27 eredménye helyi előnézet. A régi felmérési route-ok átirányítanak, új felmérés létrehozása tiltott; az adatok és kompatibilitási olvasók megmaradtak.

A tényleges route-listát a friss production build kimenete igazolta. A `PROJECT_BLUEPRINT.md` célterv; a `docs/PROJECT_MAP.md`, `funkciok.md` és `CLAUDE.md` több, M5 előtti felmérés-központú mondatot tartalmaz, ezért funkciókészültségi bizonyítékként nem használtam őket.

## 3. Módszer és állapothatár

1. `git status --short --branch`, utolsó nyolc commit, releváns projektutasítások és aktuális dokumentáció; a munkafában már létező F9.73 munkát érintetlenül hagytam. A legfrissebb commitok: M2–M8; a nem commitolt változások főleg a munkanaplóhoz kapcsolt források hibatűrését érintik.
2. Route-, domain-, action-, adatbetöltő-, SQL- és tesztleltár; a magas kockázatú mentés, forrásrevízió, pénzügy és láthatóság útvonalainak célzott olvasása. Nem történt minden forrásfájl soronkénti áttekintése.
3. Teljes Vitest, lint, `tsc`, izolált build, helyi pgTAP; csak olvasó helyi sémaellenőrzés. A 61 pgTAP fájl `BEGIN`-nel indul és `ROLLBACK`-kal zárul. Nem történt DB-reset, migráció vagy tartós tesztírás.
4. Bejelentkezett helyi DEMO munkamenetben szarufa- és faanyag-kalkulátor előnézet, cm→m váltás, kalkulátorváltás és hiányos bemenet. Mentés, újranyitás és ajánlat/munkanapló írás nem történt, mert a közös helyi DEMO adatok elkülönített, eldobható tulajdona nem volt igazolható.

**Bizonyítékszintek:** `REPRODUCED` = böngészőben megfigyelt; `TEST-CONFIRMED` = tényleges tesztkimenet; `SOURCE-CONFIRMED` = konkrét kódútvonalból következik; `NOT VERIFIED` és `BLOCKED` külön szerepel. A forrásból levezetett küszöbesetet nem nevezem élő adatokon reprodukáltnak.

## 4. Funkcionális lefedettség és kockázatalapú tesztmátrix

| Funkciócsoport | Friss bizonyíték | Hiányzó kritikus eset / állapot |
|---|---|---|
| Dashboard, Auth, navigáció, téma | Route/komponens és kapcsolódó Vitest; böngészőben kalkulátor oldal desktopon | Deep link, vissza/előre, kijelentkezés, több szervezet, light mode és mobil: `NOT VERIFIED` |
| 31 kalkulátor, egységek, rajzok | Katalógus + domain/rajz tesztek; szarufa és faanyag böngészős részpróba | 29 típus közvetlen interakciója, szélsőérték, minden SVG-paritás, mentés/újranyitás: `NOT VERIFIED` |
| 4 menthető tetős kalkuláció | Action → szerveres újraszámítás → restricted writer RPC, Vitest és helyi pgTAP 056 | Valódi mentés/retry/konkurens szerkesztés a jelen munkamenetben: `BLOCKED` |
| Munkanapló, kapcsolt revízió, fotó, PDF | Adatbetöltő, route, pgTAP 005–008/040/057; friss source review | >100 esemény és PDF élő reprodukciója, hiányzó forrás, mobil E2E: `NOT VERIFIED` |
| Ajánlat és pénzügyi szerződés | HUF, soronkénti half-up, nettó/bruttó elválasztás Vitest; pgTAP 018/058 | Teljes kalkuláció→ajánlat mentés, árverzió történeti UI ellenőrzése: `BLOCKED` |
| Anyagkezelő és anyaglista | Katalógusadat-betöltő, pgTAP 034/032, releváns Vitest | >200 termék élő lista/részlet, CRUD, nagy árverziók, teljes átadás: `NOT VERIFIED` |
| Projekt és tetőmodell | Route/domain/feature tesztek, friss build | L/T és nagy geometriák böngészőben, projekt workflow: `NOT VERIFIED` |
| Régi felmérések | Redirect forrás és tesztek, pgTAP 059, történeti parser | Hosted régi snapshotok, privát fotók és régi URL-ek teljes E2E: `NOT VERIFIED` |
| PDF/CSV | Route-ok és kapcsolódó szerződések forrásauditja | Renderelt export képi/paritás ellenőrzése: `NOT VERIFIED` |
| Mobil UX, skálázás | Reszponzív és vezérlő források célzott olvasása | 375×812, 812×375, 768×1024, valódi érintés/billentyűzet: `NOT VERIFIED` |

A fő workflow-khoz a következő eseteket kell a javítási körben végigvinni: happy path; üres/hiányos/hibás input; határérték; mentés→újranyitás→revízió; hiányzó kapcsolt rekord; jogosultságmegtagadás; hálózati hiba/retry és idempotencia; régi snapshot; mobil állapot; export és mentett eredmény paritása. A jelen futás a mátrix egy részét fedi, nem teljes regresszió.

## 5. Kalkuláció és geometria

- Böngészőben a `roof.rafter-cut` 400 cm fél fesztáv + 300 cm emelkedés esetén **5000 mm** szarufahosszt és **36,87°** hajlást mutatott; ez a 3–4–5 háromszög kézi eredménye. 250 cm → 2,5 m váltáskor a visszhangzott kanonikus érték **2500 mm** maradt, az új eredmény **3905,125 mm**, ami `sqrt(2500²+3000²)` értékével egyezik. A DOM a csomópont A/C/D besorolását is megmutatta; statikai megfelelőség nem következik belőle.
- A `roof.timber-cutlist` 10×6 m, 45° geometriai előnézetén 84,85 m² tetőfelület jelent meg. Kiosztási távolság nélkül a felület külön jelezte, hogy a szarufa-részlet nem rajzolható és a faanyag nem teljes, mégis engedélyezte a mentés gombját: QA-04.
- A `rafter-detail.ts` és rajztesztek, a `rafter-joints.ts`, a lépcső-, beton- és `length-input` tesztek a teljes Vitest futásban sikeresek. A M8 axonometrikus részletrajzot és a teljes tetőrajzot ebben a munkamenetben nem hasonlítottam össze vizuálisan. A vágási szög, bevágás és statika szakemberi jóváhagyása nincs igazolva.
- A 31 katalóguscímkéből minden elem `verified` státuszú, ez regisztrációs metaadat. Egyetlen típus teljes szakmai vagy gyártási megfelelősége sem állítható pusztán ebből.

## 6. UI/UX és mobil

A desktop DEMO kalkulátorban a kategóriák, számmezők, egységváltó, eredmények és C/D figyelmeztetések láthatók és kezelhetők voltak. Az állapotvesztés kalkulátorváltáskor ténylegesen reprodukált (QA-03). A hiányos anyageredmény és az aktív mentés gomb közti ellentmondás QA-04. A QA-07 follow-up a munkanapló-lista és dashboard üres állapotának kivezetett felmérés-szövegét mentett kalkulációs/önálló belépési szövegre cserélte, célzott route- és UI-tesztekkel. Nem történt mért érintési célméret-, kontraszt-, fókusz-, soft-keyboard- vagy overflow audit; a 375/812/768/1440 ajánlott viewport mátrix nem teljesült. Liquid Glass és GPU költségről mérés nélkül nincs negatív állítás.

## 7. Biztonság, jogosultság és adatkonzisztencia

- A kalkulációmentő action a kliens által küldött kimenetet figyelmen kívül hagyja, a szerveren újraszámol, a tagságot és a mezőket ellenőrzi, majd restricted writer RPC-t hív. Az M2 SQL actor/org, várt revízió, műveletazonosító és payload-egyezés ellenőrzést, tranzakciós advisory lockot és immutable revízió beszúrását tartalmazza. Helyi pgTAP 056/057/058 sikeres; hosted cross-org bizonyíték nincs.
- Helyi, csak olvasó sémaellenőrzés: `20261025140000` az utolsó alkalmazott migráció; a `calculations`, `calculation_revisions`, `execution_plan_document_links`, `quotations`, `material_preparation_lists` táblákon RLS bekapcsolt. Ez a kapcsoló és a policy-k száma nem teljes hozzáférési bizonyítás.
- A `040` pgTAP privát kapcsolatokra vonatkozó állítása azért bukott el, mert minden látható linket számol; a diagnosztika szerint az egyetlen többlet **aktív `calculation` link**, amelynek szervezeti tag általi olvasása M3 termékdöntés. A teszt saját két linkje közül egyik sem látszott a másik tagnak. Ideiglenes, `/private/tmp` alatti, csak a saját linkekre szűrő tesztmásolat **24/24 PASS**; az eredeti fájlt nem módosítottam. Ez tesztizolációs hiba (QA-05), jelen bizonyítékkal nem igazolt jogosulatlan hozzáférés.
- Privát Storage/signed URL, fotóméret/EXIF, hosted RLS, backup/restore és valódi két szervezet közötti támadási próba most nem futott. A történeti snapshotok immutabilitását a helyi migrációk és tesztek támogatják, de a hostolt állapot nem ismert.

## 8. Teljesítmény és erőforrás

Mért késleltetés vagy production bundle-profil **nem készült**. Forrásból bizonyított adatmennyiségi határ: a munkanapló három alárendelt listájának globális 100-as korlátja (QA-01), a katalógus 200-as levágása (QA-02), és a mentett számítás 50 revíziós listája (QA-06). A munkanapló minden látható fotóhoz külön signed URL-t kér, legfeljebb a kiválasztott 100 soron; ez kérésdarabszám, nem mért lassulás. Memoizációt, cache-t vagy új state libraryt nem javaslok bizonyíték nélkül.

## 9. Böngészős és E2E eredmény

**Környezet:** meglévő Brave, bejelentkezett `localhost:3000` helyi DEMO műhely, desktop ablak; natív hozzáférhetőségi fa és képernyőkép. A kalkulátorban kitöltés, eredmény, egységváltás, másik kalkulátorra és vissza váltás, hiányos faanyag eset történt. Tartós mentés és más adatmódosítás nem történt. Konzolnapló, mobil viewport és fizikai érintés nem volt hozzáférhető ezzel az ellenőrzési úttal. Ez **két részben kipróbált kalkulátor**, nem a 31-ből két teljes E2E.

| Felhasználói folyamat | Eredmény |
|---|---|
| A. Kalkulátor: adat → számítás → rajz | Részben `REPRODUCED`; szarufa numerika és sematikus rajz, faanyag hiányos állapot |
| A/E. Mentés → újranyitás → revízió és részletrajz | `BLOCKED`: elkülönített, eldobható írási adat nem igazolt |
| B. Kalkulátor → munkanapló | `BLOCKED`: tartós kapcsolatot nem írtam |
| C/D. Kalkulátor/katalógus → ajánlat | `BLOCKED`: tartós ajánlatot és árat nem írtam |
| F. Opcionális kapcsolt forrás kiesése | Unit teszt és forrás vizsgálva; élő E2E `NOT VERIFIED` |

## 10. Automatizált ellenőrzések — pontos eredmények

| Parancs/ellenőrzés | Friss eredmény | Határ |
|---|---|---|
| `npm test -- --reporter=dot` | PASS: 175 fájl / 1039 teszt; 8 fájl / 19 teszt SKIP | Két React `priority` attribútum figyelmeztetés a dashboard tesztmockjában; nem browser-hiba bizonyíték |
| `npm run lint` | PASS: `ESLint: No issues found` | Statikus lint |
| `npx tsc --noEmit -p tsconfig.typecheck.json` | PASS: `TypeScript: No errors found` | Nem futott `next typegen` a közös `.next` védelme miatt |
| `npm run build` | PASS, Next.js 16.4.2, 32 statikus oldal; `/private/tmp/tetopro-audit-build.4S6swW` elkülönített másolat és saját `.next` | A fő checkout build-cache érintetlen |
| `npm run db:test` | **FAIL**, 61 fájl / 1291 állítás; `040_execution_plan_document_links.sql` 13. állítás (1 látható, 0 várt) | QA-05; nem mondható teljes DB regressziós PASS-nak |
| `npx supabase test db /private/tmp/tetopro-audit-040-scoped.sql` | PASS: 24/24, ideiglenes diagnosztikai másolat | Nem helyettesíti az eredeti suite javítását |
| `git diff --check` | PASS az audit indulásakor és a dokumentációs módosítás után | A nem követett riport whitespace-át külön ellenőriztem |

## 11. Prioritásos hibajegyzék

### QA-01 — P1 — Munkanapló és PDF csendes csonkolása

- **Modul / bizonyíték:** munkanapló adatbetöltő; `SOURCE-CONFIRMED`. `src/features/execution/execution-data.ts:169–185,222–249` a kiválasztott tervek összes bejegyzését, eseményét és fotóját **globálisan 100 sorra** korlátozza, utána tervenként csoportosít. `src/app/api/projektek/[projectId]/kivitelezesi-dokumentacio/route.ts:36,56` ugyanezt adja a PDF-nek.
- **Reprodukció / elvárt / tényleges:** hozz létre összesen 101 napi bejegyzést egy vagy több tervben, majd nyisd meg a régebbi tervet és kérj PDF-et. Elvárt: teljes napló vagy jól jelzett lapozás/részleges export. Tényleges kódút: a 101. és korábbi sor nem kerül az adatmodellbe, és nincs részlegességi jelzés. Élő 101 soros reprodukció nem történt.
- **Gyökérok / hatás / integritás:** lekérdezésszintű globális `limit(100)`; a tárolt adat nem vész el, de a felhasználó és a PDF hiányos nyilvántartást lát. Ugyanez az eseményekre és fotókra is vonatkozik.
- **Legkisebb javítás / regresszió / függőség:** a kiválasztott tervhez teljes, lapozott olvasás, illetve export előtt teljességellenőrzés; két tervvel és 101+ eseménnyel célzott teszt. A PDF csak a teljes olvasás bizonyítása után legyen késznek tekinthető. **Bizonyosság: magas**.

### QA-02 — P1 — A 201. termék eltűnik, a közvetlen részletlink is hibás

- **Modul / bizonyíték:** anyagkezelő és katalógus átadások; `SOURCE-CONFIRMED`. `src/features/materials/material-data.ts:51–54,108` a teljes terméklistát 200-ra vágja; a részletlekérő ugyanezen lista `find` művelete. A `src/app/anyagok/[productId]/page.tsx:19–20` ilyenkor „Az anyag nem található” állapotot ad. A kalkulátorprofilok is 200 aktív terméknél állnak meg (`material-data.ts:58–62`).
- **Reprodukció / elvárt / tényleges:** legyen 201 termék; a legrégebbi URL-jét nyisd meg. Elvárt: az adott szervezeti termék betöltése. Tényleges kódút: a frissítés szerint 201. termék nincs a listában, ezért a közvetlen link is „nem található”. Élő 201 termékes DB nem volt létrehozva.
- **Gyökérok / hatás / integritás:** lista-korlát újrafelhasználása az azonosító szerinti olvasáshoz. Nincs adatvesztés vagy bizonyított cross-org leak, de a régi termék nem érhető el szerkesztésre, kiválasztásra és több átadásban. **Legkisebb javítás:** ID szerinti, szervezetre szűrt termékbetöltés a részlethez; listában lapozás/keresés és látható teljességi jelzés. **Regresszió:** 201 termék, közvetlen ID link és kalkulátor/ajánlat/anyaglista kiválasztás. **Függőség:** adatbetöltő közös hívói. **Bizonyosság: magas**.

### QA-03 — P2 — Kalkulátorváltás törli a mentetlen méréseket

- **Modul / bizonyíték:** kalkulátor munkatér; `REPRODUCED`. `src/features/calculators/construction-suite.tsx:197–209` váltáskor `setValues({})`-t hív, a betöltő effekt pedig az új kalkulátor kezdőértékeit állítja be. A `ConstructionSavePanel` csak már mentett revízió `dirty` állapotát őrzi.
- **Reprodukció / elvárt / tényleges:** a DEMO `roof.rafter-cut` mezőibe 400 cm / 300 cm került, 5000 mm eredménnyel; „Rácsos tartó elemei”, majd vissza. Elvárt: a munkamenet bemenetei megmaradnak vagy váltás előtt adatvesztési jelzés. Tényleges: mindkét mező kiürült. Ugyanez a kiválasztott kalkulátorra ismét kattintva is a forrás szerint resetel.
- **Hatás / integritás / javítás:** helyszíni, mentetlen munka elvész; DB-snapshot nem sérül. Kalkulátoronkénti helyi bemenet megőrzése vagy őrzött elvetés, a meglévő navigációs guard mintájával. **Regresszió:** két kalkulátor közti váltás és azonos elem ismételt választása. **Függőség:** mentett revízió betöltésének prioritása. **Bizonyosság: magas**.

### QA-04 — P2 — Hiányos faanyag-eredmény mellett aktív a mentés

- **Modul / bizonyíték:** faanyag kalkulátor mentési szerződés; `REPRODUCED` + `SOURCE-CONFIRMED`. 10×6 m és 45° megadásakor, kiosztási távolság nélkül a UI „Hiányzó specifikáció miatt az eredmény nem teljes” és „Szarufa-részlet nem rajzolható” állapotot mutatott, mégis aktív lett a „Kalkuláció mentése” gomb. `src/features/calculators/construction-computation.ts:168–170` a számítható tetőgeometriát önmagában elégnek veszi; `construction-actions.ts:48` ezt szerveren is használja.
- **Elvárt / tényleges / hatás:** a UI „csak teljes eredmény menthető” állítása szerint hiányos kért faanyag nem menthető teljesként; a jelen állapotban a szerver is elfogadná. A snapshot képes hiányosságot tárolni, ezért ez elsősorban félrevezető menthetőségi/állapotjelzés, és hiányos forrást adhat későbbi átadáshoz; tartós mentést nem hajtottam végre.
- **Legkisebb javítás / regresszió / függőség:** termékdöntés szerint vagy a kért faanyag `VALID` státuszához kötni a mentést, vagy egyértelmű „hiányos piszkozatként mentés” állapotot és az átadás korlátozását bevezetni. Teszt: teljes geometria + hiányzó kiosztás mind kliens, mind action szinten. **Bizonyosság: magas a UI-ellentmondásra; közepes a kívánt üzleti mentési szabályra**.

### QA-05 — P2 — A teljes pgTAP regresszió környezeti adattól függ

- **Modul / bizonyíték:** SQL teszt; `TEST-CONFIRMED`. `supabase/tests/database/040_execution_plan_document_links.sql:65` az egész kapcsolattábla látható sorait várja nullának, miközben a helyi DB-ben egy M3 szerint látható, aktív kalkulációs link van. Teljes suite: 1/1291 FAIL. Ideiglenes diagnosztika: a teszt saját anyaglista/ajánlat linkjeiből 0 látható; a többlet `calculation:active`; saját ID-kre szűkített másolat 24/24 PASS.
- **Reprodukció / elvárt / tényleges:** létező aktív számításlinkkel futtasd `npm run db:test`-et. Elvárt: a teszt csak az általa létrehozott két privát rekordot ellenőrzi. Tényleges: 1 látható környezeti rekord miatt bukik.
- **Gyökérok / hatás / integritás / javítás:** nem izolált `count(*)`; a suite megbízhatatlan, és elfedhet új valódi RLS hibát. A teszt állítását a saját link-ID-kre kell szűkíteni. Regresszió: tiszta és előzetes aktív számításlinket tartalmazó lokális DB-n ugyanaz a teszt. **Függőség:** M3 láthatósági szerződés. **Bizonyosság: magas**.

### QA-06 — P2 — A 51. mentett revízió már nem nyitható meg a revíziólistából

- **Modul / bizonyíték:** mentett kalkuláció; `SOURCE-CONFIRMED`. `src/features/calculations/construction-data.ts:22–35` legfeljebb 50 revíziót tölt le; `src/features/calculators/construction-save-panel.tsx` kizárólag a kapott tömbből építi a revíziógombokat. A legfrissebb marad, a régebbi nem jelenik meg.
- **Reprodukció / elvárt / tényleges:** 51+ revízió után az elsőt próbáld újranyitni. Elvárt: a történeti snapshot elérhető. Tényleges kódút: V1 hiányzik a listából, nincs további oldal. Élő 51-es eset nem futott.
- **Hatás / integritás / javítás:** DB adat nem módosul, de a történeti ellenőrzés akadályozott. Lapozott revíziólista vagy külön régi revízió betöltése, látható 50-es korlát; 51 revíziós teszt. **Függőség:** snapshot-kijelzés. **Bizonyosság: magas**.

### QA-07 — P3 — Kivezetett felmérésre utaló munkanapló-üresállapot — LEZÁRVA

- **Modul / bizonyíték:** munkanapló navigáció; `SOURCE-CONFIRMED` + `TEST-CONFIRMED`. Az üres listaoldal és a dashboard üres munkanapló-állapota most „Munkanaplót önállóan vagy mentett kalkulációból indíthatsz.” szöveget mutatja; a „felmérésből” ígéret megszűnt.
- **CTA és nem üres állapot:** az „Új munkanapló” CTA a `/kivitelezes/uj?organization=…` tényleges útvonalra navigál; a meglévő terv a `/kivitelezes/:planId?organization=…` útvonalon marad. A felmérés történeti olvasása és meglévő felmérés-kapcsolási útvonala nem változott.
- **Regresszió:** üres/nem üres `ExecutionIndexPage`, dashboard-üresállapot, régi szöveg hiánya és CTA-célok **8/8 PASS**. Nincs adatbiztonsági vagy adatkonzisztencia-változás. **Bizonyosság: magas**.

### QA08-RPC-01 — P2 — Nem igazolt konstrukciós revízió downstream elfogadása — LEZÁRVA HELYI FORRÁSBAN

- **Gyökérok:** a konstrukciós writer már restricted szerepkörű volt, de a közvetlenül `authenticated` `link_execution_plan_document` és `save_standalone_quotation_from_calculation` csak tulajdonjogot és revíziólétezést ellenőrzött; a szerveroldali újraszámítás eredetét nem.
- **Javítás:** a writer strukturális teljességi kapu után, az immutable revízióval egy tranzakcióban privát attesztációt ír. Mindkét downstream tábla triggerrel követeli az azonos org/kalkuláció/revízió attesztációját. A böngésző nem kap writer- vagy attesztáció-hozzáférést; RLS nem lazult.
- **Regresszió:** TDD RED **10/26 FAIL** a régi sémán; GREEN célzott **63/63**, teljes pgTAP **62 fájl / 1318 PASS**; cross-org, lejárt auth, hamisított és hiányos output, árva rekord, idempotencia, immutabilitás és konkurens expected-version lefedve. **Korlát:** a migráció hostolt/megosztott DB-n nincs alkalmazva. **Bizonyosság: magas a helyi forrásra és izolált DB-re**.

## 12. Nem igazolt és blokkolt területek

`BLOCKED`: tartós DEMO írás, mentés/újranyitás/revízió és A–E E2E átadások az elkülönített tesztadat hiánya miatt; hosted Supabase és Storage hozzáférés; valódi ügyféladatokhoz nem nyúltam. `NOT VERIFIED`: 29 kalkulátor közvetlen UI interakciója, minden tetőforma rajz/paritás, mobil nézetméretek, screen reader, light mode, hosszú munkamenet, hibás hálózat, PDF képi tartalma, CSV, browser console, production teljesítmény, backup/restore, cross-org staging. A jelen audit nem ad szakmai/statikai megfelelőségi minősítést.

## 13. Javasolt javítási sorrend

1. **QA-01**: teljes munkanapló/riport adatbetöltés és részlegesség-jelzés; a PDF integritása kritikus.
2. **QA-02**: ID szerinti anyagbetöltés és katalógus lapozás; az ajánlat/anyaglista/kalkulátor hívókkal együtt.
3. **QA-05**: pgTAP izolálás, majd teljes helyi regresszió újrafuttatása; így a biztonsági kapu újra megbízható.
4. **QA-03 és QA-04**: kalkulátor állapotmegőrzés és hiányos mentési szerződés; ezek után izolált A–E E2E.
5. **QA-06**: történeti revízió-hozzáférés; a QA-07 UI-szöveg tétel lezárult.

## 14. Függőségi és regressziós kockázatok

A munkanapló adatbetöltője UI-t és PDF-et szolgál ki, ezért QA-01 javítása mindkettőn, két tervvel és 100 fölötti adatszámmal ellenőrzendő. Az anyagbetöltő számos ajánlat-, anyaglista- és kalkulátor-hívó közös útvonala, ezért QA-02-nél ne csak a termék-részletet vizsgáld. QA-04 szakmai termékdöntést igényel a hiányos piszkozat kezeléséről; a régi immutable snapshotot nem szabad átírni. QA-05 tesztmódosítás nem RLS-policy módosítás; a M3 aktív kalkulációs link szándékos tagi láthatóságát meg kell őrizni.

## 15. Senior engineering értékelés

A moduláris felépítés, a közös domain motor, szerveres újraszámítás, immutable revízió és restricted writer alapja a vizsgált kódútvonalakon követhető. A pénzügyi contract-tesztek nem találnak ki áfát, a geometriai tesztek ellenőrzött példákat tartalmaznak. A megbízhatóságot jelenleg a csendes adatmennyiségi korlátok, a kalkulátor munkamenet-állapotvesztése és a nem zöld DB regressziós kapu korlátozza. A mobil használhatóság, teljes E2E, hostolt jogosultság és SaaS/pilot alkalmasság nem minősíthető bizonyítottnak. **Következő legfontosabb mérföldkő:** QA-01 teljes munkanapló/riport adatútvonalának javítása és 100 fölötti, izolált regressziója.

**Ténylegesen használt útmutatók:** `ponytail-audit`, `verification-before-completion`, `supabase`, `frontend-testing-debugging`; a projekt `AGENTS.md` és `CLAUDE.md` elsőbbséget élvezett. Nem telepítettem skillt, plugint vagy csomagot.

**Javasolt dokumentációs commit:** `docs(QA-2026.10): record full-system audit findings and verification gaps`
