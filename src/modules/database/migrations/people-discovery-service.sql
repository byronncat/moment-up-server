create or replace function public.get_excluded_user_ids (user_uuid uuid) returns table (excluded_id uuid) language sql
set
  search_path = public as $$
  select excluded_id
  from (
    select following_id as excluded_id
    from follows
    where follower_id = user_uuid

    union all

    select blocked_id
    from blocks
    where blocker_id = user_uuid

    union all

    select blocker_id
    from blocks
    where blocked_id = user_uuid

    -- select case
    --     when blocker_id = user_uuid then blocked_id
    --     else blocker_id
    --   end as excluded_id
    -- from blocks
    -- where blocker_id = user_uuid or blocked_id = user_uuid

    union all

    select muted_id
    from mutes
    where muter_id = user_uuid
  ) t
$$;

create or replace function public.get_mutual_connections (
  user_uuid uuid,
  result_limit integer,
  excluded_ids uuid[]
) returns table (mutual_id uuid) language sql
set
  search_path = public as $$
-- Step 1: Get all users the current user follows
with user_following as (
  select following_id
  from follows
  where follower_id = user_uuid
),
-- Step 2: Convert excluded_ids array to a table for efficient join
excluded as (
  select unnest(excluded_ids) as excluded_id
)
-- Step 3: Find mutual connections
select f.following_id as mutual_id
from follows f
join user_following uf on uf.following_id = f.follower_id
left join excluded e on e.excluded_id = f.following_id
where f.following_id <> user_uuid        -- never suggest the user themselves
  and e.excluded_id is null               -- exclude blocked/muted/followed users
group by f.following_id                   -- remove duplicates
order by count(*) desc                     -- optional: rank by # of mutual followers
limit result_limit;
$$;

-- Materialized view to cache user-hashtag relationships
create materialized view public.user_hashtag_stats as
select
  p.user_id,
  ph.hashtag_id,
  count(*) as usage_count,
  max(p.last_modified) as last_used_at
from
  posts p
  join post_hashtags ph on p.id = ph.post_id
group by
  p.user_id,
  ph.hashtag_id;

-- Add indexes for fast lookups
create index idx_user_hashtag_stats_user on public.user_hashtag_stats (user_id);

create index idx_user_hashtag_stats_hashtag on public.user_hashtag_stats (hashtag_id);

-- Required for concurrent refresh
create unique index idx_user_hashtag_stats_user_hashtag on public.user_hashtag_stats (user_id, hashtag_id);

create or replace function public.refresh_user_hashtag_stats () returns void language plpgsql
set
  search_path = public as $$
begin
  refresh materialized view concurrently public.user_hashtag_stats;
end;
$$;

create or replace function public.get_interest_based_users (
  user_uuid uuid,
  result_limit integer,
  excluded_ids uuid[]
) returns table (similar_user uuid) language sql

-- Step 1: Find recent hashtags used by the current user
with recent_hashtags as (
  select hashtag_id
  from user_hashtag_stats
  where user_id = user_uuid
  order by last_used_at desc
  limit 10
),
-- Step 2: Expand excluded_ids into a table for fast filtering
excluded as (
  select unnest(excluded_ids) as excluded_id
),
-- Step 3: Find candidate users who also use these hashtags
candidate_users as (
  select uhs.user_id, uhs.hashtag_id
  from user_hashtag_stats uhs
  join recent_hashtags rh on rh.hashtag_id = uhs.hashtag_id
  left join excluded e on e.excluded_id = uhs.user_id
  where uhs.user_id <> user_uuid
    and e.excluded_id is null
)
-- Step 4: Rank candidates by shared hashtag count
select user_id as similar_user
from candidate_users
group by user_id
order by count(distinct hashtag_id) desc
limit result_limit;
$$;

create or replace function public.get_trending_users (
  user_uuid uuid,
  result_limit integer,
  excluded_ids uuid[]
) returns table (trending_user uuid) language sql
set
  search_path = public as $$
  with excluded as (
    select unnest(excluded_ids) as excluded_id
  ),
  recent_growth as (
    select f.following_id,
           count(*) as recent_follow_growth
    from follows f
    left join excluded e on e.excluded_id = f.following_id
    where f.created_at >= now() - interval '7 days'
      and f.following_id <> user_uuid
      and e.excluded_id is null
    group by f.following_id
    having count(*) >= 2  -- Must have at least 2 new followers to be considered trending
  )
  select rg.following_id as trending_user
  from recent_growth rg
  join user_stats us on us.user_id = rg.following_id
  order by (coalesce(us.followers_count, 0) * ln(rg.recent_follow_growth + 1)) desc
  limit result_limit;
$$;

create or replace function public.get_random_active_users (result_limit integer, excluded_ids uuid[]) returns table (active_user uuid) language sql
set
  search_path = public as $$
  with excluded as (
    select unnest(excluded_ids) as id
  ),
  active_users as (
    select p.user_id
    from posts p
    where p.last_modified >= now() - interval '3 days'
      and not exists (
        select 1 from excluded e where e.id = p.user_id
      )
    group by p.user_id
  )
  select user_id as active_user
  from active_users
  order by random()
  limit result_limit;
$$;