# F9.31 — Legacy calculator dependency audit & safe cleanup

**Dátum:** 2026-10-17
**Állapot:** az aktív javítások implementálva; helyi pgTAP/Auth/RLS, kétkapcsolatos integráció, célzott Vitest, typecheck, lint, build és böngészős smoke PASS. Hosted rekordmennyiséget nem ellenőriztem.
**Alap:** `AGENTS.md`, `PROJECT_BLUEPRINT.md`, `funkciok.md`, `DATABASE.md`, az F9.29/F9.30 auditok, a jelenlegi route-ok, Server Actionök, adatbetöltők, migrációk és tesztek.

## Eredmény röviden

- **VERIFIED — dokumentációs inventory:** a `funkciok.md` 444 projekt által kezelt TypeScript-fájlját a fájlrendszerrel vetettem össze; 444 egyedi útvonal, hiányzó, többlet vagy ismétlődő bejegyzés nélkül. A generált adatbázistípusok kizárása változatlan.
- **VERIFIED — a sheet-layout hiba aktív projektfolyamatot érintett.** A projekt nyeregtető oldal `GableRoofCalculatorForm` felületén a `MetalSheetLayoutPanel` menti a kiosztást; a mentett revízióból az aktív `create_sheet_layout_takeoff_draft` tervezetet készíthet. Nem önálló, elavult kalkulátor.
- **VERIFIED — a flashing forráshivatkozású hiba aktív projektfolyamatot is érintett.** A projekt `/projektek/[projectId]/szegelyek` oldala és a tetőmodell kiválasztott élei forrásolt szegélyszakaszokat adnak át a `saveFlashingCalculationAction`-nek. Az action a gable- és többtetős éleket egyaránt a már létező, korlátozott `save_multi_roof_flashing_calculation` írónak küldi; a gable ág eddig tévesen a hibás régi RPC-be esett.
- **VERIFIED — a standalone flashing létrehozása termékdöntés szerint kivezetett.** A régi `/kalkulatorok/szegelyek` útvonal új számítás paraméter nélkül visszairányít a Kalkulátorokhoz. A megadott, meglévő standalone rekord revíziói csak olvashatók. Az önálló kalkulátor mentési UI-ja nem állt vissza.
- **VERIFIED — a 33 önálló építési kalkulátor útvonalát nem módosítottam.** Közös tetőgeometriai domain motorok és a projektbeli sheet-layout/szegély munkafolyamat változatlanul szükségesek.
- **NEM IGAZOLT:** hosted Supabase-t és production adatdarabszámokat nem olvastam. A DB sémából, olvasókból és kompatibilis revision-route-okból történeti függőség látható, de konkrét éles rekordok számáról nincs állítás.

## Függőségi tábla

| Function | Active caller | Historical dependency | Decision | Required fix |
| --- | --- | --- | --- | --- |
| `save_metal_sheet_layout` | Nincs közvetlen klienshívó az F9.31 után; a `save_metal_sheet_layout_secure` wrapper belső validátorként hívja. | A `calculations` / `calculation_revisions` sheet-layout rekordok és revision-readerek megmaradnak. | A függvényt és adatait megtartani; `authenticated` EXECUTE jogát visszavonni. | Restricted writeren keresztüli mentés; régi revision ID-k olvashatók maradnak. |
| `save_metal_sheet_layout_secure` | `saveSheetLayoutAction` → `persistSheetLayout`, csak szerveroldali `tetopro_covering_writer` kapcsolattal. | Minden meglévő mentett revízió ugyanazon layout read modellen érhető el. | Aktív üzleti writer. | Explicit actor/tag/project ellenőrzés, payloadhoz kötött idempotencia, művelet- és tetőkulcsos advisory lock; a meglévő source/catalog/revision/immutable validációt használja. Helyi Auth/RLS és kétkapcsolatos teszt PASS. |
| `create_sheet_layout_takeoff_draft` | `createSheetLayoutTakeoffAction` a projekt tetőmodell lapjáról. | Csak ellenőrzött layout revisionből készít draftot; a régi revision hivatkozása megmarad. | Aktív átadás; megtartani. | Nincs schema-változás. A takeoff nem válik automatikusan jóváhagyott vagy tényleges felhasználási adattá. |
| `save_flashing_material_calculation` | A projekt `saveFlashingCalculationAction` csak forráshivatkozás nélküli kézi mentésnél hívja. A standalone projekt-hozzárendelési RPC-k migrációs implementációi is delegálnak rá. | Korábbi projekt/standalone számítások revisionjei és standalone→project association olvasás/írás kompatibilitása. | Megtartani a támogatott kézi és kompatibilitási utat; forráshivatkozású route-on nem használni. | A gable és multi-roof hivatkozásokat előzetesen ellenőrizni, majd a restricted source writerhez irányítani. Régi direkt source írást nem tekinteni aktív UI útvonalnak. |
| `save_multi_roof_flashing_calculation` | `saveFlashingCalculationAction` → `persistMultiRoofFlashing` bármely érvényes tetőél-hivatkozás esetén. | Immutable flashing revisionök és pontos upstream roof/geometry revision dependency-k. | Aktív restricted writer; gable és nem-gable forrásélt is elfogad. | Actor/org/project, élkategória, eredethossz, aktuális source, revision, idempotencia és konkurencia-ellenőrzés megmarad. Gable és multi-roof local Auth/RLS teszt PASS. |
| Standalone flashing calculator | Nincs mentési entrypoint; a régi route mentett rekordot ad read-only komponensnek. | A `getStandaloneCalculation` olvassa a meglévő standalone rekordot és revíziólistát. | Létrehozás UI nélkül; történeti olvasás megőrzése. | Paraméter nélküli route redirect; rekord nélkül not-found állapot; meglévő rekordnál csak eredmény/revízió olvasható. Ne töröljünk DB RPC-t vagy sort rekordteljességi bizonyíték nélkül. |
| Régi survey `WorkspaceCalculator` | Aktív route import nincs; a régi URL redirectel; jelenlegi közvetlen importja a saját teszt. | Történeti source linkek, `loadSurveyCalculator` és a régi writer/action contract tesztje megmaradt. | UNREACHABLE / POSSIBLY UNUSED kód, adatkompatibilitás miatt most megőrizve. | Külön eltávolítási munka csak a link- és route-adatfüggőségek megvizsgálása után. |

## Érintett runtime és adatfüggőségek

### Sheet layout

1. Projekt route: `src/app/projektek/[projectId]/tetomodellek/[roofModelId]/page.tsx` betölti a tető- és layout revisionöket; a `gable-roof-form.tsx` az aktív `metal-sheet-layout-panel.tsx`-et adja a tető-workspace disclosure-jához.
2. A UI `saveSheetLayoutAction` Server Actiont hív. Az action membershipet, projektet, ellenőrzött gable source-t és aktív katalogusvariánst ellenőriz; a már létező domain `calculateMetalSheetLayout` motorból készíti újra az eredményt.
3. Mentés után az új writer a meglévő `save_metal_sheet_layout` validációját használja. A számítás, számítási revízió és `calculation_dependencies` immutable marad. A layout→anyagkimutatás átadás a meglévő draft RPC-t hívja.
4. A korábbi hibát az authenticated `SECURITY INVOKER` writer `FOR UPDATE` source lockja okozta: a roof-model böngészős írásvédő policy ezt a zárolást megtagadta. A migration ezt a writer útvonalat vezeti át; nem módosít felhasználói üzleti rekordot.

### Flashing

1. Projekt route: `src/app/projektek/[projectId]/szegelyek/page.tsx`; élválasztás a projekt tetőmodell lapjáról érkezik. `flashing-actions.ts` validálja a gable-specifikus output mező/kategória és a többtetős `edges` típusú forrásokat.
2. A gable ág régen is source-linkelt volt, ezért az `authenticated save_flashing_material_calculation` RPC-ba jutott. Ez a restricted roof-model policy mellett hibásan `P0002`-re futott. A legutóbbi multi-roof RPC már mindkét forrást validálja; az action elágazása hibásan csak `outputField = edges` esetén használta.
3. Javítás: ha legalább egy tetőél-hivatkozás van, a szerveroldali restricted writer ment. Hivatkozás nélküli projektben a kézi mentés és a hozzá tartozó kompatibilitási RPC nem változott.
4. A revision olvasók a jelenlegi és korábbi calculation revisionöket megőrzik. Az anyagkimutatás-átadás a mentett aktuális flashing revisionből készít draftot; becsült igényből tényleges felhasználást a rendszer nem állít.

### Standalone és legacy

- `src/app/kalkulatorok/szegelyek/page.tsx`: `calculation` paraméter nélkül redirect; ismert standalone flashing rekordnál `readOnly`; más típusú vagy hiányzó rekordnál nincs szerkeszthető writer.
- Régi survey-kalkulátor URL: a route továbbra is a mentett felmérésre irányít query-paraméter megőrzéssel. A komponens/action/loader forrása és kompatibilitási tesztje megmaradt, de aktív survey UI nem imports.
- Régi standalone/persistence RPC-k és stored recordok nincsenek törölve. A tényleges hosted rekordhasználat nem volt hozzáférhető.
- Projekt/ügyfél kapcsolat nem tekinthető árva integrációnak: aktív projekt detail, tetőmodellek, anyagkimutatás, quotation és execution route-ok, valamint survey legacy `project_id`/follow-up FK-k léteznek. A F9.31 nem bontja ezeket.

## Priorizált audit

| Probléma | Érintett fájlok / adat | Felhasználói hatás | Megoldási javaslat | Kockázat | Migráció / kompatibilitás | Prioritás |
| --- | --- | --- | --- | --- | --- | --- |
| A projekt lemezkiosztás mentése az RLS source lock miatt nem működött. | `sheet-layout-actions.ts`, `sheet-layout-writer.ts`, `save_metal_sheet_layout`, `calculation_revisions`, `calculation_dependencies`. | Nem menthető a gable layout, ezért az abból induló takeoff draft sem készül el. | Restricted, actor/tag/project idempotens writer a meglévő validátorra delegálva. | Magas, jogosultság és adatkonzisztencia; implementálva, helyi Auth/RLS teszttel igazolva. | Additív operation ledger/RPC; régi függvény és adat megmarad, authenticated közvetlen írás tiltott. | P1 — JAVÍTVA |
| A gable edge-referenciás szegély a régi hibás writer útvonalon ment. | `flashing-actions.ts`, `multi-roof-flashing-writer.ts`, `save_multi_roof_flashing_calculation`. | Tetőmodellből választott gable él szegélyének revisionje nem készült el. | Minden tetőél-referenciát a meglévő restricted RPC-hez irányítani; gable és multi-roof Auth/RLS/retry/concurrency teszt. | Magas, source provenance és revision integrity; helyi tesztekkel igazolva. | Nincs új schema; a pontos upstream revision immutable dependency marad. | P1 — JAVÍTVA |
| A régi standalone flashing létrehozó UI az új termékdöntéssel ellentétes. | `/kalkulatorok/szegelyek`, `flashing-calculator.tsx`, standalone records. | Új, nem projektbeli flashing számítás indítására ösztönöz, miközben ez a munkafolyamat már nem támogatott. | Új rekord nélküli route redirectel; meglévő rekord/revízió read-only. | Alacsony; csak route és megjelenítés. | DB API/adat nem törlődik; régi ID és read route kompatibilis marad. | P1 |
| A 001/009/011/029 fixture-ek régi gable/raw writer viselkedést tételeznek fel. | Négy pgTAP fájl, új restricted sheet writer migration. | Hibás backend regressziójel vagy korai abort elfedi a jelenlegi szerződés ellenőrzését. | Fixture-k frissítése current writer/privilege contractra; authenticated deny állítás és immutable/source tesztek megtartása. | Közepes, security assertion elhagyása tilos. | Tesztmódosítás; üzleti adat/migration history nincs visszamenőleg alakítva. | P1 |
| A teljes Survey → Calculation → Material List → Quotation → Work Log sorozatot egyetlen browser/E2E scenarió nem igazolja. | Survey/roof source link, `material_takeoffs`, quotation revisions/status events, execution plan/journal. | Több kézi ellenőrzés és nyitott forrásstátusz; regressziót nehezebb lokalizálni. | Egy jogosult, kizárólag DEMO fixture-en futó E2E/DB acceptance út, explicit approval és actual-vs-estimate határral. | Közepes, üzleti státuszok/jogosultságok. | Nincs előre feltételezett migráció; a teszt a jelenlegi domain/RPC-ket használja. | P2 |
| Legacy writer/rekord tényleges production darabszáma nem ismert. | Hosted standalone calculation és régi RPC hívások. | A későbbi teljes adatbázis-retirement tévesen historikus rekordot törölhet. | Hosted változtatás nélkül, külön olvasási/audit engedéllyel számolni a tárolt kalkulációkat és kliens-hivatkozásokat; csak ezután tervezni retirementet. | Közepes–magas, adatmegőrzés és kompatibilitás. | Nincs migration most; csak bizonyított nulla consumer után lehet drop-tervet készíteni. | P2 |

## pgTAP regressziók

| Teszt | Előző hiba tényleges oka | F9.31 döntés | Eredmény |
| --- | --- | --- | --- |
| `001_foundation.sql` | Elavult gable RPC fixture; a layout fixture tiltott self-dependency sort készített; a takeoff RLS assertions előtt nem állt vissza az authenticated role; a teszthelper közvetlen táblalekérdezést végzett a writer szereppel. A takeoff policy külön authenticated tranzakcióban user 2-re nulla olvasható sort és insertre 42501-et ad. | Self-dependency fixture törölve; a helper az opcionális layout ID-t NULL-lal adja át, nem olvas táblát writerként; role visszaállítva. Authenticated direct writer tiltás megmaradt. | **PASS — 178 assertion** |
| `009_gutter_calculation.sql` | A fixture a visszavont régi gable RPC-t hívta, ezért a gutter forrásvizsgálat abortált. | Verified gable fixture az aktuális secure writerrel készül; a gutter source assertions változatlanok. | **PASS** |
| `011_flashing_calculation.sql` | A régi source-linked gable mentési ág `P0002`-t adott. | Source-linked V1 és érvénytelen/cross-project source/hossz a restricted `save_multi_roof_flashing_calculation` RPC-n fut; source nélküli manual V2 továbbra is a legacy RPC-t teszteli. Authenticated direct restricted call deny megmaradt. | **PASS** |
| `029_smart_roof_geometry.sql` | A fixture a visszavont régi gable RPC-t hívta, ezért a survey source teszt abortált. | Verified gable fixture az aktuális secure writerrel készül. | **PASS** |

Parancs: `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local supabase/tests/database/001_foundation.sql supabase/tests/database/009_gutter_calculation.sql supabase/tests/database/011_flashing_calculation.sql supabase/tests/database/029_smart_roof_geometry.sql` — **4 fájl / 228 assertion PASS**. A 011 korábbi `P0002` a legacy forrásolt író ág hibáját jelzi; az aktív UI már nem ezt az ágat használja. A legacy RPC source nélküli kézi mentéshez és migrációs kompatibilitáshoz megmaradt.

## F9.31 változások és ellenőrzés

- A projekt sheet-layout action a `COVERING_WRITER_DATABASE_URL`-t használó `persistSheetLayout` adapterhez került. Az új migration `sheet_layout_save_operations` ledgerrel biztosít actorhoz kötött idempotens retryt és advisory-lock alapú konkurenciát. Régi `save_metal_sheet_layout` függvény és revisionök megmaradnak; authenticated EXECUTE visszavonva.
- A flashing action minden forrásolt gable vagy többtetős edge írást a már létező restricted writerre küldi. A source nélküli kézi workflow változatlan.
- A legacy standalone route új kalkulációs bejáratként redirectel; meglévő mentett rekordok read-only módban látszanak.
- A local sheet-layout Auth/RLS integration test és a multi-roof local integration test idempotenciát, revision-historyt, direct-client denialt és két eltérő V2 payload konkurenciáját ellenőrzi (utóbbi gable flashing source-szal bővítve): 2 fájl / 6 teszt PASS.
- Kapcsolódó survey/material-list/quotation/work-log DB útvonalak: `005`, `006`, `012`, `023`, `026`, `030`, `031`, `033`, `036`, `037` helyi pgTAP — 10 fájl / 199 assertion PASS.
- Célzott Vitest: 3 fájl / 11 teszt PASS; 2 opt-in helyi DB suite a normál futásban skip. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS.
- Production build böngésző-smoke: standalone flashing route `/kalkulatorok`-ra irányított; mentett felmérés 3 mérést és 73,246 m² geometriát mutatott; `/anyaglistak` betöltött (üres helyi lista); meglévő munkanapló megnyílt naplóbejegyzéssel. A böngészőben nem történt mentés; mivel a helyi anyaglista üres, mentett lista roundtripet nem lehetett böngészőből igazolni.
- A migráció a helyi Supabase-en reset nélkül alkalmazva. Hosted DB-t nem értem el; hosted rekordmennyiség és régi URL-használat nem ellenőrzött.
