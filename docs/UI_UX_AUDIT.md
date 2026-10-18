# F9.40 — UI/UX audit (csak audit, kód nem módosult)

Dátum: 2026-10-18. Módszer: bejelentkezett helyi alkalmazás a beépített böngészőpanelben (1440 és 390 px, sötét és világos téma a reprezentatív képernyőkön), DOM-mérések JavaScripttel. Ez az audit a F9.39/F9.39.1 utáni állapotot értékeli.

**Jelölés:** **[M]** = mért/megfigyelt tény ebben a munkamenetben. **[J]** = szakmai javaslat vagy szubjektív megítélés. Nem vizsgált: fizikai eszköz, képernyőolvasó, kontrasztmérő, 768 px képernyőképek, a projekt-aloldalak és a mentett ajánlatszerkesztő.

Vizsgált képernyők: Műhely (+beállítások), Felmérések lista/új/szerkesztő, Kalkulátorok (tető, lépcső-választó), Anyaglisták (új + termékválasztó), Anyagkezelő, Ajánlatok lista/új, Munkanapló lista/részlet.

---

## 1. Összbenyomás

A vizuális alap erős és összetartó: Liquid Glass felület, narancs akcentus, pontrács-háttér, következetes sötét/világos téma. A F9.39-es javítások után a keretek, a fejléc→tartalom ritmus és a beállítások popover professzionális. A fennmaradó gondok **nem a stílusban, hanem az információs architektúrában és a szerkesztő-oldalak ergonómiájában** vannak: a hosszú, egyoszlopos szerkesztők a fő műveletet (mentés) az oldal aljára teszik, sok az egyforma súlyú lenyíló sor, és a tipográfia nem tokenekből épül. A rendszer „prémium panelekből álló alkalmazás”, még nem „egy vérből való termék”.

Értékelés (szubjektív [J]): vizuális minőség 8/10, navigáció 7/10, szerkesztők használhatósága 5/10, akadálymentesség 6/10, rendszerkonzisztencia 6/10.

---

## 2. Konkrét problémák

### P0 — a fő munkafolyamatot akadályozza

**U1. A felmérés mentése az oldal alján van [M].** — ✅ **MEGOLDVA (F9.40.1):** sticky mentési sáv állapottal és egyetlen „Mentés” gombbal.
`/felmeresek/[id]` 1440 px-en 2802 px magas; a „Felmérés mentése” és „Munkanapló létrehozása” a „Következő lépések” blokkban az oldal legalján (scrollY ≈ 1900), nem sticky. A fejlécben nincs mentés vagy állapotjelző (csak a „V1”, kis betűvel), a rajz melletti „Nem mentett előnézet” felirat apró és narancs.
Miért gond: a mérés közben a felhasználó nem látja, hogy van-e mentetlen változás, és mentéshez végig kell görgetnie. Konvenció: szerkesztőknél a mentés/állapot a fejlécben vagy sticky sávban van.
Javaslat [J]: sticky fejléc-sáv „Mentve · V1 / Nem mentett változások” állapottal és egyetlen elsődleges „Mentés” gombbal; a „Következő lépések” blokk maradjon az alján, de másodlagos.

**U2. A mérőmező-sor szűk és zsúfolt [M].** — ✅ **MEGOLDVA (F9.40.1):** címke fölül, egység-badge, egy „⋯” menü, asztalon rajz a mezők mellett (sticky).
Az első szakasz 3 mérőmezője ~85 px széles inputtal, a címkék 2–3 sorba törnek („DEMO tető külső hossza · mm”), minden mező mellett két ikongomb (beállítás, törlés) ismétlődik. Közben az oldal 1152 px széles, és a rajz a bemenetek **alatt** van, ezért módosításkor a rajz kikerül a képből.
Javaslat [J]: asztalon kétoszlopos elrendezés (balra mérések, jobbra sticky élő rajz); a mezőnkénti műveletek egyetlen „⋯” menübe; a címkék a mező fölött, teljes szélességben, a „DEMO” előtag külön jelvényként.

### P1 — jelentős következetlenség vagy használhatósági hiba

**U3. Két különböző „vissza” komponens [M].** — 🟢 **VIZUÁLISAN EGYSÉGESÍTVE (F9.40.5):** a `.back-link` (≈20 fájl, kézzel írt `<Link>`) és a megosztott `BackNavigation`/`.back-navigation` komponens most azonos kompakt Liquid Glass pirulát kap közös CSS-ből (`globals.css`: alap üvegfelület, backdrop-filter, csökkentett-átlátszóság/kontraszt/forced-colors fallback is megosztva); JSX és feliratszöveg (`Műhely áttekintése` / `Vissza a műhelyhez` stb.) egyelőre eltér — a ~20 fájl `BackNavigation`-re váltása és a feliratminta egységesítése külön feladat.
Eredeti [M]: Legtöbb oldalon kompakt pirula (`.back-navigation`), az új ajánlatnál 1152 px széles teljes sáv (`.back-link`, mérve 1152 px). A felirat is változó („Műhely áttekintése” / „Vissza a műhelyhez” / „Vissza az ajánlatokhoz” / „Munkanaplók”).
Javaslat: egy `BackNavigation` komponens, szabályos felirat-minta: „← {szülő neve}”.

**U4. Tipográfiai skála nem tokenizált [M].**
_🟡 **RÉSZBEN (F9.40.3):** `--tp-fs-*`/`--tp-fw-*`/`--tp-lh-*` tokenek a `globals.css` végén; közös fejlécek, gombok, mezőcímkék, lenyílók és `small` átállítva. A modul-specifikus, kézzel írt méretek (~200 szabály) fokozatosan migrálandók._Mért értékek: az ajánlat „Ártételek” h2 32 px/400-as súllyal, máshol a címsorok 700-as súlyúak; a beviteli mezők szövege 800-as súllyal (a beírt érték vizuálisan egyforma a címkével); gombok 13,1 px, `small` 12 px, a mezőcímkék a képernyőképeken ~11–12 px. Mobilon a mezők 16 px-esek (jó), asztalon ugyanez a méret és a 13 px-es gombok aránytalanok.
Javaslat: típus-tokenek (display/h1/h2/h3/body/label/caption), beviteli érték 500–600-as súly, címke 600; minimum 13 px tartalmi szöveg.

**U5. Ismétlődő és redundáns címsorok [M].** — 🟢 **RÉSZBEN KÉSZ (F9.40.5):** a Munkanapló részlet „Napi bejegyzések” lenyíló címe és a belső duplikált `<h2>Napi bejegyzések</h2>` közül az utóbbi eltávolítva (`execution-planning.tsx`); az „Ártételek” felirat már korábban (F9.40.4) megszűnt, csak „Tételek” maradt. A felmérés-fejléc „V1” apró szövege és a verzió→jelvény átalakítás nem része ennek a körnek.
Eredeti [M]: Munkanapló részlet: a „Napi bejegyzések” lenyíló címe és a belső címsor azonos. Új ajánlat: „Tételek” felirat alatt „Ártételek”. A felmérés-fejlécben a „V1” verzió a cím alatti apró szövegként él.
Javaslat: egy szint egy címke; a verzió/állapot kerüljön jelvénybe a fejlécben.

**U6. Túl sok, egyforma súlyú lenyíló sor [M].** — 🟢 **KÉSZ a szerkesztőre (F9.40.2):** a Név/munkatípus/sorrend, Megjegyzés és Fotók-hozzárendelés egyetlen „További szakaszbeállítások · Opcionális” csoportba került (alcímekkel, nem beágyazott panelekkel); a Tetőmodellhez mentés és Korábbi projektkapcsolat a „További műveletek · Opcionális” csoportba. A mérések, a rajz és a Mentés változatlanul elöl.
A felmérés-szerkesztőben egy szakaszon belül ≥ 8 `<details>` (Név/munkatípus/sorrend, Tetőforma, Szarufák, Tetőfedés, Megjegyzés, Fotók, Tetőmodellhez mentés, Fotók hozzáadása, Korábbi projektkapcsolat). Mind ugyanolyan kinézetű sáv, így a felhasználó nem tudja, mi kötelező és mi opcionális.
Javaslat [J]: kötelező lépések kinyitva, opcionálisak egy „További beállítások” csoportban; opcionális jelzés egységes jelvénnyel; tabok vagy lépésjelző a szakaszokra.

**U7. A „Következő lépések” blokkban nincs egyértelmű elsődleges művelet [M].** — 🟡 **RÉSZBEN (F9.40.1):** a mentés kikerült a blokkból a sticky sávba; a blokk többi eleme változatlan.
Öt egyenrangú elem (összesítés, mentés, munkanapló, csatolás, fotók, projektkapcsolat); az „Felmérés összesítése” egy apró gomb egy széles sávban.
Javaslat: egy elsődleges (Mentés), a többi másodlagos vagy a „⋯” menüben; kártyák helyett szöveges listaelem-műveletek.

**U8. Az új ajánlat oldalán a lebegő mentés takarja a tartalmat [M].** — ✅ **KÉSZ (F9.40.4):** `QuotationSaveBar`, helyfoglaló sticky sáv állapotjelzéssel.
A `standalone-save` sticky pirula jobb alul a becslés-kártya fölé úszik, 1440 px-en a kártya címe mellett.
Javaslat: sticky alsó műveletsáv saját háttérrel és helylefoglalással (padding-bottom), vagy fejléc-mentés (lásd U1).

**U9. „Hibás adat” állapotjelző üres, opcionális csoporton [M].** — ✅ **KÉSZ (F9.40.4):** érintetlen csoportnál „Nincs megadva”.
Új önálló ajánlat: „Címzett és dokumentumadatok · Opcionális” mellett piros hangvételű „Hibás adat” (a domain készenléti állapotból jön). Tiszta űrlapon ez félrevezető.
Javaslat: üres opcionális szekciónál „Nincs megadva” semleges jelvény; a hibajelzés csak szerkesztés után. (Üzleti logikához nem nyúlni, csak megjelenítés.)

**U10. Lebegő méretező gomb mobilon még mindig takar [M].** — ✅ **MEGOLDVA (F9.40.7):** a gomb már nem tűnik el; `chooseFloatingPlacement` (`src/lib/floating-control-placement.ts`) a látható viewportban (`visualViewport`, billentyűzet- és safe-area-inset figyelembevételével) szabad helyet választ: alapértelmezett jobb-alsó, ha foglalt, a megtartott szabad hely, majd felemelve/bal oldalon; ha minden foglalt, a legkevésbé fedő pozíció. Akadályok: sticky mentősávok, rajz-eszköztár, mezők, lenyíló-összefoglalók, gombok, dialógusok, nav. Beállítások/funkció változatlan; ≥701 px-en továbbra is a fejléc beállításai.
Eredeti [M]:
Az F9.39 óta kisebb és üveg-stílusú, de 320–390 px-en tartalom fölé kerül (szöveg alatt/mellett), és az akadályfelismerés csak beviteli elemekre/gombokra figyel.
Javaslat: a gomb költözzön a fejléc beállításai közé mobilon (ott már van méretezési csoport), vagy kerüljön a lap alján fix, helyet foglaló sávba.

**U11. Akadálymentesség [M].** — 🟡 **RÉSZBEN (F9.40.2):** a felirat nélküli elem a rejtett fájlválasztó volt (`aria-label` + `tabIndex=-1` kapott); rajzvezérlők 44×44 px; jelölőnégyzetek 44 px magas címkében, 20 px-es dobozzal. Skip-link ✅ (F9.40.3: `Ugrás a tartalomra`, minden `main#main-content`). Lenyílók: natív `details/summary`, címsorszintet nem kapnak (gomb-szemantika).
- Nincs „Ugrás a tartalomra” hivatkozás.
- A felmérés-szerkesztőn 1 felirat nélküli beviteli elem.
- Rajz-vezérlők (nagyítás, illesztés, visszaállítás) 42×38 px, a ~44 px cél alatt.
- A jelölőnégyzetek 18×18 px (a címkével együtt kattinthatóak, de külön is kicsik).
- Címsorszintek: H2→H3→H4 az editorban hierarchikusak, de a lenyílók a címsorokat nem tükrözik.
Javaslat: skip-link a gyökér layoutba, mezőfelirat-ellenőrzés, 44 px minimális vezérlők, `aria-live` a mentés-állapotra.

### P2 — finomítás

**U12. Az oldalbetöltés „halvány” állapota [M].** A Műhely csempéi és a munkanapló-részlet tartalma a betöltés után 1–2 másodpercig halványan látszik (belépő animáció), több képernyőkép is félig áttetsző tartalmat mutatott. Érzékelt lassúság.
Javaslat: ≤ 120 ms, csak `opacity`, `prefers-reduced-motion` esetén kikapcsolva; vagy elhagyható.

**U13. Szinte üres asztali Műhely [J].** 1440 px-en a 6 csempe a viewport felső 45%-át foglalja; alatta üres tér. Az „Aktuális munkák” fül mögé rejti a legfontosabb napi információt (folyamatban lévő munkanaplók).
Javaslat: az asztali nézetben a csempék alatt/mellett „Folytatás” lista (legutóbbi felmérések, nyitott munkanaplók).

**U14. Munkanapló részlet sorrend [J, részben M].** A napi bejegyzések előbb jönnek, mint a feladatok (a „Feladatok” a hajtás alatt); a KPI-k apró kártyák balra. A napi munka természetes belépési pontja a feladatlista és az új bejegyzés.
Javaslat: Feladatok + „Új bejegyzés” elsődleges, bejegyzés-napló alatta; KPI-k egyetlen soros állapotsor.

**U15. A „Kalkulátor váltása” mobilon lenyíló, asztalon oldalsáv [M].** Működik, de a kategória-tabok + kereső + lista három szintet ad egy egyszerű számításhoz [J].

**U16. Betöltési állapotok [M].** Az Ajánlatok „Önálló ajánlatok” szekció kliensoldali betöltésnél „Ajánlatok betöltése…” szöveg, nem vázlat (skeleton), ezért ugrál az elrendezés.

---

## 3. Javasolt közös tervezési rendszer-fejlesztések

1. **Típus-tokenek:** `--tp-font-display/h1/h2/h3/body/label/caption` méret, súly, sormagasság; a komponensek ezekből építkeznek (U4).
2. **Egy lapváz komponens** (`PageShell`): vissza-navigáció + oldalfejléc (cím, állapotjelvény, elsődleges művelet) + tartalom; ebből szűnik meg a `.back-link` / `.back-navigation` kettősség (U3).
3. **`EditorHeader`:** sticky fejléc-sáv mentés-állapottal (Mentve / Nem mentett / Hiba) és elsődleges mentés gombbal; felmérés, ajánlat, anyaglista, munkanapló szerkesztőben közös (U1, U8).
4. **`FormField`:** címke fölül, súgó/hiba alatta, kötelező/opcionális jelvény egységesen; beviteli mezők egységes magassága és szövegsúlya (U2, U4).
5. **`Disclosure` hierarchia:** elsődleges (kötelező, nyitott) és másodlagos (opcionális, „További beállítások”) variáns (U6).
6. **`StatusBadge`:** semleges / siker / figyelmeztetés / hiba; az üres opcionális állapot semleges (U9).
7. **Lebegő rétegek tokenje:** `--surface-popover` használata minden dialógusra és popoverre (fiók, termékválasztó, megerősítés).
8. **Mozgás-token:** egy belépő animáció, ≤ 120 ms, reduced-motion tiszteletben tartásával (U12).
9. **CSS-adósság:** a `globals.css` (~4,5 ezer sor) rétegezett felülírásait komponensenként kell összevonni; az üvegszint-listák (`:is(...)`) helyett komponens-szintű osztály (`.glass-surface`, `.glass-surface--flat`).

---

## 4. Javasolt megvalósítási sorrend

1. **EditorHeader + mentés-állapot a felmérés-szerkesztőben** (U1, U7, U8) — legnagyobb napi hatás, kis kockázat (csak elrendezés).
2. **Felmérés mérés-szekció átrendezése** asztalon két oszlopra, mezőnkénti menü (U2, U6).
3. **Típus-tokenek és FormField** bevezetése, majd a címsor- és súlyeltérések javítása (U4, U5).
4. **PageShell / egységes vissza-navigáció** (U3).
5. **Akadálymentességi csomag:** skip-link, 44 px vezérlők, címke-hiány, `aria-live` (U11).
6. **Munkanapló és Műhely tartalmi sorrend** (U13, U14) — előbb termékdöntés.
7. **Mobil méretező gomb áthelyezése**, betöltési vázlatok, animáció-csökkentés (U10, U12, U16).
8. **CSS-konszolidáció** komponensenként a fentiekkel együtt (3. pont/9).

## 5. Amit érdemes békén hagyni

A beállítások popover, a geometriai eredménykártya (nagy érték + 5 mutató), a kalkulátor-választó ikonok, az anyaglista-termékválasztó és a Műhely csempék már jó minőségűek; ezeket csak a tokenek átállításakor szabad érinteni.

---

## F9.40.7 — mobil kör (390/320/768 px mérés, helyi, bejelentkezve) — 2026-10-18

**[M]** mért képernyők: Műhely, felmérés-szerkesztő, kalkulátorválasztó + tető, anyaglista (új), Anyagkezelő, új ajánlat, Munkanapló. Mind a három szélességen **nincs vízszintes túlcsordulás**, a vezérlők ≥40 px-esek, kivéve:
- **Javítva:** Anyagkezelő gyártó-`summary` és felmérés „Kapcsolt régi adatok” link 24 px magas → 44 px (≤1023 px vagy `pointer: coarse`); 9.6–11 px-es szövegek (kategória-számláló, állapot-/kategória-pill, szakasz-számláló, termékkód, anyaglista-mezőcímkék és eyebrow) legalább .75rem (a felhasználó szövegméret-skálája alkalmazva).
- **Nem módosítva (szándékos):** kategória-sáv vízszintesen görgethető (csak a konténeren belül, oldal nem); a felmérés-fejléc „Vissza” gombja mobilon teljes szélességű (közös `GlassPageHeader`, nem érintettem); ≥701 px-en a lebegő gomb rejtett, a méretezés a fejléc beállításaiban érhető el.
- **Nem mért:** fizikai billentyűzet/safe-area (a böngészőpanel nem emulálja; a logika a `visualViewport`-ra épül, egységteszttel fedett), sötét téma képernyőnként, Munkanapló/Anyagkezelő mélyebb állapotai, dialógusok pixelpontos elhelyezése.

---

## F9.41 — Liquid Glass rendszer-egységesítés — 2026-10-18

**Módszer:** minden aktív útvonal (42 `page.tsx`) forrásszintű leltára + számított-stílus audit a böngészőben (felület/gomb/mező sugár és magasság, átlátszatlan hátterek, h1 méret, túlcsordulás) ~30 útvonalon, világos témában (1024–1440 px); sötét téma képernyőképpel a reprezentatív képernyőkön. **[M]** mért, **[F]** csak forrás.

**Közös gyökérokok és javítás (in-place, nincs új override-réteg):**
1. **Hardcode-olt világos státusz-/hiba-panelek** (`#fff7ed`, `#fef2f2`, `#dcfce7` stb.; `.profile-warnings/errors`, `.flashing-errors`, `.login-error`, `.preparation-stale-banner/missing`, `.status-*`, `.preparation-state/category`, `.drawing-state`) sötét témában félreillettek → új `--tone-success/warning/danger/info` tokenek (a meglévő `--success/--warning/--danger/--info`-ból, mindkét témában); elhalt duplikált szabályok és külön sötét felülírások törölve.
2. **Sugárskála:** 15 különböző `border-radius` érték (.55–1.6rem) → 4 token: `--radius-control` (.7), `--radius-panel` (.9, új), `--radius-popover` (1), `--radius-card` (1.25); ~190 deklaráció átírva. Mérés után a felületek 20/16/14,4 px, a mezők mind 11,2 px (korábban 8,8–12 px).
3. **Mezők**: komponens-szintű `.65/.75/.55rem` sugarak felülírták az alap `input/select/textarea` szabályt → 35 szabály tokenre; profil-szerkesztő „Anyagszükséglet” mezői (24 px, keret nélkül) és a Munkanapló fotószűrők (38 px) stílusa/magassága javítva.
4. **Oldalfejlécek:** Lemezprofilok, Szegélykalkulátor, Ereszcsatorna-kalkulátor (h2, h1 nélkül), Cserepeslemez-fedés (16 px h1), projekt Anyagkimutatás/Ajánlatok régi `project-detail-header` blokkja → közös `GlassPageHeader`; a halott `.profile-header` CSS törölve.
5. **Vissza-navigáció (U3 JSX):** 17 fájl kézzel írt `<Link className="back-link">` → közös `BackNavigation` (GuardedLink). Egyetlen `.back-link` gomb maradt (`standalone-project-association`, vezérlő-callback).
6. **Érintési célok/szöveg:** `.text-action/.text-button`, checkbox/rádió-címkék 44 px (≤1023 px vagy `pointer: coarse`); `.status-pill`, `.preparation-state`, eyebrow-ok ≥ .75rem; login-gomb sugara a vezérlő-tokenre.

**Lefedettségi tábla (útvonal-családok):**

| Család | Útvonalak | Állapot |
| --- | --- | --- |
| Műhely, beállítások, popover/dialógus | `/`, fejléc-beállítások, `AnchoredPopover`, megerősítő dialógus | [M] már egységes (F9.39); tokenek változatlanok |
| Felmérések | `/felmeresek`, `/uj`, `/[id]` (+ kalkulátor-aloldal) | [M] egységes; sugarak tokenre, két oszlop és sticky sáv változatlan; sötét ✔ |
| Kalkulátorok | `/kalkulatorok`, `nyeregteto`, `ereszcsatorna`, `lemezprofilok`, `cserepeslemez`, `szegelyek`, `epitesi`, `mentett` | [M] frissítve (fejlécek, panelek, mezők); `epitesi`/`szegelyek` szervezet-választó nélkül átirányít [F] |
| Anyag | `/anyagkezelo`, `/anyagok/*`, `/anyaglistak*` | [M] egységes; kis szövegek, 44 px sor |
| Ajánlatok | `/ajanlatok`, `/uj`, `/[id]`, projekt `ajanlatok` | [M] frissítve (fejléc, vissza, panelek); sötét ✔ (`/uj`) |
| Munkanapló | `/kivitelezes`, `/uj`, `/[id]` | [M] frissítve (mezők, checkbox-sorok); sötét ✔ |
| Projekt-aloldalak | `/projektek/[id]`, `anyagkimutatas`, `beszerzes`, `szegelyek`, `ereszcsatorna`, `lemezprofilok`, `tetomodellek/*` | [M] anyagkimutatás/ajánlatok/lemezprofilok/ereszcsatorna; `tetomodellek/*`, `beszerzes` csak sugár-audit [F] |
| Ügyfelek, új projekt | `/ugyfelek*`, `/projektek/uj`, `/projektek` | átirányítanak a Műhelyre [M]; űrlap-kód [F] |
| Auth és hibaállapotok | `/bejelentkezes`, `auth-state-card`, `error.tsx`, `NoOrganizationAccess` | [F] kód/CSS (tokenizált hibaüzenet, gombsugár); kijelentkezett állapot nem renderelve |
| Demo | `/demo/meretezes` | [M] sugár-audit; vissza-gomb egységesítve |

**Maradt:** `.login-card`/auth-state h1 (2–3,3 rem) szándékosan hero-méret; a modul-specifikus fix betűméretek migrálása tokenekre (U4); `.text-button` Nyomtatás sor tabletnél csak a fenti média-szabályon át; a kijelentkezett/hiba/üres állapotok és a dialógusok minden változata nem lett renderelve; sötét téma teljes képernyő-mátrixa nem készült; ~4,6 ezer soros `globals.css` rétegei továbbra is léteznek (csak a bizonyítottan ütköző szabályok lettek összevonva).
