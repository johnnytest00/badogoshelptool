# M10 Fázis 0.2 — P1-javítás független ellenőrzése

**Dátum:** 2026-10-26  
**Vizsgált commit:** `bb076c882be24f74e74cb0c25c6b76787eb033a2` (`fix(M10.0.2): restore QA08 attestation and completeness gate in M10 field-transfer writer`)  
**Git-állapot:** a vizsgálat kezdetén tiszta munkafa; az egyetlen változás e riport hozzáadása.  
**Végső státusz: `PASS WITH LIMITATIONS`.**

## Vizsgálati kör és módszer

Átnéztem a korábbi QA-t és remediation riportot, a QA08 writer és az M10 10 paraméteres writer migrációit, a dependency-scope és javítómigrációkat, a 056/060/061 pgTAP fájlokat, valamint a jelenlegi Actiont, SQL writert és generált adatbázistípus-bejegyzést. A forráskódot és tesztdefiníciókat statikusan ellenőriztem. A remediation riportban szereplő `db reset`, pgTAP, Vitest, lint, typecheck és build eredmények **jelentett**, nem általam újrafuttatott eredmények.

Nem futtattam adatbázistesztet, resetet, migrációt, alkalmazáskódot vagy buildet. A feladat tiltja a resetet, a biztonságos izolált tesztadatbázis pedig ebben a körben nem volt függetlenül igazolható. Nem módosítottam alkalmazáskódot, SQL-t vagy meglévő tesztet.

Vizsgált fájlok: `docs/M10_PHASE0_INDEPENDENT_QA.md`, `docs/M10_PHASE0_P1_REMEDIATION.md`; a `20261025154642_qa08_rpc_trust_boundary.sql`, `20261026010000_construction_field_transfer.sql`, `20261026020000_construction_field_transfer_dependency_scope.sql`, `20261026030000_construction_field_transfer_attestation.sql` migrációk; `056_standalone_construction_calculations.sql`, `060_calculation_rpc_trust_boundary.sql`, `061_construction_field_transfer_attestation.sql`; `src/features/calculations/construction-actions.ts`, `src/infrastructure/supabase/construction-calculation-writer.ts`, `src/infrastructure/supabase/database.types.ts`, és a `package.json` db:types parancsa.

## QA08/QA09 szerződés és javítás

A `20261026030000` migrációs függvényteste a QA08 writer fő mentési szerződését megőrzi, és hozzáadja az M10 forrás/dependency ágat:

- A `private.is_complete_construction_snapshot(...)` ismét minden engedélyezett construction kalkulátor mentésénél kapuként fut; az ad-hoc objektum- és tömbellenőrzés eltűnt. A QA08 helper a szerkezeti teljesség mellett a kimenet érvényességi állapotát is vizsgálja.
- A sikeres új mentés attestációja az immutable revízió beszúrása után, a számítás mutatójának, operation ledgernek és dependencynek az írásával azonos PostgreSQL függvényhívás-tranzakcióban készül. Attestáció vagy dependency beszúrási hiba esetén az egész tranzakció visszagördülne.
- Az idempotens ág egyezteti a hívó, kalkuláció, payload és source revision értékeket, és az újrahasznosítás előtt attestációt követel. Hiányzó attestációval nem ad vissza sikeres retry eredményt.
- A név/típus/UUID és payloadméret ellenőrzés, tagság `FOR SHARE` zárolással, két advisory lock, operation-payload egyezés, kalkuláció szervezet/standalone/tulajdonos/típus ellenőrzése, valamint optimistic concurrency ellenőrzése megmaradt.
- A forrás csak saját szervezetből, standalone kalkulációból, azonos létrehozótól és `roof.rafter-cut` típusból fogadható; célként csak `material-takeoff` és `timber-cutlist` engedélyezett. A dependency pontos source revisiont rögzít.
- A revíziók immutabilitását a QA08 migráció revízió-védelmi szerződése és a kapcsolódó idegen kulcsok/attestáció trigger adják; a javítómigráció ezeket nem írja át. A munkanapló- és ajánlatkapcsolási trigger továbbra is a célrevízióhoz kötött attestációt követeli meg.

A `20261026010000` korábbi implementációjában hiányzó attestáció és teljességi kapu a vizsgált javítómigrációban valóban helyreállt. A `20261026020000` standalone dependency-szabálya megőrzi a projektes kapcsolat szabályát, és egyazon szervezet/creator standalone párt engedélyez; a pontos egy upstream, önhivatkozás és ciklus ellenőrzése változatlanul része a triggernek. Nem találtam a korábbi QA08 writerből további, a javított változatban elveszett mentési/jogosultsági/konkurenciakezelési ellenőrzést. Ez kódszintű megállapítás, nem élő DB bizonyíték.

## RPC, jogosultság és TypeScript

- A jelenlegi függvény 10 argumentumos, a 10. `p_source_calculation_revision_id` `DEFAULT NULL`. Az M10 migráció a régi 9 argumentumos azonosítót eldobta; 9 argumentumos adatbázishívások továbbra is illeszkedhetnek a default argumentum miatt, de csak a tényleges 10 argumentumos függvény maradt. A PostgREST 9 argumentumos név szerinti hívását nem futtattam.
- `SECURITY DEFINER` és üres `search_path` megmaradt. A függvény végleges `REVOKE`/`GRANT`-ja az M10 migrációból származik, melyet a `CREATE OR REPLACE` nem cserél le: `PUBLIC`, `anon`, `authenticated` nem kap EXECUTE-t, a `tetopro_covering_writer` igen. A 056/060 módosított ellenőrzése már a 10 argumentumos függvényjogot vizsgálja.
- A jelenlegi Action a `constructionOutputSnapshot(calculatorId, computation)` által készített szerveroldali eredményt küldi az egyetlen alkalmazás-writernek. A writer nyers `pg` kapcsolaton mindig 10 pozicionális paramétert ad át, a hiányzó forrást `null`-ra állítja. Jelenlegi appfolyamatban elavult Supabase RPC típus ezért futásidejű hibát nem okoz. Típusellenőrzés/fejlesztés közben azonban egy későbbi `.rpc()` hívás 9 argos generált API-ra épülhet, illetve arg-count/type mismatches adódhatnak.
- [`database.types.ts`](/Users/bence/Documents/badogos_helptool/src/infrastructure/supabase/database.types.ts:1890) 9 paramétert mutat, ezért a DB-hez képest elavult. Most nem frissítettem. A legkisebb biztonságos javítás a projekt hivatalos `npm run db:types` (`supabase gen types typescript --local`) futtatása olyan izolált, migrációkkal naprakész lokális DB ellen, majd a teljes generált diff felülvizsgálata. Kézi típusfoltozás nem ajánlott. A generálás a projektben dokumentált, de ebben a körben nem futtattam.
- Migrációs sorrend: QA08 → `20261026010000` függvénycsere → `20261026020000` dependency trigger → `20261026030000` javító függvény. Új környezeten a sorrend logikus; meglévő környezetre a 030 forward-only `CREATE OR REPLACE` javítás alkalmas. A tényleges telepítési környezeten és PostgREST sémakatalóguson nem ellenőriztem.

## A 061 teszt bizonyító ereje

A 17 assertiones teszt statikusan ténylegesen ellenőrzi:

- sikeres `rafter-cut` és M10 célmentés attestációját;
- hibás/hiányos cél-output elutasítását és azt, hogy ebből nem lesz kalkuláció vagy dependency;
- helyes source/target dependency sort és típust;
- azonos operation ID retry újrahasználatát, attestáció-duplikáció nélkül, illetve eltérő forrás ugyanazon operation ID-val történő elutasítását;
- tiltott célkalkulátort, másik felhasználó saját standalone forrását és stale expected revisiont;
- sikeres munkanapló-kapcsolást, továbbá a forrás nélküli régi mentési útvonalat.

A teszt a `BEGIN … ROLLBACK` tranzakcióban fut, és a hibás snapshot esetén vizsgál maradványokat. Ez a validációs hiba előtti atomikusságot igazolja, ha a teszt ténylegesen lefutott. **Nem bizonyítja külön**, hogy egy revízió és attestáció beszúrása után bekövetkező dependency-trigger hiba visszagörgeti az összes korábbi írást; ezt a függvénytranzakció szemantikája támasztja alá, de dedikált rollback teszt hiányzik.

További lefedettségi hiányok:

- Nincs pozitív M10-es ajánlatforrás-kapcsolási assertion a 061-ben; az attestált cél munkanapló-linkje pozitív teszt. A 060 a QA08 útvonalon tesztel ajánlati elutasításokat, de ez nem az M10 célrevízió pozitív kapcsolása.
- A tiltott forrás teszt azonos szervezet másik felhasználóját ellenőrzi, de külön másik szervezetből származó forrást nem.
- A korábbi sérült M10 writerrel is sikeres teszt eseteket azonosítottam: a sikeres attestációs és dependency-assertjei, az idempotens retry és a sikeres munkanapló-link önmagukban átmentek volna akkor is. A teljességi kaput célzó 49. sor hibás outputja viszont régi writerrel átment volna, de ezt a teszt helyesen `throws_ok`-kal elutasítja; a sikeres M10 attestáció-assert szintén megbukott volna, ezért a tesztcsomag összességében észleli a regressziót.
- Attestáció pontos egyediségét a sikeres célrevízión nézi; hibás snapshot nem bizonyítja a későbbi dependency constraint miatti rollbacket. 061-ben nincs ajánlat-link, nincs kifejezetten kereszt-szervezeti forráseset.

A 056/060/061 módosítások nem bizonyítják a teljes DB-szintű regressziót ebben az ellenőrzésben. A remediation riportban szereplő 63 fájl/1336 assertion, 1187 Vitest, lint, typecheck, build és lokális DB reset eredményeket nem saját futtatásként jelentem.

## Döntés és továbblépés

**A korábbi P1 regresszió kódszinten megszűnt:** a teljes snapshot-kapu, sikeres mentési attestáció, retry attestáció-ellenőrzése visszakerült, és a 061 lényeges pozitív/negatív eseteket definiál. Új bizonyított P1 kockázatot nem találtam. A munkanapló- és ajánlatkapcsolási biztonsági kapu megmaradt.

**Fázis 1:** fejlesztési munka megkezdhető, de a P1 független elfogadását és bármely megosztott/éles telepítésre való továbblépést a 056/060/061 ténylegesen izolált DB-n történő futtatásához kell kötni. A 061-hez javasolt két célzott kiegészítés: dependency-trigger hibából való rollbacket bizonyító teszt, és M10 célrevízió sikeres ajánlatforrás-kapcsolása. Ezek lefedettségi hiányok, nem bizonyított hibás működések.

**Javasolt Conventional Commit:** `docs(M10.0.2): record independent P1 remediation review`

*Kihagyva: DB-reset, migráció, pgTAP és teljes teszt/build futtatása; a remediation riport eredményeit nem hitelesítettem újra. Fennmaradó kockázat: runtime DB/PostgREST viselkedés, dependency-hiba rollback és M10 ajánlat-link nincs ebben a körben függetlenül bizonyítva.*
