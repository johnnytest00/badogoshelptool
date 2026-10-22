# F9.62 — TetőPro teljes architektúra-, teljesítmény- és kódoptimalizálási audit

**Dátum:** 2026-10-22
**Baseline:** `d5413fa2f3f0c75a1edb92f15b67ec95fedec149` (`main`)
**Státusz:** audit elkészült; alkalmazáskód, konfiguráció, dependency, adatbázis és forrásadat nem változott.

## 1. Vezetői összefoglaló

TetőPro szerkezete alapvetően jól szétválasztott: Next.js App Router route-ok és UI-komponensek → feature-alkalmazási folyamatok → domain-számítások, az infrastruktúra adapterként csatlakozik. A teljes build és tesztbaseline zöld. Az audit nem talált bizonyított correctness- vagy jogosultsági regressziót, de talált három közvetlenül forrásból igazolt lekérdezési optimalizációs célpontot, egy bizonyítottan nagy kliens-route artifactot, egy megosztott globális CSS artifactot és egy magas bizalmú, nem használt dependency-jelöltet.

A legfontosabb döntési sorrend:

1. **P1 — kalkulátor klienshatár/chunk:** a `ConstructionCalculatorSuite` egyetlen `use client` modulban statikusan importálja az összes építési, tető-, lépcső- és beton-kalkulátort, valamint a vizuális rajzokat. Csak a `TechnicalDrawing` dinamikus. A `/kalkulatorok` route megfigyelt build-artifact készlete legalább **359 264 byte nyers JS**, ebből a route page chunk **204 604 byte**; a műszaki rajz külön **33 085 byte** chunk. A tényleges böngészős parse/execute költség és az, hogy minden kiválasztatlan függvény ténylegesen bekerül-e a minifikált chunkba, még nincs külön profillal bizonyítva.
2. **P1 — mentett fedéslisták N+1 olvasása:** a cserepeslemez- és trapézlemez-adatbetöltők kalkulációnként külön `calculation_revisions` query-t indítanak. A `Promise.all` csak párhuzamosítja az N query-t; nem szünteti meg az N+1-et.
3. **P1 — felmérésből ellenőrzött tetők N+1 olvasása:** modellenként három, egymástól független query fut (`roof_model_revisions`, `calculation_revisions`, `calculation_dependencies`).
4. **P1 — globális kliens/server shell:** a root layout minden route-on rendereli a provider- és navigációs héjat; az `AppNavigation` minden hitelesített kérésben auth/org feloldást kér. A `React.cache()` a requesten belüli duplikációt csökkenti, de az első auth lookup költségét nem szünteti meg.
5. **P1/P2 — globális CSS:** az `src/app/globals.css` 491 298 byte / 5032 sor, a production CSS artifact 541 565 byte nyers és 75 748 byte gzip. A build manifest szerint ez a root layout CSS-e, ezért nem route-specifikus. A paint/GPU költség — különösen a 102 `backdrop-filter` és 178 `box-shadow` előfordulás — csak runtime trace-ből minősíthető.
6. **P2 — anyagkatalógus lekérdezési forma:** a kalkulátor-hub teljes, legfeljebb 200 termékes katalógust tölt, majd a kapcsolódó adatokat több körben olvassa. A fedési takeoff-opciók két kategóriára két teljes loader-futást indítanak párhuzamosan, közös gyártó- és kategóriaolvasásokkal.
7. **P2 — dependency cleanup jelölt:** a `liquid-glass-react@1.1.1` a `package.json`-ban és lockfile-ban jelen van, de a forrásban nincs importja; a dokumentáció szerint a rim-réteg korábban megszűnt. Ez magas bizalmú eltávolítási jelölt, nem végrehajtott törlés.
8. **P2 — index/query-shape jelöltek:** több query összetett szűrést és rendezést használ, miközben a migrációs indexekből nem minden workloadhoz látszik célzott kompozit index. RLS-szel futtatott `EXPLAIN` nélkül ez csak plausibilis jelölt, nem igazolt hiány.
9. **P2 — kalkulátor interaction/render cost:** a mezőváltozás → számítás → SVG → eredménypanel lánc forrásból látható, de React Profiler/Chrome Performance trace nélkül nincs bizonyított input lag vagy render-loop.
10. **P3 — fejlesztői transform overhead:** a teljes Vitest futás 3,69 s volt; a Vitest kimenete szerint a module transform 4,75 s tracked time-t jelentett. Ez fejlesztői throughput-jel, nem production regresszió.

**Legnagyobb rövid távú haszon:** F9.63-ban a kalkulátor chunk-szétválasztás és a két N+1 listaolvasás batch-elése. **Legnagyobb bizonytalanság:** runtime bundle parse/execute, RLS query plan, valódi adatmennyiség, mobil INP és CSS/GPU költség.

## 2. Hatókör, lefedettség és módszer

### Ellenőrzött repository-lefedettség

| Terület | Mért állapot |
|---|---:|
| `src/` fájlok | 515 |
| App Router `page.tsx` | 41 |
| API `route.ts` | 5 |
| `loading.tsx` / `error.tsx` | 11 |
| `src/components/` fájlok | 28 |
| `src/features/` fájlok | 232 |
| `src/domain/` fájlok | 133 |
| `src/infrastructure/` fájlok | 19 |
| Supabase migráció | 113 |
| Supabase SQL DB-teszt | 57 + 1 `.inc` fixture |
| `use client` fájl | 71 |
| `use server` fájl | 25 |

Elolvastam a teljes `docs/OPTIMIZATION_RESEARCH.md` dokumentumot, ezen belül az F9.61 **14. F9.62 — teljes audit terv** szakaszát, és az audit sorrendjét követtem: baseline → route/boundary → bundle → async/query → DB/RLS forrásaudit → dependency/dead-code jelöltek → célzott ellenőrzések.

### Használt bizonyítékok

- `git`, `rg`, `find`, `sed`, `nl`, build-artifact és manifest ellenőrzés.
- `npm ls`, `package.json`, `package-lock.json`, Next/Vitest/ESLint/TypeScript konfiguráció.
- Ténylegesen futtatott `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Read-only `npx supabase status` kísérlet; Docker socket jogosultság miatt nem jutott el a lokális állapothoz.
- Egyetlen, háttérben futtatott localhost kalkulátor smoke; a browser session nem volt hitelesítve, ezért csak a shell töltődött be.
- F9.61-ben használt és itt újra alkalmazott hivatalos Next.js, React, Supabase/PostgreSQL, Vitest, Chrome DevTools, Tailwind és web.dev ajánlások.

### Bizonyossági jelölések

- **SOURCE-CONFIRMED:** a jelenlegi forrás, config vagy migration közvetlenül bizonyítja.
- **MEASUREMENT-CONFIRMED:** ténylegesen futtatott parancs vagy production build artifact mérte.
- **PLAUSIBLE / UNVERIFIED:** szakmailag indokolt jelölt, de még nincs megfelelő runtime/query-plan bizonyítéka.

Nem végeztem production/hosted adatbázis-mérést, `EXPLAIN (ANALYZE, BUFFERS)` futtatást, `supabase db reset`/migrációt, hosted adatolvasást, Knip- vagy bundle-analyzer-telepítést, React Profiler trace-t, Lighthouse/WebPageTest futást, load testet vagy memory/CPU profilt.

## 3. Jelenlegi architektúratérkép

### Rétegmodell

| Réteg | Bizonyított felelősség | Példák |
|---|---|---|
| Route/UI | App Router oldalak, loading/error, kliensszigetek | `src/app/**`, `src/components/**` |
| Feature/application | auth/org előfeltétel, query orchestration, Server Action | `src/features/**` |
| Domain | geometria, kalkuláció, szerződés, validáció, formázás | `src/domain/**` |
| Infrastructure | Supabase SSR/browser adapter, DB writer, PDF/image adapter | `src/infrastructure/**` |
| Persistence | RLS, revision/snapshot, RPC, index, idempotency | `supabase/migrations/**` |

Az importirány a vizsgált útvonalakon jellemzően UI/route → feature → domain; a Supabase- és image/PDF-adapterek infrastruktúraként csatlakoznak. A klienskomponensekben talált domain-importok a számítási UI-hoz szükségesek; nem találtam kliensből közvetlen server Supabase-adapter importot.

### Fő route-adatfolyamok

| Route/workflow | Route → feature/UI → domain → persistence |
|---|---|
| `/` | `src/app/page.tsx` → `Dashboard` → execution overview → Supabase `execution_*`, quotation és photo olvasások |
| `/kalkulatorok` | `src/app/kalkulatorok/page.tsx:11-25` → `getProjectOrganization` + katalógus → `ConstructionCalculatorSuite` → construction/roof domain számítások; a műszaki rajz `next/dynamic` |
| `/kalkulatorok/nyeregteto` | `StandaloneGablePage` → saved geometry/covering vagy `RoofCreation`/`MultiRoofCalculatorForm` → roof geometry/takeoff domain → szerveroldali persistence olvasás |
| `/kalkulatorok/mentett` | `SavedCalculationsPage` → standalone calculation loader → revision/snapshot validation → `calculations`/`calculation_revisions` |
| `/felmeresek` | `FieldSurveysPage` → `getFieldSurveys` → survey contracts → `field_surveys` |
| `/felmeresek/[surveyId]` | survey header → parallel linked project/version/plans → relationships/geometry → `FieldSurveyEditor` → survey revision/source tables |
| `/projektek/[projectId]` | project → roof models → execution workspace → drawing/calculator links → project-scoped Supabase reads |
| API PDF/CSV/photo/document routes | `src/app/api/**/route.ts` → auth/org/project check → feature data + PDF/image adapter → response; signed storage URLs és snapshotok több route-on jelen vannak |

### Root shell

`src/app/layout.tsx:78` minden route-on rendereli a `PremiumGlassBackground`, theme/liquid-glass/scaling/interaction providereket, `AppNavigation`, `MobileFocusSupport` és `ScalingBubble` elemeket. `AppNavigation` (`src/components/navigation/app-navigation.tsx:10-14`) auth contextet kér. `getAuthContext` (`src/features/auth/auth.server.ts:18-46`) request-scope `React.cache()`-elt, claims után párhuzamos user/profile/membership olvasást, majd organization olvasást végez.

## 4. Mért baseline és artifact-állapot

### Automated baseline

| Ellenőrzés | Tényleges eredmény |
|---|---|
| `npm run typecheck` | PASS; Next route typegen és `tsc --noEmit` hibamentesen |
| `npm run lint` | PASS; `ESLint: No issues found` |
| `npm test` | PASS; 152 fájl, 904 PASS, 19 skip / 923 teszt |
| `npm run build` | PASS; Next.js 16.4.2 webpack, compile 3,6 s, TypeScript 1,0 s, static generation 32/32, 9 worker |
| working tree a build után | tiszta; a build nem módosított forrás/config dokumentumot |

### Production bundle/CSS artifact

Az `npm run build` után megmaradt `.next` artifactból mérve:

| Artifact | Nyers | gzip | Értelmezés |
|---|---:|---:|---|
| `/kalkulatorok` page chunk | 204 604 B | 54 725 B | route-specifikus kliens chunk |
| `/kalkulatorok` megfigyelt első chunkkészlet | 359 264 B | — | page + a manifestben felsorolt shared chunks; transfer nem mérve |
| dinamikus `TechnicalDrawing` chunk | 33 085 B | 10 191 B | külön lazy chunk |
| root layout CSS `5d969...css` | 541 565 B | 75 748 B | globális CSS artifact |
| második build CSS artifact | 11 812 B | — | layout/route kiegészítő |
| `src/app/globals.css` | 491 298 B / 5032 sor | — | forrásméret |

Forrásjellegű CSS-költségjelek: 102 `backdrop-filter`, 178 `box-shadow`, 7 `@keyframes`, 13 `animation:` és 43 `transition:` előfordulás. Ezek nem bizonyítják a frame dropot vagy GPU-terhelést.

### Runtime és browser baseline

- A port 3000-on meglévő dev szervert nem indítottam újra és nem állítottam le.
- A localhost smoke hitelesítés nélküli in-app browser sessionben csak a TetőPro shellt és a skip-linket mutatta. Login vagy jelszóbevitel nem történt.
- Emiatt route-level Network waterfall, server response timing, INP, first input, layout shift, console és calculator input trace **nem bizonyított**.
- A Vitest riport szerint a teljes futás 3,69 s; a module transform tracked time 4,75 s. A transform cache opciót nem állítottam át.

## 5. Megerősített findingek és top 10 optimalizációs lehetőség

| ID | Prioritás | Állapot / bizalom | Finding és pontos bizonyíték | Hatás és minimális következő lépés |
|---|---|---|---|---|
| F9.62-01 | P1 | SOURCE + artifact MEASUREMENT-CONFIRMED / magas | `construction-suite.tsx:1-25` minden calculator category domain függvényét és `construction-visuals`-t importál; `:32-35` csak `TechnicalDrawing` dinamikus. `/kalkulatorok` observed first chunk set 359 264 B raw. | Mobil initial JS/parse/execute kockázat. F9.63: kategória- vagy kiválasztott-kalkulátor szintű split, majd Network/Coverage és interaction mérés. |
| F9.62-02 | P1 | SOURCE-CONFIRMED / magas | `gable-metal-tile-covering-data.ts:58-68` kalkulációnként query-zza a revíziókat; ugyanez `gable-trapezoidal-covering-data.ts:53-63`. | N kalkuláció esetén 1 + N DB round-trip. Batch `.in(calculation_id, ids)` és map-by-id javasolt; a revision validation maradjon változatlan. |
| F9.62-03 | P1 | SOURCE-CONFIRMED / magas | `survey-roof-actions.ts:63-78`: `models.map(async ...)`, modellenként három query (`roof_model_revisions`, `calculation_revisions`, `calculation_dependencies`). | Projekt tetőmodell-számával lineárisan nő a round-trip. Batchelt, org-scoped read + változatlan exact verification szükséges. |
| F9.62-04 | P1 | SOURCE-CONFIRMED / közepes-magas | Root layout mindig rendereli az `AppNavigation`-t; `AppNavigation` auth contextet kér; `getAuthContext` claims → parallel user/profile/membership → organizations. Request dedup van, route timing nincs. | Minden authenticated route kap shared server latencyt. F9.63 előtt route timing és query count kell; globális auth-cache vagy auth-bypass nem javasolt. |
| F9.62-05 | P1/P2 | SOURCE + artifact MEASUREMENT-CONFIRMED / közepes | `globals.css` 491 KB source; root CSS 541 565 B raw / 75 748 B gzip és root layout entry. | Minden route közös CSS letöltési/parse költsége; backdrop/paint kockázat csak trace alapján. Route CSS split vagy token cleanup csak visual/regression mérés után. |
| F9.62-06 | P2 | SOURCE-CONFIRMED / közepes | `material-data.ts:50-54` max 200 product után manufacturer/variant/category parallel, majd prices és options soros körben; `/kalkulatorok/page.tsx:20` teljes katalógust kér. | Szerver round-trip/payload költség nagy katalógusnál. Szűk profile loader vagy egy batchelt catalog query mérendő, nem általános cache. |
| F9.62-07 | P2 | SOURCE-CONFIRMED / közepes | `takeoff-data.ts:100-104` két párhuzamos `getMaterialProductsForOrganization` hívás kategóriánként; mindkettő saját kapcsolati loader-ciklust indít. `loadTakeoffs:144` teljes katalógust kér. | Duplikált org-scoped catalog/related reads. Egy közös query + kategória szerinti in-memory filter jelölt; csak query-count mérés után. |
| F9.62-08 | P2 | SOURCE-CONFIRMED candidate / magas jelöltbizalom | `liquid-glass-react@1.1.1` deklarált dependency; a source-wide importkeresés csak package/docs találatot adott, runtime source importot nem. | Felesleges install/lock/node_modules költség lehet. Külön cleanup taskban package-artifact, build és docs ellenőrzés után távolítható; F9.62-ben nem töröltem. |
| F9.62-09 | P2 | PLAUSIBLE / UNVERIFIED | `material_products`, `calculations`, `calculation_revisions` többoszlopos szűrés/rendezésű query-ket kapnak; a migrációs indexek workloadonként nem mindenhol kompozitak. | Nagy adaton RLS/planner scan lehet. RLS-szel futtatott non-production `EXPLAIN` és query timing nélkül nincs index-javaslat. |
| F9.62-10 | P2/P3 | PLAUSIBLE + dev MEASUREMENT | `ConstructionCalculatorSuite` mezőváltozáskor számol és rajzol; Vitest transform 4,75 s tracked time. React/Chrome trace nincs. | Input lag, extra render vagy dev throughput kockázata csak profilból állapítható meg. Memo/useMemo/worker csak measured hotspotra. |

## 6. Dead code, unused export és dependency audit

### Magas bizalmú dependency-jelölt

- **`liquid-glass-react@1.1.1` — REMOVE CANDIDATE, nem végrehajtva.** `rg` alapján nincs import a `src/`, `scripts/`, config vagy build entry területén. Az `@fontsource/noto-sans`, `@react-pdf/renderer`, `pg`, `sharp`, `@supabase/*`, `lucide-react` és `zod` ténylegesen használt.
- A történeti `docs/CLAUDE_HANDOFF.md` és `docs/TEST_MATRIX.md` említi a package korábbi használatát; ezért a forrás-import hiánya önmagában még nem engedélyez automatikus törlést. A megfelelő cleanup feladatban új buildet, docs-egyeztetést és lockfile-diffet kell ellenőrizni.

### Nem törölhető automatikusan

- `src/app/kalkulatorok/epitesi/page.tsx` explicit kompatibilitási redirect.
- `/kalkulatorok/cserepeslemez`, `/kalkulatorok/lemezprofilok` és `/kalkulatorok/mentett` régi/önálló workflow-contractokat szolgálnak; route jelenlétük nem dead code.
- `construction-thumbnails.tsx` és a rajzi exportok tesztekkel és a kalkulátor-hubbal is elértek.
- Filesystem route, dynamic import, test fixture, migration és external API contract statikus analyzer alapján sem törlendő review nélkül.

### Eszközkorlát

Knip nincs telepítve (`npm ls knip` → empty). Nem telepítettem, mert F9.61 és a kérés is audit-only, dependency/config változtatás nélkül. A teljes unused export/file bizonyítás így **nem futott**.

## 7. Adatbázis, query-shape és RLS audit

### Forrásból igazolt struktúra

- 113 migration, 52 `public` table definition, 69 index, 151 policy, 179 function definition, ebből 82 `SECURITY DEFINER` előfordulás.
- A szervezeti hozzáférési helper-ek (`private.is_org_member`, `private.is_org_admin_or_owner`) `security definer`, `stable`, `search_path = ''` beállításúak; a private schema és execute grant explicit módon kezelve van (`20261012000000_foundation.sql:126-145`).
- A `calculations`/`calculation_revisions` és több workflow revision/snapshot sémája szervezeti kulccsal, változatlansági/revíziós constrainttel, RLS-szel és idempotency/concurrency RPC-kel védett.
- A vizsgált write path-ekben látszik `expected_revision_number`, `FOR UPDATE`, advisory lock, request key/idempotency és snapshot/provenance ellenőrzés. Ez adatkonzisztencia-bizonyíték, nem teljes performance-bizonyíték.

### Megerősített DB opportunity

F9.62-02 és F9.62-03 közvetlenül a TypeScript query orchestrationben bizonyított N+1. A migrációs séma ezt nem oldja meg automatikusan; a batch read-et ugyanazzal az organization-scope, revision validation és exact source-ellenőrzéssel kell megvalósítani.

### Nem igazolt DB állítások

- Nem állítható, hogy valamely RLS policy lassú, scan-el vagy hiányzik hozzá index.
- Nem állítható, hogy a `calculation_revisions_calculation_id_idx`, az egyedi `(calculation_id, revision_number)` indexek vagy a material/field-survey indexek elegendők a jelenlegi production cardinalityhoz.
- Nem futott `EXPLAIN`, query timing, Supabase Query Performance, Index Advisor vagy RLS-szel hitelesített plan.

### DB ellenőrzési korlát

`SUPABASE_TELEMETRY_DISABLED=1 npx supabase status` read-only ellenőrzése sikertelen volt: a helyi Docker API socket (`/Users/bence/.docker/run/docker.sock`) permission denied. A sima `npx supabase status` a Supabase telemetry fájl írási jogosultsága miatt sem jutott el a statusig. `npm run db:test` nem futott, mert a lokális DB-tesztek adatbázis-állapotot használnak, és F9.62-ben nem volt engedélyezett reset/migráció/adatmutáció.

## 8. Kalkulátor teljesítmény és lazy-loading — egyértelmű válasz

**Igen: a jelenlegi `/kalkulatorok` hub kliensoldali belépési lánca szükségtelenül széles lehet.**

Bizonyítottan:

- `construction-suite.tsx` `use client` modul.
- A modul statikusan importálja a beton-, tető- és lépcsőmotorokat, valamint a rajzi/vizuális komponenseket (`:10-25`).
- A `definitions` objektum az összes verified konstrukciós kalkulátor definícióját ugyanebben a kliensmodulban tartja.
- A kiválasztó `definitions[item.id]` alapján vált, nem selected-id alapú `import()`-tal (`:559-571`).
- Csak `TechnicalDrawing` külön `next/dynamic`, `ssr: false`-szal (`:32-35`).
- A build RSC/client manifest a `ConstructionCalculatorSuite`-ot a `/kalkulatorok` page chunkhoz és több shared chunkhoz rendeli; a megfigyelt nyers készlet 359 264 byte.

Ez nem jelenti azt, hogy a minifier minden nem kiválasztott függvényt megőriz, és nem bizonyítja a parse/execute vagy INP romlását. A helyes F9.63 mérés: `/kalkulatorok?calculator=...` route-on Network + Coverage + CPU throttling, majd egy egyszerű és egy összetett kalkulátor input trace; a kiinduló route artifactot ugyanazzal a build móddal kell összevetni.

**Nem ajánlott:** minden komponenst automatikusan `dynamic()`-gá tenni, vagy a domain-motorokat workerbe mozgatni mérés nélkül. A legkisebb ésszerű első split a konstrukciós kategória vagy a kiválasztott kalkulátor motorja, a közös selector/catalog contract megtartásával.

## 9. Ajánlott változtatások — csak terv, nem implementáció

### P1

1. **Calculator chunk split:** a hub shell, catalog/selector és a selected calculator UI külön entry; a heavy drawing és csak a választott category lazy. Ellenőrizd raw/gzip assetet, parse/execute, input INP és route navigációt.
2. **Batch saved-covering revisions:** `listGableMetalTileCoverings` és `listGableTrapezoidalCoverings` kapjon egy `calculation_id in (...)` revision read-et és id→rows map-et; a meglévő output re-calculation/validation maradjon.
3. **Batch survey roof verification:** modell/revízió/dependency id-ket egyszerre olvasni, majd exact org/model/revision kapcsolatot in-memory map-pel és változatlan ellenőrzéssel visszaépíteni.
4. **Auth/nav timing:** instrumentáld egy authenticated route-on az `AppNavigation` és page data dependency graphot. Csak mérés után dönthető el, hogy a shared nav auth read külön route shellbe, query-param fallbackbe vagy más szerveroldali struktúrába kerüljön.

### P2

5. **Catalog shape:** a calculator profile-hoz szükséges mezőkre célzott loader, vagy egyetlen kategória-union query; a teljes material recordot ne olvasd minden consumerben, ha nem kell.
6. **CSS:** a route-level CSS split és a glass effect-ek paint costja külön desktop/mobile trace alapján. A reduced-motion, forced-colors, nyomtatás és Liquid Glass vizuális szerződés maradjon regressziókapu.
7. **Dependency cleanup:** külön diffben ellenőrizd a `liquid-glass-react` teljes source/build/docs használatát, majd töröld csak akkor.
8. **Index decision:** csak RLS-szel futtatott non-production plan, row count, p95 timing és write-cost alapján javasolj migrációt.

## 10. Javasolt roadmap

| Fázis | Cél | Kilépési bizonyíték |
|---|---|---|
| F9.63-A | `/kalkulatorok` route és selected calculator bundle baseline | raw/gzip/brotli, Network, Coverage, CPU/INP, ugyanaz a build mode |
| F9.63-B | két saved-covering N+1 batch read | query count N=0/1/10/100, output/revision parity, targeted + full tests |
| F9.63-C | survey roof verification batch read | query count és exact source/security parity, concurrency test, no domain formula change |
| F9.63-D | calculator category/selected loading split | unchanged selector UX, no route contract change, bundle and smoke evidence |
| F9.64 | RLS/query-plan és CSS/GPU audit | non-production RLS `EXPLAIN`, p50/p95, mobile/desktop trace, no unapproved migration |
| később | observability, dependency cleanup, dead code | privacy-safe telemetry decision, Knip configured entry graph, explicit cleanup review |

## 11. Mérési és regresszióvédelmi terv

1. **Route matrix:** `/`, `/kalkulatorok`, `/kalkulatorok/nyeregteto`, `/felmeresek`, `/felmeresek/[surveyId]`, `/projektek/[projectId]`; authenticated, egy- és több-szervezetes fixture-rel.
2. **Bundle:** production webpack artifact és browser Network; raw, gzip/brotli transfer, parsed/compiled JS és route shared chunkok. A build analyzer csak külön jóváhagyott, nem telepítendő audit-eszköz lehet.
3. **Server:** route response timing, RSC payload méret, auth/org/data query count; cold/warm cache külön.
4. **Database:** non-production, RLS-szel hitelesített session, `EXPLAIN (ANALYZE, BUFFERS)` csak read-only SELECT-re; p50/p95, rows, buffers, index usage és N+1 count.
5. **Calculator:** egyszerű/összetett input mátrix, first input → result, React render count/commit time, Chrome Performance dropped frame és SVG DOM/paint.
6. **CSS/assets:** Coverage csak workflow-jelzésként; desktop/mobile Performance trace, backdrop/blur/shadow paint/composite, font load, reduced-motion/forced-colors smoke.
7. **Acceptance:** minden változtatás előtt/után ugyanaz a fixture, viewport, build mode és cache-állapot; correctness, auth/org isolation, snapshot/revision parity és teljes test baseline marad.

## 12. Elhalasztott vagy nem ajánlott irányok

- `use cache`/`cacheComponents` szervezeti vagy auth-adatra: cache key, invalidáció és cross-org bizonyíték nélkül veszélyes.
- Globális `memo`/`useMemo`/`useCallback`: a kalkulátor render hotspot még nincs profilozva.
- Minden UI vagy domain-modul `dynamic()`-gá tétele: waterfall és UX regresszió lehet.
- Új worker/queue a geometriai számításokra: a számítási CPU-költség nincs mérve.
- Index vagy denormalizáció migráció nélkül végzett „vakon” bevezetése.
- Legacy route, migration, test fixture vagy PDF/API kód automatikus törlése.
- Knip, `@next/bundle-analyzer`, Lighthouse vagy más dependency telepítése ebben az audit-mérföldkőben.
- Liquid Glass teljes eltávolítása pusztán a package név alapján; csak a külön dependency cleanup után.

## 13. Security, compatibility és adatkonzisztencia

- F9.62 nem változtatott auth, RLS, schema, RPC, migration, dependency, route contract vagy domain képletet.
- A batch-read javaslatoknak minden rekordnál meg kell tartaniuk az `organization_id` szűrést, ownership scope-ot, current revision ellenőrzést, snapshot/provenance validációt és exact survey source kapcsolatot.
- A `SECURITY DEFINER` függvények nagy száma önmagában nem security finding; a helper-eknél a `search_path=''`, schema revoke/grant és explicit auth check forrásból látható. RPC-nkénti review és RLS plan továbbra is hiányzik.
- Chunk splitnél nem szabad szerver-only modult kliensre húzni, nagy RSC payloadot vagy secretet serializálni, illetve a calculator output contractot/roundingot módosítani.
- Dependency törlésnél kompatibilitási kockázat a CSS-injection, SSR oldalhatás vagy rejtett plugin/runtime entry; ezt külön cleanup diffben kell kizárni.

## 14. Hivatkozások és auditált eszközök

### Projektforrások

- [`AGENTS.md`](../AGENTS.md)
- [`PROJECT_BLUEPRINT.md`](../PROJECT_BLUEPRINT.md)
- [`docs/OPTIMIZATION_RESEARCH.md`](OPTIMIZATION_RESEARCH.md), különösen a 11–14. szakasz
- [`docs/PROGRESS.md`](PROGRESS.md)
- [`docs/PROJECT_MAP.md`](PROJECT_MAP.md)
- [`docs/DATABASE.md`](DATABASE.md)
- [`docs/TEST_MATRIX.md`](TEST_MATRIX.md)
- [`package.json`](../package.json)
- [`src/app/layout.tsx`](../src/app/layout.tsx)
- [`src/features/calculators/construction-suite.tsx`](../src/features/calculators/construction-suite.tsx)
- [`src/features/auth/auth.server.ts`](../src/features/auth/auth.server.ts)
- [`src/features/roof-models/gable-metal-tile-covering-data.ts`](../src/features/roof-models/gable-metal-tile-covering-data.ts)
- [`src/features/roof-models/gable-trapezoidal-covering-data.ts`](../src/features/roof-models/gable-trapezoidal-covering-data.ts)
- [`src/features/field-surveys/survey-roof-actions.ts`](../src/features/field-surveys/survey-roof-actions.ts)
- [`supabase/migrations/20261012000000_foundation.sql`](../supabase/migrations/20261012000000_foundation.sql)
- [`supabase/migrations/20261012010000_versioned_calculation_architecture.sql`](../supabase/migrations/20261012010000_versioned_calculation_architecture.sql)

### Hivatalos külső források

- [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js Package Bundling](https://nextjs.org/docs/app/guides/package-bundling)
- [Next.js Revalidating](https://nextjs.org/docs/app/getting-started/revalidating)
- [Next.js `use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Next.js Instrumentation](https://nextjs.org/docs/app/guides/instrumentation)
- [React `memo`](https://react.dev/reference/react/memo) és [`useMemo`](https://react.dev/reference/react/useMemo)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [PostgreSQL `EXPLAIN`](https://www.postgresql.org/docs/current/using-explain.html)
- [Vitest Profiling](https://vitest.dev/guide/profiling-test-performance)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/overview)
- [Chrome DevTools Coverage](https://developer.chrome.com/docs/devtools/coverage)
- [web.dev Web Vitals](https://web.dev/articles/vitals)

### Használt releváns képességek

- `build-web-apps:react-best-practices`: waterfall, client boundary, bundle és render checklist.
- `build-web-apps:frontend-testing-debugging` és in-app browser: egyetlen read-only localhost smoke; auth nélkül nem erőltettem a bejelentkezést.
- `supabase:supabase` és `supabase-postgres-best-practices`: RLS, `SECURITY DEFINER`, query/index és non-production EXPLAIN guard.
- `verification-before-completion`: friss lint/typecheck/test/build és diff/whitespace ellenőrzés a lezárás előtt.
- Ponytail full: csak a bizonyítható legkisebb audit deliverable készült; analyzer/Knip/install/refactor nem történt.

## 15. F9.63 javasolt első optimalizációs milestone

**Javasolt scope:** `Calculator initial-load + batched saved reads`.

### Implementálandó minimális csomag

1. A `/kalkulatorok` construction suite kategória- vagy selected-calculator lazy boundary-ja.
2. A két fedéslista N+1 revision-read batch-elése.
3. A survey roof verification modell-queryinek batch-elése.
4. Azonos domain képlet, snapshot/output validation, auth/RLS és route contract.

### Nem része F9.63-nek

Auth vagy RLS policy átalakítás, cacheComponents/use-cache, adatbázis-migráció/index, domain-matematika, rounding, Liquid Glass redesign, legacy route törlés, dependency cleanup és hosted deploy.

### Elfogadási feltételek

- `/kalkulatorok` selected calculator initial JS és parse/execute mérhetően javul vagy a split elutasítható mérési bizonyítékkal.
- Saved covering list és survey roof workflow query countja N>1 esetén batchhez igazodik.
- Minden meglévő output/revision/security teszt PASS; új targeted test védi a batch map és exact validation parityt.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` PASS; egyetlen célzott browser smoke PASS hitelesített local fixture-rel.

**Javasolt Conventional Commit:** `perf: F9.63 split calculator chunks and batch saved reads`

**F9.62 átadási állapot:** COMPLETE mint auditdokumentum. A megvalósítási döntések és minden kód/config/DB változtatás F9.63-ra marad.
