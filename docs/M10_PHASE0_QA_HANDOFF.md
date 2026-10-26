# M10 Fázis 0 — technikai átadás és QA-előkészítés

**Dátum:** 2026-10-26  
**Állapot:** INVENTORY-ONLY; alkalmazás-, migráció- és DB-teszt nem futott ebben az átadásban.

## 1. Rövid összefoglaló

Az M10 Fázis 0 a mentett `construction.roof.rafter-cut` aktuális revíziójából nyolc HAP-/csatlakozási mezőt enged explicit átmásolni a `construction.roof.material-takeoff` vagy `construction.roof.timber-cutlist` kalkulátor helyi űrlapjába. A böngészőben kiválasztott forrásazonosító a következő célmentésig memóriában marad; a mentési RPC a cél új, immutable revíziójával együtt `calculation_dependencies` sort hoz létre.

Ez nem teljes M10 workflow: nincs általános geometriaátvétel, nincs mezőnkénti provenance, és nincs élő szinkron. A forrás aktuális revíziójának kiválasztás utáni változását a mentési RPC nem ellenőrzi.

## 2. Git/commit állapot és M10 változások

- Munkafa a vizsgálat kezdetén tiszta volt (`git status --short --branch` csak a branch fejlécet adta vissza); branch: `feat/m1-length-input`, upstreamhez képest 2 commit ahead.
- HEAD: `cd4a25d099509a79555897e56f0dd063ae256f1a`, parent: `c2f9c6a8b3b26237431541aab83c5b9bd1b17616`.
- Commit cím: `feat(M9.16-M10): finalize KARMI joint workflow and add M10 cross-calculator field transfer`.
- A commit teljes fájllistája 37 fájl, 1092 hozzáadás és 81 törlés. Ez M9.15/M9.16 KARMI-terminológiai, geometriai és UI-munkát is tartalmaz; ezért a teljes commit nem tekinthető M10-only változásnak.
- M10 konkrét új fájljai: két migráció és `construction-field-transfer-control.tsx`. A M10-hez tartozó kódmódosítások a felsorolt adatlekérdezés, mentési útvonal, draft-kezelés és céloldali bekötés. A `rafter-connection-fields.ts` és annak tesztje M9-es csatlakozási logikát is tartalmaz; csak az átviteli kulcslista/függvény és a három M10 teszt tartozik itt a Fázis 0-hoz.
- `docs/PROGRESS.md` legutóbbi bejegyzései M9.16/M9.15 állapotot dokumentálnak; külön M10 implementációs riportot vagy M10-tesztfutás-riportot nem találtam.

### Érintett fájlok

| Fájl | Szerepe | M10 változás | QA-relevancia |
|---|---|---|---|
| `docs/M10_UNIFIED_WORKFLOW_DESIGN.md` | Termék-/fázisterv | A commitban új, de design-only terv; nem bizonyítja a működést. | Elvárások és kizárások összevetése a kóddal. |
| `src/features/calculators/construction-field-transfer-control.tsx` | Kliens UI | Új forráslista-vezérlő, az „Átvétel” esemény. | Forrásválasztás, hibajelzés és mobil UX. |
| `src/features/calculations/construction-actions.ts` | Server Action | Forráslista Action és mentési kérésben opcionális `sourceCalculationRevisionId`. | Bemenet-validáció, hitelesítés és hibák leképezése. |
| `src/features/calculations/construction-data.ts` | Adatlekérdezés | `listRafterCutTransferSources` aktuális, saját rafter-cut revíziókat listáz. | Szervezeti és létrehozói scope, limit és hibaviselkedés. |
| `src/features/calculators/rafter-connection-fields.ts` | Mezőleképező domain helper | Nyolc átvihető kulcs kiszűrése. | Forrás/cél mezőkompatibilitás. |
| `src/features/calculators/rafter-connection-fields.test.ts` | Unit teszt | Három `rafterJointTransferValues` teszt bekerült. | Pozitív/negatív mezőlista; nem fedi le az adatút többi részét. |
| `src/features/calculators/construction-drafts.ts` | Kliens draft helper | `mergeCalculatorDraft` meglévő draft megtartásával írja az átvett kulcsokat. | Ütköző, már kitöltött értékek felülírása. |
| `src/features/calculators/construction-suite.tsx` | Kalkulátor UI/state | Csak material-takeoff/timber-cutlist célra beköti a vezérlőt; sikeres átvételnél draftot és forrás ID-t állít. | UI helye, célok, munkamenet és forrásállapot elvesztése/öröklése. |
| `src/features/calculators/construction-save-panel.tsx` | Mentési UI | Átadja az ideiglenes forrás-revíziót az Actionnek; siker esetén elfogyasztja. | Sikertelen mentés, retry, revízióváltás. |
| `src/infrastructure/supabase/construction-calculation-writer.ts` | Restricted DB writer adapter | A 10 paraméteres RPC-t hívja, a forrásrevizió-azonosítóval. | SQL-signatúra/grant kompatibilitás, tranzakciós út. |
| `supabase/migrations/20261026010000_construction_field_transfer.sql` | SQL RPC | Új, forrásellenőrző standalone mentési RPC; revízióval együtt függőséget rögzít. | Jogosultság, atomikusság, idempotencia és revízió. |
| `supabase/migrations/20261026020000_construction_field_transfer_dependency_scope.sql` | SQL trigger | Bővíti a calculation dependency-validálást az azonos készítőjű standalone párra. | Projektszabály megőrzése, szervezeti izoláció, gráf integritás. |

**A vegyes commit korábbi/M9 vagy nem M10-specifikus részei:** `docs/M916*`, `docs/M915*`, `docs/M914*`, `docs/KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md`, a M9-es számítási/geometriai fájlmódosítások, valamint a `roof-calculator-definitions.ts` közös mező-/definíciómódosításai. Ezek megteremtik az átvehető célmezőket, de nem az M10 adatátvételi vezérlő új útvonala.

## 3. Adatátadási útvonal

1. **Belépési pont:** `src/features/calculators/construction-suite.tsx:492-500` csak `roof.material-takeoff` és `roof.timber-cutlist` esetén jeleníti meg a `ConstructionFieldTransferControl`-t, az önálló kalkulátor mentési panelje fölött.
2. **Lista betöltése:** `construction-field-transfer-control.tsx:25-28, 35-38` a disclosure első megnyitásakor hívja a `listRafterCutTransferSourcesAction` Actiont. Betöltési hiba `[]`-ként jelenik meg, ugyanúgy, mint az üres lista.
3. **Forrás jogosultság/scope:** `construction-actions.ts:24-28` UUID-t ellenőriz, majd `construction-data.ts:100-121` hitelesített szervezeti tagságot követel, csak standalone `construction.roof.rafter-cut` rekordot és a bejelentkezett felhasználó saját rekordját listázza. A query a legutóbb frissített 20 kalkulációra korlátozódik, ezek mindegyikének csak aktuális revízióját olvassa. Supabase RLS is érvényesül a `createClient()` olvasásánál.
4. **Mezőleképezés:** `rafter-connection-fields.ts:15-19` csak nem üres mezőértékeket adja vissza. A kulcsok: `seatCutHeightMm`, `plateWidthMm`, `purlinFaceMm`, `purlinTopMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`. A `horizontalHalfSpanMm`, `riseMm`, ereszadat és `rafterDepthMm` nem kerül át; az M10 terv szerint azok jelentése/referenciája nem bizonyítottan közös.
5. **Jóváhagyás és cél draft:** a forrássor `Átvétel` gombja közvetlenül meghívja az `onApply`-t (`construction-field-transfer-control.tsx:43-45`). Nincs előzetes mezőleképezési preview vagy második megerősítő lépés. A suite `mergeCalculatorDraft`-tal írja a mezőket, valamint `birdsmouth: "true"` értékkel bekapcsolja a csatlakozási mezőket (`construction-suite.tsx:495-496`). A merge a nem átadott draftmezőket megtartja, az azonos kulcsú célértéket felülírja. A gomb explicit felhasználói művelet, de a már kitöltött mezők felülírása előtt nincs külön figyelmeztetés.
6. **Származásjelzés:** a UI az átvétel után kalkulációnevet és revíziószámot mutat (`construction-field-transfer-control.tsx:45-46`); dátumot és mezőnkénti eredetjelzést nem. Az értékek a cél helyi draftjába másolódnak, nem élő hivatkozások.
7. **Mentés:** a mentési panel az aktuális `input` snapshotot és az ideiglenes forrás-revízió ID-ját együtt küldi (`construction-save-panel.tsx:97-114`). Az Action ellenőrzi a bemenetet, kalkulátort, szervezeti tagságot, mezőkulcsokat, újraszámolja a kimenetet a szerveroldali motorral, majd a restricted writeren át hívja az RPC-t (`construction-actions.ts:32-68`).
8. **Dependency és fogyasztás:** a 10 argumentumos RPC új immutable célrevíziót készít, majd ugyanabban az SQL-tranzakcióban rögzíti a `field-transfer:roof.rafter-cut-><cél-azonosító>` dependency sort (`20261026010000_construction_field_transfer.sql:8-103`). Sikeres válasz után a panel törli a forrás ID-t (`construction-save-panel.tsx:107-111`); hiba esetén a forrás ID nem törlődik, így ugyanazzal a forrással próbálható újra. A pontos requestet és operation ID-t használó retry idempotens.
9. **Új revízió vagy új munkamenet:** a dependency a létrejött cél-revízióhoz kapcsolódik; sikertelen tranzakció nem hagy félkész revízió/dependency párt. A következő saját mentéshez a forrás ID már nincs beküldve. A kliensoldali forrásállapot munkamenet-szintű; új célkalkulátor/új munkamenet viselkedését QA-ban ellenőrizni kell.
10. **Forrás módosulása:** az RPC a kiválasztott konkrét forrás-revízió létezését, szervezetét, standalone scope-ját, létrehozóját és calculator type-ját ellenőrzi; azt nem ellenőrzi, hogy az továbbra is a kalkuláció aktuális revíziója. Egy kiválasztás után létrejövő forrás-revízió esetén a régi pontos snapshotra menthet a cél. A régi célrevízió később nem íródik át.

## 4. Mezőleképezési szerződés

| Forrás (`roof.rafter-cut`) | Cél (`roof.material-takeoff`, `roof.timber-cutlist`) | Átvételi viselkedés |
|---|---|---|
| `seatCutHeightMm` | `seatCutHeightMm` | HAP; ha a forrásban nem üres. |
| `plateWidthMm` | `plateWidthMm` | Ha a forrásban nem üres. |
| `purlinFaceMm`, `purlinTopMm` | azonos kulcsok | Derékszelemen-mezők, ha nem üresek. |
| `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm` | azonos kulcsok | Gerinckapcsolati mezők, ha nem üresek. |

Az értékek változatlan stringként kerülnek a cél draftba. Nincs ebben a helperben mértékegység-konverzió, mezőszintű adatforrás-snapshot vagy célmezőnkénti kompatibilitási validáció. A forrás adatot tartalmazó kulcsaihoz tartozó szűrés unit tesztekkel vizsgált; a UI/API/DB-kapcsolat nem.

## 5. SQL-migrációk és jogosultságkezelés

### `supabase/migrations/20261026010000_construction_field_transfer.sql`

- Eldobja a korábbi 9 argumentumos `public.save_standalone_construction_calculation(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,uuid)` függvényt és létrehozza a 10 argumentumos változatot, amelynek utolsó paramétere `p_source_calculation_revision_id uuid default null`.
- `SECURITY DEFINER`, `SET search_path=''`; minden táblahivatkozás schema-kvalifikált, beépített függvények `pg_catalog`-ból hívódnak. Minden `PUBLIC`, `anon`, `authenticated` EXECUTE jogot visszavon, és csak a `tetopro_covering_writer` szerepkörnek ad EXECUTE-et (`:8-9, :102-103`).
- Megtartja az input/output JSON shape és méretvalidációt, a négy menthető konstrukciós kalkulátort, szervezeti tagságot, actorhoz kötött standalone célt, optimistic revision ellenőrzést, per-operation/per-calculation advisory lockot és operation-ledger idempotenciát.
- Forrás ID esetén célként kizárólag material-takeoff vagy timber-cutlist fogadható el; source revisionnek ugyanazon orgban létező, saját `construction.roof.rafter-cut` standalone kalkulációhoz kell tartoznia (`:47-58`).
- A source check nem ellenőrzi, hogy source revision a legfrissebb; nem validálja SQL-ben a bemásolt mezőértékek és kiválasztott forrás tartalmának egyezését.
- A cél `calculation_revisions` immutable rekord, a `calculations.current_revision_id` frissítése, operation ledger és opcionális dependency beszúrása egyetlen függvényhívás/tranzakció része (`:81-100`). SQL-hiba esetén a tranzakció visszagörgeti mindet.

### `supabase/migrations/20261026020000_construction_field_transfer_dependency_scope.sql`

- A meglévő `private.validate_calculation_dependency()` triggerfüggvényt cseréli; a trigger az eredeti architektúramigrációban már csatlakozott `calculation_dependencies` `BEFORE INSERT OR UPDATE` eseményére (`20261012010000_versioned_calculation_architecture.sql:246-248`).
- A függvény `SECURITY DEFINER`, `SET search_path=''` (`:8-11`). Pontosan egy upstream revision típust követel, ugyanazon `organization_id` alapján keresi a downstream/upstream revíziót és számítást, a projektazonosságot megtartja, és engedélyezi az azonos készítőjű, mindkét oldalon `standalone` számítások kapcsolatát (`:26-68`). A standalone szabály alkalmazásában a downstream creator nem lehet null.
- Megtartja az önhivatkozás- és kördetektálást (`:70-87`). A függvény új kifejezett típusmátrixot nem tesz a triggerbe; a konkrét M10 forrást/céltípus-korlátozás a mentési RPC-ben van.
- A trigger maga nem ír, csak a hibás kapcsolatot visszautasítja. A dependency táblán a meglévő org- és foreign-key, unique index és RLS-policy korlátok továbbra is érvényesek (`20261012010000_versioned_calculation_architecture.sql:108-146, 294-305`). A construction downstream authenticated közvetlen insertet tiltó restrictive policy `20261025100000_standalone_construction_calculations.sql:14-15`; az M10 RPC írása restricted `SECURITY DEFINER` writeren keresztül történik.

**Telepítési/kompatibilitási ellenőrizendő:** a két migrációt sorrendben kell alkalmazni (010000, utána 020000); alkalmazott migrációt és hosted/staging állapotot ebben a feladatban nem ellenőriztem, és migrációt nem futtattam. Az 1. migráció eldobja a régi 9-arg függvényt, majd defaultolt utolsó paraméterrel hoz létre 10-arg aláírást. Ezután a régi és új alkalmazáshívás kompatibilitását a tényleges RPC klienssel/granttel kell ellenőrizni; itt nem következtetek rá a default paraméterből.

## 6. Mentés, revízió és dependency

- A cél szerveroldali számítási eredményt kap: az Action csak bemenetet fogad és újraszámolja a kimenetet; a kliens nem hiteles outputot küld (`construction-actions.ts:32-68`).
- A DB writer tagságot ellenőriz és zárol; meglévő célkalkulációnál org, standalone scope, létrehozó és calculator type egyezést követel, majd az elvárt revíziószámot ellenőrzi. Konfliktusnál `40001`, jogosultságnál `42501`, hibás kérésnél `22023` jön vissza (`20261026010000_construction_field_transfer.sql:20-80`).
- Source/dependency és célrevízió egy tranzakcióban rögzül; ha dependency trigger elutasítja a sort, a mentés egésze visszagördül.
- Forrás és cél ugyanahhoz a szervezethez, standalone scope-hoz és azonos létrehozóhoz kötött (`:53-58` RPC és `20261026020000...sql:65-68` trigger). A DB-végrehajtási role és az app auth környezet telepített credential-jét ebben az inventoryban nem vizsgáltam.
- A cél immutable snapshot bemenetében az átvett értékek is megmaradnak. `data_provenance` változatlanul `scope=standalone`, `input=user_provided`, `output=server_recomputed`; a mezőátvétel eredete külön dependency-sorban van, nem a snapshot mezőnkénti provenance-jában. UI-ban újranyitáskor a forrás-jelvény megjelenítése a jelenlegi kódútvonalon nem bizonyított.
- Kliens oldali retry ugyanazzal a `operationId`-val ismétel; a DB payloadba a source revision ID is bekerül, így más forrású kérés nem használhatja ugyanazt az operation ID-t észrevétlenül (`:61-73`).

## 7. Meglévő tesztbizonyítékok

### A commitban talált M10-specifikus tesztek

`src/features/calculators/rafter-connection-fields.test.ts:43-59` három tesztet ad hozzá:

1. Nem üres átvihető kulcsok kiválasztása; üres, nem átvihető geometriakulcsok kihagyása.
2. Üres eredmény, ha nincs átvihető forrásadat.
3. Az átadott kulcsok szerepelnek a `roof.material-takeoff` meződefinícióiban.

A harmadik teszt nem ellenőrzi külön a timber-cutlist mezőkészletet; és egyik sem futtatja az UI-t, Actiont, adatlekérdezést, RPC-t vagy SQL trigger/migrációt. A teszteket ebben a feladatban nem futtattam.

### Állított, de nem repo-bizonyítékként kezelt eredmény

A feladatleírás szerint Claude lokális DB-teszteket tranzakción belül, rollbackkel futtatott. A `20261026020000...sql` fejléc-kommentje azt is állítja, hogy a korábbi projektazonossági tiltás funkcionális teszttel reprodukálódott. M10-re vonatkozó implementációs riportot, DB-tesztfájlnevet, parancsot vagy eredménykimutatást nem találtam a commitban/dokumentációban; ezért mindkettő **forrásban szereplő/Claude által jelentett, önállóan nem ellenőrzött állítás**, nem igazolt QA-eredmény. A `docs/PROGRESS.md` M9.16 tesztjei a commit előtti M9 állapotot fedik, nem bizonyítják az M10-et.

### Nem bizonyított esetek

Jogosulatlan forrás olvashatatlansága, külön org izoláció, saját/nem saját creator és projekt esetek, forrás-revízió versenyhelyzet, tényleges mezőértékek/target draft felülírása, timber-cutlist mezőparity, migration trigger/RLS/grant behavior, sikertelen mentés rollback, retry, mentés-után-újranyitás, immutable snapshot és mobil UI.

## 8. Nyitott kérdések és kockázatok

1. **P1 — Kiválasztás és mentés között változó forrás:** RPC nem követeli meg, hogy átadott forrás-revízió még mindig a `current_revision_id` legyen. Pontos, de esetleg elavult snapshotot lehet felhasználni.
2. **P1 — dependency guard scope:** új trigger engedélyez minden azonos creator standalone kalkulációpár közötti élt, nem csak M10 rafter-cut → két célpárt. A jelenlegi RPC korlátozza az M10-es mentési utat, de más RPC/writer kódút biztonságát célzottan ellenőrizni kell.
3. **P1 — DB authorization/role:** app Action membershipet ellenőriz, RPC is tagságot és actor ownershipet ellenőriz; a security-definer tulajdonosi kontextus, RLS bypass és tényleges writer credential grants csak migrációs/statikus olvasás alapján látszik, élő DB-ben nem ellenőrzött.
4. **P2 — Felülírás és eredet:** az „Átvétel” gomb azonnal felülírja az azonos célmezőket és bekapcsolja a `birdsmouth`-t; nincs előnézet/felülírási figyelmeztetés. Sikeres mentés után a forrásstate törlődik, a forrásjelzés újranyitáskor nem jelenik meg itt.
5. **P2 — Lista hibakezelés és korlát:** listaquery hiba és üres találat ugyanazzal az UI-állapottal jelenik meg; csak 20 legutóbb frissített kalkulációt vizsgál.
6. **P2 — Atomicitás/újranyitás:** SQL felépítése tranzakciós atomikusságot mutat, de M10 specifikus DB rollback, concurrent save és mentés utáni betöltés tesztbizonyíték nem került elő.
7. **P3 — UI/nézetméretek:** forráslista mobilos elrendezése, hiba-/üres állapot megkülönböztetése, eredetjelzés hossza és disclosure billentyűzetes működése nincs M10 teszttel lefedve.

## 9. Prioritásos QA-checklist

| Prioritás | Kiinduló fájl | Kockázat / állítás | Szükséges bizonyíték | Meglévő teszt? |
|---|---|---|---|---|
| P1 | `src/features/calculations/construction-data.ts:100-121`; `construction-actions.ts:24-28`; migration `20261026010000...sql:47-58` | Más szervezeti vagy más felhasználó forrása nem listázható és nem menthető. | Auth/RLS integrációs vagy rollbackelt DB teszt: org A/B, azonos org eltérő creator, RPC közvetlen restricted role hívás. | Nem találtam M10 tesztet. |
| P1 | `20261026010000_construction_field_transfer.sql:47-58`; `20261026020000...sql:26-68` | Csak rafter-cut → material/timber transfer engedélyezett; trigger standalone bővítés nem nyit nem kívánt kapcsolatot. | DB matrix: érvényes M10 pár; tiltott source/target; különböző creator; projekt/standalone keverés; azonos projekt régi szabálya; eltérő org; upstream exactly-one. | Nem találtam M10 DB-tesztet. |
| P1 | `20261026020000_construction_field_transfer_dependency_scope.sql:70-87`; `20261012010000_versioned_calculation_architecture.sql:153-168` | Önhivatkozás/kör blokkolása és immutable revision megmarad. | DB negatív cycle/self-edge teszt, revision update/delete próbálkozás és változatlanság igazolása. | Nem találtam M10 DB-tesztet. |
| P1 | `construction-save-panel.tsx:97-114`; `construction-actions.ts:60-75`; `20261026010000...sql:61-100` | Sikertelen/konkurens mentés nem hagy félkész dependency-t; retry nem hoz létre duplikált revíziót. | Hibat injektáló rollbackteszt és párhuzamos optimistic-concurrency + exact retry teszt, ledger/dependency darabszám ellenőrzéssel. | Nincs M10 teszt; a DB tesztek rollbackjéről csak Claude állítása ismert. |
| P1 | `construction-data.ts:104-120`; `construction-actions.ts:60-68`; `20261026010000...sql:47-58` | Kiválasztott revision tartalmával egyező mezők kerülnek mentésre; forrás változása esetén stale viselkedés biztonságos. | Változtasd meg current revisiont kiválasztás és mentés között; rögzítsd, hogy elfogadott/rejectelt-e, és product elvárással egyezzen. Ellenőrizd a dependency pontos source ID-ját. | Nincs. |
| P2 | `rafter-connection-fields.ts:15-19`; `construction-suite.tsx:492-500`; `construction-drafts.ts:15-18` | Nyolc mező és `birdsmouth` helyesen kerül célba; már kitöltött mezőkre a jóváhagyás és felülírás egyértelmű. | Mindkét célon teljes mezőmátrix, üres/kitöltött célértékek, más mezők változatlansága, UI-val végigvitt felhasználói jóváhagyás. | 3 helper unit teszt; UI és draft merge teszt nincs. |
| P2 | `construction-field-transfer-control.tsx:25-46`; `construction-data.ts:104-121` | Csak aktuális, saját források; limit/sorrend és adatbetöltési hiba közérthető. | 20+ forrás fixture, más user/org fixture, betöltési hiba és valóban üres állapot külön ellenőrzése. | Nincs M10 Action/data/UI teszt. |
| P2 | `construction-actions.ts:32-68`; `construction-save-panel.tsx:97-114`; `construction-data.ts:124-138` | Átvett cél menthető, újranyitható és helyes revision/dependency eredettel olvasható. | Integráció/böngészős smoke: átvesz → ment → reload/reopen; input snapshot, current revision, dependency source ID/type és felületi jelölés ellenőrzése. | Nincs M10. |
| P2 | mindkét migráció; `construction-calculation-writer.ts:10-18` | DB és alkalmazás RPC aláírása/grantje telepítéskor kompatibilis. | Migrációs dry run izolált DB-klónon a helyes sorrendben; 9-arg régi hívás elutasítása és restricted 10-arg hívás elfogadása. | Nem találtam M10 telepítési bizonyítékot. |
| P3 | `construction-field-transfer-control.tsx:25-46` | Disclosure, source button, loading/empty/applied states mobilon és billentyűzettel használható. | Célzott 375px/desktop UI smoke, billentyűzetes fókusz/aktiválás, képernyőolvasó nevei. | Nincs M10 UI-teszt. |

## 10. QA-hoz szükséges pontos fájlútvonalak

### Elsődleges M10 útvonal

- `src/features/calculators/construction-field-transfer-control.tsx`
- `src/features/calculators/construction-suite.tsx`
- `src/features/calculators/construction-drafts.ts`
- `src/features/calculators/rafter-connection-fields.ts`
- `src/features/calculators/rafter-connection-fields.test.ts`
- `src/features/calculators/construction-save-panel.tsx`
- `src/features/calculations/construction-actions.ts`
- `src/features/calculations/construction-data.ts`
- `src/infrastructure/supabase/construction-calculation-writer.ts`
- `supabase/migrations/20261026010000_construction_field_transfer.sql`
- `supabase/migrations/20261026020000_construction_field_transfer_dependency_scope.sql`

### Szükséges korábbi DB-szerződések

- `supabase/migrations/20261012010000_versioned_calculation_architecture.sql` — táblák, kulcsok, immutable revision és eredeti dependency-trigger.
- `supabase/migrations/20261014010000_standalone_calculation_persistence.sql` — standalone számítási és dependency RLS-minták.
- `supabase/migrations/20261025100000_standalone_construction_calculations.sql` — restrictive construction writer policy, operation ledger és korábbi RPC.
- `supabase/migrations/20261025154642_qa08_rpc_trust_boundary.sql` — közvetlen előző writer trust-boundary módosítás; M10 lecseréli a 9-arg függvényt.
- `src/features/auth/auth.server.ts` — Action oldali auth context.

### Elvárás/dokumentáció

- `docs/M10_UNIFIED_WORKFLOW_DESIGN.md` — terv és tervezett határok.
- `docs/PROGRESS.md` — jelenlegi fejlesztési bizonyítékok; jelenleg nincs külön M10 státuszriport.
- `docs/DATABASE.md` — DB sémadokumentáció, a megfelelő calculation/dependency részekkel.

## M10 Fázis 0 QA-átadási státusz

**Előkészítés teljes:** a jelenlegi kódút, két migráció, M10-hez rendelt diff és fellelhető tesztbizonyíték dokumentálva. **A QA nincs elvégezve:** migráció, DB, alkalmazás, teszt, build és böngészős workflow ebben a feladatban nem futott.
