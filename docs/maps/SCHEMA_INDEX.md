# TetőPro funkció–séma–migráció térkép

Ez az index a [projektismereti könyvtár](../LIBRARY.md) 31 stabil funkcióazonosítóját köti a repóban deklarált Supabase-sémához és adatbázistesztekhez. Ez **szintaktikai repóleltár, nem bizonyíték a hosted adatbázis állapotára**: az alkalmazott migrációkat és az éles/staging jogosultságokat külön környezetben kell igazolni.

<!-- schema-counts: tables=56 functions=132 policies=153 triggers=81 types=17 migrations=129 tests=70 -->

**2026-11-06-i repóleltár:** 56 tábla, 132 `public`/`private` függvény, 153 policy, 81 trigger, 17 típus, 129 migráció és 70 pgTAP/fixture fájl. A névazonos újradefiniálások egyszer számítanak.

## Funkciókapcsolati mátrix

| Funkció | Tartós adathatár | Elsődleges migráció-/tesztcsalád |
| --- | --- | --- |
| <a id="core-app"></a><!-- feature: CORE-APP --> `CORE-APP` | Nincs saját séma; a komponált workflow-k szerződéseit használja. | Foundation és a route-tal érintett feature tesztje. |
| <a id="auth-org"></a><!-- feature: AUTH-ORG --> `AUTH-ORG` | `profiles`, `organizations`, `organization_members`; actor- és membership-függvények. | `foundation`, QA08 trust-boundary; `001`, `060`. |
| <a id="pref-a11y"></a><!-- feature: PREF-A11Y --> `PREF-A11Y` | A jelenlegi preference-adapteren túl nincs önálló migrációcsalád. | Foundation; UI-szerződés alkalmazástesztben. |
| <a id="ui-system"></a><!-- feature: UI-SYSTEM --> `UI-SYSTEM` | Nincs saját séma. | Nem adatbázis-funkció. |
| <a id="calc-catalog"></a><!-- feature: CALC-CATALOG --> `CALC-CATALOG` | A katalógus kódbeli registry; mentés csak támogatott kalkulátor RPC-jén át. | `standalone_*calculation*`; `016`, `056`. |
| <a id="calc-engine"></a><!-- feature: CALC-ENGINE --> `CALC-ENGINE` | Kanonikus input/output snapshot a calculation revízióban. | `versioned_calculation`, `standalone_calculation`; `016–017`. |
| <a id="calc-construction"></a><!-- feature: CALC-CONSTRUCTION --> `CALC-CONSTRUCTION` | Construction calculation/revision/dependency és attestation. | `standalone_construction`, `construction_field_transfer`; `056`, `061–062`, `065`. |
| <a id="roof-geometry"></a><!-- feature: ROOF-GEOMETRY --> `ROOF-GEOMETRY` | `roof_models`, immutable revíziók és secure geometry writer műveletek. | `gable`, `multi_roof`, `roof_geometry`, `secure_*roof_writer`; `020`, `029`, `043–044`. |
| <a id="roof-takeoff"></a><!-- feature: ROOF-TAKEOFF --> `ROOF-TAKEOFF` | Calculation snapshotból létrejövő takeoff-draft és forrássnapshot. | covering/profile/takeoff integration; `021–022`, `045–046`. |
| <a id="roof-timber"></a><!-- feature: ROOF-TIMBER --> `ROOF-TIMBER` | Calculation snapshot; legacy survey timber-paraméterek. | `survey_roof_timber_parameters`; `038_survey_*`. |
| <a id="roof-underlay"></a><!-- feature: ROOF-UNDERLAY --> `ROOF-UNDERLAY` | Calculation snapshot; legacy survey underlay-paraméterek. | `survey_roof_underlay_parameters`; `039`. |
| <a id="roof-covering"></a><!-- feature: ROOF-COVERING --> `ROOF-COVERING` | Covering/layout revíziók, save-operation, material snapshot és draft takeoff. | `gable_*covering`, `sheet_layout`; `020–022`. |
| <a id="sheet-profile"></a><!-- feature: SHEET-PROFILE --> `SHEET-PROFILE` | Profilkalkuláció, material requirement/source snapshot és profile takeoff. | `sheet_metal_profile`, `profile_*`; `013–015`, `045`. |
| <a id="draw-pdf"></a><!-- feature: DRAW-PDF --> `DRAW-PDF` | Nincs DB-írás; kliensmemória. | Nem adatbázis-funkció. |
| <a id="draw-ocr"></a><!-- feature: DRAW-OCR --> `DRAW-OCR` | Nincs DB-írás vagy automatikus feltöltés. | Nem adatbázis-funkció; M12.2 továbbra is `BLOCKED`. |
| <a id="draw-interpret"></a><!-- feature: DRAW-INTERPRET --> `DRAW-INTERPRET` | Csak mentetlen draft; tartós írás később `CALC-PERSIST`. | Construction field-transfer csak ellenőrzött revízióval. |
| <a id="draw-sections"></a><!-- feature: DRAW-SECTIONS --> `DRAW-SECTIONS` | A rajzi szakaszmeta nem teljes DB-modell; számítás külön revízióként menthető. | `standalone_construction`; `056`. |
| <a id="draw-session"></a><!-- feature: DRAW-SESSION --> `DRAW-SESSION` | A munkafájl nem DB-entitás. | Nem adatbázis-funkció. |
| <a id="calc-persist"></a><!-- feature: CALC-PERSIST --> `CALC-PERSIST` | `calculations`, immutable `calculation_revisions`, dependencies és project associations. | `versioned_calculation`, `standalone_*`, trust boundary, pooler timeout; `016–017`, `056–064`. |
| <a id="survey-legacy"></a><!-- feature: SURVEY-LEGACY --> `SURVEY-LEGACY` | Survey/revision/photo/followup/source/link táblák; új survey insert tiltott. | `field_survey*`, `survey_*`, retire; `023–026`, `030–031`, `050–055`, `059`. |
| <a id="material-takeoff"></a><!-- feature: MATERIAL-TAKEOFF --> `MATERIAL-TAKEOFF` | `material_takeoffs/items`, approval/source immutability és kalkulátorsnapshotok. | `material_takeoff*`, covering/profile integrations; `010`, `012`, `015`, `046`. |
| <a id="material-catalog"></a><!-- feature: MATERIAL-CATALOG --> `MATERIAL-CATALOG` | Categories, manufacturers, products, variants, prices/options és labor rates. | `material_catalog/manager/price/labor`; `034`, `041`, `047–049`. |
| <a id="material-lists"></a><!-- feature: MATERIAL-LISTS --> `MATERIAL-LISTS` | Preparation list/revision és survey/takeoff source táblák. | `material_*preparation/list*`; `027–028`, `032`, `036–037`, `046`. |
| <a id="projects"></a><!-- feature: PROJECTS --> `PROJECTS` | `clients`, `projects`, `roof_models/revisions`, organization scope. | `project_management`, roof-model writer guard; foundation és geometry tesztek. |
| <a id="quotations"></a><!-- feature: QUOTATIONS --> `QUOTATIONS` | Quotations/revisions/events, document sequence, source linkek és financial snapshot. | `quotation*`, material/calculation/labor source; `002–004`, `018–019`, `033`, `042`, `058`, `063`. |
| <a id="execution"></a><!-- feature: EXECUTION --> `EXECUTION` | Plans, önálló projekt-meta és státusztörténet, tasks, events, journal, document/calculation/survey linkek. | `execution_*`; `005–006`, `031`, `040`, `057`, `067`. |
| <a id="photo-pipeline"></a><!-- feature: PHOTO-PIPELINE --> `PHOTO-PIPELINE` | Survey/execution photo metaadat, storage policy és kategória. | `*_photos*`, storage compatibility; `007–008`, `024–025`. |
| <a id="api-documents"></a><!-- feature: API-DOCUMENTS --> `API-DOCUMENTS` | PDF/CSV payload forrása immutable revízió és szervezeti scope. | Quotation document foundation és execution document links; `019`, `040`. |
| <a id="db-security"></a><!-- feature: DB-SECURITY --> `DB-SECURITY` | RLS, grants, actor/membership guardok, immutability triggerek, idempotencia és concurrency. | Minden migráció; különösen foundation, QA08, source guards és pooler timeout; `001`, `060–064`. |
| <a id="quality-dev"></a><!-- feature: QUALITY-DEV --> `QUALITY-DEV` | `supabase/config.toml`, seed és pgTAP fixture; hosted állapotot nem állít. | A teljes 67 fájlos DB-teszt/fixture leltár. |
| <a id="pwa-assets"></a><!-- feature: PWA-ASSETS --> `PWA-ASSETS` | Nincs saját adatbázis-séma. | Nem adatbázis-funkció. |

## Objektumcsaládok és kötelező bizonyíték

| Család | Fontos objektumok | Konzisztencia/jogosultság | Elsődleges bizonyíték |
| --- | --- | --- | --- |
| Szervezet és projekt | `profiles`, `organizations`, `organization_members`, `clients`, `projects`, `roof_models`, `roof_model_revisions` | organization/membership RLS; org- és creator-immutability; revízió nem módosítható | foundation és project/roof migrációk, `001`, geometry tesztek |
| Kalkuláció | `calculations`, `calculation_revisions`, `calculation_dependencies`, `calculation_project_associations`, `private.construction_revision_attestations` | actor/org/source guard, szerveroldali újraszámítás, immutable revision, idempotens save-operation | `016–017`, `056–064`, concurrency script |
| Felmérés | `field_surveys`, `field_survey_revisions`, photos/followups/source/link táblák | új létrehozás tiltott; korábbi provenance és kapcsolatok immutable | `023–031`, `043–044`, `050–055`, `059` |
| Anyag | catalog táblák, `material_takeoffs/items`, preparation list/revision/source táblák | organization scope, unit/type guard, approved/source/price immutability | `010–015`, `027–028`, `032–039`, `045–049` |
| Ajánlat | `quotations`, `quotation_revisions`, status events, document sequence, material/calculation source linkek | owner/org RLS, finalization guard, immutable source és pénzügyi snapshot | `002–004`, `018–019`, `033`, `042`, `058`, `063` |
| Kivitelezés és fotó | execution plan/project-status/task/event/journal/photo/document-link táblák | scoped read/write, standalone/legacy határ, optimistic version, append-only status event, source-attestation, photo link/category/storage policy | `005–008`, `031`, `040`, `057`, `067` |

## Író RPC-k és határfeltételek

- Számítás: `save_standalone_construction_calculation`, `save_standalone_roof_geometry_calculation`, `save_roof_geometry_calculation`, `save_gable_roof_calculation_secure`, `save_metal_sheet_layout_secure`.
- Felmérés: `create_field_survey_followup`, `link_field_survey_calculation`, `register_survey_multi_roof_source`, valamint a `save_survey_*_geometry_source_secure` család.
- Anyag: `create_material_manager_product`, `create_profile_takeoff_draft`, `save_workflow_material_list_from_takeoff`.
- Ajánlat/kivitelezés: `save_quotation_draft`, `create_execution_plan_from_survey`, `link_field_survey_execution_plan`.
- Minden kliensből érkező `user_id`, `organization_id`, forrásazonosító és revision csak állítás: a függvény, RLS, trigger és negatív pgTAP együtt igazolja a határt.

<a id="adatbázis-fájllefedettség"></a>
## Migráció- és tesztfájl-lefedettség

Az alábbi minták géppel ellenőrzött, funkcionális csoportok. A `DB-SECURITY` kapcsolat nem helyettesíti a szűkebb feature-tulajdont.

<!-- coverage: QUALITY-DEV | supabase/config.toml -->
<!-- coverage: QUALITY-DEV | supabase/seed.sql -->
<!-- coverage: AUTH-ORG | supabase/migrations/*foundation.sql -->
<!-- coverage: PROJECTS | supabase/migrations/*project_management.sql -->
<!-- coverage: CALC-PERSIST | supabase/migrations/*calculation* -->
<!-- coverage: CALC-PERSIST | supabase/migrations/*standalone_association_immutability.sql -->
<!-- coverage: CALC-PERSIST | supabase/migrations/*construction_field_transfer* -->
<!-- coverage: CALC-PERSIST | supabase/migrations/*writer_transaction_pooler_timeout.sql -->
<!-- coverage: DB-SECURITY | supabase/migrations/*qa08_rpc_trust_boundary.sql -->
<!-- coverage: ROOF-GEOMETRY | supabase/migrations/*gable* -->
<!-- coverage: ROOF-GEOMETRY | supabase/migrations/*multi_roof* -->
<!-- coverage: ROOF-GEOMETRY | supabase/migrations/*roof_geometry* -->
<!-- coverage: ROOF-GEOMETRY | supabase/migrations/*roof_model* -->
<!-- coverage: ROOF-COVERING | supabase/migrations/*covering* -->
<!-- coverage: ROOF-COVERING | supabase/migrations/*sheet_layout* -->
<!-- coverage: SHEET-PROFILE | supabase/migrations/*profile* -->
<!-- coverage: MATERIAL-TAKEOFF | supabase/migrations/*takeoff* -->
<!-- coverage: MATERIAL-CATALOG | supabase/migrations/*material_catalog* -->
<!-- coverage: MATERIAL-CATALOG | supabase/migrations/*material_manager* -->
<!-- coverage: MATERIAL-CATALOG | supabase/migrations/*material_price* -->
<!-- coverage: MATERIAL-CATALOG | supabase/migrations/*material_category_grants.sql -->
<!-- coverage: MATERIAL-CATALOG | supabase/migrations/*catalog_line_manual_price.sql -->
<!-- coverage: MATERIAL-CATALOG | supabase/migrations/*labor_rate* -->
<!-- coverage: MATERIAL-LISTS | supabase/migrations/*material_list* -->
<!-- coverage: MATERIAL-LISTS | supabase/migrations/*material_preparation* -->
<!-- coverage: MATERIAL-LISTS | supabase/migrations/*material_quote* -->
<!-- coverage: QUOTATIONS | supabase/migrations/*quotation* -->
<!-- coverage: QUOTATIONS | supabase/migrations/*standalone_document_rpc_compatibility.sql -->
<!-- coverage: QUOTATIONS | supabase/migrations/*validate_issuer_contact_email.sql -->
<!-- coverage: QUOTATIONS | supabase/migrations/*allow_unpriced_standalone_drafts.sql -->
<!-- coverage: EXECUTION | supabase/migrations/*execution* -->
<!-- coverage: PHOTO-PIPELINE | supabase/migrations/*photo* -->
<!-- coverage: SURVEY-LEGACY | supabase/migrations/*field_survey* -->
<!-- coverage: SURVEY-LEGACY | supabase/migrations/*survey* -->
<!-- coverage: SURVEY-LEGACY | supabase/migrations/*gutter* -->
<!-- coverage: SURVEY-LEGACY | supabase/migrations/*flashing* -->
<!-- coverage: QUALITY-DEV | supabase/tests/database/_demo_workflow_fixture.inc -->
<!-- coverage: AUTH-ORG | supabase/tests/database/001_foundation.sql -->
<!-- coverage: QUOTATIONS | supabase/tests/database/002_*.sql -->
<!-- coverage: QUOTATIONS | supabase/tests/database/003_*.sql -->
<!-- coverage: QUOTATIONS | supabase/tests/database/004_*.sql -->
<!-- coverage: EXECUTION | supabase/tests/database/005_*.sql -->
<!-- coverage: EXECUTION | supabase/tests/database/006_*.sql -->
<!-- coverage: PHOTO-PIPELINE | supabase/tests/database/007_*.sql -->
<!-- coverage: PHOTO-PIPELINE | supabase/tests/database/008_*.sql -->
<!-- coverage: SURVEY-LEGACY | supabase/tests/database/*survey*.sql -->
<!-- coverage: ROOF-GEOMETRY | supabase/tests/database/*roof*.sql -->
<!-- coverage: ROOF-COVERING | supabase/tests/database/*covering*.sql -->
<!-- coverage: SHEET-PROFILE | supabase/tests/database/*profile*.sql -->
<!-- coverage: MATERIAL-TAKEOFF | supabase/tests/database/*takeoff*.sql -->
<!-- coverage: MATERIAL-CATALOG | supabase/tests/database/*material_manager*.sql -->
<!-- coverage: MATERIAL-CATALOG | supabase/tests/database/*price*.sql -->
<!-- coverage: MATERIAL-CATALOG | supabase/tests/database/*labor_rate*.sql -->
<!-- coverage: MATERIAL-LISTS | supabase/tests/database/*material_list*.sql -->
<!-- coverage: MATERIAL-LISTS | supabase/tests/database/*material_preparation*.sql -->
<!-- coverage: MATERIAL-LISTS | supabase/tests/database/*material_quote*.sql -->
<!-- coverage: QUOTATIONS | supabase/tests/database/*quotation*.sql -->
<!-- coverage: EXECUTION | supabase/tests/database/*execution*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/*calculation*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/016_*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/017_*.sql -->
<!-- coverage: DB-SECURITY | supabase/tests/database/060_*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/061_*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/062_*.sql -->
<!-- coverage: QUOTATIONS | supabase/tests/database/063_*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/064_*.sql -->
<!-- coverage: CALC-PERSIST | supabase/tests/database/065_*.sql -->
<!-- coverage: DB-SECURITY | supabase/tests/database/066_*.sql -->

Megjegyzés: a coverage-szintaxis egyszerű `*`/`/**` globot használ. A kimaradó fájlt konkrét, szemantikusan indokolt mintával kell rendezni.

## Biztonsági szerződés

Az RLS megléte önmagában nem elég. Tartós írásnál együtt kell ellenőrizni az actor- és organization-határt, az immutable source/revision triggert, az idempotens műveletet és a konkurencia-viselkedést. A repóban deklarált policy- vagy triggernév nem bizonyítja, hogy a hosted környezeten azonos migrációs állapot fut.

