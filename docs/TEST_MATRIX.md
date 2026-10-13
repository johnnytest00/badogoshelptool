# Tesztmátrix

## F9.1.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Annotációs geometria | Fókuszáltan sikeres | 3 teszt: kompakt offset, aligned normál, szögív és címkepozíció |
| F5/F6 geometriai invariáns | Sikeres | A rajzmodell továbbra is az F5 kimenetből képez; számítási modul nem módosult |
| Viewport és rétegek | Fókuszáltan sikeres | Fit/reset a látható modellel számol; existing pan/pinch kód változatlan |
| Teljes ellenőrzés | Sikeres | 22 Vitest-fájl / 82 teszt, typecheck, lint, `git diff --check`, build és egy browser smoke PASS |

## F8.3.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Lifecycle state machine | Sikeres | 4 engedélyezett előrelépés; reopening és terminális átmenetek Vitestben elutasítva. |
| Status history schema/RLS | Sikeres | Append-only tábla, szervezeti read policy, közvetlen authenticated INSERT tiltás. |
| Atomic transition RPC | Sikeres | SECURITY INVOKER, FOR UPDATE, expected version, finalized revision konzisztencia. |
| Finalization regresszió | Sikeres | F8.3.1 finalize RPC és pénzügyi state constraint megmaradt. |
| Legacy compatibility | Sikeres | Korábbi finalized rekord státusztörténet nélkül olvasható; visszamenőleges esemény nem készült. |
| UI status filter/actions | Sikeres | Öt magyar státusz, állapotfüggő gombok és terminális állapotban nincs átmeneti akció. |
| Browser lifecycle smoke | Sikeres | Finalized → sent → accepted, timeline, 27 498,50 HUF változatlan, PDF megnyílt. |
| pgTAP | Sikeres | 003_quotation_finalization.sql + 004_quotation_lifecycle.sql: 19/19 PASS. |
| Vitest | Sikeres | 21 fájl / 79 teszt PASS. |
| Typecheck, lint, build | Sikeres | Mindhárom végső ellenőrzés PASS. |

## F8.3.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Finalization migration | Sikeres | 20261013030000 quotation_finalization + RPC-korrekciós migration; local DB push, reset nélkül. |
| Finalization pgTAP | Sikeres | 8/8 PASS: enum, mezők, state constraint, guard trigger, RPC és authenticated EXECUTE. |
| Quotation list/search/filter | Sikeres | Projektoldali lista, referencia/ügyfél keresés és draft/finalized filter browserben látható. |
| Review/finalize/lock | Sikeres | Review panel ügyféllel, v2-vel, 2 tétellel és 27 498,50 HUF nettó összeggel; finalize után locked állapot. |
| Immutable PDF | Sikeres | A véglegesített PDF preview külön tabban megnyílt; route a finalized_revision_id-t használja. |
| Duplicate finalized quotation | Sikeres | Új ID, v1 draft és szerkesztő nyílt meg; az eredeti v2 finalized, 27 498,50 HUF maradt. |
| Vitest | Sikeres | 20 fájl / 77 teszt PASS. |
| Typecheck, lint, build | Sikeres | npm run typecheck, npm run lint, npm run build PASS. |

## F8.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Pénz referenciaesetek | Sikeres | 4/4 Vitest; 18 750,00 + 7 498,50 = 26 248,50 HUF. |
| Typecheck | Sikeres | `npm run typecheck`. |
| Lint | Sikeres | `npm run lint`. |
| Supabase F8.1 migration / pgTAP | Sikeres | Lokális fejlesztési DB reset nélkül; külön shadow replay; 180/180 PASS. |
| Browser F8.1 workflow | Sikeres | Local DEMO user → projekt → ügyfél → katalógus-anyag + munkadíj → 26 248,50 HUF → mentés/reload. A sorváltozás idempotenciahibáját javítás után új revízióval ellenőriztem. |
| F8.1 domain/regresszió | Sikeres | 20 Vitest fájl / 77 teszt PASS; a módosítás után typecheck, lint és célzott pénzteszt PASS. |

## F7.3.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Katalógusmapping és provenance | Sikeres | Explicit mezők, kézi prioritás, hiányzó hasznos szélesség és releváns specs-változás Vitestben; névlegesből nincs implicit hasznos szélesség. |
| Verziózott layout mentés | Sikeres | SECURITY INVOKER RPC; immutable V1/V2/V3 history, current pointer, két dependency és material variant FK. |
| Idempotens és konkurens mentés | Sikeres | Azonos input nem készít új revíziót; stale expected revision `40001` hibával elutasítva. |
| Szervezeti/projekt izoláció | Sikeres | Cross-org variáns, cross-project forrás és nem-tag mentés pgTAP-ban elutasítva; RLS aktív. |
| Stale és történeti snapshot | Sikeres | Tetőrevízió-váltás stale státuszt ad; V1 output V2 után változatlan, történeti anyag és geometria visszanyitható. Ár nincs a geometriai stale összevetésben. |
| Anyagkimutatás-átadás | Sikeres | `square_meter`: hiteles `combinedRoofM2` + explicit ráhagyás, atomikus draft+item; nincs auto-approval. `piece` automatikus konverzió elutasítva. |
| Approved immutabilitás | Sikeres | Korábbi approved kimutatás változatlan; meglévő trigger-regresszió PASS. |
| Migráció és replay | Sikeres | Nem linkelt local DB-re reset nélkül alkalmazva; teljes lánc disposable shadow DB-n, `No schema changes found`. |
| pgTAP | Sikeres | **172/172 PASS**, a korábbi 146 ellenőrzés megőrzésével. |
| Vitest | Sikeres | **19 fájl / 73 teszt PASS**. |
| Typecheck, lint, build | Sikeres | TypeScript, ESLint és Next.js webpack production build hibamentes. |
| Fókuszált browser-flow | Sikeres | Valós local projekt/tető → DEMO variáns → V1/V2/history → roof stale → V3 → square-meter draft, jóváhagyás nélkül. |
| SVG/touch regresszió | Változatlan | Pointer/pan/pinch/fit/reset kód és a fizikailag iPhone-on ellenőrzött instrukció változatlan. |
| Távoli Supabase | Nem használt | Nincs link, login, remote migration vagy hosted adatváltozás. |

## F7.3.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Calculator Registry | Sikeres | `covering.metal-sheets.layout` 1.0.0 regisztrálva és registry-n keresztül futtatva. |
| Referencia A | Sikeres | 12 500 / 1000 mm: 13 sáv/tetősík, 26 összesen, 12 teljes + 500 mm részleges intervallum. |
| Referencia B | Sikeres | 12 500 / 1250 mm: 10 sáv/tetősík, 20 összesen, nincs részleges intervallum. |
| Referencia C | Sikeres | 12 500 / 800 mm: 16 sáv/tetősík, 32 összesen, 500 mm részleges intervallum. |
| Bal/jobb indulás | Sikeres | A részleges sáv fizikai X-helye oldalt vált, a fedett hossz és darabszám változatlan. |
| Lemezhossz és ráhagyás | Sikeres | A 5625 mm geometriai hossz külön marad; a kézi ráhagyás csak az ideiglenes hosszt növeli. |
| Gyártási hosszkorlát | Sikeres | 5625 mm geometriai / 5725 mm ideiglenes hossz és 5000 mm maximum esetén `ABOVE_MAXIMUM_LENGTH`; nincs automatikus darabolás. |
| Tizedes milliméter | Sikeres | Szögből származó 6562,5 mm hossz és kézi tizedes paraméter elfogadott. |
| Renderbiztonsági határ | Sikeres | 400 sáv/tetősík felett strukturált hiba, csonkolás nélkül. |
| SVG geometriai leképezés | Sikeres | Mindkét tetősík, 26 sáv, 2 részleges sáv és kalkulált X-koordináták a felülnézeti rajzmodellben. |
| `Lemezkiosztás` réteg | Sikeres | Alapból kikapcsolt, külön checkboxszal kapcsolható; más nézetekben nem állít elő félrevezető sávgeometriát. |
| Touch viselkedés | Változatlan | F7.2.4 pointer/pan/pinch kód nem módosult; az új magyar instrukció böngészőben megjelent. |
| Fókuszált browser-flow | Sikeres | Mentett helyi nyeregtető → 1000 mm → 13/26 → réteg bekapcsolás → 26 SVG-sáv/2 részleges → jobb indulásra áthelyezés. |
| 320 px mobil smoke | Sikeres | Lemezkiosztási panel látható, 26 sáv renderelt, `scrollWidth === clientWidth`; fizikai mobilteszt nem történt. |
| Vitest | Sikeres | 18 fájl / 69 teszt. |
| Typecheck, lint, build | Sikeres | TypeScript, ESLint és Next.js 16.4.0 webpack production build hibamentes. |
| Adatbázis | Nem érintett | Nincs migráció, perzisztencia, Supabase- vagy RLS-változás; DB-teszt nem futott. |

## F7.2.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Mobil kontraszt, világos/sötét téma | Sikeres | Szemantikus foreground/muted/brand tokenekkel ellenőrizve a projektoldal, kártya, státusz, űrlap és kereső tényleges hátterein. |
| Back navigation | Sikeres | Új `BackNavigation` komponens, determinisztikus szülőútvonal, ikon, border, fókusz és mobil touch target. |
| Projektkereső elrendezés | Sikeres | Az ikon és input egy sorban maradt 320, 375, 390, 430, 768 és 1440 px méreten; nincs overflow. |
| Projektoldal és projektkártyák | Sikeres | Olvasható hierarchia, hosszú szöveghez törés, mobil dokumentum-overflow nélkül. |
| SVG viewport és toolbar | Sikeres | Négy nézet, zoom in/out, Fit, Reset és zoom százalék böngészőben ellenőrizve; Fit és Reset eltérő művelet. |
| SVG rétegek | Sikeres | Mind a hat checkbox elérhető; rétegkapcsolás böngészőben ellenőrizve. |
| SVG gesture matematika | Sikeres | Pan/pinch, zoom clamp, fókuszpont-megtartás, pointer cancel/release és fit bounds Vitestben ellenőrizve. Fizikai multi-touch nem szimulált. |
| Explicit responsive viewport QA | Sikeres | 320×700, 375×812, 390×844, 430×932, 768×1024, 1440×900; a vizsgált oldalaknál `scrollWidth === clientWidth`. |
| 200% szöveg / 150% UI skála | Sikeres | Helyi böngészőben elvégzett skálázási ellenőrzés; input és projektlista nem tört vízszintesen. |
| Vitest | Sikeres | 17 fájl / 58 teszt. |
| Typecheck, lint, build | Sikeres | Mindhárom parancs hibamentesen lefutott. |
| Fizikai iPhone multi-touch | Korlátozott | Ebben a környezetben nincs valódi eszközös kétujjas végrehajtás; kézi készülékteszt szükséges. |

## F7.2.4 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Pan indulása | Sikeres | A pan már az első pointer-deltára számolható, nincs külön drag threshold. |
| Pointer delta / 1:1 követés | Sikeres | Zoom-kompenzált pan és preserveAspectRatio-aware client→viewBox leképezés célzott Vitestben ellenőrizve. |
| Kezdőpont és ugrásmentesség | Sikeres | Letterboxolt SVG középpontja stabil; a kezdőpont nem tolja el a rajzot. |
| Pointer cancel/release | Sikeres | A megmaradó pointer újraalapozódik, üres pointerkészletnél a gesztus törlődik. |
| Pinch → pan átmenet | Sikeres | A pinch utáni egyujjas pan a tényleges aktuális pan/zoom állapotból indul. |
| Célzott Vitest | Sikeres | `drawing-viewport.test.ts`: 1 fájl / 7 teszt. |
| Typecheck | Sikeres | `npm run typecheck` hibamentes. |
| Lint | Sikeres | `npm run lint` hibamentes. |
| Fizikai iPhone touch pan | Felhasználó által ellenőrzött | A felhasználó F7.3.1 előtt fizikai iPhone-on sikeresen visszaigazolta az F7.2.4 pan működését. |

## F7.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F7.2 lokális migrációk | Sikeres | Takeoff séma, trigger-hardening és approval-policy migrációk helyi `supabase db push --local` után alkalmazva; remote kapcsolat nem történt. |
| Migrációs állapot | Sikeres | Mind a 9 lokális migráció egyező helyi állapotban van; `supabase migration list --local` local/remote oszlopa azonos. A konfigurációban deprecated `[inbucket]` nincs, `[local_smtp]` van. |
| F7.2.2 lineáris DEMO variáns | Sikeres | Helyi, egyértelmű DEMO `linear_meter` variáns, gyártó/specifikáció/ár nélkül. 12,5 m gerinchossz → 12,5 `linear_meter`; mentés, reload és DB mennyiség ellenőrizve. |
| F7.2.2 inkompatibilis egység | Sikeres | A `square_meter` variáns `linear` módszerrel szerveroldali, látható hibával elutasítva. |
| F7.2.2 approval concurrency | Sikeres | Két külön PostgreSQL-kapcsolat ugyanazon lokális DEMO draftra indított approvalt; egy approved eredmény, egy verzió/státusz elutasítás, nincs duplikált approval vagy részleges item-mentés. |
| F7.2.2 responsive QA | Sikeres | Dashboard, projektoldal, kalkulátor/SVG és anyagkimutatás 320/375/390/430 px explicit viewporton. A kezdeti dashboard és takeoff overflow javítva; újrateszt mindegyik méreten `scrollWidth === clientWidth`, offscreen vezérlő nélkül. |
| Lokális táblák | Sikeres | A teljes lokális séma ellenőrzött: `organizations`, `projects`, `calculations`, `material_products`, `material_variants`, `material_takeoffs`, `material_takeoff_items`. |
| Takeoff táblák | Sikeres | `material_takeoffs` és `material_takeoff_items`, szervezeti összetett FK-kal, draft/approved állapottal és snapshotokkal. |
| RLS és approval | Sikeres | Szervezeti olvasás/írás, admin-owner approval, draft-only item írás és approved immutabilitás pgTAP-ban ellenőrizve. |
| Forrásrevízió | Sikeres | Csak mentett, verified `roof.gable` output; implementáció- és input-séma-verzió ellenőrzött. |
| Domain referenciaesetek | Sikeres | 17 Vitest fájl / 56 teszt; 140,625 m² → 154,6875 m², 12,5 m gerinc, 25 m eresz, manual/piece tiltás. |
| pgTAP | Sikeres | 146/146 PASS helyi adatbázison. |
| TypeScript DB-típusok | Sikeres | `npm run db:types` helyi sémából lefutott. |
| `npm run typecheck` | Sikeres | Hibamentes. |
| `npm run lint` | Sikeres | Hibamentes. |
| `npm run build` | Sikeres | Next.js webpack production build; az új project-linked route elkészült. |
| Migration replay külön eldobható DB-n | Sikeres | A név szerint azonosított `f72_replay_20261012` lokális DB-n mind a 9 migráció lefutott; utána a disposable DB törölve lett, a fő lokális DB érintetlen maradt. |
| Böngészős F7.2 workflow | Sikeres | F7.2.1 területi/approval/stale/logout flow és F7.2.2 lineáris 12,5 m mentés/reload flow helyi DEMO adatokkal. |
| F7.2.1 böngészős create/draft | Sikeres | Helyi DEMO fiókkal meglévő projekt, rev. 2 forrás és valós draft létrehozás. |
| F7.2.1 quantity/persistence | Sikeres | 156,25 m² aktuális local outputból 10% ráhagyással 171,875 m²; manuális 2,5 m²; reload után mindkettő látszik. |
| F7.2.1 incompatible unit | Sikeres | Meglévő `square_meter` variáns lineáris módszerrel szerveroldalon elutasítva, látható magyar hibaüzenettel. `linear_meter` meglévő variáns nem volt. |
| F7.2.1 approval/immutability | Sikeres | Owner approval valódi UI-n; approved állapot reload után megmarad, szerkesztőform eltűnik, item/history snapshot read-only DB ellenőrzéssel megmarad. |
| F7.2.1 stale/new draft | Sikeres | Rev. 3 mentett módosítás után korábbi approved takeoff „Elavult számítási alap”, új rev. 3 draft létrehozható. |
| F7.2.1 logout protection | Sikeres | Logout után a takeoff URL login oldalra irányít `returnTo` paraméterrel, adat nem látható. |
| Concurrency DEMO-adat takarítás | Korlátozott | A már approved concurrency DEMO rekordot az immutable trigger szándékosan nem engedte törölni; az azonosított rekord lokális maradt, távoli adat nem érintett. |
| `npm audit` | Nem verifikálható | `ENOTFOUND registry.npmjs.org`; audit eredmény nem állt rendelkezésre. |

## F7.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F7.1 migráció | Sikeres | `20261012040000_material_catalog.sql` és `20261012040100_material_price_immutability.sql` helyi `supabase db push --local` után alkalmazva, reset nélkül. |
| Katalógustáblák | Sikeres | Gyártók, termékek, variánsok, árak létrejöttek. |
| RLS és szervezeti FK | Sikeres | 4/4 új tábla RLS-es; összetett gyártó/termék/variáns/ár FK-k és outsider tesztek PASS. |
| Árhistorika | Sikeres | 2 árverzió megmarad, latest ordering determinisztikus, update/delete trigger tilt. |
| Domain validáció | Sikeres | Kategória, egység, URL, provenance, nemnegatív méretek/ár és JSON objektum ellenőrzése. |
| pgTAP | Sikeres | 127/127 PASS helyi adatbázison. |
| TypeScript DB-típusok | Sikeres | `npm run db:types` lokális sémából futtatva. |
| Vitest | Sikeres | 16 fájl / 53 teszt. |
| `npm run typecheck` | Sikeres | Hibamentes. |
| `npm run lint` | Sikeres | Hibamentes. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build. |
| Helyi admin login | Sikeres | `admin1@testadmin.com` lokális Auth user, DEMO owner tagság, böngészőben belépés igazolva. |
| Anyagkatalógus browser workflow | Sikeres | Gyártó → termék → variáns → két árverzió → reload/detail → keresés → archive/restore. |
| Távoli Supabase | Nem használt | Link, login, push és remote adatbázis-módosítás nem történt. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba maradt fenn. |

## F6.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Rajzmodell referencia-koordináták | Sikeres | A 8000×12000×3000 mm F5 eset: X -250…12250, Y -4500…4500; eresz Z=-375, gerinc Z=3000. |
| Nézetek | Sikeres | Felülnézet, Oromoldal, Keresztmetszet és Oldalnézet ugyanabból a `GableRoofOutput`-ból. |
| Méret- és szögannotációk | Sikeres | Forrásuk F5 output; magyar `m`/`mm` formázás, hosszanti/függőleges/aligned méret. |
| Rétegek | Sikeres | Hat réteg kapcsolható, csak megjelenítési állapotot módosít. |
| Rajzmodell és viewport unit tesztek | Sikeres | 2026-10-12; 15 Vitest fájl / 50 teszt összesen. |
| `npm run typecheck` | Sikeres | F6.1 módosításokkal hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build. |
| Valós F5 böngészős workflow | Sikeres | Codex in-app browserben: mentett helyi tetőmodell, négy nézet, layer toggle, zoom/reset, élő input-frissülés és nem mentett előnézet. |
| Browser runner pre-flight | Korlátozott | Playwright/Puppeteer nincs a projektben; helyi Playwright Chromium bináris van, de runner nincs. Új függőség telepítése hálózati korlát és arányosság miatt nem történt. |
| Aktuális dokumentum-overflow smoke | Sikeres | Browser DOM-mérés: `clientWidth=1002`, `scrollWidth=1002`; a dedikált mobil viewportok nem voltak beállíthatók. |
| 320×700, 375×812, 390×844, 430×932, 768×1024, 1440×900 | Nem verifikált | A jelenlegi browser connectorban nincs viewport override; nem jelölöm PASS-ként. |
| RLS/Supabase regresszió | Nincs változás | F6 nem módosított migrációt vagy adat-hozzáférési réteget; a korábbi helyi pgTAP baseline változatlan. |
| Keskeny viewportok | Korlátozott | A vezérlő nem támogatott dedikált 320/375/390/430 px emulációt; CSS és accessibility tree vizsgálat történt. |
| Pinch gesztus | Kód + pure unit teszt | Kétpointeres állapot, fókuszpont-megtartás, clamp és cancel/release implementálva; browser multi-touch emuláció és fizikai eszköz nem állt rendelkezésre. |
| Anime.js | Nem alkalmazható | Nincs új animációs függőség; statikus rajz és reduced-motion CSS maradt. |

## F1.1 ellenőrzések

| Parancs | Állapot | Megjegyzés |
| --- | --- | --- |
| `npm audit` (előtte) | Sikeres audit-lekérdezés | 2026-10-12; 13 sérülékenység: 4 moderate, 7 high, 2 critical. |
| `npm install` frissítés | Sikeres | Next 16.4.0, Vitest 5.0.3, Vite 8.3.4, TypeScript ESLint flat config. |
| `npm audit` (utána) | Sikeres | 2026-10-12; 0 info/low/moderate/high/critical sérülékenység. |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 2 fájl / 4 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build, `/` statikusan generálva. |
| Böngészős smoke | Sikeres | 2026-10-12; kezdőoldal betöltött; Sötét mód kiválasztása, `Váltás: Világos` felirat, reload utáni perzisztencia és `Rendszer szerint` visszaállítás ellenőrizve. |

Megjegyzés: a Next 16 alapértelmezett Turbopack buildje portkötési hibával elhasalt a futtatókörnyezetben; a `npm run build` script webpack módot használ, amely sikeresen lefutott.

## F1.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Dashboard unit tesztek | Sikeres | 2026-10-12; 1 dashboard tesztfájlban 3 teszt, összesen 7 projekt-teszt sikeres. |
| Mobil-first grid szabály | Ellenőrizve | Alapértelmezett 1 oszlop, 640 px felett legfeljebb 2 oszlop, 960 px felett 3 oszlop; nincs fix kártyaszélesség. |
| Tab váltás | Sikeres | Böngészőben `Funkciók` ↔ `Aktuális munkák` váltás oldalújratöltés nélkül. |
| Billentyűzetes tab navigáció | Sikeres | Böngészőben ArrowLeft használatával visszaváltás ellenőrizve; utility teszteli mindkét irányt. |
| DEMO jelölés | Sikeres | Böngészőben a DEMO banner és projektcímkék láthatók. |
| Téma integráció | Sikeres | Világos/sötét mód, következő módot jelző címke és Beállítások → Rendszer szerint visszaállítás ellenőrizve. |
| Reduced motion | Ellenőrizve | `prefers-reduced-motion` CSS szabály tiltja a dashboard belépőanimációját és a hosszú átmeneteket. |
| Vízszintes túlcsordulás | Kód szerint ellenőrizve | Grid `minmax(0, 1fr)`, `overflow-wrap:anywhere`, nincs fix kártyaszélesség; külön mobil viewport-eszköz nem állt rendelkezésre. |

## F1.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Skálázási unit tesztek | Sikeres | 2026-10-12; összesen 9 teszt: alapértékek, független frissítés, clamp, hibás adat, reset, bubble állapot. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 4 tesztfájl / 9 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; webpack build, `/demo/meretezes` statikusan generálva. |
| Skálázási tartományok | Sikeres | Böngészőben szöveg 200%, UI 150%, rajz 200%; felső határon a növelő gomb letilt. |
| Perzisztencia és reset | Sikeres | Böngészőben reload után megmaradtak az értékek, reset 100%-ra állított. |
| Bubble nyitás/zárás | Sikeres | Böngészőben fix launcher, nyitás, aria-expanded, close gomb, click-outside és Escape logika. |
| Dashboard settings integráció | Sikeres | Beállítások panel ugyanazt a globális ScalingProvider állapotot használja. |
| DEMO SVG | Sikeres | Böngészőben látható; `viewBox` változatlan, 12,0 m-es felirat megmarad. |
| Light/dark és hydration | Sikeres | Téma integráció megmaradt, böngészőben nincs új hydration-warning a scale inicializálás után. |
| Mobil viewport vizuális ellenőrzés | Korlátozott | A böngészővezérlőben nincs viewport override; mobil reflow CSS alapján és accessibility tree-ben ellenőrzött, külön 320–430 px screenshot nem készült. |

## F2.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Repo/remote/git preflight | Sikeres | `main` ág és a konfigurált remote ellenőrizve; meglévő módosítások megőrizve. |
| Supabase CLI | Sikeres | 2.120.0 telepítve és működik; távoli login/link nem történt. |
| Docker runtime | Sikeres | Docker 29.8.0 daemon elérhető; a lokális Supabase konténerek healthy állapotban futnak. |
| SMTP konfiguráció | Sikeres | Deprecated `[inbucket]` helyett `[local_smtp]`; restart után nincs deprecation warning. |
| SQL/migráció statikus áttekintés | Sikeres | Öt tábla, FK-k, összetett tenant-kulcs, indexek, timestamp/version és RLS/grant szabályok elkészültek. |
| Helyi séma read-only ellenőrzés | Sikeres | 5 tábla, 5 RLS, 13 policy, DEMO seed rekordok és kritikus constraint-ek igazolva. |
| pgTAP adatbázisteszt | Sikeres | 2026-10-12; 1 fájl / 29 teszt, `Result: PASS`. |
| Migration replay / clean reset | Sikeres | `supabase db reset --local` kétszer sikeresen lefutott; remote célpont nem volt használva. |
| TypeScript DB-típusgenerálás | Sikeres | `supabase gen types typescript --local`; 258 soros generált fájl készült. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 4 fájl / 9 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js webpack production build, `/` és `/demo/meretezes` generálva. |
| `npm audit --audit-level=high` | Nem verifikálható | Az npm registry DNS-feloldása sikertelen volt; audit eredmény nem állt rendelkezésre. |

## F2.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Helyi Auth bootstrap | Sikeres | `npm run db:local-auth`; valódi lokális GoTrue-felhasználó és DEMO owner tagság létrejött. A jelszó csak futtatási input volt. |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 5 fájl / 12 teszt sikeres, köztük safe return path tesztek. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build, `/`, `/bejelentkezes` és `/demo/meretezes` route-ok elkészültek. |
| `supabase test db` | Sikeres | 2026-10-12; 29/29 pgTAP teszt PASS helyi adatbázison. |
| Hibás login | Sikeres | Böngészőben általános, nem érzékeny hibaüzenet jelenik meg. |
| Sikeres login és SSR session | Sikeres | Helyi böngészőben dashboard, user/org adatok és reload utáni session ellenőrizve. |
| Védett DEMO útvonal | Sikeres | `/demo/meretezes` csak hitelesített, szervezethez tartozó helyi felhasználóval érhető el. |
| Logout | Sikeres | Böngészőben a `Kilépés` visszairányít `/bejelentkezes` oldalra. |
| RLS regresszió | Sikeres | Az F2.1 29 pgTAP tesztje változatlanul PASS; F2.2 nem módosított migrációt. |
| TypeScript DB-típusok | Sikeres | A lokális sémából generált `database.types.ts` felhasználva az SSR/browser klienseknél. |
| `npm audit --audit-level=moderate` | Nem verifikálható | npm registry DNS-hiba; az install korábbi kimenete 0 audit findingot jelzett, de friss audit-lekérdezés nem volt elérhető. |

## F3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F3 migráció | Sikeres | `20261012020000_project_management.sql`; meglévő migrációk módosítása nélkül alkalmazható. |
| Lokális migration replay | Sikeres | `supabase db reset --local`; F2.1, F2.3 és F3 migráció + seed sikeresen lefutott. |
| Projekt CRUD | Sikeres | Lokális pgTAP-ban létrehozás, módosítás és jogosultsági ellenőrzés; böngészőben létrehozás/szerkesztés sikeres. |
| Ügyfél CRUD | Sikeres | Lokális pgTAP-ban létrehozás/módosítás; böngészőben gyors létrehozás, lista és projekt-hozzárendelés sikeres. |
| Projekt keresés/szűrés/rendezés | Sikeres | Szerveroldali bounded query, névkeresés, status, munkatípus, archived filter és updated_at rendezés. |
| Projekt duplikálás | Sikeres | Csak alapadatok másolódnak, új ID és `draft` státusz készül; történelmi revíziók nem duplikálódnak. |
| Archiválás/visszaállítás | Sikeres | `previous_status` adatbázisban megőrzött; böngészőben inline megerősítés, archív lista és restore ellenőrizve. |
| Végleges törlés tiltása | Sikeres | Authenticated `DELETE` grant projects/clients táblákon visszavonva; pgTAP ellenőrizve. |
| Optimistic concurrency | Sikeres | `version` feltételes update; stale verzió nem egyezik és konfliktusüzenet készül. Több-session terheléses teszt nem futott. |
| Organization isolation | Sikeres | Minden query/action tagságot és organization scope-ot ellenőriz; meglévő RLS tesztek megmaradtak. |
| Dashboard integráció | Sikeres | Funkciók/Aktuális munkák tabok megmaradtak; Aktuális munkák valós aktív projekteket mutat. DEMO projektet nem mutat saját munkaként. |
| Project detail future modules | Sikeres | Tetőmodellek, kalkulációk, anyagkimutatás, ajánlatok/dokumentumok csak „Hamarosan” állapotban jelennek meg. |
| `npm run typecheck` | Sikeres | `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run test` | Sikeres | 8 fájl / 20 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build; minden F3 route dinamikusan elkészült. |
| `supabase test db` | Sikeres | **74/74 pgTAP PASS**, az F2.1 és F2.3 assertionök megőrzésével. |
| Böngészős workflow | Sikeres | Login → dashboard → project list → quick client → project create → detail → edit → duplicate → archive → archived filter → restore → dashboard real projects. |
| Mobil viewport | Korlátozott | Responsive CSS és accessibility tree ellenőrzött; külön 320/375/390/430 px emuláció nem állt rendelkezésre. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba; `npm audit fix --force` nem futott. |

## F2.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Új migráció alkalmazása | Sikeres | `20261012010000_versioned_calculation_architecture.sql`; lokális reset után a foundation és F2.3 migráció is lefutott. |
| Migration replay | Sikeres | Két egymást követő sikeres `supabase db reset --local` + seed futás, kizárólag lokális adatbázison. |
| Új táblák | Sikeres | 5/5 tábla létrejött: roof models, model revisions, calculations, calculation revisions, dependencies. |
| RLS és policy-k | Sikeres | Mind az 5 új tábla RLS-es; read-only ellenőrzés: összesen 14 policy. |
| DEMO seed lánc | Sikeres | Minden új F2.3 táblában 1 reprezentatív, DEMO-jelölt rekord; dependency a roof revisionből a calculation revisionbe mutat. |
| pgTAP | Sikeres | 2026-10-12; 60/60 PASS, az eredeti 29 assertion megőrzésével. |
| Constraint és ownership tesztek | Sikeres | FK, összetett szervezet/projekt integritás, invalid reference, duplicate revision és current pointer tesztek. |
| Revízió-konkurencia | Részben bizonyított | A PostgreSQL egyedi constraint párhuzamos azonos revíziószámot elutasít; valódi több-session terheléses concurrency teszt ebben a mérföldkőben nem futott. |
| Immutable revíziók | Sikeres | Roof- és calculation-revision update/delete trigger tesztek PASS. |
| Dependency DAG | Sikeres | Self-dependency, cross-project dependency és cycle rejection tesztek PASS. |
| Membership revocation | Sikeres | Tagság visszavonása után a korábbi F2.1 és új F2.3 üzleti adatok olvasása eltűnik. |
| TypeScript DB-típusgenerálás | Sikeres | `supabase gen types typescript --local`; 394 soros generált fájl, mind az 5 új tábla jelen van. |
| Domain contract unit tesztek | Sikeres | Zod provenance, input/output snapshot és invalid provenance tesztek. |
| `npm run typecheck` | Sikeres | `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run test` | Sikeres | 6 fájl / 15 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build sikeres; UI-regresszió nélkül. |
| `npm audit` | Nem verifikálható | Korábbiakhoz hasonlóan npm registry DNS-hiba miatt nem adott auditválaszt. |

## F4 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Mértékegység- és konverziós tesztek | Sikeres | 2026-10-12; mm/cm/m, mm²/m², mm³/m³, fok/radián, nem véges és unsafe integer bemenetek. |
| Matematikai referenciaesetek | Sikeres | 2026-10-12; 3–4–5 háromszög, 2000 × 3000 mm téglalap = 6 000 000 mm², 90° = π/2. |
| Geometriai primitívek | Sikeres | Távolság, vektor, normalizálás, szakasz, vetítés, felezőpont, sokszög-terület/kerület. |
| Hibás geometria elutasítása | Sikeres | Nulla szakasz/vektor, kevés pont, degenerált és önmetsző sokszög, invalid koordináta. |
| Calculator Registry | Sikeres | Explicit registry; duplicate és unknown calculator ID elutasítva. |
| Calculation engine integráció | Sikeres | Teszt-only matematikai DEMO fixture: Zod input → számítás → output-validáció → verziózott eredmény. |
| Strukturált hibák | Sikeres | `VALIDATION_ERROR`, `MISSING_REQUIRED_INPUT`, `INVALID_GEOMETRY`, `NUMERIC_OVERFLOW`, `UNSUPPORTED_OPERATION` szerződésben kezelve. |
| Domain tesztek | Sikeres | 2026-10-12; 12 fájl / 38 teszt sikeres. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build hibamentesen elkészült. |
| Adatbázis-regresszió | Sikeres | F4 nem módosított sémát; a meglévő helyi 74/74 pgTAP baseline újrafuttatása 2026-10-12-én PASS. |
| `npm audit` | Nem verifikálható | A korábbi npm registry DNS-hiba fenntartva; sikeres audit nem állítható. |

## F5 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Checkpoint A: gable referenciaeset | Sikeres | 8000×12000 mm, 3000 mm emelkedés, 500/250/250 mm túlnyúlás; 36,86989765°, 5625 mm, 140,625 m², 112,5 m². |
| Checkpoint A: height/angle ekvivalencia | Sikeres | Azonos fizikai eredmény dokumentált tolerancián belül. |
| Checkpoint A: invalid/deterministic/symmetry tesztek | Sikeres | 5 gable teszt, registry-integrációval és független várt értékekkel. |
| F5 DB migration | Sikeres | `20261012030000_gable_calculation_persistence.sql` csak lokális DB-re pusholva; reset nem történt. |
| Atomic persistence | Sikeres | Egy RPC-tranzakció: roof revision + calculation revision + dependency. |
| Revision history/stale write | Sikeres | Lokális pgTAP-ban második revízió és stale `40001` elutasítás. |
| RLS/authorization regression | Sikeres | **83/83 pgTAP PASS**; meglévő tenant/RLS/immutable ellenőrzések és a nem-tagos F5 mentés-elutasítás PASS. |
| TypeScript DB-típusgenerálás | Sikeres | Lokális sémából újragenerálva; F5 RPC szerepel a `database.types.ts` Functions részében. |
| Project-linked UI | Sikeres | Új tetőmodell, szerkesztés, projektkártya és revision result. |
| Élő számítás és input modes | Sikeres | Browserben height/angle váltás, magyar vessző, élő eredmény és inline mentési állapot. |
| Reload/revision browser workflow | Sikeres | 1. mentés → width módosítás → 2. mentés → reload; 9000 mm és 156,25 m² visszatöltve. |
| Adaptive UI | Sikeres | Calculator oldalon Scaling Bubble, 100→110% élő text scaling, reset ellenőrizve. |
| Narrow viewport 320/375/390/430 px | Nem elérhető | A böngészővezérlőben nincs viewport capability; CSS/accessibility és normál browser smoke elvégezve, vizuális narrow screenshot nem állítható. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes az unused import javítása után. |
| `npm run test` | Sikeres | 13 fájl / 43 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack build; új F5 route-okkal. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba (`ENOTFOUND registry.npmjs.org`). |
## F8.2 — PDF-ajánlat

| Terület | Ellenőrzés | Eredmény |
|---|---|---|
| PDF technológia | `@react-pdf/renderer` Node route, beágyazott Noto Sans | PASS |
| Forrásrevízió | kiválasztott revision ID, org/project/quote/revision lánc | PASS a route/build alapján |
| Pénzügy | mentett HUF subtotal, price class és category subtotal használata | PASS |
| Biztonság | auth + tagság + RLS + no-store válasz | PASS a route ellenőrzés alapján |
| UI | előnézet / letöltés / nyomtatás, történeti revíziós linkek | PASS browser smoke |
| PDF vizuális QA | A4, magyar ékezetek, táblázat, összeg, footer | PASS browser PDF-panel |
| Automatizált kapuk | `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` | PASS: 77 teszt |

Megjegyzés: a böngészős PDF-panel azonos URL esetén egy korábbi dokumentumot
cache-elhetett; a route `private, no-store` fejléccel és az immutable revízió
ID-jával dolgozik. A tényleges új dokumentum előállítása és HTTP 200 válasza
ellenőrzött.
# F9.1 — Kivitelezési tervek

| Terület | Ellenőrzés | Állapot |
|---|---|---|
| Statikus | `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` | PASS: 21 fájl / 79 Vitest; build sikeres |
| Adatbázis | F9.1 migráció alkalmazása helyi Supabase-en | PASS: migráció alkalmazva |
| Biztonság | org/project/source composite FK, RLS, elfogadott + végleges revízió trigger | PASS: 005 F9.1 + teljes suite, 209 teszt |
| UI | terv létrehozása, két feladat, kész státusz, progress, reload, forrásajánlat | PASS: egy végső browser smoke flow |
