# Önálló munkafolyamatok — architektúra

## Jelenlegi állapot

- A globális eresz-, szegély- és profilkalkulátor meglévő editorai a F9.7.6.3 óta tudják menteni/listázni/visszaolvasni a három önálló számítást; a F9.7.6.5.2 projektpicker és másolat-megerősítés is ezekbe az editorokba épül. A hitelesített böngészős workflow és a ledgerből származó felhasználási előzmény UI-ja még nincs bizonyítva/implementálva.
- A `calculations.project_id` projekt scope-ban továbbra is kötelező a scope constraint szerint; a táblaszintű oszlop nullable lett, hogy a külön `standalone` scope project és roof kapcsolat nélkül élhessen. A revíziók immutable-ok; standalone rekord nem kerül a projekt dependency DAG-ba.
- Az eresz- és szegélybecslés RPC-je szervezeti tagságot, létező projektet és expected revisiont ellenőriz, majd szervezet/projekt/kalkulátortípus szerint sorosítja a mentést. Projektenkénti egyedi index van. A profillekérdezés is szervezet és projekt szerint szűr.
- A standalone gutter/flashing bemenetben a tetőgeometriai forrásreferenciák nullok és SQL/RPC szinten is elutasítottak; a profil saját, önálló geometriát tárol. Projektkalkulátorok korábbi forráskezelése változatlan.
- A `quotations.project_id` a project scope-ban kötelező; a F9.7.6.6.1 explicit scope constrainttel engedi nullon a standalone rekordot. Project quote RPC és PDF útvonal változatlanul projekthez kötött; önálló PDF/UI még nincs.
- Az ajánlati tételek típusa `MATERIAL`, `LABOR` vagy `OTHER`; a takeoff-import választható, anyagsornál viszont katalógusvariáns kell. HUF, `NUMERIC(20,2)`, fixpontos TypeScript összegzés, nettó vagy bruttó besorolás, nincs ÁFA-motor. A revízió sor-, ár- és forrás-pillanatképe immutable.
- A jelenlegi UI-ban minden kitöltött sorhoz mennyiség, egység, megnevezés és érvényes egységár kell. A jövőbeli, hiányos sorokat is őrző draftnak külön részleges draft-szerződés kell; a véglegesítés már megköveteli az ügyfelet, az egységes árbesorolást és a hiánytalan pénzügyi adatot.
- Kivitelezési tervek projekt- és szervezetkapcsoltak. A meglévő projektlekérdezés összetett listát, naplót, eseményt, fotót és rövid idejű privát signed URL-t ad, ezért a globális áttekintő csak külön, szűkített tervlistát kér.
- Nincs általános dokumentumtár-listázó vagy `documents` tábla. Az ajánlati PDF projekt/ajánlat/revízió-ellenőrzésű API-válasz, a kivitelezési fotó pedig privát Storage objektum, projekt-metaadat- és tagsági ellenőrzéssel. Ezeket nem szabad globális public URL-listává alakítani.

## Javasolt standalone-adattulajdon

Minden új rekordnak legyen kötelező `organization_id`-je és létrehozója. A projektkapcsolat legyen opcionális, de csak olyan rekordnál, amelynek minden hivatkozott projektforrása ugyanahhoz a projekthez tartozik. A személyes „Mentett számításaim” szűrőhöz stabil parent `created_by`/owner mező kell; a jelenlegi számítás-fejlécről ez hiányzik. Dönteni kell, hogy a műhely minden tagja olvashatja-e az önálló számításokat, vagy a létrehozó és kijelölt szerepkörök férnek hozzá.

Ne kerüljön be dummy projekt. A projekt `NOT NULL` elhagyása csak az összes olvasó, RPC, egyedi index, FK, RLS-policy, dependency és kalkulátor-adapter auditja után történhet. A migráció meglévő projektadatot változatlanul hagyjon, és a projektkötött mentési szerződést regressziótesztek védjék. A korábbi revízió ne kapjon utólag átírt forrást.

Projekt-hozzárendelésnél elsőként append-only, szervezeti `calculation_project_links` kapcsolótábla javasolt konkrét számítás/revízió és célprojekt megadásával. Ez a történeti rekordot nem mozgatja. Kapcsolás csak projektfüggetlen bemenetnél lehetséges; projektforrású rekordot explicit újraszámítással kell a célprojektbe átadni, új forrás-provenance-szel. A célprojekt, az eredeti rekord és minden forrás ugyanazon szervezethez tartozzon. A művelethez user-megerősítés, idempotens request key és változatlan előzmény kell. Ajánlatnál a későbbi projekt-hozzárendeléshez hasonló, auditálható kapcsolat vagy új, projekthez kötött ajánlati példány kell; a végleges dokumentum fejlécét nem lehet némán átírni.

## Önálló árajánlat — F9.7.6.6.1 backend

Választott modell: a meglévő `quotations` / `quotation_revisions` táblák közösek. Az append-only `20261014030000_standalone_quotations.sql` `ownership_scope` mezőt ad, a project-referenciát nullable-vé teszi és CHECK-kel kikényszeríti: `project` → projekt kötelező, `standalone` → projekt null. Régi rekordok `project` scope-ot kapnak. Ügyfél nullable marad; draft nem igényel ügyfelet, projektet vagy takeoffot. Nem keletkezik dummy project.

Standalone hozzáférés szervezeti tagság **és** `created_by = auth.uid()` alapján történik; a létrehozót a DB RPC a JWT-ből írja, nem fogadja a payloadból. A project quotation régi szervezeti láthatósága megmarad. Revision-olvasás a szülő RLS-szabályát követi. A parent scope/projekt/szervezet/creator mezők update triggerrel rögzítettek; a finalized/sent/accepted/rejected életciklus és project PDF/action contract nem változik.

Az új `save_standalone_quotation_draft` RPC atomikusan ment draftot és immutable revisiont, expected versiont ellenőriz, advisory transaction lockkal és `(organization_id, created_by, operation_id)` unique ledgerrel védi az idempotens retryt. Azonos kulcs + azonos payload a korábbi eredményt adja, eltérő payload hibát kap. A RPC a HUF sorösszegeket PostgreSQL `numeric`-kal, soronkénti két tizedes kerekítéssel és összesítéssel újraszámolja; a visszaadott `totals_snapshot` az irányadó. Megmarad a nettó/bruttó egyneműség, VAT rate és automatikus adóátváltás nincs. Mennyiség max 6, egységár max 2 tizedes; az elfogadott unit mező továbbra is explicit, nem konvertálódik.

`MATERIAL` sorhoz saját műhely aktív terméke/variánsa kötelező. Árkatalógus-hivatkozásnál a DB ellenőrzi a variánst, árrekordot, HUF-ot, egységet, árat és `price_kind`-ot; a revision az aktuális leírás/provenance/ár pillanatképét őrzi. Árrekord nélküli kézi felülírás támogatott és `manualPriceOverride` jelölést kap. A `LABOR` / `OTHER` sorokhoz katalógus nem kell. Üres tétellista és ügyfél nélküli draft megengedett; finalize változatlanul szigorú projekt+ügyfél+legalább egy teljes tétel követelményt használ, ezért standalone véglegesítés jelenleg nem érhető el.

Server Action fájl: `src/features/quotations/standalone-quotation-actions.ts`; create/update, owner current/history read, bounded list, catalog resolution és manual-line validation contractot ad. `operationId`-t a következő frontend logikai mentésenként generálja és retry során újrahasználja. Nincs UI, standalone PDF vagy project-association flow a milestone-ban.

Ellenőrzés: a helyi Supabase diagnosztikához szűkített Docker socket-hozzáférés után `docker info` Docker 29.8.0-t jelzett; `supabase status` igazolta a helyi DB/API futását és `linked_project=null` értéket. `supabase migration list --local` szerint a 030000 még nem volt alkalmazva; az adatbázisban 2 quotation és 3 revision volt, az authenticated/anon szerepkörnek nincs `public CREATE` joga. A 030000 migráció reset nélkül sikeresen alkalmazva. `018_standalone_quotations.sql`: **33/33 pgTAP PASS**; meglévő `002_quotations`, `003_quotation_finalization`, `004_quotation_lifecycle`: **27/27 pgTAP PASS**.

A kliens által beállítható `app.standalone_quotation_writer` GUC nem jogosultsági határ. Mivel a migráció bizonyítottan még nem futott, a javítás közvetlenül a 030000-ba került: a standalone save RPC SECURITY DEFINER, rögzített `pg_catalog, public` search_path-szel; authenticated direct parent/revision insert/update csak project scope-ra engedett, ledger INSERT-jog visszavonva. A `018` hamis GUC-vel is próbál közvetlenül írni. A lokális, valós Supabase Auth kliensekkel futó harness **43/43 ellenőrzést** adott: owner/list/history, két identitású és cross-org RLS, manual/catalog/LABOR/OTHER, ár-snapshot, net/gross és validáció, project create/V2/visibility, meglévő accepted history tiltott módosítása. Két backend session párhuzamos zárolási várakozását mértük; azonos operation retry egy quotation/revisiont adott, azonos V1-ről párhuzamos V2-ből egy sikerült és a másik `40001`-et kapott; V1 változatlan. A harness által létrehozott, egyértelmű DEMO Auth userek/szervezetek/katalógus/revíziók a helyi DB-ben maradnak.

Státusz: **PARTIAL**. A harness a PostgREST RPC-ket hívta valós Auth JWT-kkel; maga a Next Server Action/cookie útvonal és böngészős workflow nem futott. Project quotation PDF-előkészítés és takeoff association, valamint a teljes releváns regressziós kör nincs végigfuttatva; a pgTAP 003/004 fájlok ebben a körben szerkezeti ellenőrzést fednek. ÁFA-motor nincs és nem került be.

## F9.7.6.6.1b — végső backend-elfogadás

**Állapot: COMPLETE (DRAFT BACKEND).**

- **VERIFIED DATABASE:** az 1a migráció/pgTAP/Auth/concurrency eredményeit újrahasználtuk, mert a DB-szerződés nem változott: 33/33 standalone pgTAP, 27/27 projekt quotation pgTAP és 43/43 helyi Auth/concurrency harness assertion.
- **VERIFIED APPLICATION INTEGRATION:** ideiglenes local acceptance oldalon Next Server Actionből, `createClient()` SSR cookie-kkal, három valódi helyi Supabase Auth identitás alatt futott a produkciós action kód. 15 tulajdonosi ellenőrzés fedte a katalogusfeloldást, MATERIAL/LABOR mentést, saját listát, V1/V2/history, stale conflict, érvénytelen ID-t, szervezetazonosító hamisítását, safe errort, nettó HUF összeget és finalize-tiltást. Másik aktív tag quote-olvasása `NOT_FOUND`; visszavont tagságú user listája és mentése `FORBIDDEN` lett. Az ideiglenes tesztoldal és a fixture-belépési segéd eltávolítva.
- **PROJECT REGRESSION:** a meglévő project `saveQuotationDraftAction` approved takeoff forrással új draftot és V2-t mentett; accepted quotation módosítását elutasította.
- **FINANCIAL/LIFECYCLE:** a válasz explicit `HUF` + `net` subtotalt adott `vatAmount` nélkül; kevert net/gross input `VALIDATION`. Standalone draft project-finalize actionből nem véglegesíthető. Nincs VAT engine vagy implicit handoff.
- **NOT YET IMPLEMENTED IN FRONTEND:** standalone quotation editor/UI és önálló PDF nincs; ezek F9.7.6.6.2 scope-jába tartoznak.
- **NOT YET BROWSER VERIFIED:** csak az átmeneti acceptance oldalt használtuk az actionök indítására; termék quotation editor nincs, ezért annak böngészős workflow-ja nem volt tesztelhető vagy ellenőrizhető.

## F9.7.6.6.2 — standalone quotation frontend

Útvonalak: a globális `/ajanlatok` oldal külön listázza az önálló piszkozatokat és a szervezeti hozzáféréssel látható projektajánlatokat. Az `/ajanlatok/uj` projekttől és ügyféltől független új piszkozatot nyit; az `/ajanlatok/[quotationId]` a saját standalone ajánlat mentett aktuális vagy `?revision=<id>` szerinti immutable revízióját tölti be. Projektajánlatok továbbra is a meglévő `/projektek/[projectId]/ajanlatok` útvonalon nyílnak.

A szerkesztő kézi MATERIAL, LABOR és OTHER sorokat kezel; MATERIAL sorhoz választható a műhely aktív katalógusa. A katalógus- és HUF nettó árforrást a meglévő `resolveStandaloneQuotationCatalogItemAction` újraellenőrzi, ár nélküli sor kézi nettó felülírásként menthető. A sorok helyi stabil UI-azonosítót kapnak, az nem kerül a szerver payloadba. Sorok hozzáadhatók, szerkeszthetők, átrendezhetők és törölhetők. A mentési action meglévő owner/org ellenőrzését, `operationId` idempotenciáját és expected-version konfliktusvédelmét használja; a retry ugyanazon payloadhoz megtartja a műveletazonosítót.

A pénzügyi UI minden sort nettó HUF-ként jelöl. A szerkesztés alatti sor- és összeg-előnézet „nem mentett becslés”; mentés után a szerveres subtotal jelenik meg. A session recovery a meglévő quotation recovery helperrel user/szervezet/quotation szerint határolt, stale szerverrevízió esetén nem állítható vissza. A régi revízió megtekintése nem ment, csak olvasható; az aktuális revízióhoz külön vissza lehet lépni.

Az overview legfeljebb 100 sort mutat standalone és projekt scope-onként, és jelzi a további találatokat; a további lista-lapozás nincs bekötve. Standalone véglegesítés, elfogadás, ÁFA, hivatalos PDF és kivitelezési terv továbbra sem támogatott. A globális projektlista meglévő organization-szintű RLS lekérdezést használ; a standalone lista/read/catalog/save actionök owner- és aktív tagságvédelme változatlan. A project quotation editor/action/PDF útvonal nem módosult.

Frontend acceptance állapot: az automatizált UI-state/domain tesztek és statikus ellenőrzések eredményeit a `docs/TEST_MATRIX.md` rögzíti. A hitelesített böngészős end-to-end mentés/reload/V1–V2 workflow külön browser ellenőrzéséig **UNVERIFIED**.

1b checks: a három Vitest fájl 10/10; `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. A local DB-be írt, egyértelmű DEMO felhasználók, katalógusok és teszt-ajánlat/revízió adatok megmaradnak. Hosted DB/migráció, reset és commit nem történt.

A manuális munkadíj/egyéb tétel adatmodellje már létezik, a takeoff nem kötelező. Katalógusanyaghoz továbbra is műhelyen belüli variáns és opcionálisan rögzített ár-pillanatkép szükséges. A hiányos draft új validációs állapotot és tesztelt PDF/finalizálási tiltást igényel. Pénzskála, HUF, nettó/bruttó egységesség, történeti árak és immutable revíziók változatlanul megőrzendők; ÁFA-kulcs nem következtethető.

## Biztonsági és integritási követelmények

- Szerveroldali auth contextből kiválasztott szervezet; böngészőből érkező szervezet- vagy projekt-azonosító önmagában nem jogosít.
- RLS minden standalone üzleti táblán, `private.is_org_member(organization_id)` vagy pontosabb szerepkör-szabállyal. A standalone save RPC `SECURITY DEFINER`, rögzített `search_path`-szel, explicit actor/org membership checkkel és authenticated EXECUTE granttal; a közvetlen authenticated standalone write tiltott.
- Composite FK és RPC-validáció akadályozza meg az idegen szervezet projekt-, katalógus-, takeoff- és forrásrevízió-hivatkozását.
- Revízió-snapshot append-only; expected version/revision és tranzakciós zárolás véd stale és konkurens mentés ellen.
- Forrásprovenance a konkrét bemeneti revízióhoz kötve; projektkapcsolás nem módosíthat történeti snapshotot és nem másolhat csendben rekordot.
- Migráció és pgTAP lokális eldobható Supabase-en; külön teszt ugyanazon org jogosult tagjára, másik org tiltására, RPC-grantokra, stale revisionre, idempotenciára és valódi párhuzamos mentésre.

## Implementációs lépések

1. **F9.7.6.2 — számítási ownership-döntés és sématerv:** döntés a „Mentett számításaim” láthatóságáról, standalone rekordazonosításról és a projektforrású esetek kizárásáról; az összes `project_id` olvasó/RPC/index és takeoff/downstream kapcsolat táblázatos auditja.
2. **F9.7.6.3 — lokális additív migráció és RPC:** meglévő projektadat érintetlenül hagyása; explicit standalone scope/owner, külön idempotencia és expected revision; RLS/FK/pgTAP. Először csak a bizonyítottan projektfüggetlen, kézi bemenetű kalkulátor.
3. **F9.7.6.4 — önálló UI és mentett lista:** új projekt nélküli route, draft/mentési/ütközési állapotok, revízióelőzmény és provenance; projektkalkulátor és material-takeoff regresszió.
4. **F9.7.6.5 — biztonságos projektkapcsolás:** append-only link csak független rekordhoz; függő számítás újrafuttatása és új provenance másolás helyett; explicit megerősítés és cross-tenant tesztek.
5. **Külön quotation milestone:** projekt nélküli drafttól a végleges PDF-ig tartó adat- és dokumentum-életciklus, draft/final validation, státusztörténet, PDF auth és pénzügyi snapshot regressziók. Ez nem része F9.7.6.1-nek.

## Nyitott döntések

- A „Mentett számításaim” saját user rekordjait mutatja, vagy a műhely összes tagjának közös számításait?
- Az önálló kalkulációs rekordhoz tartozhat opcionális ügyfél, vagy csak később projekt?
- Melyik kalkulátor támogat projekt nélküli, forrás nélküli bemenetet az első iterációban? A profil anyagkatalógus-bemenete és a tetőből származó eresz/szegélyjavaslat külön kezelendő.
- A standalone számítás projektkapcsolása csak nézetbeli link legyen, vagy külön projektpéldány készüljön új revízióval? A fenti javaslat az elsőt választja csak forrásfüggetlen számításnál.
- Ajánlat PDF projekt nélkül milyen szervezeti és ajánlati adatokat snapshotoljon, és milyen mezők maradhatnak üresek a draftban?

## F9.7.6.2 — ownership-döntés és sématerv

### Döntés

Az önálló számítás **műhelytulajdonú, létrehozóhoz kötött** rekord lesz: a későbbi „Mentett számításaim” lista csak az aktív szervezeti tagság mellett az adott hitelesített felhasználó által létrehozott önálló kalkulációkat mutatja. Más műhelytag standalone rekordját sem a lista, sem a közvetlen rekord/revízió lekérdezése nem olvashatja. A projektkötött kalkulációk jelenlegi szervezeti láthatósága változatlan marad. Ügyfélkapcsolat nincs az első standalone szerződésben.

Minimális adatmodell-javaslat a meglévő `calculations` táblában: `project_id` nullable; kötelező `created_by`/owner FK; explicit, DB-kényszerrel ellenőrzött `ownership_scope` (`project` vagy `standalone`); scope és projekt nullabilitásának összhangját ellenőrző constraint. Új revízió és dependency továbbra is a meglévő táblákban él. Az owner-t az authenticated `auth.uid()` adja, nem a kliens payload. Standalone mentés csak olyan három kalkulátor inputra engedélyezhető, amelynek projekt/tető forrás-referenciái nullok. A profilnál a műhely katalógusvariáns hivatkozása megtartható, ha azonos `organization_id`-jú és a meglévő típus/egység contract validálja.

RLS-terv: projekt scope esetén a jelenlegi aktív tagsági olvasási szabály; standalone scope esetén tagság **és** `created_by = auth.uid()` olvasási feltétel. A revízió policy a szülő `calculations` rekord scope/owner szabályát is ellenőrzi, ezért egy másik tag által ismert revision ID sem nyitja meg a snapshotot. Írás továbbra is célzott SECURITY INVOKER RPC-ken keresztül, server action által ellenőrzött sessionnel, server oldali újraszámítással és expected revisionnel; közvetlen authenticated insert/update grantot a standalone scope-hoz nem szabad használni.

### `project_id` függőségi audit

| Érintett szerződés | Jelenlegi projektfeltétel | Nullable bővítés előtt szükséges védelem |
|---|---|---|
| `calculations` összetett FK és RLS | `project_id NOT NULL`; FK `(project_id, organization_id)` → `projects` | Scope/owner CHECK, projekt scope esetén változatlan összetett FK; standalone esetben null projekt és kötelező owner |
| Kalkulációs egyedi indexek | Gutters/flashing szervezet + projekt + kalkulátortípus szerint egyediek; profil RPC azonosítót és projektet vár | Projekt-indexek megőrzése; külön standalone egyediség nem szükséges, mert explicit calculation ID és expected revision azonosít |
| Gutter / flashing / profile mentő RPC | `p_project_id`, projekttagság, projekt szerint zárolás; flashing források ugyanazon projektből | Meglévő függvények és grantok változatlanul maradnak; új standalone RPC project-free bemenetet, owner auth.uid()-t és újraszámolt outputot validál |
| `calculation_dependencies` | Revízió-szintű FK; trigger projekt/szervezet gráfkonzisztenciát ellenőrzi | Standalone source-free számítás nem hoz létre dependency élt; tető/projektforrást a standalone snapshotból kizárni |
| Gutter/flashing material takeoff | Takeoff és forráskalkuláció azonos projekthez kötött; approved source revision és katalógus-validáció kell | Standalone rekord nem adható át; az új projektlink önmagában nem jogosít takeoffra |
| Lemezprofil anyag-takeoff | Takeoff és számítás projektkötött, revízió- és katalógus snapshot hivatkozással | Projektlink után is csak célzott, idempotens új művelet és meglévő source-validáció használható |
| Árajánlat tételek / források | Ajánlat fejléce, draft RPC, finalizálás és PDF kötelező projektazonosítót használ | Külön quotation mérföldkő; a nullable calculations.project_id nem változtat quotation szerződést |
| Roof model / revision | Tetőmodellek és geometriájuk kötelező projekthez kötöttek | Standalone kalkuláció tetőrevíziót nem hivatkozhat; külön standalone roof ownership nem része ennek a döntésnek |

Ez a terv nem migráció: a `project_id`-t és a meglévő adatokat ez a lépés nem módosítja. A végrehajtó migráció előtt minden `project_id` lekérdezőt, view-t és trigger-t újra kell keresni a migrációk teljes halmazában, majd local pgTAP és két független authenticated session szükséges a tulajdonosi izolációhoz, stale revision ütközéshez és párhallel mentéshez. A helyi Supabase CLI-t ebben a turnben nem lehetett lekérdezni: `supabase status` megállt a sandbox `EPERM` tiltásánál, amikor CLI saját `/Users/bence/.supabase/telemetry.json` fájlját akarta írni.

## F9.7.6.3 — standalone perzisztencia (backend)

A lokális `20261014010000_standalone_calculation_persistence.sql` migráció a meglévő calculation/revision láncot bővíti: `calculations.ownership_scope` (`project`/`standalone`) és `created_by` került be, a `project_id` nullable lett, a scope CHECK pedig project rekordnál megköveteli a projektet és a null creatort, standalone rekordnál a null projektet/tetőt és hitelesített létrehozót. A létrehozó az `auth.uid()`; kliens nem küldhet owner értéket. Project scope korábbi FK-ja, láthatósága, mentő RPC-jei és dependency validációja megmarad.

Három külön authenticated RPC (`save_standalone_gutter_calculation`, `save_standalone_flashing_calculation`, `save_standalone_profile_calculation`) használja az ismert registry-azonosítókat. A szerver action a meglévő TypeScript engine-t futtatja, a normalizált inputot és kimenetet adja át; a DB-függvények a source nélküli szerződést és a számítás lényegi numerikus eredményét újra ellenőrzik. Profilnál hiányzó BA/K mellett a flat width null marad. Projekt/tetőforrás nem törölhető csendben, ilyen bemenet elutasított. A profile catalog variáns csak azonos szervezethez fogadható el.

Standalone parent/revision közvetlen kliens INSERT/UPDATE/DELETE policyje project scope-ra korlátozott; dedikált mentő RPC-k írnak. A revision SELECT policy a parent scope és owner mezőjét is ellenőrzi, így ugyanazon műhely másik tagja sem listázhatja vagy nyithatja meg a rekordot. Minden írás transaction advisory lockot használ az org/user/type/calculation ID kulcson, és expected revision eltérésre `40001` konfliktust ad. Az olvasó listázza a saját rekordokat, aktuális vagy kiválasztott történeti revíziót tölt, majd TypeScript engine-nel újraszámol és a tárolt snapshothoz hasonlít.

Bizonyíték és határ: a helyi `016_standalone_calculations.sql` és az érintett `009`, `011`, `013` projektmód pgTAP együtt 88/88 assertion PASS; valódi párhuzamos ellenőrzés: `node scripts/verify-standalone-calculation-concurrency.mjs` két külön `authenticated` DB-kapcsolattal egy V2-t és egy stale konfliktust igazolt, V1 változatlan. A helyi Auth integráció `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts` sikerrel ment két valós helyi Auth userrel; az owner ment/listáz/olvas aktuális és történeti adatot, a nem létrehozó műhelytag nem látja. A frontend integráció a F9.7.6.4 része; hosted DB nincs ellenőrizve.

## F9.7.6.4 — önálló kalkulátor felület

A három meglévő editor (`GutterCalculator`, `FlashingCalculator`, `ProfileEditor`) standalone módban is a meglévő domain motorral számol, majd az `saveStandaloneCalculationAction` szerveroldali actiont használja. Mentés után a stabil calculation ID kerül a route querybe; az oldal `getStandaloneCalculation` read modellel állítja vissza a revíziót. Új és meglévő számításnál az expected revision védi a V1/V2 mentést. Történeti kiválasztás csak olvasás; módosítás mentésekor új revízió készül, és az editor figyelmeztet az el nem mentett változat eldobására.

A `/kalkulatorok/mentett` lista legfeljebb 100 saját, aktív szervezeti tagság alatt látható standalone rekordot mutat, kalkulátortípus-szűrővel és típushelyes megnyitással. A lista nem tölti le a teljes revíziótörténetet. A tetőgeometriai előnézet továbbra sem menthető; a standalone eresz/szegély nem kap projektgeometria-javaslatot. A backend projektkapcsolás a F9.7.6.5.1-ben, a felhasználói projektpicker a F9.7.6.5.2-ben készült el.

## F9.7.6.5.1 — standalone számítás projektkapcsolása (backend)

Választott modell: **B**, az immutable standalone snapshotból új projekt-revízió készül a meglévő projektmentő RPC-kkel; egy append-only `calculation_project_associations` ledger őrzi a pontos source calculation/revision párost és a teljes forrás-snapshotot (input, output, státusz, séma- és motorverzió, warnings, `data_provenance`), továbbá a forrás creatorét, szervezetét és kalkulátortípusát. A forrásrevizió nem változik. Csak a jelenlegi, támogatott v1 revision kapcsolható; történeti vagy nem támogatott revision stale/validációs hibával elutasított.

Eresz és szegély esetén a meglévő projektrevízió következő verziója készül a projekt aktuális expected revisionjével; profilnál a meglévő authoritative SQL RPC új project calculation ID-t vár, és csak `profileId` kapja meg ezt az új azonosítót. Az action a source `input_snapshot` alapján meglévő TypeScript engine-t futtat, összehasonlítja a tárolt input/output snapshotokkal, majd session klienssel hívja az association RPC-t. Az association SQL a snapshotot még egyszer ellenőrzi és a projekt RPC-kkel együtt, egy tranzakcióban rögzíti a célt és a provenance-ledgert. Profilnál a projekt RPC maga számolja az outputot. Az eresz/szegély projekt RPC `verified` státusza a meglévő technikai mentési szerződést jelenti; az eredeti standalone validation státusz és parameter-provenance külön, változatlanul elérhető a ledgerből, és nem jelent szakemberi jóváhagyást.

Az RPC követeli a hitelesített aktív org tagságot, ugyanazon szervezetű létező projektet és `auth.uid()`-hoz tartozó standalone source-ot. Ez azonosítja a meglévő projektmentő RPC-k szervezeti írási jogosultságával; cross-org és same-org noncreator source elutasított. A DB egyedi `(organization_id, operation_id)` constraintet és advisory lockot használ: azonos payload ugyanazt a projekt-revíziót adja vissza, módosult payload elutasított. A source és a project is újraellenőrzött idempotens replay előtt. Standalone geometry reference tiltva marad, dependency edge nem készül. Takeoff, quotation és approved adat nem íródik.

Frontend contract: `associateStandaloneCalculationAction` mezői: `organizationId`, `projectId`, `sourceCalculationId`, explicit `sourceRevisionId`, stabil retry `operationId`, opcionális `name`, `expectedProjectRevisionNumber`; profilnál kötelező stabil `projectCalculationId` (és expected revision 0). A szerveroldali action olvassa a forrást és újraszámol, a UI nem küldhet input/output snapshotot. Eresz/szegély célrevisiont a projekt read modelből kell betölteni; stale `40001` után új művelet szükséges.

Ellenőrzés: helyi migration history `20261014010000`-ről reset nélkül `20261014020000`, a tényleges profil-RPC-aláíráshoz adott `20261014020100` és az append-only triggert hozzáadó `20261014020200` migrációra lépett. A 009/011/013/016/017 pgTAP 5 fájl / 118 assertion PASS; downstream 010/012/015 takeoff suite 3 fájl / 94 assertion PASS, beleértve az approved immutabilityt. Valós helyi Auth integráció 2 userrel 1/1 PASS; két külön authenticated PostgreSQL kapcsolat párhuzamos azonos kérésére egy ledger sor, egy projekt-revízió, azonos cél-ID és `reused` false/true. Célzott Vitest 4 fájl / 41 PASS, 1 opt-in teszt skip (külön Auth futás PASS), typecheck/lint/build PASS. Böngészős projektpicker nem része ennek a backend milestone-nak; hosted Supabase nem érintett.

## F9.7.6.5.2 — standalone számítás projektpéldánya (frontend)

Állapot: **PARTIAL**. A három mentett standalone editor és a „Mentett számításaim” lista a támogatott, saját rekord aktuális revíziójánál mutatja a „Felhasználás projektben” műveletet. A szerveroldali keresés csak aktív műhelytag számára, ugyanazon műhely nem archivált, nem `DEMO` projektjeiből ad legfeljebb 50 nevet; a picker név szerint keres, és helyszínnel, projekt-típussal, állapottal és verzióval különböztet. Ügyféladatot nem kér le.

A megerősítés megmutatja a számítás nevét/típusát, pontos mentett forrásrevízióját és projektet. A projektbe másolat készül; a source változatlan marad. El nem mentett editoradatnál külön jelölővel kell elfogadni a legutóbbi mentett revízió használatát. Historical revision editorban nem kínálja fel a műveletet. Meglévő `associateStandaloneCalculationAction` és backend RPC fut; a kliens identitást nem állít, input/output snapshotot nem küld. Bizonytalan hálózati válasznál ugyanaz az operation ID és profil-cél-ID marad retryra; új picker/művelet új, secure UUID-t kap. Stale source/project válasznál a UI frissítést és ismételt áttekintést kér.

A sikeres művelet az RPC által visszaadott kalkuláció- és revízió-ID-vel nyitja a tényleges projektkalkulátor route-ot; a gutter/flashing oldalak az aktuális projektkalkuláció ID/revízióját ellenőrzik, profiloldal pedig a visszakapott profilt és revíziót választja. Ez az út a meglévő projekt takeoff funkciókhoz visz, de maga az association nem készít vagy hagy jóvá takeoffot/árajánlatot. Ledger olvasására nincs frontend read model; felhasználási előzmény UI külön bővítés. Authenticated browser session és fizikai iPad/iPhone QA nem állt rendelkezésre, ezért a runtime elfogadás **UNVERIFIED** és a milestone nem COMPLETE.

Automated bizonyíték: 4 fókuszált Vitest fájl / 22 teszt, typecheck, lint, production build és `git diff --check` PASS. DB/RPC változás nem történt; pgTAP és Auth/RLS tesztet nem futtattam.

### Meglévő tetőgeometria és tetőkalkulátor-ütemterv

A globális „Tetők és tetőfedés” csoportból nyitható a projekt nélküli nyeregtető-előnézet. Ugyanazt a tiszta `roof.gable` függvényt és `TechnicalDrawing` SVG komponenst használja; nincs másolt geometriai képlet, mentés vagy standalone tető-revízió. A támogatott bemenet: épülethossz és -szélesség, tetőemelkedés **vagy** hajlásszög, eresz- és első/hátsó oromtúlnyúlás. A meglévő motor felületet, hajlást, geometriai ferde hosszakat, gerinc/eresz/oromél hosszakat és két tetősík geometriát ad. Nem számít tetőfedést, lécezést, fóliát, kivitelezési darabjegyzéket vagy statikai kapacitást. A projektútvonal külön roof model és calculation immutable revíziókat használ; a globális route csak helyi előnézet.

### Jövőbeli kalkulátorok — előkészítési sorrend

| Javaslat | Szakmai cél és szükséges adatok | Modell/egység és hiányzó adatok | Javasolt fázis |
|---|---|---|---|
| Tetőfedés: cserép, cserepeslemez, trapézlemez | Tetősík/él geometria; nyílások és bontások; termékváltozat; gyártói fedési szélesség/hossz, átfedés, max. gyártható lemezhossz és kezdő/záró szabály | Síkonkénti lefedési rács, darabszám `db`, fedési/kiinduló hossz `mm`; termékadatok kötelező forrása és tetősík-kiosztás nélkül nem képezhető rendelési mennyiség | Az anyagkatalógus gyártói adatforrás-szerződése után; típusonként külön |
| Szarufa-geometria és előzetes faanyag | Tetősík, szarufa tengelyhelyek/távolság, fal-/gerinc támaszok, túlnyúlás, keresztmetszet és vágási végpontok | Geometriai hosszak `mm`, darabszám `db`, opcionális térfogat `m³`; kiosztás és keresztmetszet explicit. Statikai méretezés külön szakági rendszer és igazolt anyagparaméter nélkül tiltott | Tetőfedési geometria után, nem statikai címkével |
| Ellenléc | Szarufairányú futások, tetősík szélesség/hossz és kiválasztott termék / szerelési specifikáció | Futóhossz `m`, darabszám `db`; megszakítás, csomópont és kivitelezési szabály forrása szükséges | Geometriai futásmodell után |
| Tetőléc | Ellenőrzött fedési modul / gyártói léctávolság, orom- és ereszkezdő szabály, nyílások | Soronkénti hossz `m`, sor/db és összesített lécmennyiség; általános spacing nem feltételezhető | Tetőfedési termék-contracttal együtt |
| Alátétfólia | Tetősík lefedési geometria, gyártó által megadott tekercsméret, átlapolás, eresz/gerinc/vápacsatlakozás és áttörések | Sávkiosztás és tekercs-felhasználás; nettó felület önmagában nem ad rendelési mennyiséget | Termékspecifikáció és csomóponti szabályok után |
| Tetőkiegészítők | Gerinc/eresz/orom/áttörés élek és termékkompatibilitás | Darab vagy futóméter; végzáró, szellőzés, rögzítő kiosztás csak forrásolt gyártói paraméterrel | Katalóguskompatibilitás után |

Zhitov oldalak kizárólag funkcionális összehasonlításra lettek ellenőrizve: a nyeregtető referencia külön geometry, szarufa, léc, lemezméret és overlap bemeneteket mutat; a sátortető-oldal saját kontúrt, szarufa- és lécparamétereket, részrajzokat sorol. Ezek nem normatív források, és képleteik nem kerülnek átvételre. [Nyeregtető referencia](https://www.zhitov.com/hu/roof2/), [sátortető referencia](https://www.zhitov.com/hu/hip_roof/). A jelen projektben a termékspecifikus fedés, gyártói átfedés, veszteség, rögzítési kiosztás, megengedett szarufa-keresztmetszet és statikai kapacitás továbbra is nincs igazolva; egyik sem kerül DEMO alapértékként bevezetésre.

## F9.7.6.6.3.1 — véglegesítés és PDF architektúraterv

Az aktuális projekt `QuotationPdfDocument` A4 React-PDF layoutja és a
`renderQuotationPdf` buffer-adapter újrahasználandó, közös issuer/recipient/
document adatkontrakttal. A projekt-route tagság-, project-, quote- és
revision-ellenőrzésű; finalized státusznál a `finalized_revision_id`-t olvassa,
private no-store PDF-et streamel. Standalone-ra külön creator + aktív tagság +
scope ellenőrzésű route kell. Az `organizations` jelenlegi `name` mezőjén kívül
nincs kibocsátói cím/adóazonosító; a client adat opcionális; nincs emberi
ajánlatszámozás vagy érvényességi mező.

A jelenlegi `net/gross` csak egységes árbesorolás. A HUF tételösszeg
`NUMERIC(20,2)`/half-up szerveroldali összegzés bizonyított, de ÁFA-kulcs,
tax category, adóösszeg és historical tax snapshot nincs. Nettó/bruttó közti
átváltás és kitalált tax treatment nem megengedett; a véglegesítés fail-closed,
amíg könyvelő/adótanácsadó nem hagyja jóvá a kibocsátói/címzett minimumot,
tax profilokat/kerekítést, sorszámozást és érvényességi szabályt.

A 6.3.2 terv immutable issue snapshot + expected version/revision, `FOR UPDATE`,
creator/org/scope ellenőrzés és idempotens issuance RPC; közös rendererből
on-demand PDF; projekt-regresszió; majd security/financial/concurrency/browser
acceptance. Nincs implementálva migráció, finalize RPC, adómotor vagy standalone
PDF. Részletes terv: `docs/QUOTATION_FINALIZATION_DESIGN.md`.

Ellenőrzés: célzottan ellenőriztük a F8.1/F8.3.1/F8.3.2 adatbázis-szerződést,
`quotation-document.tsx`, `quotation-pdf.ts`, a projekt PDF route/action,
quotation migrációkat és a schema/org/client mezőket. Ebben a milestone-ban
csak dokumentáció módosult; nincs új kód, DB, teszt vagy browser futtatás.

## F9.7.6.6.3.2b — pénzügyi/adó contract

Az additív `20261014040300` migráció a `quotation_revisions` táblán új
`financial_contract` JSONB pillanatképet állít elő INSERT-kor. A trigger a
DB-ben kiszámított HUF részösszegből és a meglévő `price_class` mezőből veszi
az input price basis-t; a régi sorokat nem backfill-eli. A sorsnapshotok továbbra
is tartalmazzák a konkrét sorértékeket, ezért nincs második, eltérhetőséget okozó
line-total másolat.

A tax-treatment mező `unresolved`; tax amount és fizetendő összeg `null` marad.
NET inputnál csak a nettó összeg jelenik meg, GROSS inputnál csak a rögzített
bruttó árbesorolás összege. Egyikből sem következtetünk a másikra. Approved
tax rule nincs; adóazonosító nem működő konfiguráció, org default nincs,
szabad tax label nem executálható. Issuance readiness a creator + org-scope
ellenőrzés után a jelenlegi revíziót, complete line-okat, HUF-ot és DB/domain
összegegyezést validálja; adókezelés, számkiosztás és finalize továbbra is
blokkoló. A readiness nem allokál dokumentumszámot.

Lokális pgTAP: a bővített `018_standalone_quotations.sql` 38/38 PASS és a
`019_quotation_document_data.sql` 29/29 PASS; valós local Auth 9/9 PASS. Egy
fókuszált editor/readiness browser smoke PASS. Teljes tesztkészlet és projekt-PDF
regresszió nem futott; részletek a [TEST_MATRIX](TEST_MATRIX.md) 6.3.2b sorain.

## F9.7.6.6.3.2c — mentett standalone PDF piszkozat-előnézet

Az editor csak mentett revízió mellett mutatja a `PDF-előnézet` műveletet. Ha a
helyi ajánlati vagy kibocsátói profil módosult, a felhasználó külön választhatja
a mentést, az utolsó mentett revízió előnézetét vagy a megszakítást. Az előnézet
explicit revízióazonosítót ad át, így történeti revízió is a saját immutable
snapshotját jeleníti meg.

A `/api/ajanlatok/[quotationId]/pdf` route sessiont és aktív tagságot kér,
creator-owned standalone ajánlatot ellenőriz, majd a meglévő
`get_standalone_quotation_revision` RPC-vel olvas. Nem fogad organization ID-t
a böngészőtől. A project PDF React-PDF dokumentuma változatlan; a közös adapter
standalone-draft ága az A4/font/stílus elemeket újrahasználja. A mentett issuer,
recipient, dokumentumszöveg, sorár, `lineTotal`, subtotal, pénznem és revision
ID a forrás; aktuális ügyfél- vagy katalógusadatot nem olvas.

Pénzügy: csak konzisztens HUF/net revision renderelhető, a feliratok
`Nettó egységár`, `Nettó tételösszeg`, `Összesen nettó`. Minden PDF-oldal jelöli
a `PISZKOZAT` és `NEM VÉGLEGES AJÁNLAT` állapotot, plusz a rövid tájékoztatást.
Nincs adó, bruttó/fizetendő összeg, kiállítási dátum vagy szám; invalid snapshot
422 hibával áll le. A route csak olvas és `private, no-store` választ ad.

Lokális ellenőrzés: fókuszált PDF/adatvalidáció és route authorization tesztek,
React-PDF bytes és ötoldalas PDF szövegkivonat (minden oldalon draft-jelölés),
HUF/net címkék és hiányzó VAT/fizetendő/bruttó címkék; authenticated DEMO V1
mentés → PDF megnyitás → editorba visszatérés. A PDF után a szerkesztő V1 maradt.
Részletes teszteredmény a `TEST_MATRIX.md` F9.7.6.6.3.2c blokkjában.

Korlát: standalone preview nem issuance. `canIssue = false`; adójóváhagyás,
kiállíthatósághoz szükséges adatok, atomikus finalize, hivatalos dokumentumszám
és hivatalos PDF továbbra sincs. iPad/iPhone QA külön nem futott.

## F9.7.7.1 — projekt nélküli trapézlemez-fedés előnézet

A globális nyeregtető-előnézet a meglévő `roof.gable` geometriából ad közös
fedési alapot. Az explicit névleges és hasznos fedési szélesség, kiválasztott
lemezhossz és opcionális toldási adatok kézi inputok; automatikus katalógus-
hozzárendelés vagy mentés nincs. A project roof editor is eléri ugyanazt a
panelt a szerkesztett geometriával, mentéstől független élő előnézetként.
Mindkét út csak két szimmetrikus, téglalap alakú nyeregtető-síkot támogat.
Ismeretlen adatoknál a panel nem mutat kiosztási rajzot vagy sikeres darabszámot.
Az eredmény előzetes becslés, nem rendelési vagy gyártási terv.

