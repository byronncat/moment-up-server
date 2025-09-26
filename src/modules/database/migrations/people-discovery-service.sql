create or replace function public.get_excluded_user_ids (user_uuid uuid) returns table (excluded_id uuid) language sql
set
  search_path = public as $$
  (
    -- People current user follows
    select following_id as excluded_id
    from follows
    where follower_id = user_uuid

    union

    -- People current user blocked
    select blocked_id as excluded_id
    from blocks
    where blocker_id = user_uuid

    union

    -- People who blocked current user
    select blocker_id as excluded_id
    from blocks
    where blocked_id = user_uuid

    union

    -- People current user muted
    select muted_id as excluded_id
    from mutes
    where muter_id = user_uuid
  )
$$;

create or replace function public.get_mutual_connections (
  user_uuid uuid,
  result_limit integer,
  excluded_ids uuid[]
) returns table (mutual_id uuid) language sql
set
  search_path = public as $$
  with user_following as (
    select following_id
    from follows
    where follower_id = user_uuid
  )
  select distinct f.following_id as mutual_id
  from follows f
  join user_following uf on uf.following_id = f.follower_id
  where f.following_id <> user_uuid  -- Don't suggest the user themselves
    and not (f.following_id = any (excluded_ids))
  limit result_limit;
$$;

create or replace function public.get_interest_based_users (
  user_uuid uuid,
  result_limit integer,
  excluded_ids uuid[]
) returns table (similar_user uuid) language sql
set
  search_path = public as $$
  with recent_hashtags as (
    select ph.hashtag_id
    from posts p
    join post_hashtags ph on p.id = ph.post_id
    where p.user_id = user_uuid
    order by p.last_modified desc
    limit 10
  ),
  candidate_users as (
    select p.user_id, ph.hashtag_id
    from posts p
    join post_hashtags ph on p.id = ph.post_id
    where ph.hashtag_id in (select hashtag_id from recent_hashtags)
      and p.user_id <> user_uuid
      and not (p.user_id = any (excluded_ids))
  )
  select 
    user_id as similar_user
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
  with recent_growth as (
    select f.following_id,
           count(*) as recent_follow_growth
    from follows f
    where f.created_at >= now() - interval '7 days'
      and f.following_id <> user_uuid
      and not (f.following_id = any (excluded_ids))
    group by f.following_id
    having count(*) >= 2  -- Must have at least 2 new followers to be considered trending
  ),
  total_followers as (
    select following_id,
           count(*) as total_followers
    from follows
    group by following_id
  )
  select rg.following_id as trending_user
  from recent_growth rg
  join total_followers tf on rg.following_id = tf.following_id
  order by (tf.total_followers * ln(rg.recent_follow_growth + 1)) desc
  limit result_limit;
$$;

create or replace function public.get_random_active_users (result_limit integer, excluded_ids uuid[]) returns table (active_user uuid) language sql
set
  search_path = public as $$
  select distinct on (p.user_id) p.user_id as active_user
  from posts p
  where p.last_modified >= now() - interval '3 days'
    and not (p.user_id = any (excluded_ids))
  order by p.user_id, random()
  limit result_limit;
$$;