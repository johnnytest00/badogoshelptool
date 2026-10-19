# Supabase infrastruktúra

Az alkalmazás kizárólag a lokális Supabase-projekthez kapcsolódik. Az F2.2
browser/server kliensei és a Next.js 16 `src/proxy.ts` cookie-szinkronizáló
session-frissítése a hivatalos `@supabase/ssr` mintát követi.

A generált adatbázistípus helye:

```text
src/infrastructure/supabase/database.types.ts
```

Regenerálás lokális Supabase futtatás után:

```bash
supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts
```

Ezt a fájlt nem kézzel kell karbantartani (`npm run db:types`; migráció után mindig újra kell generálni).
A generátor minden RPC-argumentumot nem-nullnak jelöl; azokat, amelyeket az SQL-függvény szándékosan
elfogad `null`-ként, a `database.ts` egyetlen `NullableRpcArgs` listája deklarálja. Az alkalmazás a
`@/infrastructure/supabase/database` típust használja, soha nem a `database.types`-t közvetlenül.
Séma-/migrációeltérés ellenőrzése eldobható shadow DB-n: `supabase db diff --local --schema public,private`
(a migrációkat újrajátssza, és a futó helyi DB-vel veti össze; nem módosítja azt). Service-role vagy más titkos kulcs nem
kerülhet böngésző-kódba.

Helyi Auth bootstrap:

```bash
npm run db:local-env
LOCAL_AUTH_PASSWORD='helyi-jelszó' npm run db:local-auth
```

Az `.env.local` gitignore-olt, és csak a helyi publikus kliensbeállításokat
tartalmazza; az admin kulcsot a bootstrap nem írja fájlba.
