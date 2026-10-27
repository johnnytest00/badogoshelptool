-- M10 Fázis 0 P1 regresszió: a roof.rafter-cut -> material-takeoff/timber-cutlist mezőátvétellel
-- mentett revízió is kapjon QA08-attestációt, és maradjon érvényes a snapshot-teljességi kapu,
-- a forrás jogosultsági ellenőrzés és az operation-ledger idempotencia.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(19);

create function pg_temp.m10_rafter_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.rafter-cut",
    "fields":{"horizontalHalfSpanMm":"3000","riseMm":"2000","eaveProjectionMm":"500","seatCutHeightMm":"60"},
    "material":null}'::jsonb;
$$;
create function pg_temp.m10_rafter_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut",
    "lines":[{"label":"Szarufa teljes hossza","value":4206.476,"unit":"mm"}],
    "takeoff":null,"cutList":null,"specifications":null}'::jsonb;
$$;
create function pg_temp.m10_timber_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.timber-cutlist",
    "fields":{"lengthMm":"10000","seatCutHeightMm":"60"},
    "material":{"requested":{"timber":true,"underlay":false,"covering":false},"layout":{},"specs":{}}}'::jsonb;
$$;
create function pg_temp.m10_timber_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.timber-cutlist",
    "lines":[{"label":"Tetőfelület","value":84.85,"unit":"m²"}],
    "takeoff":{"status":"VALID","parts":[{"id":"rafters","label":"Szarufa","status":"available","quantities":[]}]},
    "cutList":{"rafters":[{"lengthMm":4883,"count":26}],"battens":[]},
    "specifications":{"schemaVersion":1,"persisted":false,"groups":{"rafter":{"issues":{},"invalidKeys":[]}},"gableOverhangs":null}}'::jsonb;
$$;
create function pg_temp.m10_attestation_count(p_revision_id uuid) returns integer language sql as $$
  select count(*)::integer from private.construction_revision_attestations where calculation_revision_id=p_revision_id;
$$;
create function pg_temp.m10_dependency_count(p_downstream uuid, p_upstream uuid) returns integer language sql as $$
  select count(*)::integer from public.calculation_dependencies
  where downstream_calculation_revision_id=p_downstream and upstream_calculation_revision_id=p_upstream;
$$;

set local role postgres;

-- Forrás: a felhasználó saját standalone roof.rafter-cut revíziója.
select set_config('test.m10.source', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610001','00000000-0000-4000-8000-000000610101',0,
  'construction.roof.rafter-cut','DEMO M10 forrás',pg_temp.m10_rafter_input(),pg_temp.m10_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select is(pg_temp.m10_attestation_count(current_setting('test.m10.source')::uuid), 1, 'a forrás rafter-cut mentés is attestációt kap');

-- Sikertelen célmentés (hiányos output): nem marad félkész revízió, attestáció vagy dependency.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610002','00000000-0000-4000-8000-000000610102',0,
  'construction.roof.timber-cutlist','DEMO M10 hibás cél',pg_temp.m10_timber_input(),
  '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.timber-cutlist","lines":[]}'::jsonb,
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.source')::uuid)$$,
  '22023', null, 'a hiányos cél-output elutasított, snapshot-teljességi kapu él a forrásátvételnél is');
select is((select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000610002'), 0,
  'a sikertelen célmentés nem hoz létre félkész kalkulációt');
select is((select count(*)::integer from public.calculation_dependencies where organization_id='00000000-0000-4000-8000-000000000010'
  and upstream_calculation_revision_id=current_setting('test.m10.source')::uuid), 0,
  'a sikertelen célmentés nem hoz létre dependency sort');

-- Sikeres célmentés mezőátvétellel.
select set_config('test.m10.target', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610010','00000000-0000-4000-8000-000000610110',0,
  'construction.roof.timber-cutlist','DEMO M10 cél',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.source')::uuid)), true);
select is(pg_temp.m10_attestation_count(current_setting('test.m10.target')::uuid), 1,
  'az M10 mezőátvétellel mentett revízió pontosan egy attestációt kap');
select is(pg_temp.m10_dependency_count(current_setting('test.m10.target')::uuid, current_setting('test.m10.source')::uuid), 1,
  'a dependency a pontos forrás- és célrevíziót rögzíti');
select is((select dependency_type from public.calculation_dependencies
  where downstream_calculation_revision_id=current_setting('test.m10.target')::uuid), 'field-transfer:roof.rafter-cut->roof.timber-cutlist',
  'a dependency type a forrás/cél kalkulátorpárt jelöli');

-- Idempotens retry: azonos operation_id és payload -> attestált revízió újrahasznosítása, nincs duplikátum.
select is((select reused from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610010','00000000-0000-4000-8000-000000610110',0,
  'construction.roof.timber-cutlist','DEMO M10 cél',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.source')::uuid)), true,
  'azonos operation ID retry attestált revíziót hasznosít újra');
select is(pg_temp.m10_attestation_count(current_setting('test.m10.target')::uuid), 1,
  'a retry nem hoz létre duplikált attestációt');

-- Eltérő forrás ugyanazzal az operation ID-val -> elutasítva.
select set_config('test.m10.other_source', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610003','00000000-0000-4000-8000-000000610103',0,
  'construction.roof.rafter-cut','DEMO M10 másik forrás',pg_temp.m10_rafter_input(),pg_temp.m10_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610010','00000000-0000-4000-8000-000000610110',0,
  'construction.roof.timber-cutlist','DEMO M10 cél',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.other_source')::uuid)$$,
  '22023', null, 'eltérő forrásrevízió ugyanazzal az operation ID-val elutasított');

-- Nem engedélyezett célkalkulátorhoz nem vehető át adat.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610004','00000000-0000-4000-8000-000000610104',0,
  'construction.roof.rafter-cut','DEMO M10 tiltott cél',pg_temp.m10_rafter_input(),pg_temp.m10_rafter_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.source')::uuid)$$,
  '42501', null, 'roof.rafter-cut célként nem fogadhat el mezőátvételi forrást');

-- Idegen felhasználó standalone rafter-cut revíziója nem használható forrásként.
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member') on conflict do nothing;
select set_config('test.m10.foreign_source', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610005','00000000-0000-4000-8000-000000610105',0,
  'construction.roof.rafter-cut','DEMO M10 idegen forrás',pg_temp.m10_rafter_input(),pg_temp.m10_rafter_output(),
  '00000000-0000-4000-8000-000000000002')), true);
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610006','00000000-0000-4000-8000-000000610106',0,
  'construction.roof.timber-cutlist','DEMO M10 idegen forrás próba',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.foreign_source')::uuid)$$,
  '42501', null, 'másik felhasználó standalone forrása nem használható fel mezőátvételhez');

-- M10.2.1: nem létező forrásrevízió sem fogadható el (nincs sor a forrás-lekérdezésnek, NULL-biztos guard).
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610007','00000000-0000-4000-8000-000000610107',0,
  'construction.roof.timber-cutlist','DEMO M10 nem létező forrás próba',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000619999')$$,
  '42501', null, 'nem létező forrásrevízió korán, 42501-gyel elutasított');

-- M10.2.1: idegen szervezet standalone forrásrevíziója sem fogadható el, azonos létrehozóval sem.
insert into public.organizations(id,name) values('00000000-0000-4000-8000-000000000011','DEMO M10 másik műhely') on conflict do nothing;
insert into public.organization_members(organization_id,user_id,role) values
  ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','member') on conflict do nothing;
select set_config('test.m10.foreign_org_source', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000610008','00000000-0000-4000-8000-000000610108',0,
  'construction.roof.rafter-cut','DEMO M10 másik szervezet forrása',pg_temp.m10_rafter_input(),pg_temp.m10_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610009','00000000-0000-4000-8000-000000610109',0,
  'construction.roof.timber-cutlist','DEMO M10 idegen szervezet próba',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.foreign_org_source')::uuid)$$,
  '42501', null, 'másik szervezet standalone forrása ugyanazon létrehozóval sem használható fel');

-- Konkurens/stale revízió mezőátvétellel sem hagy hátra attestációt vagy dependency-t.
select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610010','00000000-0000-4000-8000-000000610111',0,
  'construction.roof.timber-cutlist','DEMO M10 stale',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10.source')::uuid)$$,
  '40001', null, 'elavult expected revision mezőátvétellel sem hozhat létre versengő revíziót');
select is((select count(*)::integer from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000610010'),
  1, 'a stale retry nem ad hozzá második revíziót a célhoz');

-- Az attestált célrevízió munkanaplóhoz kapcsolható (require_attested_construction_revision trigger él).
insert into public.execution_plans(id,organization_id,project_id,title,request_key,created_by) values
  ('00000000-0000-4000-8000-000000610200','00000000-0000-4000-8000-000000000010',null,'DEMO M10 munkanapló','00000000-0000-4000-8000-000000610201','00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select ok((select link_id from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610200','calculation',
  current_setting('test.m10.target')::uuid,'00000000-0000-4000-8000-000000610202')) is not null,
  'az M10 mezőátvétellel mentett, attestált célrevízió munkanaplóhoz kapcsolható');
reset role;

-- Korábbi, forrásátvétel nélküli construction mentés továbbra is működik és attestációt kap.
set local role postgres;
select set_config('test.m10.no_transfer', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000610020','00000000-0000-4000-8000-000000610120',0,
  'construction.roof.timber-cutlist','DEMO M10 forrás nélkül',pg_temp.m10_timber_input(),pg_temp.m10_timber_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select is(pg_temp.m10_attestation_count(current_setting('test.m10.no_transfer')::uuid), 1,
  'forrásátvétel nélküli korábbi mentési útvonal is attestációt kap');
select is((select count(*)::integer from public.calculation_dependencies
  where downstream_calculation_revision_id=current_setting('test.m10.no_transfer')::uuid), 0,
  'forrásátvétel nélküli mentés nem hoz létre dependency sort');
reset role;

select * from finish();
rollback;
