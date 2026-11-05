# TetőPro projektismereti könyvtár

Ez a rövid index azt mutatja meg, hogy egy fejlesztési feladathoz melyik dokumentumot, forrásmodult, tesztet és adatbázis-szerződést kell célzottan megnyitni. A megvalósult működést a jelenlegi kód, az alkalmazott migrációk és a ténylegesen futtatott ellenőrzés bizonyítja; a terv és a történeti riport nem.

## Olvasási protokoll

1. Azonosítsd az érintett funkcióazonosítót.
2. Nyisd meg az itt hivatkozott aktuális dokumentum releváns fejezetét.
3. A [forrástérképből](maps/SOURCE_INDEX.md) válaszd ki a belépési fájlt, fő szimbólumot és célzott tesztet.
4. Tartós adatnál ellenőrizd a [sématérképet](maps/SCHEMA_INDEX.md), majd a pontos migrációt és negatív DB-tesztet.
5. Függőséget csak akkor olvass, ha a változtatás érinti.
6. Történeti dokumentumot csak regresszióhoz, döntésindokláshoz vagy korabeli bizonyítékhoz nyiss meg.
7. A `PASS`, `COMPLETE`, `BLOCKED` és `NOT TESTED` csak a megjelölt dátumra és hatókörre érvényes.
8. Ne olvasd be automatikusan a teljes `PROGRESS.md`, `TEST_MATRIX.md` vagy archívumot.

Módszer: **Identify → Locate → Read selectively → Validate → Modify → Test**.

## Core, felület és hozzáférés

<a id="core-app"></a>
<!-- feature: CORE-APP -->
### CORE-APP — Alkalmazáshéj és navigáció

- Cél: App Router oldalak, layout, navigáció, dashboard, loading/error és proxyhatár összeállítása.
- Aktuális dokumentáció: [aktuális bizonyítékok](PROGRESS.md).
- Forrásindex: [CORE-APP](maps/SOURCE_INDEX.md#core-app).
- Sémaindex: [CORE-APP](maps/SCHEMA_INDEX.md#core-app).
- Tesztek: layout-, manifest-, route-, dashboard- és navigációtesztek.
- Szerződés és kockázat: a route létezése nem bizonyít teljes workflow-t; offline/service worker nincs.
- Történet: [F9.71 URL-audit](URL_ARCHITECTURE_AUDIT_F9.71.md).

<a id="auth-org"></a>
<!-- feature: AUTH-ORG -->
### AUTH-ORG — Hitelesítés és szervezeti hozzáférés

- Cél: bejelentkezés, recovery, munkamenet, tagság, szervezetválasztás és actor-ellenőrzés.
- Aktuális dokumentáció: [adatbázis és RLS](DATABASE.md).
- Forrásindex: [AUTH-ORG](maps/SOURCE_INDEX.md#auth-org).
- Sémaindex: [AUTH-ORG](maps/SCHEMA_INDEX.md#auth-org).
- Tesztek: auth/recovery tesztek, foundation pgTAP, RPC trust-boundary negatív tesztek.
- Szerződés és kockázat: kliensből kapott felhasználó- vagy szervezetazonosító nem jogosultság; actor-, membership- és RLS-védelem kell.
- Történet: [QA08 RPC trust boundary](QA08_RPC01_TRUST_BOUNDARY.md), [QA10 staging gate](QA10_STAGING_RELEASE_VALIDATION.md).

<a id="pref-a11y"></a>
<!-- feature: PREF-A11Y -->
### PREF-A11Y — Téma, méretezés és akadálymentesség

- Cél: témaváltás, független felületméretezés, mobilfókusz és hozzáférhető vezérlés.
- Aktuális dokumentáció: [projektcélok és akadálymentesség](../PROJECT_BLUEPRINT.md).
- Forrásindex: [PREF-A11Y](maps/SOURCE_INDEX.md#pref-a11y).
- Sémaindex: [PREF-A11Y](maps/SCHEMA_INDEX.md#pref-a11y).
- Tesztek: preferences-, theme-, scaling-bubble-, focus- és viewport-segédtesztek.
- Szerződés és kockázat: fizikai touch, screen reader és forced-colors csak tényleges futtatással tekinthető igazoltnak.
- Történet: [mobil acceptance](F9.16_MOBILE_ACCEPTANCE_CHECKLIST.md), [UI/UX audit](UI_UX_AUDIT.md).

<a id="ui-system"></a>
<!-- feature: UI-SYSTEM -->
### UI-SYSTEM — Közös felületi rendszer

- Cél: design tokenek, Liquid Glass felületek, feedback, hosszmezők, közös fejlécek és vezérlők.
- Aktuális dokumentáció: [aktuális UI-bizonyítékok](PROGRESS.md).
- Forrásindex: [UI-SYSTEM](maps/SOURCE_INDEX.md#ui-system).
- Sémaindex: [UI-SYSTEM](maps/SCHEMA_INDEX.md#ui-system).
- Tesztek: közös komponens-, `LengthField`-, loading/error- és interakciótesztek.
- Szerződés és kockázat: a megjelenített mértékegység nem változtathatja meg a domain kanonikus mm-értékét.
- Történet: [magyar szakmai UX audit](HUNGARIAN_PROFESSIONAL_UX_AUDIT.md).

## Kalkulációk és tetőszakma

<a id="calc-catalog"></a>
<!-- feature: CALC-CATALOG -->
### CALC-CATALOG — Kalkulátorkatalógus

- Cél: a production registry, a tető-/lépcső-/beton-/segédkategóriák és a felületi definíciók navigációja.
- Aktuális dokumentáció: [számítási motor](CALCULATION_ENGINE.md), [kalkulátor-lefedettség](CALCULATOR_COVERAGE_MATRIX.md).
- Forrásindex: [CALC-CATALOG](maps/SOURCE_INDEX.md#calc-catalog).
- Sémaindex: [CALC-CATALOG](maps/SCHEMA_INDEX.md#calc-catalog).
- Tesztek: catalog-, registry-, navigation- és lazy-loading tesztek.
- Szerződés és kockázat: a jelenlegi katalógus és registry az irányadó, nem a blueprint vagy egy régi riport.
- Történet: [F9.38 completion report](archive/milestones/F9_38_CALCULATOR_COMPLETION_REPORT.md).

<a id="calc-engine"></a>
<!-- feature: CALC-ENGINE -->
### CALC-ENGINE — Domain számítási motor

- Cél: input/output szerződések, hibák, mértékegységek, registry, végrehajtás és snapshotok.
- Aktuális dokumentáció: [számítási motor](CALCULATION_ENGINE.md), [ellenőrzési mátrix](CALCULATION_VERIFICATION_MATRIX.md).
- Forrásindex: [CALC-ENGINE](maps/SOURCE_INDEX.md#calc-engine).
- Sémaindex: [CALC-ENGINE](maps/SCHEMA_INDEX.md#calc-engine).
- Tesztek: engine-, contract-, measurement-, math- és snapshottesztek.
- Szerződés és kockázat: a domain tiszta TypeScript; UI vagy route nem birtokolhat szakmai képletet.
- Történet: [matematikai ellenőrzés](CALCULATOR_MATH_VERIFICATION.md).

<a id="calc-construction"></a>
<!-- feature: CALC-CONSTRUCTION -->
### CALC-CONSTRUCTION — Építési kalkulátorok

- Cél: lépcső-, beton-, alapozási, vasalási és geometriai segédkalkulátorok.
- Aktuális dokumentáció: [kalkulátor-lefedettség](CALCULATOR_COVERAGE_MATRIX.md), [matematikai ellenőrzés](CALCULATOR_MATH_VERIFICATION.md).
- Forrásindex: [CALC-CONSTRUCTION](maps/SOURCE_INDEX.md#calc-construction).
- Sémaindex: [CALC-CONSTRUCTION](maps/SCHEMA_INDEX.md#calc-construction).
- Tesztek: construction domain-, computation-, visual- és catalogtesztek.
- Szerződés és kockázat: a geometriai vagy mennyiségi eredmény nem statikai, normatív vagy gyártási megfelelőség.
- Történet: [F9.38 report](archive/milestones/F9_38_CALCULATOR_COMPLETION_REPORT.md).

<a id="roof-geometry"></a>
<!-- feature: ROOF-GEOMETRY -->
### ROOF-GEOMETRY — Tetőgeometria

- Cél: tetősíkok, élek, vetületek, területek és a támogatott tetőformák közös modellje.
- Aktuális dokumentáció: [tetőszámítási specifikáció](ROOF_CALCULATION_SPECIFICATION.md), [számítási motor](CALCULATION_ENGINE.md).
- Forrásindex: [ROOF-GEOMETRY](maps/SOURCE_INDEX.md#roof-geometry).
- Sémaindex: [ROOF-GEOMETRY](maps/SCHEMA_INDEX.md#roof-geometry).
- Tesztek: roof-geometry, engineering-audit, drawing és roof-model fixture-tesztek.
- Szerződés és kockázat: komplex/aszimmetrikus topológia, statika és nem támogatott kiülés nem következtethető.
- Történet: [M10 geometriaátadási terv](M10_PHASE1_GEOMETRY_TRANSFER_DESIGN.md).

<a id="roof-takeoff"></a>
<!-- feature: ROOF-TAKEOFF -->
### ROOF-TAKEOFF — Tetőanyag-kimutatás

- Cél: a tetőgeometriából szarufa-, léc-, alátét- és fedési eredmény összeállítása ellenőrzött paraméterekkel.
- Aktuális dokumentáció: [tetőszámítási specifikáció](ROOF_CALCULATION_SPECIFICATION.md), [lefedettségi mátrix](CALCULATOR_COVERAGE_MATRIX.md).
- Forrásindex: [ROOF-TAKEOFF](maps/SOURCE_INDEX.md#roof-takeoff).
- Sémaindex: [ROOF-TAKEOFF](maps/SCHEMA_INDEX.md#roof-takeoff).
- Tesztek: roof-material-takeoff/spec, calculator definition, save és transfer tesztek.
- Szerződés és kockázat: geometriai mennyiség nem feltétlenül beszerzési mennyiség; gyártói adat nélkül nincs kitalált darabszám.
- Történet: [M9.14 parity review](M914_ROOF_MATERIAL_TIMBER_PARITY_REVIEW.md).

<a id="roof-timber"></a>
<!-- feature: ROOF-TIMBER -->
### ROOF-TIMBER — Szarufa, faanyag és Karmi

- Cél: szarufa-/léckiosztás, vágáslista, Karmi, támasz- és gerinccsatlakozás geometriai rajza.
- Aktuális dokumentáció: [tetőszámítási specifikáció](ROOF_CALCULATION_SPECIFICATION.md), [Karmi QA](KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md).
- Forrásindex: [ROOF-TIMBER](maps/SOURCE_INDEX.md#roof-timber).
- Sémaindex: [ROOF-TIMBER](maps/SCHEMA_INDEX.md#roof-timber).
- Tesztek: timber layout, rafter joints, birdsmouth, rafter drawing és parity tesztek.
- Szerződés és kockázat: a kiosztás geometriai becslés, nem statikai igazolás, gyártási terv vagy szálhossz-optimalizálás.
- Történet: [M9.16 szakmai QA](M916_KARMI_PROFESSIONAL_WORKFLOW_QA.md).

<a id="roof-underlay"></a>
<!-- feature: ROOF-UNDERLAY -->
### ROOF-UNDERLAY — Alátétfólia

- Cél: csíkozás, oldal-/végátfedés, tekercsmennyiség és korlátos 1D vágási minimum.
- Aktuális dokumentáció: [tetőszámítási specifikáció](ROOF_CALCULATION_SPECIFICATION.md), [aktuális bizonyítékok](PROGRESS.md).
- Forrásindex: [ROOF-UNDERLAY](maps/SOURCE_INDEX.md#roof-underlay).
- Sémaindex: [ROOF-UNDERLAY](maps/SCHEMA_INDEX.md#roof-underlay).
- Tesztek: roof-underlay és survey snapshot/pgTAP tesztek.
- Szerződés és kockázat: csak a kódban támogatott formákra; a vágási minimum nem gyártási optimalizálás.
- Történet: [F9.36.1 bizonyíték](TEST_MATRIX.md).

<a id="roof-covering"></a>
<!-- feature: ROOF-COVERING -->
### ROOF-COVERING — Fedőanyag és lemezkiosztás

- Cél: trapéz-/cserepeslemez, általános fedéskiosztás, anyagspecifikáció és takeoff-átadás.
- Aktuális dokumentáció: [tetőszámítási specifikáció](ROOF_CALCULATION_SPECIFICATION.md), [standalone workflow](STANDALONE_WORKFLOWS.md).
- Forrásindex: [ROOF-COVERING](maps/SOURCE_INDEX.md#roof-covering).
- Sémaindex: [ROOF-COVERING](maps/SCHEMA_INDEX.md#roof-covering).
- Tesztek: covering, metal-tile, layout, persistence és local integration tesztek.
- Szerződés és kockázat: terméksnapshot, vágás és átfedés megőrzendő; az eredmény nem automatikus beszerzési optimum.
- Történet: [F9.50 input/output audit](CALCULATOR_INPUT_OUTPUT_AUDIT.md).

<a id="sheet-profile"></a>
<!-- feature: SHEET-PROFILE -->
### SHEET-PROFILE — Lemezprofilok

- Cél: profilgeometria, hajlítás, szerkesztő, mentett revízió és profilból készülő takeoff.
- Aktuális dokumentáció: [lemezprofil domain-terv](SHEET_METAL_PROFILE_DESIGN.md), [adatbázis](DATABASE.md).
- Forrásindex: [SHEET-PROFILE](maps/SOURCE_INDEX.md#sheet-profile).
- Sémaindex: [SHEET-PROFILE](maps/SCHEMA_INDEX.md#sheet-profile).
- Tesztek: sheet-metal-profile, profile editor, drawing, persistence és takeoff tesztek.
- Szerződés és kockázat: profilforrás, anyagsnapshot és confidence nem írható át visszamenőleg.
- Történet: [F9.6.3 design](SHEET_METAL_PROFILE_DESIGN.md).

## Tervrajz-feldolgozás

<a id="draw-pdf"></a>
<!-- feature: DRAW-PDF -->
### DRAW-PDF — PDF.js feldolgozás

- Cél: kliensoldali PDF-szövegkinyerés, preview, koordináta és erőforráskorlát.
- Aktuális dokumentáció: [kinyerési szabályok](AI_DRAWING_EXTRACTION_RULES.md), [M12 terv](AI_DRAWING_IMPLEMENTATION_PLAN.md).
- Forrásindex: [DRAW-PDF](maps/SOURCE_INDEX.md#draw-pdf).
- Sémaindex: [DRAW-PDF](maps/SCHEMA_INDEX.md#draw-pdf).
- Tesztek: pdf-text-extractor, normalizer, preview és M12 tesztmátrix.
- Szerződés és kockázat: a fájl memóriában marad; a byte/pixel limit nem fizikai mobileszköz-memóriagarancia.
- Történet: [M12 független audit](M12_CLAUDE_AUDIT.md).

<a id="draw-ocr"></a>
<!-- feature: DRAW-OCR -->
### DRAW-OCR — Helyi OCR

- Cél: explicit felhasználói akcióra, helyi Tesseract OCR képre vagy szövegréteg nélküli PDF-oldalra.
- Aktuális dokumentáció: [kinyerési szabályok](AI_DRAWING_EXTRACTION_RULES.md), [M12 tesztmátrix](AI_DRAWING_TEST_MATRIX.md).
- Forrásindex: [DRAW-OCR](maps/SOURCE_INDEX.md#draw-ocr).
- Sémaindex: [DRAW-OCR](maps/SCHEMA_INDEX.md#draw-ocr).
- Tesztek: OCR input/limit/source tesztek, helyi DEMO fixture-ök és M12 kapuk.
- Szerződés és kockázat: **M12.2 műszaki pontosság BLOCKED**; OCR confidence nem jelent műszaki pontosságot, numerikus érték nem vihető át automatikusan.
- Történet: [nyílt forrású technológiai kutatás](TETOPRO_OPEN_SOURCE_TECH_RESEARCH.md).

<a id="draw-interpret"></a>
<!-- feature: DRAW-INTERPRET -->
### DRAW-INTERPRET — Felirat- és mezőértelmezés

- Cél: feliratforrás, kalibrált mérés, egységválasztás, értékjavaslat, mezőszerződés és koppintásos gyorsbevitel.
- Aktuális dokumentáció: [kinyerési szabályok](AI_DRAWING_EXTRACTION_RULES.md), [aktuális P1 bizonyíték](PROGRESS.md).
- Forrásindex: [DRAW-INTERPRET](maps/SOURCE_INDEX.md#draw-interpret).
- Sémaindex: [DRAW-INTERPRET](maps/SCHEMA_INDEX.md#draw-interpret).
- Tesztek: drawing-calibration, mixed-unit-plan, value-suggestion, field-transfer, quick-transfer, focus és PlanFieldTransfer tesztek.
- Szerződés és kockázat: nem ellenőrzött tervrajzi méret nem lesz automatikusan tetőméret; egységet vagy kategóriát nem szabad nagyságból kitalálni.
- Történet: [M12 review handoff](M12_CLAUDE_REVIEW_HANDOFF.md).

<a id="draw-sections"></a>
<!-- feature: DRAW-SECTIONS -->
### DRAW-SECTIONS — Tervrajzi tetőszakaszok

- Cél: több szakasz, név, oldal, vizuális kijelölés, fedettség és szakaszonkénti takeoff-hatókör.
- Aktuális dokumentáció: [M12 megvalósítási terv](AI_DRAWING_IMPLEMENTATION_PLAN.md), [M12 tesztmátrix](AI_DRAWING_TEST_MATRIX.md).
- Forrásindex: [DRAW-SECTIONS](maps/SOURCE_INDEX.md#draw-sections).
- Sémaindex: [DRAW-SECTIONS](maps/SCHEMA_INDEX.md#draw-sections).
- Tesztek: drawing-roof-section(s), takeoff, field-transfer és PlanFieldTransfer tesztek.
- Szerződés és kockázat: a rajzi kijelölés és a tényleges geometriai mérés különböző fogalom. A3: a szakasz-hatókört a `supportsRoofSectionScope` szerződés adja (`roof.material-takeoff`, `roof.timber-cutlist` — azonos mezőséma, tetőgeometriából számolt mennyiség); a `roof.rafter-cut` és a `roof.truss-members` rajzpanelt és kalibrációt kap, szakaszkezelést nem. A v3 munkamenet-export és a helyi megőrzés továbbra is csak `roof.material-takeoff`.
- Történet: [M12 független audit](M12_CLAUDE_AUDIT.md).

<a id="draw-session"></a>
<!-- feature: DRAW-SESSION -->
### DRAW-SESSION — Rajzos munkamenet

- Cél: export/import, forráshash, leválasztás/visszakötés, szakasztörlés-visszavonás, munkaterületmemória és az A1 helyi (IndexedDB) megőrzés.
- Aktuális dokumentáció: [M12 megvalósítási terv](AI_DRAWING_IMPLEMENTATION_PLAN.md), [aktuális bizonyíték](PROGRESS.md).
- Forrásindex: [DRAW-SESSION](maps/SOURCE_INDEX.md#draw-session).
- Sémaindex: [DRAW-SESSION](maps/SCHEMA_INDEX.md#draw-session).
- Tesztek: drawing-roof-work-session, sections, construction drafts és workspace-memory tesztek.
- Szerződés és kockázat: a munkafájl nem szakmai validáció, PDF-bájtot nem tartalmaz, és csak azonos típusú/hash-ű forráshoz köthető vissza. A helyi megőrzés ugyanezt a v3 payloadot tárolja felhasználói engedéllyel, 7 nap inaktivitásig, rajzbájt nélkül; az IndexedDB nem biztonsági határ. Terv: [A1 megőrzési terv](DRAWING_SESSION_PERSISTENCE_DESIGN.md).
- Történet: [M12 review handoff](M12_CLAUDE_REVIEW_HANDOFF.md).

## Tartós számítás, felmérés és anyag

<a id="calc-persist"></a>
<!-- feature: CALC-PERSIST -->
### CALC-PERSIST — Kalkulációmentés és revízió

- Cél: támogatott kalkulátorok szerveroldali újraszámítása, immutable revíziója, függősége és projektkapcsolata.
- Aktuális dokumentáció: [adatbázis](DATABASE.md), [standalone workflow](STANDALONE_WORKFLOWS.md).
- Forrásindex: [CALC-PERSIST](maps/SOURCE_INDEX.md#calc-persist).
- Sémaindex: [CALC-PERSIST](maps/SCHEMA_INDEX.md#calc-persist).
- Tesztek: calculation action/data/revision tesztek, local integration, pgTAP 016/017/056–064 és concurrency script.
- Szerződés és kockázat: teljes érvényes input, szerveroldali újraszámítás, actor/org/source guard, idempotencia és immutable snapshot kötelező.
- Történet: [M10 Phase 0 QA](M10_PHASE0_INDEPENDENT_QA.md), [QA06 revíziótörténet](QA06_CALCULATION_REVISION_HISTORY.md).

<a id="survey-legacy"></a>
<!-- feature: SURVEY-LEGACY -->
### SURVEY-LEGACY — Kivezetett felmérési workflow

- Cél: a megőrzött felmérési rekordok, revíziók, fotók, forráskapcsolatok és kompatibilitás kezelése.
- Aktuális dokumentáció: [adatbázis](DATABASE.md).
- Forrásindex: [SURVEY-LEGACY](maps/SOURCE_INDEX.md#survey-legacy).
- Sémaindex: [SURVEY-LEGACY](maps/SCHEMA_INDEX.md#survey-legacy).
- Tesztek: field-survey domain/feature/API tesztek és pgTAP 023–031, 038–055, 059.
- Szerződés és kockázat: új felmérés tiltott; meglévő adat, revision és provenance nem törölhető implicit módon.
- Történet: [workflow migráció](F9.19_WORKFLOW_MIGRATION.md).

<a id="material-takeoff"></a>
<!-- feature: MATERIAL-TAKEOFF -->
### MATERIAL-TAKEOFF — Anyagkimutatás

- Cél: forrásból származó mennyiségek aggregálása, provenance, draft/approval és immutable snapshot.
- Aktuális dokumentáció: [standalone workflow](STANDALONE_WORKFLOWS.md), [adatbázis](DATABASE.md).
- Forrásindex: [MATERIAL-TAKEOFF](maps/SOURCE_INDEX.md#material-takeoff).
- Sémaindex: [MATERIAL-TAKEOFF](maps/SCHEMA_INDEX.md#material-takeoff).
- Tesztek: material-takeoff domain/feature, transfer, approval és pgTAP 009–015, 021–022, 045–046.
- Szerződés és kockázat: approved takeoff és source snapshot immutable; becsült geometriai mennyiség nem automatikus vásárlási tétel.
- Történet: [QA04 kalkulációteljesség](QA04_CALCULATION_COMPLETENESS.md).

<a id="material-catalog"></a>
<!-- feature: MATERIAL-CATALOG -->
### MATERIAL-CATALOG — Anyag- és árkatalógus

- Cél: kategória, gyártó, termék, variáns, árverzió, beszállító és provenance.
- Aktuális dokumentáció: [adatbázis](DATABASE.md), [F9.22 termék-UX](F9.22_PRODUCT_UX_AND_MATERIAL_MANAGER.md).
- Forrásindex: [MATERIAL-CATALOG](maps/SOURCE_INDEX.md#material-catalog).
- Sémaindex: [MATERIAL-CATALOG](maps/SCHEMA_INDEX.md#material-catalog).
- Tesztek: material contract/data/action/editor és pgTAP 034, 041, 047–049.
- Szerződés és kockázat: gyártói, szakmai és áradat nem található ki; ársnapshot visszamenőleg nem írható át.
- Történet: [QA02 katalógusteljesség](QA02_MATERIAL_CATALOG_COMPLETENESS.md).

<a id="material-lists"></a>
<!-- feature: MATERIAL-LISTS -->
### MATERIAL-LISTS — Anyaglisták és beszerzés

- Cél: anyag-előkészítési lista, revízió, forrás, szerkesztés, jóváhagyás és beszerzési CSV.
- Aktuális dokumentáció: [standalone workflow](STANDALONE_WORKFLOWS.md).
- Forrásindex: [MATERIAL-LISTS](maps/SOURCE_INDEX.md#material-lists).
- Sémaindex: [MATERIAL-LISTS](maps/SCHEMA_INDEX.md#material-lists).
- Tesztek: material-list/preparation workflow, editor, CSV route és pgTAP 027–037, 046.
- Szerződés és kockázat: kalkulációs forrás, kézi sor és beszerzési tétel eredete maradjon megkülönböztethető.
- Történet: [M10 Phase 3 QA](M10_PHASE3_INDEPENDENT_QA.md).

## Üzleti munkafolyamatok

<a id="projects"></a>
<!-- feature: PROJECTS -->
### PROJECTS — Projektek, ügyfelek és tetőmodellek

- Cél: projekt- és ügyfélszerződés, projektmunkafelület, tetőmodell és kapcsolódó tevékenységek.
- Aktuális dokumentáció: [projektcélok](../PROJECT_BLUEPRINT.md).
- Forrásindex: [PROJECTS](maps/SOURCE_INDEX.md#projects).
- Sémaindex: [PROJECTS](maps/SCHEMA_INDEX.md#projects).
- Tesztek: project contract/data/workspace, roof-model action/data és foundation pgTAP.
- Szerződés és kockázat: a projekten belüli workflow létezik, de a globális projekt/ügyfél CRUD UI részleges.
- Történet: [F9.29 architektúraaudit](archive/audits/F9_29_SIMPLIFICATION_AUDIT.md).

<a id="quotations"></a>
<!-- feature: QUOTATIONS -->
### QUOTATIONS — Árajánlatok és PDF

- Cél: projekt- és standalone ajánlatpiszkozat, revízió, forrássnapshot, pénzügyi szerződés, státusz és PDF.
- Aktuális dokumentáció: [standalone workflow](STANDALONE_WORKFLOWS.md), [ajánlatvéglegesítési terv](QUOTATION_FINALIZATION_DESIGN.md), [adatbázis](DATABASE.md).
- Forrásindex: [QUOTATIONS](maps/SOURCE_INDEX.md#quotations).
- Sémaindex: [QUOTATIONS](maps/SCHEMA_INDEX.md#quotations).
- Tesztek: quotation domain/feature/PDF/API, pgTAP 002–004, 018–019, 033, 042, 058, 063.
- Szerződés és kockázat: DRAFT/finalized/issued állapot nem mosható össze; pénz, forrásrevisió és issuer snapshot immutable.
- Történet: [M10.3 QA remediation](M10_PHASE3_QA_REMEDIATION.md).

<a id="execution"></a>
<!-- feature: EXECUTION -->
### EXECUTION — Kivitelezési terv és munkanapló

- Cél: kivitelezési terv, feladat, esemény, napi bejegyzés, fotó, kapcsolt forrás és belső dokumentum.
- Aktuális dokumentáció: [adatbázis](DATABASE.md), [workspace reliability](WORKSPACE_RELIABILITY_F9.73.md).
- Forrásindex: [EXECUTION](maps/SOURCE_INDEX.md#execution).
- Sémaindex: [EXECUTION](maps/SCHEMA_INDEX.md#execution).
- Tesztek: execution contract/action/data/workspace/PDF/API és pgTAP 005–008, 031, 040, 057.
- Szerződés és kockázat: belső munkanapló, nem hivatalos e-építési napló; source revision és láthatóság megőrzendő.
- Történet: [QA01 adatteljesíség](QA01_EXECUTION_DATA_COMPLETENESS.md).

<a id="photo-pipeline"></a>
<!-- feature: PHOTO-PIPELINE -->
### PHOTO-PIPELINE — Fotófeltöltés és képfeldolgozás

- Cél: felmérési és kivitelezési fotó normalizálása, méret-/pixelvédelem, privát tárolás és dokumentumoptimalizálás.
- Aktuális dokumentáció: [fotófeltöltési biztonság](PHOTO_UPLOAD_SECURITY_F9.69.md), [pilotkapuk](PILOT_READINESS.md).
- Forrásindex: [PHOTO-PIPELINE](maps/SOURCE_INDEX.md#photo-pipeline).
- Sémaindex: [PHOTO-PIPELINE](maps/SCHEMA_INDEX.md#photo-pipeline).
- Tesztek: image normalizer/optimizer, photo API/writer és pgTAP 007, 008, 024, 025.
- Szerződés és kockázat: hosted ingress, retention/törlés és korábbi feltöltések adatvédelme nincs pusztán repo-kóddal igazolva.
- Történet: [F9.69 security report](PHOTO_UPLOAD_SECURITY_F9.69.md).

<a id="api-documents"></a>
<!-- feature: API-DOCUMENTS -->
### API-DOCUMENTS — PDF-, CSV- és dokumentum-API-k

- Cél: projekt/standalone ajánlati PDF, beszerzési CSV és kivitelezési dokumentáció HTTP-határa.
- Aktuális dokumentáció: [ajánlatterv](QUOTATION_FINALIZATION_DESIGN.md).
- Forrásindex: [API-DOCUMENTS](maps/SOURCE_INDEX.md#api-documents).
- Sémaindex: [API-DOCUMENTS](maps/SCHEMA_INDEX.md#api-documents).
- Tesztek: route-, PDF-, CSV-, document-data- és auth tesztek.
- Szerződés és kockázat: auth, szervezeti láthatóság, content type/disposition és cache-határ route-onként ellenőrzendő.
- Történet: [standalone workflow](STANDALONE_WORKFLOWS.md).

## Platform, adatbázis és minőség

<a id="db-security"></a>
<!-- feature: DB-SECURITY -->
### DB-SECURITY — Supabase séma, RPC, RLS és integritás

- Cél: PostgreSQL-séma, RLS, grants, szerveroldali RPC-k, triggeres immutabilitás, optimistic concurrency és forrásintegritás.
- Aktuális dokumentáció: [adatbázis](DATABASE.md), [QA08 trust boundary](QA08_RPC01_TRUST_BOUNDARY.md), [QA10 staging gate](QA10_STAGING_RELEASE_VALIDATION.md).
- Forrásindex: [DB-SECURITY](maps/SOURCE_INDEX.md#db-security).
- Sémaindex: [DB-SECURITY](maps/SCHEMA_INDEX.md#db-security).
- Tesztek: 67 pgTAP/fixture fájl, local integration és concurrency/auth scriptek.
- Szerződés és kockázat: a repóban deklarált migráció nem bizonyít hosted alkalmazást; actor/org/source guard, RLS és immutable snapshot nem egyszerűsíthető kliensellenőrzéssé.
- Történet: [QA09 migration readiness](QA09_MIGRATION_INTEGRATION_READINESS.md).

<a id="quality-dev"></a>
<!-- feature: QUALITY-DEV -->
### QUALITY-DEV — Teszt- és fejlesztői infrastruktúra

- Cél: Vitest, pgTAP, lint, typecheck, build, helyi Auth bootstrap, concurrency-check és dokumentációellenőrzés.
- Aktuális dokumentáció: [tesztmátrix](TEST_MATRIX.md), [adatbázis parancsok](DATABASE.md), [AI tooling](AI_TOOLING.md).
- Forrásindex: [QUALITY-DEV](maps/SOURCE_INDEX.md#quality-dev).
- Sémaindex: [QUALITY-DEV](maps/SCHEMA_INDEX.md#quality-dev).
- Tesztek: a funkció saját ellenőrzőtesztjei, `scripts/check-docs.test.mjs`, pgTAP és a kockázathoz igazított suite-ok.
- Szerződés és kockázat: korabeli PASS nem mai regresszió; célzott teszt nem teljes suite, repo-kód nem hosted bizonyíték.
- Történet: [dokumentációs architektúra-audit](DOCUMENTATION_ARCHITECTURE_AUDIT.md).

<a id="pwa-assets"></a>
<!-- feature: PWA-ASSETS -->
### PWA-ASSETS — Manifest és statikus assetek

- Cél: PWA manifest, appikonok, brandasset, helyi OCR runtime/licencek és jogtiszta DEMO tesztfixture-ök.
- Aktuális dokumentáció: [OCR third-party notice](../public/ocr/THIRD_PARTY_NOTICES.md).
- Forrásindex: [PWA-ASSETS](maps/SOURCE_INDEX.md#pwa-assets).
- Sémaindex: [PWA-ASSETS](maps/SCHEMA_INDEX.md#pwa-assets).
- Tesztek: manifestteszt, OCR asset-/fixture-diagnosztika és build assetfeloldás, ha releváns.
- Szerződés és kockázat: offline működés nincs; vendor runtime generált/külső, licencei az asset mellett maradnak.
- Történet: [M12 technológiai kutatás](TETOPRO_OPEN_SOURCE_TECH_RESEARCH.md).

## Karbantartás

- Új funkciónál egy új stabil ID és mindhárom index bejegyzése szükséges.
- Fájláthelyezésnél csak az érintett entry és coverage-minta frissül.
- `PLANNED`: a DOCS.0 célstruktúrában szereplő `docs/current/*` dokumentumok még nem léteznek; nem aktív linkek.
- Ellenőrzés: `node scripts/check-docs.mjs`; a `package.json` párhuzamos módosítása miatt DOCS.1-ben nem kapott scriptet.
