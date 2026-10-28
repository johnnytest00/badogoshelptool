begin;
select plan(1);
select ok(
  coalesce((select rolconfig @> array['statement_timeout=10s'] from pg_roles where rolname = 'tetopro_covering_writer'), false),
  'writer timeout is a role default compatible with transaction pooling'
);
select * from finish();
rollback;
