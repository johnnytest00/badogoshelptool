# QA-10 — Staging migration, multi-user Auth/RLS és release gate

## Fázis és státusz

**PREFLIGHT BLOCKED. STAGING NOT MODIFIED. PRODUCTION NOT MODIFIED.**

A kötelező írásmentes preflight nem tudta egyértelműen azonosítani az elkülönített staging Supabase-projektet. A repository nincs Supabase-projekthez linkelve, a helyi környezeti konfiguráció kizárólag a közös lokális Supabase-pontokra mutat, a CLI-hez nincs access token, a munkamenet Supabase MCP-hívásai pedig nem érhetők el. Emiatt a staging migrációs története, sémadriftje, backfill-darabszáma, backup/PITR állapota, Auth/Storage/PostgREST konfigurációja és az alkalmazott staging build nem ellenőrizhető.

A QA-10 döntési kapuja nem nyílt ki. Nem történt `supabase link`, `db push`, `db reset`, `migration repair`, SQL-írás, credential-módosítás, fixture-létrehozás, alkalmazásdeploy, commit vagy push.

## Ellenőrzött forrásállapot

- Git HEAD: `8b7e8e51087f1f559e7f3b1aafd2104004bd5165` (`fix(QA-09): harden RPC backfill and prove release readiness`).
- A munkafa a preflight kezdetén tiszta volt; meglévő változtatást nem kellett félretenni vagy módosítani.
- A repository 119 SQL-migrációt tartalmaz. A forrás szerinti utolsó migráció: `20261025154642_qa08_rpc_trust_boundary.sql`.
- A QA-09 bizonyítéka szerint a megosztott helyi adatbázis utolsó alkalmazott migrációja akkor `20261025140000` volt. Ez a QA-10 futásban nem friss bizonyíték: a helyi PostgreSQL a `127.0.0.1:54322` címen nem futott, és a tiltás miatt nem indítottam el vagy reseteltem.
- Supabase CLI: `2.120.0`. A telepített parancssúgó szerint a `db push --dry-run` támogatott; CLI-frissítés nem történt.
- Alkalmazási verziók a checkoutban: Next.js `^16.4.2`, React `^19.0.0`, `@supabase/supabase-js` `^2.117.3`, `pg` `^8.23.1`; Node.js `26.8.1`, npm `11.19.0`.

## Staging-célpont ellenőrzése

| Ellenőrzés | Eredmény |
|---|---|
| `supabase/.temp/project-ref` | nincs jelen |
| `NEXT_PUBLIC_SUPABASE_URL` host | `127.0.0.1:54321`, tehát lokális |
| `COVERING_WRITER_DATABASE_URL` host/szerepkör | `127.0.0.1:54322`, `tetopro_covering_writer`; jelszó nem került kiírásra |
| `.env.staging` vagy staging deploy-konfiguráció | nincs a repositoryban |
| Supabase CLI projektleltár | blokkolt: nincs access token |
| Supabase MCP projektleltár | blokkolt: a kapcsoló tool a munkamenetben nem érhető el |
| Staging projektazonosító és környezeti szerep | **ismeretlen** |
| Staging alkalmazás build/commit | **ismeretlen** |

A lokális `project_id = "badogos-helptool"` a `supabase/config.toml` Docker-projektazonosítója, nem bizonyít hostolt staging projektet. Production és staging azonossága ezért nem zárható ki biztonságosan, így távoli kapcsolatot nem kezdeményeztem.

## Migrációs dry-run és sémadrift

A telepített CLI támogatja az írásmentes `db push --dry-run` módot, de célprojekt és hitelesítés nélkül nem futtatható. A távoli migrációs ledger és séma nem olvasható, ezért a végrehajtandó migrációk pontos listája jelenleg **nem állapítható meg**. Nem szabad feltételezni, hogy csak a `20261025154642` migráció hiányzik.

Az azonosított és jóváhagyott stagingen a következő read-only sorrend szükséges:

1. projekt-metaadat és API URL összevetése az explicit staging projektref-fel;
2. `supabase migration list --project-ref <STAGING_REF>`;
3. `supabase db push --dry-run --skip-vault --project-ref <STAGING_REF>`; seed és role-import nélkül;
4. sémaeltérés ellenőrzése a repository migrációihoz képest `public,private`, majd külön `auth,storage` scope-pal;
5. manuális objektumok, extensionök, RLS-policyk, funkciótulajdonosok és GRANT/REVOKE állapotának olvasási leltára;
6. a távoli head és a checkout SHA rögzítése, majd ezek változatlanságának újraellenőrzése közvetlenül a jóváhagyott rollout előtt.

Ha a remote ledger és a tényleges séma eltér, tilos automatikus `migration repair` vagy rögtönzött DDL. Az eltérést külön döntési kapura kell vinni.

## Backup és restore kapu

**BLOCKED / NOT VERIFIED.** Nem áll rendelkezésre staging projekt, Dashboard-/Management API-hozzáférés, backup időpont, retention, legkorábbi/legutóbbi PITR-pont vagy restore-próba bizonyítéka.

A kapu teljesítéséhez szükséges:

- a tényleges napi backup vagy PITR recovery window és időbélyeg rögzítése;
- az adatbázis-séma, adatok és migrációs history mentésének ellenőrzése;
- a custom PostgreSQL role-ok külön role-dumpja, valamint a `tetopro_covering_writer` credential biztonságos újraprovisionálási eljárása;
- külön restore-célon bizonyított visszaállítás, majd migrációs history, adatszámok, RLS, funkciótulajdonosok és writer grantok ellenőrzése;
- Auth helyreállításának külön igazolása;
- Storage metadata és a tényleges Storage objektumok külön helyreállítási terve és próbája.

A [Supabase backup dokumentáció](https://supabase.com/docs/guides/platform/backups) szerint a database backup nem tartalmazza magukat a Storage objektumokat, és a napi backup nem őrzi meg a custom role-ok jelszavait. A [CLI backup/restore útmutató](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) külön kezeli a migrációs historyt és az Auth/Storage séma-kiegészítéseket. Egy sikeres `db dump` ezért önmagában nem elegendő recovery-bizonyíték.

## Backfill előellenőrzés

**BLOCKED / NOT RUN.** Staging adatbázis-hozzáférés nélkül nem készülhetett darabszám vagy kivétellista. Érzékeny snapshotadat nem került a jelentésbe.

A jóváhagyás előtti read-only riportnak külön kell számolnia:

- összes `construction.%` standalone revízió;
- pontos organization/calculation/revision/creator/operation/input/output ledger-egyezés;
- strukturálisan teljes, de pontos ledger nélküli revízió;
- ledger request-payload vagy input/output snapshot eltérés;
- már attesztált revízió, ha az objektum létezik;
- hiányos vagy unsupported snapshot;
- calculation/revision organization-, calculation- vagy creator-eltérés.

A riport csak azonosítókat és darabszámokat tartalmazhat. A `data_provenance.output = server_recomputed` mező önmagában nem elfogadható bizonyítékként, és ledger nélküli örökölt rekord nem attestálható automatikusan.

## Writer credential és alkalmazáskompatibilitás

A forráskód `COVERING_WRITER_DATABASE_URL` szerveroldali változóból, közvetlen `pg` kapcsolattal hívja a `save_standalone_construction_calculation` RPC-t. A jelenlegi lokális érték csak a helyi `tetopro_covering_writer` szerepkörre mutat. Staging credential megléte, hostja, pooler/direct módja, TLS-e, rotációja, secret-scope-ja és alkalmazásba injektálása nem ellenőrzött.

A forrás és a QA-09 izolált bizonyítéka szerint az RPC-aláírás a jelenlegi alkalmazással kompatibilis, de ez nem bizonyítja, hogy a staging alkalmazás ugyanezt a commitot vagy környezeti konfigurációt futtatja.

## Jóváhagyásra előkészített rollout

A staging írás csak akkor kérhető jóváhagyásra, ha egyetlen konkrét tervben szerepel:

1. az explicit staging project ref, projektneve és az elkülönítés bizonyítéka;
2. a preflight óta változatlan távoli migration head és alkalmazás SHA;
3. a dry-run által listázott migrációk pontos sorrendje;
4. a backfill kategóriák darabszáma és az azonosító-only kivétellista;
5. a használható backup/PITR pont és sikeres elkülönített restore-próba;
6. a restricted writer role/credential, Auth, Storage és PostgREST előfeltételek;
7. kizárólag `DEMO QA10` jelölésű staging szervezet, két A-tag, egy B-tag és anonim teszteset;
8. rövid konstrukciós és downstream write-pause, majd a jóváhagyott migráció alkalmazása;
9. migráció utáni attesztáció-, index-, RLS-, owner- és GRANT/REVOKE ellenőrzés;
10. multi-user Auth/RLS, direct RPC negatív, Server Action, böngészős és DB-utóállapot E2E;
11. írás visszaengedése csak minden kapu sikere után, célzott hibafigyeléssel.

### No-go feltételek

- a cél stagingként nem bizonyítható vagy productionnel összetéveszthető;
- a migration history, séma vagy alkalmazás SHA váratlanul eltér;
- nincs sikeresen visszaállított, használható recovery-pont;
- a writer credential hiányzik, túl széles vagy kliensoldalra kerülhet;
- a backfill-kivétellista nincs elfogadva;
- ledger nélküli rekord automatikus attestációt igényelne;
- a tesztadat nem izolálható ügyféladattól;
- a migráció közben vagy után bármely integritási/jogosultsági ellenőrzés eltér az előzetes tervtől.

## Tervezett staging verifikáció

Külön jóváhagyás után, kizárólag stagingen:

- A-org owner, A-org második tag, B-org tag és anonim szereplő;
- jogosult kalkuláció V1/V2, történeti V1, vágáslista, munkanapló-link és ajánlatforrás;
- cross-org olvasás/írás, közvetlen restricted writer, nem attestált revízió, hamis `complete`, hiányos output és hamis forráskapcsolat tiltása;
- minden HTTP/RPC eset után tényleges DB-utóállapot;
- szervezetváltás, idempotens retry és két konkurens expected-revision mentés;
- jóváhagyott, elkülönített fixture esetén 101+ napló/PDF, 201/525+ termék, 51/125+ revízió és viewport/theme mátrix;
- teljes helyi pgTAP, célzott `060`, teljes Vitest, ESLint, TypeScript, izolált production build és `git diff --check`.

## Ténylegesen végrehajtott és kihagyott műveletek

Végrehajtva:

- kötelező dokumentumok, migráció, writer adapter, Server Action-hívási út és pgTAP szerződés célzott ellenőrzése;
- git-, repository-migráció-, lokális env-célpont- és CLI-képességleltár titkok kiírása nélkül;
- Supabase CLI projektleltár próbája, amely access token hiányával állt meg;
- Supabase MCP projektleltár próbája, amely elérhetetlen tool miatt állt meg;
- a releváns aktuális Supabase backup/migrációs és PostgreSQL RLS/privilege/locking útmutatók ellenőrzése.

Nem futott:

- staging migrációlista, schema diff, backfill SQL, backup/PITR és restore;
- multi-user Auth/RLS, direct RPC, Server Action és böngészős staging E2E;
- PDF, nagy adatmennyiség és mobil viewport tesztek;
- pgTAP/Vitest/lint/typecheck/build, mert alkalmazás- vagy sémakód nem változott, és a QA-10 staging kapuja nem nyílt ki.

## Release-döntés és recovery

- **QA-10:** `BLOCKED` a staging azonosításánál.
- **PREFLIGHT COMPLETE:** nem adható.
- **STAGING COMPLETE:** nem adható.
- **PRODUCTION READY:** nem adható; production módosítás nincs engedélyezve.

Elsődleges recovery továbbra is **fail closed + roll forward**: váratlan eltérésnél az érintett írások maradjanak tiltva, immutable snapshot ne változzon, és csak jóváhagyott előre javítással folytatódjon a rollout. Teljes restore csak az elfogadott RPO-adatvesztés és külön Auth/Storage/custom-role terv mellett használható.

## Felhasznált skillek

`supabase:supabase`, `supabase:supabase-postgres-best-practices`, `systematic-debugging`, `test-driven-development` (implementáció nem indult, mert a preflight blokkolt), `verification-before-completion`, `ponytail:ponytail`, `antislop` (UI nem változott).

Javasolt következő lépés: az exact staging project ref, a read-only hozzáférési mód, a staging alkalmazás SHA és a backup/PITR tulajdonosi bizonyíték rendelkezésre bocsátása. Ezek után új read-only preflight szükséges; a migrációhoz ezt követően is külön, konkrét jóváhagyás kell.

Javasolt Conventional Commit: `docs(QA-10): record blocked staging release preflight`.
