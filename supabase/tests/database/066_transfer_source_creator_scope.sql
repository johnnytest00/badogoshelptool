-- B5: a forráslista felhasználói izolációját az ALKALMAZÁSSZINTŰ `created_by` szűrő adja
-- (`src/features/calculations/construction-data.ts`), nem az RLS. Ez a teszt a feltételezést TÉNNYÉ teszi:
-- bizonyítja, hogy a `calculations_linked_member_read` / `calculation_revisions_linked_member_read` policy
-- (20261025110000) egy kivitelezési tervhez linkelt construction kalkulációt MINDEN szervezeti tagnak
-- olvashatóvá tesz, a létrehozótól függetlenül.
--
-- Ha ez a teszt egyszer elbukik azzal, hogy az idegen tag már NEM látja a linkelt sort, az jó hír: akkor az
-- RLS szűkült, és a `created_by` alkalmazásszintű szűrő védelme már nem egyedüli. Addig viszont a szűrőt
-- TILOS eltávolítani — az alkalmazásszintű kaput a `construction-data.test.ts` őrzi.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);

create function pg_temp.b5_takeoff_input() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.input.v1","calculatorId":"roof.material-takeoff",
    "fields":{"widthMm":"6000","lengthMm":"10000","pitchDegrees":"35"},
    "material":{"requested":{"timber":true,"underlay":false,"covering":false},"layout":{},"specs":{}}}'::jsonb;
$$;
create function pg_temp.b5_takeoff_output() returns jsonb language sql immutable as $$
  select '{"schemaVersion":"construction-suite.output.v1","calculatorId":"roof.material-takeoff",
    "lines":[{"label":"Tetőfelület","value":85.45,"unit":"m²"}],
    "takeoff":{"status":"VALID","parts":[{"id":"rafters","label":"Szarufa","status":"available","quantities":[]}]},
    "cutList":null,
    "specifications":{"schemaVersion":1,"persisted":false,"groups":{"rafter":{"issues":{},"invalidKeys":[]}},"gableOverhangs":null}}'::jsonb;
$$;

set local role postgres;
-- Mindkét felhasználó ugyanannak a műhelynek a tagja; a kalkulációt az ELSŐ hozza létre.
insert into public.organization_members(organization_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'member') on conflict do nothing;
select set_config('test.b5.revision', (select calculation_revision_id::text from public.save_standalone_construction_calculation(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000660001','00000000-0000-4000-8000-000000660101',0,
  'construction.roof.material-takeoff','DEMO B5 saját anyagkimutatás',pg_temp.b5_takeoff_input(),pg_temp.b5_takeoff_output(),
  '00000000-0000-4000-8000-000000000001')), true);
insert into public.execution_plans(id, organization_id, project_id, title, request_key, created_by) values
  ('00000000-0000-4000-8000-000000660201','00000000-0000-4000-8000-000000000010',null,'DEMO B5 munkanapló','00000000-0000-4000-8000-000000660291','00000000-0000-4000-8000-000000000001')
  on conflict do nothing;
reset role;

-- 1. Kiindulás: linkelés ELŐTT a másik tag nem látja a kalkulációt (csak a létrehozó látja).
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000660001'), 0,
  'linkelés előtt a másik szervezeti tag nem látja a kalkulációt');
select is((select count(*)::integer from public.calculation_revisions where id=current_setting('test.b5.revision')::uuid), 0,
  'linkelés előtt a másik szervezeti tag nem látja a revíziót');
reset role;

-- A létrehozó a saját kalkulációját munkanaplóhoz kapcsolja — ez a termék támogatott művelete.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select ok((select link_id from public.link_execution_plan_document(
  '00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000660201','calculation',
  current_setting('test.b5.revision')::uuid,'00000000-0000-4000-8000-000000660292')) is not null,
  'a létrehozó a saját revízióját munkanaplóhoz kapcsolhatja');
reset role;

-- 2. A BIZONYÍTÉK: linkelés UTÁN a másik tag már olvassa — pedig nem ő hozta létre.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.calculations where id='00000000-0000-4000-8000-000000660001'), 1,
  'linkelés után a másik szervezeti tag RLS-ből olvassa az idegen kalkulációt (linked_member_read)');
select is((select created_by from public.calculations where id='00000000-0000-4000-8000-000000660001'),
  '00000000-0000-4000-8000-000000000001'::uuid,
  'a látott sor létrehozója a MÁSIK felhasználó: az RLS önmagában nem tartja létrehozóra szűkítve a listát');
select is((select count(*)::integer from public.calculation_revisions where id=current_setting('test.b5.revision')::uuid), 1,
  'a revízió is olvashatóvá válik, ezért az input_snapshot is kiolvasható lenne a forráslistához');
reset role;

select * from finish();
rollback;
