-- Story Service Functions
-- Function to refresh has_story status for all users
create or replace function public.refresh_story_stats () returns void language plpgsql
set
  search_path = public as $$
begin
  update user_stats us
  set 
    has_story = (
      select exists(
        select 1 from stories s 
        where s.user_id = us.user_id 
        and s.created_at > now() - interval '24 hours'
      )
    ),
    last_modified = now()
  where true; -- Update all rows
end;
$$;

-- Function to get user's own stories and following users' stories
-- User's own story appears first, then sorted by most recent story
create or replace function public.get_following_with_stories (p_user_id uuid) returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar text,
  story_count bigint,
  latest_story_id text,
  latest_story_created_at timestamptz,
  is_own_story boolean
) language sql security definer
set
  search_path = public stable as $$
  -- User's own stories (appears first)
  select 
    u.id as user_id,
    u.username,
    u.display_name,
    u.avatar,
    count(s.id)::bigint as story_count,
    max(s.id)::text as latest_story_id,
    max(s.created_at) as latest_story_created_at,
    true as is_own_story
  from users u
  inner join user_stats us on us.user_id = u.id
  inner join stories s on s.user_id = u.id
  where u.id = p_user_id
    and us.has_story = true
    and u.deleted_at is null
  group by u.id, u.username, u.display_name, u.avatar

  union all

  -- Following users' stories
  select 
    u.id as user_id,
    u.username,
    u.display_name,
    u.avatar,
    count(s.id)::bigint as story_count,
    max(s.id)::text as latest_story_id,
    max(s.created_at) as latest_story_created_at,
    false as is_own_story
  from follows f
  inner join users u on u.id = f.following_id
  inner join user_stats us on us.user_id = u.id
  inner join stories s on s.user_id = u.id
  where f.follower_id = p_user_id
    and f.status = 0  -- FollowStatus.ACCEPTED
    and us.has_story = true
    and u.deleted_at is null
  group by u.id, u.username, u.display_name, u.avatar
  
  order by is_own_story desc, latest_story_created_at desc;
$$;