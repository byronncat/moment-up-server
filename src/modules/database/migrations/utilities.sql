create or replace function public.generate_snowflake (machine_id integer default 1) returns bigint language plpgsql
set
  search_path = public as $$
declare
  our_epoch bigint := 1609459200000; -- Custom epoch (2021-01-01 UTC)
  seq_id bigint;
  now_millis bigint;
  snowflake_id bigint;
begin
  -- Sequence: 0–4095 (12 bits)
  select nextval('public.snowflake_seq') % 4096 into seq_id;

  -- Current timestamp in ms
  now_millis := floor(extract(epoch from clock_timestamp()) * 1000);

  -- Build Snowflake ID
  snowflake_id :=
      ((now_millis - our_epoch) << 22)   -- 41 bits timestamp
    | ((machine_id & 1023) << 12)        -- 10 bits machine id
    | (seq_id & 4095);                   -- 12 bits sequence

  return snowflake_id;
end;
$$;