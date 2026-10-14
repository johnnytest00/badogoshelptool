# Önálló munkafolyamatok — architektúra

## Jelenlegi állapot

- A globális eresz-, szegély- és profilkalkulátor preview továbbra is kliensoldali, de a F9.7.6.3 backend már tudja menteni, listázni és visszaolvasni a három támogatott önálló számítást. Frontend mentési/újranyitási UX és anyagkimutatás-átadás nincs; ezek a F9.7.6.4 és későbbi határai.
- A `calculations.project_id` projekt scope-ban továbbra is kötelező a scope constraint szerint; a táblaszintű oszlop nullable lett, hogy a külön `standalone` scope project és roof kapcsolat nélkül élhessen. A revíziók immutable-ok; standalone rekord nem kerül a projekt dependency DAG-ba.
- Az eresz- és szegélybecslés RPC-je szervezeti tagságot, létező projektet és expected revisiont ellenőriz, majd szervezet/projekt/kalkulátortípus szerint sorosítja a mentést. Projektenkénti egyedi index van. A profillekérdezés is szervezet és projekt szerint szűr.
- A standalone gutter/flashing bemenetben a tetőgeometriai forrásreferenciák nullok és SQL/RPC szinten is elutasítottak; a profil saját, önálló geometriát tárol. Projektkalkulátorok korábbi forráskezelése változatlan.
- A `quotations.project_id` kötelező, az ügyfél opcionális. A piszkozatmentő RPC projektet ellenőriz, az action projektdokumentum-pillanatképet tölt, a PDF route pedig project ID alapján tulajdonlást ellenőriz és projektmetaadatot ad a dokumentumhoz.
- Az ajánlati tételek típusa `MATERIAL`, `LABOR` vagy `OTHER`; a takeoff-import választható, anyagsornál viszont katalógusvariáns kell. HUF, `NUMERIC(20,2)`, fixpontos TypeScript összegzés, nettó vagy bruttó besorolás, nincs ÁFA-motor. A revízió sor-, ár- és forrás-pillanatképe immutable.
- A jelenlegi UI-ban minden kitöltött sorhoz mennyiség, egység, megnevezés és érvényes egységár kell. A jövőbeli, hiányos sorokat is őrző draftnak külön részleges draft-szerződés kell; a véglegesítés már megköveteli az ügyfelet, az egységes árbesorolást és a hiánytalan pénzügyi adatot.
- Kivitelezési tervek projekt- és szervezetkapcsoltak. A meglévő projektlekérdezés összetett listát, naplót, eseményt, fotót és rövid idejű privát signed URL-t ad, ezért a globális áttekintő csak külön, szűkített tervlistát kér.
- Nincs általános dokumentumtár-listázó vagy `documents` tábla. Az ajánlati PDF projekt/ajánlat/revízió-ellenőrzésű API-válasz, a kivitelezési fotó pedig privát Storage objektum, projekt-metaadat- és tagsági ellenőrzéssel. Ezeket nem szabad globális public URL-listává alakítani.

## Javasolt standalone-adattulajdon

Minden új rekordnak legyen kötelező `organization_id`-je és létrehozója. A projektkapcsolat legyen opcionális, de csak olyan rekordnál, amelynek minden hivatkozott projektforrása ugyanahhoz a projekthez tartozik. A személyes „Mentett számításaim” szűrőhöz stabil parent `created_by`/owner mező kell; a jelenlegi számítás-fejlécről ez hiányzik. Dönteni kell, hogy a műhely minden tagja olvashatja-e az önálló számításokat, vagy a létrehozó és kijelölt szerepkörök férnek hozzá.

Ne kerüljön be dummy projekt. A projekt `NOT NULL` elhagyása csak az összes olvasó, RPC, egyedi index, FK, RLS-policy, dependency és kalkulátor-adapter auditja után történhet. A migráció meglévő projektadatot változatlanul hagyjon, és a projektkötött mentési szerződést regressziótesztek védjék. A korábbi revízió ne kapjon utólag átírt forrást.

Projekt-hozzárendelésnél elsőként append-only, szervezeti `calculation_project_links` kapcsolótábla javasolt konkrét számítás/revízió és célprojekt megadásával. Ez a történeti rekordot nem mozgatja. Kapcsolás csak projektfüggetlen bemenetnél lehetséges; projektforrású rekordot explicit újraszámítással kell a célprojektbe átadni, új forrás-provenance-szel. A célprojekt, az eredeti rekord és minden forrás ugyanazon szervezethez tartozzon. A művelethez user-megerősítés, idempotens request key és változatlan előzmény kell. Ajánlatnál a későbbi projekt-hozzárendeléshez hasonló, auditálható kapcsolat vagy új, projekthez kötött ajánlati példány kell; a végleges dokumentum fejlécét nem lehet némán átírni.

## Önálló árajánlat függőségei

Külön migráció és szerződésfrissítés szükséges a nullable projektkapcsolathoz vagy projektkapcsolati táblához, a piszkozat/finalizált állapotok eltérő ellenőrzéséhez, valamint a dokumentum-metaadat forrásához. A `save_quotation_draft` jelenlegi `p_project_id` bemenete, projekt- és ügyfél-ellenőrzése, a `quotation_revisions` snapshot, a véglegesítő RPC, a status-event logika és a PDF API mind érintett. A PDF-nek projekt nélkül is egyértelmű szervezeti és ajánlati snapshotból kell építkeznie; ügyfél- és jogi adatok kötelezővé tételéről nincs elfogadott teljes követelmény, ezért ilyet nem szabad feltételezni.

A manuális munkadíj/egyéb tétel adatmodellje már létezik, a takeoff nem kötelező. Katalógusanyaghoz továbbra is műhelyen belüli variáns és opcionálisan rögzített ár-pillanatkép szükséges. A hiányos draft új validációs állapotot és tesztelt PDF/finalizálási tiltást igényel. Pénzskála, HUF, nettó/bruttó egységesség, történeti árak és immutable revíziók változatlanul megőrzendők; ÁFA-kulcs nem következtethető.

## Biztonsági és integritási követelmények

- Szerveroldali auth contextből kiválasztott szervezet; böngészőből érkező szervezet- vagy projekt-azonosító önmagában nem jogosít.
- RLS minden standalone üzleti táblán, `private.is_org_member(organization_id)` vagy pontosabb szerepkör-szabállyal. RPC `SECURITY INVOKER`, szűkített `search_path`, explicit authenticated EXECUTE.
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

