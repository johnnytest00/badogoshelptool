# QA-01 — Munkanapló és PDF adatainak teljessége

**Státusz: PASS WITH LIMITATIONS (2026-10-25).** A 100 soros csendes csonkolást determinisztikus red→green tesztek igazolták és a részletes munkanapló, valamint a PDF közös adatbetöltőjében javítottam. Élő, 101+ soros adatbázis- és böngészős próba nem történt; ezért teljes környezeti `COMPLETE` állítás nincs.

## Gyökérok és adatútvonal

Korábban a `getExecutionPlanningWorkspace` az összes kiválasztott terv naplóbejegyzéseire, eseményeire és fotóira **táblánként egy globális `limit(100)`** korlátot alkalmazott, csak ezután csoportosított `plan_id` szerint. A tervoldal és a projekt PDF-route ugyanazt a hiányos `timelineByPlan` / `photos` eredményt fogyasztotta. A feladatok és tervek explicit 100-as limit nélkül is a [Supabase API sorlimitének](https://supabase.com/docs/reference/javascript/v1/select) voltak kitéve. A munkanapló-áttekintő és a tervválasztó szándékos 200-as listakorlátja változatlan; ezek nem részlet- vagy exportadatforrások.

Most a kötelező terv-, feladat-, napló-, esemény- és fotóolvasások 100 soros `range(from,to)` lapokban, `count: "exact"` mellett futnak. A [Supabase `range` vége inkluzív](https://supabase.com/docs/reference/javascript/using-modifiers-range), ezért a kód `from + 99` felső határt használ. A lekérdezések továbbra is explicit `organization_id` szűrést és a kért `plan_id`-ket használnak. A rendezés minden táblán egyedi `id` tie-breakerrel determinisztikus. A következő offset a ténylegesen visszakapott sorok számával nő, ezért 100-nál kisebb szerveroldali válaszlimittel is továbbhalad. Eltérő számlálás, üres köztes lap, duplikált ID vagy queryhiba az egész kötelező workspace-ot hibára viszi; nincs részleges siker vagy végtelen ciklus. A sorok eredeti azonosítója és tervkapcsolata megmarad, az összerendelés a teljes olvasás után történik.

A PDF-route már csak a kért tervet olvassa, a terv projektazonosságát külön ellenőrzi, és sikertelen teljes betöltésre **502** választ ad PDF nélkül. A legfeljebb nyolc, felhasználó által kiválasztott privát fotó letöltési és méretkorlátja változatlan. A renderelt PDF szerkezete és a történeti forrásrevíziók nem változtak. A kapcsolt anyaglista/ajánlat panel külön adatútvonal; nem része a PDF jelenlegi fejezeteinek.

## Regresszió és teljesítmény

Az új karakterizációs fixture két, időben összekeveredő tervhez táblánként **0, 1, 100, 101 és 275** napló-, esemény- és fotósorral dolgozik, valamint idegen terv és szervezet sorait tartalmazza. Minden esetben a konkrét ID-sorrendet, tervhez rendelést és fotó→napló tartalmi kapcsolatot vizsgálja. A 101/275 esetek és a második lap hibája a korábbi kóddal bukott; javítás után sikeresek. A meglévő 1/50/200 tervű fixture eredeti 100-as fotócsonkolását is kimutatta, most a teljes sorhalmazt ellenőrzi. A tesztek fedik a kisebb (40 soros) szerverlimitet, duplikált lapot, menet közben változó számlálást és a későbbi lapon érkező `42501` jogosultsági hibát. A hiányzó opcionális feladat/feltöltő kapcsolat meglévő viselkedése megmaradt.

A PDF-route teszt 101 különböző naplóazonosító teljes átadását ellenőrzi a renderelő felé, és bizonyítja, hogy lapozási hiba esetén a renderelő nem fut. A valódi PDF-renderelő 101 bejegyzésből többoldalas PDF-et készített. A route idegen projekthez tartozó tervből nem készít dokumentumot.

A lapméret 100; egy 275/275/275 soros, kétterves fixture-ben a három történeti táblára **9 adatlekérdezés** jutott (3–3 lap). A terv, két feladat, ajánlatjelölt és feltöltő adataival együtt ez 13 DB-query a mock kliensben. A 275 fotó signed URL-hívása legfeljebb 16 párhuzamos kérésre van bontva. Valós hálózati késleltetés, DB-query terv és PDF-memóriacsúcs nem lett mérve. A memóriaigény a teljes munkanapló méretével nő, mert az UI és a PDF szerződése teljes adathalmazt fogad; extrém méretre nincs igazolt renderelőlimit. Az `exact` számlálás és a több lap több DB-munkát jelent, cserébe a részlegesség ellenőrizhető.

## Jogosultság és ellenőrzések

Az SSR Supabase kliens, a szervezeti és tervszűrés, a meglévő RLS-policy-k, a privát fotóútvonal és az immutable ajánlati forrásrevízió ellenőrzése változatlan. A helyi migrációkban a napló, esemény, feladat és fotó SELECT-policy-je szervezeti tagságot követel; DB-séma, policy, RPC vagy adat nem módosult. A mock-tesztek az alkalmazási filtereket és a hibahatárt bizonyítják, nem a hostolt RLS tényleges működését.

- Célzott adatbetöltő, PDF-route és renderer: **3 fájl / 28 teszt PASS**.
- `npm test -- --reporter=dot`: **176 fájl PASS, 8 SKIP; 1053 teszt PASS, 19 SKIP**. Két meglévő dashboard mock `priority` attribútum-figyelmeztetést adott.
- `npm run lint`: **PASS**. Elkülönített `/private/tmp/tetopro-qa01-build.rjThF5` másolatban `npm run typecheck` és `npm run build`: **PASS**, Next.js 16.4.2, 32 statikus oldal generálása. A fő checkout futó fejlesztői szerverének `.next` kimenete érintetlen.
- Helyi/hostolt DB-írás, 101+ élő rekordos integráció, browser smoke, PDF képi vagy szövegkinyeréses tartalomellenőrzés és teljes pgTAP **nem futott**. A korábban ismert QA-05 miatt az eredeti pgTAP suite-ot nem állítom zöldnek.

**Fennmaradó kockázat:** külön HTTP-lapok között nincs adatbázis-szintű repeatable-read snapshot. A számlálás- és duplikátumellenőrzés sok közben változó adatesetet hibává alakít, de egy azonos darabszámú, egyszerre történő beszúrás/törlés elméletileg eltérő pillanatképet adhat. Az export a felületen is szereplő figyelmeztetés szerint nem archivált pillanatkép. Nagyon sok terv együttes betöltésénél a `plan_id` lista URL-mérete és a renderer memóriaigénye külön terhelési próbát igényel.

**Javasolt Conventional Commit:** `fix(QA-01): load complete execution history for work logs and PDF`
