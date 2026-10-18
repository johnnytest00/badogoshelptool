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

**U3. Két különböző „vissza” komponens [M].**
Legtöbb oldalon kompakt pirula (`.back-navigation`), az új ajánlatnál 1152 px széles teljes sáv (`.back-link`, mérve 1152 px). A felirat is változó („Műhely áttekintése” / „Vissza a műhelyhez” / „Vissza az ajánlatokhoz” / „Munkanaplók”).
Javaslat: egy `BackNavigation` komponens, szabályos felirat-minta: „← {szülő neve}”.

**U4. Tipográfiai skála nem tokenizált [M].**
Mért értékek: az ajánlat „Ártételek” h2 32 px/400-as súllyal, máshol a címsorok 700-as súlyúak; a beviteli mezők szövege 800-as súllyal (a beírt érték vizuálisan egyforma a címkével); gombok 13,1 px, `small` 12 px, a mezőcímkék a képernyőképeken ~11–12 px. Mobilon a mezők 16 px-esek (jó), asztalon ugyanez a méret és a 13 px-es gombok aránytalanok.
Javaslat: típus-tokenek (display/h1/h2/h3/body/label/caption), beviteli érték 500–600-as súly, címke 600; minimum 13 px tartalmi szöveg.

**U5. Ismétlődő és redundáns címsorok [M].**
Munkanapló részlet: a „Napi bejegyzések” lenyíló címe és a belső címsor azonos. Új ajánlat: „Tételek” felirat alatt „Ártételek”. A felmérés-fejlécben a „V1” verzió a cím alatti apró szövegként él.
Javaslat: egy szint egy címke; a verzió/állapot kerüljön jelvénybe a fejlécben.

**U6. Túl sok, egyforma súlyú lenyíló sor [M].**
A felmérés-szerkesztőben egy szakaszon belül ≥ 8 `<details>` (Név/munkatípus/sorrend, Tetőforma, Szarufák, Tetőfedés, Megjegyzés, Fotók, Tetőmodellhez mentés, Fotók hozzáadása, Korábbi projektkapcsolat). Mind ugyanolyan kinézetű sáv, így a felhasználó nem tudja, mi kötelező és mi opcionális.
Javaslat [J]: kötelező lépések kinyitva, opcionálisak egy „További beállítások” csoportban; opcionális jelzés egységes jelvénnyel; tabok vagy lépésjelző a szakaszokra.

**U7. A „Következő lépések” blokkban nincs egyértelmű elsődleges művelet [M].** — 🟡 **RÉSZBEN (F9.40.1):** a mentés kikerült a blokkból a sticky sávba; a blokk többi eleme változatlan.
Öt egyenrangú elem (összesítés, mentés, munkanapló, csatolás, fotók, projektkapcsolat); az „Felmérés összesítése” egy apró gomb egy széles sávban.
Javaslat: egy elsődleges (Mentés), a többi másodlagos vagy a „⋯” menüben; kártyák helyett szöveges listaelem-műveletek.

**U8. Az új ajánlat oldalán a lebegő mentés takarja a tartalmat [M].** — ⚪ Nyitva (az ajánlat-szerkesztő nem része az F9.40.1-nek; a felmérés-szerkesztő sávja a minta).
A `standalone-save` sticky pirula jobb alul a becslés-kártya fölé úszik, 1440 px-en a kártya címe mellett.
Javaslat: sticky alsó műveletsáv saját háttérrel és helylefoglalással (padding-bottom), vagy fejléc-mentés (lásd U1).

**U9. „Hibás adat” állapotjelző üres, opcionális csoporton [M].**
Új önálló ajánlat: „Címzett és dokumentumadatok · Opcionális” mellett piros hangvételű „Hibás adat” (a domain készenléti állapotból jön). Tiszta űrlapon ez félrevezető.
Javaslat: üres opcionális szekciónál „Nincs megadva” semleges jelvény; a hibajelzés csak szerkesztés után. (Üzleti logikához nem nyúlni, csak megjelenítés.)

**U10. Lebegő méretező gomb mobilon még mindig takar [M].**
Az F9.39 óta kisebb és üveg-stílusú, de 320–390 px-en tartalom fölé kerül (szöveg alatt/mellett), és az akadályfelismerés csak beviteli elemekre/gombokra figyel.
Javaslat: a gomb költözzön a fejléc beállításai közé mobilon (ott már van méretezési csoport), vagy kerüljön a lap alján fix, helyet foglaló sávba.

**U11. Akadálymentesség [M].**
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
