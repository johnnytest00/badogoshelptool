# F9.64 — Advanced backend, database & rendering performance audit

**Státusz: AUDIT COMPLETE — PASS WITH FINDINGS.** A kódból két konkrét katalógus-adatbetöltési többlet igazolható. A lokális böngészőben az ellenőrzött műveletek működtek, a mért render-/input-idők nem mutattak bizonyított alkalmazásoldali szűk keresztmetszetet. Production terhelésre, GPU-költségre vagy adatbázis-skálázódásra ebből nem lehet következtetni. Ez a mérföldkő mérés és dokumentáció; termékkód, CSS, konfiguráció, adatbázis és adat nem változott.

## Vezetői összefoglaló

- **Backend:** a material catalog teljes kapcsolt rekordokat kér le (termékek, gyártók, kategóriák, variánsok, minden variánsár és áropció) olyan olvasóknak is, amelyek csak szűk katalógusprofilt vagy csak megjelenítési fallbacket igényelnek. A mintázat konkrét; a valós hatás a DEMO-adat kicsinysége miatt nincs számszerűsítve.
- **RLS / indexek:** három, lokális Supabase DEMO felhasználóval és RLS-szerepkörrel végzett `EXPLAIN (ANALYZE, BUFFERS)` biztonságosan lefutott. Az érintett táblák 1–14 sort tartalmaztak; a 0,069–1,058 ms tervidők nem production becslések. Indexet nem indokolt pusztán ezekből változtatni.
- **Auth és navigáció:** az auth lekérdezésláncban van szekvenciális szervezeti névfeloldás, de a `getAuthContext` React `cache`-szel kérésenként deduplikált, és a layout/oldal megosztja. A szerveroldali query-számot navigációnként nem instrumentáltuk; redundancia nem bizonyított.
- **CSS / GPU:** az izolált production build összes CSS-e 553 474 bájt nyers / 76 855 bájt gzip; a nagy közös stylesheet 541 662 / 75 550 bájt. A `backdrop-filter` és árnyékdeklarációk száma önmagában nem igazol GPU- vagy frame-problémát. Nem találtam mért renderbottlenecket, de mobil, scroll, light theme, reduced-motion és valódi GPU-profiler összehasonlítás nem történt.
- **Böngésző:** külön ideiglenes production build és helyi DEMO-fiók. Dashboard 49 request, 293 670 B hálózati átvitel; DCL 179 ms / Load 330 ms. Felmérés szerkesztőben labor-INP 72 ms, CLS 0. Anyagkeresés és kalkulátor input→eredmény→rajz működött. A CPU-trace időtartamát a kézi mérés/tool-kezelés erősen meghosszabbítja, ezért az nem interakciós latency.
- **Korábbi munka:** az F9.63.1 revízióbatch-elései, valamint az F9.63.2–F9.63.4 kalkulátor-kategória lazy-loading útvonala a jelenlegi forrásban érvényes; regresszió nem látható. Nem ismételtem meg az előző mérföldkövek validációját.

## Hatókör és módszer

- A kért F9.62/F9.63.4 auditokat, a tooling-leltárt, projektutasításokat és aktuális implementációt olvastam; az F9.63 módosításokat a munkafában megőriztem.
- Next 16.4.2 webpack production build külön `/private/tmp` munkakönyvtárban készült, külön 3101-es loopback porton. A projekt aktív 3000-es dev szervere és `.next` könyvtára nem kapott buildet vagy módosítást. A build sikeres volt, 32 statikus oldal generálásával.
- Brave böngészőben asztali nézet, helyi hitelesített `DEMO` session: dashboard, felméréslista és szerkesztő, kalkulátor hub/cölöp deep link, Anyagkezelő és anyagkeresés. Egy felmérés-méretezés és a cölöpátmérő helyi űrlapállapotát átmenetileg módosítottam, majd visszaállítottam; mentési műveletet nem hívtam. A kalkulátor helyi előnézete adatbázisba nem ment.
- DevTools cache letiltva; hálózati throttling és request blocking kikapcsolva. A dashboard dokumentum kezdeti betöltésén 49 kérés, 293 670 B átvitel / 669 032 B erőforrásméret volt látható; DCL 179 ms, Load 330 ms. Ez egyetlen helyi, DEMO cold-ish dokumentumnavigáció, nem reprezentatív eloszlás. A survey és kalkulátor oldalak client-navigation mérései ugyanazon tab/cache állapotban történtek; a kumulatív DevTools „Finish” idő nem használható oldalbetöltési adatként.
- Az inputoknál egyedi labor-INP érték rögzült (felmérés 72 ms), a vizuális állapotváltozás helyes volt. A DevTools felmérés-trace kb. 6,57 s, kalkulátor-trace 7,245 s tartományt fogott át kézi vezérléssel; az összesített `Rendering`/`Painting` rendre 17/13 ms, illetve 12/10 ms, a forrásként attribuált localhost main-thread idő 10 ms, illetve 2,5 ms alatt volt. Ez nem kontrollált input-to-paint benchmark; a trace teljes tartománya nem az esemény ideje.
- Memory trend, hosszú ismétlődő route ciklus, CPU-throttling, mobil valódi eszköz, frame-time grafikon, CSS coverage, style recalculation önálló idő, réteg/composite és GPU memória nem lett mérve. A korábbi F9.63.4 mérföldkő külön ellenőrzéseit nem számítom új F9.64 mérésnek.

## Adatbázis, RLS és indexek

### Lokális query-plan mérés

Helyi Supabase-adatbázis, `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated`, a helyi DEMO user JWT-claimjeivel, szervezeti tagság ellenőrzése után. Minden mérés tranzakciós rollbackkel zárult. `EXPLAIN (ANALYZE, BUFFERS)` csak olvasott, lokális DEMO táblákon futott; RLS-t nem kerültem meg, hosted/production adatot nem vizsgáltam.

| Lekérdezés | Tényleges helyi terv | Korlát |
|---|---|---|
| Aktív `material_products`, szervezet, `updated_at DESC`, `LIMIT 200` | 1 sor; seq scan + sort; 0,605 ms; 5 shared buffer hit | Egyetlen termék; indexelőny nem mérhető ebből. |
| Egy termék `material_variants` kapcsolatai, RLS alatt | 1 sor; seq scan + sort/semijoin; 1,058 ms; 7 buffer hit | Egyetlen releváns variáns; production cardinality ismeretlen. |
| Saját `organization_members` tagság `user_id` szerint | 1 sor, 13 sor szűrve; seq scan; 0,069 ms; 2 buffer hit | Tizennégy soros helyi tábla. |

Az aktív migrációkban léteznek org/category és org/status termékindexek, termék→variáns index, ár→variáns/effective-date index, kategória-id index, variáns áropcióindex, valamint saját user membership index. Survey listára az org/creator/project és updated_at részleges indexek már szerepelnek. A termék org + `updated_at DESC` kombinációhoz nem találtam külön kompozit indexet; ez **P3 hipotézis**, nem ajánlott változtatás: előbb valós méretű, RLS-szempontból azonos query-plan és rendezési költség szükséges.

Nem készült EXPLAIN a quotations, execution logs, survey-list és linked roof-model teljes route-query láncára. Ezekhez nem áll rendelkezésre itt kontrollált, valós méretű terhelésminta. A RLS helper és indexek módosítása nincs javasolva.

## Anyagkatalógus és takeoff betöltés

### F64-01 — Kalkulátor-hub teljes anyagkatalógus-olvasása (**SOURCE-CONFIRMED, P2**)

- **Hely:** `src/app/kalkulatorok/page.tsx` → `getMaterialProductsForOrganization`; `src/features/materials/material-data.ts` → `loadRelated`; `src/domain/calculations/roof-material-catalog.ts` → `catalogProfilesFromProducts`.
- **Bizonyíték:** a profilképző termék/variáns neveket, kategóriát, státuszt, gyártót, műszaki méreteket és forrás-provenance-t használ. A közös loader ehelyett akár 200 termékhez minden mezőt, minden szervezeti gyártót/kategóriát, minden variánst, minden árverziót és áropciót lekér, majd a teljes árlistát memóriában csoportosítja. Nem-üres katalógusnál a loader 6 PostgREST olvasást ad ki: termék; párhuzamos manufacturer/variant/category; majd ár és áropció szekvenciálisan.
- **Hatás:** a szükségtelen mező, ár-history átvitel és mapping valós mechanizmus; a jelenlegi DEMO mintán mért felhasználói hatás kicsi/ki nem mutatható. A variáns- és árrekordok száma 200 terméken túl is korlátlan.
- **Minimális javaslat:** külön, csak a kalkulátorprofilhoz szükséges mezőket beolvasó lekérdezés/adatprojekció, amely nem tölti le az ár-historyt. Minden olvasás maradjon szervezet- és RLS-határolt; a provenance, variáns-azonosítók, kategória-aktivitás és technikai validáció maradjon azonos.
- **Mérés és regresszió:** azonos valós méretű katalóguson PostgREST request/row/byte szám, server duration, profilparitás; ellenőrizni kell az összes kalkulátorcsoportot, hiányzó/hibás műszaki specifikációt, inactive kategóriát és RLS szervezeti izolációt.
- **Kockázat / engedély:** ár- és forrásadat nélkül maradó profil más fogyasztónál hibás lehet, ezért a read-modelt csak minden hívó felmérése után szabad szűkíteni. A konkrét implementációhoz külön F9.65 jóváhagyás szükséges; ez az audit nem változtatott rajta.

### F64-02 — Takeoff kategória-opciók ismételt közös olvasásai (**SOURCE-CONFIRMED, P2**)

- **Hely:** `src/features/material-takeoffs/takeoff-data.ts:getGableCoveringTakeoffOptions` és a közös material loader.
- **Bizonyíték:** a tetőfedés és lemez kategóriákra két loader indul párhuzamosan. Mindkettő lekéri a teljes szervezeti gyártó- és kategórialistát, a szűrt variánsokat, majd az árakat és opciókat. Ha mindkét szűrés ad terméket, a két loader összesen legfeljebb 12 PostgREST olvasást jelent; a gyártó/kategória közös része duplikált. A pontos route runtime request-száma nem került mérésre.
- **Minimális javaslat:** egy szervezeti katalógusbetöltés két kategóriára szűrt termékekkel, vagy egy erre a képernyőre célzott read-model. Ne vezessünk be requesten túli cache-t.
- **Mérés/teszt/kockázat:** rögzítsük kérések számát, időt és byte-ot üres/egy/két kategóriás katalóguson; ellenőrizzük a piece-unit választást, latest-price szabályt, technikai specifikációt, forrást, kategóriát és org/RLS izolációt. Az ártörténet és változat árkiválasztás hibás szűkítése beszerzési/árajánlati eltérést okozhat.
- **Engedély:** csak külön implementációs mérföldkőben.

### F64-03 — Anyagtermék-részlet és takeoff nézet teljes katalógusfüggése (**SOURCE-CONFIRMED, P2**)

- **Hely:** `getMaterialProductForOrganization` a `src/features/materials/material-data.ts` fájlban; `loadTakeoffs` a `src/features/material-takeoffs/takeoff-data.ts` fájlban.
- **Bizonyíték:** a termékrészlet ID helyett az összes (maximum 200) archived terméket tölti be a teljes kapcsolt adatcsomaggal, utána keres ID szerint. Ez felesleges munkát okoz; ha a kért termék az updated_at szerinti 200-as ablakon kívül esik, `null`-t is adhat. A takeoff olvasó az elemek snapshotjaival együtt az egész archived katalógust betölti, majd mapet épít variáns-/terméknév fallbackhez.
- **Minimális javaslat:** ID-ra célzott, org/RLS-szűrt részletolvasás; takeoffoknál csak a ténylegesen hivatkozott variáns-/termék ID-ket oldja fel. Snapshot marad elsődleges és változatlan.
- **Mérés/teszt/kockázat:** 1 vs. 200+ termék lekérdezés ideje/bytes; régi archived elem, törölt/missing variáns, snapshot fallback, szervezetek közötti azonos UUID-szituáció és teljes snapshot-provenance. Rossz current-catalog adat snapshotot írhatna felül; csak megjelenítési fallback legyen.
- **Engedély:** külön implementációs jóváhagyás kell.

### F64-04 — Material Manager ismétlődő gyártó/kategória-adat (**SOURCE-CONFIRMED, P3**)

`MaterialManagerPage` külön is kéri a kategóriákat és gyártókat, miközben az `includeArchived` termékloader ugyanazokat már beolvassa a mappinghez. Nem-üres adaton legfeljebb 8 olvasás (loader 6 + közvetlen manufacturer/category 2). A formai opcióknak szükségük lehet az inaktív kategóriákra is, ezért a javaslat csak a dupla kérés megszüntetése. P3; a DEMO mérés nem bizonyít felhasználói késleltetést. A mérés során a Material Manager listát és keresőt ellenőriztem, de termékszerkesztést nem végeztem. Egy későbbi változat előtt mérd a kérés-/sor-/byte-számot, és őrizd meg az inaktív kategóriák szerkesztési elérhetőségét.

## Auth, root layout és navigáció

### F64-05 — Auth/org feloldási lánc és deduplikáció (**ALREADY OPTIMIZED + BLOCKED measurement, P3**)

- **Hely:** `src/features/auth/auth.server.ts:getAuthContext`, `src/features/projects/organization.ts:getProjectOrganization`, `src/components/navigation/app-navigation.tsx`.
- **Bizonyíték:** `getAuthContext` a `react` `cache` wrapperében fut. Claim ellenőrzés után user/profile/membership párhuzamosan olvasódik; a membership által adott org ID-k alapján az organization nevek egy további, szekvenciális lekérdezéssel töltődnek. A navigáció és az oldal ugyanazt a függvényt hívja a renderkérés alatt, ezért ez a kód kifejezetten deduplikálható. A React cache nem jogosultsági bypass, és request-scope, nem globális tartós cache.
- **Mérés:** böngésző Network nem mutatja a szerveroldali Supabase queryk számát. Nincs server timing/query logger, ezért az org feloldásának elkerülhetetlen költségén túli ismétlés vagy route-onkénti szám nem bizonyított.
- **Javaslat:** változatlanul hagyni, amíg célzott szerveroldali request timing/query count nem mutat duplikációt. Auth/RLS, org-check vagy cache scope ne változzon csak a látott Promise-lánc alapján.
- **Ha később mérjük:** csak request ID-hez kötött, személyes/tokenadatot nem naplózó query timing; ellenőrzés root layout + page + client navigation útvonalon, több tagságú userrel; eredménynek azonos org-scope-ot kell mutatnia.

## CSS, Liquid Glass és SVG

### F64-06 — CSS footprint, mért render-költség nélkül (**MEASUREMENT-CONFIRMED artifact / PLAUSIBLE runtime, P3**)

- `src/app/globals.css`: **491 405 byte** forrás; 116 `backdrop-filter`, 179 `box-shadow`, 7 `@keyframes`, 15 `animation:`, 43 `transition:` előfordulás.
- Külön production build: két CSS asset összesen **553 474 byte raw / 76 855 byte gzip**; elsődleges CSS 541 662 / 75 550 byte. A teljes transfer tényleges route-összegét a dashboard Network mérés tartalmazza, nem azonos a gzip fájlösszeggel.
- Ez a footprint mérhető, de nem igazolja önmagában a style-recalc, paint, composite vagy GPU bottlenecket. A vizsgált desktop interakciók trace-ében alacsony localhost main-thread attribution látszott; nincs kompozitor/GPU track bizonyíték.
- **Javaslat:** jelenleg ne bontsuk a globális CSS-t, ne csökkentsük blur-t és ne távolítsunk el stílusokat. Ha valós eszközön scroll/jank reprodukálható, komponensenkénti paint flashing/layer panel és 60/120Hz frame trace alapján szűkítsünk. Coverage önmagában nem elég törléshez.
- **Nem ellenőrzött:** mobil és kis teljesítményű eszköz, scroll-hosszú trace, dark/light összevetés, reduced-motion, adaptív scaling, betűkészlet-hálózati idő, CSS parse/stílus számított idő és GPU memory.

### F64-07 — Műszaki SVG rajz input utáni frissülése (**MEASUREMENT-CONFIRMED működés, bottleneck nem igazolt, P3**)

Kalkulátor cölöp átmérő 1000→1100 mm módosítás után az eredmény 1,571→1,901 m³ lett és az SVG 1100 mm-t jelzett; felmérés méretmező 10 000→11 000 mm módosításánál a rajz és számított felület frissült. A visszaállított survey mező mentett kezdeti állapotot mutatott. Egy interakciónál 72 ms INP-t mértem a survey felületen; nincs több interakciós minta és a kalkulátor trace nem adott megbízható esemény-latenciát. További SVG memoization/worker nincs indokolt.

## Böngészős workflow eredmény

| Workflow | Megfigyelés | Értelmezés |
|---|---|---|
| Dashboard → navigáció | 49 kérés; 293 670 B átvitel / 669 032 B erőforrásméret; DCL 179 ms / Load 330 ms | Egy helyi production-build DEMO mérés. |
| Survey list/editor | 15 DEMO bejegyzés látható; méretmódosítás frissítette az eredményt és SVG-t; restore után `Mentve` állapot | 72 ms lab INP, CLS 0 az adott sessionben; mentési API nem lett hívva. |
| Kalkulátor hub/cölöp | Lazy chunkok 200 OK, betoneredmény és rajz együtt változott inputra | Az adott útvonal működését igazolja, nem teljes chunk-by-chunk cold benchmark. F9.63.4 korábbi, külön production cold-load adatai maradnak az irányadók. |
| Anyagkezelő/keresés | DEMO termék, három ármegjelenítés; termékkódra keresés működött | Nem mértünk szerveroldali query/időt. |
| Mentett kalkulációk, árajánlatok, munkanaplók | F9.64-ben nem nyitottam meg; a DB queryterveket sem instrumentáltam | **Nem ellenőrzött** runtime útvonalak. |

A Console panel külön hibaszámlálását nem rögzítettem, így ez az audit nem bizonyít console-mentességet. A korábbi F9.63.4 cold-cache build/network adatokat ott kell használni, ahol összehasonlítás kell; a munkamenetben gyűjtött route számok nem cserélhetők fel azokkal.

## Prioritási terv

| Prioritás | Megállapítás / minimális következő lépés | Várható haszon / bizonyosság | Ráfordítás / regressziós és adatbiztonsági kockázat |
|---|---|---|---|
| **P0** | Nincs igazolt kritikus blokkoló. | — | — |
| **P1** | Nincs production adatból vagy tartós terhelésből igazolt, nagy hatású bottleneck. | Nem indokolt. | — |
| **P2** | F64-01: kalkulátor profil-only read; F64-02: közös takeoff kategóriaload; F64-03: ID-szűrt részlet/hivatkozott variáns feloldás. | Felesleges ár-history/kapcsolat adat és DB kör eltávolítása; a kódminta biztos, runtime haszon közepes/nyitott. | Közepes read-model + regresszió; org/RLS, ársnapshot, provenance és kalkulátor-paritás kockázatot külön tesztelni. |
| **P3** | F64-04 manager közös lookup; F64-05 auth query timing; F64-06 CSS/GPU trace és kompozitor; F64-07 SVG trace; termék updated_at index csak reális terv esetén. | Kis vagy bizonyítandó. | Alacsony–közepes; cache/index/style beavatkozás adatbiztonsági vagy UX regressziót okozhat, ezért előbb mérés. |

**Javasolt F9.65:** egyetlen célzott, read-model szűkítési mérföldkő az F64-01 + F64-02-re. Előtte instrumentálni PostgREST hívás/átvitel-időt ugyanazon lokális, valósághű adatmérettel; a kódváltoztatás után azonos RLS alatt megismételni. Ne fogja össze auth cache-t, indexet, CSS-átalakítást és takeoff történeti snapshot javítást ugyanabba a kiadásba. F64-03 külön, mert a snapshot-visszaesési viselkedés fontosabb, mint a kalkulátor loader.

Minden későbbi adatolvasás tartsa meg a szervezetazonosítót, authenticated RLS-t és meglévő jogosultság-ellenőrzést. Current catalog adat nem írhatja felül a takeoff/quotation immutable snapshotot. A számítási képlet, pénzügyi árverzió-választás, concurrency és mutációs workflow változatlan maradjon.

## Ellenőrzött és nem ellenőrzött

- **Végrehajtott:** izolált `npm run build` PASS; helyi authenticated DEMO böngészős munkafolyamatok; 3 read-only RLS query plan; CSS build artifact méret; forrás- és indexreview; a munkafán a kezdeti módosítások megmaradtak.
- **Nem futtatott:** Vitest/lint/typecheck — ez audit, nem forrásváltoztatás; production terhelési teszt; quotations/worklog runtime; memory trend; mobil/GPU/light/reduced-motion mátrix; server query profiler.
- **Nem blokkolt:** lokális DB és böngésző rendelkezésre állt. A következtetések korlátozása az adatméret és profiler hiánya, nem hozzáférési hiba.
- **Nincs változtatás:** sem app/CSS, sem migráció/policy/index, sem helyi tartós adat, sem hosted production adat; nincs csomagtelepítés, commit vagy deploy.

## Felhasznált útmutatók és források

- Skills: `ponytail` (minimális audit scope), `supabase`, `supabase-postgres-best-practices`, `build-web-apps:react-best-practices`, `build-web-apps:frontend-testing-debugging`.
- Eszközök: helyi shell/Node és Next production build, Brave + DevTools Network/Performance, helyi Postgres read-only `EXPLAIN`; nincs új plugin vagy függőség.
- Fő források: `src/features/materials/material-data.ts`, `src/features/material-takeoffs/takeoff-data.ts`, `src/app/kalkulatorok/page.tsx`, `src/domain/calculations/roof-material-catalog.ts`, `src/features/auth/auth.server.ts`, `src/features/materials/material-manager-page.tsx`, `src/app/globals.css`, `supabase/migrations/20261012040000_material_catalog.sql`, `20261015070000_field_surveys.sql`, `20261017010000_material_manager_categories.sql`, `20261012000000_foundation.sql`, `docs/OPTIMIZATION_AUDIT_F9.62.md`, `docs/PERFORMANCE_VALIDATION_F9.63.4.md`.

**Javasolt Conventional Commit:** `docs: F9.64 record backend and rendering performance audit`
