# F2.1 adatbázis-alap

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
