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
