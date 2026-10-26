-- M10 Fázis 0 P1-independent review follow-up (docs/M10_PHASE0_P1_INDEPENDENT_REVIEW.md §"Döntés és
-- továbblépés"): a két korábban hiányzó célzott regresszió.
-- 1) Dependency-beszúrási hiba a revízió és attestáció beszúrása UTÁN teljesen visszagördíti a mentést:
--    nem marad árva célrevízió, attestáció, dependency vagy hibásan sikeres operation-ledger rekord.
-- 2) Az M10 mezőátvétellel mentett, attestált célrevízió sikeresen ajánlatforrásként kapcsolható, a forrás-
--    és célrevízió attestációja és a dependency sor változatlan marad.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

create function pg_temp.m10b_rafter_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.rafter-cut",
    "fields":{"horizontalHalfSpanMm":"3000","riseMm":"2000","eaveProjectionMm":"500","seatCutHeightMm":"60"},
    "material":null}'::jsonb;
$$;
create function pg_temp.m10b_rafter_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.rafter-cut",
    "lines":[{"label":"Szarufa teljes hossza","value":4206.476,"unit":"mm"}],
    "takeoff":null,"cutList":null,"specifications":null}'::jsonb;
$$;
create function pg_temp.m10b_timber_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.timber-cutlist",
    "fields":{"lengthMm":"10000","seatCutHeightMm":"60"},
    "material":{"requested":{"timber":true,"underlay":false,"covering":false},"layout":{},"specs":{}}}'::jsonb;
$$;
create function pg_temp.m10b_timber_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.timber-cutlist",
    "lines":[{"label":"Tetőfelület","value":84.85,"unit":"m²"}],
    "takeoff":{"status":"VALID","parts":[{"id":"rafters","label":"Szarufa","status":"available","quantities":[]}]},
    "cutList":{"rafters":[{"lengthMm":4883,"count":26}],"battens":[]},
    "specifications":{"schemaVersion":1,"persisted":false,"groups":{"rafter":{"issues":{},"invalidKeys":[]}},"gableOverhangs":null}}'::jsonb;
$$;
create function pg_temp.m10b_attestation_count(p_revision_id uuid) returns integer language sql as $$
  select count(*)::integer from private.construction_revision_attestations where calculation_revision_id=p_revision_id;
$$;

set local role postgres;

-- ---------------------------------------------------------------------------------------------------------
-- 1) Dependency-beszúrási hiba utáni teljes rollback.
-- A dependency trigger maga determinisztikusan nem hozható hibára a meglévő, jóváhagyott forrás/cél párral
-- (a mentési RPC már ellenőrzi a forrás jogosultságát, a dependency-trigger scope-szabálya ennél szigorúbb
-- esetet nem utasítana el). A rollback-bizonyításhoz ezért a teszttranzakción belüli, ideiglenes (a végső
-- rollback-kal automatikusan megszűnő) trigger szándékosan hibát dob a konkrét célkalkuláció dependency
-- beszúrásánál — a mentési RPC-t és a production triggert nem módosítja.
select set_config('test.m10b.source', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000620001','00000000-0000-4000-8000-000000620101',0,
  'construction.roof.rafter-cut','DEMO M10b forrás',pg_temp.m10b_rafter_input(),pg_temp.m10b_rafter_output(),
  '00000000-0000-4000-8000-000000000001')), true);
select is(pg_temp.m10b_attestation_count(current_setting('test.m10b.source')::uuid), 1, 'a forrás rafter-cut mentés attestációt kap');

create function pg_temp.m10b_poison_downstream() returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.calculation_revisions r where r.id = new.downstream_calculation_revision_id
    and r.calculation_id = '00000000-0000-4000-8000-000000620030') then
    raise exception 'DEMO teszt: szándékos dependency-beszúrási hiba a rollback bizonyításához' using errcode = 'XX000';
  end if;
  return new;
end;
$$;
create trigger m10b_poison_dependency_trigger before insert on public.calculation_dependencies
  for each row execute function pg_temp.m10b_poison_downstream();

select throws_ok($$select * from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000620030','00000000-0000-4000-8000-000000620130',0,
  'construction.roof.timber-cutlist','DEMO M10b poisoned cél',pg_temp.m10b_timber_input(),pg_temp.m10b_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10b.source')::uuid)$$,
  'XX000', null, 'a dependency-beszúrás hibája után a teljes mentési tranzakció visszagördül');
drop trigger m10b_poison_dependency_trigger on public.calculation_dependencies;

select is((select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000620030'), 0,
  'nem marad árva célkalkuláció a visszagördült mentés után');
select is((select count(*)::integer from public.calculation_revisions where calculation_id='00000000-0000-4000-8000-000000620030'), 0,
  'nem marad árva célrevízió a visszagördült mentés után');
select is((select count(*)::integer from private.construction_revision_attestations a
  join public.calculation_revisions r on r.id = a.calculation_revision_id where r.calculation_id='00000000-0000-4000-8000-000000620030'), 0,
  'nem marad árva attestáció a visszagördült mentés után');
select is((select count(*)::integer from public.calculation_dependencies
  where upstream_calculation_revision_id=current_setting('test.m10b.source')::uuid), 0,
  'nem marad árva dependency sor a visszagördült mentés után (a forrásra még nincs sikeres hivatkozás)');
select is((select count(*)::integer from public.standalone_construction_save_operations
  where operation_id='00000000-0000-4000-8000-000000620130'), 0,
  'a hibásan megszakadt mentés nem hagy hátra tévesen sikeres operation-ledger rekordot');
select is(pg_temp.m10b_attestation_count(current_setting('test.m10b.source')::uuid), 1,
  'a korábban már sikeresen mentett forrásrevízió attestációja a sikertelen célmentéstől érintetlen marad');

-- ---------------------------------------------------------------------------------------------------------
-- 2) Az M10 mezőátvétellel mentett, attestált célrevízió sikeresen ajánlatforrásként kapcsolható.
select set_config('test.m10b.target', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000620010','00000000-0000-4000-8000-000000620110',0,
  'construction.roof.timber-cutlist','DEMO M10b cél',pg_temp.m10b_timber_input(),pg_temp.m10b_timber_output(),
  '00000000-0000-4000-8000-000000000001',current_setting('test.m10b.source')::uuid)), true);
select is(pg_temp.m10b_attestation_count(current_setting('test.m10b.target')::uuid), 1, 'az M10 célrevízió egy attestációt kap');

create function pg_temp.m10b_q_lines() returns jsonb language sql immutable as $$
  select pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('type','MATERIAL','description','DEMO szarufa 4883 mm',
    'quantity','26','unit','db','unitPrice','','priceClass','net','variantId','','categoryId','','priceId','','priceProvenance','missing','takeoffItemId','','notes',''));
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.m10b.quote', (select quotation_id::text from public.save_standalone_quotation_from_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000620201', null, 'DEMO M10b ajánlat', null,
  pg_temp.m10b_q_lines(), 0, '{"recipientSource":"manual"}'::jsonb, current_setting('test.m10b.target')::uuid,
  '[{"quotationLineIndex":0,"sourceKey":"cut/rafters/0"}]'::jsonb)), true);
select ok(current_setting('test.m10b.quote') <> '', 'az attestált M10 célrevízió sikeresen ajánlatforrásként kapcsolható');
select is((select calculation_revision_id::text from public.quotation_calculation_sources where quotation_id=current_setting('test.m10b.quote')::uuid),
  current_setting('test.m10b.target'), 'az ajánlatforrás a pontos M10 célrevízióra mutat');
reset role;

select is(pg_temp.m10b_attestation_count(current_setting('test.m10b.source')::uuid), 1,
  'az ajánlatkapcsolás után a forrásrevízió attestációja változatlan');
select is(pg_temp.m10b_attestation_count(current_setting('test.m10b.target')::uuid), 1,
  'az ajánlatkapcsolás után a célrevízió attestációja változatlan');
select is((select count(*)::integer from public.calculation_dependencies
  where downstream_calculation_revision_id=current_setting('test.m10b.target')::uuid
  and upstream_calculation_revision_id=current_setting('test.m10b.source')::uuid), 1,
  'az ajánlatkapcsolás után a forrás/cél dependency sor változatlan');

select * from finish();
rollback;
