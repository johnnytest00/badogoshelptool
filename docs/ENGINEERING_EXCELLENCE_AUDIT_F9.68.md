# F9.68 — Mérnöki architektúra-, kódminőség- és működési audit

**Dátum:** 2026-10-23 (Europe/Budapest)

**Státusz:** AUDIT COMPLETE — nincs igazolt P0/P1 kódhiba; több P2 és rollout előtti, még nem ellenőrzött feltétel maradt.

**Hatókör:** read-only forrás- és dokumentációvizsgálat; egy teljes Vitest futtatás. Alkalmazáskód, konfiguráció és adatbázis nem változott.

## 1. Vezetői mérnöki értékelés

TetőPro architektúrája alapvetően megfelelő a jelenlegi termékhez. Az App Router útvonal-összeállítása, feature-ökbe rendezett workflow-k, külön domain számítások, Supabase adapterek, szervezeti jogosultsági ellenőrzés és revíziózott adatszerződések érthető, bővíthető alapot adnak. A rétegek nem teljesen tiszta ports-and-adapters felépítésűek: a feature modulok UI-t, szerveroldali betöltést és actionöket is tartalmaznak. A jelenlegi méretnél ez kezelhető egyszerűsítés, nem indok új keretrendszerre vagy nagy átstrukturálásra.

Az erős oldalak közé tartozik a forrás- és revízióazonosság megőrzése, expected-version konfliktuskezelés, idempotens írási utak, RLS/összetett relációk, privát fotótár, explicit hibaállapotok, valamint a korábbi mérésekből származó célzott teljesítményjavítások. F9.63–F9.67 már lefedte a kalkulátorbetöltést, batch olvasásokat, katalógus-szűkítést és egy indokolt függőségtörlést; ezeket az audit nem ismételte meg.

Az experienced reviewer fő fenntartásai: egy munkanapló-adatréteg kikapcsolja a típusellenőrzést, a fotófeltöltés alkalmazásszintű fájlméret-korlátja csak a teljes multipart body feldolgozása után érvényesül, a `.next` tartós cache-je egy régebbi Next-verzió jelentős cache-ét is őrzi, és néhány adatvédelmi dokumentum elmaradt a kód tényleges viselkedésétől. Ezek közül egyik sem bizonyít önmagában aktuális adatvédelmi incidenset, adatvesztést vagy production teljesítményhibát.

Szélesebb SaaS rollout előtt szükséges a már a [`PILOT_READINESS.md`](PILOT_READINESS.md)-ben rögzített hosted cross-organization/Auth/Storage ellenőrzés, backup-restore próba, RPO/RTO és monitorozási döntés, valamint mobil/gyenge hálózati smoke. Ezek jelenleg **nem igazolt feltételek**, nem a lokális forrásból levezethető hibák.

## 2. Repository- és audit-lefedettség

### Kiinduló állapot

- `git status --short --branch`: tiszta munkafa; `main` egy commit-tal előrébb van `origin/main`-nél. A meglévő commitot és minden fájlt változatlanul hagytam.
- Egyetlen worktree látható. A 3000-es porton aktív Node folyamatot találtam, nem állítottam le és nem indítottam új dev szervert.
- A vizsgált F9.61–F9.67 bizonyítékok: `OPTIMIZATION_RESEARCH.md`, `OPTIMIZATION_AUDIT_F9.62.md`, `PERFORMANCE_AUDIT_F9.64.md`, `CODE_CLEANUP_F9.66.md` és a `PROGRESS.md` releváns bejegyzései. A legutóbbi, F9.67-es teljes ellenőrzés 159 Vitest fájlt/924 PASS-t és build/lint/typecheck PASS-t dokumentál.
- Aktuális inventory: `src/app` 79 fájl, `src/features` 245, `src/domain` 133, `src/infrastructure` 19, `src/components` 28, `src/lib` 20; 113 migráció és 58 pgTAP fájl. Ezek fájlszámok, nem minőségi vagy lefedettségi mérőszámok.

### Lefedettségi státusz

| Terület | Vizsgálat mélysége | Státusz / korlát |
|---|---|---|
| Architektúra és rétegek | Projekt-térkép, route-/feature-/domain-/adapterleltár, kiválasztott import- és action-láncok | Részletes, reprezentatív; nem formális teljes importgráf vagy ciklusanalízis. |
| Felmérés, draft, revízió | Mentési action, SQL retry/idempotencia, draft recovery és photo API/normalizáló, tesztek | Kiválasztott, magas kockázatú ág forrásszinten ellenőrizve. |
| Munkanapló | Adatlekérő és route-fogyasztók, típusosság és sor-összerendelés | Részletes, egy adatmodulra fókuszálva; valós elemszám/timing nincs. |
| Anyaglista, ajánlat, számítás | Feature-szerződések és előző auditok/tesztek dokumentációja | A korábbi F9.64/65 ellenőrzéseket használtam; nem végeztem teljes kód-review-t. |
| Auth, RLS és RPC | SSR kliens, claims/org kontextus, action-minták, fotó- és felmérés-migrációk, kiválasztott pgTAP | Forrásból részben alátámasztott; hosted negatív teszt és teljes 113 migration line-by-line review nincs. |
| Tesztstratégia | Konfiguráció, tesztinventár, lokális integration gate-ek, teljes Vitest futás | A Vitest bizonyított; pgTAP, browser és hosted integráció nem futott. |
| Build/cache és erőforrás | Aktuális `du`, cache alkönyvtárak/verziók/fájlok, csomag-scriptek és Next 16.4 dokumentáció | Tárhelyfelosztás bizonyított; cold/warm buildidő, processz-RAM és cache növekedési trend nincs mérve. |
| Mobil, deployment, observability | Meglévő audit- és pilotdokumentáció | Nincs fizikai mobil, hosted deployment, backup/restore vagy RUM mérés ebben a körben. |

### Eszközleltár és módszer

Az `AI_TOOLING.md` teljes releváns leltárát áttekintettem. Alkalmaztam a Ponytail audit alapelvét (bizonyíték nélkül nincs refaktor), valamint a `supabase` skill biztonsági útmutatását a forrásminták értelmezéséhez. Nem aktiváltam plugint, nem használtam connected Supabase-t, böngészőt vagy PR-review eszközt, mert a cél helyi read-only audit volt, a korábbi runtime/DB mérések pedig dokumentáltak. Az F9.67 által már ellenőrzött megállapításokat nem futtattam újra.

## 3. Architektúra-értékelés

### Meglévő határok

- `src/app/`: route-ok és oldal-összeállítás; a munkafolyamatok `src/features/` alatt élnek.
- `src/features/`: alkalmazásfolyamat, szerveroldali adatlekérdezés, Server Action és feature UI. Ez a réteg tudatosan egyesíti a jól összetartozó workflow-kat, nem teljesen különálló alkalmazás- és adapterréteg.
- `src/domain/`: keretrendszerfüggetlen geometria, számítások és adattípusok. A dokumentáció világosan elhatárolja a geometriai eredményt a statikai/gyártói megfelelőségtől.
- `src/infrastructure/supabase/`: kliens, DB-típusok és korlátozott writer adapterek; fotó normalizálás külön infrastruktúra-modulban van.
- `supabase/migrations/`, `supabase/tests/database/`: séma, RLS, RPC, trigger és adatkonzisztencia regressziók.

### Értékelés

Az irány UI/route → feature → domain, infrastruktúra-adapterekkel; a lényegi üzleti logika nincs tömegesen route-okba vagy UI-ba helyezve. A feature-ök közötti függés a workflow-k között indokolt, a rétegek elég jól megnevezettek ahhoz, hogy új senior fejlesztő célzottan eligazodjon. Nincs bizonyíték arra, hogy a projekt méretéhez képest túl sok réteg vagy absztrakció lenne.

Az üzleti írásoknál a szerveroldali tagságellenőrzés mellé az RPC/migráció is actor-, organization-, expected-version- és forrásellenőrzést tehet; a revíziók immutable snapshotok. A böngészőből érkező szervezetazonosító nem önálló jogosultság. A route/build és a generated DB típusok közti teljes import/cycle gráfot nem mértem, ezért ciklusmentességet nem állítok.

**NO CHANGE:** maradjon a monolitikus Next.js alkalmazás, a feature-központú struktúra, a domain kalkulációs határ, a Supabase/Postgres és a route-szintű/lokális állapotkezelés. Ezen audit nem talált bizonyítékot mikroservice-re, queue-ra, globális state library-re vagy új repository/framework rétegre.

## 4. Kódminőség és fenntarthatóság

A domain és persistence környékén több erős, célzott teszt, explicit eredményállapot és adapter található. A fontosabb sérülékenység nem általános olvashatósági probléma, hanem a `execution-data.ts` által használt széles `any` határ: a lint fájlszinten kikapcsolja az `no-explicit-any` szabályt, Supabase queryt lazán tipizál, majd sok mezőre `any`-ként hivatkozik. Ugyanitt map-elés közben ismételt `filter`/`find` kapcsolja össze a terveket, feladatokat, fotókat, naplókat és eseményeket. A lekérdezési darabszámok korlátozottak, de az adatvolumenhez viszonyított CPU-költség nincs reprezentatív adaton mérve.

Ez valós típusbiztonsági és karbantartási adósság, de ebből nem következik jelenleg bizonyított futási hiba vagy jelentős lassulás. A kisebb és biztonságos lépés a `execution-data.ts` DB-projekcióinak szűk típusai, majd a már betöltött sorok egyszeri `Map`-csoportosítása; csak célzott teszt- és timing-paritással érdemes megtenni.

## 5. Megbízhatóság és adatintegritás

- A felmérés action validálja az UUID-ket, expected versiont, JSON-t és domain-sémát; hiányzó auth, tagság, konfliktus, hibás input és bizonytalan mentési eredmény eltérő hibaállapotot ad.
- Új felméréshez az editor mentés előtt stabil kliensoldali ID-t generál és a draft recovery-ban megőrzi. A `save_field_survey` azonos ID + azonos első payload retry-ját felismeri; friss/eltérő payload konfliktus. A stale tab külön recovery-változatot őriz, nem írja felül a másik lap piszkozatát. Ez az út biztató és forrásból ellenőrzött.
- A survey photo feltöltés külön request UUID-t, expected versiont, reservation/attach lépést és retry-t használ. Az upload-hiba üzenete kifejezetten jelzi, hogy a mérések megmaradnak. A régi survey revízió saját fotó-snapshothoz kötött; az API a hozzá tartozó ID és object key egyezését is ellenőrzi.
- Az ajánlatok, kalkulációk, anyaglisták és munkanaplók írása több verzió-/idempotencia-/snapshot szerződést használ; teljes műveleti fault-injection, párhuzamos valódi kliens vagy hálózati megszakítás ezen milestone-ban nem történt.
- A fotófeltöltés alkalmazásszintű 10 MB ellenőrzése a `request.formData()` után jön, ami a multipart body feldolgozását és a memóriaallokációt megelőző védelmet nem ad. Lásd F68-02.

Nem találtam igazoltan csendes revízió-felülírást vagy sikeresnek látszó survey mentési hibát a vizsgált útban. Szakmai formulák és kimenetek geodéziai/statikai megfelelőségét ez a szoftver-audit nem certifikálja; ehhez építőipari szakértő szükséges.

## 6. Biztonsági értékelés

### Forrásból ellenőrzött védelmek

- SSR Supabase kliens publishable kulccsal készül, sütiket kezeli; Server Component sütimódosítási hibáját elnyeli, a session frissítését a Proxy kezeli.
- Auth context `getClaims()` után azonos `sub`-hoz olvassa a profilt és tagságot, kérésenként `React cache`-elve; membership és szervezetlista alapján állít elő jogosult szervezeteket.
- A védett útvonalak `private, no-store` fejlécet kapnak. A vizsgált Server Actionök a kliensbemeneti org ID mellett szerveroldali tagságot ellenőriznek, az író RPC pedig több esetben újra ellenőrzi a tagot/projektet/actort.
- A felmérési fotó-bucket privát; rövid életű signed URL csak a kiválasztott revízió fotó-snapshotjához áll elő. Feltöltéskor MIME allowlist, magic-byte ellenőrzés, pixelkorlát, formátum-validálás és újrakódolás történik.
- `normalize-survey-photo.ts` Sharp re-encode-dal eltávolítja az EXIF-t, beleértve a GPS koordinátákat; `normalize-survey-photo.test.ts` ezt közvetlenül ellenőrzi.
- A lokális pgTAP tesztkészlet és több integrációs teszt szervezeti izolációt, RPC-jogot, immutable revisiont és writer-határt ellenőriz; 8 Vitest local integration fájl környezeti opt-in gate mögött marad.

### Korlát

Hosted Supabase/Auth/Storage környezethez nem kapcsolódtam, nem vizsgáltam hosted policy-state-et, titkokat vagy más felhasználó adatait, és a pgTAP teszteket nem futtattam. Ezért a jelenlegi források erős lokális védelmi mintákat bizonyítanak, de nem bizonyítják a deployed adatbázis aktuális migrációs állapotát vagy a szervezetek közti izolációt.

## 7. Runtime és mobil teljesítmény

F9.64 egy lokális DEMO munkamenetben 49 kérést, 293 670 B átvitelt, DCL 179 ms / Load 330 ms adatot, egy 72 ms labor INP-t és alacsony attribuált localhost main-thread időt dokumentál. F9.63.4 korábban külön production buildben a 3G chunkváltást és retryt validálta. Ezek egyedi lokális mérések, nem production SLO-k vagy mobil GPU/akkumulátor/memória bizonyítékok.

F9.68-ban nem futott böngészőprofil, mobile CPU throttle, hosszú session/memória trend, input-to-paint trace, 60/120Hz scroll vagy RSC szerverquery-idő. A F9.64-ből megmaradt, igazolt bottleneck nélküli területeken — CSS/glass blur, extra memoization, SVG worker, általános request-cache — **nem javaslok változtatást**.

A munkanapló lekérdezője 200 tervre korlátozza az áttekintőt, a workspace-ben a napló/esemény/fotó sorokra 100-as limit van, a taskok viszont a kiválasztott tervek minden sorát kérik; a további mapping ismételt lineáris kereséseket végez. Valós terhelési hatás nem mérhető a lokális DEMO-ból; lásd F68-01.

## 8. Projektméret és Next.js cache

### Aktuális read-only mérés

`du -sh` alapján a repó **6.8 GB**, `.next` **6.2 GB**, `node_modules` **529 MB**, `src` **4.9 MB**, `.git` **15 MB**. Az `.next` almappák összege nem adható újra hozzá a teljes mérethez.

| Útvonal | Mért méret | Értelmezés |
|---|---:|---|
| `.next/dev` | 4.4 GB | Fejlesztői kimenet és persistens cache. |
| `.next/dev/cache/turbopack` | 3.1 GB | Next dokumentáció szerint a `next dev` Turbopack cache-e alapértelmezettként újrahasznosul. |
| `.../v16.4.0-e273d5b2` | 2.9 GB / 393 fájl / mtime okt. 21. | Régi verziójú cache; a mostani lockolt Next 16.4.2 külön `v16.4.2-2864b177` mappát használ. Ez a 2.9 GB nem bizonyítja, hogy az aktuális verzió használja. |
| `.../v16.4.2-2864b177` | 233 MB / 48 fájl / mtime okt. 22. | Aktuális verziónév alatti cache. |
| `.next/cache/webpack` | 1.8 GB | Külön, Webpack build cache; 1.2 GB szerver és 568 MB kliens cache. A `npm run build` explicit `next build --webpack`, tehát ismételt, azonos buildnél cache-hasznos. |
| `.next/server`, `.next/static` | 6.9 MB, 5.0 MB | Aktuális generált buildkimenet a mért állapotban; itt nem a runtime assetméretet vagy teljesítményt minősítem. |

`.gitignore` kizárja a `.next/` és `node_modules/` útvonalakat; az `npm run dev` Turbopacket használó alapértelmezett fejlesztői mód, az `npm run build` pedig Webpack. A Next 16.4 helyi dokumentációja szerint a Turbopack filesystem cache fejlesztésnél 16.1 óta alapértelmezetten be van kapcsolva; a fejlesztői cache a verzióspecifikus `.next/dev/cache/turbopack` alatt van. A méretnövekedés tehát a hosszú életű munkafa és verzióváltások mellett **lehetséges és e méréssel igazolt**, nem önmagában hibás build- vagy production-runtime viselkedés.

**Javaslat:** ne tiltsuk le a hasznos cache-t és ne ürítsünk most semmit. A Next 16.4.0-s almappa eltávolítása lehet a legnagyobb, visszaállítható tárhely-nyereség, de csak akkor, ha senki nem futtat régi Next verziót ugyanazon munkafán, a fejlesztői szerver már leállt, és a cache újragenerálási idejét elfogadjuk. A 1.8 GB webpack cache törlése is csak külön jóváhagyott takarítási lépésben indokolt; hideg buildet okozhat.

Nem mértük a cold/warm dev indulást, HMR időt, build időt, CPU/RAM csúcsot, lemez-I/O-t vagy a cache hosszabb távú növekedését. Aktív 3000-es szerver miatt `typegen`/build nem futott, mert ugyanazt a `.next` munkaterületet írhatják. Nincs bizonyíték arra, hogy a cache önmagában rontja az app runtime sebességét vagy hogy jelenleg elfogyna a diszk.

## 9. Tesztelési érettség

### Futtatott ellenőrzés

`npm test` — **PASS**: 159 tesztfájl PASS, 8 SKIP; 924 teszt PASS, 19 SKIP. Vitest 5.0.3 futásidő 4.13 s. A 8 skip fájl környezeti változóval engedélyezett, lokális Supabase/Auth integrációs teszt; ezért a PASS a Vitest teszteket bizonyítja, nem a pgTAP/hosted/RLS integrációt. A suite futás közben jelzi, hogy a modulfeldolgozás újrafut minden runnál; 4.13 s mellett ezt nem sorolom optimalizációs problémának.

### Maturity és hiányok

- A domain számítások, snapshot/revízió- és action-szerződések sok regressziós teszttel rendelkeznek; jelenlegi F9.67 dokumentációban teljes suite/lint/typecheck/build PASS található.
- A tesztek száma önmagában nem bizonyít coverage-t; coverage reportot nem mértem és nem állítok lefedettségi százalékot.
- Helyi pgTAP tesztek és auth-integrációs tesztfájlok vannak, de ez a futás az env-gated integrációt skipelte; a DB suite ezen auditban nem futott.
- Nincs bizonyíték teljesen automatizált browser/E2E csomagra vagy párhuzamos sessionekkel, hosted RLS/Storage-val végzett regresszióra. Az előző browser smoke-ok manuális, célzott munkamenetek.
- A `execution-data.ts` mappinget közvetlenül ellenőrző, adatmintákat és hiányzó/kapcsolatlan related rekordokat próbáló tesztet nem találtam a név- és importleltárban; az execution overview helper tesztje nem fedi le a DB→workspace mapping teljes szerződését.

**Ajánlás:** ne hajszoljunk coverage célszámot. A következő fontos tesztcsomag kis terjedelmű legyen: munkanapló-adatprojekció és hiányzó relációk; survey/photo offline retry és már lefutott, de elveszett válasz; helyi két szervezetes negative RLS/Storage próba; később hosted staging smoke és restore proof.

## 10. Fejlesztői élmény és operáció

- A fő parancsok egyértelműek: `dev`, `build --webpack`, `start`, `lint`, `typecheck`, Vitest és helyi Supabase parancsok. A repo dokumentáció külön óv az éles migrációtól és DB reset destruktív jellegétől.
- Claude Code és Codex szabályai lefedik a státuszellenőrzést, dokumentáció-forrás prioritást, fázishatárokat, célzott ellenőrzéseket és a shared repository megőrzését.
- F9.63.4 és F9.64 korábban elkülönített worktree/build környezetet használt a futó dev szerver védelmére. Jelen `npm run build` ugyanazon repó `.next` könyvtárába ír; ezért aktív `next dev` mellett buildet kerülni kell, amíg nincs kifejezetten elkülönített build dir/worktree. A szabályos munkafolyamat létezik a dokumentált előzményben, de a script önmagában nem akadályozza meg a párhuzamos futtatást.
- Nem találtam `.github` CI workflow, `instrumentation.*`, logger/monitoring vagy deploy manifest fájlt a célzott fájl-inventoryban. Ez nem bizonyítja, hogy külső CI/monitoring nincs, ezért deploy/operációs érettség **NOT VERIFIED**, nem automatikusan hiba.
- `docs/PILOT_READINESS.md` már világosan rögzíti, hogy hosted deploy, restore, RPO/RTO, monitorozás, cross-org staging, fizikai mobil és szakmai review blokkoló lehet. Ez jó kockázatkezelési gyakorlat; az állapotot még bizonyítani kell.

## 11. Mérnöki érettségi mátrix

| Terület | Értékelés | Bizonyíték és fennmaradó kockázat | Döntés |
|---|---|---|---|
| Szoftverarchitektúra | **ADEQUATE** | Érthető app/feature/domain/infrastructure határ; nem teljesen szeparált adatadapterek. Formális ciklusgráf nincs. | A jelenlegi felépítés maradjon. |
| Olvashatóság/fenntarthatóság | **ADEQUATE** | Jó dokumentáció, mérföldkövek és targeted fixek; `execution-data.ts` típusbiztonsága gyenge. | F68-01 fokozatosan. |
| Típusbiztonság/domainhatár | **ADEQUATE** | `strict` TS, domain szerződések és validátorok; néhány rétegben loose Supabase query és explicit cast. | A meglévő valós határproblémákat célzottan javítani. |
| Backend/adatbázis | **STRONG (source/local)** | RLS, összetett FK, immutability, expected-version/idempotens RPC, pgTAP regressziók. Hosted schema/status nincs ellenőrizve. | A mintákat megőrizni; hosted proof szükséges rollout előtt. |
| Biztonság/jogosultság | **ADEQUATE / NOT VERIFIED hosted** | Auth claims + org membership + szerver/RPC ellenőrzés, private bucket, short signed URL; hosted isolation nincs bizonyítva, upload body cap előzetessége nyitott. | F68-02 és staging kapuk. |
| Megbízhatóság/helyreállítás | **ADEQUATE (local contracts)** | Survey draft recovery, retry ID, expected-version conflict és snapshot történet. Minden hálózati outage/concurrent user út runtime tesztje hiányos. | Célzott retry/race regresszió. |
| Kliens/mobil teljesítmény | **ADEQUATE / NOT VERIFIED mobile** | Lokális browser mérés az F9.64-ben, F9.63.4 chunk workflow. Nincs hosszú session vagy fizikai mobil. | Ne optimalizáljunk measurement nélkül; terepi smoke. |
| Szerver/erőforrás-hatékonyság | **ADEQUATE / UNVERIFIED at scale** | F9.64/65 query audit és targeted betöltés; worklog mapping és request-body memóriaút még javítható/mérendő. | F68-01/02. |
| Teszt/regresszióvédelem | **ADEQUATE** | 924 aktív teszt PASS ebben a futásban; 8 local integration suite skip, 58 pgTAP fájl nem futott. Coverage nincs mérve. | Risk-based integration/e2e kiegészítés. |
| DX és tooling | **ADEQUATE** | Tiszta parancsok, projekt- és auditdokumentáció, cache kizárás; `.next` felhalmozódás és párhuzamos build könnyen tárhelyet/aktív dev állapotot érint. | Kézi cache terv; build isolation szabály. |
| Observability/operáció | **NOT VERIFIED** | Lokális workflow létezik; hosted log/alert, backup-restore proof, RPO/RTO és külső CI nincs igazolva. | Rollout gate, lásd pilot-readiness. |
| Bővíthetőség/SaaS-skálázás | **ADEQUATE FOUNDATION / NOT VERIFIED** | Organization-scoped adatszerződések és migrációs modell; valós multi-org terhelés, onboarding/szerepkör és hosted recovery nincs tesztelve. | Nem kell korai enterprise architektúra; bizonyítani kell a működési kapukat. |

## 12. Megőrzendő megoldások

1. Feature-központú monolit és külön domain kalkulációk.
2. Server/client határ és publikus kulccsal felépített Supabase SSR kliens.
3. Tagság ellenőrzése actionökben és érzékeny írásnál ismét a DB/RPC oldalon.
4. Immutable kalkuláció-, felmérés- és ajánlatrevíziók, forrás-azonosság és snapshotok.
5. Expected-version konkurenciakezelés, stabil request ID és idempotens retry, ahol a művelet ezt igényli.
6. Fotó reservation/attach workflow és metadata nélküli újrakódolás; csak a privacy-retention döntést és leírást kell összehangolni.
7. F9.63 lazy loading, F9.63.1/65 targeted read és F9.67 stabil snapshot serializer: mért/szerződéses célokra szűkített változtatások.
8. RLS/pgTAP adatbázis regressziók és az éles mutációtól elkülönített lokális workflow.
9. Egyetlen függőség eltávolítása bizonyított usage trace után; további cleanup csak bizonyítékkal.
10. Nincs igény mikroservice-re, új global state library-re, adat-cache-re, domain rewrite-ra vagy általános memoizationra.

## 13. Prioritásos megállapítások

### P0 — kritikus

**Nincs igazolt P0.**

### P1 — magas prioritás

**Nincs igazolt P1 kódhiba.** A hosted biztonsági, backup/restore, monitoring és mobil-terepi bizonyíték hiánya azonban blokkoló a széles SaaS/pilot elfogadás előtt; ezeket rollout-gate-ként kell kezelni (UNVERIFIED, nem forrásból bizonyított sérülékenység).

### P2 — indokolt munka

#### F68-01 — Munkanapló adatlekérő: típusellenőrzést kikapcsoló határ és ismételt sor-keresés

- **Hely:** [`execution-data.ts`](../src/features/execution/execution-data.ts#L1) 1., 14., 16–40. és 102–160. sor; a feature munkanapló-oldalai és exportja fogyasztják.
- **Probléma/bizonyíték:** fájlszintű `no-explicit-any` tiltás; `LooseClient` `any` válasszal; sok `plan/task/photo/journal/event` mező `any`-ből olvasódik. Minden tervnél a task/photo/journal/event kollekciót újraszűri, és a fotó/napló task címhez ismét `find`-el. A DB queryk org-szűrtek és az overview tervek limitáltak; a valódi sorvolumen és runtime latency nincs mérve.
- **Hatás/severity/confidence:** munkanapló, projektoldali execution section, kapcsolt felmérés és kivitelezési PDF. **P2, magas bizalom a típusossági problémában, közepes a runtime hatásban.** Sémaeltérés könnyebben átcsúszhat compile-time ellenőrzésen; nagy adaton a mapping ismételt lineáris bejárásai skálázódnak.
- **Legkisebb javaslat:** a használt DB select-resultokat szűken tipizálni; betöltés után egyszer építeni `tasksByPlan`, `photosByPlan`, `journalByPlan`, `eventsByPlan`, `taskById` mapeket. Előtte/utána mérni valószerű, anonimizált fixture-en.
- **Haszon/költség/kockázat:** pontosabb schema-change jelzés és sorosztályozás; alacsony-közepes munka; közepes mapping regressziós kockázat. Tesztelje a hiányzó task/journal/revision és üres collection eseteket, plusz paritást 1/50/200 tervre.
- **Security/historikus adat:** org szűrő, signed URL és snapshot forrás változatlan kell maradjon; nincs történeti adatírás.
- **Ajánlás:** **MEASURE FIRST**, majd kis implementáció, ha a típusadapter nem túl költséges. Nem indokolt az egész execution feature újraírása.

#### F68-02 — Fotó multipart méretellenőrzés csak a body parse után

- **Hely:** [`route.ts`](../src/app/api/felmeresek/%5BsurveyId%5D/photos/route.ts#L69) 69–79. sor; byte-buffer a 88. sorban.
- **Probléma/bizonyíték:** `request.formData()` megvárja a teljes multipart body feldolgozását; az alkalmazás 10 MB `file.size` korlátja csak utána fut. Ez a korlát a Sharp pixel-limitjével együtt védi a képfeldolgozást, de nem korlátozza előzetesen a form parser által allokált body méretet.
- **Hatás/severity/confidence:** fotófeltöltés; túlméretes kéréssel magas memóriafogyasztás vagy DoS lehetősége, ha a runtime/hosting réteg nem korlátozza a body-t. **P2, forrásból igazolt sorrend, valós kihasználhatóság és host limit nem ellenőrzött.**
- **Legkisebb javaslat:** előbb dokumentálni és tesztelni az alkalmazási hosting request-body limitjét. Ha nincs megfelelő felső korlát, a request beolvasása előtt alkalmazni ingress/runtime limitet; ne csak kliensoldali `file.size`-ra támaszkodjon. Streaming parser csak akkor indokolt, ha a platform limit nem elég.
- **Haszon/költség/kockázat:** szervermemória-kitettség csökkentése; alacsony, ha a hosting limit beállítható, közepes külön streaming megoldásnál. Teszt: hiányzó Content-Length/chunked és nagy multipart body; normál max méretű kép továbbra is működjön.
- **Security/historikus adat:** meglévő fájlokhoz, revíziókhoz, signed URL-hez ne nyúljon.
- **Ajánlás:** **MEASURE FIRST** — hosted platform/ingress limit nélkül nem állítható, hogy a risk ki van zárva.

#### F68-03 — Fotó EXIF/GPS-viselkedése eltér a pilot dokumentumtól

- **Hely:** [`normalize-survey-photo.ts`](../src/infrastructure/images/normalize-survey-photo.ts#L1) 1–20. sor; [`normalize-survey-photo.test.ts`](../src/infrastructure/images/normalize-survey-photo.test.ts#L1) 1–30. sor; elavult állítás a [`PILOT_READINESS.md`](PILOT_READINESS.md#L36) 36–40. és 65–88. sorban, valamint a [`PROJECT_MAP.md`](PROJECT_MAP.md#L91) 91. sorban.
- **Probléma/bizonyíték:** a kód Sharp-pal újrakódolja a képet és explicit eltávolítja az EXIF/GPS metaadatot; a teszt EXIF mezővel bizonyítja az eltávolítást. Két projektoldali leírás ennek ellenkezőjét állítja („nincs metaadat-strippelés”), és az EXIF-döntést nyitottként/blockingként kezeli.
- **Hatás/severity/confidence:** adatvédelmi tájékoztatás, fotó megőrzése, szakmai workflow. **P2, magas bizalom, dokumentációs/adatkezelési eltérés, nem kódhiba.** A felhasználó azt hiheti, hogy az eredeti metadata megmarad, miközben a rendszer nem tárolja azt.
- **Legkisebb javaslat:** a pilot-readiness/PROJECT_MAP szöveget a tényleges viselkedésre frissíteni, és a product/privacy ownerrel megerősíteni, hogy ez kívánt policy. Ha az eredeti EXIF megőrzése kell, azt külön, engedélyezett termék/adatkezelési milestone-ban kell megtervezni; ne állítsuk vissza automatikusan.
- **Haszon/költség/kockázat:** helyes felhasználói tájékoztatás és döntési alap; dokumentációs javítás kis munka, adatkezelési döntés külön. Teszt: meglévő re-encode/metaadat teszt maradjon zöld.
- **Security/historikus adat:** GPS-strip jelenleg adatvédelmi védelmet ad; korábbi képek/auditnapló nem módosítható.
- **Ajánlás:** **FIX DOCS**; a viselkedés maradjon, amíg nincs kifejezett termékdöntés.

#### F68-04 — `.next` méretét régi, verzióspecifikus Turbopack cache növeli

- **Hely:** `.next/dev/cache/turbopack/v16.4.0-e273d5b2` (2.9 GB, 393 fájl); jelenlegi csomag Next.js 16.4.2, cache: `.next/dev/cache/turbopack/v16.4.2-2864b177` (233 MB, 48 fájl); `.next/cache/webpack` 1.8 GB. `next.config.ts` cache-eltérítést nem állít; `package.json` build script Webpackot kér.
- **Probléma/bizonyíték:** 6.2 GB `.next` 4.4 GB dev kimenet/cache + 1.8 GB Webpack cache. A régi Turbopack verzió könyvtára külön maradt, és jelentős helyet foglal. A Next 16.4 docs szerint a dev filesystem cache alapértelmezett és újrafelhasználásra szolgál; Webpack build cache is külön célú. Nem mértük, van-e tényleges disk pressure vagy időveszteség.
- **Hatás/severity/confidence:** helyi lemezhasználat, cold/warm fejlesztés. **P2, magas bizalom a tárhelytényezőre, alacsony a teljesítményhatásra.** Nem production latency finding.
- **Legkisebb javaslat:** semmit ne töröljünk automatikusan; ha hely kell, jelenlegi szerver leállítása után külön, jóváhagyott maintenance alatt először csak régi 16.4.0 cache-et távolítsuk el. `.next/cache/webpack` törlése cold buildet eredményezhet. Cache-kikapcsolás nem indokolt.
- **Haszon/költség/kockázat:** legfeljebb ~2.9 GB hely, aminek ára Next 16.4.0-ra visszaváltáskor a warm cache elvesztése. Build/I/O javulást nem állítunk. Tárhely- és cache-növekedés követés kell, nem app teszt.
- **Security/historical data:** cache generált, `.gitignore` kizárja; adatbázis és revision nincs érintve. A cache-takarítás most nem történt meg.
- **Ajánlás:** **DEFER** külön takarítási mérföldkőre; előbb ellenőrizni kell, hogy senki sem használ régi verziót.

### UNVERIFIED — rollout kapuk

#### F68-05 — Hosted multi-organization izoláció és storage negatív teszt

- **Hely:** `docs/PILOT_READINESS.md` 42–46., 62–65. sor; auth/RLS migrációk és API útvonalak.
- **Bizonyíték:** a forrásban szerveroldali org membership, private bucket, signed URL és DB policy tesztminta van; a dokumentáció szerint két szervezet/felhasználó hosted cross-org tesztje nincs lefuttatva.
- **Érintettség/severity:** minden szervezeti ügyféladat és fotó; **UNVERIFIED, magas rollout-hatás, alacsony bizonyíték az aktuális hibára**.
- **Legkisebb javaslat:** elkülönített stagingen két org/two users eset, foreign UUID, signed URL, session switch, membership revoke és denied read/write.
- **Benefit/költség:** kritikus izoláció bizonyítéka, közepes tesztmunka. DB és történeti adat maradjon read-only, teszt fixtures isolated.
- **Ajánlás:** **MILESTONE BEFORE BROADER SAAS**. Nincs exploit kísérlet ebben az auditban.

#### F68-06 — Mentés, helyreállítás, CI és observability nincs igazolva

- **Hely:** `docs/PILOT_READINESS.md` 48–52., 66–80., 97–101. sor; a célzott inventoryban nem találtam `.github` workflow, instrumentation vagy logger fájlt.
- **Bizonyíték:** projekt saját leírása szerint nincs bizonyított hosted DB/Storage backup, restore-run, RPO/RTO, monitoring/alert vagy hosted deployment. Külső CI és platformszintű logging nem vizsgálható a repositoryból.
- **Érintettség/severity:** production adat-helyreállítás, incidensészlelés és release minőség; **UNVERIFIED, rollout előtt magas, nem igazolt lokális kódhiba.**
- **Legkisebb javaslat:** ops ownerrel staging DEMO DB + photo restore test, dokumentált RPO/RTO/runbook/alert, migration rollback/forward rehearsal és CI release gate proof. Új monitoring/vendor választás csak konkrét hiány igazolása után.
- **Haszon/költség:** visszaállítható és működtethető szolgáltatás; közepes, több szereplős operációs munka.
- **Ajánlás:** **MILESTONE BEFORE BROADER SAAS**; production readiness állítás addig ne legyen.

### P3 — opcionális / később

- A Vitest futási kimenete 5.65 s module transforms-t jelzett újrafuttatva, de a teljes suite 4.13 s alatt zárt; nincs indok cache-optimalizálásra vagy új Vitest toolingra.
- Formális import/cycle grafikon, Knip vagy bundle analyzer telepítése nem indokolt automatikusan; csak konkrét ownership/bundle kérdésnél használjunk már telepített/engedélyezett eszközt.
- További Liquid Glass, memoization, worker, cache, index vagy domain-architektúra refaktor mérés nélkül nem javasolt.

## 14. Technikai adósság-nyilvántartás

### Valós, célzottan kezelendő

1. `execution-data.ts` loose Supabase client és `any` leképezése (F68-01).
2. Multipart body parse előtti méretkorlát hosting/ingress bizonyítéka hiányzik (F68-02).
3. Fotó metadata-kezelésről szóló elavult dokumentáció (F68-03).
4. Verzióváltásból maradt 2.9 GB cache; külön takarítás csak szerverleállás és döntés után (F68-04).
5. Hosted RLS/Storage, restore, monitoring, RPO/RTO és mobile poor-network proof hiánya – működési/adopciós feltétel, nem törlendő kód.

### Nem igazolt adósság / ne refaktoráljuk

- A három réteg nem bizonyít „túlabstraháltságot”; a feature saját action és adatbetöltő együtt tartása elfogadható.
- A cache méret nem bizonyít lassú produkciós appot; a Turbopack/Webpack cache hasznos buildfejlesztési állapot.
- 924 teszt nem jelent automatikus minőséget, de nem találtam indokot önkényes tesztkeret-cserére vagy coverage célszámra.
- Ismétlődő authorizációs és revision-validációs kód nem automatikusan deduplikálandó: eltérő scope, transaction és historical contract lehet.
- Nem kell microservice, state library, queue, új UI framework, global query cache, megújított auth vagy új domain engine.

## 15. Javasolt fejlesztési roadmap

| Sorrend / milestone | Cél és hatókör | Haszon | Kockázat / komplexitás | Ellenőrzés és elfogadás |
|---|---|---|---|---|
| 1. F9.69 — Photo upload boundary audit/fix | Hosted request-body plafon ellenőrzése, ha hiányzik, alkalmazási kapu tervezése. | Memória/DoS kitettség csökkentése. | Alacsony ingress beállításnál, közepes streaming parsernél; API runtime függő. | Max/oversize/chunked payload és érvényes 10 MB kép smoke; error semantics unchanged. |
| 2. F9.70 — Munkanapló data contract | Szűk query-result típusok és csoportosított mapping, csak szükség esetén. | Compile-time biztonság, nagyobb sorhalmaznál kisebb ismételt scan. | Alacsony-közepes; közepes mapping regresszió. | Null/hiányzó related sorok, snapshot, signed URL, org filtering paritás; 1/50/200 plan timing. |
| 3. F9.71 — Pilot data handling docs | Foto EXIF-stripping, retention/törlés és tájékoztatás dokumentálása owner döntés után. | Kód és adatkezelési ígéret egyezése. | Kódváltozás nélkül alacsony; policy döntés szükséges. | Normalizáló teszt, docs cross-reference, product/privacy jóváhagyás. |
| 4. F9.72 — Staging isolation/restore gate | Hosted két-organization Auth/RLS/Storage negatív teszt és DB+photo restore próba; monitoring/RPO/RTO runbook. | SaaS rollout kockázatának bizonyíték alapú csökkentése. | Közepes operáció; valódi adathoz csak izolált DEMO staging. | Sikeres forbidden read/write matrix, session revoke, restore artifact, időmérés és riasztás proof. |
| 5. F9.73 — `.next` karbantartás, ha tárhely indokolja | Dev szerver leállítása után csak elavult verziócache eltávolításának dokumentált lépése. | Max ~2.9 GB lokális lemezhely. | Alacsony kód-, kis warm-cache kockázat. | Cache regeneration/version path, warm dev indulás összevetése; nincs config változás. |

Nincs javasolt immediate critical fix. Nem javaslok schema, RLS, auth, formula, történeti snapshot vagy build-config módosítást ebből az auditból.

## 16. Végső átadás

**Egyetlen legértékesebb következő implementációs milestone:** F9.69 — a fotó API request-body korlátjának hosting szintű ellenőrzése, és ha az nincs, a legkisebb platformszintű korlát megvalósítása. Ennek célja valódi biztonsági/erőforrás határ bizonyítása; jelenleg a 10 MB file check parsing után történik, így a frontend limit önmagában nem body-size védelem.

Ezt nem implementáltam. A hosted platformkonfigurációhoz való hozzáférés nem volt jelen, ezért a támadhatóság és meglévő ingress-védelem **nem ellenőrzött**. A szélesebb SaaS rollouthoz az F68-05/06 pilot readiness kapuk ugyanilyen kötelezők, de azok nem egyetlen kódmódosítással megoldható tételek.

**Ajánlott Conventional Commit:** `docs: F9.68 record engineering excellence audit`
