# Supabase infrastruktúra

Az F2.1 létrehozza a verziózott adatbázis-alapot, de nem kapcsolja az alkalmazást
éles vagy távoli Supabase-projekthez. Az Auth/UI és a cookie-alapú SSR-kliensek az
F2.2-ben készülnek a hivatalos `@supabase/ssr` ajánlás szerint.

A generált adatbázistípus helye:

```text
src/infrastructure/supabase/database.types.ts
```

Regenerálás lokális Supabase futtatás után:

```bash
supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts
```

Ezt a fájlt nem kézzel kell karbantartani. Service-role vagy más titkos kulcs nem
kerülhet böngésző-kódba.
