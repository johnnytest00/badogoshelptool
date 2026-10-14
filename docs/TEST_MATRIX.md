# Tesztmátrix

## F9.7.6.6.1 — standalone quotation backend

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Standalone ownership/schema migration | Sikeres helyi alkalmazás | History 20261014020200-nál állt; `20261014030000` unapplied volt. Incremental `supabase migration up --local` sikeres, reset nélkül. |
| GUC-megkerülés / RLS | pgTAP + Auth PASS | SECURITY DEFINER save RPC, direct standalone parent/revision INSERT/UPDATE denied, ledger INSERT denied; hamis GUC-es pgTAP is PASS. Public CREATE nincs authenticated/anon számára. |
| Draft/revision, kézi sorok és HUF totals | Sikeres | `018_standalone_quotations.sql`: 33/33 pgTAP; Auth harnessben LABOR/OTHER, 2.5 × 5.25 → HUF 13.13, zero, precision/negative/large rejection. |
| Catalog validation/snapshot | Sikeres | Auth harness 43/43: authorized MATERIAL, manual override, catalog snapshot megmarad későbbi árváltozás után, másik org variáns denied. |
| Creator isolation / forged IDs | Sikeres, helyi Auth | Harness 43/43: két Auth-issued JWT; creator list/current/history, same-org noncreator és cross-org read/write denial; direct parent/revision/ledger és forged creator elutasítva. |
| Next Server Action / browser cookie útvonal | F9.7.6.6.1b-ben PASS | Host Brave smoke alatt valós helyi Auth session-cookie után a produkciós quotation action függvények Next Server Action runtime-ból futottak. Részletek az 1b acceptance szekcióban. |
| Expected version / real concurrency | Sikeres, két backend | Két párhuzamos authenticated RPC-t két waitelő PostgreSQL backend-sessionnel figyeltünk. Create retry: egy quote+revision; same-V1 V2: egy success + egy `40001`, V1 változatlan. |
| Project quotation regression | PASS, célzott | pgTAP 002–004: 27/27 PASS; 1b alkalmazásellenőrzés: authorized draft/V2, létező approved takeoff kapcsolat és accepted quotation módosításának tiltása. PDF nem backend acceptance feltétel; standalone PDF nincs implementálva. |
| Docker/Supabase/migration history | Sikeres helyi diagnosztika | Socket-jogot szűkítve Docker 29.8.0; local DB/API elérhető, `linked_project=null`; 030000 apply sikeres. Opcionális imgproxy/edge/analytics/vector/pooler szolgáltatások leálltak. |
| Vitest/typecheck/lint/build/diff/DB lint | PASS | 1b: Vitest 3 fájl/10 teszt, typecheck, lint, production build és diff check mind ténylegesen lefutott és sikeres. `db lint --local` korábbi futás: exit 0, csak korábbi standalone calculation/flashing warnings. |

## F9.7.6.6.1b — alkalmazás-elfogadás

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Next Server Action + SSR cookie/session | PASS | Helyi valós Auth user a Next actionben jelentkezett be; az SSR kliens által írt session cookie a következő action requestekben hitelesítette a műveleteket. Nincs mock Auth. |
| Standalone create/read/list/V2/history | PASS | 15 owner assertion: manual MATERIAL és LABOR mentés, katalógus-feloldás, saját lista, read, expected V1-es V2, immutable V1, stale V1 `CONFLICT`, érvénytelen ID és hamisított org azonosító elutasítva. |
| Negatív felhasználói hozzáférés | PASS | Külön aktív tag JWT-je saját creator-idegen quote-ot `NOT_FOUND`-ként kapott; visszavont tagságú user lista és mentése `FORBIDDEN`. Hibaüzenet nem szivárogtatott SQL részletet. |
| Pénzügy / lifecycle | PASS | Action-válasz HUF nettó összeget és `priceClass`-t ad `vatAmount` nélkül; kevert nettó/bruttó validációs hiba. Projekt-finalize action standalone quote-ra elutasít. VAT engine/finalize nem került be. |
| Projekt-quotation alkalmazás-regresszió | PASS | Meglévő approved takeoff itemmel project `saveQuotationDraftAction` V1/V2 sikerült; meglévő accepted quote piszkozatként nem volt módosítható. |
| Frontend / böngészős szerkesztő | Nincs implementálva / nem ellenőrzött | Csak az ideiglenes local acceptance fixture oldalt használtuk az action hívásához; a fixture-t eltávolítottuk. Quote editor UI F9.7.6.6.2 feladata. |

## F9.7.6.6.2 — standalone quotation frontend

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Állapotfüggvények: nettó címkék, revision nézet, idempotens retry | PASS | `npx vitest run src/features/quotations/standalone-quotation-ui-state.test.ts`: 3/3. |
| Standalone domain-validáció és fixed-point pénz | PASS | `src/domain/quotations/standalone.test.ts`, `money.test.ts`: LABOR/OTHER, üres draft, pontosság és vegyes net/gross ellenőrzés. |
| Draft recovery és secure UUID regresszió | PASS | A fókuszált futásban `quotation-draft-recovery.test.ts` és `secure-uuid.test.ts` is lefutott; mind az 5 fájl együtt 18/18 PASS. |
| Typecheck / lint | PASS | `npm run typecheck`, `npm run lint` ténylegesen lefutott a frontend változtatások után. |
| Production build | PASS | `npm run build` Next.js 16.4.0 webpack; mindhárom globális standalone quotation route bekerült a build route listájába. |
| Diff ellenőrzés | PASS | `git diff --check` a módosítások és dokumentáció után. |
| Authenticated browser workflow, create/reopen/V1–V2/history/project regression | PARTIAL / UNVERIFIED | F9.7.6.6.2a alatt a helyi authenticated DEMO overview (üres standalone lista + projektajánlat-linkek) és az új editor megnyílt; draft-only és nettó HUF jelölés látszott. Korábbi nem mentett recovery elvetve. A Brave ezután másik privát ablakra váltott Google belépési kihívással; a sessiont nem kerültük meg. Mentés, ID, reload, V2, history, katalógus és projektlink megnyitása nem igazolt. Nem bizonyított kódhiba; kódot nem módosítottunk. |
| DB / pgTAP / concurrency | Nincs újrafuttatva, változatlan szerződés | Nem volt backend-contract vagy migration változás; F9.7.6.6.1b történeti bizonyítékait nem ismételtük. |

## F9.7.6.6.2a — E2E acceptance kísérlet

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Helyi authenticated DEMO overview | PASS | `/ajanlatok` renderelte az üres standalone listát, meglévő project quotation sorokat és azok navigációs linkjeit. A link megnyitása nem lett ellenőrizve. |
| Standalone új editor megnyitása | PASS | „Új árajánlat” az `/ajanlatok/uj` route-ra navigált; a draft-only figyelmeztetés és nettó HUF tájékoztató látható volt. Korábbi session recovery-t elvetettük. |
| Draft V1 → reload/reopen → V2 → historical V1 → current V2 | UNVERIFIED | Mentésig nem jutottunk. A Brave másik privát ablakra váltott Google login challenge-re, majd a TetőPro ablak visszahívásakor ismét fókuszváltás történt. Nem léptünk be újra és nem kerültük meg a kihívást. |
| Kódjavítás / automatizált teszt | Nincs szükség | A browser blokkolás nem alkalmazáshiba; kód nem változott. Korábbi sikeres static/backend teszteket nem ismételtünk. |

## F9.7.6.6.3.1 — architektúra-terv

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Aktuális adat- és alkalmazáskontraktok | PASS, célzott olvasás | F8.1 quotation schema, F8.3.1 finalize, F8.3.2 lifecycle, standalone migration/action, project PDF route és shared React-PDF renderer; organizations/clients mezők ellenőrizve. |
| Design és dokumentumkonzisztencia | PASS | `docs/QUOTATION_FINALIZATION_DESIGN.md`, `STANDALONE_WORKFLOWS.md` és `PROGRESS.md` rögzíti a jelenlegi tényeket, hiányzó mezőket, tax boundaryt, biztonságot, sorrendet és open decisionöket. |
| `git diff --check` | PASS | Ténylegesen lefutott a docs-only változtatások után. |
| Vitest / typecheck / lint / build / DB / browser | Nem futott | Nincs kód- vagy DB-változás; architektúra-feladatban browser nem volt szükséges. |

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

## F9.6.3.4.2 — profilanyag átadás

| Ellenőrzés | Állapot | Bizonyíték |
|---|---|---|
| Nettó m², mentett revízió, katalógus, ár és snapshot | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db supabase/tests/database/015_profile_takeoff_integration.sql --local`: 37/37 PASS; 0,618 m², pontos revízió, BA-forrás, ár nélküli és egységazonos áras snapshot, immutable tétel. |
| Jogosultság, stale, hiányos BA/K, null area | Sikeres | Ugyanazon pgTAP: authenticated nonmember/cross-project elutasítás, eltérő anyag/vastagság/egység, V1 stale, hiányos BA/K és null area elutasítása, approved immutabilitás. |
| Idempotencia, konkurencia | Sikeres | Azonos kulcs/payload reuse, eltérő payload elutasítás, új kulcs új draft; `node scripts/verify-profile-takeoff-concurrency.mjs`: két független authenticated kapcsolat, 1 create + 1 reuse, 1 draft és 1 tétel, 0,618 m². |
| Eresz és szegély regresszió | Sikeres | `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db supabase/tests/database/012_flashing_takeoff_integration.sql supabase/tests/database/010_gutter_takeoff_hardening.sql --local`: 57/57 PASS. |
| Alkalmazás és böngésző | Sikeres | Célzott profil Vitest 32/32 PASS; a végső action-változtatás után `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS. Egy hitelesített DEMO flow: V1 → kompatibilis DEMO variáns V2 → 0,618 m² előnézet → új draft → revízió/árhiány ellenőrzés → hiányos V3 átadás tiltása és a korábbi V2 draft stale jelzése, változatlan snapshotja. |
| Teljes regresszió és gyártás | Nem futott / nem ellenőrzött | A célzott tesztek nem teljes regresszió; nincs fizikai eszközös QA, gép-/szerszámkalibráció vagy kereskedelmi blankoptimalizálás. |

## F9.7.1 — projekt-navigáció és összecsukható kivitelezés

| Ellenőrzés | Állapot | Megjegyzés |
|---|---|---|
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-navigation.test.ts`: 1 fájl / 3 teszt; mindhárom projekt+organization route, alapból zárt parent/nested disclosures és parent close nested reset helper. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (webpack) mind sikeres. |
| Roof models elkülönülése | Forráskód alapján | Project page a tetőmodell-szekciót a `ExecutionSection` testvéreként rendereli; a szülő részletező nem rejti el. Böngészőben nem ellenőrzött. |
| Működés és független disclosure | Részleges | A natív `<details>/<summary>` kezeli a nyitást, billentyűzetet és expanded/collapsed szemantikát. Szerveroldali markup teszteli az alapállapotot; interaktív kézi browser QA nem futott. |
| Responsive / keyboard browser QA | Nem futott | `npm run dev` port bind `EPERM` mind `0.0.0.0:3000` és `127.0.0.1:3000`; böngészőtab nem volt. A 850/560 px CSS breakpointok forrásból ellenőrizhetők, tényleges 390 px/tablet render nincs bizonyítva. |
| Adatbázis / jogosultság / üzleti action | Nem futott / nem változott | Csak kliens UI-állapot változott; nincs DB, RLS, dokumentumtárolás, journal/action vagy Supabase módosítás. |
| `git diff --check` | PASS | A végső tracked diff ellenőrzése sikeres; az új fájlokat is külön ellenőriztem whitespace-hibára. |

## F9.7.1.1 — magyar szakmai UX és valósághűség

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Útvonal- és felületi leltár | Forráskód alapján teljes | 19 `page.tsx` útvonal; a projektbe ágyazott napló, fotó, riport, beállítások és közös komponensek is szerepelnek a [részletes auditban](HUNGARIAN_PROFESSIONAL_UX_AUDIT.md). |
| Új UI/opció tesztek | PASS | `gutter-calculator-ux.test.ts`, `calculator-ux.test.ts`, `takeoff-forms.test.ts`, `takeoff-form-options.test.ts`: üres termékhossz, szegély/profil feliratok, magyar mezők/egységek és domainkulcsokkal egyező opciók. A React SSR nem bizonyít kliens-interakciót. |
| Kapcsolódó fókuszált regresszió | PASS | Egy `npx vitest run` parancsban összesen 10 fájl / 39 teszt: fenti 4, `estimation.test.ts`, `gutter-material.test.ts`, `flashing-material.test.ts`, `profile-editor.test.ts`, `project-navigation.test.ts`, `execution-overview.test.ts`. |
| Katalógus és dashboard célzott ellenőrzés | PASS | Külön `npx vitest run src/domain/materials/contracts.test.ts src/features/dashboard/dashboard.test.ts`: 2 fájl / 6 teszt. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next 16.4 webpack). |
| Adatkonzisztencia és jogosultság | Forráskód alapján, nem DB-teszt | Takeoff action: szervezet/projekt, mentett forrás, aktív variáns, ár/egység egyezés; jóváhagyásnál szerepkör és verziót továbbító RPC. Ezek nem változtak; pgTAP és konkurenciateszt nem futott. |
| Böngésző, mobil, PDF vizuális | Nem futott | A korábbi helyi szerverindítás mindkét loopback/bind címen `EPERM` hibával zárult; ebben a körben nem ismételtem a sikertelen indítást. Vizuális és hitelesített workflow továbbra is külön ellenőrzést igényel. |
| Teljes regresszió / adatbázis | Nem futott | A változtatás UI-szöveg és kliensoldali mezőválaszték; képlet, séma, RLS és perzisztencia-szerződés változatlan. |
| `git diff --check` | PASS | A végső tracked diff és az új fájlok külön whitespace-ellenőrzése sikeres. |

## F9.7.2 — egységes projektfolyamat-áttekintő

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-workflow-overview.test.ts src/features/projects/project-navigation.test.ts`: 3 fájl / 7 teszt; üres adatok, valós status mapping, latest version, project+organization link, tenant filters, no false completion, disclosure megmarad. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (webpack). |
| Böngészős smoke | PASS, desktop | Egy hitelesített helyi DEMO projekt: 3 kalkulátormodul státusza/linkjei, takeoff/quotation valós státuszösszesítő, Tetőmodellek és projektadatok látszottak; Kivitelezés csukva maradt. Egy ereszkalkulátor read-only bejárása ellenőrizte a magyar mezőket, bemeneti értékeket, revíziót, becslési korlátokat és tiltott átadást; adatot nem módosítottam. |
| Keskeny nézet | Nem ellenőrzött | A meglévő desktop Brave tab nem tett lehetővé viewport override-ot; reszponzív breakpoint csak forrásból ellenőrizhető. |
| Jogosultság/adatkonzisztencia | Forrás alapján | Új lekérdezések `organization_id` és `project_id` szűrtek; tető/kivitelezés meglévő projektlekérdezések újrahasználva. Csak SELECT listaadat, nincs mutáció. RLS/DB teszt ebben a körben nem futott. |
| Teljes regresszió / DB | Nem futott | Nincs séma, üzleti státusz, kalkulációs vagy átadási logika változás. |
| `git diff --check` | PASS | Végső változtatáskészlet whitespace ellenőrzése. |

### F9.7.2.1 — reszponzív és akadálymentességi QA

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Desktop vizuális / keyboard | Részleges PASS | Hitelesített Brave projektoldal: fókuszkeret látható billentyűzetes Tab után; Kivitelezés Space billentyűvel nyílt/csukódott. AX fa mutatta az egyedi linkneveket, szemantikus főcímet és natív disclosure-t. Nincs screen-reader QA. |
| 390 / 768 px | Nem futott | Böngészőleltárban nem volt viewport-override; nincs tényleges vizuális vagy overflow bizonyíték. CSS breakpoint: workflow 4→2 oszlop 850 px alatt, 1 oszlop 560 px alatt; kalkulátornavigáció 3→2→1; projektadat 760 px alatt 1 oszlop. Ez forrásvizsgálat, nem render QA. |
| Forrás/CSS akadálymentességi ellenőrzés | PASS, forrás alapján | Workflow modul linkek minimum 44 px magasak és saját fókuszkeretet kaptak; fő és kártyacímek h2/h3; státuszok szövegesek; natív `<details>/<summary>` expanded/keyboard szemantikát ad. |
| Jogosultság/adat-hozzáférés | PASS, forrás + teszt | Oldal a `getProjectForOrganization(orgId, projectId)` ellenőrzés null eredményénél leáll, és csak utána kéri le az aggregátumokat. A workflow query mindhárom táblát org+project szerint szűri; `project-workflow-data.test.ts` ezt közvetlenül ellenőrzi. RLS-t nem módosítottam. |
| Fókuszált Vitest | PASS | `npx vitest run src/features/projects/project-workflow-overview.test.ts src/features/projects/project-workflow-data.test.ts src/features/projects/project-navigation.test.ts`: 3 fájl / 8 teszt. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (webpack), `git diff --check`. |

## F9.7.3 — kalkulátor UX-konzisztencia

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Kalkulátor UI Vitest | PASS | `npx vitest run src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 3 fájl / 12 teszt; magyar revízióállapot és új változat mentési felirat regressziója, meglévő szakmai feliratok. SSR markup, nem kliensinterakció. |
| Typecheck / lint / build | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack). |
| Keskeny űrlap forrásellenőrzés | PASS, CSS alapján | 560 px alatt profilmezők és mentési vezérlők egy oszlopra váltanak. 390/768 px tényleges render vagy overflow nem igazolt. |
| Hitelesített böngészősmoke | Nem futott | Brave tablista üres; helyi szerverindítás korábbi körben `EPERM` hibát adott, nem ismételtem a korábban sikertelen viewport-emulációt. |
| SVG, katalógus és draft átadás UI | Nem ellenőrzött | E körben ezek elrendezése/vezérlése nem változott; a kliensszövegek alapján sem tekinthető elfogadottnak az interaktív viselkedés. |
| DB, jogosultság, üzleti logika | Nem futott / nem változott | Nincs action, snapshot, képlet, adatbázisséma, migráció, RPC vagy engedélyezési szerződés változás. |
| `git diff --check` | PASS | A feladatváltoztatásokra futtatva. |

## F9.7.3.1 — végső kalkulátor UX-konzisztencia

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/features/flashings/drawing-preview.test.ts src/features/flashings/calculator-ux.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 4 fájl / 18 teszt. Névváltozás miatti mentetlen állapot, élő és mentett rajzforrás, invalid rajz elrejtése, mentett eredmény/rajz/katalógus/átadási vezérlők, profil zoom és egyetlen illesztés/alaphelyzet gomb. SSR markup és tiszta UI-állapot teszt, nem kattintásos böngészőteszt. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Katalógus és átadás | PASS, forrás + markup | Eresznél darabegység, árhiány, mentett V-forrás és letiltási ok; szegélynél előzetes db/fm, kompatibilitás, árstátusz, stale/dirty jelzés; profilnál nettó m² és BA/K korlát megmaradt. Szerveraction és RPC változatlan; új backendteszt nem futott. |
| SVG és figyelmeztetés | PASS, célzott teszt + forrás | Szegélyrajz tiszta kiválasztási szabállyal élő/saved/invalid állapotban, billentyűzetes görgethető régió; profil zoomgombok és közös fit/reset; az eredmény és figyelmeztetés az átadás előtt. Fizikai touch nem ellenőrzött. |
| Hitelesített böngésző / 390 és 768 px / fizikai eszköz | UNVERIFIED | Brave tablista az előző körben üres volt, ugyanazt a nem elérhető workflow-t nem ismételtem. Viewport és touch/pinch vizuális QA F9.7.4. |
| Teljes regresszió / pgTAP / konkurencia | Nem futott | Kizárólag helyi UI-kód változott. Korábban bizonyított perzisztencia- és jogosultsági szerződésekre támaszkodik; új DB/RPC-változás nincs. |

## F9.7.4.1 — iPad runtime és UX korrekciók

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | 10 fájl / 30 teszt; `secure-uuid.test.ts` (native, fallback/v4, hiányzó RNG, kulcsstabilitás), `secure-uuid-runtime.test.ts` (mindhárom kalkulátor render `randomUUID` nélkül), keyboard/floating placement, projektrajz, preferenciák/persistencia/reset, approval és meglévő kalkulátor UX. |
| Typecheck / lint / production build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. A Vitest fókuszált, nem teljes regresszió. |
| UUID ok és idempotencia | PASS, dokumentáció + unit teszt | A `randomUUID()` secure-context API; az `HTTP 192.168.x.x` LAN-origin nem secure context. A `getRandomValues()` insecure contextben is elérhető; a közös helper ezt használja és v4/version/variant biteket állít. Takeoff payload/RPC nem változott. |
| Supabase LAN / Auth / jogosultság | RÉSZBEN DIAGNOSZTIZÁLT, hálózatilag blokkolt | `.env.local` effektív URL-je korábban `127.0.0.1:54321` volt; a feladat hostját használó `192.168.1.31:54321`-re módosítva. A browser/server client azonos publikus URL+publishable key-t használ; service-role nincs jelen. `curl` mindkét API címre HTTP 000; Docker socket `permission denied`, `supabase status` sandbox `EPERM` telemetria-írásnál. Auth/session és RLS nem futott. |
| Projekt rajzok / tenant scope | PASS, teszt + forrás | Több mentett nyeregtető külön modellnévvel, revízióval, egyedi címmel, meglévő nézetválasztókkal és részletes modell linkkel; a projektoldal már létező `getRoofModelsForProject(organizationId, projectId)` adatait használja, új query nincs. |
| Approval / keyboard / global settings | PASS, célzott markup és tiszta logika | Approval akció külön, tördelhető és térközzel elválasztott; VisualViewport resize esetén csak a kilógó fókuszmező kerül középre; csúszkák text/UI/spacing/drawing tengelye független, localStorage persist/reset útvonal tesztelve; a lebegő ikon fontos vezérlővel való geometriai ütközéskor elrejtőzik. Fizikai billentyűzet- és overflow QA nem futott. |
| Hitelesített böngészősmoke / iPad | Nem futott | Nincs böngészőtab; `npm run dev -- --hostname 0.0.0.0` bind `EPERM` miatt sikertelen. Fizikai iPad/iPhone nincs elérhető tesztkörnyezetben. Ne tekintsd mobil PASS-nak. |
| DB/RPC/pgTAP / képletek | Nem futott / nem változott | Nincs migráció, RPC, adatjogosultság, takeoff szerződés vagy számítási képlet változás; nincs DB reset vagy hosted Supabase érintés. |

## F9.7.5 — végső UX-finomságok és interakciós megbízhatóság

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/lib/user-facing-action-error.test.ts src/lib/unsaved-changes.test.ts`: 2 fájl / 4 teszt; konfliktus, jogosultság, hiányzó forrás, validáció, SQLSTATE/RPC szöveg kiszűrése és dirty/clean unload figyelmeztetés. |
| Typecheck | PASS, második futás | Első futás builddel párhuzamosan hiányzó generált `.next/types` fájlokat jelzett; `npm run build` után önálló `npm run typecheck` PASS. |
| Lint / production build / diff | PASS | `npm run lint`; `npm run build` (Next.js 16.4.0 webpack); `git diff --check`. |
| Érintett UI | Forrás alapján | Ajánlati dirty státusz `role=status`, hibák `role=alert`, pending mentés letiltva; successful save után navigál. Interaktív működés böngészőben nem ellenőrzött. |
| Böngésző / fizikai eszköz | Nem futott | Hitelesített tab nem volt elérhető; az előző F9.7.4.1 helyi bind `EPERM` hibája miatt nem próbáltam újra. Fizikai iPad/iPhone nincs igazolva. |
| Belső navigáció / loading / üres / destructive | Részben ellenőrzött | Dirty warning csak böngészőoldal-elhagyásra hat; SPA-navigációs prompt nincs. Projektlista üres állapota meglévő külön EMPTY UI; adatlekérés hibára dob, így nem címkézi üresként. Más modulok teljes állapot- és destructive auditja nem futott. |
| Adatbázis / jogosultság / idempotencia | Nem változott | Nincs schema/action payload/snapshot/approval permission/idempotency-változás. A korábbi adatkonzisztencia- és RLS bizonyítékokat ez a UI-kör nem futtatta újra. |

## F9.7.5.1 — maradék UX-megbízhatósági javítások

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `npx vitest run src/lib/user-facing-action-error.test.ts src/lib/unsaved-changes.test.ts src/app/loading-error-ui.test.ts src/features/material-takeoffs/takeoff-forms.test.ts src/features/calculators/data-loading.test.ts`: 5 megadott fájl / 13 teszt; dirty/cancel/confirm/unload, üres kontra lekérési hiba, loading/error UI, pending submit és safe error mapping. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. A build által módosított `next-env.d.ts` visszaállítva. |
| Loading / error | PASS, célzott markup + forrás | Nincs korábbi app loading/error fallback; új root `loading.tsx` jelzi busy/loading állapotot, root `error.tsx` safe Hungarian hibát és retry-t ad. |
| Failed request ≠ empty | PASS, célzott teszt + forrás | Eresz/szegély/profil source getterek különválasztják a sikeres üres listát a sikertelen querytől. Takeoff és quotation kapcsolódó query-hibákat is továbbadja a route error fallbacknek; projektek, tetőmodellek és kivitelezési fő workspace eddig is explicit hibát dobott. |
| Ajánlat navigáció | Részleges | Saját projekt-vissza link cancel/confirm guardot használ; editoron belüli egyéb ajánlatnavigáció rejtett, mentési success nem kér megerősítést, pending alatt vezérlők tiltottak. Browser Back és editoron kívüli útvonalak nincsenek elfogva; globális router/link interceptiont nem építettem. |
| Kritikus művelet | PASS, forrás + markup teszt | Takeoff tételhozzáadás és jóváhagyás pending gombot használ; approval immutabilitási következménye látható. Projektarchiválás meglévő visszaállítható megerősítése megmaradt; projektmásolat és kalkulátor mentés pending tiltást használ. |
| Böngésző / fizikai eszköz | Nem futott | Nincs hitelesített tab; korábbi dev bind `EPERM`, azonos környezet újrapróbálása elmaradt. Fizikai iPad/iPhone külön elfogadás. |
| DB / RLS / idempotencia / teljes regresszió | Nem futott / nem változott | Nincs migration, adatbázis-séma, RPC, approval rule, kulcs vagy számítási szerződés változás. |

## F9.7.5.2 — ajánlatpiszkozat navigáció utáni helyreállítása

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Célzott Vitest | PASS | `quotation-draft-recovery.test.ts` + `unsaved-changes.test.ts`: 2 fájl / 6 teszt; helyi draft olvasás/írás, user/org/project izoláció, revízió mismatch, userváltás törlése, sérült JSON törlése, meglévő guard. |
| Typecheck / lint / production build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Mentés / történeti revízió | Kód szerint, adatbázissal nem ellenőrzött | Sikeres action eltávolítja recovery kulcsot; meglévő mentés változatlan `quote.version`-t küld, recovery csak kliensállapotot állít vissza. Nincs DB/RPC módosítás; immutabilitási tesztet vagy DB ellenőrzést nem futtattam. |
| Browser Back / visszatérés / explicit UI választás | UNVERIFIED böngészőben | Nem volt elérhető hitelesített browser tab, korábbi dev bind `EPERM`; automata teszt a tárolólogikát fedi, nem a valós history navigációt vagy kattintásos UI-t. Next 16.4 helyi docs alapján a `Link.onNavigate` kizárólag SPA Link navigációra vonatkozik. |
| Korlátok | Rögzített | Tab session végén/bezáráskor, tiltott vagy megtelt `sessionStorage` esetén draft elveszhet. Külső és browser-history navigáció nincs univerzálisan blokkolva; tárolható draft visszatéréskor explicit restore/discard döntést kap. |

## F9.7.6.1 — globális navigáció és standalone alapozás

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Fókuszált Vitest | PASS | `npx vitest run src/features/dashboard/dashboard.test.ts src/features/projects/project-navigation.test.ts src/features/execution/execution-overview.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 6 fájl / 28 teszt. Dashboard csak 5 tényleges területet hirdet, minden cél-URL viszi a kiválasztott szervezetet, nincs dokumentum-placeholder; projekt-navigáció és kivitelezés PASS; mindhárom kalkulátor projekt nélkül is renderel számítási felületet, miközben a mentés és takeoff UI rejtve marad. |
| Lint / build / typecheck | PASS | `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `npm run typecheck`. A production route-lista tartalmazza `/kalkulatorok`, `/ajanlatok`, `/kivitelezes` útvonalat és a meglévő projekt-route-okat. |
| `git diff --check` | PASS | A végső változtatáskészlet whitespace-ellenőrzése sikeres. |
| Szervezet és query-adatok | PASS, forrás + célzott teszt | Minden landing oldal `getProjectOrganization` tagság-kontextust használ és a választást az URL-en viszi tovább. A projektlekérdezés szervezet-szűrt; az execution overview csak `execution_plans.organization_id` szerint olvas metaadatot, majd az azonos szervezeti projektlistához mapeli. Meglévő RLS változatlan. |
| Jogosulatlan hozzáférés / adatbázis | Nem futott | Új route-ok membership selectiont és szervezet-szűrést használnak; pgTAP/RLS vagy Auth integráció nem futott. Runtime elutasításról nincs bizonyíték. Nincs migration, RPC vagy grant/policy változás. |
| Böngésző / reszponzív | Nem futott | CUA leltárban nem volt nyitott hitelesített tab. A korábban dokumentált dev-server bind `EPERM` hibáját nem ismételtem. Mobil/desktop tényleges render QA nincs; CSS forrás alapján grid breakpoint és mobil egymás alatti layout marad. |
| Standalone adatkonzisztencia | Stateless UI teszt + forrásvizsgálat + dokumentáció | Mindhárom kalkulátor csak a kliens oldalon számol és kifejezetten jelzi, hogy frissítéskor az eredmény elvész; save/transfer vezérlő nincs. Schema/RPC/képlet/árképzés nem módosult. `docs/STANDALONE_WORKFLOWS.md` rögzíti a `project_id`, immutable revízió/source, quotation finalization/PDF, RLS/FK és migrációs függőségeket. Standalone mentésre/projektkapcsolásra nem állítunk funkcionális PASS-t. |
| Teljes regresszió | Nem futott | A célzott teszt nem teljes regresszió; korábbi kalkulátor-, DB- és concurrency suite-okat nem ismételtem. |

Javasolt commit: `feat(F9.7.6.1): add global workflow navigation`.

## F9.7.6.2 — standalone ownership és globális tetőgeometria

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Geometriai preview és globális útvonal | PASS, célzott teszt + build | `npx vitest run src/features/roof-models/standalone-gable-preview.test.ts src/domain/calculations/gable-roof.test.ts src/features/dashboard/dashboard.test.ts`: 3 fájl / 10 PASS. Production build route-listája tartalmazza `/kalkulatorok/nyeregteto`; a preview meglévő `roof.gable` motort és `TechnicalDrawing` komponenst használ, mentési gomb nincs. Az első tesztfutás egy hibásan várt szöveget talált; címke/assertion pontosítása után az ismételt célzott futás PASS. |
| Ownership és sémaszerződés | Tervezési döntés | `docs/STANDALONE_WORKFLOWS.md`: standalone műhely + létrehozó tulajdon, csak aktív tagsággal a creator olvas; projekt rekordok a mostani tagsági szabályt tartják. Nincs migráció, DB-bizonyíték nincs. |
| Projekt és takeoff regresszió | Nem érintett, nem futtatott | Project-scope persistence, RPC, dependency, quotation és takeoff adatbázis-kód nem változott; teljes regresszió nem futott. |
| Typecheck / lint / build / diff-check | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. |
| Local Supabase / pgTAP | Meglévő tesztek PASS; standalone Auth/RLS nem tesztelt | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db`: 15 fájl / 434 teszt PASS kizárólag a helyi DB-n; reset és migráció nélkül. Ezek a meglévő projektmód szerződéseit fedik, nem bizonyítják az új standalone owner szabályt. |
| Standalone Auth/RLS / konkurencia | Nem implementált / nem ellenőrzött | Nincs új standalone RPC vagy sémaváltozás, ezért standalone izolációs és valódi párhuzamos mentési bizonyíték nincs. |
| Böngészős smoke | Nem futott | A CUA inventoryban nem volt browser tab, a globális route hitelesített szervezeti sessiont igényel; bejelentkezés és helyi szerverindítás nem történt. A source/build bizonyíték nem runtime browser/Auth bizonyíték. |
| Standalone persistence / association | Nincs implementálva | Ez a `.2` sématerv lépés; tényleges mentés/lista/reopen `.3`/`.4`, biztonságos project-link `.5`. A jelen milestone önmagában PARTIAL a teljes standalone követelményhez képest. |

Javasolt commit: `feat(F9.7.6.2): add global roof geometry preview`.

## F9.7.6.4 — standalone calculator frontend

| Terület | Eredmény | Bizonyíték / korlát |
|---|---|---|
| Standalone save/read/list UI | Kódszinten megvalósítva | A három meglévő editor az `saveStandaloneCalculationAction`-t hívja; a három route típushelyesen olvas; `/kalkulatorok/mentett` creator-scoped read modelből listáz és típus szerint szűr. |
| Célzott Vitest | PASS, 5 fájl / 23 teszt; 1 skip | `npx vitest run src/features/calculations/standalone-persistence.test.ts src/features/calculations/standalone-actions.local.integration.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts src/features/roof-models/standalone-gable-preview.test.ts`. Az első együttfutásban az opt-in Auth teszt SKIP; explicit bekapcsolva a Supabase CLI `docker.sock` permission denied miatt futása meghiúsult. |
| Typecheck | PASS | `npm run typecheck` külön, sikeres build után futott. Egy korábbi párhuzamos futás `.next/types` fájlgenerálási verseny miatt hibázott. |
| Lint / build / diff | PASS | `npm run lint`, `npm run build` (a `/kalkulatorok/mentett` route szerepel), `git diff --check`, `git diff --cached --check`. |
| Böngésző / fizikai mobil | UNVERIFIED | A CUA inventory nem tartalmazott tabot; hitelesített V1/V2 workflow, viewport és iPhone/iPad ellenőrzés nem történt. |
| Projektmód / roof preview | Kódszinten megőrizve | Projektmentési actionek elágazásai megmaradnak; roof preview-n nincs save action; pgTAP/backend nem változott és ebben a milestone-ban nem futott. |

Állapot PARTIAL, amíg az autentikált böngészős V1/V2 acceptance nem bizonyított. Javasolt commit: `feat(F9.7.6.4): integrate standalone calculator frontend`.

## F9.7.6.5.1 — standalone calculation project association (backend)

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Local migration history / apply | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase migration list --local`; new `20261014020000` ledger/RPC, `20261014020100` profile signature correction, and `20261014020200` append-only trigger applied with `supabase migration up --local`. Local only, incremental, no reset. |
| Local pgTAP authorization / provenance / regression | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/009_gutter_calculation.sql supabase/tests/database/011_flashing_calculation.sql supabase/tests/database/013_sheet_metal_profile.sql supabase/tests/database/016_standalone_calculations.sql supabase/tests/database/017_standalone_project_association.sql`: 5 files / 118 assertions. Covers exact revision and full source snapshot, org/creator/type, source immutability, privileged ledger UPDATE/DELETE rejection, cross-org destination, same-org noncreator, historical source, gutter/flashing/profile target contracts, same-key reuse and payload mismatch; existing project and standalone RPC regression. |
| Downstream project takeoff regression | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/010_gutter_takeoff_hardening.sql supabase/tests/database/012_flashing_takeoff_integration.sql supabase/tests/database/015_profile_takeoff_integration.sql`: 3 files / 94 assertions. Existing gutter/flashing/profile takeoff paths and approved record immutability remain intact; association itself creates no takeoff. |
| Authenticated Server Action | PASS | `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts`: 2 real local Auth users, 1/1 test. Owner associates; retry reuses; changed payload and nonowner source reject. Admin is limited to fixture/auth setup and cleanup. |
| Independent-connection idempotency | PASS | `SUPABASE_TELEMETRY_DISABLED=1 node scripts/verify-standalone-association-concurrency.mjs`: two authenticated PostgreSQL connections enter together with same operation/payload; one association row, one project revision, same target IDs, `reused=false/true`. Temporary DEMO project/source and helper objects are removed. |
| Focused TypeScript / typecheck / lint / build | PASS | Targeted standalone/domain Vitest: 4 files / 41 passed; default run skips the opt-in local Auth test, separately passed above. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) passed. |
| Browser / hosted / full historical suite | Not run | Backend-only milestone; no project picker yet. No hosted Supabase changes and no database reset. |

Állapot: **COMPLETE (BACKEND)**; a frontend workflow külön F9.7.6.5.2 mérföldkőben készült. Javasolt commit: `feat(F9.7.6.5.1): associate standalone calculations with projects`.

## F9.7.6.5.2 — standalone calculation project integration

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Entry visibility and current source contract | Automated, partial | Detail editors gate the action on a loaded saved current revision; the saved list passes only a current revision ID and supported calculator type. Historical selections and unsaved calculations do not provide this action. Confirmation component test covers exact V number and the explicit saved-revision choice for unsaved edits. |
| Project picker / access boundary | Implemented, automated not authenticated | Server action requires active organization membership and queries only same-organization, non-archived, non-DEMO projects; 50-row bound, name search, no customer fields. Actual RLS project selection was covered by earlier backend tests only at the association RPC boundary, not this new list action. |
| Confirmation, source preservation, stale context | Focused Vitest PASS | `npx vitest run src/features/calculations/standalone-project-association.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts`: 4 files / 22 tests. Operation identity helper preserves same operation and profile target IDs on retry and produces new IDs for a new intent. Existing action enforces current source and RPC errors map to Hungarian refresh/reconfirmation. No new DB write contract. |
| Returned project route and revision identity | Implemented, runtime unverified | Success navigation uses the returned target calculation and revision IDs. Existing gutter/flashing project pages check both IDs; profile page checks profile/revision and selects them. Project calculator route components/build pass; authenticated created-record route was not opened. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Authenticated browser / physical mobile | UNVERIFIED | CUA inventory showed no browser tab or authenticated session; no browser workflow was run. Physical iPad/iPhone QA remains separate. |
| Association history UI | Not implemented | No frontend ledger read model existed; no privilege was broadened. A source-history indicator remains a future enhancement. |

Állapot: **PARTIAL**. Automated evidence does not prove the authenticated browser acceptance. No pgTAP/Auth suite was rerun because backend contracts were unchanged. Javasolt commit: `feat(F9.7.6.5.2): integrate standalone project copies`.

## F9.7.6.3 — standalone calculation persistence

| Ellenőrzés | Állapot | Bizonyíték / korlát |
|---|---|---|
| Fókuszált TypeScript/domain | PASS | `npx vitest run src/features/calculations/standalone-persistence.test.ts src/domain/calculations/gutter-material.test.ts src/domain/calculations/flashing-material.test.ts src/domain/calculations/sheet-metal-profile.test.ts`: 4 fájl / 41 teszt. Input-engine recalculation, geometry-ref tiltás, incomplete flashing és null BA/K width. |
| Local Auth Server Action integráció | PASS | `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts`: 2 valós helyi Auth user, 1 teszt. Mindhárom save, gutter V1/V2 + stale conflict, input/output újraszámolás, owner list/read/current/history; same-org nem creator listája üres és közvetlen rekordolvasása null. Admin kizárólag fixture/auth setup és cleanup. |
| Local pgTAP / project regresszió | PASS | `SUPABASE_TELEMETRY_DISABLED=1 supabase test db --local supabase/tests/database/009_gutter_calculation.sql supabase/tests/database/011_flashing_calculation.sql supabase/tests/database/013_sheet_metal_profile.sql supabase/tests/database/016_standalone_calculations.sql`: 4 fájl / 88 assertion. Creator owner, cross-org/forged org/ID, geometry source, direct insert, revision immutability, incomplete result, stale conflict; projektmód gutter/flashing/profile megőrizve. |
| Valódi concurrency | PASS | `SUPABASE_TELEMETRY_DISABLED=1 node scripts/verify-standalone-calculation-concurrency.mjs`: két külön `authenticated` PostgreSQL kapcsolat egyszerre indul; pontosan 1 V2 siker, 1 stale konfliktus, két összrevízió, V1 input változatlan. Lokális random DEMO fixture a script végén törlődik. |
| Migration / adatbázis állapot | PASS, local only | Latest applied előzmény `20261013081700`; az új `20261014010000` incremental `supabase migration up --local` paranccsal került be. Reset, hosted DB és demo seed törlés nem történt. |
| Typecheck / lint / build / diff | PASS | `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check`. |
| Böngésző / teljes regresszió | Nem futott | Backend milestone, frontend UX későbbi `.4`; célzott pgTAP és TS nem teljes történeti regresszió. Hosted DB/Auth és backup/restore nem ellenőrzött. |

Javasolt commit: `feat(F9.7.6.3): persist standalone calculations`.

## F9.7.6.6.3.2a — quotation dokumentumadat-alap

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Lokális migráció | PASS | `supabase migration up --local`; 040000 adat-alap, 040100 RPC-kompatibilitás és 040200 kibocsátói e-mail constraint alkalmazva, reset nélkül. |
| Standalone quotation + dokumentum pgTAP | PASS | `018_standalone_quotations.sql` + `019_quotation_document_data.sql`: 62/62. Issuer oszlopok, owner/member RLS, email constraint, manual/linked recipient snapshot, V1/V2, date-only metadata, sequence RLS és nulla draft-allokáció. |
| Valódi local Auth | PASS | `RUN_LOCAL_QUOTATION_DOCUMENT_VALIDATION=1 node scripts/verify-quotation-document-auth.mjs`: 9/9 valódi JWT ellenőrzés, helyi DEMO fixture-ekkel. |
| Dokumentum readiness Vitest | PASS | Invalid date/issuer-email/recipient-email, issuer/recipient hiány, valid draft státusz és `canIssue: false`. |
| Érintett Vitest | PASS | 6 fájl / 25 teszt: readiness, standalone UI state, draft recovery, standalone domain, HUF money és secure UUID. |
| Typecheck / lint | PASS | `npm run typecheck`, `npm run lint`. |
| Production build | PASS | `npm run build`, Next.js 16.4 webpack; standalone quotation route-ok bekerültek. |
| Diff ellenőrzés | PASS | `git diff --check`. |
| Authenticated browser smoke | PASS, fókuszált | `/ajanlatok/uj`: DEMO kézi címzett + megjegyzés V1 mentés; visszaadott quotation ID: `ea895051-f0b0-4e21-a833-f40c8a001703`; reload után mezők visszatöltve; global list entry látható; existing project quotation editor megnyílt; server readiness action visszajelzett. Issuer profile böngészős módosítása, V2/history és mobil QA nem történt. |
