create or replace function public.generate_snowflake (machine_id integer default 1) returns bigint language plpgsql
set
  search_path = public as $$
declare
  our_epoch bigint := 1609459200000; -- Custom epoch (2021-01-01 UTC)
  seq_id bigint;
  now_millis bigint;
begin
  -- Sequence: 0–4095 (12 bits)
  seq_id := nextval('public.snowflake_seq') % 4096;

  -- Current timestamp in ms
  now_millis := (extract(epoch from statement_timestamp()) * 1000)::bigint;

  -- Build Snowflake ID
  return ((now_millis - our_epoch) << 22)
       | ((machine_id::bigint & 1023) << 12)
       | seq_id;
end;
$$;