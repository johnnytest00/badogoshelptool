# F2.1 adatbázis-alap

## F9.52 — meglévő tetőrészletek a felmérésszakaszban (2026-10-20, csak helyi)

Migráció: `20261020090000_survey_roof_details.sql` — kizárólag a `private.valid_field_survey_sections` validátor `create or replace`-e. Új, opcionális `roofDetails` szakaszkulcs (legfeljebb 30 bejegyzés, egyedi UUID): `kind` (chimney/skylight/hatch/vent/penetration/valley/wall_junction/gutter/downpipe/flashing/other), `status` (absent/present_unmeasured/measured), `count`/`widthMm`/`heightMm`/`lengthM` (pozitív vagy `null`; mm egész, hossz legfeljebb mm pontosságú m), `note` (≤500). A megerősített hiányhoz nem tartozhat érték, a `measured` állapothoz legalább egy érték kell, és a kulcs csak `workType = 'roof'` szakaszban nem üres. Tábla, RPC, jogosultság, geometriaforrás és meglévő revízió **nem** változik; a kulcs nélküli régi szakasz változatlanul érvényes. Hosted DB-re nincs alkalmazva.

## F9.42 — munkanapló-kapcsolatok (2026-10-18, csak helyi)

Migráció: `20261018100000_execution_plan_document_links.sql`; teszt: `supabase/tests/database/040_execution_plan_document_links.sql` (24 állítás, helyi PASS). Hosted DB-re nem alkalmazva.

- `execution_plan_document_links`: visszavonható kapcsolat munkanapló és `material_preparation_lists` (projekt nélküli) vagy önálló `quotations` között; összetett `(id, organization_id)` FK-k; aktív kapcsolat egyedi (részleges unique index), `unlinked_at/by` egyszeri időbélyeg, `request_key` idempotencia, törlés és átpointolás tiltott (trigger `55000`).
- RLS: csak select `authenticated` részére, a kapcsolat azoknak látszik, akik a dokumentumot is látják (alkotó-hatókörű önálló lista/ajánlat); írás kizárólag `link_execution_plan_document` / `unlink_execution_plan_document` (security definer, org-tagság, actor, azonos szervezet, alkotó-hatókör ellenőrzés). A létrehozáskor munkanaplóhoz kötött lista `execution_plan_id`-je változatlanul immutable; ahhoz nincs link.
- A meglévő `field_survey_execution_plan_links` (felmérés↔munkanapló) változatlan, immutable.

## F9.42.1 — munkadíj-szabályok (2026-10-18, csak helyi)

Migráció: `20261018110000_organization_labor_rates.sql`; teszt `041_organization_labor_rates.sql` (PASS). `organization_labor_rates`: append-only szabály (alap, HUF díj, nettó/bruttó), tagok olvashatják; írás csak `create_/archive_organization_labor_rate` RPC-vel, tulajdonos/admin, idempotens; törlés/átírás trigger tiltja. Hosted DB-re nincs alkalmazva.

## F9.42.6 — független felmérés-tetőgeometria (2026-10-18, csak helyi)

Migráció `20261018130000_survey_roof_geometry_sources.sql`, teszt `043_survey_roof_geometry_sources.sql`. Új immutable `field_survey_roof_geometry_sources` (egyedi: `survey_revision_id`+`section_id`; RLS-olvasás `can_access_field_survey`; módosítás/törlés 55000). Író: `save_survey_roof_geometry_source_secure` (csak `tetopro_covering_writer`; bemenet-egyezés `survey_roof_input_matches`, idempotens). `save_workflow_material_list_from_survey_revision` új `surveyGeometry` ágat kapott (újradefiniált függvény, a többi ág változatlan).

## F9.42.2 — munkadíj-provenance az önálló ajánlatsorban (2026-10-18, csak helyi)

Migráció `20261018120000_quotation_labor_source.sql`, teszt `042_quotation_labor_source.sql`. A `LABOR` sor `line_items_snapshot` elemében opcionális `laborSource` (szabály-id és pillanatkép, anyaglista/revízió/tétel, felmérés/revízió/verzió, forrás címke, ellenőrzött mennyiség és mértékegység), amelyet az RPC a DB-ből épít; a korábbi sorok és revíziók változatlanok.

## F9.31 — legacy kalkulátor függőségek és írójavítás (2026-10-17)

A részletes runtime caller/adatfüggőségi tábla és kockázati döntés a
[`F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md`](F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md)
fájlban van.

- A projekt lemezkiosztás aktív workflow. A `20261017120000_secure_sheet_layout_writer.sql`
  additív `sheet_layout_save_operations` idempotencia-ledgert és
  `save_metal_sheet_layout_secure` RPC-t vezet be. A SECURITY DEFINER wrapper
  rögzített üres search path-tal fut, ellenőrzi a `p_actor_id` szervezeti
  tagságát és a projekt szervezeti hovatartozását, művelet- és tetőkulcson
  advisory lockot vesz fel, azonos kérésnél visszaadja az eredeti revíziót,
  eltérő payload esetén hibázik. Az új RPC EXECUTE joga kizárólag
  `tetopro_covering_writer`; a régi `save_metal_sheet_layout` authenticated
  EXECUTE joga visszavonva.
- A secure wrapper a már létező `save_metal_sheet_layout` validálóját hívja a
  korlátozott definer kontextusból, explicit `request.jwt.claim.sub` actorral.
  Ezzel megmarad a current roof revision, gable calculation revision,
  anyagvariáns, expected revision, immutable calculation revision és két
  dependency ellenőrzése; az authenticated source `FOR UPDATE` RLS hibája
  megszűnik a projekt mentési útvonalán. A wrapper nem ír át korábbi
  számításokat/revíziókat és nem változtatja a sheet-layout/takeoff szerződést.
- A forrásolt gable és többtetős flashing mentés egyaránt a már meglévő,
  `tetopro_covering_writer`-re korlátozott
  `save_multi_roof_flashing_calculation` RPC-t használja. A korábbi hibás
  gable ág csak az `outputField = 'edges'` esetet különítette el; most minden
  tetőél-hivatkozás a restricted writerhez kerül. Hivatkozás nélküli kézi
  projekt-szegély mentés továbbra is a támogatott
  `save_flashing_material_calculation` utat használja. E function grantját nem
  vonjuk vissza, mert kézi mentés és standalone-association kompatibilitás
  használja.
- A standalone flashing UI útvonal paraméter nélkül a Kalkulátorok oldalra
  irányít. Meglévő `ownership_scope='standalone'` rekordot a meglévő olvasó és
  revíziólista adja vissza read-only nézetben. RPC-k, saved records, legacy
  URL-ek és project/survey history nem kerülnek törlésre. Hosted rekordok
  darabszáma nincs ellenőrizve.
- A felmérési shared roof geometry, a projektbeli roof model, valamint a
  layout és flashing calculation revisions `calculation_dependencies`
  upstream snapshotjai megmaradnak. A `create_sheet_layout_takeoff_draft` a
  felhasználó által ellenőrizhető anyagkimutatási piszkozatot készíti; nem
  hagyja jóvá automatikusan és nem teszi tényleges anyagfelhasználássá.
- **Helyi bizonyíték:** a migráció reset nélkül alkalmazva; a `001`, `009`,
  `011`, `029` pgTAP fájlok 228 assertionnel PASS. A downstream
  survey/material-list/quotation/work-log kör (`005`, `006`, `012`, `023`,
  `026`, `030`, `031`, `033`, `036`, `037`) 199 assertionnel PASS. A lokális
  Auth/RLS és kétkapcsolatos Vitest integráció 2 fájl / 6 teszt PASS. Teljes
  suite, hosted DB/Auth/RLS, hosted rekordmennyiség és fizikai mobil nincs
  ellenőrizve; hosted adat vagy DB nem módosult.

## F9.29 — korábbi regresszióállapot (2026-10-17; F9.31-ben javítva)

Az alábbi bejegyzés az F9.29/F9.30 vizsgálat idején fennálló állapotot őrzi,
nem a jelenlegi státuszt. A lokális migration ledger az F9.31 additív
`20261017120000` migrációjáig lett alkalmazva, reset nélkül. Az `001`, `009`,
`011`, `029` pgTAP fájlok és az aktív restricted writer útvonal gyökérok szerinti
frissítése után a négy fájl helyben 228 assertionnel PASS. A részletes új
viselkedést és korlátozásokat lásd az F9.31 auditban.

- `save_gable_roof_calculation` régi authenticated EXECUTE jogát a
  `20261015160900_secure_gable_roof_writer.sql` visszavonja. A gable írás
  jelenlegi útja a `save_gable_roof_calculation_secure` SECURITY DEFINER RPC,
  amit a szerveradapter a `tetopro_covering_writer` szereppel hív; az RPC
  `p_actor_id` alapján tagságot ellenőriz, műveletazonosítót, várt verziót és
  immutable source snapshotokat tart fenn. A `001`, `009` és `029` régi
  fixture-ei továbbra is a visszavont publikus RPC-t hívják, ezért ezek a
  kalkulációs mentést érdemben nem tesztelik.
- A `20261015161000_roof_model_browser_write_guard.sql` authenticated szerepre
  restrictive `UPDATE ... USING (false)` policyt vezet be a `roof_models`
  táblán. A `save_metal_sheet_layout` authenticated SECURITY INVOKER RPC mégis
  `FOR UPDATE` zárolja a source modellt. Az `001_foundation.sql` tagként
  futtatott próbája `40001` stale source hibával reprodukálja ezt; az RPC-t a
  `src/features/roof-models/sheet-layout-actions.ts` használja. A layout
  mentés és ebből az anyaglista-tervezet nem érhető el ebben az útvonalban.
- A `save_flashing_material_calculation` authenticated EXECUTE joggal maradt
  SECURITY INVOKER. A forrásolt gable-szegély esetén a `roof_models ... FOR
  SHARE` source-zárás a restrictive update policyval ütközik; az `011` próbája
  `P0002` hibát ad, a kliensoldali action ugyanazt az RPC-t hívja. A későbbi V2,
  dependency és revision-immutability állítások azért is buknak, mert a V1
  létrehozása előtte megszakad.
- Javítás külön backend mérföldkő: célzott, szerveroldali writer vagy ugyanilyen
  szűkített SECURITY DEFINER út, explicit actor/org-tagság és projekt/source
  ellenőrzéssel, expected-version/idempotencia és változatlan revízió-
  immutabilitás mellett. Ezt biztonsági és konkurenciatesztekkel kell igazolni;
  F9.29-ben sem migráció, sem tábla/policy-jogosultság változás nem történt.

### F9.30 célzott helyi újrafuttatás

Az F9.30 UI/geometry változása nem módosít adatbázis-kódot. A négy érintett
pgTAP fájl helyi újrafuttatása (Supabase reset és hosted kapcsolat nélkül) a
korábbi hibákat ismételte: `001` 28/172 assertion fail, köztük a layout
source-lock `40001`; `009` és `029` az első legacy gable RPC EXECUTE hibánál
abortált (3/21, illetve 2/9 teszt futott); `011` 14/19 assertion fail, az első
source-linked flashing V1 írás `P0002`. Az `011` későbbi assertionök a V1
hiányából részben kaszkádolnak. A teljes reprodukció és külön javítási terv:
[`docs/F9_30_SIMPLIFICATION_AUDIT.md`](F9_30_SIMPLIFICATION_AUDIT.md).

## F9.7.6.6.1 — standalone quotation backend

`20261014030000_standalone_quotations.sql` a meglévő quotation/revision táblákat
bővíti. A `quotations.ownership_scope` értéke `project` vagy `standalone`; a
projekt FK-ja nullable, de CHECK tiltja a projekt nélküli project rekordot és a
projektes standalone rekordot. A korábbi rekordok projekt scope-ban maradnak.
Standalone tulajdonos a DB által `auth.uid()`-ból beállított `created_by`, aktív
szervezeti tagsággal. Az RLS a standalone parentet és revíziót csak a creatornek
mutatja; projekt ajánlatnál a korábbi tag-szintű láthatóság él tovább. A
030000-as migráció első alkalmazása előtt talált GUC-megkerülést ugyanebbe a
migrációba javítottuk: a közvetlen authenticated parent/revision írás csak
project scope-ra engedett, a ledger közvetlen INSERT-joga visszavont. A
standalone save SECURITY DEFINER RPC explicit actor/org ellenőrzésekkel,
rögzített `pg_catalog, public` search_path-szel ír; a kliens által
beállítható custom GUC önmagában nem jogosultsági határ.

`save_standalone_quotation_draft` új és frissítő műveletként egy tranzakcióban
menti a jelenlegi draftot és immutable revisiont. Az expected version a stale
írást utasítja el. A szervezet + creator + operation UUID egyedi idempotencia
kulcs; a ledger ugyanahhoz a revisionhöz kötődik, azonos payload retry
újrahasználja a mentést, payload eltérés hibát ad. `get_standalone_quotation_revision`
ellenőrzi az org tagságot és tulajdonost, majd current vagy történeti revíziót ad.

A HUF sorösszeg és részösszeg PostgreSQL `numeric` műveletből, soronként `round`
fél-felfelé szabállyal készül; egységár max. 2, mennyiség max. 6 tizedes. A
nettó/bruttó osztály vegyesen tiltott; ÁFA-kulcsot nem számítunk. Anyagvariáns
csak azonos org aktív katalógustermékéből jöhet. Kiválasztott material price
recordnál a DB újraellenőrzi HUF-ot, árat, egységet és ár-besorolást; kézi
felülírás provenance-ja egyértelmű. Az `input_snapshot` és `line_items_snapshot`
megőrzi a mentéskori ár/adat eredetet.

Ellenőrzés: a nem linkelt helyi Supabase futott; a migration history a 030000
előtti állapotot mutatta. A migráció reset nélkül sikeresen lefutott. A
`018_standalone_quotations.sql` 33/33 pgTAP, releváns `002`–`004` projektajánlat
pgTAP 27/27 PASS. A `scripts/verify-standalone-quotation-backend.mjs` helyi Auth
tesztje 43/43 PASS, valós JWT-kkel és két várakozó PostgreSQL backend-sessionnel
mérve az idempotens létrehozást és az expected-version konkurenciát. Auth/RLS,
pénzügyi, revision snapshot, accepted project history immutability és project
draft/V2 RLS-regresszió futott. A PostgREST Auth RPC-n kívül a Next Server
Action/cookie útvonal nem futott. Teljes project PDF/takeoff/status regresszió
nem történt; DB reset/remote művelet nem volt.

## F8.1 — belső ajánlati piszkozatok

A `quotations` projekt- és szervezetkapcsolt fejlécet, az aktuális revízió
azonosítóját és optimista `version` mezőt tartalmaz. A `quotation_revisions`
immutable input-, tétel- és összesítési snapshotot őriz; új mentés új revízió,
azonos bemenetnél idempotens. A `save_quotation_draft` SECURITY INVOKER RPC
tagságot, projekt/ügyfél-tulajdonlást, katalógus- és jóváhagyott takeoff-forrást
ellenőriz, majd várt verzióval zárolva ment.

A pénz HUF, az egységár legfeljebb 2, a mennyiség legfeljebb 6 tizedesjegyű;
az összegzés PostgreSQL `NUMERIC(20,2)` és TypeScript `bigint` fixpontos
aritmetika alapján, fél-felfelé kerekítéssel készül. Nettó és bruttó sor nem
keverhető, VAT-kulcs és automatikus átszámítás nincs. A katalógus- és árrekord,
valamint az approved anyagkimutatás forrása a revízió JSON snapshotjába kerül,
így későbbi módosítás nem írja át a történelmet.

## Lokális workflow

A repo a Supabase CLI imperatív migration workflow-ját használja:

```bash
supabase start
supabase db reset --local
supabase test db
supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts
```

`db reset --local` kizárólag a lokális, eldobható adatbázist érinti. Távoli
kapcsolat, `supabase link`, `db push` és production-módosítás ebben a fázisban
nincs beállítva és nincs végrehajtva.

## Adatmodell és izoláció

Az F2.1 első üzleti táblái: `profiles`, `organizations`,
`organization_members`, `clients`, `projects`. A tagság összetett elsődleges
kulcsa egy felhasználót több szervezetben, egy szervezetet több felhasználóval
enged kezelni. Ügyfél és projekt minden esetben szervezethez kötött.

A projekt `client_id` + `organization_id` összetett idegen kulcsa a DB-ben is
kizárja, hogy egy projekt másik szervezet ügyfelére hivatkozzon. Az
`organization_id` módosíthatatlan triggerrel; a projekt `version` mezője a
későbbi optimista konkurenciakezelés alapja.

## RLS és jogosultság

- Minden üzleti tábla RLS-t használ; az `anon` szerepkörnek nincs üzleti grantje.
- A profil csak saját maga számára olvasható és módosítható.
- A szervezethez tartozó adatokhoz aktív tagság kell.
- Ügyfél- és projekt-CRUD csak szervezeti tagként lehetséges.
- Tagság beszúrására, törlésére vagy szerepmódosítására nincs authenticated
  policy; a biztonságos bootstrap az F2.2 szerveroldali feladata.
- A tagsági policy-k nem olvassák közvetlenül újra ugyanazt a táblát; a
  `private` sémában lévő, szűkített `SECURITY DEFINER` helper-ek kerülik a
  rekurziót, üres `search_path`-tel és korlátozott EXECUTE joggal.

## Seed és tesztelés

`supabase/seed.sql` csak lokális, egyértelműen DEMO felhasználókat és üzleti
rekordokat tartalmaz; nincs benne használható jelszó, valódi ügyféladat vagy
production kapcsolat. A `supabase/tests/database/001_foundation.sql` pgTAP
tesztekkel ellenőrzi a táblákat, kulcsokat, indexeket, RLS-t, saját és idegen
profil-hozzáférést, tagság-hamisítást, jogosulatlan írást, tagság-visszavonást
és a kereszt-szervezeti projekt–ügyfél hivatkozás elutasítását.

Az F2.2-ben az alkalmazás a lokális Supabase Auth-hoz csatlakozik a
`src/infrastructure/supabase/browser.ts`, `server.ts` és `src/proxy.ts`
adaptereken keresztül. A szerveroldali identity-ellenőrzés `getClaims()`-t
használ, a meglévő `profiles`, `organizations` és `organization_members`
adatokra támaszkodik, és több tagság esetén nem választ szervezetet csendben.
Service-role kulcs böngészőbe nem kerülhet; a bootstrap csak memóriában használja
az admin kulcsot, és a jelszó nincs tracked fájlban.

Helyi Auth felhasználó létrehozása:

```bash
npm run db:local-env
LOCAL_AUTH_PASSWORD='helyi-jelszó' npm run db:local-auth
```

`db:reset --local` után a lokális Auth bootstrap szükség esetén újrafuttatandó.
Távoli login, `supabase link`, `db push` és hosted adatbázis-módosítás továbbra
sem része a workflow-nak.

## F2.3 verziózott tető- és kalkulációs adatok

Az F2.3 külön migrációban (`20261012010000_versioned_calculation_architecture.sql`)
vezeti be az alábbi entitásokat:

- `roof_models`: több tetőmodell egy projekten belül, `gable`, `shed`, `hip`,
  `other` típusokkal; a projekt és a szervezet összetett FK-val együtt védett.
- `roof_model_revisions`: immutable geometriai JSONB snapshot, szülőnként egyedi
  revíziószám, séma-verzió, szerző és explicit provenance állapot.
- `calculations`: projekten belüli kalkulátor-példány; a tetőmodell opcionális,
  ezért önálló csatorna- vagy más munka is modellezhető.
- `calculation_revisions`: immutable input/output snapshot, input schema és
  calculator implementation version, provenance, warning és validation metadata.
- `calculation_dependencies`: konkrét kalkulációs revíziók közötti vagy tetőmodell
  revízióból induló, revision-level irányított gráfél.

Mind az öt új tábla RLS-es és az authenticated szerepkör számára explicit grantot
kap. A policy-k a meglévő `private.is_org_member()` helperen alapulnak. Az
összetett FK-k kizárják a szervezetkeverést; a dependency validátor ezen felül
azonos projektre kényszerít, tiltja az önhivatkozást és tranzakciónként ellenőrzi
a ciklust. A gráfellenőrzés alkalmazási event queue vagy háttérfolyamat nélkül,
adatbázis-triggerben történik.

### Revízió- és frissességi szabály

Egy új geometriai vagy kalkulációs input mindig új revíziót jelent. A korábbi
snapshotok update/delete műveletét adatbázis-trigger tiltja, nem csak az RLS.
Az egyedi `(parent_id, revision_number)` constraint ütközés esetén megvédi a
párhuzamos revízió-létrehozást; alkalmazási szinten a hívó újraolvassa a legutolsó
számot és újrapróbálhatja a tranzakciót. A `current_revision_id` csak a saját
szülőjéhez tartozó revízióra mutathat.

A `current`, `stale`, `invalid` kalkulációs állapotok a későbbi újraszámítás
alapjai. F2.3 nem hajt végre újraszámítást; a dependency élekből később
meghatározható, mely revíziók váltak elavulttá. A DEMO és becsült adatok nem
minősülnek szakmailag igazoltnak.

### TypeScript szerződések

A Supabase által generált adatbázistípusok külön maradnak a
`src/domain/calculations/contracts.ts` Zod-szerződéseitől. A domain szerződések
elválasztják a nyers inputot, származtatott eredményt, kézi felülírást,
adatforrást és validációs üzeneteket. Matematikai kalkulátor vagy anyagérték
ebben a mérföldkőben nincs implementálva.

## F3 projekt- és ügyfélkezelés

Az F3 a meglévő `projects` és `clients` táblákat használja új üzleti táblák
bevezetése nélkül. A projektek szerveroldali, bounded lekérdezéssel listázhatók
név, státusz, munkatípus és módosítási idő szerint. Az archived projektek az
alaplistában rejtve maradnak, külön szűrővel láthatók.

Az `20261012020000_project_management.sql` migráció hozzáadja a
`projects.previous_status` mezőt. Archiváláskor a szerver az adatbázisban lévő
aktuális státuszt menti ebbe a mezőbe; visszaállításkor ugyanebből állítja vissza
a projektet. Így a kliens által küldött tetszőleges státusz nem írhatja felül a
workflow-előzményt.

F3-ban nincs végleges projekt- vagy ügyféltörlés: az authenticated szerepkör
`DELETE` grantje mindkét tábláról vissza lett vonva. A projektek duplikálása csak
az alap projektadatokat másolja új azonosítóval és `draft` státusszal; tetőmodell-,
kalkulációs- és immutable revíziók nem kerülnek át az új projektbe.

Az alkalmazási server actionök minden alkalommal hitelesítést és aktív
szervezeti tagságot ellenőriznek, az organization ID-t nem fogadják el önmagában
megbízhatóként. A DB RLS ettől független második védelmi határ.

Projektmódosításnál a `projects.version` feltételes update része. Ha a várt
verzió nem egyezik, a mentés nem történik meg és a felhasználó konfliktusüzenetet
kap. Ez megakadályozza a néma stale felülírást; valódi több-session terheléses
teszt későbbi stabilizálási feladat.

Az ügyfél oldalon csak a név kötelező. Az e-mail Zod- és adatbázis-validációt kap,
a telefonszám szándékosan enyhe szöveges mező, így magyar és nemzetközi formátumok
is elfogadhatók. A DEMO ügyfél és F2.3 seedadat továbbra is egyértelmű DEMO jelölésű.

## F8.3.1 — véglegesítés

A 20261013030000_quotation_finalization.sql a státusz-enumot draft és finalized
értékekre bővíti. A quotations.finalized_revision_id, finalized_at és
finalized_by mezők összetett FK-val és state constrainttel rögzítik, hogy a
véglegesített ajánlat melyik immutable revízióhoz tartozik.

A finalize_quotation SECURITY INVOKER RPC aktív tagságot, azonos szervezetű
projektet, aktuális revíziót, expected versiont, ügyfelet, nem üres tétellistát,
egységes net/gross besorolást, pozitív mennyiséget, nem negatív árat és teljes
HUF összesítést ellenőriz. A FOR UPDATE zár és a finalize-guard trigger
megakadályozza a stale vagy párhuzamos lezárást, illetve a későbbi módosítást.

A PDF route finalized ajánlatnál figyelmen kívül hagyja a kliens által kért másik
revíziót és kizárólag a rögzített finalized revisiont tölti be. A duplikálás
szerveroldalon új quotation identitást és az immutable snapshot alapján új draft
v1 revíziót készít; az eredeti sorok és pénzügyi értékek nem módosulnak.

## F5 gable kalkulációs mentés

Az `20261012030000_gable_calculation_persistence.sql` migration hozzáadja a
`public.save_gable_roof_calculation` SECURITY INVOKER függvényt. A függvény az
authenticated session `auth.uid()` értékével és a meglévő RLS-policy-kkal együtt
ellenőrzi a tagságot, projektet és szervezetet. Egy tranzakcióban hoz létre új
`roof_model_revisions` és `calculation_revisions` snapshotot, frissíti a current
pointereket, valamint létrehozza a `roof_model_input` dependency élt.

A korábbi revíziók immutable-ok maradnak. A várt aktuális revíziószám eltérése
`40001` hibával leállítja a mentést, így a szerver nem írja felül csendben a
közben mentett adatot. A függvényhez anon és public EXECUTE nincs; service-role
nem szükséges. A `roof.gable` input/output JSON-t az alkalmazás a tiszta domain
kalkulátorral ellenőrzi és számolja ki a függvény meghívása előtt.

Ez a F5 leírás az eredeti RPC-történetet rögzíti. A jelenlegi írási jogosultságot
a F9.10 server-only átállás felülírja: authenticated kliens közvetlenül nem
hívhatja a régi `save_gable_roof_calculation` RPC-t.

## F7.2 anyagkimutatás

Az `20261012050000_material_takeoffs.sql` a mentett, ellenőrzött kalkulációs
revízióhoz kötött anyagkimutatás alapja. A `material_takeoffs` a projektet,
forráskalkulációt, forrásrevíziót és állapotot, a `material_takeoff_items` pedig
az anyagváltozatot, számítási módot, mérési forrást, eredeti és végső mennyiséget,
provenance-, anyag- és opcionális ár snapshotot tárolja.

Az approval RPC csak azonos szervezetű admin/tulajdonos számára engedélyezett,
ellenőrzi, hogy a forrásrevízió továbbra is a kalkuláció current revisionje-e,
majd atomikusan draftból approved állapotba vált. Approved kimutatás és tételei
triggerrel immutable-ok. A következő hardening migrációk külön trigger- és RLS-
policy javítást tartalmaznak; nincs remote adatbázis-hatás.

Az alkalmazási réteg újraszámolja a területet/vonalhosszt a szerver által betöltött
F5 snapshotból, nem tárol unsaved preview-t, és az ár kiválasztásakor a konkrét
F7.1 árrekordot snapshotolja. Anyag-layout, ajánlat, készlet, ÁFA és rendeléslogika
nem része az F7.2-nek.

## F7.1 anyagkatalógus

Az `20261012040000_material_catalog.sql` migráció négy szervezet-private táblát
hoz létre: `material_manufacturers`, `material_products`, `material_variants` és
`material_prices`. A termékek extensible kategória enumot használnak; a variánsok
beszerzési egysége külön enum, nem keveredik a F4 geometriai mértékegységeivel.
Az opcionális kategória-specifikus adatok a `technical_specs` JSON objektumban
maradnak, az ismeretlen mezők nullák vagy hiányzó kulcsok.

Minden új tábla UUID azonosítót, `organization_id`-t, timestamp mezőket, indexet,
RLS-t és explicit authenticated grantokat kap. A manufacturer → product → variant
→ price lánc minden kapcsolatán összetett `(id, organization_id)` FK akadályozza
meg a szervezetközi hivatkozást. Az organization ID immutable triggerrel védett;
az actionök ettől függetlenül sessiont és aktív szervezeti tagságot ellenőriznek.

A material product nem törölhető a normál authenticated felületről; archiválás és
visszaállítás használható. Az árrekordok append-only történetet alkotnak. A
`material_prices` `NUMERIC(14,2)` HUF összeget tárol, nincs automatikus ÁFA- vagy
árszámítás. A legfrissebb alkalmazható ár meghatározása: `effective_date DESC`,
majd `recorded_at DESC`, majd `id DESC`. A `20261012040100_material_price_immutability.sql`
trigger privilegizált SQL útvonalon is tiltja az ár UPDATE/DELETE műveletét.

**F9.43 beszállítói áropciók:** `material_price_options` (`variant_id`, `label` ≤60, `status` active/archived,
egyedi `(variant_id, lower(btrim(label)))`) és `material_prices.option_id` (nullable; null = régi „Alap ár”).
Az opció egy beszállítói sor; ára az `option_id`-jú immutable sorok legfrissebbje. A beszúró trigger
ellenőrzi az azonos variánst, az aktív opciót és az egységet, és a címkét a sor `source_name`-jébe másolja.
Nincs automatikus (legolcsóbb) kiválasztás. `revise_organization_labor_rate`: atomi, idempotens munkadíj-csere.

A provenance értékek `verified`, `user_provided`, `estimated`, `demo`, `missing`;
a felhasználó által bevitt adat nem lesz automatikusan verified. F7.1 nem tartalmaz
gyártói importot, scrapinget, mennyiségszámítást, automatikus vásárlási listát,
ajánlatot vagy shared marketplace-et.

## F7.3.2 verziózott lemezkiosztás

Az `20261013010000_sheet_layout_revisions.sql` nem vezet be párhuzamos layout-
táblát. A `covering.metal-sheets.layout` rekord a meglévő `calculations` táblában,
immutable verziói a `calculation_revisions` táblában élnek. Az új nullable
`material_variant_id` összetett `(id, organization_id)` FK-val köti a revíziót a
katalógusvariánshoz. Két dependency él őrzi a konkrét tetőrevíziót és a konkrét
`roof.gable` calculation revisiont.

A `save_metal_sheet_layout` SECURITY INVOKER függvény tagságot, projektet,
aktuális tető- és geometriarevíziót, aktív azonos szervezetű variánst, snapshot-
hivatkozásokat és várt layout-revíziószámot ellenőriz. Egy tranzakcióban készíti
el a revíziót, dependency éleket és current pointert; azonos inputnál idempotens.
A `20261013010100_sheet_layout_first_revision_fix.sql` a már alkalmazott helyi
sémán is kijavítja az első revízió explicit nulla bázisát.

Tetőrevízió-váltáskor trigger jelöli stale-nek a layout current állapotát. A
releváns anyagspecifikáció-változás az immutable katalógussnapshot és az aktuális
variáns normalizált műszaki mezőinek összevetéséből származik; az árhistorika
nem része ennek az összehasonlításnak.

A `create_sheet_layout_takeoff_draft` kizárólag aktuális, verified, mentett és
`square_meter` egységű layoutból készít atomikusan draftot és tételt. A mennyiséget
az upstream verified `roof.gable` területből és explicit ráhagyásból számolja,
nem fogad el kliens által küldött végeredményt. Más egységhez nincs implicit
konverzió, approved kimutatást pedig egyik F7.3.2 művelet sem módosít.
## F8.3.2 — státusz-életciklus és eseménytörténet

A 20261013040000_quotation_lifecycle.sql a státusz-enumot sent, accepted és
rejected értékekkel bővíti, valamint létrehozza az append-only
quotation_status_events táblát. Az esemény szervezeti és ajánlati azonosítót,
forrás/cél státuszt, időpontot, actor UUID-t, opcionális megjegyzést és a
finalized revízió referenciáját őrzi. Közvetlen authenticated beszúrás, módosítás
és törlés nincs; a státuszváltozást a SECURITY DEFINER trigger rögzíti.

Az engedélyezett üzleti átmenetek: draft → finalized, finalized → sent,
sent → accepted vagy sent → rejected. A transition_quotation_status SECURITY
INVOKER RPC csak az elküldött/elfogadott/elutasított célállapotokat kezeli; a
véglegesítést továbbra is az F8.3.1 finalize RPC végzi. A DB trigger tiltja a
reopeninget, a terminális állapot további módosítását, valamint a finalized
pénzügyi és revíziómezők változtatását. A FOR UPDATE zár és expected version
megakadályozza, hogy két konkurens döntés egyszerre érvényesüljön.

Régi finalized rekordokhoz nincs automatikusan visszamenőleges esemény, mert az
korábbi műveletet nem szabad kitalálni. Ezek olvashatók maradnak, és a következő
valós lifecycle-átmenetektől kezdve kapnak történeti eseményt. A lifecycle
semmilyen e-mail-küldést, kézbesítési bizonyítékot, elektronikus aláírást,
szerződést, számlát vagy gyártási rendelést nem hoz létre.
# F9.1 — Kivitelezési tervezés

Az `execution_plans` és `execution_tasks` az ajánlatoktól különálló, szervezeti és projekt-szinten izolált operatív nyilvántartás. Az ajánlati forrás opcionális; ha megadott, a migráció triggerrel ellenőrzi, hogy ugyanahhoz a projekthez tartozó, `accepted` állapotú ajánlat `finalized_revision_id` értéke legyen. A forrás-referencia később immutable.

Mindkét táblán szervezeti RLS van. A létrehozás és feladatmentés RPC-n keresztül, szerveroldali tagság-ellenőrzéssel és feladat-verzióval történik. A `request_key` egyedi terven/feladatterven belül, így ismételt hálózati beküldés nem hoz létre duplikátumot. Több terv hivatkozhat ugyanarra az elfogadott ajánlatra.
# F9.2 — Munkanapló és feladatesemények

Az `execution_journal_entries` append-only munkanapló-bejegyzéseket tárolja. A `work_date` PostgreSQL `date`, ezért különválik a `created_at` rögzítési időpontjától; opcionális `task_id` csak ugyanahhoz a tervhez tartozhat. A `correction_of_entry_id` explicit, azonos terven belüli korrekciós hivatkozást biztosít, az eredeti bejegyzés módosítása nélkül.

Az `execution_task_events` eseményeit az `execution_tasks` státuszfrissítés utáni trigger írja. A trigger hibája a teljes státuszfrissítést visszagörgeti. Csak tényleges státuszváltozás rögzül; közvetlen authenticated INSERT/UPDATE/DELETE nincs engedélyezve. A napló és eseménytörténet szervezeti RLS-sel, terv/feladat composite FK-kkal, idővonal-indexekkel és 100-as lekérdezési limittel működik.

# F9.3.1 — Kivitelezési fényképdokumentáció

Az `execution-photos` privát Storage bucket kizárólag a kivitelezési képeknek
fenntartott, 10 MB objektumlimittel és `image/jpeg`, `image/png`, `image/webp`
engedélyezett MIME-listával. A bucket nem public; HEIC/HEIF nincs bekapcsolva,
mert ebben a mérföldkőben nem lenne megbízhatóan azonos a böngésző-, szerver- és
feldolgozási kompatibilitás.

Az `execution_photos` relációs tábla nem tárol binárist és nem tárol public URL-t.
Az object key szervezeti/projekt/terv prefixű, UUID-alapú, MIME-kiterjesztésű,
egyedi és triggerrel védett. A projekt-, terv-, task- és naplóhivatkozás minden
esetben azonos szervezethez tartozik; a trigger a terv projektjét és az opcionális
task/journal azonos tervét is ellenőrzi. A `request_key` idempotenciát ad.

Az authenticated olvasási Storage policy csak olyan objektumot enged ki, amelyhez
látható `execution_photos` metadata-sor tartozik és a felhasználó tagja az adott
szervezetnek. Feltöltésnél a szervezeti tagság és az object key prefix együtt
szükséges; a metadata-RPC a projekt/terv/kapcsolatok végső szerveroldali ellenőrzése.
Nincs authenticated overwrite/delete policy. A szerver action a fájl magic byte
aláírását is ellenőrzi, feltöltés után metadata-sort hoz létre, hiba esetén pedig
megpróbálja eltávolítani az árva Storage objektumot; a két szolgáltatás közötti
hamis atomi tranzakciót nem állítja.

Az oldal szerveroldalon legfeljebb 100 projektképet kér le, és 5 perces signed
URL-eket készít. A napló immutable marad: a fotókapcsolat külön rekord, a
`work_date` és `created_at` változatlan. Távoli Supabase migration nem történt.

# F9.3.2 — Fotókategorizálás

Az `execution_photos.category` a felhasználó által kiválasztott `before`,
`during`, `after` vagy `uncategorized` érték. Alapértéke `uncategorized`; az
upload-időpontból nincs automatikus besorolás. A kategória külön, célzott
`set_execution_photo_category` RPC-n keresztül módosítható, amely tagságot és
fotóazonosítót ellenőriz; a jogosultság csak erre az oszlopra szól, az
upload-identity, időbélyeg, object key és hivatkozások nem írhatók át.

A galéria a meglévő terv-, szervezet- és 100 rekordos lekérdezésre épül,
kliensoldali kategória/feladat/dátumszűréssel és determinisztikus feltöltési idő
szerinti rendezéssel. Az előtte/utána összehasonlítás nem mentett pár, csak a
már engedélyezetten betöltött két fotó ideiglenes kiválasztása; public URL vagy
külső képfeldolgozás nincs.
# F9.6.1.1.1 adatbázis-állapot

A `20261013080100_gutter_calculation_persistence.sql` lokális, incremental migráció új egyedi projektszintű kalkulációs indexet és `save_gutter_material_calculation` RPC-t ad. A függvény a meglévő `calculations`, `calculation_revisions` és `calculation_dependencies` architektúrát használja; input/output/provenance/warning snapshotot ment, az aktuális revision pointert frissíti, és minden tetőmodell-forrásrevíziót rögzít. SECURITY INVOKER, szervezeti tagságot és projekttulajdont ellenőriz, a keresztprojekt forrást elutasítja, az `authenticated` szerepkörre korlátozott, `public` és `anon` számára visszavont EXECUTE joggal.

A revision mentést tranzakciós advisory lock sorosítja szervezet/projekt/kalkulátortípus szerint; az elvárt revíziószám eltérése `40001` konfliktust ad. A 009 pgTAP teszt ellenőrzi a létrehozást, külön szervezeti tag elutasítását, forráshivatkozást, immutable snapshotot és a soros stale revision konfliktust. A `scripts/verify-gutter-concurrency.mjs` két független authenticated kapcsolattal, readiness barrierrel és valódi párhuzamos RPC-hívással igazolta: egy sikeres V2, egy `40001` konfliktus, két összes revízió és változatlan V1 snapshot.

A meglévő material_variants katalógusban van gutter kategória és opcionális length_mm, de ez nem bizonyít gyártói termékadatot. Katalóguskapcsolat csak szervezethez kötött, forrás- és provenance-mezőkkel készíthető; hiányzó paraméter nem tölthető ki. Material takeoff átadás jelenleg a meglévő, nyeregtető-revízióhoz kötött workflow-ra korlátozott, ezért ereszcsatorna-revíziót nem szabad csendben átadni vagy jóváhagyni.

Hosted adatbázis, backup/restore és hosted izoláció nem változott és nem lett ellenőrizve. A lokális acceptance bizonyíték nem helyettesíti ezeket.

## F9.6.2.2 — szegélykalkulációs perzisztencia

A `20261013080500_flashing_calculation_persistence.sql` új, szervezet/projekt/kalkulátortípus szerinti egyedi indexet és `save_flashing_material_calculation` SECURITY INVOKER RPC-t ad a meglévő `calculations`, `calculation_revisions` és `calculation_dependencies` architektúrához. A művelet tranzakciósan ment új immutable revíziót, advisory lockkal sorosítja az írást, és eltérő expected revisionre `40001` hibát ad. Az RPC ellenőrzi az aktív szervezeti tagságot, projektet, aktuális nyeregtető-modellt és `roof.gable` kalkulációt, az ellenőrzött upstream revíziópárt, valamint az engedélyezett él → output mező → kategória megfelelést. Az eredeti geometriai hossz a snapshot része; nem felülírt hossznál az input egész mm értékének a forrásérték felfelé kerekítésével kell egyeznie.

A mentés külön dependency sort rögzít a tetőmodell-revízióra és a geometriai kalkulációs revízióra. Az UI szerveroldalon újraszámol, nem küldött kliens-outputot használ; az RPC az exact upstream ownershipet és mező-hozzárendelést újra validálja. A célzott `011_flashing_calculation.sql` pgTAP lefedi a V1/V2 létrehozást, snapshot-megőrzést, mindkét dependencyt, expected-revision konfliktust, nem támogatott/keresztprojekt forrást, nem tag olvasását/írását és közvetlen revision módosítás/törlés tiltását.

Helyi történeti bizonyíték: a `20261013080500` migráció incremental módon alkalmazva; az akkori célzott `011_flashing_calculation.sql` pgTAP része és az F9.6.2.2.1 végső lokális ellenőrzésben dokumentált 11 fájl / 329 állítás PASS. A későbbi roof-model write guard után a jelenlegi reprodukció hibázik; lásd e dokumentum F9.29 regressziós auditját. Hosted adatbázis nem célpont.

## F9.6.2.3 — flashing takeoff draft RPC

A `20261013080600_flashing_takeoff_integration.sql` új táblát nem hoz létre: a F9.6.1-ben bevezetett `transfer_request_key` és `transfer_payload`, valamint a `(organization_id, project_id, transfer_request_key)` egyediség újrahasználatával regisztrálja a `create_flashing_takeoff_draft` SECURITY INVOKER függvényt. EXECUTE csak `authenticated` számára engedélyezett; az `anon`/`public` jog visszavont.

A függvény tagságot, projektet, aktuális verified `sheet_metal.flashings.material-estimate` revíziót, calculator/input-schema verziót és termékstátuszt ellenőriz. Minden mennyiséget a mentett outputból olvas: `run-piece` csak pozitív, nem-null darabszámra; `run-linear` csak explicit pozitív célhossz / 1000 konverzióra; kézi tétel a mentett input mennyiségéből készül. Egységpárosítás pontos (`piece` vagy `linear_meter`), run csak `flashing`/`sheet_metal`, kézi komponens ezen felül `accessory`/`other` kategóriájú terméket is választhat. Variánsazonosító, product/variant technical fields és provenance a material snapshotban; legutóbbi kompatibilis ár pontos ID-je, értéke, dátuma és forrása price snapshotban kerül megőrzésre, hiányzó ár `null`.

A tetőmodell- és geometriai kalkulációs sorokat stabil ID-sorrendben `FOR SHARE` zárolja, utána ellenőrzi a szervezet/projekt ownershipet, current revision pointert, verified státuszt és exact dependency-párt. A draft és minden tétel egyetlen tranzakcióban jön létre; az egyedi kéréskulcs az azonos payloadot reuse-olja, módosult payloadhoz elutasítást ad. Approved recordot az RPC nem módosít; a meglévő approved immutability trigger továbbra is érvényes.

Helyi ellenőrzés: migráció incremental, reset nélkül alkalmazva; `012_flashing_takeoff_integration.sql` 19/19 pgTAP PASS; `scripts/verify-flashing-takeoff-concurrency.mjs` két authenticated kapcsolattal 1 create / 1 reuse eredményt adott. A concurrency script kizárólag saját, véletlen azonosítójú lokális DEMO fixture-t hoz létre és távolít el. Hosted Supabase nem érintett.

## F9.6.1.2 integrációs adatfolyam

Az F9.6.1.2.1 hardening a `20261013080200_gutter_takeoff_hardening.sql`
incremental migrációval két nullable, együtt kötelező mezőt ad a meglévő
`material_takeoffs` táblához: `transfer_request_key uuid` és `transfer_payload
jsonb`. A `(organization_id, project_id, transfer_request_key)` unique constraint
az adatbázisban teszi atomi műveletté az idempotenciát; a korábbi rekordok null
értékei kompatibilisek maradnak.

A SECURITY INVOKER `create_gutter_takeoff_draft` RPC egyetlen tranzakcióban
ellenőrzi a tagságot, a szervezet/projekt/current verified gutter-revíziót, az
aktív és szervezetazonos katalógust, a támogatott kategóriát és a `piece`
beszerzési egységet. A mennyiséget közvetlenül a mentett input/output snapshotból
vezeti le, majd ugyanabban a tranzakcióban írja a draftot és a tételeket. A
`material_snapshot` őrzi a pontos forrásrevíziót, termék- és variánsazonosítót,
egységet, rendelkezésre álló műszaki paramétereket és provenance-t; a legutóbbi
egységazonos ár teljes forrás-snapshotként, hiányában `null` értékként rögzül.

Ugyanazon kéréskulcs és azonos payload az eredeti draftot adja vissza; ugyanazon
kulcs eltérő payloadhoz `22023` hibával elutasított. Új kéréskulcs külön szándékos
művelet, ezért azonos név és forrásrevízió mellett is új draftot hozhat létre. A
`public` és `anon` EXECUTE jog visszavont, az RPC csak `authenticated` szerepkörnek
engedélyezett. A 010 pgTAP 29 ellenőrzése és a két független authenticated
kapcsolatos konkurenciateszt igazolja az izolációt, snapshotokat, pontosan-egyszer
logikai létrehozást és approved immutabilitást.

A `20261013080300_material_takeoff_delete_trigger_fix.sql` a korábbi BEFORE
UPDATE OR DELETE triggerek DELETE ágát javítja: draft törléskor `OLD`, frissítéskor
`NEW` tér vissza, approved rekordnál továbbra is kivétel keletkezik. Így a
jóváhagyott kimutatás és tételei változatlanul immutable-ek, a draft lifecycle és
a célzott teszt-cleanup pedig nem némán megszakított művelet.

A `20261013080400_material_takeoff_source_immutability.sql` BEFORE UPDATE trigger
alatt változtathatatlanná teszi a szervezet-, projekt-, kalkuláció-, revízió- és
opcionális tetőmodell-forrást, valamint a transfer kéréskulcsot és payloadot. A
név, státusz, jóváhagyási adatok és verzió szabályos lifecycle-változásait ez nem
akadályozza; a jóváhagyott állapot külön, szigorúbb trigger-védelme megmarad.

## F9.6.3.3 — lemezprofil-revíziók

A `20261013080700` + `20261013080800` + `20261013080900` lokális migrációk a meglévő `calculations` / `calculation_revisions` táblákat használják. Nem jött létre párhuzamos profil-tábla vagy katalógus-séma. A végső `save_sheet_metal_profile_calculation(organization, project, calculation, name, input, expected_revision)` SECURITY INVOKER RPC csak bemenetet fogad; PostgreSQL maga állítja elő és tárolja az immutable `output_snapshot` BA/K összegzését. Az első két időbélyeges migrációs lépést a harmadik input-only aláírásra cseréli; az alkalmazott migrációkat nem módosítottuk.

Az RPC aktív `private.is_org_member` tagságot, a szervezethez tartozó projektet, a profilazonosítóhoz tartozó ugyanazon projekt/kalkulátortípust, ismert profil- és méréskonvenciókat, inputdimenziókat, BA/K tartományokat és az expected revisiont ellenőrzi. Profilazonosítónként `pg_advisory_xact_lock` védi az első mentési versenyt is; tranzakció egy új `calculation_revisions` sort szúr be, majd frissíti az aktuális revision pointert. A meglévő immutability trigger tiltja a revision UPDATE/DELETE műveletét. Cross-project/cross-org és nem tag műveletet az RLS/RPC tesztek elutasítanak. A kalkulációs revision dependency táblában nincs katalógusvariáns típusú upstream kapcsolat; explicit profil–variáns technikai szerződés hiányában nem készült mapping.

Az alkalmazási Server Action minden UI-mentésnél a TypeScript production domainmotort hívja, amely a teljes analitikus geometriát, önmetszést és outputot ellenőrzi. A DB kimeneti snapshotot ezután sem kliens, sem Server Action nem adja át. A pgTAP igazolja az RPC szervezeti/projekt izolációját, bemenet-eredmény matematikai összegzését, hiányzó BA/K `null`-ját, immutable historyt és stale revision elutasítást; a valódi két authenticated kapcsolatú próba egyetlen V2-t és egy stale conflictot igazolt. A migrációk és tesztek kizárólag helyi Supabase-en futottak, reset és hosted módosítás nélkül.

## F9.6.3.4.1 — profilanyag és mennyiség az immutable revízióban

A `20261013081000`–`20261013081300` közötti négy helyi migráció új táblát vagy katalógusoszlopot nem hoz létre. A meglévő `material_variants.technical_specs.profileMaterialSpec` explicit, opcionális szöveges szerződés; régi rekordnál a hiánya feloldatlan kompatibilitás. A `calculation_revisions` BEFORE INSERT trigger a profilhoz tartozó inputból önállóan ellenőrzi a BA/K alapú terítékszélességet és a darabhossz/darabszám korlátját, majd a hiteles szélességből írja az `output_snapshot.materialRequirement` nettó m² értékeit. Régi revíziók nem változnak és újra betölthetők.

Katalógus-hozzárendelésnél a trigger az aktuális szervezetazonos, aktív `sheet_metal` terméket és variánst RLS alatt, `FOR SHARE` zárral olvassa; `square_meter` egységet, pontos anyagazonosítót, azonos vastagságot és forrásnevet követel. A termék/variáns azonosítóját, anyagspecifikációját, vastagságát, egységét, forrásnevét, URL-jét és dátumát maga írja az immutable input `material.catalogSnapshot` mezőjébe. Idegen szervezet variánsa elutasított. A meglévő expected-revision/advisory-lock konkurenciavédelem és UPDATE/DELETE tilalom érvényben marad. Nincs material takeoff átadás vagy ár-snapshot ebben a mérföldkőben.

Az F9.6.3.3 alatt mentett outputban nincs `materialRequirement`; a betöltő ezt történeti hiányként kezeli, és a régi revízióhoz nem jelenít meg visszamenőleg új területszámot.

## F9.7.6.3 — standalone számítás perzisztencia

A `20261014010000_standalone_calculation_persistence.sql` új táblát nem hoz létre. A `calculations.project_id` nullable lett, mellette `ownership_scope` (`project`/`standalone`) és `created_by` FK került be. A scope CHECK garantálja, hogy project rekordnak legyen projektje és ne legyen standalone creatora, míg standalone rekord projekt- és tetőmodell-nélküli, hitelesített creatorhoz kötött. A meglévő összetett project/szervezet FK változatlan és a project scope továbbra is kötelező projektet jelent.

Az új `save_standalone_gutter_calculation`, `save_standalone_flashing_calculation` és `save_standalone_profile_calculation` RPC-k csak az aktuális három registry ID-t fogadják. `SECURITY DEFINER`, üres `search_path`, `authenticated` EXECUTE és `public`/`anon` visszavonás mellett a belső mentőfüggvény auth.uid()-t, tagságot, ownershipet, calculator típust, JSON szerződést és expected revisiont ellenőrzi. Standalone parent/revision közvetlen insert policy, valamint parent update/delete policy nincs; a dedicated RPC-k az egyetlen authenticated írási út. Revision UPDATE/DELETE trigger továbbra is append-only történelmet véd. Revízió SELECT a szülő scope/creator policyjét követi. A dependency INSERT standalone downstreamra tiltott, a meglévő project trigger/reláció változatlan.

A Server Action inputot fogad, sessionből ellenőrzi a tagságot, és az `executeCalculator` production TypeScript engine-nel újraszámolja az outputot; kliens-output mezőt nem vesz át. SQL RPC-k újraellenőrzik a gutter kereskedelmi darabszámokat/összegeket, a flashing kapcsolat szerinti darabszámot és hiányos állapotot, valamint a profil BA/K, width és null/incomplete szerződést. Az RPC-k `expected_revision_number` paramétere és org/user/type/ID szerinti transaction advisory lock pontosan egy párhuzamos azonos revision-mentést enged; a második `40001` stale conflictot kap. A profil műhely-katalógus variánsa csak azonos szervezetből menthető, automatikus material takeoff nem készül.

Helyi ellenőrzés: 016 standalone + 009 gutter + 011 flashing + 013 profile pgTAP: 4 fájl / 88 assertion PASS. Opt-in Auth action integráció: két valós helyi Auth user, 1 Vitest teszt PASS; list/current/history és same-org noncreator kizárása. Két külön authenticated PostgreSQL session valódi párhuzamos futása: 1 V2 + 1 `40001`, V1 változatlan. Project regresszió tesztelve; hosted DB, reset és teljes történeti pgTAP suite ebben a mérföldkőben nem futott.

## F9.7.6.5.1 — standalone calculation project association

`20261014020000_standalone_calculation_project_association.sql` létrehozza a RLS-es, közvetlen INSERT/UPDATE/DELETE nélkül írt `calculation_project_associations` ledger-t és az `associate_standalone_calculation_to_project` RPC-t. A `20261014020100` additív korrekció a projektprofil RPC aktuális, input-only aláírását hívja; a `20261014020200` `UPDATE`/`DELETE` triggere a ledger append-only garanciáját privilegizált SQL útvonalakon is érvényesíti. Az append-only sor összetett FK-val kapcsolja a forrás-revíziót és a projekt-revíziót; a JSON snapshot külön megőrzi a forrás inputot, outputot, `data_provenance`-ot, státuszt, schema/motor verziót és warnings mezőt. `source_calculation_id`, `source_creator_id`, szervezet, calculator type és `created_by` is explicit; korábbi alkalmazott migráció vagy RPC nem lett átírva.

A `SECURITY DEFINER`, üres `search_path` association RPC `auth.uid()`-t, aktív műhelytagságot, létező azonos szervezeti projektet, source owner/scope/org/típus/revíziót, supported versiont/státuszt és source snapshot-egyezést ellenőriz. Csak az aktuális source revision fogadható el. A projektmentő RPC ugyanabban a tranzakcióban ellenőrzi a meglévő project kalkulációs és expected-revision szerződést. Gutter/flashing a már létező projektrevíziót bővíti; profil új project calculation ID-t kap, mert a projektprofil RPC identity-alapú. A profil authoritative SQL outputja a meglévő RPC-ből származik. A `verified` projektstátusz a meglévő gutter/flashing mentő- és takeoff-szerződés része; a forrás eredeti státusza/provenance-a a ledgerben külön marad, ez nem szakemberi jóváhagyás.

Az org+operation ID advisory lock és unique constraint azonos payloadnál ugyanazt a célrevisiont adja vissza; más payload `22023`. Replay előtt a kérő source ownershipét és project létét is ellenőrzi. Kereszt-szervezeti cél és más creator source-a nem írható; geometry dependency nem készül. Approved takeoff és quotation nem módosul, takeoff automatikusan nem készül. A ledger olvasása aktív org tagra korlátozott.

Helyi bizonyíték: 009/011/013/016/017 pgTAP, 5 fájl / 118 assertion; downstream 010/012/015 gutter/flashing/profile takeoff regression 3 fájl / 94 assertion, köztük approved immutability. Helyi Auth Server Action integráció két valódi Auth userrel, 1/1; `verify-standalone-association-concurrency.mjs` két külön authenticated sessionnel egy associationt és egy projekt-revíziót igazolt azonos visszatérő ID-kkal. Nincs reset vagy hosted DB változás.

## F9.6.3.4.2 — profil takeoff-draft RPC

A `20261013081400`–`20261013081700` helyi migrációk `create_profile_takeoff_draft` SECURITY INVOKER RPC-t és profiltétel UPDATE-védelmet adnak a meglévő `material_takeoffs`/`material_takeoff_items` sémához. A `20261013081500` a menthető, hiányos `user_provided` profilrevíziót is beengedi az explicit BA/K elutasításig; a korábban alkalmazott `20261013081400` változatlan. A forráskalkuláció `FOR SHARE` zára együttműködik a mentési `FOR UPDATE` zárral. Az RPC szervezet- és projekttagságot, aktuális pontos revíziót, azonos szervezetű/aktív terméket, explicit anyagazonosítót, vastagságot, forrásnevet és `square_meter` egységet követel. Egy tranzakcióba kerül a draft, a m² tétel és a külön technikai/ár-snapshot. A szervezet/projekt/kéréskulcs egyedi constraint ütközéskor azonos immutable logikai payloadot újrahasznál, eltérőt elutasít. Approved rekordot nem frissít; a profiltétel snapshotja draftban sem módosítható. Hiányzó egységazonos ár `null` marad. A hajtás nélküli profil `GEOMETRICALLY_DETERMINED`, a BA/K-s profil `PARAMETER_BASED_ESTIMATE` osztályozása megmarad.

## F9.7.6.6.3.2a — quotation dokumentumadat-alap

A `20261014040000_quotation_document_data_foundation.sql` additívan bővíti az
`organizations` táblát a `business_name`, `business_address`, `contact_email`,
`contact_phone`, `tax_identifier` mezőkkel. Az olvasás a tagsági RLS-t követi;
a mezők UPDATE grantja oszlopszűkített, az RLS meglévő owner/admin policy-je
pedig csak műhelytulajdonosnak/adminnak enged írást.

A document-aware standalone mentés az `input_snapshot.document` JSON objektumba
menti a szerver által kiolvasott issuer adatot, a `manual` recipient snapshotot
vagy same-org ügyfélből derivált `linked_client` snapshotot, valamint az
opcionális `reference`, date-only `validUntil`, `notes`, `terms` mezőket. Ezek
az immutable revision részei. A korábbi RPC aláírás kompatibilitási wrapperrel
a dokumentum-aware íróra delegál; kliens továbbra sem írhat közvetlenül
standalone quotation/revision/operation rekordot.

A `quotation_document_sequences` RLS-es és az authenticated/anon szerepkörnek
nincs közvetlen grantja vagy policy-je. A draft mentés nem hoz létre sort. Ez
csak jövőbeli, issuance sorral egy tranzakcióban végzett számlálóemelés alapja;
kiállítás és emberi dokumentumszám kiosztása még nincs.

`20261014040200_validate_issuer_contact_email.sql` e-mail formátum CHECK-et is
tesz a kibocsátói kapcsolati mezőre; az action és a readiness-validátor ugyanezt
a határt jelzi. A kézi címzett hibás vagy hiányzó e-mailje draftként tárolható,
de readiness hibát mutat.

Bizonyíték: lokális Supabase migráció reset nélkül; 018 + 019 pgTAP 62/62 PASS;
valódi local Auth JWT-s issuer/profile, manual/linked snapshot, creator-scope,
V1 immutable és draft-szám nélküli teszt 9/9 PASS. Nincs hosted migráció.

## F9.7.6.6.3.2b — revízió pénzügyi contract

`20261014040300_quotation_financial_contract.sql` `financial_contract JSONB`
mezőt és BEFORE INSERT triggerelemet ad a `quotation_revisions` táblához.
A trigger a kiszámított `price_class` és `subtotal` értékekből hozza létre a
contractot; kliens által küldött JSON-t nem fogad el. Ugyanaz a SECURITY DEFINER
draft RPC hívja, a trigger fix `search_path`-et használ, és újraírásnál minden
mezőt szerveroldalról felülír. A már meglévő revízió sorok értéke NULL marad;
nincs UPDATE/backfill. A revision immutable UPDATE/DELETE trigger változatlan.

A JSON explicit HUF, source/schema version, `net|gross` price basis, csak az
adott besorolás szerinti összeg, `unresolved` treatment, null tax és null
payable, továbbá 6 mennyiségi tizedes / 2 HUF tizedes / line-scope half-up
szabály. A line amount továbbra is az eredeti `line_items_snapshot`/subtotal
forrásból olvasható. Nincs tax registry, szervezeti default vagy írható
quotation treatment: jóváhagyott executable tax policy nélkül ezek választéka
hamis biztonságérzetet adna. Új unsupported tax-id a domainben nem végrehajtható;
a draft adatbázis-szerződés nem fogad tetszőleges adóparamétereket.

Migráció a helyi DB-n reset nélkül alkalmazva; korábbi migrációk állapota
20261014040200-ig egyezett, az új 20261014040300 felkerült. Célzott
`018_standalone_quotations.sql`: 38/38, `019_quotation_document_data.sql`:
29/29, projekt `003_quotation_finalization.sql`: 8/8 és
`004_quotation_lifecycle.sql`: 11/11 PASS. Ezek ellenőrzik snapshot mezőt, hiányzó tax/total értéket,
NET↔GROSS elkülönítést, rounding metadata-t, meglévő creator/RLS/snapshot és
draft-number invariánsokat. A valós local Auth scripted integráció 9/9 PASS;
nem változott új grants/policy/auth szerződés.


## F9.7.7.2a — trapézlemez-fedés persistencia

A `20261014050000_gable_trapezoidal_covering_persistence.sql` additív, forward-only migráció. Nem hoz létre külön számítás-revízió táblát: a közös `calculations` / `calculation_revisions` / `calculation_dependencies` láncot használja, és egy szűk, nem közvetlenül olvasható művelet-ledger tárolja az idempotens operation ID, kérés-payload és létrehozott revízió kapcsolatát. Az RPC rögzíti a projekt exact roof-model revision dependencyt, vagy standalone esetben a creator/org scope-ot. Expected revisionnel tranzakciós lock védi a konkurens frissítést; ugyanazon operation ID eltérő payloadja elutasított.

Helyi állapot: a `20261014050000` migráció alkalmazva. A migráció `tetopro_covering_writer` LOGIN szerepet hoz létre jelszó nélkül; üzembe helyezéskor külön, erős jelszót és kizárólag szerveroldali `COVERING_WRITER_DATABASE_URL` secretet kell adni. Helyben ez a gitignore-olt `.env.local` fájlban van; a `setup-local-auth.mjs` megőrzi. Az író csak a mentő RPC-t hívhatja, közvetlen táblaírási grant nélkül. Az RPC `SECURITY DEFINER`, üres `search_path`-tal és auditált grantokkal; a hitelesített Server Action actor ID-ját a DB tagsági zárral és projekt/forrás-ellenőrzéssel validálja. A szokásos `authenticated` szerep nem hívhatja az RPC-t, és célzott restrictive RLS policy tiltja a közvetlen covering számítás-, revízió- és dependency írást. A hamis numerikus outputot tartalmazó közvetlen RPC-próba `42501` hibával zárult, mentett hamis rekord nélkül. A közös revízió-immutable trigger változatlan. A pontos projektforrás a roof-model revision, az ahhoz kötött `roof.gable` calculation revision és a hozzájuk tartozó input; standalone forrás a kézi geometria. Várt revízió és operation ID tranzakciós lockok alatt érvényesül. Hosted adatbázist nem módosítottunk.

Korábbi állapotfeljegyzés: az alábbi F9.7.7.3a szakasz felváltja a jövőbeli takeoff szerződésre vonatkozó tervet.

## F9.7.7.3a — projekt fedésből takeoff piszkozat

A `20261014060000_gable_covering_takeoff_draft.sql` egyetlen új draftot és egy
`calculated` tételt hoz létre a meglévő `material_takeoffs` és
`material_takeoff_items` táblákban. A `material_takeoffs` sémában nincs külön
append-only takeoff revision tábla: az új átadás saját takeoff ID-t kap;
jóváhagyáskor a meglévő státusz/`version` életciklus fut. Az átadási tétel
forrássnapshotja immutable, a piszkozat nem ír át meglévő vagy jóváhagyott sort.

A tétel `final_quantity` és `calculated_quantity` értéke a mentett teljes hosszú
lemezszám, `quantity_unit='piece'`. A névleges terület, szükséges hossz,
méretek, síkazonosítók és teljes forrás input/output a `material_snapshot`-ban
maradnak. A termék és variáns snapshotja megőrzi a katalógusmezőket és eredetet.
Aktív, azonos szervezeti `roof_covering`/`sheet_metal`, `piece` variáns szükséges;
a kitöltött méreteknek egyezniük kell. Hiányos méretadat esetén a társítás
kézi/`user_provided`; ez nem gyártói igazolás. `price_snapshot` NULL.

A SECURITY DEFINER RPC-t csak a `tetopro_covering_writer` hívhatja; a szerepnek
nincs közvetlen táblabetoldási grantja. Az authenticated action hitelesített
felhasználója, aktív orgtagsága, projektje, calculation/revision párosa, exact
roof revisionje és `roof.gable` dependency-lánca tranzakción belül ellenőrzött.
Stale tetőforrás esetén az exact kiválasztott történeti forrás marad meg, és a
snapshot/figyelmeztetés jelzi az elavultságot. Műveletkulcs azonos payloaddal
ugyanazt a takeoffot/tételt adja; módosított payload elutasított.

Csak síkonként egy teljes hosszú sor támogatható. Toldott/többsoros, átlapolt,
nem reprodukálható vagy dimenziókonfliktusos variáns elutasított. Helyi migráció
reset nélkül alkalmazva; hosted DB érintetlen.

## F9.7.7.4b.1 — cserepeslemez számítás-revíziók

A `20261015050000_gable_metal_tile_covering_persistence.sql` forward-only, helyi migráció a közös `calculations`, `calculation_revisions` és `calculation_dependencies` táblákat használja, valamint a cserepeslemez saját, RLS-védett `gable_metal_tile_save_operations` idempotencia-ledgerét hozza létre. A meglévő `tetopro_covering_writer` szerepet és szerveroldali `COVERING_WRITER_DATABASE_URL` kapcsolatot használja új credential vagy közvetlen táblaírási grant nélkül. A SECURITY DEFINER `save_gable_metal_tile_covering_calculation` RPC-re a `PUBLIC`, `anon` és `authenticated` nem kap EXECUTE-t; az `authenticated` restrictive policyval sem írhat ilyen típusú calculationt, revisiont vagy dependencyt.

A szerveraction aktív szervezeti tagságot követel és a `roof.gable` motort, valamint a cserepeslemez-motort újrafuttatja. Csak `VALID` eredmény lép az írószerephez. Standalone snapshot `created_by` tulajdonost rögzít; project snapshot az adott verified roof-model revisiont, annak ellenőrzött `roof.gable` calculation/revision párját és exact inputját menti dependencyként. Az RPC tranzakcióban újra ellenőrzi az actor tagságát és a pontos project/source kapcsolatot. Expected revision és műveletazonosító advisory lock alatt érvényesül; egyező retry ugyanazt a revisiont adja vissza, eltérő payload vagy stale expected revision elutasított. A shared immutable revision trigger változatlan.

A migráció lokálisan, reset nélkül alkalmazva (`20261015050000`); hosted DB nem érintett. A `022_gable_metal_tile_covering.sql` pgTAP ellenőrzés 12/12 PASS. A valós local Auth/RLS Vitest 3/3 PASS (creator/peer/idegen szervezet, direct forged RPC/table write, project exact source, V1/V2 és history, két külön PostgreSQL kapcsolatú konfliktus és azonos operation retry). A helyi teszt létrehozott, DEMO jelölésű Auth/felhasználó/szervezet/projekt/revízió adatokat hagy; resetet és takarítást nem futtattunk.

## F9.7.7.4c.1 — cserepeslemez takeoff draft

A `20261015060000_gable_metal_tile_takeoff_draft.sql` az existing
`material_takeoffs` / `material_takeoff_items` lifecycle-t bővíti. A restricted
`tetopro_covering_writer` hívhatja a `create_gable_metal_tile_takeoff_draft`
RPC-t; az `authenticated` és `anon` nem. A tranzakció tagságot, projektet,
exact calculation/revision párt, verified roof revisiont, `roof.gable`
dependencyt és szervezeti katalógusvariánst ellenőriz. Csak aktív
`roof_covering`/`sheet_metal`, `piece` variáns fogadható el. A kitöltött fizikai
méreteknek, valamint a katalógusban szereplő moduladatoknak egyezniük kell.

Az egyetlen takeoff item a mentett `totalSheetCount` darabszámot tárolja.
Snapshotja megőrzi az exact forrás-inputot/outputot, calc/roof revíziót,
fizikai és fedési hosszt, méreteket, modulértékeket/provenance-t, katalógust és
stale állapotot. Ár snapshot nincs. Az operation key azonos payloadra draftot
ad vissza, módosított payloadot elutasít. A transfer item update-je tiltott;
meglévő jóváhagyási lifecycle marad érvényben. `022_gable_metal_tile_takeoff.sql`
33 pgTAP assertion és a `021_gable_covering_takeoff.sql` 33 regression
assertion PASS; a külön kétkapcsolatos race egy draftot/tételt és egy retry
reuse-t adott.

## F9.7.8.1 — helyszíni felmérések

A `20261015070000_field_surveys.sql` forward-only migráció új, célzott
`field_surveys` táblát ad. A mérési sorok JSON objektumai pontosan azonosítót,
nevet, numerikus értéket és explicit `mm`/`m`/`m2`/`degree`/`count` egységet
tárolnak. A szerver RPC és a domain séma is korlátozza a sorok számát, az
értékeket, a számlálót és a szövegeket.

Az authenticated szerep csak RLS-szűrt olvasást kap; közvetlen insert/update/
delete nincs. A `save_field_survey` RPC ellenőrzi a hitelesített aktort, aktív
szervezeti tagságot, projektszervezet-egyezést és felmérési payloadot. Önálló
felmérést csak a létrehozó olvashat és módosíthat; projektfelmérést a tagok
érhetik el. A projektkapcsolat létrehozás után változatlan. A `version` és
`expected_version` stale szerkesztésnél 40001 konfliktust ad, ezért újabb
mentés nem írja felül csendben a frissebb adatot. Nincs kapcsolat kalkulációs,
tetőmodell-, takeoff- vagy quotation rekorddal.

Helyi adatbázison reset nélkül alkalmazva. A `023_field_surveys.sql` 24/24
pgTAP assertiont teljesített; a két külön DB-kapcsolatú update versenyben egy
V2 mentés és egy konfliktus keletkezett.

## F9.7.8.2 — felmérési fotók, snapshotok és kézi átadás

A `20261015080000_field_survey_photos_handoff.sql` létrehozza a privát
`field-survey-photos` bucketet, a `field_survey_photos` metaadatot és a
`field_survey_revisions` append-only bemeneti/fotó snapshotokat. A migration
mentéskor rögzíti az új revisionöket; legacy felméréshez csak az akkori jelenlegi
állapotot lehetett visszatölteni, korábbi szerkesztési vagy fotótörténet nem
rekonstruálható. A `20261015090000` és `20261015100000` forward-only helyi
migrációk korrigálják az író actor-validációt és a Supabase Storage INSERT
policy kompatibilitását.

Az authenticated szerep csak jogosult sorokat olvashat. A kliens közvetlen
metaadat-írása és a trusted fotó RPC-k hívása tiltott; szerveroldali restricted
writer foglal, csatol, visszavon vagy eltávolít. A foglalás/idempotencia-kulcs,
várható survey verzió, aktor, tagság és projekt-szervezet egyezés ellenőrzött.
Standalone fotó creator-scope-os; projektfotót a projekt aktív szervezeti
tagjai láthatják. Az eltávolítás soft detach: a storage objektum és történeti
revisionhivatkozás megmarad. A signed URL csak jogosultságellenőrzött GET-ben
készül.

Storage bucket korlátozza a MIME-típust és 10 MB méretet; az API a tényleges
fájl bájtjainak JPEG/PNG/WebP signatúráját is ellenőrzi. A storage policy a
Supabase helyi INSERT RLS kontextusában nem kapta meg megbízhatóan a kliens
metaadatokat. Ezért a végső policy a függő szerveroldali foglalást, feltöltő
azonosságát és felmérés/szervezet jogosultságát ellenőrzi; a típus/méret
ellenőrzése a bucketre és API-ra támaszkodik.

F9.7.8.2 local pgTAP: `024_field_survey_photos_handoff.sql` és
`023_field_surveys.sql`, 55/55 PASS; külön kétkapcsolatos szerkesztési verseny
egy V2 update-et és egy 40001 konfliktust adott.

## F9.7.8.3 — mobil felmérésmentés és képbiztonság

A `20261015110000_field_survey_save_retry.sql` helyi, előremenő migráció az
új felméréshez kliens által képzett stabil UUID-t enged. Ugyanazon actor,
szervezet, projekt és payload V1 ismétlése ugyanazt a revíziót adja vissza;
V2 szerkesztésnél az azonos tartalom és korábbi expected-version szintén
idempotens. Más tartalom stale konfliktus. Az authenticated RLS, creator-scope
és aktív projekt-tagság továbbra is ellenőrzött. `023`–`025`: 68/68 helyi
pgTAP, két külön DB-kapcsolatú konkurenciateszt PASS.

A verzióhoz kötött fotó GET a `photos_snapshot` pontos azonosítóit és
object key-jét RLS-sel látható metaadathoz illeszti, majd csak azokra készít
15 perces privát signed URL-t. Soft detach után a történeti Storage objektum
megmarad. A szerver a JPEG/PNG/WebP bájtokat dekódolja, formátumot és legfeljebb
40 megapixelt ellenőriz, majd EXIF nélkül újrakódolja és 10 MB-ra korlátozza.
HEIC/HEIF nem támogatott a helyi dekóderrel; nincs megtévesztő átnevezéses
elfogadás. Fizikai iPhone/Safari viselkedés nincs igazolva.

## F9.7.9 — egységes felmérési munkafelület

A `20261015120000_unified_field_survey_workspace.sql` additív, előremenő
migráció helyben, reset nélkül alkalmazva. A `field_surveys.sections` és
`field_survey_revisions.sections` nullable JSONB mező: a régi sorok és korábbi
pillanatképek változatlanok maradnak. A kompatibilitási olvasó a régi rekordot
stabil azonosítójú szakaszként jeleníti meg; munkafelületi mentése új revízió.
A szakasz azonosítót, nevet, munkatípust, saját méréseket, megjegyzést és
fotóazonosítókat tárol. A tömb sorrendje a szakaszsorrend. Az üres mérés értéke
`null`; csak a kitöltött értékek kerülnek a legacy `measurements` nézetbe és a
kalkulátorba. Kettős domain/SQL validáció, legfeljebb 30 szakasz és összesen
100 egyedi mérés; egységszemantika, fotótulajdon és teljes flat/section egyezés
ellenőrzött. A constraint a régi RPC-n át sem enged eltérő flat adatot írni egy
munkafelületi rekordhoz.

A `save_field_survey_workspace` az eredeti auth/org/creator/project,
expected-version és stabil UUID-s retry mintát követi; a szakasztartalom is
része az idempotencia összehasonlításnak. Mentés és fotóművelet új snapshotot
ír; fotóeltávolítás csak az új szakasz-pillanatképből távolítja el a kapcsolatot.
A fotómetaadat, Storage és restricted writer továbbra is a meglévő rendszer.

A `field_survey_calculation_links` append-only: pontos survey revision,
szakasz, calculation ID és calculation revision ID. A kapcsoló RPC az adott
forrásban létező szakaszt, kompatibilis kalkulátortípust, pontos revíziópárt,
aktív tagságot és standalone creator-scope-ot ellenőriz. Történeti, jogosult
számításrevízió megengedett; nincs automatikus „latest” csere vagy újraszámítás.
Az RLS a forrásfelmérés és a célrevízió olvasását egyaránt megköveteli.

A `field_survey_followups` append-only projekt-/ajánlatkapcsolat. Természetes
idempotencia: felmérésenként egy projektkapcsolat és projektkontextusonként
egy ajánlatpiszkozat. A survey sorzár védi a párhuzamos létrehozást. Új
művelethez aktuális forrásrevízió kell; korábbi sikeres művelet ismétlése az
eredeti kapcsolatot adja vissza. A kapcsolás nem módosítja a felmérés jelenlegi
vagy történeti `project_id` mezőjét, tulajdonosát vagy korábbi snapshotjait.
A projekt az eddigi táblát/constraint/RLS szerződést, az ajánlat a meglévő
`save_quotation_draft` vagy `save_standalone_quotation_draft_with_document`
függvényt használja. Az alkalmazás előbb commitolja a projektlépést; későbbi
ajánlathibánál azt visszaadja és ugyanarra a projektre folytatja az ismétlést.
Az üres projektajánlat `subtotal=null`, sorlista üres, státusz `draft`.

Közvetlen authenticated táblaírás egyik új táblán sincs; a normál,
jogosultságellenőrzött RPC-k különülnek a böngészőből továbbra sem hívható
privilegizált fotó-/fedésíró RPC-ktől. Nincs service-role futásidejű kerülőút.
Bizonyíték: `026_unified_field_survey_workspace.sql` 41 pgTAP; valós helyi Auth,
privát Storage, Server Action és read-model integráció 3 teszt; öt tényleges,
megfigyelt zárolással járó kétkapcsolatos tranzakcióverseny PASS.

A már alkalmazott helyi migráció nyilvántartását a
`npx supabase migration repair --local --status applied 20261015120000`
parancs sikeresen rögzítette; további futás nem próbálja ismét létrehozni az
objektumokat. Ez kizárólag a helyi migrációs ledger bejegyzése.

## F9.45.1 — `roof.shed.quick` felmérés-geometriaforrás

Migráció `20261019080000_survey_quick_shed.sql` (helyben alkalmazva): `field_survey_roof_geometry_sources.geometry_type` ellenőrzése bővül `roof.shed.quick`-kel; `private.survey_quick_shed_input` és `public.save_survey_quick_shed_geometry_source_secure` (csak `tetopro_covering_writer`) a revíziószakaszból (`roofType=shed`, `roofMeasurementMode=quick`, `roof_eave_run` + `roof_plane_slope_a`, mm/m, egész mm, ≤200 m) maga számolja újra a bemenetet és a területet; hívó értékét nem fogadja el, idempotens, módosíthatatlan. `private.valid_field_survey_sections`: a `roofMeasurementMode` nyeregtetőnél quick/building/detailed, félnyeregtetőnél quick/building. pgTAP: `055_survey_quick_shed.sql`.
