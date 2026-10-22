# F9.63.4 — Production kalkulátorbetöltés és lazy-loading megbízhatóság

Státusz: **PASS WITH FINDINGS**. Az izolált Next.js production buildet, a helyi hitelesített DEMO kalkulátorokat, a cache nélküli kategória- és rajzbetöltést, a 3G gyors váltást, valamint egy irányított chunkhiba → retry folyamatot ténylegesen ellenőriztem. Megerősített regressziót nem találtam. Az INP/CPU- és parse/execute-költség, a light theme, valamint a navigáció közben még folyamatban lévő modulválasz teljes trace-e nem igazolt.

## Környezet és módszer

- **Build:** Next.js **16.4.2**, `npm run build` → `next build --webpack`, production; build sikeres (compile 6,1 s, TypeScript 5,8 s, 32 static page generálva). A repo munkafájáról `/private/tmp/tetopro-f9634.WCEYxy` alatt készült másolat futott; a `node_modules` symlinkelt, `.env.local` symlinkelt, a build output külön temp `.next` könyvtárba került. A projekt `.next` könyvtárát nem írta a build.
- **Szerver:** a másolt build `npm run start -- --port 3100 --hostname 127.0.0.1` alatt futott. A meglévő Next dev szerver a 3000-es porton maradt, nem állítottam le vagy cseréltem le.
- **Auth/adat:** ugyanazt a helyi, már bejelentkezett Brave DEMO profilt használtam; a műhely navigációja és kalkulátorok authenticated DEMO állapotot mutattak. Valós adatbázisba nem mentettem adatot, mentési folyamatot nem indítottam, autentikációt nem kerültem meg.
- **Böngésző/eszköz:** Brave Browser, Chromium DevTools; reszponzív emuláció **1440×542** (DevTools dokkolás mellett), illetve **375×812**. A Brave pontos verzióját nem rögzítettem. Cache nélküli méréseknél a DevTools `Disable cache` volt bekapcsolva; browser storage-t és DEMO sessiont nem töröltem. A gyors első mérések hálózati korlátozás nélkül készültek, a lassú váltás a beépített **3G** hálózati presetet használta.
- **Útvonalak:** `/kalkulatorok`, majd közvetlenül `/kalkulatorok?calculator=concrete.pile`. A request blocking DevToolsban kizárólag a concrete definíció `7708.164a2fb4c9e45dbf.js` chunkjára szólt; retry után a szabályt eltávolítottam, a 3G-t kikapcsoltam és a cache-t visszaállítottam.

## Cold cache Network eredmények

Az alábbi bájtok DevTools Network-adatok: a `transferred` hálózaton továbbított méret, a `resource size` a dekódolt erőforrásméret. A route összes kérése és a JavaScript-szűrő részösszege külön szerepel.

| Folyamat | JS kérések | JS átvitel | Route összes átvitel | Route resource | Időzítés |
|---|---:|---:|---:|---:|---|
| Első `/kalkulatorok` load, cold cache | 16 / 51 kérés | **233 906 B (~234 kB)** | 623 260 B | 1 651 647 B | DCL 179 ms; Load 297 ms; Finish 460 ms |
| Kategória: Lépcsők | 2 új chunk | **7 491 B**; 24 994 B resource | 630 943 B kumulatív | 1 676 641 B kumulatív | 2 új kérés, 4–5 ms/kérés |
| Kategória: Betonozás | 1 új chunk | **4 951 B**; 17 436 B resource | 635 991 B kumulatív | 1 694 077 B kumulatív | 1 új kérés, 6 ms |
| Első cölöprajz — cölöp deep link, 375×812 | 2 új chunk | **21 335 B**; 76 936 B resource | 643 058 B kumulatív | 1 739 208 B kumulatív | 57 és 74 ms |

A lépcső chunkok a `5875` és `4124` fájlok voltak (3 910 + 3 581 B átvitel; 12 005 + 12 989 B resource). A beton definíció `7708` chunkja 4 951 B átvitel / 17 436 B resource. A rajznál a shared `5875` chunk 3 910 B / 12 005 B és a `5527` rajzchunk 17 285 B / 64 931 B volt. A közvetlen cölöp deep link az induláskor a beton definíciót töltötte, a rajz chunkjai csak a három érvényes méret bevitele után jelentek meg.

A többször betöltött kategóriára visszaváltáskor a Network JS sorok **19-en maradtak**, új kérés nem indult. A böngésző modul cache-e szolgálta ki a már betöltött kategóriát. Külön böngésző cache-meleg kategória-click runban a `7708` chunk memória cache-ből jött (**0 B** hálózati átvitel); a cold mérések ettől elválasztva, cache letiltásával készültek.

## Lassú hálózat és interakció

A DevTools beépített **3G** presetje és cache-kikapcsolás mellett az első route **5,75 s DCL**, **17,51 s Load**, **24,86 s Network Finish** értéket mutatott. A betöltés során a kalkulátor `role="status"` állapotot mutatott; a kategóriaválasztó elérhető maradt.

A route és a tető kalkulátor betöltése után gyorsan a Lépcsők, majd közvetlenül a Betonozás kategóriára váltottam. 750 ms-nál mindkét új kategóriachunk függőben volt, a beton tab maradt kijelölve, és a workspace betöltést jelzett. A két válasz körülbelül 2,20 s alatt érkezett meg; az eredményként megjelenő kalkulátor végig a kiválasztott sávalap maradt. A később visszaválasztott lépcső azonnal megjelent, új chunkkérés nélkül. Elavult válasz okozta tartalom- vagy kijelölési felülírást nem figyeltem meg.

A lépcső kiválasztása után azonnal a Műhely route-ra navigáltam; a célroute betöltődött, és régi kalkulátor-tartalom nem jelent meg rajta. E próbánál a DevTools snapshot nem rögzítette egyértelműen, hogy a lépcső definíció-kérés még pending volt-e a navigáció pillanatában, ezért a konkrét pending-request unmount race **nem teljesen igazolt**. Source review szerint az effect cleanup `current` őre eldobja az elavult success és rejection választ.

## Hibakezelés és retry

DevTools Request Conditions segítségével egyetlen beton definíció chunkot ideiglenesen blokkoltam. A Network sor `blocked:devtools` állapotot mutatott. A UI a beton kategóriát kijelölve tartotta, `role="alert"` hibaüzenetet (**„A kalkulátor nem tölthető be.”**) és elérhető **„Újrapróbálás”** gombot jelenített meg. A blokkolás kikapcsolása után a retry ugyanazt a chunkot **200 OK** válasszal betöltötte, majd a sávalap mezői újra elérhetővé váltak.

A Console egyetlen, a szándékosan blokkolt URL-ről szóló DevTools warningot mutatott; console error vagy UI-ban maradt betöltési hiba nem jelent meg. A tesztmintát töröltem, a Request Conditions panel „Nothing throttled or blocked” állapotba került.

## UX és célzott forrásvizsgálat

- **375×812 mobil:** a kalkulátorkategóriák függőleges gombként, a kalkulátorválasztó mobil disclosure-ként jelent meg. A cölöp deep link és az érvényes inputokra adott eredmények működtek; a rajz később betöltött. Vizuális túlcsordulást nem láttam.
- **1440 px desktop:** a kalkulátoroldal oldalsávval, kategóriaváltóval, listával és munkaterülettel renderelt; az eredménybevitelt és rajzot hideg chunkbetöltés után használtam. Light theme-et ebben a mérföldkőben nem ellenőriztem.
- **Kód:** `src/features/calculators/construction-calculator-loading.ts:11-20` csak verified katalógusbejegyzést tölthet be, és kategóriánként választ dinamikus modult. `src/features/calculators/construction-suite.tsx:197-209` a kiválasztott ID-hez köti az eredményt és hibát, az effect cleanup pedig kizárja az elavult választ. A retry kísérletszáma új effectet indít; sikeres kategóriamodul újrahasználható. A UI loading/error státusza a `selectedId`-hez kötött. A böngésző failure→retry próba ezt a konkrét hibautat megerősítette.
- **Méréshatár:** a `duration`/Network kérésszám a letöltés ideje, nem JavaScript parse/execute költség. React/Chrome Performance trace, long task, CPU throttle, CLS és INP nem készült; lab hálózati időből RUM vagy felhasználói sebességnövekedés nem állítható.

## Használt készségek és eszközök

- `ponytail`: szűk hatókör és rövid, bizonyítékokra épülő átadás.
- `build-web-apps:frontend-testing-debugging`: production böngészős smoke, hálózati hiba és retry ellenőrzése.
- `build-web-apps:react-best-practices`: dinamikus import, chunkhatárok és async state review.
- `verification-before-completion`: build, célzott teszt és dokumentációs diff friss ellenőrzése.
- Brave natív DevTools Network/Request Conditions és CUA UI; külön Browser plugin nem állt rendelkezésre, új eszköz vagy függőség nem került telepítésre.

## F9.63.2 baseline és értelmezés

Az F9.63.2 build-artifact baseline webpack `client-reference` manifestből, Node `gzipSync`-kel számolt méret volt: a suite statikus chunkkészlete **359 264 → 257 155 B**, illetve gzip **94 023 → 78 218 B** (−28,4% raw / −16,8% gzip). Ez manifest szerinti artifact-összeg, nem böngésző hálózati vagy runtime mérés. Az F9.63.4 Network cold-cache, futó production szerveres mérés; a két módszer közvetlen előtte/utána sebesség-összehasonlításra nem alkalmas. Kategóriachunkok elkülönült első kérését és a rajz késleltetését igazolja, runtime gyorsulást nem.

## Ellenőrzés, korlátok és döntés

- `npm run build` — **PASS**, izolált munkafán, webpack production módban.
- `npm test -- src/features/calculators/construction-calculator-loading.test.ts` — **PASS**, 1 fájl / 3 teszt.
- `git diff --check` — **PASS**, a módosított progress fájlra; az új riportot külön `git diff --no-index --check /dev/null docs/PERFORMANCE_VALIDATION_F9.63.4.md` ellenőrizte.
- Teljes teszt, lint, typecheck és adatbázis-teszt — ebben a mérföldkőben nem futott; adatbázis-módosítás nem történt.
- **CONFIRMED REGRESSION:** nem találtam.
- **CONFIRMED PERFORMANCE ISSUE:** nem találtam. Összehasonlítható cold runtime baseline hiányában abszolút sebességjavulást nem állítok.
- **UNVERIFIED:** INP/parse/execute/long task/CLS, exact pending-request unmount race, light theme, Chrome/Brave verziószám, CPU lassítás, széles invalid-input mátrix.

**Ajánlás:** a F9.63 kalkulátor kódszétválasztás funkcionális és loading-reliability elfogadása **PASS WITH FINDINGS** állapottal lezárható. Production webpacken a kategória- és rajzchunkok csak szükségkor töltődtek; a gyors váltás és a retry működött, regresszió nem igazolódott. A felhasználói sebességnövekedésről továbbra sem állítható mérési eredmény. A következő ajánlott optimalizációs mérföldkő **F9.64 — RLS-szel hitelesített query-plan, CSS/GPU és valós felhasználói teljesítménymérés**; nem indítottam el.

**Javasolt Conventional Commit:** `test: F9.63.4 validate production calculator loading`
