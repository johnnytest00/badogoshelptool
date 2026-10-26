# M10 Fázis 0.3 — adatátvételi UX, DB-regresszió és TypeScript-kompatibilitás véglegesítése

**Dátum:** 2026-10-26
**Hatókör:** [`docs/M10_PHASE0_P1_INDEPENDENT_REVIEW.md`](M10_PHASE0_P1_INDEPENDENT_REVIEW.md) "Döntés és továbblépés" szakaszának három célzott követelménye. M10 Fázis 1, Karmi- vagy tetőgeometriai számítás, snapshot-/mentési szerződés és RLS/RPC-jogosultság nem módosult.

## 1. Adatátvételi UI/UX

**Régi működés:** egylépéses "Átvétel" gomb a listasorban, azonnal felülírta a cél draft mezőit és a `birdsmouth`-t; nem volt előnézet, visszavonás, és a betöltési hiba ugyanúgy üres listaként jelent meg, mint a valódi "nincs forrás" állapot.

**Új működés** ([construction-field-transfer-control.tsx](../src/features/calculators/construction-field-transfer-control.tsx)):

- **Előnézet és megerősítés (1.1–1.2):** "Adatok megtekintése" egy helyi preview állapotot nyit (draftot nem módosít); táblázat mutatja mezőnként a jelenlegi és az átvenni kívánt értéket (a cél kalkulátor valódi mező-definícióiból vett címkével/mértékegységgel/select-opcióval), a ténylegesen változó sorokat kiemelve. A `birdsmouth` bekapcsolása külön sorban jelenik meg, ha még nincs bekapcsolva. "Mégse" draftváltozás nélkül zár; "Adatok átvétele" csak akkor aktív, ha van valódi változás — így nincs megtévesztő, tartalom nélküli "sikeres" átvétel.
- **Felülírásvédelem:** a táblázat minden releváns mezőt mutat, az egyezőket is (nem rejtve, nem félrevezető ütközésként), a ténylegesen eltérőket kiemelve.
- **Biztonságos visszavonás (1.3):** megerősítés után "Visszavonás" jelenik meg, amíg a megerősítéskor rögzített korábbi mezőértékek (a snapshot) még pontosan egyeznek a jelenlegi draft-tal. Ha a felhasználó időközben kézzel módosított egy átvett mezőt, a Visszavonás automatikusan eltűnik — nem írja felül váratlanul a kézi módosítást. A visszavonás csak a helyi, még nem mentett draftot állítja vissza és törli a függőben lévő forrás-revíziót; korábbi mentett revíziót nem érint, adatbázisba nem ír. Nincs általános undo-rendszer bevezetve, a mechanizmus kizárólag erre a vezérlőre korlátozott.
- **Hibakezelés és forráslista (1.4):** a komponens állapota `idle/loading/error/loaded`, külön `listRafterCutTransferSources` eredménytípussal ([construction-data.ts](../src/features/calculations/construction-data.ts)), amely `{ok:true, sources}` vagy `{ok:false}`-ot ad vissza — a valódi DB/auth-hiba így megkülönböztethető a ténylegesen üres listától. Hiba esetén "Újrapróbálás" gomb jelenik meg; technikai hibaüzenet, adatbázis-azonosító nem kerül a felhasználó elé. A 20-as forráslistakorlát változatlan, de most jól elkülönül a betöltési hibától.
- **Eredetjelzés (1.5):** "Adatok átvéve: [forrás] · V[revízió]" marad, a dependency-szerződés (kiválasztott forrásrevízió, nem mezőnkénti provenance) szövegezése nem állít ennél többet; nincs új DB-mező vagy provenance-rendszer.
- **Vizuális:** a meglévő `plan-link-*`/Liquid Glass tokenekre épülő új `.field-transfer-*` CSS-osztályok ([globals.css](../src/app/globals.css)); ≥44px érintési célok, mobilon vízszintesen görgethető táblázat, a meglévő `--border`/`--muted`/`--brand-ink` design tokenekkel világos és sötét témában is.
- **Mobilos ellenőrzés:** élő helyi böngészős teszt 375×812 mobil nézetben, sötét témában (lásd 4. szakasz) — a disclosure, az üres állapot és a kártya elrendezés helyesen jelenik meg, konzolhiba nélkül.

## 2. Adatbázis-regresszió

Két új célzott pgTAP teszteset: [`supabase/tests/database/062_construction_field_transfer_rollback_and_quotation_source.sql`](../supabase/tests/database/062_construction_field_transfer_rollback_and_quotation_source.sql), 14 assertion.

1. **Dependency-hiba utáni teljes rollback:** a forrás-rafter-cut mentés után egy, a teszttranzakción belüli, ideiglenes (a végső `rollback`-kal automatikusan megszűnő) trigger szándékosan hibát dob a célkalkuláció `calculation_dependencies` beszúrásánál, miután a célrevízió és az attestáció már beszúrásra került. Ez determinisztikus, tesztkörnyezetben biztonságos módszer; a mentési RPC-t és a production dependency-triggert nem módosítja. Bizonyítva: nem marad árva célkalkuláció, célrevízió, attestáció vagy hibásan sikeres `standalone_construction_save_operations` (operation-ledger) rekord; a korábban már sikeresen mentett forrásrevízió attestációja érintetlen marad.
2. **M10 célrevízió ajánlathoz kapcsolása:** érvényes `roof.rafter-cut` forrásból mezőátvétellel mentett, attestált `roof.timber-cutlist` célrevízió sikeresen kapcsolható ajánlatforrásként a meglévő `save_standalone_quotation_from_calculation` RPC-n és a `require_attested_construction_revision` trigger kapuján keresztül (ugyanaz a támogatott útvonal, mint a 058 tesztben). A kapcsolás után a forrás- és célrevízió attestációja és a forrás/cél dependency sor változatlan.

**Tényleges pgTAP-eredmény (helyi, eldobható Supabase-példányon, a futó dev szerver `.next`-jét nem érintve):**

```
supabase test db supabase/tests/database/056_standalone_construction_calculations.sql \
  .../057_execution_plan_calculation_links.sql .../058_quotation_calculation_sources.sql \
  .../060_calculation_rpc_trust_boundary.sql .../061_construction_field_transfer_attestation.sql \
  .../062_construction_field_transfer_rollback_and_quotation_source.sql
→ Files=6, Tests=112, Result: PASS
```

**Fennmaradó jogosultsági/kompatibilitási kockázat:** a hosted/staging migrációs sorrend élesben nem ellenőrzött (ahogy a korábbi riportokban is); ez nem e feladat hatóköre. Más téma: a keresztszervezeti ("más org") forrás-elutasítás továbbra sincs külön tesztelve (ugyanaz a hiány, mint a független review 3. szakaszában).

## 3. TypeScript/DB kompatibilitás

- **Generálás módja:** `npm run db:types` (`supabase gen types typescript --local`) a fent leírt, migrációval naprakész helyi Supabase-példány ellen.
- **Új RPC-aláírás:** `save_standalone_construction_calculation` `Args` kiegészült az opcionális `"p_source_calculation_revision_id"?: string` mezővel — pontosan a tényleges 10 paraméteres SQL writerrel egyező.
- **Generált diff:** a teljes generálás **egyetlen releváns sort** változtatott (`git diff --stat`: 1 fájl, 1 beszúrás/1 törlés); a séma többi része változatlan. Kézi típusfoltozás nem történt.
- **Fennmaradó eltérés:** nincs; a típusfájl most pontosan tükrözi az adatbázis-szerződést. A restricted writer (`construction-calculation-writer.ts`) és az Action futásidejű viselkedése nem változott (nyers `pg` kapcsolaton, pozicionálisan hívja az RPC-t, a generált típus eddig sem volt a futásidejű hívás forrása).

## 4. Automata és böngészős ellenőrzés

- **Célzott pgTAP:** fent, 2. szakasz.
- **Célzott Vitest:** `rafter-connection-fields.test.ts`, `construction-drafts.test.ts`, `construction-data.test.ts`, `construction-actions.test.ts` — 4 fájl / 23 teszt PASS.
- **Teljes Vitest** (izolált `git worktree`, a fő checkout `.next`-je és futó dev szervere érintetlen): **192 fájl PASS / 8 SKIP; 1187 teszt PASS / 19 SKIP.**
- **ESLint:** PASS ("No issues found").
- **Izolált TypeScript típusellenőrzés:** `next typegen && tsc --noEmit -p tsconfig.typecheck.json` — PASS, hiba nélkül.
- **Izolált Next.js production build:** `npm run build` — PASS, minden route legenerálva, hibát a log nem tartalmazott.
- **`git diff --check`:** PASS, nincs whitespace-hiba.
### 4.1. Helyi DB-writer kapcsolat diagnosztikája és javítása

A `tetopro_covering_writer` szerepkör jelszava (`.env.local` `COVERING_WRITER_DATABASE_URL`) a futó helyi Supabase-példányon nem egyezett (`28P01 password authentication failed`). Diagnózis, kizárólag olvasással és a dokumentált helyi `postgres` superuser hozzáféréssel:

- **Melyik példány:** `127.0.0.1:54322`, a projekt saját, futó `supabase_db_badogos-helptool` Docker-konténere (más projektre/szolgáltatásra nem mutat).
- **Konfiguráció forrása:** a gitignore-olt `.env.local` `COVERING_WRITER_DATABASE_URL` sora, amit a `scripts/setup-local-auth.mjs` csak megőriz, nem generál (lásd `docs/DATABASE.md:715`).
- **Ok:** `select rolpassword is not null … from pg_authid where rolname='tetopro_covering_writer'` → **`false`** — a szerepkörnek jelenleg egyáltalán nincs jelszava. Ez pontosan a `20261014050000` migráció dokumentált, jelszó nélküli `create role … login` állapota (`docs/DATABASE.md:715`: *"a migráció `tetopro_covering_writer` LOGIN szerepet hoz létre jelszó nélkül; … helyben a jelszót a `.env.local` tárolja"*), vagyis a helyi DB egy friss, migrációból épült állapotban volt, és a `.env.local`-ban maradt korábbi jelszó már nem egyezett az (akkor még nem is létező) szerepkör-jelszóval.
- **Biztonságos javítás (elvégezve):** mivel a fenti ellenőrzés bizonyította, hogy ez a projekt saját, elkülönített `127.0.0.1`-es helyi példánya, és a művelet kizárólag ezt az egy, nem-éles, migráció által jelszó nélkül létrehozott szerepkört érinti (más szerepkör, tábla vagy szolgáltatás nem), a dokumentált helyi eljárást követve **új, véletlenszerű jelszót állítottam be `ALTER ROLE … PASSWORD` paranccsal**, és frissítettem vele a `.env.local` `COVERING_WRITER_DATABASE_URL` sorát. Nem migráció, nem `db reset`, nem séma- vagy jogosultságváltozás; a jelszó értékét sehol nem írtam ki vagy dokumentáltam. A kapcsolat utána ellenőrzötten működött (`select current_user` → `tetopro_covering_writer`).

### 4.2. Teljes M10 adatátviteli E2E (élő, helyi, DEMO adatokkal)

Helyi, hitelesített (`demo.owner@local.test`) munkamenetben, a dokumentált DEMO szervezetben (`00000000-0000-4000-8000-000000000010`):

- Mentett DEMO `roof.rafter-cut` forrás ("DEMO M10 QA forrás", HAP=60 mm, gerinckapcsolat alapértelmezett) → **V1 sikeresen mentve.**
- `roof.timber-cutlist` célon: a forrás listában megjelent → **"Adatok megtekintése"** előnézet helyesen mutatta a HAP sort kiemelve ("nincs megadva" → "60 mm") és a Gerinckapcsolat sort nem kiemelve (mindkét oldalon "Szembefutó szarufák", mert a cél alapértelmezése egyezik) — az egyező és a változó mező egyszerre, helyesen jelent meg.
- **Mégse:** a HAP mező a disclosure bezárása után is üres ("hiányzó adat") maradt — a draft bizonyítottan nem módosult.
- **Megerősítés:** a HAP mező ténylegesen `6 cm` (=60 mm) lett, az "Adatok átvéve: DEMO M10 QA forrás · V1" eredetjelzés megjelent, "Visszavonás" gombbal.
- **Visszavonás:** a HAP mező a gomb megnyomása után azonnal visszaállt üresre (DOM-ban ellenőrizve) — helyi draft-visszaállítás, DB-írás nélkül.
- Újra megerősítve, a kalkuláció kitöltve (szarufa keresztmetszet, osztásköz) és mentve → **"DEMO M10 QA cél" V1 sikeresen mentve.**
- **Dependency és attestáció ellenőrzése közvetlenül az adatbázisban (olvasás):** `calculation_dependencies.dependency_type = 'field-transfer:roof.rafter-cut->roof.timber-cutlist'`, upstream pontosan a forrás-kalkulációra, downstream pontosan a cél-kalkulációra mutat; a cél revízió attestáció-száma **1**.
- **Friss navigációval újranyitás:** a HAP mező a böngésző újratöltése után is `6` (cm) — a mentett érték perzisztál.
- **`roof.material-takeoff` cél:** ugyanaz az előnézet→megerősítés folyamat hiba nélkül lefutott, a HAP mező `6`-ra állt, konzolhiba nem volt.
- **"Nincs valódi változás" eset:** a már mentett "DEMO M10 QA cél" újranyitásakor az előnézet minden sort egyezőnek mutatott ("60 mm" → "60 mm"), a "Nincs új adat; minden érték megegyezik a jelenlegi mezőkkel." üzenettel, és az "Adatok átvétele" gomb ténylegesen `disabled` volt (DOM-ban ellenőrizve) — nincs megtévesztő, tartalom nélküli "sikeres" átvétel.
- **375×812, világos és sötét téma:** a fenti "nincs változás" előnézet mindkét témában kontrasztosan, konzolhiba nélkül jelent meg (screenshot-tal ellenőrizve); a Mégse/Adatok átvétele gombok mindkét témában jól olvashatók.
- A böngésző nézetméret-emuláció a munkamenet végén visszaállítva desktopra.

**NOT VERIFIED maradt:** 812×375 tájfekvés; a timber-cutlist/material-takeoff teljes (mind a nyolc mezős) mátrixa egyszerre (csak HAP+ridgeJoint lett ténylegesen gyakorolva, mert csak ezeket töltöttem ki a DEMO forrásban); kézzel módosított mező utáni "Visszavonás eltűnik" eset élőben (kód szinten igen, az `every(...)` ellenőrzés a 2. szakasz pgTAP-jától független, tiszta kliens logika, élőben nem gyakoroltam újra, hogy ne nőjön feleslegesen a kör).

## Elfogadási táblázat

| Terület | Státusz |
|---|---|
| Adatátvétel előnézete és megerősítése | **PASS** (élő E2E-vel igazolva) |
| Meglévő célértékek felülírásvédelme | **PASS** (élő E2E: egyező vs. változó sor helyesen megkülönböztetve) |
| Biztonságos visszavonás | **PASS** (élő E2E: Visszavonás a draftot bizonyítottan visszaállítja) |
| Betöltési hiba vs. üres lista | **PASS** (üres állapot élőben ellenőrizve; hiba-állapot kód szinten, élőben szándékosan nem reprodukálva — lásd lent) |
| 2 pgTAP-regresszió hozzáadva | **PASS** |
| pgTAP tényleges futás | **PASS** (Files=6, Tests=112) |
| `database.types.ts` szinkronizálás | **PASS** |
| Automata ellenőrzés (lint/típus/build/Vitest/`git diff --check`) | **PASS** |
| Helyi DB-writer kapcsolat (`28P01`) | **PASS** (diagnosztizálva és javítva, lásd 4.1) |
| Mentés, újranyitás, dependency/attestáció | **PASS** (élő E2E + közvetlen DB-ellenőrzés) |
| Böngészős QA — 375×812 világos/sötét | **PASS** |
| Böngészős QA — 812×375, teljes 8 mezős mátrix, kézi-módosítás-utáni visszavonás-eltűnés | **NOT VERIFIED** (lásd 4.2 vége) |
