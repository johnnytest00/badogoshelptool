# Tesztmátrix

## F9.17 — globális Liquid Glass interakció és visszajelzés

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Megosztott interakciós réteg | IMPLEMENTED / CODE REVIEWED | `AppInteractionProvider`, `useUnsavedChangeGuard`, `GuardedLink`, accessible dialog, deduplikált `role=status/alert` toastok, route skeletonök és pending spinner. Native `confirm`, `popstate`, click-capture vagy History API hack nincs. |
| Dirty guard / internal navigation | BROWSER VERIFIED (LOCAL DEMO) | Meglévő felmérésen szerkesztés → „Vissza” → „Maradok”: URL és piszkozat maradt; ismétlés → „Kilépés mentés nélkül”: lista megnyílt, mentett érték érintetlen. Tiszta mentés után visszalépés figyelmeztetés nélkül. |
| Save success / revision | BROWSER VERIFIED (LOCAL DEMO) | A 10 000 mm DEMO értéket 10 002 mm-re mentettem V2-ként, majd 10 000 mm-re visszaállítva V3-ként mentettem. Toast: „Felmérés mentve”; újranyitáskor V3 / 10 000 mm; utána nem volt guard warning. Csak lokális DEMO rekord, két új revision. |
| Dialog keyboard / semantics | BROWSER VERIFIED | Accessibility tree-ben címsor, szöveg és gombok. Tab a fókuszt a dialogon belül mozgatja; Escape bezár, fókusz a megnyitó gombra tér vissza. A project archive megerősítés megjelent és megszakítottam; archív művelet nem futott. |
| `beforeunload` | PARTIAL | Dirty `tab.reload()` próbálkozásakor az oldal és a piszkozat maradt; a CUA in-app browser nem tette hozzáférhetővé a natív dialógust. A `warnBeforeUnloadIfDirty` helper Vitestje lefedi a dirty és clean eseményt. A böngésző szövege és stílusa nem testreszabható. |
| Back/forward | PLATFORM LIMITATION | Next.js 16 App Router `Link.onNavigate` a támogatott belső navigációkat védi. Nincs támogatott SPA history-back blocker; nem használtam fragile history interceptet. Browser back/forward nem garantáltan blokkolható. |
| Responsive / light-dark | BROWSER VERIFIED (EMULATED) | Survey: 1440/768/390/320 CSS px, document és body width minden ponton a viewporttal egyezett. Világos/sötét váltást megtekintettem; az eredeti sötét mód visszaállítva. Fizikai Safari/eszköz nincs. |
| Reduced motion / browser emulation | CODE REVIEWED / NOT BROWSER VERIFIED | `prefers-reduced-motion` stílusok jelen vannak; a CUA böngésző csak viewport override-ot hirdet, reduced-motion media emuláció nincs. |
| Loading / throttling | IMPLEMENTED / PARTIAL | App Router loading boundary a fő workflow-kban, késleltetett route skeleton reveal és local pending indikátor. Nincs mesterséges wait. Network throttle és lassú betöltés böngészős próba nem futott. |
| Error / retry | PARTIAL | Survey save invalid/rejected/uncertain hibáira közös toast és inline üzenet; szerverhiba/offline retry toast böngészőben nem szimulált ebben a milestone-ban. F9.16 korábbi offline retry bizonyítéka a mátrix F9.16 sorában marad. |
| Photo / geometry destructive confirmation | CODE REVIEWED / AUTOMATED FOCUSED | Fotó eltávolítás és geometria revízió discard a közös confirmation API-t használja; valódi fotótörlés és tetőgeometry browser-guard nem futott. Projekt archiválás csak modalig nyílt meg. |
| Adat / hozzáférés | NEM VÁLTOZOTT | UI/CSS, route guard és loading állapotok; schema, Auth/RLS, storage policy, számítási formula és domain contract változatlan. Hosted DB/Auth művelet, reset, migration, e-mail, commit, push, deploy nincs. |
| Automated quality gates | PASS, FOCUSED | `npm run test -- src/lib/unsaved-changes.test.ts src/features/field-surveys/field-survey-editor.test.tsx src/features/field-surveys/field-survey-photos.test.tsx src/features/projects/project-lifecycle.test.tsx src/features/projects/project-workflow-overview.test.ts src/features/roof-models/gable-roof-form.test.tsx src/features/roof-models/standalone-gable-preview.test.tsx src/features/roof-models/gable-metal-tile-covering-preview.test.ts src/features/gutters/gutter-calculator-ux.test.ts`: 8 fájl / 27 teszt PASS. `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build`, `git diff --check` PASS. Teljes Vitest regresszió nem futott. |

## F9.16 — Mobile Acceptance & Closed Beta Readiness

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| E-mail megerősítés / e-mail alapú ellenőrzés | NOT IMPLEMENTED / OUT OF SCOPE | Nem teszteltük, tesztlevelet nem küldtünk, nem implementáltuk, Supabase e-mail beállítás változatlan; hiánya nem elfogadási hiba. |
| Projekt rajzszekció | BROWSER VERIFIED / EXISTING | A megelőző F9.15.3 óta nincs kódváltozás: modellkártyák típus/neve/revízió, on-demand SVG, mentett forrásrevízió, zoom/pan/layers megmaradt. Geometria nem változott. |
| Workflow A: felmérés → eresz → mentés → újranyitás | BROWSER VERIFIED (LOCAL DEMO) | Új felmérés `28b500b5-fa5a-4a9a-acf7-619d190bb4b1`; 8,5 m szakasz, kalkulátorban pótolt 4000 mm szálhossz → 3 szál, 500 mm maradék. Előnézeti anyagbecslés; figyelmeztetései megmaradtak. Mentés és összesítőből a `6eee8b19-ebcb-4b5b-9f18-2c3f1f368965` V1 újbóli megnyitása sikerült. A forrásfelmérés változatlan; DEMO rekord helyben marad. |
| Workflow B: tető → gutter/flashing handoff | PARTIAL (LOCAL DEMO) | Tiszta DEMO projekt `b068a91c-b134-454d-a43e-1e3bdf9a4b80`, nyeregtető-model `84d286b5-f7aa-40b2-9cc3-5684a600947f`: bal eresz 10,000 mm → gutter V1 `182925f6-9675-4f38-9605-3ef504ed8155`, 4,000 mm-es DEMO szálhosszal 3 szál / 2,000 mm maradék; összesítőből V1 újranyitása ellenőrizve. Bal első ferde oromél 4,243 mm → Oromszegély kategória kézi handoff ellenőrizve; gyártói/kereskedelmi szálhossz és hasznos fedés hiányában nincs eredmény és mentés, helyesen nem találtam ki adatot. |
| Workflow C: projekt → tető → takeoff → ajánlatpiszkozat | PARTIAL (READ ONLY) | Meglévő projekt tetőmodelljei és takeoff oldala megnyílt; a takeoff forrásai elavultként voltak jelölve. Meglévő Belső ajánlati piszkozat V1 refresh után ugyanazt a 2 forrástételt és HUF nettó összeget töltötte vissza, a szerkesztett sor „Nincs import” értéket mutatott. Aktuális roof revision → takeoff → quote sor importot nem igazoltam; nem mentettem és nem hoztam létre ajánlatot. Jóváhagyás/final issuance nem történt. |
| Workflow D: survey fotófeltöltés | BROWSER VERIFIED (LOCAL DEMO) | Szintetikus érvényes 64×64 PNG feltöltése és mentése a survey `28b500b5-fa5a-4a9a-acf7-619d190bb4b1` V3-hoz; refresh/újranyitás után kép, név és szakasz-kapcsolat megmaradt. Hibás PNG-t a UI helyesen visszautasított. HEIC/HEIF fizikai teszt nincs. |
| Mentés megszakított hálózattal / újrapróbálás | BROWSER VERIFIED (LOCAL DEMO) | DevTools Offline alatt új survey POST `ERR_INTERNET_DISCONNECTED`; a felület bizonytalan állapotot és biztonságos újrapróbálást jelzett. Online visszakapcsolás után ugyanazon adatok újrapróbálása egy survey V1-et hozott létre (`9ef7d945-aae8-4a4c-ab25-85fc9a2e0853`), nem látszott duplikált rekord. Helyi pgTAP/idempotencia-integration tesztek is PASS; valódi instabil Wi-Fi nincs modellezve. |
| Workflow E: beállítások / account access | RÉSZBEN KORÁBBI BIZONYÍTÉK | F9.15.0/F9.14.9 helyi UI és account-management tesztjei korábban dokumentáltak. F9.16 ezen a futáson nem ismételte meg mobilon. |
| Survey/Auth/RLS integráció | PASS, LOCAL | `RUN_LOCAL_SURVEY_WORKSPACE_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/features/field-surveys/workspace.local.integration.test.ts`: 1 fájl, 3/3 teszt. Helyi, elkülönített owner/peer/outsider identitások és fixture; hosted tenant izolációt nem bizonyít. |
| Survey/photo/storage pgTAP | PASS, LOCAL | `SUPABASE_TELEMETRY_DISABLED=1 node_modules/.bin/supabase test db --local supabase/tests/database/023_field_surveys.sql supabase/tests/database/024_field_survey_photos_handoff.sql supabase/tests/database/025_field_survey_mobile_retry.sql supabase/tests/database/026_unified_field_survey_workspace.sql`: 4 fájl / 109 assertion PASS. A teljes DB suite nem futott. |
| Migrációs előkészítés | PASS, LOCAL ONLY | `supabase migration list --local` a repó legutóbbi `20261015161100` migrációjáig egyezett. Ez helyi DB állapot; hosted migrációlista, drift és rollout nem vizsgált. |
| Mobile viewport és render | BROWSER EMULATED / PARTIAL | Hitelesített Brave-ben survey szerkesztő 390/320 px-en vizuálisan; takeoff oldal 390/320 px-en megtekintve, mindkét szélességen `clientWidth = scrollWidth = body.scrollWidth`. Korábbi F9.15.3 projektoldal: 1440/768/390/320 overflow mérések PASS. F9.16 alatt téma, skála, soft keyboard, fizikai érintés/SVG touch, Safari/iOS, tablet és valós instabil Wi-Fi nem ellenőrzött. |
| Stabil/izolált szerver | NEM TELJESÜLT | Auth-olt UI `localhost:3000` meglévő Next.js fejlesztőszerveren futott; külön izolált, prod-szerű acceptance szerver nem indult. A build csak izolált másolaton készült, azt nem szolgáltam ki böngészőből. |
| Runtime console | PARTIAL | A böngészőben tesztelt oldalakon nem volt alkalmazáshiba konzolüzenet. Az Offline próba szándékos POST hibája `ERR_INTERNET_DISCONNECTED` volt; a helyreállító üzenet megjelent. Az Issues panel jelzései és minden route teljes konzolja nem lett auditálva. |
| Érzékeny naplózás | CODE REVIEWED / PARTIAL | `src/` alatt egy explicit `console.error` találat van: a survey photo upload hibánál csak HTTP `status` és `statusCode` kerül naplóba; kép, signed URL, token, jelszó és FormData nem. Éles log/monitoring hozzáférés és szerver futásidejű audit nem ellenőrzött. |
| Automated quality gates | PASS, FOCUSED | Survey/photo/gutter Vitest: 10 fájl / 46 teszt; `npm run typecheck`; `npm run lint`; `npm run build` Next.js 16.4.0 webpack izolált `/private/tmp/f916-build-20261016` másolaton `.env.example` placeholder publikus Supabase értékekkel; `git diff --check`. Teljes Vitest regression nem futott. |
| Production env / hosted release | HOSTED UNVERIFIED | Env loader két publikus Supabase változót validál; helyi Auth `site_url` 127.0.0.1:3000. Hosted redirect allowlist, RLS/Storage, backup/restore, logging/monitoring, deployment és rollback nem ellenőrzött. Lásd `docs/F9.16_MOBILE_ACCEPTANCE_CHECKLIST.md` és `docs/PRODUCT_READINESS_AUDIT.md`. |
| Fizikai eszköz / kiadási döntés | MANUAL / BLOCKING | iPhone/iPad Safari, kamera, iOS billentyűzet/viewport, HEIC/HEIF, gyenge hálózat, app reload és recovery: MANUAL / UNVERIFIED. A local beta preflight nem COMPLETE, zárt béta nem engedélyezhető ezen bizonyíték alapján. |

## F9.15.3 — egységes projektmunkaterület

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Projekt-workspace render és navigáció | BROWSER VERIFIED | Auth-olt helyi DEMO oldalon a 8 workflow, projektadatok, szerkesztő, kivitelezés, modellek, rajzok, kalkulátorok és alsó üzleti hivatkozások megjelentek. A szerkesztő megnyitása és a kivitelezési disclosure/rajzréteg kibontása nem mentett adatot. |
| Mentett tetőmodell | BROWSER VERIFIED | Mindkét kártyán típus, modellnév, revízió és tényleges terület látszott. Első modell megnyitása a meglévő modell URL-re és szervezeti query-re navigált. |
| Rajz és kalkulátor | BROWSER VERIFIED | Mindkét mentett rajz megjelent, a „Nézetek és rétegek” kibontásakor a nézet és hat réteg vezérlői megjelentek. Ereszcsatorna-kalkulátor megnyílt ugyanazzal a projekt- és szervezeti kontextussal; mentés nem történt. |
| Vizuális görgetés | BROWSER VERIFIED | Desktop felső rész, középső kivitelezési/fotó/ajánlat rész és alsó oldalszakasz megtekintve. 390/320 px emulált nézeten a keskeny kártyák és hosszú szövegek tördelődtek. A korábbi F9.15.2 capture a változás előtti összevetéshez elérhető volt; screenshot-pár külön fájlként nem lett exportálva. |
| Responsive túlcsordulás | PASS, EMULATED | 1440, 768, 390, 320 CSS px-en a `documentElement.clientWidth`, `documentElement.scrollWidth` és `body.scrollWidth` a viewporttal egyezett. 125%-os ideiglenes szöveg/felület skálán 390 px-en mind 390 maradt. A skálázás inline QA beállítása frissítéssel visszaállt. |
| Vitest | PASS, FOCUSED | `npx vitest run src/components/ui/glass-disclosure.test.tsx src/features/roof-models/project-roof-drawings.test.ts src/features/roof-models/technical-drawing.test.tsx src/features/projects/project-workflow-overview.test.ts`: 4 fájl / 9 teszt. Teljes Vitest suite nem futott. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `/private/tmp/f9153-build` másolaton `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` mind lefutott. |
| Üzleti adatok / hozzáférés / geometry | VÁLTOZATLAN | Read-only DEMO navigáció; nem mentett üzleti rekordot. Nincs migration, Auth/RLS változás, számítási vagy geometriai módosítás. |
| Eszközök és korlátok | PARTIAL | Auth-olt Brave böngésző emuláció; fizikai mobil, Safari, screen reader, külön mentett before/after képfájlok és teljes suite nem ellenőrzött. |

## F9.15.1 — projekt UX és mobil navigáció

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Projekt részletező és nyolc workflow | BROWSER VERIFIED | Helyi Auth DEMO projekt oldalon mind a nyolc meglévő hivatkozás, Projektműveletek menü és a projektadat → kivitelezési tartalom sorrend megjelent; a query szervezeti kontextusa megmaradt. Ereszcsatorna link megnyitása read-only volt, a meglévő DEMO geometria-elavultság jelzés láthatóvá vált. |
| Projekt részletező címsorok | BROWSER VERIFIED (DESKTOP + 390 PX EMULATED) | Egy-egy címsor maradt a workflow, alapadat, tetőmodell és tetőrajz szekcióknál; a redundáns üres tetőmodell magyarázat eltűnt. A szakmai/pénzügyi/adatintegritási figyelmeztetés és mind a 8 workflow link/status változatlan, accessibility tree-ben ellenőrizve. |
| Mobil dashboard | BROWSER VERIFIED (EMULATED) | 320 px: köszöntő rejtve, mindkét meglévő fül és mind a hat funkciókártya elérhető; Aktuális munkák fül működött. |
| Mobil keresés és szűrőpanel | BROWSER VERIFIED (EMULATED) | 320 px: keresés önálló GET-tel, panel nyitás, státusz/rendezés/archivált piszkozat, bezárás/elvetés, újranyitás, Apply, Reset és Reset alkalmazása. Az F3 keresés minden művelet után megmaradt; az URL-paraméterek frissítés és újranyitás után visszatöltődtek. Escape után a fókusz a Szűrők gombra tért vissza. |
| Desktop szűrés | BROWSER VERIFIED | Helyi GET keresés két F3 DEMO projektre szűrt; az üres `status` és `projectType` paraméterek nem okoztak schema hibát. |
| Responsive szélesség | BROWSER VERIFIED (EMULATED) | List/dashboard: 390/768/1024/1440 px mérések document/body width-je megegyezett a viewporttal. Részletező: 320 és 1440 px; 320 px-en inner/document/body width egyaránt 320. |
| Vitest | PASS, FOCUSED | Dashboard és projektlista tesztjei, valamint workflow overview és lifecycle regresszió: 4 fájl, 14 teszt. Teljes suite nem futott. |
| Kiegészítő UI tesztek | PASS, FOCUSED | `npx vitest run src/features/projects/project-workflow-overview.test.ts src/features/roof-models/project-roof-drawings.test.ts src/features/roof-models/technical-drawing.test.tsx`: 3 fájl / 7 teszt PASS. `npm run typecheck`, `npm run lint`, `git diff --check` PASS; teljes suite és build nem futott. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, izolált másolaton `npm run build` Next.js 16.4.0 webpack, `git diff --check` mind ténylegesen lefutott. |
| Téma és scaling | BROWSER VERIFIED (EMULATED) | Világos és sötét téma mobilon, sötét desktopon megtekintve. Mobil quick scaling 80% szöveg / 150% felület végponttal ellenőrizve; az eredeti 100% / 115% érték visszaállítva. |
| Képernyőképek | RÖGZÍTVE A QA MENETBEN | Mobil szűrőpanel, világos mobil dashboard, sötét desktop dashboard, sötét desktop projekt munkaterület vizuális capture készült. A Brave fejlesztői környezet ikonja a nézeten maradt. |
| Fizikai eszköz / screen reader | NEM ELLENŐRZÖTT | Emulált Brave és accessibility tree használva; fizikai iOS/Safari és külön screen reader nem futott. |
| Jogosultság / tartós adat | VÁLTOZATLAN | Auth-olt DEMO session, read-only útvonalak; rekordot nem mentettem. Nincs DB, Auth, migration, domain vagy kalkulációs változás. |

## F9.15.0 — settings, mobil fejléc és márka

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Settings popover / fiókdialog | BROWSER VERIFIED | Hitelesített helyi dashboardon a Settings felső gombja nyitja a kompakt Appearance popovert; a Fiókbeállítások gomb a meglévő fiókdialogot nyitja. A meglévő session/Auth-űrlapok működtek; jelszó/e-mail küldés nem történt. System magyarázat csak System módban jelenik meg. |
| Mobil header és fiókmenü | BROWSER VERIFIED (EMULATED) | 390/320 px: egysoros márka, quick theme, settings és account action; fiókmenüben e-mail/szervezet, Fiókbeállítások és Kilépés elérhető. A külön quick-scaling buborék nem azonos a header Settings vezérlővel. |
| Gyors scaling és végpontok | BROWSER VERIFIED | 320 px-en 80/150% UI értéknél inner/client/document width 320, header magasság 57,2 px, buborék jobb széle 308 px. 200% szövegnél a fejléc egysoros, a beállítások mobilon gördíthető és a percentage oszlop kifér. A 100/115/100/100 érték visszaállítás és reload után is megmaradt. |
| Responsive mátrix / navigáció | BROWSER VERIFIED (EMULATED) | Dashboard: 1440/1024/768/390/320 CSS px. A `documentElement.scrollWidth` minden ponton megegyezett a viewporttal. Helyi Auth munkamenetben Dashboard → új felmérés és Projektek útvonal read-only megnyitása; survey/project rekord nem mentődött. |
| Márkaikon / app icon | BROWSER VERIFIED | A felhasználó által adott ikon a fejlécben és loginon; `src/app/icon.png` és `apple-icon.png` generált változat. Brave lapfülön az ikon látható. A generikus Next favicon nincs duplikálva. |
| Adat, Auth-jogosultság, geometria | UNCHANGED | Csak UI/CSS, ikon és preferences scaling default/range változott; a preference parsing megőrzi az explicit mentett értékeket. Auth modal működése csak vizuálisan változott; Auth-integrációs teszt nem kellett. Nincs migration, hosted DB/auth vagy üzleti adat írás. |
| Tesztek / build | PASS, FOCUSED | `npx vitest run src/features/preferences/scaling-controls.test.ts src/components/theme/theme-toggle.test.tsx src/features/auth/account-management.test.ts src/features/dashboard/dashboard.test.ts`: 4 fájl / 14 teszt. `npm run typecheck`, `npm run lint`, izolált másolaton `npm run build` Next.js 16.4.0 webpack, `git diff --check` mind PASS. Teljes Vitest suite nem futott. |
| Korlátok | PARTIAL | Emulált Brave; fizikai eszköz, Safari, screen reader és prefers-reduced-motion browser útvonal nem ellenőrzött. E-mail/jelszó frissítés nem submitolt. |

## F9.7.6.6.1 — standalone quotation backend

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Standalone ownership/schema migration | Sikeres helyi alkalmazás | History 20261014020200-nál állt; `20261014030000` unapplied volt. Incremental `supabase migration up --local` sikeres, reset nélkül. |
| GUC-megkerülés / RLS | pgTAP + Auth PASS | SECURITY DEFINER save RPC, direct standalone parent/revision INSERT/UPDATE denied, ledger INSERT denied; hamis GUC-es pgTAP is PASS. Public CREATE nincs authenticated/anon számára. |
| Draft/revision, kézi sorok és HUF totals | Sikeres | `018_standalone_quotations.sql`: 33/33 pgTAP; Auth harnessben LABOR/OTHER, 2.5 × 5.25 → HUF 13.13, zero, precision/negative/large rejection. |
| Catalog validation/snapshot | Sikeres | Auth harness 43/43: authorized MATERIAL, manual override, catalog snapshot megmarad későbbi árváltozás után, másik org variáns denied. |
| Creator isolation / forged IDs | Sikeres, helyi Auth | Harness 43/43: két Auth-issued JWT; creator list/current/history, same-org noncreator és cross-org read/write denial; direct parent/revision/ledger és forged creator elutasítva. |
| Next Server Action / browser cookie útvonal | F9.7.6.6.1b-ben PASS | Host Brave smoke alatt valós helyi Auth session-cookie után a produkciós quotation action függvények Next Server Action runtime-ból futottak. Részletek az 1b acceptance szekcióban. |
| Expected version / real concurrency | Sikeres, két backend | Két párhuzamos authenticated RPC-t két waitelő PostgreSQL backend-sessionnel figyeltünk. Create retry: egy quote+revision; same-V1 V2: egy success + egy `40001`, V1 változatlan. |
| Project quotation regression | PASS, célzott | pgTAP 002–004: 27/27 PASS; 1b alkalmazásellenőrzés: authorized draft/V2, létező approved takeoff kapcsolat és accepted quotation módosításának tiltása. PDF nem backend acceptance feltétel; standalone PDF nincs implementálva. |
| Docker/Supabase/migration history | Sikeres helyi diagnosztika | Socket-jogot szűkítve Docker 29.8.0; local DB/API elérhető, `linked_project=null`; 030000 apply sikeres. Opcionális imgproxy/edge/analytics/vector/pooler szolgáltatások leálltak. |
| Vitest/typecheck/lint/build/diff/DB lint | PASS | 1b: Vitest 3 fájl/10 teszt, typecheck, lint, production build és diff check mind ténylegesen lefutott és sikeres. `db lint --local` korábbi futás: exit 0, csak korábbi standalone calculation/flashing warnings. |

## F9.7.6.6.1b — alkalmazás-elfogadás

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Next Server Action + SSR cookie/session | PASS | Helyi valós Auth user a Next actionben jelentkezett be; az SSR kliens által írt session cookie a következő action requestekben hitelesítette a műveleteket. Nincs mock Auth. |
| Standalone create/read/list/V2/history | PASS | 15 owner assertion: manual MATERIAL és LABOR mentés, katalógus-feloldás, saját lista, read, expected V1-es V2, immutable V1, stale V1 `CONFLICT`, érvénytelen ID és hamisított org azonosító elutasítva. |
| Negatív felhasználói hozzáférés | PASS | Külön aktív tag JWT-je saját creator-idegen quote-ot `NOT_FOUND`-ként kapott; visszavont tagságú user lista és mentése `FORBIDDEN`. Hibaüzenet nem szivárogtatott SQL részletet. |
| Pénzügy / lifecycle | PASS | Action-válasz HUF nettó összeget és `priceClass`-t ad `vatAmount` nélkül; kevert nettó/bruttó validációs hiba. Projekt-finalize action standalone quote-ra elutasít. VAT engine/finalize nem került be. |
| Projekt-quotation alkalmazás-regresszió | PASS | Meglévő approved takeoff itemmel project `saveQuotationDraftAction` V1/V2 sikerült; meglévő accepted quote piszkozatként nem volt módosítható. |
| Frontend / böngészős szerkesztő | Nincs implementálva / nem ellenőrzött | Csak az ideiglenes local acceptance fixture oldalt használtuk az action hívásához; a fixture-t eltávolítottuk. Quote editor UI F9.7.6.6.2 feladata. |

## F9.7.6.6.2 — standalone quotation frontend

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Állapotfüggvények: nettó címkék, revision nézet, idempotens retry | PASS | `npx vitest run src/features/quotations/standalone-quotation-ui-state.test.ts`: 3/3. |
| Standalone domain-validáció és fixed-point pénz | PASS | `src/domain/quotations/standalone.test.ts`, `money.test.ts`: LABOR/OTHER, üres draft, pontosság és vegyes net/gross ellenőrzés. |
| Draft recovery és secure UUID regresszió | PASS | A fókuszált futásban `quotation-draft-recovery.test.ts` és `secure-uuid.test.ts` is lefutott; mind az 5 fájl együtt 18/18 PASS. |
| Typecheck / lint | PASS | `npm run typecheck`, `npm run lint` ténylegesen lefutott a frontend változtatások után. |
| Production build | PASS | `npm run build` Next.js 16.4.0 webpack; mindhárom globális standalone quotation route bekerült a build route listájába. |
| Diff ellenőrzés | PASS | `git diff --check` a módosítások és dokumentáció után. |
| Authenticated browser workflow, create/reopen/V1–V2/history/project regression | PARTIAL / UNVERIFIED | F9.7.6.6.2a alatt a helyi authenticated DEMO overview (üres standalone lista + projektajánlat-linkek) és az új editor megnyílt; draft-only és nettó HUF jelölés látszott. Korábbi nem mentett recovery elvetve. A Brave ezután másik privát ablakra váltott Google belépési kihívással; a sessiont nem kerültük meg. Mentés, ID, reload, V2, history, katalógus és projektlink megnyitása nem igazolt. Nem bizonyított kódhiba; kódot nem módosítottunk. |
| DB / pgTAP / concurrency | Nincs újrafuttatva, változatlan szerződés | Nem volt backend-contract vagy migration változás; F9.7.6.6.1b történeti bizonyítékait nem ismételtük. |

## F9.7.6.6.2a — E2E acceptance kísérlet

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Helyi authenticated DEMO overview | PASS | `/ajanlatok` renderelte az üres standalone listát, meglévő project quotation sorokat és azok navigációs linkjeit. A link megnyitása nem lett ellenőrizve. |
| Standalone új editor megnyitása | PASS | „Új árajánlat” az `/ajanlatok/uj` route-ra navigált; a draft-only figyelmeztetés és nettó HUF tájékoztató látható volt. Korábbi session recovery-t elvetettük. |
| Draft V1 → reload/reopen → V2 → historical V1 → current V2 | UNVERIFIED | Mentésig nem jutottunk. A Brave másik privát ablakra váltott Google login challenge-re, majd a TetőPro ablak visszahívásakor ismét fókuszváltás történt. Nem léptünk be újra és nem kerültük meg a kihívást. |
| Kódjavítás / automatizált teszt | Nincs szükség | A browser blokkolás nem alkalmazáshiba; kód nem változott. Korábbi sikeres static/backend teszteket nem ismételtünk. |

## F9.7.6.6.3.1 — architektúra-terv

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Aktuális adat- és alkalmazáskontraktok | PASS, célzott olvasás | F8.1 quotation schema, F8.3.1 finalize, F8.3.2 lifecycle, standalone migration/action, project PDF route és shared React-PDF renderer; organizations/clients mezők ellenőrizve. |
| Design és dokumentumkonzisztencia | PASS | `docs/QUOTATION_FINALIZATION_DESIGN.md`, `STANDALONE_WORKFLOWS.md` és `PROGRESS.md` rögzíti a jelenlegi tényeket, hiányzó mezőket, tax boundaryt, biztonságot, sorrendet és open decisionöket. |
| `git diff --check` | PASS | Ténylegesen lefutott a docs-only változtatások után. |
| Vitest / typecheck / lint / build / DB / browser | Nem futott | Nincs kód- vagy DB-változás; architektúra-feladatban browser nem volt szükséges. |

## F9.1.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Annotációs geometria | Fókuszáltan sikeres | 3 teszt: kompakt offset, aligned normál, szögív és címkepozíció |
| F5/F6 geometriai invariáns | Sikeres | A rajzmodell továbbra is az F5 kimenetből képez; számítási modul nem módosult |
| Viewport és rétegek | Fókuszáltan sikeres | Fit/reset a látható modellel számol; existing pan/pinch kód változatlan |
| Teljes ellenőrzés | Sikeres | 22 Vitest-fájl / 82 teszt, typecheck, lint, `git diff --check`, build és egy browser smoke PASS |

## F8.3.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Lifecycle state machine | Sikeres | 4 engedélyezett előrelépés; reopening és terminális átmenetek Vitestben elutasítva. |
| Status history schema/RLS | Sikeres | Append-only tábla, szervezeti read policy, közvetlen authenticated INSERT tiltás. |
| Atomic transition RPC | Sikeres | SECURITY INVOKER, FOR UPDATE, expected version, finalized revision konzisztencia. |
| Finalization regresszió | Sikeres | F8.3.1 finalize RPC és pénzügyi state constraint megmaradt. |
| Legacy compatibility | Sikeres | Korábbi finalized rekord státusztörténet nélkül olvasható; visszamenőleges esemény nem készült. |
| UI status filter/actions | Sikeres | Öt magyar státusz, állapotfüggő gombok és terminális állapotban nincs átmeneti akció. |
| Browser lifecycle smoke | Sikeres | Finalized → sent → accepted, timeline, 27 498,50 HUF változatlan, PDF megnyílt. |
| pgTAP | Sikeres | 003_quotation_finalization.sql + 004_quotation_lifecycle.sql: 19/19 PASS. |
| Vitest | Sikeres | 21 fájl / 79 teszt PASS. |
| Typecheck, lint, build | Sikeres | Mindhárom végső ellenőrzés PASS. |

## F8.3.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Finalization migration | Sikeres | 20261013030000 quotation_finalization + RPC-korrekciós migration; local DB push, reset nélkül. |
| Finalization pgTAP | Sikeres | 8/8 PASS: enum, mezők, state constraint, guard trigger, RPC és authenticated EXECUTE. |
| Quotation list/search/filter | Sikeres | Projektoldali lista, referencia/ügyfél keresés és draft/finalized filter browserben látható. |
| Review/finalize/lock | Sikeres | Review panel ügyféllel, v2-vel, 2 tétellel és 27 498,50 HUF nettó összeggel; finalize után locked állapot. |
| Immutable PDF | Sikeres | A véglegesített PDF preview külön tabban megnyílt; route a finalized_revision_id-t használja. |
| Duplicate finalized quotation | Sikeres | Új ID, v1 draft és szerkesztő nyílt meg; az eredeti v2 finalized, 27 498,50 HUF maradt. |
| Vitest | Sikeres | 20 fájl / 77 teszt PASS. |
| Typecheck, lint, build | Sikeres | npm run typecheck, npm run lint, npm run build PASS. |

## F8.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Pénz referenciaesetek | Sikeres | 4/4 Vitest; 18 750,00 + 7 498,50 = 26 248,50 HUF. |
| Typecheck | Sikeres | `npm run typecheck`. |
| Lint | Sikeres | `npm run lint`. |
| Supabase F8.1 migration / pgTAP | Sikeres | Lokális fejlesztési DB reset nélkül; külön shadow replay; 180/180 PASS. |
| Browser F8.1 workflow | Sikeres | Local DEMO user → projekt → ügyfél → katalógus-anyag + munkadíj → 26 248,50 HUF → mentés/reload. A sorváltozás idempotenciahibáját javítás után új revízióval ellenőriztem. |
| F8.1 domain/regresszió | Sikeres | 20 Vitest fájl / 77 teszt PASS; a módosítás után typecheck, lint és célzott pénzteszt PASS. |

## F7.3.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Katalógusmapping és provenance | Sikeres | Explicit mezők, kézi prioritás, hiányzó hasznos szélesség és releváns specs-változás Vitestben; névlegesből nincs implicit hasznos szélesség. |
| Verziózott layout mentés | Sikeres | SECURITY INVOKER RPC; immutable V1/V2/V3 history, current pointer, két dependency és material variant FK. |
| Idempotens és konkurens mentés | Sikeres | Azonos input nem készít új revíziót; stale expected revision `40001` hibával elutasítva. |
| Szervezeti/projekt izoláció | Sikeres | Cross-org variáns, cross-project forrás és nem-tag mentés pgTAP-ban elutasítva; RLS aktív. |
| Stale és történeti snapshot | Sikeres | Tetőrevízió-váltás stale státuszt ad; V1 output V2 után változatlan, történeti anyag és geometria visszanyitható. Ár nincs a geometriai stale összevetésben. |
| Anyagkimutatás-átadás | Sikeres | `square_meter`: hiteles `combinedRoofM2` + explicit ráhagyás, atomikus draft+item; nincs auto-approval. `piece` automatikus konverzió elutasítva. |
| Approved immutabilitás | Sikeres | Korábbi approved kimutatás változatlan; meglévő trigger-regresszió PASS. |
| Migráció és replay | Sikeres | Nem linkelt local DB-re reset nélkül alkalmazva; teljes lánc disposable shadow DB-n, `No schema changes found`. |
| pgTAP | Sikeres | **172/172 PASS**, a korábbi 146 ellenőrzés megőrzésével. |
| Vitest | Sikeres | **19 fájl / 73 teszt PASS**. |
| Typecheck, lint, build | Sikeres | TypeScript, ESLint és Next.js webpack production build hibamentes. |
| Fókuszált browser-flow | Sikeres | Valós local projekt/tető → DEMO variáns → V1/V2/history → roof stale → V3 → square-meter draft, jóváhagyás nélkül. |
| SVG/touch regresszió | Változatlan | Pointer/pan/pinch/fit/reset kód és a fizikailag iPhone-on ellenőrzött instrukció változatlan. |
| Távoli Supabase | Nem használt | Nincs link, login, remote migration vagy hosted adatváltozás. |

## F7.3.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Calculator Registry | Sikeres | `covering.metal-sheets.layout` 1.0.0 regisztrálva és registry-n keresztül futtatva. |
| Referencia A | Sikeres | 12 500 / 1000 mm: 13 sáv/tetősík, 26 összesen, 12 teljes + 500 mm részleges intervallum. |
| Referencia B | Sikeres | 12 500 / 1250 mm: 10 sáv/tetősík, 20 összesen, nincs részleges intervallum. |
| Referencia C | Sikeres | 12 500 / 800 mm: 16 sáv/tetősík, 32 összesen, 500 mm részleges intervallum. |
| Bal/jobb indulás | Sikeres | A részleges sáv fizikai X-helye oldalt vált, a fedett hossz és darabszám változatlan. |
| Lemezhossz és ráhagyás | Sikeres | A 5625 mm geometriai hossz külön marad; a kézi ráhagyás csak az ideiglenes hosszt növeli. |
| Gyártási hosszkorlát | Sikeres | 5625 mm geometriai / 5725 mm ideiglenes hossz és 5000 mm maximum esetén `ABOVE_MAXIMUM_LENGTH`; nincs automatikus darabolás. |
| Tizedes milliméter | Sikeres | Szögből származó 6562,5 mm hossz és kézi tizedes paraméter elfogadott. |
| Renderbiztonsági határ | Sikeres | 400 sáv/tetősík felett strukturált hiba, csonkolás nélkül. |
| SVG geometriai leképezés | Sikeres | Mindkét tetősík, 26 sáv, 2 részleges sáv és kalkulált X-koordináták a felülnézeti rajzmodellben. |
| `Lemezkiosztás` réteg | Sikeres | Alapból kikapcsolt, külön checkboxszal kapcsolható; más nézetekben nem állít elő félrevezető sávgeometriát. |
| Touch viselkedés | Változatlan | F7.2.4 pointer/pan/pinch kód nem módosult; az új magyar instrukció böngészőben megjelent. |
| Fókuszált browser-flow | Sikeres | Mentett helyi nyeregtető → 1000 mm → 13/26 → réteg bekapcsolás → 26 SVG-sáv/2 részleges → jobb indulásra áthelyezés. |
| 320 px mobil smoke | Sikeres | Lemezkiosztási panel látható, 26 sáv renderelt, `scrollWidth === clientWidth`; fizikai mobilteszt nem történt. |
| Vitest | Sikeres | 18 fájl / 69 teszt. |
| Typecheck, lint, build | Sikeres | TypeScript, ESLint és Next.js 16.4.0 webpack production build hibamentes. |
| Adatbázis | Nem érintett | Nincs migráció, perzisztencia, Supabase- vagy RLS-változás; DB-teszt nem futott. |

## F7.2.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Mobil kontraszt, világos/sötét téma | Sikeres | Szemantikus foreground/muted/brand tokenekkel ellenőrizve a projektoldal, kártya, státusz, űrlap és kereső tényleges hátterein. |
| Back navigation | Sikeres | Új `BackNavigation` komponens, determinisztikus szülőútvonal, ikon, border, fókusz és mobil touch target. |
| Projektkereső elrendezés | Sikeres | Az ikon és input egy sorban maradt 320, 375, 390, 430, 768 és 1440 px méreten; nincs overflow. |
| Projektoldal és projektkártyák | Sikeres | Olvasható hierarchia, hosszú szöveghez törés, mobil dokumentum-overflow nélkül. |
| SVG viewport és toolbar | Sikeres | Négy nézet, zoom in/out, Fit, Reset és zoom százalék böngészőben ellenőrizve; Fit és Reset eltérő művelet. |
| SVG rétegek | Sikeres | Mind a hat checkbox elérhető; rétegkapcsolás böngészőben ellenőrizve. |
| SVG gesture matematika | Sikeres | Pan/pinch, zoom clamp, fókuszpont-megtartás, pointer cancel/release és fit bounds Vitestben ellenőrizve. Fizikai multi-touch nem szimulált. |
| Explicit responsive viewport QA | Sikeres | 320×700, 375×812, 390×844, 430×932, 768×1024, 1440×900; a vizsgált oldalaknál `scrollWidth === clientWidth`. |
| 200% szöveg / 150% UI skála | Sikeres | Helyi böngészőben elvégzett skálázási ellenőrzés; input és projektlista nem tört vízszintesen. |
| Vitest | Sikeres | 17 fájl / 58 teszt. |
| Typecheck, lint, build | Sikeres | Mindhárom parancs hibamentesen lefutott. |
| Fizikai iPhone multi-touch | Korlátozott | Ebben a környezetben nincs valódi eszközös kétujjas végrehajtás; kézi készülékteszt szükséges. |

## F7.2.4 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Pan indulása | Sikeres | A pan már az első pointer-deltára számolható, nincs külön drag threshold. |
| Pointer delta / 1:1 követés | Sikeres | Zoom-kompenzált pan és preserveAspectRatio-aware client→viewBox leképezés célzott Vitestben ellenőrizve. |
| Kezdőpont és ugrásmentesség | Sikeres | Letterboxolt SVG középpontja stabil; a kezdőpont nem tolja el a rajzot. |
| Pointer cancel/release | Sikeres | A megmaradó pointer újraalapozódik, üres pointerkészletnél a gesztus törlődik. |
| Pinch → pan átmenet | Sikeres | A pinch utáni egyujjas pan a tényleges aktuális pan/zoom állapotból indul. |
| Célzott Vitest | Sikeres | `drawing-viewport.test.ts`: 1 fájl / 7 teszt. |
| Typecheck | Sikeres | `npm run typecheck` hibamentes. |
| Lint | Sikeres | `npm run lint` hibamentes. |
| Fizikai iPhone touch pan | Felhasználó által ellenőrzött | A felhasználó F7.3.1 előtt fizikai iPhone-on sikeresen visszaigazolta az F7.2.4 pan működését. |

## F7.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F7.2 lokális migrációk | Sikeres | Takeoff séma, trigger-hardening és approval-policy migrációk helyi `supabase db push --local` után alkalmazva; remote kapcsolat nem történt. |
| Migrációs állapot | Sikeres | Mind a 9 lokális migráció egyező helyi állapotban van; `supabase migration list --local` local/remote oszlopa azonos. A konfigurációban deprecated `[inbucket]` nincs, `[local_smtp]` van. |
| F7.2.2 lineáris DEMO variáns | Sikeres | Helyi, egyértelmű DEMO `linear_meter` variáns, gyártó/specifikáció/ár nélkül. 12,5 m gerinchossz → 12,5 `linear_meter`; mentés, reload és DB mennyiség ellenőrizve. |
| F7.2.2 inkompatibilis egység | Sikeres | A `square_meter` variáns `linear` módszerrel szerveroldali, látható hibával elutasítva. |
| F7.2.2 approval concurrency | Sikeres | Két külön PostgreSQL-kapcsolat ugyanazon lokális DEMO draftra indított approvalt; egy approved eredmény, egy verzió/státusz elutasítás, nincs duplikált approval vagy részleges item-mentés. |
| F7.2.2 responsive QA | Sikeres | Dashboard, projektoldal, kalkulátor/SVG és anyagkimutatás 320/375/390/430 px explicit viewporton. A kezdeti dashboard és takeoff overflow javítva; újrateszt mindegyik méreten `scrollWidth === clientWidth`, offscreen vezérlő nélkül. |
| Lokális táblák | Sikeres | A teljes lokális séma ellenőrzött: `organizations`, `projects`, `calculations`, `material_products`, `material_variants`, `material_takeoffs`, `material_takeoff_items`. |
| Takeoff táblák | Sikeres | `material_takeoffs` és `material_takeoff_items`, szervezeti összetett FK-kal, draft/approved állapottal és snapshotokkal. |
| RLS és approval | Sikeres | Szervezeti olvasás/írás, admin-owner approval, draft-only item írás és approved immutabilitás pgTAP-ban ellenőrizve. |
| Forrásrevízió | Sikeres | Csak mentett, verified `roof.gable` output; implementáció- és input-séma-verzió ellenőrzött. |
| Domain referenciaesetek | Sikeres | 17 Vitest fájl / 56 teszt; 140,625 m² → 154,6875 m², 12,5 m gerinc, 25 m eresz, manual/piece tiltás. |
| pgTAP | Sikeres | 146/146 PASS helyi adatbázison. |
| TypeScript DB-típusok | Sikeres | `npm run db:types` helyi sémából lefutott. |
| `npm run typecheck` | Sikeres | Hibamentes. |
| `npm run lint` | Sikeres | Hibamentes. |
| `npm run build` | Sikeres | Next.js webpack production build; az új project-linked route elkészült. |
| Migration replay külön eldobható DB-n | Sikeres | A név szerint azonosított `f72_replay_20261012` lokális DB-n mind a 9 migráció lefutott; utána a disposable DB törölve lett, a fő lokális DB érintetlen maradt. |
| Böngészős F7.2 workflow | Sikeres | F7.2.1 területi/approval/stale/logout flow és F7.2.2 lineáris 12,5 m mentés/reload flow helyi DEMO adatokkal. |
| F7.2.1 böngészős create/draft | Sikeres | Helyi DEMO fiókkal meglévő projekt, rev. 2 forrás és valós draft létrehozás. |
| F7.2.1 quantity/persistence | Sikeres | 156,25 m² aktuális local outputból 10% ráhagyással 171,875 m²; manuális 2,5 m²; reload után mindkettő látszik. |
| F7.2.1 incompatible unit | Sikeres | Meglévő `square_meter` variáns lineáris módszerrel szerveroldalon elutasítva, látható magyar hibaüzenettel. `linear_meter` meglévő variáns nem volt. |
| F7.2.1 approval/immutability | Sikeres | Owner approval valódi UI-n; approved állapot reload után megmarad, szerkesztőform eltűnik, item/history snapshot read-only DB ellenőrzéssel megmarad. |
| F7.2.1 stale/new draft | Sikeres | Rev. 3 mentett módosítás után korábbi approved takeoff „Elavult számítási alap”, új rev. 3 draft létrehozható. |
| F7.2.1 logout protection | Sikeres | Logout után a takeoff URL login oldalra irányít `returnTo` paraméterrel, adat nem látható. |
| Concurrency DEMO-adat takarítás | Korlátozott | A már approved concurrency DEMO rekordot az immutable trigger szándékosan nem engedte törölni; az azonosított rekord lokális maradt, távoli adat nem érintett. |
| `npm audit` | Nem verifikálható | `ENOTFOUND registry.npmjs.org`; audit eredmény nem állt rendelkezésre. |

## F7.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F7.1 migráció | Sikeres | `20261012040000_material_catalog.sql` és `20261012040100_material_price_immutability.sql` helyi `supabase db push --local` után alkalmazva, reset nélkül. |
| Katalógustáblák | Sikeres | Gyártók, termékek, variánsok, árak létrejöttek. |
| RLS és szervezeti FK | Sikeres | 4/4 új tábla RLS-es; összetett gyártó/termék/variáns/ár FK-k és outsider tesztek PASS. |
| Árhistorika | Sikeres | 2 árverzió megmarad, latest ordering determinisztikus, update/delete trigger tilt. |
| Domain validáció | Sikeres | Kategória, egység, URL, provenance, nemnegatív méretek/ár és JSON objektum ellenőrzése. |
| pgTAP | Sikeres | 127/127 PASS helyi adatbázison. |
| TypeScript DB-típusok | Sikeres | `npm run db:types` lokális sémából futtatva. |
| Vitest | Sikeres | 16 fájl / 53 teszt. |
| `npm run typecheck` | Sikeres | Hibamentes. |
| `npm run lint` | Sikeres | Hibamentes. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build. |
| Helyi admin login | Sikeres | `admin1@testadmin.com` lokális Auth user, DEMO owner tagság, böngészőben belépés igazolva. |
| Anyagkatalógus browser workflow | Sikeres | Gyártó → termék → variáns → két árverzió → reload/detail → keresés → archive/restore. |
| Távoli Supabase | Nem használt | Link, login, push és remote adatbázis-módosítás nem történt. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba maradt fenn. |

## F6.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Rajzmodell referencia-koordináták | Sikeres | A 8000×12000×3000 mm F5 eset: X -250…12250, Y -4500…4500; eresz Z=-375, gerinc Z=3000. |
| Nézetek | Sikeres | Felülnézet, Oromoldal, Keresztmetszet és Oldalnézet ugyanabból a `GableRoofOutput`-ból. |
| Méret- és szögannotációk | Sikeres | Forrásuk F5 output; magyar `m`/`mm` formázás, hosszanti/függőleges/aligned méret. |
| Rétegek | Sikeres | Hat réteg kapcsolható, csak megjelenítési állapotot módosít. |
| Rajzmodell és viewport unit tesztek | Sikeres | 2026-10-12; 15 Vitest fájl / 50 teszt összesen. |
| `npm run typecheck` | Sikeres | F6.1 módosításokkal hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build. |
| Valós F5 böngészős workflow | Sikeres | Codex in-app browserben: mentett helyi tetőmodell, négy nézet, layer toggle, zoom/reset, élő input-frissülés és nem mentett előnézet. |
| Browser runner pre-flight | Korlátozott | Playwright/Puppeteer nincs a projektben; helyi Playwright Chromium bináris van, de runner nincs. Új függőség telepítése hálózati korlát és arányosság miatt nem történt. |
| Aktuális dokumentum-overflow smoke | Sikeres | Browser DOM-mérés: `clientWidth=1002`, `scrollWidth=1002`; a dedikált mobil viewportok nem voltak beállíthatók. |
| 320×700, 375×812, 390×844, 430×932, 768×1024, 1440×900 | Nem verifikált | A jelenlegi browser connectorban nincs viewport override; nem jelölöm PASS-ként. |
| RLS/Supabase regresszió | Nincs változás | F6 nem módosított migrációt vagy adat-hozzáférési réteget; a korábbi helyi pgTAP baseline változatlan. |
| Keskeny viewportok | Korlátozott | A vezérlő nem támogatott dedikált 320/375/390/430 px emulációt; CSS és accessibility tree vizsgálat történt. |
| Pinch gesztus | Kód + pure unit teszt | Kétpointeres állapot, fókuszpont-megtartás, clamp és cancel/release implementálva; browser multi-touch emuláció és fizikai eszköz nem állt rendelkezésre. |
| Anime.js | Nem alkalmazható | Nincs új animációs függőség; statikus rajz és reduced-motion CSS maradt. |

## F1.1 ellenőrzések

| Parancs | Állapot | Megjegyzés |
| --- | --- | --- |
| `npm audit` (előtte) | Sikeres audit-lekérdezés | 2026-10-12; 13 sérülékenység: 4 moderate, 7 high, 2 critical. |
| `npm install` frissítés | Sikeres | Next 16.4.0, Vitest 5.0.3, Vite 8.3.4, TypeScript ESLint flat config. |
| `npm audit` (utána) | Sikeres | 2026-10-12; 0 info/low/moderate/high/critical sérülékenység. |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 2 fájl / 4 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build, `/` statikusan generálva. |
| Böngészős smoke | Sikeres | 2026-10-12; kezdőoldal betöltött; Sötét mód kiválasztása, `Váltás: Világos` felirat, reload utáni perzisztencia és `Rendszer szerint` visszaállítás ellenőrizve. |

Megjegyzés: a Next 16 alapértelmezett Turbopack buildje portkötési hibával elhasalt a futtatókörnyezetben; a `npm run build` script webpack módot használ, amely sikeresen lefutott.

## F1.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Dashboard unit tesztek | Sikeres | 2026-10-12; 1 dashboard tesztfájlban 3 teszt, összesen 7 projekt-teszt sikeres. |
| Mobil-first grid szabály | Ellenőrizve | Alapértelmezett 1 oszlop, 640 px felett legfeljebb 2 oszlop, 960 px felett 3 oszlop; nincs fix kártyaszélesség. |
| Tab váltás | Sikeres | Böngészőben `Funkciók` ↔ `Aktuális munkák` váltás oldalújratöltés nélkül. |
| Billentyűzetes tab navigáció | Sikeres | Böngészőben ArrowLeft használatával visszaváltás ellenőrizve; utility teszteli mindkét irányt. |
| DEMO jelölés | Sikeres | Böngészőben a DEMO banner és projektcímkék láthatók. |
| Téma integráció | Sikeres | Világos/sötét mód, következő módot jelző címke és Beállítások → Rendszer szerint visszaállítás ellenőrizve. |
| Reduced motion | Ellenőrizve | `prefers-reduced-motion` CSS szabály tiltja a dashboard belépőanimációját és a hosszú átmeneteket. |
| Vízszintes túlcsordulás | Kód szerint ellenőrizve | Grid `minmax(0, 1fr)`, `overflow-wrap:anywhere`, nincs fix kártyaszélesség; külön mobil viewport-eszköz nem állt rendelkezésre. |

## F1.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Skálázási unit tesztek | Sikeres | 2026-10-12; összesen 9 teszt: alapértékek, független frissítés, clamp, hibás adat, reset, bubble állapot. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 4 tesztfájl / 9 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; webpack build, `/demo/meretezes` statikusan generálva. |
| Skálázási tartományok | Sikeres | Böngészőben szöveg 200%, UI 150%, rajz 200%; felső határon a növelő gomb letilt. |
| Perzisztencia és reset | Sikeres | Böngészőben reload után megmaradtak az értékek, reset 100%-ra állított. |
| Bubble nyitás/zárás | Sikeres | Böngészőben fix launcher, nyitás, aria-expanded, close gomb, click-outside és Escape logika. |
| Dashboard settings integráció | Sikeres | Beállítások panel ugyanazt a globális ScalingProvider állapotot használja. |
| DEMO SVG | Sikeres | Böngészőben látható; `viewBox` változatlan, 12,0 m-es felirat megmarad. |
| Light/dark és hydration | Sikeres | Téma integráció megmaradt, böngészőben nincs új hydration-warning a scale inicializálás után. |
| Mobil viewport vizuális ellenőrzés | Korlátozott | A böngészővezérlőben nincs viewport override; mobil reflow CSS alapján és accessibility tree-ben ellenőrzött, külön 320–430 px screenshot nem készült. |

## F2.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Repo/remote/git preflight | Sikeres | `main` ág és a konfigurált remote ellenőrizve; meglévő módosítások megőrizve. |
| Supabase CLI | Sikeres | 2.120.0 telepítve és működik; távoli login/link nem történt. |
| Docker runtime | Sikeres | Docker 29.8.0 daemon elérhető; a lokális Supabase konténerek healthy állapotban futnak. |
| SMTP konfiguráció | Sikeres | Deprecated `[inbucket]` helyett `[local_smtp]`; restart után nincs deprecation warning. |
| SQL/migráció statikus áttekintés | Sikeres | Öt tábla, FK-k, összetett tenant-kulcs, indexek, timestamp/version és RLS/grant szabályok elkészültek. |
| Helyi séma read-only ellenőrzés | Sikeres | 5 tábla, 5 RLS, 13 policy, DEMO seed rekordok és kritikus constraint-ek igazolva. |
| pgTAP adatbázisteszt | Sikeres | 2026-10-12; 1 fájl / 29 teszt, `Result: PASS`. |
| Migration replay / clean reset | Sikeres | `supabase db reset --local` kétszer sikeresen lefutott; remote célpont nem volt használva. |
| TypeScript DB-típusgenerálás | Sikeres | `supabase gen types typescript --local`; 258 soros generált fájl készült. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 4 fájl / 9 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js webpack production build, `/` és `/demo/meretezes` generálva. |
| `npm audit --audit-level=high` | Nem verifikálható | Az npm registry DNS-feloldása sikertelen volt; audit eredmény nem állt rendelkezésre. |

## F2.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Helyi Auth bootstrap | Sikeres | `npm run db:local-auth`; valódi lokális GoTrue-felhasználó és DEMO owner tagság létrejött. A jelszó csak futtatási input volt. |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 5 fájl / 12 teszt sikeres, köztük safe return path tesztek. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build, `/`, `/bejelentkezes` és `/demo/meretezes` route-ok elkészültek. |
| `supabase test db` | Sikeres | 2026-10-12; 29/29 pgTAP teszt PASS helyi adatbázison. |
| Hibás login | Sikeres | Böngészőben általános, nem érzékeny hibaüzenet jelenik meg. |
| Sikeres login és SSR session | Sikeres | Helyi böngészőben dashboard, user/org adatok és reload utáni session ellenőrizve. |
| Védett DEMO útvonal | Sikeres | `/demo/meretezes` csak hitelesített, szervezethez tartozó helyi felhasználóval érhető el. |
| Logout | Sikeres | Böngészőben a `Kilépés` visszairányít `/bejelentkezes` oldalra. |
| RLS regresszió | Sikeres | Az F2.1 29 pgTAP tesztje változatlanul PASS; F2.2 nem módosított migrációt. |
| TypeScript DB-típusok | Sikeres | A lokális sémából generált `database.types.ts` felhasználva az SSR/browser klienseknél. |
| `npm audit --audit-level=moderate` | Nem verifikálható | npm registry DNS-hiba; az install korábbi kimenete 0 audit findingot jelzett, de friss audit-lekérdezés nem volt elérhető. |

## F3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F3 migráció | Sikeres | `20261012020000_project_management.sql`; meglévő migrációk módosítása nélkül alkalmazható. |
| Lokális migration replay | Sikeres | `supabase db reset --local`; F2.1, F2.3 és F3 migráció + seed sikeresen lefutott. |
| Projekt CRUD | Sikeres | Lokális pgTAP-ban létrehozás, módosítás és jogosultsági ellenőrzés; böngészőben létrehozás/szerkesztés sikeres. |
| Ügyfél CRUD | Sikeres | Lokális pgTAP-ban létrehozás/módosítás; böngészőben gyors létrehozás, lista és projekt-hozzárendelés sikeres. |
| Projekt keresés/szűrés/rendezés | Sikeres | Szerveroldali bounded query, névkeresés, status, munkatípus, archived filter és updated_at rendezés. |
| Projekt duplikálás | Sikeres | Csak alapadatok másolódnak, új ID és `draft` státusz készül; történelmi revíziók nem duplikálódnak. |
| Archiválás/visszaállítás | Sikeres | `previous_status` adatbázisban megőrzött; böngészőben inline megerősítés, archív lista és restore ellenőrizve. |
| Végleges törlés tiltása | Sikeres | Authenticated `DELETE` grant projects/clients táblákon visszavonva; pgTAP ellenőrizve. |
| Optimistic concurrency | Sikeres | `version` feltételes update; stale verzió nem egyezik és konfliktusüzenet készül. Több-session terheléses teszt nem futott. |
| Organization isolation | Sikeres | Minden query/action tagságot és organization scope-ot ellenőriz; meglévő RLS tesztek megmaradtak. |
| Dashboard integráció | Sikeres | Funkciók/Aktuális munkák tabok megmaradtak; Aktuális munkák valós aktív projekteket mutat. DEMO projektet nem mutat saját munkaként. |
| Project detail future modules | Sikeres | Tetőmodellek, kalkulációk, anyagkimutatás, ajánlatok/dokumentumok csak „Hamarosan” állapotban jelennek meg. |
| `npm run typecheck` | Sikeres | `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run test` | Sikeres | 8 fájl / 20 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build; minden F3 route dinamikusan elkészült. |
| `supabase test db` | Sikeres | **74/74 pgTAP PASS**, az F2.1 és F2.3 assertionök megőrzésével. |
| Böngészős workflow | Sikeres | Login → dashboard → project list → quick client → project create → detail → edit → duplicate → archive → archived filter → restore → dashboard real projects. |
| Mobil viewport | Korlátozott | Responsive CSS és accessibility tree ellenőrzött; külön 320/375/390/430 px emuláció nem állt rendelkezésre. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba; `npm audit fix --force` nem futott. |

## F2.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Új migráció alkalmazása | Sikeres | `20261012010000_versioned_calculation_architecture.sql`; lokális reset után a foundation és F2.3 migráció is lefutott. |
| Migration replay | Sikeres | Két egymást követő sikeres `supabase db reset --local` + seed futás, kizárólag lokális adatbázison. |
| Új táblák | Sikeres | 5/5 tábla létrejött: roof models, model revisions, calculations, calculation revisions, dependencies. |
| RLS és policy-k | Sikeres | Mind az 5 új tábla RLS-es; read-only ellenőrzés: összesen 14 policy. |
| DEMO seed lánc | Sikeres | Minden új F2.3 táblában 1 reprezentatív, DEMO-jelölt rekord; dependency a roof revisionből a calculation revisionbe mutat. |
| pgTAP | Sikeres | 2026-10-12; 60/60 PASS, az eredeti 29 assertion megőrzésével. |
| Constraint és ownership tesztek | Sikeres | FK, összetett szervezet/projekt integritás, invalid reference, duplicate revision és current pointer tesztek. |
| Revízió-konkurencia | Részben bizonyított | A PostgreSQL egyedi constraint párhuzamos azonos revíziószámot elutasít; valódi több-session terheléses concurrency teszt ebben a mérföldkőben nem futott. |
| Immutable revíziók | Sikeres | Roof- és calculation-revision update/delete trigger tesztek PASS. |
| Dependency DAG | Sikeres | Self-dependency, cross-project dependency és cycle rejection tesztek PASS. |
| Membership revocation | Sikeres | Tagság visszavonása után a korábbi F2.1 és új F2.3 üzleti adatok olvasása eltűnik. |
| TypeScript DB-típusgenerálás | Sikeres | `supabase gen types typescript --local`; 394 soros generált fájl, mind az 5 új tábla jelen van. |
| Domain contract unit tesztek | Sikeres | Zod provenance, input/output snapshot és invalid provenance tesztek. |
| `npm run typecheck` | Sikeres | `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run test` | Sikeres | 6 fájl / 15 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build sikeres; UI-regresszió nélkül. |
| `npm audit` | Nem verifikálható | Korábbiakhoz hasonlóan npm registry DNS-hiba miatt nem adott auditválaszt. |

## F4 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Mértékegység- és konverziós tesztek | Sikeres | 2026-10-12; mm/cm/m, mm²/m², mm³/m³, fok/radián, nem véges és unsafe integer bemenetek. |
| Matematikai referenciaesetek | Sikeres | 2026-10-12; 3–4–5 háromszög, 2000 × 3000 mm téglalap = 6 000 000 mm², 90° = π/2. |
| Geometriai primitívek | Sikeres | Távolság, vektor, normalizálás, szakasz, vetítés, felezőpont, sokszög-terület/kerület. |
| Hibás geometria elutasítása | Sikeres | Nulla szakasz/vektor, kevés pont, degenerált és önmetsző sokszög, invalid koordináta. |
| Calculator Registry | Sikeres | Explicit registry; duplicate és unknown calculator ID elutasítva. |
| Calculation engine integráció | Sikeres | Teszt-only matematikai DEMO fixture: Zod input → számítás → output-validáció → verziózott eredmény. |
| Strukturált hibák | Sikeres | `VALIDATION_ERROR`, `MISSING_REQUIRED_INPUT`, `INVALID_GEOMETRY`, `NUMERIC_OVERFLOW`, `UNSUPPORTED_OPERATION` szerződésben kezelve. |
| Domain tesztek | Sikeres | 2026-10-12; 12 fájl / 38 teszt sikeres. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build hibamentesen elkészült. |
| Adatbázis-regresszió | Sikeres | F4 nem módosított sémát; a meglévő helyi 74/74 pgTAP baseline újrafuttatása 2026-10-12-én PASS. |
| `npm audit` | Nem verifikálható | A korábbi npm registry DNS-hiba fenntartva; sikeres audit nem állítható. |

## F5 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Checkpoint A: gable referenciaeset | Sikeres | 8000×12000 mm, 3000 mm emelkedés, 500/250/250 mm túlnyúlás; 36,86989765°, 5625 mm, 140,625 m², 112,5 m². |
| Checkpoint A: height/angle ekvivalencia | Sikeres | Azonos fizikai eredmény dokumentált tolerancián belül. |
| Checkpoint A: invalid/deterministic/symmetry tesztek | Sikeres | 5 gable teszt, registry-integrációval és független várt értékekkel. |
| F5 DB migration | Sikeres | `20261012030000_gable_calculation_persistence.sql` csak lokális DB-re pusholva; reset nem történt. |
| Atomic persistence | Sikeres | Egy RPC-tranzakció: roof revision + calculation revision + dependency. |
| Revision history/stale write | Sikeres | Lokális pgTAP-ban második revízió és stale `40001` elutasítás. |
| RLS/authorization regression | Sikeres | **83/83 pgTAP PASS**; meglévő tenant/RLS/immutable ellenőrzések és a nem-tagos F5 mentés-elutasítás PASS. |
| TypeScript DB-típusgenerálás | Sikeres | Lokális sémából újragenerálva; F5 RPC szerepel a `database.types.ts` Functions részében. |
| Project-linked UI | Sikeres | Új tetőmodell, szerkesztés, projektkártya és revision result. |
| Élő számítás és input modes | Sikeres | Browserben height/angle váltás, magyar vessző, élő eredmény és inline mentési állapot. |
| Reload/revision browser workflow | Sikeres | 1. mentés → width módosítás → 2. mentés → reload; 9000 mm és 156,25 m² visszatöltve. |
| Adaptive UI | Sikeres | Calculator oldalon Scaling Bubble, 100→110% élő text scaling, reset ellenőrizve. |
| Narrow viewport 320/375/390/430 px | Nem elérhető | A böngészővezérlőben nincs viewport capability; CSS/accessibility és normál browser smoke elvégezve, vizuális narrow screenshot nem állítható. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes az unused import javítása után. |
| `npm run test` | Sikeres | 13 fájl / 43 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack build; új F5 route-okkal. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba (`ENOTFOUND registry.npmjs.org`). |
## F8.2 — PDF-ajánlat

| Terület | Ellenőrzés | Eredmény |
|---|---|---|
| PDF technológia | `@react-pdf/renderer` Node route, beágyazott Noto Sans | PASS |
| Forrásrevízió | kiválasztott revision ID, org/project/quote/revision lánc | PASS a route/build alapján |
| Pénzügy | mentett HUF subtotal, price class és category subtotal használata | PASS |
| Biztonság | auth + tagság + RLS + no-store válasz | PASS a route ellenőrzés alapján |
| UI | előnézet / letöltés / nyomtatás, történeti revíziós linkek | PASS browser smoke |
| PDF vizuális QA | A4, magyar ékezetek, táblázat, összeg, footer | PASS browser PDF-panel |
| Automatizált kapuk | `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` | PASS: 77 teszt |

Megjegyzés: a böngészős PDF-panel azonos URL esetén egy korábbi dokumentumot
cache-elhetett; a route `private, no-store` fejléccel és az immutable revízió
ID-jával dolgozik. A tényleges új dokumentum előállítása és HTTP 200 válasza
ellenőrzött.
# F9.1 — Kivitelezési tervek

| Terület | Ellenőrzés | Állapot |
|---|---|---|
| Statikus | `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` | PASS: 21 fájl / 79 Vitest; build sikeres |
| Adatbázis | F9.1 migráció alkalmazása helyi Supabase-en | PASS: migráció alkalmazva |
| Biztonság | org/project/source composite FK, RLS, elfogadott + végleges revízió trigger | PASS: 005 F9.1 + teljes suite, 209 teszt |
| UI | terv létrehozása, két feladat, kész státusz, progress, reload, forrásajánlat | PASS: egy végső browser smoke flow |
# F9.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Journal schema/RLS | Fókuszáltan sikeres | 006 pgTAP: append-only jogosultságok, RLS, composite FK-k, request-key |
| Task status events | Fókuszáltan sikeres | After-update trigger, változatlan státusz tiltása, authenticated közvetlen írás tiltása |
| Dátum- és időszemantika | Implementálva | PostgreSQL `date` munkadátum + külön `created_at`/`changed_at` |
| Unified timeline | Implementálva | Munkanapló + feladatesemény, date → timestamp → id rendezés, max. 100+100 rekord |
| Teljes ellenőrzés | Sikeres | Typecheck, lint, 22 Vitest-fájl / 82 teszt, build, pgTAP 223/223 és egy browser smoke PASS |

## F9.3.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Privát Storage bucket | Sikeres | `execution-photos`, `public=false`, 10 MB limit, JPEG/PNG/WebP allow-list. |
| Metadata schema/RLS | Sikeres | `execution_photos`, szervezeti RLS, composite FK-k, immutable authenticated jogosultságok. |
| Cross-reference védelem | Sikeres | Terv–projekt, task–terv és journal–terv trigger; invalid task, MIME és méret pgTAP-ban elutasítva. |
| Journal immutability | Sikeres | A fotó külön rekord; authenticated update tiltott, eredeti journal content pgTAP-ban változatlan. |
| Storage policy | Sikeres | Tagság + bucket/path feltöltés, metadata-sorhoz kötött olvasás, authenticated overwrite/delete nélkül; a jogosult projekt képe signed URL-ről ténylegesen betöltődött a böngészős nagy nézetben. Cross-organization jogosulatlan hozzáférés böngészőben nem lett tesztelve. |
| Upload validation | Sikeres | Server action MIME, 10 MB limit és JPEG/PNG/WebP magic byte ellenőrzést végez; HEIC/HEIF UI-korlát dokumentált. |
| Kompenzáló cleanup | Implementálva | Metadata-hibánál `remove()` fut; két szolgáltatás között nincs hamis atomi ígéret. |
| Automatizált kapuk | Sikeres | 250/250 pgTAP, 22 Vitest-fájl / 82 teszt, typecheck, lint, diff-check, build PASS. |
| Browser workflow | Sikeres | Hitelesített Brave + lokális Supabase: DEMO PNG feltöltés, galéria, tényleges signed URL-es képbetöltés a nagy nézetben, bezárás, reload utáni megmaradás, meglévő feladathoz és naplóbejegyzéshez kapcsolás. Az eredeti naplótartalom változatlan maradt. |

## F9.3.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Képkategóriák | Sikeres | Kézi before/during/after/uncategorized választás, kategória-RPC és 10/10 pgTAP; upload-időpontból nincs automatikus besorolás. |
| Galériaszü̋rés és sorrend | Sikeres | Kategória-, feladat- és feltöltési dátumszűrés, newest/oldest sorrend, a meglévő tervhez kötött 100-as limit megtartva. |
| Feladatonkénti csoportosítás | Sikeres | Valós fotószámok és kategóriánkénti bontás; feladat nélküli fotók nem rejtődnek el. |
| Előtte/utána nézet | Sikeres | Felhasználói kiválasztás, oldalsó összehasonlítás, képcsere és responsive stacking; mindkét kép ténylegesen betöltődött signed URL-ről. |
| Metadata és napló | Sikeres | Feltöltési idő, feltöltő-elérhetőség, feladat- és naplóhivatkozás megjelenik; eredeti journal content nem módosul. |
| Böngészős smoke | Sikeres | Egyetlen hitelesített Brave workflow: két DEMO fotó kategorizálása, szűrés, összehasonlítás, választáscsere és reload utáni perzisztencia. |

## F9.4.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Read-model aggregáció | Sikeres | Célzott Vitest 2/2: task-count, progress, üres terv, figyelmi tételek és determinisztikus idővonal-sorrend. |
| Teljes automatizált kapuk | Sikeres | `npm run test`: 24 fájl / 86 teszt; `npm run typecheck`; `npm run lint`; `npm run build` webpack módban. |
| Projekt- és szervezeti adatforrás | Sikeres | Meglévő szerveroldali, organization/project-szűrt execution lekérdezések; új overview tábla nincs. |
| Fotó- és ajánlat-integráció | Sikeres | Korlátozott fotóelőnézet signed URL-lel, galéria- és meglévő ajánlati oldal-hivatkozás. |
| Böngészős smoke | Sikeres | Egyetlen hitelesített lokális workflow: 2 task, 50% progress, figyelmi elem, idővonal, 2 fotóelőnézet és elfogadott ajánlati oldal megnyitása. |

## F9.4.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| PDF technológia | Sikeres | F8.2 közös `@react-pdf/renderer` pipeline és Noto Sans fontregisztráció, új construction-report komponenssel. |
| Tartalom és üres állapotok | Sikeres | Célzott PDF-render teszt 3/3: A4 PDF fejléc, fejezetek, üres feladat-/napló-/fotóállapot és biztonságos fájlnév. |
| Fotó biztonság | Sikeres | Szerveroldali org/project/plan/photo ellenőrzés, privát Storage `download(objectKey)`, JPEG/PNG korlát, nincs URL-alapú fetch. |
| Erőforrás-korlátok | Sikeres | Legfeljebb 8 fotó, 4 MB/kép, 12 MB összesen; túllépés egyértelmű hibával tér vissza. |
| Teljes automatizált kapuk | Sikeres | `npm run test`: 25 fájl / 87 teszt; `npm run typecheck`; `npm run lint`; `npm run build` webpack módban. |
| Böngészős PDF smoke | Sikeres | Hitelesített lokális projekt: fejezetválasztó, 2 DEMO fotó, preview route, preview/download/print linkek; a reprezentatív PDF közvetlen renderelése vizuálisan is ellenőrzött. |

### F9.4.2.1 célzott PDF-layout ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Pagination és orphan heading | Sikeres | A kapcsolódó ajánlat szakasza `wrap={false}`-szal, a címsor `minPresenceAhead`-del együtt marad; reprezentatív PDF-ben nincs üres második oldal vagy orphan címsor. Hosszabb riportok továbbra is tördelhetők. |
| Feladatesemény sor | Sikeres | Flex-alapú feladat / átmenet / metaadat oszlopok, biztonságos hosszú feladatszöveg-tördelés és dátum–felhasználó térköz. |
| Státuszjel és revízió | Sikeres | Noto Sans `→` karakter; elérhető revíziószám `vN` formában, a belső revízióazonosító külön megőrizve. |
| Célzott render és kapuk | Sikeres | PDF-render teszt 1/1, `npm run typecheck`, `npm run lint`, `npm run build` webpack módban. |
| Oldalkép, fotók, footer | Sikeres | Egy reprezentatív, két DEMO-képes lokális PDF renderelt oldalképe: 1 A4 oldal, mindkét kép, magyar ékezetek, státuszjel, revízió és `1 / 1 oldal` footer látható. |

## F9.5.1 — pilot readiness és üzembiztonság

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Readiness és adatfolyam-leltár | Dokumentálva | A G01–G04 állapot, EXIF/GPS, szervezeti izoláció, backup/restore és pilot checklist a PILOT_READINESS.md-ben található. |
| Terminológiai UI/PDF korrekció | Sikeres | A geometriai eredmény és a kivitelezési PDF belső/geometriai határai pontosítva; célzott Vitest 6/6, typecheck, lint és webpack production build PASS. |
| Hosted, restore, cross-org, terepi smoke | Nem ellenőrzött | Nincs bizonyíték ebben a lokális mérföldkőben. |

## F9.6.1 — ereszcsatorna-anyagbecslés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Domain referenciaesetek | Sikeres | Célzott Vitest: 1 fájl / 5 teszt PASS; egy- és többszakaszos eresz, pontos/részleges szál, lefolyó, kézi komponens, konzolbecslés, hibás bemenet és registry. |
| Typecheck | Sikeres | npm run typecheck PASS. |
| Perzisztens UI és revision mentés | F9.6.1.1.1-ben kész | A következő integrációs táblázat tartalmazza a lokális acceptance bizonyítékot. |
| Geometria | F9.6.1.1.1-ben kész | Két ereszjavaslat a mentett nyeregtető modellből; a forrásrevízió-idő lekérdezés javítva. |
| Katalógus- és takeoff-integráció | F9.6.1.2.1-ben kész | Az explicit variánskapcsolat, egységvédelem, atomi draft átadás és snapshot-integritás bizonyítékát a lenti F9.6.1.2/.2.1 táblázatok tartalmazzák. |
| Hidraulikai/gyártói megfelelés | Támogatáson kívül | Nem számít és nem állít ilyen eredményt. |

## F9.6.1.1 — alkalmazásintegráció

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Projektútvonal | Sikeres buildben | Új /projektek/[projectId]/ereszcsatorna route generálódik. |
| Form és domain újraszámítás | Typecheck/lint/build | A kliens csak domain-kalkulátort hív; a mentési action szerveroldalon újraszámol. |
| Revision RPC és RLS | Célzott lokális pgTAP PASS | 009_gutter_calculation.sql: 21 teszt; a külön szervezethez tartozó felhasználó olvasása/írása elutasítva. |
| Geometry suggestion | Böngészőben PASS | Két mentett nyeregtető-eresz javaslat explicit kiválasztása, forrás-revíziókapcsolat mentve. |
| Material takeoff / SVG | F9.6.1.2.1-ben kész | A katalógus-, technikai SVG- és draft takeoff-integráció külön mérföldkőként lezárva; bizonyíték lent. |

## F9.6.1.1.1 — integráció végső elfogadása

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Projekt-navigáció és UI | Böngésző PASS | Projektoldalról elérhető az Ereszcsatorna-kalkulátor link; két ereszszakasz, szálhossz, lefolyó, könyök, kézi tartozék szerkeszthető. |
| Célzott Vitest | Sikeres | gutter-material.test.ts: 5/5 PASS. |
| Typecheck / lint / build / diff | Sikeres | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` mind PASS; route szerepel a buildben. |
| Migration és revision/RLS | Célzott lokális PASS | `20261013080100` alkalmazva incremental módon; pgTAP 21/21 PASS, rollbackos teszttranzakcióval. Tulajdonos létrehozás/mentés, külön szervezeti tag elutasítása, keresztprojekt geometria, stale revision `40001`, UPDATE/DELETE immutabilitás igazolt. |
| Böngészős persistence | Hitelesített DEMO PASS | Mentés, teljes reload, két eresz/revízióforrás, kereskedelmi eresz- és lefolyószál, lefolyó/könyök, kézi tartozék és eredmény hidratálása; V2 mentés után V1 4000 mm-en, V2 5000 mm-en olvasható vissza. |
| Konkurenciavédelem | Sikeres | `scripts/verify-gutter-concurrency.mjs`: 2 független authenticated kapcsolat, adatbázis readiness barrier, valódi párhuzamos RPC; 1 sikeres V2, 1 SQLSTATE `40001`, 2 revízió, nincs duplikáció vagy elveszett módosítás. |
| Adatintegritás | Sikeres | V1 `8000` mm változatlan, V2 `9100` mm egyszer szerepel, a current revision és revíziószámozás konzisztens; a saját fixture cleanup sikeres. |
| Környezet / kiegészítő | Részleges | CLI 2.120.0 helyi állapotot emelt, szűk engedéllyel vizsgáltuk; reset/hosted változás nem történt. Szűk képernyős viewport smoke a vezérlő korlátja miatt nem ellenőrzött. |

## F9.6.1.2 — anyagkatalógus, takeoff és technikai SVG

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Katalógus-hozzárendelés | Sikeres | `gutter-material-integration.test.ts`: kompatibilis `piece`, inkompatibilis `linear_meter` és fel nem oldott variáns külön státusz; csak aktív, szervezetazonos katalógus engedett. |
| Mennyiségi egységek | Sikeres | A számított kereskedelmi szál és kézi tartozék `piece`; nincs automatikus folyóméter/csomag átváltás, a szerver ugyanazt ellenőrzi. |
| Takeoff forrás és snapshot | Implementálva | Az action aktuális, verified gutter-revíziót és projekt/szervezetet ellenőriz, új draft+tételekbe forrásrevízió-, katalógus-, technikai- és provenance-snapshotot ír; approved rekordhoz nem nyúl. Adatbázis-szintű új pgTAP erre a változásra nem készült. |
| SVG modell | Sikeres | Két független ereszszakasz, determinisztikus szálhatárok, lefolyókapcsolat nélküli séma és forrásrevízió a célzott Vitestben. |
| Célzott automatizált kapuk | Sikeres | `npx vitest run src/domain/calculations/gutter-material.test.ts src/domain/calculations/gutter-material-integration.test.ts`: 2 fájl / 8 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS. |
| Böngészős végső workflow | Sikeres | Egy hitelesített helyi DEMO folyamat: kompatibilis `piece` variáns kiválasztása, előnézet, új draft, átirányítás és draft újranyitása; a 3 és 4 darabos tételek, forrásrevízió és provenance megjelent, korábbi approved rekord érintetlen maradt. Narrow viewport ebben a vezérlőben nem volt elérhető. |

## F9.6.1.2.1 — végső integrációs hardening

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Server Action A–H | Sikeres | `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 npx vitest run src/features/gutters/gutter-actions.local.integration.test.ts`: 8/8 PASS. Két külön, valóban bejelentkezett helyi identitás; valid owner, idegen szervezeti kalkuláció/variáns, idegen projekt, hibás revízió, inkompatibilis egység, jogosulatlan create/add és approved módosítás elutasítása. Service role kizárólag fixture-életciklushoz. |
| Atomi idempotencia | Sikeres | Explicit UUID kéréskulcs, payload-egyezés és `(organization_id, project_id, transfer_request_key)` unique constraint. Azonos kulcs azonos eredményt ad, eltérő payloadot elutasít; új kulcs ugyanazon név/revízió mellett külön draftot enged. |
| Valódi konkurencia | Sikeres | `scripts/verify-gutter-takeoff-concurrency.mjs`: két független authenticated kapcsolat, egyszerre indított azonos logikai kérés; 1 create + 1 reuse, 1 draft, 1 tétel, azonos takeoff-id és 3 darabos mennyiség. Cleanup PASS. |
| Adatbázis/RLS/snapshot | Sikeres | `010_gutter_takeoff_hardening.sql`: 29/29 pgTAP PASS; szervezet/projekt/revízió/variáns izoláció, egységvédelem, pontos mennyiség, technikai- és árforrás-snapshot, draft forrás/payload immutabilitás és approved immutabilitás. |
| SVG és forrásintegritás | Sikeres | Célzott domain/SVG Vitest 8/8: tárolt hossz, kereskedelmi szálhossz, szálhatárok, könyökszám, pontos revision ID, független lefolyó és nem létező topológia hiánya. |
| Teljes alkalmazáskapuk | Sikeres | `npm test`: 27 fájl PASS / 95 teszt PASS, a 8 helyi integrációs eset alapfutásban szabályosan skip; `npm run typecheck`, `npm run lint`, `npm run build` PASS. |
| Migráció és cleanup | Sikeres | `20261013080200`, `20261013080300` és `20261013080400` incremental, reset nélkül; local/remote history oszlopok lokálisan egyeznek. Temporary table/function, concurrency projekt és action szervezet: 0. Hosted környezet nem érintett. |
| Fókuszált browser follow-up | Sikeres | Meglévő hitelesített helyi munkamenet: kompatibilis DEMO `piece` variáns, atomi draft, átirányítás, 3 `piece`, forrásrevízió és warning látható; a smoke-draft eltávolítva. |
| 390 px mobil QA | Nem ellenőrzött | A rendelkezésre álló native Brave vezérlő nem adott megbízható explicit viewport-emulációt; MOBILE QA UNVERIFIED. |

## F9.6.2.1 — szegélyanyag-becslő domainmotor

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Szegélykategóriák és független futások | Sikeres | Mind a hat kategória explicit runként működik; több futás külön darabszámot kap, nincs automatikus geometriai hozzárendelés. |
| Matematikai referenciaesetek | Sikeres | 7 DEMO eset: pontos határ, részleges következő szál, explicit átfedés határa, több független él, végkiterjesztés és tartalék, hiányzó/hibás kapcsolat, explicit hasznos hossz. |
| Validáció és determinisztikusság | Sikeres | Hibás hossz, átfedés, hasznos hossz, hiányzó geometriai provenance, ismétlődő ID, overflow, kézi tétel és ismételt futás célzottan tesztelt. |
| Domain + meglévő gutter regresszió | Sikeres | `npx vitest run src/domain/calculations/flashing-material.test.ts src/domain/calculations/gutter-material.test.ts`: 2 fájl / 15 teszt PASS. |
| Registry, typecheck, lint és build | Sikeres | A kalkulátor explicit production registrytag; `npm run typecheck`, `npm run lint`, `npm run build` PASS. |
| Gyártói, UI és adatbázis viselkedés | Nem része / nem ellenőrzött | Nincs termékspecifikus korlátozás-ellenőrzés, geometry-import, perzisztencia, RLS, takeoff vagy böngészős workflow ebben a fázisban. |

## F9.6.2.2 — projektintegráció és mentés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Roof-edge mapping és forráshossz | Sikeres | Célzott Vitest 12/12 (11 domain + 1 mapping); ellenőrzött mapping 2 eresz, 1 gerinc, 4 oromél; tört mm eredeti hossza, egész mm-re felfelé kerekítés és explicit felülírás snapshotja ellenőrizve. |
| Typecheck | Sikeres | `npm run typecheck`. |
| Lint, production build | Sikeres | `npm run lint`, `npm run build`. |
| Migráció + pgTAP | Korábbi körben blokkolt; lezárva a 2.2.1-ben | A CLI/Docker socket sandbox-hozzáférés feloldása után a migráció reset nélkül lefutott, a teljes pgTAP 329/329 PASS; a végső bizonyíték a következő táblázatban. |
| Authenticated action és concurrency | Korábban nem ellenőrzött; lezárva a 2.2.1-ben | A helyi böngészős mentés működött; stale expected revision és immutable revíziók pgTAP-ban igazolva. |
| Browser V1/V2/reload/history workflow | Korábbi körben blokkolt; lezárva a 2.2.1-ben | A már futó helyi Next szerver `localhost` címén használt; V1/V2 mentés, reload és V1 visszanyitás PASS. |

## F9.6.2.2.1 — végső lokális integráció-ellenőrzés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Környezetdiagnosztika | Sikeres | Docker 29.8.0; a projekt helyi Supabase adatbázisa és szolgáltatásai már healthy állapotban futottak, a 54322-es port foglalt volt. Az első sandbox hiba a Docker socket engedélyezésével feloldódott; reset nem történt. |
| Migráció | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 supabase migration up --local`: `20261013080500_flashing_calculation_persistence.sql` alkalmazva; `supabase migration list --local` szerint a helyi migrációs előzmény egyezik. Hosted DB nem volt célpont. |
| pgTAP | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local`: 11 fájl / 329 állítás PASS, köztük 19 flashing-állítás. Az első futás 1 assertion hibát mutatott egy túl tág tesztlekérdezés miatt; a szűkített tesztet a teljes suite újrafuttatása igazolta. |
| Geometria és adatkonzisztencia | Sikeres | UI validációs workflow-val meglévő aktuális verified nyeregtető-revízió ferde oroméle került be: 6625,00000036 mm eredeti snapshot, 6626 mm kalkulációs egész hossz, `lengthOverridden=false`, pontos modell/kalkulációs revíziók. A seed `demo` státuszú tetőjét nem használtam verified forrásként. |
| Browser save/reload/history | Sikeres | Egy fókuszált helyi workflow: explicit DEMO V1 mentés, 100 mm tartalék módosításával V2, oldal reload, V1 visszanyitása. UI és read-only DB is megőrzött V1/V2-t mutatott; mindkét revízióhoz 2 forrásfüggőség tartozik. |
| Concurrency és immutable history | Sikeres | pgTAP igazolta az elavult expected revision elutasítását, a V1/V2 megtartását és a történeti revízió update/delete tiltását; authenticated UI-val mentés/reload is sikeres. |
| Typecheck/lint/build | Nem futott újra | Alkalmazáskód nem változott az előző F9.6.2.2 kör óta; az ottani 12/12 célzott Vitest, typecheck, lint és build PASS bizonyítéka megmarad, de ez nem új végső futtatás. |
| Mobil és gyártói megfelelés | Nem verifikált | Fizikai eszközös QA és gyártói/specifikus jóváhagyás nem része a lokális integrációs bizonyítéknak. |

## F9.6.2.3 — szegély anyagkatalógus, draft-átadás és SVG

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Katalógus-hozzárendelés | Sikeres | Célzott `flashing-material-integration.test.ts`: mind a hat kategória, egységütközés, archived termék elutasítása, aktív flashing/sheet_metal variáns elfogadása, provenance és ár-ID ellenőrizve. Név alapján kompatibilitást nem állítunk. |
| Mennyiség és SVG | Sikeres | 6/6 Vitest a flashing geometry teszttel együtt: `null` szálbecslés nem lesz 0, explicit target→fm tartalékkal, méretarány, végkiterjesztés, határok, átfedés és forrásrevízió ellenőrzött. |
| RPC, jogosultság és immutabilitás | Sikeres | `20261013080600_flashing_takeoff_integration.sql`; `012_flashing_takeoff_integration.sql`: 28/28 pgTAP. Forrásrevízió, piece/fm mennyiségek, null count tiltás/részleges insert hiánya, product/variant identity, technical provenance, exact árrevision ID/forrás snapshot, egység/kategória, cross-project/cross-org, jogosulatlan tagság, idempotencia, payload eltérés és approved immutabilitás PASS. |
| Valódi párhuzamos idempotencia | Sikeres | `node scripts/verify-flashing-takeoff-concurrency.mjs`: két független authenticated kapcsolat; 1 create + 1 reuse, azonos takeoff-id, egy draft/tétel, authoritative 4,1 fm. A lokális, véletlen DEMO-fixture célzott cleanup-pal készült. |
| Browser elfogadás | Sikeres | Egy helyi authenticated DEMO munkafolyamat: mentett V2, SVG, kompatibilis `linear_meter` variáns, új draft megnyitása; 6,726 fm, exact V2 revision és estimated provenance látható. A kiválasztott egységhez nem volt ár, ezért price snapshot null/warning. Korábbi approved rekord változatlanul látható. |
| Alkalmazáskapuk | Sikeres | Célzott Vitest 6/6, `npm run typecheck`, teljes `npm run lint`, `npm run build` webpack PASS. |
| Narrow viewport/gyártói validáció | Nem ellenőrzött | Fizikai eszközön nem tesztelt; a terméknév/kategória nem bizonyít gyártói profil- vagy szerelési megfelelést. |

## F9.6.3.1 — lemezprofil- és hajlítási domain

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| 9 DEMO matematikai referencia | Sikeres | Független várt értékek: L, U, több/ellentétes hajtás, vastagság, explicit BA, hiányzó paraméter, külső csúcsméret elutasítása, lehetetlen méret, kis szög. |
| Célzott geometria/validáció/registry Vitest | Sikeres | `npx vitest run src/domain/calculations/sheet-metal-profile.test.ts`: 1 fájl, 19/19 PASS. Önmetszés, analitikus ívsugár és tangensfolytonosság, nem 90°-os szög, numerikus határok, ismétlés és registry szerepel. |
| Meglévő engine/flashing regresszió | Sikeres | `npx vitest run src/domain/calculations/engine.test.ts src/domain/calculations/flashing-material.test.ts`: 2 fájl, 15/15 PASS. |
| Typecheck | Sikeres | `npm run typecheck`; a végső domain típusszerződés PASS. |
| Lint | Sikeres | `npm run lint`; első futás 1 használatlan értékadást jelzett, javítás után PASS. |
| Production build | Sikeres | `npm run build` (Next 16.4.0 webpack): compile, TypeScript, statikus oldal-generálás PASS. |
| Diff/whitespace | Sikeres | `git diff --check` PASS. |
| Teljes regresszió/adatbázis/böngésző | Nem futott | A fázis tiszta domain és registry; nincs UI, perzisztencia, Supabase vagy migráció. |
| Gyártási megfelelés | Nem ellenőrzött | Nincs mért gép–szerszám–anyag kalibráció, hajtási sorrend/ütközés/visszarugózás vagy szakmai pilot. |

## F9.6.3.2 — helyi profil-editor

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Célzott editor + domain Vitest | Sikeres | `npx vitest run src/features/sheet-metal/profile-editor.test.ts src/domain/calculations/sheet-metal-profile.test.ts`: 2 fájl, 26/26 PASS. DEMO sablon, szerkesztés/váltás, BA/K-hiány, validáció/önmetszés, SVG arc/y-leképezés, méretforrás és kijelölésazonosság. |
| Typecheck / lint / build / diff | Sikeres | `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check` PASS. |
| Hitelesített helyi böngésző | Sikeres | Projekt→editor, L 60→75 mm és 90→60°, SVG és felirat frissült; BA 2,5 mm + DEMO forrás → 117,5 mm; U sablonváltási figyelmeztetés; SVG→sor és sor→SVG kijelölés; 125% zoom, egérpan; ismeretlen BA/K, hibás vastagság és rajz elrejtése. |
| Keskeny böngészőnézet | Sikeres | 390×844 px: egyoszlopos grid, 313 px SVG, vízszintes dokumentum-túlcsordulás nincs (`scrollWidth=390`). |
| Fizikai érintés / teljes regresszió / adatbázis | Nem futott | Pointer/pinch kód jelen van, fizikai iPad/mobil gesztus nem ellenőrzött. UI-only fázis, nincs mentés/migráció/pgTAP vagy teljes Vitest. |
| Gyártási alkalmasság | Nem ellenőrzött | Nincs gép-/szerszám-/anyagkalibráció és terepi szakmai jóváhagyás. |

## F9.6.3.3 — profilperzisztencia és revízióbiztonság

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Input/provenance round-trip és hiányos BA/K | Sikeres | `npx vitest run src/features/sheet-metal/profile-editor.test.ts src/domain/calculations/sheet-metal-profile.test.ts`: 2 fájl, 27/27 PASS; profile type, katalogizált provenance-minta, gép/tool/calibration ID, signed turn és `unknown` BA/K round-trip; hiányzó BA/K `null`. |
| Helyi migráció | Sikeres | `20261013080700_sheet_metal_profile_persistence.sql`, `.80800_sheet_metal_profile_persistence_fix.sql`, `.80900_sheet_metal_profile_authoritative_output.sql` reset nélkül helyi Supabase-re alkalmazva. A végső RPC input-only; outputot a DB számítja. Hosted környezet nem érintett. |
| pgTAP/RLS/immutable | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local supabase/tests/database/013_sheet_metal_profile.sql`: 1 fájl, 19/19 PASS; V1/V2, adatbázisoldali BA/K eredmény, hiányos null-width, unsupported convention, stale expected revision, cross-project/cross-org/non-member read/write, revision UPDATE/DELETE tiltás. |
| Valódi konkurencia | Sikeres | `node scripts/verify-sheet-metal-profile-concurrency.mjs`: 2 független authenticated DB kapcsolat; 1 V2 sikeres mentés, 1 stale conflict; V1/V2 megmaradt, max revision=2. |
| Alkalmazáskapuk | Sikeres | A végső `npx vitest run ...profile-editor.test.ts ...sheet-metal-profile.test.ts` 27/27 PASS, `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check` PASS. |
| Authenticated browser workflow | Sikeres | Helyi `local.owner@local.test`, DEMO projekt. L 60→75 mm, 90→60°; V1 mentés/reload és SVG/input helyreállítás; K=0,4 forrásprovenance-szal V2; V1 visszatöltve változatlan, V2 elérhető; unknown BA/K-val V3; a végső input-only RPC-val V4, reload után 81 mm és null teríték. |
| Katalógusmapping / fizikai QA / gyártás | Nyitott | `technical_specs` nem hordoz explicit profilkompatibilitási szerződést; mapping F9.6.3.4. Fizikai mobil, gépkalibráció és gyártói megfelelőség nem ellenőrzött. |

## F9.6.3.4.1 — profilanyag-mennyiség

| Ellenőrzés | Állapot | Bizonyíték |
|---|---|---|
| Nettó m², darabszám, hiányzó BA/K, határok, round-trip | Sikeres | `npx vitest run src/domain/calculations/sheet-metal-profile.test.ts src/domain/calculations/profile-material-compatibility.test.ts src/features/sheet-metal/profile-editor.test.ts`: 3 fájl, 32/32 PASS. |
| Katalógus és revízió/RLS | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local supabase/tests/database/013_sheet_metal_profile.sql supabase/tests/database/014_profile_material_requirements.sql`: 2 fájl, 40/40 PASS; V1/V2, szervezetidegen variáns, hiányzó attribútum, inkompatibilis egység/vastagság, hiányos BA/K. |
| Helyi migráció | Sikeres | `20261013081000`–`20261013081300` helyi `supabase db push --local` reset nélkül alkalmazva. |
| Alkalmazáskapuk | Sikeres | `npm run typecheck`, `npm run lint`, `npm run build` PASS; `git diff --check` a végén ellenőrizve. |
| Böngésző mentés/reload | Sikeres | Helyi authenticated DEMO projekt: 103 mm × 2000 mm / 1 000 000 = 0,206 m²/db; 3 db = 0,618 m²; V1 mentés/reload után mezők és eredmény változatlan. |
| Teljes regresszió, gyártás, beszerzés | Nem futott / nem ellenőrzött | Célzott kapuk nem jelentenek teljes regressziót; nincs valós gép/gyártói jóváhagyás, stock- vagy takeoff-átadás. |

## F9.6.3.4.2 — profilanyag átadás

| Ellenőrzés | Állapot | Bizonyíték |
|---|---|---|
| Nettó m², mentett revízió, katalógus, ár és snapshot | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db supabase/tests/database/015_profile_takeoff_integration.sql --local`: 37/37 PASS; 0,618 m², pontos revízió, BA-forrás, ár nélküli és egységazonos áras snapshot, immutable tétel. |
| Jogosultság, stale, hiányos BA/K, null area | Sikeres | Ugyanazon pgTAP: authenticated nonmember/cross-project elutasítás, eltérő anyag/vastagság/egység, V1 stale, hiányos BA/K és null area elutasítása, approved immutabilitás. |
| Idempotencia, konkurencia | Sikeres | Azonos kulcs/payload reuse, eltérő payload elutasítás, új kulcs új draft; `node scripts/verify-profile-takeoff-concurrency.mjs`: két független authenticated kapcsolat, 1 create + 1 reuse, 1 draft és 1 tétel, 0,618 m². |
| Eresz és szegély regresszió | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db supabase/tests/database/012_flashing_takeoff_integration.sql supabase/tests/database/010_gutter_takeoff_hardening.sql --local`: 57/57 PASS. |
| Alkalmazás és böngésző | Sikeres | Célzott profil Vitest 32/32 PASS; a végső action-változtatás után `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS. Egy hitelesített DEMO flow: V1 → kompatibilis DEMO variáns V2 → 0,618 m² előnézet → új draft → revízió/árhiány ellenőrzés → hiányos V3 átadás tiltása és a korábbi V2 draft stale jelzése, változatlan snapshotja. |
| Teljes regresszió és gyártás | Nem futott / nem ellenőrzött | A célzott tesztek nem teljes regresszió; nincs fizikai eszközös QA, gép-/szerszámkalibráció vagy kereskedelmi blankoptimalizálás. |

## F9.7.1 — projekt-navigáció és összecsukható kivitelezés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-navigation.test.ts`: 1 fájl / 3 teszt; mindhárom projekt+organization route, alapból zárt parent/nested disclosures és parent close nested reset helper. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (webpack) mind sikeres. |
| Roof models elkülönülése | Forráskód alapján | Project page a tetőmodell-szekciót a `ExecutionSection` testvéreként rendereli; a szülő részletező nem rejti el. Böngészőben nem ellenőrzött. |
| Működés és független disclosure | Részleges | A natív `<details>/<summary>` kezeli a nyitást, billentyűzetet és expanded/collapsed szemantikát. Szerveroldali markup teszteli az alapállapotot; interaktív kézi browser QA nem futott. |
| Responsive / keyboard browser QA | Nem futott | `npm run dev` port bind `EPERM` mind `0.0.0.0:3000` és `127.0.0.1:3000`; böngészőtab nem volt. A 850/560 px CSS breakpointok forrásból ellenőrizhetők, tényleges 390 px/tablet render nincs bizonyítva. |
| Adatbázis / jogosultság / üzleti action | Nem futott / nem változott | Csak kliens UI-állapot változott; nincs DB, RLS, dokumentumtárolás, journal/action vagy Supabase módosítás. |
| `git diff --check` | PASS | A végső tracked diff ellenőrzése sikeres; az új fájlokat is külön ellenőriztem whitespace-hibára. |

## F9.7.1.1 — magyar szakmai UX és valósághűség

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Útvonal- és felületi leltár | Forráskód alapján teljes | 19 `page.tsx` útvonal; a projektbe ágyazott napló, fotó, riport, beállítások és közös komponensek is szerepelnek a [részletes auditban](HUNGARIAN_PROFESSIONAL_UX_AUDIT.md). |
| Új UI/opció tesztek | PASS | `gutter-calculator-ux.test.ts`, `calculator-ux.test.ts`, `takeoff-forms.test.ts`, `takeoff-form-options.test.ts`: üres termékhossz, szegély/profil feliratok, magyar mezők/egységek és domainkulcsokkal egyező opciók. A React SSR nem bizonyít kliens-interakciót. |
| Kapcsolódó fókuszált regresszió | PASS | Egy `npx vitest run` parancsban összesen 10 fájl / 39 teszt: fenti 4, `estimation.test.ts`, `gutter-material.test.ts`, `flashing-material.test.ts`, `profile-editor.test.ts`, `project-navigation.test.ts`, `execution-overview.test.ts`. |
| Katalógus és dashboard célzott ellenőrzés | PASS | Külön `npx vitest run src/domain/materials/contracts.test.ts src/features/dashboard/dashboard.test.ts`: 2 fájl / 6 teszt. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4 webpack). |
| Adatkonzisztencia és jogosultság | Forráskód alapján, nem DB-teszt | Takeoff action: szervezet/projekt, mentett forrás, aktív variáns, ár/egység egyezés; jóváhagyásnál szerepkör és verziót továbbító RPC. Ezek nem változtak; pgTAP és konkurenciateszt nem futott. |
| Böngésző, mobil, PDF vizuális | Nem futott | A korábbi helyi szerverindítás mindkét loopback/bind címen `EPERM` hibával zárult; ebben a körben nem ismételtem a sikertelen indítást. Vizuális és hitelesített workflow továbbra is külön ellenőrzést igényel. |
| Teljes regresszió / adatbázis | Nem futott | A változtatás UI-szöveg és kliensoldali mezőválaszték; képlet, séma, RLS és perzisztencia-szerződés változatlan. |
| `git diff --check` | PASS | A végső tracked diff és az új fájlok külön whitespace-ellenőrzése sikeres. |

## F9.7.2 — egységes projektfolyamat-áttekintő

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-workflow-overview.test.ts src/features/projects/project-navigation.test.ts`: 3 fájl / 7 teszt; üres adatok, valós status mapping, latest version, project+organization link, tenant filters, no false completion, disclosure megmarad. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (webpack). |
| Böngészős smoke | PASS, desktop | Egy hitelesített helyi DEMO projekt: 3 kalkulátormodul státusza/linkjei, takeoff/quotation valós státuszösszesítő, Tetőmodellek és projektadatok látszottak; Kivitelezés csukva maradt. Egy ereszkalkulátor read-only bejárása ellenőrizte a magyar mezőket, bemeneti értékeket, revíziót, becslési korlátokat és tiltott átadást; adatot nem módosítottam. |
| Keskeny nézet | Nem ellenőrzött | A meglévő desktop Brave tab nem tett lehetővé viewport override-ot; reszponzív breakpoint csak forrásból ellenőrizhető. |
| Jogosultság/adatkonzisztencia | Forrás alapján | Új lekérdezések `organization_id` és `project_id` szűrtek; tető/kivitelezés meglévő projektlekérdezések újrahasználva. Csak SELECT listaadat, nincs mutáció. RLS/DB teszt ebben a körben nem futott. |
| Teljes regresszió / DB | Nem futott | Nincs séma, üzleti státusz, kalkulációs vagy átadási logika változás. |
| `git diff --check` | PASS | Végső változtatáskészlet whitespace ellenőrzése. |

### F9.7.2.1 — reszponzív és akadálymentességi QA

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Desktop vizuális / keyboard | Részleges PASS | Hitelesített Brave projektoldal: fókuszkeret látható billentyűzetes Tab után; Kivitelezés Space billentyűvel nyílt/csukódott. AX fa mutatta az egyedi linkneveket, szemantikus főcímet és natív disclosure-t. Nincs screen-reader QA. |
| 390 / 768 px | Nem futott | Böngészőleltárban nem volt viewport-override; nincs tényleges vizuális vagy overflow bizonyíték. CSS breakpoint: workflow 4→2 oszlop 850 px alatt, 1 oszlop 560 px alatt; kalkulátornavigáció 3→2→1; projektadat 760 px alatt 1 oszlop. Ez forrásvizsgálat, nem render QA. |
| Forrás/CSS akadálymentességi ellenőrzés | PASS, forrás alapján | Workflow modul linkek minimum 44 px magasak és saját fókuszkeretet kaptak; fő és kártyacímek h2/h3; státuszok szövegesek; natív `<details>/<summary>` expanded/keyboard szemantikát ad. |
| Jogosultság/adat-hozzáférés | PASS, forrás + teszt | Oldal a `getProjectForOrganization(orgId, projectId)` ellenőrzés null eredményénél leáll, és csak utána kéri le az aggregátumokat. A workflow query mindhárom táblát org+project szerint szűri; `project-workflow-data.test.ts` ezt közvetlenül ellenőrzi. RLS-t nem módosítottam. |
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-workflow-overview.test.ts src/features/projects/project-workflow-data.test.ts src/features/projects/project-navigation.test.ts`: 3 fájl / 8 teszt. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (webpack), `git diff --check`. |

## F9.7.3 — kalkulátor UX-konzisztencia

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Kalkulátor UI Vitest | PASS | `npx vitest run src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 3 fájl / 12 teszt; magyar revízióállapot és új változat mentési felirat regressziója, meglévő szakmai feliratok. SSR markup, nem kliensinterakció. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack). |
| Keskeny űrlap forrásellenőrzés | PASS, CSS alapján | 560 px alatt profilmezők és mentési vezérlők egy oszlopra váltanak. 390/768 px tényleges render vagy overflow nem igazolt. |
| Hitelesített böngészősmoke | Nem futott | Brave tablista üres; helyi szerverindítás korábbi körben `EPERM` hibát adott, nem ismételtem a korábban sikertelen viewport-emulációt. |
| SVG, katalógus és draft átadás UI | Nem ellenőrzött | E körben ezek elrendezése/vezérlése nem változott; a kliensszövegek alapján sem tekinthető elfogadottnak az interaktív viselkedés. |
| DB, jogosultság, üzleti logika | Nem futott / nem változott | Nincs action, snapshot, képlet, adatbázisséma, migráció, RPC vagy engedélyezési szerződés változás. |
| `git diff --check` | PASS | A feladatváltoztatásokra futtatva. |

## F9.7.3.1 — végső kalkulátor UX-konzisztencia

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/features/flashings/drawing-preview.test.ts src/features/flashings/calculator-ux.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 4 fájl / 18 teszt. Névváltozás miatti mentetlen állapot, élő és mentett rajzforrás, invalid rajz elrejtése, mentett eredmény/rajz/katalógus/átadási vezérlők, profil zoom és egyetlen illesztés/alaphelyzet gomb. SSR markup és tiszta UI-állapot teszt, nem kattintásos böngészőteszt. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Katalógus és átadás | PASS, forrás + markup | Eresznél darabegység, árhiány, mentett V-forrás és letiltási ok; szegélynél előzetes db/fm, kompatibilitás, árstátusz, stale/dirty jelzés; profilnál nettó m² és BA/K korlát megmaradt. Szerveraction és RPC változatlan; új backendteszt nem futott. |
| SVG és figyelmeztetés | PASS, célzott teszt + forrás | Szegélyrajz tiszta kiválasztási szabállyal élő/saved/invalid állapotban, billentyűzetes görgethető régió; profil zoomgombok és közös fit/reset; az eredmény és figyelmeztetés az átadás előtt. Fizikai touch nem ellenőrzött. |
| Hitelesített böngésző / 390 és 768 px / fizikai eszköz | UNVERIFIED | Brave tablista az előző körben üres volt, ugyanazt a nem elérhető workflow-t nem ismételtem. Viewport és touch/pinch vizuális QA F9.7.4. |
| Teljes regresszió / pgTAP / konkurencia | Nem futott | Kizárólag helyi UI-kód változott. Korábban bizonyított perzisztencia- és jogosultsági szerződésekre támaszkodik; új DB/RPC-változás nincs. |

## F9.7.4.1 — iPad runtime és UX korrekciók

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | 10 fájl / 30 teszt; `secure-uuid.test.ts` (native, fallback/v4, hiányzó RNG, kulcsstabilitás), `secure-uuid-runtime.test.ts` (mindhárom kalkulátor render `randomUUID` nélkül), keyboard/floating placement, projektrajz, preferenciák/persistencia/reset, approval és meglévő kalkulátor UX. |
| Typecheck / lint / production build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. A Vitest fókuszált, nem teljes regresszió. |
| UUID ok és idempotencia | PASS, dokumentáció + unit teszt | A `randomUUID()` secure-context API; az `HTTP 192.168.x.x` LAN-origin nem secure context. A `getRandomValues()` insecure contextben is elérhető; a közös helper ezt használja és v4/version/variant biteket állít. Takeoff payload/RPC nem változott. |
| Supabase LAN / Auth / jogosultság | RÉSZBEN DIAGNOSZTIZÁLT, hálózatilag blokkolt | `.env.local` effektív URL-je korábban `127.0.0.1:54321` volt; a feladat hostját használó `192.168.1.31:54321`-re módosítva. A browser/server client azonos publikus URL+publishable key-t használ; service-role nincs jelen. `curl` mindkét API címre HTTP 000; Docker socket `permission denied`, `supabase status` sandbox `EPERM` telemetria-írásnál. Auth/session és RLS nem futott. |
| Projekt rajzok / tenant scope | PASS, teszt + forrás | Több mentett nyeregtető külön modellnévvel, revízióval, egyedi címmel, meglévő nézetválasztókkal és részletes modell linkkel; a projektoldal már létező `getRoofModelsForProject(organizationId, projectId)` adatait használja, új query nincs. |
| Approval / keyboard / global settings | PASS, célzott markup és tiszta logika | Approval akció külön, tördelhető és térközzel elválasztott; VisualViewport resize esetén csak a kilógó fókuszmező kerül középre; csúszkák text/UI/spacing/drawing tengelye független, localStorage persist/reset útvonal tesztelve; a lebegő ikon fontos vezérlővel való geometriai ütközéskor elrejtőzik. Fizikai billentyűzet- és overflow QA nem futott. |
| Hitelesített böngészősmoke / iPad | Nem futott | Nincs böngészőtab; `npm run dev -- --hostname 0.0.0.0` bind `EPERM` miatt sikertelen. Fizikai iPad/iPhone nincs elérhető tesztkörnyezetben. Ne tekintsd mobil PASS-nak. |
| DB/RPC/pgTAP / képletek | Nem futott / nem változott | Nincs migráció, RPC, adatjogosultság, takeoff szerződés vagy számítási képlet változás; nincs DB reset vagy hosted Supabase érintés. |

## F9.7.5 — végső UX-finomságok és interakciós megbízhatóság

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/lib/user-facing-action-error.test.ts src/lib/unsaved-changes.test.ts`: 2 fájl / 4 teszt; konfliktus, jogosultság, hiányzó forrás, validáció, SQLSTATE/RPC szöveg kiszűrése és dirty/clean unload figyelmeztetés. |
| Typecheck | PASS, második futás | Első futás builddel párhuzamosan hiányzó generált `.next/types` fájlokat jelzett; `npm run build` után önálló `npm run typecheck` PASS. |
| Lint / production build / diff | PASS | `npm run lint`; `npm run build` (Next.js 16.4.0 webpack); `git diff --check`. |
| Érintett UI | Forrás alapján | Ajánlati dirty státusz `role=status`, hibák `role=alert`, pending mentés letiltva; successful save után navigál. Interaktív működés böngészőben nem ellenőrzött. |
| Böngésző / fizikai eszköz | Nem futott | Hitelesített tab nem volt elérhető; az előző F9.7.4.1 helyi bind `EPERM` hibája miatt nem próbáltam újra. Fizikai iPad/iPhone nincs igazolva. |
| Belső navigáció / loading / üres / destructive | Részben ellenőrzött | Dirty warning csak böngészőoldal-elhagyásra hat; SPA-navigációs prompt nincs. Projektlista üres állapota meglévő külön EMPTY UI; adatlekérés hibára dob, így nem címkézi üresként. Más modulok teljes állapot- és destructive auditja nem futott. |
| Adatbázis / jogosultság / idempotencia | Nem változott | Nincs schema/action payload/snapshot/approval permission/idempotency-változás. A korábbi adatkonzisztencia- és RLS bizonyítékokat ez a UI-kör nem futtatta újra. |

## F9.7.5.1 — maradék UX-megbízhatósági javítások

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/lib/user-facing-action-error.test.ts src/lib/unsaved-changes.test.ts src/app/loading-error-ui.test.ts src/features/material-takeoffs/takeoff-forms.test.ts src/features/calculators/data-loading.test.ts`: 5 megadott fájl / 13 teszt; dirty/cancel/confirm/unload, üres kontra lekérési hiba, loading/error UI, pending submit és safe error mapping. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. A build által módosított `next-env.d.ts` visszaállítva. |
| Loading / error | PASS, célzott markup + forrás | Nincs korábbi app loading/error fallback; új root `loading.tsx` jelzi busy/loading állapotot, root `error.tsx` safe Hungarian hibát és retry-t ad. |
| Failed request ≠ empty | PASS, célzott teszt + forrás | Eresz/szegély/profil source getterek különválasztják a sikeres üres listát a sikertelen querytől. Takeoff és quotation kapcsolódó query-hibákat is továbbadja a route error fallbacknek; projektek, tetőmodellek és kivitelezési fő workspace eddig is explicit hibát dobott. |
| Ajánlat navigáció | Részleges | Saját projekt-vissza link cancel/confirm guardot használ; editoron belüli egyéb ajánlatnavigáció rejtett, mentési success nem kér megerősítést, pending alatt vezérlők tiltottak. Browser Back és editoron kívüli útvonalak nincsenek elfogva; globális router/link interceptiont nem építettem. |
| Kritikus művelet | PASS, forrás + markup teszt | Takeoff tételhozzáadás és jóváhagyás pending gombot használ; approval immutabilitási következménye látható. Projektarchiválás meglévő visszaállítható megerősítése megmaradt; projektmásolat és kalkulátor mentés pending tiltást használ. |
| Böngésző / fizikai eszköz | Nem futott | Nincs hitelesített tab; korábbi dev bind `EPERM`, azonos környezet újrapróbálása elmaradt. Fizikai iPad/iPhone külön elfogadás. |
| DB / RLS / idempotencia / teljes regresszió | Nem futott / nem változott | Nincs migration, adatbázis-séma, RPC, approval rule, kulcs vagy számítási szerződés változás. |

## F9.7.5.2 — ajánlatpiszkozat navigáció utáni helyreállítása

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `quotation-draft-recovery.test.ts` + `unsaved-changes.test.ts`: 2 fájl / 6 teszt; helyi draft olvasás/írás, user/org/project izoláció, revízió mismatch, userváltás törlése, sérült JSON törlése, meglévő guard. |
| Typecheck / lint / production build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Mentés / történeti revízió | Kód szerint, adatbázissal nem ellenőrzött | Sikeres action eltávolítja recovery kulcsot; meglévő mentés változatlan `quote.version`-t küld, recovery csak kliensállapotot állít vissza. Nincs DB/RPC módosítás; immutabilitási tesztet vagy DB ellenőrzést nem futtattam. |
| Browser Back / visszatérés / explicit UI választás | UNVERIFIED böngészőben | Nem volt elérhető hitelesített browser tab, korábbi dev bind `EPERM`; automata teszt a tárolólogikát fedi, nem a valós history navigációt vagy kattintásos UI-t. Next 16.4 helyi docs alapján a `Link.onNavigate` kizárólag SPA Link navigációra vonatkozik. |
| Korlátok | Rögzített | Tab session végén/bezáráskor, tiltott vagy megtelt `sessionStorage` esetén draft elveszhet. Külső és browser-history navigáció nincs univerzálisan blokkolva; tárolható draft visszatéréskor explicit restore/discard döntést kap. |

## F9.7.6.1 — globális navigáció és standalone alapozás

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Fókuszált Vitest | PASS | `npx vitest run src/features/dashboard/dashboard.test.ts src/features/projects/project-navigation.test.ts src/features/execution/execution-overview.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 6 fájl / 28 teszt. Dashboard csak 5 tényleges területet hirdet, minden cél-URL viszi a kiválasztott szervezetet, nincs dokumentum-placeholder; projekt-navigáció és kivitelezés PASS; mindhárom kalkulátor projekt nélkül is renderel számítási felületet, miközben a mentés és takeoff UI rejtve marad. |
| Lint / build / typecheck | PASS | `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `npm run typecheck`. A production route-lista tartalmazza `/kalkulatorok`, `/ajanlatok`, `/kivitelezes` útvonalat és a meglévő projekt-route-okat. |
| `git diff --check` | PASS | A végső változtatáskészlet whitespace-ellenőrzése sikeres. |
| Szervezet és query-adatok | PASS, forrás + célzott teszt | Minden landing oldal `getProjectOrganization` tagság-kontextust használ és a választást az URL-en viszi tovább. A projektlekérdezés szervezet-szűrt; az execution overview csak `execution_plans.organization_id` szerint olvas metaadatot, majd az azonos szervezeti projektlistához mapeli. Meglévő RLS változatlan. |
| Jogosulatlan hozzáférés / adatbázis | Nem futott | Új route-ok membership selectiont és szervezet-szűrést használnak; pgTAP/RLS vagy Auth integráció nem futott. Runtime elutasításról nincs bizonyíték. Nincs migration, RPC vagy grant/policy változás. |
| Böngésző / reszponzív | Nem futott | CUA leltárban nem volt nyitott hitelesített tab. A korábban dokumentált dev-server bind `EPERM` hibáját nem ismételtem. Mobil/desktop tényleges render QA nincs; CSS forrás alapján grid breakpoint és mobil egymás alatti layout marad. |
| Standalone adatkonzisztencia | Stateless UI teszt + forrásvizsgálat + dokumentáció | Mindhárom kalkulátor csak a kliens oldalon számol és kifejezetten jelzi, hogy frissítéskor az eredmény elvész; save/transfer vezérlő nincs. Schema/RPC/képlet/árképzés nem módosult. `docs/STANDALONE_WORKFLOWS.md` rögzíti a `project_id`, immutable revízió/source, quotation finalization/PDF, RLS/FK és migrációs függőségeket. Standalone mentésre/projektkapcsolásra nem állítunk funkcionális PASS-t. |
| Teljes regresszió | Nem futott | A célzott teszt nem teljes regresszió; korábbi kalkulátor-, DB- és concurrency suite-okat nem ismételtem. |

Javasolt commit: `feat(F9.7.6.1): add global workflow navigation`.

## F9.7.6.2 — standalone ownership és globális tetőgeometria

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Geometriai preview és globális útvonal | PASS, célzott teszt + build | `npx vitest run src/features/roof-models/standalone-gable-preview.test.ts src/domain/calculations/gable-roof.test.ts src/features/dashboard/dashboard.test.ts`: 3 fájl / 10 PASS. Production build route-listája tartalmazza `/kalkulatorok/nyeregteto`; a preview meglévő `roof.gable` motort és `TechnicalDrawing` komponenst használ, mentési gomb nincs. Az első tesztfutás egy hibásan várt szöveget talált; címke/assertion pontosítása után az ismételt célzott futás PASS. |
| Ownership és sémaszerződés | Tervezési döntés | `docs/STANDALONE_WORKFLOWS.md`: standalone műhely + létrehozó tulajdon, csak aktív tagsággal a creator olvas; projekt rekordok a mostani tagsági szabályt tartják. Nincs migráció, DB-bizonyíték nincs. |
| Projekt és takeoff regresszió | Nem érintett, nem futtatott | Project-scope persistence, RPC, dependency, quotation és takeoff adatbázis-kód nem változott; teljes regresszió nem futott. |
| Typecheck / lint / build / diff-check | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. |
| Local Supabase / pgTAP | Meglévő tesztek PASS; standalone Auth/RLS nem tesztelt | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db`: 15 fájl / 434 teszt PASS kizárólag a helyi DB-n; reset és migráció nélkül. Ezek a meglévő projektmód szerződéseit fedik, nem bizonyítják az új standalone owner szabályt. |
| Standalone Auth/RLS / konkurencia | Nem implementált / nem ellenőrzött | Nincs új standalone RPC vagy sémaváltozás, ezért standalone izolációs és valódi párhuzamos mentési bizonyíték nincs. |
| Böngészős smoke | Nem futott | A CUA inventoryban nem volt browser tab, a globális route hitelesített szervezeti sessiont igényel; bejelentkezés és helyi szerverindítás nem történt. A source/build bizonyíték nem runtime browser/Auth bizonyíték. |
| Standalone persistence / association | Nincs implementálva | Ez a `.2` sématerv lépés; tényleges mentés/lista/reopen `.3`/`.4`, biztonságos project-link `.5`. A jelen milestone önmagában PARTIAL a teljes standalone követelményhez képest. |

Javasolt commit: `feat(F9.7.6.2): add global roof geometry preview`.

## F9.7.6.4 — standalone calculator frontend

| Terület | Eredmény | Bizonyíték / korlát |
|---|---|---|
| Standalone save/read/list UI | Kódszinten megvalósítva | A három meglévő editor az `saveStandaloneCalculationAction`-t hívja; a három route típushelyesen olvas; `/kalkulatorok/mentett` creator-scoped read modelből listáz és típus szerint szűr. |
| Célzott Vitest | PASS, 5 fájl / 23 teszt; 1 skip | `npx vitest run src/features/calculations/standalone-persistence.test.ts src/features/calculations/standalone-actions.local.integration.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts src/features/roof-models/standalone-gable-preview.test.ts`. Az első együttfutásban az opt-in Auth teszt SKIP; explicit bekapcsolva a Supabase CLI `docker.sock` permission denied miatt futása meghiúsult. |
| Typecheck | PASS | `npm run typecheck` külön, sikeres build után futott. Egy korábbi párhuzamos futás `.next/types` fájlgenerálási verseny miatt hibázott. |
| Lint / build / diff | PASS | `npm run lint`, `npm run build` (a `/kalkulatorok/mentett` route szerepel), `git diff --check`, `git diff --cached --check`. |
| Böngésző / fizikai mobil | UNVERIFIED | A CUA inventory nem tartalmazott tabot; hitelesített V1/V2 workflow, viewport és iPhone/iPad ellenőrzés nem történt. |
| Projektmód / roof preview | Kódszinten megőrizve | Projektmentési actionek elágazásai megmaradnak; roof preview-n nincs save action; pgTAP/backend nem változott és ebben a milestone-ban nem futott. |

Állapot PARTIAL, amíg az autentikált böngészős V1/V2 acceptance nem bizonyított. Javasolt commit: `feat(F9.7.6.4): integrate standalone calculator frontend`.

## F9.7.6.5.1 — standalone calculation project association (backend)

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Local migration history / apply | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase migration list --local`; new `20261014020000` ledger/RPC, `20261014020100` profile signature correction, and `20261014020200` append-only trigger applied with `supabase migration up --local`. Local only, incremental, no reset. |
| Local pgTAP authorization / provenance / regression | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/009_gutter_calculation.sql supabase/tests/database/011_flashing_calculation.sql supabase/tests/database/013_sheet_metal_profile.sql supabase/tests/database/016_standalone_calculations.sql supabase/tests/database/017_standalone_project_association.sql`: 5 files / 118 assertions. Covers exact revision and full source snapshot, org/creator/type, source immutability, privileged ledger UPDATE/DELETE rejection, cross-org destination, same-org noncreator, historical source, gutter/flashing/profile target contracts, same-key reuse and payload mismatch; existing project and standalone RPC regression. |
| Downstream project takeoff regression | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/010_gutter_takeoff_hardening.sql supabase/tests/database/012_flashing_takeoff_integration.sql supabase/tests/database/015_profile_takeoff_integration.sql`: 3 files / 94 assertions. Existing gutter/flashing/profile takeoff paths and approved record immutability remain intact; association itself creates no takeoff. |
| Authenticated Server Action | PASS | `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts`: 2 real local Auth users, 1/1 test. Owner associates; retry reuses; changed payload and nonowner source reject. Admin is limited to fixture/auth setup and cleanup. |
| Independent-connection idempotency | PASS | `SUPABASE_TELEMETRY_DISABLED=1 node scripts/verify-standalone-association-concurrency.mjs`: two authenticated PostgreSQL connections enter together with same operation/payload; one association row, one project revision, same target IDs, `reused=false/true`. Temporary DEMO project/source and helper objects are removed. |
| Focused TypeScript / typecheck / lint / build | PASS | Targeted standalone/domain Vitest: 4 files / 41 passed; default run skips the opt-in local Auth test, separately passed above. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) passed. |
| Browser / hosted / full historical suite | Not run | Backend-only milestone; no project picker yet. No hosted Supabase changes and no database reset. |

Állapot: **COMPLETE (BACKEND)**; a frontend workflow külön F9.7.6.5.2 mérföldkőben készült. Javasolt commit: `feat(F9.7.6.5.1): associate standalone calculations with projects`.

## F9.7.6.5.2 — standalone calculation project integration

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Entry visibility and current source contract | Automated, partial | Detail editors gate the action on a loaded saved current revision; the saved list passes only a current revision ID and supported calculator type. Historical selections and unsaved calculations do not provide this action. Confirmation component test covers exact V number and the explicit saved-revision choice for unsaved edits. |
| Project picker / access boundary | Implemented, automated not authenticated | Server action requires active organization membership and queries only same-organization, non-archived, non-DEMO projects; 50-row bound, name search, no customer fields. Actual RLS project selection was covered by earlier backend tests only at the association RPC boundary, not this new list action. |
| Confirmation, source preservation, stale context | Focused Vitest PASS | `npx vitest run src/features/calculations/standalone-project-association.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 4 files / 22 tests. Operation identity helper preserves same operation and profile target IDs on retry and produces new IDs for a new intent. Existing action enforces current source and RPC errors map to Hungarian refresh/reconfirmation. No new DB write contract. |
| Returned project route and revision identity | Implemented, runtime unverified | Success navigation uses the returned target calculation and revision IDs. Existing gutter/flashing project pages check both IDs; profile page checks profile/revision and selects them. Project calculator route components/build pass; authenticated created-record route was not opened. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Authenticated browser / physical mobile | UNVERIFIED | CUA inventory showed no browser tab or authenticated session; no browser workflow was run. Physical iPad/iPhone QA remains separate. |
| Association history UI | Not implemented | No frontend ledger read model existed; no privilege was broadened. A source-history indicator remains a future enhancement. |

Állapot: **PARTIAL**. Automated evidence does not prove the authenticated browser acceptance. No pgTAP/Auth suite was rerun because backend contracts were unchanged. Javasolt commit: `feat(F9.7.6.5.2): integrate standalone project copies`.

## F9.7.6.3 — standalone calculation persistence

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Fókuszált TypeScript/domain | PASS | `npx vitest run src/features/calculations/standalone-persistence.test.ts src/domain/calculations/gutter-material.test.ts src/domain/calculations/flashing-material.test.ts src/domain/calculations/sheet-metal-profile.test.ts`: 4 fájl / 41 teszt. Input-engine recalculation, geometry-ref tiltás, incomplete flashing és null BA/K width. |
| Local Auth Server Action integráció | PASS | `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts`: 2 valós helyi Auth user, 1 teszt. Mindhárom save, gutter V1/V2 + stale conflict, input/output újraszámolás, owner list/read/current/history; same-org nem creator listája üres és közvetlen rekordolvasása null. Admin kizárólag fixture/auth setup és cleanup. |
| Local pgTAP / project regresszió | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/009_gutter_calculation.sql supabase/tests/database/011_flashing_calculation.sql supabase/tests/database/013_sheet_metal_profile.sql supabase/tests/database/016_standalone_calculations.sql`: 4 fájl / 88 assertion. Creator owner, cross-org/forged org/ID, geometry source, direct insert, revision immutability, incomplete result, stale conflict; projektmód gutter/flashing/profile megőrizve. |
| Valódi concurrency | PASS | `SUPABASE_TELEMETRY_DISABLED=1 node scripts/verify-standalone-calculation-concurrency.mjs`: két külön `authenticated` PostgreSQL kapcsolat egyszerre indul; pontosan 1 V2 siker, 1 stale konfliktus, két összrevízió, V1 input változatlan. Lokális random DEMO fixture a script végén törlődik. |
| Migration / adatbázis állapot | PASS, local only | Latest applied előzmény `20261013081700`; az új `20261014010000` incremental `supabase migration up --local` paranccsal került be. Reset, hosted DB és demo seed törlés nem történt. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Böngésző / teljes regresszió | Nem futott | Backend milestone, frontend UX későbbi `.4`; célzott pgTAP és TS nem teljes történeti regresszió. Hosted DB/Auth és backup/restore nem ellenőrzött. |

Javasolt commit: `feat(F9.7.6.3): persist standalone calculations`.

## F9.7.6.6.3.2a — quotation dokumentumadat-alap

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Lokális migráció | PASS | `supabase migration up --local`; 040000 adat-alap, 040100 RPC-kompatibilitás és 040200 kibocsátói e-mail constraint alkalmazva, reset nélkül. |
| Standalone quotation + dokumentum pgTAP | PASS | `018_standalone_quotations.sql` + `019_quotation_document_data.sql`: 62/62. Issuer oszlopok, owner/member RLS, email constraint, manual/linked recipient snapshot, V1/V2, date-only metadata, sequence RLS és nulla draft-allokáció. |
| Valódi local Auth | PASS | `RUN_LOCAL_QUOTATION_DOCUMENT_VALIDATION=1 node scripts/verify-quotation-document-auth.mjs`: 9/9 valódi JWT ellenőrzés, helyi DEMO fixture-ekkel. |
| Dokumentum readiness Vitest | PASS | Invalid date/issuer-email/recipient-email, issuer/recipient hiány, valid draft státusz és `canIssue: false`. |
| Érintett Vitest | PASS | 6 fájl / 25 teszt: readiness, standalone UI state, draft recovery, standalone domain, HUF money és secure UUID. |
| Typecheck / lint | PASS | `npm run typecheck`, `npm run lint`. |
| Production build | PASS | `npm run build`, Next.js 16.4 webpack; standalone quotation route-ok bekerültek. |
| Diff ellenőrzés | PASS | `git diff --check`. |
| Authenticated browser smoke | PASS, fókuszált | `/ajanlatok/uj`: DEMO kézi címzett + megjegyzés V1 mentés; visszaadott quotation ID: `ea895051-f0b0-4e21-a833-f40c8a001703`; reload után mezők visszatöltve; global list entry látható; existing project quotation editor megnyílt; server readiness action visszajelzett. Issuer profile böngészős módosítása, V2/history és mobil QA nem történt. |

## F9.7.6.6.3.2b — pénzügyi contract és tax-neutral readiness

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Specifikáció és árbesorolás | PASS | Célzottan `QUOTATION_FINALIZATION_DESIGN.md`, `STANDALONE_WORKFLOWS.md`, `DATABASE.md`, `PROGRESS.md`, `TEST_MATRIX.md`; `money.ts`, standalone action/editor, issuer snapshot, numbering/RLS és revision szerződés olvasva. Nem találtunk jóváhagyott adókezelési esetet. |
| Helyi migration állapot | PASS | Előtte 20261014040200 volt utolsó alkalmazott migráció; `20261014040300_quotation_financial_contract.sql` `migration up --local`-lal felkerült reset nélkül. Hosted DB nem érintett. |
| Financial/quotation pgTAP | PASS | `supabase test db supabase/tests/database/018_standalone_quotations.sql`: 38/38; `019_quotation_document_data.sql`: 29/29. NET amount, no invented GROSS/tax, HUF/half-up metadata, creator/immutable document/numbering invariánsok. |
| Project quotation compatibility pgTAP | PASS | `003_quotation_finalization.sql`: 8/8 és `004_quotation_lifecycle.sql`: 11/11; a közös revíziós contract mellett a projekt finalization és lifecycle változatlanul teljesül. |
| Local Auth / RLS | PASS | `RUN_LOCAL_QUOTATION_DOCUMENT_VALIDATION=1 node scripts/verify-quotation-document-auth.mjs`: 9/9 valódi JWT ellenőrzés, owner issuer update, member denial, creator-scope, történeti issuer/recipient snapshot, számláló direct-read denial. A szkript DEMO fixture-jei a lokális DB-ben maradtak. |
| Érintett Vitest | PASS | `npx vitest run src/domain/quotations/financial-contract.test.ts src/domain/quotations/document-readiness.test.ts src/domain/quotations/standalone.test.ts src/domain/quotations/money.test.ts`: 4 fájl, 21/21. Decimal, half-up, maximumösszeg, NET/GROSS elkülönítés, unresolved/unsupported tax, readiness blocker és canIssue=false. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack). |
| Browser | PASS, egy fókuszált smoke | Helyi standalone editor: magyar unresolved tax/current revision/financial blockers, draft save elérhető; server readiness action lefutott és unsaved snapshot blockerrel tért vissza. Nem mentettünk új ajánlatot. Project PDF, V2 history és mobil regressziót nem futtattuk. |
| Teljes regression / concurrency | Nem futott | Nem változott finalize/write concurrency contract; a célzott suites nem teljes regressziók. |
| Diff | PASS | `git diff --check`. |

Nyitott: accounting jóváhagyott treatment/rate/formula/rounding, issuer status/joghatóság, NET/GROSS jelentése, kötelező dokumentumadatok, expiry és ajánlatszám-formátum. Issuance továbbra sincs: nincs finalization RPC, szám-allokáció, immutable issue snapshot vagy issued PDF.

## F9.7.6.6.3.2c — standalone draft PDF preview

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| PDF snapshot validation / render | PASS | `npx vitest run src/features/quotations/standalone-quotation-pdf.test.ts`: manual, LABOR, catalog price snapshot preservation; gross/contradictory contract denial; rendered PDF bytes and multipage page tree; shared project quotation document remains renderable. |
| Auth route | PASS, mocked boundaries | 9 focused tests total across PDF and route suites. Route tests cover authorized creator/exact revision, anonymous 401, other creator/cross-org/expired membership/forged quote/revision denial, private/no-store and safe filename. No direct Auth integration test was added. |
| Generated PDF content | PASS | Local 70-line PDF generated as 5 A4 pages; bundled Poppler `pdfinfo` + `pdftotext` verified repeated `PISZKOZAT`, `NEM VÉGLEGES AJÁNLAT` and clarification on each page, NET HUF labels/saved item content, and absence of VAT/gross/payable labels. |
| Authenticated browser | PASS, one focused local DEMO workflow | New standalone DEMO V1, one LABOR line at 25,000 HUF net; PDF viewer showed saved issuer/recipient, description, price and net subtotal. The editor readiness mismatch was later traced and corrected under F9.7.6.6.3.2d. |
| Typecheck / lint / build | PASS | `npm run typecheck`; `npm run lint`; `npm run build` (Next.js 16.4.0 webpack), rerun after the final PDF revision-label correction. |
| DB / Auth integration / lifecycle | Not run | No schema or write contract changed. Route-level auth is covered with mocked auth/session boundaries plus local authenticated browser access; no real Auth-route integration or pgTAP was run. No revision/status/number mutations in the route. |
| Diff check | PASS | `git diff --check` after code and documentation updates. |

Issuance remains blocked; `canIssue = false`. Tax treatment, atomic finalization, official number and issued PDF are outside this milestone.

## F9.7.6.6.3.2d — quotation financial consistency and PDF authorization hardening

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Financial mismatch | PASS | Saved DEMO line: `2 × 12 500 HUF = 25 000`; line total, revision subtotal, totals snapshot and financial contract agree. Optional JSONB null metadata caused validator rejection, not monetary mismatch. Regression normalizes only optional `notes`/catalog/takeoff IDs. |
| Draft versus issuance | PASS | Saved financial integrity permits preview; tax treatment, required issuer data, numbering and finalization remain independent blockers. `canIssue` stays false. No tax/GROSS/totals inference. |
| Authenticated HTTP PDF owner | PASS, local real browser session | Exact V1 and V2 revision URLs returned rendered PDFs. V1 contained the original line; V2 contained the later DEMO line. Invalid quote ID and unauthorized/nonexistent revision returned generic 404 bodies. |
| Historical editor revision | PASS, focused browser check | Selecting V1 initially reused V2 client state. The page now keys the editor by the selected revision ID; browser recheck showed the V1 original line and latest V2 line on their respective selections. |
| Other authorization boundaries | Partial | Active same-org noncreator, revoked membership, and cross-org HTTP session cases not executed. Existing route Vitest covers mocked creator/org/membership/revision boundaries; no direct real Auth integration suite was added. |
| Cache / privacy headers | Partial | Route tests assert private/no-store, PDF content type/disposition and safe error text. Headers were not inspected from a real HTTP response. |
| Revision immutability / no lifecycle mutation | PASS, local read after HTTP requests | V1 and V2 IDs, saved lines, 25,000 subtotal, `draft` status and V2 current revision remained as expected. No number allocation observed. Existing records were not deleted. |
| Project PDF regression | PASS, focused | `standalone-quotation-pdf.test.ts` includes and passed the shared existing project quotation renderer case. Project PDF authorization over HTTP was not rerun. |
| Tests / build | PASS | 5 focused Vitest files / 27 tests; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4 webpack). Physical mobile QA and full regression not run. |

Állapot a d.1 elfogadása előtti checkpointon: **PARTIAL**. A hiányzó HTTP bizonyítékokat az alábbi d.1 mérföldkő pótolta. Issuance továbbra sem támogatott.

## F9.7.6.6.3.2d.1 — standalone PDF HTTP security acceptance

| Ellenőrzés | Állapot | Bizonyíték / korlát |
| --- | --- | --- |
| Owner V1/V2 explicit revision | VERIFIED | Valódi Next HTTP GET és Auth cookie: mindkettő 200, `application/pdf`; `pypdf` szövegkinyerés a V1 és V2 egyedi DEMO snapshot jelölőjét mutatta. A PDF hash is eltért. |
| Same-org aktív tag | VERIFIED, denied | Valódi, másik felhasználói session: 404, `text/plain;charset=UTF-8`, PDF bájt nélkül, általános „Az ajánlat nem található.” üzenet. |
| Visszavont tagság | VERIFIED, denied | A tagságot helyi fixture előkészítéskor visszavontuk; érvényes Auth session HTTP 404-et, PDF nélküli általános választ kapott. |
| Másik szervezet / anonim | VERIFIED, denied | Másik org aktív tulajdonosa 404; cookie nélküli kérés 401. Egyik válasz sem tartalmazott PDF-et vagy SQL/stack/backend részletet. |
| Hibás/nem létező azonosítók | VERIFIED, denied | Hibás és hiányzó quotation ID, hibás revision formátum és hamis, érvényes UUID revision 404; általános szöveges válasz, PDF nélkül. Kihagyott `revision` query viszont a szerződés szerint a jelenlegi V2-t adta 200-zal. |
| Sikeres HTTP fejlécek | VERIFIED | Tényleges értékek: `Cache-Control: private, no-store, max-age=0`; `Content-Type: application/pdf`; `Content-Disposition: inline; filename="ajanlat-piszkozat-<UUID>.pdf"`; `X-Content-Type-Options: nosniff`. Nincs `public` cache direktíva vagy privát storage URL. |
| Elutasítási HTTP fejlécek | VERIFIED | `Content-Type: text/plain;charset=UTF-8`; `Cache-Control: private, no-store, max-age=0`; `X-Content-Type-Options: nosniff`. A hibaszöveg nem fed fel belső azonosítót, SQL-t, stack trace-t vagy backend URL-t. |
| Read-only / lifecycle | VERIFIED | HTTP GET előtt/után: `draft`, version 2, ugyanaz a current revision ID, pontosan két revízió, üres quotation document sequence. Számozás és finalizálás nem történt; a korábbi readiness vizsgálat `canIssue=false` állapotot igazolt. |
| Célzott teszt, build, DB, böngésző | UNVERIFIED ebben a d.1 körben | Alkalmazáskód nem változott; a korábbi d. mérföldkő 27/27 Vitest + typecheck/lint/build eredményét nem futtattam újra. pgTAP, hosted, projekt-PDF HTTP és mobil QA nem futott. |
| FAILED eset | Nincs elfogadási hiba | Az első, üres tételsorú helyi fixture 422-t kapott a PDF szerződés szerinti nettó HUF sor hiánya miatt; érvényes DEMO soros fixture-rel a teljes HTTP mátrix átment. |
| `git diff --check` | VERIFIED | A d.1 dokumentációs diff után ténylegesen futtatva. |

Státusz: **COMPLETE (PDF SECURITY)**. Csak helyi Supabase DEMO fixture és
helyi Next route szerepelt; adatbázis-reset vagy hosted művelet nem történt.
`supabase status` az opcionális helyi imgproxy, edge runtime, analytics, vector
és pooler konténereket leállította; a helyi API/DB elérhető maradt.
Javasolt commit: `test(F9.7.6.6.3.2d.1): verify standalone PDF HTTP security`.
## F9.7.7.1 — trapézlemez-fedés kalkulátor

| Ellenőrzés | Állapot | Bizonyíték |
|---|---|---|
| Domain fixtures | PASS | `npx vitest run src/domain/calculations/gable-trapezoidal-covering.test.ts src/features/roof-models/standalone-gable-preview.test.ts`: 2 fájl / 7 teszt PASS. Fixture: pontos és részleges oszlop, szimmetrikus síkok, teljes hossz, támogatott és hiányzó/hibás toldás, hiányzó adatok, termékhatár, explicit ráhagyás és mennyiségi határ. |
| Typecheck | PASS | `npm run typecheck`. |
| Lint | PASS | `npm run lint`. |
| Production build | PASS | `npm run build` Next.js 16.4.0 webpack; route build sikeres. |
| Diff check | PASS | `git diff --check`. |
| Browser / UI tests / iPad / iPhone | Nem futott | UI automatizáció nem került be; böngészős acceptance és fizikai eszközök nincsenek igazolva. A korábbi böngészős helyi bind EPERM korlátot nem próbáltam ismét. |
| Projekt/standalone forrás | Kódszinten integrált | Ugyanaz a domain motor és panel; projekt módban editori geometria, globális mód kézi `roof.gable` geometria. |
| Tartós mentés / DB / gyártói katalógus | Nem része ennek a fázisnak | Nincs adatbázis-módosítás vagy termékadat-következtetés. |

Állapot: **PARTIAL**. A domain és UI integráció létezik; UI automatizáció és
böngészős acceptance bizonyíték hiányzik, ezért a mérföldkő nem COMPLETE.


## F9.7.7.2a — trapézlemez-fedés persistence backend

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Domain + persistence contract | PASS | `npx vitest run src/domain/calculations/gable-trapezoidal-covering.test.ts src/features/roof-models/gable-trapezoidal-covering-persistence.test.ts`: 2 fájl / 9 teszt. |
| Typecheck | PASS | A build után külön futtatott `npm run typecheck` sikeres. |
| Lint | PASS | `npm run lint` és célzott ESLint sikeres. |
| Production build | PASS | `npm run build` — Next.js 16.4.0 webpack; teljes route build sikeres. |
| Célzott lint | PASS | `npx eslint src/features/roof-models/gable-trapezoidal-covering-actions.ts src/features/roof-models/gable-trapezoidal-covering-data.ts src/features/roof-models/gable-trapezoidal-covering-persistence.ts src/features/roof-models/gable-trapezoidal-covering-persistence.test.ts src/infrastructure/supabase/database.types.ts` sikeres. |
| Projekt exact source / historical snapshot | Kódszinten implementálva; DB UNVERIFIED | Action egy verified roof-model revisionhöz tartozó roof.gable dependencyt keres, és inputból számol; RLS/RPC nem futott. |
| Standalone ownership / org izoláció | Kódszinten implementálva; Auth UNVERIFIED | Meglévő owner-scoped calculations RLS + authenticated save RPC újrahasznosítva; valós Auth integráció nem futott. |
| V1/V2, immutability, expected revision | Kódszinten implementálva; pgTAP UNVERIFIED | Közös immutable revision táblák és operation-ID ledger; DB még nem alkalmazott/futtatott. |
| Kétkapcsolatos concurrency / retry | UNVERIFIED | Docker socket permission denied; két független DB kapcsolat nem indult el. |
| pgTAP contract | UNVERIFIED | A `supabase/tests/database/020_gable_trapezoidal_covering.sql` teszt elkészült; helyi Supabase Docker nem volt elérhető, ezért nem futott. |
| DB autoritatív numerikus output | FAIL / elfogadási gap | Az RPC státuszt és source-szerkezetet ellenőrzi, de nem számolja újra a domain outputot; authenticated direkt RPC megkerülheti a Server Action számítását. |
| Böngésző / UI | Nem futott | Backend-only feladat; teljes regresszió és UI elfogadás nincs állítva. |

Státusz: **PARTIAL**; COMPLETE (BACKEND) nem adható.

## F9.7.7.2a.1 — secure persistence completion

| Ellenőrzés | Tényleges eredmény |
|---|---|
| Helyi migráció | `npx supabase migration up --local`: `20261014050000` alkalmazva; reset és hosted DB művelet nélkül. |
| pgTAP | `npx supabase test db --local supabase/tests/database/020_gable_trapezoidal_covering.sql`: 1 fájl, 9/9 PASS. RPC grant és író tábla-jogosultság ellenőrizve. |
| Valós Auth/RLS + action integráció | `RUN_LOCAL_COVERING_TESTS=1 npx vitest run src/features/roof-models/gable-trapezoidal-covering.local.integration.test.ts` valós helyi Auth felhasználókkal és JWT-s Supabase kliensekkel: 2/2 PASS. Az action auth context tesztharness-injektált, a DB kliens és az RLS valós. Projekt és standalone mentés, creator/cross-org/revoked izoláció, hamis source/creator/org, közvetlen táblaírás, V1/V2 és history védelem lefedett. |
| Direkt RPC támadás | Authenticated kliens hamis `totalSheetCount=999999` outputtal: `42501`, a hamis számításhoz nulla eltárolt sor. |
| Valódi konkurencia | Két külön, jelszóval hitelesített író PostgreSQL kapcsolat lockra várását `pg_stat_activity` igazolta. Azonos expected revisionből egy V2, egy `40001`; azonos operation ID-nál egy V3, ugyanaz a revision ID, `reused=false/true`. |
| Domain/érintett regresszió | `npx vitest run src/domain/calculations/gable-roof.test.ts src/domain/calculations/gable-trapezoidal-covering.test.ts src/features/roof-models/gable-trapezoidal-covering-persistence.test.ts src/features/roof-models/standalone-gable-preview.test.ts src/features/calculations/standalone-persistence.test.ts src/features/roof-models/project-roof-drawings.test.ts`: 6 fájl, 20/20 PASS. Nem teljes regresszió. |
| Typecheck / lint / build / diff | `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS (Next.js 16.4.0 webpack); `git diff --check` PASS. A typecheck/build első futásának tesztfixture típushibáját javítottuk és mindkettőt újrafuttattuk. |

Frontend mentés/újranyitás és böngészős ellenőrzés nem futott; F9.7.7.2b feladata. A helyi tesztek DEMO fixture-eket hagynak a helyi adatbázisban.

## F9.7.7.2b — trapézlemez-fedés frontend mentés és revízió

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/features/roof-models/gable-trapezoidal-covering-ux.test.ts src/features/roof-models/gable-trapezoidal-covering-actions.test.ts src/features/calculations/covering-listing.test.ts src/features/roof-models/standalone-gable-preview.test.ts src/features/roof-models/gable-trapezoidal-covering-persistence.test.ts src/features/calculations/standalone-persistence.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/roof-models/project-roof-drawings.test.ts`: 9 fájl / 25 teszt PASS. Nem teljes regresszió. |
| Typecheck, lint, build, diff | PASS | `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS; a builddel párhuzamos `npm run typecheck` a `.next/types` átmeneti fájltörlésébe ütközött, ezért a build befejezése után sorosan újrafuttatva PASS. |
| Browser: standalone | PASS helyi Brave | Hitelesített DEMO műhely: V1 mentés, URL újratöltés, V2 mentés, V1 input/20 db/SVG, vissza V2/40 db, listázás és típusfilter. |
| Browser: projekt | PASS helyi Brave | Meglévő DEMO tetőmodell V4-ből V1 fedés mentve és újratöltve; a UI pontos forrásrevíziót mutat. Helyi read-only DB: input roof revision = dependency upstream roof revision `d11e0843-91bb-4089-b245-ad0879fbfb4b`, kapcsolt `roof.gable` calculation revision `60a1ba98-b291-4ee5-a831-0233e4a626bb`. |
| Browser: nem mentett módosítás | PASS helyi Brave | Revízióválasztás figyelmeztetést adott; Mégse megtartotta a szerkesztett 900 mm-t, OK visszatöltötte a mentett 1000 mm-t. |
| Más készülék / hálózat / több kliens | UNVERIFIED | iPad/iPhone Safari, hálózati válasz megszakadása és két böngésző egyidejű mentése nem futott; operation ID és expected revision szerződés automatizált és korábbi backend tesztekben igazolt. |

## F9.7.7.3a — projekt fedésből takeoff piszkozat

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Új pgTAP szerződés | PASS | `npx supabase test db --local supabase/tests/database/021_gable_covering_takeoff.sql`: 1 fájl, 33/33. Mennyiség/egység, snapshot, stale forrás, unit/dimensions, org/project, immutable tétel, actor execution grant, explicit approval utáni retry és jóváhagyott takeoff védelme. |
| Valós local Auth/RLS és action | PASS | `RUN_LOCAL_COVERING_TESTS=1 npx vitest run src/features/roof-models/gable-trapezoidal-covering.local.integration.test.ts`: 1 fájl, 3/3. Helyi Supabase Auth JWT kliensek, projektforrás, exact historical V1, read model, authenticated direct RPC-denial és idegen műhely elutasítás. DEMO rekordok helyben maradnak. |
| Valódi kétkapcsolatos retry | PASS | Ugyanazon operation ID-val két külön writer PostgreSQL session egyszerre várt advisory lockra (`pg_stat_activity`); feloldás után ugyanaz a draft/item ID érkezett, egy új sort tárolt. `created` értékek: true/false. |
| Mennyiségi / action tesztek | PASS | Célzott Vitest a 20 db-os példára, `piece` egységre, 5000 mm hosszra, area/db különbségre, forged output elutasításra, unsupported többsoros layout-ra, pontos revízióra és auth hibákra. (Az összesített futás alább.) |
| Korábbi takeoff DB regresszió | PASS | `npx supabase test db --local supabase/tests/database/010_gutter_takeoff_hardening.sql supabase/tests/database/012_flashing_takeoff_integration.sql supabase/tests/database/015_profile_takeoff_integration.sql`: 3 fájl / 94/94. |
| Célzott Vitest | PASS | 12 megadott domain, covering, takeoff action/read-model/UI contract fájl: 11 fájl PASS, 1 opt-in local integráció SKIP; 34 PASS, 3 SKIP. Az opt-in integráció külön futtatva 3/3 PASS. Ez célzott, nem teljes regresszió. |
| Typecheck / lint / production build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) sorban PASS. |
| Diff ellenőrzés | PASS | `git diff --check` sikeres a végleges diffen. |
| Böngésző / frontend | NEM RÉSZE | Ez backend mérföldkő volt; a választó UI és annak ellenőrzése F9.7.7.3b. |
| Hosted DB, reset, commit, push, deploy | NEM FUTOTT | A lokális új migráció reset nélkül alkalmazva; hosted állapot nem módosult. |

## F9.7.7.3b — trapézlemez-fedés anyagkimutatás UX

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Mentett revízió és katalógus UI | PASS | A szerveroldali opciószűrés kizárólag aktív `roof_covering`/`sheet_metal`, `piece` variánsokat ad; ismert szélesség/hossz csak egyezéskor ajánlható. A pontos historikus fedés- és tetőrevízió, db mennyiség, méretek, stale állapot, provenance és ár-elérhetőség megjelenik. |
| UI/opció/action célzott Vitest | PASS | `npx vitest run src/features/roof-models/gable-covering-takeoff-ux.test.ts src/features/roof-models/gable-covering-takeoff-creation.test.ts src/features/roof-models/gable-trapezoidal-covering-ux.test.ts src/features/roof-models/gable-trapezoidal-covering-takeoff-actions.test.ts`: 4 fájl / 15 teszt PASS. SSR UI-állapot, V1/20 db, stale jelzés, unsaved megerősítés, inkompatibilis méret, scope és operation ID helper. Nem teljes regresszió. |
| Typecheck / lint / production build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack). |
| DB, jogosultság és idempotencia | KORÁBBI BIZONYÍTÉK | A 3a helyi pgTAP, authenticated Auth/RLS/action és kétkapcsolatos idempotencia eredményei változatlanul érvényesek; ebben a mérföldkőben adatbázis nem változott. Lásd a 3a sortáblát. |
| Böngészős smoke | PASS (HELYI) | Hitelesített `local.owner@local.test` sessionnel a projekt DEMO fedés V1 / V4 tetőforrás kiválasztva; a 26 db, 7000 mm, méretek, aktuális forrás, DEMO provenance, hiányzó ár és draft-korlátok látszottak. Katalógusból egyező DEMO `piece` variánssal létrejött draft `922e2bd4-e8a9-468f-8a1c-989e12dda677`, a pontos takeoff URL nyílt meg és a draft 26 db-os tételként jelent meg, ár és jóváhagyás nélkül. A 6500 mm-es inkompatibilis variáns nem jelent meg a selectorban. A helyi DEMO katalógus-fixture és draft megmaradt. Hosted környezet, mobil Safari és valódi megszakított hálózati retry nem tesztelt. |
| Hosted DB, reset, commit, push, deploy | NEM FUTOTT | Nincs hosted vagy romboló művelet. |

Állapot: **COMPLETE (TAKEOFF BACKEND)** a teljes hosszú, egy sor/sík támogatott
fedési kiosztásra. Az opt-in Auth teszt valós helyi Auth/RLS, DB writer és két
PostgreSQL kapcsolat segítségével futott; ezek nem hosted környezetek.

## F9.7.7.4a — cserepeslemez-fedés motor és előnézet

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Domain numerikus és státusztesztek | PASS | `npx vitest run src/domain/calculations/gable-metal-tile-covering.test.ts`: pontos 10 oszlop/sík és 20 db, 10 001 mm részleges szélesség és 22 db, 100 m² tetőfelület, fizikai/effective hossz különbsége, modulképlet, hiányzó/hibás adat, limit, átlapolás, túl rövid lemez, invalid geometria és oszloplimit. |
| Projekt / standalone UI | PASS | `npx vitest run src/features/roof-models/gable-metal-tile-covering-preview.test.ts`: projekt geometriaprovenance, hiányos termékállapot, nincs félrevezető SVG vagy mentés; külön projekt nélküli kézi tetőinput jelenik meg. A projekt tetőform a live `roof.gable` kimenetet adja át a közös preview-nak. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; `/kalkulatorok/cserepeslemez` route megjelent), `git diff --check`. |
| Adatbázis / perzisztencia | NEM ALKALMAZHATÓ | Nincs DB-kontraktus, migráció, mentés, RLS vagy takeoff. |
| Böngészős smoke | UNVERIFIED | A CUA böngészőleltárban nem volt nyitott tab/session; authenticated workflow nem volt elérhető. |
| Hosted DB / reset / commit / push / deploy | NEM FUTOTT | A scope tiltja, és nem szükséges a motor/előnézet mérföldkőhöz. |

## F9.7.7.4b.1 — cserepeslemez backend perzisztencia

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Persistence Vitest | PASS | A célzott négyfájlos futás lefedte a `roof.gable` újraszámolást, standalone/project input contractot, katalógus/metaadat nélküli kézi mentést, hibás moduladat és toldás elutasítását. |
| Standalone V1/V2 és történeti olvasás | PASS | Valós helyi Auth/RLS: V1 mentés + azonos operation ID retry új revision nélkül; V2 20→40 db; aktuális és V1 olvasásban a 20 db-os V1 snapshot változatlan. A forged kliens-output figyelmen kívül maradt, a tárolt output szerveroldali 20 db. |
| Projekt exact forrásrevision | PASS | Valós local Auth/RLS: a request 12 345 mm-es eltérő kliensgeometriát adott, de a revision az exact mentett tetőrevízió 10 000 mm inputját, linked `roof.gable` calculation revisiont és `roof_geometry_input` dependencyt rögzítette. |
| Auth/RLS és hamisított RPC | PASS | Local Auth felhasználók (owner, peer, idegen org): standalone creator-scoped read/list, projekthez azonos org tagság, cross-org denial; authenticated közvetlen save RPC `42501`, direct type-specifikus calculation insert tiltva; a restricted writer RPC-t idegen org actorral és visszavont tagságú actorral is `42501` elutasította. A pgTAP EXECUTE/grant/policy tesztje 12/12 PASS. |
| Revízió immutable | PASS | V2 után V1 változatlan; authenticated update `RETURNING` üres sort adott és a snapshot olvasás változatlan maradt; service-role update-et a committed-revision trigger `immutable` hibával elutasítja. |
| Modularitás és validáció | PASS | Érvénytelen modulkompatibilitás Server Action mentését elutasította; a mentési contract csak VALID engine outputot enged tovább. Pure persistence tesztek 4 esetben. |
| Idempotencia és konkurencia | PASS | Két külön PostgreSQL writer kapcsolat ugyanazon expected V1-re várt a calculation advisory lockon; pontosan egy V2 nyert, a másik `40001`. Két egyidejű azonos operation retry egy V3 revisiont hozott; `reused` false/true és azonos revision ID. |
| Teljes célzott Vitest | PASS | 4 fájl / 18 teszt: engine, preview regresszió, persistence contract és valós local Auth/RLS/concurrency. Az első run egy tesztelvárás-hibát jelzett; javítás után célzott suite 18/18 PASS. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| DB állapot és hosted művelet | PASS / NEM FUTOTT | Migráció `20261015050000` helyi adatbázison reset nélkül alkalmazva. Hosted Supabase, reset, commit, push, deploy nem történt; a teszt DEMO rekordjai helyben maradtak. |

## F9.7.7.4b.2 — cserepeslemez mentési UX

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Preview Vitest | PASS | `npx vitest run src/features/roof-models/gable-metal-tile-covering-preview.test.ts`: 1 fájl / 5 teszt PASS; korábbi revision saját bemenet/eredmény/SVG, standalone geometria és azonos retry operation ID. |
| Standalone authenticated workflow | PASS | Helyi Auth: kézi geometriás V1, URL-es újranyitás/frissítés, hasznos szélesség 1000→900 mm-es V2, V1 (20 db) visszanézés és V2 (24 db) visszaállítás. A mentett számítások `Cserepeslemez-fedés` listájában V2 látszott; a direkt megnyitás ugyanazt az ID-t, 900 mm-t, 24 db-ot és SVG-t adta vissza. |
| Projekt authenticated workflow | PASS | Helyi aktív owner-tagság: `roof.gable` V4 forrásból fedés V1 mentés/frissítés, 900 mm-es V2 és V1 saját 1000 mm/26 db/218,4 m² snapshotjának visszaolvasása. DB ellenőrzése: forrás tetőrevízió `d11e0843-91bb-4089-b245-ad0879fbfb4b`, V2 effective width 900 mm, szervereredmény 28 db. |
| Biztonság / DB / konkurencia | Korábbi 4b.1 bizonyíték | A Server Action/RLS/immutability/idempotency és két független DB-kapcsolat tesztje a backend mérföldkőben futott; ebben az UX-változásban backend és DB-séma nem módosult, ezért nem futott újra. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Mobil QA / hosted / commit | Nem futott | Külön iPad/iPhone QA és hosted DB ellenőrzés nincs. Commit, push, deploy nincs. |

## F9.7.7.4c.1 — cserepeslemez takeoff backend

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Transfer domain + action Vitest | PASS | Öt célzott fájl, 22 teszt: engine/preview regresszió, szerveroldali mennyiség, snapshot reprodukálhatóság, jogosultsági ágak, korábbi trapéz átadási action. |
| Local database transfer/security | PASS | `supabase test db --local supabase/tests/database/022_gable_metal_tile_takeoff.sql`: 33/33 assertion. Fizikai 5200 mm és effective 5100 mm külön marad; exact történeti calc V1/roof V1 és stale állapot, 20 darabos tesztforrás; hibás modul, dimenzió, projekt/org, authenticated direkt RPC, item módosítás és approval retry lefedve. |
| Trapéz regression | PASS | `supabase test db --local supabase/tests/database/021_gable_covering_takeoff.sql`: 33/33 assertion. |
| Auth/RLS | PASS | Helyi authenticated DB role `auth.uid()`-val, nem tag takeoff/item olvasása RLS-szel üres; authenticated direct RPC 42501; cross-org írási kísérlet elutasítva. |
| Két DB-kapcsolat | PASS | `node scripts/verify-metal-tile-takeoff-concurrency.mjs`: független CLI DB sessionök azonos műveletre 1 létrehozást és 1 reuse-t adtak, 1 draft/1 item/28 piece. A teszt korábbi 4b.2 helyi projektforrás-fixturn használ. |
| Typecheck / lint / production build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. Az első párhuzamos typecheck a build által újraírt `.next/types` miatt hibázott; build után önállóan újrafuttatva PASS. |
| UX / hosted / reset | NEM FUTOTT | Csak backend készült. Hosted Supabase, adatbázis-reset, commit, push és deploy nem történt. Következő: F9.7.7.4c.2 simplified takeoff UX. |

## F9.7.7.4c.2 — cserepeslemez takeoff UX

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | 5 fájl / 19 teszt: transfer UI/helper/action és trapéz takeoff UX regresszió. Exact revision, mennyiség, V1/V2 eltérés, ismert méret-/modul-inkompatibilitás, módosított payload új operation ID-ja, mentetlen geometriás megerősítés és dialógustartalom. |
| Hitelesített local browser | PASS | Projekt `1340d579-d1b1-496c-a3c5-1f7e75019413`; fedési V2 `15d60e59-b0a9-461d-92e0-3111ba3bff4d`, exact roof V4 `d11e0843-91bb-4089-b245-ad0879fbfb4b`, 28 db. Mentetlen preview adat után a dialógus megerősítést kért. Ár nélküli, kézi/DEMO provenance-ú variánssal takeoff draft `2dc9db5c-ba1a-40dc-af91-927cffc04b25` létrejött és megnyílt; provenance és árhiány látható volt. |
| Katalógusszűrés | RÉSZBEN | Kompatibilitás egységtesztje lefedi az ismert szélesség, hossz és modul eltérésének kizárását, valamint a hiányzó opcionális moduladat elfogadását. Browserben kompatibilis DEMO variánst mentettünk; a selector teljes opciólistáját külön nem vizsgáltuk. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| DB biztonság / mobil / hosted | Korábbi backend bizonyíték / NEM FUTOTT | Sémát/actiont nem módosítottunk, így a 4c.1 local Auth/RLS, forged RPC és két-kapcsolatos concurrency bizonyítéka érvényes. iPad/iPhone QA és hosted DB nem futott; helyi DEMO variáns/draft megmaradt. |

## F9.7.8.1 — helyszíni felmérés MVP

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Domain/action/UI Vitest | PASS | `npx vitest run src/domain/field-surveys/contracts.test.ts src/features/field-surveys/field-survey-actions.test.ts src/features/field-surveys/field-survey-editor.test.tsx`: 3 fájl / 12 teszt PASS; külön `npx vitest run src/features/dashboard/dashboard.test.ts`: 1 fájl / 4 teszt PASS. Egységek, template, opcionális mezők, auth/error/conflict/action, dirty/duplicate-submit/editor states. |
| Local Auth/RLS pgTAP | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/023_field_surveys.sql`: 24/24. Local Auth subject, creator és org membership, projekt-kapcsolat, authenticated direct write/RPC jogosultság, forged/invalid unit/count, peer és cross-org szűrés, version V2/stale, nincs calculator side effect. |
| Független DB kapcsolatok | PASS | `SUPABASE_TELEMETRY_DISABLED=1 node scripts/verify-field-survey-concurrency.mjs`: két önálló CLI DB session V1-ről párhuzamos V2-t próbált; egy frissítés és egy 40001 stale konfliktus, végső verzió V2. |
| Hitelesített local browser | PASS | Brave production builden: standalone felmérés `93b3e45b-f86b-433e-a01e-16727d9c64e9`, V1 mentés, frissítés, lista/újranyitás, szerkesztés V2-re, frissítés; 9.1 m, 4.2 m és megjegyzés visszaolvasva. Projektfelmérés `dd2f7790-0ed6-460e-8ba5-4371a91d7742`, projekt `1340d579-d1b1-496c-a3c5-1f7e75019413`, V1 mentés/frissítés; 6.8 m, 3.4 m, megjegyzés és projektkapcsolat visszaolvasva. Mindkét adat DEMO. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` Next.js 16.4.0 webpack, `git diff --check`. |
| Fizikai mobil / hosted | Nem futott | iPhone/iPad valódi készülék QA és hosted Supabase ellenőrzés nem történt. A desktop Brave smoke nem igazolja a fizikai touch/viewport működését. |

## F9.7.8.2 — helyszíni fotók és kalkulátor-átadás

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Local Auth/RLS pgTAP | PASS | `024_field_survey_photos_handoff.sql` + regressziós `023_field_surveys.sql`: 55/55. Direct authenticated metadata/write RPC tiltás, standalone creator-scope, active project-member photo read, cross-org izoláció, snapshot immutabilitás, idempotens reservation, invalid unit/MIME, soft detach. |
| Valós DB konkurencia | PASS | `scripts/verify-field-survey-concurrency.mjs`, két független DB-kapcsolat: párhuzamos V2 írásból egy mentés, egy stale 40001 konfliktus, current V2. |
| Fókuszált Vitest | PASS | `src/domain/field-surveys`, `src/features/field-surveys`, gutter/flashing UX és roof preview: 6 fájl / 28 teszt. Szemantikus mapping (eresz, tető, szegély), hiányzó/ambiguous érték, provenance, meglévő motor-prefill regresszió. |
| Hitelesített local browser | PASS | Eresz DEMO V1 mentés; JPEG/PNG/WebP fotó feltöltés és refresh utáni olvasás; fotó eltávolítása V4-ben, visszakereshető V3 snapshot; V5 demo tetőábra feltöltése és reload; mentett V2 felmérésből gutter kalkulátor 3 ereszszálat számolt. Nyeregtető V1 exact felmérésből 100 m² / 36,87°-ra számolt. Cross-org photo GET 403; hamis PNG tartalom kliensoldali tartalom-validációnál visszautasítva. Minden input és kép DEMO. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` Next.js 16.4 webpack, `git diff --check`. |
| Mobil és hosted | Nem futott | Fizikai iPhone/iPad és hosted Supabase nem ellenőrzött. HEIC nem támogatott; a UI JPEG/PNG/WebP-t ajánl (max 10 MB). Legacy felmérésből a migration csak aktuális állapotot tudott snapshotolni; korábbi változások/fotók nem rekonstruálhatók. |

## F9.7.8.3 — helyszíni felmérés mobil használhatósága

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | 10 fájl/42 teszt: mobil mező/korábbi revízió, magyar numerikus hiba, HEIC fallback, tényleges képdekódolás és EXIF eltávolítás, V1/V2 kép-URL izoláció, jogosulatlan kérés, sikertelen feltöltés utáni azonos kulcsos retry, eresz/szegély/tető átadás regresszió. TSX tesztfájlok is bekerültek a Vitest konfigurációba. |
| Helyi Auth/RLS pgTAP | PASS | `supabase test db --local` a `023`, `024`, `025` fájlokkal: 68/68. V1/V2 snapshot, törölt kép története, peer/cross-org tiltás, V1/V2 save retry és eltérő/stale payload konfliktus. Migration reset nélkül alkalmazva. |
| Konkurencia | PASS | `node scripts/verify-field-survey-concurrency.mjs`: két független DB-kapcsolat, egy V2 és egy 40001 konfliktus. |
| Hitelesített mobil böngésző | PASS, emuláció | Brave DevTools iPhone 16 Pro Max 440×956: DEMO standalone V1 8,7 m, JPEG V2, reload, 9,1 m V3, reload, kalkulátorban 9100 mm/exact V3. Korábbi DEMO V2 képet, V3 üres állapotot mutatott; iPad Mini 768×1024 kalkulátornézet. |
| Fizikai készülék/Safari | UNVERIFIED | Nincs fizikai iPhone/iPad. Kézi ellenőrzés: Safari kamerakép, HEIC export-útmutatás, megszakított feltöltés és újrapróbálás, történeti V1/V2 képek, iPad szerkesztés és átadás. |
| Typecheck/lint/build/diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Hosted Supabase, reset, commit, push, deploy nem történt. |

## F9.7.9 — egységes felmérési munkafelület

| Ellenőrzés | Tényleges eredmény / bizonyíték |
|---|---|
| Célzott automatizált regresszió | `npx vitest run src/domain/field-surveys src/domain/calculations src/features/field-surveys src/features/gutters src/features/flashings src/features/roof-models src/features/quotations src/features/calculations src/features/dashboard/dashboard.test.ts src/app/api/felmeresek`: 44 fájl / 196 PASS, 5 fájl / 18 környezethez kötött teszt kihagyva. Ez célzott regresszió, nem teljes repóteszt. |
| Javítások utáni célzott futás | `npx vitest run src/domain/field-surveys src/features/field-surveys src/features/quotations`: 9 fájl / 38 PASS; 1 fájl / 3 opt-in local teszt ebben a futásban kihagyva. A local tesztek alább ténylegesen lefutottak. |
| Valós helyi Auth/Storage/alkalmazás | `RUN_LOCAL_SURVEY_WORKSPACE_TESTS=1 npx vitest run src/features/field-surveys/workspace.local.integration.test.ts`: 3/3 PASS. A: saját ereszfelmérés, valódi privát PNG feltöltés és visszaolvasás, szakaszkapcsolás, eltávolítás utáni történeti kép; 8500/4000 → 3 szál, exact revíziókapcsolat. B: három szakasz, meglévő trapézlemez-/cserepeslemez-/szegélymotor mentése és read-model összesítője (20/20/6 db). C–E: semmi/projekt/standalone draft/mindkettő, jogosult meglévő projekt, valódi ID/státusz/revízió, újrapróbálás, eredeti projektmező változatlan; megszakított ajánlatlépés után a sikeres projekt megmarad és újrahasznosul. Peer/cross-org olvasás és kapcsolás tiltása. |
| Új DB/RLS szerződés | `npx supabase test db --local supabase/tests/database/026_unified_field_survey_workspace.sql`: 41/41 PASS. Hiányos/null mérés, több szakasz, teljes snapshot, szakasz-only V2/retry/stale; direkt link/followup írás és privilegizált fotóíró tiltás; creator/aktív tagság/cross-org, nem saját számítás, hibás revíziópár/szakasztípus/fotó, stale followup és más felmérésből hamisított revízió; eredeti history immutabilitás és üres draft null összeg. |
| Meglévő DB regresszió | Együtt futott a `026` akkori 38 assertionjével: `023`, `024`, `025`, `009`, `011`, `016`, `018`, `020`, `022_gable_metal_tile_covering`, `002`, `003`, `004`: 13 fájl / 261 PASS. Ebből 223 a változatlan regressziós assertion; a végleges új szerződés külön 41/41 fent. Legacy felmérés/fotó, standalone és projektkalkuláció, projekt/standalone ajánlat és lifecycle. |
| Tényleges konkurencia | `node scripts/verify-survey-workspace-concurrency.mjs`: PASS; két külön authenticated PG-kapcsolat, monitorral igazolt 5 lock contention: azonos V1 létrehozási retry, különböző szakasztartalmú V2 verseny (egy 40001), projekt, projektajánlat és exact számításkapcsolat. Két revízió, egy projekt, egy ajánlat. DEMO fixture: `8e7be2e3-959e-46bc-9107-6b99915cfa0a`. |
| Típus/lint/build/diff | `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check`: PASS. Egy párhuzamos typecheck/build kísérlet generált `.next/types` fájlversenyt okozott; a külön, build utáni typecheck sikeres. |
| Hitelesített LOCAL böngésző | Egy fókuszált Brave production workflow, `localhost:3001`: dashboard → új tető+eresz+szegély → V1 mentés/reload → helybeni ereszkalkulátor (8500 mm és 4000 mm, 3 szál) → mentés/link → összesítő → projekt+projekt-DRAFT → retry → meglévő ajánlatszerkesztő, v1, ügyfél/tételek és összeg nélkül. Visszatérés után nem mentett 11 m, böngésző Back, újbóli megnyitás és explicit session-piszkozat visszaállítás, majd V2 mentés. Összesítő továbbra is V1 forrású 3 szálat és változatlan ajánlatkapcsolatot mutatott. Egy végső vizuális képellenőrzés; nincs screenshot-loop. |
| Nem futott / határok | Teljes repóregresszió, fizikai iPhone/iPad/Safari, mobil viewport-emuláció, hosted Supabase és offline működés nem ellenőrzött. A Back figyelmeztetés megszakító ága nem kapott külön böngészős bizonyítékot; a mérési helyreállítás igen. A lokális DEMO Auth/DB/Storage fixture-ek megmaradtak. Nincs reset, hosted migráció, commit, push vagy deploy. |

Böngészős rekordbizonyíték, külön helyi SQL-visszaolvasással:
- Felmérés: `a6ffeb74-7fc7-4696-9f51-39d244c3f7f5`, 3 szakasz, current V2;
  V1 tetőhossz 10 m, V2 11 m; mindkét eredeti `project_id=null`.
- Forrás V1 revision: `7de5a404-ddd1-4527-a0e4-0397d0b493ef`.
- Ereszszámítás: `daa1c476-775f-4850-8539-7ae705d79c87`, revision
  `a4101243-24b3-4634-8a67-372a6fd1e7f3`, 3 szál, továbbra is survey V1.
- Projekt: `b62d8921-b8be-4ebb-8875-1048589b083f`.
- Projektajánlat: `b03d60a3-32a5-4635-bd9a-a7785d2b72b5`, revision
  `15d969a6-4d5e-42b4-8783-7ca33f2a2c5d`, `draft`, 0 sor, `subtotal=null`.
  Egy projekt- és egy ajánlatkapcsolat az ismétlés után is, eredeti V1 forrással.

Állapot: **COMPLETE (UNIFIED SURVEY WORKSPACE, LOCAL)**. Az ismert
környezet-/opcionális határok fent külön szerepelnek; ezek nem hosted vagy
fizikai eszközös elfogadás állításai.

## F9.7.10 — helyszíni munkafolyamat és mobil használhatóság

| Ellenőrzés | Állapot | Tényleges bizonyíték / korlát |
|---|---|---|
| Teljes DEMO munka | BROWSER VERIFIED | Helyi, hitelesített Brave: 3 munkaszakasz, mérések, privát PNG, helybeni tető/eresz/szegély kalkulátor, 2 mentett és újranyitott számítás, összesítő, projekt és üres projekt-DRAFT, frissítés utáni újranyitás. Tető hiányzó túlnyúlás, szegély ismeretlen toldás → nincs kitalált eredmény. |
| Adat/revízió | SQL VERIFIED | Survey `185aa689-134e-4852-988b-3a7a67abe5c6` V4, 3 szakasz, 1 fotó, 2 számítás. V3 revision `d79571ee-2ca2-4d68-9d9b-22853baefdca` a 2 calc és az 1 projekt/1 ajánlat pontos forrása; V4 tetőhossz 11 m, számítás V3 maradt. Quote 0 sor, `subtotal=null`; dupla kattintás után is egy followup-pár. |
| Reprodukált javítások | IMPLEMENTED + BROWSER VERIFIED | Első mentés után az aktív szegély korábban tetőre váltott → `section` URL-paraméter; új DEMO survey V1 és reload után szegély maradt. V1 utáni draft kulcsa `new` maradt → mentett survey ID alapú recovery; 11 m reload után explicit visszaállítás és V4 mentés. Fotó korábban kézi listakeresést/kapcsolást kívánt → automatikus kijelölés és kapcsolási CTA; új DEMO V1→V2 feltöltés→V3 társítás, reload után 1 fotó. |
| Fókuszált UX | IMPLEMENTED + BROWSER VERIFIED | Egykattintásos szakaszfelvétel; szegély első mérés szakaszhossz; mért érték elsődleges, részletek csukva; üres opcionális eresz/szegély panelek csukva; összesítőből direkt calc-link; elkészült followupnál újralétrehozó opciók eltűnnek. Meglévő motor és action maradt. |
| Mobil emuláció | BROWSER VERIFIED | Brave DevTools: iPhone SE 375×667, iPad Mini 768×1024 és 1024×768, asztali 932 px. A dokumentum scrollWidth mindenhol a viewport szélessége. iPhone mérések és fotófeltöltés 52–53 px magas, összesítő 306 px széles; szegély SVG 720 px a 267 px-es saját vízszintes görgetőben. |
| Megbízhatóság | BROWSER VERIFIED + KORÁBBI INTEGRÁCIÓ | Mentetlen survey reload-figyelmeztetés és visszaállítás, mentetlen kalkulátor bezárási figyelmeztetés, szakaszváltás, refresh, kapcsolt számítások újranyitása, duplikált followup és V3→V4 forrástartás böngészőben/SQL-ben. Brave offline mód: POST `ERR_INTERNET_DISCONNECTED`, egy kép a sorban maradt, „Feltöltés újrapróbálása” látható. Online retry egyetlen JPEG-et feltöltött (új DEMO survey V4), kapcsolási CTA V5-öt mentett; reload után 2 fotó és aktív szegély. A friss production build külön offline próbájában magyar hibaüzenet jelent meg; elvetés után a sor kiürült és figyelmeztetés nélküli reload V5-öt tartotta. Részleges ajánlatlétrehozás F9.7.9 opt-in integrációs bizonyítéka változatlan szerződésre vonatkozik. |
| Automatizált regresszió | AUTOMATED VERIFIED | `npx vitest run src/domain/field-surveys src/features/field-surveys src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts`: 10 fájl/44 PASS, 1 opt-in fájl/3 teszt kihagyva. Ez célzott regresszió, nem teljes repóteszt. |
| Típus/lint/build/diff | AUTOMATED VERIFIED | `npm run lint`, `npm run build` (Next 16.4 webpack), utána külön `npm run typecheck`, `git diff --check`: mind PASS. |
| DB-jogosultság és konkurencia | NEM FUTOTT ÚJRA | Nincs schema/action/RLS/konkurencia-contract változás. F9.7.9: 41/41 új pgTAP, 223 DB regresszió, 3/3 helyi Auth integráció és 5 lock-contention eset tényleges korábbi bizonyíték. |
| Fizikai iPhone/iPad és Safari | PHYSICAL DEVICE UNVERIFIED | Ellenőrzendő: érintő navigáció és portré/tájkép; magyar numerikus billentyűzet/tizedesvessző; JPEG kamera és HEIC útmutatás; mobiladat megszakítás + retry; fotókapcsolás és reload; SVG görgetés; kalkulátor/projekt/ajánlat megnyitás. Hosted környezet, offline sync sem tesztelt. |

Helyi DEMO rekordok megmaradtak; reset/hosted/commit/push/deploy nem történt.

## F9.8 — anyagkimutatás → ajánlatpiszkozat

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Hitelesített helyi böngészős workflow | BROWSER VERIFIED | DEMO projekt → jóváhagyott Anyagkimutatás V2 → két forrás kiválasztása → kompatibilis anyagcsoport 171,875 + 2,5 = 174,375 m² → a meglévő 15 000 HUF/m² nettó forrásár átvétele → meglévő ajánlatszerkesztő mentése → lista frissítése → piszkozat újranyitása. Egyedi árat nem találtunk ki. |
| Adat és forrásrevízió | BROWSER + SQL VERIFIED | Ajánlat `e02eccb3-1813-4058-b7ca-dc6db2f6f0da`, `draft`, creation operation `daeb25c4-aae0-4c3d-b119-ce54d8044e5f`, pontosan 1 revízió; a revision JSON két eredeti anyagtételt, mennyiséget és calc source revisiont őriz. Azonos műveletkulcs böngészős újrapróbálása után is 1 ajánlat / 1 revízió. Net amount: 2 615 625 HUF, 1 ajánlati sor. Forrás stale volt, a UI ezt mutatta. |
| Új aggregációs Vitest | AUTOMATED VERIFIED | `npx vitest run src/domain/material-takeoffs/aggregation.test.ts`: 1 fájl / 5 PASS. Exact mértékegység-összegzés, inkompatibilis attribútumok szétválasztása, duplikált/tiltott forrás, hiányzó vagy eltérő ár és pontossági esetek. |
| Teljes Vitest | AUTOMATED VERIFIED | `npm test`: 87 fájl PASS, 5 SKIP; 334 teszt PASS, 18 SKIP. |
| DB/RLS/idempotencia szerződés | AUTOMATED VERIFIED | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db supabase/tests/database/027_material_quote_preparation.sql`: helyi pgTAP 15/15 PASS. Jogosultság, exact mennyiség, source/revision snapshot, azonos operation-id retry, eltérő payload konfliktus, duplikált sor és immutabilitás. Helyi DEMO adat megmaradt, reset nem futott. |
| Typecheck/lint/build/diff | AUTOMATED VERIFIED | `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check`: PASS. Build közben párhuzamos typecheck elsőre `.next/types` fájlversenybe futott; build befejezése után külön typecheck PASS. |
| Mobil nézetemuláció | BROWSER VERIFIED | Hitelesített Brave DevTools: iPhone 16 393×852, iPad Mini 768×1024 és 1024×768, Desktop. Egyoszlopos ajánlatsor, magyar egység, összeg, mentés/újranyitás; vízszintes viewport overflow nem látszott. Böngésző emuláció, nem Safari. |
| Fizikai mobil | UNVERIFIED | Fizikai iPhone/iPad és Safari nincs tesztelve. Kézi elfogadás: Safari portrait/landscape, numerikus billentyűzet és tizedes, fotóválasztó/kamera JPEG, hálózati megszakítás és retry, forrás/kalkuláció/ajánlat újranyitás. |

Nem futott: hosted DB, teljes Safari, offline sync, fizikai iPhone/iPad. Nem történt hosted módosítás, reset, commit, push vagy deploy.

## F9.8.1 — beszerzés és műhely-előkészítés

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Domain és CSV Vitest | AUTOMATED VERIFIED | `npm test`: 88 fájl PASS, 5 SKIP; 337 teszt PASS, 18 SKIP. CSV BOM, pontosvessző, idézőjelek és képletinjekció-védelem; manual item/schema és duplikált forrásellenőrzés. |
| Persistencia/RLS | AUTOMATED VERIFIED | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db supabase/tests/database/028_material_preparations.sql`: 31/31 PASS. Exact takeoff items, kompatibilis csoportosítás, 4 m/5 m lemezhossz elkülönítése, exact quantity, manual provenance, draft → PRELIMINARY, approved → ready, idempotencia, expected-version konfliktus, immutabilitás, org/project határ, közvetlen írástiltás. A teszt rollback tranzakció; reset nincs. |
| Valós local Auth/RLS + konkurencia | AUTOMATED VERIFIED | `RUN_LOCAL_MATERIAL_PREPARATION_VALIDATION=1 node scripts/verify-material-preparation-auth-concurrency.mjs`: Auth owner/member és tagság nélküli user; tagságon kívüli olvasás 0 sor, RPC elutasítás `42501`, direct INSERT tiltva, azonos create retry egy listát/revíziót ad. Két külön authenticated PostgreSQL-kapcsolat: párhuzamos V2 írásból 1 siker és 1 `40001`, pontosan 2 immutable revision. Local-only DEMO auth/DB fixture megmaradt. |
| Browser workflow és adat-visszaolvasás | BROWSER VERIFIED + SQL VERIFIED | Hitelesített Brave/IAB localhost: jóváhagyott „Anyagkimutatás” V2 → 174,375 m² beszerzés → 1 db „DEMO műhelyi ellenőrzési feladat” hiányzó méretek kitalálása nélkül → V1 mentés → V2 státuszok („Megrendelésre előkészítve”, „Gyártás alatt”) → refresh után újranyitás. SQL: lista `f4b30050-0c52-4e22-a73b-cc7211f1296e`; 2 revision, forrás takeoff `5d4b73bc-bf31-4e3b-9c3b-274bc14ee457`, calculation revision `948cdda2-cd4f-4ec2-bc4d-9c558a67ca84`; V2 exact items/statuses helyreálltak. CSV ténylegesen letöltve és tartalma ellenőrizve. |
| Reprodukált UX-javítás | IMPLEMENTED + BROWSER VERIFIED | A kézi item hozzáadásakor kiürülő, mégis `required` mező miatt a mentés böngésző-validációja blokkolt; javítás után `form :invalid = 0`, V1 mentés sikeres. Source-derived sort nem lehet többé a kötelező takeoff-eredet nélkül eltávolítani. Mentetlen névváltozás → projekt-link kattintása előtt `confirm`; elutasítás után maradt a lista és a piszkozat; név visszaállítása mentetlen állapot nélkül. |
| Mobil és desktop emuláció | BROWSER VERIFIED | Chromium/IAB nézetek: iPhone 375×812; iPad portré 768×1024; tájkép 1024×768; desktop 1365×900. Mindegyikben `documentElement.scrollWidth = viewport`; overflow elem nem volt. Sticky primary save 48 px; státusz és numerikus manual mezők 44 px. Fizikai Safari nincs tesztelve. |
| Nyomtatás | IMPLEMENTED; PRINT PREVIEW LIMITED | „Nyomtatás” vezérlő és print stylesheet; a helyi Chromium natív print folyamatánál a böngésző automatizálása blokkolt, fizikai nyomtatás/PDF kimenet nem készült. CSV export ténylegesen sikeres. |
| Build quality | AUTOMATED VERIFIED | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`: PASS. Első párhuzamos typecheck a build által regenerált `.next/types` miatt fájlversenyt jelzett; a build befejezése után külön futtatások sikeresek. |
| Ismert mobil/forráskorlát | UNVERIFIED / LOCAL DATA LIMIT | A helyi approved takeoff kalkulációs forrása stale volt; a UI ezt jelezte, V1/V2 snapshot változatlan maradt. Újabb, frissebb approved takeoff nem állt rendelkezésre ugyanebben a fixture-ben, ezért forráscsere utáni V3 workflow nem futott. Fizikai iPhone/iPad acceptance: Safari érintés és portré/tájkép; magyar numerikus billentyűzet; print margók; CSV Files-ben; stale forrás cseréje frissebb jóváhagyott takeoffra; megszakított hálózat mentési visszajelzése. |

Csak local DEMO adatot és auth tesztfelhasználót használtunk; hosted DB, reset, commit, push, deploy nem történt. `.DS_Store` érintetlen.

## F9.9 — okos tetőgeometria és kapcsolt munkafolyamatok

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Geometria és kiválasztás | AUTOMATED + BROWSER VERIFIED | `gable-segments.test.ts`, meglévő tető-/rajztesztek; hitelesített DEMO 10×6 m, 4 m emelkedés, explicit 0 mm túlnyúlás: 5 m ferde hossz, 100 m², 2×10 m eresz, 10 m gerinc, 4×5 m oromél. Mobil lista kijelölése SVG-vel szinkron, egyéni és többes összegzés helyes. |
| Felmérés → eresz/szegély/fedés | BROWSER + SQL VERIFIED | Felmérés `609aa221-2dd2-4d30-ab86-9a2a75de5601`: tető V1, bal eresz 10 000 mm → eresz V1; jobb hozzáadva → V2 két külön éllel; két 5000 mm oromél → szegély V1. Fedési oldal azonos tetőrevízióból 100 m² és 5 m ferde hossz; termékadat nélkül nincs fedési darabszám. Eresz/szegély mentés és oldalfrissítés utáni újranyitás sikeres. |
| Revízió és forrásbiztonság | AUTOMATED + BROWSER + SQL VERIFIED | Felmérés V4 11 m hosszal, tető V2 110 m²; korábbi eresz V2 továbbra 2×10 000 mm, szegély V1 2×5000 mm és mindkettő stale. Explicit ereszfrissítés után V3 2×11 000 mm, régi V2 megmaradt; DEMO név/forrás refresh után visszatöltődött. SQL linkek: roof V1→survey V1, gutter V1/V2→survey V2 és eredeti roof revision, flashing V1→survey V3, roof V2→survey V4. `029` 9/9, `030` 7/7, `009` 21/21, `026`+`023`+`011` 84/84; más szervezet, hamis source, közvetlen írás, duplikált él, override, revíziókonfliktus és immutable snapshot lefedve. |
| Konkurencia és helyi Auth | AUTOMATED VERIFIED | `verify-gutter-concurrency.mjs` és `verify-survey-workspace-concurrency.mjs`: két kapcsolatos expected-revision/40001 és változatlan history, ismételt followup/link idempotens. `RUN_LOCAL_SURVEY_WORKSPACE_TESTS=1 npx vitest run src/features/field-surveys/workspace.local.integration.test.ts`: 3/3 PASS. |
| Önálló regresszió | BROWSER + AUTOMATED VERIFIED | Projekt nélküli eresz 8500/4000 mm → 3 előzetes szál, DEMO eredet; kézi szegély 5000 mm és 6000 mm DEMO szálhossz mellett ismeretlen toldás → nincs kitalált darabszám. Meglévő projektkalkulátorok mentett revízióval működtek. |
| UX és mobil | BROWSER VERIFIED | Először újra hozzáadhatónak látszó kiválasztott eresz és hamis hiányjelzés javítva; a 19 px-es szegély-eltávolítógomb 44 px. Chromium/IAB: iPhone 390×844, iPad 768×1024 és 1024×768, desktop 1440×900; `scrollWidth=viewport` mindegyiknél. iPhone numerikus mezők/fotógomb 52 px, lista 48 px, művelet 44 px. |
| Fókuszált kódminőség | AUTOMATED VERIFIED | Fókuszált Vitest 7 fájl/32 PASS; az opt-in 3/3 külön lefutott. `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check` PASS. Ez célzott regresszió, nem teljes repóteszt. |
| Fizikai eszköz | UNVERIFIED | Fizikai iPhone/iPad/Safari nincs tesztelve. Kézi checklist: Safari portré/tájkép és billentyűzet; SVG/lista érintés; kamera JPEG; mentés/frissítés/újranyitás; megszakított hálózat utáni állapot/újrapróbálás. Hosted DB és offline sync nincs ellenőrizve. |

## F9.10 — többtetős geometria

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Matematikai referencia | PASS | Hat új forma és a meglévő nyeregtető analitikus fixture-jei: 10×6 m, 45° esetben 60 m² vetület és 84,853 m² felület; L/T 10×6 m + 4×5 m szárny: 80 m² vetület, 113,137 m² felület, két 3,464 m vápa. Konty négy 5,196 m él, félkonty négy 3,464 m él. Síkszomszédság, determinisztikus ID és hibás input elutasítás ellenőrizve. |
| Célzott Vitest | PASS | `node_modules/vitest/vitest.mjs run src/domain/calculations/roof-geometry.test.ts src/domain/field-surveys/roof-geometry.test.ts src/features/roof-models/roof-type-selector.test.tsx src/features/field-surveys/field-survey-editor.test.tsx src/features/gutters/gutter-handoff.test.ts src/domain/calculations/gable-roof.test.ts src/features/roof-models/project-roof-drawings.test.ts`: 7 fájl / 36 PASS. L/T 30° mintavételes fedvényegyszeresség is lefedett. Nem teljes regresszió. |
| Helyi DB/Auth/RLS | PASS | `RUN_LOCAL_MULTI_ROOF_TESTS=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/features/roof-models/multi-roof.local.integration.test.ts`: 4/4 PASS. Projekt/standalone/eresz/szegély/felmérés, snapshot, exact ID, idempotencia, stale revízió, direkt authenticated tiltás. `20261015160000`–`161000` forward-only helyi migráció alkalmazva; hosted DB érintetlen. |
| Build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` Next 16.4.0 webpack, `git diff --check` PASS. A legutolsó, csak élazonosító-hosszt érintő változtatás után a célzott teszt PASS; build ismétlése nem történt. |
| Browser | PARTIAL | DEMO hip standalone save/reopen és élkijelölés; T felmérés/projekt/eresz V1/szegély vápa V1; L projekt 80 m²/113,137 m²/két vápa és V1 reopen. Gable save az írócsere után, félnyereg/sátor/félkonty valós flow, mobil/tablet breakpoint nem ellenőrzött. A végső browser a helyi szerverek közös `.next` kimeneténél elakadt. |
| Fedés és szakmai adatok | VERIFIED LIMIT | Nem nyeregtetős fedési kiosztás nincs kitéve. Csatorna-lefolyó, szegélyprofil, toldás, gyártó és ár nem következtetett. Fizikai készülék és teljes regresszió UNVERIFIED. |

## F9.10.1 — navigáció és selector-first tetőfolyamat

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Útvonalak és projektelérés | BROWSER VERIFIED / PARTIAL | Hitelesített DEMO: Dashboard → Projektek → meglévő projekt → új tető, valamint új felmérés útvonal. Az org-paraméteres link és route működött; standalone kalkulátor és mentett revízió browser útvonal nem zárult le. Kódvizsgálat nem talált reprodukálható navigációs hibát. |
| Új projekt-tető választó | BROWSER VERIFIED | Új tető nézetben mind a hét `RoofTypeSelector` kártya látszott, dimenzióűrlap nélkül. Nyeregtető kiválasztás után csak az adott mezők jelentek meg. |
| Nyeregtető SVG és eredmények | BROWSER VERIFIED | 10 000 × 6 000 mm, 45°: rajz, 84,853 m² tetőfelület, 60 m² vetület, eresz/gerinc és kiválasztható élek. Save/reopen ugyanebben a futásban nem történt. |
| Survey választó/előnézet | BROWSER + AUTOMATED PARTIAL | Új survey hitelesített böngészős útvonalán mind a hét kártya látszott, méretmező nem; Vitest ellenőrzi ezt és a mentett survey űrlapot. A F9.10 geometriai motor csak érvényes, teljes mérésnél fut; a survey dimenzió- és SVG-előnézet kiválasztás utáni böngészős lépése nem zárult le. |
| Fókuszált regreszió | PASS | `node_modules/vitest/vitest.mjs run src/features/roof-models/roof-type-selector.test.tsx src/features/field-surveys/field-survey-editor.test.tsx src/features/dashboard/dashboard.test.ts src/domain/field-surveys/roof-geometry.test.ts`: 4 fájl / 20 PASS. Nem teljes regresszió. |
| Typecheck, lint, production build, diff | PASS | `npm run typecheck`, `npm run lint`, `git diff --check` PASS. `npm run build` Next.js 16.4.0 webpack módban PASS egy friss, izolált forrásmásolaton, saját `.next` könyvtárral; a projekt checkout futó dev szerverei nem lettek leállítva. |
| Mobil / tablet | UNVERIFIED | 560 px-es töréspontnál a felmérő tetőváltó gomb oszlopos; tényleges méretemuláció és fizikai mobil/tablet nem futott. |
| Teljes elfogadási lista | PARTIAL | Kalkulátorok áttekintése/önálló selector, mind a hat további típus valódi browser workflow-ja, survey/project mentés és reopen, régi tetőrevízió, eresz/szegély handoff, covering tiltás és teljes Auth/RLS regreszió ezen a feladaton nem ellenőrzött. A böngésző interakciók későbbi kezelése nem adott UI frissülést; Statsig külső kérést Cloudflare blokkolta. Hosted DB-t nem érintettük, reset/commit/push/deploy nem történt. |

## F9.10.2 — professzionális tetőválasztó és teljes integráció

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Közös selector | PASS | A standalone, projekt és új survey ugyanazt a `RoofTypeSelector` komponenst használja. A hét topológiai SVG-kártya, `Válaszd ki a tető típusát`, teljes gombfelület, `aria-pressed`, fókuszállapot és 560 px-es rács megmaradt. |
| Dashboard → Projektek | BROWSER VERIFIED | Hitelesített DEMO böngészőben a Dashboard linkje szervezeti query-paraméterrel megnyitotta a projektek listáját. |
| Dashboard → Kalkulátorok → selector | BROWSER VERIFIED | A kalkulátorok áttekintőből az új „Tetőgeometria és tetőfedés” link működött; a selector hét kártyával, dimenziómező nélkül nyílt meg. |
| Standalone mentés/újranyitás | BROWSER VERIFIED | Félnyeregtető, 10 000 × 6 000 mm, 35°, `DEMO F9.10.2 selector smoke`: mentés, URL-es számításazonosító, reload, selector kihagyása, mentett revízió, SVG és élkijelölés PASS. |
| Projekt mentés/újranyitás | BROWSER VERIFIED | Meglévő projekt új tetője, ugyanaz a félnyeregtető fixture, `DEMO F9.10.2 projekt smoke`: selector → mezők → mentés → típusos editor URL → reload PASS. |
| Survey mentés/előnézet | BROWSER VERIFIED | Új survey tetőszakasz: Félnyeregtető, 10 000/6 000/35; 73,246 m² validált előnézet, műszaki SVG; Enteres mentés V1, reload után selector összecsukva és eredmény megmaradt. |
| Gable és élregresszió | BROWSER VERIFIED / AUTOMATED | 10 000/6 000/3 000 mm: 84,853 m², 60 m², gerinc/eresz és kiválasztható élek. A gable writer, covering, handoff és RLS kódhoz nem nyúltunk. |
| Minden geometriai típus | AUTOMATED VERIFIED | `roof-geometry.test.ts` fedi a gable, shed, hip, pyramid, halfHip, lShape és tShape validációját, területét, síkjait és él-topológiáját; a fókuszált selector suite 5 fájl / 26 PASS. Külön browser save/reopen mind a hét típusra nem futott. |
| Auth/RLS és konzisztencia | PASS | `RUN_LOCAL_MULTI_ROOF_TESTS=1 ... multi-roof.local.integration.test.ts`: 4/4 PASS; forrásrevízió, creator-scope, retry, expected revision, közvetlen írástiltás, survey-link és handoff megmaradt. |
| Typecheck/lint/build/diff | PASS | `npm run typecheck`, `npm run lint`, friss izolált forrásmásolaton `npm run build` Next.js 16.4.0 webpack, `git diff --check`: PASS. |
| Reszponzív és teljes acceptance | PARTIAL | A CSS desktop/tablet/mobile elrendezése megmaradt, de fizikai eszköz és teljes viewport-emuláció nem futott; a hat további típus külön browser save/reopen, teljes covering browser út és külső handoff acceptance nincs lezárva. Hosted DB, reset, commit, push, deploy nem történt. |

## F9.11 — professzionális tetőmérés és intelligens UX

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Közös mérési útmutató | AUTOMATED VERIFIED | `measurement-guidance.tsx` a gable/multi inputkulcsokat és survey semanticType értékeket ugyanahhoz a magyar egység-, jelentés- és méréskonvencióhoz köti; 3 célzott tesztág PASS. |
| Input → SVG kapcsolat | AUTOMATED VERIFIED | `DrawingDimension.sourceKey` és `DrawingAngle.sourceKey` alapján a `TechnicalDrawing` a fókuszált méretvonalat/szögjelet kiemeli; L/T wing width és projection külön felülnézeti méretvonal. |
| Field validation | PASS | A multi és gable form típusos schema-üzenetei mezőszinten jelennek meg; hiányos inputnál nincs NaN/Infinity eredmény. |
| Geometriai regresszió | PASS | Gable drawing source dimensionek, hétforma geometria, selector, measurement guidance, dashboard és survey editor célzott suite: 7 fájl / 35 PASS. |
| Typecheck/lint/diff | PASS | `npm run typecheck`, `npm run lint`, `git diff --check` PASS. |
| Production build | PASS | Friss izolált forrásmásolaton `npm run build` / Next.js 16.4.0 webpack: TypeScript, 23 statikus oldal és route-lista PASS. |
| Browser acceptance | BROWSER VERIFIED / PARTIAL | Hitelesített helyi DEMO: Félnyeregtető selector → mezők → inputfókusz → mérési útmutató → aktív SVG-méretvonal → 73,246 m² eredmény. A hét forma gyors végigkattintása CDP időkorlátba futott; külön save/reopen mind a hét formára és mobil/tablet viewport nincs lezárva. |
| Biztonság és revízió | UNCHANGED | A meglévő server recompute, Auth/RLS, expected revision, immutable source és handoff réteghez nem nyúltunk; hosted DB-t nem érintettünk. |

## F9.12 — product integration és workflow hardening

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Dashboard gyors felmérés | AUTOMATED + IMPLEMENTED | A meglévő funkciókártya-rács első eleme a „Gyors felmérés”; a kártya a standalone létrehozási workflow-ra mutat és megtartja az organization query-paramétert. |
| Roof workflow regresszió | AUTOMATED VERIFIED | Meglévő geometria/selector/mérési útmutató célzott suite: 3 fájl / 19 PASS; F9.10 local writer, revision és handoff tesztek változatlanok. |
| Typecheck/lint/build/diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` Next.js 16.4.0 webpack, `git diff --check`. |
| Browser / mobile | PARTIAL | Dashboard és szervezeti link ellenőrzött; korábbi selector/save/reload és handoff evidence újrahasznosítható. A hét forma külön browser save/reopen, teljes üzleti lánc és viewport emuláció ezen a mérföldkövön nincs lezárva. |
| Security / revision | UNCHANGED | Új persistence vagy jogosultsági kód nem került be; hosted DB-t nem érintettünk. |

## F9.12.1 — dashboard kártyarács javítása

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Hat kártya sorrendje | AUTOMATED VERIFIED | Dashboard adat teszt: Gyors felmérés, Projektek, Kalkulátorok, Árajánlatok, Anyagok, Kivitelezés. |
| Navigáció | AUTOMATED VERIFIED | A hat útvonal szervezeti query-paramétert tartalmaz; Gyors felmérés közvetlenül a standalone létrehozási workflow-ra mutat. |
| Layout / mobile | IMPLEMENTED | Meglévő `.function-grid` 3/2/1 oszlopos CSS és azonos kártyakomponens maradt; külön browser emuláció ezen a javításon nem futott. |

## F9.13 — valós napi munkafolyamatok

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| A — önálló ereszcsere | BROWSER VERIFIED / PARTIAL | Hitelesített DEMO-ban tetőforma, ügyfél, projekt és katalógus nélkül felmérés mentve 6,4 m-rel és opcionális jegyzettel; mérés átkerült a kalkulátorba. Hibás 0 mm szálhossz letiltotta a mentést, javítás után 3 ereszszál / 0 lefolyószál / 400 mm maradék. V1 és összesítő látszott; refresh után a felmérés korábbi böngészős ellenőrzése megvan. |
| B — nyeregtető felújítás | BROWSER VERIFIED / PARTIAL | Roof selector, inputfókusz-útmutató és SVG igazolt; 10/6/3 m, 300 mm túlnyúlások, 98,938 m². A mentett tető V1 kapcsolat az üres alternatív pitch érték migrációs javítása után sikerült. Két ereszélből 2×10,6 m került át, mentett ereszbecslés V1: 8 ereszszál, 0 lefolyó. Összesítő a hiányzó pitch-et és korábbi forrásrevíziót láthatóan jelzi. Szegély-handoff és a projekt-kalkuláció friss böngészős visszanyitása nem igazolt. |
| C — önálló szegélymunka | BROWSER VERIFIED / PARTIAL | Tető/projekt nélkül 2,5 m DEMO hossz; egyedi profil és 2000 mm DEMO szálhossz. Hibás 0 mm input elutasítva. Ismeretlen toldás mellett nincs darabszám, az eredmény HIÁNYOS és menthető; refresh/reopen nem igazolt. |
| Súrlódás / javítás | IMPLEMENTED | A 4 lépéses survey mentés előtte tetőforma-választás miatt blokkolt; most részleges roofType-mentés lehetséges, hiány a summary-ban cselekvésként megjelenik. Project-scope eresz/szegély összesítő link projekten belüli route-ra irányít számítás- és revízióazonosítóval. Megfigyelt A felmérés 4 érdemi művelet, majd 3 kalkulátorművelet; más munkafolyamatok lépésszáma nem normalizált, így számszerű csökkenésre nincs bizonyíték. |
| Vitest | PASS | `npx vitest run src/domain/field-surveys/workspace.test.ts src/features/field-surveys/workspace-summary.test.tsx src/features/field-surveys/field-survey-editor.test.tsx`: 3 fájl / 14 teszt PASS; nem teljes regresszió. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, izolált forrásmásolaton `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Helyi DB/Auth/RLS | PARTIAL | `RUN_LOCAL_MULTI_ROOF_TESTS=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/features/roof-models/multi-roof.local.integration.test.ts`: 4/4 PASS, Auth/RLS és secure roof writer. A `supabase test db --local supabase/tests/database/030_survey_roof_source_link.sql` 0/7 subtestnél megáll, mert a régi teszt a visszavont `save_gable_roof_calculation` RPC-t hívja; az új null-mező esethez nincs közvetlen SQL assertion. Nincs hosted DB ellenőrzés. |
| Mobil / adatbiztonság | UNVERIFIED / UNCHANGED | Mobil viewport és fizikai iPhone/iPad Safari nem futott. Meglévő Auth/RLS, immutable revision, idempotencia és snapshot contract nem módosult; a survey–roof matcher null alternatív mezőt hagy ki, de megőrzi a típusos/duplikációs ellenőrzést. |

## F9.13.1 — napi workflow acceptance lezárása

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Legacy SQL és security boundary | PASS | `030_survey_roof_source_link.sql`: 8/8 PASS; az obsolete gable RPC nincs execute jogosultsággal authenticated szerepkörön, a teszt a secure writer tranzakciós helyi szerepkörét használja. |
| A — önálló ereszcsere | BROWSER VERIFIED | A korábbi hitelesített LOCAL DEMO 6,4 m-es felmérése és mentett standalone ereszkalkulációja refresh/reopen után is megmaradt. |
| B — projekt tető → eresz → szegély | BROWSER VERIFIED | Mentett nyeregtető V1 (`b7ce1e5f-cb2b-4d18-bcdf-39f81037d4b2`), projekt eresz V1 és projekt szegély V2 újranyitva. A kiválasztott ferde oromél 4667 mm, `lengthSource=geometry`, forrásrevízió változatlan; a képernyőn `Mentett aktuális változat · V2`. |
| C — önálló szegély | BROWSER VERIFIED | Tető és projekt nélkül mentett V1; 2500 mm helyszíni szakasz, 2000 mm DEMO szálhossz, ismeretlen toldás mellett HIÁNYOS eredmény és nincs kitalált darabszám. Refresh/reopen után az értékek és figyelmeztetés megmaradtak. |
| Auth/RLS és immutable adatok | PASS | `multi-roof.local.integration.test.ts` 4/4; restricted writers, expected-version/idempotency, direct insert/RPC denial és exact source checks. |
| Célzott regresszió | PASS | Vitest 3 fájl / 14 teszt, typecheck, lint, izolált production build és `git diff --check`. |
| Eszközkorlát | UNVERIFIED | Mobil viewport, fizikai eszköz, hosted DB és deploy nem futott. |

## F9.14 — független számítási audit

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Hét tetőforma golden fixture | PASS | `roof-geometry.engineering-audit.test.ts`: 29/29; kézi referencia, összes élkategória, külön 2D/3D terület, szomszédság, önmetszés, 3× hossz és 9× terület. Tűrések: 1e-6 mm, 1e-3 mm² és 1e-10 relatív. |
| Fedés | PASS | Trapéz- és cserepeslemez golden, teljes hossz/toldás/modul/névleges-hasznos méret, unsupported és takeoff source-recompute tesztek. Csak nyeregtetős deklarált scope. |
| Eresz/szegély/profil | PASS | Szálhatár, több szakasz, átfedés, ismeretlen paraméterből `null`, BA/K és önmetszés regresszió. Automatikus fitting/hidraulika/gyártói szabály nincs. |
| Egység, mennyiség, forrás | PASS | Explicit mm→m és mm²→m²; safe integer; hat tizedes BigInt aggregáció; eltérő egység/snapshot szétválik; draft kizárt; stale és exact revision megmarad; ár nem pótlódik. |
| Production módosítás | NINCS | Igazolt P0/P1 nem került elő; csak független fixture, célzott biztonsági regresszió és dokumentáció készült. |
| Végső ellenőrzések | PASS | Fókuszált Vitest 20 fájl / 147 teszt; typecheck; lint; izolált Next.js 16.4.0 webpack production build; `git diff --check`. Perzisztencia/security változás hiányában Auth/RLS nem futott újra. |
| Browser / eszköz | NOT RUN / UNVERIFIED | Felhasználói számítási viselkedés nem változott, ezért AGENTS.md szerint külön browser smoke nem futott. Fizikai eszköz nem ellenőrzött. |

## F9.14.1 — kompakt tetőmérési UX

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Hét geometriai forma komponens-elrendezése | PASS | `gable-roof-form.test.tsx` ellenőrzi a projekt-gable-t; `multi-roof-form.test.tsx` a shed, hip, pyramid, halfHip, L és T bemeneteket a közös interaktív rajz előtt, az eredményeket utána. `standalone-gable-preview.test.ts` a standalone gable útvonalat ellenőrzi. |
| Survey mérési útmutató és SVG | PASS | `field-survey-editor.test.tsx` érvényes nyeregtető survey esetén mező → rajz → eredmény sorrendet ellenőriz; `measurement-guidance.test.tsx` rövid, fókuszált jelentést és rajzkulcs-kapcsolatot fed le. |
| Browser responsive | BROWSER VERIFIED | Hitelesített local DEMO, standalone gable: 1440/768/390/320 px-en 4/3/2/2 mezőoszlop, mindegyiken 16 px input és nincs dokumentum-túlcsordulás. A survey roof preview-t szintén ellenőriztem a négy viewporton. |
| Fókusz és rajz | BROWSER VERIFIED | 320 px-en az aktív mező megmaradt, a `buildingLengthMm` vonal kiemelt; 10 000 × 6 000 × 3 000 mm DEMO geometriából élő 93,338 m² standalone előnézet. |
| Mentés és újranyitás | BROWSER VERIFIED | Helyi, projekt nélküli DEMO survey V1 mentés, refresh és újranyitás után a 10/6/3 m mértékek, explicit egységek, 84,853 m² és rajz megmaradt. Projekt editor külön browser save/reopen és fizikai eszköz nincs ellenőrizve. |
| Vitest / statikus ellenőrzések | PASS | 6 célzott fájl / 23 teszt, `npm run typecheck`, `npm run lint`, `npm run build` Next.js 16.4.0 webpack, `git diff --check`. Ez fókuszált, nem teljes regressziós suite. |
| Képlet / adatbiztonság | UNCHANGED | Csak UI/elrendezés, közös drawing presentation és komponens regresszió változott; számítási képlet, RLS/Auth, adatbázis, revízió, idempotencia és forráscontract nem módosult. Hosted DB és fizikai iPhone/iPad nem tesztelt. |

## F9.14.2 — Globális UX és egységes RoofWorkspace

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Design tokenek és közös chrome | IMPLEMENTED / BROWSER PARTIAL | Globális felület-, glass, fókusz-, szemantikus szín-, térköz-, árnyék- és radius tokenek; `glass-navigation`, `glass-toolbar`, egységes gombok/mezők/státuszok. A DOM-ban dashboard, projekt, roof, quotation, materials és preparation oldalakon használt osztályok/felületek ellenőrizve. |
| RoofWorkspace DOM-sorrend | AUTOMATED VERIFIED | `gable-roof-form.test.tsx`, `multi-roof-form.test.tsx` (6 típus), `standalone-gable-preview.test.ts`, `field-survey-editor.test.tsx`: mérés → rajz → eredmény. L/T feltételezés az eredmények után. |
| Drawing controls / dimension access | AUTOMATED + BROWSER VERIFIED | `technical-drawing.test.tsx`: toolbar az advanced `<details>` előtt, dimenziók csoportként elérhetők. Local browser: SVG-dimenzió pointer- és Enter-kiválasztása a megfelelő mezőre fókuszált és kiemelt. |
| Breakpoint / overflow | BROWSER VERIFIED (EMULATED) | Roof survey 1440/1024/768/390/320 px: 4/4/3/2/2 oszlop, 16 px mezőszöveg, legalább 44 px ellenőrzött vezérlő, nincs vízszintes dokumentum-túlcsordulás. Dashboard, projekt gable, materials, quotation, procurement és kivitelezés 320 px-en is overflow nélkül. Nem fizikai eszközteszt. |
| Helyi survey persistence | BROWSER VERIFIED | Hitelesített local DEMO survey V1; 10/6/3 m, 0 mm túlnyúlások és 84,853 m² reload + újranyitás után megmaradt. Meglévő save action/contract változatlan. |
| Representative surfaces | BROWSER VERIFIED / PARTIAL | Dashboard; quick survey (summary button is present, summary result not verified); standalone gable; projekt gable; projekt eresz és szegély; project material takeoff + katalógus; új quotation; beszerzés; kivitelezés megnyílt. A nem tető üzleti műveletek nem kerültek mentésre. |
| Sötét mód / accessibility fallback | IMPLEMENTED / NOT FULLY VERIFIED | CSS fallback, `prefers-reduced-transparency`, `prefers-reduced-motion`, `prefers-contrast: more`, forced-colors és globális fókuszgyűrű szerepel. Képernyőolvasó, dialog fókusz, Safari, média-preferencia futtatott emuláció és fizikai eszköz nem ellenőrzött. |
| Képlet / adatbiztonság | UNCHANGED | Domain-képlet, adatbázisséma, Auth/RLS, pénzügyi/áfa szemantika, mentési action és revision/snapshot contract nem módosult; hosted DB és regresszió suite nem futott. |
| Vitest / typecheck / lint / build / diff | PASS | 6 célzott tesztfájl / 21 teszt; `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build`, majd dokumentációval együtt `git diff --check`. |

## F9.14.3 — Liquid Glass vizuális audit és finomítás

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Survey input–rajz integráció | BROWSER VERIFIED | A mérési strip és drawing header közötti távolság: 1440/768/390 px-en 9/9/7 px; a 1440-es előtte input→canvas 194 px, utána 63 px. Egy közös `roof-workspace-surface`; külön „Mérések”/„Rajzok” felirat és látható ismétlődő summary nincs. |
| Reszponzivitás | BROWSER VERIFIED (EMULATED) | Survey viewport 1440/768/390/320 px; 4/3/2/1 oszlop, input szöveg 16 px, `documentElement.scrollWidth === innerWidth` minden méreten. 320 px-en az egy oszlop a kétoszlopos címke/beállítás zsúfoltságot javította. Fizikai eszköz/soft keyboard nincs. |
| Fókusz és SVG | BROWSER VERIFIED | A „Mérés 1 értéke” fókusza mellett a `buildingLengthMm` SVG group `is-active`; az aktív input fókusza megmaradt. 390/320 px-en az SVG rajz teljes szélességében a közös munkafelületen jelenik meg. Soft keyboard takarását nem emuláltam. |
| Téma | BROWSER VERIFIED | Dashboard light és dark, survey light és dark tényleges DOM/screenshot ellenőrzése. Az eredeti sötét beállítás visszaállítva. |
| Mentés és navigáció | BROWSER VERIFIED | `DEMO F9.14.3` survey `e2060324-914b-4d45-a011-3e4c07fb3f31`, V1 mentés, reload és felméréslistából újranyitás. 10/6/3 m, 0 mm, 84,853 m² és SVG megmaradt; státusz `Mentve · V1`. Ez lokális tesztadat marad. |
| Reprezentatív vizuális felületek | BROWSER VERIFIED / PARTIAL | Előtte/utána survey, standalone gable, project gable, dashboard és anyagkatalógus. Kalkulátorválasztó, standalone eresz/szegély, projekt anyagkimutatás, ajánlatpiszkozat és beszerzési/műhelylista is megnyitva 1440 px-en. A hat dashboard kártya/sorrend és az 5 DEMO anyagkártya megmaradt. Ezeken az oldalakon nem mentettem üzleti módosítást. |
| Célzott Vitest / typecheck / lint / build / diff | PASS | 6 fájl / 21 teszt; `npm run typecheck`; `npm run lint`; Next.js 16.4.0 webpack `npm run build` izolált forrásmásolaton, csak buildhez használt placeholder Supabase public env-vel; `git diff --check`. Nem teljes regresszió. |
| Persistencia, jogosultság, képlet | NEM VÁLTOZOTT | Csak komponens-prezentáció és CSS breakpoint módosult; domain-számítás, adatbázis, mentési action és Auth/RLS szerződés nem változott. Hosted DB, projekt tetőmodell külön mentés és Safari nem ellenőrzött. |

## F9.14.4 — Fluid Liquid Glass UI transformation

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Könyvtár- és kompatibilitásvizsgálat | PASS, audit | A jelenlegi React/Next stackhez shadcn/ui dokumentáció, Motion és creativoma liquid-glass megoldás áttekintve. Új dependency nem indokolt: natív interakciók és CSS primitívek elegendők; torzító SVG filtert nem alkalmaztam. |
| Közös UI és RoofWorkspace szerkezet | AUTOMATED VERIFIED | A workspace közvetlen mező/rajz gyerekeket ad, a rajzeszközök a drawing stage-en belül jelennek meg, a haladó `<details>` zárt alapállapotú. Fókusz-dimenzió és meglévő rajz funkciók megmaradtak. |
| Vizuális böngésző-ellenőrzés | BROWSER PARTIAL | Authenticated local dashboard light/dark, survey, standalone gable és project editor 1440 px-en megnyitva. A workspace DOM-fája és dimenziókiemelés ellenőrizve. A hat azonos képernyő előtte/utána export és teljes összehasonlítás nem készült. |
| Interakció / mentés | PARTIAL / UNVERIFIED | Zoom és rétegmenü megnyitása, mező → SVG dimenzió fókusz ellenőrizve. Survey save/reopen, projekt mentés/újranyitás, handoff, quote/material navigáció nem igazolt; a lokális dev szerver save közben leállt, a preview régi markuppal szolgált. DEMO adatot nem módosítottam. |
| Viewport / accessibility | PARTIAL | 1440 px-en nincs horizontális túlcsordulás a vizsgált tetőoldalakon. 1024/768/390/320, fizikai Safari, billentyűzet teljes útvonal, reduced-motion, increased-contrast és screen reader nem ellenőrzött. |
| Vitest / typecheck / lint / build / diff | PASS | Végleges forrás: 4 célzott fájl / 15 Vitest teszt, `npm run typecheck`, `npm run lint`, `git diff --check` sikeres. Next.js 16.4.0 webpack production build friss forrásmásolaton sikeres. Ez célzott, nem teljes regresszió. |
| Adatkonzisztencia / jogosultság | VÁLTOZATLAN | Kizárólag CSS és felületi komponens-struktúra változott; számítás, mentési action, Auth/RLS, séma és pénzügyi contract érintetlen. |

## F9.14.5 — Global Fluid Liquid Glass & Application Recovery

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Hitelesített főútvonalak | WORKING (local) | Izolált `localhost:3214`: dashboard → gyorsfelmérés szervezeti query-vel; survey lista/rekord; projektek/lista/részlet; kalkulátor és tető létrehozás/szerkesztés; projekt eresz/szegély; anyagkatalógus/kimutatás; ajánlatlista/piszkozat; beszerzés; kivitelezés. A fő oldalak és mélylinkek megnyíltak. Ez útvonalsmoke, nem teljes oldalankénti üzleti regresszió. |
| Előző szerverhibák | PARTIAL / DIAGNOSED | A régi `localhost:3001` projektoldal ChunkLoadError-t adott; két korábbi, ideiglenes checkoutból futó Next folyamatot láttam. A pontos portütközés/asset-cache ok nem bizonyított; más alkalmazás kockázata miatt nem állítottam le őket. Izolált helyi szerverrel a főútvonalak rendben voltak. Rapid navigációnál néhány stream megszakadt, a releváns GET kérések 200-zal zárultak. |
| Várt hozzáférési állapot | EXPECTED NOT FOUND | Egy korábbi, ebben a lokális adatbázisban nem létező survey-azonosító megfelelő „nem található” oldalt adott. Ez nem 401/403 és nem hibás route. Az elérhető rekordoknál a szervezet query megmaradt. |
| Dashboard és projektkompozíció | BROWSER VERIFIED | A hat dashboard funkció és sorrend megmaradt. Projektfolyamat: nyolc szemantikus link teljes szélességű 2-oszlopos lista, mobilra 1 oszlop. Az alapadat/szerkesztés szekciók nyitottak; keretes egymásba ágyazás csökkent. A 2-oszlop regressziót javított CSS-szabályt követően képernyőn vizuálisan ellenőriztem. |
| Munkaterületek | BROWSER VERIFIED / PARTIAL | Tetőselector, meglévő roof workspace/revízió, dashboard, survey, project overview, takeoff, quote draft, procurement, gutter/flashing, materials, execution megnyílt. Képlet, forrásrevision, Auth/RLS, adatbázis és pénzügyi szerződés nem változott. A mentési/approval/handoff műveleteket nem futtattam. |
| Témák | BROWSER VERIFIED (DASHBOARD) | A dashboard világos és sötét módját megtekintettem; a sötét mód lett visszaállítva. A két téma minden route-on, kontrasztmérővel nem lett ellenőrizve. |
| Browser-bizonyíték | PARTIAL | Vizuális ellenőrzés képernyőn; a projektáttekintő lista hiba előtti/utáni állapota ellenőrizve. A kilenc előírt route képpárja nem készült el és browser screenshotok lokális fájlba exportálása nem volt elérhető. |
| Responsive / accessibility | NOT VERIFIED THIS MILESTONE | 1440/1024/768/390/320 px pontos viewport override és overflow mérés nem futott. Fizikai Safari/eszköz, soft keyboard, teljes billentyűzet/dialog, screen reader, reduced-motion, increased-contrast nem ellenőrzött. Korábbi mérföldkő emulációja nem bizonyíték erre a végleges F9.14.5 buildre. |
| Automatizált regresszió | PASS (FOCUSED) | Pontos parancs: `npx vitest run src/features/projects/project-workflow-overview.test.ts src/features/projects/project-navigation.test.ts src/features/dashboard/dashboard.test.ts src/features/roof-models/gable-roof-form.test.tsx src/features/roof-models/multi-roof-form.test.tsx src/features/roof-models/technical-drawing.test.tsx src/features/roof-models/roof-type-selector.test.tsx src/features/roof-models/standalone-gable-preview.test.ts src/features/field-surveys/field-survey-editor.test.tsx src/features/roof-models/measurement-guidance.test.tsx src/features/execution/execution-overview.test.ts src/features/roof-models/project-roof-drawings.test.ts`: 12 fájl / 39 teszt PASS. `npm run typecheck`, `npm run lint`, izolált forrásmásolaton `npm run build` (Next.js 16.4.0 webpack, 43 felsorolt app/API route) és `git diff --check` PASS. Teljes suite nem futott. |
| Perzisztencia / adatvédelem | NEM VÁLTOZOTT | Csak UI/CSS/teszt/dokumentáció; adatbázis-, számítás- és mentési contract nem módosult. Elérhető survey és saved roof/quote/procurement rekordokat csak olvastam. Hosted DB/RLS test suite nem futott. |

## F9.14.6 — Product UI Architecture & Visual Refinement

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Megosztott UX-szerkezet | IMPLEMENTED / AUTOMATED VERIFIED | Új `GlassToolbar` szemantikus groupként használható a rajz- és szűrőeszközökön; meglévő `RoofWorkspace`, `TechnicalDrawing` és mérési útmutató újrafelhasználva. Új UI-függőség nincs. |
| Tetőválasztó | BROWSER VERIFIED | Hét felismerhető típus és címke; 1440/1024/768/390/320 px-en 4/4/3/2/2 csempeoszlop, 0 px dokumentum-túlcsordulás. |
| Survey mérések → SVG | BROWSER VERIFIED | A méréssor közvetlenül az interaktív rajz előtt áll. Mérések 16 px betűvel és legalább 46 px magas mezővel; mérőmező fókuszára egy SVG-dimenzió kiemelődik. Eredmény: 93,338 m². |
| Survey mentés / újranyitás | BROWSER VERIFIED (LOCAL DEMO) | Dashboard → gyorsfelmérés → mentés → felméréslista → újranyitás: `DEMO F9.14.6 nyeregtető`, V1, 10/6/3 m, 300/0/0 mm, SVG és 93,338 m². Új lokális tesztrekord; meglévő adat nem módosult. |
| Projekt tetőmodell mentés / újratöltés | BROWSER VERIFIED (LOCAL DEMO) | Új tesztprojekt `2e5ebf96-6dbc-4b2e-b8bc-60bffe430318`; tetőmodell `73521fd7-cf63-4350-a908-4290cb4642c9`, V1. Oldal-újratöltés után 10 000 × 6 000 × 3 000 mm, 300/0/0 mm túlnyúlások, műszaki SVG és 93,338 m² megmaradt. Más projektet vagy rekordot nem módosítottam. |
| Dashboard → projektek → részlet | BROWSER VERIFIED | Dashboard funkciólink, projektlista `Megnyitás`, projektazonosító query megmaradt; részleten 0 px oldal-túlcsordulás 320 px-en. |
| Projekt → mentett tetőrajz | BROWSER VERIFIED (READ ONLY) | Projektből a meglévő nyeregtető modell Revízió 4 megnyílt; rajz, dimenziók és eredménymetrikák jelen vannak; 320 px-en 0 px túlcsordulás. |
| Projekt → ajánlat / anyag | BROWSER VERIFIED (READ ONLY) | Projekt-ajánlat útvonalon 6 meglévő ajánlat látható; az anyagkatalóguson 5 meglévő DEMO termék. Mentési, véglegesítési vagy archiválási művelet nem futott. |
| Responsive mátrix | BROWSER VERIFIED (EMULATED) | Dashboard, selector, survey, standalone roof calculator, projektlista/részlet, anyagok és ajánlatok: 1440/1024/768/390/320 px, dokumentumszintű vízszintes overflow nélkül. Materials/quotation toolbar: 2 oszlop desktopon/tableten; 1 oszlop 390/320 px-en. Nem fizikai eszközteszt. |
| Téma / fókusz | BROWSER VERIFIED / PARTIAL | Világos dashboard és survey; sötét dashboard és 320 px survey; a sötét beállítás visszaállítva. SVG-dimenzió-fókusz működik. Screen reader és fizikai Safari nincs ellenőrizve. |
| Fókuszált Vitest | PASS | Pontos parancs: `npx vitest run src/components/ui/glass-toolbar.test.tsx src/features/dashboard/dashboard.test.ts src/features/projects/project-navigation.test.ts src/features/projects/project-workflow-overview.test.ts src/features/roof-models/gable-roof-form.test.tsx src/features/roof-models/multi-roof-form.test.tsx src/features/roof-models/technical-drawing.test.tsx src/features/roof-models/drawing-viewport.test.ts src/features/roof-models/roof-type-selector.test.tsx src/features/roof-models/standalone-gable-preview.test.ts src/features/roof-models/project-roof-drawings.test.ts src/features/field-surveys/field-survey-editor.test.tsx src/features/roof-models/measurement-guidance.test.tsx src/features/execution/execution-overview.test.ts src/features/field-surveys/field-survey-actions.test.ts`: 15 fájl / 55 teszt PASS. Emellett `npm run typecheck`, `npm run lint`, izolált másolaton `npm run build` Next.js 16.4.0 webpack és `git diff --check` PASS; teljes suite nem futott. |
| Before/after vizuális bizonyíték | PARTIAL | After állapotok böngészőben megtekintve; összehasonlító screenshot-fájlok nem exportálhatók ebből az in-app browserből. A hét kötelező route megőrzött, azonos állapotú képpárja hiányzik. |
| Adatkonzisztencia / jogosultság / képlet | UNCHANGED / PARTIAL PROOF | Domain-képletek, sémák, Auth/RLS, mentési action, revízió- és pénzügyi szerződés nem változott. Lokális DEMO save/reopen bizonyított; hosted DB, párhuzamos mentés és Auth/RLS regresszió nem futott. |

## F9.14.7 — Final Interface & Workflow Refinement

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Tetőrajz és eredmények | IMPLEMENTED / BROWSER VERIFIED | A rajzkezdeti illesztés a méretcímkéket is számolja; resize csak felhasználói zoom/pan előtt refittel. Szerkesztőben V1 modell, 10 000×6 000×3 000 mm és 93,338 m² olvasható volt; zoom 104→114%, rétegpanel nyitása nem állította vissza. E mérföldkőben projekt-roof save/reopen nem futott, képlet nem változott. |
| Projektmenü | BROWSER VERIFIED / PARTIAL | Felső jobb menü nyílt; nyíl-kulcs fókuszléptetés, projekt-előrekitöltött felmérés URL és törlés indoklása ellenőrizve. Archiválás-megerősítést megnyitottam és megszakítottam, műveletet nem küldtem. Migration tiltás és meglévő adatfüggőségek alapján törlés disabled. Escape/outside click és valódi archív mentés nem browser-ellenőrzött. |
| Kalkulátorok | BROWSER VERIFIED | A 3 kategória és mentett számítás link elérhető; nyeregtető, cserepeslemez, ereszcsatorna, szegély, lemezprofil és mentett nézet szervezeti queryvel megnyílt. Számítást nem mentettem. |
| Kivitelezés | BROWSER VERIFIED (READ ONLY) | Szervezethez kötött meglévő projektterv, valós 2 feladat (1 kész, 1 folyamatban), 1 naplóbejegyzés, 2 kép és projekt-kivitelezés deep link. Sem státuszt, sem feladatot nem hoztam létre. |
| Új/meglévő survey | BROWSER VERIFIED (LOCAL DEMO) | Projekt nélküli `DEMO F9.14.7` mentés V1, reload/reopen után szakasz és megjegyzés megmaradt (`3f32d50f-e47e-44ad-9cf9-29fbb27d576c`). Meglévő survey disclosure nyit/zár, projektkapcsolat/fotó panel és fájlkontrollok elérhetők; fotófeltöltés nem futott. |
| Responsive survey mérés | BROWSER VERIFIED / PARTIAL | DevTools CSS/visual/client/document/body szélesség: 320→320/320/320/320; 390→390/390/390/390 a mentésgomb és section disclosure javítása után; 768→768/768/768/768. 1024/1440 célérték mellett a DevTools-vászon 799 px-re korlátozott, ezért ezek a célméretek és a többi route mátrixa UNVERIFIED. Dark survey képernyőn ellenőrizve; light mode/fizikai eszköz nincs. |
| Vizuális artefaktum | PARTIAL | Oldalállapotok böngészőben megtekintve; összehasonlítható, exportált before/after fájlpár nem készült. |
| Fókuszált Vitest | PASS | 13 fájl / 47 teszt. Parancsban: `glass-disclosure.test.tsx`, `project-lifecycle.test.tsx`, `field-survey-editor.test.tsx`, `technical-drawing.test.tsx`, `drawing-viewport.test.ts`, `annotation-layout.test.ts`, `multi-roof-form.test.tsx`, `standalone-gable-preview.test.ts`, `execution-overview-index.test.ts`, `execution-overview.test.ts`, `project-navigation.test.ts`, `project-workflow-overview.test.ts`, `field-survey-actions.test.ts`. `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack izolált `npm run build` PASS; buildhez placeholder public Supabase környezet. Teljes suite nem futott. |
| Auth/RLS, adatbázis, képlet | NEM VÁLTOZOTT / NEM FUTTATOTT | UI/CSS és read-only org-scoped kivitelezési lekérdezés változott; mentési és jogosultsági szerződés, képletek, séma nem. Ezért új Auth/RLS/DB teszt nem futott. Hosted DB és versengő mentés nincs ellenőrizve. |
| `git diff --check` / végső diff | PASS | Dokumentáció frissítése után `git diff --check` lefutott és tiszta kimenettel zárult. |

## F9.14.8 — Project & Calculator UI Refinement

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Projektműveletek | BROWSER VERIFIED | Egyetlen `Projektműveletek` menü; új felmérés, archiválás, másolat, és indokoltan letiltott törlés. A külön másodlagos művelet-disclosure eltűnt. Menümegnyitás és projektadat-szerkesztő működik; archív/másolás/törlés nem futott. |
| Projektfolyamat és alapadatok | BROWSER VERIFIED | Nyolc teljes felületű, ikonos, állapotot közlő link; csempéről ereszcsatorna útvonal megnyílt. Alapadatok kompakt rácsban, meglévő szerkesztő külön. |
| Kalkulátor-felfedezés | BROWSER VERIFIED | Meglévő három kategória és mind az öt csempe látható. Tetőgeometria, cserepeslemez, ereszcsatorna, szegély, lemezprofil és mentett számítás route szervezeti kontextussal megnyílt. Számítás mentése nem történt. |
| Responsive mátrix | BROWSER VERIFIED (EMULATED) | Hitelesített helyi böngészőben mindkét oldal: 1440/1024/768/390/320 CSS px. A `innerWidth`, `documentElement.clientWidth/scrollWidth` és `body.scrollWidth` minden ponton a célmérettel egyezett; 0 px vízszintes túlcsordulás. Emulált böngészős nézet, nem fizikai eszközteszt. |
| Vizuális before/after artefaktum | PARTIAL | Mindkét oldal módosítás előtti és utáni állapotát megtekintettem; after képek a böngésző eszköznézetében rögzültek, de exportált és megőrzött képfájl nem áll rendelkezésre. |
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-lifecycle.test.tsx src/features/projects/project-workflow-overview.test.ts src/features/projects/project-workflow-data.test.ts src/features/projects/project-navigation.test.ts src/features/projects/project-actions.test.ts src/components/ui/glass-disclosure.test.tsx`: 6 fájl / 13 teszt PASS. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és dokumentáció frissítése után `git diff --check` PASS. Teljes Vitest regresszió nem futott. |
| Adatkonzisztencia / jogosultság | NEM VÁLTOZOTT | Csak UI, CSS és UI-tesztek változtak. Domain-számítás, mentési művelet, Auth/RLS, szervezeti jogosultság és séma nem módosult; helyi DB/auth regresszió nem futott. Böngészőműveletek read-only navigációt és disclosure/menu megnyitást jelentettek. |

## F9.14.9 — Settings, Account Management & Mobile Quick Scaling

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Header / preference egyforrás | BROWSER VERIFIED | Külön fejléc téma-toggle és Beállítások maradt; a System/Világos/Sötét választó csak a Beállításokban jelenik meg. System → explicit quick-toggle és refresh utáni módmegőrzés működött; végül System visszaállítva. |
| Account modal | BROWSER VERIFIED / PARTIAL | A jelenlegi Auth e-mail és provider, külön e-mail- és jelszóform, kliensoldali invalid e-mail üzenet látható; Escape bezár, fókusz a nyitógombra visszaáll. A browserben sikeres email/password submit nem történt. |
| Lokális Auth self-service | PASS (LOCAL) | `RUN_LOCAL_AUTH_ACCOUNT_TESTS=1 npx vitest run src/features/auth/account-management.local.integration.test.ts`: 1 teszt PASS. Két random disposable helyi felhasználó; saját password update (régi jelszó elutasítva, új elfogadva), saját e-mail update request elfogadva; másik felhasználó változatlan; tesztfiókok cleanup lefutott. E-mail-confirm levél/link nem lett kézbesítve vagy megnyitva; hosted Auth nem tesztelt. |
| Mobil 390 px | BROWSER VERIFIED (EMULATED) | `innerWidth/documentElement.scrollWidth/body.scrollWidth = 390/390/390`; header `static`; trigger bounding box x=327.6…378, y=499.6…550 egy 390×562 visual emulációban. Cluster x=74…378, y=251…487, tehát a viewporton belül. Trigger, két buborék, × close, theme toggle, full settings és dialog valós interakcióval ellenőrizve. Szöveg slider 130→140→130, UI slider 90→100→90, desktop control értékekkel szinkronban. |
| Mobil 320 px | BROWSER VERIFIED (EMULATED) | `innerWidth/documentElement.scrollWidth/body.scrollWidth = 320/320/320`; header `static`; bottom-right launcher megjelenik, trigger nyitotta a két buborékot, × bezárta. A 320 px-es fiókdialog teljes űrlapútvonalát és scroll közbeni critical action fedést külön nem ellenőriztem. |
| Preference persistence / route | PARTIAL | Téma refresh után megmaradt. A slider értékek ugyanazt a meglévő ScalingProvider/localStorage rendszert írják; egy route-váltás utáni browser persistence workflow ebben a körben nem futott. Fizikai eszköz, tablet, soft keyboard és Safari nincs ellenőrizve. |
| Auth biztonság / adat | AUTOMATED + CODE VERIFIED | UI kizárólag aktuális Supabase session `getUser/updateUser` hívásait használja; arbitrary user ID és service role nincs browser útvonalon. Service-role csak lokális tesztfixture létrehozás/takarítás során. App táblában vagy localStorage-ban jelszó nincs. Nincs migration, hosted Auth/DB művelet vagy üzleti adatváltozás. |
| Fókuszált Vitest / typecheck / lint / build / diff | PASS (FOCUSED) | Pontos Vitest: `npx vitest run src/lib/theme.test.ts src/components/theme/theme-toggle.test.tsx src/features/preferences/scaling-controls.test.ts src/components/accessibility/scaling-bubble.test.ts src/features/auth/account-management.test.ts src/features/auth/account-management.local.integration.test.ts src/features/projects/project-lifecycle.test.tsx src/features/projects/project-workflow-overview.test.ts`: 7 fájl / 20 teszt PASS, az opt-in Auth teszt ebben a futásban 1 skip. Külön local Auth integration: 1 PASS. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Teljes Vitest regresszió nem futott. |
