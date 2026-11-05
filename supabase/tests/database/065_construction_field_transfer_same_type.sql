-- P3.4.1: a P3.3c által engedett same-type anyagátvételt (mentett roof.material-takeoff -> új, különálló
-- roof.material-takeoff) a mentési RPC pármátrixa 42501-gyel elutasította, ezért a P3.4 B útvonal nem kapott
-- mentett V1 revíziót (docs/ROOF_WORKFLOW_EFFICIENCY_P34_REPORT.md G.1). Ez a teszt a javítás előtt a same-type
-- mentésnél bukik, és egyszerre rögzíti a megmaradó forrás-, szervezet-, tulajdonos- és önhivatkozási kapukat.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

create function pg_temp.p341_takeoff_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.material-takeoff",
    "fields":{"widthMm":"8000","lengthMm":"10000","pitchDegrees":"35"},
    "material":{"requested":{"timber":true,"underlay":true,"covering":true},
      "layout":{"rafterMaxSpacingMm":"900","battenMaxSpacingMm":"350"},"specs":{}}}'::jsonb;
$$;
create function pg_temp.p341_takeoff_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.material-takeoff",
    "lines":[{"label":"Tetőfelület","value":85.45,"unit":"m²"}],
    "takeoff":{"status":"VALID","parts":[{"id":"rafters","label":"Szarufa","status":"available","quantities":[]}]},
    "cutList":null,
    "specifications":{"schemaVersion":1,"persisted":false,
      "groups":{"rafter":{"issues":{},"invalidKeys":[]},"covering":{"issues":{},"invalidKeys":[]}},
      "gableOverhangs":null}}'::jsonb;
$$;
create function pg_temp.p341_rafter_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.rafter-cut",
    "fields":{"horizontalHalfSpanMm":"3000","riseMm":"2000","eaveProjectionMm":"500","seatCutHeightMm":"60"},
    "material":null}'::jsonb;
$$;
create function pg_temp.p341_rafter_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut",
    "lines":[{"label":"Szarufa teljes hossza","value":4206.476,"unit":"mm"}],
    "takeoff":null,"cutList":null,"specifications":null}'::jsonb;
$$;

set local role postgres;

-- A forrás: a felhasználó saját, mentett standalone roof.material-takeoff revíziója (P3.1 referencia szerepe).
select set_config('test.p341.source', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650001','00000000-0000-4000-8000-000000650101',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 forrás anyagkimutatás',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001')), true);

-- RED: az azonos típusú, különálló, jogosult forrásból mentett B kalkuláció.
select lives_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650002','00000000-0000-4000-8000-000000650102',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 cél anyagkimutatás',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.source')::uuid)$$,
  'azonos típusú, jogosult, különálló forrásból menthető az anyagkimutatás');
select set_config('test.p341.target', (select cr.id::text from public.calculation_revisions cr
  where cr.calculation_id='00000000-0000-4000-8000-000000650002' and cr.revision_number=1), true);

select is((select revision_number from public.calculation_revisions where id=current_setting('test.p341.target')::uuid), 1,
  'a B kalkuláció V1 revíziót kap');
select is((select count(*)::integer from public.calculation_dependencies
  where downstream_calculation_revision_id=current_setting('test.p341.target')::uuid
    and upstream_calculation_revision_id=current_setting('test.p341.source')::uuid), 1,
  'a provenance a pontos forrásrevíziót rögzíti');
select is((select dependency_type from public.calculation_dependencies
  where downstream_calculation_revision_id=current_setting('test.p341.target')::uuid),
  'field-transfer:roof.material-takeoff->roof.material-takeoff',
  'a dependency type az azonos típusú forrás-cél párt jelöli');
select is((select count(*)::integer from private.construction_revision_attestations
  where calculation_revision_id=current_setting('test.p341.target')::uuid), 1,
  'a same-type átvétellel mentett revízió attestációt kap');
-- Újranyitás: a mentett anyagállapot és a számítási eredmény változatlanul visszaolvasható.
select is((select cr.input_snapshot->'material' from public.calculation_revisions cr where cr.id=current_setting('test.p341.target')::uuid),
  pg_temp.p341_takeoff_input()->'material', 'az anyagadatok a mentett revízióból változatlanul visszanyithatók');
select is((select cr.output_snapshot->'lines'->0->>'value' from public.calculation_revisions cr where cr.id=current_setting('test.p341.target')::uuid),
  '85.45', 'a mentett eredmény a referencia tetőfelülettel azonos');

-- Önhivatkozás: a saját kalkuláció revíziója nem lehet a saját új revíziójának forrása.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650002','00000000-0000-4000-8000-000000650103',1,
  'construction.roof.material-takeoff','DEMO P3.4.1 önhivatkozás',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.target')::uuid)$$,
  '42501', null, 'a saját kalkuláció revíziójára hivatkozó átvétel elutasított');

-- Nem létező forrásrevízió.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650003','00000000-0000-4000-8000-000000650104',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 nem létező forrás',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000659999')$$,
  '42501', null, 'nem létező forrásrevízió same-type célnál is elutasított');

-- Idegen felhasználó azonos típusú standalone forrása.
insert into public.organization_members(organization_id,user_id,role) values
  ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','member') on conflict do nothing;
select set_config('test.p341.foreign_user', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650004','00000000-0000-4000-8000-000000650105',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 idegen felhasználó forrása',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000002')), true);
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650005','00000000-0000-4000-8000-000000650106',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 idegen felhasználó próba',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.foreign_user')::uuid)$$,
  '42501', null, 'másik felhasználó azonos típusú forrása same-type célnál sem használható');

-- Idegen szervezet azonos típusú standalone forrása, azonos létrehozóval.
insert into public.organizations(id,name) values('00000000-0000-4000-8000-000000000012','DEMO P3.4.1 másik műhely') on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role) values
  ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001','member') on conflict do nothing;
select set_config('test.p341.foreign_org', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000650006','00000000-0000-4000-8000-000000650107',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 másik szervezet forrása',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650007','00000000-0000-4000-8000-000000650108',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 idegen szervezet próba',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.foreign_org')::uuid)$$,
  '42501', null, 'másik szervezet azonos típusú forrása same-type célnál sem használható');

-- Regresszió: a korábban engedélyezett cross-type út (rafter-cut -> material-takeoff) változatlanul működik.
select set_config('test.p341.rafter', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650008','00000000-0000-4000-8000-000000650109',0,
  'construction.roof.rafter-cut','DEMO P3.4.1 szarufa forrás',pg_temp.p341_rafter_input(),pg_temp.p341_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select lives_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650009','00000000-0000-4000-8000-000000650110',0,
  'construction.roof.material-takeoff','DEMO P3.4.1 cross-type cél',pg_temp.p341_takeoff_input(),pg_temp.p341_takeoff_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.rafter')::uuid)$$,
  'a korábbi cross-type rafter-cut -> material-takeoff átvétel változatlanul menthető');

-- Regresszió: a nem támogatott rafter-cut -> rafter-cut pár továbbra is elutasított.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650010','00000000-0000-4000-8000-000000650111',0,
  'construction.roof.rafter-cut','DEMO P3.4.1 tiltott same-type pár',pg_temp.p341_rafter_input(),pg_temp.p341_rafter_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.rafter')::uuid)$$,
  '42501', null, 'a nem támogatott rafter-cut -> rafter-cut pár továbbra is elutasított');

-- Regresszió: a nem támogatott célkalkulátor (truss-members) továbbra is elutasított.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000650011','00000000-0000-4000-8000-000000650112',0,
  'construction.roof.truss-members','DEMO P3.4.1 tiltott cél',
  '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.truss-members","fields":{"spanMm":"8000"},"material":null}'::jsonb,
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.truss-members","lines":[{"label":"Rácsrúd","value":12,"unit":"db"}],"takeoff":null,"cutList":null,"specifications":null}'::jsonb,
  '00000000-0000-4000-8000-000000000001',current_setting('test.p341.source')::uuid)$$,
  '42501', null, 'nem támogatott célkalkulátor továbbra is elutasított');

reset role;
select * from finish();
rollback;
