# Bádogos HelpTool — Claude Code fejlesztői átadás

**Állapotfelmérés:** 2026-10-17  
**Cél:** önálló folytatás a repóból, a korábbi Codex-beszélgetések ismerete nélkül.  
**Hatókör:** a jelenlegi kód és dokumentált bizonyíték; a blueprint tervezési alap, nem funkciólista.

## A. Cél és jelenlegi állapot

A TetőPro munkanév alatt futó Bádogos HelpTool napi bádogos/tetőfedő munkához készülő magyar webalkalmazás. A cél a felmérés, a geometriai és anyagmennyiségi számítás, anyag-előkészítés, ajánlat és kivitelezési dokumentáció egyszerűsítése, kevés ismételt adatbevitellel. Az egyszerű felmérés vagy számítás nem igényel minden esetben projektet vagy teljes tetőmodellt.

A repó működő, moduláris Next.js alkalmazást, lokális Supabase-adatmodellt, Auth/RLS útvonalakat, sok célzott matematikai és adatbázistesztet tartalmaz. A legutóbbi dokumentált fejlesztési állapot az **F9.37.3**; azóta az F9.38.x kalkulátorikon-sorozat és az **F9.39/F9.39.1** megjelenítési finomítás (csak UI; a `liquid-glass-react` rim réteg megszűnt, tokenek: `--tp-stack*`, `--surface-popover`) készült, részletük a `PROGRESS.md` elején. Ez nem jelenti, hogy a termék production/pilot-ready: hosted telepítés, backup/restore, adatvédelmi döntések, cross-org staging-bizonyíték, fizikai mobil/terepi QA és szakmai/jogi review blokkoló marad. Lásd [`PILOT_READINESS.md`](PILOT_READINESS.md).

## B. Elkészült fázisok és mérföldkövek

- **F9.40.7 (legutóbbi):** mobil kör: U10 lebegő méretező gomb intelligens áthelyezése (`chooseFloatingPlacement`, visualViewport/safe-area, nem tűnik el), sub-12 px szövegek és 44 px célok közös CSS-ben; 390/320/768 px mérés. Csak megjelenítés. Nyitva: fizikai billentyűzet/safe-area próba, sötét téma mobilon, mobil „Vissza” gomb kompaktabbá tétele, U3 JSX-konszolidáció. F9.40.6: felmérés-szerkesztő asztali két oszlop (sticky rajz a bal oszlop végéig). Commitolva nincs.
- **F9.40.5:** `docs/UI_UX_AUDIT.md` alapján: F9.40.4 mentés/újratöltés böngészőben igazolva (standalone szerkesztő); U3 vissza-navigáció (`.back-link` / `BackNavigation`) vizuálisan egységesítve közös Liquid Glass CSS-sel (JSX-duplikáció és feliratminta még nyitott); U5 Munkanapló „Napi bejegyzések” redundáns belső `<h2>` eltávolítva. Nyitva: U10 (mobil méretező gomb áthelyezése), U11 fennmaradó tételei, U3 JSX-konszolidáció, projekthez kötött ajánlat-szerkesztő és CONFLICT-eset böngészős próbája. Commitolva nincs.
- **F9.40.4:** közös `QuotationSaveBar` (önálló + projekthez kötött ajánlat-szerkesztő), „Nincs megadva” semleges jelvény érintetlen dokumentumcsoportra, hiányzó ár kiemelése. F9.40.5-ben böngészőben igazolva (standalone szerkesztő mentés/újratöltés); projekt-szerkesztő böngészős mérése továbbra is nyitott. Commitolva nincs.
- **F9.40.3 (legutóbbi):** tipográfiai tokenek (`--tp-fs-*`, `--tp-fw-*`, `--tp-lh-*`) a `globals.css` végén, skip-link a gyökér layoutban, minden `<main id="main-content">`. Nyitott: a modul-specifikus fix betűméretek migrálása tokenekre; bejelentkezett oldalak böngészős tipográfia-újramérése. Commitolva nincs.
- A `PROJECT_BLUEPRINT.md` F0–F11 fázisterve jóváhagyott célarchitektúra. A tényleges repo több későbbi fázis funkcióit megvalósította; a blueprint tervezett elemei nem tekintendők késznek.
- Adatbázis-alap, Auth, projektek/ügyfelek, revíziózott számítások, anyagkatalógus, anyagkimutatás, ajánlat és kivitelezés kódja/migrációja jelen van; részletek a [`DATABASE.md`](DATABASE.md) fájlban.
- Az F9.32 helyi napi workflow riport felmérés → anyaglista → ajánlatpiszkozat → munkanapló kapcsolatokat validálta, a korábbi útvonalak korlátaival.
- F9.33 közös geometriai összesítést adott; F9.34 lefedettségi állapot **PARTIAL**.
- F9.35.1 faanyag-kiosztás/mennyiségek: domain, survey snapshot, rajz és célzott helyi ellenőrzés **IMPLEMENTED / STABILIZÁLVA**; statikai és tényleges fizikai tagozás nem igazolt.
- F9.36.1 alátét mennyiségi alap: gable/shed/hip geometriai csíkozás és 1D vágási minimum **IMPLEMENTED**, de a vágási minimum nem beszerzési mennyiség. Többi geometria nem támogatott. Az F9.36.2 2D lemezkiosztás csak specifikáció, még nem implementáció.
- F9.37.3 háttér és Safari `Script`-renderelési hiba: a dokumentált fókuszált ellenőrzések PASS; mobil/reduced-motion runtime teljes mátrix nincs.

- F9.40.2 felmérés-szerkesztő: fotómentés igazolva (feltöltés → Mentés → újratöltés: hozzárendelés megmarad); `ensureSaved`/`saveForNavigation` figyeli a `photoAssociationPending`-et; másodlagos szakaszok csoportosítva (U6), fájlválasztó címke és 44 px célok (U11). Csak megjelenítés; célzott tesztek, typecheck, lint PASS.
- F9.40.1 felmérés-szerkesztő UX: sticky mentési sáv (állapot + egyetlen „Mentés”), `MeasurementField` (címke fölül, egység-badge, „⋯” menü), ≥1024 px-en mezők + sticky rajz két oszlopban. Csak megjelenítés; célzott tesztek, typecheck, lint és böngészős save/reopen PASS; teljes `npm test`/build nem futott. Részletek: `PROGRESS.md` F9.40.1. A többi audit-pont (U3–U6, U9–U16) nyitott.

A legfrissebb bizonyítékot mindig a [`PROGRESS.md`](PROGRESS.md) elejéről, a tesztadatot a [`TEST_MATRIX.md`](TEST_MATRIX.md) mérföldkő-szakaszaiból olvasd.

## C. Jelenleg meglévő felhasználói funkciók

| Funkció | Jelenlegi állapot |
|---|---|
| Hitelesített dashboard és szervezetválasztás | Megvalósított helyi flow; hosted onboarding és szervezeti adminisztráció nem igazolt. |
| Helyszíni felmérés | Önállóan is indítható, szakaszos, verziózott input/fotó, közös geometriai előnézet, támogatott számítás- és follow-up kapcsolatok. A fizikai mobil/gyenge hálózati elfogadás hiányzik. |
| Projektek és tetőmodellek | Adatmodell és projekt-alútvonalak élnek; tetőmodell-revízió, geometria és kapcsolt számítások vannak. A globális `/projektek` és `/ugyfelek` belépők átirányítanak; teljes lista/ügyfél CRUD felületként ne hivatkozz rájuk. |
| Kalkulátorok | Tető, csatorna, szegély, profil, fedés, lépcső, beton és alapozás kalkulátorok. Egyes típusok menthetők/revíziózhatók; a tárolási/anyagátadási támogatás kalkulátoronként eltér. |
| Anyagkezelő és listák | Kategória, termék, változat, árverzió; önálló/workflow anyaglista, támogatott anyagkimutatás és beszerzési CSV. Minden kalkulációs forrásból nincs automatikus lista. |
| Ajánlatok | Projektajánlat revízió/állapot/PDF; standalone HUF DRAFT és piszkozat-PDF előnézet. Standalone kiállítás/finalize és adólogika nincs; nincs VAT-számítás. |
| Kivitelezés | Terv/munkanapló, feladat, napi bejegyzés, fotó, felmérés-kapcsolat és belső PDF dokumentáció. Nem hivatalos e-építési napló. |
| UI preferenciák | Sötét/világos téma, skálázás, Liquid Glass közös komponensek és háttérmozgás preferencia. Desktop F9.37.3 ellenőrzött; teljes mobil és akadálymentességi mátrix nincs. |

Teljes funkció-/forrásleltár: [`../funkciok.md`](../funkciok.md). A fő route-ok és adatfolyamok: [`PROJECT_MAP.md`](PROJECT_MAP.md).

## D. Befejezetlen részek, ismert hibák és blokkolók

- **Pilot/üzemeltetés:** hosted/staging környezet, titokkezelés, TLS, backup és restore-próba, RPO/RTO, monitorozás és incidensfolyamat nincs bizonyítva.
- **Adatvédelem:** valós ügyfél/helyszínadat jogalapja, adatmegőrzés, törlés/export, fotó EXIF/GPS-kezelés még döntésre vár. A feltöltő nem bizonyítottan tisztítja az EXIF-et.
- **Szakmai/jogi határ:** számítások geometriai/mennyiségi segédek, nem statikai vagy gyártói megfelelőség. Dokumentumok belső piszkozatok/összefoglalók, ahol a kód így jelöli; nincs általános hivatalos kiállítási folyamat.
- **Árajánlat:** standalone DRAFT PDF nem végleges ajánlat. VAT/áfa, automatikus nettó-bruttó váltás, hivatalos számkiosztás, standalone finalize/issuance nincs.
- **Adatfolyam:** anyaglista/ajánlat átadás forrásonként támogatott, nem univerzális. A pontos forrásrevíziót, mértékegységet, árat és stale állapotot minden bővítésnél ismét ellenőrizni kell.
- **Tető:** általános aszimmetrikus eltérő hajlás, teljes L/T szerkesztő, fizikai lemezkiosztás és optimalizálás nincs. Alátét tekercsszám vágási minimum. A gyártói átfedés, hulladék, rögzítők, statika és beszerzési normák ellenőrzött input nélkül hiányoznak.
- **UX/QA:** fizikai terepi mobil, gyenge hálózat, screen reader, hosted Auth/RLS és teljes migrációs replay nem igazolt.
- **Navigáció:** `/projektek`, `/projektek/uj`, `/ugyfelek/**` jelenlegi legacy/redirect állapot; a projektadattábla és egyedi projektmunkaterület ettől még létezik.
- **Korábbi regressziók:** az F9.31 legacy kalkulátor-író/RLS problémáit a dokumentáció szerint restricted writer útvonalakkal javították; az F9.37.3 Safari nyers-script hibáját Next `Script` használat javította. Ezek előzmények, nem jelenlegi reprodukált hibák. Nincs a repóban egyetlen naprakész, összes aktív szoftverhibát tartalmazó issue-lista.

Részletes pilot kapuk és a bizonyíték osztályozása: [`PILOT_READINESS.md`](PILOT_READINESS.md), [`PRODUCT_READINESS_AUDIT.md`](PRODUCT_READINESS_AUDIT.md).

## E. Fontos technikai és üzleti döntések

- Felmérés önálló üzleti rekord lehet. Ne hozz létre dummy projektet; opcionális projektkapcsolat csak explicit felhasználói művelet.
- Kalkulációk, surveyk, ajánlati sorok/összegek és forrásadatok verziózott snapshotok. Történeti revisiont ne szerkessz helyben; változás új revízió.
- Szervezet és actor ellenőrzés szerveroldali, RLS/RPC határokkal. Kliensből érkező org/actor azonosító nem hiteles bizonyíték.
- Mentési retry operation ID-vel idempotens; expected version védi az ütközést. Azonos kulcs eltérő payloadja hibázzon.
- Anyag, katalógusár és forrás-revízió snapshotja történetileg stabil; későbbi katalógusváltozás nem írhatja át a korábbi listát vagy ajánlatot.
- Nem keverhető nettó és bruttó ár; HUF szerződés és kerekítés a DB/domain dokumentumok szerint. Nincs áfakulcs vagy automatikus adóátváltás.
- Mért geometria, előzetes mennyiség, DEMO és kézi ár nem állítható be igazolt gyártói vagy beszerzési adatként.
- A kódban néhány író kizárólag restricted DB writer szereppel érhető el; ne állítsd vissza authenticated `EXECUTE` jogosultságukat.

## F. Megőrzendő architektúra

- `src/app/` csak route és kompozíció; üzleti képlet a `src/domain/` alatt.
- Feature felhasználási folyamat `src/features/` alatt; tárolási / session adapterek `src/infrastructure/` alatt.
- Domain számítás tiszta, determinisztikus TypeScript legyen; rajz a geometriai outputot ábrázolja, a zoom ne változtasson méretet.
- Schema-változtatás időbélyeges, additív Supabase migration; generated `database.types.ts` csak lokális séma alapján generálandó.
- Tartós írás: input allowlist/validáció, auth + org/actor, forrás FK/revízió, optimista verzió, idempotencia, immutable history és releváns pgTAP/integrációs ellenőrzés.
- Az aktív route-ot/importfüggést vizsgáld meg, mielőtt örököltnek tűnő fájlt vagy migrációt eltávolítanál.

## G. Fő felhasználói munkafolyamatok

1. Bejelentkezés → szervezet kiválasztása → dashboard.
2. Felmérés indítása → munkaszakasz és mért adatok/fotók rögzítése → mentett verziók közti váltás.
3. A felhasználó az adott szakasz alapján támogatott kalkulátort vagy összesítőt indít; a hiányzó adatot nem pótolja találgatás.
4. Opcionálisan projekt/tetőmodell, anyaglista, ajánlatpiszkozat vagy kivitelezési napló következik. A sikeres első lépés megmarad, ha downstream lépés hibázik; retry nem hozhat létre duplikátumot.
5. Támogatott számításból anyagkimutatási/anyaglista draft készül; felhasználó átnézi és ahol szükséges jóváhagyja, majd CSV-t kérhet.
6. Ajánlat és kivitelezési összefoglaló revíziózott dokumentumként olvasható/exportálható a saját állapot- és hozzáférési szabályai szerint.

Felmérésnél a szabad szakasznevek, hiányos piszkozat, önálló munkavégzés és a választható follow-up a legfontosabb UX-döntések. Részletes folyamat: [`STANDALONE_WORKFLOWS.md`](STANDALONE_WORKFLOWS.md), [`F9_32_END_TO_END_REPORT.md`](F9_32_END_TO_END_REPORT.md).

## H. Tervezett vagy még igazolandó irányok

Ezek **nem jelenlegi funkciók**; specifikáció vagy pilot-igény szerint kell priorizálni:

1. F9.36.2 fizikai lemezkiosztás/vágás: specifikáció a [`ROOF_CALCULATION_SPECIFICATION.md`](ROOF_CALCULATION_SPECIFICATION.md) végén.
2. Projekt/ügyfél általános kezelő UX: előbb termékdöntés a redirectelő régi belépőkről és az elvárt napi workflow-ról.
3. Standalone ajánlat kiállítás: VAT/jogi/pénzügyi szerződés, hiteles számozás, finalize és dokumentumarchívum nélkül nem implementálható biztonságosan.
4. Pilot-üzemeltetés: hosted környezet, auth/RLS/Storage cross-org ellenőrzés, backup/restore, adatvédelem, monitoring, mobil és gyenge hálózati elfogadás.
5. Anyagadatok és tetőmennyiségek további bővítése csak validált szakmai/gyártói adatforrás, unit, eredet és független számítási fixture mellett.

## I. Függőségek és kockázatok

- Fő runtime és fejlesztői verziók/függőségek a [`PROJECT_MAP.md`](PROJECT_MAP.md) táblájában; pontos deklaráció a `package.json`, telepített feloldás a lockfile.
- Next.js **16.4** útmutatóját kódmódosítás előtt olvasd el a `node_modules/next/dist/docs/` alól: API-konvenciók változtak.
- Supabase kliens és restricted writer külön jogosultságú; `.env.local` értékeit ne olvasd ki, publikált dokumentumba csak változónevet írj.
- Helyi migrációs ledger korábbi mérföldkövekben volt ellenőrizve; az aktuális gép runtime/DB állapota az átadás készítésekor nem lett újraindítva vagy módosítva.
- A szakmai szabály, ár, hivatalos adózási/dokumentumkövetelmény hiányzó domain adat; külső szakmai/jogi forrás és owner döntés szükséges.

## J. Következő logikus fejlesztési lépések

1. Kódmódosítás előtt olvasd a `CLAUDE.md`, az aktuális `docs/PROGRESS.md` eleje és az érintett specifikáció releváns részét; ellenőrizd a tiszta/dirty git-állapotot.
2. Ha a felhasználó folytatni kívánja az F9.36.2-t, indulj a specből: kézi polygonos teszt-orákulumok, felhasználható/névleges fizikai méret különválasztása, egyedi fizikai lemezek, gyártói provenance, korlátos exact-or-unsupported optimalizáció. Előbb auditáld a jelenlegi layout forrásait és íróit.
3. Másik termékfunkció előtt tisztázd a felhasználási célt, és ne vegyél fel új üzleti scope-ot magadtól.
4. Pilot előtt a [`PILOT_READINESS.md`](PILOT_READINESS.md) kritikus blokkolóit tulajdonossal és bizonyítékkal kell lezárni.

## K. Lokális fejlesztés és ellenőrzés

Előfeltétel Node.js/npm és a helyi Supabase CLI/Docker, ha DB is kell. Függőségek helyreállítása `npm ci`; publikus Supabase URL/key változók lokális konfigurációban szerepelnek (`.env.example`). Secret writer URL csak szerveroldali, soha ne másold ebbe a dokumentumba.

```bash
npm run dev
npm run lint
npm run typecheck
npm test -- src/domain/calculations/roof-geometry-results.test.ts
npm run build
npm run db:start
npm run db:test
```

A tesztparancs példája csak minta: az aktuális feladathoz választott pontos tesztútvonalat futtasd. A `db:reset` helyi adatot töröl és újraépít, csak eldobható helyi adatbázis és ellenőrzött szándék esetén használható. Távoli link/push/migráció nincs a normál helyi workflow-ban.

Az F9.39 UI-mérföldkő végén lefutott: teljes Vitest (726 PASS), typecheck, teljes lint, izolált production build és `git diff --check`; DB-teszt nem (nem érintett). A lint a harmadik féltől származó `.agent/.agents/.claude` skill-könyvtárakat az `eslint.config.mjs`-ben kizárja. Az UI-munka (F9.39) részleteit, korlátait és a nem ellenőrzött területeket lásd `PROGRESS.md` elején. A korábbi mérföldkövek ellenőrzései történeti bizonyítékok.

## L. Fontos dokumentáció

| Fájl | Mire használd |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Állandó Claude Code szabályok |
| [`AGENTS.md`](../AGENTS.md) | Projekt és Next.js agent szabályok |
| [`PROJECT_BLUEPRINT.md`](../PROJECT_BLUEPRINT.md) | Jóváhagyott termék- és célarchitektúra terv |
| [`funkciok.md`](../funkciok.md) | Jelenlegi route-, funkció- és fájlleltár |
| [`PROJECT_MAP.md`](PROJECT_MAP.md) | Tényleges stack, rétegek, útvonalak, adat- és biztonsági folyamat |
| [`PROGRESS.md`](PROGRESS.md) | Legfrissebb mérföldkő állapot és korábbi döntések |
| [`TEST_MATRIX.md`](TEST_MATRIX.md) | Futtatott teszt- ja browsertények, korlátok |
| [`DATABASE.md`](DATABASE.md) | Sémák, RLS, RPC, migrációk és perzisztencia |
| [`ROOF_CALCULATION_SPECIFICATION.md`](ROOF_CALCULATION_SPECIFICATION.md) | Tető számítási contractok és F9.36.2 terv |
| [`CALCULATION_ENGINE.md`](CALCULATION_ENGINE.md) | Számítási engine szerződés |
| [`CALCULATOR_MATH_VERIFICATION.md`](CALCULATOR_MATH_VERIFICATION.md) | Matematikai review/fixture állapot |
| [`CALCULATOR_COVERAGE_MATRIX.md`](CALCULATOR_COVERAGE_MATRIX.md) | Kalkulátor-lefedettség |
| [`STANDALONE_WORKFLOWS.md`](STANDALONE_WORKFLOWS.md) | Önálló adatfolyamok és ownership döntések |
| [`F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md`](F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md) | Legacy útvonalak/írók függőségei |
| [`F9_32_END_TO_END_REPORT.md`](F9_32_END_TO_END_REPORT.md) | Helyi napi workflow E2E bizonyíték |
| [`PILOT_READINESS.md`](PILOT_READINESS.md) | Pilot blokkolók és nem igazolt üzemeltetés |
| [`PRODUCT_READINESS_AUDIT.md`](PRODUCT_READINESS_AUDIT.md) | Termékérettségi audit |

## M. Nem megállapítható / újra ellenőrzendő információk

- Az átadáskor nem indítottam el helyi alkalmazást/DB-t; a jelenlegi port, seedelt rekordállapot és migrációs ledger tényleges állapotát újra kell olvasni, mielőtt DB feladat indul.
- Hosted/staging DB, Auth, Storage, build/deploy pipeline, prod secrets és valódi felhasználói adatok állapota ebből a repóból nem állapítható meg.
- Ügyfél/üzleti adatvédelmi jogalap, megőrzési idők és törlési folyamat; fotó EXIF/GPS kezelési döntés; támogatási csatorna; pilot szerepkörök és eszkalációs owner nincs döntve.
- Nincs jóváhagyott teljes, publikálható gyártói termék-/áradatkészlet, általános veszteségi norma, statikai vagy hidraulikai megfelelőség.
- Az ajánlat adózása, jogi státusza, hivatalos számozása, archiválása és standalone kiállítása nincs meghatározva/megvalósítva.
- A kód megléte önmagában nem bizonyítja, hogy minden régi route, szerverAction és migráció a hosted környezetben elérhető vagy helyesen alkalmazott.

---

**Átadási állapot:** a következő fejlesztő a kód, `CLAUDE.md`, [`PROJECT_MAP.md`](PROJECT_MAP.md), [`funkciok.md`](../funkciok.md) és a releváns specifikációk alapján el tudja kezdeni a munkát. Pilot-ready vagy production-ready állapot nem állítható.
