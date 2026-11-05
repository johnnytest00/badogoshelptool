# Dokumentációs architektúra audit és migrációs terv

**Audit dátuma:** 2026-10-31

**Állapot:** első fázis, audit és terv; dokumentációs migráció nem történt

**Vizsgált alap:** a jelenlegi, módosított munkafa; a kód, a migrációk és a futtatási bizonyítékok elsőbbséget élveznek a terv- és naplódokumentumokkal szemben

## 1. Vezetői összefoglaló

A TetőPro projektismerete megvan, de a hozzáférési szerkezete nem skálázódik. A repóban **118 Markdown-dokumentum** található, összesen **26 749 sorral és 393 545 szóval**. Ebből az aktív `docs/` gyökér egymaga 108 fájl, 20 989 sor és 303 983 szó. A tudás nagy része nem hibás, hanem rossz helyen vagy több helyen van: aktuális szerződések, lezárt mérföldkövek, QA-bizonyítékok és korabeli utasítások keverednek.

Az audit **31 funkcionális területet** azonosított. A releváns implementációs leltár **855 fájl**: 623 kézzel karbantartott `src/` forrás, 195 Supabase konfiguráció/migráció/teszt, 14 helyi script, 10 gyökérszintű konfiguráció és 13 karbantartott UI-/tesztasset. A számlálás nem tartalmazza a build-outputot, `node_modules`-t, generált DB-típusokat, lockfájlt, vendor OCR-runtime-ot és bizonyítéki képernyőképeket. Az audit a kizárt fájlokat is megnevezi, hogy a szám reprodukálható legyen.

A legnagyobb felesleges kontextusforrások:

1. `docs/TEST_MATRIX.md` — 48 418 szó, aktuális tesztútmutató és teljes történeti futtatási napló egyben.
2. `docs/PROGRESS.md` — 30 307 szó, friss állapot és több tucat lezárt mérföldkő egyben, miközben már létezik `docs/archive/PROGRESS_HISTORY.md`.
3. `funkciok.md` — 18 791 szó; a részletes export 2026-10-17-i, 454 fájlos pillanatkép, miközben a jelenlegi `src/` 629 fájlt tartalmaz.
4. `docs/DATABASE.md` — 8 405 szó; séma, RLS, RPC, migrációnapló és történeti implementációs részletek keverednek.
5. Az M10, M9 és QA dokumentumcsaládok — ugyanazon fejlesztési lánc terveit, remediationjeit, független auditjait és lezárásait külön fájlokban ismétlik.

A javasolt megoldás nem egy újabb nagy leírás. A `docs/LIBRARY.md` egy rövid, funkcióazonosító-alapú router legyen; a részletes fájl- és szimbólumtérkép a `docs/maps/SOURCE_INDEX.md` fájlba kerüljön. A napi igazság 10–12 kanonikus, téma szerinti aktuális dokumentumban maradjon. A mérföldkőriportok, auditok, remediationk és lezárt QA-k kereshető archívumba kerüljenek, tartalomvesztés nélkül.

Kritikus megőrzési szabály: az M12.2 OCR pontossági kapu **BLOCKED**, a fizikai mobil-/memóriamérés hiánya, a hosted Auth/RLS/Storage bizonyítatlansága, a szakmai/statikai korlátok, valamint az immutable snapshot-, szervezeti és concurrency-követelmények aktuális kockázatok. Ezek nem archiválhatók el kizárólag azért, mert régi riportban jelentek meg.

## 2. Hatókör, módszer és bizonyíték

### 2.1 Auditkorlátok

- Nem módosult alkalmazáskód, teszt, függőség, adatbázis, meglévő dokumentum vagy agent-utasítás.
- Nem történt fájláthelyezés, törlés, branchművelet, commit, push, deploy vagy Supabase-migráció.
- A munkafa induláskor 18 módosított és 26 nem követett bejegyzést mutatott. Ezek párhuzamos munka részei lehetnek; az audit csak olvasta őket.
- Az alkalmazás, adatbázis és böngészős workflow nem futott; ez dokumentációs architektúra-audit, nem regressziós vizsgálat.

### 2.2 Leltári módszer

1. Olcsó fájllistázás: `rg --files`, kiterjesztés- és könyvtárszámlálás.
2. Markdown-címek, címsorok, sor- és szószámok kinyerése; nagy fájloknál nem történt automatikus teljes beolvasás.
3. Célzott olvasás az agent-utasításokból, belépési pontokból, aktuális M12 dokumentumokból, adatbázis-/számítási referenciákból és korábbi dokumentációs auditokból.
4. Forrástérkép a route-, feature-, domain-, infrastruktúra-, migráció- és tesztkönyvtárak alapján.
5. Helyi Markdown-linkscan: 118 fájl, 618 helyi link; 14 `fájl:line` alakú hivatkozást egy naiv ellenőrző hibásnak jelölne. A fájlútvonalak normalizálása után 0 hiányzó célfájl maradt. A címsor-ellenőrzés 26 ellenőrzendő anchor-jelöltet talált; ezek egy része diakritika/slug-képzés, egy része valódi történeti címsor-eltolódás lehet. Migráció előtt GitHub-kompatibilis sluggerrel kell eldönteni őket.

### 2.3 Reprodukálható számlálás

| Halmaz | Fájl | Sor | Szó | Megjegyzés |
|---|---:|---:|---:|---|
| Gyökérszintű Markdown | 6 | 1 389 | 24 093 | `AGENTS.md`, `CLAUDE.md`, terv, README, handoff, `funkciok.md` |
| `docs/`, archívum nélkül | 108 | 20 989 | 303 983 | aktív és történeti anyagok keverten |
| `docs/archive/` | 1 | 4 126 | 63 659 | `PROGRESS_HISTORY.md` |
| Infrastrukturális README | 1 | 35 | 155 | `src/infrastructure/supabase/README.md` |
| OCR jogi dokumentum | 2 | 210 | 1 655 | licence és third-party notice |
| **Összes Markdown** | **118** | **26 749** | **393 545** | nem tokenmérés |

A 118-as baseline az audit előtti projektanyagot jelenti. A jelen eredménydokumentummal együtt a munkafában 119 Markdown-fájl van; az audit nem leltározza saját magát.

| Forráshalmaz | Leltározott | Kizárás | Releváns |
|---|---:|---:|---:|
| `src/` | 629 | 4 bináris app/brand ikon, generált `database.types.ts`, infrastruktúra README | 623 |
| `supabase/` | 195 | 0 | 195 |
| `scripts/` | 14 | 0 | 14 |
| Gyökérkonfiguráció | 10 | lockfájl, generált `next-env.d.ts`, buildinfo kizárva | 10 |
| Karbantartott `public/` asset/fixture | 13 | vendor OCR-runtime, traineddata, licence-fájlok kizárva | 13 |
| **Releváns forrás és fejlesztői infrastruktúra** |  |  | **855** |

A 623 `src/` forrásból 224 tesztfájl. A Supabase-készlet 126 migrációt, 67 adatbázis-teszt/fixture fájlt, egy `config.toml`-t és egy `seed.sql`-t tartalmaz. A számok a jelenlegi munkafát írják le, nem egy korábbi commitot.

## 3. Jelenlegi dokumentációs problémák

### 3.1 Aktuális igazság és idővonal keveredése

- A `PROGRESS.md` eleje friss M12/P1 állapotot ad, de ugyanabban a fájlban régi F9.x index és teljes bejegyzések is maradtak.
- A `TEST_MATRIX.md` egyszerre tesztstratégia, regressziós bizonyíték és több évesnek megfelelő mérföldkőnapló.
- A `DATABASE.md` aktuális séma- és jogosultsági információi történeti migrációs narratívával keverednek.
- A `funkciok.md` felső összefoglalója hasznos, a teljes fájlexportja viszont explicit régi. A dokumentum saját figyelmeztetése ellenére könnyen mai térképként olvasható.

### 3.2 Duplikált tulajdonosi szerepek

| Fogalom | Jelenlegi ismétlés | Következmény |
|---|---|---|
| Funkcióállapot | `funkciok.md`, `PROJECT_MAP.md`, `PROGRESS.md`, `CLAUDE_HANDOFF.md`, auditok | eltérő dátumú állítások |
| Kalkulációs szerződések | `CALCULATION_ENGINE.md`, `ROOF_CALCULATION_SPECIFICATION.md`, coverage/math auditok, M9/M10 riportok | a modell nem tudja, melyik normatív |
| Tesztállapot | `TEST_MATRIX.md`, `PROGRESS.md`, QA-riportok, handoffok | ugyanaz a futás több helyen, eltérő korlátokkal |
| DB/RLS/RPC | `DATABASE.md`, migrációk, QA08–QA10, M10 riportok | korabeli audit könnyen sémaigazságnak tűnik |
| Tervrajz-feldolgozás | M12 rules, plan, matrix, progress, Claude audit/handoff | a BLOCKED/PASS WITH LIMITATIONS állapot szétszóródik |
| Agent-olvasás | `AGENTS.md` és `CLAUDE.md` részben ismétli | két rendszer idővel eltérhet |

### 3.3 Elavult vagy ellenőrzést igénylő állítások

- `funkciok.md`: 454 fájlos, 2026-10-17-i export; a jelenlegi `src/` 629 fájl, és az új `src/features/drawings/`, `src/infrastructure/drawings/`, M12 kalkulátorfájlok nincsenek teljesen leképezve.
- `docs/PROJECT_MAP.md`: állapotfelmérési dátuma 2026-10-17; a jelenlegi M12 PDF/OCR/rajzos munkamenet nincs a térképben teljesen jelen.
- `docs/README.md`: az „aktuális belépési pontok” között történeti M9/M10 lezárások szerepelnek; ez navigációs, nem igazságforrás.
- `docs/AI_DRAWING_EXTRACTION_RULES.md`: a végén az szerepel, hogy Tesseract.js nincs telepítve, miközben ugyanazon dokumentum eleje és a `package.json` a 7.0.0-s implementációt írja le. Ez dokumentumon belüli történeti maradvány, amelyet a migrációban dátumozott döntéssé kell tenni.
- A helyi linkscan 26 anchor-jelöltet talált; különösen a diakritika nélküli, kettős kötőjeles F9.x slugok és a régi `PROGRESS.md` címek kockázatosak.

### 3.4 Ami nem probléma, csak rosszul indexelt

- A korabeli auditok és QA-jelentések értékes bizonyítékok; nem szabad őket törölni.
- A `PROJECT_BLUEPRINT.md` hasznos termékcél, ha egyértelműen tervként marad.
- A részletes M10 és M12 láncok indoklást és regressziós előzményt őriznek; az automatikus olvasásból kell kivenni őket, nem megsemmisíteni.
- A jogi licencek és third-party notice-ok a kiszolgált OCR-assettel együtt maradjanak, ne a projektarchívumban.

## 4. Funkcionális területek és megfeleltetés

Az azonosítók stabil, technológiafüggetlen kulcsok. Ezeket használja majd a `LIBRARY.md`, a részletes forrástérkép és az archívum metaadata.

| ID | Magyar név és jelenlegi szerep | Elsődleges kód | Teszt/adat/API | Aktuális dokumentációs tulajdonos és figyelmeztetés |
|---|---|---|---|---|
| `CORE-APP` | Alkalmazáshéj, route-ok, navigáció, loading/error | `src/app/`, `src/components/navigation/`, `src/features/dashboard/`, `src/proxy.ts` | app/layout/manifest/navigation tesztek | jövőbeli `current/system.md`; a route létezése nem teljes workflow-bizonyíték |
| `AUTH-ORG` | Bejelentkezés, recovery, tagság, szervezetválasztás, actor-ellenőrzés | `src/features/auth/`, Supabase kliens- és proxyadapterek | auth tesztek; foundation/RLS migrációk és pgTAP | `current/security-and-data.md`; kliensből kapott organization ID nem jogosultság |
| `PREF-A11Y` | Téma, felületméretezés, mobilfókusz, hozzáférhető vezérlés | `src/features/preferences/`, `src/components/accessibility/`, `src/components/theme/` | kapcsolódó komponens- és libtesztek | `current/ui.md`; fizikai eszköz/screen reader csak futtatott bizonyítékkel PASS |
| `UI-SYSTEM` | Közös Liquid Glass felület, feedback, hosszmezők, design tokenek | `src/app/globals.css`, `src/components/ui/`, `src/components/feedback/`, `src/components/background/` | komponens- és viewporttesztek | `current/ui.md`; auditképek történetiek |
| `CALC-CATALOG` | Kalkulátorkatalógus és kategóriák | `src/domain/calculations/construction/catalog.ts`, `registry.ts`, `src/features/calculators/*definitions.ts` | catalog/navigation/loading tesztek | `current/calculations.md#catalog`; a katalógus a tényleges lista, nem a blueprint |
| `CALC-ENGINE` | Egységes engine, input/output szerződés, hibák, snapshot | `src/domain/calculations/{engine,contracts,errors,roof-calculation-snapshot}.ts` | domain tesztek | `current/calculations.md#engine`; kanonikus egységek és eredetszerződések itt legyenek |
| `CALC-CONSTRUCTION` | Lépcső-, beton-, alapozási és segédkalkulátorok | `src/domain/calculations/construction/`, `src/features/calculators/construction-*` | construction domain/UI tesztek | `current/construction-calculators.md`; szakmai/statikai megfelelőséget nem igazol |
| `ROOF-GEOMETRY` | Hét tetőforma geometriai modellje, élek, síkok, rajz | `src/domain/calculations/roof-geometry*`, `roof-plane-geometry.ts`, `src/domain/drawings/roof-drawing.ts`, `src/features/roof-models/` | roof geometry/drawing/model tesztek; geometry migrációk | `current/roof-calculations.md#geometry`; aszimmetrikus és komplex topológiai korlátok maradjanak aktuálisak |
| `ROOF-TAKEOFF` | Összesített tetőanyag-kimutatás | `roof-material-takeoff.ts`, `roof-material-spec.ts`, kapcsolódó kalkulátor-UI | takeoff/spec/transfer tesztek | `current/roof-calculations.md#takeoff`; gyártói adat nélkül nincs kitalált darabszám |
| `ROOF-TIMBER` | Szarufa, léc, vágáslista, Karmi és csatlakozási rajzok | `roof-timber-layout.ts`, `construction/plane-birdsmouth.ts`, `rafter-joints.ts`, `src/domain/drawings/rafter-*`, kapcsolódó UI | timber/rafter/Karmi tesztek | `current/roof-calculations.md#timber`; geometriai mennyiség, nem statikai vagy gyártási terv |
| `ROOF-UNDERLAY` | Alátétfólia-csíkozás, átfedés és korlátos vágási minimum | `roof-underlay.ts`, paraméterpanel és Survey snapshotkód | underlay teszt; `20261017150000` és pgTAP 039 | `current/roof-calculations.md#underlay`; csak támogatott formákra |
| `ROOF-COVERING` | Trapéz-/cserepeslemez és általános fedéskiosztás | `gable-*covering.ts`, `metal-sheet-layout.ts`, `roof-covering-*`, roof-model UI/actionök | covering/layout/persistence/takeoff tesztek és migrációk | `current/roof-calculations.md#covering`; kiosztás és vágás nem automatikusan beszerzési optimum |
| `SHEET-PROFILE` | Lemezprofil-geometria, szerkesztő, anyagigény és mentés | `sheet-metal-profile.ts`, `src/features/sheet-metal/` | profiltesztek; `20261013080700`–`0817`, pgTAP 013–015 | `current/sheet-metal.md`; korábbi design riport történeti |
| `DRAW-PDF` | Kliensoldali PDF.js szövegkinyerés, preview, korlátok | `src/infrastructure/drawings/pdf-*`, `src/features/drawings/` | extractor/preview tesztek; devtool route | `current/drawings.md#pdf`; memórialimit nem fizikai mobilgarancia |
| `DRAW-OCR` | Helyi Tesseract OCR képre és explicit PDF-oldalra | `src/infrastructure/drawings/ocr.ts`, `public/ocr/` runtime | OCR fixture/diagnosztika; licencek | `current/drawings.md#ocr`; M12.2 pontossági kapu **BLOCKED** |
| `DRAW-INTERPRET` | Tervrajzi felirat, egység, mezőjavaslat és koppintásos átvitel | `drawing-text-source.ts`, `drawing-value-suggestion.ts`, `drawing-field-transfer.ts`, `drawing-quick-transfer.ts`, `plan-field-transfer.tsx` | M12/P1 transzfer- és UI-tesztek | `current/drawings.md#interpretation`; nincs automatikus szakmai kategorizálás |
| `DRAW-SECTIONS` | Több tetőszakasz, kijelölés, aktív szakasz és takeoff-hatókör | `drawing-roof-section*.ts`, `drawing-roof-takeoff.test.ts`, `plan-field-transfer.tsx` | szakasz-, takeoff- és browser QA-bizonyíték | `current/drawings.md#sections`; kijelölés nem mérés |
| `DRAW-SESSION` | Export/import, forráshash, visszakötés és visszavonás | `drawing-roof-work-session.ts`, workspace memory/draft modulok | work-session/import tesztek | `current/drawings.md#session`; a munkafájl nem szakmai érvényességi igazolás |
| `CALC-PERSIST` | Kalkuláció mentése, immutable revízió, forrás- és konkurenciavédelem | `src/features/calculations/`, Supabase writer adapterek | local integration; calculation RPC migrációk/pgTAP | `current/persistence.md#calculations`; szerveroldali újraszámítás és actor/org guard kötelező |
| `SURVEY-LEGACY` | Kivezetett felmérési UI, megőrzött adatok, fotók és kompatibilitás | `src/domain/field-surveys/`, `src/features/field-surveys/`, felmérési route-ok | Survey tesztek; `20261015070000`–, retirement migráció | `current/legacy-surveys.md`; új felmérés tiltott, de adat törlése nincs engedélyezve |
| `MATERIAL-TAKEOFF` | Anyagkimutatás, aggregálás, provenance, jóváhagyás | `src/domain/material-takeoffs/`, `src/features/material-takeoffs/` | takeoff tesztek; migrations 0500–0502, kapcsolódó pgTAP | `current/materials.md#takeoffs`; source snapshot immutábilis |
| `MATERIAL-CATALOG` | Kategória, termék, variáns, ár és provenance | `src/domain/materials/`, `src/features/materials/` | material tesztek; catalog/price migrációk | `current/materials.md#catalog`; szakmai/gyártói/áradatot nem szabad kitalálni |
| `MATERIAL-LISTS` | Anyaglisták, előkészítés, beszerzés és CSV | material list/preparation contractok, feature workflow, procurement API | list/preparation/CSV tesztek; kapcsolódó migrations/pgTAP | `current/materials.md#lists`; kalkulációs mennyiség és beszerzési tétel ne mosódjon össze |
| `PROJECTS` | Projekt, ügyfél, tetőmodell és projekten belüli munkafelületek | `src/domain/projects/`, `src/features/projects/`, project route-ok | project/roof-model integration tesztek; project migrations | `current/workflows.md#projects`; globális CRUD UI részleges |
| `QUOTATIONS` | Árajánlat, revízió, forrás, pénzügyi szerződés és PDF | `src/domain/quotations/`, `src/features/quotations/`, quotation API-k | 45 feature-fájl, 15 teszt; quotation migrations/pgTAP | `current/quotations.md`; standalone DRAFT/finalizálási korlátokat pontosan jelölni |
| `EXECUTION` | Kivitelezési terv, feladat, munkanapló, fotó és belső dokumentáció | `src/domain/execution/`, `src/features/execution/`, kivitelezési route/API | 29 feature-fájl, 11 teszt; execution migrations/pgTAP | `current/execution.md`; nem hivatalos e-építési napló |
| `PHOTO-PIPELINE` | Felmérési és riportfotó normalizálás, feltöltési védelem | `src/infrastructure/images/`, fotó API/writer | image/API tesztek; storage policy migrations | `current/security-and-data.md#photos`; hosted ingress és retention továbbra is külső kockázat |
| `API-DOCUMENTS` | PDF/CSV/kivitelezési dokumentum route-ok | `src/app/api/`, quotation/execution renderelők | route/PDF/CSV tesztek | a kapcsolódó workflow-dokumentumok; HTTP auth/cache/content-disposition ellenőrzendő |
| `DB-SECURITY` | Supabase séma, RLS, RPC, grants, snapshot és concurrency | `supabase/migrations/`, `src/infrastructure/supabase/` | 67 DB teszt/fixture, 13 concurrency/auth script | `current/security-and-data.md` + `maps/SCHEMA_INDEX.md`; alkalmazott migráció az elsődleges bizonyíték |
| `QUALITY-DEV` | Vitest, pgTAP, lint, typecheck, build, lokális auth és concurrency-check | configfájlok, `scripts/`, tesztfájlok | `package.json` parancsok | `current/testing.md`; korabeli PASS csak az adott futást igazolja |
| `PWA-ASSETS` | Manifest, ikonok, statikus OCR assetek és DEMO fixture-ök | `src/app/manifest.ts`, `public/icons/`, `public/ocr/` | manifest teszt, OCR fixture-ök | `current/system.md#assets`; offline/service worker nincs |

## 5. Teljes forrásfedettségi leltár

Ez a tábla nem minden egyes fájlnevet ismétel meg. Nem átfedő prefixekkel lefedi a teljes `src/` fát, a funkcionális tábla pedig megadja a keresztkapcsolatokat. A jövőbeli `SOURCE_INDEX.md` ugyanezt szimbólum- és fájlszinten bontja ki.

| Nem átfedő útvonal | Fájl | Teszt | Elsődleges ID-k |
|---|---:|---:|---|
| `src/app/` | 74 | 8 | `CORE-APP`, `API-DOCUMENTS`, route szerinti workflow-ID |
| `src/components/` | 29 | 9 | `PREF-A11Y`, `UI-SYSTEM`, `CORE-APP` |
| `src/domain/calculations/` | 62 | 28 | `CALC-ENGINE`, `CALC-CONSTRUCTION`, `ROOF-*`, `SHEET-PROFILE` |
| `src/domain/drawings/` | 13 | 6 | `ROOF-GEOMETRY`, `ROOF-TIMBER` |
| `src/domain/execution/` | 2 | 1 | `EXECUTION` |
| `src/domain/field-surveys/` | 26 | 11 | `SURVEY-LEGACY`, `ROOF-GEOMETRY` |
| `src/domain/geometry/` | 2 | 1 | `ROOF-GEOMETRY`, `CALC-CONSTRUCTION` |
| `src/domain/material-preparations/` | 2 | 1 | `MATERIAL-LISTS` |
| `src/domain/material-takeoffs/` | 11 | 5 | `MATERIAL-TAKEOFF` |
| `src/domain/materials/` | 4 | 2 | `MATERIAL-CATALOG`, `MATERIAL-LISTS` |
| `src/domain/math/` | 2 | 1 | `CALC-ENGINE` |
| `src/domain/measurements/` | 4 | 2 | `CALC-ENGINE`, `UI-SYSTEM` |
| `src/domain/pricing/` | 2 | 1 | `MATERIAL-CATALOG`, `QUOTATIONS` |
| `src/domain/projects/` | 2 | 1 | `PROJECTS` |
| `src/domain/quotations/` | 13 | 6 | `QUOTATIONS` |
| `src/drawings/` | 1 | 0 | `ROOF-GEOMETRY`, DEMO rajzasset |
| `src/features/auth/` | 16 | 5 | `AUTH-ORG` |
| `src/features/calculations/` | 12 | 6 | `CALC-PERSIST` |
| `src/features/calculators/` | 57 | 25 | `CALC-CATALOG`, `CALC-CONSTRUCTION`, `DRAW-*`, `ROOF-*` |
| `src/features/dashboard/` | 7 | 2 | `CORE-APP` |
| `src/features/drawings/` | 1 | 0 | `DRAW-PDF`, `DRAW-OCR` |
| `src/features/execution/` | 29 | 11 | `EXECUTION` |
| `src/features/field-surveys/` | 34 | 13 | `SURVEY-LEGACY` |
| `src/features/material-takeoffs/` | 25 | 9 | `MATERIAL-TAKEOFF`, `MATERIAL-LISTS` |
| `src/features/materials/` | 10 | 4 | `MATERIAL-CATALOG` |
| `src/features/preferences/` | 13 | 4 | `PREF-A11Y` |
| `src/features/projects/` | 4 | 1 | `PROJECTS` |
| `src/features/quotations/` | 45 | 15 | `QUOTATIONS`, `API-DOCUMENTS` |
| `src/features/roof-models/` | 63 | 26 | `ROOF-*`, `PROJECTS`, `MATERIAL-TAKEOFF` |
| `src/features/sheet-metal/` | 8 | 2 | `SHEET-PROFILE` |
| `src/infrastructure/drawings/` | 9 | 4 | `DRAW-PDF`, `DRAW-OCR`, `DRAW-INTERPRET` |
| `src/infrastructure/images/` | 4 | 2 | `PHOTO-PIPELINE` |
| `src/infrastructure/supabase/` | 19 | 1 | `DB-SECURITY`, `CALC-PERSIST`, workflow-ID-k; README és generált típus kizárva a 623-ból |
| `src/lib/` | 22 | 11 | `UI-SYSTEM`, `PREF-A11Y`, `QUALITY-DEV` |
| `src/proxy.ts` | 1 | 0 | `AUTH-ORG`, `CORE-APP` |
| `src/assets/brand-icon.png` | 1 | 0 | `PWA-ASSETS`; bináris asset, a 623 forrásból kizárva |
| `supabase/migrations/` | 126 | 0 | `DB-SECURITY` és a név szerinti workflow-ID |
| `supabase/tests/database/` | 67 | 67 | `DB-SECURITY`, `QUALITY-DEV` |
| `supabase/config.toml`, `supabase/seed.sql` | 2 | 0 | `DB-SECURITY`, `QUALITY-DEV` |
| `scripts/` | 14 | 13 ellenőrző script | `QUALITY-DEV`, `DB-SECURITY`; egy local-auth bootstrap |
| Gyökérkonfiguráció | 10 | — | `QUALITY-DEV`, `CORE-APP`, `PWA-ASSETS` |
| `public/icons/`, `public/ocr/fixtures/` | 13 | 10 fixture | `PWA-ASSETS`, `DRAW-OCR` |

Kizárt, de nyilvántartandó: `.next/`, `.vitest/`, `node_modules/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `package-lock.json`, `src/infrastructure/supabase/database.types.ts`, a négy `src/` bináris ikon, `public/ocr/core/`, `public/ocr/lang/`, `public/ocr/worker.min.js`, OCR vendorlicencek és `docs/evidence/` képek. A generált DB-típus helye szerepeljen a térképben, de ne kézi dokumentációs tulajdonosként.

## 6. Dokumentumleltár és javasolt jövőbeli hely

### 6.1 Jelölések

- **A:** aktuális, normatív vagy operatív tartalom.
- **M:** vegyes; aktuális szabály és történeti napló egy fájlban.
- **R:** referencia; hasznos, de csak kód/migráció mellett bizonyít mai működést.
- **H:** dátumhoz/mérföldkőhöz kötött történeti bizonyíték.
- **L:** jogi/third-party dokumentum; helyben tartandó.

A „tulajdonos” oszlop nem azt jelenti, hogy a fájl állítása bizonyított. Azt jelenti, hová kerüljön a megőrzendő aktuális tudás. A történeti fájlok csak az aktuális állítások kivonása és linkellenőrzés után mozgathatók.

### 6.2 Gyökér-, agent- és navigációs dokumentumok

| Fájl | Cél/terület | Besorolás, eltérés/duplikáció | Javaslat és hiteles tulajdonos |
|---|---|---|---|
| `AGENTS.md` | Codex projektutasítás | A; jó biztonsági alap, a dokumentumválasztás még nem funkcióindex-alapú | helyben; rövid `LIBRARY.md` olvasási protokoll |
| `CLAUDE.md` | Claude-kiegészítés | A; részben ismétli az `AGENTS.md` olvasási szabályait | helyben; `@AGENTS.md` marad, csak Claude-specifikus eltérések |
| `README.md` | repo belépés | A; rövid, nem problémás | helyben; link `docs/LIBRARY.md`-re |
| `PROJECT_BLUEPRINT.md` | jóváhagyott termékcél/fázisterv | R; terv, nem implementációs bizonyíték | helyben vagy `docs/product/`; tulajdonos: termékcél |
| `F9_28_HANDOFF.md` | F9.28 implementációs átadás | H; gyökérben zajt okoz | `docs/archive/milestones/F9/` |
| `funkciok.md` | funkcióállapot + régi TS-export | M; erősen duplikál és 454 fájlos snapshotja elavult | aktuális rész a `LIBRARY.md`/current docsba; teljes régi export archívumba |
| `docs/README.md` | dokumentációs navigáció | M; aktuális és történeti belépések keverednek | marad rövid index; első link `LIBRARY.md`, külön Current/Archive |
| `docs/AI_TOOLING.md` | ellenőrzött AI eszközleltár | A; nem automatikus olvasmány | helyben; `QUALITY-DEV` tulajdonos |
| `docs/CLAUDE_HANDOFF.md` | rövid fejlesztői átadás | A/M; csak friss kockázat és következő lépés legyen | helyben, maximált mérettel; ne legyen funkciókatalógus |
| `docs/PROJECT_MAP.md` | route/réteg/adatfolyam | M; 2026-10-17-i és M12 előtti részek | bontás `current/system.md` + `maps/SOURCE_INDEX.md` |
| `docs/PROGRESS.md` | friss állapot + mérföldkőnapló | M; 30 307 szó, legnagyobb napi zajforrások egyike | csak current status + utolsó 1–3 lezáratlan/lezárt tétel; többi archívum |
| `docs/archive/PROGRESS_HISTORY.md` | korábbi teljes bejegyzések | H; jó irány, de egyetlen 63 659 szavas fájl | megőrizni; később év/mérföldkő szerinti bontás indexszel |
| `src/infrastructure/supabase/README.md` | Supabase adapter rövid helyi leírása | A/R; kevés, célzott kontextus | helyben; link a `DB-SECURITY` entryre |

### 6.3 Aktuális vagy vegyes műszaki dokumentumok

| Fájl | Cél/terület | Besorolás, eltérés/duplikáció | Javaslat és hiteles tulajdonos |
|---|---|---|---|
| `docs/CALCULATION_ENGINE.md` | engine és domainalap | M/R; normatív rész + F4 történet | aktuális szerződések `current/calculations.md`, F4 narratíva archív |
| `docs/ROOF_CALCULATION_SPECIFICATION.md` | tetőszámítási szerződések | A/R; legjobb jelenlegi tulajdonos, de kóddal ellenőrzendő | `current/roof-calculations.md` alapja |
| `docs/CALCULATION_VERIFICATION_MATRIX.md` | számítási bizonyítéki mátrix | R; futáshoz kötött | `current/testing.md` csak követelmény; eredmény archív QA |
| `docs/CALCULATOR_COVERAGE_MATRIX.md` | kalkulátor-lefedettség | M/R; katalógust és történeti bizonyítékot ismétel | aktuális coverage a `CALC-CATALOG` entry/map része; futás archív |
| `docs/CALCULATOR_MATH_VERIFICATION.md` | független képlet/fixture ellenőrzés | R/H; egyedi bizonyíték, nem folyamatos spec | `archive/qa/calculations/`; current doc hivatkozik rá |
| `docs/CURRENT_SYSTEM_AND_WORKFLOW_AUDIT.md` | teljes rendszer/workflow felmérés | H/M; pillanatkép és aktuális állítás keverten | aktuális kockázatok kivonása, majd `archive/audits/` |
| `docs/DATABASE.md` | séma, RLS, RPC, migráció | M; 901 sor, tulajdonosi szerepe túl széles | `current/security-and-data.md` + `maps/SCHEMA_INDEX.md`; timeline archív |
| `docs/STANDALONE_WORKFLOWS.md` | standalone ownership/revízió/workflow | M/R; több funkciót egyben kezel | szabályok szétosztva calculations/materials/quotations current docsba |
| `docs/QUOTATION_FINALIZATION_DESIGN.md` | ajánlatvéglegesítési terv | R/H; terv nem azonos megvalósítással | nyitott döntések `current/quotations.md`, eredeti terv `archive/designs/` |
| `docs/FLASHING_CALCULATOR_DESIGN.md` | korábbi szegély-kalkulátor terv | H; a kapcsolódó UI/domain később kivezetett | `archive/designs/` |
| `docs/SHEET_METAL_PROFILE_DESIGN.md` | lemezprofil domain-terv | M/H; megvalósítási előzmény, régi linkek | aktuális invariáns `current/sheet-metal.md`, terv archív |
| `docs/TEST_MATRIX.md` | futtatási bizonyítékok | M; 48 418 szó, a legnagyobb kontextusforrás | tesztstratégia `current/testing.md`; eredmények mérföldkő-archívba |
| `docs/PILOT_READINESS.md` | pilot/release kapuk | A/M; operatív, de történeti eredményeket is tartalmaz | `current/release-gates.md`; csak nyitott kapuk és legutóbb igazolt állapot |
| `docs/PILOT_TEST_PLAN.md` | javasolt pilot forgatókönyv | R/A; nem futtatott pilot | `current/testing.md#pilot` vagy `quality/plans/` |
| `docs/PILOT_FEEDBACK_TEMPLATE.md` | terepi visszajelzési sablon | A/R; nem rendszerigazság | `templates/` vagy marad helyben |
| `docs/PHOTO_UPLOAD_SECURITY_F9.69.md` | fotófeltöltési védelem | M/H; app-korlát aktuális, futtatás történeti | aktuális szabály `security-and-data.md#photos`, riport archív |
| `docs/HISTORICAL_SNAPSHOT_COMPATIBILITY_F9.70.1.md` | régi snapshot-kompatibilitás | M/H; kockázat addig aktuális, amíg nincs lezárva | nyitott kockázat current persistence docba, riport archív |
| `docs/EXECUTION_DATA_REFACTOR_F9.70.md` | execution read-model/refaktor | M/H | invariáns `current/execution.md`, riport archív |
| `docs/WORKSPACE_RELIABILITY_F9.73.md` | munkanapló-adatbetöltési megbízhatóság | M/H | aktív kockázat `current/execution.md`, riport archív |
| `docs/WORKSPACE_FAULT_ISOLATION_F9.73.1.md` | kapcsolt rekord hibájának izolálása | M/H | contract current execution docba, riport archív |
| `docs/VERCEL_DEMO_PREFLIGHT.md` | DEMO deployment preflight | A/R; környezetfüggő | `current/release-gates.md#demo`; nincs automatikus deploy-igazság |
| `docs/QA09_MIGRATION_INTEGRATION_READINESS.md` | migrációintegráció/release gate | M/H | nyitott kapu current release docba, futás `archive/qa/` |
| `docs/QA10_STAGING_RELEASE_VALIDATION.md` | staging multi-user/Auth/RLS gate | M/A | amíg nincs hosted bizonyíték, nyitott current release gate; riport archív másolata nem kell |

### 6.4 M12 tervrajz-feldolgozási dokumentumok

| Fájl | Cél/terület | Besorolás, eltérés/duplikáció | Javaslat és hiteles tulajdonos |
|---|---|---|---|
| `docs/AI_DRAWING_EXTRACTION_RULES.md` | forrás-, OCR-, kategória- és átviteli szabály | M/A; kritikus aktuális korlátok, de a végén M12.1-kori Tesseract-állítás maradt | `current/drawings.md` normatív alapja; dátumozott technológiadöntés archív |
| `docs/AI_DRAWING_IMPLEMENTATION_PLAN.md` | M12.0–M12.7 megvalósítási terv/riport | M/H; terv és eredmény keverten | aktuális határok `current/drawings.md`, lépcsők `archive/milestones/M12/` |
| `docs/AI_DRAWING_TEST_MATRIX.md` | M12 tesztkövetelmény és eredmény | M; aktív kapuk és futtatási napló keverten | kapuk `current/testing.md#drawings`, eredmény `archive/qa/M12/` |
| `docs/M12_CLAUDE_AUDIT.md` | független M12 audit | H; findingek egy része P1/M12.10-ben javult | `archive/audits/M12/`, nyitott finding kivonással |
| `docs/M12_CLAUDE_REVIEW_HANDOFF.md` | M12 felülvizsgálati brief | H; nagy, időponthoz kötött átadás | `archive/handoffs/M12/` |
| `docs/TETOPRO_OPEN_SOURCE_TECH_RESEARCH.md` | PDF/OCR technológiai kutatás | H/R; kutatási háttér, nem aktuális dependency-igazság | `archive/research/drawings/` |

Az M12 aktuális kivonatának kötelezően megőrzendő elemei: helyi/memóriabeli feldolgozás; fájl-, oldal-, token- és pixelkorlátok; forrásprovenance; emberi jóváhagyás; OCR numeric automatikus átvitelének tiltása; M12.2 **BLOCKED**; kijelölés nem mérés; munkafájl nem szakmai validáció; forráshash-védelem; fizikai mobil és valós tervminták hiánya.

### 6.5 M10 workflow- és adatátadási dokumentumok

Az alábbi fájlok egyetlen M10 döntési/implementációs/QA láncot alkotnak. Mindegyik **H** vagy **M/H**; jelenlegi igazságként csak a kód, az alkalmazott migráció és az aktuális current-doc használható. Célhelyük `docs/archive/milestones/M10/`, altípus szerint `design/`, `implementation/`, `qa/`, `remediation/`, `signoff/` indexszel.

| Fájl | Egyedi cél | Aktuálisan kivonandó tartalom / duplikáció |
|---|---|---|
| `M10_UNIFIED_WORKFLOW_DESIGN.md` | egységes workflow alapterv | támogatott források és invariánsok; a tervállapot ne maradjon implicit |
| `M10_PHASE0_QA_HANDOFF.md` | 0. fázis QA-átadás | tesztcélok, nem mai PASS |
| `M10_PHASE0_INDEPENDENT_QA.md` | 0. fázis független QA | findingek és bizonyíték |
| `M10_PHASE0_P1_REMEDIATION.md` | P1 javítás | trust boundary javítási előzmény |
| `M10_PHASE0_P1_INDEPENDENT_REVIEW.md` | P1 független review | lezárási bizonyíték |
| `M10_PHASE0_UX_AND_REGRESSION_FINALIZATION.md` | UX/regresszió lezárás | jelenlegi UX-t ne innen olvassuk |
| `M10_PHASE1_GEOMETRY_TRANSFER_DESIGN.md` | geometria-átadási terv | forrás/revízió invariánsok |
| `M10_PHASE1_GABLE_GEOMETRY_IMPLEMENTATION.md` | implementációs riport | korabeli hatókör |
| `M10_PHASE1_EAVE_OVERHANG_MAPPING.md` | ereszkiülés mezőleképezés | mezőszerződés current roof docba |
| `M10_PHASE1_INDEPENDENT_QA.md` | első QA | findingtörténet |
| `M10_PHASE1_P1_REMEDIATION.md` | P1/P2 javítás | javítási előzmény |
| `M10_PHASE1_P1_FINAL_REMEDIATION.md` | draftbiztonság/drift végső javítás | snapshot/drift invariáns current persistence docba |
| `M10_PHASE1_VALIDATION_AND_DRIFT_REMEDIATION.md` | célvalidáció/drift | duplikálja a későbbi QA-láncot |
| `M10_PHASE1_DRIFT_INDEPENDENT_QA.md` | drift független QA | korabeli futás |
| `M10_PHASE1_DRIFT_FIX_AND_CLOSURE.md` | drift lezárás | domain-aware összehasonlítás invariáns |
| `M10_PHASE1_FINAL_INDEPENDENT_QA.md` | végső QA | korabeli bizonyíték |
| `M10_PHASE1_FINAL_ACCEPTANCE.md` | elfogadási riport | acceptance history |
| `M10_PHASE1_FINAL_NUMERICAL_QA.md` | numerikus QA | fixture/oracle hivatkozás current testing docba |
| `M10_PHASE1_FINAL_NUMERIC_REMEDIATION.md` | numerikus remediation | javítási history |
| `M10_PHASE1_FINAL_SIGNOFF.md` | M10.1 signoff | történeti lezárás, nem aktuális belépési pont |
| `M10_PHASE2_CALCULATOR_CONNECTIONS.md` | további kalkulátorkapcsolatok | támogatott kapcsolatlista current mapbe |
| `M10_PHASE2_INDEPENDENT_QA.md` | M10.2 független QA | finding history |
| `M10_PHASE2_P1_REMEDIATION_AND_E2E.md` | RPC javítás/E2E | trust boundary és négy kapcsolat bizonyítéka |
| `M10_PHASE3_INDEPENDENT_QA.md` | anyag/ajánlat QA | finding history |
| `M10_PHASE3_QA_REMEDIATION.md` | forrásátfedés javítás | kombinált source invariáns current quotations docba |

### 6.6 M9 tető-, Karmi- és rajzi dokumentumok

Mindegyik dátumozott mérföldkő- vagy QA-bizonyíték. A jelenlegi Karmi terminológiát, geometriai határokat és snapshot-kompatibilitást a `ROOF-TIMBER` current fejezetbe kell kivonni; a fájlok célhelye `archive/milestones/M9/` vagy `archive/qa/M9/`.

| Fájl | Besorolás és cél | Duplikáció / megőrzendő egyediség |
|---|---|---|
| `CLAUDE_ROOF_ENGINEERING_REVIEW.md` | H, független mérnöki audit | szakmai findingek; nem statikai igazolás |
| `M95_RAFTER_VISUAL_UX_REVIEW.md` | H, szarufarajz vizuális audit | egyedi vizuális bizonyíték |
| `M97_ROOF_DRAWING_E2E_VISUAL_AUDIT.md` | H, E2E vizuális audit | `docs/evidence/m97/` képeihez tartozó index |
| `M914_ROOF_MATERIAL_TIMBER_PARITY_REVIEW.md` | H/M, eredményparitás | aktuális korlát current roof docba |
| `M915_KARMI_WORKFLOW_UX.md` | H/M, Karmi workflow | terminológia és feladatfolyam current roof docba |
| `M9151_KARMI_WORKFLOW_FINALIZATION.md` | H, lezárás | M9.15 lánc ismétlése |
| `M9152_KARMI_PREVIEW_VERIFICATION.md` | H, preview QA | korabeli futtatás |
| `M9153_KARMI_GEOMETRY_AND_UX_FINALIZATION.md` | H, geometria/UX lezárás | korabeli döntés |
| `M916_KARMI_PROFESSIONAL_WORKFLOW_QA.md` | H, szakmai QA | egyedi korlát- és findinglista |
| `M9161_KARMI_PARITY_AND_LEGACY_SNAPSHOT_QA.md` | H/M, parity/legacy QA | legacy snapshot kockázat kivonandó |
| `KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md` | H/M, terminológiai QA | „Karmi” aktuális terminológiai tulajdonos a current doc legyen |

### 6.7 F9 auditok, kutatások és implementációs riportok

Az alábbi dokumentumok mérföldkőhöz kötöttek. A legtöbb **H**; ahol ma is nyitott korlát szerepel, az **M/H**, és a korlátot előbb current tulajdonoshoz kell emelni. Javasolt cél: `archive/audits/F9/`, `archive/milestones/F9/`, `archive/research/`.

| Fájl | Cél | Aktuális kivonat / megjegyzés |
|---|---|---|
| `ARCHITECTURE_REUSE_REVIEW.md` | architektúra-újrahasznosítási review | ma is élő réteghatárok current system docba |
| `CALCULATOR_FIRST_PHASE0_AUDIT.md` | kalkulátor-átalakítás előaudit | történeti terv/finding |
| `CALCULATOR_INPUT_OUTPUT_AUDIT.md` | input/output felelősség | mezőtulajdonosi elvek current calculations docba |
| `CODE_CLEANUP_F9.66.md` | dependency/dead-code ellenőrzés | megőrzési döntések history |
| `DAILY_WORKFLOW_UX_AUDIT.md` | napi workflow UX-audit | finding history |
| `DOCUMENTATION_CLEANUP_F9.72.md` | korábbi dokumentációs audit | a jelen audit előzménye; archive/audits/docs |
| `DOCUMENTATION_CONTEXT_REVIEW_F9.72.1.md` | agent-kontextus review | automatikus vs. célzott olvasás bizonyítéka; archive/audits/docs |
| `ENGINEERING_EXCELLENCE_AUDIT_F9.68.md` | architektúra/kódminőség audit | nyitott hosted/adatvédelmi finding current risk registerbe |
| `F9.16_MOBILE_ACCEPTANCE_CHECKLIST.md` | mobil acceptance | követelmény current testing docba, korabeli eredmény archive |
| `F9.19_WORKFLOW_MIGRATION.md` | workflow egyszerűsítési terv | történeti migráció |
| `F9.22_PRODUCT_UX_AND_MATERIAL_MANAGER.md` | termék UX/anyagkezelő | history |
| `F9_29_SIMPLIFICATION_AUDIT.md` | architektúra-racionalizálás | history |
| `F9_30_SIMPLIFICATION_AUDIT.md` | Survey/kalkulátor szétválasztás | határ current legacy/current calc docba |
| `F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md` | legacy writer/RLS függések | security history; aktív függést kóddal ellenőrizni |
| `F9_32_END_TO_END_REPORT.md` | napi workflow E2E | korabeli futtatás |
| `F9_38_CALCULATOR_COMPLETION_REPORT.md` | lépcső/beton/UI lezárás | katalógus mai állapotát kódból venni |
| `FULL_SYSTEM_QA_AUDIT.md` | 2026-10-25 teljes rendszer QA | history; nyitott finding current risk registerbe |
| `HUNGARIAN_PROFESSIONAL_UX_AUDIT.md` | magyar szakmai UX | valid szakmai korlátok current UI/domain docba |
| `OPTIMIZATION_RESEARCH.md` | architektúra/teljesítmény kutatás | `archive/research/`; nem implementációs igazság |
| `OPTIMIZATION_AUDIT_F9.62.md` | optimalizálási audit | finding history |
| `PERFORMANCE_AUDIT_F9.64.md` | backend/DB/render audit | korabeli mérés |
| `PERFORMANCE_VALIDATION_F9.63.3.md` | dev runtime validálás | korabeli futtatás, nem production |
| `PERFORMANCE_VALIDATION_F9.63.4.md` | izolált production validálás | egyedi trace, archive/qa/performance |
| `PRODUCT_READINESS_AUDIT.md` | termékérettségi audit | jogi/szakmai nyitott tétel current release gatebe |
| `PRODUCT_UX_WORKFLOW_AUDIT.md` | UX/workflow audit | history |
| `UI_UX_AUDIT.md` | F9.40 UI audit | history/backlog; lezáratlan tétel current UI riskbe |
| `URL_ARCHITECTURE_AUDIT_F9.71.md` | URL/production readiness audit | jelenlegi route-állítás kóddal ellenőrizendő |
| `ZHITOV_PARITY_GAP_REPORT.md` | referencia-paritás gap | nyitott gap current calculations riskbe |
| `ZHITOV_PARITY_REDESIGN.md` | kalkulátor redesign spec | implementált/nyitott szétválasztandó |

### 6.8 QA dokumentumok

| Fájl | Besorolás és cél | Javasolt hely / current kivonat |
|---|---|---|
| `QA01_EXECUTION_DATA_COMPLETENESS.md` | H/M, munkanapló/PDF teljesség | `archive/qa/QA01`; nyitott hiány `current/execution.md` |
| `QA02_MATERIAL_CATALOG_COMPLETENESS.md` | H/M, katalógus teljesség | archive; aktuális követelmény `current/materials.md` |
| `QA03_CALCULATOR_DRAFT_PRESERVATION.md` | H/M, draftmegőrzés | archive; invariáns current calculations/UI docba |
| `QA03_1_COMPATIBILITY_NAVIGATION.md` | H/M, történeti revízió/navigáció | archive; kompatibilitási szabály persistence docba |
| `QA04_CALCULATION_COMPLETENESS.md` | H/M, menthetőség/downstream | archive; mentési gate current calculations docba |
| `QA05_PGTAP_TEST_ISOLATION.md` | H/M, DB tesztizoláció | archive; tesztelv current testing docba |
| `QA06_CALCULATION_REVISION_HISTORY.md` | H/M, revíziótörténet | archive; immutable/pagination contract persistence docba |
| `QA08_FULL_E2E_VERIFICATION.md` | H, teljes E2E riport | `archive/qa/QA08` |
| `QA08_RPC01_TRUST_BOUNDARY.md` | H/M, RPC trust boundary | archive; actor/org/source guard current security docba |
| `QA09_MIGRATION_INTEGRATION_READINESS.md` | M/H, migration readiness | a 6.3 szerint current gate + archive evidence |
| `QA10_STAGING_RELEASE_VALIDATION.md` | M/A, hosted staging gate | a 6.3 szerint current gate; lezárásig ne legyen pusztán history |

### 6.9 Jogi és third-party dokumentumok

| Fájl | Besorolás | Javaslat |
|---|---|---|
| `public/ocr/TESSERACT-LICENSE.md` | L | marad a kiszolgált OCR asset mellett |
| `public/ocr/THIRD_PARTY_NOTICES.md` | L | marad a kiszolgált OCR asset mellett |

## 7. Javasolt dokumentációs struktúra

```text
docs/
├── README.md                         # emberi belépés; Current / Maps / Archive
├── LIBRARY.md                        # kompakt funkciórouter, nem napló
├── PROGRESS.md                       # rövid jelenlegi állapot + utolsó bizonyíték
├── current/
│   ├── system.md                     # route-ok, rétegek, PWA, megvalósult hatókör
│   ├── security-and-data.md          # Auth/org/RLS/RPC/snapshot/concurrency/fotó
│   ├── calculations.md               # engine, units, catalog, menthetőség
│   ├── construction-calculators.md   # lépcső/beton/segéd szerződések
│   ├── roof-calculations.md          # geometria, timber, underlay, covering
│   ├── drawings.md                   # PDF/OCR/interpretáció/szakasz/session
│   ├── materials.md                  # katalógus, takeoff, lista, beszerzés
│   ├── quotations.md                 # ajánlat, pénz, PDF, források
│   ├── execution.md                  # munkanapló és dokumentáció
│   ├── ui.md                         # designrendszer, a11y, téma, méretezés
│   ├── testing.md                    # stabil tesztstratégia és kapuk
│   └── release-gates.md              # pilot/hosted/staging nyitott kapuk
├── maps/
│   ├── SOURCE_INDEX.md               # funkció -> fájl -> szimbólum -> teszt
│   └── SCHEMA_INDEX.md               # tábla/RPC/policy -> migráció -> pgTAP
├── templates/
│   └── PILOT_FEEDBACK.md
├── evidence/                          # változatlan bizonyítéki assetek
└── archive/
    ├── README.md                     # keresési index és metaadat-séma
    ├── milestones/{F9,M9,M10,M12}/
    ├── audits/{architecture,docs,ux,security}/
    ├── qa/{calculations,database,ui,performance}/
    ├── handoffs/
    └── research/
```

Ez célstruktúra, nem egyetlen migrációban létrehozandó kötelezettség. A legkisebb biztonságos első lépés csak a `LIBRARY.md`, a két map és az ellenőrző létrehozása; a meglévő current fájlok eleinte a jelenlegi helyükön maradhatnak.

## 8. A tervezett `LIBRARY.md`

### 8.1 Felépítés

A fájl célmérete **300–500 sor**, nem tartalmaz futtatási naplót vagy teljes fájllistát. Szerkezete:

1. 10 soros olvasási protokoll Codexnek és Claude-nak.
2. Státuszjelölések: proven/current, not run, blocked, historical.
3. Funkciócsoportok: Core, Calculations, Drawings, Materials, Workflows, Platform/Quality.
4. A 31 stabil ID egy-egy bejegyzése.
5. Link a részletes `SOURCE_INDEX.md` és `SCHEMA_INDEX.md` megfelelő anchorjára.
6. Karbantartási szabály: csak érintett entry frissül.

Kötelező entry-mezők:

```md
### ROOF-GEOMETRY — Tetőgeometria
- Működés: ...
- Aktuális dokumentáció: `current/roof-calculations.md#geometry`
- Forrás- és szimbólumtérkép: `maps/SOURCE_INDEX.md#roof-geometry`
- Tesztek: `...`
- Kritikus szerződések: ...
- Adat/API/RPC: ... vagy `nincs`
- Történet: `archive/README.md#roof-geometry`
- Figyelmeztetés: ...
```

### 8.2 Reprezentatív bejegyzések

#### `ROOF-TAKEOFF` — Tetőanyag-kimutatás

- Működés: a kiválasztott tetőforma geometriájából szarufa-, léc-, alátét- és fedési eredményt ad a megadott, ellenőrzött paraméterekkel.
- Aktuális dokumentáció: `current/roof-calculations.md#takeoff`.
- Elsődleges forrás: `src/domain/calculations/roof-material-takeoff.ts`, `roof-material-spec.ts`, `src/features/calculators/roof-calculator-definitions.ts`.
- Tesztek: a névazonos domain tesztek, calculation persistence tesztek, csak érintett workflow esetén DB tesztek.
- Szerződés: mértékegység, termékspecifikáció, provenance, menthetőség.
- Figyelmeztetés: gyártói kiosztási adat nélkül nincs kitalált vásárolható darabszám; geometriai mennyiség nem statikai vagy gyártási terv.

#### `DRAW-OCR` — Helyi OCR

- Működés: explicit felhasználói akcióra, kliensoldalon OCR-ez képet vagy szövegréteg nélküli PDF-oldalt; a forrás nem kerül automatikusan szerverre.
- Aktuális dokumentáció: `current/drawings.md#ocr`.
- Elsődleges forrás: `src/infrastructure/drawings/ocr.ts`, `public/ocr/`.
- Tesztek: OCR input/limit/forrásszerződés és M12 tesztkapuk.
- Kritikus függőség: `tesseract.js@7.0.0`, helyi worker/core/language assetek és licencek.
- Figyelmeztetés: M12.2 valós tervrajz-pontosság **BLOCKED**; OCR-ből nincs automatikus numerikus mezőkitöltés.

#### `CALC-PERSIST` — Kalkulációmentés és revízió

- Működés: támogatott kalkulátorok teljes, érvényes inputját szerveren újraszámolva immutable revízióként menti.
- Aktuális dokumentáció: `current/persistence.md#calculations` vagy a kisebb struktúrában `current/calculations.md#persistence`.
- Elsődleges forrás: `src/features/calculations/`, Supabase writer adapterek, calculation RPC migrációk.
- Tesztek: unit/local integration, releváns pgTAP és concurrency script.
- Kritikus szerződés: actor + organization + source revision, idempotencia, optimistic concurrency, immutable source snapshot.
- Figyelmeztetés: a kliens inputja nem jogosultsági bizonyíték; célzott unit teszt nem helyettesíti a DB trust-boundary bizonyítékot.

#### `QUOTATIONS` — Árajánlatok

- Működés: projekt- és standalone ajánlatpiszkozat, revízió, forrássnapshot, pénzügyi szerződés és PDF.
- Aktuális dokumentáció: `current/quotations.md`.
- Elsődleges forrás: `src/domain/quotations/`, `src/features/quotations/`, a két PDF API route.
- Tesztek: quotation feature/domain/API tesztek, quotation migrations és pgTAP.
- Figyelmeztetés: DRAFT/finalized/issued állapotok nem moshatók össze; VAT, hivatalos dokumentumszám és jogi kibocsátás csak bizonyított szerződés alapján állítható.

### 8.3 Részletes index kezelése

A teljes fájl- és fejezetindex ne kerüljön a `LIBRARY.md`-be. A `docs/maps/SOURCE_INDEX.md` funkcióazonosítónként tartalmazza:

- elsődleges belépési fájlok;
- releváns exportált szimbólumok;
- hívó route/feature;
- domain-szerződés;
- tesztfájlok;
- migráció/RPC/policy azonosítók;
- szándékosan kizárt vagy generált fájlok.

A `SCHEMA_INDEX.md` külön marad, mert 126 migrációt és 67 DB-tesztet a kódindexbe ágyazni túl nagy lenne. Sorintervallum csak opcionális gyorsító, soha nem elsődleges cím. Stabil sorrend: fájlútvonal + exportált szimbólum + Markdown-anchor; a sor csak `ellenőrizve: <git-sha>` jelöléssel adható meg.

## 9. Egyetlen hiteles dokumentációs forrás

| Fogalom | Elsődleges dokumentációs tulajdonos | Elsődleges futásidejű bizonyíték |
|---|---|---|
| Kalkulációs mezőszerződés és mértékegység | `current/calculations.md` | domain contract/definition + teszt |
| Tetőgeometriai modell | `current/roof-calculations.md#geometry` | `roof-geometry*.ts` + fixture/oracle tesztek |
| Faanyag/Karmi | `current/roof-calculations.md#timber` | timber/rafter domain + rajztesztek |
| Alátétfólia | `current/roof-calculations.md#underlay` | `roof-underlay.ts` + paramétersnapshot teszt |
| Fedés és termékspecifikáció | `current/roof-calculations.md#covering` | covering/layout domain + migrations |
| Menthetőség/revízió | `current/calculations.md#persistence` | Server Action/RPC + pgTAP/concurrency |
| Rajzforrás/provenance | `current/drawings.md#evidence` | drawing source/session contract + tesztek |
| Tetőszakaszállapot | `current/drawings.md#sections` | section/work-session modul + teszt |
| Anyagkimutatás/lista | `current/materials.md` | material domain/feature + DB contract |
| Árajánlat és pénz | `current/quotations.md` | quotation domain/RPC/PDF tesztek |
| Szervezeti jogosultság | `current/security-and-data.md#authorization` | alkalmazott RLS/RPC migráció + pgTAP |
| Snapshot/provenance immutabilitás | `current/security-and-data.md#immutability` | trigger/RPC migráció + negatív DB teszt |
| Tesztelési elvárás | `current/testing.md` | tényleges parancskimenet az adott mérföldkőben |
| Pilot/release kapu | `current/release-gates.md` | hosted/staging futtatási bizonyíték, ha van |

Minden más dokumentum ezekre hivatkozik, és nem másolja át a szabályt. Ha a current doc és a kód/migráció eltér, a current doc kap `DRIFT` jelölést; találgatással nem javítható.

## 10. Codex és Claude Code integráció

A legkisebb közös megoldás: a teljes szabály az `AGENTS.md`-ben marad, mert a `CLAUDE.md` már `@AGENTS.md` importot használ. Nem kell harmadik, automatikusan betöltött nagy instrukciófájl.

Javasolt rövid blokk az `AGENTS.md` dokumentációs részéhez:

```md
### Célzott projektismeret

Azonosítsd az érintett funkciót. Ha a helye nem egyértelmű, a
`docs/LIBRARY.md` megfelelő funkcióbejegyzéséből nyisd meg csak a szükséges
aktuális fejezetet, forrást és tesztet. Az archívumot csak történeti,
regressziós vagy döntésindoklási kérdéshez olvasd. Dokumentációt csak
akkor frissíts, ha a feladat annak aktuális tartalmát megváltoztatja.
```

A `CLAUDE.md`-ben elég egy Claude-specifikus mondat:

```md
Az `@AGENTS.md` célzott projektismereti szabálya érvényes; a
`docs/LIBRARY.md` nem kötelező olvasmány rutinszerű, egyértelmű kis javításnál.
```

Megmarad: felhasználó kezeli a commitot/pusht; célzott olvasás; arányos teszt; nincs szükségtelen skill/plugin; titok és ügyféladat nem kerül dokumentációba vagy külső szolgáltatáshoz.

## 11. Hivatkozás- és indexintegritás

### 11.1 Minimális helyi ellenőrző

Javasolt egyetlen, függőségmentes Node script: `scripts/check-docs.mjs`, és egy `npm run docs:check` parancs. Ne generáljon dokumentációt; csak hibázzon.

Ellenőrzések:

1. relatív Markdown-célfájl létezik;
2. GitHub-kompatibilis heading anchor létezik, explicit HTML anchorral együtt;
3. a `fájl:line` és `fájl:line:column` kódhivatkozást felismeri, nem jelzi hibának;
4. opcionális sorhivatkozásnál ellenőrzi a sorlétezést, de elsődleges az anchor/szimbólum;
5. duplikált `LIBRARY.md` funkció-ID nincs;
6. minden entry tartalmaz aktuális doc, source map, teszt, contract/data és history mezőt;
7. minden current doc legalább egy entry tulajdonosa;
8. minden kézzel karbantartott releváns forrásfájl legalább egy `SOURCE_INDEX` prefix/szabály alá esik;
9. a kizárt generált/vendor fájlok explicit allowlistben vannak;
10. archív célfájl és archívumindex-bejegyzés együtt létezik;
11. current dokumentumban a `PASS`, `COMPLETE`, dátumozott parancskimenet és mérföldkőcím figyelmeztetést ad, ha nincs `Latest evidence` fejezetben;
12. archive dokumentumban `Current status:` mező figyelmeztetést ad, ha nem current docra hivatkozik.

A 10–12. pont figyelmeztetés legyen, ne blokkoló hiba az első migrációban. A path, anchor, ID és coverage hiba blokkoljon.

### 11.2 Ellenőrzési sorrend áthelyezésnél

1. pre-move manifest: régi útvonal, SHA-256, sor/szó, címsorlista, bejövő linkek;
2. `git mv` kis, tematikus csomagban;
3. linkek és archive index frissítése;
4. `npm run docs:check`;
5. tartalmi diff: nem tűnt el nem üres bekezdés;
6. `git diff --check`;
7. emberi review; csak utána következő csomag.

## 12. Kontextus- és tokenhatékonyság

Nincs valódi session-token telemetria és nincs tokenizer-alapú mérés. Az alábbi számok **szó- és fejezethossz-alapú becslések**, nem mért tokenmegtakarítások. A forráskód olvasása nincs a számokban; csak dokumentáció.

| Példafeladat | Jelenlegi tipikus olvasási út | Új rendszer | Becsült dokumentációs olvasás | Információvesztési kockázat |
|---|---|---|---:|---|
| Tetőanyag-kalkulációs hibajavítás | `README`/`PROGRESS` keresés, `funkciok.md`, `CALCULATION_ENGINE`, roof spec, coverage/math, `TEST_MATRIX` találatok | `ROOF-TAKEOFF` entry → `roof-calculations.md#takeoff` → source/test map | kb. 4 500–10 000 szóról 1 500–3 000-re, **becsült 55–80% csökkenés** | gyártói/spec korlát kimarad; ezt a kötelező warning és contract mező akadályozza |
| Tervrajzos UI/UX módosítás | három M12 core doc (12 811 szó), M12 audit/handoff (12 042), releváns `PROGRESS`, UI auditok | `DRAW-INTERPRET`/`DRAW-SECTIONS` entry → `drawings.md` célfejezet → M12 current test gate | kb. 15 000–30 000 szóról 2 500–5 000-re, **becsült 65–85% csökkenés** | OCR BLOCKED vagy adatvédelmi határ kimarad; ezért a DRAW entry warning kötelező |
| Supabase jogosultsági/mentési fejlesztés | `DATABASE` (8 405), standalone/workflow docok, QA08–10, M10 riportok, `PROGRESS`, releváns migráció keresése | `DB-SECURITY`/`CALC-PERSIST` entry → security current fejezet → schema map → pontos migráció/pgTAP/script | kb. 18 000–30 000 szóról 4 000–7 000-re, **becsült 60–80% csökkenés** | egy korábbi trust-boundary regresszió kimarad; schema mapnek kötelező a negatív DB teszt és history link |

A megtakarítás nem abból származik, hogy kevesebb biztonsági vagy szakmai információt olvasunk, hanem abból, hogy a normatív részeket egyszer, a történeti futtatási naplót pedig csak indokolt esetben olvassuk.

## 13. Adat- és információvesztési kockázatok

| Kockázat | Hatás | Védelem |
|---|---|---|
| Történeti riportban marad az egyetlen aktuális biztonsági szabály | jogosultsági/adatvesztési regresszió | extract checklist + current owner + kód/migráció review |
| Fájláthelyezés eltöri a linket/anchort | AI és ember nem találja a bizonyítékot | link/anchor validator + redirect/stub egy átmeneti kiadásig |
| Az archívum „dump” lesz | történeti információ gyakorlatilag elveszik | archive index dátum, milestone, feature ID, státusz, superseded-by mezőkkel |
| Current doc túl rövidre vágása | kritikus invariant vagy korlát kimarad | mandatory contract/warning/data/test mezők |
| Sorintervallum elavul | rossz kód olvasása | szimbólum/anchor az elsődleges; sor csak opcionális SHA-val |
| Párhuzamos Claude/Codex munka | felülírás és hibás manifest | migráció előtt friss `git status`, kis csomag, csak aktuális munkafából |
| Történeti PASS mai PASS-ként jelenik meg | hamis biztonság | status taxonomy; „historical evidence” jelölés és dátum |
| M12 OCR BLOCKED archiválódik | veszélyes automatikus mezőátvitel | `DRAW-OCR` entry és current warning blokkoló elfogadási feltétel |
| Hosted/staging hiány eltűnik | prod jogosultság/retention nincs bizonyítva | `release-gates.md` nyitott kapu, csak futtatással zárható |
| Jogi notice elmozdul az asset mellől | licencmegfelelési probléma | OCR licencek helyben maradnak |

## 14. Sorrendezett migrációs terv és ellenőrzési kapuk

### 0. kapu — jóváhagyás és munkafa-fagyasztás

- A jelen audit felülvizsgálása és explicit felhasználói jóváhagyás.
- Friss `git status`; párhuzamos, azonos dokumentumot érintő munka felderítése.
- Baseline manifest: 118 dokumentum, méret/hash/címsor/link.
- **Stop feltétel:** nem egyértelmű tulajdonosi vagy párhuzamos módosítás.

### 1. kapu — indexelés mozgás nélkül

- `docs/LIBRARY.md`, `docs/maps/SOURCE_INDEX.md`, `docs/maps/SCHEMA_INDEX.md` létrehozása a jelenlegi útvonalakra mutatva.
- `scripts/check-docs.mjs` + `npm run docs:check`.
- 31 egyedi ID; 855 releváns fájl lefedése vagy explicit kizárása.
- **Kapu:** path/anchor/ID/coverage 0 hiba. Még nincs áthelyezés.

### 2. kapu — agent-routing

- Minimális `AGENTS.md` blokk és a duplikált `CLAUDE.md` mondatok egyszerűsítése.
- `docs/README.md` Current / Maps / Archive navigáció.
- **Kapu:** az agent-utasítások összterjedelme nem nő érdemben; a Library nem automatikus teljes olvasmány.

### 3. kapu — legkockázatosabb current tudás kivonása

- Elsőként `current/security-and-data.md` és `current/drawings.md`.
- Kód/migráció/teszt ellenőrzés minden normatív állításhoz.
- Kötelezően megmarad: org/actor/source, immutability, concurrency, photo privacy, M12 OCR BLOCKED.
- **Kapu:** szakmai/biztonsági checklist 100%; nincs feltételezéssel feloldott drift.

### 4. kapu — számítási és workflow current docs

- `calculations`, `roof-calculations`, `materials`, `quotations`, `execution`, `ui`, `testing`, `release-gates`.
- Minden tulajdonosi szabály egy helyen; a régi fájlok linkelnek rá, nem duplikálják.
- **Kapu:** reprezentatív három feladat dokumentumútja emberileg kipróbálva.

### 5. kapu — `PROGRESS.md` és `TEST_MATRIX.md` szétválasztása

- `PROGRESS.md`: current state, aktív blocker, legutóbbi bizonyíték, következő lépés.
- `TEST_MATRIX.md`: stabil tesztelési mátrix vagy megszűnik a `current/testing.md` javára; a futtatási blokkok archív milestone riportba kerülnek.
- Pre/post hash és paragraph-count; minden eltávolított blokk új archív céllal rendelkezik.
- **Kapu:** információvesztés 0; minden régi anchor vagy átmeneti stubbal, vagy frissített bejövő linkkel kezelve.

### 6. kapu — tematikus archíválás kis csomagokban

Javasolt sorrend:

1. tisztán történeti F9 performance/optimization riportok;
2. M9 Karmi/rajz QA-lánc;
3. M10 fázisonkénti lánc;
4. lezárt QA01–QA08;
5. M12 audit/handoff/research, de nem a current szabályok;
6. régi designok és handoffok.

Egy csomag legfeljebb 10–15 fájl. Minden csomag után docs check, diff check és emberi review.

### 7. kapu — belépési pontok karcsúsítása

- `funkciok.md` aktív szerepét a Library átveszi; a régi export archív.
- `PROJECT_MAP.md` szerepét current system + source map veszi át.
- `CLAUDE_HANDOFF.md` csak rövid, sessionközi átadás.
- **Kapu:** `docs/README.md`-ből minden current és archive cél elérhető.

### 8. kapu — végső dry run

- `npm run docs:check`.
- `git diff --check`.
- A három reprezentatív feladat célzott olvasási próbája.
- Biztonsági checklist: Auth/org/RLS, immutable snapshot, concurrency, photo privacy, OCR BLOCKED, hosted/staging gap.
- Csak dokumentációs migráció esetén alkalmazásteszt/build nem automatikusan szükséges; a link/index script viszont kötelező.

## 15. Elfogadási feltételek

A migráció akkor tekinthető COMPLETE-nak, ha:

- [ ] mind a 31 funkciónak egyedi ID-je és teljes Library-entryje van;
- [ ] a 855 releváns forrásfájl mindegyike legalább egy funkcióhoz vagy infrastruktúra-kategóriához tartozik;
- [ ] minden generált/vendor/kizárt fájl explicit allowlistben van;
- [ ] minden fontos fogalomnak egyetlen current dokumentációs tulajdonosa van;
- [ ] a current dokumentumok nem tartalmaznak hosszú mérföldkő-idővonalat;
- [ ] minden archivált fájl megtalálható dátum, milestone és feature ID szerint;
- [ ] pre/post manifest alapján nincs elveszett nem üres tartalmi blokk;
- [ ] 0 hibás helyi fájlútvonal, 0 hibás anchor, 0 duplikált funkció-ID;
- [ ] a Library és source/schema map minden hivatkozása valós;
- [ ] M12.2 OCR **BLOCKED** és minden kritikus biztonsági/jogosultsági korlát current helyen látható;
- [ ] a bizonyított, nem futtatott, blokkolt és történeti állapot elkülönül;
- [ ] Codex és Claude ugyanazt a célzott olvasási elvet kapja, duplikált hosszú szabály nélkül;
- [ ] a három példafeladat current dokumentumútja teljes és az archívum nélkül elvégezhető;
- [ ] a migráció review-ja külön jóváhagyást kapott.

## 16. Visszaállítási stratégia

1. Minden migrációs kapu külön, kisméretű diff; commitot csak a felhasználó kérésére.
2. Mozgatás kizárólag `git mv`-vel, hogy a történet követhető maradjon.
3. A pre-move manifest tartalmazza az útvonalat, hash-t, sor/szószámot, címsorokat és bejövő linkeket.
4. Az első kiadási ciklusban a sokat hivatkozott régi útvonalakon rövid redirect/stub maradhat; csak linkmigráció után távolítható el.
5. Kapu hibája esetén csak az adott csomag fájlmozgatásai és linkjei fordítandók vissza; nincs teljes munkafa-reset.
6. A visszaállítás után ugyanaz a docs check és manifest-összehasonlítás fut.
7. Tartalmi kivonat nem helyettesíti az eredeti riportot: az archív forrás a migráció után is változatlanul elérhető.

## 17. Legbiztonságosabb első végrehajtási lépés

Külön jóváhagyás után először **fájlmozgatás nélkül** készüljön el a `docs/LIBRARY.md`, a `docs/maps/SOURCE_INDEX.md`, a `docs/maps/SCHEMA_INDEX.md` és a függőségmentes `scripts/check-docs.mjs`. Ez azonnal javítja a célzott olvasást, miközben nem töri el a jelenlegi hivatkozásokat és nem avatkozik a párhuzamos Claude/Codex munkába. Csak az index 0 hibás validációja és emberi review-ja után kezdődjön az aktuális tudás kivonása, majd a tematikus archiválás.

## 18. Auditstátusz

**Elkészült:** dokumentum- és forrásleltár, 31 funkciós térkép, single-source tulajdonosi terv, Library-/archive-/agent-/validator-architektúra, kontextusbecslés, migrációs kapuk, elfogadási és rollback terv.

**Nem futtatott:** alkalmazásteszt, build, adatbázis, böngésző, valódi tokenmérés, Claude Code runtime, hosted/staging ellenőrzés.

**Blokkolt / külön döntést igényel:** a tényleges dokumentációs migráció; a 26 anchor-jelölt végleges minősítése GitHub-kompatibilis sluggerrel; current dokumentumok szövegezése; archív fájlmozgatás.

**Javasolt Conventional Commit a későbbi, jóváhagyott első migrációs mérföldkőhöz:** `docs(DOCS.1): add function-based project knowledge index`
