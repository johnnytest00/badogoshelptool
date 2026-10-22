# F9.63.3 — Kalkulátor runtime és betöltési validáció

## Végső döntés: PASS WITH FINDINGS

A három kalkulátorkategória működését a már hitelesített helyi DEMO-munkamenetben, valódi Brave böngészőben ellenőriztem. A tető, lépcső és beton modulok a kiválasztásukkor jelentek meg a Network naplóban; az érvényes betonbemenet a különálló rajzmodult is betöltötte. Nem találtam működési regressziót.

A mérések Next.js fejlesztői szerveren, meleg böngészőcache mellett készültek. A F9.63.2 production webpack artifactméreteit nem lehet ezekből runtime sebességgel vagy hideg cache hálózati költséggel összehasonlítani. Ez a teljesítményállításokat korlátozza, nem a megfigyelt kalkulátor-működést.

## Környezet és módszer

| Tulajdonság | Érték |
|---|---|
| Alkalmazás | `http://localhost:3000/kalkulatorok` és `?calculator=concrete.pile` |
| Kiszolgáló | Next.js **16.4.2**, fejlesztői mód, Turbopack; meglévő szervert nem indítottam újra vagy állítottam le |
| Böngésző | Brave, a felhasználó meglévő hitelesített helyi DEMO-munkamenete; nincs credential-kinyerés vagy fiókmódosítás |
| Hálózat/CPU | No throttling; a Network „Disable cache” kapcsoló kikapcsolt állapotban |
| Cache | Meleg. Több chunk `304 Not Modified` választ kapott, erőforrásméretük böngészőcache-ből jött |
| Viewport | iPhone SE emuláció **375×667**, iPad Mini **768×1024**, Responsive **1440×900** |
| Téma | Sötét és világos váltását ellenőriztem a műhelyben; az eredeti sötét beállítást visszaállítottam |
| Adat | Csak kalkulátor-előnézeti bemenetek; az oldal jelzi, hogy az eredmény nem mentődik üzleti rekordba |

A Network panel mérte a böngésző tényleges kéréseit. A forgalmi összesítők a fejlesztői runtime és a meleg cache hatását is tartalmazzák; nem production vagy hideg cache baseline-ok.

## Böngésző-hozzáférés és navigáció

Az előző IAB-hozzáféréstől eltérően a Brave-ben meglevő, bejelentkezett helyi munkamenet működött. A `/kalkulatorok` hub az alapértelmezett **Szarufa kiszabása** kalkulátorral renderelt, nem üres shellként.

Ellenőriztem a `calculator=concrete.pile` közvetlen URL-t, az aktív kalkulátor újratöltését, a Back és Forward gombot, a műhelyből visszatérést, a kategóriaváltást és a `roof → stair → concrete → roof` gyors váltási sort. A query-paraméteres kalkulátor reload és Forward után is kiválasztva maradt. A gyors váltás után a Roof kategória és a szarufa kalkulátor jelent meg.

## Chunk-betöltés és hálózati mérések

| Esemény | Network-megfigyelés |
|---|---|
| `/kalkulatorok` újratöltés, alapértelmezett tető | **45 kérés**, ebből **24 JS**; összesen **25 131 B átvitel**, **6 912 370 B erőforrás**; DCL **318 ms**, Load **640 ms**, Finish **750 ms**. A tetődefiníció chunkja `src_features_calculators_roof-calculator-definitions_ts_…js`: **12,2 kB erőforrás**, kb. **0,3 kB átvitel**, **9 ms**, cache-érvényesítéses válasz. |
| Lépcső kategóriára váltás | Egy új JS kérés: `src_0r2gqgz3g-jcl._.js`, **68 686 B erőforrás**, **252 B átvitel**, **3 ms**, **304**; kezdeményező a kategória-loader. |
| Beton kategória hubból | Egy új JS kérés: `src_1za5vk5v4hmfn._.js`, **54,5 kB erőforrás**, kb. **0,3 kB átvitel**, **17 ms**, **304**. |
| Közvetlen `concrete.pile` deep link | A beton definíció már a kezdeti JS-kérések között volt; route összesen **41 kérés / 24 JS**, **24 819 B átvitel / 6 944 867 B erőforrás**, DCL **339 ms**, Load **580 ms**, Finish **848 ms**. |
| Érvényes cölöp-bemenet és rajz | A külön rajzimport `src_1pko-k-m39nt2._.js`: **309 kB erőforrás**, **252 B átvitel**, **4 ms**; egy kapcsolódó Lucide chunk **8,0 kB / 252 B / 3 ms**. A rajz a számítási eredmény után megjelent. |

A `/kalkulatorok` kezdeti naplójában a tetőmodul látszott; a lépcső- és betonmodul új kérése csak a megfelelő kategóriaváltáskor jelent meg. A beton deep link a betonmodult kezdetben töltötte, a másik kategóriáét nem vizsgáltam ezen a dokumentumnavigáción. Ismételt lépcsőválasztásnál nem jelent meg második chunkkérés. Nem láttam duplikált kategóriakérést. A route és az alkalmazás menülinkjei nem indítottak megfigyelhető előtöltést a vizsgált útvonalváltások előtt.

**Korlát:** a `304` válaszoknál az átvitt bájtok csak a feltételes kérés méretét jelzik; a teljes resource size cache-ből származik. A fejlesztői JS-resource összesen körülbelül **5,8 MB** volt a tető route-on, ami Next dev/HMR runtime-ot és fejlesztői chunkokat is tartalmaz. Ez sem a F9.63.2 production webpack artifactméreteivel, sem hideg letöltési költséggel nem összevethető. A lazy-load határ böngészőben látszott, a valós felhasználói gyorsulás nem bizonyított.

## Funkcionális regressziós mátrix

| Kategória/folyamat | Eredmény | Böngészős bizonyíték |
|---|---|---|
| Alapértelmezett tető | PASS | `/kalkulatorok` a szarufa kalkulátort és annak űrlapját mutatta; üres kötelező mezőknél nem jelent meg eredmény. |
| Tető: számítás és rajz | PASS | Félfesztáv **4000 mm**, emelkedés **2500 mm** → szarufahossz **4716,991 mm**, tetőhajlás **32,005°**; szarufavázlat megjelent. |
| Lépcső: számítás és rajz | PASS | Emelkedés **2800 mm**, vízszintes hely **4000 mm**, **16** fellépés → fellépő **175 mm**, belépő **266,667 mm**, geometriai hossz **4882,622 mm**; a műszaki rajz betöltődött. |
| Beton: sávalap | PASS | Tengelyhossz **10 000 mm**, szélesség **300 mm**, mélység **600 mm** → beton **1,8 m³**, kétoldali zsaluzat **12 m²**, névleges alapfelület **3 m²**. |
| Beton deep link: cölöp | PASS | `?calculator=concrete.pile`; **2 × Ø1000 × 1000 mm** → összes beton **1,571 m³**, egy cölöp **0,785 m³**, palást **6,283 m²**; külön rajz betöltődött. |
| Kategória- és kalkulátorkiválasztó | PASS | Kategóriakattintás és gyors roof/stair/concrete/roof sor után a kiválasztott kategória és kalkulátor egyezett. |
| Reload, Back/Forward, hub | PASS | A query deep link aktív maradt reload után; Back a hub alapértelmezett tetőnézetére tért, Forward visszaállította a beton deep linket. |
| Hiányos/hibás input | RÉSZLEGES | Az üres alapértelmezett tetőn nem jelent meg eredmény. Hibás szöveges bemenetet és mindhárom kategória validációját nem gyakoroltam végig. |
| Input módosítása és eredményfrissítés | RÉSZLEGES | Az űrlapok üresről érvényesre kitöltése eredményt adott; egy már érvényes érték megváltoztatása utáni új értéket nem igazoltam megbízhatóan. |

## Gyors váltás, hibaállapot és source review

Gyors kategóriasort futtattam meleg cache-sel, hálózati/CPU lassítás nélkül. Rossz kategória vagy elavult tartalom nem jelent meg. Ez nem bizonyítja a race elleni védelmet lassú hálózaton, mert az aszinkron válaszok gyors, cache-elt úton érkeztek.

Nem injektáltam chunkhibát, ezért a böngészős hiba/újrapróbálás útvonal **nem ellenőrzött**. Forrásból: a loader azonosítóhoz rendeli a definíciót, a `useEffect` cleanup `current` őrrel dobja el az elavult választ, a hibát a kiválasztott ID-hez köti, az újrapróbálás pedig növeli a betöltési kísérletet. A `role="status"`/`aria-live="polite"`, illetve hiba esetén `role="alert"` és fókuszálható retry gomb jelen van. A dinamikus `import()` cache-elését az ismételt stair választás Network naplója is alátámasztotta.

A definíciómodulok kategóriánkénti határa, a katalógus metaadat és az async loader összhangban van. Az azonosítóalapú fallback, a típus és a 31 definíció leképezése meglévő célzott tesztben ellenőrzött. Nem láttam különálló indokolatlan wrapper réteget vagy képlet-/snapshot-/mentési szerződés módosítást. React Profiler, React DevTools Profiler adatok, trace, parse/execute költség, long task és CLS nem készült.

## Reszponzivitás, téma és hozzáférhetőség

| Nézet | Megfigyelés |
|---|---|
| 375×667 mobil | A három kategóriagomb egymás alatt, a „Kalkulátor váltása” vezérlő és a munkaterület függőleges folyamban látszott; a viewport szélességén belül maradt. |
| 768×1024 tablet | A kategóriák egy sorban, a munkaterület mezői két oszlopban jelentek meg; vízszintes túlcsordulást nem láttam. |
| 1440×900 desktop | Oldalsáv, bal kalkulátorlista és jobb munkaterület kétoszlopos mezői jelentek meg; clippinget nem láttam. |

A világos/sötét témaváltó működését a műhely oldalon ellenőriztem; a kalkulátorkártyákat világos témában nem vizsgáltam külön. A kalkulátorkategóriák `tab` szereppel és `selected` állapottal elérhetők voltak; Tab a Lépcsők tabra lépett, Enter aktiválta. A rajz és számítás után a fókusz a választott tabon maradt. A loading státusz és retry szemantika csak forráskódból ellenőrzött. Kontrasztmérés, reduced-motion, 375 px-en a bottom navigation, minden rajzvezérlő és minden téma/kalkulátor kombináció nem volt ellenőrizve.

## Hiba- és teljesítménybesorolás

- **CONFIRMED REGRESSION:** nem találtam.
- **CONFIRMED PERFORMANCE ISSUE:** nem találtam. Összehasonlítható, production/cold vagy throttled teljesítményprofil nem készült.
- **SOURCE-LEVEL RISK:** lassú hálózati versenyhelyzet és hiba/újrapróbálás runtime viselkedése nincs bizonyítva; a forrás őrzi a régebbi válaszokat.
- **BLOCKED / UNVERIFIED:** production szerveren és hideg cache-en nem mértem; parse/execute/long task/INP, invalid mezők mindhárom kategórián, retry-failure recovery és kategórián belüli kalkulátorváltás teljes mátrixa hiányzik.
- **PASS:** valós böngészőben render, a három kategória reprezentatív eredménye, rajzok, deep link, reload, Back/Forward, gyors váltás, három viewport és billentyűzetes kategóriaváltás.

### F9.63.3 megállapítások

1. **F9.63.3-01 · P2 · BLOCKED / UNVERIFIED · F9.63.2 production teljesítményállítás.** `/kalkulatorok`, hideg böngészőcache/production build nincs mérve. Bizonyíték: a rendelkezésre álló futó példány Next 16.4.2 dev/Turbopack; a 304-es kategória chunkok a cache-ből jöttek. Hatás: valósághű átvitel és sebességelőny nem állítható. Minimális követés: külön, saját folyamatként indított production build/szerver egy másik porton, tiszta új böngészőprofil vagy cache nélkül; rögzített throttle mellett egyszeri Network/perf trace. Releváns ellenőrzés: production route JS, kategóriaváltás és rajzchunk hálózati naplója. **A funkcionális elfogadást nem blokkolja; production sebességállítást igen.**
2. **F9.63.3-02 · P2 · BLOCKED / UNVERIFIED · lassú betöltés/hiba/retry.** Kalkulátorkategória-váltás lassított hálózaton, chunkhiba és újrapróbálás nincs reprodukálva. Minimális követés: izolált browser sessionben a pontos kategória chunk ideiglenes request blockingja, majd feloldás és Retry; Slow 3G/CPU throttle mellett roof→stair→concrete gyors váltás. Forrásőr és hiba UI létezik, de böngészős recovery nincs bizonyítva. **Nem igazolt blokk, acceptance előtt egy célzott recovery smoke ajánlott.**
3. **F9.63.3-03 · P3 · BLOCKED / UNVERIFIED · validáció és értékfrissítés.** Az érvényes adatok beadása eredményt mutatott, de meglévő érvényes mező módosítása utáni új érték, hibás szöveg, valamint kategóriánkénti hiányos bemenet nincs végigjárva. Minimális követés: egy kontrollált értékmódosítás és egy üres/hibás mező kategóriánként. Releváns automated test: `src/features/calculators/construction-calculator-loading.test.ts` csak loader/default/representatív számítási paritást fed le. **Nem blokkolja az általános kalkulátorműködést, de a teljes számítási regressziót nem bizonyítja.**

## Automatizált ellenőrzések

- `npm test -- src/features/calculators/construction-calculator-loading.test.ts` — **PASS**, 1 fájl, 3 teszt.
- Böngésző Console a vizsgált futás után — **0 console message**; a látható fejlesztői Console Ninja/React DevTools/HMR tájékoztatók nem alkalmazáshibák.
- Teljes teszt, lint, typecheck, build — **ebben a mérföldkőben nem futott**; az F9.63.2 jelentésben rögzített korábbi eredményeket nem ismételtem meg.
- `git diff --check` — **PASS**.

## Használt eszközök

- `build-web-apps:frontend-testing-debugging` a böngészős smoke-hoz és UI-ellenőrzéshez.
- `build-web-apps:react-best-practices` a dinamikus loading- és state-határok source review-jához.
- `ponytail` a minimális változtatáshoz és tömör riporthoz.
- A Brave meglévő helyi sessionjét a CUA desktop UI-val használtam; új csomag, Playwright vagy külső browser-plugin nem kellett.

## Javasolt követés

F9.63.2 funkcionális használata a vizsgált munkafolyamatban **PASS WITH FINDINGS**. Production webpack builden, cache-meleg és izolált cache-hideg, rögzített hálózati feltételekkel vegyél fel egyetlen kategóriaváltási/rajz trace-t; ugyanott ellenőrizd a lassú chunk failure→retry utat és egy input újraszámítását. Appkód-hotfixre nincs most bizonyíték, módosítást nem végeztem.

**Javasolt Conventional Commit:** `test: F9.63.3 validate calculator runtime loading`
