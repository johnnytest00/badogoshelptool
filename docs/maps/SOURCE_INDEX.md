# TetőPro funkció–forrás–teszt térkép

Ez az index a [projektismereti könyvtár](../LIBRARY.md) 31 stabil funkcióazonosítóját köti a jelenlegi munkafa implementációjához. A felsorolt szimbólumok belépési pontok, nem teljes exportlista. Tartós adatnál mindig használd a [sématérképet](SCHEMA_INDEX.md) is.

**Leltár:** a jelenlegi munkafa **862 releváns fájlt** tartalmaz. A DOCS.1 857-es állapotához képest az öt új tervrajzos forrás/fixture is szerepel; generált/vendor/kizárt fájlok a végén vannak.

## Core, felület és hozzáférés

<a id="core-app"></a>
<!-- feature: CORE-APP -->
## CORE-APP — Alkalmazáshéj és navigáció

- Belépés: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/navigation/app-navigation.tsx`, `src/features/dashboard/dashboard.tsx`, `src/proxy.ts`.
- Fő szimbólumok: `AppNavigation`, `AppNavigationLinks`, `navigationRoutes`, `canonicalRoute`, `getDashboardData`.
- Route/komponens: gyökér layout, dashboard, loading/error, route-specifikus oldalak; az üzleti logika a megfelelő feature-ben marad.
- Teszt: `src/app/layout.test.tsx`, `src/app/loading-error-ui.test.ts`, `src/components/navigation/routes.test.ts`, `src/features/dashboard/*.test.*`.
- Kapcsolatok: `AUTH-ORG`, `PREF-A11Y`, `UI-SYSTEM`, minden route szerinti feature.
- Adatbázis: nincs önálló sématulajdon; a dashboard olvasási határai `AUTH-ORG` és a workflow-k alatt vannak.
- Invariáns: route-kompozíció nem birtokolhat domainképletet vagy jogosultsági döntést.

<a id="auth-org"></a>
<!-- feature: AUTH-ORG -->
## AUTH-ORG — Hitelesítés és szervezet

- Belépés: `src/features/auth/auth.server.ts`, `actions.ts`, `access-state.tsx`, `src/infrastructure/supabase/{browser,server,proxy,env}.ts`, `src/proxy.ts`.
- Fő szimbólumok: auth/session lekérés, login/recovery actionök, redirect- és access-state szerződések.
- Route/komponens: `/bejelentkezes`, `/jelszo-visszaallitas`, auth callbackok, account-management dialog.
- Teszt: `src/features/auth/*.test.*`, `src/app/auth/**/*.test.ts`, helyi auth integration.
- Kapcsolatok: `CORE-APP`, `DB-SECURITY`, minden szervezeti workflow.
- Adatbázis: `profiles`, `organizations`, `organization_members`; részletek a sémaindexben.
- Invariáns: kliensazonosító önmagában nem jogosultság; actor és organization szerver-/DB-oldali ellenőrzése kötelező.

<a id="pref-a11y"></a>
<!-- feature: PREF-A11Y -->
## PREF-A11Y — Beállítások és akadálymentesség

- Belépés: `src/features/preferences/`, `src/components/accessibility/`, `src/components/theme/`.
- Fő szimbólumok: `ThemeProvider`, `useTheme`, `ThemeToggle`, `MobileFocusSupport`, `ScalingBubble`.
- Route/komponens: gyökér layout, beállításpanelek, lebegő méretezési vezérlő.
- Teszt: preferences-, theme-toggle-, scaling-bubble- és keyboard/viewport helper tesztek.
- Kapcsolatok: `UI-SYSTEM`, `CORE-APP`.
- Adatbázis: felhasználói preference olvasás/írás csak a feature jelenlegi adapterén keresztül.
- Invariáns: a vizuális skálázás ne változtasson domainértéket és ne fedje el a fókuszt vagy hibajelzést.

<a id="ui-system"></a>
<!-- feature: UI-SYSTEM -->
## UI-SYSTEM — Közös felületi rendszer

- Belépés: `src/app/globals.css`, `src/components/ui/`, `src/components/feedback/`, `src/components/background/`, `src/lib/` UI-segédei.
- Fő szimbólumok: `LengthField`, `GlassDisclosure`, `GlassPageHeader`, `GlassToolbar`, `PendingIndicator`, `AppInteractionProvider`.
- Route/komponens: minden feature komponens; az egyedi workflow-k ne másolják a közös vezérlőket.
- Teszt: `src/components/**/*.test.*`, `src/lib/{floating-control-placement,keyboard-visibility,theme,unsaved-changes,viewport-menu-placement}.test.ts`.
- Kapcsolatok: `PREF-A11Y`, `CORE-APP`, `CALC-CONSTRUCTION`, `DRAW-INTERPRET`.
- Adatbázis: nincs.
- Invariáns: kanonikus mm, látható error/pending/unsaved állapot és legalább 44 px-es releváns touch target.

## Kalkulációk és tető

<a id="calc-catalog"></a>
<!-- feature: CALC-CATALOG -->
## CALC-CATALOG — Kalkulátorkatalógus

- Belépés: `src/domain/calculations/registry.ts`, `construction/catalog.ts`, `src/features/calculators/{calculator-navigation,construction-calculator-loading,*-calculator-definitions}.ts`.
- Fő szimbólumok: `createProductionCalculatorRegistry`, `constructionCalculatorCatalog`, `verifiedConstructionReferences`.
- Route/komponens: `/kalkulatorok`, `/kalkulatorok/epitesi`, tető-/fedés-/profil route-ok.
- Teszt: registry/engine, catalog, navigation, thumbnails és loading tesztek.
- Kapcsolatok: `CALC-ENGINE`, `CALC-CONSTRUCTION`, `ROOF-*`, `SHEET-PROFILE`.
- Adatbázis: menthetőség kalkulátoronként `CALC-PERSIST` alatt.
- Invariáns: csak implementált kalkulátor lehet production registryben; katalógusstátusz ne tervdokumentumból származzon.

<a id="calc-engine"></a>
<!-- feature: CALC-ENGINE -->
## CALC-ENGINE — Domain motor és szerződések

- Belépés: `src/domain/calculations/{engine,contracts,errors,roof-calculation-snapshot}.ts`, `src/domain/{math,measurements}/`.
- Fő szimbólumok: `executeCalculator`, `CalculatorRegistry`, `CalculatorDefinition`, `DomainCalculationError`, measurement unit/input sémák.
- Route/komponens: a kalkulátor feature-nek csak az engine publikus szerződését kell hívnia.
- Teszt: engine/contracts/errors, math, measurement és snapshot tesztek.
- Kapcsolatok: `CALC-CATALOG`, minden kalkulációs funkció, `CALC-PERSIST`.
- Adatbázis: perzisztált input/output a `CALC-PERSIST` szerződésén át.
- Invariáns: véges, validált kanonikus érték; hiba típusos; domain nem függ Reacttól vagy Supabase-től.

<a id="calc-construction"></a>
<!-- feature: CALC-CONSTRUCTION -->
## CALC-CONSTRUCTION — Építési kalkulátorok

- Belépés: `src/domain/calculations/construction/`, `src/features/calculators/construction-*`, `concrete-calculator-definitions.ts`, `stair-calculator-definitions.ts`.
- Fő szimbólumok: concrete/stair/rafter calculatorok, `computeConstructionCalculator`, draft- és visual szerződések.
- Route/komponens: `/kalkulatorok/epitesi`, `ConstructionSuite`, save panel és field-transfer control.
- Teszt: construction domain, drawing coverage, computation, visuals, drafts és save-panel tesztek.
- Kapcsolatok: `CALC-ENGINE`, `CALC-PERSIST`, `DRAW-INTERPRET`, `ROOF-TIMBER`.
- Adatbázis: menthető kalkulátorok `save_standalone_construction_calculation` RPC-je.
- Invariáns: opcionális mérésből nem lesz kitalált szerkezeti megfelelőség.

<a id="roof-geometry"></a>
<!-- feature: ROOF-GEOMETRY -->
## ROOF-GEOMETRY — Tetőgeometria

- Belépés: `src/domain/calculations/roof-geometry*.ts`, `roof-plane-geometry.ts`, `gable-roof.ts`, `src/domain/drawings/roof-drawing.ts`, `src/features/roof-models/`.
- Fő szimbólumok: `calculateRoofGeometry`, geometry result/edge/plane szerződések, `calculateGableRoof`.
- Route/komponens: tetőmodell route-ok, roof workspace/form/selector, technical drawing.
- Teszt: geometry/result/engineering-audit, drawing, form, viewport és local integration tesztek.
- Kapcsolatok: `ROOF-TAKEOFF`, `ROOF-TIMBER`, `ROOF-UNDERLAY`, `ROOF-COVERING`, `PROJECTS`.
- Adatbázis: roof model/revision, geometry writer és survey geometry source RPC-k.
- Invariáns: tetősíkok/élek konzisztenciája, source revision és unsupported topológia explicit jelzése.

<a id="roof-takeoff"></a>
<!-- feature: ROOF-TAKEOFF -->
## ROOF-TAKEOFF — Tetőanyag-kimutatás

- Belépés: `src/domain/calculations/{roof-material-takeoff,roof-material-spec}.ts`, `src/features/calculators/roof-calculator-definitions.ts`, `material-spec-editor.tsx`.
- Fő szimbólumok: material takeoff/spec sémák és kalkulátor-definíció.
- Route/komponens: `/kalkulatorok/epitesi?calculator=roof.material-takeoff`, construction suite és save panel.
- Teszt: roof-material-takeoff/spec, result-flow, drawing-roof-takeoff, persistence/quotation source tesztek.
- Kapcsolatok: `ROOF-GEOMETRY`, `ROOF-TIMBER`, `ROOF-UNDERLAY`, `ROOF-COVERING`, `MATERIAL-TAKEOFF`.
- Adatbázis: standalone calculation revision; downstream takeoff/quotation source csak támogatott outputból.
- Invariáns: geometriai és beszerzési mennyiség elkülönítése, source snapshot megőrzése.

<a id="roof-timber"></a>
<!-- feature: ROOF-TIMBER -->
## ROOF-TIMBER — Szarufa, faanyag és Karmi

- Belépés: `roof-timber-layout.ts`, `construction/{plane-birdsmouth,rafter-joints}.ts`, `src/domain/drawings/rafter-*`, `src/features/calculators/{rafter-*,purlin-figure,hap-figure}*`.
- Fő szimbólumok: `calculateRoofTimberLayout`, birdsmouth/joint kalkulációk, rafter drawing modellek.
- Route/komponens: construction suite tetőkalkulátorai, roof timber panel, rafter drawingok.
- Teszt: timber, plane-birdsmouth, rafter-joints/layout/detail/drawing és Karmi parity.
- Kapcsolatok: `ROOF-GEOMETRY`, `ROOF-TAKEOFF`, `CALC-CONSTRUCTION`.
- Adatbázis: calculation snapshot; legacy survey timber parameters.
- Invariáns: hossz/darabszám geometriai, nem statikai; csatlakozási adat hiánya nem pótolható feltételezéssel.

<a id="roof-underlay"></a>
<!-- feature: ROOF-UNDERLAY -->
## ROOF-UNDERLAY — Alátétfólia

- Belépés: `src/domain/calculations/roof-underlay.ts`, `roof-covering-parameters.ts`, `src/features/roof-models/roof-underlay-quantity-panel.tsx`.
- Fő szimbólumok: underlay input/output sémák és quantity kalkuláció.
- Route/komponens: roof workspace, survey legacy snapshot, tetőanyag-kimutatás.
- Teszt: roof-underlay/parameters, workspace, roof-model és pgTAP 039.
- Kapcsolatok: `ROOF-GEOMETRY`, `ROOF-TAKEOFF`, `SURVEY-LEGACY`.
- Adatbázis: legacy survey revision opcionális underlay parameter snapshot.
- Invariáns: támogatott síkgeometria, explicit roll/overlap/direction, unsupported physical layout jelzése.

<a id="roof-covering"></a>
<!-- feature: ROOF-COVERING -->
## ROOF-COVERING — Fedés és lemezkiosztás

- Belépés: `gable-*covering.ts`, `metal-sheet-layout.ts`, `roof-covering-*`, `sheet-layout-material.ts`, `src/features/roof-models/*covering*`, `*sheet-layout*`.
- Fő szimbólumok: covering kalkulátorok, layout/material resolution, persistence actionök.
- Route/komponens: tetőmodell fedéspanelek, `/kalkulatorok/cserepeslemez`, projekt lemezprofil/fedés route.
- Teszt: domain covering/layout, UI/persistence/takeoff és local integration tesztek.
- Kapcsolatok: `ROOF-GEOMETRY`, `MATERIAL-CATALOG`, `MATERIAL-TAKEOFF`, `CALC-PERSIST`.
- Adatbázis: covering/layout writer RPC-k, revisions, source snapshot és takeoff draftok.
- Invariáns: explicit product/spec source; layout revision és material snapshot immutable.

<a id="sheet-profile"></a>
<!-- feature: SHEET-PROFILE -->
## SHEET-PROFILE — Lemezprofilok

- Belépés: `src/domain/calculations/{sheet-metal-profile,profile-geometry,profile-material-compatibility}.ts`, `src/features/sheet-metal/`.
- Fő szimbólumok: `calculateSheetMetalProfile`, `buildProfileGeometry`, profile editor/drawing/action/data.
- Route/komponens: `/kalkulatorok/lemezprofilok`, projekt lemezprofil route, profile editor.
- Teszt: profile geometry/material/editor/drawing/takeoff/persistence tesztek.
- Kapcsolatok: `CALC-ENGINE`, `MATERIAL-CATALOG`, `MATERIAL-TAKEOFF`, `CALC-PERSIST`.
- Adatbázis: sheet-metal profile calculation RPC, material requirement snapshot, profile takeoff.
- Invariáns: bend count/extent/area határok, authoritative output és anyagforrás megőrzése.

## Tervrajz-feldolgozás

<a id="draw-pdf"></a>
<!-- feature: DRAW-PDF -->
## DRAW-PDF — PDF.js

- Belépés: `src/infrastructure/drawings/{pdf-text-extractor,pdf-text-normalizer,pdf-preview}.ts`, `src/features/drawings/`, `src/app/devtools/m12-pdf/page.tsx`.
- Fő szimbólumok: PDF source extraction/normalization, preview render és erőforrás-felszabadítás.
- Route/komponens: fejlesztői diagnosztika és `PlanFieldTransfer`.
- Teszt: a három infrastruktúra-modul névazonos tesztje.
- Kapcsolatok: `DRAW-OCR`, `DRAW-INTERPRET`, `DRAW-SECTIONS`, `PWA-ASSETS`.
- Adatbázis: nincs; kliensmemóriában marad.
- Invariáns: fájl-/oldal-/token-/pixelhatár, megszakítás és forráskoordináta megőrzése.

<a id="draw-ocr"></a>
<!-- feature: DRAW-OCR -->
## DRAW-OCR — Tesseract OCR

- Belépés: `src/infrastructure/drawings/ocr.ts`, `public/ocr/{core,lang,worker.min.js,fixtures}`, licencek.
- Fő szimbólumok: OCR source adapter, input/bitmap limit, helyi worker/core/language konfiguráció.
- Route/komponens: M12 devtool és `PlanFieldTransfer` explicit OCR-akció.
- Teszt: drawing text source és OCR diagnosztika/fixture; pontossági kapu a M12 mátrixban.
- Kapcsolatok: `DRAW-PDF`, `DRAW-INTERPRET`, `PWA-ASSETS`.
- Adatbázis: nincs; nincs automatikus feltöltés vagy perzisztencia.
- Invariáns: **M12.2 BLOCKED**; confidence nem műszaki pontosság, OCR numerikus output nem automatikus mezőérték.

<a id="draw-interpret"></a>
<!-- feature: DRAW-INTERPRET -->
## DRAW-INTERPRET — Felirat és gyorsbevitel

- Belépés: `drawing-text-source.ts`, `drawing-calibration.ts`, `drawing-value-suggestion.ts`, `drawing-field-transfer.ts`, `drawing-quick-transfer.ts`, `plan-field-transfer.tsx`.
- Fő szimbólumok: `DrawingTextSource`, `evaluateCalibration`, `measureMm`, `unitEvidence`, `measurementConflict`, value suggestion/approval, quick-transfer döntés, unit format scope és undo.
- Route/komponens: `PlanFieldTransfer`, két független referenciás oldalkalibráció, mérési adatkapcsolás, construction suite mezőfókusz és draft alkalmazás.
- Teszt: calibration, mixed-unit-plan, value-suggestion, field-transfer, quick-transfer, PlanFieldTransfer és `calculator-field-focus.test.tsx`.
- Kapcsolatok: `DRAW-PDF`, `DRAW-OCR`, `DRAW-SECTIONS`, `CALC-CONSTRUCTION`, `UI-SYSTEM`.
- Adatbázis: nincs közvetlen írás; csak mentetlen kalkulátordraft.
- Invariáns: két egyező, független referencia nélkül nincs elfogadott skála; a mérésnek ellentmondó egység külön jóváhagyást igényel; OCR-ből nincs automatikus mezőérték.

<a id="draw-sections"></a>
<!-- feature: DRAW-SECTIONS -->
## DRAW-SECTIONS — Tetőszakaszok

- Belépés: `drawing-roof-section.ts`, `drawing-roof-sections.ts`, `plan-field-transfer.tsx`.
- Fő szimbólumok: section create/activate/update/remove/restore, visual selection és coverage confirmation.
- Route/komponens: `PlanFieldTransfer` szakaszlista és a tetőanyag-kimutatás scope-ja.
- Teszt: section(s), roof-takeoff, PlanFieldTransfer és field-transfer tesztek.
- Kapcsolatok: `DRAW-INTERPRET`, `DRAW-SESSION`, `ROOF-TAKEOFF`.
- Adatbázis: szakaszonként külön standalone calculation session; a szakaszmeta nem teljesen perzisztált.
- Invariáns: kijelölés nem mérés; név/fedettség/assumption confirmation a mentési kapu része.

<a id="draw-session"></a>
<!-- feature: DRAW-SESSION -->
## DRAW-SESSION — Export/import és munkaterület

- Belépés: `drawing-roof-work-session.ts`, `construction-workspace-memory.ts`, `construction-drafts.ts`.
- Fő szimbólumok: versioned work-session parse/serialize, SHA-256 source binding, draft epoch/memory.
- Route/komponens: `PlanFieldTransfer`, construction suite és save panel.
- Teszt: work-session, workspace-memory, drafts és section restore tesztek.
- Kapcsolatok: `DRAW-SECTIONS`, `DRAW-INTERPRET`, `CALC-PERSIST`.
- Adatbázis: nincs munkafájl-DB; a későbbi szakaszmentés `CALC-PERSIST`.
- Invariáns: max méret/szakasz, ismert kulcsok, forráshash; invalid szakmai input megmaradhat, de számítás/mentés nem indulhat.

## Tartós munkafolyamatok

<a id="calc-persist"></a>
<!-- feature: CALC-PERSIST -->
## CALC-PERSIST — Kalkulációk perzisztenciája

- Belépés: `src/features/calculations/`, `src/infrastructure/supabase/*writer.ts` calculation/covering/geometry adapterei.
- Fő szimbólumok: standalone save/list/read/revision actionök és writer adapterek.
- Route/komponens: `/kalkulatorok/mentett`, construction save panel, roof-model save actionök.
- Teszt: calculation unit/local integration, saved-list/history, writer read-error és DB/concurrency tesztek.
- Kapcsolatok: `CALC-ENGINE`, `DB-SECURITY`, `QUOTATIONS`, `EXECUTION`.
- Adatbázis: calculations/revisions/dependencies/project associations és a kalkulátorspecifikus secure RPC-k.
- Invariáns: szerveroldali újraszámítás, actor/org/source attestáció, immutable revision, idempotencia és optimistic concurrency.

<a id="survey-legacy"></a>
<!-- feature: SURVEY-LEGACY -->
## SURVEY-LEGACY — Megőrzött felmérési adatok

- Belépés: `src/domain/field-surveys/`, `src/features/field-surveys/`, `src/app/felmeresek/`, photo API.
- Fő szimbólumok: workspace/revision contract, roof source adapters, photo file contract és read-only/redirect flow.
- Route/komponens: `/felmeresek/**` kivezetett route-ok, legacy kapcsolt adatok megjelenítése.
- Teszt: field-survey domain/feature/API és kapcsolódó pgTAP.
- Kapcsolatok: `ROOF-GEOMETRY`, `PHOTO-PIPELINE`, `MATERIAL-LISTS`, `EXECUTION`.
- Adatbázis: field surveys/revisions/photos/followups/source/link táblák; insert retirement trigger.
- Invariáns: nincs új felmérés; korábbi revision/provenance olvashatósága és kompatibilitása megőrzendő.

<a id="material-takeoff"></a>
<!-- feature: MATERIAL-TAKEOFF -->
## MATERIAL-TAKEOFF — Anyagkimutatás

- Belépés: `src/domain/material-takeoffs/`, `src/features/material-takeoffs/` takeoff- és source-moduljai.
- Fő szimbólumok: aggregation/estimation, transfer/suggestion, takeoff actions/data/forms.
- Route/komponens: `/anyagkimutatasok/**`, projekt anyagkimutatás, kalkulátor→takeoff actionök.
- Teszt: domain aggregation/estimation/transfer, feature forms/actions/data és DB tesztek.
- Kapcsolatok: `MATERIAL-CATALOG`, `MATERIAL-LISTS`, `ROOF-COVERING`, `SHEET-PROFILE`.
- Adatbázis: material_takeoffs/items, approval, source snapshot és kalkulátorspecifikus draft RPC-k.
- Invariáns: source immutability, approved-state immutability, unit/type compatibility és explicit confidence.

<a id="material-catalog"></a>
<!-- feature: MATERIAL-CATALOG -->
## MATERIAL-CATALOG — Anyagkatalógus

- Belépés: `src/domain/materials/`, `src/domain/pricing/`, `src/features/materials/`.
- Fő szimbólumok: material/product/list contractok, price formatting/validation, category/product/price actionök.
- Route/komponens: `/anyagkezelo`, `/anyagok/**`, munkadíj-beállítás.
- Teszt: material/pricing contract és material feature tesztek.
- Kapcsolatok: `MATERIAL-TAKEOFF`, `MATERIAL-LISTS`, `ROOF-COVERING`, `QUOTATIONS`.
- Adatbázis: material category/manufacturer/product/variant/price/price-option és labor-rate objektumok.
- Invariáns: organization scope, price immutability/provenance, unit compatibility, nincs kitalált gyártói adat.

<a id="material-lists"></a>
<!-- feature: MATERIAL-LISTS -->
## MATERIAL-LISTS — Anyaglista és beszerzés

- Belépés: `src/domain/material-preparations/`, `material-list-contract.ts`, `src/features/material-takeoffs/` workflow/list moduljai, CSV route.
- Fő szimbólumok: preparation/list revision contract, editor, save/source actionök és procurement export.
- Route/komponens: `/anyaglistak/**`, projekt beszerzés, `/api/projektek/.../beszerzes/.../csv`.
- Teszt: preparation/list workflow/editor/source/CSV és DB tesztek.
- Kapcsolatok: `MATERIAL-TAKEOFF`, `MATERIAL-CATALOG`, `QUOTATIONS`, `SURVEY-LEGACY`.
- Adatbázis: preparation list/revision/source táblák és writer RPC-k.
- Invariáns: revision immutable, source snapshot pontos, kézi és automatikus sor eredete elkülönül.

<a id="projects"></a>
<!-- feature: PROJECTS -->
## PROJECTS — Projekt és ügyfél

- Belépés: `src/domain/projects/`, `src/features/projects/`, `src/app/projektek/`, `src/app/ugyfelek/`.
- Fő szimbólumok: project contract/data/workspace, roof model action/data.
- Route/komponens: projektlista/redirect, projektmunkafelület, tetőmodell és ügyfél route-ok.
- Teszt: project contract/workspace, roof model action/data és integration tesztek.
- Kapcsolatok: `ROOF-GEOMETRY`, `MATERIAL-LISTS`, `QUOTATIONS`, `EXECUTION`.
- Adatbázis: clients, projects, roof_models/revisions; organization membership RLS.
- Invariáns: organization/created_by immutable; a globális CRUD UI részlegességét nem szabad teljes funkciónak leírni.

<a id="quotations"></a>
<!-- feature: QUOTATIONS -->
## QUOTATIONS — Ajánlatok

- Belépés: `src/domain/quotations/`, `src/features/quotations/`, `src/app/ajanlatok/`, quotation PDF route-ok.
- Fő szimbólumok: money/financial/status/document readiness contractok, quotation action/data/editor/PDF modulok.
- Route/komponens: standalone és projektajánlat oldalak, PDF API-k.
- Teszt: domain/feature/PDF/API/local integration és quotation pgTAP.
- Kapcsolatok: `MATERIAL-LISTS`, `CALC-PERSIST`, `MATERIAL-CATALOG`, `API-DOCUMENTS`.
- Adatbázis: quotations/revisions/status events/document sequences/source táblák és save/finalize/transition RPC-k.
- Invariáns: pénzügyi contract, source/issuer snapshot és státusz-esemény immutable; standalone DRAFT nem issued dokumentum.

<a id="execution"></a>
<!-- feature: EXECUTION -->
## EXECUTION — Kivitelezés

- Belépés: `src/domain/execution/`, `src/features/execution/`, `src/app/kivitelezes/`, kivitelezési dokumentum API.
- Fő szimbólumok: plan/task/journal/photo contract, action/data/workspace/document modulok.
- Route/komponens: kivitelezési lista/új/részlet, feladat- és journal-editor, belső PDF.
- Teszt: execution domain/feature/page/API/document és pgTAP.
- Kapcsolatok: `PROJECTS`, `CALC-PERSIST`, `SURVEY-LEGACY`, `PHOTO-PIPELINE`, `API-DOCUMENTS`.
- Adatbázis: execution plans/tasks/events/journal/photos/document links és source linkek.
- Invariáns: optimistic task version, idempotens journal, privát fotó, forrásrevision és nem hivatalos napló státusz.

<a id="photo-pipeline"></a>
<!-- feature: PHOTO-PIPELINE -->
## PHOTO-PIPELINE — Fotók

- Belépés: `src/infrastructure/images/`, `src/lib/optimize-upload-photo.ts`, photo API és Supabase photo writer.
- Fő szimbólumok: survey normalization, report optimization, upload optimization, reserve/attach/remove.
- Route/komponens: field-survey photo API és execution photo UI/action.
- Teszt: image/lib/photo route/writer/feature és storage pgTAP.
- Kapcsolatok: `SURVEY-LEGACY`, `EXECUTION`, `DB-SECURITY`.
- Adatbázis: field_survey_photos, execution_photos és privát storage policy-k.
- Invariáns: méret/pixel/type/auth/org védelem; hosted ingress és retention külön üzemeltetési bizonyítékot igényel.

<a id="api-documents"></a>
<!-- feature: API-DOCUMENTS -->
## API-DOCUMENTS — Dokumentumvégpontok

- Belépés: `src/app/api/ajanlatok/`, `src/app/api/projektek/`, quotation/execution PDF renderelők.
- Fő szimbólumok: route `GET`, quotation document builders, execution report document és procurement CSV.
- Route/komponens: standalone/project quotation PDF, beszerzési CSV, kivitelezési dokumentáció.
- Teszt: route-, standalone PDF-, document-, auth- és source tesztek.
- Kapcsolatok: `QUOTATIONS`, `MATERIAL-LISTS`, `EXECUTION`, `AUTH-ORG`.
- Adatbázis: csak olvasás a kapcsolódó workflow láthatósági szerződésével.
- Invariáns: auth/scope, exact revision, content type/disposition, cache és hiba nem szivárogtathat idegen rekordot.

## Platform és minőség

<a id="db-security"></a>
<!-- feature: DB-SECURITY -->
## DB-SECURITY — Supabase határ

- Belépés: `supabase/migrations/`, `supabase/tests/database/`, `src/infrastructure/supabase/`, concurrency/auth scriptek.
- Fő szimbólumok: browser/server kliens, DB env, secure writer adapterek, read-error normalizálás.
- Route/komponens: minden tartós workflow Server Action/API határa.
- Teszt: 67 DB-teszt/fixture, local integration és 13 concurrency/auth verifier.
- Kapcsolatok: `AUTH-ORG`, `CALC-PERSIST`, minden tartós workflow.
- Adatbázis: teljes részletezés a sémaindexben.
- Invariáns: RLS, actor/org/source guard, immutable revision/snapshot, grants és concurrency; hosted alkalmazottságot a repó nem bizonyít.

<a id="quality-dev"></a>
<!-- feature: QUALITY-DEV -->
## QUALITY-DEV — Fejlesztői ellenőrzés

- Belépés: `package.json`, TypeScript/Next/Vitest/ESLint/PostCSS konfigurációk, `scripts/`, minden `*.test.*` és DB-teszt.
- Fő szimbólumok: projektparancsok, local-auth bootstrap, concurrency verifierek, `check-docs`.
- Route/komponens: nincs production UI-felelősség; a devtool route csak `DRAW-PDF`/`DRAW-OCR` diagnosztika.
- Teszt: `scripts/check-docs.test.mjs`, funkcióspecifikus Vitest/pgTAP és arányos build/browser QA.
- Kapcsolatok: mind a 31 funkció.
- Adatbázis: `supabase/config.toml`, `seed.sql`, pgTAP és lokális verifierek.
- Invariáns: pontos parancs és output; célzott teszt nem teljes regresszió; párhuzamos `.next` írás tiltott.

<a id="pwa-assets"></a>
<!-- feature: PWA-ASSETS -->
## PWA-ASSETS — Manifest és assetek

- Belépés: `src/app/manifest.ts`, app/brand ikonok, `public/icons/`, `public/ocr/`.
- Fő szimbólumok: manifest builder; az OCR runtime a Tesseract adapter statikus függősége.
- Route/komponens: root metadata/manifest és M12 OCR.
- Teszt: `src/app/manifest.test.ts`, OCR fixture/asset diagnosztika.
- Kapcsolatok: `CORE-APP`, `DRAW-OCR`, `QUALITY-DEV`.
- Adatbázis: nincs.
- Invariáns: licencek az asset mellett, DEMO fixture jelölve, offline/service worker nincs.

## Lefedettségi manifest

A validátor az alábbi finom szemcséjű mintákat használja. A minták átfedhetnek, de minden releváns fájlnak legalább egy funkcióhoz kell tartoznia.

<!-- coverage: CORE-APP | src/app/layout.tsx -->
<!-- coverage: CORE-APP | src/app/layout.test.tsx -->
<!-- coverage: CORE-APP | src/app/page.tsx -->
<!-- coverage: CORE-APP | src/app/loading.tsx -->
<!-- coverage: CORE-APP | src/app/error.tsx -->
<!-- coverage: CORE-APP | src/app/loading-error-ui.test.ts -->
<!-- coverage: CORE-APP | src/components/navigation/** -->
<!-- coverage: CORE-APP | src/features/dashboard/** -->
<!-- coverage: CORE-APP | src/proxy.ts -->
<!-- coverage: AUTH-ORG | src/app/bejelentkezes/** -->
<!-- coverage: AUTH-ORG | src/app/jelszo-visszaallitas/** -->
<!-- coverage: AUTH-ORG | src/app/auth/** -->
<!-- coverage: AUTH-ORG | src/features/auth/** -->
<!-- coverage: AUTH-ORG | src/infrastructure/supabase/browser.ts -->
<!-- coverage: AUTH-ORG | src/infrastructure/supabase/server.ts -->
<!-- coverage: AUTH-ORG | src/infrastructure/supabase/proxy.ts -->
<!-- coverage: AUTH-ORG | src/infrastructure/supabase/env.ts -->
<!-- coverage: PREF-A11Y | src/features/preferences/** -->
<!-- coverage: PREF-A11Y | src/components/accessibility/** -->
<!-- coverage: PREF-A11Y | src/components/theme/** -->
<!-- coverage: PREF-A11Y | src/app/demo/meretezes/page.tsx -->
<!-- coverage: UI-SYSTEM | src/app/globals.css -->
<!-- coverage: UI-SYSTEM | src/components/ui/** -->
<!-- coverage: UI-SYSTEM | src/components/feedback/** -->
<!-- coverage: UI-SYSTEM | src/components/background/** -->
<!-- coverage: CALC-CATALOG | src/app/kalkulatorok/page.tsx -->
<!-- coverage: CALC-CATALOG | src/app/kalkulatorok/loading.tsx -->
<!-- coverage: CALC-CATALOG | src/features/calculators/calculator-navigation* -->
<!-- coverage: CALC-CATALOG | src/features/calculators/construction-calculator-loading* -->
<!-- coverage: CALC-CATALOG | src/features/calculators/*-calculator-definitions.ts -->
<!-- coverage: CALC-CATALOG | src/features/calculators/construction-thumbnails* -->
<!-- coverage: CALC-CATALOG | src/domain/calculations/registry.ts -->
<!-- coverage: CALC-CATALOG | src/domain/calculations/construction/catalog* -->
<!-- coverage: CALC-ENGINE | src/domain/calculations/engine* -->
<!-- coverage: CALC-ENGINE | src/domain/calculations/contracts* -->
<!-- coverage: CALC-ENGINE | src/domain/calculations/errors.ts -->
<!-- coverage: CALC-ENGINE | src/domain/calculations/roof-calculation-snapshot.ts -->
<!-- coverage: CALC-ENGINE | src/domain/calculations/engineering-reference-fixtures.ts -->
<!-- coverage: CALC-ENGINE | src/domain/math/** -->
<!-- coverage: CALC-ENGINE | src/domain/measurements/** -->
<!-- coverage: CALC-CONSTRUCTION | src/app/kalkulatorok/epitesi/** -->
<!-- coverage: CALC-CONSTRUCTION | src/domain/calculations/construction/** -->
<!-- coverage: CALC-CONSTRUCTION | src/domain/drawings/construction-stairs* -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/construction-* -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/drawing-canvas-hooks.ts -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/feature-toggle.tsx -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/concrete-calculator-definitions.ts -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/stair-calculator-definitions.ts -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/construction-visuals.tsx -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/drawing-calculator-switch.test.tsx -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/drawing-result-strip* -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/drawing-step-bar* -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/roof-shape-support.ts -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/use-drawing-document.ts -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/purlin-figure.tsx -->
<!-- coverage: CALC-CONSTRUCTION | src/features/calculators/secure-uuid-runtime.test.ts -->
<!-- coverage: CALC-CONSTRUCTION | src/lib/secure-uuid* -->
<!-- coverage: ROOF-GEOMETRY | src/app/projektek/[projectId]/tetomodellek/** -->
<!-- coverage: ROOF-GEOMETRY | src/app/kalkulatorok/nyeregteto/** -->
<!-- coverage: ROOF-GEOMETRY | src/domain/calculations/gable-roof* -->
<!-- coverage: ROOF-GEOMETRY | src/domain/calculations/gable-segments* -->
<!-- coverage: ROOF-GEOMETRY | src/domain/calculations/roof-geometry* -->
<!-- coverage: ROOF-GEOMETRY | src/domain/calculations/roof-plane-geometry.ts -->
<!-- coverage: ROOF-GEOMETRY | src/domain/drawings/gable-drawing* -->
<!-- coverage: ROOF-GEOMETRY | src/domain/drawings/roof-drawing.ts -->
<!-- coverage: ROOF-GEOMETRY | src/domain/drawings/annotation-layout* -->
<!-- coverage: ROOF-GEOMETRY | src/domain/geometry/** -->
<!-- coverage: ROOF-GEOMETRY | src/drawings/demo-roof.tsx -->
<!-- coverage: ROOF-GEOMETRY | src/features/roof-models/** -->
<!-- coverage: ROOF-TAKEOFF | src/domain/calculations/roof-material-* -->
<!-- coverage: ROOF-TAKEOFF | src/features/calculators/material-spec-editor.tsx -->
<!-- coverage: ROOF-TAKEOFF | src/features/calculators/rafter-result-flow* -->
<!-- coverage: ROOF-TIMBER | src/domain/calculations/roof-timber-layout* -->
<!-- coverage: ROOF-TIMBER | src/domain/calculations/construction/plane-birdsmouth* -->
<!-- coverage: ROOF-TIMBER | src/domain/calculations/construction/rafter-joints* -->
<!-- coverage: ROOF-TIMBER | src/domain/drawings/rafter-* -->
<!-- coverage: ROOF-TIMBER | src/features/calculators/rafter-* -->
<!-- coverage: ROOF-UNDERLAY | src/domain/calculations/roof-underlay* -->
<!-- coverage: ROOF-UNDERLAY | src/domain/calculations/roof-covering-parameters* -->
<!-- coverage: ROOF-COVERING | src/app/kalkulatorok/cserepeslemez/** -->
<!-- coverage: ROOF-COVERING | src/domain/calculations/gable-*covering* -->
<!-- coverage: ROOF-COVERING | src/domain/calculations/metal-sheet-layout* -->
<!-- coverage: ROOF-COVERING | src/domain/calculations/roof-covering-layout* -->
<!-- coverage: ROOF-COVERING | src/domain/calculations/sheet-layout-material* -->
<!-- coverage: SHEET-PROFILE | src/app/kalkulatorok/lemezprofilok/** -->
<!-- coverage: SHEET-PROFILE | src/app/projektek/[projectId]/lemezprofilok/** -->
<!-- coverage: SHEET-PROFILE | src/domain/calculations/sheet-metal-profile* -->
<!-- coverage: SHEET-PROFILE | src/domain/calculations/profile-* -->
<!-- coverage: SHEET-PROFILE | src/features/sheet-metal/** -->
<!-- coverage: SHEET-PROFILE | src/features/calculators/data-loading.test.ts -->
<!-- coverage: ROOF-TIMBER | src/features/calculators/terminology.test.ts -->
<!-- coverage: DRAW-PDF | src/app/devtools/** -->
<!-- coverage: DRAW-PDF | src/features/drawings/** -->
<!-- coverage: DRAW-PDF | src/infrastructure/drawings/pdf-* -->
<!-- coverage: DRAW-PDF | src/infrastructure/drawings/drawing-text-source* -->
<!-- coverage: DRAW-OCR | src/infrastructure/drawings/ocr.ts -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/drawing-value-suggestion* -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/drawing-calibration* -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/drawing-field-transfer* -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/drawing-quick-transfer* -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/drawing-mixed-unit-plan.test.ts -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/plan-field-transfer* -->
<!-- coverage: DRAW-INTERPRET | src/features/calculators/calculator-field-focus.test.tsx -->
<!-- coverage: DRAW-SECTIONS | src/features/calculators/drawing-roof-section* -->
<!-- coverage: DRAW-SECTIONS | src/features/calculators/drawing-roof-takeoff.test.ts -->
<!-- coverage: DRAW-SESSION | src/features/calculators/drawing-roof-work-session* -->
<!-- coverage: DRAW-SESSION | src/features/calculators/construction-workspace-memory* -->
<!-- coverage: DRAW-SESSION | src/features/calculators/construction-drafts* -->
<!-- coverage: DRAW-SESSION | src/features/calculators/drawing-session-* -->
<!-- coverage: DRAW-SESSION | src/features/calculators/use-roof-work-session-store* -->
<!-- coverage: DRAW-SESSION | src/infrastructure/drawings/roof-work-session-store* -->
<!-- coverage: CALC-PERSIST | src/app/kalkulatorok/mentett/** -->
<!-- coverage: CALC-PERSIST | src/features/calculations/** -->
<!-- coverage: CALC-PERSIST | src/infrastructure/supabase/*writer.ts -->
<!-- coverage: SURVEY-LEGACY | src/app/felmeresek/** -->
<!-- coverage: SURVEY-LEGACY | src/domain/field-surveys/** -->
<!-- coverage: SURVEY-LEGACY | src/features/field-surveys/** -->
<!-- coverage: MATERIAL-TAKEOFF | src/app/anyagkimutatasok/** -->
<!-- coverage: MATERIAL-TAKEOFF | src/app/projektek/[projectId]/anyagkimutatas/** -->
<!-- coverage: MATERIAL-TAKEOFF | src/domain/material-takeoffs/** -->
<!-- coverage: MATERIAL-CATALOG | src/app/anyagkezelo/** -->
<!-- coverage: MATERIAL-CATALOG | src/app/anyagok/** -->
<!-- coverage: MATERIAL-CATALOG | src/app/beallitasok/** -->
<!-- coverage: MATERIAL-CATALOG | src/domain/materials/** -->
<!-- coverage: MATERIAL-CATALOG | src/domain/pricing/** -->
<!-- coverage: MATERIAL-CATALOG | src/features/materials/** -->
<!-- coverage: MATERIAL-LISTS | src/app/anyaglistak/** -->
<!-- coverage: MATERIAL-LISTS | src/app/projektek/[projectId]/beszerzes/** -->
<!-- coverage: MATERIAL-LISTS | src/domain/material-preparations/** -->
<!-- coverage: MATERIAL-LISTS | src/features/material-takeoffs/** -->
<!-- coverage: PROJECTS | src/app/projektek/** -->
<!-- coverage: PROJECTS | src/app/ugyfelek/** -->
<!-- coverage: PROJECTS | src/domain/projects/** -->
<!-- coverage: PROJECTS | src/features/projects/** -->
<!-- coverage: QUOTATIONS | src/app/ajanlatok/** -->
<!-- coverage: QUOTATIONS | src/app/projektek/[projectId]/ajanlatok/** -->
<!-- coverage: QUOTATIONS | src/domain/quotations/** -->
<!-- coverage: QUOTATIONS | src/features/quotations/** -->
<!-- coverage: EXECUTION | src/app/kivitelezes/** -->
<!-- coverage: EXECUTION | src/domain/execution/** -->
<!-- coverage: EXECUTION | src/features/execution/** -->
<!-- coverage: PHOTO-PIPELINE | src/infrastructure/images/** -->
<!-- coverage: PHOTO-PIPELINE | src/lib/optimize-upload-photo* -->
<!-- coverage: PHOTO-PIPELINE | src/app/api/felmeresek/** -->
<!-- coverage: API-DOCUMENTS | src/app/api/ajanlatok/** -->
<!-- coverage: API-DOCUMENTS | src/app/api/projektek/** -->
<!-- coverage: DB-SECURITY | src/infrastructure/supabase/database.ts -->
<!-- coverage: DB-SECURITY | src/infrastructure/supabase/read-error* -->
<!-- coverage: QUALITY-DEV | scripts/** -->
<!-- coverage: QUALITY-DEV | .env.example -->
<!-- coverage: QUALITY-DEV | .gitignore -->
<!-- coverage: QUALITY-DEV | components.json -->
<!-- coverage: QUALITY-DEV | eslint.config.mjs -->
<!-- coverage: QUALITY-DEV | next.config.ts -->
<!-- coverage: QUALITY-DEV | package.json -->
<!-- coverage: QUALITY-DEV | postcss.config.mjs -->
<!-- coverage: QUALITY-DEV | tsconfig.json -->
<!-- coverage: QUALITY-DEV | tsconfig.typecheck.json -->
<!-- coverage: QUALITY-DEV | vitest.config.mts -->
<!-- coverage: QUALITY-DEV | src/lib/f0* -->
<!-- coverage: QUALITY-DEV | src/lib/quantity-format* -->
<!-- coverage: QUALITY-DEV | src/lib/user-facing-action-error* -->
<!-- coverage: QUALITY-DEV | src/lib/validation-message* -->
<!-- coverage: UI-SYSTEM | src/lib/floating-control-placement* -->
<!-- coverage: UI-SYSTEM | src/lib/keyboard-visibility* -->
<!-- coverage: UI-SYSTEM | src/lib/theme* -->
<!-- coverage: UI-SYSTEM | src/lib/unsaved-changes* -->
<!-- coverage: UI-SYSTEM | src/lib/viewport-menu-placement* -->
<!-- coverage: PWA-ASSETS | src/app/manifest* -->
<!-- coverage: PWA-ASSETS | public/icons/** -->
<!-- coverage: DRAW-OCR | public/ocr/fixtures/** -->

## Dokumentált kivételek

<!-- exclude: .next/** | Next.js build-output -->
<!-- exclude: .vitest/** | tesztfutási output -->
<!-- exclude: node_modules/** | telepített függőség -->
<!-- exclude: tsconfig.tsbuildinfo | generált TypeScript buildinfo -->
<!-- exclude: next-env.d.ts | generált Next.js deklaráció -->
<!-- exclude: package-lock.json | generált dependency lock -->
<!-- exclude: src/infrastructure/supabase/database.types.ts | generált Supabase típus -->
<!-- exclude: src/infrastructure/supabase/README.md | dokumentáció, nem forrás -->
<!-- exclude: src/app/apple-icon.png | bináris appasset -->
<!-- exclude: src/app/favicon.ico | bináris appasset -->
<!-- exclude: src/app/icon.png | bináris appasset -->
<!-- exclude: src/assets/brand-icon.png | bináris brandasset -->
<!-- exclude: public/ocr/core/** | vendor Tesseract WASM/runtime -->
<!-- exclude: public/ocr/lang/** | vendor Tesseract nyelvi adat -->
<!-- exclude: public/ocr/worker.min.js | vendor Tesseract worker -->
<!-- exclude: public/ocr/*LICENSE* | third-party jogi fájl -->
<!-- exclude: public/ocr/THIRD_PARTY_NOTICES.md | third-party jogi dokumentum -->
<!-- exclude: docs/evidence/** | vizuális bizonyítéki asset -->

A Supabase migrációk, pgTAP-fájlok, `config.toml` és `seed.sql` coverage-manifestje a [SCHEMA_INDEX](SCHEMA_INDEX.md#adatbázis-fájllefedettség) része.
