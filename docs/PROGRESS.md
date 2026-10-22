# Fejlesztési előrehaladás és bizonyítékok

## F9.64 — Backend-, adatbázis- és renderelési teljesítményaudit

Státusz: **AUDIT COMPLETE — PASS WITH FINDINGS**. Kód- és migrációváltozás nélkül, külön production builden és helyi authenticated DEMO sessionben készült. Három read-only RLS `EXPLAIN (ANALYZE, BUFFERS)` terv lokálisan lefutott; a minimális adatmennyiség nem alkalmas production következtetésre. Két material/takeoff többletolvasási minta forrásból igazolt, runtime hatásuk nyitott. A böngészőben vizsgált dashboard, felmérés, kalkulátor és anyagkeresés működött; mért renderköltség nem igazolt szűk keresztmetszetet. CSS/GPU, mobil, quote/worklog runtime, memory-trend és szerveroldali route query-count nincs teljesen ellenőrizve.

- **Mérés:** dashboard 49 request, 293 670 B átvitel; DCL 179 ms, Load 330 ms. Survey input labor-INP 72 ms, CLS 0; kalkulátor eredmény és SVG helyesen frissült. Izolált build CSS: 553 474 B raw / 76 855 B gzip. Ezek egyetlen lokális DEMO session mérési adatai, nem production becslések.
- **Ajánlás:** külön F9.65 read-model optimalizálás a kalkulátor profil-only és takeoff kategória betöltéshez, előtte/utána azonos RLS alatt mért query/byte/idő adatokkal. Részlet/takeoff snapshot fallback optimalizálás külön követendő. Auth/cache, index és CSS módosításra nincs bizonyíték.
- **Ellenőrzés:** izolált `npm run build` PASS; 3 lokális read-only RLS query plan; célzott böngészős workflow-k. Teszt/lint/typecheck nem futott, adatbázis- vagy termékkód nem módosult. Részletes evidence, finding-kockázatok, tesztterv és mérési korlátok: [`docs/PERFORMANCE_AUDIT_F9.64.md`](PERFORMANCE_AUDIT_F9.64.md).
- **Skills/eszközök:** `ponytail`, `supabase`, `supabase-postgres-best-practices`, `build-web-apps:react-best-practices`, `build-web-apps:frontend-testing-debugging`; helyi Postgres read-only query plan, külön production build, Brave DevTools. Nincs telepítés vagy új plugin.
- **Javasolt Conventional Commit:** `docs: F9.64 record backend and rendering performance audit`

## F9.63.4 — Production kalkulátorbetöltés és lazy-loading megbízhatóság

Státusz: **PASS WITH FINDINGS**. Külön temp munkafán futtatott Next 16.4.2 webpack production build és 3100-as helyi szerver; a meglévő 3000-es dev szerver és annak `.next` könyvtára érintetlen maradt. Bejelentkezett helyi DEMO Brave sessionben a `/kalkulatorok`, kategóriachunkok, rajz betöltése, 375×812 deep link és 3G gyors kategóriaváltás működött. Egy concrete chunk DevTools blokkolása a kiválasztást megtartó, újrapróbálható hibaállapotot adott; a tiltás feloldása után 200-as válasszal helyreállt. Megerősített regressziót nem találtam.

- **Cold cache / production Network:** 1440px route load: 16 JS / 51 kérés; **233 906 B (~234 kB) JS** / **623 260 B** összes átvitel; DCL 179 ms, Load 297 ms. Stair: két chunk, 7 491 B átvitel; concrete definíció: 4 951 B; első rajz a teljesen cold 375×812 cölöp deep linken két chunk, 21 335 B. Ezek átviteli adatok, nem parse/execute idő és nem F9.63.2 manifest-gzip közvetlen összevetés.
- **3G + retry:** 5,75 s DCL / 17,51 s Load / 24,86 s hálózati Finish. Stair→concrete váltás alatt mindkét chunk pending volt; a kiválasztott concrete kalkulátor maradt aktív. Visszaváltáskor nem történt új chunkkérés. Blokkolt `7708…js`: UI `alert` + Retry, a szabály levétele után 200 OK és betöltött form; Console-ban csak az irányított blokkolás warningja volt.
- **Ellenőrzés:** izolált `npm run build` PASS; `npm test -- src/features/calculators/construction-calculator-loading.test.ts` PASS (1 fájl / 3 teszt); `git diff --check` a dokumentáció véglegesítése után. Teljes suite/lint/typecheck, CPU/Performance trace, INP/CLS, light theme és exact pending-request unmount race nem ellenőrzött. Részletes mátrix, forrás-review, korlátok és F9.63.2 baseline: [`docs/PERFORMANCE_VALIDATION_F9.63.4.md`](PERFORMANCE_VALIDATION_F9.63.4.md).
- **Döntés:** F9.63 kódszétválasztás funkcionális és hibatűrő elfogadása lezárható **PASS WITH FINDINGS** státusszal; runtime sebességelőny nem állítható. Következő ajánlott lépés: **F9.64 — RLS/query-plan és CSS/GPU audit, valós felhasználói mérés**; nem indítottam el.
- **Javasolt Conventional Commit:** `test: F9.63.4 validate production calculator loading`

## F9.63.3 — Kalkulátor runtime és betöltési validáció

Státusz: **PASS WITH FINDINGS**. A három kalkulátorkategóriát és a `concrete.pile` deep linket valós, hitelesített helyi DEMO-munkamenetben, Brave-ben ellenőriztem. Reprezentatív tető-, lépcső- és betoneredmények, rajzbetöltés, kategória- és history-navigáció, 375/768/1440 px-es reszponzív nézet és billentyűzetes kategóriaváltás működött; megerősített regressziót nem találtam.

- **Network (meleg cache, Next 16.4.2 dev/Turbopack, throttling nélkül):** `/kalkulatorok` 45 kérés / 24 JS, 25 131 B átvitel / 6 912 370 B erőforrás; a tető modul az induló naplóban jelent meg. Stair és concrete kiválasztás külön JS chunkkérést adott hozzá; ismételt stair-választás nem kért új chunkot. Érvényes cölöpbemenet után jelent meg a 309 kB-os fejlesztői rajzchunk. A 304-es válaszok és disk cache miatt ez nem cold vagy production átviteli mérés.
- **Forrás és ellenőrzés:** async ID-őr, kiválasztott kalkulátorhoz kötött betöltés és státusz/hiba/retry UI kódból ellenőrizve. `npm test -- src/features/calculators/construction-calculator-loading.test.ts`: 1 fájl / 3 teszt PASS; Console: 0 üzenet. Teljes teszt/lint/typecheck/build ebben a mérföldkőben nem futott.
- **Nem ellenőrzött:** production runtime/cold cache, lassított hálózatú race, chunkhiba és retry, teljes invalid input mátrix, kalkulátor input módosításának újraszámítása, React Profiler/long task/CLS/INP. Részletes környezet, Network értékek, mátrix, besorolás és követés: [`docs/PERFORMANCE_VALIDATION_F9.63.3.md`](PERFORMANCE_VALIDATION_F9.63.3.md).
- **Javasolt Conventional Commit:** `test: F9.63.3 validate calculator runtime loading`

## F9.63.2 — Kalkulátormotorok kategória szerinti lusta betöltése

Státusz: **megvalósítva és build-artifactokkal, valamint Vitesttel ellenőrizve**; a tényleges böngészős interakciót nem sikerült igazolni. A képletek, eredmények, azonosítók, katalógus, mentési/adatbázis-szerződések nem változtak. Nincs commit; az F9.63.1 és a korábbi munkafa-módosítások megmaradtak.

- **Előtte:** a `construction-suite.tsx` kliensmodul statikusan importálta mind a 31 kalkulátor definícióját/motorját, valamint a lépcső- és betonrajzokat. A kiválasztás szinkron `definitions[item.id]` lookup volt.
- **Utána:** a könnyű katalógus maradt a választó forrása; a tető, lépcső, illetve beton/segéd kategória definíciója külön dinamikus modulként, csak kiválasztáskor töltődik be. Az import eredményét a kijelölt azonosítóhoz kötjük; gyors váltásnál az elavult válasz nem írhatja felül az aktuálisat. A betöltésnek elérhető, újrapróbálható állapota van, amely `clamp(24rem, 58vh, 40rem)` minimális munkaterület-magassággal mérsékli az elrendezés-ugrást. A thumbnail közvetlenül a könnyű modulból érkezik, a lépcső- és betonrajzok csak a számított nézetnél töltődnek.
- **Build-artifact mérés, azonos `npm run build` / `next build --webpack` mód:** a Next client-reference manifest `construction-suite.tsx` bejegyzésének egyedi, statikusan hozzárendelt chunkjait a Node `zlib.gzipSync` mérte. A suite statikus chunkkészlete **359 264 B / 94 023 B gzip → 257 155 B / 78 218 B gzip**, azaz **−28,4% nyers / −16,8% gzip**. A route-specifikus chunk **204 604 / 54 876 → 105 864 / 30 472 B**, **−48,3% / −44,5%**; a hozzá rendelt megosztott chunkok együtt **154 660 / 49 147 → 151 291 / 47 746 B**. Ez manifest szerinti artifactméret, nem böngészőben mért hálózati átvitel, parse/execute idő vagy felhasználói sebesség.
- **Késleltetett chunkok:** tető definíció **5 282 / 1 879 B gzip**; lépcső definíció **24 993 / 6 894 B gzip** két szükséges chunkon; beton/segéd definíció **17 434 / 4 621 B gzip**. A rajzmodul további **76 939 / 20 719 B gzip** (a lépcső/beton rajzhoz közös chunkokkal), és csak a rajz megjelenítésekor kérődik le. A statikus suite chunklistában egyik kategóriadefiníció chunkja sincs benne; a buildelt route-loader ezeket kategóriánként aszinkron chunkként hivatkozza. A katalógus metaadatai továbbra is a kezdeti útvonal részei.
- **Szerződés/regresszió:** a 31 ellenőrzött katalógus-ID mindegyike a saját kategóriadefiníciójához oldódik; az invalid/default ID a korábbi `roof.rafter-cut` alapértelmezést használja. A mező-alapértékek és `advanced` jelölések, anyagállapot ID szerinti megőrzése, rajz- és számítási motorok változatlanok. Új reprezentatív szarufa- és cölöperedmény-paritásteszt. Két korábbi statikus HTML teszt most a mezőmetaadatot és a szerveroldali loading shellt ellenőrzi, mert a definíció csak kliensoldali aszinkron betöltés után áll rendelkezésre.
- **Ellenőrzések:** fókuszált 4 fájl / **115 teszt PASS**; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` **156 fájl PASS / 8 skip, 913 PASS / 19 skip** (a kiinduló 910 PASS-hoz képest 3 új); `npm run build` PASS; `git diff --check` a lezáró ellenőrzésben. A lokális production szerver elindult. Az IAB böngészőben a `/kalkulatorok` csak üres háttérrel és hozzáférési híddal jelent meg, kalkulátor DOM nélkül, ezért mobil/desktop, kategóriaváltás és Network/CPU runtime smoke **nem igazolt**; nem következtetek ennek okára.
- **Skill-ek:** `ponytail`, `build-web-apps:react-best-practices` (dinamikus import/splitting útmutató), `build-web-apps:frontend-testing-debugging` (a böngészőellenőrzés megkísérlése), `test-driven-development`, `verification-before-completion`, továbbá a telepített Next 16.4 lazy-loading útmutató. Külön böngésző-plugin nem volt az aktív eszközleltárban; új eszköz vagy függőség nem került telepítésre.
- **Korlát/következő lépés:** az induló UI a betöltés idejére rövid loading panelt mutat; a tényleges késleltetés és váltási élmény böngészőben még mérendő, a teljes matek/render kompatibilitást pedig nem bizonyítja kizárólag a loader teszt. Javasolt következő mérföldkő: **F9.63.3 — böngészős betöltési és navigációs mérés**.
- **Javasolt Conventional Commit:** `perf: F9.63.2 lazy-load calculator categories`

## F9.63.1 — Backend N+1 lekérdezések megszüntetése

Státusz: **implementálva és lokálisan ellenőrizve**. A két mentett fedéslista kalkulációazonosítók szerint batchben tölti a revíziókat, 1000 soros oldalazással, majd kalkulációnként a legfrissebb 100-at validálja és adja vissza. A felmérés nyeregtető-ellenőrzése három önállóan szervezeti hatókörű, legfeljebb 100 ID-s batchben olvassa a modellrevíziót, kalkulációs revíziót és dependency sort; az exact model–revision–calculation párosítás és az eredmény újraszámítása megmaradt. A dependency-kérdés explicit `organization_id` szűrést is kapott.

- **Lekérdezésszám (forráskódból számolt előtte, mockolt Supabase utána; nem DB-időmérés):** két számításnál a revíziókérés **2 → 1** (teljes lista a számításlistával együtt **3 → 2**); két jelölt modellnél az ellenőrzési hármas **6 → 3**. 1001 revíziónál a fedéslista két 1000-es oldalt kér le, és továbbra is pontosan a legfrissebb 100-at adja vissza. A lokális `max_rows = 1000` API-beállításhoz igazodik az oldalhatár.
- **Szerződés és biztonság:** a szervezet- és verziószűrés, validációs függvények, current revision ID kiválasztása, sorrend, 100/revízió limit és hiányzó/invalid/mismatch kizárás megmaradt. Nincs séma-, jogosultsági policy-, adat- vagy képletváltozás; snapshothoz nem ír.
- **Ellenőrzések:** célzott 6 fájl / 23 teszt PASS; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (**155 fájl / 910 PASS / 19 skip**, 8 további fájl skip); `npm run build` PASS; `git diff --check` PASS.
- **Skill-ek:** `ponytail` a minimális megvalósításhoz, `supabase` / `supabase-postgres-best-practices` a batch és org/RLS határokhoz, `test-driven-development` a regressziós tesztek piros-zöld ciklusához, `verification-before-completion` a lezáró ellenőrzéshez. Az aktív leltárt a `docs/AI_TOOLING.md` alapján ellenőriztem; további plugin vagy külső adatbázis-kapcsolat nem kellett.
- **Korlát:** nem futott valódi DB/RLS-integráció vagy production query-plan/időmérés; a query-count állításokat teszt-double-ok igazolják, nem valós Supabase-forgalom. Javasolt következő mérföldkő: **F9.63.2 calculator bundle splitting**.
- **Javasolt Conventional Commit:** `perf: F9.63.1 batch roof revision reads`

## F9.59 — Az F9.58 audit négy megerősített hibájának javítása

Státusz: **mind a négy javítás megvalósítva és böngészőben ellenőrizve**; geometriai képlet, mérési szerződés, revízió, jogosultság és adatbázis nem változott. Nincs commit. Az F9.52–F9.57 és a párhuzamos (Codex) mentetlen módosítások megmaradtak.

- **1. Anyagkezelő navigáció — gyökérok:** a `/anyagok` és a `/anyagkezelo` ugyanazt az oldalt rendereli (`MaterialManagerPage`), de a navigáció csak a `/anyagkezelo` útvonalat ismerte. Ezért a `/anyagok/[productId]` termékoldalon egyik menüpont sem volt aktív, és az oda mutató vissza-sor sem minősült duplikáltnak. **Javítás:** közös `src/components/navigation/routes.ts` alias- és aktívállapot-modul (`canonicalRoute`, `isRouteActive`, `isNavigationTarget`), amit a `BackNavigation` és az `AppNavigationLinks` is használ. A szervezet query paramétere, a `GuardedLink` viselkedés és az `aria-current` változatlan. 5 új teszt. **Böngészőben 1280 px-en igazolva:** a termékoldalon az „Anyagkezelő" aktív `aria-current="page"`-dzsel, a vissza-sor asztalon rejtett, 375 px-en látható.
- **2. Magyar validációs üzenetek — gyökérok:** a kalkulátor-űrlapok a Zod `issue.message` mezőjét írták ki nyersen, a Zod 4 pedig angolul fogalmaz (`Invalid input: expected number, received undefined`). Üres mezőre és nem numerikus értékre ugyanazt az `invalid_type` kódot adja, ezért a hiányzó bemenetet a nyers mezőszövegből ismerjük fel. **Javítás:** új `src/lib/validation-message.ts` a megjelenítés határán (a `userFacingActionError` mintájára); a Zod-sémák, a matematikai ellenőrzések és a `refine`-ok saját magyar szövegei **változatlanok**. Bekötve: `multi-roof-form`, `gable-roof-form`, `construction-suite`. A fokozatos validáció megmarad: kitöltetlen mezőre nincs mezőszintű hiba, és ha a mezőhöz nem tartozik hiba, nem jelenik meg üzenet. 6 új teszt. **Böngészőben igazolva:** üres mező → „Tető külső szélessége: Add meg a méretet."; `abc` → „Csak számot adj meg."; `999999` → „Az érték legfeljebb 100 000 lehet.".
- **3. Kis, nem nulla mennyiségek — gyökérok:** az F9.57-ben bevezetett rögzített két tizedes miatt egy valós, pozitív érték látszólag pontos nullaként jelent meg (0,004 m² → „0,00 m²"), ami összetéveszthető a „nincs"-csel. **Javítás:** a `quantity-format` küszöbjelölést ad, ha a kerekítés nullát adna, de az érték nem nulla: `<0,01 m²`, negatívnál `>-0,01 m`. A valódi nulla és a `-0` továbbra is `0,00`, a kerekítési határ (`0,005` → `0,01`) változatlan, egész felbontású mértékegységnél a küszöb egy egység (`<1 mm`). A számított és tárolt értékeket nem érinti. 6 új teszt. **Böngészőben igazolva:** 60 × 50 mm-es T alakú tető → „Teljes tetőfelület **<0,01 m²**", „Vízszintes vetület: **<0,01 m²**", „Legmagasabb geometriai pont: **<0,01 m**".
- **4. Méretező buborék átfedése — gyökérok:** az elhelyezési algoritmus akadálylistája engedélyezőlista volt néhány konkrét osztályra, ezért a sima gombok (pl. a „A két tetősík egyforma?" Igen/Nem), az adatforrás-jelölők és az eredménypanelek **nem** számítottak akadálynak; ha pedig sehol nem volt szabad hely, a legkisebb átfedésű helyre ült, azaz takart. **Javítás:** (a) az akadálylista minden kezelhető elemre kiterjed (`a[href], button, input, select, textarea, summary, [role=button], [role=dialog], [tabindex]`), plusz az adatforrás- és állapotjelölők — a projekt szabálya szerint figyelmeztetést és adatforrást nem rejtünk el; (b) a mobil navigáció magassága (`--app-nav-bar`) explicit tartalék, nem csak akadály; (c) ha nincs szabad teljes méretű hely, a vezérlő **a lapszélre dokkol**: a fele kicsúszik a nézetből, és csak egy keskeny fül marad bent, érintésre/fókuszra azonnal visszaáll. Nem tűnik el, mert a kalkulátorokban ez az egyetlen elérési pont. 5 új teszt a `chooseFloatingPlacement`-re. **Böngészőben 375 × 667-en igazolva:** a felmérés-szerkesztőn tíz görgetési pozíciót végigmérve mindössze két maradék átfedés volt, mindkettő **6 px széles sarok-sáv**, és mindkettőnél a dokkolt állapot lépett életbe; ahol van hely (felméréslista), a vezérlő dokkolatlan és teljes fényerővel látszik.
- **Ellenőrzött nézetek:** 375 × 667, 375 × 812 és 1280 × 800, sötét és világos téma. Oldalak: Anyagkezelő lista és termékoldal, `/kalkulatorok/nyeregteto` T alakú tető (hiányos, hibás és érvényes bemenettel, valamint kis értékekkel), Új felmérés 2.0 nyeregtető, felméréslista. Vízszintes túlcsordulás sehol.
- **Ellenőrzések:** `npm run lint` PASS (0 issue), `npm run typecheck` PASS, teljes Vitest **152 fájl / 904 PASS / 19 skip** (+20 új teszt), `npm run build` PASS, `git diff --check` tiszta.
- **Nem ellenőrzött / korlát:** valódi eszköz és valódi mobilbillentyűzet nem volt (csak asztali emuláció). A szakaszcímek (`h2`/`h3`) szándékosan nem akadályok — különben a buborék szinte mindig dokkolt állapotba kerülne —, ezért egy kártyacím szélét a vezérlő még eltakarhatja; ez egy sornyi bővítés, ha a priorítás a címek teljes olvashatósága. A küszöbjelölésnek nincs kikapcsolója: ha később lesz olyan panel, ahol a pontos kis érték a lényeg, ott külön opcióra lesz szükség. A `src/features/` alatt 10 egyedi számformázó továbbra is max 3 tizedessel dolgozik olyan helyeken, ahol a mértékegység a hívási helyen nem egyértelmű.

## F9.57 — Mennyiség-formázás és asztali oldalbelsők a navigációs héjhoz

Státusz: **megvalósítva és böngészőben ellenőrizve**; a tárolt értékek, a domain-számítás, a mérési szerződés, a revíziók, a jogosultság és az adatbázis nem változott. Nincs commit. Az F9.52–F9.56 és a párhuzamos (Codex) mentetlen módosítások megmaradtak.

- **A — Egységes mennyiség-megjelenítés (`src/lib/quantity-format.ts`):** a kódban 37 egyedi `Intl.NumberFormat("hu-HU", …)` élt, ebből 29 `maximumFractionDigits: 3`-mal, és ugyanarra a mennyiségtípusra is eltérő pontossággal (a gyors nyeregtetőmérés `88,20 m²`-t adott, a standalone előnézet `84,853 m²`-t). Az új, mértékegységenként rögzített skála: **m² és m = 2 tizedes (fix)**, m³ = max 3, cm = max 1, mm és db = 0, ° és % = max 1, ismeretlen mértékegységnél a korábbi max 3. Csak **megjelenítés**: a tárolt és számított értékeket nem kerekíti. 5 új teszt (`quantity-format.test.ts`).
- **Előtte / utána ugyanazon a T alakú tetőn (10000 / 6000 mm, 35°, 4000 / 5000 mm), böngészőben reprodukálva:** `97,662 m²` → **`97,66 m²`**, `Hajlás százalékban: 70,021 %` → **`70 %`**, `Vápavonal 6,312 m` → **`6,31 m`**, és a korábban csupaszon álló `80 m²` / `26 m` / `17 m` → **`80,00 m²` / `26,00 m` / `17,00 m`**, tehát a panel egy oszlopban olvasható. A rajz méretcímkéi (`10,00 m`, `11,00 m`) változatlanok.
- **Hatókör:** 18 hívási hely a `src/features/` alatt (felmérés-összegző, gyors nyeregtető, tetőgeometria-eredmények, műszaki rajz szakaszválasztója, standalone előnézet, többtetős űrlap, alátétfólia-panel, trapézlemez- és cserepeslemez-panel). A `src/domain/` rajzi formázói (`formatDrawingMeasurement`) és a kalkulátor-vizuálok mm-címkéi **érintetlenek** — ezek funkcionális rajzi geometriát jelölnek. Két meglévő teszt elvárása frissült a szándékos pontosságváltozás miatt (`84,853` → `84,85`, `50 m` → `50,00 m`).
- **B — Duplikált asztali vissza-navigáció:** a `BackNavigation` mostantól felismeri, ha a cél az oldalsávban is szerepel (`isTopLevelNavigationTarget`), és ilyenkor 64 rem felett rejtve marad — minden oldal tetejéről felszabadul egy sor. A valóban beágyazott célok (projekt, ajánlatrevízió, munkanapló-részlet) minden nézetben megmaradnak, mobilon pedig **minden** vissza-link látszik, mert az alsó sáv nem jelöl hierarchiát. 2 új teszt. Mérve: 1440 px-en az Új felmérés vissza-sora `visible: false`, 375 px-en `true`.
- **C — Szervezet a navigációban (B közben talált valódi hiba):** a navigáció az URL `organization` paraméteréből dolgozott, ezt viszont nem minden útvonal hordozza (pl. `/kalkulatorok/nyeregteto`) — ilyenkor a linkekről lemaradt a szervezet, és **több szervezetnél választóképernyőre vitt volna**. Javítás: a navigáció szerveroldali része feloldja a szervezetet (`getAuthContext`), a kliens pedig az URL paraméterét részesíti előnyben, a szerverét tartalékként használja. Hogy ez ne kerüljön extra adatbázis-körbe, a `getAuthContext` React `cache()`-elt lett — ez a meglévő, kérésenként többszöri hívásokat is deduplikálja.
- **C — Eredménymetrikák rácsa:** a rögzített négyoszlopos `.roof-result-grid` öt metrikánál árva sort hagyott (a „Vápavonal” egyedül a második sorban). Kitöltő rácsra cserélve a felosztás kiegyensúlyozott.
- **Ellenőrzött nézetek:** 1440 × 900 és 375 × 812, sötét és világos téma. Oldalak: Új felmérés 2.0 T alakú tetővel (teljes kitöltés, élő eredménypanel), `/kalkulatorok/nyeregteto` T alakú tető, felméréslista, Műhely. Vízszintes túlcsordulás sehol.
- **Ellenőrzések:** `npm run lint` PASS (0 issue), `npm run typecheck` PASS, teljes Vitest **151 fájl / 884 PASS / 19 skip** (+7 új teszt), `npm run build` PASS, `git diff --check` tiszta.
- **Böngészőben talált, NEM javított hiba (külön feladat):** a kalkulátor mezőszintű hibaüzenetei angol Zod-szöveget szivárogtatnak a magyar felületre — „Tető külső szélessége: *Invalid input: expected number, received undefined*”. Ez a validációs séma hibaüzeneteinek kérdése, nem megjelenítési formázás, ezért a hatókörön kívül hagytam.
- **Nem ellenőrzött / korlát:** 768 / 1280 / 1920 px-et ebben a körben nem néztem újra (az F9.56-os elrendezés nem változott, csak a vissza-sor és a metrikarács). Valódi eszköz nem volt. A `src/features/` alatt 10 egyedi formázó maradt olyan helyeken, ahol a mértékegység a hívási helyen nem egyértelmű (fedési panelek mm- és darabértékei, `construction-suite` általános `formatNumber`-e) — ezek továbbra is max 3 tizedest adnak. Az asztali oldalbelsők mélyebb újratervezése (kétoszlopos űrlapok, tömörebb oldalfejléc, eszköztár-elrendezés) nem történt meg; ez külön mérföldkő.

## F9.56 — Alkalmazás-héj: navigáció, PWA-telepíthetőség és designrendszer-egységesítés

Státusz: **megvalósítva és böngészőben, production buildben ellenőrizve**; domain-számítás, mérési szerződés, mentés, revízió, jogosultság és adatbázis nem változott. Nincs commit. Az F9.52–F9.55 és a párhuzamos (Codex) mentetlen módosítások megmaradtak.

- **B — PWA-telepíthetőség (offline NÉLKÜL):** új `src/app/manifest.ts` (`standalone`, `lang: hu`, `start_url`/`scope: /`, `background_color: #111923`, `theme_color: #e85d04`) és `public/icons/` 192 / 512 / maskable-512 PNG a meglévő, jóváhagyott `src/assets/brand-icon.png` (512 px) márkaeszközből; a maskable változat 80%-os biztonsági zónával készült. A `layout.tsx` kapott `applicationName`, `appleWebApp` metaadatot és **`viewport` exportot `viewportFit: "cover"`-rel** — enélkül az alkalmazásban már használt `env(safe-area-inset-*)` értékek telepített/iOS nézetben nullák maradtak volna. **Service worker, háttérszinkron és offline adatmentés szándékosan nincs**; a dokumentáció sehol nem állít offline működést.
- **C — Alkalmazás-navigáció:** új `src/components/navigation/app-navigation.tsx` a gyökér layoutban. 64 rem felett bal oldalsáv mind a hét céllal, alatta öt elemű alsó sáv (Műhely, Felmérések, Munkanaplók, Anyaglisták, Kalkulátorok); az Anyagkezelő és az Árajánlatok a Műhely kártyáiról érhető el. A cél-lista **nem új lista**: a meglévő `dashboardFunctions`-ből és az ehhez kiemelt `dashboardFunctionRoutes`-ból épül. Aktív útvonal `aria-current="page"` + márkaszínű kiemelés; a linkek `GuardedLink`-ek, tehát a mentetlen-változás őr megmarad. Az aktuális szervezet a query paraméterből öröklődik (több szervezetnél enélkül választóképernyőre esne a navigáció). A `/bejelentkezes` elrejti a navigációt (kijelentkezett HTML-en ellenőrizve: 0 találat).
- **C — Lebegő vezérlők ütközése:** egyetlen elrendezési költségvetés három CSS-változóval (`--app-nav-rail`, `--app-nav-bar`, `--app-bubble-reserve`). A méretező buborék alja mostantól a navigáció fölött ül (375 px: buborék alja 741 px, navigáció teteje 751 px), a `.page-shell/.dashboard-shell/.auth-state-shell` bal és alsó belső margója pedig tartalmazza a sáv és a buborék helyigényét. A navigáció `z-index: 15` — a ragadós mentősáv (12) fölött, a teljes képernyős fotónézet és modálok (20+) alatt. Nyomtatásnál rejtett. **Mérve 375 px-en, a felmérés aljára görgetve: 0 takart interaktív elem** (a nyers mérés 12 „takart” elemet adott, de mind becsukott `<details>` belseje volt).
- **D — Designrendszer:** a betűkészlet csak 400/500/600/700 vágatot tölt be, a CSS viszont 10 különböző súlyt használt (650, 720, 750, 800, 850, 900 is) — ezek mind 700-ként renderelődtek, vagyis a hierarchia nagy része **fiktív** volt. A súlyok a négy valódi vágatra kerültek, és a 0,85 rem alatti másodlagos szöveg 700 helyett **600**-at kap (71 → 0 db `font-weight: 800`). Sugárskála: új `--radius-chip: .5rem` és `--radius-surface: 1rem` token; a szórványos `.35/.4/.45/.5rem` és a 66 db nyers `1rem` tokenre került. Nyers `border-radius` már csak a szándékos `0`, `999px` (pirula), `50%` (kör) és négy összetett érték maradt; a műszaki rajzok, táblázatok és fókuszkeretek geometriáját nem érintettem.
- **E — Ikonrendszer döntés: marad a Lucide.** Már telepítve van, tree-shakable névre szóló importokkal, egységes 2 px vonalvastagsággal, és az alkalmazás minden ikonja ebből jön. Az Iconsaxnak nincs karbantartott hivatalos React csomagja az npm-en, tehát átállás vagy SVG-k kézi másolását (licenc- és karbantartási teher), vagy új, nehezebb függőséget jelentene — **mérhető haszon nélkül**, mivel a Lucide ugyanazt a modern, egyenletes vonalas nyelvet adja. Ehelyett a navigáció ikonmérete a felületméretezést követi (`calc(1.25rem * var(--tp-ui-scale))`), nem fix `size-*` osztály. Ikoncsere nem történt; a `/anyagok` és a felmérés-szerkesztő ikonos gombjain **0 db akadálymentes név nélküli vezérlőt** mértem.
- **Lezárt korábbi nyitott kérdés (F9.55 P2-9):** a dashboard 4–6 mp-es halvány első festése **dev-szerver műtermék volt, nem a glass effektek ára**. Production buildben (`next start`) mérve: `domContentLoaded` 168 ms, `load` 227 ms, a hat kártya azonnal `opacity: 1`.
- **Ellenőrzött nézetek:** 375 × 812, 768 × 1024, 1280 × 800, 1440 × 900, 1920 × 1080; világos és sötét téma. Oldalak: Műhely, Felmérések lista, Új felmérés 2.0 (munkatípus → tetőforma → gyors mérés → aljára görgetve), Anyagkezelő, Munkadíj-beállítások, Kalkulátor-hub, nyeregtető kalkulátor, bejelentkezés (kijelentkezve, curl). Vízszintes túlcsordulás sehol (`scrollWidth === clientWidth`). Mobil érintési célterületek a navigációban 71 × 57 px, felirat nem csonkul.
- **Ellenőrzések:** `npm run lint` PASS (0 issue), `npm run typecheck` PASS, teljes Vitest **149 fájl / 877 PASS / 19 skip** (változatlan), `npm run build` PASS, `git diff --check` tiszta. PWA production buildben: `/manifest.webmanifest` helyes JSON-t ad, mindhárom ikon HTTP 200 valós mérettel, a HTML fejlécben `<link rel="manifest">`, kettős `theme-color`, `apple-mobile-web-app-*` és `viewport-fit=cover`.
- **Nem ellenőrzött / korlát:** valódi eszközön futó telepítés és mobilbillentyűzet **nem** volt (csak asztali emuláció); a telepíthetőséget a manifest és a metaadatok megléte alapján állítom, nem tényleges „Add to Home Screen” próbából. A méretező buborék az oldal **közepén** álló tartalmat továbbra is takarhatja — a navigációval és az oldalvéggel való ütközése megszűnt, de a kontextusfüggő elrejtés nincs megvalósítva. A `calc(... * var(--tp-ui-scale))` sugárértékek (6 db) szándékosan nyersek maradtak. A `--tp-ui-scale` szélső értékeivel a navigáció magasságát nem próbáltam végig. Magyar szövegminőségi átfésülés nem történt: konkrét hibát nem találtam, és szakmai terminológiát indok nélkül nem írok át.

## F9.55 — UI/UX újraértékelés és célzott finomítás

Státusz: **a korábbi UI/UX audit újraellenőrizve a jelenlegi felületen, és 5 megerősített megállapítás javítva**; üzleti logika, mérési szerződés, mentés, revízió és adatbázis nem változott. Nincs commit. Az F9.52–F9.54 és a párhuzamos (Codex) mentetlen módosítások megmaradtak.

- **Már megoldott korábbi megállapítások (újraellenőrizve, nem javítva):** a ragadós mentősáv olvasható (`rgba 0.9` + `blur(22px)`, 1280 px-en mérve) és 900 px alatt statikus; a felmérés és a kalkulátor **ugyanazt** a `RoofTypeSelector` komponenst használja (nincs két tetőformaválasztó); az „Anyaglista készítése” duplikáció megszűnt a „Következő lépések” blokkból; az érintési célterületek az Új felmérés képernyőn ≥44 px; vízszintes túlcsordulás 375 / 768 / 1280 / 1440 px-en sehol.
- **Reprodukált P0 — láthatatlan mérőmezők (javítva, gyökérok):** a globális `input/select/textarea` szabály `border-color`-t és `border-radius`-t állított, `border-width`/`border-style`-t viszont nem, ezért minden olyan mező keret nélkül jelent meg, amelynek nem volt saját `border` szabálya. Mérve: a gyors nyeregtetőmérés két `inputmode="decimal"` mezője `border-width: 0px` volt, miközben a mellettük lévő mezők 1 px-esek. Javítás: `border-width: 1px; border-style: solid;` a közös szabályban — egy helyen, az egész alkalmazásra. Utána ugyanott `1px solid` mérve, kettős keret és túlcsordulás nincs (`/anyagok`, `/kalkulatorok/nyeregteto` programozottan ellenőrizve: 0 keret nélküli és 0 kettős keretű mező). A szándékosan keret nélküli keresőmezők (`.filter-search`, `.client-search`) a későbbi, erősebb szabály miatt változatlanok.
- **Reprodukált P0 — lebegő méretezőbuborék takarja a tartalmat (javítva):** a `.scaling-bubble` fix elem, a `main` alsó belső margója viszont 13 px volt, így az oldal végén álló vezérlők alá kerültek. Javítás: a `.page-shell, .dashboard-shell` alsó margója tartalmazza a buborék helyigényét (375 px: 13 → 80 px, 1440 px: 107 px).
- **Reprodukált P1 — eltérő visszanavigáció (javítva):** a felmérés-szerkesztő a `GlassPageHeader` `actions` slotjában adott egy teljes szélességű „Vissza a felmérésekhez” gombot a többi oldal `BackNavigation` pirulája helyett; emellett ugyanarra a célra kétféle felirat élt („Műhely áttekintése” ↔ „Vissza a műhelyhez”, „Kalkulátorok” ↔ „Vissza a kalkulátorokhoz”, „Ajánlatok” ↔ „Vissza az ajánlatokhoz”). Javítás: a szerkesztő is a közös `BackNavigation`-t használja, és minden visszalink a „Vissza a/az …” mintát követi (12 fájl).
- **Reprodukált P1 — megkülönböztethetetlen felméréslista (javítva):** minden kártya címe „Tető felmérés · önálló” volt. A rekordban nincs névmező, ezért a megjegyzés első sora lett a kártya címe (ha van), a típuscímke pedig a metasorba került; két sorra vágva (`line-clamp: 2`). Adatréteg, lekérdezés és szerződés nem változott.
- **Reprodukált P2 — apró natív lenyitók a munkadíj-beállításokon (javítva):** a „Díj szerkesztése” és „Archivált szabályok” natív `<details><summary>` 24 px magas volt és kilógott a designnyelvből. Javítás: a meglévő `GlassDisclosure` komponens; 768 px-en mérve 45 px.
- **Ellenőrzött felületek és nézetek:** Műhely (dashboard), Felmérések lista, Új felmérés 2.0 (munkatípus → tetőforma → mérési mód → mérőmezők), Kalkulátor-hub és nyeregtető kalkulátor, Anyagkezelő, Munkadíj-beállítások, Munkanaplók lista. 375 × 812, 768 × 900, 1280 × 800, 1440 × 900; sötét és világos téma. **Mentett felmérés szerkesztése ebben a körben csak a V5-ös lista-bejegyzésen keresztül látszott, új mentés/revízió nem készült.**
- **Ellenőrzések:** `npm run typecheck` PASS, `npm run lint` PASS (0 issue), célzott Vitest (felmérés + ajánlatok + app: 26 fájl) PASS, teljes Vitest **149 fájl / 877 PASS / 19 skip** (a változtatás előttivel egyező), `npm run build` PASS, `git diff --check` tiszta.
- **Nem ellenőrzött / korlát:** a dashboard első festésének 4–6 mp-es halvány szakasza csak dev szerveren volt megfigyelhető, **production buildben nem mértem**; valódi eszközön futó mobilbillentyűzet nem volt; a `--tp-ui-scale` szélső értékeivel az új alsó margót nem próbáltam végig; a lebegő buborék az oldal **közepén** álló tartalmat továbbra is takarhatja, azt görgetéssel lehet kitakarni.
- **Nem valósítottam meg (külön mérföldkőnek javasolt):** alsó navigáció / asztali oldalsáv, PWA-manifest és telepíthetőség, service worker és offline mentés, globális oldalátmenetek.

## F9.54 — Felmérés 2.0 záró felületi ellenőrzés

Státusz: **célzott felületi ellenőrzés és egy P1-javítás megvalósítva**; a mérési logika, a szerződések, a mentés és a revíziók nem változtak. F9.52 és F9.53 változásai megmaradtak; nincs commit.

- **Visszakeresett korábbi megállapítások (ebben a Claude-menetben):** mobilon szétesett tetőrészlet-blokk (F9.52-ben javítva), közvetlen mérés túlnyúlás-eredete (F9.52-ben kimondva), piszkozat-visszaállítási regresszió (javítva), a `quick` mód történeti rajza V1-en nem számítható újra (nyitott, korábbi viselkedés). **Széles körű korábbi UI-audit ebben a menetben nem készült**, ezért a mostani felülvizsgálat a jelenlegi renderelt felületre és az F9.53 dokumentált korlátaira épül.
- **F9.53 után már rendben:** 96 rem munkaterület, kétoszlopos gyors mérőmezők, 900 px alatt nem ragadós mentősáv, 480 px alatt kétoszlopos módválasztó. 1280 / 1440 / 1920 px-en nincs vízszintes túlcsordulás, a gyors mód bemenet–rajz aránya kiegyensúlyozott (1440: 654 / 654 px, rajz 626 × 389).
- **Reprodukált hiba (P1) és javítás:** a tetőrészlet-bejegyzések a teljes munkaterület-szélességet felvették (1920 px-en állapotgomb 495 px, megjegyzés és törlőgomb 1499 px), ami aránytalan volt a fölötte lévő tömör mérőmezőkhöz képest. Javítás: `.survey-roof-detail` jelölés + 48 rem feletti nézetben 48 rem olvasási szélességkorlát a státuszsorra, a méretmezőkre és a megjegyzésre, a törlőgomb pedig tartalomszélességű (1440 px: 252 / 768 / 184 px). 768 px alatt semmi nem változik.
- **Ellenőrzött állapotok:** üres új felmérés, részlegesen kitöltött épületméret-mód (hiányzó túlnyúlásnál mezőszintű „Kötelező a rajzhoz”), teljes épületméret-mód (10 × 8 m, 3 m emelkedés, 500/300/300 mm → **119,25 m²**, kézi levezetéssel egyező: 2 × 10,6 m × 5,625 m), mentett felmérés tetőrészletekkel. Mérésimód-váltás: a gyors mód üres mezőket mutat, visszaváltáskor mind a hat épületméret megmarad — nincs csendes átértelmezés.
- **Viewportok:** 1920 / 1440 / 1280 / 768 / 375 px — vízszintes túlcsordulás sehol (`scrollWidth = clientWidth`), a kártyán belül 0 túlnyúló elem. 768 és 375 px-en a mentősáv statikus, nem takar. 1,4× szöveg- és 1,2× felületméretezés mellett 1440 px-en sincs túlcsordulás.
- **Világos téma, billentyűzet:** a tetőrészlet-panel világos témában is olvasható (aktív állapot `rgb(194,65,12)` a `rgb(255,241,232)` háttéren). Tab-navigáció: az állapotgombokról a méretmezőkre lép, `:focus-visible` 3 px-es márkaszínű kerettel, a fókuszált elem a nézetben marad.
- **Rajzhely hiányos geometriánál (P2, javítva):** az épületméret- és a többi tetőforma-útvonal mostantól a gyors módhoz hasonlóan fenntartja a rajz helyét. A `SurveyRoofPreview` üres geometriánál néma, `aria-hidden` szaggatott keretet ad a `drawing` slotba, így a kétoszlopos elrendezés (`:has(> .technical-drawing)`) azonnal érvényes: 1440 px-en a hat mező 2 × 318 px-es oszlopban áll a korábbi hatoszlopos sor helyett, a keret 650 × 176 px, és a kész rajz **ugyanazt a helyet** kapja (x = 732, w = 650) — nincs elrendezés-ugrás. **Kockázat:** a `roof-workspace-survey` CSS és a placeholder kizárólag a felmérés-szerkesztőben él (a tetőmodell-űrlapok más osztályt használnak), ezért a hatókör a Felmérésre korlátozott. A meglévő `field-survey-editor.test.tsx` kifejezetten tiltja a „rajz később jelenik meg” ígérő szöveget hiányos állapotban — ezt megtartottam (a keret néma, a hiányt továbbra is a „Még hiányzik: …” üzenet mondja ki), és a teszt most a néma keret meglétét is rögzíti.
- **Ellenőrzések:** célzott Vitest 22 fájl / 175 PASS, teljes Vitest 149 fájl / 877 PASS / 19 skip, `typecheck`, `lint`, `git diff --check`, `build` PASS.
- **Nem ellenőrzött / nyitott:** valódi eszközön futó mobilbillentyűzet (csak asztali emuláció volt); új mentés/revízió ebben a körben nem készült (a mentés–újranyitás–revízió útvonal az F9.52/F9.53 körökben igazolt, V1–V5); a `quick` mód történeti rajza V1-en továbbra sem számolható újra.

## F9.53 — Felmérés 2.0 felületfinomítás

Státusz: **célzott felületjavítás megvalósítva és ellenőrizve**; teljes, minden nézetet és állapotot lefedő UI-regresszió nem futott. A F9.52 kód-, séma-, adat- és piszkozatváltozásait megőriztem.

- **Előzmény:** a megnyitott „TetőPro Survey 2.0 modernization” Claude-menet friss jelentése szerint F9.52 bevezette a meglévő fizikai tetőrészleteket és a közvetlen mérés eredetjelölését, majd javította a tetőrészletet tartalmazó helyi piszkozat visszaállítását. A jelenlegi repó `docs/PROGRESS.md` bejegyzése és kódja ugyanezt igazolja; az új `roofDetails` szerződés csak fizikai megfigyeléseket rögzít, nem hoz vissza munkatervezést.
- **Megerősített felületi gondok:** az általános 80 rem oldalmaximálás a tetőfelmérésnél indokolatlanul sok szélső üres helyet hagyott. A két gyors mérőmező a négyoszlopos rácsban csak fél sor szélességét kapta. 375 px-en a mentősáv a mezők fölé tapadt és takarta a tartalmat, a három mérésmód pedig szűk kártyákra tört. 768 px-en a mentősáv a tetőválasztó címe elé úszott.
- **Változások:** a felméréslista és az új/szerkesztett felmérés saját `field-survey-page-container` jelölést kapott; a szerkesztő maximuma 80-ról 96 remre (1280-ról 1536 px CSS-re) nőtt, a tartalomszélességet a külső margóhoz igazítva. A gyors mód két mérőmezője két kényelmes oszlopot használ. Tetőmérés mezői legfeljebb 900 px-en két oszloposak, 480 px alatt egyoszloposak. 480 px alatt a módválasztó két oszlopos, az utolsó kártya teljes sort kap. 900 px alatt a mentősáv normál dokumentumfolyamban marad.
- **Előtte/utána:** desktopon a fő szerkesztőkeret 1280 px-ről legfeljebb 1536 px-re szélesedik; a gyors mód bemenetei és rajza továbbra is egymás mellett állnak. 375 px-en egysoros mérőmezők és nem ragadós mentősáv látszik; 768 px-en kétoszlopos mérőmezők és nem takaró mentősáv. A módok és állapotok szemantikus/tematikus tokenjei változatlanok.
- **Architektúra és adatbizonyíték:** a meglévő Next.js App Router oldalak, globális design tokenek és Felmérés 2.0 komponensek újrahasznosítva. Csak oldalszintű CSS-osztály, reszponzív CSS és dokumentáció változott. Domain-számítás, mérési szerződés, mentés, piszkozat-kulcs, jogosultság, adatbázis, revízió és migráció nem változott; böngészős próba alatt nem mentettem felmérést.
- **Ellenőrzések:** célzott Vitest: 3 fájl / 74 teszt **PASS** (`field-survey-editor`, `survey-roof-details`, `survey-draft-recovery`). `npm run typecheck`, `npm run lint` és `npm run build` **PASS**. Hitelesített helyi böngésző: 375 px iPhone SE — egyoszlopos mérések, kétoszlopos módválasztó, mentősáv nem takar; 768 px iPad Mini — kétoszlopos mérések, mentősáv nem takar; széles asztali böngészőben a nagyobb munkaterület és a gyorsmérés élő rajza/eredményei. Közvetlen gyorsmérési próba: 10,5 × 4,2 m → 88,20 m²; épületméret módban 10 × 8 × 3 m mellett a hiányzó túlnyúlásokat a felület jelzi. Az épületméret módhoz szükséges hiányzó értékek miatt ez az eset nem adott rajzot vagy eredményt.
- **Nem ellenőrzött / korlátok:** a böngésző eszközemulációja ezen a körön 375 és 768 px-es konkrét presetet adott; a 1280 és 1440 px külön, pontos CSS-viewportos vizsgálata nem történt meg, a desktop-minta csak szélesebb asztali nézet volt. Világos témát, fókuszált billentyűzetet/nyitott mobilbillentyűzetet, nagyítási beállításokat, mentést, review-t, korábbi mentett felmérés szerkesztését és teljes regressziót ebben a mérföldkőben nem ismételtem meg. Ezek F9.52-ben korábban dokumentált ellenőrzések, de nem tekinthetők e feladat új bizonyítékának.

## F9.52 — Felmérés 2.0: meglévő tetőrészletek + mérési eredet

Státusz: **COMPLETE a kód/Vitest (877 PASS)/typecheck/lint/build, a helyi DB-validátor és a hitelesített helyi böngészős workflow hatókörre**. Nincs commit; meglévő adat és revízió nem íródott át.

- **Célzott gap-ellenőrzés (Stage A):** a Felmérés 2.0 terv nagy része már élt, ezért újra nem készült el: tetőformaválasztó, nyeregtető `quick`/`building`/`detailed` és félnyereg `quick`/`building` mód közös geometriai motorral, kontya/sátor/félkonty/L/T épületméret-útvonal, élő SVG-rajz mezőkiemeléssel és „sematikus” jelöléssel, mért/számított címkék, magyar tizedesvessző, mezőszintű hibák, helyi piszkozat + többfüles ütközés + immutable revíziók, fotók, mobil/asztali elrendezés. A visszavont „Bádogos elemek hozzáadása” munkatervezési UI továbbra sincs visszahozva (csak régi rekordok olvasása marad).
- **Ténylegesen hiányzó, most megvalósított rész:** a meglévő, megfigyelt **fizikai** tetőrészletek rögzítése. Új domain-szerződés (`src/domain/field-surveys/roof-details.ts`): 11 objektumtípus, típusonként értelmezett mezőkkel; állapot `measured` / `present_unmeasured` / `absent`; **bejegyzés hiánya = „nem vizsgált”**, ami soha nem válik megerősített hiánnyá. Megerősített hiányhoz nem adható érték, `measured` állapothoz legalább egy érték kell, egy típusnál a megerősített hiány mellett nem állhat másik bejegyzés. Üres mező hiányzó adat, nem nulla.
- **UI (`survey-roof-details.tsx`):** opcionális, összecsukott szakasz a tető munkaszakaszban; típusválasztó, állapotgombok, csak a típushoz tartozó méretmezők (mm/m/db, numerikus billentyűzet), megfigyelés, mezőszintű magyar hibák a domain-sémából. Új bejegyzés alapértelmezése „Van, de nincs felmérve”, így üres mezőre nincs hibajelzés. Meglévő CSS-osztályok, nincs új dizájnrendszer vagy globális felülírás.
- **Összesítés:** a mentett és a történeti nézet szakaszonként mutatja a rögzített részleteket (állapot + értékek + megjegyzés), és kiírja, hogy áttörést a tetőfelületből nem vonunk le.
- **Mérési eredet (közvetlen mérés):** a gyors/részletes nyereg és a gyors félnyereg eredménypanel kimondja, hogy a mért hossz a teljes tetősíkot adja (a túlnyúlás benne van, külön nem adódik hozzá), és hogy ebből hajlásszög, épületméret nem következik.
- **Adatbázis:** `supabase/migrations/20261020090000_survey_roof_details.sql` csak a `private.valid_field_survey_sections` validátort definiálja újra az additív `roofDetails` kulccsal; tábla, RPC, jogosultság és revízió nem változik, régi szakasz a kulcs nélkül érvényes marad. Helyi DB-n (reset nélkül, `create or replace`) alkalmazva és ellenőrizve: legacy szakasz / mért kémény (600×800 mm) / megerősített hiány / hiányos jelenlét / 12,4 m csatorna **elfogadva**; érték a hiányhoz, üres `measured`, 0 mm, ismeretlen típus, nem tető szakasz, duplikált azonosító és idegen kulcs (`plannedWork`) **elutasítva**. A migráció a `schema_migrations`-be nincs beírva (következő resetnél sorrendben lefut).
- **Ellenőrzés:** új `roof-details.test.ts` (9) és `survey-roof-details.test.tsx` (10, köztük piszkozat↔mentés körút és a részlet nélküli régi szakasz változatlansága); teljes Vitest 149 fájl / 871 PASS / 19 skip; `npm run typecheck`, `npm run lint`, `npm run build` PASS.
- **Böngészős ellenőrzés (hitelesített, helyi):** dedikált helyi teszt-fiók (`claude.f952@local.test`, DEMO owner; `.env.local` nem módosult). Nyeregtető gyors mérés 10,5 × 4,2 m, „egyforma síkok: igen” → 88,20 m², gerinc 10,5 m, eresz 21 m, oromszél 16,8 m (kézi levezetéssel egyező). Kémény 1 db / 600 × 800 mm + megfigyelés „Felmérve”; tetőablak „Nincs (ellenőrizve)” → a méretmezők eltűnnek; szélesség 0 → mezőszintű „A méret legyen nagyobb nullánál.”, új bejegyzésnél üres mezőkre nincs hibajelzés. V1 mentés, majd 3 db szellőzőáttöréssel V2: a DB-ben V1 = 2 részlet, V2 = 3 részlet, a V1 revízió változatlan; a V1 történeti összesítés a részleteket állapottal, értékekkel és a „nem vonunk le áttörést” mondattal mutatja. Újratöltés után a mentett értékek (1 / 600 / 800 mm, megjegyzés) visszatöltődnek. Mobil 375 px: `scrollWidth = clientWidth = 375`, a szakaszban 0 túlcsorduló elem; világos témában és 1,4× szöveg- / 1,2× felületméretezéssel sincs túlcsordulás.
- **Böngészőben talált és javított hiba:** a bejegyzés törlőgombja a közös `.field-survey-remove` osztályt használta, amelyhez egy `grid-column: 3` szabály tartozik, ezért a részletblokk mobilon három sávra esett szét (az állapotgombok ~20 px szélesen, betűnként tördelve). A gomb mostantól `secondary-button`; a blokk egyoszlopos, az állapotgombok 100 × 64 px-esek. Új CSS nem kellett, a `globals.css` nem változott.
- **Korlát:** a tetőrészletek nem kapcsolódnak tetősíkhoz/elhelyezkedéshez, ezért geometriai levonás és anyagmennyiség nem készül belőlük. Aszimmetrikus gerinceltolás épületméret-módban továbbra sem támogatott (a közvetlen/részletes mód kezeli az eltérő síkokat). A teszt-fiók és a DEMO tesztfelmérés (`12894e4b-…`) a helyi DB-ben maradt.
- **Böngészőben talált és javított regresszió (piszkozat-visszaállítás):** a `hasValidDraftShape` a piszkozat szakaszait a *mentett* `surveySectionsSchema`-val validálja, és csak a mérések értékét semlegesíti. A piszkozat `roofDetails` számmezői viszont szövegek, ezért a parse elbukott → nem volt visszaállítási jelölt → a nem piszkozatos autosave ág **törölte** a rekordot (se visszaállítás, se ütközésbanner). Emiatt a tetőrészletet tartalmazó felmérés minden mentetlen módosítása elveszett újratöltéskor — ez a részletek bevezetésének mellékhatása volt, nem korábbi hiba (a tetőrészlet nélküli felmérés piszkozata végig helyesen állt vissza; A/B-vel igazolva). Javítás: a `structuralSections` a részleteket ugyanúgy semlegesíti, mint a méréseket (négy számmező `null`, `status` → `present_unmeasured`, jegyzet 500 karakterre vágva), az `id`/`kind`/idegen kulcs ellenőrzése megmarad; a `draftHasContent` pedig tartalmasnak veszi a csak tetőrészletet rögzítő piszkozatot is. Böngészőben igazolva: mentetlen eresz 10,8 m + mentetlen szellőző 125 mm visszatöltődik, és a csak egy új „Vápa” bejegyzést tartalmazó piszkozat is. Négy új teszt a `survey-draft-recovery.test.ts`-ben (javítás nélkül mind elbukik). A javítás után a többi piszkozat-útvonal is igazolt (két böngészőfül, helyi DB): a főoldali lista mutatja a tetőrészletes piszkozatot és a „Folytatás” (`?recover=…`) visszaállítja; két fül külön rekordot ír, egyik sem írja felül a másikét; a másik fülben mentett V4 után a V3-ra épülő piszkozat ütközésbannert kap (nincs csendes összevonás), és „Visszaállítom, és új változatként mentem” után V5 lett — a V1–V4 revíziók változatlanok; a bezárt fül piszkozata „más szerkesztésből származó” jelzést kap, implicit nem töltődik be, a főoldalról viszont folytatható (vápa 4,25 m visszajött).
- **Nem ehhez a mérföldkőhöz tartozó, korábbi viselkedés:** a gyors nyeregtetőmérés történeti rajza V1-en „nem számítható újra” üzenetet ad (a `quick` mód historikus rajza nincs lefedve).

## F9.50.5.1 — Univerzális kereshető terméválasztó

Státusz: **COMPLETE kód/Vitest (850 PASS)/typecheck/lint/build hatókörre**; hitelesített böngészős ellenőrzés **nem futott**. Nincs séma-, képlet- vagy commitváltozás.

- Az Anyaglista `WorkflowMaterialProductPicker` újrahasznosítva: opcionális `group` és `copy` prop (alapértelmezés = régi viselkedés). A kalkulátor ezt használja, „Összes kategória” szűrővel.
- Az adapter minden aktív termékvariánst felkínál minden csoportban (egyedi kategória/`other` is). Általános méretoszlopokat csak fedésnél, `roof_covering`/`sheet_metal` kategóriából olvas; faanyag/fólia csak a kifejezett `technical_specs` kulcsokat. Eltérő kategóriánál látható figyelmeztetés, kézi pótlás.

## F9.50.5 — Anyagkezelő ↔ tető-kalkulátor integráció

Státusz: **COMPLETE a kód/Vitest/typecheck/lint/build hatókörre**; böngészős (hitelesített) és DB-integrációs ellenőrzés **nem futott** (nincs commit, nincs séma-/migrációváltozás).

- `roof-material-catalog.ts`: aktív, aktív kategóriájú termék variánsa → `MaterialProfile` (id = variáns UUID, `catalog` identitás, gyengébb termék/variáns proveniencia); csak ténylegesen megadott, érvényes érték kerül át. Kategória: `roof_covering`→fedés, `insulation`→fólia, `timber`→szarufa/léc.
- Új additív `technical_specs` kulcsok (`roofTechnicalSpecFields`, Zod-validált az Anyagkezelő variánsűrlapján): `usable_covering_length_mm`, `roll_width_mm`, `roll_length_mm`, `side_overlap_mm`, `end_overlap_mm`, `installation_direction`, `section_width_mm`, `section_height_mm`. Fedésnél a meglévő variánsoszlopok (névleges/hasznos szélesség, hossz) is használatosak.
- `/kalkulatorok` szerveroldalon, szervezethez kötve tölti a katalógust; betöltési hiba esetén kézi/DEMO mód. Az értékek, felülírások és a snapshot továbbra is helyiek (`persisted: false`).

## F9.50.4 — Faanyag-érvényesség és látható korlátok (F9.50.3 Codex-visszajelzés után)

Státusz: **COMPLETE a helyi domain/UI hatókörre** (DB, séma, migráció nem változott; nincs commit).

- **INVALID vs INCOMPLETE:** a keresztmetszet-ellenőrzés (`sectionIssues`) szétválasztja: mindkét méret hiánya = opcionális, nincs térfogat és nincs hiba; egy méret = `INCOMPLETE` térfogat; nulla/negatív/tört = `INVALID` (`invalidKeys`). Az érvénytelen pár nem jut a motorba, így a szarufa/léc darabszám és hossz megmarad, nulla térfogat soha nem jelenik meg; a rész `INVALID`, az összesített státusz is.
- **Látható figyelmeztetések:** `roofTakeoffCriticalWarnings` rövid, mindig látható lista (nem beszerzési mennyiség; faanyag nem statika, csak ha faanyag kért; hiányos/érvénytelen adat), csak a kért részekhez; a részletes lista a meglévő „Korlátok és feltételezések” blokkban marad. A vágáslista-kalkulátoron is megjelenik.
- **Ellenőrzés:** Vitest 146 fájl / 835 PASS (új: hiányzó/egyoldalú/nulla/negatív/tört méretek szarufára és lécre, független mennyiségek, figyelmeztetések relevanciája), `typecheck`, ESLint, `build` PASS. Böngésző (hitelesített helyi munkamenet): szarufa csak szélességgel → hiányos térfogat, 22 db / 93,338 m; léc magasság −5 → `INVALID`, 19 db / 190 m megmarad; szarufa szélesség 0 → mezőszintű hiba; tablet 768 px világos és mobil 375 px sötét: nincs vízszintes túlcsordulás. Shed termék, DEMO felülírás/visszaállítás kódja nem változott (F9.50.3-ban böngészőben igazolva), ebben a körben újra nem lett próbálva.

## F9.50.3 — Kalkulátor-integritás javítások (F9.50.2 Codex FAIL után)

Státusz: **COMPLETE a helyi domain/UI hatókörre** (DB, séma, migráció nem változott; nincs commit).

- **Részleges keresztmetszet:** a beírt méret megmarad; a hiányzó párra mezőszintű magyar hiba (`ResolvedSpec.issues`), a szarufa/léc darabszám és hossz érvényes marad, a névleges térfogat a `parts[].incompleteQuantities`-ben „hiányos”.
- **Visszaállítás:** `restoreProductValues(state, resolved, key?)` csak a ténylegesen felülírt termékmezőket törli; a kézi-only értékek (ahol a termék nem ad értéket) megmaradnak. Terméket váltva a forrás újraszámolódik, bejegyzés nem vész el.
- **Teljes snapshot:** `roof-calculation-snapshot.ts` (`schemaVersion 1`, `persisted: false`): kalkulátor, tetőforma, mezők (explicit 0 megmarad), kért csoportok, faanyag-kiosztás, mind a négy specifikáció forrásokkal; `replayRoofCalculation` JSON-körút után azonos eredményt ad. A geometriai leképezés (`roofGeometryInputFromFields`) a UI-ból a domainbe került, képlet nem változott. A korábbi `RoofMaterialSpecSnapshot` szerződés változatlan.
- **Korlátok:** az összesítés „Korlátok és feltételezések” lenyitható blokkban csoportosítva (Általános + részenként), duplikáció nélkül, egy üzenet sem vész el.
- **Ellenőrzés:** Vitest 146 fájl / 829 PASS (6 új teszt), `tsc`, ESLint, `npm run build` PASS. Böngésző: szarufa 80 mm szélesség magasság nélkül → hiba a mezőnél, 22 db / 93,338 m érvényes, térfogat hiányos; hiányos DEMO fedés + kézi-only + felülírás → globális visszaállítás csak a felülírást állította vissza; termék→kézi átváltás; 768 és 375 px nincs vízszintes túlcsordulás.
- **Korlát:** a világos téma emulációja ebben a körben nem váltott (a lap sötét maradt), ezért a világos téma ehhez a körhöz nem igazolt; a snapshot továbbra sem mentett.

## F9.50.2 — Intelligens kalkulátor-bemenet (termék vagy kézi specifikáció)

Státusz: **COMPLETE a helyi domain/UI hatókörre** (`roof.material-takeoff`, `roof.timber-cutlist`; DB, séma, migráció nem változott; nincs commit).

- **Új típusos modell** (`roof-material-spec.ts`): `ResolvedSpec` mezőnként `product` / `override` / `manual` forrással, az eredeti termékértékek megőrzésével, visszaállítással és szerializálható, **nem perzisztált** `RoofMaterialSpecSnapshot`-tal. Kézi vagy felülírt érték soha nem kap gyártói provenanciát; kézi fedésnél a forrás „Felhasználó által megadott kézi adat (nem gyártói)”.
- **Termékek:** nincs ellenőrzött műszaki termékkatalógus a repóban, ezért a profilok kizárólag feltűnően **DEMO**-jelölt példák (`DEMO_MATERIAL_PROFILES`, köztük egy szándékosan hiányos); a valós katalógus ugyanezen `MaterialProfile` szerződésen át köthető be. Hiányzó termékadat `INCOMPLETE` marad.
- **Takeoff-szerződés:** `calculateRoofMaterialTakeoff` új `parts` (mennyiség + egység + `GEOMETRIC/LAYOUT/NOMINAL` jelentés + státusz + specifikáció + korlátok), `requested` (nem kért anyagcsoport nem rontja a státuszt; alapértelmezés a korábbi „mind kért”) és `specSnapshot`. `PROCUREMENT` jelentés fenntartott, sehol nem adódik.
- **Javított szerződések:** nyeregtető homlokzati kiülése (elöl/hátul) kitölthető; üres = „nincs megadva” (0 mm, jelezve), a 0 kifejezett érték, negatív elutasított. A `roof.timber-cutlist` elsődleges eredménysorai a meglévő faanyag-motorból jönnek (`takeoffLines`), a korábbi üres `calculate` megszűnt. Fedés/alátét mező csak a kért anyagcsoportnál jelenik meg.
- **Ellenőrzés:** új `roof-material-spec.test.tsx` 17 teszt (kézzel levezetett értékek: nyereg 10×6 m 45°, kiülés 0,5/0,3 m → 2·10,8·3√2 m²; 22/24 szarufa; 40 tábla / 20 oszlop; 80×200 térfogat); teljes Vitest 146 fájl / 823 PASS; `tsc`, ESLint, `npm run build` PASS. Böngésző (hitelesített helyi munkamenet): nyereg termékkel + kiülés 24 szarufa / 101,823 m / 1,629 m³, alátét 6 csík / 97,2 m²; féligényes tető DEMO fedéssel 20 tábla → felülírás 500 mm-re 40 tábla → visszaállítás 20 → kézi mód változatlan eredmény; vágáslista 22 db / 93,338 m; mobil 375 px és világos téma: nincs vízszintes túlcsordulás.
- **Nem ellenőrzött / korlát:** félnyereg termékkel csak a fedésre volt böngészőben próbálva; tablet méret és dark/light minden állapota nem; a spec snapshot nincs mentve (perzisztencia új migrációt igényelne, nem készült); a faanyag-keresztmetszet egyik mérete önmagában némán kimarad a térfogatból.

## F9.50 — Nyereg- és félnyeregtető anyag-kimutatás lezárása

Státusz: **COMPLETE a helyi domain/UI hatókörre** (a `roof.material-takeoff` feladat gable/shed útvonala; adatbázis, séma, migráció, hosted/Auth és downstream írás nem változott; nincs commit).

- **Közös pipeline:** a validált roof geometry, geometriai szarufa-/léc-kiosztás, alátétcsík-kiosztás és táblás fedés ugyanabból az összesített `calculateRoofMaterialTakeoff` eredményből jelenik meg. A státusz `VALID` / `INCOMPLETE` / `INVALID` / `UNSUPPORTED`; hiányzó paraméterből nincs kitalált mennyiség. A részletes panelek továbbra is megőrzik a paraméterek szerkesztését és a geometriához kötött rajzot.
- **Gable/shed bemenet:** a formaválasztó mindkét alakhoz explicit ereszkiülést fogad; nyeregnél a meglévő gable geometry, félnyeregnél az alsó ereszhez kötött, csak megadott kiülésű síkmodell maradt az alap. A korábbi ereszhossz-/hajlás-javítás nem lett megkerülve.
- **Korlátok:** a faanyag-kimenet igazolt geometriai tengely/vonalhossz, az alátét vágási minimum, a fedés geometriai táblaoszlop-kimutatás; ezek nem fizikai stock-, gyártói vagy statikai beszerzési tervek. A termék- és tekercsadatok hiánya `INCOMPLETE`.
- **Ellenőrzés:** célzott roof domain/UI tesztek 7 fájl / 67 PASS; teljes Vitest 145 fájl / 806 PASS / 8 skip (19 skip); `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS (Next 16.4 webpack). Élő böngészős smoke-kísérletet a lokális oldalon elindítottam, de hitelesített felület nélkül a route nem renderelt kalkulátor UI-t; ezért browser acceptance evidence nincs és nem állítok UI-szintű PASS-t.

## F9.49 — Általános tetőfedés-kiosztás minden tetőformára

Státusz: **COMPLETE a helyi, mért hatókörre** (domain + UI; DB, séma, migráció, szerveroldali validáció nem változott; nincs commit).

- **Új motor:** `roof-covering-layout.ts`. A fedőtáblákat síkonként, az eresz mentén futó teljes szélességű **oszlopokban** osztja ki; minden oszlop a tetősík polygonjába vágva kapja meg a saját lejtőirányú hosszát, így a trapéz és háromszög alakú síkok (konty, sátor, félkonty, L/T szárnyak) nem területosztást, hanem tényleges kiosztást kapnak. Bemenet a meglévő `roofCoveringProductParametersSchema` (`form: "sheet"`); gyártói termékadat és annak forrása nélkül `INCOMPLETE` a státusz, darabszám nem jelenik meg.
- **Közös síkgeometria:** a sík-lokális (u, v) keretszámítás, konvexitás-ellenőrzés, sávvágás és tartomány kikerült `roof-plane-geometry.ts`-be. A fedés és az alátét ugyanannak a sávkiosztásnak a két merőleges tengelye; a `roof-underlay` innen importál, viselkedése változatlan (12 teszt PASS).
- **Felület:** a `roof.material-takeoff` fedési mezői minden tetőformán elérhetők (névleges/hasznos szélesség, fizikai/használható hossz, termékadat forrása). A gyártóspecifikus cserepeslemez- és trapézlemez-motor a saját dedikált kalkulátorában marad.
- **Ellenőrzés:** `npm run typecheck`, `npm run lint` (No issues found), `npm test` 143 fájl / 803 PASS. Kézzel levezetett tesztek: nyeregtető 10×6 m 45° / 1 m hasznos szélesség / 2 m hasznos hossz → 20 oszlop, 60 tábla; **kontytető ugyanezzel → 32 oszlop, 72 tábla** (fő trapézonként 1+2+3+3+3+3+3+3+2+1 = 24, kontyháromszögenként 1+2+3+3+2+1 = 12); hiányzó termékadatra `INCOMPLETE`, ellentmondó szélességre `INVALID`. Böngésző: ugyanez a kontytető a felületen 72 db / 32 oszlop / 166,32 m² — a kézi levezetéssel egyezik. `npm run build` nem futott.
- **Korlát:** a kiosztás teljes szélességű oszlopokkal számol, szabásmaradékot nem használ újra; gyártói alkalmasságot, felhajtást, áttörést, hulladékot és kivitelezési tervet nem modellez.

## F9.48 — Manzárdtető a közös tetőgeometria-motorban

Státusz: **COMPLETE a helyi, mért hatókörre** (domain + UI; DB, séma, migráció, szerveroldali validáció nem változott; nincs commit).

- **Modell:** a manzárd a meredek alsó szoknya és a lapos felső sík **alsó burkolójaként** épül fel (`rule: "min"`, négy sík), ugyanazzal a partícionáló géppel, mint a többi forma. Bemenet: `lengthMm`, `widthMm`, `lowerRunMm`, `lowerRiseMm`, `upperRiseMm`; a séma elutasítja, ha az alsó szakasz nem meredekebb a felsőnél, vagy ha a futás nem fér a fél szélességbe.
- **Motorbővítés:** a tetőhajlás síkonkéntivé vált — `pitch = atan(|∇h|)`, terület = vetület × `hypot(1, |∇h|)` — a korábbi globális `input.pitchDegrees` helyett. Egy hajlású tetőkre azonos eredményt ad, és ez teszi lehetővé a vegyes hajlást. Új élfajta: `break` („Törésvonal”).
- **Anyagkiosztás:** a `roof-timber-layout` változtatás nélkül működik manzárdon. A `roof-underlay` engedélylistája `gable/shed/hip` → `+mansard` bővült; az algoritmus eleve síkonként dolgozik, a manzárd négy síkja konvex téglalap, azaz egyszerűbb az engedélyezett kontynál. A fedés továbbra is nyeregtető-specifikus (gyártói termékadatot igénylő motor).
- **Felület:** a manzárd a `roof.material-takeoff` és a `roof.timber-cutlist` formaválasztójának nyolcadik eleme lett, saját szakaszmezőkkel (a tetőhajlás mező ilyenkor eltűnik). Az önálló `roof.mansard-section` bejegyzés és a feleslegessé vált `calculateMansardGeometry` törölve; a katalógus 32 → 31 bejegyzés. A felmérés nem kínál manzárdot: ott a `calculator_type` perzisztált érték, és ehhez nincs tárolt típus.
- **Ellenőrzés:** `npm run typecheck`, `npm run lint` (No issues found), `npm test` 143 fájl / 800 PASS. Új, kézzel levezetett domain tesztek: geometria (4 sík, 2 hajlás, 2 törésvonal, terület `2·L·(hypot(1500,2800)+hypot(1500,700))`), szarufakiosztás (44 db, pontos összhossz), alátét (mind a négy síkon csík, bruttó ≥ nettó). Böngésző: 10×6 m, 1500/2800/700 mm manzárdra 96,635 m², gerinc 10 m, törésvonal 20 m, alátét 10 csík / 100 m / 150 m² / 2 tekercs — a kézi ellenőrzéssel egyezik. `npm run build` nem futott.

## F9.47 — Tetőkalkulátorok feladat-alapú átalakítása (zhitov-elv)

Státusz: **COMPLETE a helyi, mért hatókörre** (katalógus + UI + egy domain-hibajavítás; DB, séma, migráció, szerveroldali validáció nem változott; nincs commit).

- **Elvi váltás:** a kalkulátor neve mostantól a kimenetet nevezi meg, nem a tetőformát; a tetőforma bemenet lett. A hat forma-alapú tetőbejegyzés (`roof.rafter|gable|shed|mansard|hip|truss`) helyére öt feladat-alapú lépett: `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.mansard-section`, `roof.truss-members`. A katalógus 33 → 32 bejegyzés. Szerződés: [ZHITOV_PARITY_REDESIGN.md](ZHITOV_PARITY_REDESIGN.md); az ott felülírt korábbi döntéseket a [ROOF_CALCULATION_SPECIFICATION.md](ROOF_CALCULATION_SPECIFICATION.md) § Zhitov referencia-felderítés jelöli.
- **Javított hiba:** `calculateRafterGeometry` a ferde hosszat `hypot(félfesztáv + eresz, emelkedés)` alakban számolta, miközben a hajlást a félfesztávból vette — az eresz így ellaposította a tetőt. Helyes alak: a hosszak a szarufa felső éle mentén, `(félfesztáv + eresz) / cos(hajlás)`. A példaadatokon 4031 helyett 4207 mm. A függvény új `seatCutHeightMm` (madárszáj vízszintes vágásának magassága) bemenetet kapott, és `bodyLengthMm` / `eaveLengthMm` bontást ad. A régi teszt csak eresz nélkül vizsgálta, ezért nem bukott el.
- **Új a felületen:** hét tetőformát kínáló formaválasztó (nyereg, félnyereg, konty, sátor, félkonty, L, T) formafüggő mezőkkel; „Kiindulási adatok" visszaolvasás minden kalkulátoron; elemenkénti vágáslista (azonos hosszak összevonva, hossz + db) a faanyag-kalkulátoron; a vállalt korlát akkor is látszik, ha nincs „Fő eredmények" sor.
- **Nem változott:** a `GABLE_CALCULATOR_ID = "roof.gable"` perzisztált `calculator_type` érték és a mentett számítások — az építési katalógus nem perzisztál, ezért az átnevezés adatmigrációt nem igényel, és megszüntet egy névütközést.
- **Ellenőrzés:** `npm run typecheck`, `npm run lint` (No issues found), `npm test` 143 fájl / 796 PASS, 8 fájl / 19 kihagyva. Böngésző: a szarufa-kalkulátor 3000/2000/500/100 mm-re 3551,056 / 591,843 / 4142,899 mm és 57,653° értéket ad (a referenciaoldal kerekített 3551 / 592 / 4143 / 58° adataival egyezik); kontytetőre 10×6 m, 45° mellett a vágáslista 8 hosszcsoportot ad (4243 mm × 14 db …). `npm run build` nem futott.
- **Nem implementált a specből:** betűkódos mezőjelölés és rajzlegenda (§2 B2), nyomtatási nézet és fekete-fehér rajz (B7, C1), méretszám és alkatrész-számozás a rajzon (C5, C6), alternatív kiszerelés (C8), bővített súgóblokk (D1–D8), manzárd a közös geometria-motorban. A manzárd ezért továbbra sem kap anyagkiosztást.

## F9.46.1 — „Bádogos elemek hozzáadása” eltávolítása

Státusz: **COMPLETE a helyi, mért hatókörre** (csak frontend; DB, séma, migráció, szerveroldali validáció nem változott; nincs commit).

- **Törölve:** `survey-work-elements.tsx`, `work-element-suggestions.ts` (+teszt), a szerkesztő elem-állapota és kezelői (hozzáadás, másolás, törlés, élhossz-javaslat elfogadása), a `.work-element-*` CSS. Az új felmérés nem kínál munkaelemet. A „Másik tető / egyéb szakasz” gombok megmaradtak egy opcionális „Másik munkaszakasz hozzáadása” blokkban.
- **Megőrizve (szándékosan):** a `workspace.ts` sémája és a `work-elements.ts` domain (régi revíziók, anyaglista-forrás `survey-material-source`, duplikátum-jelzés). Régi felmérés elem-szakaszai nem jelennek meg és nem szerkeszthetők, de a piszkozatban/mentésben változatlanul megmaradnak, az anyaglista továbbra is használja őket. Új elem nem hozható létre.
- **Ellenőrzés:** typecheck, ESLint, Vitest src/features+domain 123 fájl/743 PASS (új teszt: régi, elemszakaszos felmérés megnyílik, nincs „Bádogos elemek”); böngésző: mentett kontyolt felmérés megnyílik, mezők/terület rendben. Build nem futott.

## F9.46 — Kontyolt/sátor/félkonty/L/T tetők egységes felmérés-felülete

Státusz: **COMPLETE a helyi, mért hatókörre** (csak UI + tiszta domain-segéd; geometria-motor, séma, migráció, szerveroldali validáció, persistencia nem változott; nincs commit, nincs pgTAP-igény).

**Támogatási mátrix (mérési módok):**

| Tetőforma | Gyors | Épületméretek | Részletes | Indok |
|---|---|---|---|---|
| Nyereg / Félnyereg | igen | igen | nyereg: igen | változatlan |
| Kontyolt, Sátor, Félkonty, L, T | **nem** | **igen** (meglévő motor, 1 egységes hajlás) | **nem** | gyors/részletes mód csak a síkok közti szimmetria/azonos hajlás feltételezésével, új levezetéssel és szerveroldali forrással (új RPC/migráció) lenne igazolható; ez nincs, ezért nincs hamis mód |

- **UI:** a hat nem-nyereg/félnyereg alak ugyanazt a kompakt mezőt (egységválasztó, (i) súgó a meglévő `measurementGuideForSurvey` szövegéből, nincs ⋯ menü) és ugyanazt a bal mezők/jobb rajz keretet használja, mint a nyereg/félnyereg. Mezőcsoportok: félkonty = Főtető/Félkonty; L, T = Főtető/Szárny (`surveyRoofFieldGroups`). Módválasztó nincs (egyetlen igazolt módszer). Eltávolítva: „csak a tetőforma saját méretei…” bekezdés, „A rajz … után jelenik meg” üzenet, útmutató-sáv, sablonmérés-gombok. Egyedi mérések és ugyanazon szerepű duplikátumok az opcionális „További mérések” alatt szerkeszthetők (⋯ menüvel). Hiányjelzés: „Még hiányzik: …”, csak az első beírás után.
- **Validáció:** új `surveyRoofFieldMessages` (mezőszintű: egység/100 m/0–80°, majd a motor séma-szabálya: kontyolt hossz>szélesség, szárny<főtető, félkonty elfér) – csak jelző, a számítást és szerveroldali ellenőrzést nem helyettesíti.
- **Javítások:** hajlásszög-súgó/rajzkiemelés nem-nyereg alakoknál (`roofPitchDegrees`→`pitchDegrees` kulcs); a rajz „Mentett revízió” jelvényt kap mentett, módosítatlan állapotban (korábban mindig „Nem mentett előnézet”).
- **Ellenőrzés:** böngésző (helyi DEMO) mind az 5 alak: kezdőállapot, hiányos, érvénytelen (kontyolt 6×8 m; félkonty 2000 mm; T szárny ≥ főtető), érvényes (kontyolt 69,282 m², sátor 41,569 m², félkonty 69,282 m², L és T 92,376 m² – egyezik a motor kimenetével), mentés V1, újranyitás, Anyaglista panel (kontyolt, L: ellenőrzött tetőfelület, 69,282/92,376 m²); T: piszkozat-visszaállítás frissítés után, V2 mentés, V1 történeti nézet 92,376 m²; mobil 375 px világos téma, túlcsordulás nincs. **Nem futott:** minden alak külön tablet/világos-sötét mátrixa, félkonty/sátor/T anyaglista-átadás külön próbája, ajánlatpiszkozat az új alakokra.

## F9.45.4 — Egységes felmérés-munkaterület és UX-finomítás

Státusz: **COMPLETE a helyi, mért hatókörre** (csak UI; geometria, validáció, séma, persistencia nem változott; nincs commit).

- **Épületméretek (`RoofWorkspace`, `roof-workspace-survey`):** a külső szegélyes felület megszűnt; ugyanaz a keret/rácsos elrendezés, mint a gyors/részletes módnál (mezők + eredmény balra, rajz jobbra, ≥1024 px-en 1:1). Nyereg/félnyereg alatt a mezőnkénti (i) súgó marad, a külön útmutató-sáv nem jelenik meg (más tetőformáknál igen). Rajzpanel címe képernyőolvasónak, vizuálisan rejtett; az eredménypanel `compact` módban (`RoofGeometryResults`) cím/bevezető nélkül, rövid „számított” címkével. Mezőfej (címke + (i)) függőlegesen középre igazítva.
- **Műveletek:** Mentés és Anyaglista `aria-disabled` + `title` + rejtett leírás (`aria-describedby`), így billentyűzettel fókuszálható, érintésre rövid értesítés („Előbb mentsd a felmérést.”, „Nincs mentetlen módosítás.”, „Várd meg a fotók feltöltését.”, piszkozat/munkatípus/folyamatban). Egy Mentés + egy Anyaglista gomb, állandó magyarázó bekezdés nincs.
- **Kontraszt (meglévő tokenekkel, `.field-survey-card` hatókörben):** másodlagos gomb/módválasztó/mező határa `--muted`-ból keverve, helykitöltő `--muted`, kiválasztott mód `--brand-ink`, fókusz 3 px `--brand`; a ragadós mentősáv (nem mentett állapotban) `--background`-ból keverve alig áttetsző (mobilon az alatta lévő mezők nem látszottak át); mobilon kisebb módválasztó-felirat. Nincs új réteg/`!important`.
- **Ellenőrzés:** typecheck, ESLint, teljes Vitest 144 fájl/790 PASS (új: kompakt eredménypanel, letiltási indok), production build PASS. Böngésző (helyi DEMO): nyereg épületméret 1280/1024/768/375 px sötét + világos (nincs vízszintes túlcsordulás), mentés → V1, mód-váltás (épület értékei megmaradnak), mentés V2 → frissítés → mezők és mód megvannak, Anyaglista panel 73,93 m²; félnyereg épületméret, nem mentett piszkozat frissítés után visszaáll.
- **Nyitott:** a gyors/részletes módok mezői külön sablonok (mód-váltáskor csak az épületméret értékei maradnak meg, a korábbi viselkedés szerint); a félnyereg gyors mód külön képernyőképpel nem lett újra mérve; fizikai érintő-/screen reader próba nincs; „Következő lépések” blokk változatlan.

## F9.45.3 — Felmérés-felület egyszerűsítése

Státusz: **COMPLETE a helyi, mért hatókörre** (csak UI; számítás, validáció, séma, revízió, piszkozat és anyaglista-logika nem változott; nincs commit).

- **Eltávolítva:** bevezető bekezdések (módválasztó „Hogyan mérsz?”, „Mérd le…”, „Add meg…”, „Kezdd…”), a rajzpanel címe és az állandó „Kattints egy mezőre” sor, az Igen/Nem gombok magyarázó alcímei, az ismételt „rajz … után jelenik meg” üzenetek, a sablonos hosszú jegyzetek, a beágyazott `SurveyActions` blokk (Mentés + Anyaglista + állapot + magyarázat) és az alsó „Következő lépések” Anyaglista-gombja. Egy oldalon így **egy** Mentés és **egy** Anyaglista gomb van (a felső, ragadós mentősávban; Mentés = mindig mentés, mentve → letiltva; Anyaglista csak mentett, módosítatlan állapotban él, ekkor elsődleges).
- **Módválasztó:** kompakt gombsor, csak a tetőhöz támogatott módokkal (félnyereg: Gyors/Épületméretek; nyereg: + Részletes), rövid leírás (kis kijelzőn csak a címke, a leírás `title`).
- **Mérőűrlap:** a mezők az első képernyőn (gyors: 2 mező + „A két tetősík egyforma? Igen/Nem”); a mezőútmutató állandó szöveg helyett kis **(i)** súgógomb (billentyűzet/érintés, meglévő `AnchoredPopover`); a hibák a mező mellett maradnak. Eredménysor és „Még hiányzik: …” csak az első beírás után; üres állapotban semmi sem magyaráz.
- **Rajz:** üres állapotban csendes, szaggatott keretű helyfoglaló (nincs szöveg), kész rajznál a meglévő SVG, a jelmagyarázat csak rajz mellett; a szemléltető alak jelzése egy rövid mondat. **Eredmény:** nagy „Tetőfelület 88,20 m²”, rövid „számított/mért” címkék, egyetlen rövid megjegyzés („Tetőfelület, nem anyagmennyiség”).
- **Közös:** az átalakítás a közös `quick-gable-workspace.tsx` kereten és a szerkesztő mentősávján történt (nyereg gyors/részletes, félnyereg gyors; az épületméret-mód ugyanazt a mentősávot/mezőbúgót használja, a duplikált „rajz … után jelenik meg” szöveg megszűnt gable/shed alatt). CSS: a meglévő tokenekkel, mobilon 3 oszlopos módválasztó és egy sorba tört mentősáv.
- **Ellenőrzés:** typecheck, ESLint, Vitest 137 fájl/749 PASS (új `survey-workspace-ui.test.tsx`: módok, üres állapot szöveg nélkül, eredmény, hiány/hiba jelzés; a régi `survey-actions.test.tsx` megszűnt, a szerkesztő-teszt a félnyereg „Még hiányzik” szövegére igazítva), production build PASS. Böngésző (helyi DEMO): nyereg gyors → mód-oda-vissza (épület/részletes/gyors), mentés → „Mentve · V1”, egy Mentés + egy Anyaglista gomb, anyaglista-panel 88,2 m²; félnyereg üres/részleges/érvényes/érvénytelen állapot, épületméret-mód mezői; súgó-popover; piszkozat-megőrzés navigáció után (8,5×4,2); mobil 375 px (nincs vízszintes túlcsordulás), tablet 768 px világos téma, asztali sötét.
- **Nyitott:** a nyereg „Épületméretek” és más tetőalakok munkaterülete (`RoofWorkspace`) a régi, nagyobb elrendezést használja (csak szöveg-/duplikáció-tisztítás történt); világos téma másodlagos gombjai halványak; a Részletes mód mobilon nem lett külön képernyőképpel ellenőrizve; a „Következő lépések” blokk (munkanapló, fotók) változatlan.

## F9.45.2 — Láthatatlan, böngészőlokális felmérés-piszkozat (QA-javítva)

Státusz: **COMPLETE a helyi, mért hatókörre** (csak kliens; séma/szerver/migráció nem változott; nincs commit).

- **Tervezés (QA után):** a rekord kulcsa `tetopro-survey:{user}:{org}:{cél}:{lap-id}`; a **lap-id** a `sessionStorage`-ban él (frissítést túléli, lapok között nem közös), cél = mentett felmérés id vagy `n-{draftId}` (új felmérés, URL `?draft=`). Minden lap csak a saját rekordját írja, így nincs felülírás. Másolt lapnál (azonos sessionStorage) a `BroadcastChannel` „él-e ilyen lap-id” kérdésre válaszoló eredeti miatt az új lap új id-t kap (Web Lock erre nem megbízható: frissítés után röviden lóghat; csak élő-jelzésre marad). Ha nincs sessionStorage/BroadcastChannel, az id betöltésenként új: soha nem keveredik más lapéval.
- **Helyreállítás (`resolveRecovery`):** csak a lap **saját** rekordja, vagy a főoldal által név szerint megadott (`?recover={cél}.{példány}`) állítható vissza; **más lap piszkozatát semmi nem választja ki automatikusan** (a korábbi `found[0]` fallback megszűnt), csak megszámolja és a főoldalra irányít. Azonos alap-verzió → csendes visszaállítás; újabb mentett verzió → magyar ütközésbanner (az alábbi mezők a legújabb mentett változatot mutatják): „Visszaállítom, és új változatként mentem” / „Most nem döntök” (a rekord új egyedi kulcsra költözik, így az automentés nem írja felül) / elvetés megerősítéssel. Explicit visszaállítás a lap saját, eltérő piszkozatát előbb félreteszi. Egy lap sikeres mentése csak a saját rekordját törli.
- **Helyreállítás:** a lap saját korábbi rekordja (frissítés) és a főoldali „Folytatás” (`?recover={cél}.{példány}`) azonnal, banner nélkül állít vissza, ha a piszkozat alap-verziója egyezik a mentettel; a visszaállításkor előbb a saját rekord íródik, utána törlődik a forrás. Ha a felmérésnek közben új változata készült: magyar ütközésbanner (visszaállítás **új változatként** / „most nem döntök, a piszkozat megmarad” / elvetés megerősítéssel); nincs automatikus összefésülés, a korábbi változat érintetlen. Régi (`…:new`, `…:{surveyId}`) rekordok olvashatók; a régi `new` egy friss draft-azonosítóra költözik, más piszkozatot nem vesz át.
- **Hibák:** (0) frissített lap egy másik lap piszkozatát kínálta fel sajátként (`found[0]`, elveszett lap-azonosító) → saját rekord pontos kulccsal; (1) két lap, A mentése törölte B piszkozatát, B szerkesztése sosem íródott → javítva; (2) minden új felmérés a közös `:new` kulcsot használta → egyedi `draftId`.
- **Ellenőrzés:** lint, typecheck, Vitest 136 fájl/748 PASS (új: két lap külön rekord, saját törlés, élő/frissített lap, Web Locks nélküli eset, új felmérések különállása, régi kulcsok, user/szervezet szűrés), production build PASS; pgTAP nem futott (DB nem változott). Két valódi böngészőlap (helyi DEMO): előtte reprodukálva (a localStorage üres, B szerkesztés elveszett); utána A: két független rekord; B: A mentése (V5) csak a saját rekordját törölte; C: B stale mentési hiba → frissítés → magyar ütközésbanner, piszkozat megvan; H: „új változatként” → V6 (V5 érintetlen, nincs összefésülés); D/E: két új felmérés külön `n-…` rekord, frissítés a saját értékét állítja vissza; régi `new` rekord migrálva; mód (épületméret) frissítés után megmarad; főoldal három sora (élő lap külön jelölve).
- **Újraellenőrzés (két valódi lap):** V9 → B 9,3×4,4 autosave; A 9,6×4,2 mentés = V10 (B rekordja érintetlen); B mentés → stale hiba; B frissítés → ugyanaz a lap-id, saját rekord 9,3×4,4/alap V9, ütközésbanner; „új változatként” → V11 = 9,3×4,4, V10 = 9,6×4,2, V9 = 9×4 érintetlen, piszkozat törölve; lap-azonosító nélkül (más rekord, nincs saját) nincs banner, csak jelzés; főoldali Folytatás pontosan a megnevezett rekordot állítja vissza. **Nyitott:** böngészőújraindítás és hálózatkimaradás kézzel nem próbálva; két lap egyidejű betöltése ugyanazzal a másolt lap-id-vel (BroadcastChannel-verseny) elméletileg ütközhet; az elvetés-megerősítés a főoldalon (inline) ebben a körben nem lett újra végigpróbálva; a lezárt lapok elhagyott rekordjai addig maradnak, amíg a felhasználó el nem veti őket; fotó-bináris nem állítható vissza; ugyanazon új-felmérés draft URL két lapon megnyitva két rekordot ír (nem veszít, de két piszkozatként jelenik meg).

## F9.45.1 — Félnyeregtető: gyors mérés és QA-javítások

Státusz: **COMPLETE a helyi, mért hatókörre** (nincs commit, hosted DB nem érintett, `db reset` nem volt).

- **Mérési módok (nem minden alakhoz három):** félnyeregtető = **gyors** (eresz menti hossz × lejtő menti hossz, téglalap alakú sík; hajlásszög/emelkedés nem származik) és **épületméretek** (hossz, vízszintes mélység, hajlásszög → meglévő `calculateRoofGeometry`; mód nélküli régi rekord = épületméretek). Részletes mód nincs (a téglalap két mérettel teljes). Többi alak (jelöltek): hip/pyramid = oldalhossz + hajlásszög közvetlenül; halfHip/L/T = csak épületméret + hajlásszög, külön mérési szerződés kell. Nem implementálva.
- **Forrás:** `roof.shed.quick` (`save_survey_quick_shed_geometry_source_secure`; az adatbázis a revíziószakaszból maga számolja újra a bemenetet és a területet), migráció `20261019080000` (helyben alkalmazva `migration up`-pal); a szakaszvalidátor a `roofMeasurementMode`-ot félnyeregre is engedi (quick/building). Élszerepek (anyaglista élhossz) félnyeregre nincsenek: csak terület megy át.
- **Javított QA-hibák:** (1) mód-váltás mentési hiba („Unrecognized key: key”): a `RoofField` UI-metaadat a piszkozatba szivárgott → `addMissingMeasurements`/`appendSurveyMeasurement` explicit mezőket vesz át (a szigorú séma érintetlen); (2) történeti gyors félnyereg-előnézet eltűnt → `HistoricalSurveyRoofGeometry` a mentett revíziószakaszból számol (`calculateQuickShed`); (3) mm/m hibaüzenet: „Milliméterben egész értéket adj meg. Ha méterben mérsz, válts m egységre.”, épületméret-módban mezőszintű üzenetek (`shedBuildingFieldMessages`, 100 m, 0–80°).
- **Ellenőrzés:** typecheck, ESLint, Vitest src/features+domain+app 135 fájl/731 PASS (19 kihagyva), teljes pgTAP 57 fájl/1233 PASS (új `055`), production build PASS. Böngésző (helyi DEMO, 1024): gyors → mentés → újranyitás → anyaglista (35,7 m², `calculated`); gyors→épület (37,991 m²)→mentés V2→újranyitás; épület→gyors→mentés V3; V1/V2 történeti nézet helyes; mm-ben tizedes hibaüzenet; nyeregtető gyors/épület/részletes váltás + mentés (88,2 m²).
- **Nyitott:** tablet/mobil és világos téma nem lett újra mérve; félnyeregtetőnél munkaelem-élhossz javaslat nincs (csak terület); DEMO tesztrekordok és a helyi teszt-felhasználó (`claude.shed.test@local.test`) a helyi DB-ben maradtak.

## F9.44.6 — Felmérés-felület egységesítése

Státusz: **COMPLETE a helyi, mért hatókörre** (csak UI; séma, számítás és forráslogika nem változott). Nincs commit, nincs migráció, `npm run build` sikeres.

- **Stabil gombok:** mind a három nyeregtető-módban (és a többi tetőformánál) ugyanaz a `SurveyActions` sor: „Mentés” mindig ment (nincs mentve → elsődleges; mentve → letiltva, „Mentve · V#”; mentés közben „Mentés…” és letiltva), „Anyaglista készítése” külön gomb, mentés nélkül letiltva egyszerű magyarázattal („előbb mentsd”). A korábbi, szerepet váltó gomb megszűnt.
- **Egységes mérési élmény:** az Épületméretek mód is rövid bevezetőt, mezőútmutatót, m/mm váltót kapott, a „…” menü, a „Mérés hozzáadása”/sablonok sor nyeregtetőnél kikerült; a „Kötelező a rajzhoz” piros jelzések csak írás megkezdése után jelennek meg; egységes „Még hiányzik: …” üzenet. A nem kötelező részletes mérések (oromszél, hajlásszög) zárt „Nem kötelező mérések” panelben vannak (hibánál/kitöltve nyitva).
- **Elrendezés:** mobilon a sorrend mezők → rajz → eredmény; asztalon két oszlop (rajz ragad); az egyetlen szakasz fülsora eltűnt; a bádogos elemek/új szakasz panel zárt, a mérés alatt. A mentősáv nagy szövegméretnél szavanként törik és tördel.
- **Rajz:** jelmagyarázat (mért méret / szemléltető, nem mért), szaggatott körvonal a szemléltető alakzatnál (nem szabályos trapéz, A-val azonosnak jelölt B sík), „B sík (= A)”, kiemelt aktív méret és rövid útmutató a rajz felett; a rajz sehol nem állít pontos alakot.
- **Ellenőrzés:** typecheck, ESLint, Vitest src/features+domain+app 126 fájl/718 PASS (új `survey-actions.test.tsx`), teljes pgTAP 56 fájl/1216 PASS, production build; böngésző: első felmérés, mindhárom mód, mentés/szerkesztés/újranyitás, gomb-állapotok (nincs mentve → mentés közben → mentve → módosítva), módváltás adatvesztés nélkül, desktop sötét, tablet/mobil, 150% szövegméret: nincs vízszintes túlcsordulás.
- **Nyitott:** valódi, új felhasználóval nem tesztelve; az Épületméretek mód elrendezése (mezők → rajz → eredmény egymás alatt, a meglévő rajzzal) még nem azonos a gyors/részletes kétoszlopos kerettel; a rajzok nem zoomolhatók a gyors/részletes módban; a kényes „valószínű duplikátum” megerősítés megmaradt; a nem nyeregtetők (shed, hip…) kezelőfelülete nem lett átdolgozva; a teszt-felhasználó és DEMO tesztrekordok a helyi DB-ben maradtak.

## F9.44.5 — Részletes nyeregtetőmérés és egyszerűbb felmérés

Státusz: **COMPLETE a helyi, mért hatókörre** (mentés → újranyitás → ellenőrzött forrás → anyaglista → ajánlat → munkadíj böngészőben végigvíve; `npm run build` sikeres). Nincs commit, hosted DB nem érintett, `db reset` nem volt.

- **Részletes mód (nyeregtető):** gerinc + síkonként eresz és lejtő menti (merőleges) hossz; minden sík trapéz (`(eresz + gerinc)/2 × hossz`, téglalap ha eresz = gerinc). Oromszél téglalapnál a lejtő menti hossz, másnál csak mérve (hossz ≥ lejtő menti hossz és ≤ √(h² + (eresz − gerinc)²), különben érthető hibaüzenet); mérés nélkül „még nem ismert”, nem találgat. Hajlásszög opcionális, csak rögzítve, sosem számít. B sík csak kifejezett „egyforma síkok” döntéssel másolódik A-ból; ellentmondó B elutasítva. Eredet: `calculateDetailedGable` + `detailed-gable-section.ts`.
- **Ellenőrzött forrás (migráció `20261019070000`, helyben):** `roof.gable.detailed`; a `save_survey_detailed_gable_geometry_source_secure` a revíziószakaszból maga számolja újra a bemenetet, a területet és az élösszegeket, a hívó értékét nem fogadja el; a mérési validátor/szakasz-validátor bővült (új szerepek, `detailed` mód); az anyaglista-RPC élhossz-eredete ismeri az új forrást. pgTAP `054`; a `050` módosult (a `detailed` már érvényes).
- **Mód-átvitel:** módváltáskor minden érték megmarad; részletes módra váltáskor a gyors mérés hossza csak az üres gerinc/eresz mezőkbe kerül (nem felülírás), a rejtett módok értékei sosem publikálódnak (`gableGeometryFromSurveySection` null gyors/részletes módban). Gyors módra visszaváltáskor a rejtett épületméret/részletes értékek megmaradnak.
- **Egyszerűsítések:** a „Bádogos elemek” és az „Új szakasz” gombok egy zárt, opcionális panelbe kerültek a tetőmérés alá (korábban nyitva, a feladat felett); a mezők alatt rövid útmutató; nem szabályos síknál jelennek meg az oromszél-mezők; a hiányzó mezők nem pirosak, amíg nem kezdesz írni; közérthető üzenetek („Még hiányzik: …”); a mezők „…” menüje (átnevezés, szerep, törlés) a tetőmérésnél eltűnt, helyette m/mm váltó; egységes „Hogyan mérsz?” módválasztó rövid leírással; az eredménypanel alján egy gomb a következő lépésre: nem mentett állapotban **„Mentés”**, mentve **„Anyaglista készítése”**; mentve/nem mentve állapotsor.
- **Ellenőrzés:** typecheck, ESLint, Vitest src/features+domain+app 125 fájl/715 PASS, teljes pgTAP 56 fájl/1216 PASS, production build; böngésző: gyors → részletes váltás előtöltéssel, trapéz (65,75 m²) és hibás oldal-hossz, mentés V1, újranyitás azonos, anyaglista (65,75 m², `calculated`), ajánlat + 1350 Ft/m² munkadíj = 88 762,50 Ft, módváltás oda-vissza; tablet 768, mobil 375, világos/sötét: nincs túlcsordulás.
- **Nyitott:** a gyors és részletes rajz nem zoomolható/húzható (kiterített, méretarányos); a trapéz rajza szemléltető (a ferde szél helyzete nem mért); ellentmondó oldalhossz-párok (ívelt/ferde) csak tartomány-ellenőrzést kapnak; legfeljebb nyeregtetőre; a teszt-felhasználó és DEMO tesztrekordok a helyi DB-ben maradtak; tablet 768 egyoszlopos (két oszlop 960 px-től); az „ismeretlen eredet” jelölés régi, forrás nélküli adatokra nincs külön.

## F9.44.4 — Mérési eredet és duplikátum-felismerés

Státusz: **COMPLETE a helyi, mért hatókörre.** Nincs commit, hosted DB nem érintett, `db reset` nem volt.

- **Eredet (migráció `20261019060000`, helyben):** a `save_workflow_material_list_from_survey_revision` mérési ága (azonos szignatúra/jog) az elfogadott tetőél-hossznál (`lengthSource`) a változtathatatlan forrásrevízió rögzített, ellenőrzött tetőforrásához (`roof.gable.quick` / `roof.gable`) méri az értéket: **`calculated`** csak amíg egyezik (±0,5 mm); eltérő érték **`overridden`** (az eredeti számított érték és a forrás azonosítója megmarad az `origin` objektumban); forrás nélküli mérés **`measured`**; nem ellenőrizhető forrás sosem lesz `calculated`. Becslés nincs támogatva, ezért nem is jelenik meg. Régi listák/revíziók változatlanok; pgTAP `053`.
- **TS:** `measurementOrigin` (ugyanaz a szabály az anyaglista-panelben), a forrás-betöltő a rögzített élhosszakat is olvassa, `QuantityKind` bővült, a panel és az anyaglista „mért / számított / kézzel felülírt” jelölést és az eredeti számított értéket mutatja; a korábbi „(tetőgeometriából számított)” címke-megoldás megszűnt (régi mentett címkék változatlanok).
- **Duplikátum:** a korábbi „azonos tetőél” figyelmeztetés megszűnt (ereszcsatorna + ereszszegély azonos élen szabályos). Valószínű duplikátum = azonos elemtípus + azonos méretek (legalább egy kitöltött) + nem ellentmondó forrásél; csak figyelmeztet, nem töröl/tilt; az anyaglista-panel a kiválasztott duplikátumoknál egyszer kifejezett megerősítést kér. A másolat megtartja az eredetet (számított érték nem lesz észrevétlenül „mért”).
- **Ellenőrzés:** typecheck, ESLint, Vitest (src/features+domain+app), teljes pgTAP (55 fájl/1203); böngésző: számított él → anyaglista (`calculated`, 21000 mm eredeti), közvetlen mérés (`measured`), kézi felülírás (`overridden`, eredeti 21 m megmarad), ereszcsatorna+ereszszegély ugyanazon élen figyelmeztetés nélkül, másolt ereszcsatorna → duplikátum-jelzés + megerősítés, mentés/újranyitás.
- **Nyitott:** régi (F9.44.3 előtti) szakaszok `lengthSource` nélkül `measured`-ek maradnak; az ellenőrzés csak gyors és épületméretes nyeregtető-forrásra van; azonos típus + azonos méret két valódi külön munka esetén is jelzést kap (a megerősítés szándékos); `build` nem futott.

## F9.44.3 — Moduláris bádogos munkaelemek egy felmérésben

Státusz: **COMPLETE a helyi, mért hatókörre** (több elem + csak-ereszcsatornás felmérés mentése, újranyitása, revíziói, anyaglista-átvétel böngészőben). A részletes tetőmérés és az autosave továbbra sincs kész. Nincs commit, hosted DB nem érintett, `db reset` nem volt.

- **Adatmodell:** egy elem = egy meglévő felmérés-szakasz (`sections[]`) két új, opcionális kulccsal: `elementKind` (11 típus: ereszcsatorna, lefolyócső, orom-/eresz-/fal-/gerincszegély, vápalemez, kémény, tetőablak/áttörés, javítás, egyedi) és `lengthSource {roofSectionId, role}` (kifejezetten elfogadott tetőél-javaslat; a tetőszakasz ugyanabban a változtathatatlan revízióban van, így a forrásrevízió pontos). Migráció `20261019050000` (helyben): csak a szakasz-validátor bővül (típus↔munkatípus egyezés, forrás-szerep érvényesség); régi szakaszok/revíziók változatlanok; pgTAP `052`.
- **Kód:** `domain/field-surveys/work-elements.ts` (katalógus, sablonok, séma), `survey-work-elements.tsx` (kibontható kártyák: név, releváns mezők, állapot, javaslat, megjegyzés, fotó, másolás, törlés), `work-element-suggestions.ts` (tetőélek: eresz összesen, gerinc, oromszél összesen — csak teljes nyeregtetőből, gyors és épületméret módban). Az elemek nem jelennek meg fülként; a hagyományos szakaszok és a „Tető / Egyéb munka” választás változatlan.
- **Javaslat:** csak gombnyomásra kerül a mezőbe; eltérő kézi érték felülírása megerősítést kér; módosítás után „kézzel módosítva” jelzés; ugyanazon tetőél több elemnél → dupla számolás figyelmeztetés (nem blokkol). A másolat nem örökli a forrást. Átvételkor a mérés neve „(tetőgeometriából számított)” jegyet kap, így az anyaglista-forrásmegnevezés is jelzi; kézi módosításkor a jegy törlődik.
- **Anyaglistába csak** a meglévő szerződés szerint: ereszcsatorna, szegélyek és vápalemez **szakaszhossza méterben** (mért forrás); a kitöltetlen/nulla nem kerül át. Lefolyócső, kémény, tetőablak/áttörés, javítás, egyedi elem, darabszámok, szélességek csak rögzítettek (nem átvehetők), becslés nincs.
- **Ellenőrzés:** typecheck, ESLint, Vitest, pgTAP lásd a lezáró riportot; böngésző: tető (88,2 m²) + 6 elem (javaslat-átvétel, kézi módosítás, másolat, hiányos kémény/javítás) → mentés V1/V2, újranyitás azonos, revíziólista; anyaglista 88,2 m² + 21 + 10,5 + 21 + 21 m, a hiányos elemek nélkül; csak-ereszcsatornás felmérés (12,5 m) mentve/újranyitva/átvehető; mobil nincs túlcsordulás.
- **Nyitott:** az anyaglista-RPC a javaslatból átvett hosszt is `mért`-ként címkézi (a `quantityKind` DB-oldali; csak a megnevezés jelzi a számított eredetet) — pontosítás RPC-módosítást igényel; az ereszcsatorna és ereszszegély azonos élének dupla átvétele csak figyelmeztetés; „Egyéb munka” kezdéskor egy üres általános szakasz is létrejön; legfeljebb 30 szakasz/elem; a teszt-felhasználó és DEMO tesztfelmérések a helyi DB-ben maradtak; `build` nem futott.

## F9.44.2 — Gyors mérés → ellenőrzött forrás → anyaglista → ajánlat

Státusz: **COMPLETE a helyi, mért hatókörre** (mentés → újranyitás → anyaglista → ajánlat → munkadíj böngészőben végigvíve). F9.44 egésze (részletes mód, munkaelemek) továbbra is NEM kész. Nincs commit, hosted DB nem érintett, `db reset` nem volt.

- **Migráció `20261019040000` (helyben):** új `roof.gable.quick` forrástípus ugyanabban az immutable `field_survey_roof_geometry_sources` táblában; `private.survey_quick_gable_input` a revízió-szakaszból **maga számolja újra** a bemenetet (mért hossz mm/m → egész mm, kifejezett síkdöntés, egyforma síkoknál ellentmondó B elutasítva, duplikált/hiányos/megerősítetlen → nincs forrás), a `save_survey_quick_gable_geometry_source_secure` (csak `tetopro_covering_writer`) a területet is újraszámolja (`hossz × (A+B) / 10⁶`), a hívó értékét nem fogadja el; idempotens, eltérő bemenetre 40001. Az anyaglista-RPC változatlan (`surveyGeometry` hivatkozás).
- **TS:** `quick-gable-section.ts` (szakasz → pontos forrásbemenet; null ha nem hiteles), `persistSurveyQuickGableGeometrySource`, rögzítés a meglévő `recordSurveyRoofGeometrySources`-ban; `geometryPending` a quick szakaszt is ismeri. Gyors módban a rejtett épületméretek továbbra sem publikálódnak; épületméret módban a rejtett gyors értékek sem.
- **UX:** mért/számított jelölők, „átvehető” állapot (mentett V# vs mentetlen), tizedesvessző az újranyitott értékekben (`10,5`), az ellentmondó B sík látható marad hibajelzéssel. **Javított hiba:** az anyaglista-panel sikerüzenete/idempotencia-kulcsa új mentett verzió után is megmaradt (`key={version}`), így a következő verzió listája helytelenül „létrehozottnak” látszott.
- **Ellenőrzött folyam (DEMO org):** 10,5 m × 4,2 m egyforma → 88,2 m² (V1 forrás) → anyaglista (forrásérték 88,2, `geometry`) → ajánlat-piszkozat → munkadíjsor 1350 Ft/m² = 119 070 Ft → elszámolt mennyiség kézi felülírása 90 m² = 121 500 Ft; a mentett ajánlatrevízió külön őrzi `sourceQuantity 88.2` és `quantity 90`, felmérés-/anyaglista-revízió hivatkozással. Eltérő síkok (4,2 + 3,5) → 80,85 m² (V2 forrás, új lista, V1 változatlan). Épületméret mód regresszió → 84,852814 m² (`roof.gable`, V3), a gyors források nem keverednek. Nulla/hiányos/ellentmondó bemenet nem ad területet. Mobil 375 sötét, desktop két oszlop.
- **Ellenőrzés:** typecheck, ESLint, Vitest src/features+domain+app, pgTAP teljes (új `051`), lásd a lezáró riportot a pontos számokért.
- **Nyitott:** részletes mód és külön munkaelemek (F9.44.3+), autosave, zoom/pan a kiterített rajzon, mobilon a rajz az eredmények alatt; a teszt-felhasználó (`claude.f944@local.test`) és a DEMO tesztfelmérés/lista/ajánlat a helyi DB-ben maradt; `build` nem futott; tablet/világos téma ezúttal csak a korábbi fázisban nézve.

## F9.44.1 — Moduláris felmérés: gyors tetőmérés (nyeregtető) — 1. fázis

Státusz: **F9.44 NEM KÉSZ; csak az 1. fázis (F9.44.1) kész a helyi, mért hatókörre.** Nincs commit, hosted DB nem érintett, `db reset` nem volt.

- **Újrahasznált:** `RoofWorkspace`/`MeasurementField`/`GlassDisclosure`, a szakasz-alapú felmérés-séma és immutable revíziók, piszkozat-helyreállítás, tokenes Liquid Glass. A geometriamotor és az „Épületméretek” folyamat változatlan.
- **Új:** `domain/field-surveys/quick-gable.ts` (tiszta számítás: eresz-irányú hossz × síkonkénti lejtő menti hossz; hiányzó érték ≠ 0; tizedesvessző; mm/m; „egyforma síkok” csak kifejezett megerősítéssel, ellentmondó B sík elutasítva), `quick-gable-workspace.tsx` (módválasztó, megerősítés, eredmények, méretarányos **kiterített síkrajz** csak mért értékekből, fókuszkiemelés), szakaszmezők `roofMeasurementMode` (`quick|building`, hiányzó = régi épületméret) és `quickPlanesMatch`. Új szerepek: `roof_eave_run`, `roof_plane_slope_a|b`. Új nyeregtető-szakasz alapértelmezetten gyors mód; „Részletes mérés” csak jelölt, letiltott (F9.44.3).
- **Migráció `20261019030000` (helyben alkalmazva):** csak a két validátor bővül (új szerepek, mód/megerősítés kulcsok); meglévő rekord/revízió nem íródik át; pgTAP `050`.
- **Forrás/hitelesség:** `gableGeometryFromSurveySection` gyors módban `null` → a rejtve megőrzött épületméretekből nem készül ellenőrzött forrás, anyaglista- vagy ajánlatforrás. A gyors felület **nem publikálódik** lefelé (a DB-szerződés a gable-motor bemenetét ellenőrzi; új forrástípus kell → F9.44.2), ezt a felület is kimondja.
- **Módváltás:** minden érték megmarad, csak a cél mód hiányzó mezői jönnek létre; a nem aktív mód mezői rejtettek és nem számítanak.
- **Ellenőrzés:** typecheck, ESLint, Vitest src/features+domain+app 122 fájl/698 PASS (új `quick-gable.test.ts`, editor-teszt), teljes pgTAP 52 fájl/1166 PASS; böngésző (helyi, saját teszt-felhasználóval): 10,5 m × 4,2 m egyforma síkok → 88,20 m², mentés V1, újratöltés után mód/érték/megerősítés megmarad, eltérő síkok B nélkül → nincs terület, módváltás oda-vissza adatvesztés nélkül, mobil 375 + tablet 768 nincs vízszintes túlcsordulás, világos/sötét téma, desktop két oszlop (≥960 px).
- **Nyitott / nem ellenőrzött:** a gyors rajz nem zoomolható/húzható (a régi rajz igen); mobilon a rajz az eredmények alatt van; újranyitáskor az érték pontjelű (`10.5`, meglévő viselkedés); autosave nincs (csak a meglévő session-piszkozat); `build` nem futott; a teszt-felhasználó (`claude.f944@local.test`) és egy „DEMO” tesztfelmérés a helyi DB-ben maradt.

**Terv F9.44.2 (függőségi sorrend):** (1) új `survey_roof_geometry_sources` forrástípus gyors méréshez + DB-újraellenőrzés + pgTAP → anyaglista/ajánlat-publikálás; (2) önálló munkaelemek egy felmérésben (ereszcsatorna, lefolyó, szegély, kémény, tetőablak, javítás) a meglévő szakasz-sémán; (3) „Épületméretek” mód közös eresz/oromtúlnyúlás felülbírálással; (4) mért/számított/becsült jelölés és eltérés-figyelmeztetés felülírásnál; (5) mobil: rajz a mezők mellett; (6) autosave-terv (külön piszkozat-tábla, verzióellenőrzés, nem revízió).
**Terv F9.44.3:** (1) részletes mód: síkonként/élenként mért méretek a támogatott tetőformákra; (2) többi tetőforma módtámogatása csak bizonyítottan érvényes kombinációkra; (3) zoom/pan/réteg a kiterített rajzon; (4) automatikus javaslat meglévő hosszakból munkaelemekhez; (5) teljes regresszió + build.

## F9.43.2 — Termékoldal, műszaki rajz és felmérési mentősáv finomítása

Státusz: **COMPLETE a helyi, mért hatókörre.** Csak UI; üzleti logika, számítás, séma és perzisztencia nem változott. Nincs commit.

- **Anyagkezelő termékoldal:** a fejléc tartalmazza a kategóriát, gyártót és termékkódot; a „Termékadatok” és „Egységek és variánsok” egységes üveg-panel (tokenes sugár/keret/belső tér, a korábbi lapos `.material-editor-card` felülírás javítva); a `.material-field` nem nyújtja a select-et.
- **Műszaki rajz (4 nézet):** `placeDimensions` (annotation-layout): a méretvonalak a rajz dobozán kívülre kerülnek, azonos oldalon szintekben (a címke szélességéhez igazított távolsággal). A rajz függőleges tengelye javítva (a gerinc felül; korábban fejjel lefelé rajzolt), a címkék határoló dobozát nem képezi le újra a `mapPoint`, a „illesztés” a `meet` nézetre számol és a középre igazítás zoomolt egységben történik; min. zoom 0,4. A geometria, mértékek és számítások változatlanok.
- **Felmérési mentősáv:** fejléc-sugár és -keret, nem mentett állapotban elsődleges gomb emelkedő hover-rel, mentett állapotban semleges, letiltott `secondary` gomb hover nélkül; `prefers-reduced-motion` tiszteletben tartva.
- **Ellenőrzés:** typecheck, ESLint, Vitest (features/domain/app 121 fájl PASS); böngésző: mind a 4 nézet 0 átfedés/0 levágott címke (DOM-mérés), világos/sötét téma, mobil 375 px nincs vízszintes túlcsordulás, mentősáv állapotváltás (mentett → módosítás).
- **Nyitott:** a rajz-zoom vezérlés kézi (egér/pinch) viselkedése csak a meglévő egységtesztekkel igazolt; a felmérés tényleges mentése nem lett lefuttatva (DEMO rekord védelme); a régi, réteges rajz-CSS nem lett takarítva; `build` nem futott.

## F9.43.1 — Egységes árszerkesztő és Liquid Glass finomítás

Státusz: **COMPLETE a helyi, mért hatókörre.** Nincs commit, hosted DB nem érintett, `db reset` nem volt.

- **Anyaglista:** egy `UnitPriceField` (`material-takeoffs/unit-price-field.tsx`) váltja a külön egységár/beszállító/részösszeg mezőket: szerkeszthető összeg + Ft/egység + mentett beszállítói árak legördülője („Beszállító — ár · nettó”) + „Kézi ár”; eredetjelölő (Katalógus · beszállító / Kézi felülírás / Kézi ár / Mentett pillanatkép / Ár hiányzik). Választás kitölti az összeget; szerkesztés katalógussoron kézi felülírássá válik (a katalógusár nem íródik át). Új/meglévő tétel ugyanúgy működik.
- **Séma (`20261019020000`):** a katalógus-sor kézi árat is hordozhat (`priceId` vagy kézi összeg, nem mindkettő); snapshot `manual: true`, termékkapcsolat megmarad. Csak két kifejezés cserélődött a meglévő RPC-ben. A szerződés (`material-list-contract`) ennek megfelelően módosult.
- **Anyagkezelő:** `PriceOptionsPanel` soron belüli szerkesztéssel (összeg + alap + „Ár mentése” = új immutable ár), tájékoztató különbséggel a legalacsonyabbhoz (nem választás), „Átnevezés, archiválás, előzmények” lenyíló, soron kívüli „Új beszállító” űrlap.
- **Liquid Glass:** közös `.glass-field-group` (mezőcsoport), `GlassDisclosure` a termék-/variánsűrlap haladó szakaszaihoz, a `.workflow-material-row` oszlopai/belső tere/sugara a tokenekre igazítva (a réteges régi szabályok miatti oszlopszivárgás javítva); nincs új override-réteg.
- **Ellenőrzés:** typecheck, ESLint (`npm run lint`), fókuszált Vitest 73 fájl/485 PASS, pgTAP 51 fájl/1158 PASS (új `049`); böngésző (DEMO): mentett ár kiválasztása → kézi felülírás → mentés → újranyitás (V2 megőrizve) → katalógusár váltás (V3) → katalógusár-módosítás után a mentett revíziók snapshotja változatlan; anyagkezelő szerkesztés/duplikátum korábban; mobil + világos téma: nincs vízszintes túlcsordulás.
- **Nyitott:** a felhasználói szövegméret-skálázás és a billentyűzetes bejárás csak szabályszinten (focus-within gyűrű) ellenőrzött, nem végigjárt; a régi, réteges `workflow-material-*` CSS-ek (halott szabályok) nem lettek kitakarítva; az ajánlatszerkesztő sorai nem kaptak `UnitPriceField`-et; `build` nem futott.

## F9.43 — Beszállítói áropciók és központosított munkadíj-szerkesztés

Státusz: **COMPLETE a helyi, mért hatókörre.** Nincs commit, hosted DB nem érintett, `db reset` nem volt; a DEMO rekordok és az admin fiók megmaradt.

- **Mennyiség:** nem változott (mennyiség + egység, forrásmennyiség megőrizve); hulladékszámítás, százalék vagy beszerzés-optimalizálás nincs.
- **Séma (`20261019010000..0200`, helyben alkalmazva):** `material_price_options` (név/beszállító, `active|archived`, egyedi `(variáns, lower(név))`, RLS: szervezeti tag) + `material_prices.option_id` (nullable → a régi árak „Alap ár”). Új ár = új immutable `material_prices` sor; az opció neve az árrekord `source_name`-jébe másolódik (a meglévő lista-/ajánlat-snapshotok ezt már hordozzák), így átnevezés/archiválás a történetet nem érinti. Trigger: azonos variáns, aktív opció, egység egyezik. `save_standalone_quotation_draft_with_document` snapshotja kibővült `optionId`/`supplierLabel` kulccsal (csak új revíziókban). `revise_organization_labor_rate` = atomi, idempotens „új díj + régi archiválása” (csak owner/admin).
- **Közös TS-modul:** `src/domain/pricing/index.ts` (opciók csoportosítása, kiválasztható árak, `defaultPrice` – csak egyetlen választható ár esetén előválaszt, soha nem a legolcsóbbat –, egységvalidáció, feliratok, `pricedLineAmount`). Az anyagkezelő, az anyaglista-szerkesztő és az ajánlatszerkesztő ezt használja; a munkadíj-összeg ugyanazt a pontos decimális aritmetikát.
- **UI:** `/anyagok/[id]` „Beszállítói árak” panel (új, új ár, átnevezés, archiválás, előzmény); választók „Beszállító — ár” felirattal és beszállító-címkével; munkadíj: közös `LaborRateEditor` a Beállítások/Munkadíj oldalon és az ajánlat munkadíj-paneljén (csak admin/owner, csak még nem alkalmazott szabályra), ajánlat-szintű egységár-felülírás a szervezeti díj módosítása nélkül.
- **Ellenőrzés:** typecheck, ESLint, fókuszált Vitest (domain, quotations, materials, material-takeoffs, app: 73 fájl PASS), teljes pgTAP 50 fájl/1152 PASS (új `047`, `048`); böngésző (helyi DEMO): 3 beszállítói ár egy terméken, duplikált név elutasítva, új ár az előzményekbe kerül, ajánlatban a választó nem előválaszt, mentett revízió `supplierLabel`-t hordoz és katalógusár-módosítás után változatlan; munkadíj létrehozás → szerkesztés (1200→1350, régi archivált).
- **Nyitott:** világos téma és tényleges mobil nézet nem lett külön végignézve; az ajánlati munkadíj-panel szerkesztője csak komponensteszttel igazolt (felmérés-forrású DEMO lista nem készült); a bruttó opciók az önálló ajánlatszerkesztőben csak megjelennek, nem választhatók; a `db:types` kimenet formázása eltér a korábbitól; `build` nem futott.

## F9.42.16 — Migráció-reprodukálhatóság és típusbiztonság

Státusz: **COMPLETE a helyi, mért hatókörre.** Nincs commit, hosted DB nem érintett, a futó helyi DB-hez (admin, DEMO, Auth) nem nyúltam.

- **Reprodukálhatóság:** `supabase db diff --local --schema public,private` eldobható shadow DB-n újrajátszotta mind a 102 migrációt (köztük a utólag szerkesztett `20261018160000`-t), és **nincs séma-eltérés** a futó helyi DB-hez képest (a függvénytörzseket is összeveti). Az F9.42.15-ben jelzett „utólag alkalmazott" kockázat ezzel lezárva; a futó DB nem lett resetelve.
- **Típusok:** a `database.types.ts` elavult volt (F9.27 óta nem generálták) és kézzel módosított nullable RPC-argumentumokat tartalmazott. Mostantól tiszta `db:types` kimenet (nincs kézi javítás); a szándékosan `null`-t váró argumentumokat egyetlen típus-szintű lista deklarálja a `src/infrastructure/supabase/database.ts`-ben (`create_field_survey_followup.p_project_id`, `save_material_preparation_revision.p_list_id`, `save_gable_trapezoidal_covering_calculation.p_project_id|p_roof_model_id|p_source_roof_revision_id`). Az alkalmazás ezt a `Database` típust importálja (12 import átállítva), viselkedés nem változott.
- **Ellenőrzés:** typecheck, ESLint, Vitest 135 fájl/717 PASS, pgTAP 48 fájl/1127 PASS (benne a takeoff → lista forrás/jogosultság `046`).
- **Maradék kockázat:** új migráció után a `db:types` újrafuttatása kézi lépés (nincs CI-ellenőrzés); a `NullableRpcArgs` lista az SQL-lel kézzel tartandó szinkronban (hibás név esetén a hívóhely fordítási hibát ad); a shadow replay a régi, valós adatokat nem tartalmazó üres sémán fut, adatmigrációs viselkedést nem bizonyít; `build` nem futott.

## F9.42.15 — Lemezprofil → anyagkimutatás → anyaglista → ajánlat-piszkozat

Státusz: **COMPLETE a helyi, mért hatókörre** (böngészőben végigvitt DEMO folyamat). Nincs commit, hosted DB nem érintett.

- **Különbség:** `material_takeoffs` = számításrevízióhoz kötött, snapshotolt mennyiségi kimutatás (draft → approved); `material_preparation_lists` = szerkeszthető, revíziózott anyaglista, amiből az ajánlat készül.
- **Migráció `20261018160000`:** `material_preparation_takeoff_sources` (immutable, `unique(organization_id, takeoff_id)` → egy takeoffból egy lista; RLS: csak a létrehozó) és `save_workflow_material_list_from_takeoff` (csak saját, projekt nélküli, **jóváhagyott**, nem elavult takeoff; a meglévő `save_workflow_material_list_revision`-t hívja, a tételenkénti snapshot a forrás-táblában marad; ár csak ha még ugyanahhoz a változathoz/egységhez tartozik; figyelmeztetéses tétel leírása „előzetes mennyiség, nem beszerzési mennyiség" jelölést kap).
- **UI:** `/anyagkimutatasok/[id]` munkafolyamat-panel (Jóváhagyás admin/owner → Anyaglista készítése / megnyitása); az anyaglista-oldalon forrás-kártya; az ajánlat a meglévő „Árajánlat-piszkozat készítése" gombbal.
- **Típusellenőrzés:** `npm run typecheck` = `next typegen && tsc -p tsconfig.typecheck.json`; csak a friss `.next/types/{routes,validator,cache-life,root-params}` kerül be (a régi build-maradék nem), a `.next/dev` érintetlen.
- **Ellenőrzés:** typecheck, ESLint, Vitest 135 fájl/717 PASS (új `takeoff-list-actions.test.ts`), pgTAP 48 fájl/1127 PASS (új `046`), böngésző: jóváhagyás → lista → ajánlat → újranyitás/listák, második kattintás helyett link.
- **Nyitott:** (az F9.42.16 lezárta a kézi típus- és migrációs eltérést); önálló takeoff szerkesztése/jóváhagyás-visszavonás nincs; `build` nem futott.

## F9.42.14 — Önálló lemezprofil → anyagkimutatás munkafolyamat

Státusz: **COMPLETE a helyi, mért hatókörre** (mentés → újranyitás → anyagkimutatás-piszkozat → újranyitás böngészőben igazolva). Nincs commit, hosted DB nem érintett.

- **Séma (`20261018150000`, helyben alkalmazva):** `material_takeoffs.project_id` nullable (+ `created_by` kötelező projekt nélkül), részleges egyediségi index az idempotenciához, a takeoff/tétel RLS projekt nélküli sornál csak a létrehozónak látható; `create_profile_takeoff_draft` változatlan szignatúrával elfogad `p_project_id = null`-t (saját, `standalone` profil). Projektes ág és minden történeti rekord változatlan.
- **Alkalmazás:** `createProfileTakeoffDraftAction` projekt nélkül is működik; a lemezprofil-szerkesztő átadási panelje önállóan is elérhető, a profil piszkozatai listázva; új `/anyagkimutatasok` (lista) és `/anyagkimutatasok/[id]` (olvasható piszkozat, forrásprofil-link). `getStandaloneTakeoffs` a meglévő takeoff-olvasót használja újra.
- **Miért nem anyaglista:** a workflow anyaglista (`save_workflow_material_list_*`) csak `sourceRefs=[]` tételt fogad, ezért nem hordozza a profilrevízió pontos forrását és snapshotját; a takeoff igen.
- **Típusellenőrzés baseline:** `npm run typecheck` a `tsconfig.typecheck.json`-nal fut (a generált, elavult `.next/types`-t kihagyja; a `.next` és a dev szerver érintetlen).
- **Ellenőrzés:** typecheck, ESLint, teljes Vitest (134 fájl/714 PASS), teljes pgTAP (47 fájl/1115 PASS, új `045_standalone_profile_takeoff.sql` 12 teszt), böngésző a helyi admin fiókkal. DEMO sablonméretű revízió (`validation_status=demo`) szándékosan nem adható át.
- **Nyitott:** jóváhagyás/anyaglista/ajánlat-felhasználás önálló takeoffból; `roof_models`, `sheet_layout`, többi takeoff-RPC projektfüggő; `build` és gated helyi integrációs tesztek nem futottak; helyi DEMO katalóg-sor (`DEMO F9.42.14 lemez`) hozzáadva.

## F9.42.13 — Régi Project UI kivezetése

Státusz: **COMPLETE a mért hatókörre** (csak UI/akciók). Nincs commit, migráció, hosted DB-hozzáférés.

- **Törölve:** `StandaloneProjectAssociation` UI (+teszt) a mentett-számítások listájából és a lemezprofil-szerkesztőből; `associateStandaloneCalculationAction`, `searchStandaloneAssociationProjects`, `getStandaloneAssociationTarget` (+típusok); `project-actions` (update/archive/restore/duplicate), `project-forms`, `project-lifecycle`, `project-menu-keyboard`, `project-workflow-overview` (+tesztek), `getClientsForOrganization`. A projekt-részletoldal csak olvasható „korábbi projekt" hubként marad, szerkesztő/életciklus-menü/folyamat-áttekintő nélkül.
- **Megmaradt:** `/projektek/[id]/*` (tetőmodell, lemezprofil, anyagkimutatás, beszerzés, ajánlat), API-routeok, átirányító stubok, felmérés „régi projekt" linkek (történeti rekordok elérése), DB RPC `associate_standalone_calculation_to_project` és minden szerződés.
- **Ellenőrzés:** `tsc` (csak a korábbi, elavult `.next/types` hibák), ESLint az érintett könyvtárakra PASS; Vitest (projects, calculations, sheet-metal, field-surveys, app) 17 fájl/90 PASS; útvonalak curl: 200 (kijelentkezett állapot). Bejelentkezett böngészős renderelés, teljes teszt, build, pgTAP nem futott.
- **Nyitott:** halott CSS (`association-*`, `project-edit-*`, `project-menu-*`, `project-workflow-*`) nem lett törölve; a `getProjectsForOrganization`-t a globális ajánlatadat még használja.

## F9.42.11 — Ereszcsatorna/szegély kalkulátorok és elavult fixture-ök kivezetése

Státusz: **COMPLETE a mért hatókörre.** Nincs commit; séma, migráció, hosted DB és a meglévő DEMO rekordok nem változtak.

- **Törölve:** `/kalkulatorok/ereszcsatorna|szegelyek` és `/projektek/[id]/ereszcsatorna|szegelyek` (404), `src/features/gutters|flashings` (UI, actionök, adat, rajzok, tesztek), domain `gutter-material*`, `flashing-material*`, `flashing-geometry` (+tesztek), `multi-roof-flashing-writer`, tetőrajzi élkijelölés a nyereg- és többtetős űrlapban (egyetlen fogyasztója az eltávolított átadás volt) és `selectedGableLength`/`selected-edge-query`, a projektoldali navigációs/áttekintő sorok, a mentett-számítások szűrői, a standalone mentés/olvasás/társítás gutter/flashing ágai, a registry két bejegyzése, ~55 sor halott CSS; a `project-list`, `ProjectCreateForm`, `ClientEditForm`, `ClientQuickCreate`, `ClientBadge`, `createProjectAction`, `createClientAction`, `updateClientAction` (nem hivatkozott projekt-/ügyfélűrlapok).
- **Újraírva (nem törölve):** `listVerifiedSurveyRoofs` korábban a szegély-élajánlatokból ellenőrizte a forrást; most közvetlenül a verified tetőmodell-revízió, verified számításrevízió, tárolt függőség és a tárolt hosszok egyezése alapján dönt (ugyanazok a feltételek).
- **Megmaradt (kompatibilitás):** DB `work_type`/`calculator_type` szerződések, RPC-k és migrációk (a 009–011 pgTAP is), régi gutter/flashing felmérés szakaszok olvasása, anyaglista-javaslatuk és feliratuk (új mérésük csak általános sablon), `/projektek/[id]/*` oldalak (régi projektadat és felmérés-követő hivatkozások érik el), átirányító stub-útvonalak (`/projektek`, `/projektek/uj`, `/ugyfelek*`, régi survey-kalkulátor URL).
- **Seed:** `supabase/seed.sql` már csak 3 felhasználó, szervezet és tagság; a DEMO ügyfél/projekt/tetőmodell/számítás kikerült. A pgTAP-nak szüksége volt rájuk (8+1 fájl), ezért a tesztek tranzakción belül `\ir _demo_workflow_fixture.inc`-ből töltik be (nem `.sql`, hogy a runner ne tesztként futtassa).
- **Ellenőrzés:** `tsc`, teljes ESLint PASS; teljes Vitest 138 fájl/725 PASS (19 kihagyva); `standalone-actions.local.integration.test.ts` (átírva profilra, `RUN_LOCAL_SUPABASE_ACTION_TESTS=1`) PASS a helyi DB-n; teljes pgTAP 46 fájl/1103 PASS; böngésző (localhost:3000): a két kalkulátor-útvonal 404, `/kalkulatorok` és `/kalkulatorok/mentett` nem listáz ereszcsatornát/szegélyt, a DEMO felmérés megnyílik. `npm run build` nem futott (a futó dev szerver `.next` mappáját nem akartam felülírni). A `workspace.local` és `multi-roof.local` integrációs tesztek (gated) nem futottak.
- **Nyitott / döntésre vár:** a „nincs projekt-munkafolyamat" teljes kivezetése (projekt-oldalak, `projects`/`project_id` oszlopok, tetőmodell–projekt kötés, lemezprofil projektmásolat, `StandaloneProjectAssociation`) nagy, adatkompatibilitást érintő munka — külön döntés/kör kell; a régi gutter/flashing számítássorok olvasója megszűnt.

## F9.42.10 — Helyi DEMO takarítás, felmérési ereszcsatorna/szegély kivezetése, minimális DEMO adatkészlet

Státusz: **COMPLETE a mért hatókörre.** Nincs commit; hosted DB, séma és migrációk nem változtak; `db reset` nem volt.

- **Törölt helyi adat (egy tranzakció, `TRUNCATE … CASCADE` a felhasználói táblákra; a megőrzött táblák számát a tranzakció ellenőrizte):** 4 felmérés/5 revízió/7 geometriaforrás, 1 számítás+revízió+függőség, 1 tetőmodell, 1 projekt, 1 ügyfél (a `seed.sql` DEMO sorai), 2 anyaglista, 2 ajánlat/4 revízió, 0 munkanapló. Megőrizve: `auth.users` (admin1@testadmin.com és a 2 seed-felhasználó), 1 szervezet, 2 tagság, 3 profil, 1 munkadíj-szabály (`DEMO tetőfedés munkadíja`, 1500 Ft/m² nettó), 8 anyagkategória. A seed újra létrehozná a DEMO projektet — a seed nem módosult.
- **Kivezetve (felmérési folyamat):** az „Ereszcsatorna” és „Bádogos szegély” munkatípus az új felmérés választójából és a szakasz-típusváltóból (régi szakasznál a saját típusa látszik); a felmérésbe ágyazott kalkulátor (`workspace-calculator.tsx`+teszt, `loadSurveyCalculator`, nem használt `field-survey-handoff-notice.tsx`, 19 sor halott CSS) — egyiknek sem volt futásidejű hívója; `calculator-handoff.ts` gutter/flashing ága. **Megmaradt:** DB `work_type` check, `fieldSurveyWorkTypeSchema`/sablonok/feliratok és anyaglista-javaslat a régi (ereszcsatorna/szegély) felmérésekhez, a régi `/felmeresek/[id]/kalkulator/*` átirányítás, az önálló `/kalkulatorok/ereszcsatorna|szegelyek` és projekt-útvonalak (nem felmérési folyamat, külön döntés).
- **Új DEMO adat (UI-ból, meglévő szolgáltatásokkal):** nyeregtető-felmérés V1 (10×8 m, 35°, túlnyúlások 500/300/300 mm; ellenőrzött 116,4618957678429 m²) → önálló trapézlemez-számítás ugyanezzel a geometriával (116,462 m², DEMO-jelölt kézi terméknév és -adat) → anyaglista (felmérés V1 forrás) → ajánlatpiszkozat v2 (munkadíj 1500 Ft/m² × 116,461896 m² = 174 692,84 Ft nettó; az anyagsor egységára nincs, hiányzónak jelölve) → munkanapló (felmérés csatolva, anyaglista és ajánlat kapcsolva, 1 napi bejegyzés). A tetőszámítás nem kapcsolt a felméréshez (a kapcsolat projekt-tetőmodellt kér, és minden modul önállóan használható).
- **Ellenőrzés:** `tsc` PASS; teljes ESLint PASS; teljes Vitest 149 fájl/774 PASS (27 kihagyva); a `workspace.local.integration.test.ts` (kihagyott, DB-s) szövege igazítva, nem futott. pgTAP nem futott (séma nem változott). Böngésző (localhost:3000, admin1 meglévő munkamenet): üres listák takarítás után; új felmérés választó csak Tető/Egyéb munka; mentés, lista, újranyitás, anyaglista, ajánlat, munkanapló-kapcsolat DB-ben és UI-ban igazolva.

## F9.42.8 — Többtetőformás munkafolyamat böngészős ellenőrzése és tesztstabilizálás

Státusz: **COMPLETE a mért hatókörre.** Nincs commit; hosted DB nem módosult, séma és üzleti logika nem változott (csak magyarázó szöveg, pgTAP-fixture és helyi DEMO seed).

- **Böngészős végigpróba (helyi DEMO, 1024 px, kézi SQL nélkül, projekt és munkanapló nélkül):** új felmérés T alakú tetővel (14 000 × 9 000 mm, 30°) → mentés V1 → ugyanabba a felmérésbe új kontytető-szakasz (12 000 × 8 000 mm, 35°) → mentés V2 → anyaglista (2 tétel) → ajánlatpiszkozat v1 → munkadíj-szabály (`/beallitasok/munkadij`, 1500 Ft/m², nettó) → két munkadíjsor → mentés v2 445 991,47 Ft → teljes újratöltés után megmarad. Geometria: T alak 180,133284 m² (156 m² vetület × 1/cos30°), konty 117,194361 m² (96 m² × 1/cos35°) — mindkettő a független `field_survey_roof_geometry_sources` sorból (`roof.geometry.tShape`, `roof.geometry.hip`), revízió szerint külön (V1 és V2 saját sorral), teljes pontossággal (180,13328398716322 / 117,19436052109979). Munkadíj-provenance a DB-ben: pontos `surveyRevisionId`, `surveyVersion: 2`, `sourceQuantity` teljes pontossággal, változtathatatlan szabály-pillanatkép; v1 változatlanul 0,00 Ft. Duplikáció: a panel újranyitása a meglévő listát és a hozzá tartozó ajánlatot mutatja, új lista csak kifejezett kérésre; mindkét munkadíj-pár „Már alkalmazva”. A folyamat alatt egyetlen munkanapló sem jött létre (`execution_plans` = 0).
- **Blokkoló feloldva (helyi környezet, nem kódhiba):** a független geometria-rögzítés minden tetőformára hibázott („A tetőfelület ellenőrzése nem sikerült.”), mert a korlátozott `tetopro_covering_writer` szerep jelszava a helyi DB-ből (reset után) nem egyezett a `.env.local`-ban lévő kapcsolattal (`28P01`). A szerep jelszavát helyben visszaállítottam a meglévő, gitignore-olt értékre; titok nem került dokumentumba, séma és grant nem változott. Ugyanígy a helyi bejelentkezés sem működött: a seedelt `auth.users` sorok `instance_id`, token- és időbélyeg-mezői NULL-ok voltak, ezért a GoTrue nem látta őket (`db:local-auth` 500). A `supabase/seed.sql` DEMO-felhasználói most GoTrue-kompatibilis mezőkkel jönnek létre; a futó adatbázis sorait is normalizáltam.
- **pgTAP-hibák gyökéroka (előzmény, nem F9.42.7):** a `008_execution_photo_categories.sql` 7–9. állítása azért bukott, mert a teszt nem saját fixture-t hozott létre, hanem egy **már létező** munkanapló/feladat/naplóbejegyzés hármast keresett (`select … limit 1`); a `seed.sql` ilyet nem ad, így az `insert … select` 0 sort írt és a kategória-RPC nem talált fényképet. A fájl a `c5c22e1` (F9.3.2) óta változatlan, tehát a hiba jóval megelőzi az F9.42.6/F9.42.7 kört. Javítás: a teszt a `007`-es mintájára saját, tranzakción belüli DEMO tervet/feladatot/bejegyzést és fényképet hoz létre. Ugyanebbe a kategóriába tartozik a `043` 18. állítása, amely a teljes táblára számolt (`count(*) = 1`), ezért a böngészős DEMO-adat után bukott; most a saját felmérésére szűkítve számol. Üzleti viselkedés, RPC, RLS és séma nem változott.
- **Nem támogatott geometria magyarázata (szövegjavítás):** az F9.42.7 után elavult „csak nyeregtető” megfogalmazás két helyen maradt (`survey-material-suggestions.ts` nem átvehető ok, `survey-material-list-panel.tsx` megjegyzés). Mindkettő tetőforma-független lett (a panel feltétele is a stabil „tetőgeometria” kulcsszóra hivatkozik). Böngészőben igazolva: hiányos sátortető-szakasz (csak oldalhossz) mentés után nem ad mennyiséget, a rajz helyén magyarázat áll, a panel a támogatott formákat és a kézi tétel lehetőségét írja ki, kitalált érték nélkül.
- **Ellenőrzés:** teljes pgTAP 46 fájl/1103 PASS (korábban 3 bukó a `008`-ban); célzott Vitest `src/domain/field-surveys`, `src/domain/material-takeoffs`, `src/features/field-surveys`, `src/features/material-takeoffs` (21 fájl/117 PASS, 3 kihagyva + a szövegváltozás után 20 fájl/104 PASS); `tsc --noEmit` PASS; ESLint a két módosított fájlra PASS. Teljes `npm test` és `npm run build` ebben a körben nem futott (a változás szöveg + teszt-fixture).
- **A maradék három tetőforma böngészős ellenőrzése (ugyanebben a körben):** egy új, projekt és munkanapló nélküli felmérés három szakasszal — félnyeregtető (10 000 × 5 000 mm, 25°) 55,168896 m², félkontyos tető (12 000 × 9 000 mm, 35°, félkonty alsó él 1 500 mm) 131,843656 m², L alakú tető (11 000 × 7 000 mm, 40°, szárny 4 000 × 5 000 mm) 126,624507 m². A geometriai vetületek független számítással egyeznek (50/108/97 m² × 1/cos α). Mentés V1 után mindhárom szakasz saját, teljes pontosságú forrásként rögzült (`roof.geometry.shed`, `roof.geometry.halfHip`, `roof.geometry.lShape`), a panel mindhármat „ellenőrzött tetőfelület · felmérés V1” címkével ajánlotta, az anyaglista 3 tétellel készült, az ajánlatpiszkozat mindhárom munkadíjsorral mentve v2 = 470 455,58 Ft (82 753,34 + 197 765,48 + 189 936,76), teljes újratöltés után változatlan, v1 továbbra is 0,00 Ft, minden pár „Már alkalmazva”, és a DB-ben mindhárom sor teljes `laborSource`-ot tartalmaz (pontos felmérésrevízió, V1, 1500,00 Ft szabály-pillanatkép). Munkanapló továbbra sem jött létre (`execution_plans` = 0). Ezzel mind a hét támogatott tetőforma böngészőben igazolt (nyeregtető: F9.42.6).
- **Korlát / nyitott:** a sátortető böngészős útja csak a hiányos input (magyarázat, nincs mennyiség) esetére van igazolva, teljes mentés–anyaglista–ajánlat úton nem. A diagnosztikai próbahívásból egy fölösleges helyi DEMO sor maradt a `field_survey_roof_geometry_sources`-ban (a `98f45c60…` felmérés V1 kontytető-szakasza, kerekített 117,194 m², üres `planes`/`edges`); a tábla felhasználói törlést tilt, ezért helyben maradt — következő `db:reset` eltünteti. Ez egyben egy megfigyelés: a DB-ellenőrzés a `planes`/`edges` tömböt csak típus szerint vizsgálja, nem kéri meg a nem üres tartalmat (a TS-séma igen) — szigorítás külön döntés. Mobil szélesség, sötét téma, több szervezet hosted Auth/RLS és valódi eszköz ebben a körben nem futott.

## F9.42 — Felmérés → anyaglista → ajánlatpiszkozat → munkanapló

Státusz: **PARTIAL.** A támogatott munkafolyamat végig működik és perzisztál; az árazási szabályok (munkadíj, elavult ár) döntésre és sémára várnak. Nincs commit; hosted DB nem módosult, a migráció csak a helyi adatbázison futott.

**Megvalósítva (bizonyított):**
- **Felmérés szerkesztő:** a „Felmérés összesítése” gomb „Anyaglista készítése”-re cserélve; a gomb elmenti a felmérést, majd a lap aljára görgetve beágyazott panelt nyit (`survey-material-list-panel.tsx`). A panel a pontos mentett revíziót, az átvehető mért/ellenőrzött mennyiségeket (jelölőnégyzettel kizárható), a nem átvehető okokat és az explicit „Anyaglista létrehozása” gombot mutatja. Új, még nem mentett felmérésnél a mentés után `?anyaglista=1` nyitja a panelt. A korábbi összesítő csak a korábbi (csak olvasható) revíziónézetben maradt.
- **„Tetőmodellhez mentés” nem törölhető:** a tetőfelület anyaglistába vétele csak a felmérésrevízióhoz kapcsolt, ellenőrzött `roof.gable` számításból lehetséges (`deriveSurveyMaterialSuggestions`), ez pedig a tetőmodell-revízió mentésével jön létre. Ezért a művelet nem redundáns; lenyíló „Tetőmodell-revízió mentése” blokkba került a „További műveletek” alatt (korábbi projektkapcsolatos felmérésnél látszik), és a panel megmagyarázza a szerepét.
- **Anyaglista létrehozás:** a meglévő `save_workflow_material_list_from_survey_revision` RPC-n (immutable `material_preparation_survey_sources`, request-key idempotencia, szervezet/actor ellenőrzés). A lista az `/anyaglistak` alatt azonnal megjelenik, a forrásfelmérés a listán linkelhető, a felmérésen látszanak a kapcsolt listák; ugyanarra a revízióra duplikált létrehozás csak explicit „Új, külön anyaglista” kérésre.
- **Ajánlatpiszkozat:** `createQuotationDraftFromMaterialListAction` a meglévő `quotationLinesFromMaterialList` + `saveStandaloneQuotationDraftAction` (`save_standalone_quotation_from_material_list`) útvonalon valódi DRAFT-ot hoz létre, forráslista-revízióval és sorhivatkozással; az ár csak igazolt katalógus- vagy kézi snapshotból kerül át, egyébként üres (`priceProvenance: missing`), az ajánlatszerkesztő „Hiányzó egységár” jelzéssel mutatja. Ugyanarra a listarevízióra meglévő piszkozatot nyit meg; újat csak explicit kérésre készít. Nem véglegesít.
- **Munkanapló-kapcsolat (új, helyi migráció `20261018100000_execution_plan_document_links.sql`):** visszavonható kapcsolat anyaglista vagy önálló ajánlat és munkanapló között (`execution_plan_document_links`, `link_/unlink_execution_plan_document`). Aktív kapcsolat egyedi, a leválasztás időbélyeges (nincs törlés, mindkét rekord megmarad), a kapcsolat csak annak látszik, aki a dokumentumot is látja (az önálló ajánlat/lista alkotó-hatókörű), másik szervezet munkanaplója 42501. UI: anyaglista- és ajánlatoldalon „Munkanapló” blokk (meglévő keresővel vagy új munkanapló létrehozásával és kapcsolással; projekt nem kell), munkanapló-oldalon „Kapcsolódó dokumentumok”. F9.42.3: feliratok egységesítve („Munkanaplóhoz csatolás”, „Kapcsolódó dokumentumok”), az ajánlat anyaglista-forrása kattintható hivatkozás; új séma nincs. F9.42.4: E2E ellenőrzés helyi DEMO-n (ajánlat↔munkanapló kapcsolás, újratöltés, DB-állapot, v2 változatlan); a munkanapló „Kapcsolódó dokumentumok” blokkja nyitva, ha van kapcsolt elem; a kapcsolható ajánlatok verzióval/dátummal megkülönböztethetők. Teljes pgTAP 44 fájl/1040 PASS. Ellenőrzés: célzott Vitest 68 PASS, tsc/eslint PASS, pgTAP 040 (24) PASS, helyi DEMO böngésző: lista → kapcsolt munkanapló és ajánlat oldalak újratöltés után is mutatják a kapcsolatot.
- **Újrahasznosítva:** `WorkflowMaterialListEditor`, `saveWorkflowMaterialListAction`, `deriveSurveyMaterialSuggestions`, `quotationLinesFromMaterialList`, `saveStandaloneQuotationDraftAction`, `create_execution_plan`, Liquid Glass tokenek és közös komponensek (`GlassDisclosure`, `glass-bubble`).

**Ellenőrzés:** `tsc` PASS; teljes `eslint .` PASS; teljes Vitest 146 fájl/754 PASS (27 kihagyva); új tesztek: forrás-építő, két szerveroldali művelet (jogosultság, idempotencia, duplikátumvédelem, hiányzó ár), panel, szerkesztő/anyaglista-oldal integráció; teljes `supabase test db` 42 fájl/1006 PASS (új: `040_execution_plan_document_links.sql`, 24 állítás: RLS, idempotencia, duplikátum, másik szervezet, másik tag, leválasztás/újrakapcsolás, törlés- és átírás-tiltás); izolált `npm run build` PASS. Böngésző (helyi DEMO, 1024 és 375 px): új ereszcsatorna-felmérés → mentés → panel (12,5 m mért) → lista létrehozás → ajánlat-piszkozat (hiányzó ár jelölve, saját URL) → újratöltés után a lista, az ajánlat és a kapcsolat megmarad → duplikátum helyett meglévő lista → új munkanapló létrehozás+kapcsolás, meglévő kapcsolás keresővel, leválasztás megerősítéssel, rekordok megmaradnak. Mobilon nincs vízszintes túlcsordulás.

**Nem megvalósított / blokkoló (terv):**
- **Felmérés ↔ munkanapló leválasztás:** a `field_survey_execution_plan_links` tábla szándékosan immutable; a leválasztáshoz külön, auditált eltávolítási szemantika (az új táblához hasonló) kellene.
- **Tetőfelület projekt nélküli felmérésből:** F9.42.6 megoldotta nyeregtetőre (lásd lent).
- **Árazás — jelenlegi állapot:** anyagár = igazolt katalógus/kézi snapshot × mennyiség; hiányzó vagy már nem aktív katalógusárú forrás nem kerül át (jelzéssel). Szervezeti beállító felület és munkadíj-szabály nincs; az ajánlatszerkesztőben kézi `LABOR` sor lehet.
- **Árazási döntések (felhasználó, 2026-10-18; még nem implementálva):** ár-osztály szabályonként választható (nettó/bruttó; csak azonos osztályú sorok összegezhetők, vegyes esetben figyelmeztetés); ÁFA nincs (sem számítás, sem átváltás); kedvezmény/felár nincs; kerekítés marad a meglévő HUF-szerződés szerint (sorszinten 2 tizedes); „elavult” ár = csak a lista-snapshot és az aktív katalógusár eltérése, időalapú lejárat nincs.
- **Árazás (F9.42.1, megvalósítva a fenti döntésekkel):** helyi migráció `20261018110000_organization_labor_rates.sql` (append-only `organization_labor_rates`: alap `roof_area_m2` / `run_length_m`, díj ≤2 tizedes HUF, nettó/bruttó; létrehozás/archiválás csak tulajdonos/admin RPC-vel, idempotens, módosítás/törlés tiltott; olvasás minden tagnak). Beállítófelület: `/beallitasok/munkadij` (szabály nem szerkeszthető: új + régi archiválása). Az ajánlatszerkesztő „Munkadíj a felmérés alapján” panelje csak az anyaglista ellenőrzött felmérési forrásmennyiségére (tetőfelület m², mért hossz m) kínál azonos mértékegységű szabályt; a sor mennyisége a forrásérték, ára a szabály, a megjegyzés tartalmazza a szabályt, a díjat és a forrást (`[munkadij:szabály:tétel]` jelölő → ugyanaz a pár nem adható hozzá kétszer). Eltérő árosztályú szabály nem alkalmazható (az ajánlat egyosztályú), magyarázattal. A sor `user_entered` eredetű és szerkeszthető; ÁFA, kedvezmény, becslés, automatikus alkalmazás nincs. Ellenőrzés: pgTAP `041` (16), domain+action+panel Vitest, teljes Vitest 764 PASS, teljes pgTAP 43 fájl/1022 PASS, tsc/lint PASS; böngésző: szabály létrehozás → alkalmazás (900 Ft × 12,5 m = 11 250,00 Ft) → mentés v2 → újratöltés után megmarad, második alkalmazás blokkolt.
- **Munkadíj-provenance (F9.42.2):** migráció `20261018120000_quotation_labor_source.sql` újradefiniálja a `save_standalone_quotation_draft_with_document`-et: a `LABOR` sor opcionális `laborSource` mezőjéből csak négy azonosítót (szabály, anyaglista, listarevízió, listatétel) fogad el, a változtathatatlan szabály-pillanatképet (név, alap, díj, osztály, pénznem), a pontos felmérésrevíziót és az ellenőrzött forrásmennyiséget/mértékegységet az adatbázisból olvassa újra (kliensérték nem megbízható). Elutasít: nem LABOR sort, ismeretlen/másik szervezetű szabályt, nem elérhető (alkotó-hatókörű) forrást, alap–mértékegység–árosztály eltérést, ismétlődő szabály/forrás párt a mentésben; archivált szabályt új sorra nem fogad el, de már alkalmazott sor kézi szerkesztés utáni újramentése archivált szabálynál is működik. `laborSource` nélküli sorok (köztük az F9.42.1 jegyzet-jelölős sorok) változatlanok; régebbi revíziót nem írunk át, ár nem számolódik újra. Kézi mennyiség/ár szerkesztés megtartja a forrást, a szerkesztő jelzi az eltérést. UI-paritás: a panel az `/ajanlatok/uj` (mentés előtti, listából induló) szerkesztőben is megjelenik; „Munkadíj-szabályok” belépő az Árajánlatok fejlécében.
  Ellenőrzés: pgTAP `042` (17), teljes pgTAP 44 fájl/1040 PASS; Vitest 765 PASS; tsc, lint PASS. Böngésző (helyi DEMO): `/ajanlatok/uj` listából → alkalmazás → mentés v1 → újratöltés után „már alkalmazva”, a DB-ben a teljes `laborSource`; kézi mennyiség 10 → v2 (9000,00), v1 változatlan (12,5 / 11250,00), forrás megmaradt és „eltér” jelzés látszik.
- **Tetőfelület alapú munkadíj (F9.42.5):** nincs új séma/RPC; a meglévő `laborSource` útvonalat egészítettem ki. A panel az ellenőrzött forrás mellett külön „Elszámolt mennyiség” mezőt ad (alapértelmezés a forrásérték, kifejezett módosítás, eltérés jelölve, összeg előnézet), hiányzó forrásnál magyarázatot ad, és megkülönbözteti a geometriai, a beszerzési és az elszámolt mennyiséget. **Hiba javítva:** a számított tetőfelület teljes pontossággal tárolódik (106.66044252673998), ezért a hatjegyű ellenőrzés kizárta a munkadíj-ajánlatból; most hat tizedesre kerekített mennyiséget ajánl, a pontos érték a `laborSource.sourceQuantity`-ben marad, és az „eltér” jelzés a kerekítéssel nem téved. Böngésző (DEMO): tető-felmérés (106,660443 m²) → anyaglista → ajánlatpiszkozat (munkanapló nélkül) → 1500 Ft/m² → 159 990,66 Ft v2 → újratöltés → mennyiség 100 → v3 150 000,00 Ft, v2 változatlan, második alkalmazás blokkolt. Nyitott: projekt nélküli felméréshez nincs mentett ellenőrzött tetőszámítás (a tetőmodell-revízió projekt/régi projektkapcsolat nélkül nem menthető), ezért ott csak magyarázat jelenik meg; ez sémadöntés.
- **Független felmérés-geometria (F9.42.6, COMPLETE a támogatott nyeregtetőre):** *Gyökérok:* az ellenőrzött tetőfelület csak `roof.gable` számításból jött, az pedig `roof_models`/`calculations` sorhoz kötött, amelyeknek `project_id NOT NULL` — projekt nélküli felmérésnél nem volt menthető forrás, ezért F9.42.5-ben kézi SQL-kapcsolás kellett. *Megoldás:* helyi migráció `20261018130000_survey_roof_geometry_sources.sql`: immutable `field_survey_roof_geometry_sources` (pontos felmérésrevízió + szakasz egyedi, bemenet/kimenet snapshot, nagy pontosságú `combined_roof_m2`), írása csak a korlátozott `save_survey_roof_geometry_source_secure` szerveroldali íróval (`tetopro_covering_writer`; a DB a bemenetet `survey_roof_input_matches`-szel a revíziószakaszhoz hasonlítja, a kimenet alakját és a pozitív felületet ellenőrzi; idempotens). A szerver a meglévő `calculateGableRoof`-fal számol (képlet nem duplikálva), mentéskor (`saveFieldSurveyAction`) és igény szerint (panel: `ensureSurveyRoofGeometryAction`, korábbi revíziókhoz is) rögzít. Az anyaglista-RPC új `surveyGeometry` forráshivatkozást fogad (`sourceKind: geometry`, a pontos érték a provenance-ben), a `laborSource`/ajánlat útvonal változatlan. A régi `calculation` hivatkozás és minden meglévő rekord érintetlen; projekt, tetőmodell, munkanapló nem kell. *Bizonyíték:* pgTAP `043` (40 PASS: írási jogok, idempotencia, hamis bemenet, nem tető szakasz, 0/hibás kimenet, másik tag/műhely, immutabilitás, RLS, lista, verziózott forrás, 6 tizedes számlázási mennyiség, `laborSource` pontos forrásérték, kézi felülírás v2, v1 változatlan, duplikáció tiltás); teljes pgTAP 45 fájl/1080 PASS; teljes Vitest 149 fájl/771 PASS (27 kihagyva); tsc, eslint PASS. Böngésző (helyi DEMO, kézi SQL nélkül): új nyeregtető-felmérés (projekt nélkül) → mentés V1 → forrás rögzítve (97,07161892128923 m²) → panel 97,071619 m² → anyaglista → ajánlat-piszkozat → 1500 Ft/m² munkadíjsor → mentés v2 145 607,43 Ft → újratöltés után megmarad; v1 változatlan; régi, forrás nélküli revízió megnyitáskor rögzül. *Korlát:* csak nyeregtető (a többi tetőforma-geometriát a DB-szerződés még nem vezeti át); a DB nem számolja újra a felületet (a szerveroldali író megbízható, mint a meglévő tetőírók); a `database.types.ts` nem újragenerált (a friss generálás nem kapcsolódó típushibákat hozna), az új táblát szűk, helyi típus olvassa.
- **Független felmérés-geometria kiterjesztése minden validált tetőformára (F9.42.7, COMPLETE):** *Hatókör:* a felmérés tetőforma-választójában (`RoofTypeSelector`) már elérhető és mért hat további forma — félnyeregtető, kontytető, sátortető, félkontyos tető, L és T alakú tető — mindegyike a projekthez kötött tetőmodell-folyamatban (F9.10) már validált, egységtesztelt `calculateRoofGeometry` motorral és a hozzá tartozó `private.survey_multi_roof_input_matches` (20261015160700) adatbázis-ellenőrzéssel rendelkezett; ez a kör ugyanezt a motort és ugyanezt az ellenőrzést kötötte be a projekt/tetőmodell nélküli, F9.42.6-os független forrásba. *Megoldás:* helyi migráció `20261018140000_survey_multi_roof_geometry_sources.sql`: a `field_survey_roof_geometry_sources.geometry_type` CHECK kiterjesztve `roof.geometry.{shed,hip,pyramid,halfHip,lShape,tShape}`-re; új, a nyeregtetős írótól **elkülönített** (azt változatlanul hagyó) `save_survey_roof_geometry_source_secure`-rel párhuzamos `save_survey_multi_roof_geometry_source_secure` szerveroldali író (`tetopro_covering_writer`), amely a meglévő, már bizonyított `private.survey_multi_roof_input_matches`-t hívja az input ellenőrzésére, és a `RoofGeometry` kimenet (`type`, `modelVersion`, `planes`, `edges`, `totalAreaMm2`) alakját és pozitív felületét ellenőrzi; idempotens, duplikáció- és keresztrevízió-védett, ugyanazon az egyedi (revízió, szakasz) kulcson, mint a nyeregtető. TS oldalon: `multiRoofGeometryFromSurveySection` (új, `geometryFromSurveyMeasurements` újrahasznosítással) + `recordSurveyRoofGeometrySources` kiterjesztve (előbb nyeregtetőt próbál, különben az általános motort hívja) + `persistSurveyMultiRoofGeometrySource` (új writer-függvény); az anyaglista-RPC (`sourceKind: 'geometry'`) és a panel változatlan, mert már típus-függetlenül, csak `combined_roof_m2`/`geometrySourceId` alapján fogyaszt. A „függő geometria” jelzés (`survey-material-source.ts`) is kiterjesztve mindkét útvonalra. *Bizonyíték:* pgTAP `044` (23 PASS: jogosultság, séma-elkülönülés a gable írótól, kontytető (hip) létrehozás/idempotencia/duplikáció-tiltás, eltérő bemenet/típus/nulla terület elutasítása, szakasz- és szervezet-izoláció, immutabilitás, anyaglista és HUF/m² munkadíjsor a geometriából — generikus fogyasztó úton); teljes pgTAP 46 fájl/1103 PASS (a független `008_execution_photo_categories.sql` 3 tesztje e kör előtt is bukik, nem kapcsolódik); teljes Vitest 151 fájl/777 PASS (27 kihagyva, új: `multi-roof-section-geometry.test.ts`, kontytető esetek a `survey-material-source.test.ts`-ben); tsc, teljes eslint, izolált `npm run build` PASS. *Korlát:* böngészős végigpróba nem történt (a tetőforma-választó és a mérési mezők UI-ja ebben a körben nem változott, a DEMO-bejelentkezéshez helyi varázslink/mailpit szükséges, ami nem futott le); a `database.types.ts` változatlanul nem regenerált; „other” tetőforma (szabad alaprajz) továbbra sem támogatott, csak magyarázat jelenik meg.
- **Árazás — maradék:** a projektajánlat (nem önálló) szerkesztő és RPC nem ismeri a `laborSource`-t; a szabály-felvétel csak admin/tulajdonos; óradíj-alap nincs; a dashboardról nincs közvetlen belépő (az Árajánlatok fejlécéből és a panelből elérhető); strukturált szabály-hivatkozás hiányában korábbi (F9.42.1) jegyzet-jelölős sorok csak jegyzet alapján azonosíthatók.
- **Nem ellenőrzött:** valódi eszköz/billentyűzet, képernyőolvasó, hosted Auth/RLS több szervezettel (a másik szervezet tilalma csak pgTAP-ban bizonyított), sötét téma teljes mátrix.

Javasolt Conventional Commit: `feat(F9.42): survey material list panel, one-click quotation draft and reversible work log links`.

## F9.41.1 — Célzott Liquid Glass finomítás

Státusz: **PARTIAL.** Csak megjelenítés; üzleti logika, DB, Auth/RLS, perzisztencia nem változott. Nincs commit.

- **Anyagkezelő modálok (gyökérok):** a Tailwind preflight nullázza a `margin`-t, így a natív `<dialog>` `margin:auto` központosítása elveszett (bal felső sarok). Javítás: közös `dialog:modal { margin: auto }`, tömör `--surface-popover` háttér, viewport-alapú max-magasság; `showModal` után az első mezőre fókusz. Böngészőben igazolva 1024 px és 375 px; Esc és fókuszvisszaállítás igazolva.
- **Tetőkalkulátor:** a dekoratív építkezés-ikon eltávolítva a címből. A Nyereg/Fél-nyereg/Kontytető számított stílusa és szerkezete azonos; háttér-eltérést nem sikerült reprodukálni, ezért külön háttérszabály nem készült.
- **Ajánlatszerkesztő:** egységes fejléc-rács (állapotjelvény jobbra), revíziósáv + PDF-előnézet közös eszköztár-sávban, csak olvasható revízió szaggatott mezőkkel, tabuláris számok.
- **Felmérés-szerkesztő:** „Fényképek”/„További műveletek” lenyíló tartalma saját üvegpanelt kap, egységes tipográfia és fókusz.
- Ellenőrzés: typecheck, lint, érintett vitest (materials, quotations, calculators, field-survey-editor) PASS; teljes `npm test`/build nem futott; 1440 px és sötét/világos teljes mátrix nem készült.

## F9.41 — Liquid Glass rendszer-egységesítés

Státusz: **PARTIAL (jelentős közös javítás, nem teljes képernyő×téma bizonyíték).** Csak megjelenítés/jelölés; számítás, adatbázis, Auth/RLS, perzisztencia nem változott. Nincs commit.

- **Tokenek:** `--tone-*` (siker/figyelmeztetés/hiba/info) és `--radius-panel`; hardcode-olt világos pasztell-panelek és halott duplikált szabályok eltávolítva; sugárskála 15 értékről 4 tokenre; ~35 mező-szabály az alap mező-sugárra.
- **Komponensek:** Lemezprofilok, Szegély-, Ereszcsatorna-kalkulátor, Cserepeslemez, projekt Anyagkimutatás/Ajánlatok fejléce → `GlassPageHeader`; 17 `back-link` → `BackNavigation`.
- **Mérés:** számított-stílus audit ~30 útvonalon (felület 20/16/14,4 px, mező 11,2 px, h1 egységes), 390/320/768 px túlcsordulás-audit módosított oldalakon, sötét téma képernyőképek (felmérés, lemezprofilok, új ajánlat, anyagkimutatás).
- **Ellenőrzés:** teljes `npm test` 142 fájl/732 teszt PASS (27 kihagyva), `typecheck`, `lint`, `npm run build` PASS.
- **Korlát:** lásd `UI_UX_AUDIT.md` F9.41 „Maradt”; kijelentkezett/hiba-állapotok és dialógus-változatok nem renderelve.

## F9.40.7 — Mobil UI/UX optimalizálás (U10 lezárva)

Státusz: **KÉSZ a mért hatókörre.** Csak megjelenítés/elhelyezés; számítás, adatbázis, Auth/RLS, perzisztencia nem változott. Nincs commit.

- **U10 lebegő méretező gomb:** a `scaling-bubble.tsx` az eltűnés helyett `chooseFloatingPlacement`-tel (`src/lib/floating-control-placement.ts`) áthelyezi a gombot: visualViewport + billentyűzet-inset + safe-area; alap jobb-alsó, foglaltság esetén felemel/bal oldalra vált, vissza az alapra ha szabad; nincs `display:none` szerkesztés közben és nincs `is-obstructed` elrejtés. rAF helyett 40 ms-os debounce (háttérpanelben is fut). Panel max-magassága a gomb helyzetéhez igazodik.
- **Megosztott CSS:** sub-12 px szövegek .75rem-re (`.material-category-pill`, `.status-pill`, `.survey-section-tab-count`, anyagkezelő kategória-számláló/kód, anyaglista-mező és eyebrow); 44 px célok a maradék rövid `summary`/link soroknak.
- **Mérés (böngésző):** 390/320/768 px, 7 képernyő: nincs oldalszintű túlcsordulás; 1440 px-en a felmérés kétoszlopos elrendezése és a rejtett gomb változatlan. Szintetikus akadályokkal igazolva: teljes szélességű alsó sáv fölé emelés, bal-oldali váltás, visszatérés az alaphelyre.
- **Ellenőrzés:** Vitest `src/components`, `src/lib`, `src/features/preferences`, `src/features/field-surveys` (26 fájl/102 teszt PASS, 3 kihagyva), typecheck PASS, ESLint PASS. Teljes `npm test`/build nem futott.
- **Korlát:** valódi billentyűzet/safe-area eszközön nem mért; sötét téma és mélyebb állapotok nem külön mértek; mobil „Vissza” gomb teljes szélessége nem változott.

## F9.40.6 — Felmérés-szerkesztő elrendezés finomítás

Státusz: **KÉSZ (csak CSS, `globals.css` F9.40.1 blokk).** Számítás, perzisztencia, üzleti szabály, JSX nem változott.

- **Gyökérok:** a sticky rajz a gridben csak a `2 / span 2` sorokat foglalta (a bal oszlop alatt üres sor), az eredmény-panelek pedig teljes szélességben a rajz alatt futottak, így a sticky tartomány (a grid-terület) alig engedett mozgást, bal oldalon pedig üres tér maradt.
- **Változás:** ≥1024 px-en a mérések, számított eredmények, faanyag/alátét panelek és műveletek a bal oszlopba kerültek (meglévő komponensek, nincs duplikáció); a rajz egyetlen elem a `2 / span 12` sorokon, `align-items:start`, sor-gap 0 (margó viszi a térközt), így a sticky tartomány pontosan a bal oszlop. 1024 px alatt változatlan egyoszlopos sorrend (mérések → rajz → eredmények → műveletek). `max-height: 760px` alatt a rajz statikus.
- **Ellenőrzés:** böngésző 1440×900: görgetés az elejétől a végéig, a rajz a szekció alján megáll (nincs átfedés), nincs vízszintes túlcsordulás; 390 px: egy oszlop, nincs túlcsordulás. Vitest `src/features/field-surveys`, typecheck, lint lásd futtatás. Sötét téma/zoom-pan interakció külön nem futott (színek, rajz-logika nem változott).

## F9.40.5 — UI/UX audit lezárás és munkafolyamat-ellenőrzés

Státusz: **KÉSZ a célzott hatókörre (F9.40.4 böngészős verifikáció; U3, U5 vizuális/jelölésbeli egységesítés).** Csak megjelenítés/jelölés; üzleti logika, számítás, séma, Auth/RLS nem változott.

- **F9.40.4 verifikáció (böngésző, helyi DEMO, bejelentkezve):** új önálló ajánlat → üres „Címzett és dokumentumadatok” csoport „Nincs megadva” jelvényt kap; kézi tétel ár nélkül „Hiányzó egységár” kiemelést kap; „Piszkozat mentése” → „Mentve · v1” állapot, az oldal a mentett ajánlat saját URL-jére navigál; teljes oldal-újratöltés (`navigate`) után a cím és a „Mentve · v1” állapot megmarad. A projekthez kötött szerkesztő és a CONFLICT-eset böngészős végigpróbálása ebben a körben nem történt meg (meglévő célzott Vitest-tesztek fedik, változatlanok).
- **U3 — vissza-navigáció egységesítés:** a `.back-link` (≈20 fájl, kézzel írt `<Link>`) és a megosztott `BackNavigation` komponens (`.back-navigation`) CSS-e összevonva: azonos kerekített Liquid Glass pirula alak, betűsúly és hover; a közös üvegfelület (`border`, `background: var(--surface-glass)`, `box-shadow`, `backdrop-filter`) és az akadálymentességi fallback-ek (`prefers-reduced-transparency`, `prefers-contrast`, `forced-colors`) megosztva (`globals.css`). A JSX-duplikáció (≈20 fájl saját `<Link className="back-link">` jelölése) és a feliratminta egységesítése (pl. „← {szülő neve}”) nem történt meg — ez a `BackNavigation` komponensre való átállás, külön, nagyobb kockázatú feladat.
- **U5 — redundáns címsor:** a Munkanapló-részlet „Napi bejegyzések” szekciójában a lenyíló összefoglaló címe mellett megjelenő, duplikált belső `<h2>Napi bejegyzések</h2>` eltávolítva (`execution-planning.tsx`); a tartalom (üres állapot szövege, „+ Új bejegyzés” gomb) változatlan. Az „Ártételek”/„Tételek” kettősség már az F9.40.4-ben megszűnt (ellenőrizve: a kódban „Ártételek” szöveg nem szerepel).
- **Nem érintett ebben a körben:** U10 (mobil méretező gomb áthelyezése — a meglévő átfedés-elkerülő logika elrejti a gombot ütközéskor, de nem helyezi át), U11 fennmaradó tételei (rajz-vezérlők, jelölőnégyzetek más oldalakon), U4 modul-specifikus betűméret-migráció, U6/U9 már korábban lezárva.
- **Ellenőrzés:** célzott Vitest `src/features/execution`, `src/features/quotations` (11 fájl/32 teszt) PASS; `npm run typecheck` PASS; célzott ESLint (`execution-planning.tsx`) PASS. Teljes `npm test`/build nem futott (kockázat nem indokolta). Böngésző: lásd `TEST_MATRIX.md` F9.40.5.
- **Korlát:** egy mentési kísérlet közben `net::ERR_ABORTED` jelent meg (dev-szerver HMR-blip, nem reprodukálható — megismételt mentés azonnal sikeres volt); projekthez kötött ajánlat-szerkesztő és CONFLICT-eset böngészős próbája nem történt meg; 768/320 px és képernyőolvasó nem futott.

Javasolt Conventional Commit: `fix(F9.40.5): unify back-navigation glass styling and remove duplicate journal heading`.

## F9.40.4 — Ajánlat-szerkesztő UX

Státusz: **KÉSZ a célzott hatókörre (U8, U9).** Csak megjelenítés; számítás, ár, ÁFA, jogi státusz, adatbázis, Auth/RLS, piszkozat-korlátok és revíziók változatlanok.

- **Mentés (U8):** új közös `QuotationSaveBar` (`quotation-save-bar.tsx`) az önálló és a projekthez kötött szerkesztőben: helyfoglaló sticky sáv, állapot (Még nincs mentve / Nem mentett módosítások / Mentés folyamatban… / Mentve · vN / A mentés nem sikerült) + egyetlen elsődleges gomb. A lebegő `standalone-save` gomb és a duplikált „Mentetlen módosításaid…” / „…mentve” üzenetek kivéve; a hibasáv (CONFLICT-művelettel) megmaradt.
- **Validáció (U9):** érintetlen, üres „Címzett és dokumentumadatok” csoport semleges „Nincs megadva” jelvényt kap; „Hibás adat”/„Hiányos” csak szerkesztés után (a domain-readiness változatlan, a kötelező validáció és a piszkozat-korlátok érintetlenek).
- **Elrendezés:** hiányzó egységár a tételsoron kiemelt (szaggatott mező, borostyán „Hiányzó egységár”); a „Tételek / Ártételek” kettős cím egy „Tételek” címmé vonva.
- **Ellenőrzés:** `quotations`, `app`, `components` célzott tesztek PASS (új `quotation-save-bar.test.ts`); typecheck, lint PASS; böngésző `/ajanlatok/uj` 1024 és 390 px: nincs vízszintes túlcsordulás, a sáv nem takar tartalmat.

## F9.40.3 — Globális tipográfia és akadálymentesség

Státusz: **KÉSZ a célzott hatókörre (U4, U11 skip-link).** Csak megjelenítés/jelölés; üzleti logika, számítás, adatbázis, függőség nem változott.

- **Tipográfiai tokenek** (`globals.css` vége): `--tp-fs-caption/label/body/h3/h2/h1`, `--tp-fw-*`, `--tp-lh-*`; mind `--tp-text-scale`-hez kötött, a felhasználói méretezés megmarad. Alkalmazva: oldalfejléc h1, szakaszfejléc h2, elsődleges/másodlagos gomb (14 px/700), felmérés mezőcímke (14 px/600), beírt érték (600, korábban 800), lenyíló összefoglaló, `small` (min. 13 px).
- **Skip-link:** „Ugrás a tartalomra” a `<body>` első eleme (`layout.tsx`); 39 fájl minden `<main>`-je `id="main-content" tabIndex={-1}`.
- **Címsorhierarchia:** az oldalak `GlassPageHeader` h1 → `GlassSectionHeader` h2 → h3 szerkezetűek; a natív `<details>` lenyílók gombként hirdetettek (összefoglaló = név, `aria-controls`), címsorrá nem alakíthatók érdemben.
- **Ellenőrzés:** teljes `npm test` 725 PASS / 27 skipped; typecheck, lint PASS; böngészőben (demo oldal) Tab → skip-link látható, Enter → fókusz a `main`-re; mobil sötét nézet olvasható.

## F9.40.2 — Felmérés-szerkesztő UX véglegesítés

Státusz: **KÉSZ a célzott hatókörre (U6, U11 részben).** Csak megjelenítés; séma, Auth/RLS, számítás nem változott.

- **Fotómentés:** a feltöltés azonnal tartós (API, új verzió); a szakaszhoz rendelés az egységes Mentéssel mentődik. Böngészőben igazolva: feltöltés → „Nem mentett módosítások” → Mentés → „Mentve · V3” → újratöltés után a jelölőnégyzet és a fotó megmaradt. Javítás: `ensureSaved`/`saveForNavigation` korábban kihagyta a mentést, ha csak a fotóhozzárendelés volt függőben.
- **U6:** „További szakaszbeállítások” és „További műveletek” csoport „Opcionális” jelvénnyel; a mérések és a rajz elöl, minden funkció megmaradt.
- **U11:** a fájlválasztónak `aria-label`; rajzvezérlők 44 px; jelölőnégyzet-címkék 44 px.
- **Ellenőrzés:** `src/features/field-surveys`, `roof-models`, `components` 143 PASS / 15 skipped; typecheck és lint PASS; böngésző 1024 és 375 px (túlcsordulás nincs). Teljes `npm test`/build nem futott; 768/320 px és képernyőolvasó nem.
- **Megjegyzés:** a böngészős teszt egy helyi felmérésre (f62a6eb0…) tesztfotót töltött fel (V3).

## F9.40.1 — Felmérés-szerkesztő UX (mentés, mérőmezők, rajz)

Státusz: **KÉSZ a célzott hatókörre (U1, U2, U7 részben); csak megjelenítés/elrendezés.** Számítás, séma, Auth/RLS, üzleti szabály, revíziós logika nem változott.

- **Mentés (U1/U7/U8):** új sticky `.survey-savebar` a fejléc alatt (`field-survey-editor.tsx`): állapotjelző (`role="status"`, `aria-live="polite"`: Mentve · Vn / Nem mentett módosítások / Mentés… / A mentés nem sikerült / Helyreállítható piszkozat / Új felmérés) + egyetlen elsődleges „Mentés” gomb (`type="submit" form="field-survey-editor-form"`, a meglévő `persistCurrent`/dirty/verzió/validáció útvonalon). Megszűnt a duplikált „Felmérés/Önálló felmérés mentése” csempe, a „Következő lépések” állapotsor és a „Fénykép kapcsolásának mentése” gomb (a fotókapcsolás a közös mentési sávot jelzi mentetlennek). A hibaüzenet a sáv alá költözött (korábban az oldal alján volt). A sáv nem fix réteg, hanem a lapban ragad (`top`), ezért mobilon sem takar tartalmat; `scroll-padding-top` védi a fókuszált mezőt.
- **Mérőmezők (U2):** új `MeasurementField`: a címke a mező fölött, teljes szélességben (nincs „· mm” a címkében, az egység badge-ként az input jobb szélén), egyetlen „⋯” menü a név/egység/szerep módosításához és a törléshez (a törlés megerősítése változatlan). Az ismétlődő piros „A rajzhoz add meg ezt az értéket.” üres kötelező mezőn rövid „Kötelező a rajzhoz” jelzésre váltott (a teljes üzenet `title`-ben és a rajz alatti összesítésben megvan; kitöltött, érvénytelen mezőn a teljes üzenet látszik). Az input `aria-label` most a mérés nevét is tartalmazza.
- **Rajz (U2 javaslat):** ≥1024 px-en és rajz esetén kétoszlopos rács: balra a mezők (2 oszlop), jobbra a sticky rajz; a rajz- és eredményblokkok teljes szélességben alatta. <1024 px-en és mobilon egymás alatt (mezők → rajz → eredmények). Zoom/pan/dimenziófókusz és skálázás kódja nem változott.
- **Mellékes javítás:** a mérésbeállítások popover rácsa 3 oszlopba esett szét keskeny nézeten; most egy oszlop.
- **Ellenőrzések:** célzott Vitest (`field-survey-editor.test.tsx` frissítve) és `src/features/field-surveys`, `roof-models`, `components` 143 PASS / 15 skipped; `npm run typecheck` PASS; `npm run lint` PASS. Böngésző: lásd `TEST_MATRIX.md`.
- **Korlátok:** a „Felmérés összesítése” és a Munkanapló-csempe változatlan; a ≥8 lenyíló (U6), címke nélküli elem (U11) és típus-tokenek (U4) nem része ennek a körnek. A rajz „Nem mentett előnézet” felirata nem változott. Teljes `npm test`/build nem futott.

## F9.39.1 — Elrendezési ritmus, Liquid Glass konszolidáció, horgonyzott beállításpanel

Státusz: **RÉSZLEGES-KÉSZ (közös rendszer és reprezentatív képernyők ellenőrizve; teljes oldalleltár és eszközteszt nem futott).** Csak megjelenítés; számítás, DB, Auth/RLS nem változott.

- **Gyökér-okok:** (1) a `.dashboard-settings-panel` `position: relative`-et kapott egy késői „isolation” blokkból, ezért az `absolute` szabály hatástalan volt, és a panel nyitáskor ~460 px-t lökött lefelé a tabokat és a csempéket; (2) a `liquid-glass-react` réteg méretfüggő, hibás rim-keretet rajzolt (szellemdobozok a panelben és a csempéken) — a F9.39 egyik javítása csak részben volt elég; (3) a lap-ritmus oldalanként eltérő volt (vissza→fejléc 10–36 px, fejléc→tartalom 6–22 px); (4) az F9.39 záró felülíró blokk ellentmondott az elv szerinti konszolidációnak.
- **Döntések:** a `liquid-glass-react` rim réteg (`LiquidGlassLayer`, `liquid-glass-policy`, `libraryEffect` prop, `.tp-liquid-glass-*` CSS) **eltávolítva**; a Liquid Glass megjelenést a CSS tokenek (`--surface-glass`, `--glass-border`, blur) adják, a beállítások csúszkája ezeket vezérli. A `liquid-glass-react` csomag a `package.json`-ban maradt (nem töröltem függőséget) — követő feladat: eltávolítás külön jóváhagyással.
- **Tokenek (`:root`):** `--tp-stack-tight/.5rem`, `--tp-stack/.85rem`, `--tp-stack-loose/1.35rem`, `--tp-hairline`, `--tp-control-min`, `--surface-popover` (lebegő rétegek közel átlátszatlan felülete); `--glass-border` alapértelmezetten slate hairline (a sötét téma saját értéke megmaradt).
- **Konszolidáció:** a F9.39 végi felülíró blokk megszűnt; a szabályok a saját forrásszabályukba kerültek (`.glass-section-header` lapos alapszabály és kikerült az üvegszint-listákból; `.scaling-launcher`, `.status-pill`, `.quotation-overview-*`, survey munkatípus-választó, anyaglista katalógus-mező, `.settings-summary`). A késői `position: relative; isolation` blokk és a `:not(.tp-liquid-glass-effect)` szelektorok törölve.
- **Fejléc/tabok/beállítások:** fejléc→tabok→tartalom köz egységesen `--tp-stack`; mobilon a tabok teljes szélességű szegmentált vezérlő. A beállítások horgonyzott popover: asztalon a trigger jobb széléhez igazítva (28 rem), mobilon teljes szélességű a fejléc alatt; majdnem átlátszatlan `--surface-popover`; nyitás nem mozgat elrendezést (mért: tabok/rács pozíciója azonos nyitva/zárva 390 és 1440 px-en). Escape zár és a fókusz a triggerre tér vissza, külső kattintás zár (mért). A beállítások tartalma/állapota és a Méretezés/Liquid Glass/Háttéranimáció funkciók változatlanok.
- **Lap-ritmus:** vissza-gomb→oldalfejléc→első szekció köz ~14 px (1440 px, 6 oldal mérve; a korábbi 10–36 px szórás megszűnt); Anyagkezelő (grid gap) külön kezelve. Az Anyagkezelő „Archiválás” gombja másodlagos stílusú lett (`ActionForm.submitClassName`), nem elsődleges narancs.
- **Ellenőrzések:** `npm test` 724 PASS / 27 skipped (a két törölt policy-teszt miatt −2); `npm run typecheck` PASS; `npm run lint` PASS; izolált `npm run build` PASS; `git diff --check` PASS.
- **Böngésző (helyi, bejelentkezve):** Műhely + beállítások 1440/390 sötét, 390 világos; Felmérések, Kalkulátorok, Anyaglisták, Ajánlatok, Munkanaplók, Anyagkezelő ritmusmérés 1440; Kalkulátorok, Anyagkezelő 390. A 768 és 320 px ebben a körben nem lett újra végigmérve (a F9.39-ben a 320 px túlcsordulásmentes volt).
- **Nem ellenőrzött / korlát:** fizikai eszköz, képernyőolvasó, kontrasztmérő; felmérés- és ajánlatszerkesztő, Munkanapló részletező, Projekt aloldalak újravizsgálata; a `globals.css` történeti rétegei (~4,5 ezer sor) csak az érintett területeken konszolidáltak; a dialógusok (fiókbeállítás, termékválasztó) a popover-felület tokenre nincsenek átállítva.
- **Követő feladatok:** `liquid-glass-react` függőség eltávolítása; további komponensenkénti CSS-konszolidáció; dialógusok `--surface-popover` használata.

Javasolt Conventional Commit: `feat(F9.39.1): anchor settings popover, unify page rhythm and retire glass rim layer`.

## F9.39 — Precision Liquid Glass UI/UX modernizálás

Státusz: **RÉSZLEGES-KÉSZ (a kiválasztott közös hibák javítva és böngészőben ellenőrizve; teljes képernyőleltár és eszközteszt nem futott).** Csak megjelenítés: számítás, adatbázis, Auth/RLS, revíziók és üzleti szabály nem változott.

- **Audit (helyi böngészőpanel, bejelentkezve, sötét/világos, 320/390/1024/1440 px):** a legfontosabb hibák: (1) a `liquid-glass-react` rim réteg hosszú, vékony sávokon (fejléc, tabváltó) leváló belső „pill” keretet rajzolt; (2) az Anyagkezelő mobil keresőmezője 288 px magas volt (`flex: 1 1 18rem` oszlopos konténerben); (3) a felmérés munkatípus-kártyáinak címe betűnként tört mobilon; (4) a szekciófejlécek 3 szintű üvegbuborék-egymásba ágyazást adtak; (5) az ajánlatlista szekciói fejléc/tartalom padding nélkül a keretre tapadtak, a nyíl a második sorba csúszott; (6) világos témában a fehér `--glass-border` miatt az űrlapmezők és kártyák éle láthatatlan volt; (7) a mobil méretező gomb tömör narancs blokk volt a tartalom fölött; (8) a beállítások csoportjai nem mutatták az aktuális értéket.
- **Közös komponensek/tokenek:** `LiquidGlassLayer` ResizeObserveres újramérést kapott, és csak kompakt (szélesség/magasság ≤ 4,2) felületen rajzol rimet; széles sávon a közös CSS üveg marad. `GlassSectionHeader` lapos címsor lett (nincs üveg, rim vagy blur). Új záró `F9.39` réteg a `globals.css` végén: `--tp-hairline`, `--tp-control-min`, világos témás `--glass-border` slate hairline, lapos szekciófejlécek, dashboard csempe dekorblob nélkül, üveg-stílusú mobil méretezőgomb, státuszpirula `nowrap`.
- **Munkafolyamatok:** Műhely: egykeretes csempék; beállítások: a Méretezések/Liquid Glass/Háttéranimáció sor az aktuális értéket mutatja (`useBackgroundAnimationEnabled` közös hook). Felmérés: a munkatípus-választó automatikusan töltő oszlopokban, a cím nem tör. Anyagkezelő: a keresőmező normál magasságú. Ajánlatok: szekciópadding és mobil kártyaelrendezés (ikon · cím · nyíl, összeg alatta). Anyaglista: kategória/termékválasztó teljes soron mobilon.
- **Lint-konfiguráció:** a teljes `npm run lint` korábban a git által követett harmadik féltől származó `.agents/`, `.claude/` skill-szkriptek 286 hibájától állt le. Az `eslint.config.mjs` mostantól kizárja a `.agent/`, `.agents/`, `.claude/` könyvtárakat; az alkalmazás (`src/`, `scripts/`) lint hibái nincsenek elrejtve, a skill-fájlok változatlanok.
- **Ellenőrzések:** `npm test` — 726 PASS / 27 skipped (753); `npm run typecheck` PASS; `npm run lint` PASS (teljes repó); `npm run build` PASS izolált másolatból (a futó dev szerver `.next` könyvtárát nem érintve); `git diff --check` PASS. Új teszt: a beállítások csoportjainak aktuális érték-kijelzése.
- **Böngészős ellenőrzés:** helyi Next dev szerver + helyi Supabase; a bejelentkezéshez dedikált helyi teszt-fiók készült (`ui.audit@local.test`, DEMO szervezet owner, csak helyi Auth). Nézve: Műhely 390/1024/1440 sötét+világos; Kalkulátorok 1024 sötét+világos (eredménnyel); Felmérés indító, Felmérés szerkesztő (tetőszakasz, rajz, eredmény) 390; Anyagkezelő 320/390/1440; Ajánlatok 320/390/1440; Munkanaplók 390; Új anyaglista + termékválasztó 390; beállítások panel 390 világos. Oldalszintű vízszintes túlcsordulás 320 és 390 px-en az Ajánlatok, Anyagkezelő, Kalkulátorok, Új anyaglista, Új ajánlat, Felmérés indító és Munkanaplók oldalon nem volt (scrollWidth = clientWidth).
- **Nem ellenőrzött / korlát:** fizikai iOS/Safari eszköz, valódi érintés, képernyőolvasó és kontrasztmérő eszköz nem futott; 768 px külön képernyőkép nem készült; a Munkanapló szerkesztő, a mentett ajánlatszerkesztő és a Projekt aloldalak nem lettek újra végigvizsgálva; a `globals.css` történeti, rétegzett felülírásai (≈4,5 ezer sor) nem lettek egyesítve — a F9.39 réteg a végén ezeket tudatosan felülírja.
- **Megfigyelés (nem módosítva):** az új önálló ajánlat „Címzett és dokumentumadatok” csoportja üres űrlapon is „Hibás adat” státuszt mutat; ez az ajánlat-készenléti domainlogikából jön, üzleti szabályhoz nem nyúltam.
- **Követő feladat:** a legacy felülírási rétegek konszolidálása komponensenként; a lenti megfigyelés termékszintű átnézése.

Javasolt Conventional Commit: `feat(F9.39): modernize shared Liquid Glass UI and fix mobile layout defects`.

## 2026-10-18 — Fejlécikon és favicon csere

Státusz: **IMPLEMENTÁLVA; az új, felhasználó által adott tető/eresz ikon a fejléc és az App Router ikonforrása.**

- A közös `src/assets/brand-icon.png` maradt a dashboard és a bejelentkezési fejléc közös `next/image` forrása; az üres alt szöveg megmaradt, mert mellette látható TETŐPRO felirat van. A méret- és navigációs viselkedés változatlan; a Next Image `sizes` a 38/41 px megjelenítéshez igazodik.
- Az új 1254×1254 RGBA képből átlátszóságot megtartó 512×512 forrás, 32×32 App Router ikon, 180×180 Apple Touch Icon, valamint 16/32/48 px felbontásokat tartalmazó ICO készült. Új manifest/PWA ikon nem kellett.
- A Next.js fájlkonvenció automatikusan szolgáltatja a `favicon.ico`, `icon.png` és `apple-icon.png` hivatkozásokat; kézi `metadata.icons` konfiguráció nem került be.
- **Ellenőrzések:** `npx vitest run src/features/dashboard/dashboard-controls.test.tsx src/app/layout.test.tsx --reporter=dot` — 2 fájl / 4 teszt PASS; `npm run typecheck` PASS; célzott ESLint a dashboard és belépési oldal fájljain PASS; izolált Next.js 16.4.0 webpack production build PASS (31 statikus oldal); `git diff --check` PASS. A Vitest a meglévő Image mock `priority` attribútuma miatt nem blokkoló React-figyelmeztetést jelzett.
- **Böngésző:** a dashboard fejlécben a kép vizuálisan ellenőrizve asztali és 390 px-es nézetben sötét témával; a Next által generált favicon és PNG ikonhivatkozások láthatók a document headben. A külön világos témás képernyőellenőrzés nem sikerült.
- **Adat/jogosultság:** csak képfájlok és két `next/image` prop változott; adatbázis, Auth/RLS, üzleti logika és tartós adat nem érintett.

## F9.38.6 — Zhitov-referenciaszellemű, saját 2.5D kalkulátorikonok

Státusz: **IMPLEMENTÁLVA; a 33 ikon vizuálisan átnézve, a böngészős és célzott regresszió-ellenőrzés lefutott.**

- A felhasználói Zhitov-képernyőkép kizárólag rajzi nyelv referenciája volt; a geometriák saját, katalógusazonosítóhoz kötött SVG-k maradtak. Egységes műszaki grafitszürke kontúr, szürke oldalfelület és visszafogott márka-aranysárga felső felület fut világos és sötét témában.
- Mind a 6 tetőikon megtartja a saját tetősík-topológiáját. A háromszögű faszerkezet sekély térbeli mélységet kapott. A szarufa, nyeregtető, félnyereg, manzárd és kontytető korábban helyreállított geometriai jegyei megmaradtak.
- Mind a 17 lépcsőikon közös axonometrikus 2.5D nyelvet kapott: a fokok felső lapja, fellépője és iránya látható; az egyenes fa-/fémlépcsők oldalnézeti emelkedése különbözik a fordulós, alaprajzi lábnyomot megőrző rajztól. A 90° L-, 180° U- és háromkarú alakzatok külön maradtak; a pihenő egyetlen folytonos felület, a húzott fordulók egyedi ékfelületek. A csigalépcső nyolc szinteltolt sugárirányú fokkal szerepel.
- A beton/alapozás 10 korábbi sziluettje megmaradt és a közös színrendszerhez igazodott. A betonacél rudak testet és visszafogott fényélt kaptak; az átlósegéd derékszögű háromszöge térbeli felületet és oldallapot kapott.
- A meglévő választó, katalógus és számító motor nem változott; a 33 bélyegkép 56×51 viewBoxban jelenik meg. A mobil választó maradt gördíthető és a sor minimuma 61,6 px.
- **Vizuális kapu:** ideiglenes összehasonlító oldalon mind a 33 ikont névvel, a valós 56 px-es és a 64 px-es ellenőrző méretben néztem át világos és sötét témában. A lap nem része a végleges alkalmazásnak.
- **Böngésző:** mindhárom kategória × 1440/1024/768/390/320 CSS px × két téma, összesen 30 állapot. A DOM-mérésben mindenhol a dokumentumszélesség megegyezett a viewporttal, nem volt levágott címke, és a látható opciók száma 6/17/10 volt. Az ikon szélessége 56/56/56/46,8/44 px, a legalacsonyabb listaelem 61,6 px. A „betongyűrű” keresés egy találatot adott; annak kiválasztása a Betongyűrű űrlapra váltott.
- **Adatkonzisztencia/jogosultság:** számítás, adatbázis, Auth/RLS, mentett adat, jogosultság vagy szervezeti határ nem módosult; tartós írás nem történt, ezért DB/jogosultsági regresszióteszt nem releváns.
- **Ellenőrzések:** célzott Vitest 2 fájl/9 teszt PASS; `npm run typecheck` PASS; az érintett TypeScript-fájlok célzott ESLintje PASS; izolált, tiszta `.next` könyvtárból futtatott `npm run build` PASS (Next.js 16.4.0 webpack, 30 statikus oldal); `git diff --check` PASS. A teljes `npm run lint` 286, a módosítatlan `.agents/` és `.claude/` segédszkriptekhez tartozó lint hibával leállt; a mérföldkő érintett fájljain célzott lint sikeres.
- **Korlát:** a fűrészfogas 90°/180°-os fémkalkulátorok katalógus szerint csak a kar- és pihenőgeometriát modellezik; a nem létező tartógeometriát az ikon sem találja ki. Fizikai érintőeszköz és külön képernyőolvasó-audit nem futott.

Javasolt Conventional Commit: `feat(F9.38.6): unify calculator thumbnails in gray-yellow 2.5D`.


## F9.38.5 — Geometriahű kalkulátorikonok

Státusz: **IMPLEMENTÁLVA ÉS BÖNGÉSZŐBEN ELLENŐRIZVE; a fizikai érintéses és képernyőolvasós ellenőrzés nem futott.**

- A hat tetőikon most a tető geometriáját mutatja: gerinc és tetőtérfogat, egyetlen lejtősík, négy kontysík és hip-élek, két lejtésű manzárd, ferde szarufa vágásjellel, valamint belső rácsos tartóelemek.
- A 17 lépcsőikon felülnézeti L/U/háromkarú terveket, oldalnézeti egyenes foksort, külön zárt/nyitott tartót, fém- és fűrészfogas változatokat, radiális csigalépcsőt és ferde elemet tartalmaz. A pihenő folytonos téglalap, a húzott forduló legyezős, osztott fokgeometria.
- A tíz beton/alapozás bélyegkép felismerhető sziluettje megmaradt; a közös semleges felület- és kontúlrendszer enyhe felületi kontrasztot ad. A kalkulátorkatalógus, kiválasztás és számítási logika változatlan.
- A közös SVG aránya 56:51; desktopon a választó ikonmezője 48–56 CSS px közé méreteződik, mobilon 44–48 px. Az opciósor minimum magassága 61,6 px. A címkék tördelődnek, vízszintes overflow a képernyőképeken nem látszott.
- **Vizuális összehasonlítás:** mind a 33 ikon egymás mellett, névvel, 48 és 64 px-en ellenőrizve. A tetőformák, landing/winder párok, 90°/180°/háromkarú fordulók, fa/fém tartók után az ideiglenes összehasonlító útvonalat eltávolítottam.
- **Böngésző:** a helyi `/kalkulatorok` tényleges lapját 1440/768/390/320 CSS px-en, mindhárom kategóriával és világos/sötét témával képernyőképen ellenőriztem. A 768 px alatti listaváltó megnyitásával a mobilikonokat és feliratokat is szemrevételeztem. Fizikai eszköz, valódi touch/pinch és képernyőolvasó nem futott.
- **Ellenőrzések:** célzott Vitest, `npm run typecheck`, `npm run lint`, `npm run build` és végső `git diff --check` állapotát a [F9.38.5 tesztmátrix](TEST_MATRIX.md#f9385--geometriahu-kalkulatorikonok) rögzíti.
- **Konzisztencia/jogosultság:** nincs tartós adatváltozás, jogosultsági útvonal vagy konkurens írás; adatbázis-teszt nem releváns.

Javasolt Conventional Commit: `feat(F9.38.5): restore geometry in calculator icons`.

## F9.38.4 — Prémium minimalista műszaki ikonfinomítás

Státusz: **IMPLEMENTÁLVA ÉS HELYI BÖNGÉSZŐBEN ELLENŐRIZVE; mind a 33 ikon elkészült.**

- **Dizájnrendszer:** a korábbi többszínű, sűrű vonalhálót közös grafit/világosszürke főgeometriára, semleges felületkitöltésre és egyetlen meleg narancs jelentéses kiemelésre cseréltem. Az SVG-k szűrő, gradiens, Canvas és új függőség nélkül, egységes 56×51-es viewBoxban maradtak.
- **Tetők:** a hat ikon egyszerű 2.5D sziluettből olvasható; a nyeregtető, félnyereg, manzárd és konty eltérő tetősíkot, a szarufa egyetlen gerenda/vágásjelet, a rácsos tartó csak lényegi öv- és rácsvonalakat mutat.
- **Lépcsők:** a fordulók felülnézeti L/U/háromkarú alaprajzot használnak. A pihenőt tömör mező, a húzott fokot osztott forduló jelöli; a zárt, nyitott, fém, fűrészfogas, csiga-, ferde elem- és betonváltozat saját sziluettet kapott.
- **Beton/alapozás:** a tíz ikon megtartja a sávalap, cölöp, lemez, gyűrű, térburkolat, körüljáró sáv, keverék, betonacél, háló és átló felismerhető geometriáját, a korábbi anyagonként eltérő telített színek nélkül.
- **Vizuális kapu:** ideiglenes, a végső munkafából eltávolított összehasonlító oldalon mind a 33 ikont 48 és 64 px-en, világos és sötét témában szemrevételeztem. A fa/fém egyenes tartó, a pihenős/húzott 90°/180° és a háromkarú párok egymás melletti ellenőrzése után az egyenes fém tartó külön kettős, csomópontos szerkezeti jelet kapott.
- **Böngésző:** a valódi /kalkulatorok oldalon 3 kategória × 4 viewport (1440/768/390/320 px) × 2 téma, összesen 24 állapotot mértem. A látható geometriák 71–91%-ot foglalnak az ikon szélességéből, minden elem a saját SVG-keretén belül marad, a dokumentumszélesség minden esetben a viewporttal egyezik. A 1440 és 320 px-es nézetben mindhárom kategóriáról, a 768 és 390 px-es nézetben reprezentatív kategóriákról tényleges képernyőképet ellenőriztem mindkét témában.
- **Korlát:** fizikai érintőkészülék és képernyőolvasó nem futott. A rajzok választóikonok, nem gyártási vagy statikai tervek. Számítási motor, katalógus, kiválasztás, adatbázis, Auth és üzleti workflow nem változott.

Javasolt Conventional Commit: refactor(F9.38.4): refine calculator icons into minimal two-tone system.

## F9.38.3 — Profi kalkulátorválasztó-ikonok

Státusz: **IMPLEMENTÁLVA; mind a 33 SVG-t helyi böngészőben ellenőriztem desktopon, tableten és mobilnézetben, világos és sötét témával.**

- **Gyökérok:** a korábbi közös rajzfüggvények az egyes kalkulátortípusokat egyszerű, többnyire egyszínű vonalrajzokkal jelölték. A F9.38.2 méretezése megnövelte ezeket a bélyegképeket, de az ikonokon belüli geometriát nem részletezte.
- **Megvalósítás:** a megosztott bélyegkép-komponens 6 tető-, 17 lépcső- és 10 beton/alapozás-illusztrációt ad; a kategória- és variánskülönbségek saját vektoros geometriát, felületkitöltést és témaszín-tokeneket kapnak. A kereső, katalógusazonosítók és kiválasztás változatlan.
- **Böngésző:** Chromium-alapú Codex in-app browser, helyi `/kalkulatorok`. Minden 3 kategória × 5 szélesség (1440/1024/768/390/320 CSS px) × 2 téma kombinációt mértem. Az összes 33 ikont egyenként kiválasztottam 1440 px-en mindkét témában; a kiválasztott gomb ID-je és a kalkulátorcím mind a 66 esetben egyezett. A tényleges ikongeometria egyik nézetben sem lógott ki az SVG dobozából; a 320 px-es gyűjtemény, a 1440 px desktop, a 768 px tablet és a 390 px mobil mindkét témás képernyőit szemrevételeztem.
- **Reszponzivitás:** az SVG 52/45,6/45,6/46,8/44 px széles a vizsgált szélességek sorrendjében, a 56:51 arány megmaradt. Az opciókártyák minimum 61,6 px, a mobilváltó 59,2 px, a kategóriafülek 46,4 px magasak; a feliratok 16 px-esek. Nincs oldalirányú túlcsordulás vagy felirat-túlcsordulás.
- **Ellenőrzések:** `npx vitest run src/features/calculators/construction-thumbnails.test.tsx src/features/calculators/calculator-navigation.test.ts --reporter=dot` (2 fájl / 5 teszt PASS), `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4 webpack, 30 statikus oldal) és a végleges `git diff --check` eredménye a [F9.38.3 tesztmátrixban](TEST_MATRIX.md#f9383--profi-kalkulatorvalaszto-ikonok) szerepel.
- **Korlátok:** fizikai eszközön végzett érintéses tesztet és képernyőolvasós auditot nem futtattam. Az illusztrációk a kalkulátorválasztást segítő szemléltető ikonok, nem gyártmány- vagy statikai tervek. Számító motor, adatbázis, Auth, tartós adat és üzleti workflow nem változott.

Javasolt Conventional Commit: `feat(F9.38.3): redesign calculator selector SVG icons`.

## F9.38.2 — Reszponzív kalkulátorikonok

Státusz: **IMPLEMENTÁLVA; A TETŐ, LÉPCSŐ ÉS BETON/ALAPOZÁS VÁLASZTÓT 1440/1024/768/390/320 PX-EN, SÖTÉT ÉS VILÁGOS TÉMÁBAN HELYI BÖNGÉSZŐBEN ELLENŐRIZTEM.**

- A közös SVG-bélyegkép desktopon korábban 16 px-re zsugorodott a `button > svg` szabály miatt; mobilon egy külön szabály 40 px-re növelte. A közös listaikon most folyékony, 44–52 px szélességet kap, aránya 56:51. A viewBox a meglévő rajzok belső üres sávját csökkenti, szélső geometriát nem vág le.
- A tető 6, a lépcső 17, valamint a beton/alapozás 10 (9 beton + átlósegéd) ikonja ugyanazt a méretezést használja. A választókártya legalább 62 px, a mobil váltógomb 60 px magas; a feliratok tördelődnek.
- **Böngésző:** helyi kalkulátoroldal, 1440/1024/768/390/320 CSS-pixeles viewport és mindhárom kategória, sötét és világos témában. A DOM-mérés szélességeket, kártya- és gombmagasságot, felirat-túlcsordulást és dokumentumszintű vízszintes overflow-t vizsgált; egyiket sem találtam. A képernyőképeket 1440 és 320 px-en mindhárom kategórián, mindkét témában szemrevételeztem; SVG-klippelés vagy torzulás nem látszott.
- **Ellenőrzések:** `npx vitest run src/features/calculators/construction-thumbnails.test.tsx`; `npm run typecheck`; `npm run lint`; `npm run build`; `git diff --check` — végleges futtatásuk az átadási ellenőrzésben rögzítve.
- **Korlát:** fizikai mobilkészülék és tényleges érintési interakció nem futott; a böngésző viewport-emulációban mért gombméretek 60–62 px.

Javasolt Conventional Commit: `fix(F9.38.2): enlarge responsive calculator selector icons`.

## F9.37.4 — Claude Code fejlesztői projektátadás

Státusz: **DOCUMENTATION COMPLETE / APP-CODE UNCHANGED**.

- Elkészült a gyökér `CLAUDE.md`, amely importálja az `AGENTS.md` szabályait, és a tényleges aktuális kódhoz köti a Claude Code munkakezdést, architektúrát, adatbiztonságot, dokumentációfenntartást és ellenőrzést.
- Elkészült a `docs/PROJECT_MAP.md` a jelenlegi stack, route-ok, funkcióállapotok, adatfolyamok, revízió/RLS határok és helyi parancsok leírásával.
- Elkészült a `docs/CLAUDE_HANDOFF.md`; különválasztja a megvalósult, részleges, tervezett és nem igazolt állapotot, és megadja a fő döntéseket, pilot-blokkolókat, következő logikus lépéseket és dokumentációs útvonalakat.
- A `funkciok.md` kapott egy rövid, aktuális funkcióállapot-táblát. A meglévő részletes route-/fájlleltár megmaradt; ellenőrzött forrásleltár: 454 `.ts`/`.tsx` útvonal a generált Supabase típusfájl nélkül.
- A dokumentáció a forráskódot tekinti a route/funkció bizonyítékának, a `PROJECT_BLUEPRINT.md`-t tervnek; külön jelzi a redirectelő régi projekt/ügyfél route-okat, a standalone ajánlat DRAFT-határát, a F9.36.2 csak specifikációs állapotát és a pilot hiányzó bizonyítékait.
- **Ellenőrzés:** a repó 35 Markdown-fájljának helyi fájlhivatkozás-ellenőrzése **PASS**; `git diff --check` **PASS**. Alkalmazásteszt, pgTAP, typecheck, lint, build és böngésző nem fut; csak dokumentáció változik.
- **Konzisztencia/jogosultság:** adatbázis-, hitelesítési, jogosultsági és runtime állapotot nem módosítottam vagy ellenőriztem újra. A handoff a korábban dokumentált helyi teszteredményeket történeti bizonyítékként jelöli.

Javasolt Conventional Commit: `docs(F9.37.4): prepare Claude Code project handoff`.

## F9.38 — Lépcső- és betonozási kalkulátorok eredmény-lefedettsége

Státusz: **IMPLEMENTÁLVA, CÉLZOTTAN TESZTELVE; A REFERENCIA-PARITÁS ÉS A TELJES BÖNGÉSZŐS MÁTRIX NEM IGAZOLT.**

- A meglévő 33 kalkulátoros katalógusból mind a 17 lépcső- és mind a 10 beton/kapcsolódó referencia megmaradt; új ID, backend, adatbázis-, Auth/RLS- vagy üzleti workflow-változás nincs.
- A lépcsőmotorok további geometriai eredményeket adnak: hajlásszög, 2R+G számtani mutató, egyes karok ferde tengelyhossza, fok- és pihenőfelület, húzott fokok járóvonali osztása, kiterített hossz és trapéz-szektorokból számított tervfelület. A 2R+G mellett csak tájékoztató, nem megfelelőségi tartomány jelenik meg.
- A betonmotorok kiegészültek a sávalap névleges `tengelyhossz × szélesség` területével, cölöp palást-/összegzett kör alapfelületekkel, alaplemez kerületével, betongyűrű belső palást-/véglap-/teljes geometriai felületével, opcionális térkő alapréteg-térfogattal, téglalap sáv befoglaló méreteivel és beton/kavics térfogattal, keverék megadott száraz tömegösszegével, betonacél térfogattal és kg/m egységtömeggel, valamint háló rúdirányonkénti hosszaival és metszésszámával.
- A betonrajzokon a C5 megadott alaprétegéhez külön metszeti nézet jelenik meg; az összes többi rajz a már meglévő domain-kimenetből épül. A lépcsők az első hat eredményt elsődleges blokkban, a továbbiakat lenyitható részletekben mutatják.
- **Független bizonyíték:** kézzel levezetett 90°/180° pihenős, annularis húzottfokos és téglalap-/henger-/gyűrű-/háló fixture-ek a céltesztekben. Korlát: nincs fém-/faelem gyártmány, teherbírás, vasalási terv, mixajánlás, termék-/talajadat vagy normatív megfelelőség.
- **Referencia-audit:** mind a 27 nyilvános Zhitov referencia statikus mező- és kimenetleírását áttekintettem; a futó számítási űrlapok külső/dinamikus iframe-ei miatt egyedi referenciaeredmények és teljes paritás nem reprodukálhatók ebből a forrásnézetből. A checklist ezt `PARTIAL` állapotként és capability-kategóriákkal dokumentálja.
- **Konzisztencia és jogosultság:** minden új kimenet determinisztikusan a calculator bemeneteiből készül; nincs tartós adatírás, jogosultsági felület vagy konkurens módosítási útvonal. Külön adatbázisteszt nem releváns a változáshoz.
- **Böngésző:** hitelesített helyi DEMO Brave smoke során mind a 27 kalkulátornál érvényes input→eredmény+SVG; C5 150 mm alapréteg→1,8 m³, C6 megadott rétegek→4/6 m³. C4 egy hibás falvastagságot magyar pozitív belső átmérő hibaüzenettel visszautasított. Sötét/világos téma, zoom, Enteres zoom és méretfeliratból mezőfókusz ellenőrizve; a sötét témát visszaállítottam. Pan/húzás nem futott; a böngészővezérlés nem kínált viewport-emulációt a 1440/1024/768/390/320 CSS-pixel mátrixhoz.
- **Ellenőrzések:** kalkulátor-regresszió 5 fájl / 52 teszt PASS; teljes Vitest `npm test` 140 fájl / 640 teszt PASS, 9 fájl / 27 teszt SKIP; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack, 30 static page), `git diff --check` PASS. DB/Auth/RLS/hosted teszt nem futott, mert adatbázis-kódot nem módosítottam.
- Az implementációs checklist, kalkulátoronkénti állapot, kimenetek, SVG-nézetek, matematikai fixture-ek és ismert hiányok: [F9.38 teljesítési riport](F9_38_CALCULATOR_COMPLETION_REPORT.md). A pontos futtatott teszt/typecheck/lint/build/diff és browser státusz a [tesztmátrixban](TEST_MATRIX.md) szerepel.

Javasolt Conventional Commit: `feat(F9.38): expand staircase and concrete calculator results`.

## F9.38.1 — Bemenetek egyszerűsítése és műszaki rajzok

Státusz: **IMPLEMENTÁLVA ÉS TELJESEN REGRESSZIÓTESZTELVE; A BÖNGÉSZŐS VIEWPORT/TÉMAMÁTRIX RÉSZLEGES.**

- Mind a 27 lépcső-, beton/alapozási és átlósegéd-kalkulátornál az alapbemenetek a számításhoz matematikailag szükséges mérésekre szűkültek. A rajzot vagy kiegészítő eredményt adó méretek opcionális, részletes szakaszba kerültek. Az U-fordulós karhézag, fordulásirány és csigalépcső teljes fordulási szög explicit maradt; az acélsűrűség nem rejtett alapérték.
- A fa/fém fok- és fellépővastagság kikerült az S16 kötelező bemeneteiből, mert nem befolyásolta a névleges profilképletet. Az orrkiülés opcionális; üres értékkel nincs vetületi többlet. A C8/C9 rudak térfogata és hossza sűrűség nélkül számolható, tömege csak explicit acélsűrűség esetén jelenik meg.
- A 27 kalkulátor valamennyi technikai rajzváltozatából kikerültek a látható SVG-méretszámok és magyarázó címkék. A rajz alatti akadálymentes jelmagyarázat a látható geometriából és az ugyanazon számító motor eredményéből származó méretértékeket mutatja. A nem geometriai beton- és acéltömeg a főeredmények között marad.
- Közös szín és vonalminta-rendszer: kék magasság/mélység, narancs vízszintes méret, zöld lejtés/átló, lila speciális geometria; a mesh két iránya eltérő szaggatást kap. A rajzmező-fókusz, zoom, fit/reset, billentyűzetes zoom és nyilakkal pan kódútja, egér/touch pan és pinch megmaradt. A legendakártyák mobil CSS-ben egy oszlopra váltanak.
- **Ellenőrzések:** célzott Vitest 9 fájl / 145 teszt PASS; a teljes Vitest a megjelenítésben talált nullás legendasor javítása után végső futásként PASS: 141 fájl, 9 skip; 718 teszt, 27 skip. Typecheck, lint, Next.js 16.4.0 webpack build (30 static page) és végső `git diff --check` PASS.
- **Böngésző:** 2026-10-18-án a sötét témájú, helyi read-only DEMO desktop workflow-ban S16 280/175 mm inputja, majd az opcionális 30 mm-es orrkiülés látszott. Üres kiülésnél nem jelent meg lila rajzi szakasz vagy legendasor; 30 mm-nél 310 mm vetület, 355,985 mm ferde hossz, látható lila szakasz és 30 mm-es legenda jelent meg. Az SVG-ben nem volt látható szöveg. A kalkulációt nem mentettem.
- **Nem igazolt:** 1440/1024/768/390/320 CSS-pixeles browser ellenőrzés, világos téma, fizikai mobil/touch, teljes screen-reader/billentyűzetes manuális audit és minden egyes kalkulátor invalid-input browser mátrixa. A viewport-ellenőrzést a CUA vezérlés nem tette lehetővé; kód- és tesztalapú reszponzív bizonyíték ezeket nem helyettesíti.
- **Konzisztencia/jogosultság:** eredmények tiszta domain számításokból származnak; tartós írási útvonal, adatbázis, Auth/RLS, snapshot és konkurencia-kezelés nem változott, ezért DB-jogosultsági teszt nem releváns. Hosted művelet, commit, push és deploy nem történt.
- Kalkulátoronkénti alap/haladó inputok, eredmények, geometriák és korlátok: [F9.38 teljesítési riport](F9_38_CALCULATOR_COMPLETION_REPORT.md#f9381--bemenetek-egyszerusitese-es-muszaki-rajzok-atervezese). Tesztstátusz: [F9.38.1 tesztmátrix](TEST_MATRIX.md#f9381--bemenetek-es-muszaki-rajzok).

Javasolt Conventional Commit: `feat(F9.38.1): simplify calculator inputs and redraw technical SVGs`.

## F9.37.3 — Háttér finomítása és Safari React script-hiba javítása

Státusz: **A SCRIPT-HIBA JAVÍTVA ÉS SAFARI/BRAVE DESKTOPON ELLENŐRIZVE; A KÖTELEZŐ KÓD-ELLENŐRZÉSEK PASS. A MOBIL VIEWPORT-MÁTRIX NEM FUTOTT.**

- A Safari `Encountered a script tag while rendering React component` hibájának oka a gyökérlayoutban React-gyerekként renderelt nyers inline `<script dangerouslySetInnerHTML>`. A korai téma/skála/üveg-beállítás bootstrap most a Next.js `Script` komponensét használja, stabil `id`-val és `beforeInteractive` stratégiával. A tartalom/korai végrehajtás megmarad; nyers `<script>` nincs a gyökérlayoutban. Új forrásszerződés-teszt védi ezt.
- A meglévő `PremiumGlassBackground` és CSS dot-grid maradt. A sötét alap mély grafit, a pontminta jól észlelhető, de visszafogott; felső-bal oldalon meleg borostyán, jobb oldalon hűvös kék fény van. Világos mód törtfehér alapon slate pontokat, nagyon enyhe champagne és hűvös fényeket mutat. A shared `--glass-border` token mindkét témában finomodott, így a közös kártyaszélek kevésbé dominálnak.
- A világos téma pontjai külön kontraszterősítést kaptak (`--premium-dot` alpha `.38`, rács opacity `.88`), hogy az off-white alapon is egyértelműen kivehetők legyenek. A célzott háttérteszt rögzíti a két értéket.
- A rács és fő fények statikusak. Egy kisebb ambient fényfolt legfeljebb 84 s-os, kis amplitúdójú `transform` mozgást kap, csak `no-preference` és beállított ON esetén. OFF ugyanazt az artworköt statikusan tartja; rejtett lap indulásra szünetel. Nincs JS animációs loop vagy új függőség.
- **Böngésző:** autentikált LOCAL DEMO dashboard Safari és Brave alatt megnyitva. Sötét + ON képernyőkép mindkét böngészőben szemrevételezve; Safari világos + OFF állapotban is ellenőrizve a megmaradó statikus artworköt, dot-gridet, kontrasztot és kártyaolvashatóságot. Safari frissítés után az oldal rendesen kirajzolódott és a Next dev issue badge nem jelezte a korábbi React-hibát; Brave DevTools konzolban a hiba javítás utáni frissítéskor nem jelent meg. Safari natív konzolbejegyzéseit külön nem olvastuk ki. A széles desktop képeken vízszintes túlcsordulás nem látszott; mobil breakpointot nem emuláltunk. Safari végállapot: sötét + ON.
- **Ellenőrzések:** fókuszált Vitest 8 fájl / 18 teszt PASS; `npm run typecheck`, `npm run lint`, izolált ideiglenes másolaton `npm run build` (Next.js 16.4.0 webpack, 30 route), `git diff --check` PASS. A fókuszált dashboard suite egy már meglévő nem-boolean `priority` DOM attribútum figyelmeztetést adott.
- **Korlátok:** mobil nézet, OS reduced-motion aktív állapot, rejtett lap tényleges energiafelvétele és Safari konzolnapló közvetlen olvasása nem történt. DB/Auth/RLS/hosted tartalom nem változott; nincs commit, push vagy deploy.

Javasolt Conventional Commit: `fix(F9.37.3): resolve Safari script rendering and refine background`.

## F9.37.2 — Premium ambient dot-grid globális háttér

Státusz: **IMPLEMENTÁLVA / AUTHENTIKÁLT LOCAL DEMO BÖNGÉSZŐBEN A NÉGY TÉMA- ÉS MOZGÁSÁLLAPOT MEGTEKINTVE; KÉPERNYŐMÉRET-MÁTRIX NEM TELJES.**

- Az F9.37 háttérkomponens megmaradt, de két SVG rétegét statikus CSS `radial-gradient` pontminta és egyetlen ambient fényfolt váltja. A pontok 32 px kiosztásúak, CSS maszkkal halkulnak; világos módban meleg törtfehér/champagne, sötétben grafit/borostyán tokenek láthatók. A glow-színréteg egyetlen CSS radial gradient, blur/filter nélkül.
- A meglévő helyi preferencia kizárólag a fényfoltot animálja 78 s `transform` mozgással. A dot-grid szabály statikus. OFF esetén ugyanaz a háttér marad látható és mozdulatlan; SSR markup motion OFF-ként indul. `prefers-reduced-motion` leállítja az ambient animációt, rejtett tabnál a CSS paused állapotú.
- A preferenciacímke most kifejezetten jelzi, hogy a pontminta statikus. A díszítő rétegek pointer-eventet nem fogadnak.
- **Böngésző:** hitelesített LOCAL DEMO dashboardon mind a sötét/világos × ON/OFF kombináció láthatóan megtekintve. Az OFF állapotban a háttér változatlan artworkként maradt meg. Az eredeti sötét + ON beállítás visszaállítva. A képernyőfelbontás/viewport nem állítható a rendelkezésre álló natív böngészős kezelővel; a 1440/1024/768/390/320-as viewport-mátrix és a fizikai mobil nincs ellenőrizve. Animáció időbeli sebességét, reduced-motion OS beállítást, rejtett lap energiafogyasztását nem mértük.
- **Ellenőrzések:** célzott Vitest 7 fájl / 17 teszt PASS; `npm run typecheck`, `npm run lint`, ideiglenes tiszta worktree-másolaton futtatott `npm run build` (Next.js 16.4.0 webpack, 30 route) és `git diff --check` PASS. A Vitest dashboard suite egy meglévő, nem boolean `priority` DOM-attribútum warningot adott.
- **Korlátok:** viewport breakpoint-mátrix, reduced-motion OS/emuláció, rejtett lap GPU- vagy energiafogyasztás és fizikai mobil nem ellenőrizhető ebben a natív böngésző-környezetben. A négy szín/mozgás állapot desktop képernyőn lett szemrevételezve; a 78 s mozgási ciklust időméréssel nem validáltuk.

Javasolt Conventional Commit: `feat(F9.37.2): add ambient dot-grid background`.

## F9.37 — Premium Liquid Glass globális háttér

Az alábbi bejegyzés az F9.37 eredeti implementációs állapotát dokumentálja; a jelenlegi aktív CSS-pontmintás változatot a fenti F9.37.2 mérföldkő írja le.

Státusz: **MEGVALÓSÍTVA / AUTHENTIKÁLT HELYI BÖNGÉSZŐBEN TÉMA- ÉS PREFERENCIA-FLOW ELLENŐRIZVE; responsive/reduced-motion emuláció részleges.**

- A Vanta NET/WebGL hátteret a gyökérlayout tartós `PremiumGlassBackground` komponense váltja fel. Három réteg: témaszínezett token-alap, saját inline SVG radial-gradient ambient fényfoltok és saját inline SVG engineering grid. Külső fffuel SVG-t vagy új eszközfüggőséget nem használ.
- A meglévő `tetopro-background-animation-v1` localStorage beállítás és esemény maradt. A szervermarkup kezdetben statikus artwork; a kliens a mentett preferencia visszaállítása után állítja be a motion attribútumot. Kikapcsolva a teljes artwork látható és mozdulatlan. Reduced-motion alatt a CSS leállítja mindkét mozgást; rejtett oldalon az animációk paused állapotot kapnak és visszatéréskor folytatódnak.
- Az ambient és grid mozgása 56/92 másodperces, kizárólag `transform` kulcskockákkal; `pointer-events: none`, viewport-fixed háttér, két animált réteg. Forced-colors módban dekorációt elrejti, natív Canvas alap marad. Téma-palettája CSS tokenekkel az alkalmazás `data-theme` értékét követi.
- A `vanta`, `three`, `@types/three`, régi Vanta policy és moduldeklaráció eltávolítva. Nincs adatbázis-, Auth/RLS-, üzleti workflow- vagy Liquid Glass beállításmódosítás.
- **Böngésző, autentikált LOCAL DEMO:** a Dashboard háttérét sötét és világos témában megtekintettem. Animációt OFF-ra állítottam: a képen az ambient és rács megmaradt. Frissítés után a beállítás OFF állapota visszatöltődött; majd az eredeti sötét téma és ON állapot visszaállt. Dashboard → Kalkulátorok → Dashboard kliensnavigáció hitelesítve maradt. Mentett üzleti adat nem változott.
- **Ellenőrzések:** hét Vitest fájl / 16 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack, 30 statikus oldal) PASS; `git diff --check` PASS. A Vitest dashboard suite egy már meglévő, nem boolean `priority` DOM-attribútum warningot írt ki.
- **Korlátok:** böngésző viewport emulációja 1440/1024/768/390/320 px-re, OS reduced-motion kapcsoló, hidden-tab GPU-mérés, UI-scale manipuláció, fizikai mobil és energia/fogyasztás mérés nem futott. A screenshot smoke desktop Brave nézetű. Teljes Vitest suite nem futott.

Javasolt Conventional Commit: `feat(F9.37): replace Vanta with premium glass background`.

## F9.31 — legacy kalkulátorfüggőségek és biztonságos mentésjavítás

Státusz: **A kért aktív mentési útvonalak és biztonságos UI-kivezetés megvalósítva; a felsorolt helyi ellenőrzések PASS.**

- A projektbeli lemezkiosztás mentés új, `tetopro_covering_writer` szerepkörre korlátozott `save_metal_sheet_layout_secure` RPC-t használ. Az additív migráció ledgerrel, actor/org/project ellenőrzéssel, idempotenciával és konkurenciavédelemmel megőrzi a meglévő immutable revízió- és takeoff-szerződést. A régi RPC és mentett adatok megmaradnak, közvetlen authenticated írása tiltott.
- A source-linked gable és multi-roof flashing mentés a már meglévő restricted writerre irányul; a forrás nélküli kézi projektmentés kompatibilis útvonala változatlan.
- A standalone flashing útvonal új kalkuláció indítása nélkül a Kalkulátorokhoz irányít; meglévő rekord read-only maradt. A független 33 építési kalkulátor és a survey shared geometry nem változott.
- Függőségi és kockázati döntések: [F9.31 legacy kalkulátor audit](F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md). `funkciok.md` és [DATABASE.md](DATABASE.md) frissítve.
- **Helyi pgTAP:** a korábbi `001`, `009`, `011`, `029` regressziók gyökéroka javítva/tesztfixture a jelenlegi szerződéshez igazítva; 4 fájl / 228 assertion PASS. A releváns Survey → Material List → Quotation → Work Log downstream regresszió: 10 fájl / 199 assertion PASS.
- **Auth/RLS/többkapcsolatos integráció:** 2 fájl / 6 teszt PASS; közvetlen kliensírás tiltása, retry, immutable revízió és eltérő concurrent payload konfliktusa igazolva. Fókuszált Vitest: 3 fájl PASS, 2 opt-in fájl skip; 11 pass / 6 skip. `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS.
- **Böngésző:** helyi production builden a standalone redirect, mentett survey geometria, anyaglista route és meglévő worklog read-only betöltése ellenőrizve. A helyi org anyaglista nélkül volt, így meglévő lista böngészős újranyitása nem volt lehetséges; hosted rekordállomány és production integráció nincs ellenőrizve.
- A migráció csak a helyi Supabase-en lett alkalmazva, reset nélkül. Hosted környezetet, üzleti adatot nem módosítottam; commit/push/deploy nem történt.

Javasolt Conventional Commit: `fix(F9.31): secure legacy calculator persistence`.

## F9.30 — Survey geometry különálló kalkulátoroktól

Státusz: **IMPLEMENTÁLVA / A KÉRT SCOPE IGAZOLVA.**

- A felmérés editor a megosztott domain geometriai motort használja a hét tetőformára; a felmérési CTA és embedded calculator panel eltűnt. A külön Kalkulátorok útvonalai és mentett revíziói megmaradnak.
- A régi `/felmeresek/[surveyId]/kalkulator/[calculator]` URL a forrás surveyre irányít, `organization`, `version`, `section` paramétert megőrizve. A történeti summary számítás/provenance adata és survey→anyaglista / ajánlat-follow-up / munkanapló művelete megmaradt. A project tetőmodell mentés opcionális disclosure alatt marad.
- `funkciok.md` 441/441 útvonal-ellenőrzést, route/DB/RPC/RLS/legacy leírást kapott; a négy korábbi POSSIBLY UNUSED elem vizsgálatára hivatkozik, plusz a két régi survey handoff UI állapotát rögzíti. Új audit: [F9_30_SIMPLIFICATION_AUDIT.md](F9_30_SIMPLIFICATION_AUDIT.md). DB architektúra-kiegészítés: [DATABASE.md](DATABASE.md); workflow kiegészítés: [DAILY_WORKFLOW_UX_AUDIT.md](DAILY_WORKFLOW_UX_AUDIT.md).
- **Vitest:** fókuszált survey/geometry regresszió 4 fájl / 71 teszt PASS; teljes `npx vitest run`: 133 fájl PASS, 8 skip; 580 teszt PASS, 25 skip.
- **Kódellenőrzés:** `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. A build által jelzett nullable measurement típusproblémát a meglévő `completeSectionMeasurements` helperrel oldottam meg; az ismételt build sikeres.
- **Helyi böngésző:** production build, hitelesített DEMO, read-only: legacy survey calculator URL → pontos survey V3 redirect query megőrzéssel; kontytető rajz/terület látszik, calculator CTA nincs, optional roof model és worklog út megmaradt. A külön `kalkulatorok/nyeregteto` út hét tetőforma-választója megjelent. Nem történt mentés.
- **Helyi pgTAP reprodukció:** `001` 28/172 fail (RLS expected SQLSTATE és layout source-lock 40001); `009` 3/21 futott, visszavont gable RPC miatt abort; `011` 14/19 fail, első source-linked flashing V1 P0002; `029` 2/9 futott, visszavont gable RPC miatt abort. Nem módosítottam a DB migrationt vagy az assertionöket.
- **Adat/security bizonyíték:** F9.30-ban nincs táblaváltozás, migration, RPC, Auth/RLS módosítás vagy üzleti adatmódosítás. Pontos historic survey revision méréseiből rajz/terület újraszámolódik; ez nem fagyasztott geometry output (a limitáció dokumentálva).

Korlát: nincs fizikai mobil, hosted DB/Auth, teljes material list→quotation→accepted→execution E2E vagy történeti geometry snapshot-verzió ellenőrzés. A négy lokális pgTAP hibát az audit dokumentálja; F9.30 nem változtatta meg backend-kódjukat.

Javasolt Conventional Commit: `feat(F9.30): separate survey geometry from calculators`.

## F9.29 — Architecture Audit & Workflow Rationalization

Státusz: **AUDIT KÉSZ / SAFE FIXES VERIFIED — a dokumentációt és workflow-függőségeket frissítettem; két alacsony kockázatú UI/típusduplikációt javítottam. A forráskapcsolt lemezkiosztás- és flashing mentési hibák reprodukálva, de külön security mérföldkőre kerültek.**

- **Architecture inventory:** a `funkciok.md` jelenleg 441 projekt által kezelt TS/TSX fájlt sorol fel; 441 egyedi útvonal, nincs hiány/többlet. A 440-es F9.28 állapothoz az új `workspace-calculator.test.tsx` hozzáadódott. A négy POSSIBLY UNUSED fájlból az ajánlati státusztípus domain-forrása most a feature type-only importja, így INTERNAL; a registry, geometry primitives és project-list továbbra is csak tesztből fogyasztott/árva nézet, törlésük nem történt.
- **Workflow-rationalization:** a `workspace-calculator.tsx` szülő fejlécéből eltávolítottam a gyermekben már megjelenő survey source státusz ismétlését. A `quotation-data.ts` a domain `QuotationStatus` típust használja és exportálja tovább. A napi UX audit korábbi F9.25 pillanatképe frissült, mert F9.27 óta van survey→anyaglista import és F9.27.2 óta üres standalone lista mentés.
- **Backend root cause:** `001`/`011` valódi runtime mentési hibát is ad. A `save_metal_sheet_layout` `FOR UPDATE` és a `save_flashing_material_calculation` `FOR SHARE` nem tudja zárolni a roof source sort az authenticated restrictive UPDATE policy mellett. A `001`, `009`, `029` pedig a F9.10-ben visszavont `save_gable_roof_calculation` RPC-t használó fixture-eket tartalmaz. Részletes root-cause és elkülönített biztonságos javítási javaslat: [F9_29_SIMPLIFICATION_AUDIT.md](F9_29_SIMPLIFICATION_AUDIT.md), [DATABASE.md](DATABASE.md).
- **Workflow limit:** a helyi böngészős smoke a mentett félkonty/konty felmérésből nyitott roof workspace-t; a gyermek source banner látszik, de a gable-specifikus hossz/szélesség/túlnyúlás mezők üresek. Roof-type-compatible handoff külön domain/product mérföldkő. Anyaglista→ajánlat→accepted quotation→munkanapló teljes E2E nem futott.
- **Biztonsági és adatkonzisztencia bizonyíték:** nem változott migration, tábla, Auth, RLS, RPC, saved record vagy historic revision. A source-linked írónál membership, exact source, immutable revision és concurrency-javítás szükséges; emiatt nem próbáltam a security gate-et kikerülni. Hosted Supabase nem volt elérve.

**Ellenőrzések:** fókuszált Vitest `workspace-calculator.test.tsx`, `standalone-gable-preview.test.ts`, `status.test.ts` — 3 fájl / 6 teszt PASS; `npm run lint`, build után `npm run typecheck`, `npm run build` (Next.js 16.4.0 webpack), 441/441 inventory egyeztetés és `git diff --check` PASS. Helyi DB: célzott `001`, `009`, `011`, `029` futás reprodukálta a dokumentált hibákat (001: 28/172 assertion fail; 009: deprecated gable fixture miatt abort, 3/21 futott; 011: 14/19 assertion fail, első source-linked V1 mentés `P0002`; 029: deprecated gable fixture miatt abort, 2/9 futott). Teljes Vitest és teljes DB suite ebben a mérföldkőben nem futott. Böngésző: helyi production, hitelesített DEMO, survey lista→V3 survey→roof calculator, read-only; a forrásbanner ismétlése megszűnt. 390×844-ben document/body 390 px, vízszintes overflow nélkül. A kiválasztott tetőforma geometry handoffja partial.

Javasolt Conventional Commit: `refactor(F9.29): rationalize survey and quotation workflows`.

## F9.27.2 — Anyaglista szerkesztő UX-stabilizálása

Státusz: **IMPLEMENTED / VERIFIED SCOPE — mobil/desktop szerkesztő, mentés és újranyitás, standalone üres piszkozat és helyi adatbázis regressziók célzottan ellenőrizve. Teljes Vitest suite és fizikai mobil teszt ebben a körben nem futott.**

**Előtte / utána:**

| Előtte | Utána |
| --- | --- |
| Sűrű, több sorba törő tételgrid; különálló katalógus és kézi hozzáadási út. | Egységes, „Katalógusból / Kézi tétel” választó és egy olvasható tételsor szerkeszthető mennyiséggel, egységgel, árral, részösszeggel és forrással. |
| Keskeny nézetben a korábbi grid és a ragadós mentési sáv összeérhetett a tételmezőkkel; a termékválasztó egy Liquid Glass ősréteghez kötődött. | 620 px alatt egymás alá rendezett mezők, 16 px-es mobil vezérlőszöveg, legalább 44 px-es célméret és normál dokumentumfolyamban maradó mentési művelet. A katalógusválasztó modal dialogként, viewporthoz igazítva nyílik. |
| Üres standalone listát a domain és a normál mentő RPC is elutasított. | A standalone lista itemek nélkül is létrehozható; survey-import továbbra is legalább egy sort követel. |

- A gyökéroknak megfelelő javítások: régi mobil CSS felülírta az új sorgridet; mentési sáv tételmezőt fedett; a nem modális `dialog.show()` a `backdrop-filter`-es ős pozíciókoordinátáit használta; a numerikus DB-szöveg (`2.500000`) normalizálás nélkül került az inputba; a standalone kontraktus/RPC minimum egy sort kényszerített. A gridet mobilra egysorosítottam, mobil mentést statikussá tettem, a pickert `showModal()`-ra és átlátszó backdropra állítottam, a mennyiséget editálható decimális alakra normalizáltam, és csak a survey nélküli normál mentő RPC-ban engedélyeztem a 0–200 sort. Az immutable revízió, kategória-/ársnapshot, idempotencia-kulcs, membership és RLS-viselkedés megmaradt.
- A migráció a tényleges legfrissebb anyaglista-RPC-re (`20261017030000_material_list_manager_snapshots.sql`) épül. A fejlesztés korai változatában észlelt, kézi ár snapshotját elveszítő RPC-átírást javítottam, mielőtt lezártam a munkát; a helyi böngészőben a kézi ár/árnem, név és mennyiség mentés, frissítés és újranyitás után is visszaállt. A szerkesztő csak akkor számol HUF részösszeget, ha ár és pozitív mennyiség rendelkezésre áll. Az egységár hiánya külön látszik, az `0 Ft` ár valós 0 marad.
- A kezdeti Vitest-hiba assertion hiba volt, nem árkalkulációs regresszió: a fixture 2,5 db × 150 Ft = 375 Ft, a teszt tévesen 600 Ft-ot várt. Az állítást a fixture matematikailag helyes összegére javítottam; üzleti ellenőrzést nem gyengítettem.
- A `037_empty_material_list_drafts.sql` migráció- és pgTAP teszt az üres standalone V1-et, immutable V2-t, idempotens retryt, kézi ár snapshotot és hibás ár-precizitás elutasítását igazolja. Meglévő `032`/`036` szerződésteszttel együtt helyi Supabase-en 3 fájl / 55 assertion PASS. Nincs adatbázis-tábla, Auth/RLS policy vagy hosted környezet módosítva.
- Hitelesített helyi DEMO böngészőben elmentettem egy üres standalone listát, majd katalógus- és kézi sort adtam hozzá, mennyiséget/árat/nevet szerkesztettem, tételt eltávolítottam, V4-et mentettem, frissítettem és újranyitottam. A kézi sor 4 db, 150 Ft bruttó és 600 Ft összeg értékkel maradt meg. Lista: `f723a0e0-29fa-4319-a29e-beb0590677de`. Egy külön meglévő DEMO listát kizárólag reszponzív olvasási próbára használtam.
- Böngészős nézetmérés: 1440/1024/768/390/320 px méreten nem volt vízszintes túlcsordulás; az aktív mezők betűje legalább 16 px, a látható vezérlők érintési mérete legalább 44 px. A mobil mentési sáv 390/320 px-en statikus, a tételmezőkkel nem fed át. 390 px-en a termék modal dialógus 12–373 px és 392–608 px koordinátán a 390×844 viewporton belül maradt; kereső és DEMO kategóriatermék megjelent, Escape bezárt és a fókusz visszatért a triggerre. Fizikai telefon/virtuális billentyűzet és screen reader nem lett tesztelve.
- Fókuszált Vitest: 4 fájl / 14 teszt PASS (`material-list-contract`, editor, material preparation data, product picker). `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Teljes Vitest suite ebben a körben nem futott. A teljes DB suite sem futott újra; a F9.27.1 dokumentációban szereplő `001`, `009`, `011`, `029` régebbi hibák ettől a mérföldkőtől függetlenül nyitva maradnak.

Javasolt Conventional Commit: `feat(F9.27.2): redesign professional material list workflow`.

## F9.27 — Felmérésből szerkeszthető anyaglista

Státusz: **IMPLEMENTED / PARTIAL — a fő átadási útvonal, a mennyiségi korlátok és a lokális mentési/RLS-szerződés célzottan ellenőrizve; böngészős mentés/újranyitás és a kért viewport-sor nem igazolt.**

- A mentett felmérés összesítőjében megjelent az „Anyaglista készítése” művelet. Az `organization`, felmérés-azonosító és kiválasztott változat a `/anyaglistak/uj` oldalon is megmarad; a szerver az eredeti felmérés- és számítás-revízióból tölti fel a piszkozatot. Standalone felmérésnél sem ügyfél, sem munkanapló nem szükséges.
- Csak a pontos felmérésrevízióhoz kapcsolt, figyelmeztetés nélküli, `verified` nyeregtető-geometria `combinedRoofM2` területe (m²), illetve a kitöltött, `m` egységű `gutter_run_length` és `flashing_run_length` mérés (m) vehető át. A mért adat és a számított felület külön minősítést kap, az eredeti forrásérték és hivatkozás külön, változtathatatlan provenance-snapshotba kerül.
- Szálhossz, toldás, átfedés, ráhagyás, hulladék, darabszám és hiányzó termékadat nem becsülődik. A más egységű, nulla, hiányos vagy 6 tizedesjegyű adatmodellben veszteség nélkül nem tárolható mérés magyarázatot kap; kézi tétellel folytatható. A számított felület az anyaglista 6 tizedesjegyű mezőjére kerekedik; a provenance az engine eredeti számértékét őrzi.
- A meglévő Anyagkezelő-kategória, termékkatalógus, kereső és `WorkflowMaterialProductPicker` használatban marad. A felmérésből származó sor csak azonos beszerzési egységű terméket választhat; `m`/`m²` nem alakítható darabra. Ebben az útvonalban katalógusár csak azonos egységű, HUF, `verified` ár lehet. Ha nincs ilyen ár, a felület és a mentett snapshot ezt üresen/„Ár nincs megadva” állapottal őrzi.
- Új `material_preparation_survey_sources` RLS-tábla a lista immutable revíziójához köti a survey, a pontos immutable survey-revízió és a forrástételek snapshotját. A dedikált SECURITY DEFINER RPC ellenőrzi a műhelytagságot, a survey hozzáférést, az exact source ID-ket, az egység- és árkompatibilitást, a stale állapotot és az idempotencia-kulcsot; a kliens közvetlen írása tiltott. Későbbi anyaglista-revízió az eredeti forrásrevíziót viszi tovább, és csak megmaradt sorokhoz tart meg tételprovenance-t.
- Stale forrásnál a mentés alapból tiltott; korábbi revíziót csak külön jelölőnégyzettel, kifejezett megerősítés után enged a mentési RPC. Egy korábbi sikeres, azonos kulcsú retry az újabb survey-revízió után is ugyanarra a mentett listarevízióra oldódik fel.
- A meglévő kézi anyaglista-mentés útvonala megmaradt; az existing-list szerkesztés az eredeti survey-linket a szerveroldali immutábilis forrástérképből viszi tovább. Ajánlatot és munkanaplót nem alakítottam át.

**F9.26 négy korábbi regressziójának gyökéroka és javítása:**

| Teszt | Gyökérok | Javítás |
| --- | --- | --- |
| Anyagegység címke | A teszt régi, kiírt „négyzetméter / folyóméter” címkét várt a közös egységszerződés `m² / m / db` jelölése helyett. | A business állításokat megtartva a tesztet a jelenlegi egységszerződésre igazítottuk. |
| Nyeregtető cím | A teszt régi címszöveget várt, és a régió `aria-labelledby` hivatkozása nem talált célcímet. | A közös `GlassPageHeader` opcionális `titleId`-t kapott, a nyeregtető oldal ugyanazt az ID-t adja a fejlécnek és a régiónak. |
| Mérési útmutató markup | A teszt már nem használt `<details>` elemet várt a jelenlegi hozzáférhető dialog-popover helyett; a böngészős próbán valódi blur/fókuszvesztés is előjött. | A teszt a jelenlegi markupot ellenőrzi, a mező blur-kezelése pedig megtartja a súgót, ha a fókusz az útmutató gombjára vagy paneljére kerül. |
| Adatbetöltési üzenet | A teszt az alsóbb tetőadat-lekérdezés korábbi hibaüzenetét várta a tetőmodell-forrás pontos publikus hibája helyett. | A teszt a jelenlegi teljes, publikus „A tetőmodellek betöltése nem sikerült.” üzenetet ellenőrzi, belső DB-részlet megjelenítése nélkül. |

**Ellenőrzések:** `npx vitest run src/domain/material-takeoffs/survey-material-suggestions.test.ts src/domain/materials/material-list-contract.test.ts src/features/material-takeoffs/workflow-material-list-editor.test.tsx src/features/field-surveys/workspace-summary.test.tsx src/features/material-takeoffs/workflow-material-product-picker.test.tsx` — 5 fájl / 14 teszt PASS. `env SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local supabase/tests/database/036_survey_material_list_sources.sql` — 1 fájl / 29 pgTAP teszt PASS, beleértve az alkotó aktuális forrásrevízióhoz való olvasási hozzáférését; ehhez kizárólag a függő F9.27 migráció futott fel a helyi adatbázisra. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) PASS. `git diff --check` a dokumentáció befejezése után futtatandó.

**Teljes suite / korlátok:** a teljes `npx vitest run` F9.27-ben lefutott: 131 fájl PASS / 8 SKIPPED; 546 teszt PASS / 25 SKIPPED / 571 összesen. A négy korábbi regresszió ebben a teljes futásban nem jelentkezett. Egy teljes helyi `supabase test db` próba a F9.27 migráció alkalmazása előtt 37 fájlból 6 régebbi fájlt jelzett hibásnak (`001`, `009`, `011`, `015`, `028`, `029`), a `036` pedig azért nem tudott indulni, mert akkor az új RPC még nem volt a DB-ben. A célzott `036` az új migráció után, kiegészített alkotói olvasásellenőrzéssel 29/29 PASS; a régebbi fájlok hibáit nem vizsgáltam és nem javítottam ebben a mérföldkőben. A helyi, bejelentkezett böngészőben a Dashboard → Felmérések → Új felmérés útvonal és egy mentett önálló ereszfelmérés → összesítő → új anyaglista átadás működött; a V1 forrás és 8,5 m sor, valamint a hiányzó ár megjelent. A listát az `ef1f2259-d242-418d-9725-51c06baae283` azonosítóval elmentettem, majd az oldalt frissítve a V1, 8,5 m, `m`, hiányzó ár újratöltődött. A visszanyitott szerkesztőben viszont a forrásfelmérés-kártya és a tétel mérési eredetjelölése nem jelent meg, noha a lokális pgTAP az adatbázisban tárolt és az alkotó által olvasható provenance-t igazolja. Ez a böngészős app-adatbázis és a pgTAP adatbázis közti eltérést vagy forrásbetöltési hibát nyitva hagyja; a tényleges böngészős adatbázis közvetlen lekérdezése nem volt elérhető ebből a végrehajtási környezetből. A 1440/768/390/320 px emulált viewportot a Codex beépített böngészőjében megpróbáltam, de az nem örökölte a helyi bejelentkezett Auth-munkamenetet, a védett útvonal 404-et adott, ezért méretellenőrzés nem történt. Fizikai mobil, billentyűzetes mobil UX és képernyőolvasó sincs ellenőrizve. DB-reset, hosted DB/Auth/RLS módosítás, commit, push és deploy nem történt.

Javasolt Conventional Commit: `feat(F9.27): create material list drafts from surveys`.

## F9.27.1 — Felmérés-anyaglista provenance visszaállítása

Státusz: **PARTIAL — az új survey→lista útvonal mentés/frissítés/újranyitás provenance-a hitelesített helyi DEMO böngészőben PASS; a teljes pgTAP suite-ban négy régebbi tesztfájl továbbra is hibás.**

- A korábban megjelölt `ef1f2259-d242-418d-9725-51c06baae283` tesztlista adatbázisában nem volt `material_preparation_survey_sources` sor, a material-lista-revízió pedig nem tartalmazott forrásazonosítót. A hiba tehát ennél a történeti rekordnál már az eltárolt adatokban jelen volt; az olvasási útvonalon RLS által elrejtett forrás vagy React-feltétel nem okozta. Mivel nincs exact survey/revízió/item hivatkozás, ezt a rekordot nem lehet biztonságosan visszamenőleg felcímkézni. Az UI kézi soron pontosan a „Kézi tétel · forrás nincs rögzítve” állapotot mutatja.
- Új authenticated mentéssel igazoltam, hogy a meglévő RPC az immutable source sort a konkrét anyaglista-revízióhoz és a pontos survey-revízióhoz rögzíti; nincs szükség sémamódosításra. A mentett-lista read model a forrás pontos, immutable survey-revíziójából tölti be a felmérésnevet, a source snapshotból pedig az eredeti mért/számított értéket.
- Újranyitott V2-ben látható a `Forrásfelmérés: Ereszcsatorna · V1` kártya, a forrás survey/revízió azonosítói, az eredeti 8,5 m mért érték, a jelenlegi 9,25 m mennyiség és a kézi mennyiségmódosítás jelzése. A 2 db-os manuális sort külön jelöli az UI; annak nincs kitalált survey-provenance-a. Ár nem volt megadva, üres maradt.
- A régi adatbázis suite hat megjelölt hibájából a `015` fixture két, már tiltott ár/egység kombinációt használt, a `028` pedig elavult policy-nevet ellenőrzött. A fixture-ket a jelenlegi egység-invariánshoz és scoped RLS-policyhoz igazítottam; a teljes suite-ban most mindkettő PASS. Az `001` közvetlen kliensírási elvárásai és a `009`/`029` régi `save_gable_roof_calculation` hívásai a későbbi szerveroldali írásvédelmi/RLS hardening után elavultak. Az `011` legacy flashing RPC tesztjén a hitelesített tesztfixture összes source mezője látható és egyezik, de a régi SECURITY INVOKER RPC `FOR SHARE` source-lockja a restricted roof-model policyval nem talál sort; ezt a külön flashing-írási útvonalat nem változtattam meg ebben a provenance mérföldkőben.
- Full local pgTAP: 37 fájl / 912 tervbe vett assertion; `001`, `009`, `011`, `029` továbbra is hibás. `015`, `028`, `036` PASS a teljes futásban, a `036` felmérésforrás/auth/RLS és immutabilitási tesztje 29/29. Teljes Vitestet ebben a mérföldkőben nem futtattam; célzott Vitest 2 fájl / 4 teszt PASS. Teljes lint, production build és külön typecheck PASS. `git diff --check` a dokumentáció lezárása után futtatandó.
- A helyi, bejelentkezett Brave böngészőben a survey-CTA → új lista → V1 mentés → frissítés/újranyitás → kézi mennyiségmódosítás → V2 mentés → frissítés/újranyitás útvonalat ellenőriztem. A listához customer vagy work log nem kellett; a forrás pontos V1 maradt, a tétel jelenlegi mennyisége 9,25 m lett. A kézi 2 db sor V2-ben megmaradt. A böngészővezérlő nem adott viewport-állítási API-t, ezért 390 px mobilnézet és keyboard/screen-reader használat nem igazolt.

Javasolt Conventional Commit: `fix(F9.27.1): restore survey provenance after reopening material lists`.

---

## F9.27 — ajánlati termékpanel és új tétel elhelyezése

Státusz: **IMPLEMENTED / PARTIAL — célzott kódellenőrzések PASS; mobil interakció böngészőben nem futott**.

- A termékválasztó touch/coarse-pointer eszközökön nem fókuszálja automatikusan a keresőmezőt, ezért megnyitáskor nem nyitja fel a mobil billentyűzetet és nem kényszeríti viewport-átméretezésre a böngészőt. A keresőmező érintéssel továbbra is fókuszálható; finom pointeres eszközökön megmarad a megnyitáskori fókusz.
- Az ajánlati szerkesztőben az új kézi, munkadíj vagy egyéb sor a tétellista elejére kerül, így a hozzáadott sor rögtön az add gomb alatt jelenik meg.
- Nincs adatmodell-, mentési szerződés-, adatbázis- vagy jogosultságváltozás.

**Ellenőrzések:** `npx vitest run src/features/material-takeoffs/workflow-material-product-picker.test.tsx src/features/quotations/standalone-quotation-ui-state.test.ts src/features/quotations/quotation-overview.test.tsx` — 3 fájl / 7 teszt PASS; az érintett fájlokra `npx eslint ...` PASS; `npm run typecheck`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Mobil billentyűzetes eszközpróba nem futott.

Javasolt Conventional Commit: `fix(F9.27): prevent picker viewport jumps and show new quote lines first`.

## F9.26 — Regression repair és workflow-stabilizálás

Megjegyzés: a naplóban szereplő F9.26 kategóriás ajánlati termékválasztó külön, korábbi mérföldkő; ez a stabilizálási kör annak folytatása, azonos feladatkóddal.

Státusz: **COMPLETE — a kért frontend-regressziók és navigációs elfogadási feltételek igazolva; 25 opt-in helyi integrációs teszt kihagyva**.

- A teljes Vitest futás négy sikertelen tesztjének gyökérokát különválasztottam. Az anyagegység tesztje a régi kiírást várta a közös `m²` / `m` / `db` címkézés helyett; a nyeregtető teszt korábbi címszöveget várt, miközben a `standalone-gable-title` ARIA-hivatkozás ténylegesen feloldatlan volt; a mérési útmutató tesztje a régi inline `<details>` markupot várta, és a böngészős próba egy fókuszvesztés miatti popover-eltűnést is feltárt; a betöltési teszt a korábbi, általános tetőadat-hibaüzenetet várta az új tetőmodell-lekérdezés pontos üzenete helyett.
- A hiányzó cím-azonosító bekerült a megosztott `GlassPageHeader` opcionális `titleId` propján keresztül. A nyeregtető oldala ugyanazt az ID-t adja át a fejlécnek, mint amit a környező régió hivatkozik. A mérési mezők blur-kezelése megőrzi a súgót, ha a fókusz az útmutató gombjára vagy paneljére kerül; a bezárható, pozicionált popover használható maradt.
- A három elavult tesztelvárást a jelenlegi, konkrét szerződéshez igazítottam: közös anyagegység-szimbólumok; aktuális címszöveg és régiócímke; hozzáférhető dialog-trigger; pontos, belső adatbázisrészletet nem tartalmazó betöltési hibaüzenet. A business assertionök megmaradtak.
- `/kalkulatorok`-on mindhárom kategóriát, keresést, nyeregtető-választást és a betöltött műszaki rajzot kipróbáltam. A régi `/kalkulatorok/epitesi` útvonal a kiválasztott `calculator` és `organization` paraméterrel irányított át. A Mentett számításaim oldalról meglévő Cserepeslemez-fedés V2 rekord újranyílt, revízió- és adatnézetével.
- A dashboard → Felmérések → Új felmérés útvonal megnyitotta a munkatípus-választót. Egy mentett V3 felmérés újranyílt, V1/V2 történeti változatai elérhetők és a V2 összesítő megnyílt. A nem mentett mérésmódosítás kilépéskor figyelmeztetést adott; a bemenetet az eredeti értékre visszaállítottam, és az oldal visszajelzése „Mentve · V3” lett. Felmérés vagy számítás nem került mentésre.
- Nincs adatbázis-, séma-, migráció-, Auth/RLS-, motor- vagy tartós workflow-szerződés-változás. Nem történt DB-reset, hosted művelet, commit, push vagy deploy. A helyi produkciós böngészőben olvasási és visszaállított, átmeneti piszkozat-próba történt.

**Ellenőrzések:** `npm test` — 129 fájl PASS / 8 fájl SKIPPED; 541 teszt PASS / 25 SKIPPED / 566 összesen. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. A kihagyott esetek nyolc, környezetváltozóval explicit módon engedélyezendő helyi integrációs suite-hoz tartoznak; integrációs/DB suite-ot nem indítottam.

**Korlátok:** a böngésző smoke helyi, hitelesített DEMO adatokkal, normál desktop viewporton futott. A fizikai mobil/touch, reszponzív viewport-sorozat, képernyőolvasó és opt-in lokális Supabase/Auth/RLS integrációs tesztek nem futottak.

Javasolt Conventional Commit: `fix(F9.26): stabilize calculator and survey workflows`.

## F9.26 — Kategóriás ajánlati termékválasztó

Státusz: **IMPLEMENTED / PARTIAL — célzott kódellenőrzések PASS; interaktív böngészős mobilpróba nem futott**.

- Az új önálló ajánlat tételsorán az Anyag típushoz előbb aktív anyagkategóriát kell választani, majd a mellette megjelenő kereshető termékválasztó csak ennek a kategóriának az aktív termékeit és változatait kínálja. A már kiválasztott katalógustermék szerkesztéskor a saját kategóriáját is visszaállítja.
- A termékválasztó az Anyaglista meglévő keresési UX-ét és akcentusfüggetlen keresését használja. A keresőmező a lista fölött marad; az egyedi sorazonosítók több ajánlati tételnél is egyediek. Mobilon a mezők egymás alá rendeződnek, a választó a `VisualViewport` méretéhez igazodik, így a szoftverbillentyűzet mellett is a képernyőn belül marad.
- Az új és meglévő piszkozatoldal az eddigi szervezeti katalógusból tölti be a kategóriákat. Nincs új mező a mentési szerződésben, adatbázis-/migráció-/jogosultságváltozás vagy új üzleti adat.

**Ellenőrzések:** `npx vitest run src/features/material-takeoffs/workflow-material-product-picker.test.tsx src/features/quotations/standalone-quotation-ui-state.test.ts src/features/quotations/quotation-overview.test.tsx` — 3 fájl / 7 teszt PASS; az érintett TypeScript/TSX fájlokra `npx eslint ...` PASS; `npm run build` Next.js 16.4.0 webpack PASS; a build után külön `npm run typecheck` PASS. A teszt/build futás előtti párhuzamos typecheck a Next build által újragenerált `.next/types` fájlok versenyébe futott; külön újrafuttatva sikeres volt. `git diff --check` PASS. Fizikai mobil és interaktív böngészős képernyőpróba nem futott.

Nincs adatkonzisztencia- vagy jogosultsági szerződésváltozás: kategóriák és termékek csak az aktuális szervezet meglévő adatlekérdezéseiből jönnek. DB teszt és teljes Vitest suite nem futott.

Javasolt Conventional Commit: `feat(F9.26): add category-first quotation product picker`.

## F9.25 — Egységes Liquid Glass felületszín

Státusz: **IMPLEMENTED / PARTIAL — célzott ellenőrzések PASS; böngészős pixel-összehasonlítás nem futott**.

- A Liquid Glass React dekoratív réteg eddig a kártyák saját, közös felületkitöltésére még egyszer ráfestette a 10%-os tintet és az árnyékot. Ezért a „Funkciók” és a navigációs felületek sötétebbnek látszottak, mint az „Aktuális munkák” egyszeresen fedett kártyái.
- A könyvtári réteg kitöltése és duplikált árnyéka áttetsző lett; a host komponens közös `--surface-glass`, perem, blur és árnyék stílusa marad az egyetlen színréteg. A fénytörés megmarad a támogatott desktop Chromium eszközökön, a CSS fallback és a meglévő sötét/világos tint tokenek változatlanok.
- Nincs React komponens-, beállítás-, adat-, route-, DB-, migráció- vagy jogosultságváltozás.

**Ellenőrzések:** `node_modules/.bin/vitest run src/features/preferences/liquid-glass.test.ts src/components/ui/liquid-glass-policy.test.ts src/components/ui/glass-toolbar.test.tsx src/features/dashboard/dashboard-controls.test.tsx` — 4 fájl / 11 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. A helyi dashboard DOM-ja elérhető volt, de a módosítás utáni képpontszín és további route-ok vizuális ellenőrzése nem történt meg.

Javasolt Conventional Commit: `fix(F9.25): unify liquid glass surface tint`.

## F9.25 — Kalkulátor-konszolidáció és napi workflow UX-audit

Státusz: **PARTIAL — navigáció elkészült és a kritikus helyi desktop útvonalak böngészőben működtek; teljes workflow/mobil viewport igazolás nincs.** Ez a F9.25 külön kalkulátor-UX feladata; a fenti korábbi Liquid Glass munkát nem módosítja.

- A `/kalkulatorok` most közvetlenül a meglévő kereshető, háromkategóriás `ConstructionCalculatorSuite` felületet jeleníti meg a szervezeti hozzáférés-ellenőrzésen belül. A `/kalkulatorok/epitesi` 307-es redirecttel őrzi meg a `calculator` és `organization` paramétereket.
- Az aktív kalkulátor-indexből kikerült két ismétlődő tető/cserepeslemez indító, a régi eresz/szegély/profil archívumcsoport, valamint az üres mentett-lista új legacy számítás-indítólinkjei. Az engine-ek, mentett revíziók, meglévő típus-szűrők, rekord-újranyitási route-ok és üzleti workflow-hivatkozások megmaradtak.
- A dashboard kártya neve „Felmérések”, és a `/felmeresek` mentettlista oldalra vezet; annak fejlécében az `Új felmérés` elsődleges CTA közvetlenül elérhető. A létrehozási, szerkesztési, revízió- és piszkozatvédelmi logika változatlan.
- A napi workflow audit és a mérhető navigációs műveletszámok a [DAILY_WORKFLOW_UX_AUDIT.md](DAILY_WORKFLOW_UX_AUDIT.md) fájlban találhatók. A Felmérés→Anyaglista direkt átadás nem implementált. Anyaglista→piszkozat és elfogadott ajánlat→munkanapló a kódban elérhető, de a böngészőben e körben nem tesztelhető mentett anyaglista/ajánlati rekord hiányában.
- Nem változott adatmodell, adatbázis, RLS/jogosultság, kalkulációs motor vagy automatikus üzleti adatkapcsolat.

**Ellenőrzések:** célzott Vitest 3 fájl / 10 teszt PASS; `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build`, `git diff --check` PASS. Helyi, hitelesített DEMO production böngészőben 1280×720 méreten a dashboard→felméréslista, új felmérés kezdőlap, mentett V3 felmérés újranyitása, meglévő felmérés munkanapló-létrehozó panelje (elküldés nélkül), dashboard→kalkulátorcsomag→lépcsők→90° pihenős fa variáns, régi `/epitesi` URL és query-megőrzés, valamint mentett Cserepeslemez-fedés V2 rekord újranyitása működött. Az `/anyaglistak` üres állapotot mutatott; nem hoztam létre tesztadatot. 1440/1024/768/390/320 CSS px emuláció nem volt elérhető, a mobil vizuális próbák nem futottak.

Javasolt Conventional Commit: `feat(F9.25): consolidate calculators and audit daily workflows`.

## F9.24 — Tetőkalkulátorok előtérben és árva fájlok takarítása

Státusz: **IMPLEMENTED / PARTIAL — kódellenőrzések PASS; böngészős megjelenítés ezen a körön nem futott**.

- A Kalkulátorok oldalon a tetőgeometria és cserepeslemez kalkulátor maradt az elsődleges, azonnal látható kategória. Az ereszcsatorna, szegély és lemezprofil kalkulátorok egy alulra tett, alapból összecsukott „Archivált kalkulátorok” részbe kerültek. A meglévő route-ok és mentett számítás-típusok változatlanok, így a régi számítások továbbra is megnyithatók.
- A főoldali Kalkulátorok kártya leírása az elsődleges tetőfunkciókat tükrözi.
- A TypeScript importgráf és kódbeli hivatkozáskeresés egy árva `ClientCreatePageForm` komponenst azonosított; az ügyféllétrehozás élő útvonala külön, használt űrlapot alkalmaz, így ezt az elérhetetlen komponenst töröltem. Töröltem a gyökér `ikon.png`-t is, mert sehol nem hivatkozott rá kód vagy dokumentáció, és a Next ikonfájlok a `src/app` alatt megvannak. A gyökér, `src/` és `supabase/` `.DS_Store` Finder-metaadatfájlokat szintén eltávolítottam. Az automatikus Next route-konvenciók és a route/config/test belépési pontok nem számítottak árva fájlnak.
- Más adat-, route-, migráció-, jogosultság- vagy üzleti logika nem változott; DB-művelet, commit, push és deploy nem történt.

**Ellenőrzések:** `node_modules/.bin/vitest run src/features/dashboard/dashboard.test.ts src/features/dashboard/dashboard-controls.test.tsx` — 2 fájl / 8 teszt PASS; `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS (Next.js 16.4.0 webpack; `/kalkulatorok` és az archivált route-ok lefordultak); `git diff --check` PASS. Teljes Vitest-regresszió és DB-teszt nem futott. A böngészős archívum-kibontás és vizuális ellenőrzés nincs igazolva.

Javasolt Conventional Commit: `feat(F9.24): archive non-roof calculators and remove orphan files`.

## F9.24.1 — Független építési kalkulátorcsomag

Státusz: **PARTIAL — 22/33 referencia szűkített geometriai/mennyiségi körrel VERIFIED; 11/33 nincs implementálva.** A korábbi F9.24 mérföldkőbejegyzést változatlanul hagytam; ez az új kérés külön kiegészítő változatként szerepel.

- A 33 nyilvános Zhitov-referencia funkciója, URL-je, publikus mezői, várható kimenete, újrahasznosítása, képletforrása, státusza és korlátja a [lefedettségi mátrixban](CALCULATOR_COVERAGE_MATRIX.md) követhető. A Zhitov-oldalak csak funkció- és mezőfelderítésre szolgáltak, képletek igazolására nem.
- 22 tisztán tesztelhető, Zod-validált számítás: tető/szarufa/manzárd/rács geometria; egyenes, spirál és ferde lépcső geometria; sávalap, cölöp, lemez, gyűrű, térburkolat, épület körüli téglalap sáv, explicit receptarány, betonacél, háló és segédátló. A kategóriákon belüli funkciókör tudatosan szűkített; 90°/180°-os, háromkarú, húzott fokú és betonlépcső, továbbá gyártási/statikai részletek nem kerültek eredményadó UI-ba.
- Újrahasznosított motorok: meglévő `calculateRoofGeometry`, `calculateGableRoof` és termékadatot megkövetelő `calculateGableMetalTileCovering`; tetőformáknál `RoofWorkspace`, `MeasurementGuidance` és dinamikusan betöltött `TechnicalDrawing`; közös Glass header/disclosure és navigációs komponensek, globális Liquid Glass CSS-tokenek. Az App Router külön kalkulátorszegmensbe kódosztja a suite-ot, a tetőrajz csak eredménynél töltődik be. Új domain motorok a `src/domain/calculations/construction/` alatt tiszta TypeScript függvények.
- A `/kalkulatorok/epitesi` új, helyi állapotú, kereshető, 3 kategóriás felület; nem választ szervezetet/projektet, nem ment kalkulációt, és nem kapcsolódik felméréshez, Anyaglistához, Munkanaplóhoz vagy ajánlathoz. Adatbázis-, migráció-, Auth/RLS- és tartós adatszerződés-változtatás ehhez a mérföldkőhöz nem készült.
- A képletek, egységek, tartományok, invariánsok és korlátok a [matematikai ellenőrzési dokumentumban](CALCULATOR_MATH_VERIFICATION.md) vannak; OpenStax alapgeometria/körív/térfogat és NIST acélsűrűség szerepel. Nem ad statikai, jogszabályi, gyártási vagy alapozási alkalmassági jóváhagyást.

**Ellenőrzések:** fókuszált Vitest: `npx vitest run src/domain/calculations/construction/construction.test.ts src/domain/calculations/construction/catalog.test.tsx src/domain/calculations/roof-geometry.test.ts src/domain/calculations/gable-metal-tile-covering.test.ts` — 4 fájl / 31 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Teljes Vitest regresszió, adatbázis-teszt és hosted Supabase teszt nem futott. A helyi production böngészőben a közvetlen `/kalkulatorok/epitesi?calculator=roof.gable` oldal szervezet/projekt query nélkül betöltött; 10 000×6 000 mm épület és 4 000 mm gerincemelkedés 60 m² vetületet, 100 m² geometriai tetőfelületet és 7 élt jelenített meg. A `TechnicalDrawing` rajzi méretgombja a megfelelő `buildingLengthMm` mezőre fókuszált, ahol a mérési útmutató megjelent; zoom 110%-ra, visszaállítás 100%-ra működött. A csigalépcső 3 000 mm emelkedés, Ø2 000/400 mm, 360°, 18 fellépés bemenetből 17 fokot, 600 mm járóvonal-sugarat, 221,759 mm belépőt és 166,667 mm fellépőt mutatott. 1440/1024/768/390/320 CSS px-nél `documentElement` és body szélessége a viewporttal egyezett, a lista és munkaterület nem fedte egymást, a mezők és rajz nem lógtak ki.

**Korlátok / nem igazolt:** a 11 összetett referencia nem elérhető számításként; a fenti 22 csak saját, explicit `scope`-jukban igazolt, nem teljes Zhitov-helyettesítő. Böngészőben a nyeregtető és csigalépcső workflow, méretfókusz és kategóriaváltás lett kipróbálva; az összes kalkulátor képernyője és teljes billentyűzetes végigjárása, világos/sötét téma, reduced-motion/forced-colors, screen reader, fizikai mobil/touch/pinch és iOS Safari nem lett végigellenőrizve. Teljes auth-állapot mátrix, statika, helyi norma és anyag-előállítási terv nem volt a scope-ban.

Javasolt Conventional Commit: `feat(F9.24.1): add independent construction calculator suite`.

## F9.23.1 — Árajánlat-szerkesztő UX és katalóguskapcsolat

Státusz: **IMPLEMENTED / PARTIAL — célzott automatizált és lokális browser smoke PASS; a teljes A–E képernyőmátrix nincs igazolva**.

- A gyökérok az ajánlati sor kategóriájának hiánya a line contractból és a mentő RPC-ből, valamint a variáns nélküli `MATERIAL` sorok elutasítása volt. Az Anyaglista-import minden forrástételt `MATERIAL` sorként ad át; a nem társított tétel üres variánsazonosítóval és pontos forrásazonosítóval menthető.
- Az ajánlati szerkesztő ugyanazt a `WorkflowMaterialProductPicker`-t használja, mint az Anyaglista; új termékválasztó nem készült. A közös picker Escape-re bezár, választás után bezár, és a billentyűzetes kiválasztást is kezeli.
- A katalóguskapcsolt, kézi és forrásból érkező, de nem társított anyag külön állapotjelzést kap. Kategóriaváltás leválasztja az inkompatibilis katalóguskapcsolatot, miközben a leírás, mennyiség, egység, ár és forrásazonosító megmarad. A tényleges egység-/árfelülírás megerősítést igényel; az összehasonlítás tizedesértéken történik.
- A sorok kompakt alapnézetet és összecsukható haladó mezőket kaptak. Az aktuális nettó piszkozatbecslés az elsődleges összeg; mentett összeg csak módosított, korábban mentett ajánlatnál jelenik meg. Adózás, véglegesítés és hivatalos PDF-korlátozás változatlan.
- Új forward migration módosítja a meglévő mentő RPC-t, nem táblát: a `categoryId` és `priceProvenance` az ajánlati pillanatképbe kerül. Szervezeti kategória-ellenőrzés, variáns-kategória egyezés, eredeti anyaglista-revízió/forrástétel, idempotencia- és verzióellenőrzés megmarad; új Auth/RLS policy nem készült. Kereszt-szervezeti kategóriát pgTAP tilt.

**Ellenőrzések:** 5 célzott Vitest fájl / 19 teszt PASS; `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.0 webpack) PASS. A `SUPABASE_TELEMETRY_DISABLED=1 npx supabase migration up --local` migráció a lokális adatbázisra korábban felkerült; a célzott `supabase test db --local` 4 fájlon / 90 pgTAP teszten PASS (035, 018, 019, 033). DB-reset és hosted Supabase művelet nem történt. Lokális production böngésző-smoke: kategóriaváltás utáni kéziérték-megőrzés, keresés, ArrowDown+Enter, Escape, lokalizált `m`, azonos tizedesár prompt nélkül, eltérő katalógusár megerősítése és `7001,00 Ft` nettó összeg, sorátrendezés és törlési prompt. A smoke-piszkozat mentés nélkül el lett vetve.

**Korlátok:** a lokális szervezetben nem volt önálló ajánlat vagy anyaglista, ezért A/B/C mentett forrássorai böngészőben nem nyithatók meg; mentés/újranyitásra a DB-teszt ad bizonyítékot. A haladó rész összecsukása és eltérő egységű katalógusválasztás nincs külön böngészőben ellenőrizve; a helper célzott tesztje fedi a numerikus egység/ár átmeneteket. A 1440/768/390/320 px, világos/sötét téma, fizikai mobilbillentyűzet és teljes Vitest suite nem futott. A státusz ezért PARTIAL.

Javasolt Conventional Commit: `fix(F9.23.1): preserve unmapped quote materials and streamline editor`.

## F9.22 — termék-UX és Anyagkezelő

**Státusz: PARTIAL.** Az öt jóváhagyott fő navigációs útvonal változatlan; az
Anyagkezelő az Anyagok területen érhető el. Új felmérés előtt látható
munkatípus-választó jelent meg (tető, eresz, szegély, egyéb), így az önálló
ereszmérés nem indít tetőszakaszt. A munkanapló új bejegyzése alapértelmezetten
csak `Mit végeztél?` + mai dátum; a további mezők opcionálisak és összecsukva
maradnak. Az Anyagkezelő a meglévő katalógus adatmodellből kezeli a kereshető
kategóriákat, termékeket, egységet és opcionális árat. Az anyaglista
katalógus- és kézi módot ad, mindkettő egységhez kötött. A mentett listarevízióból
indított ajánlatpiszkozat a forrásadatokat visszakövethetően hozza át.

Az ellenőrzés során a felmérés szerverakcióból kiderült egy leválasztott
Supabase `rpc` metódushívás; a klienst megőrző hívásra javítottam. A desktop
Auth böngésző mentés/újranyitás és a helyi Auth/RLS integráció ezután sikeres.
Anyagkezelő, önálló lista, ajánlatpiszkozat és munkanapló DEMO-útvonalak is
mentés/újranyitás után ellenőrizve. Kódarchitektúra a meglévő route → feature
server action → domain/szolgáltatás → Supabase adapter irányt, valamint a
meglévő Liquid Glass elemeket használja. A négy új migráció a helyi Supabase-ra
került; nem történt reset vagy hosted módosítás. PgTAP: 034 (29), 032 (15),
033 (13) assertion PASS; helyi Manager párhuzamos Auth teszt 2/2 PASS;
felmérés helyi integráció célzott tesztje 1 PASS / 2 kihagyott. Fókuszált
Vitest 6 fájl / 27 teszt, typecheck, lint, production build és diff check PASS.

Nem futott teljes tesztregresszió. A 1440/1024/768/390/320, mindkét téma,
skálázás, WCAG 2.2 AA teljes ellenőrzés, screen reader és fizikai mobil
elfogadás nincs igazolva; ezért a mérföldkő nem COMPLETE. Hosted DB/Auth,
számlázás, ÁFA, migrációtelepítés, commit/push/deploy nem történt.
Részletek: `docs/F9.22_PRODUCT_UX_AND_MATERIAL_MANAGER.md`.

Javasolt Conventional Commit: `feat(F9.22): add material manager and streamline workflows`.

## F9.22.1 — Globális Vanta.NET teljesítmény és Liquid Glass alapfedettség

Státusz: **PARTIAL — implementáció kész; a fizikai mobil és több médiaállapot nincs böngészőben bizonyítva**.

- A globális Vanta marad a tartós `RootLayout` egyszeri, viewport-méretű rétegében. A Three.js `WebGLRenderer` adaptere és a Vanta 0.5.24 meglévő `onUpdate()` metódusának ütemkorlátozása a meglévő RAF-ciklusban tartja a tényleges rajzot és részecskepárok számítását legfeljebb 20 FPS-en; Three.js/Vanta forrása nem módosul, második RAF-ciklus nincs. A `<canvas>` diagnosztikai attribútumai az utolsó ténylegesen kirajzolt képkockák sebességét, pixelarányát és pufferdimenzióit rögzítik.
- A renderer `setPixelRatio()` hívása 1-re korlátoz. Alacsony fogyasztású profilon desktopon `points: 6`, mobil/coarse-pointer profilon `points: 4` beállítás csökkenti a Vanta NET páronkénti számítását; az animáció mobilon is alapértelmezetten engedélyezett, az egér-, érintés- és giroszkópvezérlés kikapcsolt. Témaváltáskor a példány újraépül, így a világos és sötét hálóvonalak a hozzájuk illő keverést kapják.
- `prefers-reduced-motion`, a tartós, alapértelmezetten bekapcsolt **Háttéranimáció** kapcsoló és a WebGL/Vanta inicializálási hiba statikus CSS-háttérre vált. Rejtett lapnál a példány destroy-olódik, láthatóvá váláskor újraindul; beállítás-, reduced-motion-, viewport- és témaesemények leiratkozása, valamint canvas eltávolítása cleanupban történik. Téma/route váltáskor a root host megmarad; újrainicializálás előtt meglévő canvas eltávolításával a duplikációt megelőzi.
- A Liquid Glass új és resetelt alapfedettsége 10%; a korábbi v1-es 10%-os induló érték is megmarad. A felhasználó korábban mentett, verziózott személyes értéke nem íródik felül. Nincs adatbázis-, migráció-, hitelesítési vagy üzleti logikai változás.

**Böngészős bizonyíték:** a helyi Codex IAB-en a host desktopon 1280×720, mobil emulációban 390×844 CSS px volt, mindkét esetben fix viewport-méretű és `pointer-events: none`; a DPR 2, illetve 1 volt. A host alatt pontosan egy elem maradt route navigáció (`/` → `/felmeresek/uj`) után. Az IAB nem adott használható WebGL-t, ezért ott a fallback látszott. A helyi Brave-ben sötét és világos témában is látszik a háló, téma váltásakor egyetlen vászon újraépül. Desktopon 1900×721 viewport/puffer, DPR 1, 98 részecske és 19 renderelt FPS; 390×562 mobil emuláción 390×562 puffer, DPR 1, 32 részecske, 18 FPS és minden interakció kikapcsolva. Mindkét esetben egy canvas maradt. A korábban látott fekete képernyő a statikus fallback volt; annak sötét alapját a Vanta `#0b1220` színéhez igazítottam. A gyökér Liquid Glass CSS token 10%.

**Ellenőrzések:** célzott Vitest: 3 fájl / 10 teszt PASS; a renderkapu szimulált 60 Hz-es bemeneten a 20 FPS korlátot és a DPR-korlátot ellenőrzi. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) PASS. Böngészőben desktop és 390 px mobil emulációs nézet, route navigáció, host-méret, pointer-events, WebGL init fallback, témaváltás, vonalrajz, canvas-darabszám és aktuális FPS-minta ellenőrizve. Teljes Vitest regresszió nem futott.

**Korlátok / nem ellenőrzött:** az emulált mobile viewport mérési mintája 18 FPS volt a 20-as cél mellett, desktopon 19 FPS; fizikai mobil/iOS, tablet, reduced-motion emuláció, rejtett/előhozott lap GPU-ciklusa és technikai SVG scroll interakció nincs bizonyítva. A Vanta külső RAF ütemezője 60 Hz-en ébredhet, de a részecskepár-számítás és tényleges WebGL render 20 FPS-re korlátozott. iOS Low Power Mode-ot nem próbálja felismerni. Átmeneti init-hiba után a látható lapra visszatérés vagy animáció újbóli engedélyezése újra próbálja a renderert.

Javasolt Conventional Commit: `perf(F9.22.1): throttle global Vanta rendering`.

## F9.23 — Anyagkezelő navigáció és kategóriás termékválasztó

Állapot: **IMPLEMENTED / PARTIAL — helyi UI; interaktív böngészős ellenőrzés hátravan**.

- A műhely főoldalán az Anyagkezelő önálló, negyedik funkciókártyaként jelenik meg az Anyaglisták után. A `/anyagkezelo` útvonal ugyanazt a szervezeti hozzáférés-ellenőrzést és katalógusadatokat használja, mint a meglévő `/anyagok`; a régi cím kompatibilitásból megmaradt.
- Az anyaglista szerkesztő felső fogaskerék-popovere kikerült, helyére közvetlen „Anyagkezelő megnyitása” link került. A katalógusmód termékválasztója kategóriafüggő, kereshető Liquid Glass dialog: a meglévő `LiquidGlassLayer` csak a panel megnyitásakor töltődik be, CSS blur fallbackkel; a keresőmező az első vezérlő, a terméklista saját, korlátozottan magas görgetési terület. A terméknév, egység és ismert egységár jelenik meg; hiányzó ár szövegesen jelzett, nulla ár nem készül belőle.
- A keresés ékezetfüggetlen magyar karaktereknél is; nyílbillentyű, Enter, Escape, fókusz-visszaadás és külső kattintás kezelése megvan. A natív nem modális dialog felső rétegével elkerüli az overflow-vágást; mobilon a Visual Viewport változásaihoz igazodó alsó panelként helyezkedik el. A listát a szerveroldal már betöltve adja át, ezért a választóban külön hálózati loading állapot nincs.
- A kézi tétel, termék- és variánsazonosító, egységár-választás, mentett revíziók és snapshotok szerződése nem változott; DB/migráció/Auth/RLS változás nincs. A korábbi világos témájú Glass-javítás F9.22.2 alatt dokumentált.

**Ellenőrzés:** célzott Vitest 3 fájl / 10 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. A `/anyagkezelo` build-route-ként megjelent. A próbált, ennél szélesebb tesztparancsban a változatlan `takeoff-forms.test.ts` egyik tesztje a „négyzetméter” teljes alakot várta, miközben az űrlap jelenlegi `m²` rövidítést rendereli; ez a munkához nem kapcsolódó assertion. Hitelesített böngészős dashboard→Anyagkezelő és anyaglista-kereső interakciós smoke, mobil billentyűzet/viewport és képernyőolvasó ellenőrzés nem történt.

Javasolt Conventional Commit: `feat(F9.23): add material manager navigation and product picker`.

## F9.22.2 — Világos témájú Liquid Glass világosítása

Állapot: **IMPLEMENTED / PARTIAL — CSS + automatizált ellenőrzés**.

- A megosztott, világos témájú Liquid Glass réteg nem jeleníti meg a rögzített `liquid-glass-react@1.1.1` könyvtár két fekete fényelnyelő rétegét. Ezek a fehér felületeket korábban szürkére sötétítették; a fénytörés, a fehér csúcsfények, a közös üvegtokenek és a 10%-os felhasználói alapfedettség megmaradt.
- A változás egyetlen globális CSS-szabály, ezért minden `LiquidGlassLayer`-t használó felületre érvényes; a sötét téma stílusa nem változott. Alkalmazáslogika, preferenciatárolás, adatbázis, migráció és jogosultság nem módosult.

**Ellenőrzés:** célzott Vitest 4 fájl / 11 teszt PASS; az elavult 0%-os / két disclosure elvárás 10%-ra / három meglévő disclosure-re frissítve. `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `npm run typecheck` és `git diff --check` PASS. A helyi dashboard világos témában nyitva van; módosítás utáni vizuális screenshot-ellenőrzés és további route-ok smoke tesztje nem történt. A csatolt képek alapján a hibaforrás az upstream csomag két, igazolt fekete fényrétege volt.

Javasolt commit: `fix(F9.22.2): brighten liquid glass in light theme`.

## F9.18 — iOS hibajavítások és mobil UX-megerősítés

Állapot: **PARTIAL**. A survey kliensoldali azonosítói egy közös, kriptográfiai
forrású UUIDv4 helperre kerültek: natív `crypto.randomUUID`, ennek hiányában
`crypto.getRandomValues`; nem biztonságos véletlenforrás nincs. A survey
piszkozat-helyreállítás most a jegyzetet, méréseket, tetőválasztást, aktív
munkaszakaszt/projektet és stabil új survey-kérésazonosítót is tárolja.
Meglévő felmérésnél a helyi piszkozat az eredeti verzióalappal áll vissza, így
újabb szerververziót nem írhat felül: mentéskor a meglévő optimista
verzióellenőrzés ütközést jelez. A hiányos numerikus bevitel helyreállítható.

A projektműveletek menü a tényleges visual viewporthoz és safe-area
insetekhez igazodik; billentyűzetes navigáció, Escape és külső érintés
megmaradt. A műszaki SVG a pointermozgást képkockánként dolgozza fel,
elengedéskor a legutolsó koordinátát is alkalmazza, és egyedi marker/title
azonosítókat használ. A kijelölt méretvonal aktív drop-shadow effektje
eltávolításra került. A geometriai számítás nem változott.

A mobil fejlécben nincs fiókikon vagy kilépés; a márka, téma és Beállítások
megmaradt. A meglévő fiókkezelés a teljes Beállítások panelen elérhető, a
kilépés egyszeri, meglévő szerverakciós űrlapként a panel jobb alsó részére
került. Az ereszkalkulátor haladó forrás- és konzoltávolság-mezői, lefolyói és
kézi tartozékai megosztott Liquid Glass disclosure-kben nyílnak; számítási
képlet, adatforrás és roof-edge handoff nem változott.

A survey mérési útmutató a tényleges beviteli egységet mutatja, így a
méterben megadott épületméret mellett is `m` látszik, nem a rajzmodell
kanonikus `mm` egysége.

Az Ethereum hiba nem reprodukálódott. A forráskód, dependency- és buildkimenet
keresésében nincs `window.ethereum` vagy `selectedAddress` hivatkozás; a
hitelesített Brave DevTools konzol aktuális 9 bejegyzése között sincs ilyen
hiba. A Brave Wallet bővítmény gombja látható, de a jelentett stack trace és
felhasználói screenshot nem volt a csatolmányban, így a külső eredet csak
lehetséges, nem bizonyított. Globális wallet objektumot nem módosítottam.

Hitelesített helyi Brave smoke-ban mind a hét tetőforma kiválasztása létrehozta
a várt mérési mezőket; nyeregtetőn mérés is hozzáadható volt. Új helyi DEMO
felmérés `b66caa4f-4882-4193-b91e-706a0f4b9e37` V1-ként ment: jegyzet,
10 m-es részleges mérés és tetőforma refresh utáni recovery-je, a „Maradok”
navigációvédelme, mentés utáni refresh és újbóli megnyitás bizonyított.
Külön DEMO felmérés `2538b809-cf73-46ac-807c-bfe3c2412df0` esetén az offline
mentési POST `ERR_INTERNET_DISCONNECTED` hibát adott; online visszakapcsolás
után ugyanaz az űrlap mentődött egyszer V1-ként, majd frissítés után a 10 m-es
mérés és jegyzet visszajött. Fókuszált mezőn a mérési útmutató `m` egységét
is ellenőriztem.
Projektmenünél emulált 320 px-en a bounding box 12–300 px, 390 px-en 12–316
px volt; a dokumentumszélesség mindkét esetben a viewporttal egyezett. A 320 px
Escape-próba először reprodukálta a menü nyitva maradását, a triggerre kötött
billentyűkezelés után bezárta. A projektarchiválási dialógust csak megnyitottam,
majd megszakítottam. Gutter-kalkulátoron a fő mezők és „További adatok” mezői
megjelentek; 768 px-en a `documentElement`, body és visual viewport egyaránt
768 px volt. Beállítások 390/1024 px emulált nézeten, fiókdialog és egyszeri
kilépés-űrlap megjelent; logoutot nem futtattam.

Fókuszált Vitest (10 fájl / 39 teszt), typecheck, lint és production build
PASS; ez nem teljes regresszió. A fizikai iPhone-próba sikeres volt a
felhasználó 2026-10-16-i visszajelzése szerint; ezt a tesztelemet lezártnak
rögzítem, a készülék- és Safari-build részletei nem állnak rendelkezésre. iPad,
LAN HTTP és Safari fallback, touch/pinch SVG artifact, soft keyboard és izolált
külső wallet reprodukció továbbra sincs bizonyítva. A csatolmány csak feladatleírást tartalmazott screenshotok és
stack trace nélkül. Ethereum hibát nem reprodukáltam; a Brave Wallet jelenléte
csak megfigyelés, külső eredet nem bizonyított. Hosted DB/Auth/RLS, migráció,
formula és jogosultsági contract nem változott; helyi, új DEMO survey rekord
maradt meg, hosted művelet, reset, commit, push vagy deploy nem történt.

Javasolt commit: `fix(F9.18): harden iOS mobile workflows`.

## F9.18.1 — Mérési UX és globális információhierarchia

Állapot: **COMPLETE — helyi, hitelesített DEMO és emulált böngésző alapján**.
Az iOS Safari és fizikai eszköz nem volt része az ellenőrzésnek.

A felmérési mérés neve, egysége és számítási szerepe a mérés melletti,
viewporthoz igazodó Liquid Glass popoverben szerkeszthető; a beállítás nem
bontja meg a mérési rácsot. Escape, külső kattintás és bezárógomb zárja, a
billentyűzetes bezárás visszaadja a fókuszt a triggernek. A törlés külön,
veszélyes műveletként a meglévő megerősítést használja, kizárólag a piszkozatot
módosítja. Helyi DEMO felmérés `8522219d-51fd-491a-9b21-ec2f65360073` V1
változata mentés és újratöltés után is megőrizte a tesztmérés mezőit; a törlési
megerősítés megszakítása után a mérés megmaradt. A korábbi mentett változatok
immutábilisak, a mentési és verzióellenőrzési szerződés nem változott.

A főoldalak H1 tipográfiája közös skálát használ. A felmérés és a tetőszerkesztők
ismétlődő címkéi rövidültek; mind a hét tetőforma egy főcímet és a mezőhöz kötött
mérési útmutatót kapott. A modellkorlátozások a beviteli mezők előtt láthatók.
A megosztott `BackNavigation` / `GuardedLink` projektben a helyes projekthez és
szervezeti kontextushoz, önálló tetőmunkánál a kalkulátorlistához, felmérési
handoffnál a felméréshez vezet. A meglévő piszkozatvédelmi útvonal megmaradt.
Geometriai képlet, domain, jogosultság, adatbázisséma és migráció nem változott.

Helyi Brave-ben ellenőriztem a tetőformákat és az önálló, illetve projekthez
kapcsolt visszalépést. 1440, 1024, 768, 390 és 320 CSS px nézetben nem volt
vízszintes túlcsordulás. 320 px-en 130%-os szöveg- és kezelőfelület-méretezés
mellett is használható maradt az oldal; az eredeti 100% / 115% értékeket
visszaállítottam. Világos és sötét téma, Escape és fókusz-visszaállítás
ellenőrizve. Vizuális capture készült a QA menetben, külön fájlként nem lett
exportálva.

Fókuszált Vitest: 4 fájl / 13 teszt PASS (`multi-roof-form`,
`gable-roof-form`, `roof-type-selector`, `viewport-menu-placement`).
`npm run typecheck`, `npm run lint`, `git diff --check` és Next.js 16.4.0
production build PASS; a build elkülönített `/private/tmp/f9181-build-20261016-1748`
munkapéldányban futott. Teljes Vitest-regresszió, hosted adatbázis és fizikai
eszköz nem volt ellenőrizve.

Javasolt commit: `fix(F9.18.1): harden measurement UX and headings`.

## F9.18.3 — Globális oldalcímek és tetőelőnézet

Állapot: **PARTIAL (LOCAL)**. A redundáns dashboard-bevezetők eltűntek; a
hat funkciókártya és a két fül sorrendje megmaradt. Az új `GlassPageHeader`
egységes, egyetlen H1-es fejléc a projektek, felmérések, kalkulátorok, anyagok,
ajánlatok, kivitelezés, projektadatok és tetőszerkesztők fő nézetein. A projektek
keresése, mobil szűrője, query-paraméterei, rendezése és műveletei változatlanok;
a projektlista célzott tesztje ezeket és az új egycímsoros elrendezést fedi.

A felmérési előnézet hibája a meglévő szerződés eldobott hibaválasza volt:
`mapFieldSurveyToCalculator` egyszerre megadott tetőemelkedést és hajlásszöget
elutasít, a régi nézet mégis csak általános „hiányzó méretek” szöveget mutatott.
40 m fesztávnál 10 m emelkedés ≈26,565°, ezért a 30°-kal együtt nem adható
egyetlen egyértelmű nyeregtető-geometria. Az új ellenőrzés megőrzi a nyers
értékeket, mindkét mezőt jelöli, pontos üzenetet ad, és nem rajzol konfliktusra.
Az érvényes emelkedés- és szögmód a meglévő `gableRoofInputSchema` és
`calculateGableRoof` motoron fut; képlet és domain contract nem változott.

A megosztott oldalfejléc mellé `GlassSectionHeader` cím-buborék került a
felmért tetőforma, az anyagkatalógus és az ajánlatcsoportok fő szekcióihoz.
Ezekből kikerültek a redundáns kategória-előcímkék; az ajánlatcsoport státusza
nem ismétlődik a cím mellett, a piszkozatok státusza az egyes ajánlatsorokon
megmaradt. A kivitelezési projektcsoportok ugyanezt a buborékstílust használják.

Helyi authenticated DEMO böngészőben dashboard → projektek → új felmérés útvonal,
konfliktus, hiányos mezők, 100/40/10 m és önálló 26,565° előnézet ellenőrizve.
V1-es felmérés `279811c1-b527-46b7-a576-50402b145371` mentés, frissítés és
újranyitás után a 6 mérés, SVG és 4472,136 m² eredmény visszajött. Ez felmérési
revízió; érvénytelen tetőgeometriát nem mentett. Auth/action, szervezet- és
revízióellenőrzés változatlan; hosted DB, migration, Auth/RLS és schema nem
módosult. Nincs teljes viewport-mátrix, minden főoldalra kiterjedő vizuális QA,
screen reader vagy teljes Vitest suite; a megadott böngészővezérlőben külön
viewport-méret nem volt beállítható. A felhasználói előtte-képek és a helyi
böngésző utána-capture megtekinthető volt, de azonos méretű fájlpár nem lett
exportálva.

Fókuszált Vitest: 10 fájl / 31 teszt PASS; `npm run typecheck`, `npm run lint`,
Next.js 16.4.0 webpack production build izolált munkapéldányban és
`git diff --check` PASS. Teljes Vitest/DB regresszió nem futott; ezért a státusz
PARTIAL. Javasolt commit: `fix(F9.18.3): unify glass title hierarchy and survey preview validation`.

## F9.18.2 — iOS rajzstabilitás és interakció

Állapot: **PARTIAL — a helyi implementáció és authenticated DEMO smoke kész;
teljes viewport-mátrix UNVERIFIED. A fizikai iPhone-próba a felhasználó
2026-10-16-i visszajelzése alapján PASS és lezárt; a próbát önállóan nem
figyeltem meg.** A műszaki rajz dimenzió-nyílhegyei SVG `marker` helyett explicit,
brand színű nyílgeometriák; a rajzpanel hátteréből kikerült a kompozitálást
érintő blur. A zoom véges tartományban marad, a pointer-koordináta
`preserveAspectRatio` letterboxát beszámítja, a nullméretű viewportot elutasítja,
a modellváltás és unmount pedig takarítja az RAF-et és pointer capture-t. A
kerékzoom nem passzív natív listenerrel fut, cleanup-pel; a Chromium konzolban
korábban látott React `preventDefault` figyelmeztetés a wheel-próba után nem
jelent meg. Geometriai képlet és tetőkoordináta nem változott.

A mérés hozzáadása a survey meglévő secure UUID helperét használja, egy sort
ad hozzá, rövid ideig kiemeli, szükség esetén a visual viewportba görgeti, és
dirty piszkozatot hoz létre. Billentyűzettel indítva fókuszál, érintésre nem
nyitja fel automatikusan a billentyűzetet. Gyors ismétlés zárolt. A projekt
tetőmodell-kártyái a rajzválasztók: egyszerre egy `TechnicalDrawing` renderelődik;
a kiválasztott modell/revízió és kalkuláció-revízió azonosítója, méretei,
szervezeti navigációja megmarad. A teljes modell szerkesztőből a projektbe
vissza lehet térni. A címek közös kompakt margót/skálát kaptak, a duplikált
modelllista és a rajzszekció dekoratív elválasztója kikerült.

Helyi DEMO survey `b66caa4f-4882-4193-b91e-706a0f4b9e37`: mérés hozzáadása,
kiemelése, értékbevitel, törlés/újrahozzáadás, mentés és frissítés utáni
újranyitás lefutott; a `DEMO F9.18.2 tesztmérés = 1234 mm` V4-ben visszajött.
Az aktív 10 × 6 m, 3 m nyeregtető rajza 84,853 m² eredményt és zoom/fit/reset
vezérlőket mutatott. Projekt DEMO smoke: 3 modell váltása közben 1 SVG maradt;
az első félnyeregtető V1 (10 × 6 m) és az `Új nyeregtető` V4 (12,50 / 12,00 /
10,60 m) méretei nem keveredtek, a teljes editor megnyílt és visszatért.
Chromium emulációban 393 / 768 / 1032 CSS px nézetet, valamint normál desktop
elrendezést néztem meg; a teljes 320 / 390 / 1024 / 1440 mátrix ezen a
projektoldalon nincs végigigazolva.

A `window.ethereum.selectedAddress` hiba nem reprodukálódott; forrásban és
lokális dependency-kben nincs hivatkozás. A Brave Wallet ikon önmagában nem
bizonyítja a külső eredetet. A korábban reprodukált wheel `preventDefault`
figyelmeztetés `react-dom-client.development.js` stacken jelent meg; a listener-javítás utáni
wheel smoke konzolja 0 bejegyzést mutatott. Survey V4-ben az említett DEMO
tesztmérés helyben megmaradt; schema, Auth/RLS, hosted Supabase, migration,
formula és revision contract nem változott.

Fókuszált Vitest: 5 fájl / 24 teszt PASS; typecheck, lint, Next.js 16.4.0
webpack production build PASS (izolált `/private/tmp/f9182-build.8oR4AU`
munkapéldány) és `git diff --check` PASS a végső dokumentációval. Teljes
Vitest, DB/Auth/RLS, screen reader, reduced-motion emuláció, fizikai iPad Safari
és WebKit touch-pinch nem futott. Az iPhone próba user-reported PASS.

Javasolt commit: `fix(F9.18.2): stabilize iOS drawings and measurement input`.

## F9.17 — Globális Liquid Glass interakció és visszajelzés

Állapot: **PARTIAL — a közös helyi interakciós rendszer elkészült, az offline
mentési hiba és a hálózati throttling böngészős ellenőrzése nem futott le.** A
gyökér `AppInteractionProvider` egyesíti a megerősítő dialógust, deduplikált
live toastokat, valódi dirty/pending guard-regisztert és a kizárólag dirty
állapotban aktív `beforeunload` fallbacket. A támogatott Next.js 16
`Link.onNavigate` API-ra épülő `GuardedLink` védi az app-linkeket; `router.push`
és `router.replace` műveletek is a közös guardot használják. Meglévő survey,
projekt-, tetőgeometria-, eresz-/szegély-, anyagkimutatás-, ajánlat- és profil
szerkesztők kerültek bekötésre. A mentéshez biztonságosan használható editorok
felkínálják a „Mentés és kilépés” műveletet, de csak sikeres mentés után
navigálnak. A survey sikeres mentése „Felmérés mentve” státuszüzenetet ad.

A survey mentetlen módosításai, fotókapcsolatai, session draft recovery-je,
idempotens mentései és elvárt verzióellenőrzései megmaradtak. Az ismételt
megerősítő műveletet action lock tiltja. A route-ok dashboard, survey, projekt,
kalkulátor, anyagkimutatás, ajánlat és kivitelezés skeleton boundaryt kaptak;
140 ms-os késleltetés csökkenti a gyors route-ok skeleton villanását, mesterséges
betöltési késés nincs. A mozgás és rajz animáció csökkentése a meglévő
`prefers-reduced-motion` szabályokat követi.

Hitelesített helyi DEMO böngészőben meglévő survey-n ellenőriztem: szerkesztés
után a „Maradok” a 10 001 mm piszkozatértéket az oldalon tartotta; a „Kilépés
mentés nélkül” a listára navigált, a mentett érték nem változott. Külön mentési
ellenőrzésben az érték 10 002 mm-re ment V2-ként, majd visszaállítottam 10 000
mm-re és V3-ként elmentettem; újranyitáskor a V3/10 000 mm jelent meg, a mentés
toastja látszott, és ezután nem jelent meg felesleges elhagyási figyelmeztetés.
Ez a helyi DEMO rekord két új revíziót kapott, de az eredeti aktuális mérési
értékét visszaállítottam. A projekt archiválási közös dialógusát megnyitottam,
majd megszakítottam; archiválási művelet nem történt.

A párbeszéd címe, leírása és gombjai accessibility tree-ben megjelentek. Friss
oldalbetöltés után Tab a fókuszt a dialóguson belül mozgatta, Escape bezárta az
ablakot, a fókusz pedig a megnyitó gombra tért vissza. Világos/sötét témát
dashboardon váltottam, majd a meglévő sötét beállítást visszaállítottam. Survey
nézetben 1440/768/390/320 CSS px-en a `documentElement.scrollWidth` és a
`body.scrollWidth` a viewporttal egyezett. A 320 px-en talált mérési disclosure
túlcsordulást a mobil summary tördelésével javítottam; 390 px-en a 192 px-es
minimális summary-szélesség is kilógott, ezért a javítás a teljes 600 px alatti
mobil tartományra érvényes.

`tab.reload()` alatt dirty szerkesztőben a lap és a piszkozat megmaradt, de az
in-app böngésző nem tette elérhetővé a natív `beforeunload` dialógust; a közös
fallback unit tesztje igazolja a szabványos esemény megelőzését és üres
`returnValue` beállítását. A natív böngészőfigyelmeztetés szövege/stílusa nem
szabályozható. A Next.js 16 App Router nem ad támogatott SPA history-back
blokkoló API-t; ezt nem helyettesítettem törékeny History API hackkel. A
`prefers-reduced-motion` böngészőemuláció, sikertelen hálózati mentés/retry,
throttling, fotótörlés, tetőgeometria-guard, fizikai eszköz és screen reader nem
lett ebben a körben végigpróbálva. Hosted DB/Auth/RLS, számítási logika és séma
nem változott; hosted művelet, DB reset, e-mail, commit, push vagy deploy nem
történt. A F9.16 e-mail-ellenőrzési funkció továbbra is **NINCS IMPLEMENTÁLVA /
HATÓKÖRÖN KÍVÜL**.

Javasolt commit: `feat(F9.17): add unified interaction feedback`.

## F9.16 — Mobile Acceptance & Closed Beta Readiness

Állapot: **PARTIAL — a helyi béta-előkészítés nincs lezárva.** Nem készült
új üzleti funkció vagy kódmódosítás. A már meglévő rajzszekció továbbra is
kompakt tetőmodell-kártyákat, kiválasztott rajzot, revíziót és on-demand SVG-t
használ; a zoom/pan/rétegek és a geometriakalkuláció nem változott.

Hatókör: e-mail megerősítés és e-mail alapú ellenőrzés **NINCS IMPLEMENTÁLVA /
HATÓKÖRÖN KÍVÜL**. Nem teszteltük, nem küldtünk tesztlevelet, nem implementáltuk,
és Supabase e-mail beállítást nem módosítottunk; ezek hiánya nem elfogadási hiba.

Hitelesített, helyi DEMO böngészőben új nyeregtető-felmérést hoztam létre:
10×6 m, 3 m emelkedés, 0 mm túlnyúlások → előnézeti SVG és 84,853 m² / két
tetősík. Mentés után frissítettem és újranyitottam; a V1 és a beírt méretek
visszatöltődtek. Egy új, elkülönített DEMO projektben (`b068a91c-b134-454d-a43e-1e3bdf9a4b80`)
mentett roof modelt (`84d286b5-f7aa-40b2-9cc3-5684a600947f`) hoztam létre.
A bal eresz 10 000 mm-es geometriáját átvette az eresz-kalkulátor; 4 000 mm-es
DEMO szálhosszal 3 szál / 2 000 mm maradékbecslést mentettem V1-ként
(`182925f6-9675-4f38-9605-3ef504ed8155`), majd az összesítőből újranyitottam;
az adat és a forrás megmaradt. A bal első ferde oromél 4 243 mm-es hossza
„Oromszegély” kategóriával átkerült a szegélykalkulátorba. Kereskedelmi
szálhossz és termék szerinti hasznos fedés nélkül az előnézet helyesen nem
adott eredményt, a mentés letiltva maradt; szakmai értéket nem találtam ki.
Külön ereszcsatorna-felmérésben 8,5 m-es szakaszt mentettem,
4 000 mm-es kereskedelmi szálhosszal 3 szál / 500 mm maradék becslést kaptam,
mentettem, majd az összesítőből V1-ként visszanyitottam. A felület jelezte, hogy
a kereskedelmi szálhossz a kalkulátorban lett pótolva, a forrásfelmérés
változatlan maradt; a tető nélküli felmérés külön hiányzó tetőmérést jelzett.
Ezek a tesztrekordok helyi DEMO adatok, nem jóváhagyott üzleti rekordok.

Biztonsági bizonyíték: `RUN_LOCAL_SURVEY_WORKSPACE_TESTS=1 ...
workspace.local.integration.test.ts` 3/3 PASS, két külön teszt-identityvel
és RLS/creator-scope ellenőrzésekkel; a `023_field_surveys.sql`,
`024_field_survey_photos_handoff.sql`, `025_field_survey_mobile_retry.sql`,
`026_unified_field_survey_workspace.sql` helyi pgTAP csomag 109/109 PASS.
Mind a 4 fájl PASS, de ez nem a teljes adatbázis-regresszió. A helyi
migrációlista a repó `20261015161100` végéig szinkron volt; hosted sémát nem
olvastam/módosítottam. A task-futás közben a lokális Supabase CLI leállította a
nem szükséges imgproxy/edge/analytics/vector/pooler szolgáltatásokat; Auth/API/
DB/Storage elérhető maradt és a tesztek lefutottak.

Mobil emulációban a felmérési szerkesztő 390 és 320 CSS px-en, az anyagkimutatás
320/390 px-en volt megtekintve; az utóbbi kettőn a `clientWidth`, `scrollWidth`
és `body.scrollWidth` egyezett, látható horizontális kilógás nem volt. Survey
fotó UI-val érvényes, szintetikus 64×64 PNG-t töltöttem fel a
`28b500b5-fa5a-4a9a-acf7-619d190bb4b1` DEMO felméréshez; V3-ként ment,
frissítés/újranyitás után a kép és a munkaszakasz-kapcsolat megmaradt. A hibás
PNG-t a validáció visszautasította. Hálózati DevTools Offline állapotban egy új
felmérés mentése a „A mentés válasza bizonytalan. Azonos adatokkal biztonságosan
újrapróbálható.” üzenetet adta; kapcsolat visszaállítása után azonos adatokkal
újrapróbálva egyetlen `9ef7d945-aae8-4a4c-ab25-85fc9a2e0853` felmérés jött
létre V1-ként. Ezen a körön 1024/768-as felmérési nézet, mindkét téma, növelt
skála, numerikus soft keyboard és SVG touch nem lett végigtesztelve.
Az Auth-olt böngészős workflow-k a már futó `localhost:3000` fejlesztői
szervert használták, nem külön izolált/prod-szerű helyi acceptance szervert.
Workflow B tető → SVG, tetőél → eresz kézi jóváhagyású handoff és mentett/
újranyitott downstream ereszkalkuláció igazolt; szegély-handoff is igazolt,
de hiányos kereskedelmi adatok miatt nincs mentett szegélybecslés. Workflow C-ből a projekt
mentett tetőmodelljei, anyagkimutatás oldala és egy meglévő belső ajánlati
piszkozat V1 megnyílt; a refresh után is ugyanaz a 2 forrástétel és HUF nettó
piszkozatösszeg jelent meg. Meglévő adatot nem mentettem, új ajánlatot nem
hoztam létre; a kiválasztott aktuális takeoff és ajánlatsor közti import/handoff
nem lett igazolva. D: képfeltöltés és újranyitás sikeres. E: beállítás/téma/
skála/fiókhozzáférés ebben a milestone-ban nem lett végigfuttatva.

Ellenőrzött konfiguráció: a szerver publikus Supabase URL + publishable key
értéket igényel; a helyi Auth `site_url` 127.0.0.1:3000. Éles redirect allowlist,
hosted Storage policy, backup/restore gyakorlat, monitoring, rollback és célzott
deployment runbook nincs ezzel bizonyítva. A korábbi `PRODUCT_READINESS_AUDIT.md`
korlátozott pilot előtti adatkezelési és visszaállítási kapui továbbra is
blokkolják a zárt béta lezárását. Nem azonosítottam P0/P1 hibát a két ténylegesen
végigjárt helyi workflow-ban; a többi lényeges workflow státusza **nem
ellenőrzött**, tehát nincs bizonyíték arra, hogy nem maradt P0/P1 blocker.

Érzékeny naplózás kódellenőrzése: `src/` alatt egy `console.error` találat van,
amely csak képfeltöltési HTTP státuszkódokat logol; logban token, jelszó,
feltöltött bájt vagy signed URL nem látszik. Hosted monitoring/logtárolás nincs
vizsgálva.

Az iPhone/iPad Safari és biztonságos LAN teszt lépései:
[`F9.16_MOBILE_ACCEPTANCE_CHECKLIST.md`](F9.16_MOBILE_ACCEPTANCE_CHECKLIST.md).
Fizikai eszköz-, hosted Auth/RLS/Storage-, backup/restore- és deploy-teszt nem
történt. A helyi emuláció nem zárt béta-engedély.

Javasolt commit: `test(F9.16): record mobile beta acceptance gaps`.

## F9.15.3 — Unified Liquid Glass Project Workspace

Állapot: **COMPLETE (HELYI UI-ELFOGADÁS)**. A projekt részletező oldalon a
mentett tetőmodellek kompakt, teljes felületükön kattintható üveg rekordok;
modellnév, tetőtípus, revízió és az elérhető számított tetőterület látható.
A projektadat-szerkesztő, kivitelezés, kivitelezési alrészek és rajzréteg-panel
közös `GlassDisclosure`-t használ. A rajz egyetlen külső műszaki felületet kapott,
a rajz saját kerete megszűnt; SVG-geometria, méretek, zoom/pan, nézetek, rétegek
és mentett revízió állapota változatlan. A kalkulátorok és alsó anyagkimutatás,
beszerzés/gyártás és ajánlati hivatkozások üveges navigációs elemek. A kivitelezési
áttekintés redundáns címkéje és rövid magyarázata kikerült; az eredeti ajánlat
státuszára és a külön belső kivitelezési nyilvántartásra vonatkozó adatintegritási
figyelmeztetések megmaradtak.

Helyi, Auth-olt DEMO böngészőben a teljes tartalomfa, projektadat-szerkesztő
mentés nélküli megnyitása, kivitelezési disclosure, rajznézet/rétegek, mentett
tetőmodell és ereszcsatorna-kalkulátor megnyitása ellenőrizve; projekt és
szervezeti query megmaradt. 1440/768/390/320 CSS px-en a document/body szélesség
megegyezett a viewporttal. 125%-os szöveg- és felületméretnél a 390 px-es
document/body szélesség továbbra is 390 px; adatírás nem történt. A korábbi
F9.15.2 browser capture szolgált a megelőző állapot vizuális alapjául; ebben a
QA körben a desktop és mobil utóállapot is megtekintve. Külön fájlba mentett
képernyőkép-pár nincs.

Fókuszált Vitest: 4 fájl / 9 teszt PASS; `npm run typecheck`, `npm run lint`,
izolált másolaton `npm run build` (Next.js 16.4.0 webpack) és `git diff --check`
sikeres. Teljes Vitest suite, fizikai mobilböngésző, Safari és screen reader nem
futott. Csak felületi megjelenítés változott; nincs domain/kalkulációs logika,
Auth, jogosultság, adatbázis, revízió vagy tartós üzleti adat módosítás.

Javasolt commit: `feat(F9.15.3): unify liquid glass project workspace`.

## F9.15.1 — Project UX & Mobile Navigation Refinement

Állapot: **COMPLETE (HELYI ELFOGADÁS)**. A projektmunkaterület fejléce, a nyolc meglévő
projektfolyamat-hivatkozás és a projektadatok/kivitelezési tartalom sorrendje
megmaradt; a műveleti menü és az állapotok a meglévő projektadatokat használják.
A mobil dashboardon 700 px alatt eltűnik a köszöntő szekció, a két meglévő fül
kompakt marad, a hat funkciókártya sorrendje nem változott. A projektlistán
keskeny nézetben külön kereső és „Szűrők” gomb nyit natív mobil szűrőpanelt.
A panel a státusz, munkatípus, rendezés és archivált elemek piszkozatát kezeli;
bezárás elveti, visszaállítás csak a piszkozatot törli, alkalmazás GET
paraméterekkel szerveroldali szűrést végez. A kereső külön GET útvonala megőrzi
az alkalmazott szűrőket és a szervezeti kontextust. A page az üres státusz- és
munkatípus-paramétert is üres szűrőként kezeli, mert a natív select ezeket
üres stringként küldi.

Helyi, Auth-olt DEMO böngészőben a mobil szűrőpanel megnyitása, státusz/rendezés/
archivált piszkozat bezárás utáni elvetése, alkalmazása, újranyitás/frissítés
utáni visszatöltése, valamint reset és reset alkalmazása igazolt. A keresés
megmaradt, az URL rendezést és archivált állapotot tükrözte. Bezárás után a
fókusz visszakerült a Szűrők gombra. A mobil dashboard mindkét füle és mind a
hat indítókártyája működött; a köszöntő mobilon rejtett, desktopon változatlan.
A sötét/világos téma és a 80/150%-os szöveg/felület méretezés vizuálisan
ellenőrzött; a korábbi 100/115% méret visszaállítva. A projektrészletező
320/1440 CSS px-en, a lista/dashboard 320–1440 CSS px között ellenőrzött; a
390/768/1024/1440 mérések document/body szélessége a viewporttal egyezett,
320 px-en a részletezőé is. Helyi böngészős képernyőképek készültek a mobil
szűrőpanelről, a világos mobil dashboardról, a sötét desktop dashboardról és a
projekt munkaterületéről. Az Ereszcsatorna útvonal meglévő DEMO geometria-
elavultsági jelzését is ellenőriztem; üzleti rekordot nem mentettem.

Fókuszált Vitest: 4 fájl / 14 teszt PASS (dashboard, mobil szűrőállapot,
workflow áttekintő és projekt-életciklus). A végső `npm run typecheck`,
`npm run lint`, Next.js 16.4.0 webpack `npm run build` izolált másolaton és
`git diff --check` mind PASS. Teljes Vitest suite, fizikai mobilböngésző és
screen reader nem futott. Nincs domain, Auth,
adatbázis, kalkulációs motor vagy üzleti adat módosítás. Javasolt commit:
`feat(F9.15.1): refine project and mobile UX`.

### Kiegészítő elfogadási korrekció — projekt részletező címsorai

A részletező négy cím-párjából egy-egy címet tartottam meg: „Munka áttekintése”,
„Alapadatok”, „Tetőmodellek” és „Tetőrajzok”. A modellek üres állapotának
magyarázata kikerült, mert a címsor és az „Új tetőmodell” művelet már egyértelmű;
a rajzok revízióadatai és a mentett geometria olvashatók maradtak. A workflow
állapot-, szakmai jóváhagyási, ajánlati és naplózási figyelmeztetése megmaradt.
A nyolc workflow csempe, státusz és útvonal nem változott. A tényleges helyi
böngészős megjelenést desktopon és 390 px-es mobilnézeten ellenőriztem; külön
fizikai eszközteszt nem történt. Fókuszált Vitest: 3 fájl / 7 teszt PASS;
`npm run typecheck`, `npm run lint` és `git diff --check` PASS; production build
ehhez a korrekcióhoz nem futott.

Javasolt commit: `fix(F9.15.1): remove redundant project detail headings`.

## F9.15.0 — Settings UX, Mobile Header & Brand Identity

Állapot: **COMPLETE** a helyi alkalmazás elfogadási feltételeire. A dashboard
megjelenésbeállítása kompakt, rögzített fejléc alatti popover; a fiókkezelés
meglévő Auth dialógusát nyitja. A mobil fejléc 320 px-en is egy sorban tartja
az ikont, témaváltót, Beállításokat és fiókmenüt. 320 px-en 200%-os szövegnél
is megmaradt az egysoros fejléc; a hosszú értékek oszlopa és a fiókgomb
keskeny nézetre tördel, a lebegő méretező a látható viewport jobb széléhez
igazodik. A UI-méretező határa 80–150%, alapértéke 115%; 80%, 150% és 200%
szövegméret böngészőben ellenőrizve. Visszatöltés után a 100/115/100/100
értékek megmaradtak.

A mellékelt ikonból átlátszó 512 px közös márkaeszköz, 32 px app ikon és 180 px
Apple ikon készült; a fejléc és a login ugyanazt használja. A tab ikont Brave-ben
vizuálisan ellenőriztem. A fiók Auth-kérése, megerősítési és jogosultsági
szerződése, preferenciák localStorage-szerződése, domain és tetőgeometria nem
változott. Dashboard, felmérés és projektek navigációja helyi Auth sessionnel
ellenőrizve; meglévő rekordot nem módosítottam.

Responsive böngészőmátrix: 1440/1024/768/390/320 CSS px; document scroll-width
egyezik a viewporttal. 320 px-en a 80/150% UI-végpontnál a document szélesség
320, a fejléc magassága 57,2 px, a lebegő gomb jobb széle 308 px. 200% szövegnél
ugyanezt a fejlécet és popovert vizuálisan ellenőriztem. Fizikai iOS/Safari,
screen reader és reduced-motion futtatás nem történt.

Fókuszált Vitest: 4 fájl / 14 teszt PASS; `npm run typecheck`, `npm run lint`,
izolált másolaton Next.js 16.4.0 webpack `npm run build` és dokumentáció után
`git diff --check` PASS. Teljes regresszió nem futott. DB/Auth táblákhoz,
képletekhez, tartós üzleti adathoz nem nyúltam. Javasolt commit:
`feat(F9.15.0): refine settings and mobile header`.

## F9.7.6.6.3.2d — quotation pénzügyi konzisztencia és PDF hardening

Állapot: **PARTIAL**. A konkrét DEMO V1 eltérés oka az opcionális line mezők
`null` reprezentációja volt JSONB snapshotban. A line validator/schema most
normalizálja az opcionális `notes`, `variantId`, `priceId`, `takeoffItemId`
null értékeket; pénzügyi mezőn nincs coercion. A mentett 2 × 12 500 HUF nettó
sor, 25 000 subtotal, totals snapshot és financial contract egyezett. A
readiness ettől megszűnt pénzügyi hibát jelezni, miközben tax/issuer/number/
finalize readiness blokkoló és `canIssue=false` megmaradt.

A GET PDF route üres explicit revision eredményre 404-et ad az eddigi 500 helyett.
Valódi, bejelentkezett lokális HTTP/browser sessionnel az owner PDF-et kapott a
V1 és V2 exact revision ID-ra; V1-ben az eredeti, V2-ben a módosított
DEMO leírás szerepelt. A historical editor revisionváltáskor a V2 lokális
állapotát tartotta meg; a page a selected revision ID-hoz kötött editor key-t
kapott, és a böngészős ismétlés már a kiválasztott V1/V2 mezőket mutatta. Hamis
revision 404 „A kért revízió nem található.”, hibás
quotation ID 404 „Az ajánlat nem található.” választ adott. A lokális snapshot
ellenőrzés a V1/V2 sort és összegét, a `draft` státuszt és V2 current revisiont
igazolta a GET-ek után; numbering nem történt.

Futott: 5 célzott Vitest fájl, 27/27 PASS; ez tartalmazza a project quotation
renderer regressziót és a route mock boundary teszteket. Typecheck, lint és
Next.js 16.4 webpack production build PASS. A valódi HTTP aktív member,
revoked membership és másik szervezet session esete, a valós HTTP cache/header
vizsgálat, projekt-PDF HTTP és mobil QA nem futott; ezért PARTIAL. Hosted DB,
reset, commit és deploy nem történt. Javasolt commit:
`fix(F9.7.6.6.3.2d): align saved quotation financial readiness`.

## F9.7.6.6.3.2d.1 — standalone PDF HTTP security acceptance

Állapot: **COMPLETE (PDF SECURITY)**. A lokális Next route-ot tényleges
Supabase Auth session cookie-val kértem le. Owner: V1 és V2 explicit revízió
HTTP 200 `application/pdf`; a PDF szövegkinyerése a V1/V2 snapshot jelölőket
elkülönítette. Aktív azonos szervezeti tag, visszavont tagságú érvényes Auth
session és másik szervezet felhasználója HTTP 404-et kapott; anonim kérés 401.
Hibás/nem létező ajánlatazonosító és hibás/hamis UUID revízió 404, PDF bájtok és
belső hibaadat nélkül. Paraméter nélküli revision a jelenlegi V2-t adta 200-zal.

A sikeres válasz tényleges fejlécei: `Cache-Control: private, no-store,
max-age=0`, `Content-Type: application/pdf`,
`Content-Disposition: inline; filename="ajanlat-piszkozat-<UUID>.pdf"`,
`X-Content-Type-Options: nosniff`. Elutasítások: `text/plain;charset=UTF-8`,
azonos cache/nosniff védelem és általános üzenet. Minden elutasított válasz
PDF-tartalom nélküli volt. A V2 draft, version/current revision és két mentett
revízió változatlan; numbering sequence nem keletkezett. A korábbi readiness
ellenőrzés szerint `canIssue=false`; issuance továbbra sincs.

VERIFIED: valós HTTP Auth mátrix, header/body ellenőrzés, V1/V2 tartalom és
read-only adatállapot. FAILED: elfogadási eset nem maradt; az első üres tételsorú
fixture HTTP 422-t kapott a helyes nettó pénzügyi sor-kontrakt miatt, ezért az
ellenőrzést konzisztens DEMO sorral végeztem el. Nem változott az alkalmazáskód, ezért új Vitest,
typecheck, lint vagy build nem futott; a d. mérföldkő korábbi 27/27 célzott
Vitestje, typecheckje, lintje és buildje változatlanul az akkori kódállapotra
vonatkozik. `git diff --check` a dokumentálás után fut. Nem futott: hosted,
pgTAP, projekt-PDF HTTP és mobil QA. A helyi fixture-k DEMO jelöléssel a
lokális Supabase-ban maradtak; éles adat vagy reset nem érintett.
`supabase status` leállította az opcionális helyi imgproxy, edge runtime,
analytics, vector és pooler konténereket; a helyi API/DB a HTTP tesztek alatt
elérhető maradt.

Javasolt commit: `test(F9.7.6.6.3.2d.1): verify standalone PDF HTTP security`.

## F9.7.6.5.2 — standalone számítás projektpéldánya (frontend)

Állapot: **PARTIAL**. A támogatott három standalone editorban és a „Mentett számításaim” listában elérhető a projektben használat; csak a betöltött aktuális mentett revízió választható. A bounded, szerveroldali picker aktív műhelytagságot követel, legfeljebb 50 nem archivált/nem DEMO projektet keres név szerint, és csak projektnevet/helyszínt/típust/állapotot/verziót mutat. A megerősítés a pontos source V-számot és célprojektet jeleníti meg. Mentetlen editorváltozásnál explicit választás kell a legutóbbi mentett változathoz; a local edit nem kerül át.

Újrahasznosított architektúra: meglévő `associateStandaloneCalculationAction`, `generateSecureUuid`, session/RLS-s Supabase action és a három projektkalkulátor route. Ugyanaz a műveletazonosító (és profilnál projekt calculation ID) marad hálózati retry során; új picker intent új secure UUID-t generál. A stale forrás/projekt választ frissítésre és ismételt megerősítésre kényszerít. Siker a backend visszaadott kalkuláció- és revízióazonosítójával navigál; az eredeti standalone adat nem változik. Existing takeoff workflow elérhető, de átadás nem automatikus. Association ledger olvasó UI nincs, ezért nem jelenítünk meg kitalált előzményt.

Ellenőrzés: `npx vitest run src/features/calculations/standalone-project-association.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts` — 4 fájl / 22 PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Böngésző inventoryban nem volt tab/auth session; egy workflow és fizikai iPad/iPhone ellenőrzés nem futott. DB contract nem változott, pgTAP/Auth tesztet nem futtattam; ezért PARTIAL. Javasolt commit: `feat(F9.7.6.5.2): integrate standalone project copies`.

## F9.7.6.5.1 — standalone számítás projektkapcsolása (backend)

Állapot: **COMPLETE (BACKEND)**. A tényleges adatszerkezet és kalkulátorcontract alapján a B modellt választottam: az immutable standalone source aktuális revíziójából meglévő project RPC új projekt-revíziót készít, és az append-only association ledger rögzíti az exact source revisiont, creator/org/type adatot és a teljes input/output/validation/provenance snapshotot. A source revízió változatlan marad. Történeti/stale source elutasított; standalone roof geometry nem lép a projekt dependency DAG-ba.

Újrahasznosított architektúra: `getAuthContext`, RLS-s session Supabase kliens, meglévő `executeCalculator` domain engine és projekt gutter/flashing/profile RPC-k. Az association RPC tagságot, source `auth.uid()` owner/scope/org/típust, azonos org projektet, supported aktuális revisiont és snapshot-egyezést validál. Gutter/flashing a projekt meglévő kalkulációs parentjének következő expected revisionje; profil az authoritative, input-only SQL RPC-n át új projekt calculation ID-t kap. A projekt gutter/flashing RPC saját `verified` státusza a meglévő technikai contract része, nem szakemberi jóváhagyás; source status és parameter provenance külön immutable ledger snapshot.

Idempotencia: org + operation UUID unique constraint és advisory lock. Ugyanaz a payload ugyanazt a célrevisiont adja vissza; módosított payload elutasított. Replay előtt a source tulajdonosa és a projekt léte újraellenőrzött. Nem jön létre geometry dependency, takeoff vagy quotation; approved record nem módosul. Frontend még nincs: az action contract explicit source revisiont, stabil operation ID-t, project expected revisiont és profilnál stabil új project calculation ID-t kér.

Ellenőrzés: `supabase migration list --local` a 20261014010000 alap után három új migrációt jelzett; `SUPABASE_TELEMETRY_DISABLED=1 supabase migration up --local` mindhármat reset nélkül alkalmazta. `supabase test db --local ...009... ...011... ...013... ...016... ...017...`: 5 fájl / 118 assertion PASS; a ledger privileged UPDATE/DELETE is elutasított. Külön `supabase test db --local ...010... ...012... ...015...`: 3 downstream takeoff fájl / 94 assertion PASS, approved immutabilityvel. `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts`: két valós helyi Auth user, 1/1 PASS (valid association, retry reuse, payload mismatch, nonowner reject). `node scripts/verify-standalone-association-concurrency.mjs`: két független authenticated kapcsolat, egy ledger sor, egy projekt-revízió, egyező cél-ID-k, `reused=false/true`. Célzott TS/domain: 4 fájl / 41 PASS; nem opt-in futásban 1 Auth teszt skip, külön opt-in PASS. `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Browser workflow nincs, a milestone backend-only; hosted DB és reset nem érintett.

Javasolt commit: `feat(F9.7.6.5.1): associate standalone calculations with projects`.

## F9.7.6.4 — standalone calculator frontend

Állapot: **PARTIAL**. A három meglévő eresz-, szegély- és profil-editor standalone módban is az eredeti domainmotort használja, a meglévő authenticated standalone save actionnel. Az új számítások neve opcionális; mentéskor semleges editornevet kapnak. A mentett calculation ID a route-ban marad, a szerveroldali read model visszaállítja a kiválasztott kalkulációt, a standalone lista pedig típus szerint szűrhető és legfeljebb 100 rekordot ad vissza. A történeti revízió külön választható; kiválasztás nem ment, későbbi módosítás új revízióként, expected revisionnel menthető.

Újrahasznosított architektúra: `saveStandaloneCalculationAction`, `listStandaloneCalculations`, `getStandaloneCalculation`, és a három meglévő kalkulátoreditor. A szervezet ID-t a route aktív tagság ellenőrzi; a mentő RPC a tényleges létrehozót az auth sessionből veszi. Listing és olvasás a meglévő owner RLS mellett történik. Standalone módban nincs projekt tetőgeometria; a preview nem menthető, projektkapcsolás nincs.

Ellenőrzés: fókuszált Vitest 5 fájl / 23 PASS; `npm run lint`, `npm run build`, build után külön `npm run typecheck`, `git diff --check` és `git diff --cached --check` PASS. Az opt-in `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 ...vitest run src/features/calculations/standalone-actions.local.integration.test.ts` Docker socket permission denied miatt nem futott (`supabase status --output env` nem éri el a Docker API-t). pgTAP/backend tesztet nem futtattam, backend szerződés nem változott. Hitelesített böngészős teszt UNVERIFIED: a CUA inventoryban nem volt tab vagy elérhető browser auth session. iPhone/iPad fizikai QA sincs.

Korlát: ugyanazon user folyamatában a route-frissítés és editorkomponens állapotát helyi Auth böngészőben még nem bizonyítottam, ezért mérföldkő nem tekinthető COMPLETE-nek. Következő: F9.7.6.5 csak append-only projektkapcsolásra készíthet tervet/implementációt; ez a milestone nem tette lehetővé a társítást. Javasolt commit: `feat(F9.7.6.4): integrate standalone calculator frontend`.

## F9.7.6.3 — standalone calculation persistence

Állapot: **COMPLETE (BACKEND)**. A lokális `20261014010000` migráció a meglévő `calculations` / `calculation_revisions` láncot bővíti explicit `ownership_scope` és `created_by` mezővel; a standalone rekord projekt- és tetőmodell nélkül, a hitelesített létrehozójához és szervezetéhez kötött. A kliens közvetlen standalone parent/revision INSERT/UPDATE/DELETE műveletei tiltottak. A három külön save RPC az eresz, szegély és lemezprofil tényleges registry ID-jét használja; a Server Action meglévő TypeScript kalkulátormotorokkal újraszámol, őrzi az elfogadott normalizált inputot/provenance-t és incomplete BA/K, illetve ismeretlen szegélykapcsolat esetén nem talál ki eredményt. A lista és aktuális/történeti revízió lekérése owner RLS alatt fut. Projektforrású bemenet standalone mentését a route és SQL is tiltja; takeoff nem jön létre.

Újrahasznosított architektúra: meglévő calculation revisions/immutability FK, expected-revision contract, advisory lock mintája, `getAuthContext`, session Supabase kliens és production `executeCalculator` engine. Standalone visibility: csak aktív org tag + `created_by = auth.uid()`; project rekordok korábbi szervezeti láthatósága és RPC-k megmaradtak. A DB-scope és project-regresszió pgTAP bizonyíték, source snapshot a revízión marad; nincs tartós új dependency/takeoff adat.

Ellenőrzés: `supabase migration list --local` legutóbbi előzménye `20261013081700`, új migráció `20261014010000`; incremental `supabase migration up --local`, reset nélkül. `supabase test db --local ...009... ...011... ...013... ...016...` — 4 fájl / 88 assertion PASS. `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 ...vitest run src/features/calculations/standalone-actions.local.integration.test.ts` — két valódi helyi Auth user, 1/1 teszt PASS, beleértve current/historical read és same-org creator isolation. `node scripts/verify-standalone-calculation-concurrency.mjs` — két független authenticated DB session, egy V2, egy stale `40001`, V1 változatlan. Célzott domain/standalone Vitest: 4 fájl / 41 teszt PASS. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Teljes történeti pgTAP suite és böngésző-ellenőrzés nem futott; hosted DB nem érintett. Frontend mentés/lista UX a F9.7.6.4 határa. Javasolt commit: `feat(F9.7.6.3): persist standalone calculations`.

## F9.7.6.2 — standalone ownership és globális tetőgeometria

Állapot: **PARTIAL**. Eldöntött ownership: a project-free számítás műhelytulajdonú, de csak a létrehozója számára látható, aktív szervezeti tagság mellett; ügyfél nincs a standalone szerződésben. Elkészült a `calculations.project_id`-t, kalkulátor RPC-ket, dependency-ket, takeoffokat és quotation forrásokat érintő sématerv és audit a `docs/STANDALONE_WORKFLOWS.md` fájlban. A meglévő `roof.gable` motorból új projekt nélküli, nem mentő nyeregtető-geometriai előnézet nyílik a globális kalkulátor oldalon; ugyanazt a műszaki rajz komponenst használja. Funkcionális tetőfedési/szarufa/léc/fólia kalkulátor nem készült; forrásolt jövőbeli roadmap dokumentált. Nincs migráció, standalone save/reopen, saved list, vagy projekt-hozzárendelés, mert ez a tervben külön `.3`/`.4`/`.5` implementáció; a Supabase CLI sem futott le: a `supabase status` CLI-saját `~/.supabase/telemetry.json` írása sandbox EPERM-mel blokkolt.

Újrahasznosítva a `roof.gable` domainmotor, `TechnicalDrawing`, szervezetválasztó és meglévő kalkulátor-navigation design. Szervezet ID-t a globális route csak membership-ellenőrzésű `getProjectOrganization` után használ. A standalone geometriai preview nem ír üzleti adatot; a projektmód és material takeoff SQL/UI nem változott. A migrated ownership/RLS és RPC-konkurencia ellenőrzése nem történt meg, ezért adatbázis-biztonságra nincs runtime PASS.

Bizonyíték: `npx vitest run src/features/roof-models/standalone-gable-preview.test.ts src/domain/calculations/gable-roof.test.ts src/features/dashboard/dashboard.test.ts` — 3 fájl / 10 PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; `/kalkulatorok/nyeregteto` route megjelent) és `git diff --check` PASS. Egy korábbi tesztfuttatásban hibás szöveges assertion volt; a címke/assertion pontosítása után a célzott suite PASS. `SUPABASE_TELEMETRY_DISABLED=1 supabase test db` — 15 fájl / 434 pgTAP PASS a helyi adatbázison; reset és migráció nem történt. A suite a meglévő projektmód RPC/RLS útvonalakat fedi; a standalone owner/RLS még nincs implementálva és nem volt tesztelhető. Authenticated böngészős workflow nem futott: a CUA leltárban nincs browser tab, a route sessiont és szervezetet igényel; bejelentkezési adat nem volt rendelkezésre bocsátva. Korlát: az önálló persistent workflow és revíziótörténete hiányzik, a projektkapcsolás és standalone tetőmentés nincs kitéve. Javasolt commit: `feat(F9.7.6.2): add global roof geometry preview`.

## F9.7.6.1 — globális navigáció és standalone alapozás

Állapot: **PARTIAL — helyi navigáció és stateless önálló számítás elkészült; böngészős smoke/jogosultsági futás környezetkorlát miatt nincs igazolva.** A dashboard most közvetlenül megnyitja a Projektek, Kalkulátorok, Árajánlatok, Anyagok és Kivitelezés területeket; a nem létező Munkacsomagok és Dokumentumok globális kártya kikerült. A Kalkulátorok oldalról mindhárom kalkulátor projekt nélkül is megnyitható és a meglévő domainmotorral futtatható. Ebben a módban az eredmény csak az oldalon él, frissítéskor elveszik; mentési és anyagkimutatás-átadási vezérlő nincs. A projektmód megtartja a revíziókat, tetőforrásokat és átadást. Az Árajánlatok globális oldal a meglévő projektútvonalakhoz visz, és kimondja a projektfüggést. A Kivitelezés szervezeti oldala csak a tag által látható projektterv címét és dátumát listázza, majd a meglévő, kibontott projekt-kivitelezéshez navigál. A projektoldali „Megnyitás” akciók elérhető modult jeleznek; az execution query-paraméter megőrzi a meglévő alapértelmezett összecsukott állapotot.

Meglévő dashboard/design, `getProjectOrganization`, `getProjectsForOrganization`, projekt-szintű kalkulátor, quotation és execution query/action, Supabase session kliens és RLS újrahasznosítva. Az új execution lista `organization_id` szerint szűr, csak terv-metaadatot olvas, fotót vagy signed URL-t nem. Minden globális link az aktuális szervezetet viszi tovább; route-ok tagság nélkül nem választanak szervezetet automatikusan.

A `docs/STANDALONE_WORKFLOWS.md` rögzíti a kötelező `calculations.project_id`, a kalkulátor RPC/index/dependency-lánc, immutable provenance, valamint a quotation `project_id`, draft RPC, véglegesítés és PDF route konkrét függőségeit; felvázolja a local additív migrációt és a bounded lépéseket. Nincs adatbázis-, RLS-, képlet-, árképzési vagy távoli Supabase-változás. A dokumentum globális listázását a privát, projekt tulajdonlású PDF/fotó-flow jelenleg nem támasztja alá; ezért nem készült dokumentumkártya.

Bizonyíték: `npx vitest run src/features/dashboard/dashboard.test.ts src/features/projects/project-navigation.test.ts src/features/execution/execution-overview.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts` — 6 fájl / 28 teszt PASS; `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; a `/kalkulatorok`, mindhárom önálló kalkulátor-route, `/ajanlatok` és `/kivitelezes` szerepel a production route-listában), `npm run typecheck` és `git diff --check` PASS. A böngészős smoke nem futott: a CUA leltárban nem volt nyitott hitelesített tab, a korábbi F9.7.4 helyi dev bind `EPERM` hibája miatt nem indítottam újra. Viewport, Auth/RLS adatbázis-viselkedés és teljes regresszió nem futott. Ezért globális tenant-paraméterezés kód/teszt szinten bizonyított, a jogosulatlan DB-hozzáférés böngésző/pgTAP szinten nem ellenőrzött. Javasolt commit: `feat(F9.7.6.1): add global workflow navigation`.

## F8.1 — ajánlati piszkozatok (kész)

- Elkészült a projekt alatti `/projektek/[projectId]/ajanlatok` magyar,
  mobilbarát szerkesztő: anyag, munkadíj és egyéb sor, ügyfél, kézi vagy
  katalógusár, approved takeoff-forrás, mentés és újranyitás.
- A `quotations` / `quotation_revisions` migration és az atomikus,
  optimistic-concurrency `save_quotation_draft` RPC megőrzi az immutable
  bemeneti, anyag- és ársnapshotokat; nettó/bruttó keverés tiltott.
- A fixpontos HUF domain-referenciaesetek 4/4 PASS. Az F8.1.1 lokális
  migration-replay, 180/180 pgTAP és browser-flow sikeres; a browser során
  talált idempotencia-snapshot hibát javítottam, így a valódi tételmódosítás új
  revíziót készít, azonos mentés továbbra is idempotens.
- A browser-flow-ban a jóváhagyott `171,875 square_meter` takeoff-tétel
  kontrolláltan kiválasztható volt; történeti takeoff-adatot nem módosítottam.

### F8.1 korlátok

Nincs PDF vagy jogilag végleges dokumentum, VAT-motor, küldés, elfogadás,
számlázás vagy automatikus árképzés.

## F8.2 — professzionális PDF-ajánlat (kész)

- Az immutable ajánlati revíziókból szerveroldali, Node runtime-os
  `@react-pdf/renderer` pipeline készít A4-es, többoldalas PDF-et; a magyar
  karaktereket beágyazott Noto Sans font biztosítja.
- Az F8.1 mentés dokumentum-meta snapshotot is őriz (projekt és ügyfél
  adatai), valamint kategória-összesítőket. A PDF nem számol újra pénzügyi
  értéket, a revízió saját sortételeit és mentett összegét használja.
- A projekt ajánlati oldalán minden revízióhoz elérhető a PDF előnézet,
  letöltés és natív böngészős nyomtatás. A történeti revízió külön ID alapján
  nyitható meg, a route hitelesítést, szervezeti tagságot és projekt/ajánlat/
  revízió tulajdonlást ellenőriz.
- A dokumentum nettó/bruttó besorolást, hiányos piszkozat-figyelmeztetést,
  kategória szerinti részösszegeket, biztonságos fájlnevet és oldalszámot
  jelenít meg; ÁFA-kulcsot vagy számlázási állítást nem talál ki.
- Ellenőrzés: 20 Vitest fájl / 77 teszt PASS, typecheck PASS, lint PASS,
  production build PASS; a helyi browser-flow-ban a PDF előnézet 200-as
  választ, magyar ékezeteket, többoldalas-kompatibilis A4 elrendezést és a
  mentett 27 498,50 HUF összeget mutatta.

### F8.2 ismert korlátok

Az F8.1-ben létrejött régi revíziók nem tartalmaznak dokumentum-meta snapshotot;
ezeknél a PDF ezt az adatot hiányzóként kezeli, nem örököl utólagos mutable
ügyfél/projekt adatot. Automatikus küldés, számla és jogi adózási minősítés nem
készült.

## F8.3.1 — ajánlatkezelés és véglegesítés (kész)

- Elkészült az ajánlati projektoldal szervezett listája, referencia/ügyfél
  keresése, állapotszűrése, revízió- és összegmegjelenítése.
- A draft és finalized állapotot új, lokálisan alkalmazott migráció kezeli;
  a véglegesítés szerveroldali tagság-, projekt-, revízió-, ügyfél-, tétel- és
  pénzügyi ellenőrzéseket végez.
- A finalize_quotation SECURITY INVOKER RPC sorzárolással és expected versionnel
  védi a stale/concurrent finalize eseteket; a lezárt ajánlatot trigger és RPC
  is immutable-ként kezeli.
- A lezárt ajánlat rögzíti a pontos revíziót, időpontot és felhasználót. PDF-je
  mindig ehhez a revízióhoz kötődik; duplikálás új, szerkeszthető piszkozatot
  hoz létre, az eredeti változatlan marad.
- Ellenőrzés: célzott pgTAP 8/8 PASS, Vitest 20 fájl/77 teszt PASS,
  typecheck/lint/build PASS; browser-flow: lista → review → finalize → locked
  állapot → PDF előnézet → új piszkozat duplikálása.

### F8.3.1 korlátok

Nem készült küldés, elfogadás, számlázás, további üzleti státusz, ÁFA-motor vagy
F8.3.2 funkció. A helyi smoke-flow a meglévő DEMO-jelölt fejlesztési adatokkal
futott; távoli Supabase-változás nem történt.

## F8.3.2 — ajánlati életciklus és státusztörténet (kész)

- Az ajánlatok életciklusa: piszkozat, véglegesített, elküldött, elfogadott,
  elutasított. Az engedélyezett átmenetek: draft → finalized → sent →
  accepted/rejected; az elfogadott és elutasított állapot terminális.
- Elkészült az append-only quotation_status_events tábla, szervezeti RLS,
  immutable jogosultsági modell és tranzakciós státuszesemény-trigger.
- A transition_quotation_status SECURITY INVOKER RPC tagságot, projekt- és
  ajánlattulajdonlást, aktuális állapotot, expected versiont és finalized
  revízió-konzisztenciát ellenőriz; a párhuzamos döntések közül csak az első
  sikeres.
- A felület magyar státuszszűrőt, állapotfüggő műveleteket, manuális
  elküldöttnek jelölést, ügyféldöntés-megerősítést, opcionális megjegyzést és
  valós státusztimeline-t mutat. Automatikus e-mail, kézbesítési bizonyíték,
  elektronikus aláírás, számla vagy szerződés nem készül.
- A PDF- és pénzügyi snapshot változatlan marad; a finalized/sent/accepted/
  rejected státuszok ugyanahhoz a rögzített revízióhoz kötődnek.
- Ellenőrzés: Vitest 21 fájl/79 teszt PASS, typecheck/lint/build PASS,
  célzott pgTAP 19/19 PASS, browser smoke finalized → sent → accepted →
  timeline → PDF → terminális műveletek PASS.

## Katalógushoz kötött, verziózott lemezkiosztás

- Az aktuális szervezet aktív lemez-/tetőfedés terméke és variánsa választható; a server action, RLS és összetett FK tiltja a keresztszervezeti hivatkozást.
- Csak explicit katalógusmezők és dokumentált műszaki kulcsok képezhetők le. A hasznos szélesség soha nem következtethető a névlegesből; hiányzó adat kézzel, `user_provided` provenance-szel adható meg.
- A `covering.metal-sheets.layout` a meglévő `calculations` / immutable `calculation_revisions` láncot használja. Minden verzió konkrét tetőrevízióhoz, `roof.gable` revízióhoz és anyagvariánshoz kötött.
- A szerver újrafuttatja a kalkulátort; a SECURITY INVOKER mentés atomikus, expected revisionnel védett és azonos snapshotnál idempotens.
- A történeti input/output, anyagspecifikáció és forrásgeometria visszanyitható. A felület külön jelzi a geometriai és releváns katalógus-stale állapotot; árverzió önmagában nem invalidál geometriát.
- Anyagkimutatásba csak aktuális, mentett layout adható át. Automatikus javaslat kizárólag `square_meter` egységnél, ellenőrzött tetőfelületből és explicit ráhagyással készül; más egység kézi workflow-t igényel. A cél mindig draft, soha nem approved.
- Az F7.3.1 SVG és a fizikai iPhone-on igazolt pan/pinch/pointer kód változatlan; történeti layout a saját történeti nyeregtető-outputjával rajzolódik.
- Ellenőrzés: 19 Vitest fájl / 73 teszt PASS, 172/172 pgTAP PASS, typecheck és lint PASS. A teljes migrációlánc eldobható Supabase shadow DB-n lefutott, a sémadiff üres.
- Böngészős flow: DEMO variáns, kézi 1000 mm → V1/26 sáv, 1250 mm → V2/20 sáv, V1 visszanyitás, tető V4 után stale jelzés, friss layout V3, majd 164,0625 m² draft; automatikus jóváhagyás nem történt.

## F7.3.2 korlátok

- Nincs gyártóspecifikus szerelési szabály, automatikus darabolás/toldás, csavarszámítás, beszerzés, ÁFA vagy ajánlat.
- Darab-, folyóméter- és csomagegységhez nincs kitalált automatikus átváltás; ezek a meglévő kézi anyagkimutatási folyamatot használják.

---

# F7.3.1 állapot

## Tetőlemez-kiosztás és ideiglenes SVG-előnézet

- Elkészült a tiszta, determinisztikus `covering.metal-sheets.layout` kalkulátor, és bekerült a production Calculator Registrybe.
- A számítás az F5 kimenetéből kapott hosszanti tetőkezdő-/végpontot és ferde hosszt használja. Nem duplikál nyeregtető-geometriát.
- Támogatott a felhasználó által megadott hasznos fedési szélesség, külön opcionális névleges szélesség, bal/jobb indulás, minimum/maximum hossz és végoldali ráhagyás.
- A kimenet tetősíkonkénti és összes sávszámot, teljes és részleges fedési intervallumot, determinisztikus X-koordinátákat, geometriai és ideiglenes lemezhosszt, valamint gyártási korlátjelzést ad. Fizikai vágási szélességet, átfedést, árat vagy gyártói jóváhagyást nem következtet.
- Referenciaeredmények: 12 500 mm tetőhossznál 1000 mm → 13/26 sáv és 500 mm szélső sáv; 1250 mm → 10/20 sáv, részleges sáv nélkül; 800 mm → 16/32 sáv és 500 mm szélső sáv.
- A legfeljebb 400 sáv/tetősík renderbiztonsági határ strukturált `UNSUPPORTED_OPERATION` hibát ad; a mennyiséget nem csonkolja.
- A meglévő SVG-rendszer új, alapból kikapcsolt `Lemezkiosztás` réteget kapott. Felülnézetben mindkét tetősík valós kalkulált sávkoordinátáit, váltakozó sávokat, részleges szélső sávot és olvasható esetben indexeket mutat.
- A meglévő F7.2.4 zoom/pan/pointer logika változatlan. A mobil súgó szövege: „Egy ujjal a rajz vonala mentén húzva mozgathatod, két ujjal nagyíthatod.”
- A kalkulátorban mobilbarát, élő paraméterpanel és eredményösszesítő készült. A kiosztás egyértelműen ideiglenes, nem mentett előnézet; revíziót, anyagkimutatást és adatbázist nem módosít.
- Ellenőrzés: 18 Vitest fájl / 69 teszt PASS; typecheck, lint és webpack production build PASS. Egy fókuszált helyi browser-flow-ban 1000 mm szélesség → 26 SVG-sáv, 2 részleges sáv, irányváltás és 320 px overflow-mentesség igazolt.

## F7.3.1 ismert határok és F7.3.2

- Csak szimmetrikus, két téglalap síkú nyeregtető, egy darabból eresztől gerincig futó sávok, keresztirányú toldás nélkül.
- Gyárthatóság kizárólag a felhasználó által megadott hosszkorlátokhoz viszonyított előzetes jelzés; nincs gyártói szerelési terv.
- F7.3.2-ben elkészült a verziózott kiosztás-perzisztencia és az explicit katalógusvariáns-kapcsolat. Jóváhagyott anyagkimutatás automatikus módosítása továbbra sem megengedett.

---

# F7.2 állapot

## Jelenlegi fázis

F7.2 — Forrásrevízióhoz kötött anyagkimutatás és jóváhagyott anyagválasztás.

## F7.2 elkészült

- Elkészült a tiszta `material-takeoffs` domain: terület-, vonalhossz- és kézi mennyiség, explicit egységkompatibilitás, ráhagyás és kézi korrekció-indok.
- Elkészült a `material_takeoffs` és `material_takeoff_items` lokális Supabase séma, szervezeti összetett FK-kal, draft/approved állapottal és snapshot mezőkkel.
- A kimutatás kizárólag ellenőrzött, mentett `roof.gable` kalkulációs revízióból hozható létre; az implementáció- és input-séma-verzió szerveroldalon validált.
- Az anyagtétel a kiválasztott variáns és opcionális konkrét F7.1 árrekord snapshotját őrzi; hiányzó ár nem lesz nullából vagy legfrissebb mutable rekordból pótolva.
- Elkészült a szerveroldali újraszámítás, egységkompatibilitás, stale-forrás tiltás, admin/tulajdonosi atomikus jóváhagyás és approved snapshot immutabilitás.
- A projekt részletező oldaláról elérhető a `/projektek/[projectId]/anyagkimutatas` útvonal.

## F7.2 ellenőrzés

- Helyi migrációk: `20261012050000_material_takeoffs.sql`, trigger-hardening és approval-policy migráció sikeresen alkalmazva; távoli Supabase nem érintett.
- Helyi pgTAP: 146/146 PASS, beleértve táblák, RLS, szervezeti izoláció, forrásrevízió, approval és approved immutabilitás ellenőrzéseit.
- Vitest: 17 fájl / 56 teszt PASS; a referenciaeset 140,625 m² + 10% = 154,6875 m², gerinc 12,5 m, eresz 25 m és piece-kompatibilitás külön tesztelt.
- `npm run db:types`, typecheck, lint és webpack production build PASS.
- F7.2.1 böngészős QA: helyi DEMO login → meglévő projekt → rev. 2 forrás → draft → területi tétel → reload → approval → rev. 3 forrásmódosítás → stale figyelmeztetés → új draft → logout ellenőrizve.
- A lokális projekt tényleges geometriai értéke 156,25 m² volt, ezért a böngészős 10%-os DEMO területi eredmény 171,875 m²; a 140,625 m² → 154,6875 m² referencia külön domain/Vitest tesztben igazolt.
- F7.2.1 javítások: szerver action hibák látható `useActionState` visszajelzést kaptak; kijelentkezett takeoff-route most loginra irányít `returnTo` paraméterrel.
- Read-only DB ellenőrzésben az approved tételek és a konkrét 15 000 HUF ár snapshotja megmaradt.
- F7.2.2 helyi DEMO lineáris variáns készült: `linear_meter`, ár/gyártó/műszaki specifikáció nélkül; távoli Supabase nem érintett.
- F7.2.2 pozitív browser-flow: a gerinc 12,5 m-es értéke mentés és reload után `12,5 linear_meter` formában, a lokális DB-ben `12.500000` értékkel megmaradt.
- F7.2.2 valódi concurrency: két külön PostgreSQL-kapcsolat ugyanazt a draftot hagyta jóvá párhuzamosan; pontosan egy kérés lett approved, a másik verzió/státusz hibával elutasult. A jóváhagyott tétel immutable maradt.
- F7.2.2 responsive QA: a dashboard, projektoldal, nyeregtető-kalkulátor/SVG és anyagkimutatás 320/375/390/430 px viewporton ellenőrizve. Két overflow-regresszió javítva, újratesztelve mindegyik céloldal overflow-mentes.
- A `supabase/config.toml` már `[local_smtp]` szekciót használ; deprecated `[inbucket]` szekció nincs jelen.

## F7.2.3 mobil UX és SVG stabilizálás

- A mobil kontrasztprobléma oka a túl halvány `--muted` token, illetve a feliratok és keresőmezők örökölt szín-/flex-szabályainak ütközése volt. A javítás szemantikus világos/sötét téma-tokenekkel készült; a projektlista, projektkártyák, státuszok, űrlapok és keresőmezők tényleges hátterükön olvashatók.
- A projektkezelési oldalakon új, újrahasznosítható `BackNavigation` vezérlő jelent meg: determinisztikus szülőútvonal, nyíl, felület/border, fókuszállapot és mobil touch target.
- A projektkereső egyetlen, vízszintesen rendezett kontroll lett; az ikon az inputon belül marad, a 320–1440 px ellenőrzéseken nincs dokumentum-overflow.
- A saját SVG viewport megoldás maradt. A `react-zoom-pan-pinch` kompatibilitását és képességeit áttekintettem, de új függőség nélkül, kisebb kockázattal javítható volt a meglévő TypeScript megoldás.
- A viewport most külön kezeli a nagyítást, illesztést és visszaállítást: `Fit` a rajz és annotációk bounds-a alapján számol, `Reset` a dokumentált 100%-os kezdőnézetet állítja vissza. Az egyujjas pan, kétujjas pinch, fókuszpont-megtartás, pointer cancel/release és view-váltási újraillesztés stabilizálva lett.
- A rajzvezérlők magyar akadálymentes neveket, tooltipet, zoom százalékot és csoportosított toolbart kaptak; a hat réteg kapcsolója megmaradt.
- Explicit böngészős viewport-ellenőrzés: 320×700, 375×812, 390×844, 430×932, 768×1024 és 1440×900. A projektlista keresője egy soros, a rajznézetek és rétegek elérhetők, `scrollWidth === clientWidth` minden vizsgált méreten. Fizikai iPhone multi-touch végrehajtása ebben a környezetben továbbra sem történt.
- F7.2.3 tesztállapot: 17 Vitest fájl / 58 teszt PASS; typecheck, lint és webpack production build PASS. Adatbázis- és migrációs kód nem változott.

## F7.2.4 touch pan finomhangolás

- Az egyujjas pan pontatlanságának oka az volt, hogy a pointer-delta közvetlenül viewBox-egységként került a pan állapotba; ez zoomnál nem adott 1:1 képernyőkövetést, és a preserveAspectRatio letterbox-területét sem vette figyelembe.
- A klienspont → viewBox leképezés most a tényleges SVG-renderelt területet és középre igazítást veszi figyelembe. A pan delta zoom-kompenzált, threshold nélkül indul, és az első néhány pixeltől követi a pointert.
- Pointer release/cancel után a megmaradó egyujjas gesztus újraalapozódik; pinch → pan átmenetnél nincs korábbi kezdőpontból eredő ugrás. A rajzon kívüli oldal-scroll, zoom, fit, reset és rétegek kódja változatlan maradt.
- Célzott viewport ellenőrzés: 1 fájl / 7 teszt PASS; typecheck és lint PASS. A felhasználó ezt követően fizikai iPhone-on sikeresen ellenőrizte a touch pan működését.

## F7.2 nyitott korlátok

- Az eldobható concurrency draft jóváhagyás után az immutable trigger miatt nem törölhető megkerülés nélkül; az azonosított DEMO rekord a lokális DB-ben maradt, távoli adatot nem érint.
- `npm audit` továbbra sem verifikálható az npm registry DNS-hibája miatt.

## Következő fázis

F7.3 — csak külön jóváhagyással; ajánlat, készlet, ÁFA és rendeléslogika nem készült.

---

# F7.1 állapot

## Jelenlegi fázis

F7.1 — Szervezetileg izolált anyagkatalógus, termékvariánsok és árhistorika.

## F7.1 elkészült

- Elkészült a `material_manufacturers`, `material_products`, `material_variants` és `material_prices` lokális Supabase sémája.
- Az új migrációk UUID-ket, szervezeti összetett FK-kat, indexeket, timestamp triggereket, RLS-t és explicit authenticated grantokat használnak.
- A katalógus támogatja a tetőfedés, lemez, ereszcsatorna, szegély/bádog, szigetelés, faanyag, kiegészítő és egyéb kategóriákat.
- Elkészült a gyártó létrehozása, listázása és szerkesztése; valódi gyártói adat nem került seedbe.
- Elkészült a termék létrehozása, listázása, keresése, kategória- és archivált-szűrése, szerkesztése, archiválása és visszaállítása.
- Elkészültek a termékvariánsok opcionális méretmezőkkel, purchasing unit-tal, SKU-val, JSON technikai adatokkal és provenance mezőkkel.
- Az árak HUF NUMERIC mezőben, külön immutable árrekordként tárolódnak; az árhistorika nem írható felül vagy törölhető.
- A latest price szabály determinisztikus: `effective_date DESC`, `recorded_at DESC`, `id DESC`.
- Elkészült a `/anyagok`, `/anyagok/uj` és `/anyagok/[productId]` authenticated UI.
- A Dashboard „Anyagok” eleme működő, szervezethez kötött link lett; a Scaling Bubble nem került be az anyagkatalógus oldalakra.
- A szerver actionök külön hitelesítést és szervezeti tagságot ellenőriznek; a böngészőből érkező organization ID önmagában nem jogosít.
- A Supabase típusok lokális sémából újragenerálva.

## F7.1 ellenőrzés

- Helyi pgTAP: 127/127 PASS.
- Vitest: 16 fájl / 53 teszt PASS.
- Typecheck, lint és production build PASS.
- Böngészőben lokális admin belépés, gyártó, termék, variáns, két árverzió, árhistorika, keresés/szűrés, archiválás és visszaállítás ellenőrizve.
- Távoli Supabase, import, scraping, mennyiségszámítás, ÁFA- és ajánlatlogika nem készült.

## F7.1 nyitott korlátok

- Dedikált 320–1440 px viewport-emuláció és fizikai mobil multi-touch továbbra is az F6.1 környezeti korlátja.
- Több-session concurrency terhelésteszt nincs megvalósítva.
- `npm audit` csak npm registry DNS-hiba esetén próbálható; sikeres audit nem állítható.

## Következő fázis

F7.2 — csak külön jóváhagyással; anyagmennyiség-számítás és automatikus vásárlási lista F7.1-ben nem készült.

---

# Korábbi F6.1 állapot

## Jelenlegi fázis

F6.1 — Mobil QA és interaktív rajzstabilizálás.

## F6.1 ellenőrzés

- A rendelkezésre álló Codex in-app browserben a lokális, hitelesített F5 útvonal újraellenőrizve; a négy nézet, zoom/reset, layer controls és live preview működik.
- Az in-app browser nem ad viewport-emulációs capability-t. Playwright/Puppeteer projektfüggőség nincs telepítve; a helyi Playwright Chromium bináris megtalálható, de hozzá tartozó runner nincs elérhető.
- A jelenlegi browser smoke DOM-mérése `clientWidth=1002`, `scrollWidth=1002` értéket adott; véletlen teljes dokumentum-vízszintes túlcsordulás ezen a felületen nincs.
- A viewport-kezelés kétpointeres pinch támogatást kapott: aktív pointerek, fókuszpont-megtartás, zoom clamp, pointer cancel/release és egyujjas pan átmenet.
- A pinch matematika és a zoom-határok külön Vitest teszteket kaptak.
- Kötelező 320/375/390/430/768/1440 px vizuális viewport-ellenőrzés és fizikai eszközös multi-touch továbbra sem bizonyított.

## F6 elkészült

- Elkészült az infrastruktúrafüggetlen `src/domain/drawings/gable-drawing.ts` rajzmodell; nem duplikál F5-képleteket, közvetlenül a `GableRoofOutput` vertexeiből vetít.
- Elkészült a négy magyar nézet: Felülnézet, Oromoldal, Keresztmetszet és Oldalnézet.
- Az X/Y/Z → SVG vetítés és az Y-inverzió központosított; a 8000×12000×3000 mm referencia geometriai rajzkerete numerikusan igazolt.
- Elkészült a méret-, hossz- és szögannotáció modell valós F5-forrásértékekkel, magyar mértékegység-formázással és segédvonalakkal.
- Elkészült a rétegvezérlés: Tetősíkok, Tetőkontúrok, Gerinc és ereszek, Méretvonalak, Hajlásszögek, Segédvonalak.
- Elkészült a natív, React által létrehozott SVG-renderer; nincs unsafe SVG/HTML betöltés, nincs új rajz- vagy adatbázisfüggőség.
- Elkészült a helyi zoom, reset/fit és pointeres pan állapot; a globális rajzskála a meglévő Scaling Providerrel külön marad.
- A rajz a valós F5 kalkulátor `Rajzok` szakaszába került; a mentett revízió és az élő, nem mentett előnézet külön állapotjelzést kap.
- Az SVG cím/description, tablist, layer checkboxok, fókuszállapotok és szöveges eredményszakasz akadálymentesítési alapot adnak.
- Nem került be anyag-, ár-, statikai, rafter-, export-, 3D- vagy távoli Supabase-funkció.

## F6 ellenőrzés

F6 domain és UI ellenőrzés: 14 Vitest fájl / 48 teszt, typecheck, lint és webpack production build sikeres. A helyi F5 útvonalon böngészőben ellenőrizve a nézetváltás, layer toggle, zoom, élő geometria-frissülés és a nem mentett előnézet jelzése.

## F6 ismert korlátok

- A rendelkezésre álló in-app böngészővezérlő nem ad dedikált 320/375/390/430 px viewport-emulációt; a mobil CSS/reflow és accessibility tree ellenőrzött, külön keskeny screenshot nem készült.
- Kétujjas pinch gesztus külön eszközszintű tesztje nem volt elérhető; a canvas natív pointer/touch eseményekkel működik, a gombos és görgős zoom ellenőrzött.
- Anime.js nincs a projekt függőségei között, ezért F6 nem vezetett be bizonytalan animációs függőséget; a rajz statikus és reduced-motion kompatibilis.

## Következő fázis

F7 — csak külön jóváhagyással; F6-on belül anyag-, statikai vagy komplex tetőfunkció nem indul.

---

# Korábbi fázisok állapota

## Jelenlegi fázis

F5 — Production-grade nyeregtető geometriai kalkulátor.

## Elkészült

- Next.js 16.4.0 App Router + React 19.3.0 + TypeScript 5.9.3 + `src/` + `@/*` alias.
- Tailwind CSS 4.3.3 PostCSS-alap és központosított minimális design tokenek.
- shadcn/ui `components.json` konfiguráció és Lucide ikonfüggőség.
- Magyar, mobil-first dashboard: üdvözlés, tabos Funkciók/Aktuális munkák nézet és DEMO projektelőnézetek.
- Szigorú typecheck, ESLint, Vitest smoke teszt, dokumentáció és `.env.example`.
- Git `main` ág és `origin` remote ellenőrizve; commit/push nem történt.
- Szemantikus design tokenek, felület-/elevációs minták, fókusz- és reduced-motion állapotok.
- `system` / `light` / `dark` témaalap, perzisztencia, rendszer-téma figyelése és villanásmentes inicializálás.
- Újrafelhasználható `ThemeProvider` és következő módot jelző `ThemeToggle`.
- Vitest tesztek a téma mód-ciklusra, feloldásra, címkére és validációra.
- Next.js 16.4.0, Vitest 5.0.3 és ESLint TypeScript flat config biztonsági frissítések.
- Újrafelhasználható dashboard header, function launcher, projektelőnézet és üres állapot komponensek.
- Billentyűzetes, szemantikus tab navigáció és reduced-motion kompatibilis, visszafogott CSS-animáció.
- Verziózott, validált és lokálisan perzisztált skálázási motor három független értékkel: szöveg 80–200%, UI 90–150%, rajz 50–250%.
- Inline inicializálás a helytelen méretvillanás csökkentésére; CSS custom property alapú, transform/zoom nélküli skálázás.
- Közös `ScalingProvider`, `ScalingControls` és globális dashboard-beállítás panel.
- Fix, safe-area-t figyelembe vevő Scaling Bubble csak a `/demo/meretezes` oldalon; Escape- és click-outside-zárással.
- DEMO SVG nyeregtető-rajz változatlan viewBox-szal és külön rajzmegjelenítési skálával.
- Demo útvonal: `/demo/meretezes`, minta mezőkkel, SVG-vel és élő skálázással.
- Verziózott `supabase/config.toml`, migráció és lokális, DEMO-only seed.
- Öt kezdeti üzleti tábla: profilok, szervezetek, tagságok, ügyfelek, projektek.
- Összetett projekt–ügyfél idegen kulcs, timestamp/version mezők és szervezeti indexek.
- Deny-by-default RLS/grant alap, saját profil- és tagsági ellenőrzés, privát helper függvények.
- pgTAP biztonsági tesztcsomag a séma és a tenant-izoláció ellenőrzésére.
- DB workflow és architekturális korlátok dokumentálva a `docs/DATABASE.md` fájlban.
- Supabase CLI 2.120.0-val a lokális migrációs replay kétszer sikeresen lefutott.
- A 29 pgTAP adatbázisteszt sikeres; mind az öt tábla és mind az öt RLS-beállítás lokálisan ellenőrizve.
- A Supabase CLI által generált `src/infrastructure/supabase/database.types.ts` elkészült.
- A deprecated `[inbucket]` konfiguráció `[local_smtp]` szekcióra lett frissítve.
- Helyi, típusos `@supabase/supabase-js` és `@supabase/ssr` browser/server adapterek készültek.
- Next.js 16 `src/proxy.ts` session-refresh proxy készült, `getClaims()` ellenőrzéssel és cookie-szinkronizációval.
- Elkészült a magyar, meghívásos `/bejelentkezes` login: validáció, loading/error állapot, akadálymentes jelszómegjelenítés és kijelentkezés.
- A `/` és `/demo/meretezes` útvonalak hitelesítést és szervezeti tagságot ellenőriznek; több szervezet esetén nincs csendes automatikus választás.
- Elkészült a biztonságos, csak helyi bootstrap: `npm run db:local-env` és `npm run db:local-auth`; a jelszó nincs forráskódban vagy tracked fájlban.
- A böngészős helyi integráció sikeres: hibás login-hiba, sikeres login, reload utáni session, védett DEMO-oldal és logout ellenőrizve.
- Elkészült az öt új, szervezetileg izolált F2.3 tábla: `roof_models`, `roof_model_revisions`, `calculations`, `calculation_revisions`, `calculation_dependencies`.
- A tetőmodellek több modellenként kapcsolódhatnak egy projekthez; a kalkuláció opcionális tetőmodell-hivatkozással önálló projektmunkát is támogat.
- A geometriai és kalkulációs revíziók JSONB snapshotokat, séma-/implementációs verziót és explicit provenance/validation állapotot tárolnak.
- A revíziók adatbázis-triggerek miatt immutable-ok; revíziószámuk szülőnként egyedi, a current revision pointerek összetett FK-val integritásvédettek.
- A revision-level dependency gráf ugyanazon projektre és szervezetre korlátozott; önhivatkozás, ciklus és keresztprojekt-hivatkozás adatbázis-triggerrel tiltott.
- A lokális DEMO seed most reprezentatív projekt → tetőmodell → geometriai revízió → kalkuláció → kalkulációs revízió → dependency láncot tartalmaz.
- Az F2.3 pgTAP csomag 60 assertionre bővült, beleértve RLS-t, constraint-eket, immutable revíziókat, cross-org/cross-project tiltást és DAG-ciklusvédelmet.
- A generált Supabase TypeScript típusok frissültek; külön Zod domain-kontraktusok készültek kalkulációs input/output és provenance számára, matematika nélkül.
- A revízió-konkurencia védelme PostgreSQL egyedi constrainttel igazolt; valódi több-session terheléses teszt még technikai adósság.
- Elkészült a valós, szerveroldali projeklista és ügyféllista; a dashboard Aktuális munkák nézete már nem DEMO-kártyákat jelenít meg.
- Projektfunkciók: létrehozás, részletek, szerkesztés, keresés, állapot/munkatípus szűrés, módosítás szerinti rendezés, duplikálás, archiválás és visszaállítás.
- Ügyfélfunkciók: létrehozás, keresés, részletek és szerkesztés; ügyfél projektből is gyorsan létrehozható és hozzárendelhető.
- Az archiválás előtti státuszt a `projects.previous_status` migráció tárolja; visszaállításkor a szerver ezt az adatbázisból olvassa.
- Optimistic concurrency védelem készült a `projects.version` mezőre építve; stale mentés konfliktusüzenetet ad, néma felülírás nincs.
- A végleges projekt- és ügyféltörlés authenticated grantja visszavonva; F3 csak nem destruktív archiválást enged.
- A projekt részletező anyag-, ajánlat- és dokumentum-moduljai szándékosan „Hamarosan” állapotúak; F5 csak a nyeregtető geometriát tartalmazza.
- Elkészült a tiszta, infrastruktúrafüggetlen F4 domain-réteg: mm-alapú mértékegységek, explicit konverziók, safe-integer határok és szögek.
- Elkészültek a Point2D/3D, Vector2D/3D, szakasz- és sokszög-primitívek; a geometriai műveletek és a degenerált/önmetsző bemenetek validációja determinisztikus.
- Elkészültek a közös matematikai műveletek: 3–4–5 derékszögű háromszög, téglalap-/háromszögterület, explicit tolerancia, kerekítés és overflow-védelem.
- Elkészült a verziózott `CalculatorDefinition`, strukturált siker/hiba eredmény, Zod bemeneti- és kimeneti validáció, valamint az explicit, duplikációt tiltó `CalculatorRegistry`.
- Az F4 lezárásakor a registry még nem állított működőnek tető- vagy anyagkalkulátort; a matematikai DEMO téglalap-terület fixture teszt-only maradt.
- Az F4 technikai szerződései és pontossági szabályai a `docs/CALCULATION_ENGINE.md` fájlban dokumentáltak; F5 ezeket változtatás nélkül használja.
- Elkészült a `roof.gable` production domain kalkulátor F4 engine-re és registry-re építve, verziózott Zod input/output szerződéssel.
- A kalkulátor kezeli a magasság- és szög-alapú bemenetet, a mm-alapú méreteket, eresz- és oromfal-túlnyúlást, sík-/összterületet, vetületet, gerinc- és élhosszakat, valamint a koordinátás tetősík-vertexeket.
- A független referenciaeset igazolt: 8000 × 12000 mm, 3000 mm emelkedés, 500/250/250 mm túlnyúlás → 36,86989765°, 5625 mm ferde hossz, 140,625 m² összterület, 112,5 m² vetület.
- Az F5 lokális, atomic `save_gable_roof_calculation` SECURITY INVOKER RPC-ja egy tranzakcióban ment tetőmodell- és kalkulációs immutable revíziót, valamint a roof-model dependency élt; stale revíziót elutasít.
- Elkészült a project-linked `/projektek/[projectId]/tetomodellek/uj` és `/[roofModelId]` UI magyar, mobil-first formmal, élő számítással, magasság/szög váltással, mentéssel, reload utáni revízióbetöltéssel és meglévő Scaling Bubble integrációval.
- Az F5 mérföldkő idején a projekt részletező oldal valós tetőmodelleket és aktuális revízióeredményt mutatott; a műszaki rajzréteg az F6-ban került be.

## Szándékosan nincs benne

Hip- és shed-kalkulátor, anyag- és árkalkuláció, statikai tervezés, ajánlat, 3D és teljes rétegezett SVG-rajz. A gable eredmények geometriai értékek, nem szerkezeti vágáslisták. Távoli Supabase-projekt továbbra sincs használva.

## Következő fázis

F6 — SVG-alapú tetőrajz és következő jóváhagyott geometriai kiterjesztések, csak külön jóváhagyással.

## Ismert hiányok

- A Next 16 alapértelmezett Turbopack buildje ebben a környezetben portkötési hibával elhasalt; a dokumentált `npm run build` webpack módban sikeres.
- A `vite` közvetlenül a fejlesztési függőségek között maradt; production üzleti runtime-függőség nem került be.
- A kalkulációs matematika, anyagkatalógus, ajánlat és dokumentum-export továbbra sincs implementálva.
- Az `npm audit --audit-level=moderate` ebben a futtatásban hálózati DNS-hiba miatt nem tudott az npm registryhez kapcsolódni; ez nem módosította a függőségeket.
- A projektlista lekérdezése 100 rekordra korlátozott; lapozás nagyobb adatállományhoz későbbi optimalizálási feladat.
- Külön 320/375/390/430 px viewport-emulációt a rendelkezésre álló böngészővezérlő nem támogatott; a mobil reflow CSS- és accessibility-felmérése, valamint desktop böngészős smoke megtörtént.
- Az F4 nem oldotta meg a valódi több-session adatbázis-revízió concurrency teszt technikai adósságát; az F4 domain önmagában nem perzisztál.

## F5 ellenőrzés állapota

F5 Checkpoint A/B/C teljesült a dokumentált lokális és böngészős ellenőrzésekkel. Az F5 nem tartalmazott rajzrenderelőt, anyagkalkulációt, árképzést vagy statikai modult; az F6 kizárólag a műszaki rajzréteget adta hozzá.

Javasolt, nem végrehajtott commit: `feat(F5): add project-linked gable roof calculator`.
# F9.1 — Kivitelezési tervek alapja

Állapot: implementálva és ellenőrizve.

- A projektoldalon külön `execution_plans` és `execution_tasks` operatív objektum készült.
- Az elfogadott ajánlat csak a pontos véglegesített revízióra mutató, szerveroldalon ellenőrzött forrás; az ajánlat és státusztörténete nem módosul.
- Kézi feladatok: teendő / folyamatban / kész, alacsony / normál / magas prioritás, opcionális határidő, optimista verzióvédelem és idempotens kéréskulcs.
- Több kivitelezési terv hivatkozhat ugyanarra az elfogadott ajánlatra; nincs indokolatlan egy-terv/ajánlat korlátozás.
- Korlátok: nincs automatikus tétel→feladat átalakítás, ütemezés, függőség, erőforráskezelés, naptár vagy ERP-integráció.
- Bizonyíték: `npm run typecheck`, `npm run lint`, `npm run test` (21 fájl / 79 teszt), `npm run build` és `supabase test db` (5 fájl / 209 teszt) PASS; egy végső browser smoke flow PASS.

# F9.1.1 — Professzionális SVG műszaki rajzfinomítás

Állapot: implementálva és ellenőrizve.

- A gyökérok a rendererben közvetlenül képernyőtérben használt, világméretnek megfelelő dimenzió-offset volt; a 650–900-as értékek emiatt túl hosszú segédvonalakat adtak.
- A méretvonalak most kompakt, skála-független képernyőtérbeli eltolást, rövid geometriai hézagot és közeli feliratot használnak. Az aligned méretvonal saját normálirányt kap.
- A kezdeti illesztés és reset a látható geometria, annotációk és rétegek bounds-aiból számol; a rejtett segédgeometria nem kicsinyíti le a rajzot.
- A hajlásszög-jelölés egy tetősík és a vízszintes referencia közötti kompakt ívként jelenik meg; az F5 számított fokértéke változatlan.
- A négy vetület, lemezkiosztási réteg, zoom/pan/pinch és pointer-kezelés változatlan szerkezettel működik.
- Bizonyíték: 22 Vitest-fájl / 82 teszt, typecheck, lint, `git diff --check`, production build PASS; egy browser smoke a négy vetülettel, fit/reset és méretvonal-réteg kapcsolással PASS.
# F9.2 — Munkanapló és feladatesemények

Állapot: implementálva és ellenőrizve.

- Az F9.1 kivitelezési tervén belül létrejött a mobilbarát Munkanapló: munkavégzési dátum, kategória, tartalom, kapcsolódó feladat, problémák és következő lépések.
- A munkavégzés dátuma külön jelenik meg a bejegyzés rögzítési időpontjától; a dátumot szerveroldali `date` érték őrzi, nincs UTC-napeltolás.
- A feladat státuszváltozásait adatbázis-trigger rögzíti append-only `execution_task_events` táblába; változatlan státuszhoz nem készül esemény.
- A terv idővonalán a naplóbejegyzések és feladatesemények determinisztikusan, munkadátum/rögzítési idő/azonosító szerint rendezve jelennek meg.
- Védelem: szervezeti és terv/feladat composite FK, RLS, explicit authenticated REVOKE az immutable táblákon, request-key idempotencia és tranzakciós trigger.
- Bizonyíték: typecheck, lint, 22 Vitest-fájl / 82 teszt, production build PASS; lokális pgTAP 6 fájl / 223 teszt PASS; egy browser smoke PASS: bejegyzés, feladatkapcsolat, státusz-esemény és reload.

# F9.3.1 — Biztonságos kivitelezési fényképdokumentáció

Állapot: COMPLETE — a lokális, hitelesített böngészős feltöltési smoke sikeresen lefutott.

- Az `execution-photos` külön, privát Supabase Storage bucket; a bináris kép nem kerül PostgreSQL-be. A bucket 10 MB/kép méretkorlátot és JPEG/PNG/WebP MIME-listát kapott; HEIC/HEIF jelenleg tudatosan nem támogatott, ezt a magyar UI egyértelműen jelzi.
- Az `execution_photos` csak szervezeti, projekt-, terv-, opcionális feladat- és opcionális naplóhivatkozást, biztonságos fájlnevet, MIME-t, méretet, feltöltőt, időpontot, captiont és object key-t tárol. Composite FK-k és trigger zárják ki az eltérő terv-, projekt- vagy szervezeti hivatkozást.
- A szerveroldali action tagságot, fájlméretet, MIME-t és JPEG/PNG/WebP magic byte aláírást ellenőriz; az object key véletlen UUID-alapú, nem írható felül. A Storage feltöltés és a metadata-mentés nem hamisítottan atomi: metadata-hiba esetén kompenzáló object cleanup fut.
- A Storage olvasás csak metadata-sorral és aktív tagsággal engedett; a felület 5 perces signed URL-t használ, nincs permanens public URL vagy service-role böngészőben. A napló append-only marad, a UI külön mutatja a „Bejegyzés dátuma” és „Fénykép feltöltve” értékeket.
- A projekt tervpaneljében mobilbarát többfájlos feltöltés, feladat-/naplókapcsolat, lazy thumbnail galéria, billentyűzettel bezárható nagy nézet és kapcsolati metaadatok készültek. Törlési workflow és AI-feldolgozás nem része ennek a mérföldkőnek.
- Bizonyíték: a korábbi automatizált kapuk változatlanul érvényesek (250/250 pgTAP, 22 Vitest-fájl / 82 teszt, typecheck, lint, `git diff --check`, webpack production build PASS). Egyetlen hitelesített Brave smoke-ban a lokális DEMO PNG feltöltése sikeres volt; a galériakártya és a feladat-/naplókapcsolat megjelent, a nagy nézetben a kép ténylegesen kirajzolódott privát signed URL-ről, majd újratöltés után is elérhető maradt. A korábbi kliensoldali `event.currentTarget.reset()` TypeError-t minimálisan javítottam a form-hivatkozás előzetes rögzítésével. Cross-organization jogosulatlan Storage-hozzáférést böngészőben nem teszteltem.

# F9.3.2 — Haladó kivitelezési fényképdokumentáció

Állapot: COMPLETE — a kategorizálás, szűrés, feladatonkénti csoportosítás és az előtte/utána összehasonlító lokálisan, hitelesített böngészős smoke-ban ellenőrizve.

- A fotók kézzel választható kategóriája: „Munka előtt”, „Munkavégzés közben”, „Munka után”, „Nincs kategorizálva”. A feltöltési időpont nem kategorizál automatikusan.
- A meglévő, legfeljebb 100 fotós, tervhez kötött galéria kategória-, feladat- és feltöltési dátumszűrést, újabb/régebbi sorrendet és feladatonkénti darabszámot kapott; a feladathoz nem kötött fotók láthatók maradnak.
- Az előtte/utána nézet ideiglenes felhasználói kiválasztást használ, egymás mellett mutatja a két képet, megtartja az arányokat, és jelzi, ha a fotók eltérő feladathoz tartoznak. Mindkét kép a meglévő rövid életű signed URL-ről töltődik.
- A kategória külön, módosítható mező; az upload-időpont, feltöltő, object key, projekt/terv- és naplóhivatkozás továbbra is védett. A napló append-only és a feladat státusza változatlan marad.
- Bizonyíték: célzott typecheck, lint, production build, 10/10 F9.3.2 pgTAP és 2/2 F9.3.2 Vitest PASS. Egyetlen hitelesített Brave smoke: két DEMO fotó kategorizálása, kategóriaszűrés, feladatcsoportosítás, két kép tényleges betöltése az összehasonlítóban, választás felcserélése és reload utáni perzisztencia PASS. Cross-organization jogosulatlan Storage-hozzáférést böngészőben nem teszteltem.

# F9.4.1 — Professzionális projektáttekintés

Állapot: COMPLETE — a meglévő kivitelezési adatokból képzett áttekintő lokálisan és hitelesített böngészős smoke-ban ellenőrizve.

- A projektoldalon megjelent a „Kivitelezési áttekintés”: projekt/ügyfél/helyszín kontextus, kiválasztott kivitelezési terv, feladatdarabszámok, determinisztikus teljesítési százalék, figyelmi tételek, legutóbbi idővonal, fotóelőnézetek és kapcsolódó elfogadott ajánlat.
- A read-model nem hoz létre új üzleti táblát; az F9.1–F9.3.2 meglévő, szerveroldalon szervezet- és projekt szerint szűrt rekordjaiból származik. A feladat teljesítése kizárólag kész feladat / összes feladat, fizikai kivitelezési százalékot nem állít.
- Figyelmi tételek csak ténylegesen tárolt adatokból készülnek: nyitott vagy folyamatban lévő feladat, érvényes és múltbeli határidő, illetve `problem` kategóriájú naplóbejegyzés. Hiányzó határidő nem számít lejártnak.
- A fotók ugyanazon privát signed URL-lel jelennek meg korlátozott előnézetként; az ajánlat linkje a meglévő F8.3.2 oldalra mutat. Az ajánlati státusz jogi szerződésigazolásként nincs állítva.
- Bizonyíték: célzott overview Vitest 2/2 PASS, teljes Vitest 24 fájl / 86 teszt PASS, typecheck, lint és webpack production build PASS. Egyetlen hitelesített lokális böngészős smoke-ban az áttekintő, task/progress, napló- és feladatesemény, fotóelőnézet, valamint kapcsolódó ajánlati oldal megnyitása ellenőrzött.

# F9.4.2 — Professzionális kivitelezési dokumentáció PDF

Állapot: COMPLETE — a lokális, hitelesített PDF-előkészítő és szerveroldali PDF-generálás működik, a célzott layout-stabilizálás reprezentatív DEMO-PDF-en vizuálisan ellenőrzött.

- A kiválasztott kivitelezési tervhez megjelent a „Dokumentáció készítése” konfigurátor: fejezetválasztás, legfeljebb 8 fotó kiválasztása, PDF előnézet, letöltés és nyomtatási megnyitás.
- Az A4 portré PDF az aktuális projekt-, terv-, feladat-, napló-, esemény-, fotó- és elfogadott ajánlati adatokból készül. A feladat-százalék a meglévő `kész / összes` szabályt használja, a munka- és rögzítési időpontok külön maradnak.
- A PDF pipeline az F8.2 meglévő `@react-pdf/renderer` rétegét és közös Noto Sans fontregisztrációját használja. A jelentés nem immutable snapshot és nem jogilag hiteles elektronikus építési napló.
- A route minden fotót szerveroldalon, ellenőrzött tervhez tartozó object key alapján tölt le a privát Storage-ból; böngészőből küldött URL-t nem fogad el. JPEG/PNG támogatott, WebP esetén egyértelmű kizárási hiba jelenik meg. A korlát 8 kép, képenként 4 MB, összesen 12 MB.
- Bizonyíték: célzott PDF-render teszt 3/3 PASS, teljes Vitest 25 fájl / 87 teszt PASS, typecheck, lint és webpack production build PASS. Egyetlen hitelesített lokális browser/PDF smoke-ban a fejezetválasztó, két DEMO fotó kiválasztása, PDF preview route és a preview/download/print linkek ellenőrzöttek. A PDF közvetlenül renderelt reprezentatív DEMO-oldalképe: egy A4 oldal, mindkét kép, magyar karakterek, státuszjel, revíziószám és footer látható.

F9.4.2.1 célzott stabilizálás: elkészült a kapcsolódó ajánlat szakaszának egyben tartása, a feladatesemények háromoszlopos flex elrendezése, a megbízható külön grafikai státuszjel, a rendelkezésre álló emberi revíziószám megjelenítése a belső UUID mellett, valamint a metaadatok olvashatóbb méretezése. A reprezentatív PDF egy A4 oldalon maradt, nem tartalmazott orphan címsort vagy üres második oldalt; a két DEMO-kép, ékezetek és footer vizuálisan ellenőrzött. Hosszabb riportoknál az általános A4 tördelés továbbra is több oldalra oszthat.

## F9.5 — termékérettségi audit

Elkészült a [termékérettségi audit](PRODUCT_READINESS_AUDIT.md), célzott repository- és külső jogi/szakmai/termékkutatással. Ebben a dokumentációs feladatban teszt, build és böngészős ellenőrzés nem futott; a hosted/production és terepi állapot az auditban UNKNOWN.

## F9.5.1 — pilot readiness és üzembiztonság

Állapot: PARTIAL. Elkészült a [pilot readiness és üzembiztonság](PILOT_READINESS.md) leltár G01–G04 állapottal, adatfolyam- és EXIF/GPS-értékeléssel, szervezeti izolációs bizonyítékokkal, backup/restore hiányokkal, checklisttel és go/no-go blokkolókkal. A kimeneti határok terminológiája célzottan pontosítva lett; adatbázis-migráció és történeti adatváltoztatás nem történt. A célzott Vitest 6/6, typecheck, lint és webpack production build sikeres; hosted, restore, cross-org böngészős és terepi ellenőrzés nem bizonyított.

## F9.5.2 — szakmai terepi pilot előkészítés

Állapot: PARTIAL / előkészítve. Elkészült a [pilot tesztterv](PILOT_TEST_PLAN.md) három megvalósított workflow-val, pilot-belépési kapukkal, számítási összevetési módszerrel, mobil iPhone/iPad ellenőrzőlistával, UX/gap-priorizálással és F9.6.1 ereszcsatorna-anyagbecslési előfeltételekkel. Elkészült a [visszajelzési sablon](PILOT_FEEDBACK_TEMPLATE.md). A szakmai pilot még nem történt meg; F9.5.1 hosted, adatvédelmi, restore és izolációs blokkolói változatlanok. Alkalmazáskód, séma és Supabase nem módosult.

## F9.6.1 — ereszcsatorna-anyagbecslés

Állapot: **COMPLETE (LOCAL)**. A dokumentált lokális bizonyíték végig lefedi a mentett tetőgeometria → gutter kalkuláció → immutable gutter-revízió → explicit, egységkompatibilis katalógusvariáns → ugyanazon mentett adatokból épülő technikai SVG → új draft material takeoff láncot. A forrásrevízió- és provenance-snapshotok visszakövethetők; a szervezet-/projektizoláció, konkurens mentés és atomi idempotencia adatbázis- és Server Action szinten ellenőrzött; approved rekordot az átadás nem módosít.

A mennyiségek előzetes `piece` kereskedelmi szál-/tartozékbecslések. Nincs implicit folyóméter-, csomag- vagy gyártói konverzió, hidraulikai méretezés, gyártói megfelelés vagy hitelesített szerelési terv. A lokális lezárás nem jelent production readiness vagy szakmai validációt: nyitott a valós iPhone/iPad ellenőrzés, a szakmai terepi validáció, a gyártóspecifikus szabályok, a hosted környezet ellenőrzése és az operatív backup/restore.

## F9.6.1.1 — ereszcsatorna-kalkulátor alkalmazásintegráció

Állapot: COMPLETE lokális integrációra. Elkészült a projektútvonal és navigáció, az eresz-, lefolyó- és kézi tartozékszerkesztő, a geometry javaslat, a szerveroldali újraszámítás és lokális immutable revision mentés. A mentés szervezet- és projektazonosítást, expected revision ellenőrzést, tranzakciós advisory lockot és tetőmodell-revízió függőséget használ. A célzott egység- és adatbázisteszt, a kétkapcsolatos valódi konkurens RPC-ellenőrzés, valamint a helyi hitelesített mentés/reload/revíziófolyamat sikeres. Hosted adatbázis, backup/restore, dedikált narrow viewport és material takeoff/SVG nem része ennek a lokális integrációs elfogadásnak.

## F9.6.1.1.1 — integráció lezárása és konkurens revízióbiztonság

Állapot: COMPLETE lokális elfogadással. A Supabase CLI hozzáférése szűk, emelt helyi futtatással helyreállt; a `20261013080100` migráció reset nélkül, a korábbi alkalmazott migrációk után került fel. A 21 ellenőrzéses pgTAP suite ellenőrzi a mentési RPC-t, a külön szervezetben lévő felhasználó olvasási/írási elutasítását, keresztprojekt tetőrevízió elutasítását, snapshot-immutabilitást és elavult revízió ütközését. A `scripts/verify-gutter-concurrency.mjs` két független authenticated adatbázis-kapcsolattal, adatbázisban rögzített readiness barrierrel és egyidejű RPC-hívással PASS: pontosan egy revízióírás sikeres, a másik SQLSTATE `40001`, a revíziók `[1,2]`, az eredeti `8000` mm snapshot változatlan, az új `9100` mm érték egyszer szerepel. A teszt végi célzott cleanup eltávolította a saját fixture-t. A hitelesített helyi DEMO böngészőfolyamatban két geometriai eresz, kereskedelmi szálhossz, lefolyó, kézi tartozék mentése, reload, új revízió és a korábbi revízió visszaolvasása igazolt. Szűk képernyős viewport-ellenőrzés a rendelkezésre álló böngészővezérlőben nem volt végrehajtható; hosted izoláció és restore továbbra sem része ennek a lokális elfogadásnak.

## F9.6.1.2 — anyagkatalógus-kapcsolat, draft átadás és technikai séma

Állapot: COMPLETE lokális elfogadással az F9.6.1.2.1 hardening után. A meglévő, szervezethez kötött katalógus aktív variánsai közvetlenül hozzárendelhetők a gutter előzetes szál- és kézi darabtételhez; a termékazonosító, variáns, SKU, technikai paraméterek és provenance snapshotként kerülnek a takeoff tételbe. A kategória- és egységellenőrzés szerveroldali; `piece` nélkül nincs implicit folyóméter-, csomag- vagy gyártói átváltás, a fel nem oldott tétel látható marad.

Az átadási előnézet csak a mentett aktuális, ellenőrzött gutter-revízióból enged új `draft` takeoffot létrehozni. A mennyiségeket a tranzakciós SECURITY INVOKER RPC a mentett input/output snapshotból vezeti le; ugyanabban a tranzakcióban rögzíti a forrásrevíziót, a katalógus- és ár-snapshotot, valamint a provenance mezőket. Az explicit UUID kéréskulcs és a szervezet/projekt/kulcs egyediség atomi idempotenciát ad; ugyanaz a kulcs eltérő payloadhoz nem használható, új kulccsal pedig ugyanazon név és revízió mellett is létrehozható új, szándékos draft.

Az SVG determinisztikus, felülnézeti séma: a konfigurált ereszszakaszokat, hosszt, kereskedelmi szálhatárokat és a kapcsolat nélküli lefolyómeneteket mutatja. Nem állít fel nem tárolt tetőtopológiát vagy kifolyókapcsolatot, és a mentetlen kliensmódosításnál nem jelöl forrásrevíziót.

Az eredeti hitelesített böngészős workflow változatlanul érvényes. Az F9.6.1.2.1 utáni egyetlen fókuszált helyi követő smoke-ban a DEMO `piece` variáns hozzárendelése, az atomi új draft létrehozása, átirányítás és a 3 darabos tétel/forrásrevízió megjelenése PASS; a létrehozott smoke-draftot célzottan eltávolítottuk. A külön 390 px viewport a rendelkezésre álló vezérlőben nem volt beállítható, ezért MOBILE QA UNVERIFIED.

## F9.6.1.2.1 — végső integrációs hardening

Állapot: COMPLETE lokális elfogadással. A `20261013080200` migráció explicit `transfer_request_key` és immutable logikai `transfer_payload` mezőt, egyedi szervezet/projekt/kéréskorlátot és atomi `create_gutter_takeoff_draft` RPC-t vezetett be. A `20261013080300` javította a korábbi takeoff DELETE triggerek `NEW` visszatérési hibáját úgy, hogy a jóváhagyott rekordok immutabilitása megmaradt, a draftok szabályos törlése pedig ismét működik. A `20261013080400` a draft forrásazonosítóit, kéréskulcsát és payloadját közvetlen UPDATE ellen is immutable-lé tette.

Bizonyíték: 29/29 célzott pgTAP; két független authenticated adatbázis-kapcsolatból pontosan egy létrehozás és egy reuse, egy draft és egy tétel; 8/8 A–H valódi Server Action határteszt két ideiglenes, külön szervezethez tartozó bejelentkezett identitással; 8/8 célzott domain/SVG Vitest; teljes Vitest 95 PASS és 8 környezetfüggő teszt szabályosan skip; typecheck, lint és production build PASS. A lokális migrációtörténet `20261013080400`-ig egyezik, minden ideiglenes fixture és segédobjektum eltávolítását nulla darabszám igazolta. Hosted migráció, hosted RLS, backup/restore és terepi mobilvizsgálat nem történt.

## F9.6.2 — Bádogos szegélyek kalkulátora — COMPLETE (LOCAL)

Állapot: **COMPLETE (LOCAL)**. Az F9.6.2.0–F9.6.2.3 alábbi, korábban rögzített bizonyítékai és a [tesztmátrix](TEST_MATRIX.md) alapján a helyi munkafolyamat teljes: aktuális, verified tetőgeometria → szegélyanyag-becslés → változtathatatlan kalkulációs revízió és pontos geometriai forráshivatkozás → explicit, egységazonos katalógusvariáns → mentett revízióból készülő sematikus műszaki SVG → atomi, idempotens új anyagkimutatás-draft. Az F9.6.1 revíziós, függőségi, katalógus- és draft-architektúráját használja újra. A kapcsolat/átfedés felhasználói vagy forrásolt paraméter; hiányakor nincs számolt darabszám. A `piece` és `linear_meter` mennyiség külön, a tartalékkal növelt hossz csak előzetes tervezési cél; a forrás-, műszaki és egységazonos árrevízió-snapshot visszakövethető, hiányzó ár `null`. A helyi bizonyíték kiterjed a tagság, szervezet és projekt ellenőrzésére, az aktuális forrásrevíziókra, a történeti és approved rekordok változatlanságára, valamint a párhuzamos átadás egyszeri létrehozására. Ez dokumentációs elfogadás: az alábbi korábbi Vitest-, pgTAP-, konkurencia-, typecheck-, lint-, build- és böngészős eredményeket ebben a körben nem futtattam újra. Éles üzemkészség, konkrét gyártói megfelelés, terepi szakmai jóváhagyás és fizikai mobilkészülékes QA továbbra sem igazolt.

### F9.6.2.0 — kutatás és domain-terv

Állapot: **COMPLETE (DESIGN)**. Elkészült a [szegélykalkulátor-terv](FLASHING_CALCULATOR_DESIGN.md) célzott Lindab, PREFA és Ruukki gyártói forrásokkal, explicit átfedést kezelő matematikai szerződéssel, a tényleges `roof.gable` élhatárokhoz igazított importjavaslattal, provenance- és takeoff-határokkal, valamint DEMO matematikai tesztesetekkel. Kalkulátor, UI, adatbázis és migráció nem készült; teszt, build, pgTAP és böngészős ellenőrzés nem futott. Konkrét gyártói alkalmazhatóság és terepi szakmai jóváhagyás nyitott.

### F9.6.2.1 — szegélyanyag-becslő domainmotor

Állapot: **COMPLETE (DOMAIN)**. A tiszta `sheet_metal.flashings.material-estimate` kalkulátor bekerült a meglévő production registrybe. Kezeli mind a hat tervezett kategóriát, független futásokat, külön végkiterjesztést/tartalékot, explicit átfedést, explicit hasznos fedési hosszt, ismeretlen kapcsolatot, paraméter-provenance-t, figyelmeztetéseket és kézi darabtételt. A célzott Vitest 15/15 PASS (10 új szegélyteszt és 5 meglévő gutter regressziós teszt); `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. A tesztek lokálisan futottak; adatbázis-, jogosultsági, UI-, böngészős és szakmai/gyártói ellenőrzés nem része ennek a domainfázisnak. Az F9.6.2.2 akkori nyitott státuszának későbbi eredménye alább szerepel.

### F9.6.2.2 — projektintegráció és immutable mentés

Állapot: **COMPLETE (LOCAL)** az F9.6.2.2.1 végső integrációs ellenőrzésével. Elkészült a projekt szegélykalkulátor oldala, a projekt CTA, mind a hat kategória, több független futás, explicit kapcsolatparaméterek, végkiterjesztés/tartalék, azonnali domain eredmény és revízióválasztó. A geometriajavaslatok kizárólag aktuális, verified nyeregtető-revízióból származnak; a pontos modell-, modellrevízió-, kalkuláció- és kalkulációsrevízió-ID-k, az eredeti geometriai hossz és a felülírásjelző megmaradnak. A tört mm-es ferde él eredeti értékét megőrizve a motor egész mm-re felfelé kerekít.

Az `20261013080500` migráció reset nélkül lefutott a már egészséges helyi Supabase adatbázison; a migrációlista egyezik. A célzott `011_flashing_calculation.sql` teszt egy kezdetben túl tág függőség-lekérdezést jelzett, amely a tető-kalkuláció saját upstream élét is számolta; a tesztet a szegélykalkuláció típusára szűkítettem. Utána a teljes helyi pgTAP készlet 329/329 PASS (11 fájl, benne 19 szegélyállítás). A böngészőben a létező verified DEMO jellegű tetőrevízióból él hozzáadása, V1 mentése, 100 mm tartalékkal V2 mentése, reload, V1 visszanyitása PASS. A read-only DB ellenőrzés V1/V2-t, a 6625,00000036 mm eredeti geometriát, 6626 mm számítási hosszt, `lengthOverridden=false` értéket és revíziónként két dependencyt igazolt. A fejlesztői szerver futtatásához a Docker socket hozzáférést engedélyezni kellett; a 3000-es porton már futó projekt-szervert `localhost` címen használtam. Reset, hosted Supabase és valós ügyféladat nem érintett. A böngészős ellenőrzés céljára mentett, explicit DEMO kalkulációs V1/V2 megmaradt a helyi adatbázisban; az F9.6.2.3 későbbi integrációs eredménye alább szerepel.

Helyi célzott domain/edge Vitest 12/12, `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS (az utóbbiak előző F9.6.2.2 végrehajtásból; a végső ellenőrző körben nem futtattam őket újra, mert alkalmazáskód nem változott). A fizikai mobil QA és gyártói/szakmai validáció külön korlát marad. Javasolt commit: `test(F9.6.2.2.1): verify local flashing integration`.

## F9.6.2.3 — anyagkatalógus, atomi draft-átadás és műszaki SVG

Állapot: **COMPLETE (LOCAL)**. A szegélyoldal aktív, műhelyhez tartozó `flashing` és `sheet_metal` kategóriájú variánsokat kínál; a felhasználó explicit módon rendeli hozzá mind a hat szegélykategória valamelyik mentett mennyiségét. Kategória-, termékstátusz- és beszerzési egységellenőrzés történik, profil-/gyártói kompatibilitást a név nem következtet ki. A variáns műszaki paraméter-, forrás- és provenance-adatát, valamint azonos egységű árrevízióját a draft snapshot őrzi. Hiányzó ár esetén `null` marad és látható warning készül.

Az új `create_flashing_takeoff_draft` SECURITY INVOKER RPC az aktuális verified kalkuláció/revíziót, verziót, tagságot, projektet, katalógust és mennyiséget adatbázisoldalon ellenőrzi. A geometry forrásmodell és kalkuláció sorait stabil ID-sorrendben megosztott zárolással tartja, majd ellenőrzi az exact current revíziókat és dependencyt. Egy tranzakcióban új draftot és tételeket hoz létre; az explicit UUID kéréskulcs azonos payloadra reuse-t, eltérő payloadra elutasítást ad. A szálbecslés `piece`, az explicit `planningTargetLengthMm / 1000` `linear_meter`; az utóbbi tartalmazza a tartalékot és nem végleges beszerzési terv. `sectionCount=null` sosem válik nullás darabszámmá.

Az SVG mentett revízió méreteit, kiterjesztéseit, tartalékát, ismert szálhatárait/explicit átfedéseit és forrásazonosítóit sematikusan jeleníti meg; nem állít tetőtopológiát, profilmetszetet vagy szerelési szabályt. A helyi browser DEMO folyamat V2 snapshotból 6,726 fm átadást, exact revíziót és estimated provenance-t igazolt; a kompatibilis egységhez nem volt ár, így nem került át más egység ára. A korábbi approved takeoff változatlan maradt.

Bizonyíték: célzott Vitest 6/6, pgTAP 28/28, valódi kétkapcsolatos authenticated konkurenciateszt (1 create + 1 reuse, azonos draft ID, 1 tétel/4,1 fm), `npm run typecheck`, teljes `npm run lint`, `npm run build` PASS. Egy hitelesített helyi browser workflow PASS; fizikai/narrow viewport és gyártói validáció nem történt. Nincs hosted migráció vagy F9.6.3. Javasolt commit: `feat(F9.6.2.3): integrate flashing materials and SVG`.

## F9.6.3.0 — lemezprofilok és hajtások: kutatás és domain-terv

Állapot: **COMPLETE (DESIGN)**. Elkészült a [lemezprofil- és hajlítási terv](SHEET_METAL_PROFILE_DESIGN.md) elsődleges CAD-, gép-/szerszámgyártói és magyar tetőfedési forrásokra támaszkodva. Rögzíti a tangens-, külső és belső méretkonvenciót, az előjeles hajtás- és nyílásszöget, a `BA`/`BD`/`K` feltételes matematikáját, a nyitott 2D profilmodell és a gyárthatóság határát, a meglévő registry/revízió/katalógus/SVG újrahasznosítását, 9 explicit DEMO referenciaesetet és az F9.6.3.1–.4 fáziskapukat. A referenciaértékeket független Python aritmetika ellenőrizte; Vitest, pgTAP, typecheck, lint, build, böngésző, Docker és Supabase nem futott. Alkalmazáskód, adatbázis és migráció nem változott. Konkrét anyag–gép–szerszám kalibráció és terepi szakmai jóváhagyás hiányzik, ezért gyártási pontosság/megfelelőség nem állítható. Javasolt commit: `docs(F9.6.3.0): design sheet metal profile domain`.

## F9.6.3.1 — lemezprofil-geometria és hajlítási domainmotor

Állapot: **COMPLETE (DOMAIN)**. A `sheet_metal.profiles.flat-pattern` v1 tiszta TypeScript kalkulátor a production registrybe került. Nyitott L/U/többhajtásos profilokat, mindkét hajtásirányt, analitikus belső/külső köríveket, determinisztikus koordinátákat és anyagkontúr-önmetszés ellenőrzést kezel. A készállapotú tangensméret az egyetlen számolható bemeneti konvenció; külső/belső virtuális csúcsméret explicit nem támogatott. Hajtásonkénti explicit `BA` vagy forrásolt `K` alapján kiterített szélességet ad; hiányzó paraméternél a geometria megmarad, a teríték `null`/`INCOMPLETE`. Ellenőrizetlen gépi forrásból nem lesz kalibrált eredmény. A bal/jobb folytonos kontúr és hajtásonkénti belső/külső ív a vegyes hajtásirány miatt váltja a tervezet sematikus globális „inner/outer contour” elnevezését. A meglévő Zod, hibakód- és registry-architektúrát használja; F9.6.2 működését nem módosítja.

Bizonyíték: a célzott `npx vitest run src/domain/calculations/sheet-metal-profile.test.ts` **19/19 PASS**, benne a terv mind a 9 független DEMO referenciaesete, ellenkező irányú hajtás, önmetszés, számtartomány, fok/radián, explicit `BA`, hiányzó paraméter és registry. A meglévő engine + flashing célzott regresszió **15/15 PASS**. `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. A lint első futása egy használatlan értékadást jelzett; javítás után sikeres. Teljes Vitest-regresszió, pgTAP, adatbázis, jogosultsági és böngészős ellenőrzés nem futott; e domainfázisban nincs tartós adatírás. Szerszám-/anyagkalibráció, gyárthatóság, visszarugózás és terepi szakmai jóváhagyás továbbra sem bizonyított. Következő külön feladat: F9.6.3.2. Javasolt commit: `feat(F9.6.3.1): add sheet metal profile domain engine`.

## F9.6.3.2 — interaktív lemezprofil-szerkesztő

Állapot: **COMPLETE (LOCAL UI)**. A projektből elérhető „Lemezprofilok és hajtások” helyi munkavázlat L/U/egyedi nyitott DEMO sablonnal, egyenesek/hajtások hozzáadásával és törlésével, tangenshossz-, szög/irány-, sugár-, vastagság- és BA/K/forrás-szerkesztéssel készült el. A szöveges draft marad az egyetlen szerkeszthető állapot; a meglévő domainkalkulátor és Zod-szerződés élő kimenetéből készül a méretarányos, analitikus íves SVG és a terítékösszegzés. A kijelölés a rajz és a sor között szinkron; zoom, pan, visszaállítás és illesztés elérhető. Hibás bevitel megmarad, rajz nem készül belőle; hiányzó BA/K mellett a geometria megmarad és a szélesség nem kap kitalált nullás értéket. Nincs tartós adatírás, így új jogosultsági/konkurencia-felület sincs; a projektoldal meglévő szervezet- és projektellenőrzését használja. A későbbi mentés/revízió F9.6.3.3 feladat.

Bizonyíték: `npx vitest run src/features/sheet-metal/profile-editor.test.ts src/domain/calculations/sheet-metal-profile.test.ts` **26/26 PASS**; `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS. Egy hitelesített helyi böngészős folyamatban projektútvonal, L-hossz/szög és SVG-frissülés, forrásolt BA és 117,5 mm-es teríték, U-váltási figyelmeztetés, kétirányú kijelölés, 125%-os zoom, egérpan, hiányzó BA/K és hibás vastagság igazolt. A 390 px széles nézetben `scrollWidth=390`, egy oszlop és 313 px-es SVG. Fizikai érintés/pinch, teljes regresszió, adatbázis és gyártási alkalmazhatóság nem ellenőrzött; adatbázismódosítás nem történt. Javasolt commit: `feat(F9.6.3.2): add interactive sheet metal profile editor`.

## F9.6.3.3 — lemezprofil-mentés és immutable revíziók

Állapot: **COMPLETE (LOCAL)**. Profilonként külön `calculations` rekord tárolja a `sheet_metal.profiles.flat-pattern` kalkulációt; a `calculation_revisions` minden mentésnél új, immutable snapshotot kap. Az input megőrzi a profil típusát, egyeneseket, hajtásszögeket/irányt, vastagságot, sugarakat, BA/K módot, forrásprovenance-t és a tangens/koordináta-konvenciót. Nincs UI-only állapot a snapshotban. A mentés a szerveren újrafuttatja a production domainmotort; a PostgreSQL input-only RPC ugyanakkor önállóan számítja és tárolja a revízió BA/K összegzését, így kliensoldali outputot nem fogad el.

A SECURITY INVOKER RPC aktív műhelytagságot, ugyanazon szervezet projektjét, kalkulációazonosítót/tulajdonjogot, inputkonvenciót és expected revisiont vizsgál. Profilazonosítónként tranzakciós advisory lock szerializálja az első és későbbi írást. Az `calculation_revisions` meglévő immutable triggere védi a történetet. BA/K hiányakor a profil menthető, a tárolt és újraszámolt terítékszélesség `null` marad. Katalógus-variáns létező `technical_specs` JSON-ja nem definiál profil-kompatibilitási sémát, ezért nincs automatikus vagy terméknévből következtetett társítás; a kifejezett műszaki mapping az F9.6.3.4 nyitott pontja.

Bizonyíték: célzott editor/domain Vitest **27/27 PASS**; helyi pgTAP **19/19 PASS** (cross-project kalkuláció és cross-org revision-read is tiltott), valódi kétkapcsolatos authenticated konkurenciateszt **1 V2 létrehozás + 1 stale konfliktus, V1/V2 megmaradt**; `npm run typecheck`, `npm run lint`, `npm run build` PASS. Egy hitelesített helyi DEMO böngészőmenetben V1 mentés/reload, BA/K-s V2, változatlan V1 visszatöltés, hiányos V3 és a végső input-only RPC-val V4 mentés/reload igazolt; a hiányos revízió terítékszélessége `null`. Nincs teljes Vitest/pgTAP regresszió, fizikai eszközös vagy gyártási ellenőrzés. Javasolt commit: `feat(F9.6.3.3): persist sheet metal profile revisions`.

## F9.6.3.4.1 — profilanyag-mennyiség

Állapot: **COMPLETE (LOCAL)**. Az editor explicit darabhosszt (mm), darabszámot és opcionális anyagspecifikációt kezel; a domainmotor a hiteles terítékszélességből nettó téglalapfelületet számol, hiányzó BA/K esetén `null` eredménnyel és megőrzött geometriával/inputtal. A szerver újraszámol, a helyi adatbázis trigger újraellenőrzi a szélességet és a területet. A katalógusvariáns csak aktív, szervezetazonos, explicit anyagazonosítóval, vastagsággal, `square_meter` egységgel és forrásnévvel rendelhető; az egyezés kizárólag műszaki paraméteregyezés, nem gyártói vagy gépi jóváhagyás. A forrásnév, URL, dátum és mennyiség immutable V1/V2 revízióban marad; a meglévő szervezeti és expected-revision védelem újrahasznált.

Bizonyíték: célzott Vitest **32/32 PASS**; helyi profil pgTAP **40/40 PASS** két fájlban, beleértve a cross-org elutasítást és V1/V2 megőrzést; helyi migrációk reset nélkül alkalmazva; `npm run typecheck`, `npm run lint`, `npm run build` PASS. Egy hitelesített helyi böngészős DEMO V1 mentés/reload után a 103 mm × 2000 mm × 3 = 0,618 m² és az inputok megmaradtak. Teljes regresszió, fizikai eszköz, valós gyártói/gépi alkalmazhatóság és kereskedelmi stockmennyiség nem ellenőrzött. F9.6.3.4.2-ben jöhet külön forrásolt, atomi takeoff-draft átadás. Javasolt commit: `feat(F9.6.3.4.1): add profile net blank area and catalog matching`.

## F9.6.3.4.2 — profilanyag átadása új draftba

Állapot: **COMPLETE (LOCAL)** a helyi alkalmazás és adatbázis munkafolyamatára. Az editor az aktuális, mentett profilrevízióból és az abban rögzített kompatibilis `square_meter` variánsból ad át, külön előnézet és megerősítés után. Nem mentett, történeti vagy hiányos BA/K/terület állapotnál az átadás tiltott. A szerveroldali action a teljes TypeScript domainmotorral újraszámolja a geometriát; a SECURITY INVOKER SQL RPC az aktuális revíziót zárolja, az inputból önállóan újraszámolja a szélességet és a `W × darabhossz × darabszám / 1 000 000` nettó m²-t, majd az aktuális aktív katalógusadatokat is ellenőrzi. Az összes forrás-, BA/K-, termék-, műszaki és egységazonos árprovenance a tételsnapshotba kerül; hiányzó m² ár `null`. A tételsnapshot UPDATE tiltott, a forrásrevízió immutable. Az új draft és tétel egy tranzakcióban készül; UUID kéréskulcs és egyediség adja a konkurens idempotenciát. Jóváhagyott rekordot az átadás nem módosít. Ez előzetes, paraméteralapú nettó blankterület, nem kereskedelmi stock, kihozatal, vágásterv vagy gépi jóváhagyás.

Bizonyíték: helyi `20261013081400`–`20261013081700` migráció reset nélkül; célzott profil pgTAP **37/37 PASS**, eresz/szegély regressziós pgTAP **57/57 PASS**, két független authenticated kapcsolatos konkurenciapróba **1 create + 1 reuse, 1 draft/tétel, 0,618 m²**. Célzott Vitest **32/32 PASS**, a végső action-változtatás után `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Egy hitelesített helyi DEMO böngészőmenetben V1 megnyitás, explicit kompatibilis DEMO m² variáns V2-be mentése, 0,618 m² előnézet és megerősítés, új draft megnyitása, pontos revízió és hiányzó ár megjelenése PASS. Mentett, BA/K nélküli V3-ban az átadás letiltott; a korábbi V2 draft ezután elavult forrásként látszik, de 0,618 m² és a V2/BA/kompatibilitási snapshot változatlan. A korábbi approved rekord a takeoff oldalon változatlanul látható. Hosted adat, teljes regresszió, fizikai eszköz és gyártási validáció nem ellenőrzött. Javasolt commit: `feat(F9.6.3.4.2): transfer profile net area to idempotent takeoff draft`.

## F9.6.3 — végső helyi elfogadás

Állapot: **COMPLETE (LOCAL)**. A dokumentált F9.6.3.0–F9.6.3.4.2 bizonyítékok együtt lefedik a profilgeometriát és hajlítást, az interaktív SVG-szerkesztést, az immutable és visszakövethető mentett revíziót, a nettó blankterületet, az explicit katalógus-kompatibilitást, majd az aktuális mentett revízió atomi átadását új anyagkimutatási draftba. Az ismeretlen BA/K és hiányzó mennyiségi adat `null`/hiányos marad, nem válik nullás területté vagy átadható mennyiséggé; a mennyiség `square_meter`, darabszám és darabhossz szemantikája explicit. A forrásrevízió, BA/K- és katalógusprovenance a snapshotban követhető. A szervezeti/projekt-jogosultság, immutable revízió/tétel, approved rekord változatlansága, tranzakciós atomicitás és idempotens konkurens újrapróbálás dokumentált célzott adatbázis- és authenticated konkurenciabizonyítékkal rendelkezik.

A végső átadási mérföldkőhöz jelentett történeti eredmények: profil Vitest **32/32**, profil pgTAP **37/37**, eresz/szegély regressziós pgTAP **57/57**, konkurens transfer **PASS**, typecheck/lint/build **PASS**, hitelesített helyi browser flow **PASS**. Ezeket ebben az elfogadási körben nem futtattam újra; teljes regresszió sem történt. A TEST_MATRIX megfelelő záró bejegyzése tartalmazza a részleteket.

A státusz kizárólag helyi elfogadás. Nem jelent production readiness-t, géppel kalibrált gyártási pontosságot, gyártói jóváhagyást, szakmai terepi validációt vagy fizikai mobilkészülékes QA-t. A kihozatal, nesting/vágás, hulladék, táblaszám és kereskedelmi beszerzési mennyiség továbbra sem számított. Javasolt következő fázis: **F9.7.0 – Product UX & Workflow Audit**, a három meglévő kalkulátorfolyamat, projekt-navigáció, terminológia, mobilhasználat és használhatósági hiányok projekt-szintű felmérésére; ez az elfogadás nem indítja el annak implementációját. Javasolt commit: `docs(F9.6.3): accept local profile workflow`.

## F9.7.0 — Product UX & Workflow Audit

Állapot: **COMPLETE (AUDIT)**. Elkészült a [termék-UX és workflow audit](PRODUCT_UX_WORKFLOW_AUDIT.md), forráskód alapján összevetve az ereszcsatorna-, szegély- és lemezprofil-kalkulátort, a projektoldali útvonalakat, a takeoff/ajánlat/kivitelezési kapcsolatot, valamint a mobil- és hozzáférhetőségi kockázatokat. Fő javaslat: projektoldali eresz/szegély navigáció, egységes kalkulátor-sorrend és read-only workflow-áttekintés, majd célzott mobil/a11y ellenőrzés. A böngésző tablistája üres volt, így hitelesített walkthrough, viewport-, fizikai eszköz-, kontraszt- és screen-reader teszt nem történt; minden ilyen megállapítás potenciális kockázatként szerepel. Alkalmazáskód, adatbázis, migráció és Supabase nem változott; teszt, build és teljes regresszió nem futott. Javasolt következő fázis: **F9.7.1 — projektoldali kalkulátor-felfedezhetőség**, külön indításként; ez az audit nem implementálja.

## F9.7.1 — projekt-navigáció és összecsukható kivitelezés

Állapot: **PARTIAL (LOCAL UI)**. A projektoldal külön „Kalkulátorok” blokkja mindhárom meglévő útvonalat nyitja meg az aktuális `projectId` és szervezet query-paraméter megtartásával. A projekt áttekintésében a kivitelezés natív, alapból zárt disclosure lett; a Tetőmodellek továbbra is a kivitelezés után, külön szekcióként látható. A kivitelezésen belül a jelentés-előkészítés és fényképdokumentáció egy „Dokumentáció”, az új bejegyzés és idővonal egy külön „Munkanapló” disclosure alá került. A belső nyitottság független; a szülő bezárása visszazárja mindkettőt. A vezérlők natív billentyűzetes disclosure szemantikát, fókuszstílust, mobil töréspontot és reduced-motion kezelést használnak. Üzleti action, adat, jogosultság, dokumentumtárhely, séma és Supabase nem változott.

Bizonyíték: `npx vitest run src/features/projects/project-navigation.test.ts` **3/3 PASS**; `npm run typecheck`, `npm run lint`, `npm run build` PASS. `git diff --check` a dokumentálás után fut. Böngészősmoke és 390 px/tablet viewport ellenőrzés nem futott: a helyi szerver indítása `EPERM` hibával meghiúsult mind `0.0.0.0:3000`, mind `127.0.0.1:3000` címen, üres böngészőtab mellett. Emiatt az elfogadási feltétel teljes, interaktív/reszponzív bizonyítéka hiányzik; státusz PARTIAL. Javasolt következő fázis: **F9.7.2 — kalkulátor-munkafolyamat konzisztencia**, külön indítás után.

## F9.7.1.1 — magyar szakmai UX és valósághűségi audit

Állapot: **COMPLETE (VERIFIED SCOPE)** a 19 tényleges felhasználói útvonal, a hozzájuk tartozó közös UI, visszajelzések és PDF-feliratok forráskódos áttekintésére. A részletes leltár, bizonyítékok, INCORRECT/VERIFIED/UNVERIFIED/NOT APPLICABLE minősítések és következő termékdöntések: [Magyar szakmai UX audit](HUNGARIAN_PROFESSIONAL_UX_AUDIT.md). Javítások: belső fáziskódok és angol UI-szavak eltávolítása; forrás nélküli eresz/lefolyó és új nyeregtető kezdőméretek eltávolítása; anyagkimutatásban magyar, kompatibilis mérési és ár-választék; lefolyótartozékok átadási korlátjának jelzése; szegély/profil mérési és eredményfeliratok pontosítása. Üzleti képlet, szerveroldali szerződés, migráció és jogosultság nem változott. A célzott 10 tesztfájl / 39 teszt, valamint külön 3 fájl / 7 teszt, továbbá typecheck, lint és build PASS; teljes regresszió, adatbázis és böngésző nem futott. A korábbi helyi szerverindítás `EPERM` miatt a hitelesített/mobil megjelenés továbbra sem igazolt. Javasolt commit: `fix(F9.7.1.1): clarify Hungarian professional UX and calculator inputs`.

## F9.7.2 — Egységes projektfolyamat-áttekintő

Állapot: **PARTIAL (LOCAL)**. A read-only projektfolyamat-összefoglaló és a desktop UI-scope elkészült; a megadott keskeny viewport ellenőrzés nem volt végrehajtható, ezért a teljes vizuális elfogadás nyitott. A projektoldal a mentett tetőmodellek, eresz-/szegély-/profilkalkulációk, anyagkimutatások, ajánlatok, kivitelezési tervek, belső naplóbejegyzések és fényképek rövid állapotát, illetve a meglévő modulok projekt- és szervezetkontextusú linkjeit mutatja. Csak a kalkulációk, anyagkimutatások és ajánlatok szervezet+projekt szűrt, kis oszlopszámú listái új lekérdezések; tetőmodellek és kivitelezés meglévő projekt-scope lekérdezéseit használja újra. Nincs írás, új státusz, készültségi százalék vagy üzleti logika módosítás. A szöveg nem minősít szakmailag ellenőrzöttnek kalkulációt, az elfogadott ajánlatot nem nevezi szerződésnek, a naplót belsőként jelöli. A régi, téves „Hamarosan” tetőmodell-kártya kikerült; tetőmodell és kalkulátornavigáció megmaradt, a kivitelezés változatlanul összecsukható.

Bizonyíték: 3 célzott Vitest fájl / 7 teszt, typecheck, lint, build (webpack) és `git diff --check` PASS. Egy hitelesített helyi DEMO projekt smoke PASS: összefoglaló, három kalkulátor-link, valós státuszok, tetőmodellek és csukott kivitelezés megjelent; az előnézeti kalkulációk aktuális/piszkozat/elfogadott különbségei látszottak. Egy ereszkalkulátor read-only bejárása során a mentett magyar mezőcímkék, revízióválasztó, mérési forrás, becslési korlátok és letiltott átadási gomb látszottak; bemenetet nem módosítottam és validációs hibát nem provokáltam. A narrow viewport nem volt elérhető. DB/RLS teszt és teljes regresszió nem futott; adatbázisséma és üzleti adatok nem változtak. **A PRODUCT_UX_WORKFLOW_AUDIT.md 57. sorában jelzett P1 (projekt-szintű read-only áttekintés) megvalósult és a fenti forrás-, teszt- és desktop smoke bizonyítékkal lezárható;** a külön kalkulátorkonzisztencia- és mobil/a11y tételek nem részei ennek a lezárásnak. Javasolt commit: `feat(F9.7.2): add read-only project workflow overview`.

### F9.7.2.1 — reszponzív és akadálymentességi ellenőrzés

Állapot: **PARTIAL**. A hitelesített desktop projektoldalon a billentyűzetes fókusz látható, a Kivitelezés natív `details/summary` vezérlője Space billentyűvel nyitható és zárható; a böngésző akadálymentességi fája névvel mutatja a főcímet, kártyacímeket, egyedi modulhivatkozásokat és összecsukható vezérlőt. Javítva: ismétlődő „Megnyitás” linknevek egyedivé tétele, workflow kártyacímek `h3`-ra emelése, link fókuszjelölése és legalább 44 px magas kattintási cél. A státuszok szövegesek, nem kizárólag színesek. A 390 px és 768 px viewport nem volt emulálható a rendelkezésre álló natív Brave vezérlővel, ezért ezek vizuális viselkedése és túlcsordulása CSS alapján csak előzetesen megítélhető; PASS nem állítható. Képernyőolvasóval és fizikai eszközön nem ellenőriztem. Szervezet/projekt adatszűrést a célzott adatlekérdezés-teszt fedi; a projekt jogosultság-ellenőrzése minden workflow-lekérdezés előtt lefut. Részletek a [tesztmátrixban](TEST_MATRIX.md). F9.7.3 nem indult el.

## F9.7.3 — kalkulátor UX-konzisztencia

Állapot: **PARTIAL (LOCAL UI)**. Az eresz- és szegélykalkulátor állapotjelzése magyarul megkülönbözteti a mentett aktuális, történeti, elavult forrású és nem mentett állapotot; az eresznél a mentés gombja előre jelzi, hogy új V-változat készül. A profil szerkesztő 560 px alatt egy oszlopba rendezi az alapmezőket, hajlítási paramétereket és mentési vezérlőket, hogy keskeny kijelzőn ne zsúfolódjanak össze. A domainmotorok, képletek, mentési/transzfer actionök, DB-séma és jogosultsági szerződések változatlanok.

Bizonyíték: célzott UI Vitest **12/12 PASS** (`gutter-calculator-ux.test.ts`, `calculator-ux.test.ts`, `profile-editor.test.ts`); `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Böngészősmoke nem történt: a Brave tablista üres, korábbi projektfeljegyzés szerint a helyi szerverindítást `EPERM` blokkolta; a korábban nem támogatott 390/768 px emulációt nem próbáltam ismét. Emiatt a teljes közös workflow, SVG-kezelés, anyagátadási minták, interaktív billentyűzetes állapotok és viewport render nem igazolt; fizikai eszköz QA sem történt. Az elfogadási feltételek még nem teljesek, ezért PARTIAL. Javasolt következő lépés a nyitott mobil és interaktív QA megbízható böngészőkörnyezetben; **F9.7.4 nem indult el**. Javasolt commit: `fix(F9.7.3): clarify calculator revision states and narrow forms`.

## F9.7.3.1 — végső kalkulátor UX-konzisztencia

**F9.7.3 állapot: COMPLETE (LOCAL UI)** a funkcionális felületi körben. A korábbi PARTIAL bejegyzés az előző részeredményt rögzíti. Az eresznél az eredmény után közvetlenül a rajz, majd a katalógus és az átadási előnézet következik. A szegélynél a megnevezés módosítása is mentetlen változásként jelenik meg. A szegélyrajz szerkesztéskor az élő számítást mutatja; érvénytelen bemenetnél nem marad látható régi mentett rajz. A szegély széles SVG-je billentyűzettel fókuszálható, megnevezett görgetési terület. A profil két azonos hatású nézetgombját egy őszintén feliratozott illesztés/alaphelyzet vezérlő váltotta fel; a számítás és figyelmeztetései az átadási blokk elé kerültek. A rajzok műszaki korlátai, a statikus sémák tényleges kezelése és a profil pan/zoom használata szövegesen olvasható.

A három katalógus/átadási felület a mentett forrásváltozatot, az előzetes mennyiséget és egységet, a kompatibilitás/hiányzó hozzárendelés állapotát, az ár rendelkezésre állását ott, ahol az adat adott, és az új piszkozat létrehozását egyértelműen jelzi. A megerősítő gombok és a már meglévő átadási jogosultsági feltételek megmaradtak. A domain-, kompatibilitási, szerveraction-, RPC-, adatbázis- és jogosultsági kód nem változott; a korábbi immutable snapshot, szervezeti izoláció és konkurenciabizonyítékokat ez a UI-kör újrahasználja, nem futtatta újra.

**Bizonyíték:** `npx vitest run src/features/flashings/drawing-preview.test.ts src/features/flashings/calculator-ux.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts` — 4 fájl / **18 PASS**; névváltozás miatti mentetlen állapot, élő/mentett/hibás rajzforrás kiválasztása, mentett eredmény és SVG, hozzáférhető katalógusválasztók, átadási előnézet, figyelmeztetés és profilrajz vezérlő renderelése. `npm run typecheck`, `npm run lint`, `npm run build` (webpack) és `git diff --check` PASS. Ezek célzott, részben SSR és tiszta állapotlogikai tesztek, nem teljes interaktív regresszió. A korábban üres Brave tablista miatt hitelesített böngészősmoke nem volt elérhető; interaktív böngészős UX **UNVERIFIED**. 390/768 px vizuális és fizikai touch/pinch ellenőrzés az F9.7.4 külön feladata. Javasolt commit: `fix(F9.7.3.1): align calculator drawings and material transfer UX`.

## F9.7.4.1 — iPad runtime és UX korrekciók

Állapot: **PARTIAL (IMPLEMENTATION)**. A három kalkulátor kliensoldali inicializálása közös, biztonságos UUID-segédet használ: előbb a natív `crypto.randomUUID()`, ennek hiányában RFC 4122 v4 bitmintával a `crypto.getRandomValues()`. `Math.random()` nincs; biztonságos forrás hiányakor egyértelmű hiba keletkezik. A gutter/flashing/profil takeoff-kulcsok egy logikai átadáson belül stabilak, retry esetén újrahasználódnak, siker után cserélődnek; a flashing új revízió/hozzárendelésnél új kulcsot kap. A kliensoldali Execution műveletek szintén a közös UUID-segédet használják. Takeoff RPC-szerződés, képletek, jóváhagyási üzleti logika és DB-jogosultság nem változott.

A beolvasott `.env.local` loopback Supabase URL-t (`127.0.0.1:54321`) tartalmazott, ami iPaden az iPad saját loopback címe. A helyi konfiguráció URL-jét a feladatban megadott Mac LAN-címre (`192.168.1.31:54321`) állítottam; a böngésző- és szerverkliens ugyanazt a publikus URL/publishable-key konfigurációt használja, service-role kulcs nincs a `.env.local`-ban. A helyi Supabase API nem válaszolt egyik címről sem; a Docker socket hozzáférése megtagadott, a Supabase CLI státusz a sandbox `~/.supabase/telemetry.json` írási tiltása miatt nem futott le. Emiatt hálózati, hitelesítési és szervezeti jogosultsági futás nem igazolt; a három hiba okát ettől elkülönítve, az HTTP LAN-originon használt secure-context API hiányával azonosítottam.

A projekt áttekintő a meglévő, projekt+szervezet szerint lekért tetőmodellek mentett nyeregtető rajzpaneljeit jeleníti meg egymás alatt, modellnévvel/revízióval, a részletes modell linkjével és az eredeti nézetválasztókkal. A tetőmodell-oldalak rajzai megmaradnak. A jóváhagyás saját, felső térközzel és tördeléssel rendelkező akcióterületet kapott. A globális floating panel négy külön csúszkája: szöveg, vezérlőméret, felületi térköz, műszaki rajz megjelenítése; a meglévő localStorage beállítást bővíti, SSR induló markup változatlan. A fókuszban lévő mezőt a Visual Viewport változásánál csak akkor görgeti középre, ha kilóg a látható területről; az ikon szerkesztés alatt vagy másik fontos vezérlővel való ütközéskor rejtett.

Bizonyíték: 10 célzott Vitest fájl / **30/30 PASS** (UUID API/fallback/idempotency, mindhárom calculator SSR fallback render, rajz asszociáció és több modell, skálázás/persistencia/reset, approval markup, keyboard-viewport és lebegő ikon átfedés ellenőrzése); `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Hitelesített böngésző-smoke nem futott: a tablista üres, a helyi app `0.0.0.0:3000` bindje `EPERM`; iOS billentyűzetet fizikai eszközön nem ellenőriztem. A LAN Supabase elérhetősége, Auth session/persistencia és RLS/authorization böngészős működése ellenőrizetlen marad, ezért ez nem fizikai eszközös vagy végső COMPLETE elfogadás. Következő: F9.7.4 fizikai iPad/iPhone acceptance. Javasolt commit: `fix(F9.7.4.1): stabilize iPad runtime and display UX`.

## F9.7.5 — végső UX-finomságok és interakciós megbízhatóság

Állapot: **PARTIAL (LOCAL UI)**. Az ajánlat szerkesztője látható `role=status` jelzést mutat módosításkor, és böngészőoldal elhagyásakor natív figyelmeztetést kér; sikeres mentéskor a jelzés megszűnik, a meglévő pending gomb tiltja a dupla mentést. Ajánlati mentés, véglegesítés, másolatkészítés, státuszváltás, valamint kivitelezési terv/feladat/napló/fényképkategória hibái közös, magyar, biztonságos üzenetleképezést használnak. A revízióütközés, jogosultsághiány, hiányzó forrás és invalid adat külön helyreállítási útmutatást ad; ismeretlen adatbázis/RPC részlet nem kerül a UI-ba. A meglévő action/domain-adaptereket és revíziószerződéseket újrahasználtam; üzleti logika, adatbázis, migráció, jogosultsági szabály és idempotencia nem változott.

Bizonyíték: célzott Vitest `npx vitest run src/lib/user-facing-action-error.test.ts src/lib/unsaved-changes.test.ts` — konfliktus-, jogosultság-, forráshiány-, validációs és ismeretlen technikai hibaszöveg, valamint dirty/clean unload figyelmeztetés. A SPA-navigáció védelmét és a további modulok loading/empty/error áttekintését az alábbi F9.7.5.1 folytatta.

## F9.7.5.1 — maradék UX-megbízhatósági javítások

Állapot: **PARTIAL (LOCAL UI)**. Az ajánlatszerkesztő módosításait az eredeti űrlapállapottal hasonlítja össze, így visszaállított értékeknél megszűnik a dirty jelzés. A projektoldalra visszatérő, szerkesztőn belüli útvonal megerősítést kér csak valódi módosításnál; Mégse esetén az editor nyitva marad, megerősítéskor navigál, mentéskor pedig megerősítés nélkül navigál a siker után. Mentés közben a mezők letiltottak, és az editor alatti ajánlatnavigáció rejtett, ezzel elkerülve versenyhelyzetet és megkerülhető linkeket. Böngészőoldal-elhagyást a korábbi natív figyelmeztetés kezeli. Browser Back / más, editoron kívüli navigáció nincs elfogva; nincs globális link/history intercept.

Az alkalmazás gyökér `loading.tsx` állapota érthető betöltésjelzést, `error.tsx` pedig technikai részletet nem felfedő, újrapróbálást adó hibafelületet biztosít. A bounded forrásáttekintés: projektek/ügyfelek (üres lista elkülönül, query hiba dob); nyeregtető (query hibák dobva); eresz/szegély/profil kalkulátorok (több lekérdezési hiba korábban üres/null értéket adott, most dob és hibafelületre jut); anyagkimutatás (fő- és kapcsolódó query hibái dobva); ajánlat (ügyfél, jóváhagyott forrás, revízió és státusztörténet hibái elkülönítve dobva); kivitelezés (fő workspace query hibái dobva). A jóváhagyás következménye — a kimutatás és tételei utána nem módosíthatók — látható. Anyagtétel és jóváhagyás gomb pending alatt tiltja a duplikált beküldést. Nincs üzleti, adatbázis-, RPC-, jogosultság-, revízió- vagy idempotencia-szerződés-változás.

Bizonyíték: célzott Vitest — 5 megadott fájl / **13 PASS** (dirty/cancel/confirm, hibás kontra üres adat, loading/error markup, pending gomb, biztonságos hibaüzenetek); `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. A build után a generált `next-env.d.ts` módosítását visszaállítottam. Böngészős smoke nem futott: korábban üres Brave tablista és dev bind `EPERM`; nem ismételtem. Browser Back / más editoron kívüli útvonal továbbra is képes mentetlen állapotot elhagyni, ezért a teljes adatvesztési kockázat nem zárható le és a státusz PARTIAL. Authenticated browser, Supabase/RLS, fizikai iPad/iPhone és teljes regresszió nem futott. Következő: F9.7.5 lezárása előtt döntsünk a browser-history navigáció termékszintű kezeléséről; **F9.8 nem kezdhető el**. Javasolt commit: `fix(F9.7.5.1): complete UX reliability safeguards`.

## F9.7.5.2 — ajánlatpiszkozat helyreállítása navigáció után

Állapot: **COMPLETE (VERIFIED LOCAL FUNCTIONALITY)**. Az ajánlatszerkesztő a jelentős mentetlen űrlapállapotot csak az aktuális böngészőlap `sessionStorage`-ában őrzi, user/org/project/quotation szerint elkülönítve. Visszatéréskor a felhasználó külön választhat visszaállítást vagy elvetést. Meglévő ajánlatnál a forrás `version` és `currentRevisionId` eltérését ellenőrzi; eltéréskor csak elvetés lehetséges. Sikeres mentés és explicit elvetés törli a piszkozatot. Fiókváltás azonos munkameneten belül törli a másik user adatait. A mentési action/revíziószemantika változatlan; a Next 16.4 `Link.onNavigate` kezeli a saját visszalink kliensnavigációját. Browser Back általános blokkolását nem állítjuk.

Bizonyíték: `npx vitest run src/features/quotations/quotation-draft-recovery.test.ts src/lib/unsaved-changes.test.ts` — 2 fájl / **6 PASS**; user/org/project izoláció, forrásrevízió-egyezés, accountváltás-invalidation, hibás adat törlése és meglévő navigációs guard. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Böngésző Back és interaktív helyreállítás nem ellenőrzött: nem volt elérhető hitelesített browser tab, a korábbi helyi dev bind `EPERM` hibáját nem próbáltam újra. Nincs adatbázis/RPC/action payload változás, recovery adat nem jut külső rendszerbe. Korlát: lapbezárás/tab munkamenet vége vagy tiltott/kvótán túli sessionStorage esetén a helyreállítás elveszhet; külső/history navigációt nem blokkoljuk, visszatéréskor kérünk döntést. F9.8 nincs elkezdve. Javasolt commit: `fix(F9.7.5.2): recover unsaved quotation drafts`.
# F9.7.6.6.1 — standalone quotation backend

Állapot: **PARTIAL — implementációs munkafa elkészült, kritikus DB/Auth/concurrency bizonyíték blokkolt**. A közös quotations/revisions sémához `ownership_scope` került tervezve, projekt nélküli rekordnál nullable FK-val és scope CHECK-kel; a standalone owner `auth.uid()` és org tagság, a project quote tag-láthatósága megmarad. Új standalone save/read RPC és append-only idempotency ledger kezeli a draft/revíziót; manual LABOR/OTHER, authorized MATERIAL, katalogus-ár snapshot/manual override provenance és DB oldali HUF összesítés implementálva. Finalization/lifecycle és PDF project route-hoz kötve marad.

Új migráció: `20261014030000_standalone_quotations.sql`; pgTAP: `018_standalone_quotations.sql`; server actions: `src/features/quotations/standalone-quotation-actions.ts`. A specifikációs gyökér `PROJECT_BLUEPRINT.md` megvolt, de a briefben említett `docs/PROJECT_BLUEPRINT.md` útvonal nincs; a gyökér specifikáció F0/F8 pénzügyi szabályait és tényleges F8 implementációt használtam.

Bizonyíték: `npx vitest run src/domain/quotations/standalone.test.ts src/domain/quotations/money.test.ts src/domain/quotations/status.test.ts` — 3 fájl / 10 PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; existing project routes változatlan listával), `git diff --check` mind PASS. A `supabase migration list --local` telemetry kikapcsolása után `127.0.0.1:54322 ECONNREFUSED`-dal jelezte, hogy a local DB nem fut; a `supabase start` a Docker socket permission denied hibáján állt meg. Nem ismételtem. Migration apply, pgTAP, valós Auth/RLS és két-session concurrency ellenőrzés nem futott; reset/remote művelet nem volt.

Ismert korlát: egységek jelenlegi sémája szabad szöveg, elfogadott egység-registry nincs, így csak hiányzó/túl hosszú egységet lehet elutasítani, szakmailag támogatott unit-listát nem lehet kitalálni. Standalone finalization, PDF, UI és project-association nincs ebben a fázisban.

Javasolt commit: `feat(F9.7.6.6.1): add standalone quotation backend`.

## F9.7.6.6.1a — backend-validációs kör

Állapot: **PARTIAL**. A kezdeti sandboxos Docker diagnosztika socket permission
hibát adott; a szűkített, csak helyi státusz/migráció olvasásra és local DB
tesztekre kért Docker-hozzáférés után `docker info` Docker 29.8.0-t,
`supabase status` helyi DB/API-t és `linked_project=null` állapotot mutatott.
`supabase migration list --local`: DB 20261014020200-nál állt, 030000 unapplied;
quotations/revisions sorok: 2/3, a teszt DEMO termékazonosítója nem ütközött,
authenticated/anon nem kapott `public CREATE` jogot.

Statikus vizsgálat talált egy jogosultsági hibát: a kliens saját maga is
beállíthatja a `app.standalone_quotation_writer` custom GUC-t, és az eredeti
authenticated write policy / ledger INSERT grant mellett megkerülhette a
triggert, illetve hamis ledger sort készíthetett. Mivel a 030000 bizonyítottan
unapplied volt, a javítás közvetlenül a migrációba került: standalone save
SECURITY DEFINER, explicit actor/org ellenőrzés, rögzített `pg_catalog, public`
search_path; authenticated közvetlen parent/revision insert/update project
scope-ra korlátozva; ledger INSERT visszavonva. A 030000 migráció reset nélkül
sikeresen alkalmazva. A pgTAP terv 33 assertion, hamis GUC-s közvetlen
íráspróbákkal; a teszt 33/33 PASS.

`RUN_LOCAL_STANDALONE_QUOTATION_VALIDATION=1 SUPABASE_TELEMETRY_DISABLED=1 node
scripts/verify-standalone-quotation-backend.mjs`: 43/43 PASS, két valós helyi
Supabase Auth user JWT-vel. Két backend session egyidejű lock-waitjét mértük:
retry egy quote+revision, párhuzamos V2-ből egy siker + egy `40001`, V1 snapshot
változatlan. Tulajdonos/lista/történeti olvasás, same-org és cross-org deny,
hamis creator/direct write/ledger tiltás, catalog ár snapshot/manual override,
HUF kerekítés/negative/missing unit/precision/large input, project create/V2,
tag-láthatóság és egy létező accepted project quotation/revízió tiltott
módosítási próbája futott, snapshot változatlan maradt. `supabase test db --local`
002–004: 27/27 PASS. Fókuszált Vitest ezen körben 3 fájl/10 PASS; a SQL/UI
rétegén kívüli typecheck/build korábbi körből reused, a lint és
`git diff --check` ebben a körben PASS. A teljes project PDF/takeoff/finalize/status
transition és minden RLS életciklus regresszió még nem lefedett; a harness
által létrehozott DEMO userek/adatok a local DB-ben maradnak.
Javasolt commit: `fix(F9.7.6.6.1a): secure standalone quotation writes`.

## F9.7.6.6.1b — final standalone quotation backend acceptance

Állapot: **COMPLETE (DRAFT BACKEND)**. A korábban bizonyított DB/RLS/concurrency
szerződés változatlan; az 1a kör 33/33 pgTAP, 27/27 project pgTAP és 43/43
valós local Auth/concurrency eredményét nem ismételtem.

Valós Next.js Server Action runtime-ot ellenőriztem helyi, valódi Supabase Auth
sessionnel. Az ideiglenes acceptance actionön keresztül a produkciós standalone
create/read/list/catalog/save action függvények a Next SSR cookie-kból kapott
identitással futottak: 15 tulajdonosi assertion PASS, köztük manual MATERIAL és
LABOR mentés, saját lista, immutable V1/V2, stale `CONFLICT`, invalid ID,
hamisított organization ID, safe error, HUF nettó subtotal `vatAmount` nélkül,
kevert net/gross `VALIDATION` és standalone finalize elutasítása. Külön aktív
tag JWT-je más creator ajánlatára `NOT_FOUND`; visszavont tagságú Auth user
list/mentés kísérlete `FORBIDDEN` lett.

Meglévő project action regressziója: approved takeoff-forrással draft és V2
mentés PASS; accepted project quotation módosítása tiltott. A produkciós action
utak SSR sessiont használtak; privileged client csak a lokális DEMO Auth és
katalógus-fixtúrák létrehozásához kellett. Az ideiglenes acceptance route és
fixture script eltávolítva. A tesztadatok a helyi DB-ben maradnak.

Ellenőrzések: fókuszált Vitest 3 fájl/10 teszt, `npm run typecheck`,
`npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check`
PASS. A build által generált `next-env.d.ts` útvonalváltást visszaállítottam az
e kör előtti, már módosított tartalomra; az előzetes munkafa-eltérést megőriztem.

**VERIFIED DATABASE:** a fenti 1a eredmények. **VERIFIED APPLICATION:** a
Server Action/Auth/session és projekt regressziók fent. **NOT YET IMPLEMENTED
IN FRONTEND:** standalone ajánlatszerkesztő és PDF. **NOT YET BROWSER VERIFIED:**
termék quotation UI nincs, ezért azt nem lehetett tesztelni; browser smoke csak
az ideiglenes action fixture-re történt. VAT engine, standalone finalize és
implicit project handoff nincs implementálva.

Javasolt commit: `fix(F9.7.6.6.1b): verify standalone quotation actions`.

## F9.7.6.6.2 — standalone quotation frontend

Állapot: **PARTIAL — a standalone áttekintő és szerkesztő implementálva; a
hitelesített end-to-end browser workflow még nincs igazolva.** A globális
`/ajanlatok` oldal új önálló ajánlat gombot, creator-scoped standalone draft
listát és RLS-szel látható projektajánlat listát ad. Az overview mindkét scope
esetén jelzi a 100 soros határt. Az `/ajanlatok/uj` önálló szerkesztőt nyit,
az `/ajanlatok/[quotationId]` pedig aktuális vagy immutable történeti
revíziót jelenít meg.

Újrahasznosított architektúra: F9.7.6.6.1 standalone Server Actionök, trusted
katalógus-feloldás, auth/org helper, owner-szűrt RPC/RLS, expected-version és
idempotency contract; a projektajánlat route/action/editor/PDF útvonal
változatlan. A session recovery meglévő quotation helperére épül. Kézi
MATERIAL, LABOR és OTHER tételek, katalógusvariáns, ellenőrzött nettó HUF ár,
kézi ár-felülírás, stabil kliensoldali sor-azonosító és sorrendmódosítás
támogatott. Történeti revízió kiválasztása olvasási művelet; standalone
véglegesítés/elfogadás/ÁFA/hivatalos PDF/kivitelezési terv vezérlő nincs.

Adatkonzisztencia/jogosultság: a UI nem küld creator vagy projektadatot;
standalone mentés a meglévő auth és aktív szervezeti tagság ellenőrzésű
action/RPC-n át fut. A katalógusárat a meglévő trusted action validálja, a
mentett pénzügyi eredmény szerver oldali HUF nettó subtotal. A kliensbecslés
explicit nem mentett becslésként szerepel. Revízió snapshotja nem módosítható.

Ellenőrzés: `npx vitest run
src/features/quotations/standalone-quotation-ui-state.test.ts
src/features/quotations/quotation-draft-recovery.test.ts
src/domain/quotations/standalone.test.ts src/domain/quotations/money.test.ts
src/lib/secure-uuid.test.ts` — 5 fájl / 18 PASS. `npm run typecheck` és
`npm run lint` PASS. Végső `npm run build` és `git diff --check` PASS.
DB/pgTAP/concurrency nem futott újra, quotation backend contract nem
változott. A történetlista csak igazolt standalone quotation azonosítóhoz ad
revíziót. Browser create/reopen/V1–V2/history és project regresszió
**UNVERIFIED**.

Korlát: overview scope-onként maximum 100 sort mutat és a korlátot közli;
további lapozás nincs bekötve. Böngészőn ellenőrizendő a catalog picker,
HTTP-LAN secure UUID runtime, mobil billentyűzet és a teljes Server Action
workflow.

### F9.7.6.6.2a — standalone quotation E2E acceptance

Állapot: **PARTIAL — a teljes authenticated browser acceptance nem bizonyított.**
2026-10-14-én az aktív helyi, hitelesített DEMO sessionben a `/ajanlatok`
betöltött; az üres standalone lista és a meglévő projektajánlatok listája
látható volt. Az „Új árajánlat” link az `/ajanlatok/uj` editorra navigált,
ahol a csak-piszkozat státusz és nettó HUF tájékoztató megjelent. A korábbi
helyi, nem mentett recovery-t elvetettük. Mielőtt az első új DEMO ajánlat
elmentésére sor került volna, a Brave fókusza másik privát ablakra váltott,
egy Google belépési kihívással; a TetőPro ablak visszaválasztása közben az app
újra fókuszt váltott. A belépési kihívást nem kezeltük és hitelesítést nem
kerültünk meg. Nem ismert, hogy az editor mezőibe írási próbálkozás befejeződött-e;
quote vagy revízió mentését nem állítjuk.

Nem bizonyított: V1 mentés/visszaadott ID, reload és újranyitás, anyag- és
munkadíjtételek tartóssága, katalógussor, szerverösszeg, V2, történeti V1,
globális listába visszatérés, projektajánlat megnyitása, konfliktus/pending
viselkedés. Kódhiba nem reprodukálódott, ezért kódmódosítás nem történt;
statikus ellenőrzéseket és backend teszteket nem futtattunk újra. Nincs új
adatbázis-változás.

Javasolt acceptance: nyissuk meg újra a meglévő authenticated helyi DEMO
sessiont, és egyetlen, `DEMO F9.7.6.6.2a E2E` nevű drafton hajtsuk végre a
V1 → reload → V2 → V1 read-only → V2 workflow-t; a kézi ár fiktív DEMO adat,
nettó HUF-ként legyen jelölve.

Javasolt commit: `test(F9.7.6.6.2a): document standalone browser acceptance`.

Javasolt commit: `feat(F9.7.6.6.2): add standalone quotation editor`.

## F9.7.6.6.3.1 — standalone véglegesítés és PDF architektúra

Állapot: **COMPLETE (DESIGN)**. Az aktuális projekt PDF renderer, project
`finalize_quotation`, lifecycle statusok, quotation/revision snapshot, org és
client séma alapján elkészült a végrehajtható F9.7.6.6.3.2 terv a
`docs/QUOTATION_FINALIZATION_DESIGN.md` fájlban. A terv közös React-PDF
renderert, immutable standalone issuance snapshotot, owner/org/scope védett,
expected-version és idempotens finalize RPC-t, valamint on-demand,
`private/no-store` PDF route-ot javasol; a projektútvonal változatlan marad.

Bizonyított: a jelenlegi scope-kötött draft, immutable revision, HUF net/gross
class, server-side `NUMERIC(20,2)` half-up line totals, project finalized
revision pointer és private PDF route. Nem létezik tax rate/category/amount,
issuer address/tax identity, standalone recipient snapshot, human quotation
number vagy validity mező. A `net/gross` nem tax treatment; tax profile és
kiállíthatóság addig blokkolt, amíg könyvelő/adótanácsadó nem erősíti meg a
szabályt. Sem kód, sem migráció, sem PDF/finalize viselkedés nem változott.

Ellenőrzés: releváns workflow/database/progress/test docs, F8.1/F8.3.1/F8.3.2
migráció, Server Action, React-PDF document/adapter és PDF route célzott
ellenőrzése; `git diff --check` PASS. Vitest, typecheck, lint, build, pgTAP,
browser nem futott (docs-only). Nyitott döntés: kibocsátói és címzettminimum,
adóprofil és kerekítés, ajánlatszámozás, érvényességi policy, byte-pontos PDF
archiválási elvárás.

Javasolt commit: `docs(F9.7.6.6.3.1): design standalone quotation issuance`.

## F9.7.6.6.3.2a — quotation document data & issuance foundation

Állapot: **COMPLETE (DOCUMENT FOUNDATION)**. A `20261014040000` additív,
helyi migrációban organization-scoped kibocsátói név/cím/elérhetőség/adóazonosító
mezők és a jövőbeli kiállítási számlálótábla készültek. A draft mentési RPC
server-derived issuer snapshotot, kézi vagy same-org ügyfélből származó
címzett-snapshotot és opcionális referencia/lejárat/megjegyzés/feltétel adatot
ment az immutable revision `input_snapshot.document` mezőjébe. A régi RPC
aláírás delegáló wrapperrel megmaradt. A standalone editorban owner/admin
kibocsátói profil-módosítás, recipient forrásválasztás, dokumentum-adatok és
hitelesített szerveroldali readiness ellenőrzés érhető el; nincs finalize/PDF.

Adatkonzisztencia/jogosultság: issuer oszlopgrant + meglévő owner/admin RLS;
ügyfél részletei kizárólag azonos szervezetből szerveroldalon olvashatók;
kézi címzett nincs `clients` rekordként létrehozva. Issuer és ügyfél módosítása
nem ír át régi revision snapshotot. A sequences táblához auth direct grant
nincs, és draft mentés nem allokál számot. A `canIssue` mindig false; az adó,
finalizálás és számkiosztás konkrét blokkoló marad.

Ellenőrzés: local Supabase migration up 040000/040100/040200 reset nélkül;
célzott 018 + 019 pgTAP 62/62 PASS; `verify-quotation-document-auth.mjs`
helyi valódi Auth 9/9 PASS; érintett Vitest 6 fájl / 25 teszt PASS; typecheck,
lint, Next.js 16.4 webpack build és `git diff --check` PASS. Egy authenticated
Brave smoke-ban a `/ajanlatok/uj` útvonalon mentett `DEMO F9.7.6.6.3.2a UI alap`
V1 azonosítója `ea895051-f0b0-4e21-a833-f40c8a001703` lett; reload után a kézi
címzett és megjegyzés megmaradt, az ajánlat a globális listában látszott, és egy
meglévő projektajánlat szerkesztője is megnyílt. A szerveroldali readiness
ellenőrzés visszajelzett; kiállíthatóságot nem állított. Hosted Supabase, reset,
commit, push és deploy nem történt.

Ismert határ: a 100 elemű recipient selector nem lapoz; nagy ügyfélállományban
bővítendő. A dokumentumszámláló csak szervezetenkénti állapotmező; atomikus
kiállítási művelet, egyedi issuance-szám és stabil issuance rekord még nincs.
Az adókezelés, jogilag kötelező mezők és végleges PDF továbbra is nyitott.

Javasolt commit: `feat(F9.7.6.6.3.2a): persist quotation document snapshots`.

## F9.7.6.6.3.2b — pénzügyi contract, adóalap és kiállítási readiness

Állapot: **COMPLETE (FINANCIAL FOUNDATION)**. A blueprinthez és a designhoz
ellenőrzött dokumentációban nincs könyvelő/adótanácsadó által jóváhagyott
tax-treatment. Ezért nincs kulcs, AAM, fordított adózás vagy mentességszámítás;
az adókezelés explicit unresolved, ismeretlen treatment ID unsupported.

Új lokális `20261014040300` migráció adta a `quotation_revisions` új
`financial_contract` JSONB oszlopát. INSERT trigger a szerveroldali HUF
`price_class`/subtotal alapján rögzíti a source versiont, NET/GROSS input
árbesorolást, besorolástól függő összeget, null tax/null payable mezőt és a
meglévő 6 quantity / 2 HUF scale, line half-up szabályt. Nincs történeti
backfill; meglévő immutability és standalone/project lifecycle RPC-k változatlanok.
Issuer adóazonosító mező továbbra is leíró; nincs tax-default vagy UI-ban
választható, nem végrehajtható mód.

A domain bigint contract megtartja a NET összeget, GROSS inputból nem származtat
NET-et/adót; readiness hitelesített creator + org + standalone quote current
revision, mentett dokumentumsnapshot, line completeness és subtotal egyezést
ellenőriz. Mindenképp `canIssue: false`; tax, sorszám és finalization blocker.
Draft mentés működik, draft/readiness nem incrementál számlálót. Nincs új issuer
adókonfigurációs írható útvonal, SECURITY DEFINER finalize vagy kiadott PDF.

Bizonyíték: lokális migráció `20261014040300` reset nélkül; 018 pgTAP 38/38,
019 pgTAP 29/29 és projekt lifecycle 003+004 pgTAP 19/19 PASS; local Auth JWT issuer owner/member, creator scope,
immutable revisions, no-number checks 9/9 PASS; érintett Vitest 4 fájl/21 teszt
PASS; typecheck, lint, Next 16.4 webpack production build, diff-check PASS. Egy
browser smoke új standalone editoron magyar readiness blokkolókat mutatott, majd
server readiness action elvégezte az ellenőrzést és mentetlen snapshot blockerrel
zárult; piszkozat mentés látható volt. Teljes regresszió és korábbi project PDF
workflow nem futott újra. A Auth szkript kilenc `DEMO` fixture-t hagy a lokális
DB-ben; hosted DB, reset, commit, push, deploy nem történt.

Nyitott accounting döntések: joghatóság és issuer státusz; támogatott tax
treatment ID-k, paraméterek, kulcs/formula, nettó/bruttó árértelmezés és
kerekítés; kötelező issuer/recipient mezők; treatment időbeli hatálya; emberi
ajánlatszám-formátum és érvényességi szabály. F9.7.6.6.3.2c előtt ezek és
atomikus/idempotens issuance + immutable issue snapshot + number allocation
teszt szükséges. Javasolt commit: `feat(F9.7.6.6.3.2b): add tax-neutral quotation financial contract`.

## F9.7.6.6.3.2c — authenticated standalone draft PDF preview

Állapot: **COMPLETE (DRAFT PDF)**. Új, dinamikus `GET
/api/ajanlatok/[quotationId]/pdf?revision=...` route készít on-demand preview-t
az explicit mentett standalone revisionből. Az auth session, aktív org-tagság,
`created_by` és exact revision read ellenőrzött; owner/org/scope mismatch nem
árulja el a quote létezését. `private, no-store`; nincs service role, storage,
migráció, státusz-/revision-/számlálóírás.

A meglévő `renderQuotationPdf` adapter és Noto Sans/A4/React-PDF infrastruktúra
új standalone-draft ágat kapott. Project `QuotationPdfDocument` és route
változatlan. Saved issuer/recipient/document snapshot, exact revision number,
line `unitPrice`/`lineTotal` és DB subtotal jelenik meg; régi customer/catalog
adat nincs olvasva. Csak HUF/net, financial contract/totals/line összegegyezéssel
renderelhető. Minden oldalon látható draft jelölés és rövid tájékoztatás; nincs
VAT, gross/payable, issue date vagy number. Történeti revízió ID explicit.

Bizonyíték: fókuszált Vitest 2 fájl / 9 teszt PASS (PDF contract/render, route
creator/session/org/revision/cache/hiba esetei); 70 soros tényleges PDF 5 A4
oldal, `pdfinfo` és `pdftotext` igazolta a draft notice-t mind az öt oldalon,
a net labels/tételek/összesen tartalmat, valamint a VAT/gross/payable feliratok
hiányát. Authenticated Brave smoke-ban egy fictional DEMO V1 25 000 HUF net
LABOR sort mentettünk, PDF megnyílt, issuer/recipient/item/totals látszott,
szerkesztőhöz visszatérve továbbra is v1/draft. Editor readiness panelje ezen a
DEMO adaton financial completeness/consistency blokkolót mutatott; PDF backend
ugyanakkor a mentett snapshotot elfogadta és renderelte. Ez eltérő readiness
útvonal korlát; `canIssue` mindenképp false. iPad/iPhone és valós Supabase Auth
route integration nem futott (security route mock + authenticated UI smoke).

Futott: `npx vitest run src/features/quotations/standalone-quotation-pdf.test.ts src/app/api/ajanlatok/standalone-pdf-route.test.ts` 8/8; `npm run lint`,
`npm run typecheck`, `npm run build` (Next.js 16.4 webpack). DB/Auth/pgTAP nem
futott, séma nem változott. `git diff --check` dokumentációval együtt fut még.
Hosted Supabase, reset, commit, push, deploy nem történt.

Fennmarad: issuance `canIssue=false`; adójóváhagyás/engine, atomikus finalize,
hivatalos szám és issued PDF nincs. Readiness/UI összegellenőrzés eltérését
külön vizsgálni kell, mielőtt kiállítási feladat indul. Javasolt commit:
`feat(F9.7.6.6.3.2c): preview saved standalone quotation PDFs`.
## F9.7.7.1 — trapézlemez-fedés mennyiségi előnézet

Állapot: **PARTIAL**. Elkészült a tiszta nyeregtető-fedési
motor, a kézi adatokat használó panel, a projektgeometria-editorba és a globális
standalone nyeregtető-előnézetbe illesztve, valamint a sematikus SVG-rács.
Nem készült mentés, gyártói adatmapping, vágási/rendelési terv vagy statikai
funkció. Célzott domain teszt, typecheck, lint, build és diff check sikeres.
UI-komponens teszt és böngészős smoke nem futott, ezért az acceptance nincs teljesen
bizonyítva. Részletes állapot a TEST_MATRIX-ben.


## F9.7.7.2a — trapézlemez-fedés mentési backend

Állapot: **PARTIAL**. Elkészült a project/standalone save action, current/historical read és authorized list backend; a közös immutable calculation revision modellhez és `calculation_dependencies` táblához csatlakozik. A standalone forrás a normalizált kézi geometria; projektforrás egy konkrét ellenőrzött roof-model revision és hozzárendelt `roof.gable` calculation revision. A TypeScript szerver action újraszámol, a read model pedig visszaolvasáskor ellenőrzi a tárolt outputot. `INVALID` és `UNSUPPORTED` nem menthető, `INCOMPLETE` megkülönböztetett `user_provided` státuszt kap.

Új additív migráció tartalmaz expected-version RPC-t és operation-ID idempotencia-ledgert; a konkurencia és RLS Auth-integráció azonban nincs adatbázisban bizonyítva. További kritikus korlát, hogy a DB RPC nem reprodukálja a covering numerikus képleteket: authenticated direkt RPC hívással az output meghamisítható, ezért a kért DB-határ még nem szerverautoritatív. A migrációlista és local Supabase állapot egyszeri vizsgálata Docker socket permission hibát adott; nem próbáltam resetet vagy ismételt Docker-hozzáférést. Frontend mentés, takeoff, hosted DB, böngésző, valódi kétkapcsolatos concurrency ellenőrzés nem futott.

Célzott Vitest: 2 fájl / 9 teszt PASS (domain és mentési szerződés); `npm run typecheck`, `npm run lint`, `npm run build` és célzott ESLint PASS. Ez nem DB/Auth/regressziós bizonyíték. Következő technikai kapu: formula-duplikáció nélküli authenticated DB boundary megoldás és valódi local pgTAP/Auth/two-connection tesztek; ezt követheti F9.7.7.2b UI.

Javasolt commit: `feat(F9.7.7.2a): persist trapezoidal roof covering revisions`.

## F9.7.7.2a.1 — secure persistence completion

Állapot: **COMPLETE (BACKEND)** a helyi környezetben. A még nem alkalmazott `20261014050000` migrációt a biztonságos írási határral javítottuk, majd helyben alkalmaztuk. A szerveroldali TypeScript számolás után csak a külön DB login hívhatja az író RPC-t; az `authenticated` direkt RPC és covering táblamutáció tiltott. A DB actor tagságot, standalone creatort, projekt orgot és pontos roof revision + roof.gable dependencyt ellenőriz. A meglévő immutable calculation revision modell, expected revision és operation ledger újrahasznosítva.

Bizonyíték: célzott pgTAP 1 fájl / 9 teszt PASS; valós helyi Supabase Auth/RLS integráció 2 teszt PASS, benne szerver action projekt- és standalone mentés, közvetlen hamis numerikus RPC `42501` és nulla hamis rekord, cross-org/creator/revoked tag elutasítás, V1/V2 történet, history mutáció elutasítás, idempotencia. Két külön bejelentkezett DB kapcsolat lock alatt ténylegesen átfedett: egyik V2 mentés sikeres, másik `40001`; azonos operation ID két párhuzamos hívása egy V3-at adott (`reused=false/true`). Domain és érintett workflow Vitest: 6 fájl / 20 teszt PASS. Typecheck, lint, production build és diff-check PASS; a célzott tesztek nem teljes regressziók. Hosted migráció és frontend UI nem része ennek a mérföldkőnek. A helyi teszt DEMO fixture-eket hagyott a helyi DB-ben.

Javasolt commit: `fix(F9.7.7.2a.1): secure covering persistence and verify revisions`.

## F9.7.7.2b — trapézlemez-fedés mentés és revízió UX

Állapot: **COMPLETE (FRONTEND IMPLEMENTATION)**. A közös fedési panel standalone és projekt módban a meglévő, biztonságos Server Actiont használja. Elkészült V1/V2 mentés, URL-alapú újranyitás, projekt tetőmodellhez kapcsolt lista, történeti input/eredmény/SVG, módosítási állapot, revízióváltási figyelmeztetés, elavult forrás és kifejezett legfrissebb tetőrevíziós újraszámítás. A globális `Mentett számításaim` lista a tényleges registry ID-t és szűrőt használja. A forrásválasztás hibáját javítottuk: vegyes dependency-k esetén a `roof.gable` számítást keresi. Az architektúra a meglévő calculation/revision/dependency és creator-scoped RLS modellt használja, közvetlen böngészős DB írás nincs.

Helyi, hitelesített Brave smoke: standalone DEMO V1 mentés, oldalfrissítés, V2 mentés, V1 input/20 db/SVG és V2/40 db visszaváltás, lista/szűrő; projekt DEMO V1 mentés és újratöltés, pontos V4 tetőforrás; nem mentett módosítás figyelmeztetésének megszakítása és visszatöltése PASS. Helyi DB read-only vizsgálat: a projekt snapshot roof revision, dependency upstream roof revision és `roof.gable` calculation revision azonos forrásláncot alkot. iPad/iPhone Safari, valódi hálózati megszakítás és konkurens böngészőmunkamenet UI-ellenőrzése nem futott. Hosted Supabase, migráció, reset, commit, push és deploy nem történt. A fedési anyagkimutatás-átadás és gyártói igazolás későbbi fázis.

Javasolt commit: `feat(F9.7.7.2b): add trapezoidal covering save and revision UX`.

## F9.7.7.3a — projekt fedésből takeoff piszkozat

Állapot: **COMPLETE (TAKEOFF BACKEND)** a támogatott egyszerű kiosztásra. A
hitelesített szerver action a felhasználó által megadott pontos projekt,
fedési calculation/revision és katalógusvariáns alapján a szerver által mentett
snapshotból képez egy új draft takeoffot. A kliens nem ad mennyiséget vagy
snapshotot; a DB transaction ellenőrzi a tagságot, projektet, revisiont,
roof modelt és `roof.gable` függőséget. Az operation ID retry ugyanazt a draftot
és sort adja; payload-eltérés elutasított. Nincs automatikus jóváhagyás vagy
ajánlatkészítés. A source item snapshotja immutable.

Mennyiség: `piece` (db), a mentett teljes lemezszám. Teljes hosszú, egy sor/sík
kiosztás támogatott. A 110 m² példa névleges lemezterülete csak technikai adat,
nem rendelési mennyiség/veszteség. Csak aktív orgbeli `roof_covering` vagy
`sheet_metal` darabárus variáns fogadható; ismert méretek egyeznek, hiányos
variánsméret kézi felhasználói társításként jelölt. Ár nincs hozzárendelve.
Többsoros, toldott/átlapolt vagy kétértelmű darabjegyzék nem támogatott.

Az exact fedési revízió, tetőmodell/revízió, geometry calculation revision,
input/output és katalógussnapshot eltárolódik. Elavult tetőnél a történeti forrás
megmarad, stale állapot látható. Nincs külön takeoff revision tábla a meglévő
sémában; az új átadás új draft takeoff ID, a meglévő approval/version életciklus
használatával.

Helyi additív migráció `20261014060000` reset nélkül alkalmazva. 021 pgTAP
33/33 PASS, beleértve explicit approval utáni idempotens retryt és annak
ellenőrzését, hogy külön átadás új piszkozatot hoz létre, az approved takeoffot
pedig érintetlenül hagyja. Valós helyi Auth/RLS action teszt 3/3 PASS; az unauthorized org,
direct authenticated RPC és historical V1 transfer eseteit ellenőrizte.
Két writer kapcsolat ugyanazon operation key lockjára egyszerre várt; az
eredmény egy takeoff ID és egy item ID, create/reuse `true/false`. Domain,
action, read model és korábbi takeoff regression, typecheck/lint/build/diff
ellenőrzések eredménye a TEST_MATRIX-ben. Frontend választó UI nincs ebben a
feladatban. Hosted DB, reset, commit, push és deploy nem történt.

Javasolt commit: `feat(F9.7.7.3a): create takeoff drafts from saved roof covering`.

## F9.7.7.3b — trapézlemez-fedés anyagkimutatás UX

Állapot: **COMPLETE (LOCAL UX SCOPE).** A projekt
tetőmodell mentett fedési revíziójából megnyitható az új piszkozat megerősítő
ablaka. A felület a kiválasztott pontos fedési és tetőrevíziót, a mentett
darabszámot és méreteket, a források eredetét, a stale állapotot, a kompatibilis
aktív műhely katalógusvariánsokat, azok méretadatait, provenance-át és
ár-elérhetőségét mutatja. Csak `roof_covering`/`sheet_metal`, `piece` variáns
ajánlható fel; ismert méreteltérés nem választható.

Nem mentett tető- vagy fedésmódosításnál a párbeszédablak kimondja, hogy a
kiosztás a mentett revízióból készül, és kifejezett választást kér; a mentési
gombra fókuszáló út is elérhető. A kliens nem számol mennyiséget: a meglévő,
szervezetet, projektet, exact forrásrevíziót és variánst ellenőrző Server Action
kapja meg az azonosítót/nevet/variánst, az adatbázis a mentett snapshotból hozza
létre az új draftot. A biztonságos operation ID kétértelmű hálózati retrykor és
azonos payloadnál megmarad; forrás- vagy választásváltás új műveletet jelent.
Siker után a létrejött takeoff pontos útvonala nyílik meg. Jóváhagyás, ajánlat,
korábbi takeoff módosítása és adatbázisséma-változás nem része a felületnek.

Újrahasznosított architektúra: a 3a action/RPC és takeoff route, a 2b mentett
fedési revision/read model, a meglévő szervezeti RLS katalógusolvasás és a
`generateSecureUuid`. A DB/RLS/action/idempotencia bizonyíték változatlanul a
3a mérföldkőben rögzített helyi teszt; ebben a UI körben DB nem változott.

Ellenőrzés: célzott Vitest 4 fájl / 15 teszt PASS; `npm run typecheck`,
`npm run lint`, `npm run build` és `git diff --check` PASS. Egy helyi hitelesített
workflow-ban a V1 / 26 db / 7000 mm fedésből DEMO `piece` variánssal új draft
keletkezett, a felület a pontos `?takeoff=922e2bd4-e8a9-468f-8a1c-989e12dda677`
takeoff URL-re navigált; a státusz draft, a forrásadat és a hiányzó ár látható.
Az eltérő hosszú, 6500 mm-es DEMO variáns a megerősítő választóban nem jelent meg.
A helyi katalógusban DEMO termék/variáns és egy új DEMO draft maradt. DB/RLS/
idempotencia külön nem futott újra, mert séma nem változott; ezek a 3a bizonyítékai.
Ez nem teljes regresszió. Hosted DB, commit, push és deploy nem történt.

Javasolt commit: `feat(F9.7.7.3b): add covering to takeoff creation UX`.

## F9.7.7.4a — cserepeslemez-fedés motor és előnézet

Állapot: **COMPLETE (ENGINE + PREVIEW)**. Elkészült a tiszta, determinisztikus `roof.gable.metal-tile-covering` számítás domain-regisztrációval; a bemenet a valós `roof.gable` inputot és külön termékadat-snapshotot fogad. A motor kezeli a két azonos tetősík felületét, effective szélességből számított egész oszlopokat, teljes lemezszámot, fizikai lemezből képzett névleges területet, külön effective fedési hosszt, explicit végi ráhagyást, gyártói hosszkorlátot és modulkompatibilitást. Toldott/többsoros vagy elégtelen teljeshosszú kiosztás nem kap darabszámot.

A projekt tetőszerkesztő élő, aktuális `roof.gable` geometriával mutatja az előnézetet, a `/kalkulatorok/cserepeslemez` útvonal pedig kézi tetőinputból ugyanazt a motort használja. A közös felület jelzi a geometriát és termékadat eredetét, a státuszt és a feltételes mennyiséget; a sematikus SVG csak VALID állapotot rajzol, az explicit oszlopokat és modulvonalakat jeleníti meg. A felület nem ment, nem ír DB-t, és nem állít gyártói vagy szerkezeti megfelelőséget.

Bizonyíték: `npx vitest run src/domain/calculations/gable-metal-tile-covering.test.ts src/features/roof-models/gable-metal-tile-covering-preview.test.ts` — 2 fájl / 11 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; `/kalkulatorok/cserepeslemez` route megjelent) és `git diff --check` PASS; a diff csak a célzott motor, preview, navigáció és dokumentáció fájljait érinti. Hitelesített böngészős smoke: UNVERIFIED, a CUA böngészőleltárban nem volt nyitott tab/session, ezért meglévő hitelesített munkafolyamat nem volt elérhető. DB/RLS/pgTAP nem alkalmazható, nincs adatváltozás. Korlát: aszimmetrikus/törött tető, nyílások, több lemezsor, toldás, gyártói/terhelési/telepítési igazolás, mentés és anyagkimutatás nincs támogatva.

Javasolt commit: `feat(F9.7.7.4a): add metal tile covering engine and preview`.

## F9.7.7.4b.1 — cserepeslemez perzisztencia

Állapot: **COMPLETE (BACKEND)**. Az új, `roof.gable.metal-tile-covering` mentési szerződés a meglévő immutable calculation/revision/dependency táblákat és külön idempotencia-ledgert használja. A szerver minden kérést normalizál és újraszámol; csak `VALID` eredmény menthető. Standalone mentés creator-scoped kézi geometriát tárol. Project mentés a kliensgeometriát figyelmen kívül hagyja, és az exact verified roof-model revision, hozzá kötött `roof.gable` calculation/revision és az input snapshot alapján számol. A revision rögzíti a termék- és modulparamétereket, a fizikai/effective lemezhosszt, adatforrását, outputot és provenance-t. Katalógus, gyártói profil, ügyfél vagy ajánlat nem szükséges; név hiányakor a szerver általános kalkulátorcímet ad.

Biztonság: új migráció `20261015050000_gable_metal_tile_covering_persistence.sql` forward-only és reset nélkül alkalmazva a lokális Supabase-en. Új RPC-t csak a meglévő `tetopro_covering_writer` hívhatja, közvetlen táblajog nélkül; `authenticated` direct RPC és írás tiltott. Az RPC actor membershipet, standalone creatort, projektet és exact forrás-dependencyt tranzakcióban ellenőriz; a shared revision immutability változatlan. A műveleti ledger és expected-revision lock az idempotens retryt és versengő módosítást rendezi.

Ellenőrzés: `npx supabase test db --local supabase/tests/database/022_gable_metal_tile_covering.sql` — 1 fájl / 12 teszt PASS. `RUN_LOCAL_METAL_TILE_TESTS=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/domain/calculations/gable-metal-tile-covering.test.ts src/features/roof-models/gable-metal-tile-covering-preview.test.ts src/features/roof-models/gable-metal-tile-covering-persistence.test.ts src/features/roof-models/gable-metal-tile-covering.local.integration.test.ts` — 4 fájl / 18 teszt PASS; benne valódi helyi Auth/RLS és két külön PostgreSQL kapcsolatos konkurenciateszt. Egy első integrációs futás egy túl szigorú RLS UPDATE assertiont talált; javítás után az integráció 3/3 és az összesített suite 18/18 PASS. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Hosted DB, reset, frontend UX, commit, push, deploy nem futott. A random azonosítós, DEMO tesztfixture-k a helyi adatbázisban maradtak.

Javasolt commit: `feat(F9.7.7.4b.1): persist metal tile covering revisions`.

## F9.7.7.4b.2 — cserepeslemez mentési és revíziós UX

Állapot: **COMPLETE (FRONTEND IMPLEMENTATION)**. A meglévő panelhez calculation ID-s standalone újranyitás, mentett számításlistás szűrés/link, immutable V1/V2 előzményválasztó, aktuális revízióra visszalépés, stale projektforrás-jelzés, explicit aktuális forrásválasztás és nem mentett standalone kilépési figyelmeztetés készült. A kötelező fedési hossz, eresz-/gerincvégi ráhagyás és átlapolás jól jelzett adat; csak a határértékek és modulparaméterek kerültek a részletek közé. A mentés az authenticated Server Actiont használja.

Ellenőrzés: 5 célzott preview Vitest PASS (revízió saját geometriája/eredménye/SVG-je és változatlan operation ID retry); typecheck, lint, Next.js 16.4.0 production build és `git diff --check` PASS. Valós local Auth munkamenetben standalone V1 → reload → V2 → V1 → V2 és mentett lista → direkt újranyitás PASS. Projekt tetőmodellhez V1/V2 mentés, reload, V1 történeti visszaolvasás PASS; read-only DB ellenőrzés igazolta a `roofModelRevisionId` exact mentett forrását, V2 hasznos szélességét és szerveroldali 28-as darabszámát. Backend/RLS/concurrency nem változott; a 4b.1 valós local Auth/RLS és két PostgreSQL-kapcsolatos bizonyítéka érvényes, DB suite nem futott újra. Külön iPad/iPhone QA nem futott. Helyi DEMO rekordok maradtak.

Javasolt commit: `feat(F9.7.7.4b.2): simplify metal tile save and revisions`.

## F9.7.7.4c.1 — cserepeslemez → anyagkimutatás backend

Állapot: **COMPLETE (TAKEOFF BACKEND)**. A projekt cserepeslemez mentett revíziójából új takeoff draft készül a meglévő trapézlemez restricted-writer/lifecycle mintáján. A transfer validator az exact source snapshotot a TypeScript motorral újraszámolja; az RPC külön ellenőrzi project/org tagságot, saved source/dependencyt, teljes egysoros darabszámot, fizikai/effective méretet, katalógusegyezést és modul-szerződést. A `piece` mennyiség `totalSheetCount`; area-to-piece átváltás nincs. Az item snapshot immutable, ár/approval automatikus hozzárendelése nincs. A takeoff read model részletezi a hosszak, modulok és provenance adatait; új UI nem készült.

Bizonyíték: `20261015060000_gable_metal_tile_takeoff_draft.sql` reset nélkül alkalmazva a helyi Supabase-en. A `022_gable_metal_tile_takeoff.sql` 33/33 és a meglévő `021_gable_covering_takeoff.sql` 33/33 pgTAP assertion PASS; a két független DB-kapcsolatos race 1 create + 1 retry/reuse eredményt és 28 db-ot adott. 5 célzott Vitest fájl / 22 teszt PASS. Typecheck, lint, production build és `git diff --check` PASS. A race teszt a korábban létrehozott helyi projektforrást használja; pgTAP valós local Auth subject/RLS role-t vizsgál. Hosted, reset, commit/push/deploy nem történt.

Korlát: anyagkimutatás UX, standalone → projekt konverzió, több sor/toldás, gyártói kompatibilitási tanúsítás és ár továbbra sincs. A helyi DB-ben a pgTAP fixture-ek tranzakciója rollbackelt; a kétkapcsolatos teszt DEMO katalógusadatát és draftját eltávolította.

Javasolt commit: `feat(F9.7.7.4c.1): transfer metal tile sheets to takeoffs`.

## F9.7.7.4c.2 — cserepeslemez takeoff egyszerűsített UX

Állapot: **COMPLETE (TAKEOFF FRONTEND)**. A projekt cserepeslemez-előnézetéből egy művelettel nyitható draft-készítő párbeszéd készült. Megjeleníti a mentett forrásrevisiont, a szerveroldali mennyiséget, lemezméreteket, moduladatot, termékeredetet és ár-elérhetőséget. Mentetlen tetőgeometriánál explicit megerősítést kér a mentett snapshot használatára. Az aktív `piece` termékvariánsok szűrése az ismert szélesség-, hossz- és moduladatokat veti össze. A meglévő transfer Server Action ment, siker után megnyitja a projekt anyagkimutatását. Az ár nélküli és nem gyártó által igazolt DEMO provenance látható marad; a draft nem kap automatikus jóváhagyást.

Bizonyíték: célzott Vitest 5 fájl / 19 teszt PASS, benne trapéz UI regresszió, exact forrásrevision, darabszám, termékkompatibilitás, retry ID és dialogtartalom. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Hitelesített helyi böngészőben a projekt `1340d579-d1b1-496c-a3c5-1f7e75019413` fedési V2 revisionje (`15d60e59-b0a9-461d-92e0-3111ba3bff4d`) exact roof V4 (`d11e0843-91bb-4089-b245-ad0879fbfb4b`) alapján 28 db-ot mutatott; az ár nélküli DEMO variánssal draft `2dc9db5c-ba1a-40dc-af91-927cffc04b25` jött létre és megnyílt a takeoff oldalon. A helyi DEMO termék/variáns és draft megmaradt. A backend nem változott, ezért a 4c.1 valós local Auth/RLS és két DB-kapcsolatos bizonyítékát használjuk; hosted DB, reset, commit, push, deploy nem futott.

Javasolt commit: `feat(F9.7.7.4c.2): simplify metal tile takeoff UX`.

## F9.7.8.1 — helyszíni felmérés MVP

Állapot: **COMPLETE (FIELD SURVEY MVP; LOCAL AUTH/RLS + BROWSER)**. Elkészült a
standalone vagy opcionálisan projekthez kötött felmérés lista, új felmérés és
újranyitható szerkesztője. A négy kezdő munkatípushoz szerkeszthető mérési
sablonok vannak; több sor, explicit egység, opcionális megjegyzés és nagy,
mobilra tördelődő vezérlők használhatók. A mentés V1/V2 verziózást alkalmaz,
dupla küldést blokkol, dirty állapotot és mentési/hibajelzést mutat, stale
mentésnél pedig konfliktust jelez. A projekt egy mentés után immutable link.
Mérési adatok nem lesznek automatikusan kalkulátoradatok.

Biztonság: a `20261015070000_field_surveys.sql` migrációt helyi Supabase-re
reset nélkül alkalmaztam. A felhasználói szerep csak RLS-szűrt SELECT-et kap;
írás kizárólag a `save_field_survey` RPC-n keresztül, actor/org/project és
szerveroldali mérésegység-validációval történik. Standalone hozzáférés creator
scope-os, projektre szervezeti tagság szükséges. Várható verzióval a párhuzamos
szerkesztés stale írását visszautasítjuk.

Bizonyíték: local pgTAP `023_field_surveys.sql` 24/24; két külön DB sessionből
végrehajtott versenyben 1 update sikerült és 1 stale konfliktust kapott.
Önálló authenticated Brave smoke: `93b3e45b-f86b-433e-a01e-16727d9c64e9`,
V1 → refresh/reopen → edit → V2, majd refresh; 9.1 m, 4.2 m és DEMO megjegyzés
megmaradt. Projekt smoke: `dd2f7790-0ed6-460e-8ba5-4371a91d7742`, projekt
`1340d579-d1b1-496c-a3c5-1f7e75019413`, V1 után refresh/reopen; 6.8 m,
3.4 m és DEMO megjegyzés megmaradt, a kapcsolt projekt látható. A Vitest,
typecheck, lint és webpack production build eredményét a tesztmátrix rögzíti.

Korlát: fizikai iPhone/iPad vizsgálat, kamera/fotó, offline működés, kalkulátor-
átadás és hosted Supabase nem része/ellenőrzése ennek a mérföldkőnek. Helyi DEMO
felmérések megmaradtak. Javasolt commit: `feat(F9.7.8.1): add field survey MVP`.

## F9.7.8.2 — felmérési fotók és kalkulátor-átadás

Állapot: **COMPLETE (FIELD SURVEY PHOTOS & HANDOFF, LOCAL)**. Elkészült a
privát, többképes feltöltés opcionális leírással, előnézettel, újrapróbálással
és visszavonható eltávolítással. A fotóműveletek immutable survey revisiont
hoznak létre, a korábbi fotóhivatkozás megmarad. A felmérésből kézi
megfeleltetéssel nyitható a meglévő eresz-, nyeregtető- és szegélykalkulátor;
csak szemantikai típus/egység alapján ad át adatot, üres mezőt nem tölt ki
feltételezéssel. Forrásfelmérés és verzió jelölve, az eredeti felmérés
változatlan.

Biztonság: négy előrehaladó, helyi migráció reset nélkül; privát Storage
bucket, creator-scope standalone és aktív tagságú projekt-hozzáférés, RLS,
korlátozott restricted-writer RPC-k, fájlsignatúra és méretellenőrzés,
expected-version konfliktus. A közvetlen kliens-metaadatírás és író RPC
hívás tiltott. A tárolási INSERT policy a helyi Supabase metadata-context
eltérés miatt a szerveroldali pending foglalást és actor/survey/org kapcsolatot
ellenőrzi; MIME/méret ellenőrzés a bucket és API feladata.

Bizonyíték: `024_field_survey_photos_handoff.sql` + `023_field_surveys.sql`
55/55 pgTAP PASS; két független DB-session versenyben egy update és egy stale
konfliktus. Fókuszált Vitest 6 fájl/27 teszt PASS; typecheck, lint, production
build és diff-check PASS. Hitelesített helyi böngésző: eresz DEMO V1→V5,
fotófeltöltés és frissítés utáni visszaolvasás, mentett V2 adatból 3 ereszszál;
tető DEMO V1-ből 100 m² és 36,87°. Cross-org GET 403. Hibás PNG-tartalom
elutasított. Egy eltávolított fotó revision-története megmaradt.

Korlát: legacy survey-k korábbi historyja nem rekonstruálható; HEIC nincs
támogatva (JPEG/PNG/WebP, max 10 MB). Fizikai iPhone/iPad QA és hosted DB nem
futott. DEMO Auth és survey adatok, valamint lokális képek megmaradtak; hosted,
reset, commit/push/deploy nem történt. Javasolt commit:
`feat(F9.7.8.2): add survey photos and calculator handoff`.

## F9.7.8.3 — helyszíni felmérés mobil használhatósága

Állapot: **COMPLETE (MOBILE READINESS IMPLEMENTATION, LOCAL)**. A mobil űrlap
érintésre méretezett mezőket, numerikus billentyűzetet, magyar tizedesvesszőt,
összecsukott opcionális részleteket és jól látható mentést kapott. A fotópanel
feltöltési állapotot, várakozó fájlokat, újrapróbálást és elvetést mutat; a
mentetlen mérések és folyamatban lévő műveletek navigációja védett. A korábbi
felmérésverzió saját mérését, megjegyzését és fotóját jeleníti meg, pontos
verziójú kalkulátorátadással. A JPEG/PNG/WebP képet a szerver valódi tartalom
alapján dekódolja és EXIF nélkül újrakódolja, legfeljebb 40 megapixel és
10 MB tárolt méret mellett. A helyi Sharp nem dekódol iPhone HEIC-et;
az alkalmazás ezt elutasítja, és JPEG-exportot javasol.

A `20261015110000_field_survey_save_retry.sql` előremenő helyi migráció
stabil, kliens által választott UUID-t és azonos tartalmú V1/V2 válaszvesztés
utáni idempotens ismétlést ad. Eltérő payloadra megmarad a konfliktus.
RLS, privát Storage és restricted writer változatlan.

Bizonyíték: `023`–`025` helyi pgTAP 68/68; két független DB-kapcsolatos
konkurenciateszt PASS. Fókuszált Vitest 10 fájl/42 teszt, typecheck, lint,
production build és diff-check PASS. Hitelesített helyi Brave DevTools
iPhone 16 Pro Max 440×956: standalone DEMO felmérés
`2a4b7f08-4218-44d8-b52a-3d256599a171`, V1 8,7 m, JPEG V2, reload,
9,1 m-es V3, reload, V3 kalkulátorátadás 9100 mm; iPad Mini 768×1024
kalkulátornézet. Egy korábbi DEMO felmérés V2-ben képet, V3-ban üres
fotóállapotot mutatott. Fizikai Safari/iPhone/iPad: **UNVERIFIED**.
Kézi elfogadás: valódi iPhone-on JPEG kamerakép, HEIC útmutatás, megszakított
mobiladat-feltöltés/újrapróbálás és V1/V2 fotóváltás; iPaden szerkesztés és
kalkulátorátadás. Offline működés és hosted Supabase nem ellenőrzött.
Javasolt commit: `feat(F9.7.8.3): harden mobile field surveys`.

## F9.7.9 — egységes helyszíni felmérési munkafelület

Állapot: **COMPLETE (UNIFIED SURVEY WORKSPACE, LOCAL)**.

Megvalósult: kiemelt Új felmérés és legutóbbi felmérések a dashboardon;
egyazon survey alatt több elnevezhető/rendezhető/eltávolítható tető-, eresz-,
szegély- és egyéb munkaszakasz. Szakaszonkénti mérések, megjegyzések,
engedélyezett fotókapcsolatok, kitöltetlen értékek veszteségmentes mentése.
A helybeni kalkulátorpanel az adott pontos survey snapshotot használja;
átvett/kézzel módosított érték, hiányzó adat, előnézet és mentett eredmény
megkülönböztetett. Az összesítő lezárás nélkül elérhető, ismert egységű
mentett eredményeket, régi forrást és hiányokat mutat. Projekt és ajánlat
külön vagy együtt választható, meglévő jogosult projekt is kapcsolható.
A projekt nélküli ajánlat tényleges standalone DRAFT, a közös út projekt-DRAFT.
Üres projektajánlat a szerkesztőben sem mutat megtévesztő 0 HUF összesítést.

Újrahasznosítás: eredeti survey/fotó/immutable revision; meglévő
gutter/flashing/roof.gable/trapézlemez/cserepeslemez motorok, kalkulátor-
komponensek és secure save actionök; eredeti projektmodell, standalone és
projekt quotation RPC-k és szerkesztők. Nincs párhuzamos kalkulátor-,
pénzügyi vagy ajánlatszerkesztő-architektúra és nincs mesterséges tetőmodell.
A geometria önállóan előnézet marad; a támogatott fedési eredmény menthető.

Adatkonzisztencia/jogosultság: forward-only nullable `sections` bővítés;
legacy és history nincs átírva. A flat mérések és szakaszok egyezése constraint.
Exact calculation revision és explicit append-only followup kapcsolatok;
original survey/project ownership változatlan, régi eredmény nem frissül
csendben. Creator-scope, aktív tagság, cross-org izoláció, forrásrevízió-párok,
privilegizált írás tiltása helyben bizonyított. Survey sorzár és természetes
idempotencia akadályozza a dupla projekt/ajánlat/link létrehozást. A projekt
sikerét későbbi ajánlathiba nem törli; az action részleges eredményt ad és
ismételve folytatja. Session-szintű user/org/survey draft recovery, pending/
error/conflict kezelés; fotólista nem emeli csendben az expected versiont.

Bizonyíték: célzott regresszió 44 fájl/196 PASS; utolsó érintett futás
9 fájl/38 PASS. Külön opt-in valós helyi Auth/Storage/action/read-model
integráció 3/3 PASS; végleges új pgTAP 41/41 és 223 változatlan DB-regressziós
assertion PASS. Öt monitorral igazolt kétkapcsolatos lock contention PASS.
Typecheck, lint, production build és diff-check PASS. Egy hitelesített helyi
Brave workflow több szakasz, reload, ereszszámítás mentés/link, összesítő,
projekt+ajánlat, retry és ajánlat-újranyitás; Back utáni 11 m draft recovery,
V2 szerkesztés és régi V1 számítás/ajánlat megőrzés. A konkrét rekordokat
SQL-lel is visszaolvastuk; azonosítók és pontos parancsok a TEST_MATRIX-ben.

Korlátok: ez célzott, helyi elfogadás; teljes repóregresszió, fizikai mobil,
Safari és hosted környezet nem ellenőrzött. Nincs automatikus pénzügyi vagy
anyagtétel-import mérésből, önálló geometriarevízió-mentés, offline sync vagy
ajánlatkiállítás. Ezek elkülönített támogatási határok. A helyi DEMO fixture-ek
megmaradtak. Hosted módosítás, reset, commit, push, deploy nem történt;
`.DS_Store` érintetlen.

Következő ajánlás: fizikai iPhone/iPad helyszíni próba JPEG-feltöltéssel,
megszakított hálózattal és a két fedési kalkulátor felhasználói elfogadásával.
Javasolt commit: `feat(F9.7.9): unify field survey workspace`.

## F9.7.10 — valós helyszíni munkafolyamat és mobil UX

Állapot: **COMPLETE (LOCAL WORKFLOW HARDENING)**; fizikai iPhone/iPad elfogadás külön **UNVERIFIED**.

Hitelesített, helyi Brave production workflow: fiktív **DEMO** tetőfelújítás; tető 10×6 m és 4 m emelkedés, eresz 8,5 m/4000 mm-es választott szál, szegély 10 m, privát DEMO PNG. A tetőkalkulátor a hiányzó három túlnyúlást jelezte; eredményt nem találtunk ki. A helybeni ereszbecslés 3 szálat adott; a szegélybecslésnél a 2000 mm kézi DEMO szálhossz mellett ismeretlen toldási kapcsolat miatt darabszám nélkül, figyelmeztetéssel mentettünk. Mindkét számítás újranyílt. Az összesítőből projekt és üres, ár nélküli projektajánlat-piszkozat jött létre, újranyílt, majd frissítés után is megmaradt. A tető 11 m-es V4 módosítása után a számítások és followupok változatlanul a pontos V3 forráshoz kötődtek. SQL-visszaolvasás: felmérés `185aa689-134e-4852-988b-3a7a67abe5c6`, V3 revízió `d79571ee-2ca2-4d68-9d9b-22853baefdca`; eresz `a867e8dd-0fd3-4d6e-99b5-1e8f02e8bb14`, szegély `e64a4ff1-fd6f-49ae-89e3-3452f472c9dc`; projekt `4f56501f-a8ba-432e-9b8e-e4369fe6165c`, ajánlat `23617226-2c02-47d5-ad9d-d365f1ae6d14`, 0 tétel és `subtotal=null`. Ismételt létrehozási kattintás után is 1 projekt/1 ajánlat maradt.

Megfigyelt és javított UX: a szegélysablon első, irreleváns üres szélességmérése helyett a szakaszhossz indul; az új szakasz egy kattintással felvehető, a mérésérték előtérben, a ritka beállítások csukva. Az üres opcionális kalkulátorrészek nem fedik el a fő bemenetet. A fotó feltöltés után automatikusan az aktív szakaszhoz jelölődik, külön mentési CTA mutatja a tényleges kapcsolási lépést, és a kis fájl mérete olvasható. Az összesítő közvetlen újranyitást ad, az exact forrásazonosítók részletekben maradnak, elkészült projekt/ajánlat esetén nincs ismételt létrehozási választó. Reprodukált első mentés utáni tetőre ugrás: a `section` URL-paraméter javításával a szegély aktív maradt az új DEMO V1 mentés és reload után. Reprodukált V1 utáni nem mentett draftvesztés: a recovery kulcs most a tényleges mentett survey ID-hoz kötődik; böngészős reload után a 11 m visszaállítható volt.

Meglévő survey/fotó/immutable revision, kalkulátormotorok, projekt/ajánlat actionök, RLS és idempotencia újrahasznosítva; DB-séma és backend szerződés nem változott. Az új DEMO szegély-felmérés `872e7a5e-fbdd-4e9e-a571-9f2c9274752a` V1→V3 útján a fotófeltöltés V2-je után a kapcsolási CTA V3-at mentett; reload a szegélyt és 1 fotót mutatott. A nem mentett kalkulátor bezárása figyelmeztetett. Mobil Brave-emuláció: iPhone SE 375×667, iPad Mini portré 768×1024 és tájkép 1024×768, asztali 932 px; oldalszélesség = viewport. Az iPhone SVG 720 px-es rajza 267 px-es saját görgetőben maradt. Érintő célok és mentés/fotófeltöltés iPhone-on 52–53 px; összesítő és kapcsolt akciók láthatók. Ez Chromium-emuláció, nem fizikai Safari.

Fókuszált Vitest 10 fájl/44 PASS, lint, production build, külön typecheck és diff-check PASS; pontos parancsok a TEST_MATRIX-ban. Auth/RLS/konkurencia szerződés változatlan, ezért a F9.7.9 bizonyítékát hivatkozzuk, nem nevezzük új futásnak. Brave offline mód mellett egy fotó POST-ja hálózati hibával megszakadt, a kép sorban maradt és az újrapróbálás gomb megjelent. Visszakapcsolt hálózaton a retry egyetlen új JPEG-et töltött fel (V4), a kapcsolási CTA V5-öt mentett; reload után a szegély és mindkét kép megmaradt. A nyers angol `Failed to fetch` helyett magyar, teendőt jelző hibaüzenet jelent meg a friss production build külön böngészős offline próbájában is; a várakozó kép elvetése után figyelmeztetés nélküli reload megőrizte V5-öt. Fizikai billentyűzet/kamera és helyszíni elfogadás nyitott.

Fizikai iPhone/iPad checklist: Safari portré/tájkép navigáció és érintőcélok; magyar tizedesvessző és numerikus billentyűzet fel-le; kamera JPEG feltöltés, kapcsolás és reload; mobiladat-megszakítás/újrapróbálás; SVG vízszintes görgetés, sticky mentés; összesítőből projekt/ajánlat és mentett számítás újranyitása. Hosted változtatás, reset, commit, push, deploy nem történt; `.DS_Store` érintetlen. Javasolt commit: `fix(F9.7.10): harden mobile field survey workflow`.

## F9.8 — anyagkimutatás és ajánlat-előkészítés

Állapot: **COMPLETE (LOCAL WORKFLOW HARDENING)**. A kijelölt, jóváhagyott
anyagkimutatások kompatibilis tételei pontos decimális összegzéssel kerülnek
a meglévő ajánlatpiszkozatba. Méret, termékváltozat, egység vagy specifikáció
eltérése külön sort tart; ismétlődő forrástétel nem dupláz. Az ár eredetét,
hiányát vagy keveredését a felület jelzi; hiányzó árhoz nem készül összeg.
Revízió- és forrás-snapshot változatlanul visszakövethető. Szerveroldali
ellenőrzés érvényesíti a jóváhagyást, projektet, mennyiséget és forrásokat.
Az ajánlatlétrehozás műveletkulcsa idempotens; azonos kulcsú eltérő tartalom
konfliktus.

Hitelesített helyi DEMO workflow: jóváhagyott Anyagkimutatás V2 két
forrástételéből 171,875 + 2,5 = 174,375 m²; a snapshotban szereplő
15 000 HUF/m² nettó ár változatlanul került át. Az egysoros projekt-DRAFT
2 615 625 HUF nettó összeggel mentés után frissítést és újranyitást is túlélt.
SQL-visszaolvasás: ajánlat `e02eccb3-1813-4058-b7ca-dc6db2f6f0da`, `draft`,
1. revízió; az azonos műveletkulcs megismétlése után is 1 ajánlat/1 revízió.
Mindkét forrástétel és a pontos kalkulációs revízió megmaradt. A régi
forrásrevizió stale állapota látható.

Javított súrlódás: korábbi snapshotmezők miatt a termék és változat
„ismeretlenként” jelent meg; a read model most a DEMO katalógusból olvasható
címkét ad, de az eredeti snapshot marad a bizonyító forrás. Az ajánlati
mértékegység magyar feliratot kapott, a forrás részletekben nyitható, az üres
ár nem jelenik meg nullaként, hiányzó kötelező árnál a mentés tiltott.
Kis nézetben egyoszlopos beviteli űrlap és könnyen elérhető mentés jelenik
meg; klienszár és DB-műveletkulcs védi az ismételt küldést.

Automatizált bizonyíték: teljes Vitest 87 fájl/334 PASS, 18 SKIP; fókuszált
aggregáció 5/5; helyi pgTAP `027` 15/15 (összeg, forrás, retry, konfliktus,
jogosultság, immutabilitás); typecheck, lint, production build és diff-check
PASS. Adatbázis-reset nem történt.

Hitelesített Brave-emuláció: iPhone 16 393×852, iPad Mini portré 768×1024 és
tájkép 1024×768, valamint desktop; a nézetek használhatók, vízszintes
oldaltúlcsordulás nélkül. Frissítés utáni ajánlatnyitás működött. Ez
Chromium-emuláció, nem fizikai eszközteszt. Fizikai checklist: Safari
portré/tájkép és billentyűzet; numerikus mezők/tizedesbevitel; kamera JPEG;
megszakított mobilhálózat és újrapróbálás; forrás, számítás és ajánlat
újranyitása. Fizikai iPhone/iPad: **UNVERIFIED**. Hosted DB és offline sync
nem tesztelt. Hosted változás, reset, commit, push, deploy nem történt.
`.DS_Store` érintetlen. Javasolt commit:
`feat(F9.8): prepare takeoff materials for quotation drafts`.

## F9.8.1 — beszerzési és műhely-előkészítés

Állapot: **COMPLETE (LOCAL WORKFLOW)**; fizikai iPhone/iPad **UNVERIFIED**.

Hitelesített helyi workflow a meglévő DEMO projektben: jóváhagyott
„Anyagkimutatás” takeoff kiválasztása, beszerzési tétel ellenőrzése, külön
kézi DEMO műhelyfeladat felvétele műszaki méretek kitalálása nélkül, lista V1
mentése. V2-ben a beszerzési állapot „Megrendelésre előkészítve”, a műhely
„Gyártás alatt” lett; oldalfrissítés után mindkettő és a korábbi V1 is
megmaradt. A hiányzó hossz/szélesség/vastagság/profil/anyag pontosan
figyelmeztetésként jelent meg. A CSV valóban letöltődött, BOM/ pontosvessző,
174,375 m², 1 db, kategória, állapot és kézi eredet adatokkal. A Nyomtatás
vezérlő elindította a natív nyomtatási folyamatot; a párbeszédablak automation
oldali blokkolása miatt papírra vagy PDF-be nyomtatás nem történt.

Read-only SQL-ellenőrzés: lista `f4b30050-0c52-4e22-a73b-cc7211f1296e`, V2,
2 append-only revision; V1 és V2 forrása az `Anyagkimutatás` takeoff
`5d4b73bc-bf31-4e3b-9c3b-274bc14ee457`, pontos calculation revision
`948cdda2-cd4f-4ec2-bc4d-9c558a67ca84`. V2: 174.375000 square_meter,
`prepared`; DEMO műhelytétel 1.000000 piece, `in_progress`. A takeoff
korábbi kalkulációhoz kötődött; az elavultság látható és a régi snapshot nem
változott. Helyi DEMO fixture-ek megmaradtak.

Javított, böngészőben reprodukált hibák: a kézi tétel hozzáadása után
kiürülő `required` mezők blokkolták az egész lista mentését; a tételfelvétel
helyi ellenőrzése megmaradt, az űrlapszintű kötelezőség megszűnt. A forrásból
származó sor törlése a forrásválasztás módosítása nélkül hibás payloadot
eredményezett; eltávolítás csak kézi soron lehetséges. A mentetlen változás
most reload és belső navigáció előtt is figyelmeztet. Alapmezők egyszerűk,
műszaki részletek csukhatók, mentés/státusz érintőcéljai legalább 48/44 px.

Adatmodell: új forward-only migráció, szerveroldali Zod + authenticated
Server Action, RLS-es olvasás, közvetlen írás tiltva, DB RPC idempotens
kéréskulccsal és expected-version konfliktussal, változatlan revision
history. Az aggregator csak egyező termék/változat/méret/specifikáció/egység
tételeket von össze; draft takeoff csak ELŐZETES. Nincs új ár vagy gyártási
méretlogika.

Bizonyíték: teljes Vitest 88 fájl/337 PASS, 5 fájl skip/18 teszt skip;
pgTAP `028_material_preparations.sql` 31/31; helyi Auth/RLS és külön
adatbázis-kapcsolatos konkurencia 4 jogosultsági ellenőrzés, azonos kulcsú
újrapróba egy revíziót ad, versengő V2-ből egy mentés és egy `40001` konfliktus.
`npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS.
Hitelesített Chromium-emuláció: iPhone 375×812, iPad portré 768×1024,
tájkép 1024×768, desktop 1365×900; vízszintes overflow nincs. Ez nem Safari
és nem fizikai eszköz. CSV export ellenőrzött, nyomtatás-párbeszédben
automatizálási korlát maradt.

Fizikai checklist: Safari portré/tájkép, státusz és mentés érintéssel;
magyar tizedesbillentyűzet; nyomtatási margók és CSV megnyitása Files-ben;
elavult forrás figyelmeztetése/új jóváhagyott takeoff frissítése; hálózati
megszakítás után mentési állapot. Fizikai készülék nincs tesztelve. Reset,
hosted módosítás, commit, push, deploy nem történt; `.DS_Store` érintetlen.
Javasolt commit: `feat(F9.8.1): add procurement and workshop preparation`.

## F9.9 — okos tetőgeometria és kapcsolt munkafolyamatok

Állapot: **COMPLETE (SMART ROOF WORKFLOW, LOCAL)**; fizikai készülék **UNVERIFIED**.
A meglévő `roof.gable` motor, SVG, projekt- és standalone eresz/szegély/fedési
kalkulátor, felmérési munkaszakasz, mentett revízió és Auth/RLS szerződés
maradt az alap. Új tetőtípus vagy motor nincs. A kétsíkú nyeregtető külön
eresz-, gerinc- és oromélei stabil revízión belüli azonosítóval jelennek meg a
rajzon és a mobilon érinthető listában. Kijelölt élből készül előtöltés; a
hiányzó túlnyúlás, csatornarendszer, lefolyó, profil vagy toldás nem lesz
kikövetkeztetve.

Hitelesített helyi DEMO böngészős munka: új felmérés, explicit 10×6 m épület,
4 m emelkedés, 0 mm túlnyúlások; 100 m² tető, 2×10 m eresz, 10 m gerinc és
4×5 m oromél. Kapcsolt DEMO projektből mentett tető V1; bal 10 m eresz →
ereszkalkulátor V1, jobb 10 m eresz hozzáadása → V2, két 5 m oromél →
szegélykalkulátor V1. A meglévő fedési oldal ugyanazt a tetőrevíziót és 5 m
ferde hosszt használja; termékadat hiányában fedési darabszám nem készült.
Felmérés V4-ben a hossz 11 m lett, tető V2 110 m²-t ad. A régi eresz 2×10 m és
szegély 2×5 m változatlanul megnyílik, mindkettő elavult forrást jelez.
Az eresz explicit frissítése 2×11 m-es V3-at mentett; a V2 történetileg megmaradt,
a DEMO név és új forrás oldalfrissítés után is visszatöltődött. Projekt nélküli kézi eresz (8500/4000 mm → 3 szál)
és szegély előnézet is működött; ismeretlen toldásnál nincs darabszám.

Helyi SQL-visszaolvasás: felmérés `609aa221-2dd2-4d30-ab86-9a2a75de5601`,
tető V1 felmérés V1-hez, tető V2 felmérés V4-hez kapcsolódik. Az eresz V1/V2
számításrevíziói a felmérés V2-höz és az eredeti tetőrevízióhoz kötöttek;
V2-ben `left-eave` és `right-eave` külön 10 000 mm. Szegély V1 a felmérés
V3-hoz, két külön 5000 mm-es oromélhez és régi tetőrevízióhoz kötött. A
restricted SQL író elutasítja a nem aktuális, másik szervezeti/projektbeli vagy
hamisított geometriát; immutable history és expected revision megmaradt.

Böngészőben javított: újonnan mentett tető azonnali, pontos felmérésverziós
forrásjelzése; a már felvett eresz nem jelenik meg újra hozzáadhatóként;
mindkét eresz választható a meglévő munkaszakaszban és a projektoldalról indított átadás a régi sorok megőrzésével bővít; újranyitott szálhossznál és mentett számításnévnél
nincs hamis „hiányzó adat” jelzés; 19 px-es szegély-eltávolítógomb 44 px-es
mobil érintőcél lett. Chromium/IAB emuláció: 390×844, 768×1024, 1024×768 és
1440×900; dokumentumszintű vízszintes overflow nincs, mobil numerikus mezők
és fotógomb 52 px, élgombok 48 px, művelet 44 px. SVG/lista kijelölése
szinkron. Ez nem fizikai Safari teszt. Fizikai checklist: iPhone/iPad Safari
portré/tájkép, numerikus billentyűzet, SVG/lista érintés, kamera JPEG,
mentés/újranyitás és megszakított hálózat utáni újrapróbálás.

Fókuszált Vitest 32 PASS; az opt-in helyi Auth/Storage teszt külön
3/3 PASS. Helyi pgTAP `029` 9/9, `030` 7/7, módosított `009` 21/21, valamint
`026`+`023`+`011` 84/84 PASS. Két valódi kapcsolatos eresz- és
felméréskonkurencia-ellenőrzés PASS. `npm run typecheck`, `npm run lint`,
`npm run build`, `git diff --check` PASS. Hosted DB, fizikai készülék és
offline sync nincs ellenőrizve. Reset, commit, push, deploy nem történt;
`.DS_Store` érintetlen. Javasolt commit:
`feat(F9.9): reuse verified roof edges across survey workflows`.

## F9.10 — többtetős geometria és vizuális tetőválasztás

Állapot: **PARTIAL** a teljes elfogadási lista szerint. A hét deklarált tetőforma (félnyereg, nyereg, konty, sátor, félkonty, L, T) közös vizuális választója működik új projekt-, önálló és felmérési tetőnél. A hat új paraméteres forma síkpoligonokat, valódi területet és típusos, szomszédos síkokhoz kötött éleket képez; L/T esetén a metsződő síkok felosztásával kerülhető el a fedvény kétszeri számlálása. A meglévő nyeregtető-motor maradt az egyetlen nyeregtető-számító forrás.

Az SVG és érinthető lista ugyanazokat az élazonosítókat jelöli. A mentett projektélek közül kiválasztott eresz csatornakalkulátorba, a gerinc/orom/konty/vápa/supported eresz a szegélykalkulátorba jut. A pontos tetőmodell- és számításrevízió, élazonosító, mm hossz és felülírási állapot visszakövethető; a hiányzó csatorna- és termékadat nem lesz kitalálva. A nem nyeregtetős fedési kiosztás tiltott. Felmérésben típusfüggő mérési szerepek, projektkapcsolás, mentett tetőforrás és kapcsolt eresz-/szegélyszámítás működik. Önálló és projektmentés újraolvasható; projekt- és önálló geometriánál read-only történeti revíziórajz választható az immutable inputból újraszámolva.

Biztonsági javítás: a korábbi `save_gable_roof_calculation` authenticated RPC-jogát a `20261015160900` lokális migráció visszavonta. A nyeregtető is szerveroldali számítás után, csak a korlátozott íróloginon át, műveletazonosítóval és expected revision ellenőrzéssel menthető. Restriktív RLS tiltja a böngésző közvetlen `roof.gable` modell-, számítás-, revízió- és függőségírását. A hat új forma írója ugyanezt a határt követi. Hosted migráció nem történt.

Bizonyított: hét fájl / 36 célzott Vitest PASS, benne L/T mintavételes hézag- és átfedésellenőrzés; a helyi, opt-in integrációs suite 4/4 PASS, benne direkt RPC- és táblaírás-elutasítás, idempotens retry, stale/konkurens revízió és pontos forrás. `npm run typecheck`, `npm run lint`, `npm run build --webpack` a végső kódhoz közeli állapotban PASS; a legutolsó élazonosító-séma bővítés után a célzott Vitest újra PASS, teljes build nem ismételve. Böngészőben hip standalone mentés/újranyitás, T felmérésből eresz V1 és vápa V1 mentés, valamint L projekt V1 mentés/újranyitás igazolt. A nyeregtető új, lezárt íróútja DB-integrációval PASS, de a végső böngészős save az ugyanazon `.next` könyvtárat használó fejlesztői/production szerver ütközése miatt nem lett megerősítve. Mobil/tablet méretváltás a böngészőben nem volt elérhető; félkonty, sátor és félnyereg valós böngészős mentési flow nem futott. A teljes regresszió és a hosted DB nem ellenőrzött. Emiatt COMPLETE nem adható. Commit, push, deploy, reset nem történt. Javasolt, nem végrehajtott commit: `feat(F9.10): add verified multi-roof geometry workflows`.

## F9.10.1 — navigáció és tetőválasztás UX

Állapot: **PARTIAL**. A route-ok, az org-paramétert megőrző dashboard linkek,
auth/middleware és a helyi szerverek vizsgálata nem talált reprodukálható
projektnavigációs hibát. A forrás szerinti szerverek a projekt saját
checkoutjában futottak; nem állítottam le őket. Külön, `/private/tmp` alatti
izolált lokális példányon hitelesített böngészőben a Dashboard → Projektek →
meglévő projekt → új tető útvonal működött.

Új tetőnél a közös hétkártyás `RoofTypeSelector` az első nézet; méretmező csak
forma kiválasztása után jelenik meg. A projekt- és önálló nyeregtető, valamint a
hat paraméteres űrlap kapott figyelmeztetett visszalépést tetőforma-választásra;
az új survey tető is választással indul. Meglévő survey tetőméretek szerkeszthetők,
de új forma választása összecsukott beállításban marad. A felmérő a már tesztelt
F9.10 geometriai motort használja az előnézethez, csak teljes és érvényes mérésnél
mutat eredményt. A F9.10 írói, forrásrevíziói, jogosultságai és adatbázis-sémája
nem változott.

Valós böngésző: Dashboard, Projects lista, projekt részlete, új projekt-tető
választó; a hitelesített új survey útvonal hét kártyát és nulla méretmezőt
mutatott. Projektben nyeregtető kiválasztása után az input, 10 000 × 6 000 mm
és 45° adatok, SVG, felület, vetület, gerinc/eresz és élkijelölés látható.
Projektmentés és újranyitás ennél a futásnál nem lett végigpróbálva. A későbbi
böngésző-tab parancsok az oldal interakciójához nem adtak vissza állapotfrissítést;
a Statsig hálózati kéréseit Cloudflare blokkolta.

Ellenőrzés: fókuszált Vitest 4 fájl / 20 PASS; `npm run typecheck`,
`npm run lint`, izolált forrásmásolaton `npm run build` (Next.js 16.4.0 webpack),
`git diff --check` PASS. A CSS 560 px alatt egyoszlopos visszalépés-gombot ad.
Fizikai mobil/tablet és böngészőnézet-emuláció nem futott. Standalone kalkulátor,
survey tetőforma kiválasztás utáni dimenziófolyamat, mentett/revíziós roof újranyitás, a hat további forma valós
böngészős űrlap/eredmény, csatorna/szegély handoff és teljes Auth/RLS regresszió
ellenőrizetlen. Hosted DB, reset, commit, push és deploy nem történt; `.DS_Store`
érintetlen. Javasolt commit: `fix(F9.10.1): restore selector-first roof workflows`.

## F9.10.2 — professzionális tetőválasztó és teljes integráció

Állapot: **PARTIAL** a hét forma teljes, külön-külön browser save/reopen
elfogadásához; a kritikus integrációk működnek. A közös selector alapfelirata
`Válaszd ki a tető típusát`, egyetlen új-tető belépési pontot használ a
standalone és projekt workflow, a survey ugyanazt a `RoofTypeSelector`-t kapja.
A kalkulátorok áttekintő belépője most hét tetőformát és a méretezett rajzot
nevezi meg, nem csak nyeregtetőt. A kártyák teljes gombfelülete kattintható,
billentyűzettel és érintéssel működik; a meglévő topológiai SVG-k, fókusz- és
kiválasztott állapotok megmaradtak.

Valós hitelesített helyi böngészőben: Dashboard → Projektek és Dashboard →
Kalkulátorok működött szervezeti query-paraméterrel. A hét kártya dimenziómezők
nélkül jelent meg. Standalone félnyeregtető 10 000 × 6 000 mm, 35° mentése
`DEMO F9.10.2 selector smoke` névvel sikeres; reload után a selector kimaradt,
a Félnyeregtető editor, mentett revízió, SVG és kiválasztható élek visszanyíltak.
Projektben ugyanez `DEMO F9.10.2 projekt smoke` névvel sikerült; reload után
közvetlenül a mentett típusos editor nyílt. Új survey-ben a Félnyeregtető
választása után 10 000/6 000/35 adatokból 73,246 m² előnézet és műszaki SVG
jelent meg; Enterrel mentve V1 létrejött, reload után a selector összecsukva,
a mentett előnézet megmaradt. A gable 10 000/6 000/3 000 mm előnézete 84,853
m² felületet és 60 m² vetületet adott; élkijelölés látszott.

Automatizált bizonyíték: selector/geometria/dashboard/standalone/survey fókuszált
Vitest 5 fájl / 26 PASS; local Auth/RLS roof integration 4/4 PASS; `npm run
typecheck`, `npm run lint`, friss izolált forrásmásolaton `npm run build`
(Next.js 16.4.0 webpack) és `git diff --check` PASS. A hét forma geometriai
fixture-jeit a domain suite lefedi; a F9.10 writer, RLS, history, expected
revision és handoff kódja változatlan. Fizikai eszköz, teljes viewport-emuláció,
mind a hét forma külön browser save/reopen, gable covering regresszió teljes
browser útja és a későbbi browser automation interakciók egy része nem bizonyított.
Hosted DB, reset, commit, push és deploy nem történt; `.DS_Store` érintetlen.
Javasolt commit: `fix(F9.10.2): integrate professional roof selector workflows`.

## F9.11 — professzionális tetőmérés és intelligens UX

Állapot: **PARTIAL**. A meglévő hétforma selector-, geometria-, SVG-, mentés-
és revízióarchitektúrára építve létrejött a közös `MeasurementGuidance` réteg.
Fókuszált mezőnél magyarul megjelenik a mérés helye, jelentése, egysége és a
vízszintes/függőleges/ferde konvenció. A `TechnicalDrawing` a hozzá tartozó
méretvonalat vagy szögjelet kiemeli; az L/T szárny szélessége és kinyúlása
külön méretvonal. Pitch és félkonty-magasság esetén a felülnézet helyett
kiegészítő metszeti útmutató jelenik meg, így nem készül hamis végpont.

A hét forma mezői explicit magyar egységet és típusfüggő magyarázatot kaptak.
A nyeregtető magasság/szög módja továbbra is kölcsönösen kizáró, a többi
forma csak a tényleges geometry contract mezőit kéri. A multi-form eredmény
megjeleníti a számított vetületet, felületet, síkszámot, vápatartalmat és a
modell referencia-szintjéhez viszonyított legmagasabb geometriai pontot.
Szerveroldali számítás, Auth/RLS, source revision és handoff kód nem változott.

Bizonyíték: célzott 7 fájl / 35 Vitest PASS, `npm run typecheck`, `npm run lint`,
`git diff --check` és friss izolált Next.js 16.4.0 webpack production build PASS.
Hitelesített helyi böngészőben a félnyeregtető méretfókusz, útmutató, aktív SVG-
méretvonal és 73,246 m² eredmény látszott. A hét forma gyors végigkattintása
CDP időkorlátba futott; ezt nem jelölöm PASS-ként. Fizikai mobil/tablet és mind
a hét forma külön save/reopen browser flow nincs lezárva. Hosted DB-t nem érintettem.
Javasolt commit: `feat(F9.11): add roof measurement guidance UX`.

## F9.12 — product integration és workflow hardening

Állapot: **PARTIAL**. A dashboard helyszíni belépője a szervezethez kötött
felmérés workflow; a mentett felmérések a meglévő Felmérések felületen érhetők el.
A meglévő `/felmeresek/uj` útvonalat és az opcionális projektválasztást változatlanul
használtam, ezért projekt vagy ügyfél nélkül is menthető és később folytatható a
felmérés. A tető selector-, mérési,
SVG-, számítás-, mentés- és revíziós réteghez nem készült párhuzamos motor.

Automatizált bizonyíték: dashboard, measurement guidance és geometriai célzott
suite 3 fájl / 19 PASS; `npm run typecheck`, `npm run lint`, `npm run build`
(Next.js 16.4.0 webpack) és `git diff --check` PASS. A meglévő F9.10 local
Auth/RLS integration és eresz/szegély handoff tesztek változatlanul a korábbi
revízió- és jogosultsági szerződéseket fedik.

Browserben az új dashboard belépő és az org query-kód ellenőrzött; a korábbi
hitelesített roof selector, valid számítás, save/reload és handoff bizonyítékok
újrahasznosíthatók. A hét forma külön browser save/reopen, teljes survey →
project → takeoff → quotation út és mobil emuláció ezen a mérföldkövön nem lett
lezárva; ezért teljes acceptance PASS nem adható. Hosted DB, reset, commit,
push és deploy nem történt. Javasolt commit: `feat(F9.12): harden dashboard and roof workflow integration`.

## F9.12.1 — dashboard kártyarács javítása

Állapot: **IMPLEMENTED**. A korábbi külön Gyors felmérés panelt és beágyazott
előzménylistát eltávolítottam. A meglévő hat funkciókártya maradt az egyetlen
belépő; a helyszíni kártya első helyre került, neve „Gyors felmérés”, útvonala
`/felmeresek/uj?organization=...`. A kártyaméret, ikon, stílus és reszponzív
rács változatlan.

Javasolt commit: `fix(F9.12.1): correct dashboard survey card layout`.

## F9.13 — valós munkafolyamatok célzott keményítése

Állapot: **PARTIAL**. A gyors felmérés tetőforma nélkül is menthető: egy
tetőfelújítás nélküli ereszcserénél korábban a tető munkaszakasz kötelező
modellválasztása blokkolta a mentést. A roofType nélküli részleges adatot most
az editor és a szerveres survey szerződés is elfogadja; az összesítő jelzi,
hogy tetőszámításhoz később választható forma. Az üres felmérés nem vetít
automatikusan nyeregtető-méreteket.

A helyi, hitelesített DEMO-ban a gyors ereszfelmérés 4 érdemi művelettel
menthető volt (gyors felmérés megnyitása, ereszszakasz hozzáadása, egy hossz
megadása, mentés); tetőmodell, ügyfél, projekt és katalógus nélkül. A mentett
6,4 m adat átkerült az ereszkalkulátorba; hibás 0 mm szálhossznál a mentés
leállt, javítás után 3 szál / 400 mm maradék lett, lefolyó nélkül. V1 mentés
és összesítő bizonyított. Opcionális jegyzetet is rögzítettünk. Refresh utáni
visszanyitás korábban sikerült ezen a standalone útvonalon.

A nyeregtetős DEMO útban a roof type → mérési útmutató és SVG, 10/6/3 m
méretek, 300 mm túlnyúlások és a geometriai eredmény látszott. A szerveres
felméréskapcsolat elsőre elutasította a hiányzó, null pitch sablonmező miatt;
az új forward-only migráció ezt az üres alternatív mérési módot kihagyja,
közben a duplikált szemantikus kulcsokat továbbra is ellenőrzi. Újrapróbálva a
kapcsolat sikerült. Két ereszél kijelölése után a kalkulátor mindkét 10,6 m-es
geometriai forrást átvette; a DEMO 3000 mm kereskedelmi szálhosszra 8 ereszszál
becslést számolt, 0 lefolyóval. A forrásrevíziók megmaradtak. A projekt-scope
számítás összesítő linkje eddig hibásan standalone oldalra ment; most eresz- és
szegélykalkulátornál projekten belüli, számítás- és revízióazonosítós útvonalra
mutat. Ennek friss böngészős visszanyitása nem bizonyított.

Az önálló szegélymunka 2,5 m DEMO hosszal tetőgeometria nélkül menthető volt.
Egyedi profil és 2000 mm-es DEMO szálhossz megadásával a számítás menthető,
de ismeretlen toldási/átfedési kapcsolat mellett a darabszám helyesen HIÁNYOS
maradt; gyártói adat vagy átfedés nem lett kitalálva. A refresh utáni
visszanyitás ezen az úton nincs igazolva.

Ellenőrzés: 3 Vitest fájl / 14 PASS, `npm run typecheck`, `npm run lint`,
izolált forrásmásolaton `npm run build` Next.js 16.4.0 webpack és
`git diff --check` PASS. A helyi `multi-roof.local.integration.test.ts`
Auth/RLS és secure roof writer tesztje 4/4 PASS. A DB teszt célzott futása
0/7 esetnél megállt, mert a régebbi `030_survey_roof_source_link.sql` teszt a
visszavont `save_gable_roof_calculation` RPC-t hívja; helyi migrációt a
tesztfutás nem végzett. Az újrapróbálás böngészős bizonyítéka és az általános
Auth/RLS teszt megvan, de a null alternatív mező közvetlen SQL tesztje hiányzik.
Mobil viewport és fizikai eszköz UNVERIFIED; teljes háromworkflow acceptance
ezért nem COMPLETE. Hosted DB, reset, commit, push, deploy nem történt.

Javasolt commit: `fix(F9.13): unblock survey and preserve calculator navigation`.

## F9.13.1 — napi workflow acceptance lezárása

Állapot: **COMPLETE (helyi DEMO)**. A `030_survey_roof_source_link.sql`
teszt a visszavont `save_gable_roof_calculation` RPC helyett a jelenlegi
`save_gable_roof_calculation_secure` íróutat használja tranzakciós,
`tetopro_covering_writer` szerepkörrel; az authenticated közvetlen privilegizált
RPC-hívás továbbra is tiltott. A javított SQL futás 8/8 PASS.

A gable tetőél → meglévő F9.9 szegélykalkulátor átadás most ugyanazon
korlátozott szerveroldali íróutat használja, mint a többtetős élek. Helyi,
hitelesített DEMO-ban a bal első ferde oromél 4667 mm-es geometriai forrása,
az exact tetőrevízió és a `Tetőgeometria` mérési forrás megmaradt. Projektben a
szegélyszámítás V2 frissítés után újranyitható; ismeretlen toldás mellett a
darabszám hiányos marad.

Az önálló szegélyszámítás 2,5 m-es méréssel, 2000 mm DEMO szálhosszal,
tető/projekt nélkül V1-ben mentve, frissítés után újranyitva igazolt. A forrás
és a mért hossz megmaradt, darabszámot a rendszer nem fabrikált.

Újraellenőrzött: célzott Vitest 3/14 PASS, helyi Auth/RLS 4/4 PASS,
typecheck, lint, izolált production build és `git diff --check` PASS. A
Workflow A korábbi böngészős bizonyítéka megmaradt. Mobil/fizikai eszköz,
hosted DB és deploy továbbra sem ellenőrzött; commit/push nem történt.

Javasolt commit: `fix(F9.13.1): complete daily workflow acceptance`.

## F9.14 — független mérnöki számítási audit

Állapot: **COMPLETE (LOCAL CALCULATION AUDIT)**. Mind a hét tetőformához
production függvény nélküli, kézzel levezetett DEMO referencia készült. A
fixture-ek területet, vetületet, hajlást és minden releváns élhosszt rögzítenek;
az audit külön shoelace/3D vektorterületet, síkhatár-szomszédságot,
önmetszésmentességet és 3×/9× skálázást ellenőriz.

A meglévő trapézlemez, cserepeslemez, eresz, szegély és profil golden tesztek
igazolták a deklarált tartományt és a biztonságos hiányos/unsupported
állapotokat. A mennyiség- és egységtesztek megőrzik a mm/m/m²/piece jelentést,
a tizedes aggregációt, a stale forrásjelzést és az inkompatibilis snapshotok
szétválasztását. Igazolt P0/P1 hiba nem került elő, ezért production képlet,
perzisztencia és jogosultság nem változott. A részletes bizonyíték a
`CALCULATION_VERIFICATION_MATRIX.md` fájlban található.

Futtatva: fókuszált Vitest 20 fájl / 147 teszt PASS; `npm run typecheck`,
`npm run lint`, izolált Next.js 16.4.0 webpack production build és
`git diff --check` PASS. A perzisztencia/security szerződés nem változott,
ezért új Auth/RLS vagy konkurenciateszt nem volt indokolt.

Fizikai eszköz és browser smoke nem futott, mert felhasználói számítási
viselkedés nem változott. Hosted DB, reset, commit, push és deploy nem történt.
Javasolt commit: `test(F9.14): add independent calculation audit fixtures`.

## F9.14.1 — kompakt, interaktív tetőmérési UX

Állapot: **COMPLETE (UI + célzott regresszió)**. A nyeregtető projekt- és
standalone űrlap, a hat többtetős kalkulátor, valamint az egységes felmérési
tető-előnézet kompakt, reszponzív mérőrácsot kapott. A fókuszált mező rövid
magyar útmutatást ad, a közös F9.9 `TechnicalDrawing` kiemeli a megfelelő
méretvonalat, és az input után közvetlenül jelenik meg. Az eredmények a rajz
alatt maradnak; a rajz részletes nézetei és eszközei elérhető összecsukható
vezérlőkben. A számítási, mentési, revízió- és élkijelölési logika nem változott.

Hitelesített helyi böngészőben a nyeregtető standalone űrlap 1440/768/390/320
px nézetén rendre 4/3/2/2 oszlopot és 16 px-es mezőszöveget mutatott, vízszintes
túlcsordulás nélkül. 320 px-en fókuszváltás után a `buildingLengthMm` SVG-méret
kiemelése és a mezőfókusz megmaradt. A survey tetőelőnézetet is mértem mind a
négy méreten. Helyi DEMO nyeregtető-felmérés V1 mentése, refresh és visszanyitás
után a 10/6/3 m méretek, egységek, 84,853 m² előnézet és SVG megmaradt.

Futtatva: célzott Vitest 6 fájl / 23 teszt PASS, typecheck, lint, Next.js
16.4.0 webpack production build és `git diff --check` PASS. A projekt gable és
hat többtetős forma input → rajz → eredménysorrendje komponens-teszttel
ellenőrzött; standalone gable és survey SSR regresszió PASS. Fizikai iPhone/iPad, külön
projektben végzett browser save/reopen és hosted DB nem ellenőrzött. A böngésző
által készített próba helyi DEMO surveyként megmaradt; éles vagy hosted adatot
nem érintettünk.

Javasolt commit: `feat(F9.14.1): compact interactive roof measurement UX`.

## F9.14.2 — globális Liquid Glass UX és egységes munkaterület

Állapot: **PARTIAL (UI rendszer + hitelesített helyi smoke)**. Közös felületi
tokenek és `glass-navigation` / `glass-toolbar` primitívek egységesítik a
navigációt, eszköztárakat, gombokat, fókuszt, mezőket, állapotokat és
felületeket. Az adatot hordozó űrlapok, rajzok, eredmények és táblák átlátszatlan
felületet kapnak; glass blur csak a navigációs és interaktív chrome-on jelenik
meg, fallback, reduced-motion/transparency és increased-contrast szabályokkal.

A `RoofWorkspace` közös kompozíciót használja a felmérés, projekt/standalone
nyeregtető és a hat többtetős forma: kompakt mezők → SVG → eredmény → mentés.
A felmérés meglévő mezői és mérési szerepei maradnak az egyetlen piszkozat;
SVG-méret billentyűzetről vagy pointerrel a hozzá tartozó mezőt fókuszálja. A
L/T geometriai feltételezés és a fedési/anyagpanel az eredmény után,
progresszív disclosure-ban marad.

Hitelesített local DEMO-ban a survey 10/6/3 m és 0 mm eresz-/oromtúlnyúlással
V1-ben ment, frissítés után ugyanazok az értékek, SVG és 84,853 m² jelent meg.
Dashboard, projekt tetőűrlap, standalone gable, projekt eresz/szegély,
anyagkimutatás, katalógus, ajánlatpiszkozat, beszerzés és kivitelezés böngészőben
megnyílt. A roof mérőrács 1440/1024/768/390/320 px-en 4/4/3/2/2 oszlopos,
mindegyiken 16 px-es mezővel, 44 px-es fő vezérlőkkel és dokumentum-túlcsordulás
nélkül. Az ellenőrzött egyéb oldalak 320 px-en sem lógtak ki.

Futtatva: célzott Vitest 6 fájl / 21 teszt PASS, `npm run typecheck`,
`npm run lint`, Next.js 16.4.0 webpack `npm run build` és `git diff --check` PASS. Nincs képlet-,
domain-, mentési action-, Auth/RLS-, adatbázis-, pénzügyi vagy adószemantikai
módosítás; nincs migráció, reset, commit, push vagy deploy.

**Nem igazolt:** előtte-képpár (F9.14.2 előtti screenshot nem készült),
Safari és fizikai eszköz, külön projekt/standalone mentés-újranyitás, dialog
billentyűzetútvonal és képernyőolvasó, reduced-motion/kontraszt preferencia
valós emulációja, valamint hosted DB. A böngészősmoke ezek miatt nem teljes
elfogadási regresszió; az állapot nem COMPLETE.

Javasolt commit: `feat(F9.14.2): unify global glass UX and roof workspace`.

## F9.14.3 — Liquid Glass vizuális audit és UX finomítás

Állapot: **COMPLETE (UI + célzott regresszió)**. A kritikus elfogadási
feltételek local browserben és célzott automatizált ellenőrzéssel igazoltak.
Állapotfelmérés után a `RoofWorkspace` meglévő mérési és rajzkomponense egy
közös, visszafogott felületbe került. A tetőformás gyorsfelmérés külső kártyája
lapos; eltűnt a külön „Mérések” címsor, a kompakt rajzból a „Rajzok” felirat és
a látható, ismétlődő méretösszefoglaló. Az SVG, eredmények, fókuszkiemelés,
eszközök és mentési műveletek a meglévő architektúrán maradtak. 350 px alatt a
felmérési mérőrács egy oszlopos, mert a 320 px-es audit két oszlopban címke- és
beállítási zsúfoltságot mutatott.

Hitelesített local böngészőben előtte/utána képernyőképek készültek a
felmérésről, standalone nyeregtetőről, projekt tetőmodellről, dashboardról és
anyagkatalógusról. A dashboard jóváhagyott 6 kártyája és sorrendje megmaradt;
az öt DEMO anyag kártyái, valamint a gyártó űrlap önálló üzleti egységek,
ezeket nem lapítottam el. A standalone és survey egységes tetőfelülete világos
és sötét témában is olvasható; a korábbi sötét téma vissza lett állítva.

Valós viewport-ellenőrzés: 1440/768/390/320 px-en 4/3/2/1 mérési oszlop,
16 px-es input, dokumentumszintű vízszintes túlcsordulás nélkül. A survey
mezőstrip és a rajz címsora közötti rés 1440-en 9 px, 768-on 9 px, 390-en
7 px. A 1440 px survey előtte-mérés 194 px input→canvas távolságához képest az
utána 63 px-re csökkent; a maradékot a rajz címsora/eszköztára foglalja el.
Building length mező fókusza az SVG `buildingLengthMm` vonalát kiemelte, a
mező fókuszban maradt. Helyi, „DEMO F9.14.3” megjegyzésű survey V1 mentés, reload
és felméréslistából újranyitás után a 10/6/3 m, 0 mm értékek, 84,853 m² és SVG
megmaradt. Az ellenőrző rekord ID-je: `e2060324-914b-4d45-a011-3e4c07fb3f31`.

Az előtte/utána screenshotokat a browserben vizuálisan ellenőriztem; a screenshot
binárisainak lokális exportját az in-app browser URL-szabályzata blokkolta, így
nem kerültek fájlként a repóba. Soft keyboard, Safari/fizikai eszköz, projekt-
mentés és hosted DB nem ellenőrzött. A bővített konzisztencia-audit a
kalkulátorválasztót, standalone eresz- és szegélykalkulátort, anyagkimutatást,
ajánlatpiszkozatot, beszerzési/műhelylistát is megnyitotta; külön üzleti műveletet
nem mentett. Ezek eltérő üzleti entitásai és indokolt paneljei megmaradtak.
Nincs számítási, üzleti, adatbázis- vagy jogosultsági változás.

Futtatva: célzott Vitest 6 fájl / 21 teszt, `npm run typecheck`,
`npm run lint`, Next.js 16.4.0 webpack `npm run build` izolált forrásmásolaton,
valamint `git diff --check` — mind PASS. A célzott teszt nem teljes regresszió.

Javasolt commit: `fix(F9.14.3): refine unified liquid glass roof workspace`.

## F9.14.4 — fluid Liquid Glass UI átalakítás

Állapot: **PARTIAL**. A meglévő CSS design-rendszer tokenjeit bővítettem
blur/saturation, radius, elevation és rövid motion értékekkel; a már használt
`glass-navigation` és `glass-toolbar` primitíveket valós navigációs és rajz
vezérlőkön alkalmaztam. A shadcn/ui, Motion és creativoma megoldásait a jelenlegi
Next/React stackhez ellenőriztem. Új UI-függőség nem került be: a natív
mezők, `<details>` és meglévő React komponensek megfelelő szemantikát adnak;
az SVG rajzra kiterjedő torzító filter indokolatlan teljesítménykockázat lenne.

A `RoofWorkspace` immár közvetlenül tartalmazza a mérési mezőket és a rajzot,
belső dekoratív felület-wrapper nélkül. A rajzeszközök a vásznon lebegnek,
haladó rétegek összecsukhatók. A gyorsfelmérési gable külső kártyája és az
önálló kalkulátor ismétlődő felülete eltűnt; a felmérési műveletek megmaradtak.
Globális, alacsony kontrasztú elválasztók váltják a workflow, anyag-, beszerzési
és ajánlatsorok ismétlődő kártyakereteit. Képlet, üzleti szerződés, jogosultság
és adatbázis nem változott.

Hitelesített lokális browserben 1440 px-en dashboard világos/sötét témával,
felmérés, standalone és projekt tetőszerkesztő látható állapotáról készült
vizuális ellenőrzés. A tetőszerkesztők egyetlen közös workspace DOM-fát adtak;
méretmező fókusza a megfelelő SVG dimenziót jelölte ki, rajzeszköz és
haladó rétegek működtek. Korábbi screenshot exportja nem volt elérhető, ezért
képfájl-pár nem csatolható. A végső CSS utáni összehasonlító hatképernyős
vizuális audit nem teljesült.

Futtatva a végleges forrásállapoton: lásd a F9.14.4 tesztmátrixot. A böngésző
save/reopen, projekt újranyitás, handoff és quote/material navigáció nem
igazolt; az aktuális lokális dev szerver a save interakció közben leállt, az
elkülönített preview pedig eltérő, régi markupot szolgált. 1024/768/390/320 px,
Safari/fizikai mobil, valamint valós reduced-motion/kontraszt emuláció nem
ellenőrzött. Emiatt a mérföldkő PARTIAL, nem COMPLETE.

Javasolt commit: `feat(F9.14.4): fluid workspace and glass controls`.

## F9.14.5 — Global Fluid Liquid Glass & Application Recovery

Állapot: **PARTIAL**. A projekt-áttekintés munkafolyamat-kártyáit teljes
szélességű, szemantikus navigációs sorokra cseréltem; a projekt alapadatai és
szerkesztése nyitott, kétoszlopos munkaterületet alkotnak. A roof választó,
projektmodellek, katalógus, eresz/szegély, anyagkimutatás, beszerzés és
kivitelezés ismétlődő kereteit visszafogott elválasztók váltják. A dashboard
hat funkciókártyája és sorrendje megmaradt. Egy valódi megjelenési regressziót
is javítottam: a régi grid-szabály a projektfolyamat listáját egy keskeny
oszlopba szorította és a műveleteket a címkékre tolta; a lista most teljes
szélességű, desktopon kétoszlopos, mobilon egyoszlopos.

A meglévő React komponenseket, CSS tokeneket, navigációs és toolbar primitíveket
használtam. shadcn/ui, Motion és creativoma vizsgálata után új függőség nem
került be: a projektmunka navigációjához natív link/lista, a mezőkhöz meglévő
vezérlők, a rajzhoz a jelenlegi SVG/React workspace elegendő. A domain-számítás,
adatbázis, mentés, Auth/RLS, verzió- és forrássnapshot-szerződés nem változott;
üzleti adatot nem hoztam létre vagy módosítottam.

**Útvonal-helyreállítás:** a meglévő `localhost:3001` példányon a projektoldal
ChunkLoadError-rel hibázott; két korábbi, `/private/tmp` alatti Next folyamat
ütközése valószínű, de a pontos okot nem bizonyítottam, és egyiket sem állítottam
le. A projektmásolaton, helyi Supabase-környezetre kötött izolált
`localhost:3214` szerveren a hitelesített fő route-ok betöltődtek, a szervezet
paramétert megtartó dashboard→gyorsfelmérés és projekt→beszerzés kattintás is
működött. A projektek, dashboard, felméréslista/rekord, tetőválasztás/szerkesztés,
kalkulátor, anyagkimutatás, ajánlatpiszkozat, beszerzés és kivitelezés
megnyíltak. Egy régi survey ID hiánya helyes „nem található” állapotot adott,
nem navigációs hibát. A rapid váltások alatt néhány Next destination-stream
megszakadt, miközben az érintett kérések 200-zal lezárultak.

A már létező, lokális DEMO survey V1 frissítés és újranyitás után is megtartotta
a 10 000 × 6 000 mm-es alapméretet, 35°-os lejtést, SVG-t és 73,246 m² eredményt.
Projekt tetőrevízió, ajánlat és beszerzési lista csak olvasásra nyílt meg; mentési
műveletet nem kértem. A dashboard világos és sötét nézetét ellenőriztem; a
sötét téma visszaállítva. A második ellenőrzés képernyőképe a tool-nézetben
vizuálisan megtekinthető, de lokális képfájl nem készült. A kilenc megkövetelt
képernyő azonos állapotú előtte/utána exportja, valamint a 1440/1024/768/390/320
viewport-mérés ebben a körben nem teljesült; ezért globális vizuális és mobil
elfogadás nem bizonyított.

**Futtatva a végső kódon:** célzott Vitest **12 fájl / 39 teszt PASS**;
`npm run typecheck`, `npm run lint`, izolált friss forrásmásolaton Next.js
16.4.0 webpack `npm run build`, majd dokumentációval együtt `git diff --check`
PASS. A build 43 app/API route-ot listázott; ez nem helyettesíti a teljes
browser-regressziót. Auth/RLS és adatbázis-ellenőrzés nem futott, mert ezek
szerződése nem változott. Teljes Vitest suite, Safari/fizikai eszköz,
billentyűzet/screen reader, soft keyboard, reduced-motion/kontraszt valós
emuláció és hosted DB nem ellenőrzött. Nincs ismert kritikus üzleti regresszió.

Javasolt commit: `feat(F9.14.5): unify fluid glass workspace layouts`.

## F9.14.6 — Product UI Architecture & Visual Refinement

Állapot: **PARTIAL**. A fő munkafelületek kompozíciója a RoofWorkspace, TechnicalDrawing és MeasurementGuidance meglévő komponenseire épül. Új, szemantikusan címkézett `GlassToolbar` csoport fogja össze a rajz-, projekt-, anyag- és ajánlatszűrő vezérlőket; új függőség nem került be. A hét tetőforma rajza és leírása nagyobb, egyértelműen kijelölt csempén jelenik meg. A survey tetőszerkesztő sorrendje kontextus → kompakt mérési sor → közvetlen SVG → eredmény/mentés; a mérési beállítások alapállapotban összecsukottak. A projektlista, projektmunkafolyamat, dashboard és anyag/ajánlat szűrők hierarchiája sűrűbb, a hat dashboard funkció jóváhagyott sorrendje megmaradt. A helyi időalapú köszöntés SSR-biztos.

**Böngészőben bizonyított:** hitelesített izolált localhost előnézetben a dashboard → gyorsfelmérés, projektek → részlet → mentett tetőmodell revízió 4, valamint projekt → ajánlat navigáció működött. Az anyagkatalógus öt, már meglévő DEMO termékkel, az ajánlatoldal hat meglévő rekorddal nyílt meg; ezeken adatot nem módosítottam. Új, `DEMO F9.14.6 nyeregtető` címkéjű lokális felmérést mentettem, majd a listából újranyitottam: V1, 10/6/3 m, 300/0/0 mm, SVG és 93,338 m² megmaradt. Az új rekord lokális tesztadatként megmarad; meglévő rekordot nem írtam felül. A projekt tetőmodell csak olvasásra nyílt meg.

A dashboard, selector, survey, standalone tetőkalkulátor, projektlista és -részlet, anyagkatalógus és ajánlatok 1440/1024/768/390/320 px emulált nézeten vízszintes oldal-túlcsordulás nélkül jelentek meg. Az anyag- és ajánlatszűrőt mind az öt szélességen újramértem; 390/320 px-en a szűrő egy oszlopba rendeződik. A 320 px-es survey bemenetei 16 px-esek, legalább 46 px magasak; a fókuszált méréshez tartozó SVG-vonal kiemelődött. Világos dashboard- és survey-nézetet, valamint sötét mobil survey-t ellenőriztem; az eredeti sötét témát visszaállítottam.

**Adat és architektúra:** UI/prezentáció változott; domain-képlet, pénzügyi logika, adatbázisséma, jogosultság, mentési action és revízió/snapshot szerződés nem. A save/reopen bizonyíték a lokális UI+DB útvonalat fedi, de nem helyettesít külön Auth/RLS vagy párhuzamos mentési tesztet. Hosted Supabase-t nem használtam.

**Automatizált ellenőrzés:** fókuszált Vitest 15 fájl / 55 teszt PASS; `npm run typecheck`, `npm run lint`; Next.js 16.4.0 webpack production `npm run build` PASS egy friss, elkülönített forrásmásolaton, build-only placeholder public Supabase beállításokkal. Ez nem teljes regressziós suite.

A vizuális after állapotokat a böngészőben megtekintettem; összehasonlító képek a tool nézetében látszottak, de fájlként nem exportálhatók ebből az in-app browserből. Ezért nincs megőrzött, azonos állapotú hét route-os before/after képpár, és a kritikus vizuális elfogadási bizonyíték nem teljes. Fizikai Safari/eszköz, screen reader, soft keyboard, valódi reduced-motion/kontraszt emuláció és hosted DB nem ellenőrzött.

Tesztadat-azonosító: `f6bbeac3-9158-4dac-a9de-c20e74f13140`. A változatlan mentési action a hitelesített szervezeti tagságot és `expectedVersion=0` értéket érvényesítette; a lokális mentés V1-ként nyílt újra. Ez nem külön Auth/RLS vagy konkurencia-regresszió.

A projektmunkaterület mentési útvonalát külön, elkülönített lokális projekten is
ellenőriztem: `DEMO F9.14.6 tetőmodell QA` (`2e5ebf96-6dbc-4b2e-b8bc-60bffe430318`)
alatt a `DEMO F9.14.6 nyeregtető` modell (`73521fd7-cf63-4350-a908-4290cb4642c9`)
V1 revízióként mentődött. Oldal-újratöltés után a 10 000 × 6 000 × 3 000 mm-es
méretek, 300/0/0 mm túlnyúlások, SVG és 93,338 m² eredmény megmaradt. Kizárólag
ez az új, egyértelműen DEMO-ként címkézett lokális tesztprojekt módosult.

Javasolt commit: `feat(F9.14.6): refine product workspace UX`.

## F9.14.7 — Final Interface & Workflow Refinement

Állapot: **PARTIAL**. A tetőrajz kezdeti tartalomhoz igazítása most a méretvonalak címkéit és a jelölőszövegeket is figyelembe veszi; a felirat-ütközések rajzi geometria módosítása nélkül rendeződnek. Átméretezéskor csak a még nem kézzel állított nézet illeszkedik újra; a zoom, pásztázás, illesztés és 100%-os visszaállítás külön viselkedés marad. A nyeregtető eredményfelületein a „Teljes tetőfelület” az elsődleges érték, a többi igazolt adat tömörebb technikai sorba került.

A projektoldal felső jobb sarkában elérhető a „Projektműveletek” menü. Az új felmérés a projekt- és szervezeti azonosítóval nyílik meg. Az archiválás a meglévő, verzióellenőrzött és szervezeti jogosultságot alkalmazó műveletet hívja; a megerősítést megnyitottam, majd megszakítottam, ezért archiválás nem történt. Végleges törlés továbbra sem támogatott: a meglévő migráció tiltja, a hivatkozó munkafolyamatok megőrzendők; a menü ezt egyértelműen letiltottként mutatja. A projekt további műveletei az alapadatok között, összecsukott csoportban maradnak.

A kalkulátorok a három kért munkaszándék szerint rendeződnek; a mentett számítások és minden meglévő önálló útvonal megmaradt. A kivitelezési kezdőlap szervezethez tartozó, valódi terv/feladat/napló/fénykép adatokból mutat projektcsoportos áttekintést, számlálót és következő teendőt. A survey alsó műveletei a mentés köré kerültek; a projektkapcsolat, fényképek és egyéb mezők megosztott `GlassDisclosure` elemet használnak.

**Helyi böngészőbizonyíték:** projektmenüben a nyíl-kulcsos fókuszléptetés, törlés indoklása, archiválás megszakítása és új felmérés projekthez kapcsolt megnyitása működött. A meglévő kalkulátorútvonalak és mentett számítások megnyíltak. A kivitelezési áttekintőből a projekt kivitelezési részletei nyíltak meg; a terv 2 valódi feladatából 1 kész és 1 folyamatban volt, továbbá 1 naplóbejegyzés és 2 fénykép jelent meg. Az új, projekt nélküli `DEMO F9.14.7` felmérés `3f32d50f-e47e-44ad-9cf9-29fbb27d576c` azonosítóval V1-ként elment, oldalfrissítés/újranyitás után a munkaszakasz és megjegyzés megmaradt. Fotófeltöltést és üzleti számítást nem indítottam.

A survey oldalon sötét témában, 390 px-en dokumentum-túlcsordulás nélkül megjelent a mentésgomb és a szakaszválasztó; a mérés előtt mindkettőt javítottam. A 320 és 768 px-es survey nézet is 0 px túlcsordulást mutatott. A DevTools által korlátozott 1024/1440-as célméret ténylegesen 799 px-es CSS-nézetet adott; ezért ezeket és a teljes, minden route-ra kiterjedő viewport mátrixot nem tekintem bizonyítottnak. Azonos állapotú, exportált before/after képpárok sem készültek. Világos mód, fizikai eszköz, screen reader, reduced-motion, nagy kontraszt és teljes billentyűzetes dialógus-útvonal nincs ellenőrizve.

Az alkalmazás- és adatarchitektúra változatlan: UI/rajzi megjelenítés és adatból képzett áttekintő változott; képletek, sémák, mentési contract, Auth/RLS, verzió- és snapshot-szabály nem. Meglévő projekt- és roof rekordot nem módosítottam; csak a megnevezett lokális DEMO felmérés készült. Nincs hosted DB, reset, migráció, commit, push vagy deploy.

**Végső ellenőrzések:** a változtatás utáni célzott Vitest 13 fájl / 47 teszt PASS; `npm run typecheck` és `npm run lint` PASS; az izolált, build-only placeholder Supabase környezettel futó Next.js 16.4.0 webpack `npm run build` PASS; dokumentáció frissítése utáni `git diff --check` PASS. Ez nem teljes regresszió.

Javasolt commit: `feat(F9.14.7): refine final workspace workflows`.

## F9.14.8 — Project & Calculator UI Refinement

Állapot: **PARTIAL**. A projekt részlet egyetlen felső `Projektműveletek` menüt használ: az új felmérés, archiválás és másolás meglévő művelet maradt; a nem támogatott törlés indoklással letiltott. A korábbi további műveletek menüpontjai ugyanebbe a menübe kerültek, a projektadat-szerkesztő elérhető maradt. A nyolc munkafolyamat ikonozott, rövid állapotot leíró, teljes felületen kattintható Liquid Glass csempét kapott. Az alapadatok négy oszlopban tömörödtek, a szerkesztő külön maradt.

A kalkulátoroldal meglévő három kategóriáját és mind az öt önálló kalkulátort egységes ikonozott, teljes felületen kattintható csempék rendezik; a mentett számítások linkje és a szervezeti kontextus megmaradt. Csak meglévő route-ok és komponensek, CSS design tokenek, valamint a Lucide ikonok használatosak; új függőség, üzleti funkció, kalkulátor vagy domain-/jogosultsági-/adatbázis-változás nincs.

**Böngészőbizonyíték:** hitelesített helyi Brave nézetben mindkét oldalt módosítás előtt és után megtekintettem. A projektből munkafolyamat-csempe, adat-szerkesztő és egyetlen műveletmenü működött; menüben a törlés letiltott. A kalkulátoroldal öt eszközcsempéje, tetőgeometria, mentett számítások útvonala és a maradék négy kalkulátor útvonala megnyílt. Üzleti műveletet és rekordmódosítást nem indítottam. Mindkét oldal DOM-szélessége 1440/1024/768/390/320 CSS px-en azonos volt a viewport szélességével, vízszintes túlcsordulás nélkül. A böngészőből nem készült exportált, megőrzött before/after képfájl, ezért a vizuális artefaktum követelménye részleges.

**Automatizált ellenőrzések:** `npx vitest run src/features/projects/project-lifecycle.test.tsx src/features/projects/project-workflow-overview.test.ts src/features/projects/project-workflow-data.test.ts src/features/projects/project-navigation.test.ts src/features/projects/project-actions.test.ts src/components/ui/glass-disclosure.test.tsx` — 6 fájl / 13 teszt PASS. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0, webpack) és `git diff --check` PASS. Teljes regressziós suite, DB/Auth/RLS teszt nem futott; szerződés nem változott.

Javasolt commit: `feat(F9.14.8): refine project and calculator UI`.

## F9.14.9 — Settings, Account Management & Mobile Quick Scaling

Állapot: **PARTIAL**. A fejlécben külön megmaradt a gyors téma-váltó, a
Beállítások gomb és a munkamenet-kilépés; a Rendszer/Világos/Sötét választó a
meglévő Beállítások panelen van. A téma és a méretezés a már meglévő
localStorage/provider rendszert használja. A mobil-only lebegő ikon fölött két
önálló, százalékértéket mutató buborék szabályozza a globális szöveg- és
felületméretet. A teljes desktop méretezés négy meglévő beállítása megmaradt.

A `Fiókom kezelése` külön, natív modal dialogban mutatja a bejelentkezett
felhasználó címét, az Auth szolgáltatóit, az e-mail-kérés és a jelszócsere
űrlapját. Az Auth kliens az aktuális munkamenetet használja; célfelhasználó-ID
vagy admin jogosultság nem kerül a UI útvonalra. A Supabase hibaüzenetei között
van invalid/duplicate, rate-limit, lejárt munkamenet/link, gyenge jelszó és
újrahitelesítési hiba.

**Böngészőben bizonyított:** hitelesített helyi dashboardon desktopon a fejléc
vezérlői, a három témamód, System módból a quick-toggle explicit felülírása és
az újratöltés utáni témamegőrzés működött; az eredeti System preferenciát
visszaállítottam. A fiókdialog current e-mailt és mindkét űrlapot mutatott,
hibás e-mailt kliensoldalon elutasított, Escape után a nyitógomb kapta vissza a
fókuszt. E-mailt vagy jelszót a böngészőben nem küldtem be.

Mobil emulációban 390 és 320 CSS px-en `innerWidth`, dokumentum- és body-
szélesség azonos volt; a fejléc `position: static`, a lebegő trigger a jobb alsó
safe-area margón belül jelent meg. 390 px-en a két slider buborék kinyílt és
bezárható volt; a szövegcsúszka 130→140→130%, a felületcsúszka 90→100→90%-ra
állt, a desktop beállításokban azonnal látszott a változás. A gyors témaváltó,
a teljes Beállítások és a fiókdialog is működött 390 px-es nézeten. Tablet,
soft keyboard, más route-ra navigálás utáni méretezés-perzisztencia, illetve
fizikai iOS Safari nem ellenőrzött. A 320 px-es trigger és a nyitott bubblesor
vizuálisan megjelent; a fiókdialog és mobil teljes munkafolyamat 320 px-en nem
kapott külön végigpróbát.

A dashboard → projektek lista → dashboard navigáció a szervezeti query
megtartásával működött; a meglévő lokális projekteket csak megtekintettem.

**Lokális Auth-integráció:** a `RUN_LOCAL_AUTH_ACCOUNT_TESTS=1` engedélyező
teszt két véletlen lokális fiókot hozott létre és törölt; az egyik saját
jelszófrissítése után a régi jelszó sikertelen, az új sikeres volt, az e-mail-
módosítási kérést az Auth elfogadta, a másik fiók adatai változatlanok maradtak.
Ez nem igazolja az e-mailes megerősítő levél kézbesítését/megnyitását, a hosted
Supabase konfigurációt vagy a lejáró link tényleges feldolgozását.

**Végső ellenőrzések:** fókuszált Vitest 7 fájl / 20 teszt PASS, 1 lokális Auth
integrációs teszt PASS (külön, opt-in futtatás), `npm run typecheck`,
`npm run lint`, Next.js 16.4.0 webpack `npm run build` és `git diff --check`
PASS. Teljes suite és hosted Auth/DB/RLS nem futott. Képletszámítás,
geometria, DB-séma és tartós üzleti adat nem változott; új éles/hitelesített
felhasználói adatot nem írtam át.

Javasolt commit: `feat(F9.14.9): add account settings and mobile quick scaling`.

## F9.19 — Workflow egyszerűsítés

Állapot: **PARTIAL**. Az új fő munkafolyamatok projekt és ügyfél létrehozása
nélkül indíthatók. A műhely kezdőlap öt elsődleges útvonala: Gyors felmérés,
Kivitelezési tervek, Anyaglisták, Árajánlatok és Kalkulátorok. A régi
Projektek/Ügyfelek modulok és projektfüggő részfunkciók megmaradtak az eddigi
adatok kompatibilis eléréséhez; nem töröltünk rekordot és nem írtunk át régi
projektkapcsolatot.

**Felmérés → terv:** az önálló survey mentés mellett új terv készíthető, a
meglévő mentett felmérés pedig meglévő tervhez csatolható. Az író RPC-k az
aktuális szervezeti tagságot, mindkét szülő jogosultságát, az immutable
felmérés-revíziót és az idempotencia-kulcsot ellenőrzik. A terv közvetlen
munkateret és valódi tervlistát kapott; alulról nyitható „Csatolt felmérések”
nézet mutatja a pontos forrásverziót. A forrásfotók és SVG csak jogosultság
esetén, kibontva töltődnek be.

**Anyaglisták:** a meglévő immutable material preparation revision szerződés
bővült önálló és tervhez kapcsolt, projekt nélküli listákkal. Kézi vagy
katalógusból választott sorok adhatók hozzá; a kézi sor megnevezése,
mennyisége és egysége szerkeszthető, legfeljebb hat tizedes pontossággal.
Katalógussor egységét a variáns szabja meg, a mennyiségi egységváltás nincs
automatikusan átszámítva. Az ár választható, és hiányzó ár nem lesz nulla.
A lista csak a mentett aktuális verzióhoz ad ajánlatindító linket.

**Katalógus:** az anyaglista Liquid Glass beállítási buborékából elérhető a
meglévő szervezeti termék- és árkezelő, valamint a termékfelvétel. A meglévő
termék/variáns/ár írók és jogosultsági ellenőrzéseik maradtak használatban.
Szervezeti dinamikus kategória hozzáadása/átnevezése a jelenlegi enum-séma miatt
nincs megvalósítva; nem hoztunk létre második, eltérően viselkedő kategória-
rendszert.

**Árajánlat:** az önálló ajánlatpiszkozat indítható üresen, vagy az anyaglistán
illetve a terven keresztül pontosan kiválasztott mentett anyaglista-revízióból.
Az import megőrzi a mennyiséget, egységet és forrástétel-ID-t. Nettó HUF árat
csak ugyanazon aktív, kompatibilis katalógus-variáns forrás-ársnapshotjából
vesz át; az ismeretlen, bruttó, más egységű vagy már nem visszaellenőrizhető ár
üres marad, illetve figyelmeztetést kap. A forrástábla a pontos anyaglista- és
revízióazonosítót, valamint a quote revision sorait köti össze; azonos
piszkozat retry nem duplikál kapcsolatot. Az üres árú sor megőrzése érdekében
a pénzügyi writer mentéskor ellenőrzött árat kér. Hivatalos kiállítás,
számozás és PDF-kiadás nem lett engedélyezve.

**Nem kész / nem bizonyított:** a biztonságos, revízióhoz kötött automatikus
anyagjavaslat-generálás; a dinamikus kategóriakezelés; közvetlen felmérésből
indított, forrásos ajánlat; minden A–G elfogadási útvonal és teljes
navigációs/legacy-átvezetés; a teljes 1440/1024/768/390/320, világos/sötét,
méretezési és fizikai iOS mátrix. A felmérés/terv és listák kézi útjai működnek,
de a hiányzó javaslatgenerálás miatt a teljes SURVEY → PLAN → MATERIAL LIST →
QUOTATION workflow nem COMPLETE. A javaslatokhoz nem vezettünk be új képletet
és nem következtettünk le nem bizonyított termékmennyiséget.

**Migráció és adatvédelem:** a helyi adatbázisra a korábbi ellenőrzés során a
20261016180000 migráció is felkerült. A végső migration-lista lekérdezéskor a
helyi Postgres már nem futott (`127.0.0.1:54322` connection refused), ezért az
aktuális élő migrációs állapotot akkor nem tudtam újra lekérdezni. A migrációk
csak előrefelé módosítanak sémát/RPC-t, a meglévő
projektlista és történeti revíziók megmaradtak. Hosted Supabase, reset,
commit, push vagy deploy nem történt. A forráskód és DB writer ellenőrzi a
szervezetet, terv-hozzáférést, creator-scope-ot, exact revision ID-t,
expected versiont és retry request key-t.

**Megőrzött helyi DEMO bizonyíték:** felmérés 55be7cf5-8939-4828-8c98-7b404b0cc7d7,
terv ec23335e-ece9-4d67-8f7e-01959e4b3d23, forrásrevízió
3fdf0255-7c55-4062-bb5c-8d0b08da8dc2. Az anyaglista browser DEMO:
7f889b0f-f73c-484d-b9f7-c761c7120d30, revízió
260538a5-d4c8-43a5-8d73-47a83139b135. A böngészőben mentett 2,125 folyóméter
kézi sorból az ajánlatpiszkozatba pontos 2,125000 és az exact forrássor került;
ár nélkül maradt, így ajánlatot nem mentettünk. Két párhuzamos helyi DB
kapcsolat ugyanarra az anyaglista create kérésre ugyanazt a listát és revíziót
kapta; a helyi DEMO rekordot megőriztük.

**Ellenőrzések:** célzott Vitest 6 fájl / 23 teszt PASS; a survey-terv,
önálló anyaglista és ajánlatforrás pgTAP-csomagja 3 fájl / 49 assertion PASS;
npm run typecheck, npm run lint, Next.js 16.4.0 webpack npm run build és végső
git diff --check PASS. A teljes Vitest suite és hosted adatbázis/Auth/RLS
regresszió nem futott. A böngésző egy autentikált helyi desktop smoke workflow-t
bizonyít; fizikai mobil és viewport/téma mátrix nincs ellenőrizve.

Részletes séma- és migrációs döntések: [F9.19_WORKFLOW_MIGRATION.md](F9.19_WORKFLOW_MIGRATION.md).

Javasolt commit: feat(F9.19): add standalone workflows and quote provenance.

## F9.19 folytatás — Liquid Glass és régi gyűjtőoldalak

Státusz: **IMPLEMENTED / PARTIAL — UI**.

- A közös felületek áttetszőbbek, 22 px háttérelmosást, telítettebb üveg-hatást, világos peremet és finom környezeti színeket kaptak. A címsorok, kártyák, panelek, másodlagos gombok és űrlapvezérlők közös üveg-tokeneket használnak; a kiemelt elsődleges műveletek narancssárgák maradnak. A műszaki rajzot maga az elmosás nem érinti.
- A Projektek és Ügyfelek lista-, létrehozó- és ügyfélrészlet-route-jai a műhelyre irányítanak. Az egyedi `/projektek/[projectId]` és alútvonalai kompatibilitásból megmaradnak, mert régi projektadatokhoz, ajánlatokhoz és kalkulációkhoz még szükségesek. A kalkulátorokból a Kivitelezési tervek nyílik.
- Projekt- és ügyfélrekord, migráció, jogosultság és üzleti adat nem változott; a módosítás csak UI, stílus és útválasztás.

**Bizonyíték és korlátok:** fókuszált Vitest 4 fájl / 14 teszt PASS; `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build` és `git diff --check` PASS. Helyi, hitelesített desktop DEMO dashboardon az öt fő munkafolyamat és az üvegkártyák megjelentek; a `/projektek?organization=…` útvonal a kiválasztott szervezettel a műhelyre irányított. Csak egy desktop sötét felületet ellenőriztem; mobil, világos téma, kontraszt/forced-colors, képernyőolvasó és fizikai iOS mátrix nem futott. DB/Auth/RLS tesztet nem futtattam, mert adattárolóhoz és jogosultsághoz nem nyúltam.

Javasolt commit: `fix(F9.19): apply app-wide liquid glass and retire legacy lists`.

## F9.20 — Globális Liquid Glass és munkanapló

Státusz: **IMPLEMENTED / PARTIAL — LOCAL UI**.

- A felmérés munkaszakasz-fejléce és műveletcsoportja az új Glass fejléc-/toolbar-primitíveket használja; a tetőtípus-választás, hét tetőforma, mérési űrlap és műszaki rajz megmaradt.
- A munkanapló részlete egyetlen objektumcímet mutat. A napi bejegyzés lett az elsődleges, nyitott munkafelület; a feladatok közvetlenül hozzáadhatók és szerkeszthetők, a kapcsolódó dokumentáció és anyaglisták összecsukva maradtak. A kizárólag nulla értéket mutató statisztikák és a párhuzamos üres összefoglalók eltűntek.
- A releváns felhasználói feliratok „Munkanapló” terminológiát használnak; a belső előzmény neve „Napi bejegyzések”. A `/kivitelezes` route, táblák, RPC-k, azonosítók, revíziók és szervezeti hozzáférési szerződések változatlanok. Régi projekt-/ügyfélrekordot nem töröltünk.
- A megjelenés a meglévő `GlassPageHeader`, `GlassSectionHeader`, `GlassDisclosure` és `GlassToolbar` komponenseket, illetve a közös üvegtokeneket használja. Domain-képletet, adatbázissémát, mentési műveletet vagy jogosultságot nem módosítottunk.

**Böngészős bizonyíték és korlát:** helyi, autentikált DEMO felmérésben a nyeregtető választása, a 10 × 6 × 2 m értékek, a 6 m-es előnézeti szélesség és a 72,111 m²-es geometriai előnézet látható volt. Az új felmérési oldalon 320 és 390 CSS px-en, a meglévő DEMO munkanapló oldalon pedig 320, 390, 768, 1024 és 1440 CSS px-en a `documentElement` és a `body` szélessége is megegyezett a viewporttal; vízszintes túlcsordulás nem jelent meg. A mentés-visszanyitási próba a felületen „A felmérés mentése nem érte el a szervert” hibával megállt; mentett azonosító/revízió ezért nincs, az űrlap DEMO adatai mentetlenül maradtak a böngészőben. A meglévő DEMO munkanapló megnyitása read-only ellenőrzés volt. Survey→Munkanapló link, 320/390 px-en túli survey mátrix, világos téma, billentyűzet/képernyőolvasó, increased scaling, reduced-motion/transparency, forced colors, fizikai iOS és exportált screenshot **nem bizonyított**. Hosted DB/Auth/RLS nem futott; tárolási és hozzáférési szerződéshez nem nyúltunk.

Fókuszált Vitest 8 fájl / 28 teszt PASS; `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build` és `git diff --check` PASS. Teljes Vitest suite nem futott.

Javasolt commit: `fix(F9.20): refine liquid glass survey and diary workspaces`.

## F9.20.1 — Felmérési munkafelület és térközök

Státusz: **IMPLEMENTED / PARTIAL — LOCAL UI**.

- Az aktív munkaszakasz egyszer, választható üvegjelvényen jelenik meg; a kitöltött mérések száma visszafogott jelvény. A szakaszváltás és az új szakasz létrehozása külön látszik, az új műveletek címkéi a típusukat is megnevezik.
- A hét tetőforma megmaradt. A kártyák, műveletcsoport és lenyílók közös belső rácsra kerültek; megszüntettem a tetőcím és a lenyílók fölösleges külső kereteit. 700 px alatt a tetőkártyák teljes szélességű, tömör sorok.
- Csak a `FieldSurveyEditor` jelölése és a hozzá tartozó CSS változott; a meglévő `GlassPageHeader`, `GlassToolbar`, `GlassDisclosure`, `GlassSectionHeader` és tetőválasztó maradt. Geometria, validáció, mentési/revíziós, kézbesítési és auth/RLS szerződés nem változott.

**Böngészős bizonyíték / korlát:** autentikált helyi felmérési űrlap 1440, 1024, 768, 390 és 320 CSS px-en: a `documentElement` és a `body` szélessége minden méreten egyezett a viewporttal. 320 px-en 1,25-ös szöveg- és 1,2-es UI-méretezéssel is nulla volt a túlcsordulás; az új szakaszgombok legalább 105 px, a tetőkártyák 112 px magasak. Desktop- és mobilnézet képernyőképét a böngészős vizsgálat rögzítette, fájlba nem exportáltam. A komponensinterakciókat célzott tesztek fedik; mentés/revízió új böngészős próbája nem futott. Az F9.20 helyi mentése korábban szerverhibával állt meg. DB/Auth/RLS, világos téma, képernyőolvasó, billentyűzetes navigáció és fizikai iOS nem futott.

Fókuszált Vitest 2 fájl / 11 teszt PASS; `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build` és `git diff --check` PASS. Teljes tesztkészlet nem futott.

Javasolt commit: `fix(F9.20.1): refine survey layout and section controls`.

## F9.20.2 — Felmérés folytatása, mentett számítások és önálló ajánlat

Státusz: **IMPLEMENTED / PARTIAL — LOCAL UI**.

- A felmérés alján a következő lépések kompakt üvegpanelbe kerültek; kikerült a fölösleges „Folytatás” címke, az új felmérés ismételt állapotjelzése és az ügyfél/terv nélküli működést magyarázó gombsor. A mentési és munkanapló-műveletek megmaradtak.
- A mentett számítások szűrői üveges füleket, a számítások lekerekített Liquid Glass kártyákat kaptak; mobilon a kártyaműveletek teljes szélességűek.
- Az önálló árajánlat fejlécét és tételeit lekerekített üvegfelületek fogják össze. Az ügyfélrekord-választás és az ügyféllista lekérése kikerült az önálló szerkesztőből; kézi címzettmezők opcionálisan maradtak. Régi címzett-pillanatkép betöltéskor kézi címzettként jelenik meg; új mentés üres ügyfélkapcsolattal készül. Régi mentett revízió nem módosul puszta megnyitástól.
- Meglévő Glass tokenek és komponensek újrahasznosítva. Kalkuláció, sémák, SQL/RLS, Auth, revíziós mentés és dokumentum-kiállítási szabályok nem változtak. Az önálló ajánlat szerveroldali szervezeti jogosultság-ellenőrzése és mentési RPC-je maradt az adatút.

**Ellenőrzés:** a helyi, hitelesített DEMO böngészőben mindhárom érintett felületet vizuálisan ellenőriztem: `/felmeresek/uj`, `/kalkulatorok/mentett` és `/ajanlatok/uj`. A DOM igazolja az önálló ajánlatnál az ügyfélválasztó hiányát; az oldalak adatát nem módosítottam. Célzott Vitest: 3 fájl / 17 teszt PASS; `npm run typecheck`, `npm run lint`, Next.js 16.4.0 webpack `npm run build` és `git diff --check` PASS. Mobil viewport, mentési tranzakció, DB/Auth/RLS és fizikai iOS ellenőrzés nem futott.

Javasolt commit: `fix(F9.20.2): polish standalone liquid glass workflows`.

## F9.20.2 — Globális Vanta.NET háttér

Állapot: **IMPLEMENTED / PARTIAL — HELYI UI**.

- A `GlobalAnimatedBackground` egyszer, a tartós `RootLayout`-ban jelenik meg, a route-váltások során megmarad, és az alkalmazáskód betöltése után, kliensoldalon inicializálódik. Strict Mode takarításkor és lapelrejtéskor lebontja a Vanta példányt és eltávolítja a vásznat; a látható lap újranyitásakor újraindítja.
- A `vanta@0.5.24`, `three@0.134.0` és `@types/three@0.134.0` verziók rögzítettek. A felhasználói referencia után a NET-háló az eredeti 10 pontos, 15-ös térközű és 20-as kapcsolási távolságú beállításra került; a sötét vászon fekete, 95%-os vizuális erősségű, a WebGL pixel ratio felső korlátja 1,5. A háttér `aria-hidden`, `pointer-events: none` és a teljes viewportot fedi, így nem célpontja a rajz- és űrlapinterakcióknak.
- A felméréseket `prefers-reduced-motion`, mobil/coarse pointer, Save-Data, legfeljebb 4 CPU-mag, legfeljebb 4 GB jelentett eszközmemória és WebGL-hiány statikus CSS-háttérre állítja. Inicializálási hiba után is statikus marad. A sötét mód a narancs `#ed6100` színt, a világos mód sötétebb narancsot és világos alapot használ; meglévő UI-komponens nem cserélődött le.
- A Vanta NET tényleges Three.js használata alapján rögzített Three r134 csomagpár készült; a Vanta hivatalos példája is r134-et tölt. A Vanta NET pontpár-frissítése miatt a pontszám csökkentése mérsékli a képkockánkénti páronkénti munkát. A helyi API nem biztosít külön animáció-pause hívást; a rejtett lap animációját biztonságosan destroy/restart ciklus állítja meg.
- Nem módosult domain- vagy üzleti logika, DB, migráció, Auth/RLS, kalkulációs eredmény, mentés vagy hosted Supabase. A munkafolyamatot nem kellett átalakítani.

**Böngészős bizonyíték:** autentikált, helyi `DEMO TetőPro Kft.` fiókban a Dashboard, Gyors felmérés, tető-kalkulátor lista, mentett számítások, nyeregtető kalkulátor és technikai rajz, Munkanaplók, Anyaglisták és Árajánlatok betöltött. A Dashboard Gyors felmérés linkjére kattintva az App Router kliensoldali navigációt is ellenőriztem: a böngésző navigation entry darabszáma 1 maradt, és a háttérben egyetlen canvas volt. Csak helyi, read-only adatokkal navigáltam. A tetőrajz nagyításvezérlője 108%-ról 118%-ra változott, a nézet-visszaállítás működött; mentés nem történt. 320/390/768/1440 CSS px emulációban a dokumentum szélessége nem haladta meg a viewportot, az animáció coarse/touch emuláció miatt statikus maradt. Asztali, 1900 px-es böngészőnézetben egy vászon jelent meg; a sötét referencia finomítás után a fekete alap, narancs háló és pontsűrűség a csatolt mintához közelebb került. Világos mód továbbra is világos alapon, visszafogott hálóval jelenik meg; sötét módot a smoke végén visszaállítottam.

**Ellenőrzések:** `npx vitest run src/components/background/global-animated-background-policy.test.ts` — 1 fájl / 3 teszt PASS. `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és build után külön futtatott `npm run typecheck` PASS; `git diff --check` PASS. A párhuzamos build alatt futtatott első typecheck a generálódó `.next/types` fájlok eltűnése miatt hibázott; build után ugyanaz a typecheck hibátlanul lefutott. Teljes Vitest suite nem futott.

**Korlátok:** 1440 px-en az emulátor coarse pointert jelentett, ezért a háttér statikus fallbacken maradt; aktív Vanta-rajzot 1900 px-es valódi desktop böngészőnézetben ellenőriztem. A csökkentett mozgás működését a policy-teszt és a CSS szabály bizonyítja, böngésző médiaemuláció nem futott. 320/390 px-en csak böngészős emuláció történt; fizikai mobil, iOS Safari, valós touch/pinch/scroll egyidejű mérés, alacsony teljesítményű eszközön FPS/WebGL-terhelés és forced-colors nem bizonyított. Böngészős oldalméretekhez nem készült exportált screenshot.

Javasolt commit: `feat(F9.20.2): add global Vanta NET background`.

## F9.21 — Globális Liquid Glass React-integráció

Állapot: **IMPLEMENTED / PARTIAL — HELYI UI**.

- A `liquid-glass-react@1.1.1` pontos verziója rögzített. A közös Glass fejléc-, szekciófejléc-, lenyíló- és toolbar-primitívek, a műhely fő kártyái, dashboard fülei, beállítási panelje, fiókdialogja, valamint a skálázó- és kalkulátorbuborékok most a könyvtárat használják. A Vanta-háttér és a rajz-SVG-k külön rétegen maradtak.
- Az effekt csak kliensoldali mount után, dinamikusan töltődik be. A könyvtár Safari/Firefox, iOS, érintőkijelzős, reduced-motion/transparency és alacsony erőforrású környezetben CSS-es üvegmegjelenésre vált; az üvegréteg nem fogja az eseményeket. A CSS fallback a beállított fedettséget, témát és tintet követi.
- A Beállításokban külön Liquid Glass csoport állítja a 0–100%-os fedettséget, automatikus tématintet vagy egyéni színt. Verziózott, validált `localStorage` értékek őrzik meg ezeket; az új alapérték 0%, automatikus szín. A régi v1-es 10%-os első használati érték 0%-ra migrálódik, az eltérő személyre szabott értékek és színek megmaradnak.
- Világos módban a háttéralap világos marad, a globális háttérréteg radiális fényei is kikapcsolnak. 0%-os alapfedettségnél, illetve 100%-os fedettségnél a fő üvegfelületek kerete, árnyéka és külön dekoratív React-üvegrétege eltűnik; a fókuszgyűrűk és űrlapmezők határa megmarad. A NET-háló melegebb, jól látható narancsot használ. A felmérés mérési mezői, interaktív műszaki rajzok, üzleti logika, adatbázis, Auth/RLS és mentési szerződések nem változtak.

**Böngészős bizonyíték / korlát:** autentikált helyi DEMO dashboardon a sötét Vanta háttér, az üvegfejléc, a fülek és öt fő munkafolyamat-kártya látható volt. Beállításokban a Liquid Glass fedettség- és színtint vezérlői megjelentek; a világos/sötét téma váltását ellenőriztem, majd a sötét témát visszaállítottam. A folytatás ellenőrzése a helyi, világos témájú, 100%-os fedettségű dashboardon történt: a felső fényköd és a négy sarok dekoratív pereme nem látszott; a felhasználói fedettség-beállítást megőriztem. A böngészős lefedés egy dashboard smoke; a 12 útvonal és 1440/1024/768/390/320 viewport teljes vizuális mátrixa, fizikai iOS/Safari, valódi touch, reduced-transparency emuláció, képernyőolvasó és forced-colors nincs bizonyítva. Exportálható kép-artifactumot nem mentettem. Az animáció fallback döntése kód- és egységteszttel igazolt, alacsony kategóriás fizikai eszközön FPS-mérés nem történt.

**Ellenőrzések:** fókuszált Vitest: 8 fájl / 18 teszt PASS. `npm run lint`, `npm run build` (Next.js 16.4 webpack), a build után `npm run typecheck` és dokumentáció után `git diff --check` PASS. Teljes Vitest suite, hosted DB/Auth/RLS teszt és a teljes böngészős útvonal/viewport mátrix nem futott.

Javasolt commit: `feat(F9.21): integrate configurable liquid glass surfaces`.

## F9.24.2 — Lépcsők professzionális rajzai és vizuális navigáció

Állapot: **PARTIAL — RAJZ/NAVIGÁCIÓ KÉSZ, 11 VARIÁNS TOVÁBBRA IS TILTOTT**.

- Mind a 17 lépcső- és a 10 beton/alapozás/segéd referencia saját, eredeti SVG indexikont kapott. A mobil kategória- és kereshető kalkulátorválasztó, valamint az asztali bal oldali lista a meglévő Kalkulátorok területén működik; nincs ügyfél-, projekt-, felmérés- vagy szervezeti rekordhoz kötve.
- A már ellenőrzött S1/S2/S10/S11 egyenes lépcső, S9 csigalépcső és S16 ferde elem mellett közvetlenül a bemenetek alatt eredményrajz jelenik meg. Az egyenes lépcső válthat oldal- és – megadott kar-szélesség mellett – felülnézetet; a csigalépcső alaprajzot és függőleges fellépés-kiosztást kapott. A rajz méretei fókuszba állítják a kapcsolódó inputot. Zoom, illesztés, visszaállítás, egér/touch pan és kétujjas pinch vezérlés elérhető.
- Az S3–S8, S12–S15 és S17 fordulós, húzott fokos és betonlépcső változat eredményrajza nem készült el, és a választóban letiltott. A hozzájuk tartozó egyedi ikon csak navigációs azonosító. A beton referenciákhoz részletes eredményrajz nem tartozik.
- A rajzi geometriát tiszta TypeScript transzformáció választja el a Reacttől, és a meglévő lépcsőmotor eredményét használja. A kar-szélesség opcionális, kizárólag rajzi bemenet, nem változtatja meg a számított fokgeometriát. A globális Liquid Glass és téma-tokenek maradtak; az SVG vászon témához illeszkedő, fedett hátteret kapott a háttéranimáció olvashatósági zavarásának elkerülésére.
- Matematika: egyenes fokosztás, rajzi végpontok, mértékarányos skálázás, spirál körív/fordulás és 1 440°-os szélső eset, ikon-lefedettség és nem támogatott rajz hiánya külön determinisztikus tesztet kapott. A rajzolás nem ad statikai, gyártási vagy normatív megfelelőségi jóváhagyást.

**Ellenőrzés:** fókuszált Vitest 5 fájl / 38 teszt PASS; `npm run lint`, Next.js 16.4.0 webpack `npm run build`, build után `npm run typecheck` és `git diff --check` PASS. A helyi production build böngészős smoke-jában ellenőriztem az egyenes lépcső számított értékeit és oldalnézetét, szélesség alapján a felülnézetet és annak inputfókuszát, a zoom/illesztés/visszaállítás műveleteket, valamint a csigalépcső alaprajzát és függőleges kiosztását. 1440, 1024, 768, 390 és 320 CSS px emulációban nem jelent meg vízszintes túlcsordulás; mobilon a kategória-/keresőválasztó nyitható; Enterrel aktiválható nézetválasztást is ellenőriztem. A rajzvászon sötét témájú számított háttere és eredmény SVG-je ellenőrizve. Egérrel rajztologatás, fizikai touch/pinch, világos téma, reduced-motion médiaemuláció, screen reader és fizikai iOS nem bizonyított; exportált screenshot nem készült. Hosted DB/Auth/RLS, adatmentés és üzleti workflow nem változott, ilyen módosítás nem történt.

Javasolt commit: `feat(F9.24.2): add professional stair drawings and visual navigation`.

## F9.24.3 — Pihenős lépcsők és betonlépcső szűkített geometriája

Státusz: **PARTIAL — 30/33 referencia szűkített, függetlenül ellenőrzött scope-pal; 3 húzott fokos variáns nem implementált.**

- Nyolc hivatkozás kapott eredményadó, korlátozott motort: S3/S5/S7, S12–S15 pihenős ortogonális lépcsőtervek; S17 egyenletes fokú, tömör betonék-térfogat. A három húzott fokos S4/S6/S8 továbbra is letiltott, eredményt nem mutat.
- Közös tiszta TypeScript pihenős lépcsőmotor számolja az explicit belépőből, kar-szélességből, pihenőmélységből, karszámból és karonkénti fellépésszámból az egységes fellépőt, fokokat, karfutást, szintintervallumot és befoglaló tervet. 90°, 180°, három kar és fordulásirány támogatott; az opcionális befoglaló méretvizsgálat nem teljes nyílás-ütközésanalízis.
- Az S17 térfogata csak a dokumentált tömör, lépcsőfokos felső profilú és vízszintes alsó síkú testre érvényes. A pihenő, ferde karlemez, zsaluzat, recept, vasalás és szerkezeti számítás nincs a scope-ban. A rajzok az ellenőrzött sík-/profilgeometriát használják, tartó- vagy gyártási rajzot nem adnak.
- Újrahasznosított: F9.24.2 műszaki rajzvászon, dimension-fókusz, nagyítás/illesztés, SVG stílusok és az eredeti katalógusválasztó; meglévő RoofWorkspace/TechnicalDrawing és független TetőPro tetőmotor változatlan. Nincs persistence, adatbázis, ügyfél/projekt vagy üzleti munkafolyamat-integráció.
- Független képletek és korlátok a [matematikai verifikációban](CALCULATOR_MATH_VERIFICATION.md), 33 referencia URL/mező/státusz a [lefedettségi mátrixban](CALCULATOR_COVERAGE_MATRIX.md) szerepel.

**Ellenőrzés:** fókuszált Vitest 6 fájl / 44 teszt PASS: konstrukciós mennyiségek és registry/UI, pihenős lépcső fixtures, meglévő tetőmotorok, cserepeslemez-fedés, lépcsőrajzok. `npm run build` (Next.js 16.4.0 webpack), build után `npm run typecheck`, `npm run lint`, `git diff --check` PASS. Egy helyi production böngészős munkafolyamatban a kontytető 10 000×6 000 mm / 45° eredménye 60 m² vetület, 84,853 m² geometriai tetőfelület, négy kontyél; 90°-os 8+8 kar 187,5 mm fellépő, 14 fok, 2650×2650 mm terv; U-alakú 8+8 kar 200 mm hézaggal 2960×2000 mm terv; háromkarú 6+6+6 kiosztás 166,667 mm fellépő és 2150×3050 mm terv; tömör betonék 5,88 m³. Sávalap 9,6 m³/48 m² kétoldali zsaluzat, 10×8×0,2 m alaplemez 16 m³/7,2 m² élzsaluzat, explicit 1:2:4 keverékarány 360/720/1440 kg, tíz Ø12×6 m rúd 53,269 kg és a mintaháló 21/26 rúd eredmény látszott. Korábbi F9.24.1/2 smoke tartalmazott nyeregtető-fedési, egyenes és spirál lépcső workflow-t. A korábbi 1440/1024/768/390/320 CSS px emulációban a 90°-os felület document/body szélessége egyezett a viewporttal, a rajz 749/607/652/314/247 px széles volt. Az utolsó SVG finomítás után a friss produkciós 320 px-es 90°-os munkafolyamatot újraellenőriztem: a 187,5 mm-es fellépő, 14 fok és 2650×2650 mm terv látszott; a fok-összesítő felirat eltávolításával a felülnézet nem takarja a fokokat, a belépő mező fókusza kiemeli a fokpoligonokat. Ez vizuális viewport-ellenőrzés, nem fizikai eszközteszt. A korábbi production smoke konzolhibát nem jelzett; a legutolsó vizuális menetben konzol-hozzáférés nem volt.

**Korlátok / nem ellenőrzött:** az S4/S6/S8 továbbra sem elérhető; a többi referencia scope-ja a mátrix szerint részleges. A jelen változatban a világos téma, screen reader, forced-colors, reduced-motion, valódi touch/pinch, fizikai iOS, teljes auth-állapot és minden 33 kalkulátor billentyűzetes útja nincs újra lefuttatva. A böngésző a route-ot közvetlenül, projekt/ügyfél query nélkül nyitotta; teljes authenticated navigation matrix nem készült. Statika, helyi normatív megfelelés, gyártói anyagadat, talaj és szerkezeti terv kívül esik a scope-on.

Javasolt Conventional Commit: `feat(F9.24.3): add verified landing stair geometries`.

## F9.24.4 — Húzott fokú lépcsők ellenőrzött geometriája

Státusz: **PARTIAL — S4/S6/S8 motor, felülnézet/kiterített profil, UI-regisztráció, matematikai fixtures és production böngészős workflow sikeres; a 320 px-es tényleges böngésző viewport és touch/pinch nincs ellenőrizve.**

- A korábban tiltott S4 90°, S6 180° és S8 háromkarú húzott variánsok egyetlen tiszta TypeScript `calculateWinderStairGeometry` motorra kerültek. A motor csak explicit belső sugárral, kar-szélességgel, fordulónkénti fokszámmal és karonkénti vízszintes fokszámmal támogat koncentrikus, egyenlő szögű fordulókat.
- A forduló fokpoligonjai az annularis szektorok egyenes húrokkal határolt négyszögei; a középvonalas járóvonal-belépő `s=rθ` szerint készül. Minden fok területét/konvexitását és minden fokpár belső átfedését számításkor ellenőrzi. Nyílás-befoglaló dimenziót opcionálisan ellenőriz.
- Az eredmény SVG alaprajza és kiterített járóvonal-profilja ugyanazt az eredményobjektumot rendereli, mint a motor. A kiterített profil kifejezetten nem ortogonális oldalnézet és nem gyártási rajz.
- A kalkulátorok a Kalkulátorok kategórián belüli kereshető vizuális választóból érhetők el; nincs projekt-, ügyfél-, felmérés-, árajánlat-, anyaglista- vagy munkanapló-kapcsolat, perzisztencia vagy adatbázis-változás.
- Frissített lefedettségi és matematikai dokumentáció: [CALCULATOR_COVERAGE_MATRIX.md](CALCULATOR_COVERAGE_MATRIX.md), [CALCULATOR_MATH_VERIFICATION.md](CALCULATOR_MATH_VERIFICATION.md).

**Ellenőrzés:** `npx vitest run src/domain/calculations/construction src/domain/drawings/construction-stairs.test.ts src/domain/calculations/roof-geometry.test.ts src/domain/calculations/gable-metal-tile-covering.test.ts` — 7 fájl / 56 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Egy helyi production browser workflow-ban a kereshető listából S4/S6/S8 kiválasztása, mezőkitöltése, eredményei és a rajznézet működött. S4 (2800/800/300 mm; 4/6 karfok; 3 fordulófok; jobbra): 200 mm fellépő, 14 fellépés, 13 fok, 366,519 mm járóvonal-belépő, 30°, 2566,077×3299,115 mm alaprajz. S6 (4/6 karfok; 4 fordulófok; balra): 186,667 mm, 15/14, 549,779 mm, 45°, 4398,672×2200 mm. S8 (4/5/6 karfok; 3 fordulófok; jobbra): 127,273 mm, 22/21, 366,519 mm, két külön 90°-os forduló, 3299,115×4032,596 mm. Az SVG plan/profile tab, zoom és illesztés gombok böngészőben működtek; a kalkulátor felületén az animált háttér 2,5%-os opacitásra van visszafogva, az üvegfelület stílusát és transparency tokeneket megtartva. A production screenshot 1280×720 nézetet mutatott.

**Korlátok / nem ellenőrzött:** ebben a böngészőkörnyezetben nem volt hozzáférhető 320 px-es viewport-override; 1440/1024/768/390/320 méretsor, 320 px-es scrollWidth, valódi touch/pinch/pan pointer cleanup, világos téma, screen reader, reduced-motion és forced-colors nem futott. Sémás/media-query kódot implementáltunk, de a 320 px megfelelőséget nem állítjuk bizonyítottnak. Nincs adatbázis-, hosted-, project/customer- vagy üzleti folyamatváltozás.

Javasolt Conventional Commit: `feat(F9.24.4): add verified winder stair geometry`.

## F9.24.5 — Beton- és alapozási műszaki rajzrendszer

Státusz: **PARTIAL — mind a 10 meglévő beton/alapozás/segéd kalkulátorhoz készült eredményhez kötött műszaki rajz; a teljes Vitest suite-ban 4, ettől független korábbi UI-elvárás hibás.**

- A C1–C10 mindegyike saját, bemenetvezérelt SVG-nézetet kapott. A rajzok csak a meglévő ellenőrzött eredmény után jelennek meg, az aktuális mennyiségi határokon belül maradnak, és a kapcsolódó méretre kattintva a bemeneti mezőt fókuszálják. Sávalap, alaplemez, gyűrű, cölöp, burkolat, épület körüli sáv, megadott összetételű keverék, egyenes betonacél, háló és átló rajzscope-ja a [lefedettségi mátrixban](CALCULATOR_COVERAGE_MATRIX.md) szerepel.
- Nincs új domain-képlet vagy adatmodell. A háló darabszáma/tényleges osztása a meglévő motorból származik; rúd- és cölöpszimbolika, illetve nagy hálórajz ritkítása kizárólag a megjelenítést korlátozza. Nem számítunk alapozási megfelelőséget, vasalástervet, mixreceptet, lapkiosztást, zsaluzási geometriát hiányzó bemenetből vagy szerkezeti jóváhagyást.
- Meglévő `GlassToolbar`, műszaki SVG-vászon, rajzi dimenziófókusz, nézetváltás és zoom/pan/pinch pointerkezelés újrahasznosítva. A rajzillesztés gyűrűmetszetnél külön rajzi tartományt használ, hogy a magas, keskeny szelvény ne vesszen el a vászonban. A Liquid Glass, meglévő téma- és skálázási tokenek maradtak.
- Mind a tíz Zhitov referenciaoldalt külön áttekintettük mezők és nézetfunkciók azonosítására. Eredményük nem volt matematikai oracle; rajz/kód/materiál nem másoltunk. Az önálló route nem ír adatot és nem kapcsolódik üzleti workflow-hoz.
- Független 10 mennyiségi fixture-hez a meglévő domain-tesztek és 17 SVG-renderelési/nézet/vezérlőteszt futott. A számszerű mintákat és korlátaikat a [matematikai verifikáció](CALCULATOR_MATH_VERIFICATION.md#f9245--betonrajzok-geometriai-ellenorzese) tartalmazza.

**Ellenőrzés:** fókuszált Vitest: 3 fájl / 34 teszt PASS (`concrete-drawings.test.tsx`, `construction.test.ts`, `catalog.test.tsx`); `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Teljes `npm test`: 124 fájl PASS, 4 fájl FAIL, 8 fájl SKIP; 535 teszt PASS, 4 FAIL, 25 SKIP. A 4 hiba korábbi, nem betonrajz-kódot érintő UI-elvárás: `takeoff-forms.test.ts` (`square_meter` régi címke), `standalone-gable-preview.test.ts` (régi tetőcím), `measurement-guidance.test.tsx` (régi `details` markup), `data-loading.test.ts` (régi hibaüzenet). Nem változtattam ezeken.

A friss production build helyi browser smoke-jában önálló route-on egy 10 000×400×800 mm sávalap 3,2 m³ / 16 m² értéket, 1200×100×1000 mm gyűrű 0,346 m³ beton/0,785 m³ belső térfogatot mutatott; a kereső C10-en belül navigált. A háló 5000×3000 mm, 50 mm fedés, 200 mm max. osztás, Ø10 esetén 16/26 rudat, 153,8 m-t, 196/193,333 mm tényleges kiosztást adott. Alaprajz/metszet váltás, zoom és fit, rajzi méret→input fókusz ellenőrzött. Ugyanezen gyűrű-workspace esetén a 1440/1024/768/390/320 CSS px viewporton a document/body scrollWidth egyezett a viewporttal: 1440/1440, 1024/1024, 768/768, 390/390, 320/320. A 320 px toolbar két sorba tört átfedés nélkül. Ez böngésző-viewport emuláció, nem fizikai telefon- vagy touch/pinch teszt; világos téma, forced colors, screen reader és reduced-motion emuláció nem futott.

Javasolt Conventional Commit: `feat(F9.24.5): add concrete technical drawings`.

## F9.28 — Architektúra-leltár, anyagválasztó és felmérés→kalkuláció

Állapot: **PARTIAL — KÓD ÉS CÉLZOTT ELLENŐRZÉS KÉSZ; TELJES VIEWPORT/TÉMA/A11Y MÁTRIX NEM IGAZOLT.**

- A gyökér [funkciok.md](../funkciok.md) 440 projektkarbantartott `.ts`/`.tsx` fájlt ír le. A fájlrendszer-ellenőrzés 440 leltársorral, 440 egyedi útvonallal, hiányzó és többlet fájl nélkül zárult; a generált `next-env.d.ts` és `src/infrastructure/supabase/database.types.ts` kimaradt. A dokumentum leírja a rétegeket, workflow-kapcsolatokat, migrációs/séma-biztonsági támpontokat és fenntartási szabályokat.
- A katalógusválasztó hibáját reprodukáltam. Az opció kattintása a dialógusban kiválasztást és bezárást végzett, utána a fölérendelt natív `<label>` implicit aktiválása ismét megnyomta a társított választógombot, így az újranyitotta a dialógust. A címkézés nélküli `div role="group"` konténer és a választógomb pontos, kontextuális `aria-label`-je megszünteti ezt az aktiválási láncot; a kategória-, egység-, ár- és mentési validáció változatlan.
- A felmérés elsődleges hozzáadási sora pontosan két lehetőséget mutat: `Új tetőszakasz` és `Új egyéb szakasz`. A `Munkatípus` szerkesztése az egyéb szakasz beállításában továbbra is elérhetővé teszi a csatorna- és szegélyszakaszt; meglévő, mentett speciális szakaszok megnyitása és mérései megmaradtak.
- A kalkulátor művelet neve a célját magyarázza, típusválasztót ad geometriához/trapézlemezhez és cserepeslemez-fedéshez, és érvényes felmérési tetőméreteket automatikusan átad. A tetőgeometriát és forrás UUID-ket kezdetben összecsukja; a geometria külön kérésre szerkeszthető, a forrás/revízió az opcionális disclosure-ben látható. A meglévő motort használja, felmérés-hivatkozása pontos revíziójú. A kalkulátor megnyitása nem hoz létre anyaglistát; a cserepeslemez mentése a szükséges termékparaméterek nélkül le van tiltva.
- Nem változott séma, SQL, RLS/Auth, RPC, mentési adapter vagy domainmotor. Meglévő jogosultsági, verzió- és snapshot-szerződések újrahasznosulnak; DB-teszt nem indokolt. A forrásfelmérésből anyaglista továbbra is csak a már támogatott, kifejezett ellenőrzési/mentési útvonalakon hozható létre.

**Böngészős elfogadás — helyi, hitelesített DEMO:** katalógusból termékkeresés, egérrel kiválasztás Escape nélkül, automatikus bezárás, egység/validált ár megjelenítése, 2,5 m hozzáadása, mentés és újranyitás után az 1 sor, 2,5 m, 3 500,50 Ft/m és 8 751,25 Ft összeg megmaradt. A létrehozott, kifejezetten DEMO ellenőrző anyaglista azonosítója `422d13dc-2706-43a0-a286-5a4a00e8a4cd`, revíziója `46894eaa-e4c5-40e7-9316-4061623c8108` (V1). A `.env.local`-ból csak a hostnevet olvastam ki: `NEXT_PUBLIC_SUPABASE_URL` → `127.0.0.1`; a tesztlista a helyi Supabase projektben jött létre, hosted adatbázisba nem írtam. Meglévő V5 felmérésben a két gyorshozzáadás gomb ellenőrizve; mindkét szakasztípus hozzáadható volt az el nem mentett piszkozatban, melyet mentés nélkül elvetettem. Meglévő csatorna- és szegélymérések változatlanul megnyithatók. A mentett tetőfelmérés `b66caa4f-4882-4193-b91e-706a0f4b9e37` V5, forrásrevízió `76e4ece1-69e8-4926-a294-d19cbdaa7468`; az automatikusan átvett 10 × 6 m, 3 m emelkedésből a meglévő motor 84,853 m² felületet mutatott. A cserepeslemez választás a geometriai mezők ismétlése nélkül, külön termékparaméter-mezőkkel és ugyanazzal a forrásrevízióval jelent meg. Kalkulációt nem mentettem.

**Ellenőrzések:**

- Célzott Vitest: 5 fájl / 25 teszt PASS (`workflow-material-product-picker.test.tsx`, `workflow-material-list-editor.test.tsx`, `field-survey-editor.test.tsx`, `gable-metal-tile-covering-preview.test.ts`, `standalone-gable-preview.test.ts`).
- `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS (Next.js 16.4.0 webpack, 30 statikus oldal); végleges dokumentáció után `git diff --check` PASS.
- Adatbázis-, hosted-, migráció-, teljes Vitest- és fizikai eszközteszt nem futott. A böngésző-egér munkafolyamat, a billentyűzetes kategória- és termékválasztás, a világos/sötét dashboard nézet és a mentetlen módosítási védőpárbeszéd ellenőrzött; a sötét témát visszaállítottam. CSS-pixel 1440/768/390/320 nézetemuláció, screen reader, forced-colors, fizikai touch/pinch és iOS nem bizonyított. A jelenlegi CUA munkamenet nem adott viewport-emulációs vezérlőt.
- Egyetlen üzleti adatváltozás a fent azonosított helyi, DEMO anyaglista tesztrekord. A felmérésre és számításra írás nem történt; hosted adat, meglévő másik üzleti rekord, adatbázisséma, jogosultság vagy revíziós snapshot nem változott.

Részletes handoff: [F9_28_HANDOFF.md](../F9_28_HANDOFF.md). Teljes Vitest regresszió nincs állítva.

Javasolt Conventional Commit: `feat(F9.28): document architecture and streamline survey calculation`.

## F9.32 — Daily workflow E2E validáció

Státusz: **COMPLETE a helyi, hitelesített DEMO végigjárható workflow-ra; korlátozások a részletes riportban.**

- A mentett, önálló DEMO felmérés összesítő gombja az első mentés után route-frissítéskor elvesztette a helyi nézetállapotot. A frissítést eltávolítottam ebből a gombműveletből; a V1 összesítő és anyaglista CTA most böngészőben megnyílik.
- A felmérésből induló, üres árú anyaglista tételeit a standalone árajánlat draft szabálya és DB írója elutasította. A standalone-only validator és additive SQL writer módosítás üresen megőrzi az árat és a `missing` eredetet; részösszeget csak megadott árakból képez, a `complete` értéket hamisan állítja, a kiállítási readiness pedig hiányos marad. Projektajánlat-séma változatlan.
- Munkanapló `Új` útvonala létező naplók mellett csak régi naplót mutatott. Az útvonal explicit `initialCreate`-et ad; külön teszt igazolja a létrehozó űrlap megjelenését.
- Anyaglista 1024 px-en túlcsordult, mert a mobil/táblagép sor- és mezőgrid csak 980 px alatt váltott. A kapcsolódó töréspontok 1100 px-re kerültek; mind a négy workflow 1440/1024/768/390/320 CSS px-en újra ellenőrzött.
- Kód és adatbizonyíték: [F9.32 end-to-end riport](F9_32_END_TO_END_REPORT.md). Nem történt hosted módosítás, adatbázis-reset, commit, push vagy deploy.

**Ellenőrzés:** teljes Vitest 134 fájl PASS / 9 SKIP, 584 teszt PASS / 27 SKIP; teljes helyi pgTAP 39 fájl / 960 assertion PASS; helyi Auth/RLS integráció 4 fájl / 11 teszt PASS; typecheck, lint, production build és `git diff --check` PASS. A migration CLI a korábbi, helyi F9.31 `20261017120000_secure_sheet_layout_writer.sql` napló/séma eltérése miatt megállt; a F9.32 create-or-replace RPC-t helyi DB-n, reset nélkül alkalmaztam és a pgTAP ellenőrizte. Ennek pontos korlátai a riportban.

Javasolt Conventional Commit: `fix(F9.32): stabilize daily workflow and draft pricing`.

## F9.33 — Comprehensive Roof Calculation Enhancement

Állapot: **PARTIAL — a közös, független fixture-ekkel ellenőrzött geometriai eredmények elkészültek; az aszimmetrikus, eltérő hajlású és termék-/szerkezeti számítási kiterjesztés nincs teljesítve.** Részletes eredmény-, adat- és képletmátrix: [ROOF_CALCULATION_SPECIFICATION.md](ROOF_CALCULATION_SPECIFICATION.md).

- A `summarizeRoofGeometry` meglévő `calculateRoofGeometry` sík-, csúcs-, terület- és élkimenetéből egy közös eredménymodellt készít. Felület, vízszintes vetület és élösszeg a meglévő hétformás motort használja; az új pitch-fok/százalék, hajlásirányú futás/ferde síkméret és síkcsoport-összeg explicit levezetéssel készül.
- A felmérés meglévő rajza alatt 4–6 elsődleges mérőszám és natív, összecsukható sík/él/anyagkorlát részlet jelenik meg. A mért inputok és a számított geometria provenance-felirata különválasztja a forrást. Nem keletkezik önálló számítási rekord.
- Az önálló `/kalkulatorok` 33 ref-es katalógusából nyeregtető, félnyeregtető és kontytető jeleníti meg ugyanezt a shared domain summary-t; a survey/workflow függőség nincs. A meglévő gable material-only termékkimenet külön maradt. A manzárd, szarufa és háromszög tartó saját szűkített motorral működik.
- A rajz a geometriával egyező sík/él ID-ket és kategóriákat mutatja; a több polygonra bontott motorfelületek csoport-/részletszámot kapnak, és a patch polygon nem rajzol mesterséges belső felületkontúrt. Az SVG meglévő pan/zoom működése maradt.
- **Újrahasznosított architektúra:** UI → meglévő feature/workspace → tiszta shared TypeScript geometry és summary. Nincs új engine, függőség, migration, mentett output vagy schema. Korábbi `field_survey_revisions` és számítási snapshot nem íródik át; a jelenlegi inputból számítunk.
- **Adatkonszisztencia/jogosultság:** nincs tartós adatmutáció, így nincs új org- vagy concurrency-útvonal. A local authenticated browser check csak existing record read-only megnyitása és standalone unsaved bemenet volt; Survey mentést nem végeztem. DB/RLS teszt nem alkalmazható erre a diffre.

**Zhitov referencia-felderítés:** mind a hét roof/sheet-fastener referencia áttekintve a bemeneti méretek, kimenet, rajz és saját súgókorlát szintjén; félnyereg, nyeregtető, manzárd és konty sample result oldalak hozzáférhetők voltak. Nem másoltunk kódot, rajzot vagy képletet, Zhitov numerikus output nem volt orákulum. A gable/shed súgók területből számolt lemez-darabszám pontatlanságát, a gable faanyagban vágás levonásának korlátját és a gyártói átfedés/veszteség szerepét jelzik. A forrásokat az új specifikáció közvetlenül linkeli.

**Matematikai bizonyíték:** a hét meglévő `ROOF_ENGINEERING_REFERENCES` fixture ellenőrzi a teljes/vetületi területet, 45° hajlást és eave/upper/ridge/rake/hip/valley kategóriánkénti analitikus élhosszt. Az új összegző teszteli a pitch-% trigonometriát, a gable 0,5 m eresz- és 0,2/0,3 m oromtúlnyúlást, a hiányzó él `unavailable` állapotát és hat nem-gable Survey/standalone summary-egyezőségét. Eredmény: 10×6 m/3 m gable `84,853 m²`, 45°/100%, `60 m²` vetület, `20 m` eave és `10 m` ridge; 10×6 m/45° konty `84,853 m²`, `32 m` eave, `4 m` ridge és `20,785 m` hip.

**Ellenőrzések (tényleges futtatás):**

- `npx vitest run src/domain/calculations/roof-geometry-results.test.ts src/domain/calculations/roof-geometry.test.ts src/domain/calculations/roof-geometry.engineering-audit.test.ts src/domain/drawings/gable-drawing.test.ts src/features/field-surveys/gable-survey-preview.test.ts src/features/field-surveys/field-survey-editor.test.tsx src/features/roof-models/roof-geometry-results.test.tsx src/features/roof-models/roof-type-selector.test.tsx src/features/roof-models/technical-drawing.test.tsx src/features/roof-models/drawing-viewport.test.ts src/features/roof-models/multi-roof-form.test.tsx src/features/roof-models/measurement-guidance.test.tsx src/features/roof-models/project-roof-drawings.test.ts` — **13 fájl / 133 teszt PASS**, célzott regresszió; teljes Vitest nem futott.
- `npm run typecheck` — PASS. `npm run lint` — PASS. `npm run build` — PASS, Next.js 16.4.0 webpack; 30 static page generálva, `/kalkulatorok` route benne.
- Helyi, autentikált Brave smoke — PASS read-only: mentett Survey V5 eredménysor; standalone `/kalkulatorok` gable, shed és hip mezőkitöltés után eredmény + SVG; wide desktop screenshot. A viewport-emuláció nem volt elérhető, ezért mobil CSS-pixel/physical-device, touch/pinch, reduced-motion, screen-reader és forced-colors nem vizsgált.
- `git diff --check` — PASS a dokumentációs patch után; az új fájlokra a whitespace-vizsgálatot külön futtattam.
- DB unit/integration, pgTAP, hosted DB, migration, reset, teljes Vitest: **nem futott**. Sem meglévő mentett rekord, schema, auth/RLS boundary, hosted adat, commit, push vagy deploy nem változott.

**Ismert korlát / nem ellenőrzött követelmény:** nyeregtetőn a meglévő szimmetrikus keresztmetszet támogatott (külön első/hátsó hosszirányú túlnyúlással); aszimmetrikus két sík, eltérő hajlás, generalizált L/T eltolás és nem-gable túlnyúlás nincs. Standalone eredmény-panel csak 3/7 geometry típust használ; félkonty/sátor/L/T jelenleg Surveyen érhető el. A slope length geometriai méret, nem kiosztott/vágott szarufa. Szarufa/léc mennyiséghez kiosztási adatok hiányoznak; alátét, gyártói átfedés, lemezhasznos méret, elhelyezés/vágás/veszteség és rögzítőszám nincs igazolva; statikai megfelelőség és gyártási részlet nincs.

Javasolt Conventional Commit: `feat(F9.33): unify verified roof geometry results`.

## F9.34 — Complete Roof Geometry Coverage & UX

Státusz: **PARTIAL**. Az állapotfelmérés megerősítette, hogy a F9.33 közös summary már minden meglévő, általános tetőgeometria-suite kalkulátoron fut (nyeregtető, félnyereg, konty), a Survey pedig mind a hét támogatott tetőformát automatikusan számolja/rajzolja. A standalone suite 33 bejegyzéséből 6 tető/faszerkezet; a másik három (szarufa, manzárd, rácsos tartó) külön inputú, külön célú validált motor. Nincs standalone általános tetőforma-választó, ezért nincs indokolt hiányzó belépő vagy duplikált kalkulátor hozzáadására.

- Auditmátrix dokumentálja a hat tető/faszerkezet-bejegyzés célját, bemeneteit, motorját, geometriai határát, eredményeit, rajzát és még nem számított kimeneteit. A gable cserepeslemez-kimenet külön termékspecifikus, meglévő motor maradt.
- A közös summary és a TechnicalDrawing ugyanazt a RoofGeometry outputot használja; Survey automatikus előnézet és disclosure eredmények, külön indítás/bemenet nélkül, a korábbi F9.33 kódútvonalon bizonyított.
- Hétformás audit-teszt bővült: az azonos 3D végpontpár egyedi edge rekordot kap, a kétoldali topológiai élek különböző síkokhoz tartoznak, a coplanar belső patch-határ nincs kiszámlálva. A terület/vetület/síkösszeg/élkategória képletek a meglévő független DEMO fixture-eken futnak.
- A F9.35 követelmény-specifikáció rögzíti a hét forma sík-polygonján alapuló, explicit kiosztást; bemeneteket, képleteket, egységeket, validációt, független fixture-eket és statikai határt. Nincs jövőbeli számítás előre implementálva.
- Adatkonzisztencia/jogosultság: nincs írás vagy DB-séma/RLS/workflow változás; a survey revision és business integration változatlan. Auth/DB concurrency teszt nem alkalmazható a diffre.
- Mobile-first elrendezés és akadálymentesség: a meglévő Liquid Glass disclosure, reszponzív RoofWorkspace/TechnicalDrawing és natív vezérlők maradtak. A fizikai mobil, touch/pinch, screen reader és viewport-emuláció nem bizonyított.

A pontos F9.34 teszt/typecheck/lint/build és browser-smoke eredményt a TEST_MATRIX rögzíti. Teljes regreszió, hosted DB, adatbázis-reset, migráció, commit, push és deploy nem történt.

Javasolt Conventional Commit: feat(F9.34): audit shared roof geometry coverage.
## F9.35 — Szarufa, lécezés és faanyag-mennyiségek

Státusz: **IMPLEMENTED / F9.35.1 MATEMATIKAILAG ÉS HELYI PERSISTENCE-SZEL STABILIZÁLVA**. A közös `calculateRoofTimberLayout` domain motor a validált roof-plane polygonokat és azok 3D szakaszait használja. Explicit max spacing + kezdő/záró peremsáv szükséges; keresztmetszeti térfogat csak felhasználói szélesség/magasság párból jön. Az azonos térbeli gerinc/határ szakasz egyszer számít a geometriai összegben, ami önmagában nem határozza meg a fizikai tagozást.

- Surveyen a meglévő tetőmunkaszakasz eredménye alatt opcionális „Szarufák és lécezés” disclosure jelent meg. A bemeneteket a strict section contract, session draft recovery, save serializer és új additív `20261017140000_survey_roof_timber_parameters.sql` snapshot allowlist megőrzi. A számítás a paraméterekből újraszámolódik; mérés és revision flow változatlan.
- A standalone általános tető panel ugyanazt a domain függvényt hívja a meglévő `roof.gable`, `roof.shed`, `roof.hip` bejegyzésben. `roof.rafter`, `roof.mansard`, `roof.truss` nem módosult; új entry nincs.
- A technical drawing `timber-layout` rétege a motor szakaszait rajzolja, síkcsoportonkénti osztást mutat, és a geometriai vázlatot sematikusnak nevezi. Az input-frissítés nem cseréli le a geometriai base modelt, így a rajz nézete/zoomja nem resetelődik.
- F9.35.1 kézi numerikus orákulumot adott mind a hét geometriához. Az L/T tesztek statikus, kézzel felvett 3D plane polygonokon futnak, nem hívják a production geometry generátort: L szarufa 57,275649 m, T szarufa 56,568542 m; lécvonal mindkettőnél 142,2 m. A 14 domain fixture a határvágást, egyedi geometriai vonalakat, osztást, peremsávokat, 3D hosszt, keresztmetszetet és m³ egységet is vizsgálja.
- Releváns tető/Survey/rajz Vitest: `npx vitest run src/domain/calculations/roof-timber-layout.test.ts src/features/field-surveys/field-survey-editor.test.tsx src/features/roof-models/technical-drawing.test.tsx src/domain/field-surveys/workspace.test.ts src/features/field-surveys/survey-draft-recovery.test.ts src/domain/calculations src/features/roof-models src/features/field-surveys --reporter=dot` — 52 fájl / 344 teszt PASS, 5 fájl / 15 teszt SKIP. Ez széles releváns regresszió, nem a teljes projekt Vitest suite.
- `npm run typecheck` és `npm run lint` az utolsó módosítás után PASS. `npm run build` Next.js 16.4.0 webpack — 30 statikus oldal — PASS a jelenlegi alkalmazáskóddal; azóta csak tesztfixture és dokumentáció változott.
- Helyi DB: `npx supabase migration list --local` verziói a helyi/remote ledger oszlopokban egyeznek `20261017140000`-ig; pending discrepancy nincs, reset vagy migrációfuttatás nem történt ebben az ellenőrzésben. `npx supabase test db --local supabase/tests/database/026_unified_field_survey_workspace.sql supabase/tests/database/038_survey_roof_timber_parameters.sql` — 2 fájl / 50 pgTAP PASS; a már meglévő Survey writer, jogosultság/verzióütközés, immutable revision és paraméter-snapshot útvonalat teszteli. A hosted DB érintetlen.
- Hitelesített LOCAL DEMO böngésző: V1 létrehozás, frissítés, visszanyitás; mind a 10 faanyag paraméter helyreállt. V1 szarufa: 2500 mm, 10 geometriai tengely, 42,426 m, 0,3182 m³; léc: 1000 mm max, 11 geometriai vonal, 110 m, 0,33 m³. A szarufatáv 2000 mm-re szerkesztése és új V2 mentése 12 tengelyt, 50,912 m-t és 0,3818 m³-t adott. V1 és V2 külön történeti nézetben egyezett a saját snapshotjával; a rajzi overlay/figyelmeztetés látható.
- A CUA mobil viewport csak külön, nem hitelesített IAB munkameneten volt elérhető; ott a privát Survey route nem hozzáférhető. Mobil böngészős/authenticated viewport és fizikai eszköz nincs igazolva. Teljes Vitest suite, screen reader, hosted DB nem futott.
- Nincs reset, hosted DB-változtatás, commit, push vagy deploy.

Javasolt Conventional Commit: `fix(F9.35.1): validate roof timber quantities and revisions`


## F9.36.1 — tető alátétfólia és fedési mennyiségi alap

Állapot: **IMPLEMENTED / VERIFIED GEOMETRIC QUANTITY; 1D CUTTING MINIMUM IS ASSUMPTION-BASED; OTHER PHYSICAL LAYOUTS UNSUPPORTED**. Új közös alátétmotor a meglévő RoofGeometry síkpoligonjaiból csíkozást, lap-polygonokat, vágási hosszakat és korlátos pontos 1D tekercsvágási minimumot ad. Támogatott `gable`, `shed`, `hip`; `halfHip`, `pyramid`, `lShape`, `tShape` expliciten unsupported. Új strict roll/sheet covering product-paraméter séma készült; a meglévő trapéz- és cserepeslemez motor változatlan, univerzális sheet packing nincs.

A Survey roof section optional `roofUnderlayParameters` snapshotot tárol, az immutable revisionből újraszámol; a standalone gable/shed/hip kalkulátorok ugyanazt a motort használják külön UI-state mellett. Az SVG a panel azonos `courses`/`overlaps` poligonjait rajzolja, sematikus nem-gyártási címkével. Nincs business workflow vagy anyaglista integráció.

Bizonyított demo: 10×6 m alaprajz, 4 m emelkedés, 1500×50000 mm tekercs, 150 mm oldalátfedés, nulla végtoldás, eresztől fektetés: 100 m² nettó, 8 csík, 80 m össz-vágáshossz, 120 m² teljes szélességű blank, 2 tekercs pontos hosszmenti packing minimum. LOCAL Auth böngészőben V1 mentés és frissítés utáni visszaállítás; 200 mm oldalátfedéssel V2 mentés; V1 történeti olvasás és V2 újranyitás igazolta a snapshotokat és újraszámítást. A tekercsszám matematikai vágási minimum, nem beszerzési mennyiség.

 `npx vitest run` a releváns domain/drawing/field-survey/roof-model/calculator könyvtárakon — 64 fájl / 398 PASS, 5 skip; `npm run typecheck`, `npm run lint` és az izolált ideiglenes másolaton futó `npm run build` (Next.js 16.4 webpack, 30 statikus oldal) PASS. Egy későbbi audit long-cut fixture-e megtalált és javított egy end-lap végdarab többletet; az ezt követő fókuszteszt 11/11 PASS. Helyi migration ledger olvasva; egyetlen pending `20261017150000_survey_roof_underlay_parameters.sql` additív migrációt helyi DB-re alkalmaztuk, reset nélkül. `npx supabase test db --local` az új 039 és korábbi 026/038 survey contractokra 3 fájl / 63 pgTAP PASS. Hosted DB nem érintett. A végső patch után a 64 fájlos releváns suite, typecheck, lint és build ismét PASS; `git diff --check` PASS. A migration ledger újraolvasva `20261017150000`-ig egyezik; hosted projekt nincs kapcsolva.

**F9.36.2 átadás:** a metal sheet layout/purchase spec a `ROOF_CALCULATION_SPECIFICATION.md` alján található; physical/effective méretek, gyártói provenance, sík/éltopológia, fizikai különállás, korlátos exact-or-unsupported vágási optimalizáció és kézi polygonos fixture követelményekkel. Lemezdarabszám területből továbbra sem állítható elő.
