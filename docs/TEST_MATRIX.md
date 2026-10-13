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
# F9.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Journal schema/RLS | Fókuszáltan sikeres | 006 pgTAP: append-only jogosultságok, RLS, composite FK-k, request-key |
| Task status events | Fókuszáltan sikeres | After-update trigger, változatlan státusz tiltása, authenticated közvetlen írás tiltása |
| Dátum- és időszemantika | Implementálva | PostgreSQL `date` munkadátum + külön `created_at`/`changed_at` |
| Unified timeline | Implementálva | Munkanapló + feladatesemény, date → timestamp → id rendezés, max. 100+100 rekord |
| Teljes ellenőrzés | Sikeres | Typecheck, lint, 22 Vitest-fájl / 82 teszt, build, pgTAP 223/223 és egy browser smoke PASS |

## F9.3.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Privát Storage bucket | Sikeres | `execution-photos`, `public=false`, 10 MB limit, JPEG/PNG/WebP allow-list. |
| Metadata schema/RLS | Sikeres | `execution_photos`, szervezeti RLS, composite FK-k, immutable authenticated jogosultságok. |
| Cross-reference védelem | Sikeres | Terv–projekt, task–terv és journal–terv trigger; invalid task, MIME és méret pgTAP-ban elutasítva. |
| Journal immutability | Sikeres | A fotó külön rekord; authenticated update tiltott, eredeti journal content pgTAP-ban változatlan. |
| Storage policy | Sikeres | Tagság + bucket/path feltöltés, metadata-sorhoz kötött olvasás, authenticated overwrite/delete nélkül; a jogosult projekt képe signed URL-ről ténylegesen betöltődött a böngészős nagy nézetben. Cross-organization jogosulatlan hozzáférés böngészőben nem lett tesztelve. |
| Upload validation | Sikeres | Server action MIME, 10 MB limit és JPEG/PNG/WebP magic byte ellenőrzést végez; HEIC/HEIF UI-korlát dokumentált. |
| Kompenzáló cleanup | Implementálva | Metadata-hibánál `remove()` fut; két szolgáltatás között nincs hamis atomi ígéret. |
| Automatizált kapuk | Sikeres | 250/250 pgTAP, 22 Vitest-fájl / 82 teszt, typecheck, lint, diff-check, build PASS. |
| Browser workflow | Sikeres | Hitelesített Brave + lokális Supabase: DEMO PNG feltöltés, galéria, tényleges signed URL-es képbetöltés a nagy nézetben, bezárás, reload utáni megmaradás, meglévő feladathoz és naplóbejegyzéshez kapcsolás. Az eredeti naplótartalom változatlan maradt. |

## F9.3.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Képkategóriák | Sikeres | Kézi before/during/after/uncategorized választás, kategória-RPC és 10/10 pgTAP; upload-időpontból nincs automatikus besorolás. |
| Galériaszü̋rés és sorrend | Sikeres | Kategória-, feladat- és feltöltési dátumszűrés, newest/oldest sorrend, a meglévő tervhez kötött 100-as limit megtartva. |
| Feladatonkénti csoportosítás | Sikeres | Valós fotószámok és kategóriánkénti bontás; feladat nélküli fotók nem rejtődnek el. |
| Előtte/utána nézet | Sikeres | Felhasználói kiválasztás, oldalsó összehasonlítás, képcsere és responsive stacking; mindkét kép ténylegesen betöltődött signed URL-ről. |
| Metadata és napló | Sikeres | Feltöltési idő, feltöltő-elérhetőség, feladat- és naplóhivatkozás megjelenik; eredeti journal content nem módosul. |
| Böngészős smoke | Sikeres | Egyetlen hitelesített Brave workflow: két DEMO fotó kategorizálása, szűrés, összehasonlítás, választáscsere és reload utáni perzisztencia. |

## F9.4.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Read-model aggregáció | Sikeres | Célzott Vitest 2/2: task-count, progress, üres terv, figyelmi tételek és determinisztikus idővonal-sorrend. |
| Teljes automatizált kapuk | Sikeres | `npm run test`: 24 fájl / 86 teszt; `npm run typecheck`; `npm run lint`; `npm run build` webpack módban. |
| Projekt- és szervezeti adatforrás | Sikeres | Meglévő szerveroldali, organization/project-szűrt execution lekérdezések; új overview tábla nincs. |
| Fotó- és ajánlat-integráció | Sikeres | Korlátozott fotóelőnézet signed URL-lel, galéria- és meglévő ajánlati oldal-hivatkozás. |
| Böngészős smoke | Sikeres | Egyetlen hitelesített lokális workflow: 2 task, 50% progress, figyelmi elem, idővonal, 2 fotóelőnézet és elfogadott ajánlati oldal megnyitása. |

## F9.4.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| PDF technológia | Sikeres | F8.2 közös `@react-pdf/renderer` pipeline és Noto Sans fontregisztráció, új construction-report komponenssel. |
| Tartalom és üres állapotok | Sikeres | Célzott PDF-render teszt 3/3: A4 PDF fejléc, fejezetek, üres feladat-/napló-/fotóállapot és biztonságos fájlnév. |
| Fotó biztonság | Sikeres | Szerveroldali org/project/plan/photo ellenőrzés, privát Storage `download(objectKey)`, JPEG/PNG korlát, nincs URL-alapú fetch. |
| Erőforrás-korlátok | Sikeres | Legfeljebb 8 fotó, 4 MB/kép, 12 MB összesen; túllépés egyértelmű hibával tér vissza. |
| Teljes automatizált kapuk | Sikeres | `npm run test`: 25 fájl / 87 teszt; `npm run typecheck`; `npm run lint`; `npm run build` webpack módban. |
| Böngészős PDF smoke | Sikeres | Hitelesített lokális projekt: fejezetválasztó, 2 DEMO fotó, preview route, preview/download/print linkek; a reprezentatív PDF közvetlen renderelése vizuálisan is ellenőrzött. |

### F9.4.2.1 célzott PDF-layout ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Pagination és orphan heading | Sikeres | A kapcsolódó ajánlat szakasza `wrap={false}`-szal, a címsor `minPresenceAhead`-del együtt marad; reprezentatív PDF-ben nincs üres második oldal vagy orphan címsor. Hosszabb riportok továbbra is tördelhetők. |
| Feladatesemény sor | Sikeres | Flex-alapú feladat / átmenet / metaadat oszlopok, biztonságos hosszú feladatszöveg-tördelés és dátum–felhasználó térköz. |
| Státuszjel és revízió | Sikeres | Noto Sans `→` karakter; elérhető revíziószám `vN` formában, a belső revízióazonosító külön megőrizve. |
| Célzott render és kapuk | Sikeres | PDF-render teszt 1/1, `npm run typecheck`, `npm run lint`, `npm run build` webpack módban. |
| Oldalkép, fotók, footer | Sikeres | Egy reprezentatív, két DEMO-képes lokális PDF renderelt oldalképe: 1 A4 oldal, mindkét kép, magyar ékezetek, státuszjel, revízió és `1 / 1 oldal` footer látható. |

## F9.5.1 — pilot readiness és üzembiztonság

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Readiness és adatfolyam-leltár | Dokumentálva | A G01–G04 állapot, EXIF/GPS, szervezeti izoláció, backup/restore és pilot checklist a PILOT_READINESS.md-ben található. |
| Terminológiai UI/PDF korrekció | Sikeres | A geometriai eredmény és a kivitelezési PDF belső/geometriai határai pontosítva; célzott Vitest 6/6, typecheck, lint és webpack production build PASS. |
| Hosted, restore, cross-org, terepi smoke | Nem ellenőrzött | Nincs bizonyíték ebben a lokális mérföldkőben. |

## F9.6.1 — ereszcsatorna-anyagbecslés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Domain referenciaesetek | Sikeres | Célzott Vitest: 1 fájl / 5 teszt PASS; egy- és többszakaszos eresz, pontos/részleges szál, lefolyó, kézi komponens, konzolbecslés, hibás bemenet és registry. |
| Typecheck | Sikeres | npm run typecheck PASS. |
| Perzisztens UI és revision mentés | F9.6.1.1.1-ben kész | A következő integrációs táblázat tartalmazza a lokális acceptance bizonyítékot. |
| Geometria | F9.6.1.1.1-ben kész | Két ereszjavaslat a mentett nyeregtető modellből; a forrásrevízió-idő lekérdezés javítva. |
| Katalógus- és takeoff-integráció | F9.6.1.2.1-ben kész | Az explicit variánskapcsolat, egységvédelem, atomi draft átadás és snapshot-integritás bizonyítékát a lenti F9.6.1.2/.2.1 táblázatok tartalmazzák. |
| Hidraulikai/gyártói megfelelés | Támogatáson kívül | Nem számít és nem állít ilyen eredményt. |

## F9.6.1.1 — alkalmazásintegráció

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Projektútvonal | Sikeres buildben | Új /projektek/[projectId]/ereszcsatorna route generálódik. |
| Form és domain újraszámítás | Typecheck/lint/build | A kliens csak domain-kalkulátort hív; a mentési action szerveroldalon újraszámol. |
| Revision RPC és RLS | Célzott lokális pgTAP PASS | 009_gutter_calculation.sql: 21 teszt; a külön szervezethez tartozó felhasználó olvasása/írása elutasítva. |
| Geometry suggestion | Böngészőben PASS | Két mentett nyeregtető-eresz javaslat explicit kiválasztása, forrás-revíziókapcsolat mentve. |
| Material takeoff / SVG | F9.6.1.2.1-ben kész | A katalógus-, technikai SVG- és draft takeoff-integráció külön mérföldkőként lezárva; bizonyíték lent. |

## F9.6.1.1.1 — integráció végső elfogadása

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Projekt-navigáció és UI | Böngésző PASS | Projektoldalról elérhető az Ereszcsatorna-kalkulátor link; két ereszszakasz, szálhossz, lefolyó, könyök, kézi tartozék szerkeszthető. |
| Célzott Vitest | Sikeres | gutter-material.test.ts: 5/5 PASS. |
| Typecheck / lint / build / diff | Sikeres | `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` mind PASS; route szerepel a buildben. |
| Migration és revision/RLS | Célzott lokális PASS | `20261013080100` alkalmazva incremental módon; pgTAP 21/21 PASS, rollbackos teszttranzakcióval. Tulajdonos létrehozás/mentés, külön szervezeti tag elutasítása, keresztprojekt geometria, stale revision `40001`, UPDATE/DELETE immutabilitás igazolt. |
| Böngészős persistence | Hitelesített DEMO PASS | Mentés, teljes reload, két eresz/revízióforrás, kereskedelmi eresz- és lefolyószál, lefolyó/könyök, kézi tartozék és eredmény hidratálása; V2 mentés után V1 4000 mm-en, V2 5000 mm-en olvasható vissza. |
| Konkurenciavédelem | Sikeres | `scripts/verify-gutter-concurrency.mjs`: 2 független authenticated kapcsolat, adatbázis readiness barrier, valódi párhuzamos RPC; 1 sikeres V2, 1 SQLSTATE `40001`, 2 revízió, nincs duplikáció vagy elveszett módosítás. |
| Adatintegritás | Sikeres | V1 `8000` mm változatlan, V2 `9100` mm egyszer szerepel, a current revision és revíziószámozás konzisztens; a saját fixture cleanup sikeres. |
| Környezet / kiegészítő | Részleges | CLI 2.120.0 helyi állapotot emelt, szűk engedéllyel vizsgáltuk; reset/hosted változás nem történt. Szűk képernyős viewport smoke a vezérlő korlátja miatt nem ellenőrzött. |

## F9.6.1.2 — anyagkatalógus, takeoff és technikai SVG

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Katalógus-hozzárendelés | Sikeres | `gutter-material-integration.test.ts`: kompatibilis `piece`, inkompatibilis `linear_meter` és fel nem oldott variáns külön státusz; csak aktív, szervezetazonos katalógus engedett. |
| Mennyiségi egységek | Sikeres | A számított kereskedelmi szál és kézi tartozék `piece`; nincs automatikus folyóméter/csomag átváltás, a szerver ugyanazt ellenőrzi. |
| Takeoff forrás és snapshot | Implementálva | Az action aktuális, verified gutter-revíziót és projekt/szervezetet ellenőriz, új draft+tételekbe forrásrevízió-, katalógus-, technikai- és provenance-snapshotot ír; approved rekordhoz nem nyúl. Adatbázis-szintű új pgTAP erre a változásra nem készült. |
| SVG modell | Sikeres | Két független ereszszakasz, determinisztikus szálhatárok, lefolyókapcsolat nélküli séma és forrásrevízió a célzott Vitestben. |
| Célzott automatizált kapuk | Sikeres | `npx vitest run src/domain/calculations/gutter-material.test.ts src/domain/calculations/gutter-material-integration.test.ts`: 2 fájl / 8 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS. |
| Böngészős végső workflow | Sikeres | Egy hitelesített helyi DEMO folyamat: kompatibilis `piece` variáns kiválasztása, előnézet, új draft, átirányítás és draft újranyitása; a 3 és 4 darabos tételek, forrásrevízió és provenance megjelent, korábbi approved rekord érintetlen maradt. Narrow viewport ebben a vezérlőben nem volt elérhető. |

## F9.6.1.2.1 — végső integrációs hardening

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Server Action A–H | Sikeres | `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 npx vitest run src/features/gutters/gutter-actions.local.integration.test.ts`: 8/8 PASS. Két külön, valóban bejelentkezett helyi identitás; valid owner, idegen szervezeti kalkuláció/variáns, idegen projekt, hibás revízió, inkompatibilis egység, jogosulatlan create/add és approved módosítás elutasítása. Service role kizárólag fixture-életciklushoz. |
| Atomi idempotencia | Sikeres | Explicit UUID kéréskulcs, payload-egyezés és `(organization_id, project_id, transfer_request_key)` unique constraint. Azonos kulcs azonos eredményt ad, eltérő payloadot elutasít; új kulcs ugyanazon név/revízió mellett külön draftot enged. |
| Valódi konkurencia | Sikeres | `scripts/verify-gutter-takeoff-concurrency.mjs`: két független authenticated kapcsolat, egyszerre indított azonos logikai kérés; 1 create + 1 reuse, 1 draft, 1 tétel, azonos takeoff-id és 3 darabos mennyiség. Cleanup PASS. |
| Adatbázis/RLS/snapshot | Sikeres | `010_gutter_takeoff_hardening.sql`: 29/29 pgTAP PASS; szervezet/projekt/revízió/variáns izoláció, egységvédelem, pontos mennyiség, technikai- és árforrás-snapshot, draft forrás/payload immutabilitás és approved immutabilitás. |
| SVG és forrásintegritás | Sikeres | Célzott domain/SVG Vitest 8/8: tárolt hossz, kereskedelmi szálhossz, szálhatárok, könyökszám, pontos revision ID, független lefolyó és nem létező topológia hiánya. |
| Teljes alkalmazáskapuk | Sikeres | `npm test`: 27 fájl PASS / 95 teszt PASS, a 8 helyi integrációs eset alapfutásban szabályosan skip; `npm run typecheck`, `npm run lint`, `npm run build` PASS. |
| Migráció és cleanup | Sikeres | `20261013080200`, `20261013080300` és `20261013080400` incremental, reset nélkül; local/remote history oszlopok lokálisan egyeznek. Temporary table/function, concurrency projekt és action szervezet: 0. Hosted környezet nem érintett. |
| Fókuszált browser follow-up | Sikeres | Meglévő hitelesített helyi munkamenet: kompatibilis DEMO `piece` variáns, atomi draft, átirányítás, 3 `piece`, forrásrevízió és warning látható; a smoke-draft eltávolítva. |
| 390 px mobil QA | Nem ellenőrzött | A rendelkezésre álló native Brave vezérlő nem adott megbízható explicit viewport-emulációt; MOBILE QA UNVERIFIED. |

## F9.6.2.1 — szegélyanyag-becslő domainmotor

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Szegélykategóriák és független futások | Sikeres | Mind a hat kategória explicit runként működik; több futás külön darabszámot kap, nincs automatikus geometriai hozzárendelés. |
| Matematikai referenciaesetek | Sikeres | 7 DEMO eset: pontos határ, részleges következő szál, explicit átfedés határa, több független él, végkiterjesztés és tartalék, hiányzó/hibás kapcsolat, explicit hasznos hossz. |
| Validáció és determinisztikusság | Sikeres | Hibás hossz, átfedés, hasznos hossz, hiányzó geometriai provenance, ismétlődő ID, overflow, kézi tétel és ismételt futás célzottan tesztelt. |
| Domain + meglévő gutter regresszió | Sikeres | `npx vitest run src/domain/calculations/flashing-material.test.ts src/domain/calculations/gutter-material.test.ts`: 2 fájl / 15 teszt PASS. |
| Registry, typecheck, lint és build | Sikeres | A kalkulátor explicit production registrytag; `npm run typecheck`, `npm run lint`, `npm run build` PASS. |
| Gyártói, UI és adatbázis viselkedés | Nem része / nem ellenőrzött | Nincs termékspecifikus korlátozás-ellenőrzés, geometry-import, perzisztencia, RLS, takeoff vagy böngészős workflow ebben a fázisban. |

## F9.6.2.2 — projektintegráció és mentés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Roof-edge mapping és forráshossz | Sikeres | Célzott Vitest 12/12 (11 domain + 1 mapping); ellenőrzött mapping 2 eresz, 1 gerinc, 4 oromél; tört mm eredeti hossza, egész mm-re felfelé kerekítés és explicit felülírás snapshotja ellenőrizve. |
| Typecheck | Sikeres | `npm run typecheck`. |
| Lint, production build | Sikeres | `npm run lint`, `npm run build`. |
| Migráció + pgTAP | Korábbi körben blokkolt; lezárva a 2.2.1-ben | A CLI/Docker socket sandbox-hozzáférés feloldása után a migráció reset nélkül lefutott, a teljes pgTAP 329/329 PASS; a végső bizonyíték a következő táblázatban. |
| Authenticated action és concurrency | Korábban nem ellenőrzött; lezárva a 2.2.1-ben | A helyi böngészős mentés működött; stale expected revision és immutable revíziók pgTAP-ban igazolva. |
| Browser V1/V2/reload/history workflow | Korábbi körben blokkolt; lezárva a 2.2.1-ben | A már futó helyi Next szerver `localhost` címén használt; V1/V2 mentés, reload és V1 visszanyitás PASS. |

## F9.6.2.2.1 — végső lokális integráció-ellenőrzés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Környezetdiagnosztika | Sikeres | Docker 29.8.0; a projekt helyi Supabase adatbázisa és szolgáltatásai már healthy állapotban futottak, a 54322-es port foglalt volt. Az első sandbox hiba a Docker socket engedélyezésével feloldódott; reset nem történt. |
| Migráció | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 supabase migration up --local`: `20261013080500_flashing_calculation_persistence.sql` alkalmazva; `supabase migration list --local` szerint a helyi migrációs előzmény egyezik. Hosted DB nem volt célpont. |
| pgTAP | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local`: 11 fájl / 329 állítás PASS, köztük 19 flashing-állítás. Az első futás 1 assertion hibát mutatott egy túl tág tesztlekérdezés miatt; a szűkített tesztet a teljes suite újrafuttatása igazolta. |
| Geometria és adatkonzisztencia | Sikeres | UI validációs workflow-val meglévő aktuális verified nyeregtető-revízió ferde oroméle került be: 6625,00000036 mm eredeti snapshot, 6626 mm kalkulációs egész hossz, `lengthOverridden=false`, pontos modell/kalkulációs revíziók. A seed `demo` státuszú tetőjét nem használtam verified forrásként. |
| Browser save/reload/history | Sikeres | Egy fókuszált helyi workflow: explicit DEMO V1 mentés, 100 mm tartalék módosításával V2, oldal reload, V1 visszanyitása. UI és read-only DB is megőrzött V1/V2-t mutatott; mindkét revízióhoz 2 forrásfüggőség tartozik. |
| Concurrency és immutable history | Sikeres | pgTAP igazolta az elavult expected revision elutasítását, a V1/V2 megtartását és a történeti revízió update/delete tiltását; authenticated UI-val mentés/reload is sikeres. |
| Typecheck/lint/build | Nem futott újra | Alkalmazáskód nem változott az előző F9.6.2.2 kör óta; az ottani 12/12 célzott Vitest, typecheck, lint és build PASS bizonyítéka megmarad, de ez nem új végső futtatás. |
| Mobil és gyártói megfelelés | Nem verifikált | Fizikai eszközös QA és gyártói/specifikus jóváhagyás nem része a lokális integrációs bizonyítéknak. |

## F9.6.2.3 — szegély anyagkatalógus, draft-átadás és SVG

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Katalógus-hozzárendelés | Sikeres | Célzott `flashing-material-integration.test.ts`: mind a hat kategória, egységütközés, archived termék elutasítása, aktív flashing/sheet_metal variáns elfogadása, provenance és ár-ID ellenőrizve. Név alapján kompatibilitást nem állítunk. |
| Mennyiség és SVG | Sikeres | 6/6 Vitest a flashing geometry teszttel együtt: `null` szálbecslés nem lesz 0, explicit target→fm tartalékkal, méretarány, végkiterjesztés, határok, átfedés és forrásrevízió ellenőrzött. |
| RPC, jogosultság és immutabilitás | Sikeres | `20261013080600_flashing_takeoff_integration.sql`; `012_flashing_takeoff_integration.sql`: 28/28 pgTAP. Forrásrevízió, piece/fm mennyiségek, null count tiltás/részleges insert hiánya, product/variant identity, technical provenance, exact árrevision ID/forrás snapshot, egység/kategória, cross-project/cross-org, jogosulatlan tagság, idempotencia, payload eltérés és approved immutabilitás PASS. |
| Valódi párhuzamos idempotencia | Sikeres | `node scripts/verify-flashing-takeoff-concurrency.mjs`: két független authenticated kapcsolat; 1 create + 1 reuse, azonos takeoff-id, egy draft/tétel, authoritative 4,1 fm. A lokális, véletlen DEMO-fixture célzott cleanup-pal készült. |
| Browser elfogadás | Sikeres | Egy helyi authenticated DEMO munkafolyamat: mentett V2, SVG, kompatibilis `linear_meter` variáns, új draft megnyitása; 6,726 fm, exact V2 revision és estimated provenance látható. A kiválasztott egységhez nem volt ár, ezért price snapshot null/warning. Korábbi approved rekord változatlanul látható. |
| Alkalmazáskapuk | Sikeres | Célzott Vitest 6/6, `npm run typecheck`, teljes `npm run lint`, `npm run build` webpack PASS. |
| Narrow viewport/gyártói validáció | Nem ellenőrzött | Fizikai eszközön nem tesztelt; a terméknév/kategória nem bizonyít gyártói profil- vagy szerelési megfelelést. |

## F9.6.3.1 — lemezprofil- és hajlítási domain

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| 9 DEMO matematikai referencia | Sikeres | Független várt értékek: L, U, több/ellentétes hajtás, vastagság, explicit BA, hiányzó paraméter, külső csúcsméret elutasítása, lehetetlen méret, kis szög. |
| Célzott geometria/validáció/registry Vitest | Sikeres | `npx vitest run src/domain/calculations/sheet-metal-profile.test.ts`: 1 fájl, 19/19 PASS. Önmetszés, analitikus ívsugár és tangensfolytonosság, nem 90°-os szög, numerikus határok, ismétlés és registry szerepel. |
| Meglévő engine/flashing regresszió | Sikeres | `npx vitest run src/domain/calculations/engine.test.ts src/domain/calculations/flashing-material.test.ts`: 2 fájl, 15/15 PASS. |
| Typecheck | Sikeres | `npm run typecheck`; a végső domain típusszerződés PASS. |
| Lint | Sikeres | `npm run lint`; első futás 1 használatlan értékadást jelzett, javítás után PASS. |
| Production build | Sikeres | `npm run build` (Next 16.4.0 webpack): compile, TypeScript, statikus oldal-generálás PASS. |
| Diff/whitespace | Sikeres | `git diff --check` PASS. |
| Teljes regresszió/adatbázis/böngésző | Nem futott | A fázis tiszta domain és registry; nincs UI, perzisztencia, Supabase vagy migráció. |
| Gyártási megfelelés | Nem ellenőrzött | Nincs mért gép–szerszám–anyag kalibráció, hajtási sorrend/ütközés/visszarugózás vagy szakmai pilot. |

## F9.6.3.2 — helyi profil-editor

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Célzott editor + domain Vitest | Sikeres | `npx vitest run src/features/sheet-metal/profile-editor.test.ts src/domain/calculations/sheet-metal-profile.test.ts`: 2 fájl, 26/26 PASS. DEMO sablon, szerkesztés/váltás, BA/K-hiány, validáció/önmetszés, SVG arc/y-leképezés, méretforrás és kijelölésazonosság. |
| Typecheck / lint / build / diff | Sikeres | `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check` PASS. |
| Hitelesített helyi böngésző | Sikeres | Projekt→editor, L 60→75 mm és 90→60°, SVG és felirat frissült; BA 2,5 mm + DEMO forrás → 117,5 mm; U sablonváltási figyelmeztetés; SVG→sor és sor→SVG kijelölés; 125% zoom, egérpan; ismeretlen BA/K, hibás vastagság és rajz elrejtése. |
| Keskeny böngészőnézet | Sikeres | 390×844 px: egyoszlopos grid, 313 px SVG, vízszintes dokumentum-túlcsordulás nincs (`scrollWidth=390`). |
| Fizikai érintés / teljes regresszió / adatbázis | Nem futott | Pointer/pinch kód jelen van, fizikai iPad/mobil gesztus nem ellenőrzött. UI-only fázis, nincs mentés/migráció/pgTAP vagy teljes Vitest. |
| Gyártási alkalmasság | Nem ellenőrzött | Nincs gép-/szerszám-/anyagkalibráció és terepi szakmai jóváhagyás. |

## F9.6.3.3 — profilperzisztencia és revízióbiztonság

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Input/provenance round-trip és hiányos BA/K | Sikeres | `npx vitest run src/features/sheet-metal/profile-editor.test.ts src/domain/calculations/sheet-metal-profile.test.ts`: 2 fájl, 27/27 PASS; profile type, katalogizált provenance-minta, gép/tool/calibration ID, signed turn és `unknown` BA/K round-trip; hiányzó BA/K `null`. |
| Helyi migráció | Sikeres | `20261013080700_sheet_metal_profile_persistence.sql`, `.80800_sheet_metal_profile_persistence_fix.sql`, `.80900_sheet_metal_profile_authoritative_output.sql` reset nélkül helyi Supabase-re alkalmazva. A végső RPC input-only; outputot a DB számítja. Hosted környezet nem érintett. |
| pgTAP/RLS/immutable | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local supabase/tests/database/013_sheet_metal_profile.sql`: 1 fájl, 19/19 PASS; V1/V2, adatbázisoldali BA/K eredmény, hiányos null-width, unsupported convention, stale expected revision, cross-project/cross-org/non-member read/write, revision UPDATE/DELETE tiltás. |
| Valódi konkurencia | Sikeres | `node scripts/verify-sheet-metal-profile-concurrency.mjs`: 2 független authenticated DB kapcsolat; 1 V2 sikeres mentés, 1 stale conflict; V1/V2 megmaradt, max revision=2. |
| Alkalmazáskapuk | Sikeres | A végső `npx vitest run ...profile-editor.test.ts ...sheet-metal-profile.test.ts` 27/27 PASS, `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4.0 webpack), `git diff --check` PASS. |
| Authenticated browser workflow | Sikeres | Helyi `local.owner@local.test`, DEMO projekt. L 60→75 mm, 90→60°; V1 mentés/reload és SVG/input helyreállítás; K=0,4 forrásprovenance-szal V2; V1 visszatöltve változatlan, V2 elérhető; unknown BA/K-val V3; a végső input-only RPC-val V4, reload után 81 mm és null teríték. |
| Katalógusmapping / fizikai QA / gyártás | Nyitott | `technical_specs` nem hordoz explicit profilkompatibilitási szerződést; mapping F9.6.3.4. Fizikai mobil, gépkalibráció és gyártói megfelelőség nem ellenőrzött. |

## F9.6.3.4.1 — profilanyag-mennyiség

| Ellenőrzés | Állapot | Bizonyíték |
|---|---|---|
| Nettó m², darabszám, hiányzó BA/K, határok, round-trip | Sikeres | `npx vitest run src/domain/calculations/sheet-metal-profile.test.ts src/domain/calculations/profile-material-compatibility.test.ts src/features/sheet-metal/profile-editor.test.ts`: 3 fájl, 32/32 PASS. |
| Katalógus és revízió/RLS | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local supabase/tests/database/013_sheet_metal_profile.sql supabase/tests/database/014_profile_material_requirements.sql`: 2 fájl, 40/40 PASS; V1/V2, szervezetidegen variáns, hiányzó attribútum, inkompatibilis egység/vastagság, hiányos BA/K. |
| Helyi migráció | Sikeres | `20261013081000`–`20261013081300` helyi `supabase db push --local` reset nélkül alkalmazva. |
| Alkalmazáskapuk | Sikeres | `npm run typecheck`, `npm run lint`, `npm run build` PASS; `git diff --check` a végén ellenőrizve. |
| Böngésző mentés/reload | Sikeres | Helyi authenticated DEMO projekt: 103 mm × 2000 mm / 1 000 000 = 0,206 m²/db; 3 db = 0,618 m²; V1 mentés/reload után mezők és eredmény változatlan. |
| Teljes regresszió, gyártás, beszerzés | Nem futott / nem ellenőrzött | Célzott kapuk nem jelentenek teljes regressziót; nincs valós gép/gyártói jóváhagyás, stock- vagy takeoff-átadás. |
