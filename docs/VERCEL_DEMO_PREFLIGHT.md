# Vercel Production DEMO előkészítés

## Állapot

**READY WITH LIMITATIONS** a lokális kód előkészítésére. A deployment és a hosted Supabase beállítása nincs elvégezve vagy ellenőrizve. A `PILOT_READINESS.md` biztonsági kapui továbbra is blokkolják a valódi ügyféladatokkal végzett pilotot.

## Fotófeltöltés

- A böngésző 10 MiB-ig fogad kiválasztott JPEG/PNG/WebP képet. Az 1 MiB-nál nagyobb képet orientációt megtartó Canvas feldolgozás optimalizálja, legfeljebb 2560 px hosszabb oldallal; JPEG/WebP JPEG-gé alakul 84%-os Canvas minőséggel, PNG PNG marad az átlátszóságért. Ha nem csökken a méret, az eredeti marad; 3 MiB fölötti eredményt a kliens elutasít.
- A felmérés route teljes kérése legfeljebb 4 MiB, fájlja 3 MiB. A Next Server Action body limit 4 MiB, és a kivitelezési fotók egyesével mennek át rajta. Ez helyet hagy a multipart mezőknek a Vercel 4.5 MB-os function body limitje alatt.
- Mindkét szerveres út újraellenőrzi a MIME-t/magic byte-okat és Sharp-pal újrakódolja a képet, orientációt alkalmaz, EXIF/GPS metaadatot eltávolít. A Storage objektum és adatbázis metaadata a normalizált fájlméretet kapja. Szervezeti jogosultság és privát bucket útvonal változatlan.
- A kivitelezési riportban a beágyazott JPEG/PNG legfeljebb 2000 px-re méreteződik; JPEG 84%-os minőséget használ. A riport PDF streamelve készül, így a válasz nem egyetlen, 4.5 MB-os buffer. A szokásos ajánlati PDF útvonalhoz nem nyúltunk.
- A már korábban feltöltött Storage-fotók nem kapnak visszamenőleges átkódolást; a szerver optimalizálja őket a kivitelezési PDF-be ágyazáskor, a galériában a korábbi objektum eredeti mérete marad.
- Ebben a környezetben nem voltak valós, változatos DEMO-helyszíni képfájlok, ezért nincs valós képeken mért tömörítési arány vagy szakmai olvashatósági jóváhagyás. A tesztben szereplő fájlméretek szintetikus bájttömbök, nem képtartalom-minőség mérésére valók.

## Production környezeti változók

Kódból ellenőrzött változók:

| Változó | Hely | Megjegyzés |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel Production | Hosted Supabase projekt URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel Production | Kliensben használható publishable key |
| `COVERING_WRITER_DATABASE_URL` | Vercel Production, server-only | `tetopro_covering_writer` login; Transaction pooler URL ajánlott serverlesshez, `sslmode=require` paraméterrel. Értéke ne kerüljön `NEXT_PUBLIC_*` változóba vagy logba. |

Az `.env.example` csak a publikus két Supabase változót sorolja fel; a writer URL kódból igazoltan szükséges további server-only secret. A `.env.local` tartalmát nem olvastuk.

## Kézi deployment checklist

### Vercel Dashboard

1. A jóváhagyott Git repót importáld a Vercelbe; framework Next.js, build command `npm run build`, install command a lockfile-hoz igazodjon. Node.js verziót az aktuálisan támogatott LTS-re állítsd, majd ellenőrizd a build logban a Sharp natív runtime bindingját.
2. Project Settings → Environment Variables alatt a fenti három változót kizárólag **Production** környezethez állítsd be. Writer connection stringet csak server-side secret mezőben tartsd; ne add meg Preview/Development számára külön jóváhagyás nélkül.
3. Ellenőrizd a production domain és HTTPS beállítást. A deployment csak a Supabase előkészítése és a migrációk jóváhagyása után indítható.

### Supabase Dashboard és migrációk

1. Hozz létre egy külön hosted Supabase projektet, válaszd a régiót, majd állítsd be az Auth Site URL-t a végleges HTTPS domainre és a szükséges Redirect URL-eket. Ne engedélyezz széles wildcard redirectet.
2. Mentsd el az adatbázis jelszavát és API kulcsokat secret managerben. A `COVERING_WRITER_DATABASE_URL` a `tetopro_covering_writer` szerepet használja; a Supabase Dashboard Connection URI Transaction pooler (port 6543) változatát add meg `[ROLE].[PROJECT-REF]` username formával és `sslmode=require` paraméterrel. A szerepkörnek nincs közvetlen táblajogosultsága; ne emeld `postgres`/service role-ra.
3. Hosted migráció előtt készíts projektmentést, hasonlítsd össze a remote migration history-t a repo teljes `supabase/migrations/` sorrendjével, vizsgáld át a még nem alkalmazott SQL-t, és ellenőrizd külön a role/function grantokat, RLS-t és Storage policy-kat. Kizárólag az ellenőrzött, hiányzó, időbélyeg szerint rendezett migrációk alkalmazhatók. A friss `20261028100000_writer_transaction_pooler_timeout.sql` a writer role alapértelmezett 10 másodperces szerveroldali timeoutját állítja be transaction pooler kompatibilisen. A lokális `supabase/seed.sql` DEMO adatait productionre ne futtasd.
4. Ellenőrizd, hogy a `field-survey-photos` és `execution-photos` bucket privát, MIME allowlistje JPEG/PNG/WebP, feltöltési RLS/policy-k a repo migrációinak megfelelőek. Az app legfeljebb 3 MiB-os objektumokat ír; bucket jelenlegi 10 MiB-os schema ceiling önmagában nem helyettesíti az app validációját.
5. Hozd létre/meghívásként add hozzá az egyetlen DEMO felhasználót a Supabase Auth Dashboardon; a `on_auth_user_created` trigger a profilt automatikusan létrehozza. Az Auth user ID-t ellenőrizd az email alapján. Ha még nincs DEMO szervezet, azonos névvel előbb keresd meg; csak hiány esetén hozd létre a Dashboard SQL Editorban adminisztrátorként. Ezután kizárólag az ellenőrzött szervezethez add ownerként a DEMO usert egy egyszeri, auditált admin SQL művelettel (az authenticated tagsági írási policy továbbra sincs megnyitva):

   ```sql
   insert into public.organization_members (organization_id, user_id, role)
   select '<ORG_UUID>'::uuid, u.id, 'owner'::public.organization_role
   from auth.users u
   where lower(u.email) = lower('<DEMO_EMAIL>')
   on conflict (organization_id, user_id) do nothing
   returning organization_id, user_id, role;
   ```

   Előtte cseréld ki és kétszer ellenőrizd a két placeholdert; a műveletnek pontosan egy sort kell visszaadnia (ha korábban létezett, ellenőrizd a meglévő tagságot). A `scripts/setup-local-auth.mjs` csak `127.0.0.1` címet fogad el, hosted projekten ne használd. Ne futtasd a lokális seedet, ne tedd a service-role kulcsot Vercelre vagy böngészőbe.
6. Állítsd be és próbáld ki a DB és Storage mentés/helyreállítási folyamatot. Az adatbázis-mentés nem bizonyítja a Storage objektumok visszaállíthatóságát.

### Első DEMO smoke teszt (szintetikus/engedélyezett DEMO adatokkal)

1. Meghívott felhasználó bejelentkezik, kilép, ismét belép; a session nem ad hozzáférést más szervezethez.
2. Kalkulátor használat, mentés, újranyitás; anyaglista és ajánlati PDF előnézet.
3. Mobilon készíts tesztfotót, tölts fel kicsi JPEG-et, nagy JPEG-et, átlátszó PNG-t és eltérő képarányú képet. Ellenőrizd a feldolgozási üzenetet, tájolást, apró részleteket, privát galériát és a PDF-et.
4. Próbálj meg sérült/nem támogatott képet és 10 MiB feletti képet kiválasztani; elutasítás legyen egyértelmű. Visszautasított kivitelezési fotót újra kell választani; megszakadt hálózati válasznál előbb frissítsd a galériát, mert a szerver mentési állapota bizonytalan lehet.
5. Külön, másik felhasználóval/műhellyel ellenőrizd, hogy a fotó és signed URL nem olvasható. Törlés/retention és mentés-visszaállítás teszt is szükséges.
6. Csak a fenti és a `PILOT_READINESS.md` blokkoló kapuinak aláírt eredménye után engedélyezhető meghívásos DEMO. Valódi ügyféladat a jelen fázisban nem használható.

## Bizonyíték és nyitott korlátok

- Szintetikus helper tesztek: 512,000 bájtos fájl változatlan; 8,000,000 → 900,000 bájt szimulált JPEG eset 88.75% megtakarítást jelez; 4000×2000 → 2560×1280 arányos méret; PNG MIME megmarad; 3 MiB feletti eredmény elutasítva. Ezek mock Canvas kimenetek, nem valós tömörítési benchmarkok.
- Hosted Auth/RLS/Storage, migrációk, restricted writer login, Vercel build/runtime, PDF letöltési limit, mobilböngészős kamera, cross-org elutasítás, valódi fotóminőség és helyreállítás **nincs ebben a menetben igazolva**.
- Nincs Supabase séma- vagy adatmodell-módosítás. Egy role-konfigurációs migration a writer `statement_timeout`-ot 10 másodpercre állítja; az összes `pg.Client` adapter elhagyja a transaction poolerrel nem kompatibilis session startup settinget. A meglévő migration bucket limit 10 MiB marad.
- Hivatalos platformkorlátok: [Vercel Function limits](https://vercel.com/docs/functions/limitations), [Vercel body limit workaround](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions), [Vercel Next.js streaming](https://vercel.com/docs/frameworks/full-stack/nextjs), [Supabase Postgres connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

Javasolt Conventional Commit: `feat(M11.1): optimize photo uploads and prepare Vercel DEMO limits`
