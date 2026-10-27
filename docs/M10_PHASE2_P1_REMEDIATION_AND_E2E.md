# M10.2.1 — RPC trust-boundary javítás és négyirányú E2E véglegesítés

**Döntés: PASS — M10.2 lezárható.** A Codex-féle független QA (`docs/M10_PHASE2_INDEPENDENT_QA.md`) két akadályt talált: a `42501` guard nem volt NULL-biztos, és a négy új kapcsolat teljes mentés–újranyitás E2E-je nem futott le. Mindkettőt ez a menet javította, illetve elvégezte.

## 1. P2 — gyökérok és javítás

A `20261027010000_construction_field_transfer_pairs.sql` RPC-jében a forrás-lekérdezés (`calculation_revisions` ⋈ `calculations`, szűrve `organization_id`, `ownership_scope='standalone'`, `created_by=p_actor_id`-ra) üres találat esetén `v_source_calculator_type = NULL`-t ad. A rákövetkező `if not (...)` feltétel PostgreSQL háromértékű logikája miatt `NULL`-ra értékelődött, így a tervezett korai `42501` guard nem futott le — a hívás a dependency-trigger `P0001` hibájával bukott el, később és rossz SQLSTATE-tel.

**Javítás** (`supabase/migrations/20261027020000_construction_field_transfer_source_guard.sql`, forward-only, a `20261027010000` definíciót `create or replace`-eli): a pármátrix-ellenőrzés előtt explicit
```sql
if v_source_calculator_type is null then
  raise exception 'A kiválasztott forrás nem használható adatátvételhez.' using errcode='42501';
end if;
```
Ez egységesen lefedi a hiányzó, nem létező, idegen szervezetű és idegen létrehozójú forrásrevíziót, ugyanazzal az üzenettel, mint a pármátrix-eset — nem szivárogtat információt a jogosulatlan forrás létezéséről, típusáról vagy tulajdonosáról. A `SECURITY DEFINER`, `search_path=''`, a tagság-, snapshot-teljesség-, revízió-zárolás-, idempotencia- és attestáció-logika változatlan; a függvény teste egyébként szó szerint megegyezik a `20261027010000` verzióval.

## 2. pgTAP regresszió

`supabase migration up --local` alkalmazta az új migrációt. Ezután:

```
supabase test db --local supabase/tests/database/060_calculation_rpc_trust_boundary.sql \
  supabase/tests/database/061_construction_field_transfer_attestation.sql \
  supabase/tests/database/062_construction_field_transfer_rollback_and_quotation_source.sql
```
**Eredmény: Files=3, Tests=60, PASS (60/60).**

A `061_construction_field_transfer_attestation.sql`-hez két új, célzott negatív assertion került (plan 17→19, összesen 58→60 test a három fájlban), a korábbi QA-ban hiányolt esetekre:
- nem létező forrásrevízió → `42501`;
- másik szervezet standalone forrása (azonos létrehozóval) → `42501`.

Mindkettő a már meglévő, idegen létrehozójú forrás tesztje mellett fut, ugyanazon tranzakción belül, `rollback`-kal záródik. A korábban hibázó „másik felhasználó standalone forrása” eset is zöld.

## 3. Négy új kapcsolat — teljes mentés–újranyitás E2E

Helyi, hitelesített `demo.owner@local.test` munkamenetben (DEMO TetőPro Kft., `00000000-0000-4000-8000-000000000010`), böngészőből, DEMO forrás: szélesség 8000 mm, hossz 10000 mm, 35°, HAP 60 mm, ereszkiülés 0 mm, kézi szarufa 50×150 mm.

| Kapcsolat | Forrás revízió | Cél kalkuláció / revízió | `dependency_type` |
|---|---|---|---|
| A) material-takeoff → timber-cutlist | `3965c720-2425-4e7e-b5a6-41fe0799db8b` | `7ff87f74-9036-4d77-a74d-e56914459521` / `edb1e51c-351a-413d-a9e8-84717d8e6d52` | `field-transfer:roof.material-takeoff->roof.timber-cutlist` |
| B) timber-cutlist → material-takeoff | `edb1e51c-351a-413d-a9e8-84717d8e6d52` | `11d331a9-b4c9-40d3-8dc4-4885682eee69` / `e9491ff5-de74-4e77-b9c1-acfff5f0c448` | `field-transfer:roof.timber-cutlist->roof.material-takeoff` |
| C) material-takeoff → rafter-cut | `3965c720-2425-4e7e-b5a6-41fe0799db8b` | `2e5a0ce5-743f-4f21-b1ad-58fee13b35ee` / `74fc4a96-0765-4c77-90aa-74c90a9aac8c` | `field-transfer:roof.material-takeoff->roof.rafter-cut` |
| D) timber-cutlist → rafter-cut | `edb1e51c-351a-413d-a9e8-84717d8e6d52` | `d47b8042-dfae-43a2-8615-b5e84458f86a` / `b66e7dae-613f-4dd0-b702-19f1a19d0472` | `field-transfer:roof.timber-cutlist->roof.rafter-cut` |

Mindegyiknél: DEMO forrás kiválasztása → előnézet → (C, D esetén szimmetria-jóváhagyás) → megerősítés → hiányzó kézi mezők (szarufa/léc keresztmetszet, osztásközök, ill. rafter-cut-nál „Szarufa magassága") pótlása → mentés V1-ként → **teljes oldalú újranyitás** (`navigate` új URL-lel) → `Mentve · V1` státusz és a bemenetek ellenőrzése → read-only DB-lekérdezés (`supabase db query --local`) a pontos `calculation_dependencies` sorra. Minden irányban a dependency `upstream_calculation_revision_id` pontosan a forrás revízióazonosítójára mutat, és a forrás `calculation_revisions.revision_number` a négy mentés után is `1` maradt (nem íródott át) — az immutabilitás bizonyítva.

### Fordított nyeregtető-geometria (C, D)

A forrás 8000 mm szélesség / 35° / 60 mm HAP / 0 mm ereszkiülés mellett a transfer-előnézet és a mentett rafter-cut kalkuláció is:
- **Fél fesztáv: 4000 mm**
- **Gerincemelkedés: 2860.830152838839 mm**
- **Visszaszámított tetőhajlás: 35°**

— pontosan egyezik a feladatban elvárt értékekkel. A `Szarufa magassága (keresztmetszet)` mezőt (rafterDepthMm) a forrás nem adja át, kézi megadás szükséges — ez a C és D kapcsolatnál is bizonyított (a mentés enélkül „Hiányos kalkuláció" státuszban blokkolt).

## 4. React/UX állapotbiztonság

Élő böngészős próbák (timber-cutlist kalkulátor, kézzel megadott 5000×3000×20° draft):
- **Preview → Mégse**: a draft (5000/3000/20) változatlan maradt a transfer-előnézet megnyitása és elvetése után.
- **Preview → Confirm**: csak az M10.1 forrás által hordozott mező (HAP, 60 mm) változott; a shape-mezők (hossz/szélesség/hajlás), amelyeket az adott forrás nem hordoz, érintetlenek maradtak.
- **Confirm → Undo**: a „Visszavonás” pontosan a transzferrel beírt HAP mezőt törölte vissza, a kézi draftot nem érintette.
- **Kézi módosítás utáni Undo-tiltás**: a HAP mező kézi felülírása után a „Visszavonás” link eltűnt — a manuális szerkesztés védelme élőben igazolva.
- A → B → A és a négy kapcsolat egymás utáni, külön kalkulációkénti mentése (lásd 3. szakasz) regresszió nélkül lezajlott.

## 5. Böngésző és vizuális QA

| Nézet | Eredmény |
|---|---|
| 375×812, világos | Nincs vízszintes túlcsordulás, alsó navigáció és a hosszú geometriai szöveg olvasható, a transfer-forráslista görgethető és érintésbarát. |
| 375×812, sötét | Kontraszt és elrendezés helyes, ugyanaz a tartalom. |
| 812×375 (fekvő) | Fejléc és tabok törés nélkül, alsó nav látható. |
| 1440×900 | Teljes oldalsáv + többoszlopos elrendezés, törés nélkül. |

`read_console_messages` a teljes menetben **nulla** hibát mutatott.

## 6. Technikai ellenőrzés

- `supabase test db --local` (060–062): **60/60 PASS**.
- `npx vitest run src/domain/calculations/construction/construction.test.ts src/features/calculators/rafter-connection-fields.test.ts src/features/calculations/construction-data.test.ts`: **3 fájl / 60 teszt PASS**.
- `npm run lint`: **PASS** (nincs találat).
- Izolált `git worktree`-ben (`node_modules`/`.env.local` symlinkelve, a futó dev szerver `.next`-jét nem érintve): `npm run typecheck` **PASS**, `npm run build` **PASS** (minden route legenerálva, hiba nélkül).
- `git diff --check`: **PASS**.
- Teljes Vitest-regressziót ebben a menetben **nem** futtattam újra — a változtatás hatóköre (egy RPC-guard + két pgTAP assertion) nem indokolja; a legutóbbi teljes PASS bizonyíték a `docs/PROGRESS.md`-ben szerepel, és ott külön jelölve, hogy nem ebből a menetből származik.

## 7. Fennmaradó kockázatok és nem ellenőrzött esetek

- **P3 / nem blokkoló**: fizikai telefonteszt és konkurens (egyidejű, versengő) mezőátvételi mentés ebben a menetben sem lett szimulálva; a meglévő advisory lock + `40001` stale-guard pgTAP-szinten bizonyított, élő race-conditionként nem.
- A sibling (material-takeoff ↔ timber-cutlist) mezők fizikai jelentésének teljes, gyártói referenciával való paritását ez a menet sem vizsgálta függetlenül — kódszinten azonos `roofShapeFields`/`birdsmouthFields` tömbből építkeznek, élő UI-n a kölcsönös átvitel most bizonyítottan működik és a mentett/újranyitott állapot stabil.
- A `roof.truss-members` célzott negatív pgTAP-ja (kizárás a pármátrixból) ezúttal sem készült külön; kódvizsgálat és a meglévő `p_calculator_type not in (...)` guard alapján kizárt.

## 8. Javasolt lezárás

Az M10.2 **lezárható**. Mindkét korábbi blokkoló (P2 guard, 4 irány E2E) bizonyítottan javítva/elvégezve, regresszió nélkül.

## 9. Módosított fájlok

- `supabase/migrations/20261027020000_construction_field_transfer_source_guard.sql` (új, forward-only)
- `supabase/tests/database/061_construction_field_transfer_attestation.sql` (2 új negatív assertion, plan 17→19)

## 10. Javasolt commit

```
fix(M10.2.1): make the field-transfer source guard NULL-safe and verify all four new connections end-to-end
```
