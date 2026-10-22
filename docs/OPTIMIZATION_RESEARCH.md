# F9.61 — Fejlett szoftverarchitektúra-, teljesítmény- és kódoptimalizálási kutatás

**Státusz:** RESEARCH ONLY — kutatási tudásbázis, nem kódaudit és nem optimalizálási változtatás
**Dátum:** 2026-10-22 (Europe/Budapest)
**Következő mérföldkő:** F9.62 — teljes, bizonyíték-alapú TetőPro teljesítmény- és architektúra-audit

> Fontos: a dokumentum optimalizálási lehetőségeket és ellenőrzési módszereket ír le. Nem bizonyítja, hogy a TetőPro-ban túl nagy bundle, lassú lekérdezés, dead code, renderelési hiba, memória- vagy CPU-probléma van. Ezeket csak az F9.62 mérései igazolhatják.

## 1. Vezetői összefoglaló

TetőPro esetében a legígéretesebb kutatási irányok nem az általános „minden legyen lazy” vagy „minden legyen memoized” típusú receptek. A legnagyobb várható értéket a következő, méréshez kötött ellenőrzések adják:

1. **Klienshatárok és kalkulátor-chunkok feltérképezése:** a kalkulátor-katalógus maradjon könnyű; a tényleges kalkulátor UI-ja, rajza és opcionális függősége csak a választott munkafolyamatban legyen klienskód.
2. **Bundle- és importlánc-mérés:** a Next.js alapértelmezett route-szétválasztása sok esetet már megold; csak a ténylegesen nagy vagy rossz helyre került client island kapjon célzott dinamikus betöltést.
3. **Async waterfall- és request-dedup-audit:** független szerveroldali műveletek párhuzamosítása, közös render-passban történő deduplikálás és felesleges RSC-serializáció megszüntetése.
4. **Lekérdezés- és RLS-mérés:** életszerű adatmennyiséggel futtatott `EXPLAIN (ANALYZE, BUFFERS)`/Supabase `explain()`, szervezeti szűréssel együtt; index csak terv és mérés alapján.
5. **Kalkulátor interakcióprofilozása:** inputváltozás, geometriai újraszámítás, SVG-újrarenderelés és mentési útvonal külön mérendő; memoizáció, transition vagy worker csak a bizonyított szűk keresztmetszethez.
6. **Biztonságos dead-code- és dependency-elemzés:** Next route-ok, dinamikus importok, tesztek, migrációk, build discovery és történeti kompatibilitási szerződések miatt egy statikus finding önmagában nem törlési engedély.
7. **Liquid Glass, CSS és SVG költségprofilja:** hideg betöltés, scroll, interakció és paint/composite külön vizsgálandó; a vizuális nyelvet nem kell feladni.
8. **Mérési és regressziós alapvonal:** LCP, INP, CLS, TBT-lab proxy, navigációs latency, server/query timing, bundle méret és kalkulátor-idő rögzíthető összehasonlítás nélkül nincs megbízható „javulás”.

A legfontosabb biztonsági következtetés: **authentikált és szervezethez kötött adatot nem szabad közös cache-be tenni pusztán a sebesség kedvéért.** A cache-kulcs, invalidálás, RLS és történeti snapshot-konzisztencia bizonyítékának együtt kell állnia.

## 2. Ellenőrzött projektkontekstus és határ

### 2.1 Ténylegesen ellenőrzött környezet

A lokálisan telepített `node_modules` csomagverziói:

| Terület | Ellenőrzött verzió |
|---|---:|
| Next.js | 16.4.2 |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Vitest | 5.0.3 |
| Supabase CLI | 2.120.0 |

A `package.json` deklarált függőségei és a projekt dokumentációja a fentiekhez közeli, de nem mindenhol azonos verziót jelöl; a jelenlegi kutatásban a ténylegesen telepített verziót tekintem kompatibilitási referenciának. Nem módosítottam a `package.json`-t, lockfile-t, Next-configot, TypeScript-configot vagy Supabase-konfigurációt.

### 2.2 A projekt dokumentációjából átvett architekturális tények

Az `AGENTS.md`, `PROJECT_BLUEPRINT.md`, `docs/AI_TOOLING.md`, `docs/PROJECT_MAP.md`, `docs/DATABASE.md` és `docs/TEST_MATRIX.md` alapján a kutatás ezekre a meglévő keretekre épül:

- Next.js App Router, Server és Client Components, TypeScript és Tailwind CSS.
- Supabase/PostgreSQL, szervezet-alapú hozzáférés, RLS, immutable revíziók és calculation/source snapshotok.
- Felmérés, tetőmodell, több kalkulátor, SVG műszaki rajz, anyagkezelés, anyaglista, ajánlat és kivitelezési munkanapló.
- Domain-számítások és feature-folyamatok, ahol a geometriai/matematikai eredmény nem azonos statikai vagy gyártói megfelelőséggel.
- Vitest, ESLint, typecheck, helyi Supabase-tesztek és célzott böngészős ellenőrzések.
- Mobil-first használat, Liquid Glass vizuális réteg, PWA-irány és későbbi több-szervezetes SaaS-cél.

### 2.3 Mit nem végeztem el ebben a fázisban

- Nem olvastam át a teljes `src/` kódot, és nem futtattam teljes repository-auditot.
- Nem mértem bundle-t, RUM-ot, Web Vitals-t, React render-countot, CPU-t vagy memóriahasználatot.
- Nem futtattam lekérdezést, `EXPLAIN ANALYZE`-t, RLS összehasonlítást vagy Supabase-adatbázis-mérést.
- Nem indítottam dev szervert, buildet, böngészős smoke workflow-t vagy terheléses tesztet.
- Nem telepítettem új csomagot vagy plugint, és nem módosítottam alkalmazásforrást, adatbázist, konfigurációt vagy történeti adatot.

## 3. Kutatási módszertan és osztályozás

### 3.1 Forrásprioritás

Elsődlegesen aktuális, hivatalos vagy a projekt által már telepített, karbantartott forrásokat használtam:

- Next.js 16 App Router dokumentáció a lazy loadingról, package bundlingról, Cache Components-ről, revalidációról, instrumentationről és a 16-os verzió változásairól.
- React 19 dokumentáció a `memo`, `useMemo` és `useTransition` használati határairól.
- Supabase dokumentáció a query planről, indexekről, RLS-teljesítményről és teljesítmény-debuggingról.
- PostgreSQL dokumentáció az `EXPLAIN`/`EXPLAIN ANALYZE` méréséről és korlátairól.
- TypeScript TSConfig, Knip, Vitest, Chrome DevTools, Tailwind CSS és web.dev dokumentáció.

A népszerűség önmagában nem volt elfogadási szempont. Egy technika akkor kerülhet F9.62-jelöltként előre, ha mérhető probléma, reprodukálható mérés és biztonságos visszaállítási út tartozik hozzá.

### 3.2 Kutatási kategóriák

| Jelölés | Jelentés |
|---|---|
| **HIGH-PRIORITY CANDIDATE** | Elsőként érdemes mérni; gyakori, nagy hatású, viszonylag kontrollálható kockázatú terület. Nem bizonyított TetőPro-hiba. |
| **CONTEXT-DEPENDENT** | Csak konkrét mérési eredmény és érintett workflow alapján indokolt. |
| **ADVANCED / LATER** | Későbbi skálázási vagy terhelési jelenséghez való; korai bevezetése komplexitást hozhat. |
| **NOT RECOMMENDED FOR THIS STACK** | Általános receptként vagy jelenlegi bizonyíték nélkül várhatóan több kárt/komplexitást okoz, mint hasznot. |

Az „elvárt potenciális haszon” csak kvalitatív: **alacsony / közepes / magas**. Százalékos javulást nem állítok mérés nélkül.

## 4. Frontend: JavaScript, bundle és kalkulátor-betöltés

### 4.1 Mi történik automatikusan Next.js App Routerben?

Az App Router Server Components rétege route-szinten automatikusan code splitelhető, a Next.js pedig bundle-optimalizálást és tree-shakinget végez. Ezért a „minden komponenshez külön `dynamic()`” megközelítés nem alapértelmezett jó gyakorlat.

A Next.js lazy-loading útmutató fontos határai:

- A lazy loading főként Client Components és importált klienskönyvtárak betöltését halasztja.
- `next/dynamic` és `React.lazy()` használható, de a betöltési határnak valós kliensszigethez vagy valóban nehéz opcionális könyvtárhoz kell tartoznia.
- Ha Server Component dinamikusan importál Client Componentet, az automatikus code splitting jelenlegi korlátait külön kell ellenőrizni; ezt nem szabad feltételezésből építészeti garanciának tekinteni.
- `ssr: false` csak Client Componentnél érvényes, és csak böngésző-specifikus, SSR-rel nem kompatibilis kódnál indokolt.

**TetőPro-jelölt architektúra F9.62-re:**

1. A kalkulátor-hub Server Componentként csak típusos, könnyű katalógusmetaadatot és navigációt adjon.
2. A választott kalkulátor külön route- vagy jól körülhatárolt Client Component-belépési pont legyen.
3. A domain-képletek és normalizálók maradjanak UI-tól független, újrahasznosítható TypeScript modulok; a domain importja ne húzzon be rajzoló- vagy form-könyvtárat.
4. A nagy SVG-rajz, opcionális szerkesztő, képfeldolgozó vagy ritka exportkód csak akkor töltsön klienskódot, amikor a workflow tényleg használja.
5. A betöltési állapot legyen felhasználói szempontból értelmes és ne okozzon layout shiftet.
6. A route-prefetchet a tényleges navigációs valószínűséghez kell hangolni; a Next.js 16 layout-deduplicationt és incremental prefetchinget már beépítetten kezeli, így kézi prefetch csak mérés után indokolt.

### 4.2 Bundle-mérés és dependency-szétválasztás

Vizsgálandó bizonyíték:

- route-onkénti initial JS, RSC payload, összes transfer és gzip/brotli méret;
- kliens- és szerverbundle importlánca;
- nagy vagy duplikált csomagok, barrel-importok és accidental client boundary-k;
- a kalkulátor-hub betöltésekor jelen lévő, de nem választott kalkulátor-kód;
- statikus és interaktív route-ok közötti különbség.

Ajánlott mérési eszközök:

- Next.js 16 bundle analyzer: Turbopack esetén a 16.1+ kísérleti analyzer, Webpack buildnél az `@next/bundle-analyzer`.
- `next build` jelentések és a build artifact import-chain nézete.
- Chrome DevTools Network/Performance/Coverage, a Coverage eredményét mindig valódi workflow-val értelmezve.

**Korlát:** a `@next/bundle-analyzer` jelenleg nem szerepel a projekt `package.json`-jában. F9.61-ben nem telepítendő; F9.62-ben külön jóváhagyással, egyszeri mérési eszközként vizsgálható. A jelenlegi `npm run build` Webpackot használ, ezért a Webpack analyzer lehet a legkisebb illeszkedés, de ezt a build- és configállapot alapján kell megerősíteni.

### 4.3 Server/Client határok

Kutatási szabályok:

- Maradjon Server Componentben minden, ami nem igényel böngészőállapotot, eseménykezelőt vagy DOM API-t.
- A Client Component props-a legyen kicsi és célzott; ne adjunk át teljes adatbázisrekordokat vagy fölösleges snapshotokat, ha csak néhány mező kell.
- Titkos, service-role vagy szerver-only modul ne kerülhessen kliens importláncba; a határt `server-only`/import-graph ellenőrzéssel is vizsgálni kell.
- A kliensre küldött számítási input/output legyen minimális, de a történeti snapshot és provenance ne vesszen el csak azért, hogy kisebb legyen a payload.
- A form state maradjon a lehető legközelebbi komponensben; globális providerbe csak valóban több workflow által megosztott, kis és stabil állapot kerüljön.

### 4.4 React-renderelés

A React dokumentáció alapján:

- `memo` csak akkor értékes, ha a komponens gyakran, azonos props mellett és drága renderrel újrarenderelődik. Nem correctness-eszköz és nem garancia.
- `useMemo` tiszta, valóban drága számítás eredményét cache-elheti; egyszerű primitive kifejezésekre csak olvashatósági költséget ad.
- `useTransition`/`startTransition` nem sürgős UI-frissítések, például nagy rajz vagy eredménytábla frissítésének háttérbe sorolására való; a felhasználói input kontrollja maradjon azonnali.
- `useDeferredValue` csak akkor indokolt, ha a késleltetett másodlagos nézet mérhetően javítja az interakciót.
- A felesleges Effect → state → újrarender láncokat előbb kell megszüntetni, mint memoizálni.
- React DevTools Profiler nélkül a széles körű `memo`, `useCallback` és `useMemo` bevezetés prematur optimization.

**Kalkulátor-specifikus alkalmazás:** a mért geometriai inputból számolt, tiszta eredmény lehet célzott `useMemo`-jelölt, de csak stabil, normalizált dependency-k mellett. A mentési státusz, validáció és provenance ne legyen memoizáció miatt elavult.

### 4.5 Listák, formok és streaming

- Hosszú anyag-, revízió- vagy projektlistán a virtualizáció csak akkor kell, ha a valós elemszám és scroll/profiling ezt indokolja.
- Controlled formnál a mezőérték, validáció és drága számítás külön state/update prioritást kaphat; a teljes űrlap minden karakterre történő újraszámítása mérendő jelölt.
- Suspense és streaming a gyors első shell és később érkező, nem kritikus szakaszok szétválasztására használható; nem old meg önmagában lassú adatbázis-lekérdezést.
- A loading state ne legyen csak spinner: a méret, elrendezés és a számítási állapot legyen előre kiszámítható.

## 5. Backend és szerveroldali teljesítmény

### 5.1 Waterfall és párhuzamosítás

F9.62-ben minden érintett Server Component, Server Action és Route Handler esetén érdemes felrajzolni:

```text
request → auth/org check → independent reads → dependent read → domain transform → response/RSC
```

Jelölt javítások:

- Független olvasásokat `Promise.all`-lal párhuzamosítani, de csak akkor, ha valóban nincs adatfüggőség és az egyidejű terhelés elfogadható.
- A promise-t korábban elindítani és később awaitelni, ha ettől nincs jogosultsági vagy hibakezelési rés.
- A közös render-passban ugyanazt a közvetlen DB-adatlekérést React `cache()`-szel deduplikálni, ha a kulcs és a szervezeti/auth kontextus korrekt.
- N+1 mintát query counttal és trace-szal bizonyítani, nem pusztán kódolvasás alapján feltételezni.
- A szerverről kliensre küldött objektumot célzott mezőkre szűkíteni, de immutable revíziókhoz szükséges source/provenance adatot nem elhagyni.

### 5.2 Caching és invalidálás

Next.js 16-ban a Cache Components és a `use cache` opt-in modell; a dinamikus adat runtime-on fut, hacsak explicit cache-scope nem jelöli. A `cacheLife`, `cacheTag`, `updateTag` és `revalidateTag` különböző frissességi és invalidálási szemantikát ad.

**Biztonságos kutatási sorrend:**

1. Osztályozni az adatot: publikus/statikus, szervezeti, felhasználói, revízió- vagy tranzakciós.
2. Csak az első kategórián kezdeni a cache-mérést.
3. Szervezeti/felhasználói cache-nél bizonyítani a cache-key izolációt, RLS-t, invalidálást és read-your-own-writes viselkedést.
4. Mutáció után a pontos tag/path invalidálását, versenyhelyzetet és retry-t tesztelni.
5. Ha a bizonyíték hiányzik, az adat maradjon request-time és ne legyen közös cache-ben.

Különösen veszélyes lenne egy közös, user/org-paraméter nélküli cache kalkulációs input/outputra, anyagárra, ajánlatra, felmérésre vagy revízióra. A gyorsabb válasz nem ellensúlyozza az adatközi szivárgást vagy történeti inkonzisztenciát.

### 5.3 Szerveroldali CPU, I/O és háttérmunka

- I/O-bound műveletnél először round trip, párhuzamosítás, query shape és payload méret mérendő.
- CPU-bound műveletnél először a domain számítás időprofilja és inputmérete mérendő.
- Background job/queue/worker csak akkor indokolt, ha a művelet request-időben rendszeresen túl hosszú, újrapróbálást/folyamatállapotot igényel, vagy terhelés alatt blokkolja a webkérést.
- A worker nem gyorsít automatikusan: serializációt, queue-latencyt, hibakezelést, idempotenciát és történeti snapshotot is bevezet.
- PDF/SVG export vagy nagy képfeldolgozás esetén külön mérendő, hogy a szerver vagy kliens oldali feldolgozás ad-e jobb teljes költséget és UX-et.

## 6. PostgreSQL és Supabase

### 6.1 Query plan és mérés

A PostgreSQL `EXPLAIN` a planner tervét, az `EXPLAIN ANALYZE` tényleges futási adatot ad. Az `ANALYZE` végrehajtja a lekérdezést, ezért mutációt okozó statement esetén csak izolált, rollbackelhető nem éles környezetben szabad használni.

F9.62 bizonyítékcsomag minden kritikus queryhez:

- pontos query és paramétertípusok;
- reprezentatív, nem toy méretű adathalmaz;
- auth/org kontextus és RLS bekapcsolt állapota;
- `EXPLAIN (ANALYZE, BUFFERS)` vagy Supabase `explain()` eredmény;
- planning time, execution time, buffers, rows és becslési eltérés;
- hideg/meleg cache és konkurens terhelés különbsége;
- query előtti/utáni eredmény- és jogosultság-ellenőrzés.

Az `EXPLAIN` költségszám nem közvetlen felhasználói latency, és a hálózati továbbítás nem része a szokásos execution time-nak. Ezért a DB-plan mérését alkalmazásoldali timinggal együtt kell olvasni.

### 6.2 Indexek

Jelöltek:

- szervezet/projekt/owner és RLS-predikátumokhoz illeszkedő indexek;
- gyakori összetett szűrés és rendezés esetén a query shape-hez illesztett composite index;
- szelektív, stabil állapotokra partial index;
- JSONB-re GIN csak tényleges containment/search workload bizonyítéka esetén;
- monoton időoszlopokra és nagy, ritkán változó táblára BRIN csak megfelelő fizikai/adateloszlás mellett.

Az indexnek írási, tárhely- és karbantartási költsége van. A planner kis táblán vagy kedvezőtlen szelektivitásnál szándékosan választhat sequential scan-t; ezért egy hiányzó indexnek vélt findingot mindig query-plan és workload alapján kell elbírálni.

### 6.3 RLS és szervezeti izoláció

- A teljesítményjavítás nem gyengítheti az RLS-t, a szervezeti kapcsolatot vagy az actor/role ellenőrzést.
- A RLS-ben használt, nem már indexelt szűrőoszlopok vizsgálata elsődleges jelölt, de csak az adott policy és query együtt mérendő.
- A Supabase dokumentáció által javasolt `(select auth.uid())`-szerű, állandó eredményű függvényhívás-optimalizálás sem alkalmazható vakon: a policy jelentése, szerepkör, `USING`, `WITH CHECK` és kapcsolt táblák ellenőrzendők.
- `TO authenticated` önmagában csak szerepkört jelent, nem tulajdonosi vagy szervezeti jogosultságot.
- `SECURITY DEFINER` nem általános teljesítmény- vagy jogosultsági javítás; RLS-megkerülési és public EXECUTE kockázata van.
- A view-k, RPC-k, Storage policy-k és service-role használata külön biztonsági felülvizsgálatot igényel.

### 6.4 Adathozzáférés, lapozás és történeti adatok

- N+1 elkerülésére batch/összesítő query vagy célzott join használható, de a lekérdezett sorok szervezeti és történeti határa megmaradjon.
- Offset pagination egyszerű és kis lapokon megfelelő; nagy vagy változó listán cursor/keyset pagination lehet stabilabb, ha a sort key és snapshot-semantika definiált.
- Materialized view vagy denormalizált olvasási modell csak mérhető read-workload és frissítési/invalidation terv mellett kerülhet szóba.
- Immutable revision és source snapshot táblánál a történeti olvasás a kiválasztott revision saját input/output/snapshotját használja, nem az aktuális katalógus csendes újraszámítását.
- Retention/archiválás csak üzleti, audit- és visszaállítási követelmény alapján tervezhető; az adatbázis növekedése önmagában nem jogosít történeti adat törlésére.

## 7. Kódminőség, dead code és architektúra-karbantarthatóság

### 7.1 Statikus eszközök és határaik

| Eszköz / módszer | Mire jó | TetőPro-kockázat / használati szabály |
|---|---|---|
| TypeScript `tsc --noEmit` | Típus-, unreachable- és config-szintű hibák jelzése | Nem bizonyít runtime dead code-ot; a typecheck nem törlési lista |
| ESLint | Helyi szabályok, hibás minták, unused változók és importok | A projekt saját route-/domain-szerződéseit nem ismeri automatikusan |
| Knip | Elérési gráfból unused file/export/dependency jelölés | Entry-ket Next route-okkal, tesztekkel, scriptekkel, dinamikus importokkal és generált fájlokkal ki kell egészíteni |
| Next bundle analyzer | Kliens-, szerver- és edge bundle/importlánc vizsgálata | Build/config-változás és extra dependency kellhet; F9.61-ben nem telepítendő |
| Chrome DevTools Coverage | Betöltött JS/CSS workflow közbeni használati lefedettsége | A Coverage nem bizonyít törölhető source fájlt; ritka route és runtime import false positive lehet |
| `rg`/import graph/route inventory | Dinamikus import, filesystem route, migration és szerződés kézi megerősítése | Kézi, de kritikus a statikus eszközök eredményének ellenőrzéséhez |
| Madge vagy ESLint import-cycle szabály | Körkörös függőségek feltárása | Framework entry-k és barrel-ek miatt zajos lehet; javítás csak ciklus és ownership alapján |

Knip saját dokumentációja szerint a graph pontossága az entry-k teljességétől függ; hiányzó Next entry vagy dinamikus import egész finding-láncot okozhat. Ezért a biztonságos sorrend: **entry inventory → finding klaszterezés → runtime/dynamic/route ellenőrzés → teszt/build → kis, visszaállítható változtatás → újramérés**.

### 7.2 Törlés előtti kötelező ellenőrzés

Egy állítólagosan használatlan fájlt/exportot/dependency-t nem szabad törölni, amíg nincs ellenőrizve:

- Next filesystem route, `layout`, `loading`, `error`, `not-found`, API route és metadata convention;
- dinamikus import, string-alapú registry, `import.meta`, build-time discovery és environment-branch;
- Vitest setup, glob, fixture, snapshot és teszt-only entry;
- Supabase migration, function/RPC, generated type és történeti kompatibilitási szerződés;
- JSON/serialization/export contract és külső integráció;
- a teljes affected route buildje, lintje, typecheckje és célzott tesztje;
- a változás kis diffje, review-ja és visszaállítható git-állapota.

## 8. Technikai kalkulátorok teljesítménye

### 8.1 Számítási modell

Ajánlott állapotmodell:

```text
raw form input
  → validated/normalized input
  → pure domain calculation
  → typed result + provenance
  → drawing/material presentation
  → immutable save/revision
```

Ellenőrizendő jelöltek:

- ugyanazon normalizált input ismételt számítása ugyanabban az eseményláncban;
- teljes kalkulátor újraszámítása egyetlen, független mező változásakor;
- számítás és SVG rajz ugyanazt a geometriai outputot használja-e;
- a rajz UI-állapota (zoom/pan/selection) kiváltja-e a fizikai számítás újrafutását;
- anyaglista, preview és mentés külön-külön újraszámol-e ugyanazt az eredményt.

### 8.2 Incremental recalculation és memoizáció

Az incremental recalculation akkor érdemes jelölt, ha a számítás dependency graphja explicit és a rész-eredmények tiszták. Például a geometria, felület, fedés, faanyag és anyaglistázás külön invalidációs egységként vizsgálható — de csak akkor, ha a függőségi szerződés és történeti output bizonyított.

Memoizáció feltételei:

- determinisztikus, tiszta függvény;
- stabil, teljes dependency-kulcs;
- korlátozott cache-élettartam és memória;
- invalidáció, ha input-séma, termékparaméter vagy revision változik;
- nincs közös, felhasználók közötti adatkeverés;
- benchmark, amely igazolja, hogy a cache költsége kisebb a számításnál.

**Tilos teljesítményjavításként:** köztes geometriai vagy pénzügyi értékek kerekítése, validáció kikapcsolása, a provenance elhagyása vagy a jelenlegi katalógus ráolvasása történeti revisionre.

### 8.3 Input, debounce, transition és worker

- A mezőgépelt érték maradjon azonnali és validálható; drága preview debounce-olható, de a mentési/elfogadási számítás explicit, determinisztikus és friss inputból fusson.
- `useTransition` a nem sürgős eredmény-/rajzfrissítésre használható, de nem rejtheti el a hibát és nem cserélheti ki az input truth source-át.
- Web Worker csak akkor indokolt, ha a profilozott CPU-munka ténylegesen blokkolja a main threadet, a payload- és serializációs költség kisebb a nyereségnél, és a worker-hibák/retry-k kezelhetők.
- Egy egyszerű geometriai képlet vagy kis input nem igényel worker-architektúrát.
- Nagy SVG-nél a DOM-csomópontok száma, path precision, viewBox, repaint és interakció alatti transform külön mérendő.

### 8.4 Numerikus és történeti helyesség

Minden későbbi gyorsításnak meg kell őriznie:

- a mérési egységet, inputvalidációt és geometriai jelentést;
- a determinisztikus outputot és matematikai pontosságot;
- az explicit DEMO/forrás/provenance állapotot;
- a calculation dependency/source snapshotot;
- az immutable revisiont és korábbi revision újraolvashatóságát;
- a konkurens mentés expected-version/idempotency garanciáit.

## 9. CSS, SVG és vizuális teljesítmény

### 9.1 Liquid Glass megtartása mellett

A cél nem a Liquid Glass eltávolítása, hanem a költség megértése:

- hideg load: stylesheet, font, background és első paint;
- runtime interaction: panelnyitás, input, hover/focus és theme/scale váltás;
- scroll: backdrop-filter, nagy áttetsző rétegek, fixed elemek és repaint;
- render/composite: box-shadow, blur, opacity, transform és animációs property-k;
- gyengébb mobil eszköz: memória, GPU és hő/akku hatás.

Jelöltek:

- CSS `contain`/`content-visibility` hosszú, nem kritikus szakaszokra, ha a fókusz, accessibility és layout nem sérül;
- animációk transform/opacity irányba terelése, layoutot érintő animáció kerülése;
- ismételt, egymásra rakódó blur/shadow rétegek csökkentése csak screenshot- és Performance-panel bizonyítékkal;
- font preload és font-display viselkedés mérése, nem vakon több fontvariant betöltése;
- Tailwind v4 source detection és dinamikus class-generálás ellenőrzése; a stringben képzett, nem felismerhető class nem egyszerűen „dead CSS”.

### 9.2 SVG

- Egyetlen geometriai outputból legyen rajz és számítás, hogy a vizuális gyorsítás ne változtassa meg a fizikai eredményt.
- Path pontosságát csak úgy csökkentsük, ha a tolerancia, export és felhasználói zoom mellett vizuálisan és numerikusan elfogadható.
- A nagy, statikus háttér- vagy segédrajzot lehetőleg ne generáljuk újra minden inputváltozáskor.
- A zoom/pan állapotot különítsük el a számítási állapottól.
- SVG DOM-virtualizáció vagy canvas nem alapértelmezett javítás; accessibility, export és nyomtatás miatt külön trade-offot igényel.

## 10. Helyi fejlesztési környezet és production skálázás

### 10.1 MacBook Air M4, 16 GB RAM

F9.62-ben mérendő:

- egyszeri dev szerver indítási idő és stabil memória baseline;
- HMR után heap/RSS változás és hosszú session memória-trend;
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` külön CPU/memória/elapsed time profil;
- egyszerre futó dev server, Supabase/Docker, Browser és test worker-ek;
- `.next` cache hatása hideg/meleg futásra;
- TypeScript project graph és ESLint/test párhuzamosság.

Kímélő, de biztonságos elvek:

- ne futjon ugyanabból a repóból több dev szerver ugyanazon workflow miatt;
- a célzott tesztet a teljes suite elé lehet venni, de a teljes ellenőrzés ne maradjon el mérföldkőnél;
- correctness-checket, typechecket vagy RLS-t nem szabad pusztán memória miatt kikapcsolni;
- worker-szám vagy cache-limit csak mérés és dokumentált fejlesztői kompromisszum után változzon.

### 10.2 Production observability

Next.js instrumentation `instrumentation.ts`/`instrumentation-client.ts` és OpenTelemetry-kompatibilis bekötés későbbi jelölt lehet. A mért dimenziók:

- LCP, INP, CLS field metrikák;
- TBT lab proxy és Performance-panel trace;
- route/navigation latency és server render time;
- query execution/planning time, rows, buffers és error rate;
- kalkulátor input-to-result latency és mentési latency;
- bundle transfer/parse/execute költség;
- memória/CPU/throughput és concurrent request viselkedés.

A lab és field mérés nem ugyanaz: Lighthouse/DevTools jól használható fejlesztési regresszióra, de INP-hez valódi interakció és field adat kell. RUM esetén csak minimális, aggregált, érzékeny adatot nem tartalmazó telemetry kerüljön ki; ügyfél-, szervezet-, felmérés- és ajánlatadatot ne küldjünk feleslegesen.

## 11. Prioritási mátrix — top 10 vizsgálandó lehetőség

Ezek **F9.62-es kutatási jelöltek**, nem igazolt hibák.

| # | Jelölt és kategória | Probléma, amit mér | Potenciális haszon | Komplexitás / kockázat | Bizonyítás F9.62-ben | Hatás |
|---:|---|---|---|---|---|---|
| 1 | Baseline + performance budget — **HIGH-PRIORITY CANDIDATE** | Nincs összehasonlítható route/query/calculator baseline | Magas, mert minden későbbi döntés ellenőrizhetővé válik | Közepes / alacsony, ha read-only | Reprodukálható lab + route/query timing + commitolt report | Dev + production |
| 2 | Klienshatár és kalkulátor-chunk audit — **HIGH-PRIORITY CANDIDATE** | Nem választott kalkulátor vagy drawing kódja bekerül-e a kezdeti kliensbe | Magas mobilon, ha tényleg jelen van | Közepes / közepes | Bundle analyzer, Network, route import graph | Production + build |
| 3 | Async waterfall és request dedup — **HIGH-PRIORITY CANDIDATE** | Soros, ismételt auth/org/data read | Magas latency-érzékeny oldalon | Alacsony-közepes / közepes | Server timing, trace, query count és dependency graph | Dev + production |
| 4 | Query shape + RLS plan — **HIGH-PRIORITY CANDIDATE** | N+1, rossz szűrés, RLS-scan vagy hiányzó index | Magas nagyobb adaton | Közepes / magas biztonsági kockázat | RLS-szel futtatott EXPLAIN, index/workload összevetés | Production |
| 5 | Kalkulátor render/input profil — **HIGH-PRIORITY CANDIDATE** | Inputra túl sok számítás, render vagy SVG repaint | Magas csak akkor, ha INP/lag mérhető | Közepes / közepes | React Profiler + Performance trace + domain timer | Dev + production |
| 6 | Függőség- és importlánc-csökkentés — **HIGH-PRIORITY CANDIDATE** | Nagy, duplikált vagy rossz oldalon betöltődő package | Közepes-magas | Közepes / közepes | Bundle graph, package export/import ellenőrzés | Build + production |
| 7 | Safe dead code/dependency inventory — **CONTEXT-DEPENDENT** | Nem elért fájl/export/dependency | Közepes karbantarthatóságban | Alacsony mérés / magas törlési kockázat | Knip + route/dynamic/migration/test ellenőrzés | Dev + build |
| 8 | SVG/CSS/Liquid Glass profiling — **CONTEXT-DEPENDENT** | Paint, composite, scroll vagy mobile GPU költség | Közepes-magas, ha trace igazolja | Közepes / közepes UX-kockázat | DevTools Performance/Coverage, mobil viewport | Production |
| 9 | Lapozás, batch és szerver-payload — **CONTEXT-DEPENDENT** | Túl sok sor, round trip vagy RSC-serializáció | Közepes-magas nagy listán | Közepes / magas történeti kockázat | query count, payload méret, pagination workflow | Production |
| 10 | Dev server/build resource profile — **CONTEXT-DEPENDENT** | M4/16 GB gépen HMR, build vagy test memória/CPU | Közepes fejlesztői throughputban | Közepes / alacsony-közepes | RSS/CPU/elapsed baseline hideg/meleg futással | Dev |

### Későbbi, nem első körös jelöltek

- `cacheComponents`/`use cache` szervezeti adatra: **ADVANCED / LATER**, amíg cache-key és invalidáció bizonyított.
- Queue/worker és background calculation: **ADVANCED / LATER**, amíg CPU-bound blokk vagy tartós job-szükséglet nincs mérve.
- Denormalizált read model/materialized view: **ADVANCED / LATER**, csak stabil query workload és refresh-terv mellett.
- React Compiler bevezetése: **ADVANCED / LATER**; a projekt jelenlegi buildkonfigurációja nem bizonyítja, hogy ez már kompatibilis vagy szükséges.

## 12. Nem ajánlott általános receptek és veszélyes shortcutok

| Shortcut | Miért veszélyes |
|---|---|
| Minden komponenst `dynamic()`-gal tölteni | Request waterfall, loading latency és túl sok chunk; a route splitting gyakran már elég |
| Minden komponensre `memo`/`useMemo`/`useCallback` | Olvashatósági és dependency-költség, mérési haszon nélkül nincs bizonyított gyorsulás |
| Globális cache auth/org/adatra | Cross-user vagy cross-organization adatkeverés, hibás invalidálás és történeti inkonzisztencia |
| `SECURITY DEFINER` RLS-hiba vagy lassúság megkerülésére | RLS-bypass, public EXECUTE és jogosultsági kockázat |
| Index minden szűrőoszlopra | Több írási költség, tárhely és planner-komplexitás; a planner nem minden indexet használ |
| Offset helyett automatikusan cursor pagination | Sort-key, snapshot és UX-szerződés nélkül inkonzisztens lapozás lehet |
| Worker minden geometriai számításra | Serializáció, debug, retry és worker-életciklus költsége a számításnál nagyobb lehet |
| Köztes értékek kerekítése | Numerikus pontosság, auditálhatóság és történeti kompatibilitás sérülhet |
| Static analyzer finding azonnali törlése | Route, dynamic import, test, migration vagy external contract kimaradhat |
| RLS/typecheck/test kikapcsolása a gyorsabb buildért | A biztonsági és correctness-regressziót gyorsítja fel, nem a terméket |
| Liquid Glass teljes eltávolítása mérés nélkül | Vizuális termékminőség sérülhet, miközben a valós költség más komponensben van |
| `EXPLAIN ANALYZE` éles mutációs queryre | A parancs végrehajtja a statementet; adatot módosíthat |

## 13. Ajánlott eszközök és pluginok

### Már ellenőrzött és rendelkezésre álló képességek

| Képesség | F9.62-ben javasolt szerep | Állapot ebben a mérföldkőben |
|---|---|---|
| `build-web-apps:react-best-practices` | React/Next import-, waterfall-, render- és bundle-ellenőrzési checklist | Kutatási elvek felhasználva; kódrefaktor nem futott |
| `build-web-apps:frontend-testing-debugging` | Browser plugin útvonal, célzott smoke és console/screenshot bizonyíték | Nem futott, mert F9.61 nem frontend-audit |
| `browser` | route betöltés, Network/DOM/console és fókuszált smoke | Nem futott |
| `supabase` + `supabase-postgres-best-practices` | query/RLS/index/security audit és docs-ellenőrzés | Kutatási elvek felhasználva; query nem futott |
| `code-review` | későbbi PR/CI ellenőrzés | Nem szükséges F9.61-ben |
| `visualize` | benchmark/trace összefoglaló vizualizáció | Nem szükséges F9.61-ben |
| meglévő `npm` scriptek | `build`, `lint`, `typecheck`, `test`, DB-tesztek | F9.61-ben nem futottak |

### Karbantartott, de jelenleg nem telepített / nem módosítandó jelöltek

- **Next bundle analyzer:** a Next.js 16 package-bundling útmutatója szerint a Turbopack analyzer kísérleti, a Webpack útvonalhoz `@next/bundle-analyzer` használható. Nem telepítendő F9.61-ben.
- **Knip:** unused file/export/dependency graph; Next route, dynamic import, test és migration entry-ket külön konfigurálni kell. Nem telepítendő F9.61-ben.
- **Chrome DevTools Performance/Coverage:** runtime trace, Core Web Vitals, unused JS/CSS és paint/composite vizsgálat. A Browser plugin segítségével a későbbi célzott smoke kiegészíthető, de a mély Performance trace külön mérési munkafolyamat.
- **React DevTools Profiler:** render-count, commit time és komponens-szintű bizonyíték.
- **Lighthouse/WebPageTest:** lab baseline és reprodukálható hálózati/device profil; INP field adatot nem helyettesít.
- **Supabase Query Performance/Index Advisor + PostgreSQL EXPLAIN:** csak non-production/megfelelő hozzáféréssel és RLS-szel együtt.
- **OpenTelemetry/Next instrumentation:** későbbi production observability-jelölt, adatminimalizálással.

## 14. F9.62 — teljes audit terv

Az alábbi sorrend egy későbbi Codex-munkamenet számára végrehajtható audit-keret. F9.61-ben egyik lépést sem hajtottam végre.

### 14.1 Audit-előkészítés és baseline

**Vizsgálandó:** git állapot, project docs, package/lock, Node és runtime verziók, `package.json` scriptek, build mode, meglévő tesztmatricek, érintett workflow-k.
**Bizonyíték:** dátumozott baseline-report, változatlan working tree lista, route/workflow lista, ismert fixture/adatállapot.
**Eszköz:** `rg`, `package.json`, Next/TS/Vitest config, meglévő dokumentáció.
**False positive védelem:** ne keverd össze projekttervet megvalósult állapottal; demo/gyártói adatot ne találj ki.
**Approval guard:** ne módosíts configot, dependency-t vagy adatot baseline-készítés közben.

### 14.2 Route- és architektúratérkép

**Vizsgálandó:** `src/app`, route conventions, layout/provider tree, feature/domain/infrastructure importirány, Server/Client boundary-k, API/Server Action belépési pontok.
**Bizonyíték:** route → client island → data read → domain → persistence dependency map.
**Eszköz:** `rg`, TypeScript import graph, Next build output, célzott kódolvasás.
**False positive védelem:** filesystem route, layout, metadata, error/loading és generated code nem dead code automatikusan.
**Approval guard:** csak térkép, refaktor nélkül.

### 14.3 Bundle és calculator chunk loading

**Vizsgálandó:** hub initial JS, egyes kalkulátor-route-ok, SVG/drawing/export függőségek, barrel importok, shared chunkok, prefetch.
**Bizonyíték:** bundle report, route-onkénti transfer/parse/execute, import-chain screenshot vagy export, hub-vs-selected calculator összevetés.
**Eszköz:** Next analyzer, build output, Browser Network/Coverage.
**False positive védelem:** a shared domain kód újrahasznosítása nem önmagában probléma; server bundle jelenléte nem client bundle jelenlét.
**Approval guard:** analyzer dependency és config csak külön jóváhagyással.

### 14.4 Server/client import- és serialization-audit

**Vizsgálandó:** `use client` határok, szerver-only modulok, service-role titkok, RSC props, teljes rekordok, accidental client import chain.
**Bizonyíték:** import-chain, bundle jelenlét, payload mezőlista, auth/org boundary.
**Eszköz:** Next build/analyzer, `server-only`, TypeScript, targeted route test.
**False positive védelem:** a kliensre szükséges interakciós állapotot ne mozdítsd szerverre csak a méret kedvéért.
**Approval guard:** auth/persistence viselkedés változtatása nem része az auditnak.

### 14.5 Async waterfall és cache-audit

**Vizsgálandó:** auth, org, project, revision, material és related read sorrend; duplicate query; cache scope/tag; invalidálás.
**Bizonyíték:** server timing/trace, query count, `React.cache` vagy request dedup evidence, cache-key/invalidation table.
**Eszköz:** instrumentation/trace, Next docs, Supabase query logs, célzott teszt.
**False positive védelem:** a párhuzamos query ne kerülje meg a jogosultsági előfeltételt; cache ne legyen közös auth/org adatnál bizonyíték nélkül.
**Approval guard:** `use cache`, tag, route cache vagy CDN header módosítása nem F9.62 automatikus kimenete.

### 14.6 React és kalkulátor interaction profiling

**Vizsgálandó:** mezőváltozás → normalize → calculate → SVG → summary → validation; render count, commit time, dropped frame, input lag.
**Bizonyíték:** React Profiler trace, Chrome Performance trace, domain timer, input-size matrix.
**Eszköz:** Browser, React DevTools, `performance.mark/measure` csak jóváhagyott, ideiglenes profilinggal.
**False positive védelem:** Strict Mode fejlesztési dupla hívást ne kezeld production regresszióként; memo csak azonos props/expensive render esetén.
**Approval guard:** domain képlet, kerekítés és output contract nem változtatható audit címén.

### 14.7 Database/query/RLS audit

**Vizsgálandó:** leggyakoribb és leglassabb query-k, N+1, select-list, join, filter/order, composite/partial/JSONB index, RLS predicate, RPC/view, revision és snapshot olvasás.
**Bizonyíték:** RLS-szel futtatott plan, `EXPLAIN (ANALYZE, BUFFERS)`, query timing, row estimate, index usage/advisor, auth/org matrix.
**Eszköz:** Supabase Query Performance, `explain()`, PostgreSQL docs, helyi/non-production DB.
**False positive védelem:** toy data, RLS nélküli plan és csak estimated cost nem elég; az `EXPLAIN ANALYZE` mutációt végrehajthat.
**Approval guard:** index, policy, migration, denormalizáció, retention és query rewrite csak külön implementációs feladat.

### 14.8 CSS/SVG/asset audit

**Vizsgálandó:** first paint, font, CSS size/detection, backdrop-filter, blur/shadow, fixed layers, large SVG DOM/path, scroll and animation.
**Bizonyíték:** desktop + mobil trace, paint/composite evidence, Coverage, screenshot és accessibility smoke.
**Eszköz:** Chrome Performance/Coverage, Tailwind v4 docs, Browser.
**False positive védelem:** Coverage csak az adott workflow használatát mutatja; vizuálisan ritka, de valid export/print code nem automatikusan törölhető.
**Approval guard:** Liquid Glass design vagy reduced-motion/accessibility viselkedés nem egyszerűsíthető bizonyíték nélkül.

### 14.9 Dead code, dependency és ciklus audit

**Vizsgálandó:** unused file/export/dependency, circular dependency, obsolete compatibility route, test/migration/generated entry.
**Bizonyíték:** Knip report konfigurált entry-kkel, `rg` runtime search, route map, test/build results.
**Eszköz:** Knip, TypeScript, ESLint, import graph, Next route inventory.
**False positive védelem:** dinamikus import, filesystem route, external contract és history compatibility külön review nélkül nem törlendő.
**Approval guard:** F9.62 report findinget adhat, de törlés/refaktor külön jóváhagyott milestone.

### 14.10 Local development resource audit

**Vizsgálandó:** dev server/HMR, build, typecheck, lint, test worker, Supabase/Docker és Browser együttfutása.
**Bizonyíték:** hideg/meleg futás, RSS/heap, CPU, elapsed, process-list, cache state.
**Eszköz:** meglévő scripts, macOS Activity Monitor/`ps`, Node/Next output, Vitest profiling.
**False positive védelem:** egyszeri build-csúcsot és hosszú HMR leaket külön mérj; ne hasonlíts eltérő cache/adatállapotot.
**Approval guard:** worker-limit, cache vagy check kikapcsolása nem audit-javítás.

### 14.11 Production és observability audit

**Vizsgálandó:** Core Web Vitals field/lab, route latency, server errors, query latency, calculator latency, concurrency, bundle regressions.
**Bizonyíték:** privacy-safe RUM aggregátum, trace, deploy/build artifact, WebPageTest/Lighthouse/DevTools és load profile.
**Eszköz:** Next instrumentation/OpenTelemetry, web.dev metrics, Chrome DevTools, Supabase logs.
**False positive védelem:** lab TBT nem field INP; egy gyors laptop nem mobil baseline; átlag elfedheti a p75/p95 problémát.
**Approval guard:** user/org payload vagy érzékeny telemetry gyűjtése külön adatvédelmi döntés.

### 14.12 Audit lezárása

Az F9.62 riport findings-onként tartalmazza: bizonyíték, reprodukció, érintett workflow, impact, confidence, security/data-integrity hatás, javasolt minimális változtatás, mérési terv, rollback és „ne nyúlj hozzá” feltétel. A kutatási lehetőség csak akkor válhat implementációs feladattá, ha a mért benefit és a kockázat összevethető.

## 15. Ellenőrzési státusz és korlátok

| Állapot | Ebben a mérföldkőben |
|---|---|
| Bizonyított | A jelenlegi lokális runtime-verziók; a projekt dokumentált architektúra-kontekstusa; a hivatkozott hivatalos ajánlások és eszközök célja; a kutatási határ betartása |
| Nem futtatott | Bundle/build analysis, Browser smoke, React Profiler, Lighthouse, DB query plan, RLS plan, Knip, dead-code audit, benchmark, load test, memory/CPU profiling |
| Nem állítható | Hogy TetőPro-ban van-e dead code, N+1, nagy bundle, lassú RLS, render-loop, memory leak vagy production bottleneck |
| Blokkolt | Nincs blokkolt kutatási deliverable; az F9.62 konkrét méréseihez megfelelő non-production adat, futó környezet és explicit audit scope szükséges |

## 16. Források

### Next.js

- [Lazy Loading — Next.js App Router](https://nextjs.org/docs/app/guides/lazy-loading)
- [Package Bundling — Next.js](https://nextjs.org/docs/app/guides/package-bundling)
- [Cache Components / Partial Prerendering — Next.js](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- [Caching and Revalidating — Previous Model](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Revalidating with Cache Components](https://nextjs.org/docs/app/getting-started/revalidating)
- [`use cache` directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Instrumentation](https://nextjs.org/docs/app/guides/instrumentation)
- [Analytics and Web Vitals](https://nextjs.org/docs/app/guides/analytics)
- [Upgrading to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

### React

- [`memo`](https://react.dev/reference/react/memo)
- [`useMemo`](https://react.dev/reference/react/useMemo)
- [`useTransition`](https://react.dev/reference/react/useTransition)
- [React Hooks performance guidance](https://react.dev/reference/react/hooks)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)

### Supabase és PostgreSQL

- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Supabase Debugging Performance](https://supabase.com/docs/guides/database/debugging-performance)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Managing Indexes in Postgres](https://supabase.com/docs/guides/database/postgres/indexes)
- [PostgreSQL — Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL — ANALYZE](https://www.postgresql.org/docs/current/sql-analyze.html)

### Elemzés, mérés és build

- [Knip — How Knip works](https://knip.dev/explanations/how-knip-works)
- [Knip — Configuring project files](https://knip.dev/guides/configuring-project-files)
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [Vitest Coverage](https://main.vitest.dev/guide/coverage)
- [Vitest Profiling Test Performance](https://vitest.dev/guide/profiling-test-performance)
- [Chrome DevTools Performance panel](https://developer.chrome.com/docs/devtools/performance/overview)
- [Chrome DevTools Coverage](https://developer.chrome.com/docs/devtools/coverage)
- [Tailwind CSS — Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [web.dev — Web Vitals](https://web.dev/articles/vitals)
- [web.dev — Measuring Web Vitals](https://web.dev/articles/vitals-measurement-getting-started)
- [Next.js Bundle Analyzer package](https://www.npmjs.com/package/@next/bundle-analyzer)

### Projektforrások

- [`AGENTS.md`](../AGENTS.md)
- [`PROJECT_BLUEPRINT.md`](../PROJECT_BLUEPRINT.md)
- [`docs/AI_TOOLING.md`](AI_TOOLING.md)
- [`docs/PROJECT_MAP.md`](PROJECT_MAP.md)
- [`docs/DATABASE.md`](DATABASE.md)
- [`docs/TEST_MATRIX.md`](TEST_MATRIX.md)

## 17. Mérföldkő-átadás

**F9.61 státusz:** COMPLETE mint kutatási dokumentum; az alkalmazás optimalizálása és teljes auditja nincs végrehajtva.
**Létrehozott deliverable:** [`docs/OPTIMIZATION_RESEARCH.md`](OPTIMIZATION_RESEARCH.md)
**Javasolt Conventional Commit:** `docs: F9.61 add optimization research and F9.62 audit blueprint`

Ponytail-szabály szerint a kutatás a legkisebb szükséges változást tartalmazza: egy dokumentum készült, alkalmazáskód és konfiguráció nem változott.
