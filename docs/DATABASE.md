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

Az alkalmazás még nem hoz létre Supabase-klienseket és nincs Auth UI. A séma
alapján generált típusok már a `src/infrastructure/supabase/database.types.ts`
fájlban vannak; az F2.2-ben a hivatalos cookie-alapú `@supabase/ssr`
szerver/böngésző adapterek kapcsolódnak be. Service-role kulcs böngészőbe nem
kerülhet.
