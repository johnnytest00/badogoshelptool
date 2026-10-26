# M10 Fázis 0 — független adatátadási és biztonsági QA

**Dátum:** 2026-10-26
**Vizsgált commit:** `11bf9422cfa3416ed6b74290c7928c3d695ac5ed` (`docs(M10.0): add phase 0 QA handoff.`)
**Git-állapot a vizsgálat kezdetén:** `feat/m1-length-input`, a távoli ághoz képest 3 commit ahead, munkafa tiszta.
**Hatókör:** M10 Fázis 0 mezőátvétel, mentési útvonal, SQL/RPC/dependency, célzott tesztek és QA smoke. Alkalmazáskódot, migrációt és tesztfájlt nem módosítottam.

## 1. Vezetői összefoglaló

**Státusz: BLOCKED — az M10 Fázis 0 jelenlegi migrációs állapotával nem javasolt Fázis 1-re lépni.** Egy bizonyított **P1** hiba miatt az új RPC-vel mentett revízió nem kap QA08-attestációt. A meglévő adatbázis-trigger az attesztáció nélküli revízió munkanaplóhoz vagy ajánlatforráshoz kapcsolását elutasítja. Emellett az új writer már nem hívja a korábbi snapshot-teljességi ellenőrzést.

**P0-t nem találtam.** A forráslista, Action és restricted writer útvonalában a szervezeti tagság, a forrás kalkulációjának szervezete, standalone hatóköre és létrehozója ellenőrzött. Ez statikus kódbizonyíték; izolált DB-ben nem futott jogosultsági/integrációs teszt.

A nyolc mező statikusan egyező kulccsal és mm-alapú jelentéssel kerül át, az üres értékek kimaradnak, a cél többi draftmezője megmarad. A meglévő egyező mezők figyelmeztetés nélkül felülíródnak. Az átvételi eredet a képernyőn látszik, de a revízió mentése és későbbi újranyitása utáni UI-megőrzés nem bizonyított.

## 2. Tesztelt commit és Git állapot

- Commit: `11bf9422cfa3416ed6b74290c7928c3d695ac5ed`.
- Kezdő munkafa: tiszta; branch ahead 3.
- A jelentés elkészítésekor egy új fájl kerül hozzáadásra: `docs/M10_PHASE0_INDEPENDENT_QA.md`.
- Az alkalmazáskód, SQL-migrációk és meglévő tesztek érintetlenek maradtak.

## 3. P0/P1 megállapítások

### P1 — Az M10 writer nem hoz létre QA08-attestációt és elvesztette a snapshot-teljességi kaput

**Bizonyíték:** a QA08 migráció korábbi 9 paraméteres függvénye meghívja a `private.is_complete_construction_snapshot` ellenőrzést, az idempotens retry-nál attestációt követel, és az új revízió beszúrása után ugyanabban a tranzakcióban attestációt ír: [`20261025154642_qa08_rpc_trust_boundary.sql`](/Users/bence/Documents/badogos_helptool/supabase/migrations/20261025154642_qa08_rpc_trust_boundary.sql:102) (ellenőrzés: 122–125; retry: 133–139; attestáció: 156–162). Az M10 migráció ezt a függvényt eldobja és 10 paraméteres változattal helyettesíti: [`20261026010000_construction_field_transfer.sql`](/Users/bence/Documents/badogos_helptool/supabase/migrations/20261026010000_construction_field_transfer.sql:6). Az új változat csak az input/output JSON alapformáját, az `output.lines` tömb létét és méretkorlátot ellenőrzi (31–40); retry esetén csak a kérés payloadját hasonlítja (65–70); a revízió, aktuális mutató és operation ledger írása után dependency-t ír, de attestációt nem (87–99).

**Hatás / forgatókönyv:** sikeres M10 mentés után a revízió immutable, de hiányzik belőle a `private.construction_revision_attestations` sor. A korábbi migráció által telepített `require_attested_construction_revision` trigger ezért elutasítja a revízió munkanaplóhoz (`execution_plan_document_links`) és ajánlatforráshoz (`quotation_calculation_sources`) kapcsolását. A meglévő DB teszt kifejezetten elvárja, hogy a sikeres mentés pontosan egy attestációt hozzon létre (060: 92–102), és hogy az attestáció nélküli link meghiúsuljon (130–147). Az új M10 revízió nem tudja teljesíteni az első elvárást és a második műveletet sem.

**Minimális javítási javaslat:** az új 10 paraméteres writerbe vigyék át a teljességi kaput és a revízióhoz kötött attestáció tranzakciós létrehozását; az idempotens visszatérés előtt követeljék meg az attestációt. A 060-as pgTAP tesztet igazítsák az új függvényazonossághoz, és teszteljék az M10-es forrás-dependency-t, retry-t és rollbacket.

**Kiegészítő kompatibilitási eltérés:** a 060-as DB teszt továbbra is a régi 9 paraméteres `regprocedure` aláírásra ellenőrzi az EXECUTE jogot (6–9. sor), miközben az M10 a 9 paraméteres függvényt eldobja és a restricted writernek csak a 10 paraméteres aláírást adja meg (102–103. sor). A 10. paraméter `DEFAULT NULL`, de az SQL-függvényazonosság, a tesztlekérdezés és a PostgREST híváskompatibilitás viselkedését adatbázisban nem tudtam futtatni. A generált [`database.types.ts`](/Users/bence/Documents/badogos_helptool/src/infrastructure/supabase/database.types.ts:1890) szintén csak a régi 9 argumentumot tartalmazza. Ezeket kompatibilitási teszttel és a generált típussal együtt kell rendezni.

## 4. P2/P3 megállapítások

### P2 — A dependency a kiválasztott forrást rögzíti, de a célmezők eredetét nem bizonyítja

Az Action újraszámítja a célkimenetet, és validálja a kalkulátort, szervezeti tagságot és mezőkulcsokat ([`construction-actions.ts`](/Users/bence/Documents/badogos_helptool/src/features/calculations/construction-actions.ts:32), 37–65). Az RPC ellenőrzi, hogy a forrásrevizió ugyanahhoz a szervezethez tartozik, standalone kalkuláció aktuális vagy régebbi revíziója, a létrehozó azonos a hívóval, és a forrástípus `roof.rafter-cut` (M10 SQL 43–57. sor). A szerver azonban nem olvassa ki a forrás revízió nyolc mezőjét, és nem hasonlítja össze a cél inputjával.

Ez nem jogosulatlan módosítás: a felhasználó a másolás után jogszerűen szerkesztheti a célmezőket. A dependency jelenleg „ezt a forrást választotta ki” kapcsolatot jelent, nem mezőnkénti bizonyítékot arról, hogy a végleges értékek a forrásból származnak. A termékszemantikát dokumentálni kell; ha a későbbi stale/provenance jelzés mezőeredetet ígér, menteni kell az átvételkori alapértékeket vagy a mezőeredetet, és a felhasználói kézi módosítást külön jelezni.

### P2 — Átvételkor figyelmeztetés nélküli mezőfelülírás

Az `Átvétel` gomb közvetlenül hívja a `mergeCalculatorDraft`-ot, majd bekapcsolja a `birdsmouth` mezőt ([`construction-suite.tsx`](/Users/bence/Documents/badogos_helptool/src/features/calculators/construction-suite.tsx:492)). A merge csak az átadott kulcsokat cseréli, minden más draftmezőt megtart ([`construction-drafts.ts`](/Users/bence/Documents/badogos_helptool/src/features/calculators/construction-drafts.ts:15)). A vezérlőben nincs mezőlista előnézet, felülírási figyelmeztetés vagy visszavonás ([`construction-field-transfer-control.tsx`](/Users/bence/Documents/badogos_helptool/src/features/calculators/construction-field-transfer-control.tsx:34)). A QA smoke üres cél drafton történt, így meglévő adat elvesztését nem reprodukáltam; a felülírás a merge kódból következik. Ez a helyi, még nem mentett draft állapota, nem bizonyított adatbázis-törlés.

### P2 — Forráslista-hiba üres forráslistaként jelenik meg

Az adatlekérdezés DB-hibára `[]`-t ad vissza ([`construction-data.ts`](/Users/bence/Documents/badogos_helptool/src/features/calculations/construction-data.ts:100), 104–114), a UI pedig ugyanazt az „Nincs mentett, kompatibilis…” üzenetet mutatja, mint valódi üres listánál (vezérlő 36–38. sor). A hiba és a valódi üresség nem különböztethető meg; újrapróbálás sincs.

### P3 — Mezõleképezés automatikus lefedettségének hiánya a timber-célra

Az átviteli kulcsok pontosan: `seatCutHeightMm`, `plateWidthMm`, `purlinFaceMm`, `purlinTopMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`. A helper a nem üres értékeket ugyanazzal a kulccsal adja tovább ([`rafter-connection-fields.ts`](/Users/bence/Documents/badogos_helptool/src/features/calculators/rafter-connection-fields.ts:15)). A forrás és a két cél `birdsmouthFields`-e ugyanazt a meződefiníciót és mm jelentést használja ([`roof-calculator-definitions.ts`](/Users/bence/Documents/badogos_helptool/src/features/calculators/roof-calculator-definitions.ts:61)); az átvétel a cél Karmi funkcióját `true` értékre állítja (suite 495–496). A helper szűri az üres stringeket, a merge megtartja a többi célmezőt. A meglévő teszt mindhárom kalkulátornál néhány közös mezőt néz, viszont az összes átvihető kulcs célkompatibilitását csak `roof.material-takeoff` esetén ellenőrzi ([`rafter-connection-fields.test.ts`](/Users/bence/Documents/badogos_helptool/src/features/calculators/rafter-connection-fields.test.ts:42), 51–55). Ezért a timber cél automatikus mezőlefedettsége nincs teljesen bizonyítva, bár a közös definíció statikusan egyezik.

## 5. Adatátviteli és snapshot-integritás

- A kliens forrásazonosítója UUID-sémán megy át; csak a két engedélyezett cél kalkulátor fogadhatja (Action 16–21, 47. sor).
- A mezőlista forrása a belépett felhasználó szervezeti tagságát, a `standalone` hatókört, a `construction.roof.rafter-cut` típust és `created_by = auth.userId` feltételt alkalmazza (adat 101–107. sor). Legfeljebb az aktuális revíziók szerepelnek, legfeljebb húsz forrásból.
- Az RPC újraellenőrzi a szervezeti tagságot, a forrás szervezetét, standalone hatókörét, létrehozóját és típusát. A kliens által beküldött idegen UUID közvetlen RPC-hívásként is visszautasításra kerülne, ha a writer csak a deklarált restricted role-on át érhető el; DB-ben nem futtatott.
- A kiválasztott immutable revízió ID-ját menti pontosan. Ha közben újabb revízió készül, az ID nem vált át automatikusan. Ez megfelelhet a pontos snapshot rögzítésének; az elavult forrás látható jelzése és a termék által ígért stale viselkedés nem bizonyított.
- A kód a cél `input` snapshotot szerveroldalon újraszámolja, az outputot a szerver állítja elő (Action 57–65). Az M10 SQL teljességi kapujának eltávolítása miatt a DB writer önmagában már nem őrzi a korábbi strukturális snapshot-szerződést.
- Újranyitás után az átvételi eredet UI-megőrzése nem ellenőrzött. A dependency adatbázisba mentése a forrás-revíziót visszakereshetővé teszi, de ez nem bizonyítja, hogy a felület meg is jeleníti.

## 6. SQL/RPC/trigger/RLS ellenőrzés

- A M10 writer `SECURITY DEFINER`, üres `search_path`-ot használ; `PUBLIC`, `anon`, `authenticated` szerepköröktől visszavonja az EXECUTE jogot, és a `tetopro_covering_writer` szerepkörnek adja. Az új függvény grantja a 10 argumentumos azonosítóhoz tartozik (M10 SQL 8–14, 102–103. sor).
- A függvény ellenőrzi a szervezeti tagságot; célkalkulációnál szervezetet, standalone hatókört, létrehozót és kalkulátortípust; forrásnál szervezetet, standalone hatókört, létrehozót és típust (43–57, 73–82. sor).
- A mezőlista Action tagságellenőrzés mellett RLS-en futó adatlekérdezést használ. A projektalapú ág ezen M10 módosításban nem változik; a trigger új ága csak azonos szervezetű, standalone és azonos létrehozójú revíziópárra igaz, míg a meglévő azonos projektű kapcsolatot megtartja ([`20261026020000_construction_field_transfer_dependency_scope.sql`](/Users/bence/Documents/badogos_helptool/supabase/migrations/20261026020000_construction_field_transfer_dependency_scope.sql:57)).
- A dependency trigger megköveteli az egyetlen upstreamet (25–29), blokkolja az önhivatkozást és a ciklust (65–84). A revíziók módosíthatatlanságát az előző QA08 szabály és az adatbázissémában meglévő korlát biztosítja; M10 ezt a táblát nem módosítja.
- A két új migráció sorrendben az M10 writer cseréje, majd a standalone dependency-scope bővítése. A 9→10 paraméteres csere és az elavult DB teszt/típus aláírása külön deploy-kompatibilitási ellenőrzést igényel.
- Nem találtam bizonyított cross-org forrásolvasási vagy dependency beszúrási útvonalat a vizsgált alkalmazásútvonalon. A DB jogok és RLS tényleges viselkedése `NOT VERIFIED`.

## 7. Retry, konkurencia és atomikusság

- **Kódbizonyíték:** az RPC azonos szervezet/művelet kulcsra és kalkulációra tranzakciós advisory lockot vesz fel (M10 SQL 60–61. sor); a korábbi operation rekord payloadját összehasonlítja, eltérő payloadnál hibát ad, egyezőnél újrahasználja (65–70). Az elvárt revíziószámot a maximális tárolt verzióval hasonlítja össze (73–82).
- **Atomikusság:** a kalkuláció, revízió, aktuális pointer, operation ledger és dependency ugyanazon PostgreSQL függvényhívás tranzakciójában íródik. A dependency beszúrás hibája visszagörgetné a korábbi írásokat; ezt izolált DB-ben nem próbáltam ki.
- **P1-re gyakorolt hatás:** az idempotens retry az M10 writerben nem ellenőrzi, hogy a visszaadott revízió attestált-e. A QA08 writer ezt korábban ellenőrizte.
- **Forrásváltás a kiválasztás után:** az immutable forrás ID megmarad, nincs aktuális-revízió követelmény. Nincs bizonyíték arra, hogy a kiválasztott revíziót másik revízióra cserélné.
- A 9 forgatókönyv közül egyik tranzakciós esetet sem futtattam DB-integrációs környezetben; a fenti viselkedés a kódon alapul, nem runtime bizonyíték.

## 8. UI/UX és mobilos ellenőrzés

- **Desktop smoke:** meglévő Brave böngészőben, a helyi fejlesztői szerveren, `DEMO TetőPro Kft.` környezetben végzett egyszeri AX/DOM ellenőrzés. Mindkét célkalkulátoron megjelent a forrásválasztó; egy DEMO forrás átvétele bekapcsolta a Karmi funkciót és kitöltötte a HAP mezőt; a forrás neve és revíziója megjelent. Mentés nem történt, a teszt tabot bezártam. Ez viselkedési smoke, nem vizuális screenshot-ellenőrzés.
- Üres cél drafton az átvétel eredménye megfelelően látható volt. Előnézet, felülírási figyelmeztetés vagy visszavonás nincs; meglévő érték tényleges elvesztését a smoke nem vizsgálta.
- A forráskiválasztás utáni kézi módosítás nincs mezőeredetként megjelölve. A képernyő rövid üzenete a forrás nevét/revízióját közli és ellenőrzésre kér.
- Lista-betöltési hiba és ténylegesen üres forráskészlet ugyanazt az üzenetet eredményezi.
- **375×812, 812×375 és 1440×900:** `NOT VERIFIED`. Playwright nincs telepítve; a natív Brave ablakban nem volt elérhető megbízható viewport- és screenshot-ellenőrzés. Valódi telefonon nem teszteltem.

## 9. Futtatott tesztek, pontos eredmények

- Célzott Vitest: `./node_modules/.bin/vitest run src/features/calculators/rafter-connection-fields.test.ts src/features/calculators/construction-drafts.test.ts src/features/calculators/construction-save-panel.test.tsx src/features/calculations/construction-actions.test.ts src/features/calculations/construction-data.test.ts` — **5 fájl, 31 teszt sikeres**.
- Teljes Vitest: `npm test` — **200 fájl: 192 sikeres, 8 kihagyott; 1206 teszt: 1187 sikeres, 19 kihagyott**. Ez nem tartalmazza a Supabase pgTAP adatbázis-teszteket.
- Lint: `npm run lint` — **ESLint: No issues found**.
- Typecheck: `next typegen && tsc --noEmit -p tsconfig.typecheck.json` — sikeres, izolált ideiglenes checkoutban.
- Production build: `npm run build` — sikeres, izolált ideiglenes checkoutban; Next 16.4.2 webpack build, TypeScript és statikus route generálás befejeződött.
- Izolálás: a forrás HEAD archívumát `/private/tmp` alá bontottam, a meglévő `node_modules`-ra mutató symlinkkel; a build és `.next` írásai ott történtek, nem az aktív checkoutban. A futó fejlesztői szerver `.next` könyvtárát nem módosítottam.
- `git diff --check` és az új, még nem követett riport külön whitespace-ellenőrzése: sikeres.

## 10. Nem ellenőrzött területek

- **DB migrációs futás, pgTAP 060, pozitív/negatív RLS és role-jogosultságok, rollback, retry/concurrency:** `NOT VERIFIED`. A `supabase status` futtatása a Supabase CLI telemetriafájljának sandboxon kívüli írásán `EPERM` hibával megállt; izolált, eldobható helyi DB-t nem tudtam igazolni. Nem futtattam migrációt és nem érintettem DB-t.
- **Mobil viewports és screenshot/console QA:** `NOT VERIFIED`, az előző szakasz szerinti eszközkorlát miatt.
- **Átvétel után meglévő kitöltött érték felülírásának runtime reprodukciója, mentés utáni újranyitás/provenance, forráslista-hiba UI-ja:** `NOT VERIFIED`; a viselkedés a komponens és adatlekérdezés kódjából következtethető.
- **PostgREST 9→10 paraméter kompatibilitás, DEFAULT NULL és régi alkalmazáskliens:** `NOT VERIFIED`; a TypeScript fordítás ezt nem bizonyítja.
- Nem készült új regressziós teszt, mert a feladat audit-only volt, a P1 pedig a meglévő DB teszt és migráció közvetlen kódbizonyítékával megállapítható.

## 11. Javasolt javítások prioritási sorrendben

1. **P1:** M10 restricted writerben visszaállítani a snapshot teljességi ellenőrzését, az attestáció tranzakciós írását és a retry attestáció-ellenőrzését; a 060 pgTAP tesztet az új függvényaláíráshoz igazítani.
2. **P1:** izolált, eldobható Supabase környezetben futtatni a migrációkat a tényleges sorrendben és a pgTAP 060-at; hozzáadni M10 célzott DB eseteket az attestációhoz, dependency rollbackhez, forrásjogosultsághoz és idempotenciához.
3. **P2:** rögzíteni a dependency jelentését: „kiválasztott forrás” vagy mezőszintű provenance. Ha az utóbbi kell, menteni az átvételi alapértékeket/eredetet, és mutatni a kézi módosítást.
4. **P2:** átvétel előtt mutatni az érintett mezőket és a felülírásokat; adni visszavonási lehetőséget; forráslista-hibánál külön hiba- és újrapróbálási állapotot megjeleníteni.
5. **P2:** mindkét célkalkulátorra kiterjeszteni a mezőkulcs-lefedettségi tesztet; a 9/10 argumentumos RPC-t PostgREST-tel ellenőrizni; a generált adatbázistípust frissíteni.

## 12. MVP élesítési javaslat

**M10 Fázis 0: BLOCKED. M10 Fázis 1: ne induljon el, amíg az 1. prioritású QA08-attestáció/teljességi regresszió nincs javítva és izolált adatbázis-teszttel igazolva.** A P1 a létrehozott revíziók későbbi munkanapló- és ajánlatkapcsolását érinti. A UI mezőátvétel helyi smoke-ja és a TypeScript/build siker nem helyettesíti ezt a bizonyítékot.

**Javasolt Conventional Commit:** `fix(M10.0): preserve construction revision attestations`
