# P3.3 — Rajzos tetőmunkafolyamat hatékonysági terv

**Készült:** 2026-10-31 · **Státusz: TERV.** A **P3.3a és a P3.3b megvalósult** (lásd `docs/PROGRESS.md`); a P3.3c–f továbbra is terv. Séma, migráció és üzleti képlet nem módosult; commit, push, deploy nem történt.

**Bizonyítékalap:** `docs/ROOF_WORKFLOW_END_TO_END_DEMO_REPORT.md` (P3.1 mért E2E), `docs/PROGRESS.md` P3.2 bejegyzés, és a jelenlegi forráskód célzott olvasása:
`src/features/calculators/plan-field-transfer.tsx` (884 sor), `construction-suite.tsx`, `drawing-step-bar.ts`, `material-spec-editor.tsx`, `construction-workspace-memory.ts`, `src/features/roof-models/roof-workspace.tsx`, `src/app/globals.css` (`.plan-*`, `.app-nav`, fekvő breakpoint).

**Hatókör:** meglévő, működő munkafolyamat egyszerűsítése. Új kalkulátor, új felismerőmotor, új automatizáció, új UI-könyvtár és nagy React-refaktor nincs a tervben. A P3.2 biztonsági kapui és az M12.2 OCR-kapu (**BLOCKED**) változatlanok.

---

## A. Jelenlegi folyamat — mi bizonyított és mi szerkezeti tény

### A.1 Mért adatok (P3.1, bizonyított)

| Metrika | Mért érték | Forrás |
|---|---:|---|
| Vezérlőaktiválás V1 mentésig | ≥ 40 | DEMO E.1 |
| Kézi szöveg-/számmező-szerkesztés | 16 | DEMO E.1 |
| Ebből numerikus anyagparaméter | 14 | DEMO E.1 |
| Ebből geometriai méret | 0 | DEMO E.1 |
| Távoli panelváltás / görgetési szakasz | ≥ 7 | DEMO E.1 |
| Rajz tényleges mérete 375 px-en, 100%-on | ~295×209 px | DEMO E.2 |
| Nettó kézi mezőmegtakarítás a hagyományos úthoz képest | 3 | DEMO D.3 / E.1 |
| Fekvő mobil (812×375) tartalommagasság | ~320 px | DEMO E.3 |

Nem mért és nem becsült: tényleges időtartam, fizikai swipe-szám, valódi telefonos érintés (DEMO E.6: **NOT TESTED**).

### A.2 Szerkezeti tények a kódból (ellenőrzött olvasás)

1. **Egyetlen hosszú függőleges oszlop.** `RoofWorkspace` (`roof-workspace.tsx`) sorrendje: `context` → `measurements` → `drawing` → `results` → `actions`. A `construction-suite.tsx:652` ebbe a következőt teszi: `context = heading + PlanFieldTransfer + note`, `measurements = fieldsContent` (geometria + **anyagadatok**), `results = resultsContent + roofDrawings`, `actions = independentContent` (**mentés**). Mobilon ez egy darab, egymás alá tett blokksor — ez a ≥7 távoli görgetési szakasz közvetlen szerkezeti oka.
2. **A rajzpanel egyetlen `<details>`.** `plan-field-transfer.tsx:586`, benne: szakaszcsík, laptípus-lépés, szakaszlépés, T4 lépéssáv (`plan-step-bar`), vászon + eszköztár, gyorssáv (`plan-quick-bar`), teendők (`plan-todo`), felirat-hozzárendelő szerkesztő, átvezetés-előnézet, lépték-panel, feliratlista, forráslista. A rajz és a gyorssáv együtt már egy képernyőn van (`.plan-workspace`); minden más tőlük külön blokk.
3. **A rajzpanel már ismeri az eredményt, de nem mutatja.** A `calculation` prop be van kötve, és a panel **egyetlen** helyen használja: a „teljes tető” checkbox engedélyezésénél (`plan-field-transfer.tsx:647`). Tetőfelületet, szarufaszámot, lécsorszámot a panel nem jelenít meg → a szakember minden átvitel után a távoli eredményblokkhoz görget vissza ellenőrizni.
4. **A kalkulátormezők már megjelenhetnek a rajz mellett.** A `renderField` prop működik: T7 vezetett bekérés (`:796`) és a `cededFieldKey`-hez tartozó alapérték-mező (`:808`) a rajzpanelen belül renderel, a kalkulátorűrlapon pedig `is-ceded` mutatósor marad. Ezt a mintát **nem kell újra kitalálni**, csak kiterjeszteni.
5. **Távoli navigáció ma „ugró gomb”.** `scrollTo()` (`:556`) és két gomb a teendőblokkban: `construction-geometry-inputs`, `construction-material-inputs` (`:814–815`). A **mentési panelnek nincs `id`-ja** (`construction-save-panel.tsx:195`), ezért a mentésre ma nincs ugrási cél.
6. **Az anyagadatok 14 kézi mezője nem kényszer.** `material-spec-editor.tsx` kétmódú: „Anyagkezelő termékei” (`productMode`) vagy kézi `MATERIAL_SPEC_FIELDS` érték. A DEMO-ban azért volt 14 kézi mező, mert a DEMO-szervezet Anyagkezelőjében nem volt aktív, megfelelő termék (DEMO B.3). Termék kiválasztásával ugyanez 4 csoportnál 4 választás.
7. **Az anyagállapot már emlékezik — csak munkamenetig.** `construction-workspace-memory.ts`: a `materialByCalculator` modulszintű `Map`-ben él, kulcsa `userId:organizationId:calculationId ?? "new"`. A fájl saját `shortcut:` megjegyzése kimondja, hogy újratöltést nem él túl. Tehát: kalkulátorváltás és azonos munkameneten belüli új kalkuláció megtartja, böngészőfrissítés vagy másnapi munka **nem**.
8. **A fekvő mobil kétoszlopos elrendezése már megvan** (`globals.css:3960`, `@media (orientation: landscape) and (max-height: 520px)`), és helyesen számol a `--app-nav-bar` magassággal.
9. **Az alsó mobil navigáció opt-in — de csak szélesség alapján.** `globals.css:5207` `@media (max-width: 700px)`: `--app-nav-bar: 0px`, `.app-nav { display: none }`, kivéve `html[data-mobile-nav="visible"]`. A fekvő telefon viszont **812 px széles**, tehát a 700 px-es kapun kívül esik: a sáv megjelenik és a 375 px magasságból ~3,5rem-et elvesz. A P3.1 F.3 hibája tehát ma is él, de kizárólag ezért az egy breakpoint-feltételért.
10. **A lebegő, rajz fölé úszó gyorssáv már bizonyítottan rossz megoldás.** `globals.css:3857` kódmegjegyzése rögzíti: a `position: sticky; bottom: 0` áttetsző sávot visszavontuk, mert a PDF fölé szürke hasábként úszott és elnyelte az alatta lévő feliratok koppintásait. **Ezt a tervben nem javasoljuk újra.**
11. **Az alapértékek egyenként kérdezhetők.** `plan-todo` `unconfirmedAssumptions`: lista, soronként külön „0 mm elfogadása”, és egyszerre csak a `cededFieldKey`-hez tartozó mező renderel. A kód megjegyzése számot is ad: mind a négy mező kirajzolva a blokk 375 px-en 436 px-ről 724 px-re nőne.
12. **A mentési állapot szövege egyetlen állításra szorítkozik.** `construction-save-panel.tsx:169/194`: `Mentve · V{n}` — a rajzi munkamenet külön perzisztenciájáról a mentési blokk nem mond semmit (P3.1 F.4).

### A.3 A műveletszám szerkezeti bontása (becslés, nem mérés)

A ≥40 aktiválás nagyságrendi megoszlása a DEMO E.1 és a kód alapján:

| Csoport | Becsült aktiválás | Megjegyzés |
|---|---:|---|
| Anyagprofil kézi kitöltése (14 mező + fókuszváltások) | ~14–16 | Szakmailag kötelező adat, de **nem kell újra begépelni** |
| Anyagcsoport-kapcsolók és fektetési irány | ~4 | DEMO E.1 (hagyományos út: 3 + 1) |
| Laptípus, szakasz, fedettség, elnevezés | ~5 | Szakmai kapu, megtartandó |
| Kalibráció (2 referencia + ismert hosszak) | ~6 | Opcionális lépés, megtartandó |
| Gyorsátvitel (4 felirat + célmező + jóváhagyás) | ~6 | P3.2 után kapuzva, megtartandó |
| Alapérték-megerősítések | ~4 | Egyenként kérdezve |
| Görgetés/ugrás, eredményellenőrzés, mentés | ~5 | **Ez a navigációs veszteség** |

Látható, hogy a műveletszám **kétharmada szakmailag kötelező vagy adatbevitel**, és a valódi mozgatható tömeg két helyen van: az **anyagadat újrabegépelése** és a **navigációs veszteség**.

---

## B. Javasolt célfolyamat

A termékcél hat lépése (rajz megnyitása → szakasz → méretek ellenőrzése → hiányzó adat → áttekintés → mentés) **ma is ez a folyamat**; a terv nem a lépéseket cseréli, hanem a lépések közti távolságot és az ismételt adatbevitelt veszi ki.

| # | Lépés | Ma | Javasolt | Mi szűnik meg |
|---|---|---|---|---|
| 1 | Rajz megnyitása | „Rajzból indítok” → fájlválasztó | változatlan | — |
| 2 | Laptípus | oldalankénti megerősítés | változatlan | — (szakmai kapu) |
| 3 | Tetőszakasz + fedettség | kijelölés, név, fedettség | változatlan, de a lépéssáv kiírja a hiányt | — (szakmai kapu) |
| 4 | Méretek ellenőrzése | gyorsátvitel P3.2 kapukkal | változatlan, + **a panelen látszik az élő eredmény** | eredményellenőrző oda-vissza görgetés |
| 5 | Hiányzó geometriai adat | T7 vezetett bekérés a rajz mellett | változatlan | — (már jó) |
| 6 | Alapértékek | 4 külön megerősítés | **egy kártya, kiírt értékekkel, egy jóváhagyás** | 3 koppintás, de a döntés explicit marad |
| 7 | Anyagadatok | 14 kézi mező a rajztól távol | **„Legutóbbi anyagprofil betöltése”** egy explicit művelettel, utána csak az eltérő mező szerkesztése | ~13 kézi mezőbevitel az ismétlődő munkában |
| 8 | Eredmény áttekintése | távoli eredményblokk | részletes áttekintés marad ott; a **kulcsszám a rajz mellett** is látszik | 1–2 távoli görgetési szakasz |
| 9 | Mentés | legalsó blokk, ugrási cél nélkül | lépéssáv „Mentés” chip + teendőblokk ugrógomb | keresés/görgetés a mentésig |

**Kötelező marad** minden P3.2 kapu, a forrás–cél jóváhagyás, a mérés–felirat explicit összekapcsolás, az egység- és felülírási konfliktus, a rajztípus- és oldalazonossági kapu, a szakaszizoláció, a kalibráció/SHA-256 kötés, a T7 bekérés, a T10 dokumentumállapot és a mentési/jogosultsági szabályok. A terv egyetlen jóváhagyást sem vesz ki; a 6. pontban a négy döntésből egy művelet lesz, de **a négy érték kiírva, egy képernyőn, visszavonhatóan** marad.

---

## C. UI/UX-változtatások

### C.1 Élő eredménysáv a rajzpanelben (`plan-result-strip`)

A T4 lépéssáv (`plan-step-bar`) alatt, a vászon felett egy **egysoros, csak olvasható** csík: a `calculation` 2–4 kulcsszáma (tetőfelület, szarufa db, lécsor db vagy fedőtábla db), és utána a `calculation.completeness` állapotjelzése ugyanazzal a szóhasználattal, amit a távoli eredményblokk használ (`Előnézet`, `Nem igazolt fedettség`, `Részleges tetőszakasz`, `Teljes`).

- Nem kalkulátormező és nem szerkeszthető → **nem duplikál állapotot**.
- Nem rejt el figyelmeztetést: a részletes `statusChip`/indoklás és a limitációk a helyükön maradnak; a csík a rossz állapotot **jelzi**, nem elnyomja.
- Nem lebeg a rajz fölött (lásd A.2/10), hanem a meglévő `.plan-workspace` rácsban van; fekvőben a már létező jobb oszlop tetején.

### C.2 Lépéssáv: „Anyag” és „Mentés” lépés

`drawing-step-bar.ts` tiszta függvény, bővítése egyértelmű:

- új, nem opcionális `material` lépés (`state`: `nincs megadva` / `hiányos` / `kész`) ott, ahol az adott kalkulátor anyagot számol;
- új `save` lépés (`state`: `nem mentve` / `V{n}` / `menthető`), amely a már létező session-adatból jön.

A chipek a meglévő `scrollTo()`-val ugranak; a mentési panel megkapja a hiányzó `id`-t. A sáv továbbra is **csak jelent, nem kapuz** (ez a modul dokumentált szerződése).

### C.3 Anyagprofil újrahasználata

A `material-spec-editor.tsx` kézi módjában, csoportonként egy **explicit** művelet: „Legutóbbi kézi profil betöltése (<dátum>)”. Betöltés után a mezők normálisan szerkeszthetők, és a betöltött adat **ugyanazt a provenance-jelölést** kapja, amit a kézi adat ma: nem válik „Anyagkezelő-adattá”, nem válik gyártói adattá, és a `DEMO` jelölés sem tűnik el, ha abban az állapotban mentettük.

- **Nem automatikus.** Az előző munka számait soha nem írjuk be néma módon az új kalkulációba.
- A csík kiírja, honnan jött (`kézi profil, <dátum>`), és egy művelettel elvethető.
- Az Anyagkezelő-termék mód továbbra is **elsőbbséget kap** a felületen; ez a funkció azt a helyzetet oldja, amikor nincs megfelelő aktív termék.

### C.4 Alapértékek egy kártyán

A `plan-todo` meglévő `plan-assumptions` blokkja marad, de: a négy tétel **értékkel kiírva** egy kártyán, soronkénti külön gombok helyett egy „Mind a kiírt alapérték elfogadása (4)” művelet, és alatta változatlanul a soronkénti „valós érték megadása” út (a `cededFieldKey` mintával, egyszerre egy mezővel). A tömeges elfogadás **csak azt** fogadja el, ami a kártyán ki van írva; új tétel megjelenése újra jóváhagyást kér.

### C.5 Fekvő telefon: a navigációs sáv magasságfeltétele

A `globals.css:5207` blokk hide-szabálya kapjon a szélesség mellé magasság-feltételt is, a **már létező** `max-height: 520px` határral, hogy a fekvő telefon ugyanazt a viselkedést kapja, mint az álló. A `--app-nav-bar` így 0 lesz, és a már megírt fekvő kétoszlopos elrendezés (A.2/8) megkapja a ~56 px-et. A felhasználói preferencia (`data-mobile-nav="visible"`) változatlanul felülírja.

### C.6 Mentési állapot: két perzisztencia megnevezése

A mentési panelben a `Mentve · V{n}` mellé egy rövid sor: a kalkuláció revíziója mentve, a **rajzi munkamenet külön** él és nem része a V{n}-nek. Szövegváltozás, nem új mechanizmus.

### C.7 Amit kifejezetten nem javasolunk

- Új, hosszú wizard. A folyamat marad egy felület progresszív feltárással.
- Lebegő/sticky gyorssáv a rajz fölött (bizonyítottan rontott, A.2/10).
- A kalkulátor anyagmezőinek párhuzamos megjelenítése a rajzpanelben: 14 mező a `plan-todo`-ban mobilon elnyomná a vásznat (a kód saját 436→724 px mérése ugyanerről szól), és állapotduplikálás kockázatát hozná. Helyette ugrás + lépésjelzés.
- Bármilyen automatizmus, amely ellenőrizetlen műszaki adatot (OCR, feliratszemantika találgatása) megbízható bemenetként használ. Az M12.2 **BLOCKED**.
- Rajz és eredmény *egyidejű teljes* megjelenítése 375 px-en: a rajz így ~295 px magas lenne vagy kevesebb; a C.1 egysoros csík ennek az igénynek a reális változata.

---

## D. Technikai megvalósítás

| Feladat | Újrahasznosított | Célzott módosítás |
|---|---|---|
| C.1 eredménysáv | a már bekötött `calculation` prop, `calculation.completeness`, meglévő `formatNumber`, `.plan-step`/`.plan-alert-line` stílusok | új, ~15 soros read-only blokk a `plan-field-transfer.tsx` lépéssáv után + egy CSS-sor |
| C.2 lépéssáv | `drawing-step-bar.ts` tiszta függvény + meglévő tesztfájl, `scrollTo()`, meglévő chip-stílus | két új lépés a `DrawingStepInput`-ban; `id` a `construction-save-panel.tsx` gyökérszekcióján; a `PlanFieldTransfer` megkapja az anyag- és mentési állapotot (a `materials` prop már megvan, a mentési státuszhoz egy szűk, olvasó prop kell) |
| C.3 anyagprofil | `MATERIAL_SPEC_FIELDS`, `SpecState`, `switchSpecMode`, `restoreProductValues`, `construction-workspace-memory.ts` mintája | a kézi `SpecState` perzisztálása szervezetenként (a memória-modul `shortcut:` megjegyzése pont erre a bővítésre mutat); új „betöltés” művelet a `MaterialSpecEditor`-ban; a provenance-mezőket **nem** írjuk át |
| C.4 alapértékek | `unconfirmedAssumptions`, `confirmAssumption`, `cededFieldKey` | a `plan-assumptions` blokk átrendezése + egy tömeges hívás, amely a kiírt kulcsokon végigmegy |
| C.5 fekvő nav | meglévő `@media (max-width: 700px)` blokk és a létező 520 px-es határ | egy media-feltétel bővítése a `globals.css`-ben |
| C.6 mentési szöveg | `construction-save-panel.tsx` meglévő üzenetblokk | szövegsor |

**Amit nem nyitunk meg:** domain-számítás (`construction-computation.ts`), `approveDrawingFields` és a P3.2 kapuk, `drawing-quick-transfer.ts`, `drawing-calibration.ts`, `drawing-roof-work-session.ts` séma, `use-drawing-document.ts` életciklus, mentési RPC, Auth/RLS, migráció. Nagy komponensszétszedés és állapotgép-összevonás nincs a tervben; a `plan-field-transfer.tsx` törzse érintetlen marad a C.1/C.4 pontszerű beszúrásain kívül.

**Párhuzamos munka:** a közös munkafa megőrzendő; ha a fejlesztői szerver birtokolja a `.next`-et, a build/typegen izolált környezetben fusson (AGENTS.md).

---

## E. Mérhető sikerfeltételek

A „utána” oszlop **becslés**, nem mért tény. Mérés a P3.4 célzott böngészős újrajátszásban, ugyanazzal a fixture-rel (`tests/fixtures/drawings/roof-workflow-p31-demo.pdf`) és ugyanazon a 375×812 nézeten.

| Metrika | Előtte (mért) | Utána (becslés) | Hogyan igazolható |
|---|---:|---:|---|
| Vezérlőaktiválás V1-ig, **első** profilfelvétel | ≥ 40 | ~34–36 | ugyanaz a számolási mód, mint P3.1 E.1 |
| Vezérlőaktiválás V1-ig, **ismételt** munka kész profillal | ≥ 40 | ~20–24 | második kalkuláció ugyanazzal a profillal |
| Kézi mezőszerkesztés, ismételt munka | 16 | ~2–4 | profilbetöltés után csak az eltérő mező |
| Távoli görgetési/panelváltási szakasz | ≥ 7 | ~4–5 | ugyanaz a szakaszszámolás |
| Alapérték-megerősítő koppintás | 4 | 1 | a kártya egy művelete |
| Eredményellenőrzés a rajz elhagyása nélkül | nem lehetséges | lehetséges | C.1 csík a vászon mellett látszik |
| Fekvő mobil tartalommagasság (812×375) | ~320 px | ~375 px | `--app-nav-bar: 0` + meglévő kétoszlopos elrendezés |
| P3.2 biztonsági kapuk | PASS | **változatlan PASS** | a P3.2 célzott tesztfájlok (2 fájl / 57 teszt) és a C.2/F.1 böngészős kör újrafuttatása |
| Vízszintes túlcsordulás 375/812/1440-en | nincs | nincs | `scrollWidth === innerWidth` |
| Figyelmeztetés/DEMO-jelölés elrejtése | nincs | nincs | a betöltött profil provenance-ának ellenőrzése |

**Nem cél** az alacsonyabb műveletszám önmagában: egyetlen jóváhagyás elvétele sem számít javulásnak, és a C.4 sem csökkentheti a kiírt értékek láthatóságát.

---

## F. Prioritásos fejlesztési terv

Hat kis, egymástól jól elválasztható feladat. P3.3a és P3.3b egymástól független; P3.3d a P3.3a után ésszerű, mert ugyanaz a panelterület.

### P3.3a — Élő eredménysáv a rajzpanelben
- **Érték:** magas. Megszünteti az átvitel utáni oda-vissza görgetést, és egy téves átvitel (a P3.1-ben 85,45 → 170,91 m²) **azonnal látszik**.
- **Kockázat:** alacsony. Csak olvasó megjelenítés; a kockázat az, hogy félreérthetően „teljes eredménynek” tűnik → ezért kötelező az állapotjelzés ugyanazzal a szóhasználattal.
- **Függőség:** nincs.
- **Elfogadási feltétel:** a csík a vászonnal együtt látszik 375×812-en görgetés nélkül; `incomplete`/`invalid`/nem igazolt fedettség esetén a csík ezt kiírja; a távoli eredményblokk és minden limitáció változatlan; nincs új szerkeszthető mező.

### P3.3b — Fekvő telefon: navigációs sáv magasságfeltétele
- **Érték:** közepes, de a ráfordítás a legkisebb az egész tervben (egy media-feltétel).
- **Kockázat:** alacsony. Érinthet más, fekvőben használt oldalakat → ezeken ellenőrizni kell, hogy marad elérhető navigáció (fejlécen/visszanavigáción keresztül).
- **Függőség:** nincs.
- **Elfogadási feltétel:** 812×375-ben a `--app-nav-bar` 0, a rajz és a gyorssáv egy képernyőmagasságon belül; `data-mobile-nav="visible"` preferenciával a sáv visszajön; nincs vízszintes túlcsordulás; a fekvőben használt többi fő oldalon a navigáció elérhető marad.

### P3.3c — Anyagprofil újrahasználata (explicit átvétel mentett kalkulációból)

**Státusz: MEGVALÓSULT (2026-11-01).** A D1–D3 döntések jóváhagyva, a megvalósítás a meglévő „Adatok átvétele" úton történt; séma, RLS és képlet nem módosult, commit/push/deploy nem történt.

- **Érték:** a legnagyobb a tervben ismételt munkára: 14 kézi numerikus anyagmezőből 0, ha a korábbi munka mentve van.
- **Architektúra — nincs új tároló.** A mentett revízió `input_snapshot`-ja **már tartalmazza** a teljes anyagállapotot (`constructionInputSnapshot`: `material = { requested, layout, specs }`), és a `listRoofShapeTransferSources` már ezt a snapshotot olvassa vissza — eddig csak a `fields` ágát adta ki. A P3.3c ennek az **utolsó ágának a bekötése**. Nincs új tábla, migráció, RLS-policy, RPC, pgTAP és nincs domain-változás.
- **Újrahasználati szint: felhasználóhoz kötött** (D1). A forráslista `organization_id` + `ownership_scope = 'standalone'` + `created_by = auth.uid()` szerint szűr. Szervezeti szintű anyagprofil-tároló **már létezik**: a szervezeti Anyagkezelő (`material_products`, `productMode`); párhuzamos tárolót nem építünk (D3).
- **Jogosultsági bizonyíték (ellenőrzött, 2026-11-01):** `calculations_select_authorized` és `calculation_revisions_select_authorized` (`20261014010000`) standalone esetén `created_by = auth.uid()`-ra szűkít; `is_org_member` mindkettőben kötelező. **Fontos korlát:** a `calculations_linked_member_read` / `calculation_revisions_linked_member_read` (`20261025110000`) permissive policy egy kivitelezési tervhez linkelt `construction.%` kalkulációt a szervezet többi tagja számára is olvashatóvá tesz, ezért az RLS **önmagában nem** garantálja a creator-only kört. A forráslista felhasználói izolációját az alkalmazásszintű explicit `created_by` szűrő adja — ez nem távolítható el.

#### Döntések
- **D1 (jóváhagyva):** azonos kalkulátortípus korábbi mentett kalkulációja is forrás lehet. A kizárás a **most szerkesztett `calculationId`**, nem a kalkulátortípus. A meglévő mezőátvételi jogosultsági és forrásintegritási szabályok (`sourceCalculationRevisionId` guard, writer-provenance) változatlanok.
- **D2 (jóváhagyva):** egyetlen explicit anyagátvételi megerősítés, **alapból kikapcsolva**, előtte anyagcsoportonként rendezett teljes diff-előnézet. Látható: forráskalkuláció neve, `V{n}`, a **felhasznált revízió saját dátuma** (`calculation_revisions.created_at`, nem a kalkuláció `updated_at`-ja), mértékegység, termékazonosság és `DEMO`/gyártói eredet. A mező- és az anyagátvételi döntés elkülönítve marad.
- **D3 (döntés):** nincs automatikus DEMO-termékfeltöltés és nincs új katalógusfunkció.

#### Átviteli szerződés
- A `requested` anyagcsoport-választás **nem** másolható: az aktuális munka hatóköre.
- Átvihető: a célkalkulátor számára kompatibilis `specs` csoportok és a `layout`. `roof.timber-cutlist` → `rafter`, `batten`; `roof.material-takeoff` → `covering`, `underlay`, `rafter`, `batten`.
- `layout`: csak a forrásban tényleges értékkel szereplő kulcsok kerülnek át; meglévő érték nem törlődik hiányzó forrásértékkel.
- Üres (érintetlen) forráscsoport nem kerül át, így nem írhat felül meglévő anyagadatot semmivel.
- A `SpecState` egészben (mode + profileId + entered) kerül át, ezért a `source: "override"` és a `Visszaállít` út érintetlen marad.
- Az átvett `profileId` az **élő** katalógussal oldódik fel (`resolveMaterialSpec`). Ha a hivatkozott termék már nem aktív, az érintett csoport **egyértelmű hibával** jelenik meg az előnézetben és **nem kerül át** — néma kézi értékké minősítés vagy helyettesítés nincs.
- A `DEMO` és a `categoryMatch = false` jelölés az átvétel után újra kiértékelődik, tehát nem tud észrevétlenül gyártói adattá válni.
- A megerősítés előtti anyagállapot egyetlen művelettel pontosan visszaáll (`Visszavonás`).

#### Érintett fájlok
`src/features/calculations/construction-data.ts`, `src/features/calculations/construction-actions.ts`, `src/features/calculators/construction-field-transfer-control.tsx`, `src/features/calculators/construction-suite.tsx`. Domain, migráció, RLS, képlet, `initialMaterialState`, P3.2 kapuk és a mentési szabályok nem módosulnak.

#### Elfogadási feltétel
Anyagátvételi megerősítés nélkül az anyagállapot bitre azonos; megerősítés után minden mező szerkeszthető és a forrás, a revízió és a dátum kiírva; a `requested` nem változik; a `DEMO`- és provenance-jelölések megmaradnak; nem elérhető termék egyértelmű hibát ad; a `Visszavonás` a korábbi anyagállapotot pontosan visszaállítja; más felhasználó és más szervezet kalkulációja nem jelenik meg forrásként.

### P3.3d — Lépéssáv: „Anyag” és „Mentés” lépés + mentési ugrási cél

**Státusz: MEGVALÓSULT (2026-11-01).** Séma, RLS és képlet nem módosult; commit/push/deploy nem történt.

- **Érték:** közepes. Megszünteti a „hol van a mentés” keresést és kiírja, hogy az anyagadat hiányzik-e.
- **Kockázat:** alacsony, ha a sáv szerződése (csak jelent, nem kapuz) nem sérül.
- **Megvalósítás:** a sáv sorrendje `A lap → Szakasz → Lépték → Mezők → Anyag → Mentés`. Az „Anyag” lépés a kalkulátor saját `materialTakeoff.status`-át és feloldott `requested` értékét közvetíti, nem értelmezi újra; amíg a geometria hiányos, a kalkulátor nem állít anyagstátuszt, ilyenkor a lépés „még nem értékelhető”. A nem kért anyagcsoport `optional`, tehát sosem „következő lépés”. A „Mentés” lépés propja szándékosan szűk (`{ revisionNumber, dirty }`); a mentési kapu, a név, a konfliktus- és revíziókezelés a mentési panelé marad. A mentési panel megkapta a hiányzó `id="construction-save-panel"` ugrási célt.
- **Elfogadási feltétel:** a `drawing-step-bar` meglévő tesztjei zöldek, új lépésekre új esetekkel; a chipek a megfelelő szekcióhoz ugranak; a sáv semmit nem blokkol és nem állít kész állapotot, amit a kalkulátor nem állít; opcionális lépés nem lesz „következő lépés”.
- **Ismert ár és orvoslása (P3.3d.1, 2026-11-01, MEGVALÓSULT):** a sáv 375 px-en 4 chipről 6-ra, 210-ről 315 px-re nőtt. A P3.3d.1 ezt **161 px-re** vitte vissza: keskeny (`max-width: 63.999rem`) és fekvő (`orientation: landscape and max-height: 520px`) nézetben a chip alapból csak a lépés nevét és ikonját mutatja, az állapotot a „Következő" sor és minden chip `aria-label`-je viszi, a teljes lista pedig a „Minden állapot" kapcsolóval bontható ki. Széles nézetben a sáv változatlan, ott a kapcsoló nem is látszik. Lépéslogika, figyelmeztetések és mentési kapuk nem módosultak.

### P3.3e — Mentési állapot: két perzisztencia megnevezése

**Státusz: MEGVALÓSULT (2026-11-01).** Egy feltételes szövegsor a mentési blokkban és egy szűk prop; séma, RLS, képlet és mentési kapu nem módosult.

- **Érték:** közepes, kicsi munkával. P3.1 F.4 közvetlen orvoslása.
- **Kockázat:** alacsony (szöveg).
- **Függőség:** nincs.
- **Megvalósítás:** a sor **csak nyitott rajzi munkamenet mellett** jelenik meg (`drawingSession` prop; a hívó a `drawingDoc.file !== null || drawingDoc.sections.length > 0` feltételt adja át), így rajz nélkül a mentési blokk bitre a régi. A szöveg megnevezi, hogy a `V{n}` a kalkuláció mentett revíziója (mezők + anyagadat), és hogy a tervrajz, a tetőszakaszok és a léptékhitelesítés nem része. A folytatás kalkulátorfüggő és igazolt: `roof.material-takeoff`-nál van „Munkaállapot mentése" export, a `roof.timber-cutlist`-nél **nincs**, ezért ott a szöveg nem ígér külön fájlba mentést.
- **Elfogadási feltétel:** a mentési blokk egy sorban megnevezi, hogy a V{n} a kalkuláció revíziója, és a rajzi munkamenet külön él; a meglévő navigációs guard és a figyelmeztetések változatlanok.

### P3.3f — Alapértékek egy kártyán

**Státusz: MEGVALÓSULT (2026-11-01).** Séma, RLS, képlet, a `drawing-field-transfer.ts` alapérték- és mentésikapu-logikája, valamint a P3.3a–e eredményei nem módosultak.

- **Érték:** közepes (4 → 1 koppintás).
- **Kockázat:** közepes, mert jóváhagyási felületet érint. A tömeges elfogadás csak kiírt értékekre vonatkozhat, és új tétel nem kerülhet bele utólag.
- **Függőség:** P3.3a után (ugyanaz a `plan-todo` terület).
- **Megvalósítás:** a `confirmAssumption(key)` helyére `confirmAssumptions(keys)` lépett: **egyetlen atomi** `updateActiveSection`-hívás, amely a kulcsokat a teljesen kiírt `nextFields`-ből származó tokenekkel köti le (a token tartalmazza a tetőformát, ezért a sorban egymás utáni hívás elavult állapottal dolgozott volna). A kártya a kiírt értékeket és egy „Mind a kiírt alapérték elfogadása (n)" gombot ad; a soronkénti `cededFieldKey`-mező (valós érték megadása, egyszerre egy kérdés) változatlan.
- **Mért hatás 375 px-en:** az alapérték-blokk **504 → 373 px**, a „Teendők és figyelmeztetések" blokk **686 → 555 px**; elfogadás után a teendőblokk 267 px. Jóváhagyó koppintás: **4 → 1**.
- **Elfogadási feltétel:** a kártyán mind a négy érték ki van írva elfogadás előtt; az elfogadás csak ezeket érinti; új, nem megerősített alapérték újra kéri a jóváhagyást; a mentési kapu (`unconfirmedAssumptions` blokkolása) változatlanul működik; a soronkénti „valós érték megadása” út megmarad.

### F.1 Minden feladatra kötelező ellenőrzés

Célzott `vitest` az érintett fájlokra, `tsc --noEmit -p tsconfig.typecheck.json`, célzott ESLint, és a P3.2 C.2/F.1 biztonsági kör böngészős megismétlése a DEMO PDF-fel 375×812-en. A teljes P3.1 DEMO újrajátszása csak P3.3a+c+d együttes landolása után indokolt. A teljes `npm test` csak kódváltozás után futtatandó.

---

## G. Nyitott kérdések és korlátok

- **P3.3c tárolási helye eldöntve (D1–D3, 2026-11-01):** nincs új tároló; a meglévő mentett kalkulációk `input_snapshot`-ja a forrás, felhasználóhoz kötött körrel. Nyitott korlát: a forráslista felhasználói izolációját az alkalmazásszintű `created_by` szűrő adja, mert a `*_linked_member_read` policy a linkelt kalkulációkat szélesebb körben olvashatóvá teszi.
- **Valódi telefonos érintés** továbbra is **NOT TESTED**; a 295×209 px-es rajzon a közeli feliratok szétválasztása ujjal nem igazolt. A P3.2 jóváhagyó kapuja ezt kezeli, nem oldja meg; az érintési pontosság méréséhez fizikai eszköz kell.
- **M12.2 OCR műszaki pontosság: BLOCKED.** A terv egyetlen pontja sem támaszkodik OCR-re.
- **Több tetőszakasz, közös él/vápa:** NOT TESTED; a terv nem változtatja a szakaszizolációt és nem vezet be összesítést.
- A rajzos út **egyszerű, ismert tetőn továbbra is lassabb** lehet a hagyományos kalkulátornál (DEMO D.3). A rajzos út indoka a forrás-visszakövethetőség; a terv ezt nem fordítja meg, csak a különbséget csökkenti.
