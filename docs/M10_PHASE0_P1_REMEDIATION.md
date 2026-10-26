# M10 Fázis 0 — P1 regresszió javítása (QA08-attestáció helyreállítása)

**Dátum:** 2026-10-26
**Hatókör:** `docs/M10_PHASE0_INDEPENDENT_QA.md` 1. prioritású P1 megállapítása. Kizárólag a mezőátvételi writer QA08-attestációs/teljességi regressziója és a hozzá tartozó pgTAP-kompatibilitás javítva; M10 Fázis 1, UI, Karmi-geometria és RLS-szabály nem módosult.

## 1. Gyökérok

A `20261026010000_construction_field_transfer.sql` (M10) eldobta a QA08 (`20261025154642_qa08_rpc_trust_boundary.sql`) 9 paraméteres `save_standalone_construction_calculation` függvényét, és egy saját, 10 paraméteres (opcionális `p_source_calculation_revision_id`) változattal helyettesítette. Az új writer:

- saját, egyszerűsített JSON-shape ellenőrzést végzett a `private.is_complete_construction_snapshot` teljességi kapu helyett;
- nem írt sort a `private.construction_revision_attestations` táblába az új revízióhoz;
- idempotens retry-nál nem követelte meg a visszaadott revízió attestációját.

Következmény: az M10-es mezőátvétellel (vagy forrás nélkül) mentett új revízió immutable volt, de attestáció nélkül maradt. A `private.require_attested_construction_revision()` trigger (`execution_plan_document_links`, `quotation_calculation_sources`) ezért minden ilyen revízió munkanaplóhoz/ajánlatforráshoz kapcsolását elutasította `22023` hibával.

## 2. Régi és új RPC biztonsági szerződés összehasonlítása

| Garancia | QA08 (9 param, régi) | M10 változatlan állapotban (10 param) | M10 javítás után |
|---|---|---|---|
| Snapshot-teljességi kapu (`private.is_complete_construction_snapshot`) | Igen | **Nem** — csak alapforma/méret ellenőrzés | Visszaállítva |
| Attestáció írása sikeres mentéskor | Igen | **Nem** | Visszaállítva |
| Attestáció ellenőrzése idempotens retry-nál | Igen | **Nem** | Visszaállítva |
| Szerveroldali újraszámítás (Action szint) | Igen | Igen (nem módosult) | Változatlan |
| Org/actor/calculator-type jogosultság | Igen | Igen (nem módosult) | Változatlan |
| Immutable revision | Igen | Igen (nem módosult) | Változatlan |
| Optimistic concurrency (`expected_revision_number`) | Igen | Igen (nem módosult) | Változatlan |
| Operation-ledger idempotencia | Igen | Igen (payload-egyezés), attestáció nélkül | Payload-egyezés + attestáció-követelmény |
| Dependency/célrevízió tranzakciós atomikussága | — (QA08-nak nincs dependency ága) | Igen (egy tranzakció) | Változatlan |
| Forrás jogosultság (org, standalone, creator, type) | — | Igen (nem módosult) | Változatlan |

## 3. Implementáció

Új előrefelé alkalmazható migráció: [`supabase/migrations/20261026030000_construction_field_transfer_attestation.sql`](../supabase/migrations/20261026030000_construction_field_transfer_attestation.sql).

- `create or replace function public.save_standalone_construction_calculation(...10 param...)` — azonos aláírás, ezért a meglévő GRANT/REVOKE megmarad, nem kellett újra adni.
- A bemenet-validáció visszakapta a `private.is_complete_construction_snapshot(p_calculator_type, p_input_data, p_output_data)` hívást a korábbi ad-hoc JSON-shape ellenőrzés helyett (a QA08-migráció e függvénye nem lett eldobva, csak a writer hagyta abba a hívását).
- Az idempotens retry-ág kiegészült: a visszaadott korábbi revíziónak rendelkeznie kell `private.construction_revision_attestations` sorral, különben `22023` hibát ad (ugyanaz a mintázat, mint QA08-ban).
- Az új revízió beszúrása után, még a `calculations.current_revision_id` frissítése és az operation-ledger írás előtt, a függvény beszúr egy attestációs sort.
- A forrásátvételi (M10) logika — forrás org/standalone/creator/calculator-type ellenőrzés, `calculation_dependencies` beszúrás — változatlan maradt; a dependency írás az attestáció után, ugyanabban a tranzakcióban történik, így sikertelen mentés nem hagy hátra félkész attestációt vagy dependency sort.

Nem módosított, már alkalmazott migráció: `20261026010000` és `20261026020000` érintetlen, csak kiegészülnek az új migrációval.

## 4. Megőrzött QA08/QA09 garanciák

A `supabase/tests/database/060_calculation_rpc_trust_boundary.sql` (QA08 trust boundary, 27 assertion) és a `057`/`058` (execution plan / quotation calculation source) tesztek mind a javítás után futtatva **PASS**-t adtak; ezek pontosan a korábban dokumentált garanciákat (teljességi kapu, attestáció, idegen org/felhasználó tiltása, immutable revision, orphan-mentesség) fedik.

## 5. RPC/pgTAP kompatibilitási javítás

A `056_standalone_construction_calculations.sql` és `060_calculation_rpc_trust_boundary.sql` két `has_function_privilege(...)` hívása a már eldobott 9 paraméteres aláírásra (`...,jsonb,jsonb,uuid)`) hivatkozott; ez a tényleges 10 paraméteres aláírással (`...,jsonb,jsonb,uuid,uuid)`) nem oldódott fel, és sikertelen migrációként a teljes fájl `Bad plan` hibával elszállt. Javítva mindkét fájlban a 10 paraméteres signature-re. A 10. paraméter `default null`, ezért a 9 argumentumos kliensbeli hívások (lásd `056`, `058`, `060` meglévő tesztsorai) továbbra is változatlanul futnak.

A tényleges alkalmazás-writer (`src/infrastructure/supabase/construction-calculation-writer.ts`) egy nyers `pg` kapcsolaton, pozicionális SQL-hívással (`$1::uuid,...,$10::uuid`) éri el a függvényt — **nem** a Supabase/PostgREST `rpc()` úton. Emiatt a generált `src/infrastructure/supabase/database.types.ts` elavult (9 argumentumos) `save_standalone_construction_calculation` bejegyzése nem okoz futásidejű inkompatibilitást; ez a projektben az egyetlen hívási pont. A típusfájl frissítése (`npm run db:types`) külön, a teljes séma frissítését hozó, nem célzott diff lenne — **nem ellenőrzött, fennmaradó P2 elem**, ld. 7. szakasz.

## 6. DB- és pgTAP-tesztbizonyítékok

Felhasználói jóváhagyással, a projekt dokumentált, eldobható lokális Supabase-példányán:

- `supabase db reset --local` — mind a 75 migráció (a `20261026030000` javítómigrációval együtt) hiba nélkül alkalmazva, seed betöltve.
- `supabase test db` — **Files=63, Tests=1336, Result: PASS** (előtte, a javítás nélkül: `056`, `057`, `058`, `060` teszt hibázott, pontosan a QA által leírt tünetekkel: `calculation revision is not a trusted complete server result`, illetve a `Bad plan` szignatúra-eltérés).
- Új célzott regressziós teszt: [`supabase/tests/database/061_construction_field_transfer_attestation.sql`](../supabase/tests/database/061_construction_field_transfer_attestation.sql), 17 assertion, **PASS**. Fedi:
  1. forrás (rafter-cut) mentés is kap attestációt;
  2. hiányos/inkomplett cél-output elutasítása forrásátvétel esetén is (teljességi kapu él);
  3. sikertelen célmentés nem hagy hátra félkész kalkulációt vagy dependency sort;
  4. sikeres mezőátvétel pontosan egy attestációt és egy pontos dependency sort hoz létre, helyes `dependency_type`-pal;
  5. azonos operation ID retry attestált revíziót hasznosít újra, nincs duplikátum;
  6. eltérő forrásrevízió ugyanazzal az operation ID-val elutasítva;
  7. nem engedélyezett célkalkulátor (`roof.rafter-cut`) forrásátvétellel elutasítva;
  8. másik felhasználó standalone forrása nem használható fel;
  9. elavult (`stale`) expected revision mezőátvétellel sem hoz létre versengő revíziót;
  10. az attestált, mezőátvétellel mentett célrevízió munkanaplóhoz kapcsolható;
  11. korábbi, forrásátvétel nélküli construction mentési útvonal továbbra is attestációt kap, dependency nélkül.

## 7. Nem ellenőrzött esetek és fennmaradó P2 problémák

- **`database.types.ts` elavult 9-argumentumos bejegyzése** a `save_standalone_construction_calculation` RPC-hez — nem okoz futásidejű kockázatot (lásd 5. szakasz), de a típusdokumentáció pontossága érdekében külön, teljes `npm run db:types` futtatással frissíthető. Ez nem része ennek a P1 javításnak.
- A QA jelentés P2/P3 megállapításai (mezőátvételi felülírás figyelmeztetés nélkül, forráslista-hiba megkülönböztethetetlensége, timber-cutlist mezőlefedettség automatikus tesztje, mobil nézetméret-ellenőrzés) **nem ennek a feladatnak a hatóköre**, változatlanul nyitottak — ld. az eredeti QA riport 11. szakasza.
- Hosted/staging tényleges migrációs sorrend és RPC-kompatibilitás élesben nem ellenőrzött; csak a lokális, eldobható Supabase-példányon futott `db reset --local` + `test db` igazolja a migrációs utat.
- Browseres/UI smoke ebben a javításban nem futott (nem UI-módosítás); a QA riport korábbi UI smoke-ja érvényben marad.

## 8. Futtatott ellenőrzések (pontos eredmény)

- `supabase db reset --local` — sikeres, mind a 75 migráció alkalmazva (felhasználói jóváhagyással, lokális eldobható DB).
- `supabase test db` — **Files=63, Tests=1336, Result: PASS**.
- `npm run lint` — ESLint: No issues found.
- Izolált (ideiglenes `/private/tmp` checkout, megosztott `.next` érintetlen, a futó dev szerver nem állt le/nem indult újra):
  - `next typegen && tsc --noEmit -p tsconfig.typecheck.json` — sikeres, hiba nélkül.
  - `npm run build` — sikeres, Next 16.4.2 production build, minden route legenerálva.
- `npx vitest run` (teljes Vitest) — **Test Files: 192 passed | 8 skipped (200); Tests: 1187 passed | 19 skipped (1206)**.
- `git diff --check` — sikeres, nincs whitespace-hiba.

## 9. Módosított/új fájlok

- `supabase/migrations/20261026030000_construction_field_transfer_attestation.sql` (új, előrefelé alkalmazható javítómigráció)
- `supabase/tests/database/061_construction_field_transfer_attestation.sql` (új célzott pgTAP regresszió)
- `supabase/tests/database/056_standalone_construction_calculations.sql` (javítva: elavult 9-arg signature a `has_function_privilege` hívásokban)
- `supabase/tests/database/060_calculation_rpc_trust_boundary.sql` (javítva: ugyanaz)
- `docs/M10_PHASE0_P1_REMEDIATION.md` (ez a riport)

**Javasolt Conventional Commit:** `fix(M10.0.2): restore QA08 attestation and completeness gate in M10 field-transfer writer`

## 10. Végső elfogadási feltétel — státusz

Az M10 mezőátvétellel mentett revízió a javítás után ugyanazt a teljességi, attestációs és jogosultsági garanciát kapja, mint a korábbi construction mentési útvonalon létrehozott revízió (bizonyítva: `060`, `061` pgTAP PASS). A munkanapló- és ajánlatforrás-kapcsolás a javítás után bizonyítottan működik (`057`, `058` PASS; `061` saját linkelési asszerció PASS). **M10 Fázis 0 P1: javítva és lokálisan bizonyítva.** Hosted/staging alkalmazás előtt a 7. szakaszban jelzett nem ellenőrzött elemeket (különösen a migrációs sorrend élő rendszeren) célszerű külön ellenőrizni.
